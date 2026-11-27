/* PokerTrainer 2.0 – Trainings- und Lernsystem: Handhistorie, Kompetenzprofil, Fehlerdatenbank,
   situationsbezogene Szenarien (reproduzierbar über Seeds), Spaced Repetition, Wissensquiz. */
(function (G) {
'use strict';
var PT = G.PT, U = PT.util, H = PT.hands, B = PT.bots, S = PT.stats, C = PT.coach, clamp = U.clamp, isInt = U.isInt, fmt = U.fmt;

// ---------- Handhistorie ----------
function makeHandRecord(h, meta) {
  var rec = h.publicRecord(), hero = h.p.filter(function (q) { return q.isHero; })[0];
  return {
    v: 1, id: 'h' + (meta.session || 0) + '-' + h.no + '-' + (rec.ts || 0), ts: rec.ts, no: h.no, session: meta.session || 0, seed: meta.seed >>> 0,
    training: meta.training || null, tseed: meta.tseed != null ? meta.tseed >>> 0 : null, button: rec.button, sb: rec.sb, bb: rec.bb, n: rec.n,
    seats: rec.seats.map(function (s) { return { seat: s.seat, id: s.id, name: s.name, pos: s.pos, start: s.start, hero: !!s.hero, typ: s.hero ? null : (meta.types ? meta.types[s.id] || null : null) }; }),
    hero: hero ? PT.cardsStr(hero.cards) : '', heroSeat: hero ? hero.seat : 0,
    board: rec.board.slice(), actions: rec.actions, shown: rec.shown, net: rec.net, won: rec.won, returned: rec.returned, rake: rec.rake, rakeCfg: rec.rakeCfg || null, showdown: rec.showdown, sawFlop: rec.sawFlop,
    heroNet: hero ? rec.net[hero.seat] : 0,
    pots: h.result.pots.map(function (p) { return { amount: p.amount, winners: p.winners.slice(), eligible: p.eligible.slice() }; }),
    decisions: (meta.decisions || []).map(slimDecision),
    tags: unionTags(meta.decisions || [])
  };
}
function slimDecision(d) {
  var o = { i: d.i, st: d.st, chosen: d.chosen, rec: d.rec, cls: d.cls, eq: d.eq, need: d.need, grade: d.grade, score: d.score, loss: d.loss,
    cats: d.cats || [], tags: d.tags || [], evs: (d.evs || []).slice(0, 6), mode: d.mode, snap: d.snap || null, pos: d.pos };
  if (d.x) o.x = d.x;
  return o;
}
function rnd(x, f) { return typeof x === 'number' && isFinite(x) ? Math.round(x * f) / f : null; }
function ri(x) { return typeof x === 'number' && isFinite(x) ? Math.round(x) : 0; }
/**
 * Entscheidungsdatensatz aus Analyse a und Bewertung g (Spieler- und Coachsicht zum Entscheidungszeitpunkt).
 * ctx: { idx, street, pos, view, opps, seed, chosen: {type, amount, label}, extra: [Beträge] | null }
 * x: Zusatzfelder für den Benchmark-Export (seit 2.1): Versionen, Stufe, Rechenaufwand, Equity-Fehler, Alternativen mit Typ und Betrag.
 */
function makeDecision(ctx, a, g) {
  var bestA = a.actions.filter(function (y) { return y.label === a.bestLabel; })[0] || a.actions[0] || { type: a.best, amount: a.bestAmount };
  function amt(y) { return (y.type === 'bet' || y.type === 'raise') && isInt(y.amount, 0, 1e13) ? y.amount : null; }
  return { i: ctx.idx, st: ctx.street, chosen: ctx.chosen.label, rec: a.bestLabel, cls: a.classification, eq: rnd(a.equity.eq, 1000),
    need: a.potOdds ? rnd(a.potOdds.need, 1000) : null, grade: g.grade, score: g.score, loss: isFinite(g.loss) ? Math.round(g.loss) : null, cats: g.cats, tags: a.spotTags,
    evs: a.actions.slice(0, 6).map(function (y) { return { l: y.label, ev: ri(y.ev), u: ri(y.u) }; }), mode: a.mode, pos: ctx.pos,
    snap: { view: ctx.view, opps: ctx.opps, seed: ctx.seed },
    x: { v: 1, sw: PT.VERSION, mv: (C && C.MODEL_VERSION) || ('coach-' + PT.VERSION), lvl: a.level, it: a.iters | 0, max: a.maxSim | 0, ms: Math.max(0, Math.round(a.ms || 0)),
      eq: { se: rnd(a.equity.se, 1e5), m: String(a.equity.method || '').slice(0, 80), lo: rnd(a.equity.rangeLo, 1e4), hi: rnd(a.equity.rangeHi, 1e4) },
      best: { t: bestA.type, a: amt(bestA) }, ch: { t: ctx.chosen.type, a: amt(ctx.chosen) },
      ex: (ctx.extra || []).filter(function (e) { return isInt(e, 0, 1e13); }).slice(0, 4),
      alt: a.actions.slice(0, 12).map(function (y) { return { t: y.type, a: amt(y), l: String(y.label).slice(0, 80), ev: ri(y.ev), u: ri(y.u) }; }) } };
}
function unionTags(ds) { var o = []; ds.forEach(function (d) { (d.tags || []).forEach(function (t) { if (o.indexOf(t) < 0) o.push(t); }); }); return o; }
var HAND_KEYS = ['v', 'id', 'ts', 'no', 'session', 'seed', 'training', 'tseed', 'button', 'sb', 'bb', 'n', 'seats', 'hero', 'heroSeat', 'board', 'actions', 'shown', 'net', 'won', 'returned', 'rake', 'rakeCfg', 'showdown', 'sawFlop', 'heroNet', 'pots', 'decisions', 'tags'];
function validHand(h) {
  if (!h || typeof h !== 'object' || Array.isArray(h)) return 'kein Datensatz';
  for (var k in h) if (HAND_KEYS.indexOf(k) < 0) return 'unbekanntes Feld';
  if (h.v !== 1 || typeof h.id !== 'string' || h.id.length > 80 || !/^[A-Za-z0-9_\-]+$/.test(h.id)) return 'ungültige ID';
  if (!isInt(h.no, 0, 1e12) || !num(h.ts, 0, 8.64e15) || !isInt(h.bb, 2, 1e7) || !isInt(h.sb, 1, h.bb) || !isInt(h.n, 2, 6) || !isInt(h.button, 0, h.n - 1)) return 'ungültige Kopfdaten';
  if ((h.session != null && !num(h.session, 0, 8.64e15)) || (h.seed != null && !isInt(h.seed, 0, 4294967295)) || (h.tseed != null && !isInt(h.tseed, 0, 4294967295))) return 'ungültige Kopfdaten';
  if (!Array.isArray(h.seats) || h.seats.length !== h.n) return 'ungültige Plätze';
  for (var i = 0; i < h.seats.length; i++) {
    var s = h.seats[i];
    if (!s || typeof s !== 'object' || typeof s.name !== 'string' || s.name.length > 40 || !/^[A-Za-zÀ-ÖØ-öø-ÿ0-9 .'\-]+$/.test(s.name) || !isInt(s.start, 0, 1e12) || typeof s.pos !== 'string' || !/^[A-Z0-9+]{1,4}$/.test(s.pos)) return 'ungültiger Platz';
    if ((s.seat != null && s.seat !== i) || (s.id != null && (typeof s.id !== 'string' || !ID_RE2.test(s.id))) || (s.hero != null && typeof s.hero !== 'boolean') || (s.typ != null && (typeof s.typ !== 'string' || !/^[A-Za-zäöü -]{1,20}$/.test(s.typ)))) return 'ungültiger Platz';
  }
  var hc = PT.parseCards(h.hero || ''), bc = PT.parseCards((h.board || []).join(''));
  if (!hc || hc.length !== 2 || !bc || bc.length > 5) return 'ungültige Karten';
  if (!Array.isArray(h.actions) || h.actions.length > 400) return 'ungültige Aktionen';
  for (var j = 0; j < h.actions.length; j++) {
    var a = h.actions[j];
    if (!a || !isInt(a.st, 0, 3) || !isInt(a.s, 0, h.n - 1) || ['sb', 'bb', 'fold', 'check', 'call', 'bet', 'raise'].indexOf(a.t) < 0 || !isInt(a.a, 0, 1e12)) return 'ungültige Aktion ' + (j + 1);
    if ((a.ai != null && typeof a.ai !== 'boolean') || (a.cr != null && typeof a.cr !== 'boolean') || !optInts(a, ['add', 'tc', 'pot', 'cur'])) return 'ungültige Aktion ' + (j + 1);
  }
  if (!Array.isArray(h.decisions) || h.decisions.length > 50) return 'ungültige Entscheidungen';
  for (var d = 0; d < h.decisions.length; d++) {
    var x = h.decisions[d];
    if (!x || typeof x !== 'object' || typeof x.grade !== 'string' || C.GRADES.indexOf(x.grade) < 0 || !num(x.score, -1e3, 1e3)) return 'ungültige Entscheidung';
    if (x.rec != null && (typeof x.rec !== 'string' || x.rec.length > 80)) return 'ungültige Empfehlung';
    if (x.chosen != null && (typeof x.chosen !== 'string' || x.chosen.length > 80)) return 'ungültige Aktion';
    var de = validDecisionFields(x, h); if (de) return de;
  }
  if (!Array.isArray(h.net) || h.net.length !== h.n) return 'ungültiges Ergebnis';
  for (var q = 0; q < h.n; q++) if (!isInt(h.net[q], -1e13, 1e13)) return 'ungültiges Ergebnis';
  if (h.heroNet != null && !isInt(h.heroNet, -1e13, 1e13)) return 'ungültiges Ergebnis';
  if ((h.won != null && !intList(h.won, h.n, 0, 1e13)) || (h.rake != null && !isInt(h.rake, 0, 1e13)) || (h.showdown != null && typeof h.showdown !== 'boolean')) return 'ungültiges Ergebnis';
  if (h.sawFlop != null && !seatList(h.sawFlop, h.n)) return 'ungültiges Ergebnis';
  if (h.returned != null) {
    if (!Array.isArray(h.returned) || h.returned.length > 8) return 'ungültige Rückgabe';
    for (var rr = 0; rr < h.returned.length; rr++) { var ret = h.returned[rr]; if (!ret || !isInt(ret.seat, 0, h.n - 1) || !isInt(ret.amount, 0, 1e13)) return 'ungültige Rückgabe'; }
  }
  if (!isInt(h.heroSeat, 0, h.n - 1)) return 'ungültiger Heldenplatz';
  if (h.shown != null) {
    if (!Array.isArray(h.shown) || h.shown.length > h.n) return 'ungültige aufgedeckte Karten';
    for (var w = 0; w < h.shown.length; w++) { var sw = h.shown[w], swc = sw && PT.parseCards(sw.cards || ''); if (!sw || !isInt(sw.seat, 0, h.n - 1) || !swc || swc.length !== 2) return 'ungültige aufgedeckte Karten'; }
  }
  if (h.pots != null) {
    if (!Array.isArray(h.pots) || h.pots.length > 7) return 'ungültige Pots';
    for (var pp = 0; pp < h.pots.length; pp++) { var po = h.pots[pp]; if (!po || !isInt(po.amount, 0, 1e13) || !seatList(po.winners, h.n) || !seatList(po.eligible, h.n)) return 'ungültige Pots'; }
  }
  if (h.rakeCfg != null && (typeof h.rakeCfg !== 'object' || typeof h.rakeCfg.pct !== 'number' || !(h.rakeCfg.pct >= 0 && h.rakeCfg.pct <= 0.2) || !isInt(h.rakeCfg.cap, 0, 1e9) || typeof h.rakeCfg.nfnd !== 'boolean')) return 'ungültige Rake-Angaben';
  for (var d2 = 0; d2 < h.decisions.length; d2++) {
    var x2 = h.decisions[d2];
    if (!isInt(x2.st, 0, 3) || !strList(x2.cats, 12) || !strList(x2.tags, 20)) return 'ungültige Entscheidung';
    if (x2.snap != null && validSnap(x2.snap, h)) return 'ungültige Momentaufnahme';
  }
  if (h.tags != null && !strList(h.tags, 40)) return 'ungültige Tags';
  if (h.training != null && (typeof h.training !== 'string' || !TAG_RE.test(h.training))) return 'ungültige Trainingskategorie';
  return null;
}
function num(x, lo, hi) { return typeof x === 'number' && isFinite(x) && x >= lo && x <= hi; }
function optInts(o, keys) { for (var i = 0; i < keys.length; i++) { var v = o[keys[i]]; if (v != null && !isInt(v, -1e13, 1e13)) return false; } return true; }
function intList(a, n, lo, hi) { if (!Array.isArray(a) || a.length !== n) return false; for (var i = 0; i < a.length; i++) if (!isInt(a[i], lo, hi)) return false; return true; }
var LEVELS_OK = ['schnell', 'standard', 'praezise', 'tief'], ACT_T = ['fold', 'check', 'call', 'bet', 'raise'], X_KEYS = ['v', 'sw', 'mv', 'lvl', 'it', 'max', 'ms', 'eq', 'best', 'ch', 'ex', 'alt'];
var HDEC_KEYS = ['i', 'st', 'chosen', 'rec', 'cls', 'eq', 'need', 'grade', 'score', 'loss', 'cats', 'tags', 'evs', 'mode', 'snap', 'pos', 'x'];
function actRef(o) { return o && typeof o === 'object' && !Array.isArray(o) && ACT_T.indexOf(o.t) >= 0 && (o.a === null || isInt(o.a, 0, 1e13)); }
/** Strenge Prüfung der übrigen Entscheidungsfelder (Zahlen endlich und im Wertebereich, Texte begrenzt, Zusatzfelder x). */
function validDecisionFields(x, h) {
  for (var k in x) if (HDEC_KEYS.indexOf(k) < 0) return 'unbekanntes Feld in Entscheidung';
  if (x.i != null && !isInt(x.i, 0, 400)) return 'ungültige Entscheidung';
  if ((x.eq != null && !num(x.eq, 0, 1)) || (x.need != null && !num(x.need, 0, 1)) || (x.loss != null && !num(x.loss, -1e13, 1e13))) return 'ungültige Entscheidung';
  if (x.cls != null && (typeof x.cls !== 'string' || !/^[a-z]{1,20}$/.test(x.cls))) return 'ungültige Entscheidung';
  if (x.mode != null && x.mode !== 'exploit' && x.mode !== 'gto') return 'ungültige Entscheidung';
  if (x.pos != null && (typeof x.pos !== 'string' || !/^[A-Z0-9+]{1,4}$/.test(x.pos))) return 'ungültige Entscheidung';
  if (x.evs != null) {
    if (!Array.isArray(x.evs) || x.evs.length > 6) return 'ungültige EV-Liste';
    for (var e = 0; e < x.evs.length; e++) { var y = x.evs[e]; if (!y || typeof y.l !== 'string' || y.l.length > 80 || !num(y.ev, -1e13, 1e13) || !num(y.u, -1e13, 1e13)) return 'ungültige EV-Liste'; }
  }
  if (x.x != null) {
    var b = x.x;
    if (!b || typeof b !== 'object' || Array.isArray(b)) return 'ungültige Zusatzfelder';
    for (var k2 in b) if (X_KEYS.indexOf(k2) < 0) return 'unbekanntes Zusatzfeld';
    if (b.v !== 1 || typeof b.sw !== 'string' || !/^[0-9A-Za-z.+-]{1,20}$/.test(b.sw) || typeof b.mv !== 'string' || !/^[0-9A-Za-z.+_-]{1,40}$/.test(b.mv) || LEVELS_OK.indexOf(b.lvl) < 0) return 'ungültige Zusatzfelder';
    if (!isInt(b.it, 0, 1e8) || !isInt(b.max, 0, 1e8) || !isInt(b.ms, 0, 1e8)) return 'ungültige Zusatzfelder';
    var q = b.eq;
    if (!q || typeof q !== 'object' || (q.se !== null && !num(q.se, 0, 1)) || typeof q.m !== 'string' || q.m.length > 80 || (q.lo !== null && !num(q.lo, 0, 1)) || (q.hi !== null && !num(q.hi, 0, 1))) return 'ungültige Zusatzfelder';
    if (!actRef(b.best) || !actRef(b.ch)) return 'ungültige Zusatzfelder';
    if (!Array.isArray(b.ex) || b.ex.length > 4 || b.ex.some(function (z) { return !isInt(z, 0, 1e13); })) return 'ungültige Zusatzfelder';
    if (!Array.isArray(b.alt) || b.alt.length > 12) return 'ungültige Zusatzfelder';
    for (var j = 0; j < b.alt.length; j++) { var al = b.alt[j]; if (!actRef(al) || typeof al.l !== 'string' || al.l.length > 80 || !isInt(al.ev, -1e13, 1e13) || !isInt(al.u, -1e13, 1e13)) return 'ungültige Zusatzfelder'; }
    if (x.snap == null) return 'Zusatzfelder ohne Momentaufnahme';
  }
  return null;
}
function seatList(a, n) { if (!Array.isArray(a) || a.length > n) return false; for (var i = 0; i < a.length; i++) if (!isInt(a[i], 0, n - 1)) return false; return true; }
var TAG_RE = /^[a-z0-9-]{1,32}$/;
function strList(a, max) { if (!Array.isArray(a) || a.length > max) return false; for (var i = 0; i < a.length; i++) if (typeof a[i] !== 'string' || !TAG_RE.test(a[i])) return false; return true; }
/** Momentaufnahme einer Entscheidung (öffentliche Sicht des Helden + Gegnerwerte + Seed) streng prüfen */
var NAME_RE2 = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 .'\-]{1,40}$/, ID_RE2 = /^[A-Za-z0-9_-]{1,40}$/, POS_OK = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
function cardList(a, n0, n1) {
  if (!Array.isArray(a) || a.length < n0 || a.length > n1) return false;
  for (var i = 0; i < a.length; i++) if (!isInt(a[i], 0, 51) || a.indexOf(a[i]) !== i) return false;
  return true;
}
function validView(v, n) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  if (!isInt(v.n, 2, 6) || (n != null && v.n !== n) || !isInt(v.seat, 0, v.n - 1) || !isInt(v.street, 0, 3) || !isInt(v.button, 0, v.n - 1) || !isInt(v.bb, 2, 1e7) || !isInt(v.sb, 1, v.bb)) return false;
  if (!cardList(v.cards, 2, 2) || !cardList(v.board, 0, 5) || v.cards.some(function (c) { return v.board.indexOf(c) >= 0; })) return false;
  var ints = ['pot', 'cur', 'raises', 'limpers', 'callsSince', 'lastFull'];
  for (var i = 0; i < ints.length; i++) if (v[ints[i]] != null && !isInt(v[ints[i]], 0, 1e13)) return false;
  if ((v.pfa != null && !isInt(v.pfa, -1, v.n - 1)) || (v.opener != null && !isInt(v.opener, -1, v.n - 1))) return false;
  var L = v.legal; if (!L || typeof L !== 'object') return false;
  var ln = ['toCall', 'callAmt', 'minTo', 'maxTo', 'minFull', 'cur', 'bet', 'stack'], lb = ['canCheck', 'canCall', 'canFold', 'canRaise', 'isBet', 'reopened'];
  for (var a = 0; a < ln.length; a++) if (!isInt(L[ln[a]], 0, 1e13)) return false;
  for (var b = 0; b < lb.length; b++) if (typeof L[lb[b]] !== 'boolean') return false;
  if (!Array.isArray(v.players) || v.players.length !== v.n) return false;
  for (var p = 0; p < v.players.length; p++) {
    var q = v.players[p];
    if (!q || q.seat !== p || typeof q.id !== 'string' || !ID_RE2.test(q.id) || typeof q.name !== 'string' || !NAME_RE2.test(q.name) || POS_OK.indexOf(q.pos) < 0 ||
      !isInt(q.stack, 0, 1e13) || !isInt(q.bet, 0, 1e13) || !isInt(q.total, 0, 1e13) || !isInt(q.start, 0, 1e13) || typeof q.folded !== 'boolean' || typeof q.allIn !== 'boolean') return false;
  }
  if (!Array.isArray(v.actions) || v.actions.length > 400) return false;
  for (var j = 0; j < v.actions.length; j++) {
    var x = v.actions[j];
    if (!x || !isInt(x.st, 0, 3) || !isInt(x.s, 0, v.n - 1) || ['sb', 'bb', 'fold', 'check', 'call', 'bet', 'raise'].indexOf(x.t) < 0 || !isInt(x.a, 0, 1e13)) return false;
  }
  return true;
}
function validSnap(sn, h) {
  if (typeof sn !== 'object' || Array.isArray(sn)) return 'Format';
  for (var k in sn) if (['view', 'opps', 'seed'].indexOf(k) < 0) return 'Feld';
  if (!isInt(sn.seed, 0, 4294967295)) return 'Seed';
  if (!validView(sn.view, h ? h.n : null)) return 'Sicht';
  if (!sn.opps || typeof sn.opps !== 'object' || Array.isArray(sn.opps)) return 'Gegner';
  var ids = Object.keys(sn.opps);
  if (ids.length > 5) return 'Gegner';
  for (var i = 0; i < ids.length; i++) { if (!ID_RE2.test(ids[i]) || S.validRecord(sn.opps[ids[i]], false) || sn.opps[ids[i]].id !== ids[i]) return 'Gegner'; }
  return null;
}

// ---------- Lerndaten ----------
function newLearning() { return { v: 1, decisions: [], sessions: [], srs: [], quiz: { n: 0, correct: 0, byType: {} }, goals: defaultGoals(), created: Date.now ? Date.now() : 0 }; }
function defaultGoals() {
  return [
    { id: 'g1', text: 'Durchschnittliche Entscheidungsqualität ≥ 75 über die letzten 100 Entscheidungen', kind: 'score', target: 75, window: 100 },
    { id: 'g2', text: 'Geschätzter EV-Verlust ≤ 0,5 BB je Entscheidung (letzte 100)', kind: 'loss', target: 0.5, window: 100 },
    { id: 'g3', text: 'Keine Spot-Kategorie unter 60 (je mindestens 10 Entscheidungen)', kind: 'minspot', target: 60, min: 10 }
  ];
}
var DEC_MAX = 20000;
/** Speichert eine bewertete Entscheidung kompakt */
function addDecision(L, d) {
  L.decisions.push({ ts: d.ts, s: d.score, l: Math.round((d.lossBB || 0) * 100) / 100, st: d.st, p: d.pos, t: d.tags || [], c: d.cats || [], o: d.opptyp || null, tr: d.training || null, g: d.grade, se: d.session || 0 });
  if (L.decisions.length > DEC_MAX) L.decisions.splice(0, L.decisions.length - DEC_MAX);
}
var OPP_TYPES = ['unbekannt', 'sehr loose', 'loose-passiv', 'Nit', 'LAG', 'TAG'], DEC_KEYS = ['ts', 's', 'l', 'st', 'p', 't', 'c', 'o', 'tr', 'g', 'se'];
var GOAL_KINDS = ['score', 'loss', 'minspot'];
function validDecision(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return false;
  for (var k in d) if (DEC_KEYS.indexOf(k) < 0) return false;
  return typeof d.s === 'number' && d.s >= 0 && d.s <= 100 && typeof d.l === 'number' && isFinite(d.l) && isInt(d.st, 0, 3) && strList(d.t, 20) && strList(d.c, 12) &&
    (d.o == null || OPP_TYPES.indexOf(d.o) >= 0) && (d.p == null || S.POSITIONS.indexOf(d.p) >= 0) && (d.g == null || C.GRADES.indexOf(d.g) >= 0) &&
    (d.tr == null || (typeof d.tr === 'string' && TAG_RE.test(d.tr))) && (d.se == null || isInt(d.se, 0, 1e15)) && (d.ts == null || typeof d.ts === 'number');
}
function validSrs(it) {
  return !!it && typeof it.key === 'string' && it.key.length <= 80 && /^[A-Za-z0-9_:|.-]+$/.test(it.key) && typeof it.cat === 'string' && TAG_RE.test(it.cat) && isInt(it.box, 0, 10) &&
    typeof it.due === 'number' && isInt(it.seed, 0, 4294967295) && typeof it.label === 'string' && it.label.length <= 400 && isInt(it.reviews, 0, 1e6) &&
    (it.view == null || (typeof it.view === 'object' && !validSnap({ view: it.view.view, opps: it.view.opps, seed: it.seed }, null)));
}
function validGoal(go) {
  return !!go && typeof go.id === 'string' && /^[A-Za-z0-9_-]{1,20}$/.test(go.id) && GOAL_KINDS.indexOf(go.kind) >= 0 && typeof go.target === 'number' && isFinite(go.target) &&
    typeof go.text === 'string' && go.text.length <= 200 && (go.window == null || isInt(go.window, 1, 10000)) && (go.min == null || isInt(go.min, 1, 10000));
}
function validQuiz(Q) {
  if (!Q || typeof Q !== 'object' || !isInt(Q.n, 0, 1e9) || !isInt(Q.correct, 0, Q.n) || !Q.byType || typeof Q.byType !== 'object' || Array.isArray(Q.byType)) return false;
  for (var qt in Q.byType) { var bt = Q.byType[qt]; if (!TAG_RE.test(qt) || !bt || !isInt(bt.n, 0, 1e9) || !isInt(bt.c, 0, bt.n)) return false; }
  return true;
}
function validLearning(L) {
  if (!L || typeof L !== 'object' || Array.isArray(L) || L.v !== 1) return 'ungültiges Format';
  if (!Array.isArray(L.decisions) || L.decisions.length > DEC_MAX) return 'Entscheidungen ungültig';
  for (var i = 0; i < L.decisions.length; i++) if (!validDecision(L.decisions[i])) return 'Entscheidung ' + (i + 1) + ' ungültig';
  if (!Array.isArray(L.srs) || L.srs.length > 1000) return 'Wiederholungen ungültig';
  for (var j = 0; j < L.srs.length; j++) if (!validSrs(L.srs[j])) return 'Wiederholung ' + (j + 1) + ' ungültig';
  if (!validQuiz(L.quiz)) return 'Quiz ungültig';
  if (!Array.isArray(L.sessions) || L.sessions.length > 5000) return 'Sessions ungültig';
  for (var si = 0; si < L.sessions.length; si++) { var se = L.sessions[si]; if (!se || typeof se !== 'object' || Array.isArray(se)) return 'Session ' + (si + 1) + ' ungültig'; }   // D23-7: wie repairLearning
  if (!Array.isArray(L.goals) || L.goals.length > 20) return 'Ziele ungültig';
  for (var g = 0; g < L.goals.length; g++) if (!validGoal(L.goals[g])) return 'Ziel ' + (g + 1) + ' ungültig';
  if (L.pp != null && !validPPList(L.pp)) return 'Vorher-Nachher-Tests ungültig';
  return null;
}
/** Gespeicherte Lerndaten reparieren statt verwerfen: ungültige Einträge werden entfernt, der Rest bleibt erhalten. */
function repairLearning(L) {
  if (!L || typeof L !== 'object' || Array.isArray(L) || L.v !== 1) return null;
  var out = newLearning(), removed = 0;
  // 2.3 (Prüfbefund C-7): jede verworfene oder gekürzte Struktur zählt; gleiche Grenzen wie validLearning (Entscheidungen DEC_MAX, Wiederholungen 1.000, Sessions 5.000)
  if (Array.isArray(L.decisions)) { removed += Math.max(0, L.decisions.length - DEC_MAX); L.decisions.slice(-DEC_MAX).forEach(function (d) { if (validDecision(d)) out.decisions.push(d); else removed++; }); } else if (L.decisions != null) removed++;
  if (Array.isArray(L.srs)) { removed += Math.max(0, L.srs.length - 1000); L.srs.slice(-1000).forEach(function (it) { if (validSrs(it)) out.srs.push(it); else removed++; }); } else if (L.srs != null) removed++;
  if (Array.isArray(L.sessions)) { removed += Math.max(0, L.sessions.length - 5000); L.sessions.slice(-5000).forEach(function (x) { if (x && typeof x === 'object' && !Array.isArray(x)) out.sessions.push(x); else removed++; }); } else if (L.sessions != null) removed++;
  if (validQuiz(L.quiz)) out.quiz = L.quiz; else removed++;
  if (Array.isArray(L.goals) && L.goals.length <= 20 && L.goals.every(validGoal)) out.goals = L.goals; else removed++;
  if (typeof L.created === 'number') out.created = L.created;
  if (Array.isArray(L.pp)) { out.pp = []; var seen = {}; removed += Math.max(0, L.pp.length - PP_MAX); L.pp.slice(-PP_MAX).forEach(function (t) { if (validPP(t) && !seen[t.id]) { seen[t.id] = 1; out.pp.push(t); } else removed++; }); }
  else if (L.pp != null) removed++;
  return { learning: out, removed: removed };
}
function mean(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
function sd(a) { if (a.length < 2) return null; var m = mean(a); return Math.sqrt(a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / (a.length - 1)); }
function stat(list) {
  var sc = list.map(function (d) { return d.s; }), ls = list.map(function (d) { return d.l; }), m = mean(sc), s2 = sd(sc);
  // geglättete Kompetenz: Mittel zum Prior 70 mit Stärke 8 Entscheidungen
  var k = 8, smooth = list.length ? (sc.reduce(function (a, b) { return a + b; }, 0) + 70 * k) / (list.length + k) : null;
  return { n: list.length, score: m, smooth: smooth, ci: s2 != null ? 1.96 * s2 / Math.sqrt(list.length) : null, loss: mean(ls), lossSum: ls.reduce(function (a, b) { return a + b; }, 0) };
}
/** Kompetenzprofil aus allen Entscheidungen */
function profile(L) {
  var D = L.decisions, out = { all: stat(D), spots: {}, streets: {}, positions: {}, cats: Object.create(null), opptyp: Object.create(null), trend: null, sessions: [] };
  Object.keys(C.SPOTS).forEach(function (t) { var l = D.filter(function (d) { return d.t.indexOf(t) >= 0; }); out.spots[t] = stat(l); });
  [0, 1, 2, 3].forEach(function (s) { out.streets[s] = stat(D.filter(function (d) { return d.st === s; })); });
  S.POSITIONS.forEach(function (p) { out.positions[p] = stat(D.filter(function (d) { return d.p === p; })); });
  var total = 0; D.forEach(function (d) { d.c.forEach(function (c) { out.cats[c] = (out.cats[c] || 0) + 1; total++; }); });
  out.catTotal = total;
  D.forEach(function (d) { if (d.o) { var x = out.opptyp[d.o] || (out.opptyp[d.o] = []); x.push(d); } });
  Object.keys(out.opptyp).forEach(function (k) { out.opptyp[k] = stat(out.opptyp[k]); });
  if (D.length >= 40) {
    var w = Math.min(100, Math.floor(D.length / 2)), recent = D.slice(-w), prev = D.slice(-2 * w, -w);
    var a = stat(recent), b = stat(prev);
    out.trend = { window: w, recent: a.score, prev: b.score, diff: a.score - b.score, ci: a.ci != null && b.ci != null ? Math.sqrt(a.ci * a.ci + b.ci * b.ci) : null };
  }
  // Verlauf in Blöcken zu 25 Entscheidungen
  for (var i = 0; i < D.length; i += 25) { var blk = D.slice(i, i + 25); if (blk.length >= 10) out.sessions.push({ from: i + 1, to: i + blk.length, score: mean(blk.map(function (d) { return d.s; })), loss: mean(blk.map(function (d) { return d.l; })) }); }
  out.sessions = out.sessions.slice(-40);
  // Schwächen priorisieren: niedrige geglättete Kompetenz mit genug Daten, unbekannte Kategorien als „erkunden“
  var pri = [];
  Object.keys(out.spots).forEach(function (t) {
    var s = out.spots[t];
    if (s.n >= 5) pri.push({ tag: t, name: C.SPOTS[t], score: s.smooth, n: s.n, reason: 'Qualität ' + Math.round(s.smooth) + ' aus ' + s.n + ' Entscheidungen' });
    else pri.push({ tag: t, name: C.SPOTS[t], score: 72, n: s.n, reason: s.n ? 'erst ' + s.n + ' Entscheidungen' : 'noch nicht trainiert', explore: true });
  });
  pri.sort(function (x, y) { return x.score - y.score; });
  out.priorities = pri;
  out.level = levelOf(out.all);
  return out;
}
// ---------- 2.2: Lernwirkung messbar machen (Arbeitspaket 7) ----------
/* Fehlerfelder: Zuordnung der Fehlerkategorien des Coaches zu den Feldern des Auftrags. Der EV-Verlust einer Entscheidung wird zu gleichen
   Teilen auf ihre Kategorien verteilt (modellabhängige Schätzung, kein gemessener Verlust). */
var AREAS = { betgroesse: 'Einsatzgröße', 'pot-odds': 'Pot Odds', draw: 'Pot Odds', mittelstark: 'Range-Einschätzung', 'zu-viel-call': 'Range-Einschätzung',
  'zu-viel-fold': 'Range-Einschätzung', gegnertyp: 'Range-Einschätzung', 'zu-passiv': 'Aggression', 'zu-viel-bluff': 'Aggression',
  'zu-viele-starthaende': 'Starthände und Position', position: 'Starthände und Position' };
function errorAreas(L) {
  var out = {}, D = L.decisions;
  // Prüfer A 2.2 (A-12): je Entscheidung jedes Feld nur einmal zählen
  var areasOf = function (d) { var u = []; d.c.forEach(function (c) { var a = AREAS[c] || 'Sonstiges'; if (u.indexOf(a) < 0) u.push(a); }); return u; };
  D.forEach(function (d) { if (!d.c.length) return; var share = d.l / d.c.length;
    d.c.forEach(function (c) { var a = AREAS[c] || 'Sonstiges', o = out[a] || (out[a] = { area: a, n: 0, loss: 0, recent: 0 }); o.loss += share; });
    areasOf(d).forEach(function (a) { out[a].n++; }); });
  D.slice(-100).forEach(function (d) { areasOf(d).forEach(function (a) { if (out[a]) out[a].recent++; }); });
  return Object.keys(out).map(function (k) { return out[k]; }).sort(function (a, b) { return b.loss - a.loss; });
}
/** Wiederkehrende Fehler: gleiche Situation (Spot) und gleiche Fehlerkategorie mindestens dreimal mit Bewertung ≤ 45 */
function recurring(L) {
  var g = {}, D = L.decisions;
  D.forEach(function (d, i) { if (d.s > 45) return; (d.t.length ? d.t : ['ohne']).forEach(function (t) { d.c.forEach(function (c) {
    var k = t + '|' + c, o = g[k] || (g[k] = { spot: t, cat: c, n: 0, loss: 0, last: 0, idx: [] }); o.n++; o.loss += d.l; o.last = Math.max(o.last, d.ts || 0); o.idx.push(i); }); }); });
  var N = D.length;
  return Object.keys(g).map(function (k) { var o = g[k]; o.recent = o.idx.filter(function (i) { return i >= N - 100; }).length; delete o.idx; return o; })
    .filter(function (o) { return o.n >= 3; }).sort(function (a, b) { return b.n - a.n || b.loss - a.loss; });
}
/** Verbesserung in zuvor problematischen Situationen: je Spot die ersten 10 gegen die letzten 10 Entscheidungen (ab 20 Entscheidungen),
    „zuvor problematisch“, wenn die ersten 10 im Mittel unter 60 lagen. Differenz mit 95-%-Intervall (Welch, Normalnäherung). */
/** Zweiseitiges 97,5-%-Quantil der t-Verteilung (Cornish-Fisher-Näherung, Fehler < 0,01 ab df = 2) */
function tq(df) { if (!(df > 0)) return Infinity; var z = 1.959964, z3 = z * z * z, z5 = z3 * z * z; return z + (z3 + z) / (4 * df) + (5 * z5 + 16 * z3 + 3 * z) / (96 * df * df); }
/** Welch-Intervall (Halbbreite, 95 %) für zwei Stichproben */
function welch(a, b) { var sa = sd(a) || 0, sb = sd(b) || 0, va = sa * sa / a.length, vb = sb * sb / b.length, se = Math.sqrt(va + vb);
  if (!(se > 0)) return { ci: Infinity, se: 0 };
  var df = (va + vb) * (va + vb) / ((a.length > 1 ? va * va / (a.length - 1) : 0) + (b.length > 1 ? vb * vb / (b.length - 1) : 0) || 1); return { ci: tq(df) * se, se: se, df: df }; }
/* Prüfer A 2.2 (A-4): Auswahl („zuvor schwach“) und Vorher-Messung getrennt, sonst entsteht Verbesserung allein durch Regression zur Mitte.
   Entscheidungen 1–10 bestimmen „zuvor schwach“, 11–20 sind „vorher“, die letzten 10 „nachher“ (ab 30 Entscheidungen; sonst nicht berichtet). */
function improvement(L) {
  var out = [];
  Object.keys(C.SPOTS).forEach(function (t) {
    var l = L.decisions.filter(function (d) { return d.t.indexOf(t) >= 0; }); if (l.length < 30) return;
    var sel = l.slice(0, 10).map(function (d) { return d.s; }), a = l.slice(10, 20).map(function (d) { return d.s; }), b = l.slice(-10).map(function (d) { return d.s; });
    var ma = mean(a), mb = mean(b), w = welch(a, b);
    out.push({ spot: t, name: C.SPOTS[t], n: l.length, before: ma, after: mb, diff: mb - ma, ci: w.ci, problem: mean(sel) < 60, sure: isFinite(w.ci) && Math.abs(mb - ma) > w.ci });
  });
  // Prüfer C 2.2: viele Situationen gleichzeitig → Holm-Korrektur für „eindeutig“ (p aus der Normalnäherung der Welch-Statistik)
  var byP = out.filter(function (x) { return isFinite(x.ci) && x.ci > 0; }).map(function (x) { x.p = 2 * (1 - normCdf(Math.abs(x.diff) / (x.ci / 1.96))); return x; }).sort(function (a, b) { return a.p - b.p; });
  var stop = false; out.forEach(function (x) { x.sure = false; });
  byP.forEach(function (x, i) { if (!stop && x.p <= 0.05 / (byP.length - i)) x.sure = true; else stop = true; });
  return out.sort(function (x, y) { return (y.problem - x.problem) || (y.diff - x.diff); });
}
/* Vorher-Nachher-Test: feste Testsituationen aus denselben Generatoren und Kategorien, vorher und nachher mit verschiedenen, aber vorab
   festgelegten Seeds (vergleichbare, nicht identische Situationen; gleiches Gegnerfeld „gemischt“). Ergebnis: mittlere Entscheidungsqualität
   und EV-Verlust je Phase, Differenz mit 95-%-Intervall. Das misst die Entscheidungsqualität dieses Nutzers in diesen Kategorien; eine
   allgemeine pädagogische Wirksamkeit ist damit nicht nachgewiesen. */
var PP_MAX = 30, PP_PER = 4;
function prePostNew(L, opts) {
  opts = opts || {};
  var prof = opts.profile || profile(L), cats = (opts.cats || prof.priorities.filter(function (p) { return !p.explore && hasScen(p.tag); }).slice(0, 3).map(function (p) { return p.tag; }));
  if (!opts.cats) ['cbet', 'river-call', 'blind-defense'].forEach(function (c) { if (cats.length < 3 && cats.indexOf(c) < 0) cats.push(c); });
  var id = 'pp' + ((opts.now || Date.now()) % 1e10), per = opts.per || PP_PER, test = { id: id, ts: opts.now || Date.now(), cats: cats, state: 'pre', pre: [], post: [] };
  // Prüfer C 2.2 (C-1): nur Seeds, für die der Generator eine Situation erzeugt (sonst ließe sich der Test nie abschließen)
  var okSeed = function (c, base) { for (var k = 0; k < 25; k++) { var sd = PT.rng.hashStr(base + (k ? '|' + k : '')) >>> 0; if (opts.noCheck || generate(c, sd, { difficulty: 'gemischt', ts: 0 })) return sd; } return null; };
  cats.forEach(function (c) { for (var i = 0; i < per; i++) ['pre', 'post'].forEach(function (ph) { var sd = okSeed(c, id + '|' + c + '|' + ph + '|' + i); if (sd != null) test[ph].push({ cat: c, seed: sd, s: null, l: null }); }); });
  if (!Array.isArray(L.pp)) L.pp = [];
  L.pp.push(test); if (L.pp.length > PP_MAX) L.pp.splice(0, L.pp.length - PP_MAX);
  return test;
}
function prePostQueue(test, phase) { return test[phase].map(function (it, i) { return { key: 'pp:' + test.id + ':' + phase + ':' + i, cat: it.cat, seed: it.seed, diff: 'gemischt' }; }).filter(function (q, i) { return test[phase][i].s == null; }); }
function prePostRecord(L, key, score, lossBB) {
  var m = /^pp:([A-Za-z0-9]+):(pre|post):(\d+)$/.exec(key || ''); if (!m || !Array.isArray(L.pp)) return false;
  var t = L.pp.filter(function (x) { return x.id === m[1]; })[0]; if (!t) return false;
  var it = t[m[2]][+m[3]]; if (!it) return false;
  it.s = Math.round(score); it.l = Math.round((lossBB || 0) * 100) / 100;
  if (t.pre.every(function (x) { return x.s != null; }) && t.state === 'pre') t.state = 'training';
  if (t.post.every(function (x) { return x.s != null; })) t.state = 'fertig';
  return true;
}
function prePostResult(t) {
  function ph(list) { var sc = list.filter(function (x) { return x.s != null; }); return { n: sc.length, score: mean(sc.map(function (x) { return x.s; })), sd: sd(sc.map(function (x) { return x.s; })), loss: mean(sc.map(function (x) { return x.l; })) }; }
  var a = ph(t.pre), b = ph(t.post), res = { pre: a, post: b, byCat: {} };
  // Prüfer A 2.2 (A-13): Urteil erst bei vollständigen Phasen, Welch-Intervall mit t-Quantil; ohne Streuung kein Intervall und kein Urteil
  var complete = t.pre.every(function (x) { return x.s != null; }) && t.post.every(function (x) { return x.s != null; });
  if (complete && a.n >= 2 && b.n >= 2) { var w = welch(t.pre.map(function (x) { return x.s; }), t.post.map(function (x) { return x.s; })); res.diff = b.score - a.score; res.ci = isFinite(w.ci) ? w.ci : null; res.sure = res.ci != null && Math.abs(res.diff) > res.ci; }
  res.complete = complete;
  t.cats.forEach(function (c) { var x = ph(t.pre.filter(function (i) { return i.cat === c; })), y = ph(t.post.filter(function (i) { return i.cat === c; })); res.byCat[c] = { pre: x.score, post: y.score, n: Math.min(x.n, y.n) }; });
  return res;
}
var PP_KEYS = ['id', 'ts', 'state', 'cats', 'pre', 'post'], PP_ITEM = ['cat', 'seed', 's', 'l'];
function validPP(t) {
  if (!t || typeof t !== 'object' || Array.isArray(t) || Object.keys(t).some(function (k) { return PP_KEYS.indexOf(k) < 0; }) || typeof t.id !== 'string' || !/^pp[0-9]{1,12}$/.test(t.id) || typeof t.ts !== 'number' || ['pre', 'training', 'fertig'].indexOf(t.state) < 0) return false;
  if (!Array.isArray(t.cats) || t.cats.length < 1 || t.cats.length > 6 || !t.cats.every(hasScen)) return false;
  var okItem = function (it) { return it && typeof it === 'object' && !Array.isArray(it) && Object.keys(it).every(function (k) { return PP_ITEM.indexOf(k) >= 0; }) && t.cats.indexOf(it.cat) >= 0 && hasScen(it.cat) && isInt(it.seed, 0, 4294967295) && (it.s == null || num(it.s, 0, 100)) && (it.l == null || num(it.l, -1e6, 1e6)); };
  if (!['pre', 'post'].every(function (ph) { return Array.isArray(t[ph]) && t[ph].length >= 1 && t[ph].length <= 40 && t[ph].every(okItem); })) return false;
  var done = function (ph) { return t[ph].every(function (x) { return x.s != null; }); };
  if (t.state === 'fertig' && !(done('pre') && done('post'))) return false;
  if (t.state === 'training' && !done('pre')) return false;
  return true;
}
function validPPList(a) { if (!Array.isArray(a) || a.length > PP_MAX || !a.every(validPP)) return false; var ids = {}; return a.every(function (t) { if (ids[t.id]) return false; ids[t.id] = 1; return true; }); }
// ---------- 2.2: Gegnergedächtnis – Belastbarkeit je Wert und Verhaltenshypothesen (Arbeitspaket 6) ----------
/** Belastbarkeit eines Werts nach seinen tatsächlichen Gelegenheiten (nicht nach gespielten Händen) */
function statReliability(nd) { var n = nd ? nd[1] : 0; return n < 20 ? 'unsicher' : n < 100 ? 'Tendenz' : 'belastbar'; }
/** Verhaltenshypothesen: Abweichung vom Populationsmittel nur, wenn das 95-%-Wilson-Intervall den Mittelwert nicht enthält
    (gestützt) bzw. wenn der Rohwert um mehr als 10 Prozentpunkte abweicht, das Intervall ihn aber noch enthält (Vermutung).
    Aufgedeckte Bluffs (Bet oder Raise am River mit einer Hand unter dem 30. Perzentil) werden getrennt gezählt. */
var HYP = { vpip: ['spielt mehr Starthände als der Durchschnitt', 'spielt weniger Starthände als der Durchschnitt'], pfr: ['erhöht preflop häufiger', 'erhöht preflop seltener'],
  threeBet: ['3-Bettet häufig', '3-Bettet selten'], foldTo3Bet: ['gibt gegen 3-Bets oft auf', 'verteidigt gegen 3-Bets häufig'],
  cbetFlop: ['setzt am Flop häufig nach (C-Bet)', 'setzt am Flop selten nach'], foldToCbet: ['foldet oft gegen C-Bets', 'verteidigt gegen C-Bets häufig'],
  afq: ['spielt postflop aggressiv', 'spielt postflop passiv'], wtsd: ['geht oft zum Showdown', 'geht selten zum Showdown'] };
function normCdf(z) { var t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
function hypotheses(r) {
  // Prüfer A 2.2 (A-14): Bezug ist das Populationsmittel der Gegner-KI (LIK.ref), gestützt nur nach Holm-Korrektur über alle geprüften Werte
  var out = [], tab = PT.ranges.likelihoodTable && PT.ranges.likelihoodTable(), P = (tab && tab.ref) || PT.ranges.PRIOR, cand = [];
  Object.keys(HYP).forEach(function (k) {
    var nd = r.stats[k]; if (!nd || nd[1] < 10) return;
    var raw = nd[0] / nd[1], m = P[k]; if (m == null) return;
    var z = (raw - m) / Math.sqrt(m * (1 - m) / nd[1]), pv = 2 * (1 - normCdf(Math.abs(z)));
    cand.push({ key: k, raw: raw, m: m, n: nd[1], ci: S.wilson(nd), p: pv });
  });
  cand.sort(function (a, b) { return a.p - b.p; });
  var stop = false;
  cand.forEach(function (c, i) { var sure = !stop && c.p <= 0.05 / (cand.length - i); if (!sure) stop = true;
    if (sure || (c.n >= 30 && Math.abs(c.raw - c.m) > 0.1)) out.push({ key: c.key, text: HYP[c.key][c.raw > c.m ? 0 : 1], level: sure ? 'gestützt' : 'Vermutung', raw: c.raw, prior: c.m, n: c.n, ci: c.ci, p: c.p }); });
  var bl = 0, sh = 0;
  (r.shown || []).forEach(function (x) {
    if (!x || typeof x.board !== 'string' || x.board.length < 10 || typeof x.cards !== 'string') return;
    var b = PT.parseCards(x.board), c = PT.parseCards(x.cards); if (!b || !c || b.length < 5 || c.length !== 2) return;
    sh++; var riv = x.actions && x.actions[3] ? String(x.actions[3]) : '';
    if (/Bet|Raise/.test(riv) && B.percentile(c, b).p < 0.3) bl++;
  });
  if (bl >= 2) out.push({ key: 'riverBluff', text: 'zeigte am River nach Bet oder Raise mehrfach schwache Hände (' + bl + ' von ' + sh + ' aufgedeckten Blättern)', level: 'Vermutung', n: sh });
  return out;
}
function levelOf(all) {
  if (!all || all.n < 30) return 'einsteiger';
  if (all.smooth >= 78 && all.n >= 150) return 'experte';
  if (all.smooth >= 62) return 'fortgeschritten';
  return 'einsteiger';
}
function goalStatus(L, prof) {
  var D = L.decisions;
  return (L.goals || defaultGoals()).map(function (g) {
    var cur = null, ok = false, n = 0;
    if (g.kind === 'score') { var r = D.slice(-g.window); n = r.length; cur = mean(r.map(function (d) { return d.s; })); ok = n >= g.window && cur >= g.target; }
    else if (g.kind === 'loss') { var r2 = D.slice(-g.window); n = r2.length; cur = mean(r2.map(function (d) { return d.l; })); ok = n >= g.window && cur <= g.target; }
    else if (g.kind === 'minspot') { var ss = Object.keys(prof.spots).map(function (t) { return prof.spots[t]; }).filter(function (s) { return s.n >= g.min; }); n = ss.length; cur = ss.length ? Math.min.apply(null, ss.map(function (s) { return s.smooth; })) : null; ok = ss.length >= 3 && cur >= g.target; }
    return { id: g.id, text: g.text, current: cur, n: n, ok: ok };
  });
}

// ---------- Spaced Repetition (Leitner) ----------
var BOX_DAYS = [0, 1, 3, 7, 16, 35];
function srsAdd(L, item, now) {
  if (L.srs.some(function (x) { return x.key === item.key; })) return;
  L.srs.push({ key: item.key, cat: item.cat, seed: item.seed >>> 0, view: item.view || null, label: String(item.label || '').slice(0, 300), box: 0, due: now + 10 * 60000, created: now, reviews: 0, last: null });
  if (L.srs.length > 300) L.srs.splice(0, L.srs.length - 300);
}
function srsDue(L, now) { return L.srs.filter(function (x) { return x.due <= now; }).sort(function (a, b) { return a.due - b.due; }); }
function srsReview(L, key, score, now) {
  var it = L.srs.filter(function (x) { return x.key === key; })[0]; if (!it) return null;
  it.reviews++; it.last = score;
  if (score >= 80) { it.box = Math.min(BOX_DAYS.length - 1, it.box + 1); it.due = now + BOX_DAYS[it.box] * 86400000 + (it.box === 0 ? 600000 : 0); }
  else { it.box = 0; it.due = now + 10 * 60000; }
  if (it.box >= BOX_DAYS.length - 1 && score >= 90) L.srs.splice(L.srs.indexOf(it), 1);
  return it;
}

// ---------- Szenarien ----------
var SCEN = {
  'preflop-open': { name: 'Preflop Opening', pos: ['UTG', 'HJ', 'CO', 'BTN', 'SB'], bb: 100, target: function (h) { return h.street === 0; }, before: 'foldToHero' },
  'blind-defense': { name: 'Blind Defense', pos: ['BB', 'SB'], bb: 100, target: function (h) { return h.street === 0 && h.raises === 1; }, before: 'stealThenFold' },
  '3bet-pot': { name: '3-Bet-Pots', pos: ['BTN', 'CO', 'SB', 'BB'], bb: 100, target: function (h, hs) { return h.street === 1 && h.raises >= 0 && hs.rc === 2; }, before: 'threeBetPot' },
  '4bet-pot': { name: '4-Bet-Pots', pos: ['CO', 'BTN', 'HJ'], bb: 100, target: function (h, hs) { return h.street === 0 && hs.rc === 2 && hs.heroOpened; }, before: 'openFace3bet' },
  'cbet': { name: 'Continuation Bets', pos: ['CO', 'BTN', 'HJ', 'UTG'], bb: 100, target: function (h) { return h.street === 1 && h.cur === 0 && h.pfa === 0; }, before: 'openCalled' },
  'check-raise': { name: 'Check-Raise-Situationen', pos: ['BB'], bb: 100, target: function (h, hs) { return h.street === 1 && h.cur > 0 && hs.heroChecked; }, before: 'defendThenCheck' },
  'multiway': { name: 'Multiway-Pots', pos: ['BTN', 'CO', 'BB', 'SB'], bb: 100, target: function (h) { return h.street === 1 && h.liveCount() >= 3; }, before: 'multiway' },
  'draws': { name: 'Draws', pos: ['BTN', 'CO', 'BB'], bb: 100, target: function (h) { return h.street >= 1 && h.street <= 2 && hasDraw(h); }, before: 'openCalled', any: true },
  'river-call': { name: 'River Calls', pos: ['BB', 'BTN', 'CO'], bb: 100, target: function (h) { return h.street === 3 && h.cur > 0; }, before: 'playOn', any: true },
  'river-bluff': { name: 'River Bluffs', pos: ['BTN', 'CO'], bb: 100, target: function (h) { return h.street === 3 && h.cur === 0 && weakRiver(h); }, before: 'playOn', any: true },
  'value-bet': { name: 'Value Betting', pos: ['BTN', 'CO', 'HJ'], bb: 100, target: function (h) { return h.street >= 2 && h.cur === 0 && strongHand(h); }, before: 'playOn', any: true },
  'short-stack': { name: 'Short-Stack-Spiel', pos: ['CO', 'BTN', 'SB', 'BB', 'HJ'], bb: [12, 28], target: function (h) { return h.street === 0; }, before: 'playOn', any: true },
  'deep-stack': { name: 'Deep-Stack-Spiel', pos: ['BTN', 'CO', 'BB'], bb: [200, 300], target: function (h) { return h.street >= 1; }, before: 'openCalled', any: true },
  'allin': { name: 'All-in-Entscheidungen', pos: ['BB', 'BTN', 'CO', 'SB'], bb: [15, 60], target: function (h) { var L = h.legal(0); return L.toCall > 0 && (L.toCall >= h.p[0].stack || h.p.some(function (q) { return !q.isHero && !q.folded && q.allIn; })); }, before: 'playOn', any: true }
};
function hasDraw(h) { var d = PT.ranges.drawInfo(h.p[0].cards[0], h.p[0].cards[1], h.board); return d.strong && (PT.eval.evaluate(h.p[0].cards.concat(h.board)) >> 20) <= 1; }
function weakRiver(h) { return PT.bots.percentile(h.p[0].cards, h.board).p < 0.55; }
function strongHand(h) { return PT.bots.percentile(h.p[0].cards, h.board).p >= 0.88; }
/** Bekannte Trainingskategorie (nur eigene Schlüssel: „constructor“ aus importierten Lerndaten ist keine Kategorie, Prüfung C6). */
function hasScen(cat) { return typeof cat === 'string' && Object.prototype.hasOwnProperty.call(SCEN, cat); }
/** Führt Aktionen bis zum Zielspot aus. Gibt {hand, ok} zurück. Held sitzt immer auf Platz 0. */
function generate(cat, seed, opts) {
  opts = opts || {};
  var sc = (hasScen(cat) && SCEN[cat]) || SCEN['preflop-open'], rng0 = PT.makeRng('szenario|' + cat + '|' + (seed >>> 0));
  var cfg = PT.session.defaultConfig(); cfg.difficulty = opts.difficulty || 'gemischt';
  for (var attempt = 0, maxAtt = sc.any ? 240 : 80; attempt < maxAtt; attempt++) {
    var r = PT.makeRng('szenario|' + cat + '|' + (seed >>> 0) + '|' + attempt);
    var pos = sc.pos[Math.floor(r() * sc.pos.length)], posIdx = PT.POS6.indexOf(pos);
    var button = (0 - posIdx + 6) % 6;
    var bbN = Array.isArray(sc.bb) ? Math.round(sc.bb[0] + r() * (sc.bb[1] - sc.bb[0])) : sc.bb;
    var ids = PT.session.pickIds(r, 5, [], cfg);
    var players = [{ id: 'hero', name: 'Du', stack: bbN * cfg.bb, isHero: true }].concat(ids.map(function (id) {
      var stk = cat === 'allin' ? Math.round((10 + r() * 60) * cfg.bb) : bbN * cfg.bb;
      return { id: id, name: B.nameOf(id), stack: stk, isHero: false };
    }));
    var deck = PT.cards.shuffledDeck(r);
    var h = new PT.Hand({ players: players, button: button, sb: cfg.sb, bb: cfg.bb, deck: deck, no: 1, ts: opts.ts || 0 }).start();
    var brng = PT.makeRng('szenario-bots|' + cat + '|' + seed + '|' + attempt), hs = { rc: 0, heroOpened: false, heroChecked: false };
    var guard = 0, ok = false;
    while (!h.done && guard++ < 200) {
      updHs(h, hs);
      var s = h.toAct;
      if (s === 0 && sc.target(h, hs)) { ok = true; break; }
      var a = scripted(sc.before, h, s, hs, brng);
      if (!a) a = s === 0 ? heroAuto(h, brng) : B.decideFor(h, s, brng, null);
      var res = h.act(s, a);
      if (!res.ok) { var L = h.legal(s); h.act(s, L.canCheck ? { type: 'check' } : { type: 'call' }); }
      if (h.p[0].folded) break;
    }
    if (ok) return { hand: h, cat: cat, seed: seed >>> 0, attempt: attempt, name: sc.name, ids: ids };
  }
  return null;
}
function updHs(h, hs) {
  var rc = 0, opened = false, checked = false;
  h.actions.forEach(function (a) {
    if (a.st === 0 && (a.t === 'raise' || a.t === 'bet')) { rc++; if (rc === 1 && a.s === 0) opened = true; }
    if (a.st === h.street && a.s === 0 && a.t === 'check') checked = true;
  });
  hs.rc = rc; hs.heroOpened = opened; hs.heroChecked = checked;
}
function heroAuto(h, rng) { return B.decide(B.publicView(h, 0), 'g004', rng, null); }
function scripted(kind, h, s, hs, rng) {
  var L = h.legal(s), pre = h.street === 0, me = h.p[s];
  function foldOrCheck() { return L.canCheck ? { type: 'check' } : { type: 'fold' }; }
  function callOrCheck() { return L.canCall ? { type: 'call' } : { type: 'check' }; }
  var heroPos = h.p[0].pos, order = PT.POS_ORDER_PRE;
  switch (kind) {
    case 'foldToHero': if (pre && s !== 0) return foldOrCheck(); return null;
    case 'stealThenFold':
      if (!pre) return null;
      if (s === 0) return null;
      if (h.raises === 0) {
        var stealer = heroPos === 'BB' ? ['BTN', 'CO', 'SB'] : ['BTN', 'CO'];
        if (stealer.indexOf(me.pos) >= 0 && order[me.pos] === Math.max.apply(null, stealer.map(function (p) { return order[p] < order[heroPos] ? order[p] : -1; })))
          return { type: 'raise', amount: Math.round((me.pos === 'SB' ? 3 : 2.5) * h.bb) };
        if (order[me.pos] < order[heroPos]) return foldOrCheck();
      }
      return foldOrCheck();
    case 'threeBetPot':
      if (pre) {
        if (s === 0) { if (h.raises === 1 && L.canRaise) return { type: 'raise', amount: Math.min(L.maxTo, Math.round(h.cur * (heroPos === 'SB' || heroPos === 'BB' ? 4 : 3))) }; return h.raises >= 2 ? callOrCheck() : foldOrCheck(); }
        if (h.raises === 0) { if (order[me.pos] < order[heroPos] && order[me.pos] === Math.max(0, order[heroPos] - 1 - Math.floor(rng() * 2))) return { type: 'raise', amount: Math.round(2.5 * h.bb) }; return foldOrCheck(); }
        if (h.raises === 2 && s === h.opener) return callOrCheck();
        return foldOrCheck();
      }
      return s === 0 ? null : null;
    case 'openFace3bet':
      if (pre) {
        if (s === 0) { if (h.raises === 0) return { type: 'raise', amount: Math.round(2.5 * h.bb) }; return null; }
        if (h.raises === 0) return foldOrCheck();
        if (h.raises === 1 && !hs.three) { var after = order[me.pos] > order[heroPos]; if (after) { hs.three = true; return { type: 'raise', amount: Math.min(L.maxTo, Math.round(h.cur * 3.3)) }; } }
        return foldOrCheck();
      }
      return null;
    case 'openCalled':
      if (pre) {
        if (s === 0) { if (h.raises === 0 && L.canRaise) return { type: 'raise', amount: Math.round(2.5 * h.bb) }; return callOrCheck(); }
        if (h.raises === 0) return foldOrCheck();
        if (h.raises === 1 && !hs.caller) { if (me.pos === 'BB' || order[me.pos] > order[heroPos]) { hs.caller = true; return callOrCheck(); } }
        return foldOrCheck();
      }
      if (s !== 0 && h.street === 1 && !hs.flopDone) return { type: 'check' };
      return null;
    case 'defendThenCheck':
      if (pre) {
        if (s === 0) return callOrCheck();
        if (h.raises === 0 && (me.pos === 'BTN' || me.pos === 'CO')) { if (!hs.opener) { hs.opener = s; return { type: 'raise', amount: Math.round(2.5 * h.bb) }; } }
        return s === hs.opener ? callOrCheck() : foldOrCheck();
      }
      if (h.street === 1) { if (s === 0) return { type: 'check' }; if (s === hs.opener && L.canRaise && L.isBet) return { type: 'bet', amount: Math.max(L.minTo, Math.round(h.potTotal() * 0.5)) }; }
      return null;
    case 'multiway':
      if (pre) {
        if (s === 0) return callOrCheck();
        if (h.raises === 0 && !hs.mw) { hs.mw = 1; return { type: 'raise', amount: Math.round(2.5 * h.bb) }; }
        if ((hs.mw || 0) < 3) { hs.mw = (hs.mw || 0) + 1; return callOrCheck(); }
        return foldOrCheck();
      }
      if (s !== 0 && h.street === 1) return { type: 'check' };
      return null;
    default: return null;
  }
}

// ---------- Wissensquiz ----------
function quiz(type, rng) {
  var r = rng || PT.makeRng(), q, opts, ok, expl;
  function shuffleOpts(correct, wrongs) {
    var all = [correct].concat(wrongs).filter(function (x, i, a) { return a.indexOf(x) === i; }).slice(0, 4);
    for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = all[i]; all[i] = all[j]; all[j] = t; }
    return { opts: all, ok: all.indexOf(correct) };
  }
  if (type === 'potodds') {
    var pot = (4 + Math.floor(r() * 20)) * 100, bet = Math.round(pot * [0.33, 0.5, 0.66, 0.75, 1, 1.5][Math.floor(r() * 6)] / 50) * 50;
    var need = bet / (pot + 2 * bet), c = Math.round(need * 100) + ' %';
    var s = shuffleOpts(c, [Math.round(bet / (pot + bet) * 100) + ' %', Math.round(bet / pot * 100) + ' %', Math.round(need * 100 + 8) + ' %']);
    q = 'Pot ' + fmt(pot) + ', der Gegner setzt ' + fmt(bet) + '. Wie viel Equity brauchst du mindestens für einen Call?';
    expl = 'Benötigte Equity = Call / (Pot nach dem Call) = ' + fmt(bet) + ' / (' + fmt(pot) + ' + ' + fmt(bet) + ' + ' + fmt(bet) + ') ≈ ' + c + '.';
    opts = s.opts; ok = s.ok;
  } else if (type === 'mdf') {
    var p2 = 100, b2 = [33, 50, 75, 100, 150][Math.floor(r() * 5)], m = Math.round(p2 / (p2 + b2) * 100) + ' %';
    var s2 = shuffleOpts(m, [Math.round(b2 / (p2 + b2) * 100) + ' %', Math.round(b2 / (p2 + 2 * b2) * 100) + ' %', Math.round((1 - b2 / 300) * 100) + ' %']);
    q = 'Gegen eine Bet von ' + b2 + ' % des Pots: Wie hoch ist die Minimum Defense Frequency (MDF)?';
    expl = 'MDF = Pot / (Pot + Bet) = 100 / (100 + ' + b2 + ') ≈ ' + m + '.';
    opts = s2.opts; ok = s2.ok;
  } else if (type === 'outs') {
    var kinds = [['Flush Draw', 9], ['Open-Ended Straight Draw', 8], ['Gutshot', 4], ['Flush Draw + Gutshot', 12], ['Zwei Overcards', 6]], k = kinds[Math.floor(r() * kinds.length)];
    var turn = r() < 0.5, ex = turn ? k[1] / 46 : 1 - (1 - k[1] / 47) * (1 - k[1] / 46), c3 = Math.round(ex * 100) + ' %';
    var s3 = shuffleOpts(c3, [Math.round(k[1] * (turn ? 4 : 2)) + ' %', Math.round(ex * 100 + 9) + ' %', Math.round(Math.max(1, ex * 100 - 11)) + ' %']);
    q = 'Du hast auf dem ' + (turn ? 'Turn' : 'Flop') + ' einen ' + k[0] + ' (' + k[1] + ' Outs). Wie wahrscheinlich triffst du ' + (turn ? 'bis zum River' : 'bis zum River (Turn und River)') + '?';
    expl = turn ? k[1] + ' / 46 ≈ ' + c3 + ' (Faustregel: Outs × 2).' : '1 − (1 − ' + k[1] + '/47) · (1 − ' + k[1] + '/46) ≈ ' + c3 + ' (Faustregel: Outs × 4).';
    opts = s3.opts; ok = s3.ok;
  } else if (type === 'combos') {
    var hands = [['AK', 16], ['AKs', 4], ['AKo', 12], ['QQ', 6], ['JTs', 4]], hh = hands[Math.floor(r() * hands.length)], blk = r() < 0.5;
    var cnt = hh[1], txt = '';
    if (blk) {
      if (hh[0] === 'QQ') { cnt = 3; txt = ' wenn eine Dame auf dem Board liegt'; }
      else if (hh[0] === 'AK') { cnt = 12; txt = ' wenn ein Ass auf dem Board liegt'; }
      else if (hh[0] === 'AKs') { cnt = 3; txt = ' wenn ein Ass auf dem Board liegt'; }
      else if (hh[0] === 'AKo') { cnt = 9; txt = ' wenn ein Ass auf dem Board liegt'; }
      else { cnt = 3; txt = ' wenn ein Bube auf dem Board liegt'; }
    }
    var s4 = shuffleOpts(String(cnt), [String(cnt + 2), String(Math.max(1, cnt - 2)), String(cnt * 2)]);
    q = 'Wie viele Kombinationen von ' + hh[0] + ' gibt es' + (txt ? ',' + txt : ' ohne bekannte Karten') + '?';
    expl = 'Paare: 6 Kombinationen, suited: 4, offsuit: 12. Jede sichtbare Karte eines Rangs entfernt die Kombinationen mit genau dieser Karte' + (blk ? ' – hier bleiben ' + cnt + '.' : '.');
    opts = s4.opts; ok = s4.ok;
  } else if (type === 'spr') {
    var stack = (20 + Math.floor(r() * 180)) * 100, pt = (4 + Math.floor(r() * 30)) * 100, v = stack / pt, c5 = v.toFixed(1).replace('.', ',');
    var s5 = shuffleOpts(c5, [(pt / stack).toFixed(1).replace('.', ','), (v * 2).toFixed(1).replace('.', ','), (v / 2).toFixed(1).replace('.', ',')]);
    q = 'Effektiver Stack ' + fmt(stack) + ', Pot ' + fmt(pt) + '. Wie hoch ist die Stack-to-Pot Ratio (SPR)?';
    expl = 'SPR = effektiver Stack / Pot = ' + c5 + '.';
    opts = s5.opts; ok = s5.ok;
  } else {
    // Handrangfolge: Welche Hand gewinnt?
    var deck = PT.cards.shuffledDeck(r), board = deck.slice(0, 5), a = deck.slice(5, 7), b = deck.slice(7, 9);
    var sa = PT.evaluate(a.concat(board)), sb = PT.evaluate(b.concat(board));
    var correct = sa > sb ? 'Hand A' : sb > sa ? 'Hand B' : 'Split Pot';
    q = 'Board ' + board.map(PT.cardLabel).join(' ') + ' – Hand A: ' + a.map(PT.cardLabel).join(' ') + ', Hand B: ' + b.map(PT.cardLabel).join(' ') + '. Wer gewinnt?';
    expl = 'Hand A: ' + PT.handName(sa) + ', Hand B: ' + PT.handName(sb) + '.';
    opts = ['Hand A', 'Hand B', 'Split Pot']; ok = opts.indexOf(correct);
    type = 'handrank';
  }
  return { type: type, q: q, opts: opts, ok: ok, expl: expl };
}
var QUIZ_TYPES = { potodds: 'Pot Odds', mdf: 'Minimum Defense Frequency', outs: 'Outs und Trefferchance', combos: 'Kombinatorik', spr: 'Stack-to-Pot Ratio', handrank: 'Handbewertung' };

// ---------- Export Hand-Historie als Text ----------
function handText(h) {
  var lines = [], bb = h.bb;
  lines.push('PokerTrainer 2.0 – Hand #' + h.no + ' – NL Hold\'em ' + fmt(h.sb) + '/' + fmt(bb) + ' Spielgeld – ' + (h.ts ? new Date(h.ts).toISOString() : ''));
  lines.push('Button: Platz ' + (h.button + 1));
  h.seats.forEach(function (s) { lines.push('Platz ' + (s.seat + 1) + ': ' + s.name + ' (' + s.pos + ', ' + fmt(s.start) + ')'); });
  lines.push('Deine Karten: ' + h.hero);
  var st = -1;
  h.actions.forEach(function (a) {
    if (a.st !== st) { st = a.st; if (st > 0) lines.push('*** ' + PT.rules.STREET_NAME[st].toUpperCase() + ' *** ' + h.board.slice(0, st === 1 ? 3 : st === 2 ? 4 : 5).join(' ')); }
    lines.push(h.seats[a.s].name + ': ' + PT.actionText(a));
  });
  (h.returned || []).forEach(function (r) { lines.push('Nicht gecallt zurück an ' + h.seats[r.seat].name + ': ' + fmt(r.amount)); });
  if (h.shown && h.shown.length) h.shown.forEach(function (x) { lines.push(h.seats[x.seat].name + ' zeigt ' + x.cards); });
  (h.pots || []).forEach(function (p, i) { lines.push((i === 0 ? 'Main Pot' : 'Side Pot ' + i) + ' ' + fmt(p.amount) + ': ' + p.winners.map(function (w) { return h.seats[w].name; }).join(', ')); });
  lines.push('Ergebnis Held: ' + U.fmtSigned(h.heroNet));
  (h.decisions || []).forEach(function (d) { lines.push('Coach (' + PT.rules.STREET_NAME[d.st] + '): gespielt ' + d.chosen + ', empfohlen ' + d.rec + ', Bewertung ' + d.grade + (d.loss != null ? ' (EV-Verlust ' + U.fmtBB(d.loss, bb, 2) + ')' : '')); });
  return lines.join('\n');
}

PT.training = { makeHandRecord: makeHandRecord, makeDecision: makeDecision, slimDecision: slimDecision, validHand: validHand, newLearning: newLearning, addDecision: addDecision, validLearning: validLearning, repairLearning: repairLearning, validView: validView, validSnap: validSnap,
  profile: profile, goalStatus: goalStatus, srsAdd: srsAdd, srsDue: srsDue, srsReview: srsReview, BOX_DAYS: BOX_DAYS, SCEN: SCEN, hasScen: hasScen, generate: generate,
  quiz: quiz, QUIZ_TYPES: QUIZ_TYPES, handText: handText, levelOf: levelOf, defaultGoals: defaultGoals,
  AREAS: AREAS, errorAreas: errorAreas, recurring: recurring, improvement: improvement, prePostNew: prePostNew, prePostQueue: prePostQueue, prePostRecord: prePostRecord, prePostResult: prePostResult, validPP: validPP, statReliability: statReliability, hypotheses: hypotheses };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
