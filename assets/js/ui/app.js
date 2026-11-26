/* PokerTrainer 2.0 – UI-Controller: Tisch, Ablauf einer Hand, Coach-Anzeige, Analyse-Dienst (Web Worker),
   Speicherung, Mehrfach-Tab-Schutz, Service-Worker-Updates. Nutzt nur window.PT (Engine) und Browserfunktionen. */
(function () {
'use strict';
var PT = window.PT, PTUI = window.PTUI = window.PTUI || {}, U = PT.util, Store = PTUI.Store;
var $ = function (id) { return document.getElementById(id); }, esc = U.esc, fmt = U.fmt, pct = U.pct;
var N = 6, MAX_HANDS = 3000;
var SPEED = { langsam: 1100, normal: 650, schnell: 220, sehrschnell: 70 };
var DEFAULTS = { tipMode: 'vorher', smode: 'exploit', depth: 'auto', level: 'standard', speech: true, speechRate: 1.05, speed: 'normal', theme: 'auto',
  advanced: false, fourColor: false, recordHands: true, seed: null };
var S = PTUI.S = {
  settings: U.deepClone(DEFAULTS), db: PT.stats.newDb(), heroRec: PT.stats.newRecord('hero', 'Du'), table: null, hand: null, finished: null,
  learning: PT.training.newLearning(), prof: null, decisionNo: 0, cur: null, analysis: null, verdict: null, handDecisions: [], pendingGrades: [],
  training: null, readonly: false, ready: false, reveal: false, shownBoard: 0, lastStreet: -1, timer: null, speech: null, tipNo: 0, speaking: null, cancelled: null,
  notes: {}, view: 'tisch', sessionId: Date.now(), swWaiting: null
};

// ---------- Hilfen ----------
function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function dateTxt(ts) { if (!ts) return '–'; try { return new Date(ts).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return new Date(ts).toISOString(); } }
function plain(u) { return (u / 100).toFixed(2).replace('.', ','); }
function bbTxt(u, d) { return U.fmtBB(u, S.table ? S.table.cfg.bb : 100, d); }
function cardHtml(c, cls) {
  var s = c & 3, red = s === 1 || s === 2;
  return '<span class="card' + (red ? ' red' : '') + ' s-' + 'cdhs'.charAt(s) + (cls ? ' ' + cls : '') + '" aria-label="' + PT.cards.RANK_NAME_DE[c >> 2] + ' ' + PT.cards.SUIT_NAME[s] + '"><b>' + PT.cards.RANK_LABEL[c >> 2] + '</b><i aria-hidden="true">' + PT.cards.SUIT_SYM[s] + '</i></span>';
}
function backHtml(cls) { return '<span class="card back' + (cls ? ' ' + cls : '') + '" aria-label="verdeckte Karte"></span>'; }
function cardsHtml(str, cls) { var a = PT.parseCards(str || '') || []; return a.map(function (c) { return cardHtml(c, cls); }).join(''); }
function toast(t, ms) { var el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('on'); }, ms || 3200); }
function download(name, text, type) {
  // In der Claude-Vorschau sind Downloads nur über die Fähigkeit „downloads“ möglich
  if (S.claudeDl) { S.claudeDl.save({ filename: name, data: text }).catch(function () { toast('Speichern nicht möglich. Bitte die Website oder die Offline-Datei nutzen.'); }); return true; }
  try {
    var blob = new Blob([text], { type: type || 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 8000);
    return true;
  } catch (e) { return false; }
}
var GLOSS_KEYS = Object.keys(PT.glossary).sort(function (a, b) { return b.length - a.length; });
function termify(textEsc) {
  var used = {}, out = textEsc;
  GLOSS_KEYS.forEach(function (k) {
    if (used[k]) return;
    var re = new RegExp('(^|[\\s(„])(' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=[\\s,.;:)“!?]|$)');
    if (re.test(out) && !/<button[^>]*>[^<]*$/.test(out.split(re)[0] || '')) { out = out.replace(re, '$1<button type="button" class="term" data-term="' + esc(k) + '">$2</button>'); used[k] = 1; }
  });
  return out;
}
function openModal(title, html) {
  S.modalReturn = document.activeElement;
  $('modalH').textContent = title; $('modalBody').innerHTML = html; $('modal').hidden = false; $('modalX').focus();
}
function closeModal() {
  $('modal').hidden = true; $('modalBody').innerHTML = '';
  if (S.modalReturn && S.modalReturn.focus && document.body.contains(S.modalReturn)) S.modalReturn.focus();
}
function showTerm(k) { openModal(k, '<p>' + esc(PT.glossary[k] || '') + '</p><p class="muted">Weitere Begriffe im Bereich Hilfe → Glossar.</p>'); }
function showMsg(text, info) { var m = $('msg'); m.textContent = text || ''; m.classList.toggle('info', !!info); }

// ---------- Analyse-Dienst (Web Worker, Rückfall Hauptthread) ----------
var Analyzer = (function () {
  var worker = null, seq = 0, pending = {}, broken = false, busySince = 0;
  function spawn() {
    if (broken) return null;
    try {
      if (window.PT_INLINE) {
        var src = document.getElementById('pt-engine').textContent + '\n' + document.getElementById('pt-worker').textContent;
        worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      } else worker = new Worker('assets/js/worker.js?v=' + PT.VERSION);
      worker.onmessage = function (e) {
        var m = e.data || {}, p = pending[m.id]; if (!p) return;
        delete pending[m.id]; busySince = 0;
        if (m.ok) p.res(m.result); else p.rej(new Error(m.error || 'Analysefehler'));
      };
      worker.onerror = function (e) { e.preventDefault && e.preventDefault(); fail('Worker-Fehler'); };
    } catch (e) { worker = null; broken = true; }
    return worker;
  }
  function fail(why) {
    try { if (worker) worker.terminate(); } catch (e) { /* leer */ }
    worker = null;
    var ids = Object.keys(pending);
    ids.forEach(function (id) { var p = pending[id]; delete pending[id]; runMain(p.kind, p.input).then(p.res, p.rej); });
    if (why === 'Worker-Fehler') broken = true;
  }
  function runMain(kind, input) {
    return new Promise(function (res, rej) {
      setTimeout(function () {
        try { res(kind === 'analyze' ? PT.coach.analyze(input) : null); } catch (e) { rej(e); }
      }, 0);
    });
  }
  function run(kind, input, timeoutMs) {
    if (!worker) spawn();
    if (!worker) return runMain(kind, input);
    var id = ++seq;
    return new Promise(function (res, rej) {
      pending[id] = { res: res, rej: rej, kind: kind, input: input };
      busySince = busySince || Date.now();
      try { worker.postMessage({ id: id, kind: kind, input: input }); } catch (e) { delete pending[id]; runMain(kind, input).then(res, rej); return; }
      setTimeout(function () { if (pending[id]) { fail('Zeitüberschreitung'); } }, timeoutMs || 9000);
    });
  }
  /** Bricht laufende Berechnungen ab (veraltete Situation). */
  function cancel() {
    var ids = Object.keys(pending);
    if (!ids.length) return;
    ids.forEach(function (id) { var p = pending[id]; delete pending[id]; p.rej(new Error('abgebrochen')); });
    try { if (worker) worker.terminate(); } catch (e) { /* leer */ }
    worker = null;
  }
  return { run: run, cancel: cancel, mode: function () { return broken ? 'Hauptthread' : (worker || !broken ? 'Web Worker' : 'Hauptthread'); } };
})();
PTUI.Analyzer = Analyzer;

