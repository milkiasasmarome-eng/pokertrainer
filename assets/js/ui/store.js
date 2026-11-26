/* PokerTrainer 2.0 – Persistenz: IndexedDB (Rückfall localStorage, sonst nur Sitzung), Migration aus Entwurf 2.
   Seit 2.1: Zeitlimits für alle Startzugriffe (kein dauerhaft hängender Ladezustand), abgesicherter Start (?start=sicher),
   Speicherfehler werden als abgelehnte Promise gemeldet statt synchron zu werfen. */
(function () {
'use strict';
var PTUI = window.PTUI = window.PTUI || {};
var NAME = 'pokertrainer2', VER = 1, LSK = 'pokertrainer20.', STORES = ['meta', 'opps', 'hands', 'learn', 'backup'];
var KEYS = { meta: 'k', opps: 'id', hands: 'id', learn: 'k', backup: 'k' };
var OPEN_TIMEOUT = 6000, LEGACY_TIMEOUT = 3000;
var S = { mode: 'mem', db: null, mem: {}, reason: null, detail: '' };
STORES.forEach(function (s) { S.mem[s] = {}; });

function reqP(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
function txDone(tx) { return new Promise(function (res, rej) { tx.oncomplete = function () { res(); }; tx.onerror = function () { rej(tx.error || new Error('Schreibfehler')); }; tx.onabort = function () { rej(tx.error || new Error('abgebrochen')); }; }); }
/** Führt fn aus; synchrone Ausnahmen (z. B. geschlossene Datenbank) werden zur abgelehnten Promise. */
function safe(fn) { try { return fn(); } catch (e) { return Promise.reject(e); } }
function errName(e) { return (e && (e.name || e.message)) || String(e); }
function openIdb(timeoutMs) {
  return new Promise(function (res, rej) {
    var done = false, timer = null;
    function finish(ok, val) { if (done) return false; done = true; clearTimeout(timer); (ok ? res : rej)(val); return true; }
    try {
      if (!window.indexedDB) { var e0 = new Error('IndexedDB nicht vorhanden'); e0.kind = 'unavailable'; finish(false, e0); return; }
      var rq = window.indexedDB.open(NAME, VER);
      timer = setTimeout(function () { var e1 = new Error('IndexedDB antwortet nicht (Zeitlimit ' + Math.round(timeoutMs / 1000) + ' s)'); e1.kind = 'timeout'; finish(false, e1); }, timeoutMs);
      rq.onupgradeneeded = function () {
        var d = rq.result;
        STORES.forEach(function (s) { if (!d.objectStoreNames.contains(s)) { var os = d.createObjectStore(s, { keyPath: KEYS[s] }); if (s === 'hands') os.createIndex('ts', 'ts'); } });
      };
      rq.onsuccess = function () {
        var d = rq.result;
        // Antwort nach dem Zeitlimit: Verbindung wieder schließen, die Sitzung läuft bereits ohne IndexedDB
        if (done) { try { d.close(); } catch (e) { /* leer */ } return; }
        d.onversionchange = function () { d.close(); };
        // Fehlen Speicherbereiche (fremde oder beschädigte Datenbank gleicher Version), nicht stillschweigend weiterarbeiten
        var missing = STORES.filter(function (s) { return !d.objectStoreNames.contains(s); });
        if (missing.length) { try { d.close(); } catch (e) { /* leer */ } var e2 = new Error('Speicherbereiche fehlen: ' + missing.join(', ')); e2.kind = 'error'; finish(false, e2); return; }
        finish(true, d);
      };
      rq.onerror = function (ev) {
        if (ev && ev.preventDefault) ev.preventDefault();
        var e3 = rq.error || new Error('IndexedDB-Fehler');
        // Privater Modus / gesperrt: IndexedDB gibt es hier nicht → localStorage. Andere Fehler (z. B. VersionError nach einer
        // Rückstufung, beschädigte Datenbank): Daten existieren, sind aber nicht lesbar → nur Arbeitsspeicher, nichts überschreiben.
        e3.kind = /^(InvalidStateError|SecurityError|NotAllowedError|NotSupportedError)$/.test(e3.name || '') ? 'unavailable' : 'error';
        finish(false, e3);
      };
      rq.onblocked = function () { var e4 = new Error('IndexedDB blockiert (anderer Tab mit älterer Version geöffnet)'); e4.kind = 'blocked'; finish(false, e4); };
    } catch (e) { e.kind = e.kind || (e.name === 'SecurityError' ? 'unavailable' : 'error'); finish(false, e); }
  });
}
function lsOk() { try { var k = LSK + 'probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; } }
function lsGet(store) {
  var raw = localStorage.getItem(LSK + store), o;
  if (!raw) return {};
  try { o = JSON.parse(raw); } catch (e) { var er = new Error('localStorage-Bereich „' + store + '“ beschädigt'); er.name = 'DataError'; throw er; }
  return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
}
function lsSet(store, obj) { localStorage.setItem(LSK + store, JSON.stringify(obj)); }
function safeStart() { try { return /(^|[?&])start=sicher(&|$)/.test(location.search.slice(1)); } catch (e) { return false; } }

var Store = {
  mode: function () { return S.mode; },
  /** Warum gespeichert wird, wie gespeichert wird: { mode, reason: null|'safe'|'timeout'|'blocked'|'unavailable'|'error'|'fallback', detail } */
  info: function () { return { mode: S.mode, reason: S.reason, detail: S.detail }; },
  safeMode: safeStart,
  init: function (opts) {
    opts = opts || {};
    if (safeStart()) { S.mode = 'mem'; S.reason = 'safe'; S.detail = 'abgesicherter Start'; return Promise.resolve(S.mode); }
    return openIdb(opts.timeout || OPEN_TIMEOUT).then(function (d) { S.db = d; S.mode = 'idb'; }, function (e) {
      S.detail = errName(e) + (e && e.message && e.message !== e.name ? ': ' + e.message : '');
      // Hängt oder blockiert IndexedDB, wird NICHT auf localStorage ausgewichen: Dort lägen sonst getrennte, veraltete Daten.
      if (e && (e.kind === 'timeout' || e.kind === 'blocked' || e.kind === 'error')) { S.mode = 'mem'; S.reason = e.kind; return; }
      S.mode = lsOk() ? 'ls' : 'mem'; S.reason = S.mode === 'ls' ? 'fallback' : 'unavailable';
    }).then(function () { try { if (S.mode === 'idb' && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) { /* leer */ } return S.mode; });
  },
  /** Ab sofort nur noch im Arbeitsspeicher arbeiten (nach einem Ladefehler); gespeicherte Daten bleiben unangetastet. */
  goMem: function (reason, detail) {
    if (S.db) { try { S.db.close(); } catch (e) { /* leer */ } }
    S.db = null; S.mode = 'mem'; S.reason = reason || 'error'; S.detail = detail || S.detail;
    STORES.forEach(function (s) { S.mem[s] = {}; });
  },
  get: function (store, key) {
    return safe(function () {
      if (S.mode === 'idb') return reqP(S.db.transaction(store, 'readonly').objectStore(store).get(key));
      if (S.mode === 'ls') return Promise.resolve(lsGet(store)[key]);
      return Promise.resolve(S.mem[store][key]);
    });
  },
  all: function (store) {
    return safe(function () {
      if (S.mode === 'idb') return reqP(S.db.transaction(store, 'readonly').objectStore(store).getAll());
      var o = S.mode === 'ls' ? lsGet(store) : S.mem[store];
      return Promise.resolve(Object.keys(o).map(function (k) { return o[k]; }));
    });
  },
  put: function (store, vals, clearFirst) {
    vals = Array.isArray(vals) ? vals : [vals];
    if (S.mode === 'idb') return safe(function () {
      var tx = S.db.transaction(store, 'readwrite'), os = tx.objectStore(store);
      if (clearFirst) os.clear();
      vals.forEach(function (v) { os.put(v); });
      return txDone(tx);
    });
    try {
      var o = clearFirst ? {} : (S.mode === 'ls' ? lsGet(store) : S.mem[store]), kp = KEYS[store];
      vals.forEach(function (v) { o[v[kp]] = v; });
      if (S.mode === 'ls') lsSet(store, o); else S.mem[store] = o;
      return Promise.resolve();
    } catch (e) { return Promise.reject(e); }
  },
  del: function (store, keys) {
    keys = Array.isArray(keys) ? keys : [keys];
    if (S.mode === 'idb') return safe(function () { var tx = S.db.transaction(store, 'readwrite'), os = tx.objectStore(store); keys.forEach(function (k) { os.delete(k); }); return txDone(tx); });
    return safe(function () {
      var o = S.mode === 'ls' ? lsGet(store) : S.mem[store];
      keys.forEach(function (k) { delete o[k]; });
      if (S.mode === 'ls') lsSet(store, o);
      return Promise.resolve();
    });
  },
  clear: function (store) {
    if (S.mode === 'idb') return safe(function () { var tx = S.db.transaction(store, 'readwrite'); tx.objectStore(store).clear(); return txDone(tx); });
    return safe(function () { if (S.mode === 'ls') localStorage.removeItem(LSK + store); else S.mem[store] = {}; return Promise.resolve(); });
  },
  clearAll: function () { return Promise.all(STORES.map(function (s) { return Store.clear(s); })); },
  /** Hände: neueste zuerst; begrenzt auf max Einträge (älteste werden entfernt) */
  addHand: function (rec, max) {
    return Store.put('hands', rec).then(function () {
      return Store.all('hands').then(function (list) {
        if (list.length <= max) return;
        list.sort(function (a, b) { return a.ts - b.ts; });
        return Store.del('hands', list.slice(0, list.length - max).map(function (h) { return h.id; }));
      });
    });
  },
  /**
   * Sucht Daten aus Entwurf 2 (IndexedDB „pokertrainer-v2“, localStorage „pokertrainer2.*“) im selben Ursprung.
   * Legt keine leere alte Datenbank an.
   */
  findLegacy: function () {
    function viaIdb() {
      return new Promise(function (res0) {
        var done = false, timer = setTimeout(function () { res(null); }, LEGACY_TIMEOUT);
        function res(v) { if (done) return; done = true; clearTimeout(timer); res0(v); }
        try {
          if (S.reason === 'safe' || !window.indexedDB) { res(null); return; }
          var created = false, rq = window.indexedDB.open('pokertrainer-v2');
          rq.onupgradeneeded = function (ev) { if (ev.oldVersion === 0) { created = true; try { rq.transaction.abort(); } catch (e) { /* leer */ } } };
          rq.onerror = function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); res(null); };
          rq.onblocked = function () { res(null); };
          rq.onsuccess = function () {
            var d = rq.result;
            if (done || created || !d.objectStoreNames.contains('gegner') || !d.objectStoreNames.contains('meta')) { d.close(); res(null); return; }
            var tx = d.transaction(['gegner', 'meta'], 'readonly'), out = { opps: [], meta: null, source: 'IndexedDB pokertrainer-v2' };
            var a = tx.objectStore('gegner').getAll(); a.onsuccess = function () { out.opps = a.result || []; };
            var b = tx.objectStore('meta').get('tisch'); b.onsuccess = function () { out.meta = b.result ? b.result.v : null; };
            tx.oncomplete = function () { d.close(); res(out.opps.length || out.meta ? out : null); };
            tx.onerror = function () { d.close(); res(null); };
          };
        } catch (e) { res(null); }
      });
    }
    return viaIdb().then(function (r) {
      if (r) return r;
      if (S.reason === 'safe') return null;
      try {
        var g = localStorage.getItem('pokertrainer2.gegner'), m = localStorage.getItem('pokertrainer2.meta');
        if (g) return { opps: JSON.parse(g) || [], meta: m ? JSON.parse(m) : null, source: 'localStorage pokertrainer2' };
      } catch (e) { /* leer */ }
      return null;
    });
  }
};
PTUI.Store = Store;
})();
