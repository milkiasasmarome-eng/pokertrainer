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
    training: meta.training || null, button: rec.button, sb: rec.sb, bb: rec.bb, n: rec.n,
    seats: rec.seats.map(function (s) { return { seat: s.seat, id: s.id, name: s.name, pos: s.pos, start: s.start, hero: !!s.hero, typ: s.hero ? null : (meta.types ? meta.types[s.id] || null : null) }; }),
    hero: hero ? PT.cardsStr(hero.cards) : '', heroSeat: hero ? hero.seat : 0,
    board: rec.board.slice(), actions: rec.actions, shown: rec.shown, net: rec.net, won: rec.won, returned: rec.returned, rake: rec.rake, showdown: rec.showdown, sawFlop: rec.sawFlop,
    heroNet: hero ? rec.net[hero.seat] : 0,
    pots: h.result.pots.map(function (p) { return { amount: p.amount, winners: p.winners.slice(), eligible: p.eligible.slice() }; }),
    decisions: (meta.decisions || []).map(slimDecision),
    tags: unionTags(meta.decisions || [])
  };
}
function slimDecision(d) {
  return { i: d.i, st: d.st, chosen: d.chosen, rec: d.rec, cls: d.cls, eq: d.eq, need: d.need, grade: d.grade, score: d.score, loss: d.loss,
    cats: d.cats || [], tags: d.tags || [], evs: (d.evs || []).slice(0, 6), mode: d.mode, snap: d.snap || null, pos: d.pos };
}
function unionTags(ds) { var o = []; ds.forEach(function (d) { (d.tags || []).forEach(function (t) { if (o.indexOf(t) < 0) o.push(t); }); }); return o; }
var HAND_KEYS = ['v', 'id', 'ts', 'no', 'session', 'seed', 'training', 'button', 'sb', 'bb', 'n', 'seats', 'hero', 'heroSeat', 'board', 'actions', 'shown', 'net', 'won', 'returned', 'rake', 'showdown', 'sawFlop', 'heroNet', 'pots', 'decisions', 'tags'];
function validHand(h) {
  if (!h || typeof h !== 'object' || Array.isArray(h)) return 'kein Datensatz';
  for (var k in h) if (HAND_KEYS.indexOf(k) < 0) return 'unbekanntes Feld';
  if (h.v !== 1 || typeof h.id !== 'string' || h.id.length > 80 || !/^[A-Za-z0-9_\-]+$/.test(h.id)) return 'ungültige ID';
  if (!isInt(h.no, 0, 1e12) || typeof h.ts !== 'number' || !isInt(h.bb, 2, 1e7) || !isInt(h.sb, 1, h.bb) || !isInt(h.n, 2, 6) || !isInt(h.button, 0, h.n - 1)) return 'ungültige Kopfdaten';
  if (!Array.isArray(h.seats) || h.seats.length !== h.n) return 'ungültige Plätze';
  for (var i = 0; i < h.seats.length; i++) {
    var s = h.seats[i];
    if (!s || typeof s.name !== 'string' || s.name.length > 40 || !/^[A-Za-zÀ-ÖØ-öø-ÿ0-9 .'\-]+$/.test(s.name) || !isInt(s.start, 0, 1e12) || typeof s.pos !== 'string' || s.pos.length > 4) return 'ungültiger Platz';
  }
  var hc = PT.parseCards(h.hero || ''), bc = PT.parseCards((h.board || []).join(''));
  if (!hc || hc.length !== 2 || !bc || bc.length > 5) return 'ungültige Karten';
  if (!Array.isArray(h.actions) || h.actions.length > 400) return 'ungültige Aktionen';
  for (var j = 0; j < h.actions.length; j++) {
    var a = h.actions[j];
    if (!a || !isInt(a.st, 0, 3) || !isInt(a.s, 0, h.n - 1) || ['sb', 'bb', 'fold', 'check', 'call', 'bet', 'raise'].indexOf(a.t) < 0 || !isInt(a.a, 0, 1e12)) return 'ungültige Aktion ' + (j + 1);
  }
  if (!Array.isArray(h.decisions) || h.decisions.length > 50) return 'ungültige Entscheidungen';
  for (var d = 0; d < h.decisions.length; d++) {
    var x = h.decisions[d];
    if (!x || typeof x.grade !== 'string' || C.GRADES.indexOf(x.grade) < 0 || typeof x.score !== 'number') return 'ungültige Entscheidung';
    if (x.rec != null && (typeof x.rec !== 'string' || x.rec.length > 80)) return 'ungültige Empfehlung';
    if (x.chosen != null && (typeof x.chosen !== 'string' || x.chosen.length > 80)) return 'ungültige Aktion';
  }
  if (!Array.isArray(h.net) || h.net.length !== h.n) return 'ungültiges Ergebnis';
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
function validLearning(L) {
  if (!L || typeof L !== 'object' || L.v !== 1) return 'ungültiges Format';
  if (!Array.isArray(L.decisions) || L.decisions.length > DEC_MAX) return 'Entscheidungen ungültig';
  for (var i = 0; i < L.decisions.length; i++) { var d = L.decisions[i]; if (!d || typeof d.s !== 'number' || d.s < 0 || d.s > 100 || typeof d.l !== 'number' || !isInt(d.st, 0, 3) || !Array.isArray(d.t) || !Array.isArray(d.c)) return 'Entscheidung ' + (i + 1) + ' ungültig'; }
  if (!Array.isArray(L.srs) || L.srs.length > 1000) return 'Wiederholungen ungültig';
  if (!L.quiz || typeof L.quiz.n !== 'number') return 'Quiz ungültig';
  if (!Array.isArray(L.sessions) || L.sessions.length > 5000) return 'Sessions ungültig';
  return null;
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
  var D = L.decisions, out = { all: stat(D), spots: {}, streets: {}, positions: {}, cats: {}, opptyp: {}, trend: null, sessions: [] };
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
  L.srs.push({ key: item.key, cat: item.cat, seed: item.seed >>> 0, view: item.view || null, label: item.label || '', box: 0, due: now + 10 * 60000, created: now, reviews: 0, last: null });
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
/** Führt Aktionen bis zum Zielspot aus. Gibt {hand, ok} zurück. Held sitzt immer auf Platz 0. */
function generate(cat, seed, opts) {
  opts = opts || {};
  var sc = SCEN[cat] || SCEN['preflop-open'], rng0 = PT.makeRng('szenario|' + cat + '|' + (seed >>> 0));
  var cfg = PT.session.defaultConfig(); cfg.difficulty = opts.difficulty || 'gemischt';
  for (var attempt = 0; attempt < 80; attempt++) {
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
    q = 'Wie viele Kombinationen von ' + hh[0] + ' gibt es' + (txt || ' ohne bekannte Karten') + '?';
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

PT.training = { makeHandRecord: makeHandRecord, validHand: validHand, newLearning: newLearning, addDecision: addDecision, validLearning: validLearning,
  profile: profile, goalStatus: goalStatus, srsAdd: srsAdd, srsDue: srsDue, srsReview: srsReview, BOX_DAYS: BOX_DAYS, SCEN: SCEN, generate: generate,
  quiz: quiz, QUIZ_TYPES: QUIZ_TYPES, handText: handText, levelOf: levelOf, defaultGoals: defaultGoals };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
