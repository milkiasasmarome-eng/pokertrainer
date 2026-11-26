/* PokerTrainer – Startüberwachung und Wiederherstellung.
   Läuft als erstes Skript, ohne Engine und ohne Netzwerk. Verhindert einen dauerhaft hängenden Ladezustand:
   - Skript-Ladefehler und ein Start, der nicht fertig wird, führen zu einer verständlichen Fehleranzeige.
   - Wiederherstellung: Neu laden, abgesicherter Start (gespeicherte Daten bleiben unberührt),
     Rohsicherung aller lokalen Daten herunterladen und erst danach lokale Daten zurücksetzen.
   Gelöscht wird nie ohne vorher erzeugte Sicherung. */
(function () {
'use strict';
if (window.PTRecovery) return;
var DB = 'pokertrainer2', LS_PREFIX = /^pokertrainer/, SLOW_MS = 4000, FAIL_MS = 20000;
var R = window.PTRecovery = { t0: Date.now(), state: 'start', reason: null, detail: '', errors: [], backupDone: false };
var cs = document.currentScript, ver = (cs && /[?&]v=([^&]+)/.exec(cs.src || '') || [])[1] || null;
R.version = ver;

function isReady() { return !!(window.PTUI && window.PTUI.S && window.PTUI.S.ready); }
function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function el(tag, attrs, text) {
  var e = document.createElement(tag);
  if (attrs) Object.keys(attrs).forEach(function (k) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); });
  if (text != null) e.textContent = text;
  return e;
}

// ---------- Überwachung ----------
// Ladefehler von <script>-Dateien erreichen window nur in der Capture-Phase.
window.addEventListener('error', function (e) {
  var t = e && e.target;
  if (t && t !== window && t.tagName === 'SCRIPT') { R.fail('script', 'Programmdatei nicht geladen: ' + (t.getAttribute('src') || 'unbekannt')); return; }
  if (!isReady() && e && e.message) R.errors.push(String(e.message).slice(0, 200));
}, true);
window.addEventListener('unhandledrejection', function (e) {
  if (!isReady() && e && e.reason) R.errors.push(String(e.reason && e.reason.message || e.reason).slice(0, 200));
});
function arm(slowMs, failMs) {
  clearTimeout(R._slow); clearTimeout(R._fail);
  R._slow = setTimeout(function () {
    if (isReady() || R.state === 'failed') return;
    var st = document.getElementById('status');
    if (st && /Lade/.test(st.textContent || '')) st.textContent = 'Lade … (dauert länger als üblich)';
  }, slowMs);
  R._fail = setTimeout(function () { if (!isReady()) R.fail('timeout', R.errors.length ? 'Letzte Meldung: ' + R.errors[R.errors.length - 1] : ''); }, failMs);
}
arm(SLOW_MS, FAIL_MS);

/** Vom Controller aufgerufen, sobald der Trainer bedienbar ist. */
R.ready = function () {
  R.state = 'ready'; clearTimeout(R._slow); clearTimeout(R._fail);
  // Ein nur wegen Zeitüberschreitung gezeigter Hinweis verschwindet, wenn der Start doch noch gelingt.
  if (R.reason === 'timeout') R.hide();
};
R.hide = function () { var p = document.getElementById('recovery'); if (p) p.remove(); if (R.state === 'failed') R.state = isReady() ? 'ready' : 'start'; R.reason = null; setInert(false); };

