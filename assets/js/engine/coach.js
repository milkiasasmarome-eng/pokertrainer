/* PokerTrainer 2.0 – Coaching-Engine.
   Baut aus der öffentlichen Sicht des Helden (eigene Karten, Aktionen, Gegnerwerte aus der Datenbank) die
   geschätzten gegnerischen Ranges, berechnet Equity und EV aller Aktionen, klassifiziert die Entscheidung,
   erklärt sie in drei Tiefen und bewertet die tatsächlich gewählte Aktion. Kennt keine verdeckten Karten. */
(function (G) {
'use strict';
var PT = G.PT, H = PT.hands, E = PT.eval, R = PT.ranges, Q = PT.equity, X = PT.ev, U = PT.util, S = PT.stats, clamp = U.clamp;
var fmt = U.fmt, pct = U.pct, NC = H.NC, C1 = H.C1, C2 = H.C2, CLS = H.CLS;

var GRADES = ['Optimal', 'Sehr gut', 'Gut', 'Vertretbar', 'Ungenau', 'Fehler', 'Schwerer Fehler'];
var GRADE_SCORE = { 'Optimal': 100, 'Sehr gut': 90, 'Gut': 80, 'Vertretbar': 65, 'Ungenau': 45, 'Fehler': 20, 'Schwerer Fehler': 0 };
var GRADE_SIMPLE = { 'Optimal': 'gut', 'Sehr gut': 'gut', 'Gut': 'gut', 'Vertretbar': 'vertretbar', 'Ungenau': 'vertretbar', 'Fehler': 'Fehler', 'Schwerer Fehler': 'Fehler' };
var CLASS_TEXT = { eindeutig: 'Mathematisch eindeutig', klar: 'Klar bevorzugt', knapp: 'Knappe Entscheidung', mehrere: 'Mehrere vertretbare Aktionen', unsicher: 'Hohe Unsicherheit' };
var MISTAKES = {
  'zu-viele-starthaende': 'Zu viele gespielte Starthände', 'position': 'Positionsfehler', 'pot-odds': 'Fehlerhafte Pot-Odds-Entscheidung',
  'zu-passiv': 'Zu passive Spielweise', 'zu-viel-bluff': 'Übermäßiges Bluffen', 'betgroesse': 'Falsche Betgröße', 'zu-viel-call': 'Zu häufiges Calling',
  'draw': 'Fehlerhafte Draw-Bewertung', 'mittelstark': 'Überbewertung mittelstarker Hände', 'gegnertyp': 'Fehler gegen einen Gegnertyp', 'zu-viel-fold': 'Zu häufiges Folden'
};
var SPOTS = {
  'preflop-open': 'Preflop Opening', 'blind-defense': 'Blind Defense', '3bet-pot': '3-Bet-Pots', '4bet-pot': '4-Bet-Pots', 'cbet': 'Continuation Bets',
  'check-raise': 'Check-Raise-Situationen', 'multiway': 'Multiway-Pots', 'draws': 'Draws', 'river-call': 'River Calls', 'river-bluff': 'River Bluffs',
  'value-bet': 'Value Betting', 'short-stack': 'Short-Stack-Spiel', 'deep-stack': 'Deep-Stack-Spiel', 'allin': 'All-in-Entscheidungen'
};

// ---------- Verlauf lesen ----------
function preInfo(v) {
  var pre = v.actions.filter(function (a) { return a.st === 0 && a.t !== 'sb' && a.t !== 'bb'; });
  var o = { rc: 0, opener: -1, lastRaiser: -1, lastTo: v.bb, callers: 0, limpers: 0, acted: {} };
  pre.forEach(function (a) {
    o.acted[a.s] = true;
    if (a.t === 'raise' || a.t === 'bet') { o.rc++; if (o.rc === 1) o.opener = a.s; o.lastRaiser = a.s; o.lastTo = a.a; o.callers = 0; }
    else if (a.t === 'call') { if (o.rc === 0) o.limpers++; else o.callers++; }
  });
  return o;
}
function lineOf(v, seat) {
  var pre = v.actions.filter(function (a) { return a.st === 0 && a.t !== 'sb' && a.t !== 'bb'; });
  var rc = 0, limpers = 0, callers = 0, opener = -1, last = null, rcAt = 0, lastTo = v.bb, openerPos = null, sq = false;
  pre.forEach(function (a) {
    if (a.s === seat) { last = a.t; rcAt = rc; sq = callers > 0 && rc === 1; }
    if (a.t === 'raise' || a.t === 'bet') { rc++; if (rc === 1) { opener = a.s; openerPos = v.players[a.s].pos; } lastTo = a.a; callers = 0; }
    else if (a.t === 'call') { if (rc === 0) limpers++; else callers++; }
  });
  var pos = v.players[seat].pos, sizeBB = lastTo / v.bb, kind = 'none';
  if (last === 'raise' || last === 'bet') kind = rcAt === 0 ? (limpers > 0 ? 'iso' : 'open') : rcAt === 1 ? '3bet' : rcAt === 2 ? '4bet' : '5bet';
  else if (last === 'call') kind = rcAt === 0 ? 'limp' : rcAt === 1 ? 'call' : rcAt === 2 ? (seat === opener ? 'call3' : 'call3') : 'call4';
  else if (last === 'check') kind = 'check';
  return { kind: kind, pos: pos, opener: openerPos, sizeBB: sizeBB, squeeze: sq };
}
var LINE_TEXT = { open: 'Open-Raise', iso: 'Iso-Raise', limp: 'Limp', call: 'Call gegen Raise', '3bet': '3-Bet', call3: 'Call gegen 3-Bet', '4bet': '4-Bet', call4: 'Call gegen 4-Bet',
  '5bet': '5-Bet', check: 'Check im Big Blind', none: 'noch keine Aktion' };

// ---------- Gegnerdaten ----------
function oppStats(dbRec) {
  // Datenformat 3: bei erkannter Änderung der Spielweise zählen die Kurzzeitwerte (PT.stats.effectiveStats), sonst die Langzeitwerte
  var eff = dbRec && S.effectiveStats ? S.effectiveStats(dbRec) : null;
  var raw = eff ? eff.stats : (dbRec ? dbRec.stats : S.emptyStats()), hands = eff ? eff.hands : (dbRec ? dbRec.hands : 0);
  var sm = R.smooth(raw); if (sm.pfr > sm.vpip) sm.pfr = sm.vpip;  // PFR ist eine Teilmenge von VPIP (Prüfer B, Befund 9)
  return { raw: raw, hands: hands, sm: sm, typ: S.playerType(dbRec), bel: S.reliability(hands), changed: eff ? eff.changed : [], longHands: eff ? eff.longHands : hands };
}
function buildRange(v, seat, st, gto, pfaSeat) {
  var line = lineOf(v, seat), sm = gto ? R.smooth(null) : st.sm, prof = R.profileOf(sm);
  var w = R.preflopRange(line, sm, gto);
  R.removeDead(w, v.cards.concat(v.board));
  if (v.street > 0) R.narrowPostflop(w, v.actions, seat, v.board, prof, pfaSeat, v.street);
  return { w: w, line: line, sm: sm, prof: prof };
}
function heroRangeFor(v) {
  // Range des Helden aus Sicht eines Beobachters (Grundmodell), für das River-Modellspiel
  var line = lineOf(v, v.seat), sm = R.smooth(null), prof = R.profileOf(sm);
  var w = R.preflopRange(line, sm, true);
  R.removeDead(w, v.board);
  if (v.street > 0) R.narrowPostflop(w, v.actions, v.seat, v.board, prof, v.pfa, v.street);
  return w;
}
function composition(w, board) {
  var o = { total: 0, strong: 0, good: 0, medium: 0, draw: 0, air: 0 };
  if (board.length < 3) {
    for (var k = 0; k < NC; k++) if (w[k] > 0) { o.total += w[k]; var x = H.classTop(CLS[k]); if (x <= 0.05) o.strong += w[k]; else if (x <= 0.15) o.good += w[k]; else if (x <= 0.35) o.medium += w[k]; else o.air += w[k]; }
    return o;
  }
  // Kategorien relativ zum Board: nur was die eigenen Karten beitragen, zählt (Board-Paare sind keine eigene Hand)
  var arr = [0, 0].concat(board), bcat = E.evaluate(board) >> 20;
  var br = board.map(function (c) { return c >> 2; }), top = Math.max.apply(null, br);
  for (var k2 = 0; k2 < NC; k2++) {
    var ww = w[k2]; if (!(ww > 0)) continue; o.total += ww;
    var a = C1[k2], b = C2[k2], ra = a >> 2, rb = b >> 2;
    arr[0] = a; arr[1] = b;
    var sc = E.evaluate(arr), cat = sc >> 20, cls;
    if (cat > bcat) {
      if (cat >= 3 || (cat === 2 && bcat === 0)) cls = 'strong';
      else {
        // genau ein eigenes Paar (ggf. zusätzlich zu einem Board-Paar)
        var pr = ra === rb ? ra : (br.indexOf(ra) >= 0 ? ra : rb), pocket = ra === rb;
        cls = (pocket && pr > top) || pr >= top ? 'good' : 'medium';
      }
    } else cls = board.length < 5 && R.drawInfo(a, b, board).strong ? 'draw' : 'air';
    o[cls] += ww;
  }
  return o;
}
function classMatrix(w) {
  var cw = R.classWeights(w), out = new Array(169);
  for (var i = 0; i < 169; i++) out[i] = cw.n[i] ? Math.round(1000 * cw.sum[i] / cw.n[i]) / 1000 : 0;
  return out;
}

// ---------- Analyse ----------
/**
 * input: {view (publicView mit Heldenkarten), opps: {id: dbRecord}, settings: {mode, level, depth}, seed, extra: [Beträge], learner}
 */
function analyze(input) {
  var t0 = U.now(), v = input.view, set = input.settings || {}, level = set.level || 'standard';
  // Automatischer Tipp: höchstens 5.000 Simulationen je Entscheidung (Projektvorgabe); Präzise/Tiefenanalyse nur auf Anforderung
  if (input.live && level !== 'schnell') level = 'standard';
  var L0 = Q.LEVELS[level] || Q.LEVELS.standard;
  var live = level === 'schnell' || level === 'standard';
  var maxSim = live ? Math.min(L0.maxIter, 5000) : L0.maxIter;
  if (input.maxSim != null) maxSim = Math.max(0, Math.min(maxSim, input.maxSim));  // nur für Tests: erschöpftes Budget nachstellen
  var budget = { left: maxSim, used: 0, calls: [] };
  var rng = PT.makeRng(input.seed != null ? input.seed : 'coach');
  var deadline = t0 + (live ? Math.min(L0.ms, 1400) : L0.ms);
  var res = {}, scale = level === 'praezise' ? 4 : level === 'tief' ? 10 : 1;
  budget.scale = scale;
  var prep = prepare(input, v, L0, budget, rng, deadline);
  // Faire Verteilung (Prüfbefund A1): Beide Modi teilen die gemeinsamen Zwischenergebnisse (Ranges, Equity je Kombination)
  // und erhalten danach je die Hälfte des Restbudgets und der Restzeit sowie eigene, vom Modus abhängige Zufallsströme.
  // Die Reihenfolge der Modi verändert die Ergebnisse dadurch nicht.
  var seedBase = String(input.seed != null ? input.seed : 'coach'), rest = budget.left, tNow = U.now(), tRest = Math.max(0, deadline - tNow);
  var order = input._order || ['exploit', 'gto'], shareB = {}, shareT = {};
  shareB.exploit = shareB.gto = Math.floor(rest / 2);  // gleich groß (Prüfer B, Befund 6), sonst hängt der Umfang einer Stichprobe vom Modus ab
  order.forEach(function (mode, i) {
    var bm = { left: shareB[mode], used: 0, calls: budget.calls, scale: scale, seedBase: seedBase + '|' + mode };
    var dl = U.now() + (i === 0 ? tRest / 2 : Math.max(0, deadline - U.now()));
    res[mode] = analyzeMode(input, v, mode, level, L0, bm, PT.makeRng(seedBase + '|modus|' + mode), Math.min(deadline, dl), set, prep);
    budget.used += bm.used; budget.left -= bm.used;
    res[mode].budgetShare = { granted: shareB[mode], used: bm.used };
  });
  var main = set.mode === 'gto' ? res.gto : res.exploit, other = set.mode === 'gto' ? res.exploit : res.gto;
  var out = main;
  out.mode = set.mode === 'gto' ? 'gto' : 'exploit';
  out.otherMode = { best: other.best, bestLabel: other.bestLabel, actions: other.actions.slice(0, 4) };
  out.modeDiff = modeDiffText(res.exploit, res.gto);
  out.iters = budget.used; out.simCalls = budget.calls; out.maxSim = maxSim; out.ms = Math.round(U.now() - t0); out.level = level; out.levelName = L0.name;
  out.label = 'Faustregel, kein Solver-Ergebnis';
  out.learnerHint = learnerHint(out, input.learner);
  out.text = explain(out, set.depth || 'fortgeschritten');
  return out;
}
/** Zufallsstrom aus Seed und Inhalt (Ranges) statt aus dem Modus: gleiche Eingaben ergeben in beiden Modi dieselben Stichproben */
function rngFor(budget, tag, ranges) {
  var base = (budget.seedBase || 'coach').replace(/\|(exploit|gto)$/, ''), t = base + '|' + tag + '|' + ranges.map(R.hash).join(',');
  // Kennung des Stroms (Prüfer B, Befund 6): Caches liefern nur Ergebnisse desselben Stroms und Umfangs und belasten das Budget mit dem Nennumfang
  var r = PT.makeRng(t); r.tag = t; return r;
}
/** Ranges beider Modi und eine gemeinsame Equity je Kombination (Vereinigung der Träger) */
function prepare(input, v, L0, budget, rng, deadlineAll) {
  var pre = preInfo(v), out = {};
  v.players.filter(function (q) { return q.seat !== v.seat && !q.folded; }).forEach(function (q) {
    var st = oppStats(input.opps ? input.opps[q.id] : null);
    var rE = buildRange(v, q.seat, st, false, v.pfa), rG = buildRange(v, q.seat, st, true, v.pfa);
    out[q.seat] = { st: st, ex: rE, gto: rG, pending: v.street === 0 && !pre.acted[q.seat] };
  });
  // Big Blind als Gegner, wenn preflop noch niemand freiwillig im Pot ist
  var anyIn = Object.keys(out).some(function (k) { return !out[k].pending; });
  if (v.street === 0 && !anyIn) {
    var me = v.players[v.seat];
    Object.keys(out).forEach(function (k) {
      var q = v.players[+k]; if (q.pos !== 'BB') return;
      var w = R.removeDead(R.rangeFromChart(R.chart('vsOpen', { pos: 'BB', opener: me.pos === 'SB' ? 'SB' : me.pos }), 'play'), v.cards);
      out[k].defW = w;
    });
  }
  var seats = Object.keys(out), share = Math.floor(Math.min(budget.left, 2000 * (budget.scale || 1)) / Math.max(1, seats.length));
  seats.forEach(function (k) {
    var o = out[k], u = new Float64Array(NC);
    for (var i = 0; i < NC; i++) { var a = o.ex.w[i], b = o.gto.w[i], c = o.defW ? o.defW[i] : 0; if (a > 0 || b > 0 || c > 0) u[i] = 1; }
    var tg = String(input.seed != null ? input.seed : 'coach') + '|ce|' + R.hash(u), rc = PT.makeRng(tg); rc.tag = tg;
    var ce = X.comboEquities(v.cards, v.board, u, { budget: budget, rng: rc, exactMax: L0.exactMax, maxIter: share, deadline: deadlineAll });
    o.e = ce.e; o.eqInfo = ce.info;
    o.floor = { ex: floorParts(o.ex.w, v.board), gto: floorParts(o.gto.w, v.board) };
  });
  return out;
}
/** Anteil der Range, der gegen jede Einsatzgröße weiterspielt (Two Pair+, Top Pair, Overpair, starke Draws; preflop Premium) */
function floorParts(w, board) {
  var c = composition(w, board), t = c.total || 1;
  return board.length < 3 ? { strong: c.strong / t, good: 0, draw: 0 } : { strong: c.strong / t, good: c.good / t, draw: c.draw / t };
}
function analyzeMode(input, v, mode, level, L0, budget, rng, deadline, set, prep) {
  var gto = mode === 'gto', me = v.players[v.seat], L = v.legal, board = v.board, street = v.street, bb = v.bb;
  var pre = preInfo(v);
  var oppsAll = v.players.filter(function (q) { return q.seat !== v.seat && !q.folded; });
  var opps = oppsAll.map(function (q) {
    var P = prep[q.seat], st = P.st, rg = gto ? P.gto : P.ex;
    return { p: q, seat: q.seat, w: P.defW && P.pending ? P.defW : rg.w, line: rg.line, sm: rg.sm, prof: rg.prof, raw: st.raw, hands: st.hands, typ: st.typ, bel: st.bel,
      pending: P.pending, e: P.e, eqInfo: P.eqInfo, floor: gto ? P.floor.gto : P.floor.ex, isDefW: !!(P.defW && P.pending) };
  });
  var maxOpp = 0; opps.forEach(function (o) { maxOpp = Math.max(maxOpp, o.p.stack + o.p.bet); });
  var eff = Math.min(me.stack + me.bet, maxOpp);
  var ipFlag = opps.every(function (o) { return PT.POS_ORDER_POST[o.p.pos] < PT.POS_ORDER_POST[me.pos]; });
  if (street === 0) ipFlag = opps.filter(function (o) { return !o.pending; }).every(function (o) { return PT.POS_ORDER_POST[o.p.pos] < PT.POS_ORDER_POST[me.pos]; }) && me.pos !== 'SB' && me.pos !== 'BB';
  var deadMoney = 0, deadList = []; v.players.forEach(function (q) { if (q.folded) { deadMoney += q.total; if (q.total > 0) deadList.push(q.total); } });
  var ctx = { v: v, me: me, L: L, board: board, street: street, bb: bb, pot: v.pot, cur: v.cur, mode: mode, level: level, rng: rng, budget: budget,
    deadline: deadline, eff: eff, spr: eff > 0 ? (eff - me.bet) / Math.max(1, v.pot) : 0, ip: ipFlag, pre: pre, maxOppStack: maxOpp, deadMoney: deadMoney, deadList: deadList,
    cbetSpot: street > 0 && v.pfa === v.seat && v.raises === 0 && L.isBet, prevCur: prevCur(v) };
  ctx.feat = R.handFeatures(v.cards, board);
  ctx.tex = R.analyzeBoard(board);
  // Relevante Gegner für die aktuelle Equity: im Pot beteiligte; Preflop ohne Beteiligte: Big Blind bzw. die Blinds
  var relevant = opps.filter(function (o) { return !o.pending; });
  if (street === 0 && !relevant.length) relevant = opps.filter(function (o) { return o.isDefW; });
  ctx.opps = opps;
  ctx.nOpp = Math.max(1, relevant.length);
  opps.forEach(function (o) { o.eqHU = X.rangeEq(o.e, o.w); });
  // Equity jetzt (gegen alle relevanten Gegner)
  var eqNow, eqSE = 0, eqMethod, eqFlag = null;
  var emptyOpp = relevant.filter(function (o) { return o.eqHU == null; })[0];
  if (relevant.length <= 1) {
    var o0 = relevant[0];
    eqNow = o0 ? o0.eqHU : 1; eqSE = o0 ? (o0.eqInfo.se || 0) : 0; eqMethod = o0 ? o0.eqInfo.method : 'kein Gegner';
    if (street === 0 && o0 && budget.left > 300) {
      var mc = Q.equity({ hero: v.cards, board: board, ranges: [o0.w], level: level, rng: rngFor(budget, 'pf', [o0.w]), budget: { left: Math.min(1000 * (budget.scale || 1), budget.left), used: 0, calls: budget.calls }, deadline: deadline });
      budget.left -= mc.iters || 0; budget.used += mc.iters || 0;
      if (mc.eq != null) { eqNow = mc.eq; eqSE = mc.se || 0; eqMethod = mc.method; ctx.kappaPF = o0.eqHU > 0 ? mc.eq / o0.eqHU : 1; }
    }
    ctx.kappa = 1;
  } else {
    var share = Math.min(budget.left, level === 'schnell' ? 600 : 1200 * (budget.scale || 1));
    var j = share >= 100 ? Q.equity({ hero: v.cards, board: board, ranges: relevant.map(function (o) { return o.w; }), level: level, rng: rngFor(budget, 'mw', relevant.map(function (o) { return o.w; })), budget: { left: share, used: 0, calls: budget.calls }, deadline: deadline, minIter: Math.min(300, share) }) : { eq: null, iters: 0, method: 'Näherung', reason: 'Simulationsbudget erschöpft' };
    budget.left -= j.iters || 0; budget.used += j.iters || 0;
    var prodHU = relevant.reduce(function (p, o) { return p * (o.eqHU == null ? 0.5 : o.eqHU); }, 1);
    if (j.eq != null) { eqNow = j.eq; eqSE = j.se || 0.02; eqMethod = j.method + ' (Mehrgegner)'; }
    else {
      // Mehrgegner-Simulation ausgefallen (Prüfer A, Befund 4): Produkt der Heads-up-Equities als gekennzeichnete Näherung.
      // Der Fehler dieser Näherung ist nicht bekannt; angesetzt wird ein Standardfehler von 0,06 (statt 0,02).
      eqNow = prodHU; eqSE = 0.06; eqMethod = 'Näherung: Produkt der Heads-up-Equities (Mehrgegner-Simulation nicht verfügbar' + (j.reason ? ': ' + j.reason : '') + ')';
      eqFlag = { approx: true, reason: 'Mehrgegner-Equity genähert' + (j.reason ? ' (' + j.reason + ')' : '') };
    }
    ctx.kappa = prodHU > 0 && j.eq != null ? j.eq / prodHU : 1;
  }
  if (emptyOpp || eqNow == null || !isFinite(eqNow)) {
    // Leere oder unbrauchbare Range (Prüfer A, Befund 7): neutraler Rückfall, gekennzeichnet, Standardfehler einer Gleichverteilung
    var why = emptyOpp ? 'leere Range von ' + emptyOpp.p.name : 'Equity nicht berechenbar';
    if (eqNow == null || !isFinite(eqNow)) eqNow = 0.5;
    eqSE = Math.max(eqSE, 0.29); eqMethod = 'Rückfall (' + why + ')'; eqFlag = { failed: true, approx: true, reason: why };
  }
  ctx.eqNow = eqNow; ctx.eqSE = eqSE;
  if (eqFlag) { ctx.eqApprox = true; ctx.eqFailed = !!eqFlag.failed; ctx.eqReason = eqFlag.reason; }
  // Range-Unsicherheit: engere und weitere Range des Hauptgegners
  var mainOpp = mainOpponent(v, relevant.length ? relevant : opps);
  var spread = 0, eqTight = null, eqLoose = null;
  if (mainOpp && mainOpp.w) {
    var sc = new Float32Array(NC), hs = street > 0 ? R.rangeStrength(mainOpp.w, board) : null;
    for (var k = 0; k < NC; k++) if (mainOpp.w[k] > 0) sc[k] = hs ? hs.v[k] : 1 - H.classTop(CLS[k]);
    var wT = new Float64Array(NC), wL = new Float64Array(NC);
    for (var k2 = 0; k2 < NC; k2++) { var x = mainOpp.w[k2]; if (!(x > 0)) continue; wT[k2] = x * (sc[k2] >= 0.5 ? 1 : 0.55); wL[k2] = x * (sc[k2] >= 0.5 ? 0.75 : 1); }
    eqTight = X.rangeEq(mainOpp.e, wT); eqLoose = X.rangeEq(mainOpp.e, wL);
    var relScale = relevant.length > 1 ? ctx.eqNow / Math.max(0.01, mainOpp.eqHU || 0.5) : 1;
    if (eqTight != null && eqLoose != null) { eqTight *= relScale; eqLoose *= relScale; spread = Math.abs(eqLoose - eqTight) / 2; }
    var dataW = mainOpp.hands < 100 ? 1 : mainOpp.hands < 500 ? 0.75 : 0.5;
    if (gto) dataW = 0.75;
    spread *= dataW;
  }
  ctx.eqRangeSpread = spread;
  ctx.foldUnc = gto ? 0.08 : (mainOpp ? (mainOpp.hands < 100 ? 0.14 : mainOpp.hands < 500 ? 0.1 : 0.06) : 0.1);
  // Aktionen bewerten
  var cands = X.candidates(ctx);
  (input.extra || []).forEach(function (amt) {
    if (L.canRaise && amt >= L.minTo && amt <= L.maxTo && !cands.some(function (c) { return c.amount === amt && (c.type === 'bet' || c.type === 'raise'); }))
      cands.push({ type: L.isBet ? 'bet' : 'raise', amount: amt, label: (L.isBet ? 'Bet ' : 'Raise auf ') + fmt(amt) + (amt === L.maxTo ? ' (All-in)' : ''), kind: null, extra: true, allin: amt === L.maxTo });
  });
  var acts = cands.map(function (c) {
    var r = X.evaluateAction(ctx, c), pp = r.parts || {};
    // Näherung oder fehlgeschlagene Berechnung (Mathe 2.1): gekennzeichnet, nie als 0 gewertet; die Unsicherheit wird erweitert
    var failed = !!pp.failed || !isFinite(r.ev), approx = !!pp.approx || failed, ev = isFinite(r.ev) ? r.ev : 0, u = isFinite(r.u) ? r.u : v.pot;
    if (approx) u = Math.max(u, (failed ? 0.25 : 0.1) * Math.max(v.pot, bb));
    return { type: c.type, amount: c.amount || 0, label: c.label, kind: c.kind, allin: !!c.allin, extra: !!c.extra, ev: ev, evBB: ev / bb, u: u, uSim: r.uSim, uModel: r.uModel, parts: slimParts(pp),
      approx: approx, failed: failed, reason: pp.reason || (failed ? 'EV nicht berechenbar' : null) };
  });
  acts.sort(function (a, b) { return b.ev - a.ev; });
  // Prüfer B, Befund 2: Frei gewählte Größen über der größten Kandidatengröße liegen außerhalb aller bewerteten und kalibrierten Größen
  // (Reaktionsmodell: ⅓ bis 1,5 Pot, All-in bis 2,5 Pot). Ihr EV ist eine Extrapolation: gekennzeichnet, nie die Empfehlung; die Bewertung
  // deckelt einen scheinbaren Vorteil auf „Gut“ (grade). Die Unsicherheit wird nicht erweitert, damit sie Verluste nicht mildert.
  var maxStd = 0; acts.forEach(function (a2) { if ((a2.type === 'bet' || a2.type === 'raise') && !a2.extra) maxStd = Math.max(maxStd, a2.amount); });
  acts.forEach(function (a2) { if (a2.extra && maxStd > 0 && a2.amount > maxStd) a2.extrapolated = true; });
  if (acts.length > 1 && acts[0].extrapolated) { var std0 = acts.filter(function (a2) { return !a2.extrapolated; })[0]; if (std0) { acts.splice(acts.indexOf(std0), 1); acts.unshift(std0); } }
  // Preflop: Faustregel-Chart als Anker. Raises außerhalb des Charts und Open-Limps nur bei belegtem Exploit.
  var chartInfo = street === 0 ? preflopAnchor(v, ctx, pre, acts, gto) : null;
  // Gleichgewichtsnaher Modus: Gegen MDF-Verteidigung ist ein reiner Bluff indifferent (EV ≈ Check). Eine Einzelhand-Empfehlung kann
  // keine Mischstrategie abbilden; bei Gleichstand innerhalb der Unsicherheit empfiehlt der Coach die risikoärmere passive Aktion und
  // nennt den Bluff als gleichwertige Alternative. Sonst würde jede schwache Hand blufft (Überbluffen; Hauptvergleich 2.1: −42,7 BB/100).
  var mixNote = null;
  if (gto && street > 0 && acts.length > 1 && group(acts[0]) === 'aggr' && ctx.eqNow != null && ctx.eqNow < 0.35) {
    var passive = acts.filter(function (a2) { return group(a2) !== 'aggr'; })[0];
    if (passive && acts[0].ev - passive.ev <= Math.max(0.25 * bb, Math.max(acts[0].u, passive.u))) {
      mixNote = { bluff: acts[0].label, passive: passive.label };
      acts.splice(acts.indexOf(passive), 1); acts.unshift(passive);
    }
  }
  var best = acts[0];
  // Klassifikation
  var bestOther = null;
  for (var i = 1; i < acts.length; i++) if (group(acts[i]) !== group(best)) { bestOther = acts[i]; break; }
  var gap = bestOther ? best.ev - bestOther.ev : Infinity, u = bestOther ? Math.max(best.u, bestOther.u) : best.u;
  var cls;
  if (acts.length === 1) cls = 'eindeutig';
  else if (gap >= Math.max(1.5 * bb, 0.2 * v.pot) && gap >= 3 * u) cls = 'eindeutig';
  else if (gap >= 2 * u && gap >= 0.5 * bb) cls = 'klar';
  else if (gap >= 0.5 * u && gap >= 0.15 * bb) cls = 'knapp';
  else cls = 'mehrere';
  var highU = (u >= 0.4 * Math.max(v.pot, bb) && gap < u) || best.failed || (bestOther && bestOther.failed && gap < bestOther.u);
  if (highU && cls !== 'eindeutig') cls = cls === 'klar' ? 'klar' : 'unsicher';
  if (best.failed || (bestOther && bestOther.failed && gap < bestOther.u) || (eqFlag && eqFlag.failed)) cls = 'unsicher';
  else if (eqFlag && eqFlag.approx && cls === 'eindeutig' && gap < 3 * Math.max(u, eqSE * Math.max(v.pot, bb))) cls = 'klar';
  if (chartInfo && chartInfo.applied) cls = chartInfo.w >= 0.85 ? 'klar' : 'knapp';
  if (mixNote) cls = 'mehrere';
  var tol = Math.max(0.25 * bb, 0.5 * u), sizeNote = null;
  if (group(best) === 'aggr') {
    var ag = acts.filter(function (a2) { return group(a2) === 'aggr' && a2 !== best; });
    var close = ag.filter(function (a2) { return best.ev - a2.ev <= Math.max(0.25 * bb, 0.75 * Math.max(best.u, a2.u)); });
    if (close.length) sizeNote = 'Die Aktion ist ' + (cls === 'eindeutig' || cls === 'klar' ? 'klar' : 'knapp') + ', die Größe ist offen: ' + [best].concat(close).slice(0, 3).map(function (a2) { return a2.label; }).join(', ') + ' liegen im Rahmen der Unsicherheit nahe beieinander.';
  }
  var alternatives = acts.filter(function (a) { return a !== best && best.ev - a.ev <= tol && (!chartInfo || !chartInfo.applied || chartWeight(chartInfo, a, pre.rc === 0) >= CHART_MIN); }).slice(0, 3);
  var po = street === 0 && pre.rc === 0 ? null : X.potOdds(ctx);  // im ungeöffneten Pot ist der Limp-Preis keine benötigte Equity
  // River-Modellspiel (Gleichgewicht des vereinfachten Spiels)
  var model = null;
  // input.skipModel: nur für Massensimulationen im Vergleichsrahmen (das Modellspiel erzeugt nur Text und ändert keine Empfehlung)
  if (gto && street === 3 && relevant.length === 1 && level !== 'schnell' && !input.skipModel) {
    try { model = riverModel(v, ctx, relevant[0]); } catch (e) { model = null; }
  }
  var spotTags = spotTagsOf(v, ctx, relevant, pre);
  return {
    street: street, streetName: PT.rules.STREET_NAME[street], situation: situationText(v, ctx, relevant, pre), spotTags: spotTags,
    actions: acts, best: best.type, bestAmount: best.amount, bestLabel: best.label, bestEV: best.ev, alternatives: alternatives.map(function (a) { return { label: a.label, ev: a.ev, type: a.type, amount: a.amount }; }),
    classification: cls, classText: CLASS_TEXT[cls], sizeNote: sizeNote, gap: isFinite(gap) ? gap : null, uncertainty: u,
    equity: { eq: ctx.eqNow, se: eqSE, lo: clamp(ctx.eqNow - 1.96 * eqSE, 0, 1), hi: clamp(ctx.eqNow + 1.96 * eqSE, 0, 1), method: eqMethod, approx: !!eqFlag, failed: !!(eqFlag && eqFlag.failed), reason: eqFlag ? eqFlag.reason : null,
      rangeLo: eqTight != null ? Math.min(eqTight, eqLoose) : null, rangeHi: eqLoose != null ? Math.max(eqTight, eqLoose) : null, vs: relevant.map(function (o) { return o.p.name; }) },
    potOdds: po, pot: v.pot, toCall: L.toCall, callAmt: L.callAmt, eff: eff, effBB: eff / bb, spr: ctx.spr, ip: ctx.ip, bb: bb,
    hand: { cls: H.className(H.classIdx(v.cards[0], v.cards[1])), top: H.handTop(v.cards[0], v.cards[1]), desc: ctx.feat.desc, name: ctx.feat.name, cat: ctx.feat.cat,
      outs: ctx.feat.outs, cleanOuts: ctx.feat.cleanOuts, draw: ctx.feat.draw },
    board: { labels: ctx.tex.labels || [], wet: ctx.tex.wet, dynamic: ctx.tex.dynamic },
    opponents: opps.map(function (o) {
      return { seat: o.seat, name: o.p.name, pos: o.p.pos, line: LINE_TEXT[o.line.kind], kind: o.line.kind, hands: o.hands, bel: o.bel, typ: o.typ, pending: o.pending,
        combos: Math.round(R.total(o.w) * 10) / 10, width: R.widthOf(o.w), eqHU: o.eqHU, eqMethod: o.eqInfo.method, comp: composition(o.w, board),
        sm: { vpip: o.sm.vpip, pfr: o.sm.pfr, threeBet: o.sm.threeBet, foldTo3Bet: o.sm.foldTo3Bet, foldToCbet: o.sm.foldToCbet, wtsd: o.sm.wtsd, afq: o.sm.afq, foldToSteal: o.sm.foldToSteal },
        matrix: o === mainOpp ? classMatrix(o.w) : null };
    }),
    mainOpp: mainOpp ? mainOpp.p.name : null, mainOppHands: mainOpp ? mainOpp.hands : 0, blockers: blockersText(v, mainOpp, board), model: model, mode: mode,
    heroPos: me.pos, chart: chartInfo, mix: mixNote, unopened: street === 0 && pre.rc === 0
  };
}
/** Chart-Gewichte der eigenen Startklasse für die aktuelle Preflop-Situation */
function heroChart(v, ctx, pre) {
  var me = ctx.me, pos = me.pos, ci = H.classIdx(v.cards[0], v.cards[1]), effBB = ctx.eff / ctx.bb, ch, kind;
  if (pre.rc === 0 && pre.limpers === 0) {
    if (effBB <= 15) { ch = R.chart('push', { pos: pos, bb: effBB }); kind = 'Push-or-Fold-Chart (' + Math.round(effBB) + ' BB effektiv)'; }
    else { ch = R.chart('rfi', { pos: pos }); kind = 'Open-Raise-Chart ' + pos; }
  } else if (pre.rc === 0) { ch = R.chart('iso', { pos: pos }); kind = 'Chart gegen Limper (' + pos + ')'; }
  else if (pre.rc === 1) { var op = v.players[pre.opener].pos; ch = R.chart('vsOpen', { pos: pos, opener: op, sizeBB: pre.lastTo / v.bb, squeeze: pre.callers > 0 }); kind = 'Chart ' + pos + ' gegen Open ' + op; }
  else if (pre.rc === 2 && pre.opener === v.seat) { ch = R.chart('vs3bet', { openW: R.RFI_W[pos] || 0.2, ip: ctx.ip }); kind = 'Chart gegen 3-Bet (' + (ctx.ip ? 'in Position' : 'out of Position') + ')'; }
  else { ch = R.chart('vs4bet', { deep: effBB > 150 }); kind = pre.rc === 2 ? 'Chart gegen 3-Bet ohne eigenes Open' : 'Chart gegen 4-Bet'; }
  var row = ch[ci];
  return { raise: row.raise, call: row.call, fold: row.fold, kind: kind };
}
var CHART_MIN = 0.12;
function chartWeight(hc, a, unopened) {
  var g = group(a);
  if (g === 'aggr') return hc.raise;
  if (g === 'call') return unopened ? hc.call : Math.max(hc.call, CHART_MIN);  // Calls gegen Raises rechnet das Modell über Equity; nur der Open-Limp ist an den Chart gebunden
  // Prüfer B, Befund 1: Fold wird wie jede andere Aktion am Chartgewicht gemessen (früher immer 1 → Fold mit Händen, die der Chart zu 100 % spielt).
  // Ausnahme bleibt der reine Call-oder-Fold gegen ein All-in (preflopAnchor rechnet dort ohne Chart).
  if (g === 'fold') return hc.fold;
  return 1;
}
function preflopAnchor(v, ctx, pre, acts, gto) {
  var L = ctx.L;
  if (!acts.length) return null;
  var raiser = pre.lastRaiser >= 0 ? v.players[pre.lastRaiser] : null;
  // Reiner Call-oder-Fold gegen ein All-in ohne weitere Spieler: rein rechnerisch, kein Chart nötig
  if (!L.canRaise && raiser && raiser.allIn) return null;
  var hc = heroChart(v, ctx, pre), unopened = pre.rc === 0;
  var top = acts[0], wTop = chartWeight(hc, top, unopened);
  var info = { kind: hc.kind, raise: hc.raise, call: hc.call, fold: hc.fold, applied: false, w: wTop };
  if (wTop >= CHART_MIN) return info;
  var alt = null;
  for (var i = 1; i < acts.length; i++) if (chartWeight(hc, acts[i], unopened) >= CHART_MIN) { alt = acts[i]; break; }
  if (!alt) return info;
  var gapM = top.ev - alt.ev;
  // Exploit nur, wenn die nötige Fold-Annahme statistisch belegt ist (Prüfbefund A6): Bayes-Schätzung der Fold-Rate des
  // entscheidenden Gegners (Beta-Prior aus dem Populationsmittel, Stärke wie bei der Glättung) und Wahrscheinlichkeit,
  // dass die wahre Fold-Rate über der Break-even-Rate liegt, ab der die Abweichung vom Chart nichts mehr bringt.
  var evd = !gto && group(top) === 'aggr' ? exploitEvidence(ctx, pre, top, alt, unopened, raiser) : null;
  // Gegenrichtung (Prüfer B, Befund 1/5): Fold statt Chart-Raise nur, wenn belegt ist, dass dieser Gegner seltener foldet als nötig
  var tighter = !gto && group(top) === 'fold' && group(alt) === 'aggr';
  if (tighter) evd = exploitEvidence(ctx, pre, alt, top, unopened, raiser);
  if (evd) info.evidence = evd;
  var pDir = evd ? (tighter ? evd.pBelow : evd.p) : 0;
  if (evd && pDir >= 0.9 && gapM >= Math.max(0.3 * ctx.bb, top.u, tighter ? alt.u : 0)) {
    info.exploit = { obs: evd.n, gap: gapM, p: pDir, fBe: evd.fBe, fBeRaw: evd.fBeRaw, post: evd.est != null ? evd.est : evd.mean, dir: tighter ? 'enger' : 'weiter' }; return info;
  }
  acts.splice(acts.indexOf(alt), 1); acts.unshift(alt);
  info.applied = true; info.w = chartWeight(hc, alt, unopened); info.modelBest = top.label; info.modelGap = gapM; info.obs = evd ? evd.n : 0;
  return info;
}
/** Beleg für eine exploitative Preflop-Abweichung: P(wahre Fold-Rate > Break-even-Rate | Beobachtungen) */
function exploitEvidence(ctx, pre, top, alt, unopened, raiser) {
  var key, ro;
  if (unopened) { key = 'foldToSteal'; ro = ctx.opps.filter(function (o) { return o.pending && o.p.pos === 'BB'; })[0]; }
  else if (raiser) { key = pre.rc === 1 ? 'foldTo3Bet' : 'foldTo4Bet'; ro = ctx.opps.filter(function (o) { return o.seat === pre.lastRaiser; })[0]; }
  if (!ro || !top.parts || !top.parts.folds) return null;
  var fr = top.parts.folds.filter(function (r) { return r.name === ro.p.name; })[0];
  if (!fr || !(fr.f > 0) || !(fr.f < 1)) return null;
  var raw = ro.raw && ro.raw[key] ? ro.raw[key] : [0, 0], k = R.PRIOR_K[key] || 15, m = R.PRIOR[key] != null ? R.PRIOR[key] : 0.5;
  var pAF = top.parts.pAllFold != null ? top.parts.pAllFold : fr.f, P = ctx.pot;
  if (!(pAF > 0) || !(pAF < 1)) return null;
  var C = (top.ev - pAF * P) / (1 - pAF), b = (P - C) * pAF / fr.f;  // ∂EV/∂f dieses Gegners (übrige Gegner fest)
  if (!(b > 0)) return null;
  var fBe = clamp(fr.f - (top.ev - alt.ev) / b, 0, 1);  // top: die Raise-Aktion, alt: die Vergleichsaktion (auch Fold bei engerem Spiel)
  // Prüfer A, Befund 12: fBe gilt für die Fold-Wahrscheinlichkeit bei dieser Größe; die Posterior beschreibt den größenunabhängigen Rohwert.
  // Die Größenanpassung des Reaktionsmodells (respond, preflop) wird deshalb umgekehrt: Rohwert-Schwelle r*, deren größenangepasste
  // Fold-Rate gerade fBe ergibt (3-Bet: r + 0,07·(Vielfaches − 3); 4-Bet: r + 0,08·(Vielfaches − 2,3); Steal: r·(BB/2,5)^0,25).
  // Prüfer B, Befund 5: Der Beleg prüft dieselbe Größe wie das Modell. Die Fold-Rate des Modells ist f = chartF·(1 − w) + g(Rate)·w
  // (w = n/(n + 25), g = Größenanpassung der Statistik, respond preflop). Gesucht ist die Rate r*, bei der f gerade fBe erreicht.
  // Skeptischer Prior: Beta mit Mittel r* (Stärke wie bei der Glättung) – ohne Beobachtungen ist P(Rate > r*) ≈ 0,5, ein Exploit
  // braucht also eigene Evidenz statt der Populationsannahme. Hängt die Modellentscheidung gar nicht von der Rate ab (w = 0 oder
  // chartF·(1 − w) ≥ fBe), ist sie nicht durch Beobachtungen belegt (p = 0).
  var pf = fr.pf, to = top.amount || 0, mult = to / Math.max(1, ctx.cur || ctx.bb);
  var out = { key: key, n: raw[1], folds: raw[0], fBe: fBe, fBeRaw: null, mult: mult, fModel: fr.f, mean: null, p: 0, pBelow: 0, k: k, to: to };
  if (!pf || pf.key !== key || !(pf.w > 0) || !pf.g) { out.reason = 'Modell hängt nicht von Beobachtungen ab'; return out; }
  out.chartF = pf.chartF; out.w = pf.w;
  var gT = (fBe - pf.chartF * (1 - pf.w)) / pf.w, rStar = pf.g.mul ? gT / pf.g.mul : gT - pf.g.add;
  if (!(rStar > 0.001)) { out.fBeRaw = 0; out.reason = 'Modellentscheidung unabhängig von der Rate'; return out; }
  if (rStar >= 0.999) { out.fBeRaw = 1; out.p = 0; return out; }
  var a = rStar * k + raw[0], bb = (1 - rStar) * k + (raw[1] - raw[0]);
  out.fBeRaw = rStar; out.mean = a / (a + bb); out.p = 1 - betaCdf(rStar, a, bb); out.pBelow = 1 - out.p;
  out.est = ro.sm && ro.sm[key] != null ? ro.sm[key] : out.mean;  // geglätteter Wert, mit dem das Modell rechnet (Anzeige)
  return out;
}
/** Regularisierte unvollständige Betafunktion I_x(a, b) (Kettenbruch nach Lentz) */
function betaCdf(x, a, b) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  var lbeta = lgamma(a + b) - lgamma(a) - lgamma(b), front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b + lbeta);
  if (x > (a + 1) / (a + b + 2)) return 1 - betaCdf(1 - x, b, a);
  var f = 1, c = 1, d = 0, i, m, num;
  for (i = 0; i <= 300; i++) {
    m = i >> 1;
    num = i === 0 ? 1 : (i % 2 === 0 ? m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m)) : -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1)));
    d = 1 + num * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + num / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    var cd = c * d; f *= cd;
    if (Math.abs(1 - cd) < 1e-12) break;
  }
  return clamp(front * (f - 1) / a, 0, 1);
}
function lgamma(z) {
  // Lanczos-Näherung (g = 7, n = 9)
  var g = 7, cf = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1; var x = cf[0]; for (var i = 1; i < g + 2; i++) x += cf[i] / (z + i);
  var t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
function prevCur(v) {
  var lastRaise = null, prev = 0;
  v.actions.forEach(function (a) { if (a.st === v.street && (a.t === 'bet' || a.t === 'raise')) { prev = lastRaise ? lastRaise.a : 0; lastRaise = a; } });
  return prev;
}
function group(a) { return a.type === 'bet' || a.type === 'raise' ? 'aggr' : a.type; }
function slimParts(p) {
  if (!p) return {};
  var o = {};
  ['realization', 'equity', 'pot', 'potAfter', 'call', 'implied', 'pAllFold', 'pRaise', 'evRaised', 'expectedWin', 'winnable', 'allin', 'add', 'to', 'approx', 'failed', 'reason', 'aborted', 'iters'].forEach(function (k) { if (p[k] != null) o[k] = p[k]; });
  if (p.folds) o.folds = p.folds;
  if (p.branches) o.branches = p.branches.slice(0, 5).map(function (b) { return { callers: b.callers, p: b.p, ev: b.ev, eq: b.eq }; });
  return o;
}
function mainOpponent(v, list) {
  if (!list.length) return null;
  var aggr = -1;
  v.actions.forEach(function (a) { if ((a.t === 'bet' || a.t === 'raise') && a.s !== v.seat) aggr = a.s; });
  return list.filter(function (o) { return o.seat === aggr; })[0] || list[0];
}
function blockersText(v, opp, board) {
  if (!opp || board.length < 5) return null;
  // Anteil der starken gegnerischen Kombinationen (Two Pair oder besser), die durch die eigenen Karten entfernt werden
  var w = R.preflopRange(opp.line, opp.sm, false); R.removeDead(w, board);
  var arr = [0, 0].concat(board), bcat = E.evaluate(board) >> 20, strongAll = 0, strongBlocked = 0;
  for (var k = 0; k < NC; k++) {
    if (!(w[k] > 0)) continue;
    arr[0] = C1[k]; arr[1] = C2[k];
    var cat = E.evaluate(arr) >> 20;
    if (cat >= 2 && cat > bcat) { strongAll += w[k]; if (C1[k] === v.cards[0] || C1[k] === v.cards[1] || C2[k] === v.cards[0] || C2[k] === v.cards[1]) strongBlocked += w[k]; }
  }
  if (!(strongAll > 0)) return null;
  var f = strongBlocked / strongAll;
  return { share: f, text: f >= 0.08 ? 'Deine Karten blockieren etwa ' + pct(f) + ' der starken Kombinationen (Two Pair oder besser) von ' + opp.p.name + '.' : 'Deine Karten blockieren kaum starke Kombinationen von ' + opp.p.name + ' (' + pct(f) + ').' };
}
function riverModel(v, ctx, opp) {
  var heroW = heroRangeFor(v), heroCombo = H.comboIdx(v.cards[0], v.cards[1]);
  var heroOOP = !ctx.ip, sizes = [0.5, 1.0];
  // Nur Knoten, die das Modellspiel abbildet: erster Einsatz der Straße (selbst oder gegen eine Bet); gegen einen Raise kein Modell
  var riverAggr = v.actions.filter(function (a) { return a.st === 3 && (a.t === 'bet' || a.t === 'raise'); });
  if (riverAggr.length > 1) return null;
  var facing = ctx.L.toCall > 0, potStart = Math.max(1, ctx.pot - (facing ? ctx.L.toCall : 0));
  if (facing) { var s = ctx.L.toCall / potStart; sizes = [Math.round(clamp(s, 0.2, 3) * 100) / 100]; }
  // Effektiver Stack in Pot-Anteilen (begrenzt Bets und Raises); Raise-Option für beide Seiten (Prüfung: tests/strategy/cfr-study.js)
  var stack = Math.min(ctx.me.stack + ctx.me.bet, opp.p.stack + opp.p.bet) / potStart;
  var deep = ctx.level === 'tief';
  var sol = PT.cfr.solveRiver({ oopW: heroOOP ? heroW : opp.w, ipW: heroOOP ? opp.w : heroW, board: v.board, sizes: sizes, iters: deep ? 2500 : 700, buckets: deep ? 20 : 10, heroCombo: heroCombo, heroIsOOP: heroOOP, raise: true, stack: stack, deadline: ctx.deadline ? ctx.deadline + (deep ? 3000 : 400) : null });
  if (!sol || sol.heroBucket < 0) return null;
  var b = sol.heroBucket, node, nodeName, sz = sol.tree.sizes;
  if (!facing && heroOOP) nodeName = 'OOP';
  else if (!facing && !heroOOP) nodeName = 'IP nach Check';
  else nodeName = heroOOP ? 'OOP gegen Bet ' + sz[0] : 'IP gegen Bet ' + sz[0];
  node = sol.nodes.filter(function (n) { return n.name === nodeName; })[0];
  if (!node) return null;
  var freqs = node.acts.map(function (a, i) { return { act: actName(a), f: node.s[b][i] }; });
  return { node: nodeName, freqs: freqs, bucket: b + 1, buckets: sol.buckets, exploitability: sol.exploitability, iters: sol.iters, ms: sol.ms, sizes: sz,
    note: 'Vereinfachtes River-Modellspiel (Betgrößen ' + sz.map(function (x) { return Math.round(x * 100) + ' %'; }).join(', ') + ' des Pots, höchstens ein Raise (Pot-Raise), effektiver Stack berücksichtigt, ' + sol.buckets + ' Stärkegruppen, CFR+ mit ' + sol.iters + ' Iterationen). Exploitability im Modellspiel ' + (sol.exploitability * 100).toFixed(2).replace('.', ',') + ' % des Pots; Gleichgewicht nur dieses vereinfachten Spiels, kein No-Limit-Solver.' };
}
function actName(a) { if (a === 'check') return 'Check'; if (a === 'fold') return 'Fold'; if (a === 'call') return 'Call'; if (a.indexOf('raise') === 0) return 'Raise auf ' + Math.round(parseFloat(a.slice(5)) * 100) + ' % Pot'; var s = parseFloat(a.slice(3)); return 'Bet ' + Math.round(s * 100) + ' % Pot'; }
function spotTagsOf(v, ctx, relevant, pre) {
  var t = [], me = ctx.me, bbN = ctx.eff / ctx.bb;
  if (v.street === 0) {
    if (pre.rc === 0 && pre.limpers === 0) t.push('preflop-open');
    if ((me.pos === 'SB' || me.pos === 'BB') && pre.rc === 1) t.push('blind-defense');
    if (pre.rc === 2) { t.push('3bet-pot'); if (pre.opener === v.seat && ctx.L.canRaise) t.push('4bet-pot'); }  // Entscheidung über die 4-Bet
    if (pre.rc >= 3) t.push('4bet-pot');
  } else {
    var rc = 0; v.actions.forEach(function (a) { if (a.st === 0 && (a.t === 'raise' || a.t === 'bet')) rc++; });
    if (rc === 2) t.push('3bet-pot'); if (rc >= 3) t.push('4bet-pot');
    if (ctx.cbetSpot) t.push('cbet');
    var iChecked = v.actions.some(function (a) { return a.st === v.street && a.s === v.seat && a.t === 'check'; });
    if (iChecked && ctx.L.toCall > 0 && ctx.L.canRaise) t.push('check-raise');
    if (relevant.length >= 2) t.push('multiway');
    if (ctx.feat.draw && ctx.feat.draw.strong && v.street < 3) t.push('draws');
    if (v.street === 3 && ctx.L.toCall > 0) t.push('river-call');
    if (v.street === 3 && ctx.L.toCall === 0 && ctx.eqNow < 0.35) t.push('river-bluff');
    if (ctx.L.toCall === 0 && ctx.eqNow >= 0.6) t.push('value-bet');
  }
  if (bbN <= 30) t.push('short-stack'); if (bbN >= 180) t.push('deep-stack');
  if (ctx.L.toCall >= me.stack || v.players.some(function (q) { return !q.folded && q.allIn && q.seat !== v.seat; })) t.push('allin');
  return t;
}
function situationText(v, ctx, relevant, pre) {
  var me = ctx.me, s = [];
  if (v.street === 0) {
    if (pre.rc === 0 && pre.limpers === 0) s.push('Ungeöffneter Pot, du bist im ' + me.pos);
    else if (pre.rc === 0) s.push(pre.limpers + ' Limper vor dir, du bist im ' + me.pos);
    else if (pre.rc === 1) s.push('Open-Raise von ' + v.players[pre.opener].name + ' (' + v.players[pre.opener].pos + ') auf ' + fmt(pre.lastTo) + (pre.callers ? ', ' + pre.callers + ' Caller' : '') + ', du bist im ' + me.pos);
    else if (pre.rc === 2) s.push('3-Bet auf ' + fmt(pre.lastTo) + ' von ' + v.players[pre.lastRaiser].name + ', du bist im ' + me.pos);
    else s.push((pre.rc + 1) + '-Bet-Pot, letzter Raise auf ' + fmt(pre.lastTo) + ' von ' + v.players[pre.lastRaiser].name);
  } else {
    s.push(PT.rules.STREET_NAME[v.street] + ', ' + (relevant.length + 1) + ' Spieler, du bist ' + (ctx.ip ? 'in Position' : 'out of Position'));
    if (ctx.L.toCall > 0) s.push('Einsatz offen: ' + fmt(ctx.L.toCall));
  }
  s.push('effektiver Stack ' + U.fmtBB(ctx.eff, ctx.bb) + (v.street > 0 ? ', SPR ' + ctx.spr.toFixed(1).replace('.', ',') : ''));
  return s.join(' · ');
}
function modeDiffText(ex, gt) {
  if (group({ type: ex.best }) === group({ type: gt.best }) && Math.abs((ex.bestAmount || 0) - (gt.bestAmount || 0)) < 1) return null;
  var reasons = [];
  var oE = ex.opponents, oG = gt.opponents;
  oE.forEach(function (o, i) {
    var g = oG[i]; if (!g || o.pending) return;
    if (Math.abs(o.width - g.width) > 0.03) reasons.push('Die Range von ' + o.name + ' ist laut Datenbank ' + (o.width > g.width ? 'weiter' : 'enger') + ' als im Grundmodell (' + pct(o.width) + ' statt ' + pct(g.width) + ' aller Kombinationen).');
    if (o.sm.foldToCbet != null && Math.abs(o.sm.foldToCbet - R.PRIOR.foldToCbet) > 0.08 && o.hands >= 30) reasons.push(o.name + ' foldet gegen C-Bets ' + (o.sm.foldToCbet > R.PRIOR.foldToCbet ? 'häufiger' : 'seltener') + ' als üblich (' + pct(o.sm.foldToCbet) + ').');
    if (Math.abs(o.sm.wtsd - R.PRIOR.wtsd) > 0.06 && o.hands >= 30) reasons.push(o.name + ' geht ' + (o.sm.wtsd > R.PRIOR.wtsd ? 'häufiger' : 'seltener') + ' zum Showdown (WTSD ' + pct(o.sm.wtsd) + ').');
  });
  return { exploit: ex.bestLabel, gto: gt.bestLabel, reasons: reasons.slice(0, 3),
    text: 'Exploitativ: ' + ex.bestLabel + ' · Gleichgewichtsnah: ' + gt.bestLabel + '. ' + (ex.mainOppHands > 0
      ? 'Der Unterschied entsteht, weil der exploitative Modus beobachtete Gegnerwerte nutzt (' + ex.mainOppHands + ' Hände), der gleichgewichtsnahe ein ausgewogenes Gegnermodell (MDF, Faustregel-Charts).'
      : 'Für diesen Gegner liegen noch keine Hände vor. Der Unterschied entsteht nur durch die Modellannahmen: exploitativ mit typischen Reaktionen der Gegnerpopulation, gleichgewichtsnah mit MDF und Faustregel-Charts.') };
}
function learnerHint(out, learner) {
  if (!learner || !learner.cats) return null;
  var tags = out.spotTags || [], worst = null;
  tags.forEach(function (t) { var c = learner.spots && learner.spots[t]; if (c && c.n >= 6 && c.score < 62 && (!worst || c.score < worst.score)) worst = { tag: t, score: c.score, n: c.n }; });
  if (!worst) return null;
  return 'Achtung: In „' + SPOTS[worst.tag] + '“ liegt deine Entscheidungsqualität bisher bei ' + Math.round(worst.score) + ' von 100 (' + worst.n + ' Entscheidungen). Nimm dir hier etwas mehr Zeit.';
}

// ---------- Erklärungen ----------
function bbTxt(x, bb) { return U.fmtBB(x, bb, Math.abs(x / bb) >= 10 ? 0 : 1); }
function explain(a, depth) {
  var bb = a.bb, best = a.actions[0], eq = a.equity, po = a.potOdds, lines = { einsteiger: [], fortgeschritten: [], experte: [] };
  var actWord = best.label;
  // Kernsatz
  var core;
  if (a.unopened) po = null;
  if (best.type === 'fold') {
    if (po && eq.eq < po.need) core = 'Fold: Du müsstest ' + fmt(po.call) + ' zahlen und bräuchtest dafür mindestens ' + pct(po.need) + ' Gewinnchance. Geschätzt hast du nur etwa ' + pct(eq.eq) + '.';
    else if (po) core = 'Fold: Die rohe Equity (' + pct(eq.eq) + ') liegt zwar über den benötigten ' + pct(po.need) + ', ' + (a.street < 3 && !(a.actions[0].parts || {}).allin ? 'aber ' + (a.ip ? '' : 'außer Position ') + 'realisierst du davon auf den späteren Straßen nur einen Teil, und weitere Einsätze drohen.' : 'aber gegen die wahrscheinliche Range des Gegners verlierst du zu oft.');
    else if (a.street === 0 && a.chart && a.chart.exploit && a.chart.exploit.dir === 'enger') core = 'Fold: ' + a.hand.cls + ' ist laut ' + a.chart.kind + ' spielbar, aber dieser Gegner foldet nach den Beobachtungen zu selten, als dass sich der Raise lohnt.';
    else if (a.street === 0 && a.chart) core = 'Fold: ' + a.hand.cls + ' gehört laut ' + a.chart.kind + ' nicht zu den spielbaren Händen' + (a.chart.raise > 0 || a.chart.call > 0 ? ' (nur ' + pct(a.chart.raise + a.chart.call) + ' Spielanteil)' : '') + '.';
    else core = 'Fold.';
  }
  else if (best.type === 'call' && !po) core = 'Call: Du zahlst ' + fmt(a.callAmt) + ' und siehst den Flop günstig (Equity etwa ' + pct(eq.eq) + ').';
  else if (best.type === 'call') core = 'Call: Du zahlst ' + fmt(po ? po.call : a.callAmt) + ' und brauchst mindestens ' + pct(po ? po.need : 0) + ' Gewinnchance. Geschätzt hast du etwa ' + pct(eq.eq) + (best.parts && best.parts.implied > 0 ? ', dazu kommen implizite Odds durch deinen Draw.' : '.');
  else if (best.type === 'check') core = 'Check: Eine Bet bringt hier geschätzt nicht mehr als ein Check (Equity etwa ' + pct(eq.eq) + ').';
  else {
    var p = best.parts || {}, value = eq.eq >= 0.55;
    core = actWord + ': ' + (value ? 'Mit etwa ' + pct(eq.eq) + ' Equity holst du Value von schwächeren Händen.' : 'Die Bet gewinnt den Pot geschätzt in etwa ' + pct(p.pAllFold || 0) + ' der Fälle sofort' + (a.hand.draw && a.hand.draw.strong ? ', und dein Draw hat Rückhalt.' : '.'));
  }
  if (a.mix) core += ' Im Gleichgewicht sind ' + a.mix.passive + ' und ' + a.mix.bluff + ' (Bluff) etwa gleich viel wert; eine Einzelhand-Empfehlung kann diese Mischung nicht abbilden, ' + a.mix.passive + ' ist die risikoärmere Wahl.';
  if (a.street === 0 && a.chart && a.chart.applied) core += ' Preflop folgt der Coach hier dem Faustregel-Chart (' + a.chart.kind + '); das vereinfachte EV-Modell sähe ' + a.chart.modelBest + ' um ' + bbTxt(a.chart.modelGap, bb) + ' vorn, aber nur wegen Fold-Annahmen, die nicht durch Gegnerwerte belegt sind.';
  else if (a.street === 0 && a.chart && a.chart.exploit) core += ' Das weicht vom Faustregel-Chart ab: Nach ' + a.chart.exploit.obs + ' beobachteten Situationen liegt die geschätzte Fold-Rate dieses Gegners bei ' + pct(a.chart.exploit.post) + '; mit ' + pct(a.chart.exploit.p) + ' Wahrscheinlichkeit ' + (a.chart.exploit.dir === 'enger' ? 'unter' : 'über') + ' der Break-even-Rate von ' + pct(a.chart.exploit.fBeRaw != null ? a.chart.exploit.fBeRaw : a.chart.exploit.fBe) + ' (auf die Größe dieses Raises und die Gewichtung im Modell umgerechnet).';
  lines.einsteiger.push(core);
  if (a.street === 0 && a.actions.length) lines.einsteiger.push(a.hand.top <= 0.4 ? a.hand.cls + ' gehört zu den besten ' + (a.hand.top < 0.01 ? '1' : Math.round(a.hand.top * 100)) + ' % aller Starthände.' : a.hand.cls + ' liegt auf Rang ' + (H.CLS_RANK[H.nameToIdx(a.hand.cls)] + 1) + ' von 169 Starthandklassen.');
  // Fortgeschritten
  var f = lines.fortgeschritten;
  f.push(core);
  f.push('Situation: ' + a.situation + '.');
  if (a.street > 0) f.push('Deine Hand: ' + a.hand.desc + (a.hand.outs ? ' · ' + a.hand.outs + ' Outs (' + a.hand.cleanOuts + ' saubere)' : '') + '. Board: ' + (a.board.labels.join(', ') || '–') + '.');
  a.opponents.filter(function (o) { return !o.pending; }).slice(0, 3).forEach(function (o) {
    var c = o.comp, t = c.total || 1;
    f.push(o.name + ' (' + o.pos + ', ' + o.line + ', ' + o.hands + ' Hände, ' + o.bel + (o.typ !== 'unbekannt' ? ', ' + o.typ : '') + '): geschätzt ' + Math.round(o.combos) + ' Kombinationen' +
      (a.street > 0 ? ' – stark ' + pct(c.strong / t) + ', Top Pair ' + pct(c.good / t) + ', mittel ' + pct(c.medium / t) + ', Draws ' + pct(c.draw / t) + ', schwach ' + pct(c.air / t) : ' – Premium ' + pct(c.strong / t) + ', stark ' + pct(c.good / t)) + '.');
  });
  if (po) f.push('Pot Odds: ' + fmt(po.call) + ' für einen gewinnbaren Pot von ' + fmt(po.winnable) + ' → benötigte Equity ' + pct(po.need) + (po.capped ? ' (dein All-in ist kleiner als der Einsatz; nur der erreichbare Teil des Pots zählt).' : '.'));
  if (a.alternatives.length) f.push('Ebenfalls vertretbar: ' + a.alternatives.map(function (x) { return x.label + ' (' + bbTxt(x.ev - best.ev, bb) + ')'; }).join(', ') + '.');
  f.push(a.classText + '.' + (a.sizeNote ? ' ' + a.sizeNote : ''));
  if (a.learnerHint) f.push(a.learnerHint);
  // Experte
  var x = lines.experte;
  x.push(core);
  x.push('EV-Schätzung je Aktion (relativ zum Fold): ' + a.actions.slice(0, 6).map(function (y) { return y.label + ' ' + bbTxt(y.ev, bb) + ' ± ' + bbTxt(y.u, bb); }).join(' · ') + '.');
  x.push('Equity ' + pct(eq.eq, 1) + ' (' + eq.method + (eq.se ? ', 95-%-Intervall ' + pct(eq.lo, 1) + '–' + pct(eq.hi, 1) : '') + ')' + (eq.rangeLo != null ? '; je nach Range-Annahme ' + pct(eq.rangeLo) + '–' + pct(eq.rangeHi) : '') + '.');
  x.push('Unsicherheit der Empfehlung: Simulation ± ' + bbTxt(best.uSim, bb) + ', Modell (Range und Reaktionen) ± ' + bbTxt(best.uModel, bb) + '.');
  if (best.parts && best.parts.folds) x.push('Angenommene Reaktionen: ' + best.parts.folds.map(function (r) { return r.name + ' Fold ' + pct(r.f) + ' / Call ' + pct(r.c) + ' / Raise ' + pct(r.r) + ' (' + r.basis + ')'; }).join('; ') + '.');
  if (best.parts && best.parts.realization) x.push('Equity Realization (Modellannahme): ' + best.parts.realization.toFixed(2).replace('.', ',') + '.');
  if (a.blockers) x.push(a.blockers.text);
  if (a.model) x.push('Modellspiel: ' + a.model.freqs.map(function (q) { return q.act + ' ' + pct(q.f); }).join(', ') + ' für deine Stärkegruppe ' + a.model.bucket + '/' + a.model.buckets + '. ' + a.model.note);
  if (a.modeDiff) x.push(a.modeDiff.text + (a.modeDiff.reasons.length ? ' ' + a.modeDiff.reasons.join(' ') : ''));
  x.push('Annahmen: Ranges aus Faustregel-Charts und Bayes-Aktualisierung nach den Aktionen; Gegnerwerte geglättet (Beta-Prior); Multiway-Equity per Produktnäherung kalibriert; spätere Straßen über Equity Realization genähert.');
  return { einsteiger: lines.einsteiger.join(' '), fortgeschritten: lines.fortgeschritten.join(' '), experte: lines.experte.join(' '), speech: core };
}

// ---------- Bewertung der gewählten Aktion ----------
/**
 * a: Analyse (mit EV der gewählten Größe, ggf. über input.extra nachgerechnet), chosen: {type, amount}
 * Nur Informationen zum Entscheidungszeitpunkt fließen ein, nie das Ergebnis der Hand.
 */
function grade(a, chosen) {
  var bb = a.bb, t = chosen.type === 'allin' ? (a.actions.some(function (x) { return x.allin; }) ? 'raise' : 'call') : chosen.type;
  var pick = null;
  if (t === 'bet' || t === 'raise' || chosen.type === 'allin') {
    var amt = chosen.amount;
    pick = a.actions.filter(function (x) { return (x.type === 'bet' || x.type === 'raise') && (chosen.type === 'allin' ? x.allin : x.amount === amt); })[0];
    if (!pick) {
      // Interpolation zwischen bewerteten Größen (nur falls keine Nachrechnung vorliegt)
      var ag = a.actions.filter(function (x) { return x.type === 'bet' || x.type === 'raise'; }).sort(function (p, q) { return p.amount - q.amount; });
      if (ag.length) {
        var lo = ag[0], hi = ag[ag.length - 1];
        for (var i = 0; i < ag.length - 1; i++) if (ag[i].amount <= amt && ag[i + 1].amount >= amt) { lo = ag[i]; hi = ag[i + 1]; }
        var fr = hi.amount === lo.amount ? 0 : clamp((amt - lo.amount) / (hi.amount - lo.amount), 0, 1), evI = lo.ev + fr * (hi.ev - lo.ev);
        // Prüfer B, Befund 2: oberhalb der größten bewerteten Größe nicht konstant fortschreiben, sondern mit der Steigung des letzten
        // Abschnitts, soweit sie fällt (konservativ: steigende EV-Kurven werden nicht über den letzten Wert hinaus verlängert)
        if (amt > hi.amount && ag.length >= 2) { var p2 = ag[ag.length - 2], sl = (hi.ev - p2.ev) / Math.max(1, hi.amount - p2.amount); evI = hi.ev + Math.min(0, sl) * (amt - hi.amount); }
        // Interpolationsfehler (gemessen gegen Nachrechnung, docs/STRATEGIE.md): im Mittel 15 %, im 90. Perzentil 30 % des EV-Abstands der
        // benachbarten Größen. Die Unsicherheit wird um 35 % dieses Abstands erweitert; außerhalb der bewerteten Größen um den vollen Abstand.
        var span = Math.abs(hi.ev - lo.ev), outside = amt < ag[0].amount || amt > ag[ag.length - 1].amount, iErr = outside ? Math.max(span, 0.5 * bb) : 0.35 * span;
        var uI = Math.max(lo.u, hi.u);
        pick = { type: t, amount: amt, ev: evI, u: Math.sqrt(uI * uI + iErr * iErr), label: (t === 'bet' ? 'Bet ' : 'Raise auf ') + fmt(amt), interpolated: true, interpErr: iErr, extrapolated: amt > ag[ag.length - 1].amount };
      }
    }
  } else pick = a.actions.filter(function (x) { return x.type === t; })[0];
  if (!pick) return { grade: 'Fehler', simple: 'Fehler', score: 20, loss: null, text: 'Diese Aktion wurde nicht bewertet.' };
  var best = a.actions[0], loss = Math.max(0, best.ev - pick.ev), u = Math.max(best.u, pick.u || 0), pot = Math.max(a.pot, bb);
  // Prüfer B, Befund 2: Die Unsicherheit darf große Verluste nicht neutralisieren. Für die Toleranzstufen zählt sie höchstens bis ¼ Pot;
  // damit bleibt jeder Verlust über 0,375 Pot (und über 0,75 BB) unter „Vertretbar“, über 0,4 Pot (und 4 BB) „Schwerer Fehler“.
  var uG = Math.min(u, Math.max(0.5 * bb, 0.25 * pot));
  // Höchster Modell-EV (kann preflop vom Chart-Anker abweichen); die Bewertung misst gegen die Empfehlung, meldet den Abstand aber mit
  var top = a.actions.reduce(function (m, x) { return x.ev > m.ev ? x : m; }, best), recGap = Math.max(0, top.ev - best.ev);
  var g;
  if (pick === best || loss <= 0.02 * bb) g = 'Optimal';
  else if (loss <= Math.max(0.1 * bb, 0.5 * uG)) g = 'Sehr gut';
  else if (loss <= Math.max(0.3 * bb, 1.0 * uG)) g = 'Gut';
  else if (loss <= Math.max(0.75 * bb, 1.5 * uG)) g = 'Vertretbar';
  else if (loss <= Math.max(1.5 * bb, 0.15 * pot)) g = 'Ungenau';
  else if (loss <= Math.max(4 * bb, 0.4 * pot)) g = 'Fehler';
  else g = 'Schwerer Fehler';
  var chartCap = null;
  if (a.street === 0 && a.chart && group(pick) !== group(best)) {
    var wp = chartWeight(a.chart, pick, a.unopened);
    if (wp < CHART_MIN) { var capG = wp < 0.03 ? 'Ungenau' : 'Vertretbar'; if (GRADE_SCORE[g] > GRADE_SCORE[capG]) { g = capG; chartCap = { w: wp }; } }
  }
  var extrap = null;
  if (pick.extrapolated && GRADE_SCORE[g] > GRADE_SCORE.Gut) { g = 'Gut'; extrap = true; }
  var cats = GRADE_SCORE[g] <= 45 ? mistakeCats(a, pick, best) : [];
  var text = chartCap ? chartCapText(a, pick, best, loss) : gradeText(g, a, pick, best, loss);
  if (extrap) text = 'Empfohlen war ' + best.label + '. ' + pick.label + ' liegt über allen bewerteten Größen; das Modell rechnet dort nur hochgerechnet' + (pick.ev > best.ev ? ' (' + bbTxt(pick.ev - best.ev, bb) + ' mehr)' : '') + ', die Reaktionen der Gegner auf so große Einsätze sind nicht kalibriert.';
  var tied = a.actions.some(function (x) { return x !== pick && group(x) !== group(pick) && Math.abs(pick.ev - x.ev) <= Math.max(0.1 * bb, Math.max(pick.u || 0, x.u || 0)); });
  return { grade: g, simple: GRADE_SIMPLE[g], score: GRADE_SCORE[g], loss: loss, lossBB: loss / bb, u: u, chosenLabel: pick.label, bestLabel: best.label, text: text, cats: cats, interpolated: !!pick.interpolated, tied: tied,
    modelTopLabel: top.label, recGapBB: recGap / bb, withinU: loss <= uG, uGrade: uG, extrapolated: !!pick.extrapolated };
}
function chartCapText(a, pick, best, loss) {
  var bb = a.bb, aggr = group(pick) === 'aggr', fold = group(pick) === 'fold';
  var s = 'Empfohlen war ' + best.label + '. ' + (aggr ? 'Ein Raise' : fold ? 'Ein Fold' : 'Ein Limp') + ' mit ' + a.hand.cls + ' liegt außerhalb des Faustregel-Charts (' + a.chart.kind + ')' +
    (fold ? ': Der Chart spielt die Hand zu ' + Math.round(100 * (1 - a.chart.fold)) + ' %.' : '.');
  if (fold) { if (pick.ev > best.ev) s += ' Das vereinfachte Modell sieht den Fold zwar ' + bbTxt(pick.ev - best.ev, bb) + ' vorn, der Coach folgt hier aber dem Chart.'; return s; }
  if (pick.ev > best.ev) s += ' Das vereinfachte Modell rechnet zwar mit ' + bbTxt(pick.ev - best.ev, bb) + ' mehr, die dafür nötigen Folds sind aber nicht durch Gegnerwerte belegt.';
  else if (loss > 0) s += ' Geschätzter Verlust ' + bbTxt(loss, bb) + '.';
  return s;
}
function gradeText(g, a, pick, best, loss) {
  var bb = a.bb;
  if (g === 'Optimal') {
    // Nicht „eindeutig optimal“ nennen, wenn Alternativen innerhalb der Unsicherheit liegen (Auftrag 2.1, Abschnitt 10)
    var near = a.actions.filter(function (x) { return x !== pick && group(x) !== group(pick) && Math.abs(pick.ev - x.ev) <= Math.max(0.1 * bb, Math.max(pick.u || 0, x.u || 0)); });
    if (near.length) return 'Deine Aktion liegt nach dem Modell vorn, aber ' + near.slice(0, 2).map(function (x) { return x.label; }).join(' und ') + (near.length > 1 ? ' liegen' : ' liegt') + ' im Rahmen der Unsicherheit gleichauf. ' + a.text.speech;
    if (a.chart && a.chart.applied && pick === best) return 'Deine Aktion folgt dem Faustregel-Chart (' + a.chart.kind + '). ' + a.text.speech;
    return 'Deine Aktion ist die beste nach dem Modell. ' + a.text.speech;
  }
  var s = 'Empfohlen war ' + best.label + '. Deine Aktion (' + pick.label + ') kostet geschätzt ' + bbTxt(loss, bb) + ' gegenüber der besten Aktion';
  var uu = Math.max(best.u, pick.u || 0);
  if (GRADE_SCORE[g] >= 65) s += loss <= uu && uu >= 0.05 * bb ? ', das liegt im Rahmen der Unsicherheit (± ' + bbTxt(uu, bb) + ').' : ', ein kleiner Unterschied.';
  else s += '. ' + whyWorse(a, pick, best);
  return s;
}
function whyWorse(a, pick, best) {
  var eq = a.equity.eq, po = a.potOdds;
  if (pick.type === 'fold' && po) {
    if (eq >= po.need) return 'Mit etwa ' + pct(eq) + ' Equity bei benötigten ' + pct(po.need) + ' war der Fold zu vorsichtig.';
    if (best.type === 'bet' || best.type === 'raise') return 'Die Equity allein (' + pct(eq) + ' bei benötigten ' + pct(po.need) + ') reicht nicht für einen Call, aber ein Raise gewinnt laut Modell oft sofort den Pot.';
    return 'Die Equity (' + pct(eq) + ') liegt knapp unter den benötigten ' + pct(po.need) + ', doch spätere Gewinne mit deinem Draw (implizite Odds) machen den Call laut Modell lohnend.';
  }
  if (pick.type === 'call' && po && best.type === 'fold') return 'Der Call ist zu teuer: benötigt ' + pct(po.need) + ', geschätzt vorhanden ' + pct(eq) + '.';
  if ((pick.type === 'call' || pick.type === 'check') && (best.type === 'bet' || best.type === 'raise')) return eq >= 0.55 ? 'Mit dieser Equity verschenkst du Value; eine Bet oder ein Raise bringt mehr.' : 'Ein Bluff oder Semi-Bluff hätte hier oft den Pot gewonnen.';
  if ((pick.type === 'bet' || pick.type === 'raise') && (best.type === 'bet' || best.type === 'raise')) return 'Die Aktion stimmt, aber die Größe ist ungünstig; besser ' + best.label + '.';
  if ((pick.type === 'bet' || pick.type === 'raise')) return 'Die Bet hat zu wenig Rückhalt: Der Gegner foldet laut Modell zu selten, und du hast nur etwa ' + pct(eq) + ' Equity.';
  return '';
}
function mistakeCats(a, pick, best) {
  var c = [], pt = pick.type, bt = best.type, aggrP = pt === 'bet' || pt === 'raise', aggrB = bt === 'bet' || bt === 'raise';
  if (a.street === 0) {
    if ((pt === 'call' || aggrP) && bt === 'fold') { c.push('zu-viele-starthaende'); if (a.heroPos === 'UTG' || a.heroPos === 'HJ' || !a.ip) c.push('position'); }
    if (pt === 'fold' && bt !== 'fold') c.push('zu-viel-fold');
  } else {
    if (pt === 'call' && bt === 'fold') { c.push('zu-viel-call'); if (a.potOdds) c.push('pot-odds'); }
    if (pt === 'fold' && (bt === 'call' || aggrB)) { c.push(a.potOdds ? 'pot-odds' : 'zu-viel-fold'); }
    if ((pt === 'call' || pt === 'check') && aggrB && a.equity.eq >= 0.55) c.push('zu-passiv');
    if (aggrP && !aggrB && a.equity.eq < 0.45) c.push('zu-viel-bluff');
    if (aggrP && !aggrB && a.equity.eq >= 0.45 && a.hand.cat <= 1) c.push('mittelstark');
    if (a.hand.draw && a.hand.draw.strong && a.street < 3 && (pt === 'fold' || (aggrB && !aggrP) || (aggrP && !aggrB))) c.push('draw');
  }
  if (aggrP && aggrB) c.push('betgroesse');
  // Gegnertyp nur, wenn die Empfehlung gerade wegen der Gegnerwerte von der gleichgewichtsnahen abweicht
  var mo = a.opponents.filter(function (o) { return o.name === a.mainOpp; })[0];
  if (a.mode === 'exploit' && mo && mo.typ && mo.typ !== 'unbekannt' && a.otherMode && group({ type: a.otherMode.best }) !== group(best) && group({ type: a.otherMode.best }) === group(pick)) c.push('gegnertyp');
  return c.filter(function (x, i) { return c.indexOf(x) === i; });
}

// ---------- Glossar ----------
var GLOSSARY = {
  'Equity': 'Dein Anteil am Pot, wenn alle Karten ohne weitere Einsätze ausgeteilt würden – also deine Gewinnchance einschließlich halber Split Pots.',
  'Pot Odds': 'Verhältnis aus dem Betrag, den du callen musst, und dem Pot, den du dann gewinnen kannst. Daraus ergibt sich die benötigte Equity: Call / (Pot + Call).',
  'Break-even Equity': 'Die Equity, ab der ein Call oder Bluff mindestens null EV hat.',
  'EV': 'Expected Value, Erwartungswert: durchschnittlicher Gewinn oder Verlust einer Aktion, wenn man sie sehr oft wiederholen würde.',
  'Fold Equity': 'Der Teil des Werts einer Bet, der daraus entsteht, dass der Gegner foldet.',
  'Implied Odds': 'Zusätzliche Chips, die du auf späteren Straßen gewinnen kannst, wenn deine Hand sich verbessert.',
  'Reverse Implied Odds': 'Zusätzliche Verluste auf späteren Straßen, wenn du mit einer zweitbesten Hand weiterspielst.',
  'Equity Realization': 'Welchen Anteil seiner rohen Equity ein Spieler tatsächlich gewinnt. In Position und mit starken Händen meist mehr, ohne Position und mit schwachen Draws weniger. In dieser App eine gekennzeichnete Modellannahme.',
  'SPR': 'Stack-to-Pot Ratio: effektiver Stack geteilt durch den Pot. Niedrige Werte bedeuten, dass der Stack schnell im Pot ist.',
  'Effektiver Stack': 'Der kleinere der beiden Stacks zwischen dir und einem Gegner; nur so viel kann maximal gewonnen oder verloren werden.',
  'MDF': 'Minimum Defense Frequency: Pot / (Pot + Bet). So oft muss ein Spieler weitermachen, damit ein Bluff mit beliebigen Karten nicht automatisch Gewinn bringt.',
  'Range': 'Alle Hände, die ein Spieler in einer Situation haben kann, gewichtet nach Wahrscheinlichkeit.',
  'Kombinationen': 'Konkrete Kartenpaare. Ein Paar hat 6 Kombinationen, eine suited Hand 4, eine offsuit Hand 12 – abzüglich bereits sichtbarer Karten.',
  'Blocker': 'Eine eigene Karte, die bestimmte Hände des Gegners unmöglich oder seltener macht.',
  'C-Bet': 'Continuation Bet: Der Preflop-Aggressor setzt auf dem Flop weiter.',
  '3-Bet': 'Der erste Re-Raise gegen einen Raise (Open-Raise = 2. Bet, Re-Raise = 3. Bet).',
  '4-Bet': 'Re-Raise gegen eine 3-Bet.',
  'Squeeze': '3-Bet nach einem Raise und mindestens einem Call.',
  'Float': 'Call in Position mit schwacher Hand, um auf einer späteren Straße zu setzen, wenn der Gegner checkt.',
  'Check-Raise': 'Erst checken, dann gegen eine Bet erhöhen.',
  'Overbet': 'Bet größer als der Pot.',
  'Value Bet': 'Bet mit einer Hand, die meist besser ist als die Hände, die callen.',
  'Bluff': 'Bet mit einer Hand, die meist schlechter ist, in der Hoffnung, dass der Gegner foldet.',
  'Semi-Bluff': 'Bluff mit einem Draw, der sich noch verbessern kann.',
  'Slowplay': 'Eine sehr starke Hand passiv spielen, um den Gegner im Pot zu halten.',
  'Pot Control': 'Den Pot mit einer mittelstarken Hand klein halten.',
  'Outs': 'Karten, die deine Hand voraussichtlich zur besten Hand machen. Saubere Outs helfen dem Gegner nicht gleichzeitig.',
  'Showdown Value': 'Wert einer Hand, die ohne weitere Einsätze am Showdown oft gewinnt.',
  'Range Advantage': 'Die Range eines Spielers hat auf diesem Board insgesamt mehr Equity als die des Gegners.',
  'Nut Advantage': 'Ein Spieler hat auf diesem Board mehr sehr starke Kombinationen als der Gegner.',
  'Polarisiert': 'Range aus sehr starken Händen und Bluffs, kaum mittlere Hände.',
  'VPIP': 'Voluntarily Put Money In Pot: Anteil der Hände, in denen ein Spieler preflop freiwillig Geld investiert.',
  'PFR': 'Preflop Raise: Anteil der Hände mit einem Preflop-Raise.',
  'AF': 'Aggression Factor: (Bets + Raises) / Calls nach dem Flop.',
  'AFq': 'Aggression Frequency: Anteil von Bet und Raise an allen Postflop-Aktionen außer Check.',
  'WTSD': 'Went to Showdown: Anteil der gesehenen Flops, die bis zum Showdown gehen.',
  'W$SD': 'Won Money at Showdown: Anteil der Showdowns mit Gewinn.',
  'ATS': 'Attempt to Steal: Open-Raise aus Cutoff, Button oder Small Blind, wenn alle davor gefoldet haben.',
  'Side Pot': 'Nebentopf, der entsteht, wenn ein Spieler All-in ist und andere weiter setzen. Der All-in-Spieler kann nur den Teil gewinnen, zu dem er beigetragen hat.',
  'Split Pot': 'Gleich starke Hände teilen den Pot.',
  'Odd Chip': 'Bei einem nicht teilbaren Split Pot erhält der erste Gewinner links vom Button den übrigen Chip.',
  'Unvollständiger Raise': 'Ein All-in, das kleiner als ein voller Mindest-Raise ist. Es eröffnet die Setzrunde für Spieler, die schon gehandelt haben, nicht wieder.',
  'GTO': 'Game Theory Optimal: Strategie eines Gleichgewichts. Diese App berechnet nur vereinfachte Modellspiele, keine vollständige GTO-Lösung.',
  'Exploitativ': 'Strategie, die beobachtete Schwächen eines Gegners gezielt ausnutzt.',
  'CFR': 'Counterfactual Regret Minimization: Verfahren, das sich iterativ einem Gleichgewicht annähert. Hier als CFR+ für ein vereinfachtes River-Spiel.',
  'Exploitability': 'Wie viel ein perfekt angepasster Gegner gegen eine Strategie gewinnen könnte. 0 bedeutet Gleichgewicht des Modellspiels.',
  'Monte Carlo': 'Schätzung durch viele zufällige Durchläufe. Die Genauigkeit wird als Standardfehler und Konfidenzintervall angegeben.',
  'Konfidenzintervall': 'Bereich, in dem der wahre Wert mit 95 % Sicherheit liegt – hier nur für die Simulationsunsicherheit, nicht für die Range-Annahmen.',
  'Bayes': 'Aktualisierung von Wahrscheinlichkeiten nach neuen Beobachtungen; hier: Gewichte der gegnerischen Kombinationen nach jeder Aktion.',
  'Rake': 'Gebühr des Veranstalters, die vom Pot abgezogen wird. In dieser App optional und standardmäßig aus.'
};

PT.coach = { betaCdf: betaCdf, analyze: analyze, grade: grade, explain: explain, GRADES: GRADES, GRADE_SCORE: GRADE_SCORE, GRADE_SIMPLE: GRADE_SIMPLE, CLASS_TEXT: CLASS_TEXT,
  MISTAKES: MISTAKES, SPOTS: SPOTS, GLOSSARY: GLOSSARY, lineOf: lineOf, preInfo: preInfo, LINE_TEXT: LINE_TEXT, composition: composition,
  _intern: { heroRangeFor: heroRangeFor, buildRange: buildRange, oppStats: oppStats } };  // _intern: nur für Tests und Studien
PT.glossary = GLOSSARY;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
