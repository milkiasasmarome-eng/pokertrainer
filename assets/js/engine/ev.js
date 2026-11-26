/* PokerTrainer 2.0 – EV-Engine.
   Schätzt Erwartungswerte aller legalen Aktionen (Fold, Check, Call, mehrere Bet-/Raise-Größen, All-in)
   relativ zum sofortigen Fold. Methode: Equity je gegnerischer Kombination (exakt, sonst simuliert),
   Reaktionsmodelle je Gegner (Fold/Call/Raise mit Wahrscheinlichkeiten, Multiway über Teilmengen),
   Side-Pot-Berechtigung, Equity Realization für spätere Straßen. Alle Ergebnisse sind Modellschätzungen. */
(function (G) {
'use strict';
var PT = G.PT, H = PT.hands, E = PT.eval, R = PT.ranges, Q = PT.equity, U = PT.util, clamp = U.clamp;
var NC = H.NC, C1 = H.C1, C2 = H.C2, CLS = H.CLS, evaluate = E.evaluate;

// ---------- Preflop-Tabelle (169 × 169, Klasse gegen Klasse) ----------
var PF = null;
function pfTable() {
  if (PF) return PF;
  if (!PT.preflopData) return null;
  var raw = PT.preflopData, bin = typeof atob === 'function' ? atob(raw) : Buffer.from(raw, 'base64').toString('binary');
  var n = bin.length / 2, t = new Float32Array(169 * 169);
  for (var i = 0, k = 0; i < 169; i++) for (var j = i; j < 169; j++, k++) {
    var v = (bin.charCodeAt(2 * k) | (bin.charCodeAt(2 * k + 1) << 8)) / 65535;
    t[i * 169 + j] = v; t[j * 169 + i] = 1 - v;
  }
  void n;
  PF = t; return PF;
}
function eqClass(i, j) { var t = pfTable(); return t ? t[i * 169 + j] : 0.5; }

// ---------- Equity je gegnerischer Kombination ----------
/**
 * Liefert e[k] = Equity des Helden gegen Kombination k (nur für k mit w[k] > 0 sinnvoll).
 * Exakt auf River und Turn, auf dem Flop exakt bis zum Auswertungslimit, sonst wenige zufällige Runouts je Kombination
 * (zählen gegen das Simulationsbudget). Preflop aus der Klassentabelle.
 */
var ceCache = new Map();
function comboEquities(hero, board, w, o) {
  o = o || {};
  var ck = PT.cardsStr(hero) + '|' + PT.cardsStr(board) + '|' + PT.cardsStr(o.dead || []) + '|' + R.hash(w) + '|' + (o.exactMax || 0);
  if (ceCache.has(ck)) { var hit = ceCache.get(ck); return { e: hit.e, info: Object.assign({}, hit.info, { cached: true, iters: 0 }) }; }
  var res = comboEquitiesRaw(hero, board, w, o);
  ceCache.set(ck, res); if (ceCache.size > 60) ceCache.delete(ceCache.keys().next().value);
  return res;
}
function comboEquitiesRaw(hero, board, w, o) {
  var e = new Float32Array(NC), dead = H.deadMaskOf(hero.concat(board).concat(o.dead || [])), ks = [], k;
  for (k = 0; k < NC; k++) if (w[k] > 0 && !dead[C1[k]] && !dead[C2[k]]) ks.push(k);
  var info = { method: 'exakt', evals: 0, iters: 0, n: ks.length, se: 0 };
  if (!ks.length) return { e: e, info: info };
  if (board.length === 0) {
    var hc = H.classIdx(hero[0], hero[1]);
    for (var t = 0; t < ks.length; t++) e[ks[t]] = eqClass(hc, CLS[ks[t]]);
    info.method = 'Tabelle'; info.se = 0.005; return { e: e, info: info };
  }
  var rest = [], c; for (c = 0; c < 52; c++) if (!dead[c]) rest.push(c);
  var need = 5 - board.length, hA = hero.concat(board), oA = [0, 0].concat(board), hb = hA.length, i, j;
  for (i = 0; i < need; i++) { hA.push(0); oA.push(0); }
  var avail = rest.length - 2, runouts = need === 0 ? 1 : need === 1 ? avail : avail * (avail - 1) / 2;
  var limit = o.exactMax || 600000, exact = ks.length * runouts * 2 <= limit;
  var allow = o.budget ? Math.max(0, Math.min(o.budget.left, o.maxIter || 4000)) : 2000;
  var perCombo = exact ? 0 : Math.floor(allow / ks.length);
  var subset = null;
  if (!exact && perCombo < 1) {
    // zu wenig Budget: zufällige Teilmenge der Kombinationen mit je einem Runout, Rest über Klassenmittel
    var sh = ks.slice(), rr = o.rng || PT.makeRng();
    for (var z = sh.length - 1; z > 0; z--) { var y = Math.floor(rr() * (z + 1)); var tt = sh[z]; sh[z] = sh[y]; sh[y] = tt; }
    subset = sh.slice(0, Math.max(0, allow)); perCombo = 1;
  }
  var allKs = ks; if (subset) ks = subset;
  var rng = o.rng || PT.makeRng(), sampled = 0;
  for (var q = 0; q < ks.length; q++) {
    k = ks[q]; var a = C1[k], b = C2[k], s = 0, n = 0;
    oA[0] = a; oA[1] = b;
    if (need === 0) { var hs = evaluate(hA), os = evaluate(oA); s = hs > os ? 1 : hs === os ? 0.5 : 0; n = 1; }
    else if (exact) {
      if (need === 1) {
        for (i = 0; i < rest.length; i++) { var x = rest[i]; if (x === a || x === b) continue; hA[hb] = oA[hb] = x; var h1 = evaluate(hA), o1 = evaluate(oA); s += h1 > o1 ? 1 : h1 === o1 ? 0.5 : 0; n++; }
      } else {
        for (i = 0; i < rest.length; i++) { var x1 = rest[i]; if (x1 === a || x1 === b) continue; hA[hb] = oA[hb] = x1;
          for (j = i + 1; j < rest.length; j++) { var x2 = rest[j]; if (x2 === a || x2 === b) continue; hA[hb + 1] = oA[hb + 1] = x2;
            var h2 = evaluate(hA), o2 = evaluate(oA); s += h2 > o2 ? 1 : h2 === o2 ? 0.5 : 0; n++; } }
      }
    } else {
      for (var m = 0; m < perCombo; m++) {
        var y1, y2;
        do { y1 = rest[Math.floor(rng() * rest.length)]; } while (y1 === a || y1 === b);
        hA[hb] = oA[hb] = y1;
        if (need === 2) { do { y2 = rest[Math.floor(rng() * rest.length)]; } while (y2 === a || y2 === b || y2 === y1); hA[hb + 1] = oA[hb + 1] = y2; }
        var h3 = evaluate(hA), o3 = evaluate(oA); s += h3 > o3 ? 1 : h3 === o3 ? 0.5 : 0; n++;
      }
      sampled += perCombo;
    }
    info.evals += 2 * n;
    e[k] = n ? s / n : 0.5;
  }
  if (subset) {
    var cs = new Float64Array(169), cn = new Float64Array(169), gs = 0, gn = 0;
    ks.forEach(function (k3) { cs[CLS[k3]] += e[k3]; cn[CLS[k3]]++; gs += e[k3]; gn++; });
    var done = {}; ks.forEach(function (k3) { done[k3] = 1; });
    allKs.forEach(function (k3) { if (!done[k3]) e[k3] = cn[CLS[k3]] ? cs[CLS[k3]] / cn[CLS[k3]] : (gn ? gs / gn : 0.5); });
    info.partial = true;
  }
  if (!exact) {
    info.method = 'Monte Carlo'; info.iters = sampled;
    if (o.budget) { o.budget.left -= sampled; o.budget.used += sampled; if (o.budget.calls) o.budget.calls.push(sampled); }
    info.se = 0.5 / Math.sqrt(Math.max(1, sampled));
  }
  return { e: e, info: info };
}
function rangeEq(e, w) {
  var s = 0, t = 0;
  for (var k = 0; k < NC; k++) { var x = w[k]; if (x > 0) { s += x * e[k]; t += x; } }
  return t > 0 ? s / t : null;
}

// ---------- Reaktionsmodell ----------
/** Stärke-Score je Kombination für die Reaktion auf einen Einsatz (Draws zählen mit). */
function strengthScores(opp, ctx) {
  if (opp._sc) return opp._sc;
  var sc = new Float32Array(NC), w = opp.w;
  if (ctx.street === 0) {
    for (var k = 0; k < NC; k++) if (w[k] > 0) sc[k] = 1 - H.classTop(CLS[k]);
  } else {
    var hs = R.rangeStrength(w, ctx.board);
    for (var k2 = 0; k2 < NC; k2++) if (w[k2] > 0) sc[k2] = Math.min(0.995, hs.v[k2] + (hs.d[k2] && ctx.street < 3 ? 0.28 : 0));
  }
  opp._sc = sc; return sc;
}
/** Teilt die Range nach Score: oberste Anteile → weiter (cont), davon oberste → Raise */
function splitRange(w, sc, contFrac, raiseFrac) {
  var items = [], tot = 0, k;
  for (k = 0; k < NC; k++) if (w[k] > 0) { items.push(k); tot += w[k]; }
  items.sort(function (a, b) { return sc[b] - sc[a]; });
  var contW = new Float64Array(NC), raiseW = new Float64Array(NC), callW = new Float64Array(NC), acc = 0, cTarget = contFrac * tot, rTarget = raiseFrac * tot;
  for (var i = 0; i < items.length; i++) {
    k = items[i]; var x = w[k];
    if (acc >= cTarget) break;
    var take = Math.min(x, cTarget - acc);
    contW[k] = take;
    var rTake = acc < rTarget ? Math.min(take, rTarget - acc) : 0;
    raiseW[k] = rTake; callW[k] = take - rTake;
    acc += take;
  }
  return { contW: contW, raiseW: raiseW, callW: callW, tot: tot };
}
/**
 * Reaktion eines Gegners auf einen Einsatz. heroAdd: Chips, die der Held hinzufügt; potBefore: Pot vor der Aktion.
 * Rückgabe: {f, c, r} (Wahrscheinlichkeiten), contW/callW/raiseW (Ranges), basis (Text)
 */
function respond(opp, ctx, heroAdd, potBefore, nResp, kind) {
  var mdf = potBefore / Math.max(1, potBefore + heroAdd), gtoDef = 1 - Math.pow(1 - mdf, 1 / Math.max(1, nResp));
  var sm = opp.sm, prof = opp.prof, def = gtoDef, basis = 'MDF';
  if (ctx.street === 0) {
    // Preflop: Fold-Wahrscheinlichkeit aus Chart/Modell, im exploitativen Modus mit Gegnerwerten gemischt
    var chartF = clamp(1 - gtoDef * 0.85, 0.1, 0.95), statF = null, nObs = 0, lk = opp.line ? opp.line.kind : 'none', raw = opp.raw || {};
    function obs(k) { return raw[k] ? raw[k][1] : 0; }
    if (opp.pending || lk === 'none') {
      if (kind === 'open' || kind === 'iso') {
        var bl = opp.p.pos === 'SB' || opp.p.pos === 'BB';
        chartF = bl ? (opp.p.pos === 'BB' ? 0.6 : 0.85) : 0.9;
        if (kind === 'iso') chartF = Math.min(0.95, chartF + 0.03);
        if (bl) { statF = sm.foldToSteal; nObs = obs('foldToSteal'); } else { statF = clamp(1 - sm.vpip * 0.4, 0.6, 0.97); nObs = opp.hands; }
      } else chartF = kind === 'jam' ? clamp(1 - gtoDef * 0.45, 0.7, 0.97) : 0.95;
    } else if (lk === 'open' || lk === 'iso') { chartF = kind === 'jam' ? 0.62 : 0.58; statF = sm.foldTo3Bet; nObs = obs('foldTo3Bet'); }
    else if (lk === '3bet') { chartF = kind === 'jam' ? 0.6 : 0.55; statF = sm.foldTo4Bet; nObs = obs('foldTo4Bet'); }
    else if (lk === 'limp') { chartF = 0.55; statF = clamp(1 - sm.vpip * 0.8, 0.15, 0.9); nObs = opp.hands; }
    else if (lk === 'call') chartF = kind === 'jam' ? 0.8 : 0.72;
    else if (lk === 'check') chartF = 0.6;
    else chartF = 0.5;
    var f0 = chartF;
    if (ctx.mode !== 'gto' && statF != null) { var wObs = nObs / (nObs + 25); f0 = chartF * (1 - wObs) + statF * wObs; basis = 'Gegnerwerte (' + nObs + ' Gelegenheiten)'; }
    else basis = 'Faustregel-Chart';
    def = clamp(1 - f0, 0.04, 0.96);
  } else if (ctx.mode !== 'gto') {
    var adj = 0;
    if (kind === 'cbet') adj += (R.PRIOR.foldToCbet - sm.foldToCbet) * 0.9;
    adj += (prof.station - 0.4) * 0.18 - (heroAdd / Math.max(1, potBefore) - 0.66) * 0.08;
    def = clamp(gtoDef + adj, 0.08, 0.95);
    basis = 'MDF, angepasst an Gegnerwerte';
  }
  if (opp.floor != null) {
    // Untergrenze: starke Hände spielen weiter; Top Pair und Draws hängen von der Einsatzgröße ab
    var s0 = heroAdd / Math.max(1, potBefore), F = opp.floor;
    var fl = F.strong * (ctx.street === 3 ? clamp(1.15 - 0.15 * s0, 0.55, 1) : 1) + F.good * clamp(1.1 - 0.5 * s0, 0.12, 0.85) + F.draw * clamp(0.8 - 0.3 * s0, 0.1, 0.6);
    def = Math.max(def, clamp(fl * (ctx.mode === 'gto' ? 1 : 0.85 + 0.3 * prof.station), 0, 0.95));
  }
  if (ctx.street > 0) {
    // Korrektur für Overbets und Raises: polarisierte große Einsätze und Raises gegen eine gezeigte Bet werden seltener gefoldet,
    // als die reine MDF-Annahme für eine Einzelhand nahelegt (Modellannahme).
    var sz = heroAdd / Math.max(1, potBefore), alpha = sz <= 0.75 ? 1 : Math.max(0.7, 1 - 0.3 * (sz - 0.75));
    if (kind === 'raise' || kind === 'jam' && ctx.L.toCall > 0) alpha *= 0.85;
    def = 1 - (1 - def) * alpha;
  }
  var raiseFrac = def * (ctx.mode === 'gto' ? 0.16 : clamp(0.08 + 0.22 * prof.aggr, 0.05, 0.35));
  if (opp.p.stack <= heroAdd) raiseFrac = 0;
  var sp = splitRange(opp.w, strengthScores(opp, ctx), def, raiseFrac);
  return { f: 1 - def, c: def - raiseFrac, r: raiseFrac, contW: sp.contW, callW: sp.callW, raiseW: sp.raiseW, basis: basis };
}

// ---------- Equity Realization ----------
function realization(ctx, kind) {
  if (ctx.street === 3) return 1;
  var Rz = ctx.street === 0 ? (ctx.ip ? 0.95 : 0.82) : (ctx.ip ? 1.0 : 0.9);
  var f = ctx.feat;
  if (ctx.street > 0 && f) {
    if (f.cat >= 2 && f.cat < 4) Rz *= 1.04;
    else if (f.cat >= 4) Rz *= 1.06;
    else if (f.cat === 0 && f.draw && f.draw.strong) Rz *= 0.94;
    else if (f.cat === 1 && /schwach|unter dem Board|Board/.test(f.desc || '')) Rz *= 0.88;
  }
  if (ctx.street === 0 && ctx.nOpp > 1) Rz *= Math.pow(0.95, ctx.nOpp - 1);
  if (kind === 'bet') Rz += 0.03;
  var spr = ctx.spr;
  if (spr < 1) Rz = Rz + (1 - Rz) * (1 - spr);
  return clamp(Rz, 0.6, 1.1);
}

// ---------- Hilfen ----------
function prod(a) { var p = 1; for (var i = 0; i < a.length; i++) p *= a[i]; return p; }
/** Equity gegen eine Teilmenge von Gegnern mit gegebenen Ranges (Produktnäherung, auf Gesamt-Equity kalibriert) */
function subsetEq(ctx, parts) {
  if (!parts.length) return 1;
  var eqs = parts.map(function (x) { var r = rangeEq(x.opp.e, x.w); return r == null ? 0.5 : r; });
  if (parts.length === 1) return eqs[0];
  var kappa = ctx.kappa || 1;
  return clamp(prod(eqs) * Math.pow(kappa, (parts.length - 1) / Math.max(1, ctx.nOpp - 1)), 0, 1);
}

// ---------- Aktionen ----------
function evCheck(ctx) {
  var Rz = realization(ctx, 'check');
  var ev = Rz * ctx.eqNow * ctx.pot;
  return { ev: ev, dEdq: Rz * ctx.pot, parts: { realization: Rz, equity: ctx.eqNow, pot: ctx.pot } };
}
/** Pot Odds anhand des tatsächlich zahlbaren Betrags und des gewinnbaren Pots (Side Pots berücksichtigt) */
function potOdds(ctx) {
  var L = ctx.L, me = ctx.me, c = L.callAmt;
  if (!(c > 0)) return null;
  var heroFinal = me.total + c, winnable = 0;
  ctx.v.players.forEach(function (q) { winnable += q.seat === me.seat ? heroFinal : Math.min(q.total, heroFinal); });
  return { call: c, winnable: winnable, need: c / winnable, capped: c < L.toCall };
}
function evCall(ctx) {
  var L = ctx.L, me = ctx.me, c = L.callAmt, heroAllIn = c >= me.stack;
  var others = ctx.opps.filter(function (o) { return !o.p.allIn; });
  var po = potOdds(ctx);
  if (heroAllIn || others.length === 0) {
    // keine weiteren Setzrunden: Side-Pot-genaue Abrechnung
    var heroFinal = me.total + c;
    if (ctx.budget.left < 200) return { ev: ctx.eqNow * (po ? po.winnable : ctx.pot + c) - c, dEdq: po ? po.winnable : ctx.pot, parts: { allin: true, approx: true, call: c, winnable: po ? po.winnable : null } };
    var share = Q.potShare({ hero: ctx.v.cards, heroTotal: heroFinal, board: ctx.board, rng: ctx.rng, budget: ctx.budget, iters: Math.min(1500, ctx.budget.left),
      opps: ctx.opps.map(function (o) { return { w: o.w, total: Math.min(o.p.total, heroFinal + 1e12), folded: false }; }),
      deadMoney: ctx.deadMoney });
    return { ev: share.win - c, dEdq: po ? po.winnable : ctx.pot, se: share.se, parts: { allin: true, expectedWin: share.win, call: c, winnable: po ? po.winnable : null } };
  }
  var Rz = realization(ctx, 'call'), potAfter = ctx.pot + c;
  var implied = 0, f = ctx.feat;
  if (ctx.street > 0 && ctx.street < 3 && f && f.draw && f.draw.strong && f.cat <= 1) {
    var outs = Math.max(f.cleanOuts || 0, 0), pHit = outs / (ctx.street === 1 ? 47 : 46), main = ctx.opps[0];
    var behind = Math.max(0, Math.min(me.stack - c, ctx.maxOppStack));
    implied = pHit * Math.min(behind, potAfter) * (0.2 + 0.25 * (main ? main.prof.station : 0.4));
  }
  var ev = Rz * ctx.eqNow * potAfter - c + implied;
  return { ev: ev, dEdq: Rz * potAfter, parts: { realization: Rz, equity: ctx.eqNow, potAfter: potAfter, call: c, implied: implied } };
}
function evBet(ctx, to, kind) {
  var me = ctx.me, a = to - me.bet, pot = ctx.pot, L = ctx.L;
  var resp = ctx.opps.filter(function (o) { return !o.p.allIn; }), allins = ctx.opps.filter(function (o) { return o.p.allIn; });
  var nR = resp.length;
  var R0 = resp.map(function (o) { return respond(o, ctx, a, pot, nR, kind); });
  var heroAllIn = to >= me.bet + me.stack;
  // Re-Raise-Zweig
  var pNoRaise = prod(R0.map(function (r) { return 1 - r.r; })), pRaise = 1 - pNoRaise, evRaised = 0;
  if (pRaise > 1e-6) {
    var ri = 0; R0.forEach(function (r, i) { if (r.r > R0[ri].r) ri = i; });
    var ro = resp[ri], raiseTo = Math.min(ro.p.bet + ro.p.stack, Math.max(to * 3, to + ctx.bb * 2)), heroMax = me.bet + me.stack;
    var callTo = Math.min(raiseTo, heroMax), extra = callTo - to, eqR = rangeEq(ro.e, R0[ri].raiseW);
    if (eqR == null) eqR = 0.3;
    var potR = pot + (callTo - me.bet) + (Math.min(raiseTo, callTo) - ro.p.bet);
    var Rr = (callTo >= heroMax || raiseTo >= ro.p.bet + ro.p.stack) ? 1 : 0.92;
    evRaised = Math.max(-a, Rr * eqR * potR - (callTo - me.bet));
    if (heroAllIn) evRaised = eqR * (pot + a + Math.min(a, ro.p.bet + ro.p.stack - ro.p.bet)) - a;
  }
  // Teilmengen der Caller (ohne Raise)
  var evNR = 0, sumP = 0, branches = [], RzBet = realization(ctx, 'bet');
  var n = Math.min(nR, 5);
  for (var mask = 0; mask < (1 << n); mask++) {
    var p = 1, S = [];
    for (var i = 0; i < n; i++) {
      var ri2 = R0[i], denom = Math.max(1e-9, 1 - ri2.r), cp = ri2.c / denom, fp = ri2.f / denom;
      if (mask & (1 << i)) { p *= cp; S.push(i); } else p *= fp;
    }
    if (p < 1e-7) continue;
    var ev, eqS = null, potS = pot;
    if (!S.length && !allins.length) ev = pot;
    else {
      var levelMax = 0, calls = 0;
      S.forEach(function (i2) { var o = resp[i2]; levelMax = Math.max(levelMax, Math.min(to, o.p.bet + o.p.stack)); });
      allins.forEach(function (o) { levelMax = Math.max(levelMax, o.p.bet); });
      var heroEff = Math.min(to, Math.max(levelMax, me.bet)), addEff = heroEff - me.bet;
      S.forEach(function (i2) { var o = resp[i2]; calls += Math.max(0, Math.min(heroEff, o.p.bet + o.p.stack) - o.p.bet); });
      potS = pot + addEff + calls;
      var parts = S.map(function (i2) { return { opp: resp[i2], w: R0[i2].contW }; }).concat(allins.map(function (o) { return { opp: o, w: o.w }; }));
      eqS = subsetEq(ctx, parts);
      var allInNow = heroEff >= me.bet + me.stack || S.every(function (i2) { var o = resp[i2]; return o.p.bet + o.p.stack <= heroEff; });
      var Rz = allInNow ? 1 : RzBet;
      ev = Rz * eqS * potS - addEff;
    }
    evNR += p * ev; sumP += p;
    branches.push({ callers: S.map(function (i2) { return resp[i2].p.name; }), p: p * pNoRaise, ev: ev, eq: eqS, pot: potS });
  }
  if (sumP > 0) evNR /= sumP;
  var total = pNoRaise * evNR + pRaise * evRaised;
  var pAllFold = prod(R0.map(function (r) { return r.f; }));
  // Ableitung nach Equity (für Unsicherheit): Anteil der Fälle mit Showdown-Beteiligung
  var dEdq = 0; branches.forEach(function (b) { if (b.eq != null) dEdq += b.p * b.pot * RzBet; });
  return { ev: total, dEdq: dEdq, parts: { to: to, add: a, pAllFold: allins.length ? 0 : pAllFold, pRaise: pRaise, evRaised: evRaised, branches: branches.slice(0, 8),
    folds: R0.map(function (r, i) { return { name: resp[i].p.name, f: r.f, c: r.c, r: r.r, basis: r.basis }; }), realization: RzBet } };
}

// ---------- Kandidaten-Größen ----------
function candidates(ctx) {
  var L = ctx.L, me = ctx.me, pot = ctx.pot, out = [], bb = ctx.bb, seen = {};
  function fit(to) {
    var u = Math.max(1, Math.round(bb / 10));
    to = Math.round(to / u) * u;
    if (to < L.minTo) to = L.minTo;
    if (to > L.maxTo) to = L.maxTo;
    return to;
  }
  function add(to, label, kind) { to = fit(to); if (seen[to]) return; seen[to] = 1; out.push({ type: L.isBet ? 'bet' : 'raise', amount: to, label: label, kind: kind }); }
  if (L.canFold) out.push({ type: 'fold', label: 'Fold' });
  if (L.canCheck) out.push({ type: 'check', label: 'Check' });
  if (L.canCall) out.push({ type: 'call', amount: L.callAmt, label: 'Call ' + U.fmt(L.callAmt) });
  if (L.canRaise) {
    if (ctx.street === 0) {
      var pre = ctx.pre;
      if (pre.rc === 0) {
        var base = pre.limpers * bb;
        [2, 2.5, 3].forEach(function (x) { var to = x * bb + base + (me.pos === 'SB' && pre.limpers === 0 ? 0.5 * bb : 0); add(to, (pre.limpers ? 'Iso-Raise auf ' : 'Open ') + String(Math.round(to / bb * 10) / 10).replace('.', ',') + ' BB', pre.limpers ? 'iso' : 'open'); });
      } else if (pre.rc === 1) {
        var ip = ctx.ip, m = ip ? [2.8, 3.3] : [3.6, 4.2];
        m.forEach(function (x) { add(pre.lastTo * x + pre.callers * pre.lastTo, '3-Bet ' + String(x).replace('.', ',') + '×', '3bet'); });
      } else if (pre.rc === 2) {
        [2.2, 2.6].forEach(function (x) { add(pre.lastTo * x, '4-Bet ' + String(x).replace('.', ',') + '×', '4bet'); });
      }
      if (ctx.eff <= 35 * bb || pre.rc >= 3 || (pre.rc === 2 && ctx.eff <= 60 * bb)) add(L.maxTo, 'All-in', 'jam');
    } else if (L.isBet) {
      [[0.33, '⅓ Pot'], [0.5, '½ Pot'], [0.75, '¾ Pot'], [1.0, 'Pot'], [1.5, 'Overbet 1,5×']].forEach(function (x) { add(me.bet + pot * x[0], 'Bet ' + x[1], ctx.cbetSpot ? 'cbet' : 'bet'); });
      if (L.maxTo - me.bet <= 2.5 * pot) add(L.maxTo, 'All-in', 'jam');
    } else {
      var facing = ctx.cur - (ctx.prevCur || 0);
      [2.5, 3.5].forEach(function (x) { add(ctx.cur + (x - 1) * Math.max(facing, ctx.L.toCall), 'Raise ' + String(x).replace('.', ',') + '×', 'raise'); });
      add(ctx.cur + (pot + ctx.L.toCall), 'Raise Pot', 'raise');
      if (L.maxTo - me.bet <= 3 * (pot + ctx.L.toCall)) add(L.maxTo, 'All-in', 'jam');
    }
    out.forEach(function (a) { if ((a.type === 'bet' || a.type === 'raise') && a.amount === L.maxTo) a.label = (a.label === 'All-in' ? 'All-in' : a.label + ' (All-in)'), a.allin = true; });
  }
  return out;
}

/** Bewertet eine Aktion; liefert {ev, u (Unsicherheit), parts} */
function evaluateAction(ctx, act) {
  var r;
  if (act.type === 'fold') r = { ev: 0, dEdq: 0, parts: {} };
  else if (act.type === 'check') r = evCheck(ctx);
  else if (act.type === 'call') r = evCall(ctx);
  else r = evBet(ctx, act.amount, act.kind || (ctx.street === 0 ? (ctx.pre.rc === 0 ? 'open' : ctx.pre.rc === 1 ? '3bet' : '4bet') : (ctx.cbetSpot ? 'cbet' : 'bet')));
  var simU = (r.dEdq || 0) * (ctx.eqSE || 0) + (r.se || 0);
  var modelU = (r.dEdq || 0) * (ctx.eqRangeSpread || 0);
  if (act.type === 'bet' || act.type === 'raise') modelU += Math.abs(ctx.pot - (r.ev || 0)) * ctx.foldUnc * 0.5 + 0.02 * ctx.pot;
  r.uSim = simU; r.uModel = modelU; r.u = Math.sqrt(simU * simU + modelU * modelU);
  return r;
}

PT.ev = { pfTable: pfTable, eqClass: eqClass, comboEquities: comboEquities, rangeEq: rangeEq, respond: respond, splitRange: splitRange,
  realization: realization, potOdds: potOdds, evCheck: evCheck, evCall: evCall, evBet: evBet, candidates: candidates, evaluateAction: evaluateAction, subsetEq: subsetEq };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