// ---------- Speicherung ----------
function metaRecord() { return { k: 'state', v: 2, table: S.table, settings: S.settings, heroRec: S.heroRec, app: PT.VERSION, saved: Date.now() }; }
function persist(changedIds) {
  if (S.readonly) return Promise.resolve();
  var seen = {}, recs = (changedIds || []).filter(function (id) { if (seen[id] || !S.db.opps[id]) return false; seen[id] = 1; return true; }).map(function (id) { return S.db.opps[id]; });
  var p = [Store.put('meta', JSON.parse(JSON.stringify(metaRecord())))];
  if (recs.length) p.push(Store.put('opps', recs));
  return Promise.all(p).then(function () { if (S.notes.storageErr) { S.notes.storageErr = ''; renderNotice(); } }, storageError);
}
function persistAllOpps() { return Store.put('opps', PT.stats.dbList(S.db), true).catch(storageError); }
function persistLearning() { if (S.readonly) return Promise.resolve(); return Store.put('learn', { k: 'learning', v: S.learning }).catch(storageError); }
function storageError(e) { S.notes.storageErr = 'Speichern fehlgeschlagen (' + ((e && (e.name || e.message)) || e) + '). Bitte eine Sicherung exportieren.'; renderNotice(); }
PTUI.persist = persist; PTUI.persistAllOpps = persistAllOpps; PTUI.persistLearning = persistLearning;

// ---------- Sprachausgabe ----------
function initSpeech() {
  var simulateNone = /ohne-sprache/.test(location.hash || '') || /ohne-sprache/.test(location.search || '');
  var synth = null, Ut = null;
  try { if (!simulateNone && 'speechSynthesis' in window && window.SpeechSynthesisUtterance) { synth = window.speechSynthesis; Ut = window.SpeechSynthesisUtterance; } } catch (e) { synth = null; }
  S.speech = new PT.Speech({ synth: synth, Utter: Ut, setTimeout: function (f, t) { return setTimeout(f, t); }, clearTimeout: function (id) { clearTimeout(id); } });
  S.speech.onstatus = function (state, id) {
    if (state === 'spricht') S.speaking = id;
    else if (state === 'abgebrochen') { S.cancelled = id; if (S.speaking === id) S.speaking = null; }
    else if (S.speaking === id) S.speaking = null;
    renderSpeechStat();
  };
  if (!S.speech.available) { S.notes.speech = 'Dein Browser bietet keine Sprachfunktion. Der Trainer läuft ohne Ton weiter, die Tipps erscheinen als Text.'; return; }
  function pick() { var v = null; try { v = PT.pickVoice(synth.getVoices()); } catch (e) { v = null; } if (v) { S.speech.voice = v; S.notes.speech = ''; renderNotice(); renderSpeechStat(); } return v; }
  if (!pick()) {
    try { synth.addEventListener('voiceschanged', function () { if (!S.speech.voice) pick(); }); } catch (e) { /* leer */ }
    setTimeout(function () { if (!S.speech.voice && !pick()) { S.notes.speech = 'Keine lokale deutsche Stimme gefunden. Der Trainer läuft ohne Ton weiter.'; renderNotice(); renderSpeechStat(); } }, 2500);
  }
}
function speakText(text) {
  if (!S.settings.speech || !S.speech || !S.speech.available || !text) return;
  S.speech.enabled = true; S.speech.rate = S.settings.speechRate || 1.05;
  var no = ++S.tipNo;
  S.speech.speak(PT.toSpeech(text), no);
  renderSpeechStat();
}

