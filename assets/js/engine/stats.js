/* PokerTrainer 2.0 – Statistik-Engine und Gegnerdatenbank.
   Alle Werte entstehen nur aus öffentlich sichtbaren Aktionen und am Showdown gezeigten Karten.
   Jede Statistik zählt Zähler und Nenner je tatsächlicher Gelegenheit. */
(function (G) {
'use strict';
var PT = G.PT, U = PT.util, isInt = U.isInt;

var STATS = ['vpip', 'pfr', 'threeBet', 'fourBet', 'foldTo3Bet', 'foldTo4Bet', 'steal', 'foldToSteal',
  'cbetFlop', 'cbetTurn', 'cbetRiver', 'foldToCbet', 'foldToCbetTurn', 'checkRaise', 'afq', 'wtsd', 'wsd'];
var STAT_LABEL = { vpip: 'VPIP', pfr: 'PFR', threeBet: '3-Bet', fourBet: '4-Bet', foldTo3Bet: 'Fold gegen 3-Bet', foldTo4Bet: 'Fold gegen 4-Bet',
  steal: 'Attempt to Steal', foldToSteal: 'Fold gegen Steal', cbetFlop: 'C-Bet Flop', cbetTurn: 'C-Bet Turn', cbetRiver: 'C-Bet River',
  foldToCbet: 'Fold gegen C-Bet (Flop)', foldToCbetTurn: 'Fold gegen C-Bet (Turn)', checkRaise: 'Check-Raise', afq: 'Aggression Frequency',
  wtsd: 'WTSD', wsd: 'W$SD' };
var STAT_HELP = {
  vpip: 'Anteil der Hände, in denen freiwillig Geld preflop investiert wurde (Call oder Raise).',
  pfr: 'Anteil der Hände mit einem Preflop-Raise.',
  threeBet: 'Re-Raise gegen genau einen Raise, je Gelegenheit.',
  fourBet: 'Re-Raise gegen eine 3-Bet, je Gelegenheit.',
  foldTo3Bet: 'Fold als Opener gegen eine 3-Bet.',
  foldTo4Bet: 'Fold als 3-Bettor gegen eine 4-Bet.',
  steal: 'Open-Raise aus CO, BTN oder SB, wenn alle davor gefoldet haben.',
  foldToSteal: 'Fold aus SB oder BB gegen einen Steal-Versuch.',
  cbetFlop: 'Bet des Preflop-Aggressors auf dem Flop, wenn vor ihm niemand gesetzt hat.',
  cbetTurn: 'Zweite Bet (Barrel) des Aggressors auf dem Turn nach einer Flop-C-Bet.',
  cbetRiver: 'Dritte Bet auf dem River nach C-Bets auf Flop und Turn.',
  foldToCbet: 'Fold gegen eine Flop-C-Bet.',
  foldToCbetTurn: 'Fold gegen eine Turn-C-Bet.',
  checkRaise: 'Check und anschließender Raise auf derselben Straße, je Gelegenheit.',
  afq: 'Anteil von Bet und Raise an allen Postflop-Aktionen außer Check.',
  wtsd: 'Anteil der gesehenen Flops, die bis zum Showdown gespielt wurden.',
  wsd: 'Anteil der Showdowns mit Gewinn.' };
var V1_STATS = ['vpip', 'pfr', 'threeBet', 'foldTo3Bet', 'cbet', 'foldToCbet', 'wtsd'];
var POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
var SHOWN_MAX = 10;

function emptyStats() { var o = {}; STATS.forEach(function (k) { o[k] = [0, 0]; }); return o; }
function emptyAgg() { return { bet: 0, raise: 0, call: 0, fold: 0, check: 0 }; }
function emptyPos() { var o = {}; POSITIONS.forEach(function (p) { o[p] = { h: 0, vpip: [0, 0], pfr: [0, 0] }; }); return o; }

/** Werte einer Hand je Sitz aus dem öffentlichen Verlauf */
function handStats(rec) {
  var S = {};
  rec.seats.forEach(function (st) { S[st.seat] = { stats: emptyStats(), agg: emptyAgg(), pos: st.pos }; });
  function inc(seat, k, hit) { var x = S[seat].stats[k]; x[1] += 1; if (hit) x[0] += 1; }
  var posOf = {}; rec.seats.forEach(function (st) { posOf[st.seat] = st.pos; });
  var pre = rec.actions.filter(function (a) { return a.st === 0 && a.t !== 'sb' && a.t !== 'bb'; });
  var rc = 0, opener = -1, three = -1, four = -1, limpers = 0, callsAfterOpen = 0, decided = {}, faced = {}, pfa = -1, stealer = -1;
  pre.forEach(function (a) {
    var aggr = a.t === 'raise' || a.t === 'bet', s = a.s, k = s + ':';
    if (!decided[s]) { decided[s] = 1; inc(s, 'vpip', false); inc(s, 'pfr', false); S[s].stats.vpip[1] -= 0; }
    if (a.t === 'call' || aggr) S[s].stats.vpip[0] = 1;
    if (aggr) S[s].stats.pfr[0] = 1;
    // Steal-Versuch
    if (rc === 0 && limpers === 0 && !faced[k + 'st'] && (posOf[s] === 'CO' || posOf[s] === 'BTN' || posOf[s] === 'SB')) { faced[k + 'st'] = 1; inc(s, 'steal', aggr); if (aggr) stealer = s; }
    if (rc === 1 && stealer >= 0 && opener === stealer && callsAfterOpen === 0 && s !== opener && (posOf[s] === 'SB' || posOf[s] === 'BB') && !faced[k + 'fs']) { faced[k + 'fs'] = 1; inc(s, 'foldToSteal', a.t === 'fold'); }
    if (rc === 1 && s !== opener && a.cr && !faced[k + '3']) { faced[k + '3'] = 1; inc(s, 'threeBet', aggr); }
    if (rc === 2 && s !== three && a.cr && !faced[k + '4']) { faced[k + '4'] = 1; inc(s, 'fourBet', aggr); }
    if (rc === 2 && s === opener && !faced[k + 'f3']) { faced[k + 'f3'] = 1; inc(s, 'foldTo3Bet', a.t === 'fold'); }
    if (rc === 3 && s === three && !faced[k + 'f4']) { faced[k + 'f4'] = 1; inc(s, 'foldTo4Bet', a.t === 'fold'); }
    if (a.t === 'call') { if (rc === 0) limpers++; else if (rc === 1) callsAfterOpen++; }
    if (aggr) { rc++; if (rc === 1) opener = s; else if (rc === 2) three = s; else if (rc === 3) four = s; pfa = s; }
  });
  void four;
  // Postflop
  var everFolded = {}; rec.actions.forEach(function (a) { if (a.t === 'fold') everFolded[a.s] = 1; });
  var sawFlop = rec.sawFlop || [];
  var cbetChain = pfa >= 0;
  for (var st = 1; st <= 3; st++) {
    var acts = rec.actions.filter(function (a) { return a.st === st; });
    if (!acts.length) { cbetChain = false; continue; }
    var betSeen = false, pfaActed = false, cbet = false, raised = false, resp = {}, checked = {}, crOpp = {};
    var ck = st === 1 ? 'cbetFlop' : st === 2 ? 'cbetTurn' : 'cbetRiver', fk = st === 1 ? 'foldToCbet' : st === 2 ? 'foldToCbetTurn' : null;
    acts.forEach(function (a) {
      var aggr = a.t === 'raise' || a.t === 'bet', s = a.s, ag = S[s].agg;
      if (a.t === 'check') ag.check++; else if (a.t === 'bet') ag.bet++; else if (a.t === 'raise') ag.raise++; else if (a.t === 'call') ag.call++; else if (a.t === 'fold') ag.fold++;
      if (a.t !== 'check') inc(s, 'afq', aggr);
      if (cbetChain && s === pfa && !pfaActed) {
        pfaActed = true;
        if (!betSeen) { inc(s, ck, aggr); if (aggr) cbet = true; }
      } else if (cbet && fk && !raised && s !== pfa && !resp[s]) { resp[s] = 1; inc(s, fk, a.t === 'fold'); }
      if (checked[s] && betSeen && a.cr && !crOpp[s]) { crOpp[s] = 1; inc(s, 'checkRaise', a.t === 'raise'); }
      if (a.t === 'check') checked[s] = 1;
      if (aggr) { if (cbet && s !== pfa) raised = true; betSeen = true; }
    });
    cbetChain = cbetChain && cbet;
  }
  sawFlop.forEach(function (s) {
    inc(s, 'wtsd', !!(rec.showdown && !everFolded[s]));
    if (rec.showdown && !everFolded[s]) inc(s, 'wsd', (rec.won && rec.won[s] > 0) || rec.net[s] > 0);
  });
  return S;
}

// ---------- Kurzzeitgedächtnis (Format 3) ----------
/* Je Wert zusätzlich exponentiell abklingende Zähler. Alter wird in eigenen Händen des Gegners gemessen:
   nach jeder Hand, die er am Tisch spielt, werden alle Kurzzeitzähler mit λ = 0,5^(1/HALF_LIFE) multipliziert,
   danach kommen die Zähler dieser Hand mit Gewicht 1 hinzu. Ohne neue Hände (Archiv) bleibt das Gedächtnis unverändert.
   Je Wert gespeichert: [a, s1, s2] = [Σ w·Treffer, Σ w, Σ w²] über alle Gelegenheiten. */
var HALF_LIFE = 100, LAMBDA = Math.pow(0.5, 1 / HALF_LIFE), H_MAX = 1 / (1 - LAMBDA), RND = 1e4, EPS = 0.01;  // EPS: Rundungstoleranz der Prüfung
/* Erkennung veränderter Spielweise: gewichteter Zwei-Anteile-Test „Kurzzeit gegen älter“ (siehe docs/GEGNERGEDAECHTNIS.md).
   Alarm ab |z| ≥ Z_ON, Ende unter Z_OFF (Hysterese), nur mit Mindestzahl gewichteter Gelegenheiten. */
var CHANGE_KEYS = ['vpip', 'pfr', 'threeBet', 'cbetFlop', 'foldToCbet', 'afq', 'wtsd'];
var CHANGE = { zOn: 3.75, zOff: 2.0, minRecent: 15, minOld: 40, minExp: 5, cc: 0.5 };
function rnd(x) { return Math.round(x * RND) / RND; }
/** Nur für Messreihen (tests/gedaechtnis-eval.js): Parameter des Gedächtnisses setzen. Die App nutzt die Standardwerte. */
function setMemoryParams(o) {
  if (o.halfLife) { HALF_LIFE = o.halfLife; LAMBDA = Math.pow(0.5, 1 / HALF_LIFE); H_MAX = 1 / (1 - LAMBDA); }
  ['zOn', 'zOff', 'minRecent', 'minOld', 'minExp', 'cc'].forEach(function (k) { if (o[k] != null) CHANGE[k] = o[k]; });
  if (o.keys) CHANGE_KEYS = o.keys.slice();
  PT.stats.MEMORY.HALF_LIFE = HALF_LIFE; PT.stats.MEMORY.LAMBDA = LAMBDA; PT.stats.MEMORY.H_MAX = H_MAX; PT.stats.MEMORY.CHANGE_KEYS = CHANGE_KEYS;
}
function emptyRecent() { var o = {}; STATS.forEach(function (k) { o[k] = [0, 0, 0]; }); return { h: 0, stats: o }; }
function emptyCards(from) { return { sd: 0, hid: 0, from: from || 0 }; }
/** Altert das Kurzzeitgedächtnis um eine Hand und fügt die Zähler der Hand hinzu */
function addRecent(rc, I) {
  var l = LAMBDA, l2 = l * l;
  rc.h = rnd(rc.h * l + 1);
  for (var i = 0; i < STATS.length; i++) {
    var k = STATS[i], x = rc.stats[k], inc = I.stats[k];
    x[0] = rnd(x[0] * l + inc[0]); x[1] = rnd(x[1] * l + inc[1]); x[2] = rnd(x[2] * l2 + inc[1]);
  }
}
/**
 * Gewichteter Zwei-Anteile-Test: Kurzzeit (Gewichte w) gegen den älteren Teil (Gewichte 1 − w) derselben Beobachtungen.
 * nd = [n, d] Langzeit, rc = [a, s1, s2] Kurzzeit. Varianz der Differenz unter H0 (gleicher Anteil p) exakt:
 * p(1−p)·Σ(wᵢ/s1 − (1−wᵢ)/w2)² = p(1−p)·[s2/s1² − 2(s1−s2)/(s1·w2) + (d − 2s1 + s2)/w2²].
 */
function changeTest(nd, rc) {
  if (!nd || !rc) return null;
  var n = nd[0], d = nd[1], a = Math.min(rc[0], n), s1 = Math.min(rc[1], d), s2 = Math.min(rc[2], s1), w2 = d - s1;
  if (!(s1 >= CHANGE.minRecent) || !(w2 >= CHANGE.minOld) || !(s2 > 0)) return null;
  var pr = Math.min(1, Math.max(0, a / s1)), po = Math.min(1, Math.max(0, (n - a) / w2)), pb = (n + 0.5) / (d + 1), neff = s1 * s1 / s2;
  // Mindestzahl erwarteter Treffer und Nicht-Treffer im Kurzzeitfenster (Normalnäherung erst dann brauchbar)
  if (Math.min(pb, 1 - pb) * neff < CHANGE.minExp) return null;
  var V = s2 / (s1 * s1) - 2 * (s1 - s2) / (s1 * w2) + (d - 2 * s1 + s2) / (w2 * w2);
  if (!(V > 1e-12)) return null;
  var diff = pr - po, adj = Math.max(0, Math.abs(diff) - CHANGE.cc / neff);  // Stetigkeitskorrektur
  var z = (diff < 0 ? -adj : adj) / Math.sqrt(pb * (1 - pb) * V);
  return { z: z, recent: pr, older: po, long: n / d, s1: s1, neff: neff, old: w2 };
}
/** Hysterese der Veränderungsanzeige; r.chg[k] = [Hand des Alarmbeginns, Richtung ±1] */
function updateChange(r) {
  for (var i = 0; i < CHANGE_KEYS.length; i++) {
    var k = CHANGE_KEYS[i], t = changeTest(r.stats[k], r.recent.stats[k]), cur = r.chg[k];
    if (cur && (!t || Math.abs(t.z) < CHANGE.zOff || (t.z > 0 ? 1 : -1) !== cur[1])) { delete r.chg[k]; cur = null; }
    if (!cur && t && Math.abs(t.z) >= CHANGE.zOn) r.chg[k] = [r.hands, t.z > 0 ? 1 : -1];
  }
}

// ---------- Datenbank ----------
var DB_VERSION = 3;
function newDb() { return { v: DB_VERSION, opps: {} }; }
function newRecord(id, name) {
  return { id: id, name: name, status: 'archiv', hands: 0, stats: emptyStats(), agg: emptyAgg(), pos: emptyPos(), shown: [], lastSeen: 0, firstSeen: 0,
    recent: emptyRecent(), cards: emptyCards(0), chg: {} };
}
function dbEnsure(db, id, name) { var r = db.opps[id]; if (!r) r = db.opps[id] = newRecord(id, name || (PT.bots ? PT.bots.nameOf(id) : id)); return r; }
function shownEntry(rec, seat, cards) {
  var streets = ['', '', '', ''];
  rec.actions.forEach(function (a) { if (a.s !== seat) return; var t = PT.actionText(a); streets[a.st] = streets[a.st] ? streets[a.st] + ', ' + t : t; });
  return { hand: rec.no, ts: rec.ts, pos: rec.seats[seat].pos, cards: cards, board: rec.board.join(''), actions: streets, net: rec.net[seat] };
}
function applyToRecord(r, I, ts) {
  r.hands += 1; r.lastSeen = ts; if (!r.firstSeen) r.firstSeen = ts;
  STATS.forEach(function (k) { r.stats[k][0] += I.stats[k][0]; r.stats[k][1] += I.stats[k][1]; });
  Object.keys(r.agg).forEach(function (k) { r.agg[k] += I.agg[k]; });
  var p = r.pos[I.pos];
  if (p) { p.h += 1; p.vpip[0] += I.stats.vpip[0]; p.vpip[1] += I.stats.vpip[1]; p.pfr[0] += I.stats.pfr[0]; p.pfr[1] += I.stats.pfr[1]; }
  if (r.recent) { addRecent(r.recent, I); updateChange(r); }
}
/** Karten: am Showdown beobachtet oder unbekannt geblieben (nur gespielte Hände: VPIP oder Flop gesehen) */
function applyCards(r, rec, seat, I, shown) {
  if (!r.cards) return;
  if (shown) r.cards.sd += 1;
  else if (I.stats.vpip[0] > 0 || (rec.sawFlop || []).indexOf(seat) >= 0) r.cards.hid += 1;
}
function dbApplyHand(db, rec, heroRec) {
  var inc = handStats(rec), changed = [];
  rec.seats.forEach(function (st) {
    var sh = rec.shown.filter(function (x) { return x.seat === st.seat; })[0];
    if (st.hero) { if (heroRec) { applyToRecord(heroRec, inc[st.seat], rec.ts); applyCards(heroRec, rec, st.seat, inc[st.seat], !!sh); } return; }
    var r = dbEnsure(db, st.id, st.name), I = inc[st.seat];
    r.status = 'aktiv';
    applyToRecord(r, I, rec.ts);
    applyCards(r, rec, st.seat, I, !!sh);
    if (sh) { r.shown.unshift(shownEntry(rec, st.seat, sh.cards)); if (r.shown.length > SHOWN_MAX) r.shown.length = SHOWN_MAX; }
    changed.push(r.id);
  });
  return changed;
}
function dbList(db) { return Object.keys(db.opps).sort().map(function (k) { return db.opps[k]; }); }

// ---------- Kennzahlen für Anzeige ----------
function rate(nd) { return nd && nd[1] > 0 ? nd[0] / nd[1] : null; }
function pctOf(nd) { var r = rate(nd); return r == null ? null : Math.round(100 * r); }
/** Wilson-Intervall (95 %) für einen Anteil */
function wilson(nd) {
  if (!nd || !nd[1]) return null;
  var n = nd[1], p = nd[0] / n, z = 1.96, z2 = z * z, den = 1 + z2 / n;
  var c = (p + z2 / (2 * n)) / den, h = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / den;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
function af(agg) { return agg && agg.call > 0 ? (agg.bet + agg.raise) / agg.call : (agg && agg.bet + agg.raise > 0 ? Infinity : null); }
function reliability(h) { return h < 100 ? 'unsicher' : h < 500 ? 'Tendenz' : 'belastbar'; }
/** Spielertyp nach Projektregel (erste zutreffende Zeile) */
function playerType(r) {
  var h = r ? r.hands : 0;
  if (h < 100) return 'unbekannt';
  var v = pctOf(r.stats.vpip), p = pctOf(r.stats.pfr);
  v = v == null ? 0 : v; p = p == null ? 0 : p;
  if (v >= 40) return 'sehr loose';
  if (v - p >= 12) return 'loose-passiv';
  if (v < 16) return 'Nit';
  if (v >= 28) return 'LAG';
  return 'TAG';
}
/** Wilson-Intervall für einen gewichteten Anteil mit effektiver Stichprobe neff */
function wilsonP(p, neff) {
  if (!(neff > 0) || p == null) return null;
  var z = 1.96, z2 = z * z, den = 1 + z2 / neff, c = (p + z2 / (2 * neff)) / den, h = z * Math.sqrt(p * (1 - p) / neff + z2 / (4 * neff * neff)) / den;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
function priorOf(k) { var R = PT.ranges; return R && R.PRIOR[k] != null ? [R.PRIOR[k], R.PRIOR_K[k]] : [0.5, 10]; }
/** Kurzzeitwerte je Wert: Rohanteil, gewichtete Gelegenheiten, effektive Stichprobe, Intervall, geglättet */
function recentProfile(r) {
  var rc = r && r.recent, o = { hands: rc ? rc.h : 0, halfLife: HALF_LIFE, stats: {} };
  STATS.forEach(function (k) {
    var x = rc ? rc.stats[k] : [0, 0, 0], pk = priorOf(k), rate0 = x[1] > 1e-9 ? Math.min(1, x[0] / x[1]) : null, neff = x[2] > 1e-9 ? x[1] * x[1] / x[2] : 0;
    o.stats[k] = { rate: rate0, pct: rate0 == null ? null : Math.round(100 * rate0), n: x[0], d: x[1], neff: neff, ci: wilsonP(rate0, neff),
      sm: (x[0] + pk[0] * pk[1]) / (x[1] + pk[1]), quality: x[1] > 1e-9 ? 'geschätzt' : 'unbekannt' };
  });
  return o;
}
/** Ergebnis der Veränderungsprüfung (Zustand aus r.chg, Kennzahlen neu berechnet) */
function changeProfile(r) {
  var o = { detected: false, keys: [], tested: CHANGE_KEYS.slice(), z: {}, params: { halfLife: HALF_LIFE, zOn: CHANGE.zOn, zOff: CHANGE.zOff, minRecent: CHANGE.minRecent, minOld: CHANGE.minOld } };
  if (!r || !r.recent) return o;
  CHANGE_KEYS.forEach(function (k) {
    var t = changeTest(r.stats[k], r.recent.stats[k]); o.z[k] = t ? t.z : null;
    var c = r.chg && r.chg[k];
    if (c && t) o.keys.push({ key: k, label: STAT_LABEL[k], dir: c[1], z: t.z, recent: t.recent, older: t.older, long: t.long, since: c[0], ago: r.hands - c[0], neff: t.neff });
  });
  o.detected = o.keys.length > 0;
  return o;
}
/**
 * Werte für Coach und Gegnermodell: je Wert [Zähler, Nenner] wie in r.stats, bei erkannter Veränderung die Kurzzeitzähler.
 * Direkt mit PT.ranges.smooth nutzbar. Nur aus Beobachtungen am Tisch.
 */
function effectiveStats(r) {
  var st = r ? r.stats : emptyStats(), out = {}, changed = [], ch = r && r.recent && r.chg ? r.chg : {};
  STATS.forEach(function (k) {
    if (Object.prototype.hasOwnProperty.call(ch, k) && changeTest(st[k], r.recent.stats[k])) { out[k] = [r.recent.stats[k][0], r.recent.stats[k][1]]; changed.push(k); }  // wie profile().est
    else out[k] = [st[k][0], st[k][1]];
  });
  return { stats: out, changed: changed, hands: r ? (changed.length ? Math.min(r.hands, Math.round(r.recent.h)) : r.hands) : 0, longHands: r ? r.hands : 0 };
}
function profile(r) {
  var o = { hands: r ? r.hands : 0 }, st = r ? r.stats : emptyStats();
  STATS.forEach(function (k) { o[k] = pctOf(st[k]); });
  o.af = r ? af(r.agg) : null;
  o.bel = reliability(o.hands); o.typ = playerType(r);
  // Erweiterung Format 3: Kurzzeit, Veränderung, Kartenkenntnis, beste Schätzung
  o.recent = recentProfile(r);
  o.change = changeProfile(r);
  var c = r && r.cards ? r.cards : null;
  o.cards = { observed: c ? c.sd : (r ? r.shown.length : 0), unknown: c ? c.hid : null, from: c ? c.from : null, counted: !!c,
    share: c && c.sd + c.hid > 0 ? c.sd / (c.sd + c.hid) : null };
  o.est = {}; o.estSrc = {}; o.quality = {};
  STATS.forEach(function (k) {
    var pk = priorOf(k), useR = o.change.keys.some(function (x) { return x.key === k; }), nd = useR ? [r.recent.stats[k][0], r.recent.stats[k][1]] : st[k];
    o.est[k] = (nd[0] + pk[0] * pk[1]) / (nd[1] + pk[1]);
    o.estSrc[k] = useR ? 'kurzzeit' : st[k][1] > 0 ? 'langzeit' : 'prior';
    o.quality[k] = st[k][1] > 0 ? 'geschätzt' : 'unbekannt';
  });
  return o;
}

// ---------- Export / Import ----------
var FORMAT_DB = 'PokerTrainer-DB', FORMAT_BACKUP = 'PokerTrainer-Backup', BACKUP_VERSION = 3;
/** Datenbankdatei aus einer Liste von Datensätzen (version: 1, 2 oder 3; für Sicherungen alter Formate unverändert) */
function rawExport(list, version, stamp) {
  var body = JSON.stringify(list);
  return '{"format":"' + FORMAT_DB + '","version":' + version + ',"app":"' + PT.VERSION + '","exported":' + JSON.stringify(stamp || '') +
    (version >= 3 ? ',"halfLife":' + HALF_LIFE : '') + ',"count":' + list.length + ',"checksum":"' + U.fnv1a(body) + '","opponents":[' +
    (list.length ? '\n' + list.map(function (r) { return JSON.stringify(r); }).join(',\n') + '\n' : '') + ']}\n';
}
function dbExport(db, stamp) { return rawExport(dbList(db), DB_VERSION, stamp); }
function backupExport(payload, stamp) {
  var body = JSON.stringify(payload);
  return JSON.stringify({ format: FORMAT_BACKUP, version: BACKUP_VERSION, app: PT.VERSION, exported: stamp || '', halfLife: HALF_LIFE, checksum: U.fnv1a(body), payload: payload });
}
function onlyKeys(o, keys) { var k = Object.keys(o); for (var i = 0; i < k.length; i++) if (keys.indexOf(k[i]) < 0) return k[i]; return null; }
var REC_KEYS_V2 = ['id', 'name', 'status', 'hands', 'stats', 'agg', 'pos', 'shown', 'lastSeen', 'firstSeen'];
var REC_KEYS = REC_KEYS_V2.concat(['recent', 'cards', 'chg']);
var REC_KEYS_V1 = ['id', 'name', 'status', 'hands', 'stats', 'shown', 'lastSeen'];
var SHOWN_KEYS = ['hand', 'ts', 'pos', 'cards', 'board', 'actions', 'net'];
var NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 .'\-]{1,40}$/;
function isObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
function isNum(x, lo, hi) { return typeof x === 'number' && isFinite(x) && x >= lo && x <= hi; }
function validNd(nd, max) { return Array.isArray(nd) && nd.length === 2 && isInt(nd[0], 0, 1e9) && isInt(nd[1], 0, 1e9) && nd[0] <= nd[1] && (max == null || nd[1] <= max); }
function validShown(s, j) {
  if (!s || typeof s !== 'object' || Array.isArray(s) || onlyKeys(s, SHOWN_KEYS)) return 'aufgedecktes Blatt ' + (j + 1) + ' ungültig';
  if (!isInt(s.hand, 0, 1e12) || typeof s.ts !== 'number' || !(s.ts >= 0) || POSITIONS.indexOf(s.pos) < 0) return 'aufgedecktes Blatt ' + (j + 1) + ' ungültig';
  var hc = PT.parseCards(s.cards), bc = PT.parseCards(s.board);
  if (!hc || hc.length !== 2 || !bc || bc.length > 5 || PT.parseCards(s.cards + s.board) === null) return 'Karten in Blatt ' + (j + 1) + ' ungültig';
  if (!Array.isArray(s.actions) || s.actions.length !== 4) return 'Aktionen in Blatt ' + (j + 1) + ' ungültig';
  for (var k = 0; k < 4; k++) if (typeof s.actions[k] !== 'string' || s.actions[k].length > 300) return 'Aktionen in Blatt ' + (j + 1) + ' ungültig';
  if (!isInt(s.net, -1e12, 1e12)) return 'Ergebnis in Blatt ' + (j + 1) + ' ungültig';
  return null;
}
/** Kurzzeitgedächtnis, Kartenkenntnis und Veränderungszustand (Format 3) */
function validMemory(r) {
  var rc = r.recent;
  if (!isObj(rc) || onlyKeys(rc, ['h', 'stats']) || Object.keys(rc).length !== 2) return 'Kurzzeitwerte ungültig';
  if (!isNum(rc.h, 0, Math.min(r.hands, H_MAX) + EPS)) return 'Kurzzeit-Handgewicht ungültig';
  if (!isObj(rc.stats) || onlyKeys(rc.stats, STATS) || Object.keys(rc.stats).length !== STATS.length) return 'Kurzzeitwerte unvollständig';
  for (var i = 0; i < STATS.length; i++) {
    var k = STATS[i], x = rc.stats[k], L = r.stats[k];
    if (!Array.isArray(x) || x.length !== 3 || !isNum(x[0], 0, 1e9) || !isNum(x[1], 0, 1e9) || !isNum(x[2], 0, 1e9)) return 'Kurzzeitwert ' + (STAT_LABEL[k] || k) + ' ungültig';
    // Gewichte liegen in (0, 1]: a ≤ s1, s2 ≤ s1, Kurzzeit ≤ Langzeit (Treffer und Nicht-Treffer)
    if (x[0] > x[1] + EPS || x[2] > x[1] + EPS || x[1] > L[1] + EPS || x[0] > L[0] + EPS || x[1] - x[0] > L[1] - L[0] + EPS) return 'Kurzzeitwert ' + (STAT_LABEL[k] || k) + ' ungültig';
  }
  var c = r.cards;
  if (!isObj(c) || onlyKeys(c, ['sd', 'hid', 'from']) || Object.keys(c).length !== 3) return 'Kartenzähler ungültig';
  if (!isInt(c.from, 0, r.hands) || !isInt(c.sd, 0, r.hands) || !isInt(c.hid, 0, r.hands) || c.sd + c.hid > r.hands - c.from) return 'Kartenzähler ungültig';
  if (!isObj(r.chg) || onlyKeys(r.chg, CHANGE_KEYS)) return 'Veränderungsanzeige ungültig';
  for (var key in r.chg) {
    if (!Object.prototype.hasOwnProperty.call(r.chg, key)) continue;
    var v = r.chg[key];
    if (!Array.isArray(v) || v.length !== 2 || !isInt(v[0], 1, r.hands) || (v[1] !== 1 && v[1] !== -1)) return 'Veränderungsanzeige ungültig';
  }
  return null;
}
/**
 * Prüft einen Datensatz. fmt: true oder 1 = Format 1 (Entwurf 2), 2 = Format 2, 3 = Format 3,
 * sonst (false/undefined) Format 2 oder 3 (erkannt am Feld „recent“), z. B. für Momentaufnahmen in Lerndaten.
 */
function validRecord(r, fmt) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return 'kein Datensatz';
  var v1 = fmt === true || fmt === 1, ver = v1 ? 1 : fmt === 2 || fmt === 3 ? fmt : (Object.prototype.hasOwnProperty.call(r, 'recent') ? 3 : 2);
  var extra = onlyKeys(r, ver === 1 ? REC_KEYS_V1 : ver === 2 ? REC_KEYS_V2 : REC_KEYS); if (extra) return 'unbekanntes Feld „' + String(extra).slice(0, 20) + '“';
  if (ver === 3) for (var q = 0; q < REC_KEYS.length; q++) if (!Object.prototype.hasOwnProperty.call(r, REC_KEYS[q])) return 'Feld „' + REC_KEYS[q] + '“ fehlt';
  if (typeof r.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(r.id)) return 'ungültige ID';
  if (typeof r.name !== 'string' || !NAME_RE.test(r.name)) return 'ungültiger Name';
  if (r.status !== 'aktiv' && r.status !== 'archiv') return 'ungültiger Status';
  if (!isInt(r.hands, 0, 1e9)) return 'ungültige Handzahl';
  if (!r.stats || typeof r.stats !== 'object' || Array.isArray(r.stats)) return 'Werte fehlen';
  var keys = v1 ? V1_STATS : STATS;
  if (onlyKeys(r.stats, keys) || Object.keys(r.stats).length !== keys.length) return 'Werte unvollständig';
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i], lim = (k === 'afq') ? null : (k === 'checkRaise' ? r.hands * 3 : r.hands);  // Check-Raise: bis zu einer Gelegenheit je Straße
    if (!validNd(r.stats[k], lim)) return 'Wert ' + (STAT_LABEL[k] || k) + ' ungültig';
  }
  if (!v1) {
    if (!r.agg || typeof r.agg !== 'object' || onlyKeys(r.agg, ['bet', 'raise', 'call', 'fold', 'check']) || Object.keys(r.agg).length !== 5) return 'Aktionszähler ungültig';
    for (var a in r.agg) if (!isInt(r.agg[a], 0, 1e10)) return 'Aktionszähler ungültig';
    if (!r.pos || typeof r.pos !== 'object' || onlyKeys(r.pos, POSITIONS) || Object.keys(r.pos).length !== 6) return 'Positionswerte ungültig';
    for (var p = 0; p < POSITIONS.length; p++) {
      var pp = r.pos[POSITIONS[p]];
      if (!pp || typeof pp !== 'object' || onlyKeys(pp, ['h', 'vpip', 'pfr']) || !isInt(pp.h, 0, r.hands) || !validNd(pp.vpip, pp.h) || !validNd(pp.pfr, pp.h)) return 'Positionswerte ungültig';
    }
    if (typeof r.firstSeen !== 'number' || !(r.firstSeen >= 0)) return 'erstmals gesehen ungültig';
  }
  if (!Array.isArray(r.shown) || r.shown.length > SHOWN_MAX) return 'aufgedeckte Blätter ungültig';
  for (var j = 0; j < r.shown.length; j++) { var e = validShown(r.shown[j], j); if (e) return e; }
  if (typeof r.lastSeen !== 'number' || !(r.lastSeen >= 0)) return 'zuletzt gesehen ungültig';
  if (ver === 3) { var em = validMemory(r); if (em) return em; }
  return null;
}
function recordVersion(r) { return !validRecord(r, 3) ? 3 : !validRecord(r, 2) ? 2 : !validRecord(r, 1) ? 1 : 0; }
function cloneRecord(r) {
  var st = {}; STATS.forEach(function (k) { st[k] = [r.stats[k][0], r.stats[k][1]]; });
  var pos = {}; POSITIONS.forEach(function (p) { var x = r.pos[p]; pos[p] = { h: x.h, vpip: [x.vpip[0], x.vpip[1]], pfr: [x.pfr[0], x.pfr[1]] }; });
  var o = { id: r.id, name: r.name, status: r.status, hands: r.hands, stats: st,
    agg: { bet: r.agg.bet, raise: r.agg.raise, call: r.agg.call, fold: r.agg.fold, check: r.agg.check }, pos: pos,
    shown: r.shown.map(function (s) { return { hand: s.hand, ts: s.ts, pos: s.pos, cards: s.cards, board: s.board, actions: s.actions.slice(), net: s.net }; }),
    lastSeen: r.lastSeen, firstSeen: r.firstSeen };
  if (r.recent) {
    var rs = {}; STATS.forEach(function (k) { var x = r.recent.stats[k]; rs[k] = [x[0], x[1], x[2]]; });
    o.recent = { h: r.recent.h, stats: rs };
    o.cards = { sd: r.cards.sd, hid: r.cards.hid, from: r.cards.from };
    o.chg = {}; Object.keys(r.chg).forEach(function (k) { if (CHANGE_KEYS.indexOf(k) >= 0) o.chg[k] = [r.chg[k][0], r.chg[k][1]]; });  // Reihenfolge wie im Original (kanonischer Vergleich)
  } else { o.recent = emptyRecent(); o.cards = emptyCards(r.hands); o.chg = {}; }
  return o;
}
/** Migration Format 2 → 3: Langzeitwerte bleiben exakt; das Kurzzeitgedächtnis beginnt leer (alle alten Beobachtungen zählen als „älter“),
    die Kartenzählung beginnt mit der aktuellen Handzahl (from), weil frühere Hände nicht gezählt wurden. */
function migrateV2(r) { var o = cloneRecord(r); o.recent = emptyRecent(); o.cards = emptyCards(r.hands); o.chg = {}; return o; }
/** Migration eines v1-Datensatzes (Entwurf 2): fehlende Werte bleiben unbekannt (0/0), nicht 0 %. */
function migrateV1(r) {
  var n = newRecord(r.id, r.name);
  n.status = r.status; n.hands = r.hands; n.lastSeen = r.lastSeen; n.firstSeen = r.lastSeen;
  n.stats.vpip = r.stats.vpip.slice(); n.stats.pfr = r.stats.pfr.slice(); n.stats.threeBet = r.stats.threeBet.slice();
  n.stats.foldTo3Bet = r.stats.foldTo3Bet.slice(); n.stats.cbetFlop = r.stats.cbet.slice(); n.stats.foldToCbet = r.stats.foldToCbet.slice();
  n.stats.wtsd = r.stats.wtsd.slice();
  n.shown = r.shown.map(function (s) { return { hand: s.hand, ts: s.ts, pos: s.pos, cards: s.cards, board: s.board, actions: s.actions.slice(), net: s.net }; });
  n.cards = emptyCards(r.hands);
  return n;
}
/** Datensatz beliebigen bekannten Formats einlesen: gültig im aktuellen Format → Kopie, Format 2/1 → umgewandelt, sonst null */
function loadRecord(r) {
  if (!validRecord(r, 3)) return cloneRecord(r);
  if (!validRecord(r, 2)) return migrateV2(r);
  if (!validRecord(r, 1)) return migrateV1(r);
  return null;
}
var MAX_IMPORT = 60 * 1024 * 1024;
function dbImport(text) {
  function fail(m) { return { ok: false, error: m }; }
  if (typeof text !== 'string' || !text.trim()) return fail('Die Datei ist leer.');
  if (text.length > MAX_IMPORT) return fail('Die Datei ist zu groß (über 60 MB).');
  var obj;
  try { obj = JSON.parse(text); } catch (e) { return fail('Die Datei ist beschädigt oder abgeschnitten (kein gültiges JSON).'); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return fail('Die Datei ist keine PokerTrainer-Datei.');
  if (obj.format === FORMAT_BACKUP) return backupImport(obj);
  if (obj.format !== FORMAT_DB) return fail('Die Datei ist keine PokerTrainer-Datenbank.');
  if (obj.version !== 1 && obj.version !== 2 && obj.version !== 3) return fail('Unbekannte Version der Datenbank (' + String(obj.version).slice(0, 10) + ').');
  if (!Array.isArray(obj.opponents)) return fail('Die Gegnerliste fehlt.');
  if (obj.count !== obj.opponents.length) return fail('Die Zahl der Gegner stimmt nicht mit der Datei überein.');
  if (U.fnv1a(JSON.stringify(obj.opponents)) !== obj.checksum) return fail('Die Prüfsumme stimmt nicht, die Datei wurde verändert oder ist beschädigt.');
  if (obj.opponents.length > 100000) return fail('Zu viele Einträge.');
  if (obj.version === 3 && obj.halfLife !== undefined && !isNum(obj.halfLife, 1, 100000)) return fail('Ungültige Halbwertszeit in der Datei.');
  var resetRecent = obj.version === 3 && obj.halfLife !== undefined && obj.halfLife !== HALF_LIFE;
  var db = newDb(), ver = obj.version;
  for (var i = 0; i < obj.opponents.length; i++) {
    var e = validRecord(obj.opponents[i], ver);
    if (e) return fail('Eintrag ' + (i + 1) + ': ' + e + '.');
    var r = obj.opponents[i];
    if (Object.prototype.hasOwnProperty.call(db.opps, r.id)) return fail('Doppelter Eintrag für ' + r.name + '.');
    db.opps[r.id] = ver === 1 ? migrateV1(r) : ver === 2 || resetRecent ? migrateV2(r) : cloneRecord(r);
  }
  return { ok: true, kind: 'db', db: db, count: obj.opponents.length, migrated: ver < DB_VERSION || resetRecent, version: ver, recentReset: resetRecent };
}
function backupImport(obj) {
  function fail(m) { return { ok: false, error: m }; }
  if (obj.version !== 2 && obj.version !== 3) return fail('Unbekannte Version der Sicherung.');
  if (!obj.payload || typeof obj.payload !== 'object' || Array.isArray(obj.payload)) return fail('Die Sicherung enthält keine Daten.');
  if (U.fnv1a(JSON.stringify(obj.payload)) !== obj.checksum) return fail('Die Prüfsumme stimmt nicht, die Sicherung wurde verändert oder ist beschädigt.');
  if (obj.version === 3 && obj.halfLife !== undefined && !isNum(obj.halfLife, 1, 100000)) return fail('Ungültige Halbwertszeit in der Sicherung.');
  var ver = obj.version, resetRecent = ver === 3 && obj.halfLife !== undefined && obj.halfLife !== HALF_LIFE;
  var conv = function (r) { return ver === 2 || resetRecent ? migrateV2(r) : cloneRecord(r); };
  var P = obj.payload, extra = onlyKeys(P, ['opponents', 'hero', 'hands', 'learning', 'settings', 'table']);
  if (extra) return fail('Unbekannter Bereich in der Sicherung.');
  if (!Array.isArray(P.opponents)) return fail('Die Gegnerliste fehlt.');
  if (P.opponents.length > 100000) return fail('Zu viele Einträge.');
  var db = newDb();
  for (var i = 0; i < P.opponents.length; i++) {
    var e = validRecord(P.opponents[i], ver);
    if (e) return fail('Gegner ' + (i + 1) + ': ' + e + '.');
    if (Object.prototype.hasOwnProperty.call(db.opps, P.opponents[i].id)) return fail('Doppelter Gegner.');
    db.opps[P.opponents[i].id] = conv(P.opponents[i]);
  }
  var hero = null;
  if (P.hero != null) { var eh = validRecord(P.hero, ver); if (eh) return fail('Eigene Werte: ' + eh + '.'); hero = conv(P.hero); }
  var hands = [];
  if (P.hands != null) {
    if (!Array.isArray(P.hands) || P.hands.length > 200000) return fail('Handhistorie ungültig.');
    for (var h = 0; h < P.hands.length; h++) { var eh2 = PT.training ? PT.training.validHand(P.hands[h]) : null; if (eh2) return fail('Hand ' + (h + 1) + ': ' + eh2 + '.'); hands.push(P.hands[h]); }
  }
  var learning = null;
  if (P.learning != null) { var el = PT.training ? PT.training.validLearning(P.learning) : 'unbekannt'; if (el) return fail('Lerndaten: ' + el + '.'); learning = P.learning; }
  return { ok: true, kind: 'backup', db: db, hero: hero, hands: hands, learning: learning, settings: P.settings || null, table: P.table || null, count: P.opponents.length,
    migrated: ver < BACKUP_VERSION || resetRecent, version: ver };
}
function dbCanon(db) { return JSON.stringify(dbList(db)); }
/** Datenbank aus gespeicherter Liste (IndexedDB/localStorage): aktuelles Format übernehmen, ältere Formate umwandeln, Ungültiges überspringen */
function dbFromList(list) {
  var db = newDb(), skipped = 0, migrated = 0;
  (list || []).forEach(function (r) {
    var x = r && typeof r.id === 'string' && !Object.prototype.hasOwnProperty.call(db.opps, r.id) ? loadRecord(r) : null;
    if (x) { db.opps[x.id] = x; if (!r.recent) migrated++; } else skipped++;
  });
  db.skipped = skipped; db.migrated = migrated;
  return db;
}
/** Anzahl der Datensätze einer gespeicherten Liste, die noch nicht im aktuellen Format sind (Anlass für Sicherung vor Umwandlung) */
function needsMigration(list) { var n = 0; (list || []).forEach(function (r) { if (validRecord(r, 3) && (!validRecord(r, 2) || !validRecord(r, 1))) n++; }); return n; }

PT.stats = { STATS: STATS, STAT_LABEL: STAT_LABEL, STAT_HELP: STAT_HELP, POSITIONS: POSITIONS, SHOWN_MAX: SHOWN_MAX,
  emptyStats: emptyStats, emptyAgg: emptyAgg, emptyPos: emptyPos, handStats: handStats, newDb: newDb, newRecord: newRecord,
  dbEnsure: dbEnsure, dbApplyHand: dbApplyHand, applyToRecord: applyToRecord, dbList: dbList, rate: rate, pctOf: pctOf, wilson: wilson, af: af,
  reliability: reliability, playerType: playerType, profile: profile, dbExport: dbExport, backupExport: backupExport, dbImport: dbImport,
  validRecord: validRecord, cloneRecord: cloneRecord, migrateV1: migrateV1, dbCanon: dbCanon, dbFromList: dbFromList, FORMAT_DB: FORMAT_DB,
  // Format 3: Gegnergedächtnis
  DB_VERSION: DB_VERSION, BACKUP_VERSION: BACKUP_VERSION, MEMORY: { HALF_LIFE: HALF_LIFE, LAMBDA: LAMBDA, H_MAX: H_MAX, CHANGE_KEYS: CHANGE_KEYS, CHANGE: CHANGE },
  emptyRecent: emptyRecent, addRecent: addRecent, changeTest: changeTest, updateChange: updateChange, recentProfile: recentProfile, changeProfile: changeProfile,
  effectiveStats: effectiveStats, wilsonP: wilsonP, migrateV2: migrateV2, loadRecord: loadRecord, recordVersion: recordVersion, rawExport: rawExport,
  needsMigration: needsMigration, setMemoryParams: setMemoryParams };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