// ---------- Rohsicherung ----------
function finite(k, v) { return typeof v === 'number' && !isFinite(v) ? String(v) : v; }
/** Liest alle lokalen Daten roh (ohne Prüfung), damit auch beschädigte Einträge gesichert werden. */
R.rawDump = function (timeoutMs) {
  return new Promise(function (res, rej) {
    var out = { format: 'PokerTrainer-Rohsicherung', version: 1, app: (window.PT && window.PT.VERSION) || ver, created: new Date().toISOString(), reason: R.reason || null, indexedDB: {}, localStorage: {} };
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (LS_PREFIX.test(k)) out.localStorage[k] = localStorage.getItem(k); } } catch (e) { out.localStorageError = String(e && e.name || e); }
    var done = false, timer = setTimeout(function () { fin(new Error('IndexedDB antwortet nicht')); }, timeoutMs || 6000);
    function fin(err) {
      if (done) return; done = true; clearTimeout(timer);
      if (err) { out.indexedDBError = String(err && (err.name || err.message) || err); if (!Object.keys(out.localStorage).length) { rej(err); return; } }
      res(out);
    }
    try {
      if (!window.indexedDB) { out.indexedDBError = 'nicht vorhanden'; fin(); return; }
      var created = false, rq = window.indexedDB.open(DB);
      rq.onupgradeneeded = function (ev) { if (ev.oldVersion === 0) { created = true; try { rq.transaction.abort(); } catch (e) { /* leer */ } } };
      rq.onblocked = function () { fin(new Error('IndexedDB blockiert')); };
      rq.onerror = function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); if (created) { out.indexedDB = {}; fin(); } else fin(rq.error || new Error('IndexedDB-Fehler')); };
      rq.onsuccess = function () {
        var d = rq.result, names = Array.prototype.slice.call(d.objectStoreNames), db = out.indexedDB[DB] = {};
        if (!names.length) { d.close(); fin(); return; }
        try {
          var tx = d.transaction(names, 'readonly');
          names.forEach(function (n) { var g = tx.objectStore(n).getAll(); g.onsuccess = function () { db[n] = g.result || []; }; });
          tx.oncomplete = function () { d.close(); fin(); };
          tx.onerror = tx.onabort = function () { d.close(); fin(tx.error || new Error('Lesefehler')); };
        } catch (e) { d.close(); fin(e); }
      };
    } catch (e) { fin(e); }
  }).then(function (o) { return JSON.stringify(o, finite); });
};
function download(name, text) {
  var blob = new Blob([text], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
}
R.backup = function () {
  return R.rawDump().then(function (text) {
    var name = 'Sicherung_PokerTrainer_' + today() + '_Rohdaten.json';
    download(name, text); R.backupDone = true; R.backupName = name; R.backupBytes = text.length;
    return name;
  });
};
/** Löscht die lokalen Daten des Trainers – nur nach erzeugter Rohsicherung. */
R.reset = function () {
  if (!R.backupDone) return Promise.reject(new Error('Erst eine Sicherung herunterladen.'));
  return new Promise(function (res, rej) {
    try { Object.keys(localStorage).forEach(function (k) { if (/^pokertrainer20\./.test(k)) localStorage.removeItem(k); }); } catch (e) { /* leer */ }
    try {
      if (window.PTUI && window.PTUI.Store && window.PTUI.Store.goMem) window.PTUI.Store.goMem('reset');
      if (!window.indexedDB) { res(); return; }
      var rq = window.indexedDB.deleteDatabase(DB), t = setTimeout(function () { rej(new Error('Zurücksetzen blockiert: Bitte andere Tabs mit dem PokerTrainer schließen.')); }, 6000);
      rq.onsuccess = function () { clearTimeout(t); res(); };
      rq.onerror = function () { clearTimeout(t); rej(rq.error || new Error('Löschen fehlgeschlagen')); };
      rq.onblocked = function () { /* wartet auf andere Tabs; Zeitlimit oben */ };
    } catch (e) { rej(e); }
  });
};
function safeUrl() { return location.pathname + '?start=sicher' + (location.hash || '#tisch'); }
function normalUrl() { return location.pathname + (location.hash || '#tisch'); }
R.safeUrl = safeUrl; R.normalUrl = normalUrl;

// ---------- Anzeige ----------
function setInert(on) { var app = document.getElementById('app'); if (app) { if (on) app.setAttribute('inert', ''); else app.removeAttribute('inert'); } }
var TEXT = {
  timeout: ['Der Start dauert ungewöhnlich lange', 'Der PokerTrainer ist nach ' + Math.round(FAIL_MS / 1000) + ' Sekunden noch nicht bereit. Häufige Ursache: Der lokale Speicher des Browsers (IndexedDB) antwortet nicht.'],
  script: ['Programmdatei fehlt', 'Eine Datei des PokerTrainers konnte nicht geladen werden (z. B. offline ohne vollständigen Zwischenspeicher oder nach einem unvollständigen Update).'],
  boot: ['Gespeicherte Daten konnten nicht geladen werden', 'Beim Lesen der lokalen Daten ist ein Fehler aufgetreten. Der Trainer läuft vorerst ohne Speicherung; die gespeicherten Daten wurden nicht verändert.'],
  storage: ['Lokaler Speicher nicht nutzbar', 'Der Browser-Speicher (IndexedDB) ist nicht erreichbar. Der Trainer läuft vorerst ohne Speicherung; vorhandene Daten wurden nicht verändert.']
};
/**
 * Zeigt die Fehleranzeige. reason: timeout | script | boot | storage. Mehrfachaufrufe aktualisieren die Anzeige.
 * opts.canContinue: Der Trainer ist trotzdem bedienbar (ohne Speicherung) – Schaltfläche „Ohne Speicherung weiterspielen“.
 */
R.fail = function (reason, detail, opts) {
  opts = opts || {};
  if (R.state === 'failed' && R.reason === reason && !detail) return;
  R.state = 'failed'; R.reason = reason; R.detail = detail || ''; clearTimeout(R._slow); clearTimeout(R._fail);
  if (!document.body) { document.addEventListener('DOMContentLoaded', function () { R.fail(reason, detail, opts); }); return; }
  var old = document.getElementById('recovery'); if (old) old.remove();
  var t = TEXT[reason] || TEXT.boot;
  var box = el('div', { id: 'recovery', class: 'recovery', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'recH', 'aria-describedby': 'recP' });
  box.style.cssText = 'position:fixed;inset:0;z-index:200;overflow:auto;background:rgba(10,14,16,.72);display:grid;place-items:center;padding:16px';
  var sheet = el('div', { class: 'sheet recsheet' });
  sheet.style.cssText = 'max-width:640px;width:100%;background:#fbfaf7;color:#15181b;border-radius:16px;padding:18px 20px;box-shadow:0 20px 60px rgba(0,0,0,.45)';
  sheet.appendChild(el('h2', { id: 'recH', tabindex: '-1' }, t[0]));
  sheet.appendChild(el('p', { id: 'recP' }, t[1]));
  if (detail) sheet.appendChild(el('p', { class: 'small', id: 'recDetail' }, 'Technische Angabe: ' + String(detail).slice(0, 300)));
  sheet.appendChild(el('p', { class: 'small' }, 'Deine Daten werden nie ohne vorherige Sicherung gelöscht.'));
  var row = el('div', { class: 'btnrow' }), status = el('p', { class: 'small', id: 'recStatus', role: 'status', 'aria-live': 'polite' });
  function btn(id, label, cls, fn) { var b = el('button', { id: id, type: 'button', class: 'btn' + (cls ? ' ' + cls : '') }, label); b.addEventListener('click', fn); row.appendChild(b); return b; }
  btn('recReload', 'Neu laden', 'primary2', function () { location.reload(); });
  if (reason === 'timeout') btn('recWait', 'Weiter warten', '', function () { R.hide(); arm(SLOW_MS, FAIL_MS); });
  if (opts.canContinue) btn('recContinue', 'Ohne Speicherung weiterspielen', '', function () { R.hide(); });
  else btn('recSafe', 'Ohne gespeicherte Daten starten', '', function () { location.href = safeUrl(); });
  sheet.appendChild(row);
  // Zweistufig: erst Sicherung, dann (nach Bestätigung) zurücksetzen
  var fs = el('div', { class: 'box recreset' });
  fs.appendChild(el('h3', null, 'Sicherung herunterladen und lokale Daten zurücksetzen'));
  fs.appendChild(el('p', { class: 'small' }, 'Schritt 1 lädt alle lokalen Daten unverändert als Datei herunter (auch beschädigte Einträge). Diese Datei kannst du später unter Einstellungen → Daten → „Sicherung importieren“ einlesen; gültige Einträge werden übernommen. Schritt 2 löscht danach die lokalen Daten dieses Trainers in diesem Browser.'));
  var r2 = el('div', { class: 'btnrow' });
  var bB = el('button', { id: 'recBackup', type: 'button', class: 'btn' }, '1. Sicherung herunterladen');
  var lab = el('label', { class: 'switch' }), chk = el('input', { type: 'checkbox', id: 'recSaved', disabled: '' });
  lab.appendChild(chk); lab.appendChild(document.createTextNode(' Ich habe die Sicherungsdatei gespeichert.'));
  var bR = el('button', { id: 'recReset', type: 'button', class: 'btn danger', disabled: '' }, '2. Lokale Daten zurücksetzen');
  bB.addEventListener('click', function () {
    bB.disabled = true; status.textContent = 'Sicherung wird erstellt …';
    R.backup().then(function (name) {
      status.textContent = 'Die Datei „' + name + '“ wurde zum Herunterladen angeboten (' + Math.max(1, Math.round(R.backupBytes / 1024)) + ' KB). Prüfe, ob sie gespeichert wurde.';
      chk.disabled = false; bB.disabled = false; bB.textContent = '1. Sicherung erneut herunterladen';
    }, function (e) {
      bB.disabled = false;
      status.textContent = 'Die Sicherung ist fehlgeschlagen (' + (e && (e.message || e.name) || e) + '). Ohne Sicherung wird nichts gelöscht. Nutze „Ohne gespeicherte Daten starten“ oder lade die Seite neu.';
    });
  });
  chk.addEventListener('change', function () { bR.disabled = !(chk.checked && R.backupDone); });
  bR.addEventListener('click', function () {
    if (!(chk.checked && R.backupDone)) return;
    bR.disabled = true; status.textContent = 'Lokale Daten werden zurückgesetzt …';
    R.reset().then(function () { status.textContent = 'Zurückgesetzt. Der Trainer startet neu.'; setTimeout(function () { location.href = normalUrl(); }, 300); },
      function (e) { bR.disabled = false; status.textContent = String(e && e.message || e); });
  });
  r2.appendChild(bB); r2.appendChild(lab); r2.appendChild(bR);
  fs.appendChild(r2); fs.appendChild(status);
  sheet.appendChild(fs);
  box.appendChild(sheet);
  document.body.appendChild(box);
  setInert(true);
  // Fokus in den Dialog; Tab bleibt innerhalb (Fokusfalle), Esc schließt nur, wenn der Trainer bedienbar ist.
  box.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && (opts.canContinue || reason === 'timeout')) { e.preventDefault(); R.hide(); return; }
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call(box.querySelectorAll('button, input, a[href]'), function (x) { return !x.disabled; });
    if (!f.length) return;
    var i = f.indexOf(document.activeElement);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });
  setTimeout(function () { var h = document.getElementById('recReload'); if (h) h.focus(); }, 0);
};
})();