// ---------- Rendering Tisch ----------
function seatData(i) {
  var h = S.hand;
  if (h) { var q = h.p[i]; return { id: q.id, name: q.name, stack: q.stack, bet: q.bet, folded: q.folded, allIn: q.allIn, cards: q.cards, pos: q.pos }; }
  var s = S.table ? S.table.seats[i] : { id: i ? '' : 'hero', stack: 10000 };
  return { id: s.id, name: i === 0 ? 'Du' : PT.bots.nameOf(s.id), stack: s.stack, bet: 0, folded: false, allIn: false, cards: [], pos: '' };
}
function lastActLabel(h, i) {
  if (!h) return '';
  var q = h.p[i];
  if (h.done) { var sh = h.result && h.result.shown.filter(function (x) { return x.seat === i; })[0]; return sh ? sh.name : (q.folded ? 'Fold' : ''); }
  if (q.folded) return 'Fold';
  for (var k = h.actions.length - 1; k >= 0; k--) {
    var x = h.actions[k]; if (x.st !== h.street) break;
    if (x.s === i) { var ai = x.ai ? ' · All-in' : ''; return { sb: 'SB', bb: 'BB', check: 'Check', call: 'Call' + ai, bet: 'Bet ' + fmt(x.a) + ai, raise: 'Raise ' + fmt(x.a) + ai, fold: 'Fold' }[x.t] || ''; }
  }
  return q.allIn ? 'All-in' : '';
}
function v(x) { return x == null ? '–' : String(x); }
function renderSeats() {
  var h = S.hand, html = '', bets = '', bb = S.table ? S.table.cfg.bb : 100;
  for (var i = 0; i < N; i++) {
    var d = seatData(i), me = i === 0, act = h && !h.done && !S.reveal && h.toAct === i;
    var win = h && h.done && !S.reveal && h.result && h.result.net[i] > 0;
    var cls = 'seat s' + i + (me ? ' me' : '') + (d.folded ? ' folded' : '') + (act ? ' act' : '') + (win ? ' win' : '');
    var inner = '<span class="r1"><span class="nm">' + esc(d.name) + '</span><span class="pos">' + esc(d.pos || '') + '</span></span>' +
      '<span class="stk">' + fmt(d.stack) + ' <small>' + U.fmtBB(d.stack, bb) + '</small>' + (d.allIn && h && !h.done ? ' · All-in' : '') + '</span>';
    if (me) {
      inner += '<span class="hud2">' + (S.training ? 'Training: ' + esc(S.training.name) : 'Session ' + U.fmtSigned(S.table ? PT.session.heroNet(S.table) : 0)) + '</span>';
    } else {
      var pr = PT.stats.profile(S.db.opps[d.id]);
      inner += '<span class="hud" title="VPIP / PFR / 3-Bet in Prozent">' + '<span class="lbl">VPIP/PFR/3B </span><b>' + v(pr.vpip) + '/' + v(pr.pfr) + '/' + v(pr.threeBet) + '</b></span>' +
        '<span class="hud2">' + pr.hands + ' H<span class="bel"> · ' + esc(pr.bel) + '</span> · <span class="typ">' + esc(pr.typ) + '</span></span>';
    }
    var hole = '';
    if (h && d.cards.length && !d.folded) {
      var face = me || !!(h.done && h.result && h.result.showdown && !S.reveal) || (h.done && h.result && h.result.showdown && S.reveal && S.shownBoard >= h.board.length);
      if (h.done && h.result && h.result.showdown) face = me || true;
      hole = d.cards.map(function (c) { return face ? cardHtml(c, me ? 'lg' : '') : backHtml(); }).join('');
    }
    var marks = '';
    if (h) {
      if (h.button === i) marks += '<span class="chipmark d" title="Dealer-Button">D</span>';
      else if (h.sbSeat() === i) marks += '<span class="chipmark sb" title="Small Blind">SB</span>';
      else if (h.bbSeat() === i) marks += '<span class="chipmark bb" title="Big Blind">BB</span>';
    }
    var extra = '<span class="hole">' + hole + '</span>' + marks + '<span class="lastact">' + esc(lastActLabel(h, i)) + '</span>';
    var plate = me ? '<div class="plate" aria-label="Dein Platz">' + inner + extra + '</div>'
      : '<button class="plate" type="button" data-opp="' + esc(d.id) + '" aria-label="Werte von ' + esc(d.name) + ' anzeigen">' + inner + extra + '</button>';
    if (h && !h.done && d.bet > 0) bets += '<span class="bet b' + i + '">' + fmt(d.bet) + '</span>';
    html += '<div class="' + cls + '">' + plate + '</div>';
  }
  $('seats').innerHTML = html + bets;
}
function potsHtml(h) {
  if (!h) return '<span class="pot">Pot 0,00</span>';
  if (h.done) return '<span class="pot">Pot ' + fmt(h.result.pots.reduce(function (s, p) { return s + p.amount; }, 0) + (h.result.rake || 0)) + '</span>';
  var pots = h.pots();
  if (pots.length <= 1) return '<span class="pot">Pot ' + fmt(h.potTotal()) + '</span>';
  return pots.map(function (p, i) { return '<span class="pot' + (i ? ' side' : '') + '">' + (i === 0 ? 'Main Pot ' : 'Side Pot ' + i + ' ') + fmt(p.amount) + '</span>'; }).join('');
}
function resultText(h) {
  var r = h.result; if (!r) return '';
  var lines = [], multi = r.pots.length > 1;
  function hn(seat) { var x = r.shown.filter(function (s) { return s.seat === seat; })[0]; return x ? x.name : ''; }
  r.pots.forEach(function (p, i) {
    var who = p.winners.map(function (s) { return h.p[s].name; }), label = multi ? (i === 0 ? 'Main Pot ' : 'Side Pot ' + i + ' ') + fmt(p.amount) + ': ' : '';
    if (p.winners.length > 1) lines.push(label + who.join(' und ') + ' teilen' + (multi ? '' : ' ' + fmt(p.amount)) + ' (Split Pot' + (r.showdown ? ', ' + hn(p.winners[0]) : '') + ')');
    else lines.push(label + who[0] + (multi ? '' : (who[0] === 'Du' ? ' gewinnst ' : ' gewinnt ') + fmt(p.amount)) + (r.showdown ? ' mit ' + hn(p.winners[0]) : ' ohne Showdown'));
  });
  (r.returned || []).forEach(function (x) { lines.push('Nicht gecallt zurück an ' + h.p[x.seat].name + ': ' + fmt(x.amount)); });
  if (r.rake) lines.push('Rake ' + fmt(r.rake));
  return lines.join(' · ');
}
function renderCenter() {
  var h = S.hand;
  $('pots').innerHTML = potsHtml(h);
  var vis = h ? ((h.done && S.reveal) ? S.shownBoard : h.board.length) : 0;
  if (h && !h.done) S.shownBoard = h.board.length;
  $('board').innerHTML = h ? h.board.slice(0, vis).map(function (c) { return cardHtml(c); }).join('') : '';
  var rt = (h && h.done && !S.reveal) ? resultText(h) : '';
  $('result').textContent = rt; $('result2').textContent = rt;
}
function myTurn() { var h = S.hand; return !!(h && !h.done && h.toAct === 0 && !S.reveal && !S.readonly); }
function presetList(h, L) {
  var pot = h.potTotal(), bb = h.bb, out = [];
  if (h.street === 0) {
    if (h.raises === 0) [2, 2.5, 3].forEach(function (x) { out.push([String(x).replace('.', ',') + ' BB', x * bb + h.limpers * bb]); });
    else if (h.raises === 1) [3, 4].forEach(function (x) { out.push([x + '×', h.cur * x]); });
    else out.push(['2,3×', h.cur * 2.3]);
  } else if (L.isBet) [[0.33, '⅓'], [0.5, '½'], [0.75, '¾'], [1, 'Pot'], [1.5, '1,5×']].forEach(function (x) { out.push([x[1], pot * x[0]]); });
  else [[2.5, '2,5×'], [3, '3×']].forEach(function (x) { out.push([x[1], h.cur * x[0]]); });
  out.unshift(['Min', L.minTo]);
  out.push(['All-in', L.maxTo]);
  return out.map(function (x) { var u = Math.max(1, Math.round(bb / 10)); var to = Math.round(x[1] / u) * u; return [x[0], Math.max(L.minTo, Math.min(L.maxTo, to))]; });
}
function sliderToAmt(L, x) { var t = x / 100; return Math.round(L.minTo + (L.maxTo - L.minTo) * t * t); }
function amtToSlider(L, a) { if (L.maxTo <= L.minTo) return 100; return Math.round(100 * Math.sqrt(Math.max(0, (a - L.minTo) / (L.maxTo - L.minTo)))); }
function renderControls() {
  var h = S.hand, my = myTurn(), L = my ? h.legal(0) : null;
  $('bFold').disabled = !my || !L.canFold;
  $('bCall').disabled = !my;
  $('bCall').innerHTML = (L ? (L.canCheck ? 'Check' : 'Call ' + fmt(L.callAmt) + (L.callAmt >= L.stack ? ' (All-in)' : '')) : 'Check / Call') + '<kbd>C</kbd>';
  var canR = my && L.canRaise;
  $('bRaise').disabled = !canR;
  $('bRaise').innerHTML = (L && L.isBet ? 'Bet' : 'Raise auf') + '<kbd>R</kbd>';
  $('amt').disabled = !canR; $('slider').disabled = !canR;
  var pre = canR ? presetList(h, L) : [];
  $('presets').innerHTML = pre.map(function (p, i) { return '<button class="preset" type="button" data-amt="' + p[1] + '" title="' + fmt(p[1]) + '">' + esc(p[0]) + (i < 9 ? '<kbd>' + (i + 1) + '</kbd>' : '') + '</button>'; }).join('');
  var nextOk = S.ready && !S.readonly && (!h || h.done) && !S.reveal;
  $('bNext').disabled = !nextOk;
  $('bNext').classList.toggle('pulse', nextOk);
  $('bNext').innerHTML = (S.training ? 'Nächste Situation' : 'Nächste Hand') + '<kbd>N</kbd>';
}
function renderStatus() {
  var t = S.table; if (!t) { $('status').textContent = 'Lade …'; return; }
  var running = S.hand && !S.hand.done && !S.training, no = t.handNo + (running ? 1 : 0), left = t.cfg.swapEvery - t.sinceSwap;
  $('status').innerHTML = (S.training ? '<span>Training <b>' + esc(S.training.name) + '</b> · ' + S.training.count + ' Situationen</span>' : '<span>Hand <b>' + no + '</b></span>' +
    (t.cfg.swapEvery ? '<span>Gegnerwechsel in <b>' + left + '</b> ' + (left === 1 ? 'Hand' : 'Händen') + '</span>' : '')) +
    '<span>Ergebnis <b>' + U.fmtSigned(PT.session.heroNet(t)) + '</b></span>' + (t.rebuys ? '<span>Nachkäufe <b>' + t.rebuys + '</b></span>' : '') +
    '<span class="muted">' + fmt(t.cfg.sb) + '/' + fmt(t.cfg.bb) + '</span>';
}
function factsHtml(a) {
  var f = [], bb = a.bb;
  function fact(lbl, val, adv) { f.push('<div class="fact' + (adv ? ' adv' : '') + '"><span>' + lbl + '</span><b>' + val + '</b></div>'); }
  fact('Equity', pct(a.equity.eq) + (a.equity.se ? ' <small>± ' + pct(1.96 * a.equity.se, 1) + '</small>' : ''));
  if (a.potOdds) fact('Benötigt', pct(a.potOdds.need));
  fact('Pot', fmt(a.pot));
  fact('Eff. Stack', U.fmtBB(a.eff, bb));
  if (a.street > 0) fact('SPR', a.spr.toFixed(1).replace('.', ','), true);
  if (a.actions.length > 1) fact('EV-Vorsprung', a.gap != null ? bbTxt(a.gap, 2) : '–', true);
  fact('Unsicherheit', '± ' + bbTxt(a.uncertainty, 1), true);
  return '<div class="facts">' + f.join('') + '</div>';
}
function evTableHtml(a) {
  var maxAbs = Math.max.apply(null, a.actions.map(function (x) { return Math.abs(x.ev); }).concat([1]));
  return '<table class="evtable"><thead><tr><th>Aktion</th><th>EV</th><th>±</th><th></th></tr></thead><tbody>' + a.actions.slice(0, 9).map(function (x, i) {
    var w = Math.round(50 * Math.abs(x.ev) / maxAbs);
    return '<tr' + (i === 0 ? ' class="best"' : '') + '><td>' + esc(x.label) + '</td><td>' + bbTxt(x.ev, 2) + '</td><td>' + bbTxt(x.u, 1) + '</td><td><span class="evbar' + (x.ev < 0 ? ' neg' : '') + '" style="width:' + w + 'px"></span></td></tr>';
  }).join('') + '</tbody></table>';
}
function depthOf() { var d = S.settings.depth; if (d !== 'auto') return d; return S.prof ? S.prof.level : 'einsteiger'; }
function analysisHtml(a, full) {
  var d = depthOf(), txt = a.text[d] || a.text.fortgeschritten, adv = S.settings.advanced;
  var html = '<div class="tipaction">' + esc(a.bestLabel) + ' <span class="badge c-' + a.classification + '">' + esc(a.classText) + '</span></div>' +
    '<p class="tipreason">' + termify(esc(txt)) + '</p>' + factsHtml(a);
  if (a.sizeNote) html += '<div class="small">' + esc(a.sizeNote) + '</div>';
  if (a.learnerHint && d === 'einsteiger') html += '<div class="small">' + esc(a.learnerHint) + '</div>';
  if (full !== false) {
    html += '<details class="more"' + (adv ? ' open' : '') + '><summary>EV-Vergleich und Annahmen</summary>' + evTableHtml(a) +
      '<p class="small">Equity: ' + esc(a.equity.method) + (a.equity.rangeLo != null ? ' · je nach Range-Annahme ' + pct(a.equity.rangeLo) + '–' + pct(a.equity.rangeHi) : '') +
      ' · ' + a.iters.toLocaleString('de-DE') + ' Simulationen (max. ' + a.maxSim.toLocaleString('de-DE') + ') · ' + a.ms + ' ms · Stufe ' + esc(a.levelName) + '</p>' +
      (a.mainOpp ? '<p class="small">' + a.opponents.filter(function (o) { return !o.pending; }).map(function (o) { return esc(o.name) + ': ' + esc(o.line) + ', ' + Math.round(o.combos) + ' Kombos, ' + o.hands + ' Hände (' + esc(o.bel) + ')'; }).join(' · ') +
        ' <button class="ghost" type="button" data-act="showrange">Range anzeigen</button></p>' : '') +
      (a.modeDiff ? '<p class="small"><b>Modusvergleich:</b> ' + esc(a.modeDiff.text) + ' ' + esc(a.modeDiff.reasons.join(' ')) + '</p>' : '<p class="small">Exploitativer und gleichgewichtsnaher Modus empfehlen hier dasselbe.</p>') +
      (a.model ? '<p class="small"><b>River-Modellspiel:</b> ' + a.model.freqs.map(function (q) { return esc(q.act) + ' ' + pct(q.f); }).join(', ') + '. ' + esc(a.model.note) + '</p>' : '') +
      (a.blockers ? '<p class="small">' + esc(a.blockers.text) + '</p>' : '') +
      '<p class="small">' + termify(esc(a.text.experte)) + '</p></details>';
  }
  return html;
}
function gradeHtml(g) {
  var cls = 'g-' + g.grade.replace(/\s/g, '');
  return '<span class="grade ' + cls + '">' + esc(g.grade) + '</span> <span class="small">(' + esc(g.simple) + (g.lossBB != null ? ', EV-Verlust ' + bbTxt(g.loss, 2) : '') + ')</span>';
}
function renderTip() {
  var mode = S.settings.tipMode, box = $('tipBox'), my = myTurn(), html;
  Array.prototype.forEach.call(document.querySelectorAll('#modes button'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode)); });
  Array.prototype.forEach.call(document.querySelectorAll('#smodes button'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-smode') === S.settings.smode)); });
  $('depth').value = S.settings.depth;
  var a = S.analysis && S.cur && S.analysis.decision === S.cur.id ? S.analysis.a : null;
  if (mode === 'aus') html = '<p class="tipreason muted">Tipps sind aus. Bewertungen werden weiter im Hintergrund für deinen Lernfortschritt gespeichert.</p>';
  else if (mode === 'vorher') {
    if (my && a) html = analysisHtml(a);
    else if (my) html = '<p class="tipreason muted">Analyse läuft …</p>';
    else html = S.verdict ? '<div class="tipaction">' + gradeHtml(S.verdict.g) + '</div><p class="tipreason">' + termify(esc(S.verdict.g.text)) + '</p><p class="small">Gespielt: ' + esc(S.verdict.g.chosenLabel) + '</p>'
      : '<p class="tipreason muted">Der Tipp erscheint, sobald du am Zug bist.</p>';
  } else {
    var vd = S.verdict;
    if (vd) html = '<div class="tipaction">' + gradeHtml(vd.g) + '</div><p class="tipreason">' + termify(esc(vd.g.text)) + '</p><p class="small">Empfohlen: ' + esc(vd.g.bestLabel) + ' · Gespielt: ' + esc(vd.g.chosenLabel) + '</p>' + (vd.a ? analysisHtml(vd.a, true).replace(/^<div class="tipaction">.*?<\/div>/, '') : '');
    else html = '<p class="tipreason muted">Das Urteil erscheint, nachdem du gehandelt hast.</p>';
    if (my) html += '<p class="small">Du bist am Zug – das Urteil folgt nach deiner Aktion.</p>';
  }
  box.innerHTML = html;
  $('speechOn').checked = !!S.settings.speech;
  $('speechOn').disabled = !(S.speech && S.speech.available);
  $('bSay').disabled = !(S.speech && S.speech.available && S.speech.voice && S.settings.speech && mode !== 'aus');
  $('bDeep').disabled = !(my && mode !== 'aus');
  $('faust').textContent = 'Modellschätzung, kein Solver-Ergebnis – Faustregeln und vereinfachte Modelle';
  renderSpeechStat();
}
function renderSpeechStat() {
  var sp = S.speech, txt;
  if (!sp || !sp.available) txt = 'Sprache: keine Sprachfunktion im Browser';
  else if (!sp.voice) txt = 'Sprache: ' + (S.notes.speech ? 'keine lokale deutsche Stimme' : 'Stimme wird gesucht …');
  else if (!S.settings.speech) txt = 'Sprache: aus';
  else txt = 'Sprache: ' + (S.speaking ? 'spricht' : 'bereit') + ' · Stimme ' + sp.voice.name;
  $('speechStat').textContent = txt;
}
function renderLog() {
  var h = S.hand, ol = $('log');
  ol.innerHTML = h ? h.log.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') : '<li class="muted">Noch keine Hand gespielt.</li>';
  ol.scrollTop = ol.scrollHeight;
}
function renderNotice() {
  var parts = [], el = $('notice');
  ['readonly', 'storage', 'storageErr', 'speech', 'legacy', 'update', 'resume'].forEach(function (k) { if (S.notes[k]) parts.push(S.notes[k]); });
  el.hidden = !parts.length;
  el.innerHTML = parts.map(function (p) { return '<div class="row">' + (typeof p === 'string' ? '<span>' + esc(p) + '</span>' : p.html) + '</div>'; }).join('');
}
function renderTrainbar() {
  var tb = $('trainbar');
  if (!S.training) { tb.hidden = true; return; }
  tb.hidden = false;
  var tr = S.training, avg = tr.scores.length ? Math.round(tr.scores.reduce(function (a, b) { return a + b; }, 0) / tr.scores.length) : null;
  tb.innerHTML = '<span><b>Training: ' + esc(tr.name) + '</b>' + (tr.review ? ' · Wiederholung' : '') + ' · Situation ' + tr.count + (avg != null ? ' · Ø Qualität ' + avg : '') + (tr.difficulty ? ' · Gegnerfeld: ' + esc(PT.session.DIFFICULTY[tr.difficulty].name) : '') + '</span>' +
    '<span><button class="btn" type="button" data-act="trainstop">Training beenden</button></span>';
}
function render() {
  document.body.classList.toggle('simple', !S.settings.advanced);
  $('bView').textContent = S.settings.advanced ? 'Erweitert' : 'Einfach';
  $('bView').setAttribute('aria-pressed', String(!!S.settings.advanced));
  document.body.classList.toggle('four', !!S.settings.fourColor);
  renderStatus(); renderSeats(); renderCenter(); renderControls(); renderTip(); renderLog(); renderNotice(); renderTrainbar();
}
PTUI.render = render;

// ---------- Ablauf einer Hand ----------
function nextHand() {
  if (!S.ready || S.readonly || (S.hand && !S.hand.done) || S.reveal) return;
  clearTimeout(S.timer); Analyzer.cancel();
  if (S.speech) S.speech.stop();
  S.finished = null; S.analysis = null; S.verdict = null; S.cur = null; S.handDecisions = []; S.pendingGrades = [];
  S.shownBoard = 0; S.lastStreet = 0; showMsg('');
  if (S.training) {
    var tr = S.training, item = null, seed;
    if (tr.queue && tr.queue.length) { item = tr.queue.shift(); seed = item.seed; tr.review = item.key; }
    else { tr.review = null; seed = (PT.rng.hashStr(tr.cat + '|' + Date.now() + '|' + tr.count) >>> 0); }
    // Adaptive Schwierigkeit: Gegnerfeld nach Kompetenz in dieser Kategorie
    var catNow = item ? item.cat : tr.cat, sp = S.prof && S.prof.spots[catNow], diff = S.table.cfg.difficulty;
    if (sp && sp.n >= 8) diff = sp.smooth >= 80 ? 'experte' : sp.smooth < 60 ? 'anfaenger' : 'fortgeschritten';
    tr.difficulty = diff;
    var g = PT.training.generate(catNow, seed, { difficulty: diff, ts: Date.now() });
    if (!g) { showMsg('Für diese Kategorie konnte gerade keine passende Situation erzeugt werden. Bitte erneut versuchen.'); return; }
    tr.count++; tr.seed = seed; tr.curCat = item ? item.cat : tr.cat; tr.target = true;
    S.hand = g.hand; S.hand.botRng = PT.rng.stream(seed, 'train-bots'); S.hand.isTraining = true;
    S.lastStreet = S.hand.street;
  } else {
    S.hand = PT.session.startHand(S.table, Date.now());
    persist([]);
  }
  drive();
}
function botStep(h) {
  if (h.isTraining) {
    var s = h.toAct, a = PT.bots.decideFor(h, s, h.botRng, { heroStats: PT.session.heroCtx(S.heroRec) }), r = h.act(s, a);
    if (!r.ok) { var L = h.legal(s); h.act(s, L.canCheck ? { type: 'check' } : { type: 'call' }); }
    return;
  }
  PT.session.botAct(S.table, h, S.heroRec);
  persist([]);
}
function drive() {
  clearTimeout(S.timer); S.timer = null;
  var h = S.hand; if (!h) return;
  if (h.done) { handEnded(); return; }
  if (h.toAct === 0) { onHeroTurn(); return; }
  if (h.p[0].folded) {
    var guard = 0;
    while (!h.done && h.toAct > 0 && guard < 400) { botStep(h); guard++; }
    if (!h.done) { render(); showMsg('Interner Fehler: Die Hand hängt. Bitte „Nächste Hand“ wählen.'); h.done = true; return; }
    S.shownBoard = h.board.length; handEnded(); return;
  }
  render();
  var delay = SPEED[S.settings.speed] || 650;
  if (h.street !== S.lastStreet) { delay += 300; S.lastStreet = h.street; }
  S.timer = setTimeout(function () { if (S.hand !== h) return; botStep(h); drive(); }, delay);
}
function snapshotOpps(h) {
  var o = {};
  h.p.forEach(function (q) { if (!q.isHero && S.db.opps[q.id] && !h.isTraining) o[q.id] = JSON.parse(JSON.stringify(S.db.opps[q.id])); });
  return o;
}
function learnerSummary() {
  if (!S.prof) return null;
  var spots = {};
  Object.keys(S.prof.spots).forEach(function (k) { var s = S.prof.spots[k]; spots[k] = { n: s.n, score: s.smooth == null ? 70 : s.smooth }; });
  return { spots: spots, cats: S.prof.cats };
}
function coachSettings(level) { return { mode: S.settings.smode, level: level || S.settings.level, depth: depthOf() }; }
function onHeroTurn() {
  var h = S.hand;
  S.decisionNo++;
  var id = S.decisionNo, view = PT.bots.publicView(h, 0), opps = snapshotOpps(h);
  var seed = PT.rng.hashStr((S.table ? S.table.seed : 0) + '|' + h.no + '|' + h.actions.length + '|' + (h.isTraining ? 'T' + S.training.seed : 'P'));
  S.cur = { id: id, view: view, opps: opps, seed: seed, t0: performance.now(), street: h.street, idx: h.actions.length, pos: h.p[0].pos, training: h.isTraining ? S.training.curCat : null, target: h.isTraining && S.training.target };
  if (h.isTraining) S.training.target = false;
  S.analysis = null; S.lastStreet = h.street;
  var L = h.legal(0);
  $('amt').value = L.canRaise ? plain(L.minTo) : ''; $('slider').value = 0;
  render();
  var cur = S.cur;
  cur.promise = Analyzer.run('analyze', { view: view, opps: opps, settings: coachSettings(), seed: seed, learner: learnerSummary() }).then(function (a) {
    cur.analysis = a;
    if (S.cur === cur) {
      S.analysis = { decision: id, a: a };
      a.shownAfter = Math.round(performance.now() - cur.t0);
      if (S.settings.tipMode === 'vorher' && myTurn()) { renderTip(); speakText(a.text.speech); }
    }
    return a;
  }, function (e) { if (e && e.message === 'abgebrochen') return null; if (S.cur === cur) showMsg('Analyse fehlgeschlagen: ' + (e && e.message)); return null; });
}
function deepAnalysis() {
  var cur = S.cur; if (!cur || !myTurn()) return;
  var levels = ['standard', 'praezise', 'tief'], lv = S.settings.level === 'tief' ? 'tief' : (levels[levels.indexOf(S.settings.level) + 1] || 'tief');
  if (S.settings.level === 'schnell') lv = 'praezise';
  $('tipBox').insertAdjacentHTML('beforeend', '<p class="small" id="deepInfo">Tiefenanalyse (' + esc(PT.equity.LEVELS[lv].name) + ') läuft …</p>');
  Analyzer.run('analyze', { view: cur.view, opps: cur.opps, settings: coachSettings(lv), seed: cur.seed, learner: learnerSummary() }, 20000).then(function (a) {
    if (S.cur !== cur) return;
    cur.analysis = a; S.analysis = { decision: cur.id, a: a };
    renderTip();
  }, function () { var d = $('deepInfo'); if (d) d.textContent = 'Tiefenanalyse abgebrochen.'; });
}
function actLabel(a, L) {
  if (a.type === 'fold') return 'Fold'; if (a.type === 'check') return 'Check'; if (a.type === 'call') return 'Call ' + fmt(L.callAmt);
  if (a.type === 'allin') return 'All-in';
  return (a.type === 'bet' ? 'Bet ' : 'Raise auf ') + fmt(a.amount);
}
function heroAct(a) {
  var h = S.hand;
  if (!myTurn()) return;
  var L = h.legal(0), r = h.isTraining ? h.act(0, a) : PT.session.act(S.table, h, 0, a);
  if (!r.ok) { showMsg(r.error); return; }
  showMsg('');
  var cur = S.cur, chosen = { type: r.action.t, amount: r.action.a, label: actLabel({ type: r.action.t, amount: r.action.a }, L) };
  if (r.action.t === 'call') chosen.label = 'Call ' + fmt(r.action.a) + (r.action.ai ? ' (All-in)' : '');
  if ((r.action.t === 'bet' || r.action.t === 'raise') && r.action.ai) chosen.label += ' (All-in)';
  var gp = gradeDecision(cur, chosen);
  S.pendingGrades.push(gp);
  if (!h.isTraining) persist([]);
  drive();
}
function gradeDecision(cur, chosen) {
  var p = (cur.promise || Promise.resolve(null)).then(function (a) {
    if (!a) return null;
    var isAggr = chosen.type === 'bet' || chosen.type === 'raise';
    var has = !isAggr || a.actions.some(function (x) { return (x.type === 'bet' || x.type === 'raise') && x.amount === chosen.amount; });
    if (has) return a;
    return Analyzer.run('analyze', { view: cur.view, opps: cur.opps, settings: coachSettings(), seed: cur.seed, extra: [chosen.amount], learner: learnerSummary() }).catch(function () { return a; });
  }).then(function (a) {
    if (!a) return null;
    var g = PT.coach.grade(a, chosen);
    var dec = { i: cur.idx, st: cur.street, chosen: chosen.label, rec: a.bestLabel, cls: a.classification, eq: Math.round(a.equity.eq * 1000) / 1000,
      need: a.potOdds ? Math.round(a.potOdds.need * 1000) / 1000 : null, grade: g.grade, score: g.score, loss: Math.round(g.loss), cats: g.cats, tags: a.spotTags,
      evs: a.actions.slice(0, 6).map(function (x) { return { l: x.label, ev: Math.round(x.ev), u: Math.round(x.u) }; }), mode: a.mode, pos: cur.pos,
      snap: { view: cur.view, opps: cur.opps, seed: cur.seed } };
    S.handDecisions.push(dec);
    var opp = a.opponents.filter(function (o) { return o.name === a.mainOpp; })[0];
    PT.training.addDecision(S.learning, { ts: Date.now(), score: g.score, lossBB: g.lossBB, st: cur.street, pos: cur.pos, tags: a.spotTags, cats: g.cats,
      opptyp: opp ? opp.typ : null, training: cur.training, grade: g.grade, session: S.sessionId });
    if (cur.training && S.training && cur.target) {
      S.training.scores.push(g.score);
      if (S.training.review) PT.training.srsReview(S.learning, S.training.review, g.score, Date.now());
      renderTrainbar();
    }
    if (g.score <= 45) PT.training.srsAdd(S.learning, { key: 'd' + cur.seed, cat: cur.training || (a.spotTags[0] || 'preflop-open'), seed: cur.seed, view: { view: cur.view, opps: cur.opps }, label: a.situation }, Date.now());
    S.prof = PT.training.profile(S.learning);
    persistLearning();
    S.verdict = { g: g, a: a, decision: cur.id };
    if (S.cur === cur || !myTurn()) {
      renderTip();
      if (S.settings.tipMode === 'nachher') speakText(g.grade + '. ' + (g.score >= 80 ? '' : 'Empfohlen war ' + g.bestLabel + '.'));
    }
    return dec;
  }).catch(function (e) { console.warn('Bewertung fehlgeschlagen', e); return null; });
  return p;
}
function handEnded() {
  var h = S.hand;
  if (S.finished === h) { render(); return; }
  S.finished = h;
  var notes = [];
  if (!h.isTraining) {
    var res = PT.session.finishHand(S.table, S.db, h, S.heroRec);
    persist(res.changed);
    res.ev.rebuys.forEach(function (x) { notes.push(x.seat === 0 ? 'Du kaufst ' + fmt(x.amount) + ' Spielgeld nach.' : h.p[x.seat].name + ' kauft nach.'); });
    if (res.ev.swap) notes.push(res.ev.swap.leftName + ' verlässt den Tisch (Datensatz ins Archiv). Neu ab der nächsten Hand: ' + res.ev.swap.joinedName + '.');
  }
  var decisionsP = Promise.all(S.pendingGrades);
  var types = {}; h.p.forEach(function (q) { if (!q.isHero) types[q.id] = PT.stats.playerType(S.db.opps[q.id]); });
  decisionsP.then(function () {
    if (!S.settings.recordHands || S.readonly) return;
    var rec = PT.training.makeHandRecord(h, { session: S.sessionId, seed: S.table.seed, decisions: S.handDecisions.slice(), types: types, training: h.isTraining ? S.training && S.training.curCat : null });
    return Store.addHand(rec, MAX_HANDS).catch(storageError);
  });
  if (notes.length) showMsg(notes.join(' '), true);
  if (h.result.showdown && !h.p[0].folded && S.shownBoard < h.board.length) { S.reveal = true; revealStep(); }
  else { S.reveal = false; render(); }
}
function revealStep() {
  var h = S.hand;
  S.shownBoard = S.shownBoard < 3 ? 3 : S.shownBoard + 1;
  if (S.shownBoard >= h.board.length) { S.shownBoard = h.board.length; S.reveal = false; render(); return; }
  render();
  S.timer = setTimeout(revealStep, Math.max(450, (SPEED[S.settings.speed] || 650) + 200));
}
function onRaise() {
  var h = S.hand; if (!myTurn()) return;
  var L = h.legal(0), raw = $('amt').value, u = PT.parseAmount(raw);
  if (u == null) { showMsg('Ungültiger Betrag „' + raw.slice(0, 20) + '“: Bitte eine Zahl wie 4,50 eingeben.'); return; }
  heroAct({ type: L.isBet ? 'bet' : 'raise', amount: u });
}

// ---------- Gegnerdetails ----------
function shownHtml(s) {
  var names = ['Preflop', 'Flop', 'Turn', 'River'], acts = [];
  s.actions.forEach(function (a, i) { if (a) acts.push('<b>' + names[i] + ':</b> ' + esc(a)); });
  return '<li><div class="cards">' + cardsHtml(s.cards, 'sm') + '<span class="muted">&nbsp;' + esc(s.pos) + ' · Hand #' + s.hand + ' · ' + esc(dateTxt(s.ts)) + '</span></div>' +
    (s.board ? '<div class="cards"><span class="muted">Board&nbsp;</span>' + cardsHtml(s.board, 'sm') + '</div>' : '') +
    '<div>' + acts.join(' · ') + '</div><div class="muted">Ergebnis ' + U.fmtSigned(s.net) + '</div></li>';
}
function statRows(r) {
  var ST = PT.stats;
  return ST.STATS.map(function (k) {
    var nd = r.stats[k], ci = ST.wilson(nd), sm = PT.ranges.smooth(r.stats)[k];
    return '<tr><td><button type="button" class="term" data-help="' + k + '">' + esc(ST.STAT_LABEL[k]) + '</button></td><td class="n">' + (nd[1] ? ST.pctOf(nd) + ' %' : 'unbekannt') + '</td><td class="n">' + nd[0] + ' / ' + nd[1] +
      '</td><td class="n">' + (ci ? Math.round(ci[0] * 100) + '–' + Math.round(ci[1] * 100) + ' %' : '–') + '</td><td class="n">' + Math.round(sm * 100) + ' %</td></tr>';
  }).join('');
}
function showOpp(id) {
  var r = S.db.opps[id]; if (!r) { toast('Noch keine Daten zu diesem Gegner.'); return; }
  var ST = PT.stats, pr = ST.profile(r), seated = S.table && S.table.seats.some(function (s) { return s.id === id; });
  var af = ST.af(r.agg);
  var posRows = ST.POSITIONS.map(function (p) { var x = r.pos[p]; return '<tr><td>' + p + '</td><td class="n">' + x.h + '</td><td class="n">' + (x.vpip[1] ? ST.pctOf(x.vpip) + ' %' : 'unbekannt') + '</td><td class="n">' + (x.pfr[1] ? ST.pctOf(x.pfr) + ' %' : 'unbekannt') + '</td></tr>'; }).join('');
  openModal(r.name,
    '<div class="kv"><span>' + (seated ? 'am Tisch (aktiv)' : 'im Archiv') + '</span><span>Hände <b>' + r.hands + '</b></span><span>Belastbarkeit <b>' + esc(pr.bel) + '</b></span>' +
    '<span>Spielertyp <b>' + esc(pr.typ) + '</b></span><span>AF <b>' + (af == null ? 'unbekannt' : af === Infinity ? '∞' : af.toFixed(1).replace('.', ',')) + '</b></span><span>zuletzt gesehen ' + esc(dateTxt(r.lastSeen)) + '</span></div>' +
    '<div class="scroll"><table class="grid"><thead><tr><th>Wert</th><th class="n">Rohwert</th><th class="n">Zähler / Nenner</th><th class="n">95-%-Intervall</th><th class="n">geglättet</th></tr></thead><tbody>' + statRows(r) + '</tbody></table></div>' +
    '<p class="small">„Geglättet“ mischt die eigenen Beobachtungen mit dem Durchschnitt der Population (Beta-Prior); so nutzt der Coach die Werte. Bei kleinen Stichproben ist das Intervall breit.</p>' +
    '<h3>Nach Position</h3><div class="scroll"><table class="grid"><thead><tr><th>Position</th><th class="n">Hände</th><th class="n">VPIP</th><th class="n">PFR</th></tr></thead><tbody>' + posRows + '</tbody></table></div>' +
    '<h3>Aufgedeckte Blätter (bis 10, neueste zuerst)</h3>' + (r.shown.length ? '<ul class="shown">' + r.shown.map(shownHtml).join('') + '</ul>' : '<p class="muted">Noch keine aufgedeckten Blätter.</p>') +
    '<p class="muted">Alle Werte stammen nur aus dem, was am Tisch sichtbar war: Aktionen und aufgedeckte Blätter.</p>');
}
PTUI.showOpp = showOpp;

// ---------- Einstellungen anwenden ----------
function applyTheme() {
  var t = S.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  var meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.setAttribute('content', t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? '#0e1113' : '#0f5a4a');
}
function setSetting(k, val) {
  S.settings[k] = val;
  if (k === 'theme') applyTheme();
  if (k === 'speech' && S.speech) { S.speech.enabled = val; if (!val) S.speech.stop(); }
  persist([]);
  render();
}
PTUI.setSetting = setSetting;
function setMode(mode) {
  if (S.settings.tipMode === mode) return;
  S.settings.tipMode = mode;
  if (S.speech) S.speech.stop();
  renderTip();
  if (mode === 'vorher' && myTurn() && S.analysis && S.cur && S.analysis.decision === S.cur.id) speakText(S.analysis.a.text.speech);
  persist([]);
}
function setSMode(m) {
  if (S.settings.smode === m) return;
  S.settings.smode = m; persist([]);
  if (myTurn() && S.cur) { var cur = S.cur; S.analysis = null; renderTip();
    cur.promise = Analyzer.run('analyze', { view: cur.view, opps: cur.opps, settings: coachSettings(), seed: cur.seed, learner: learnerSummary() }).then(function (a) { cur.analysis = a; if (S.cur === cur) { S.analysis = { decision: cur.id, a: a }; renderTip(); } return a; }, function () { return null; }); }
  else renderTip();
}

// ---------- Ansichten ----------
var VIEWS = ['tisch', 'training', 'analyse', 'ranges', 'gegner', 'fortschritt', 'einstellungen', 'hilfe'];
function route() {
  var hash = (location.hash || '#tisch').slice(1).split('/'), name = VIEWS.indexOf(hash[0]) >= 0 ? hash[0] : 'tisch';
  S.view = name; S.viewArg = hash.slice(1).join('/');
  VIEWS.forEach(function (v2) { var el = $('view-' + v2); if (el) el.hidden = v2 !== name; });
  Array.prototype.forEach.call(document.querySelectorAll('#nav a'), function (a) { if (a.getAttribute('data-view') === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (name !== 'tisch' && PTUI.views && PTUI.views[name]) { try { PTUI.views[name]($('view-' + name), S.viewArg); } catch (e) { $('view-' + name).innerHTML = '<p class="bad">Fehler beim Anzeigen: ' + esc(e.message) + '</p>'; console.error(e); } }
  if (name === 'tisch') render();
}
PTUI.route = route;
PTUI.startTraining = function (cat, queue) {
  if (S.hand && !S.hand.done) { toast('Bitte erst die laufende Hand beenden.'); location.hash = '#tisch'; return; }
  var sc = PT.training.SCEN[cat] || PT.training.SCEN['preflop-open'];
  S.training = { cat: cat, name: queue ? 'Wiederholung' : sc.name, count: 0, scores: [], queue: queue || null };
  S.hand = null; location.hash = '#tisch'; render(); nextHand();
};
PTUI.stopTraining = function () { if (S.hand && !S.hand.done) { toast('Bitte erst die laufende Situation beenden.'); return; } S.training = null; S.hand = null; render(); };

// ---------- Bedienung ----------
function bind() {
  $('bNext').addEventListener('click', nextHand);
  $('bFold').addEventListener('click', function () { heroAct({ type: 'fold' }); });
  $('bCall').addEventListener('click', function () { if (!myTurn()) return; var L = S.hand.legal(0); heroAct(L.canCheck ? { type: 'check' } : { type: 'call' }); });
  $('bRaise').addEventListener('click', onRaise);
  $('presets').addEventListener('click', function (e) { var b = e.target.closest('button[data-amt]'); if (!b || !myTurn()) return; var amt = +b.getAttribute('data-amt'), L = S.hand.legal(0); $('amt').value = plain(amt); $('slider').value = amtToSlider(L, amt); showMsg(''); });
  $('slider').addEventListener('input', function () { if (!myTurn()) return; var L = S.hand.legal(0), a = sliderToAmt(L, +$('slider').value); var u = Math.max(1, Math.round(S.hand.bb / 10)); a = Math.min(L.maxTo, Math.max(L.minTo, Math.round(a / u) * u)); $('amt').value = plain(a); });
  $('modes').addEventListener('click', function (e) { var b = e.target.closest('button[data-mode]'); if (b) setMode(b.getAttribute('data-mode')); });
  $('smodes').addEventListener('click', function (e) { var b = e.target.closest('button[data-smode]'); if (b) setSMode(b.getAttribute('data-smode')); });
  $('depth').addEventListener('change', function () { S.settings.depth = $('depth').value; persist([]); renderTip(); });
  $('speechOn').addEventListener('change', function () { setSetting('speech', $('speechOn').checked); });
  $('bSay').addEventListener('click', function () {
    if (S.settings.tipMode === 'nachher' && S.verdict) speakText(S.verdict.g.grade + '. ' + S.verdict.g.text);
    else if (S.analysis) speakText(S.analysis.a.text.speech);
  });
  $('bDeep').addEventListener('click', deepAnalysis);
  $('bView').addEventListener('click', function () { setSetting('advanced', !S.settings.advanced); });
  $('bTheme').addEventListener('click', function () { var order = ['auto', 'light', 'dark'], t = order[(order.indexOf(S.settings.theme) + 1) % 3]; setSetting('theme', t); toast('Darstellung: ' + ({ auto: 'automatisch', light: 'hell', dark: 'dunkel' })[t]); });
  $('seats').addEventListener('click', function (e) { var b = e.target.closest('[data-opp]'); if (b) showOpp(b.getAttribute('data-opp')); });
  $('modalX').addEventListener('click', closeModal);
  $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) closeModal(); });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-term]'); if (t) { showTerm(t.getAttribute('data-term')); return; }
    var hp = e.target.closest('[data-help]'); if (hp) { var k = hp.getAttribute('data-help'); openModal(PT.stats.STAT_LABEL[k], '<p>' + esc(PT.stats.STAT_HELP[k]) + '</p>'); return; }
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'trainstop') PTUI.stopTraining();
    else if (act === 'showrange' && S.analysis) { PTUI.lastRange = S.analysis.a; location.hash = '#ranges/aktuell'; }
    else if (act === 'legacydl' && S.legacyBackup) download(S.legacyBackup.name, S.legacyBackup.text);
    else if (act === 'swupdate' && S.swWaiting) { if (S.hand && !S.hand.done) { toast('Bitte erst die laufende Hand beenden, dann aktualisieren.'); return; } S.swUpdating = true; S.swWaiting.postMessage({ type: 'SKIP_WAITING' }); }
    else if (act === 'dismiss') { S.notes[b.getAttribute('data-note')] = ''; renderNotice(); }
  });
  window.addEventListener('hashchange', route);
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$('modal').hidden) { if (e.key === 'Escape') closeModal(); return; }
    if (S.view !== 'tisch') return;
    var tg = e.target, tag = tg && tg.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') { if (tg.id === 'amt' && e.key === 'Enter') { e.preventDefault(); onRaise(); } return; }
    if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    var k = e.key.toLowerCase();
    if (k === 'f') { if (!$('bFold').disabled) $('bFold').click(); }
    else if (k === 'c' || k === 'k') { if (!$('bCall').disabled) $('bCall').click(); }
    else if (k === 'r' || k === 'b') { if (!$('bRaise').disabled) { e.preventDefault(); $('amt').focus(); $('amt').select(); } }
    else if (k === 'a') { var pa = document.querySelectorAll('#presets button'); if (pa.length) pa[pa.length - 1].click(); }
    else if (/^[1-9]$/.test(k)) { var ps = document.querySelectorAll('#presets button'); if (ps[+k - 1]) ps[+k - 1].click(); }
    else if (k === 'n' || k === 'enter' || k === ' ') { if (!$('bNext').disabled) { e.preventDefault(); $('bNext').click(); } }
    else if (k === 't') { var order = ['vorher', 'nachher', 'aus']; setMode(order[(order.indexOf(S.settings.tipMode) + 1) % 3]); }
    else if (k === '?') location.hash = '#hilfe/tasten';
  });
  window.addEventListener('pagehide', function () { persist([]); });
}

// ---------- Mehrere Tabs ----------
function acquireLock() {
  return new Promise(function (res) {
    try {
      if (navigator.locks && navigator.locks.request) {
        navigator.locks.request('pokertrainer-tisch', { ifAvailable: true }, function (lock) {
          if (!lock) { res(false); return Promise.resolve(); }
          res(true); return new Promise(function () { /* bis zum Schließen halten */ });
        }).catch(function () { res(true); });
        return;
      }
    } catch (e) { /* leer */ }
    // Rückfall: BroadcastChannel-Abfrage
    try {
      var bc = new BroadcastChannel('pokertrainer'), other = false;
      bc.onmessage = function (ev) { if (ev.data === 'wer') bc.postMessage('ich'); else if (ev.data === 'ich') other = true; };
      bc.postMessage('wer');
      setTimeout(function () { res(!other); }, 250);
    } catch (e2) { res(true); }
  });
}

// ---------- Service Worker ----------
function registerSW() {
  if (!('serviceWorker' in navigator) || window.PT_INLINE || !/^https:$|^http:$/.test(location.protocol)) return;
  if (location.protocol === 'http:' && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  navigator.serviceWorker.register('sw.js', { scope: './' }).then(function (reg) {
    function waiting(w) { S.swWaiting = w; S.notes.update = { html: '<span>Eine neue Version des PokerTrainers ist bereit.</span><button class="btn" type="button" data-act="swupdate">Jetzt aktualisieren</button>' }; renderNotice(); }
    if (reg.waiting && navigator.serviceWorker.controller) waiting(reg.waiting);
    S.hadController = !!navigator.serviceWorker.controller;
    reg.addEventListener('updatefound', function () {
      var nw = reg.installing; if (!nw) return;
      nw.addEventListener('statechange', function () { if (nw.state === 'installed' && navigator.serviceWorker.controller) waiting(nw); });
    });
    setInterval(function () { reg.update().catch(function () {}); }, 60 * 60 * 1000);
  }).catch(function () { /* offline-fähig nur ohne SW */ });
  var reloading = false;
  // Neu laden nur bei einem vom Nutzer bestätigten Update, nicht bei der ersten Installation
  navigator.serviceWorker.addEventListener('controllerchange', function () { if (reloading || !S.swUpdating) return; reloading = true; persist([]).then(function () { location.reload(); }); });
}

// ---------- Start ----------
function legacyBackupText(list) {
  var body = JSON.stringify(list);
  return '{"format":"PokerTrainer-DB","version":1,"exported":' + JSON.stringify(new Date().toISOString()) + ',"count":' + list.length + ',"checksum":"' + U.fnv1a(body) + '","opponents":' + body + '}\n';
}
function boot() {
  S.dlReady = new Promise(function (res) {
    try {
      if (window.claude && typeof window.claude.use === 'function') { window.claude.use('downloads').then(function (d) { S.claudeDl = d || null; res(); }, function () { S.claudeDl = null; res(); }); setTimeout(res, 1500); }
      else res();
    } catch (e) { S.claudeDl = null; res(); }
  });
  bind();
  $('verText').textContent = PT.VERSION;
  initSpeech();
  render();
  acquireLock().then(function (ok) {
    S.readonly = !ok;
    if (!ok) S.notes.readonly = 'Der PokerTrainer ist bereits in einem anderen Tab geöffnet. Dieser Tab ist schreibgeschützt, damit keine Daten überschrieben werden.';
    return Store.init();
  }).then(function () {
    return Promise.all([Store.get('meta', 'state'), Store.all('opps'), Store.get('learn', 'learning')]);
  }).then(function (r) {
    var meta = r[0], opps = r[1] || [], learn = r[2];
    S.db = PT.stats.dbFromList(opps);
    if (S.db.skipped) S.notes.storage = S.db.skipped + ' beschädigte Gegner-Einträge im Speicher wurden übersprungen.';
    if (meta && meta.settings) Object.keys(DEFAULTS).forEach(function (k) { if (meta.settings[k] !== undefined && typeof meta.settings[k] === typeof DEFAULTS[k] || (k === 'seed')) S.settings[k] = meta.settings[k]; });
    if (meta && meta.heroRec && !PT.stats.validRecord(meta.heroRec)) S.heroRec = PT.stats.cloneRecord(meta.heroRec);
    if (learn && learn.v && !PT.training.validLearning(learn.v)) S.learning = learn.v;
    S.prof = PT.training.profile(S.learning);
    if (meta && PT.session.validTable(meta.table)) S.table = meta.table;
    return Store.findLegacy().then(function (legacy) {
      if (legacy && !(meta && meta.legacyDone)) {
        var list = Array.isArray(legacy.opps) ? legacy.opps : [];
        var text = legacyBackupText(list), name = 'Sicherung_PokerTrainer_' + today() + '_Datenbank.json';
        S.legacyBackup = { name: name, text: text };
        Store.put('backup', { k: 'legacy-' + today(), name: name, text: text, ts: Date.now() });
        S.dlReady.then(function () { download(name, text); });
        var old = PT.stats.dbFromList(list), n = 0;
        Object.keys(old.opps).forEach(function (id) { if (!S.db.opps[id]) { S.db.opps[id] = old.opps[id]; n++; } });
        if (!S.table) S.table = PT.session.migrateTable(legacy.meta && legacy.meta.table, S.db);
        S.notes.legacy = { html: '<span>Daten aus Entwurf 2 übernommen: ' + n + ' Gegner. Eine Sicherung der alten Datenbank wurde als Datei angeboten.</span><button class="btn" type="button" data-act="legacydl">Sicherung erneut herunterladen</button>' };
        S.legacyDone = true;
        return persistAllOpps();
      }
    }).then(function () { return meta; });
  }).then(function (meta) {
    if (!S.table) S.table = PT.session.newTable(PT.session.defaultConfig(), S.db, S.settings.seed != null ? S.settings.seed : null);
    PT.session.syncStatuses(S.table, S.db);
    applyTheme();
    var running = S.table.running;
    if (running) {
      var h = PT.session.resumeHand(S.table, S.heroRec);
      if (h && !h.done) { S.hand = h; S.notes.resume = 'Die beim Schließen laufende Hand #' + h.no + ' wurde exakt wiederhergestellt.'; }
      else if (h && h.done) { S.hand = h; }
      else { S.table.running = null; S.notes.resume = 'Eine beim Schließen laufende Hand konnte nicht wiederhergestellt werden und wurde verworfen.'; }
    }
    var mr = metaRecord(); if (S.legacyDone || (meta && meta.legacyDone)) mr.legacyDone = true;
    if (!S.readonly) Store.put('meta', JSON.parse(JSON.stringify(mr))).catch(storageError);
    if (Store.mode() === 'mem') S.notes.storage = 'Dieser Browser erlaubt hier kein dauerhaftes Speichern. Bitte regelmäßig eine Sicherung exportieren.';
    S.ready = true;
    route();
    if (S.hand && !S.hand.done) drive();
  }).catch(function (e) {
    console.error(e);
    S.table = S.table || PT.session.newTable(PT.session.defaultConfig(), S.db); S.ready = true;
    S.notes.storage = 'Gespeicherte Daten konnten nicht geladen werden (' + ((e && e.message) || e) + ').';
    route();
  });
  registerSW();
}
PTUI.h = { $: $, esc: esc, cardHtml: cardHtml, cardsHtml: cardsHtml, backHtml: backHtml, openModal: openModal, closeModal: closeModal, toast: toast, download: download,
  dateTxt: dateTxt, today: today, termify: termify, bbTxt: bbTxt, gradeHtml: gradeHtml, analysisHtml: analysisHtml, evTableHtml: evTableHtml, potsHtml: potsHtml, depthOf: depthOf,
  coachSettings: coachSettings, learnerSummary: learnerSummary, metaRecord: metaRecord };
PTUI.boot = boot;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);
})();
