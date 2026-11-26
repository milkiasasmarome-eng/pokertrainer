/* PokerTrainer 2.0 – Equity-Engine.
   Exakte Enumeration (Heads-up gegen Range auf Flop/Turn/River, wenn der Aufwand es erlaubt),
   sonst Monte-Carlo mit gewichteten Ranges, Kartenentfernung, adaptiver Stoppregel,
   Standardfehler und 95-%-Konfidenzintervall. Side-Pot-genaue Potanteile für All-in-Situationen. */
(function (G) {
'use strict';
var PT = G.PT, H = PT.hands, E = PT.eval, U = PT.util, clamp = U.clamp;
var NC = H.NC, C1 = H.C1, C2 = H.C2, evaluate = E.evaluate;

// Genauigkeitsstufen: Ziel-Standardfehler, Höchstzahl Simulationen, Zeitbudget, Grenze exakter Auswertungen
var LEVELS = {
  schnell:  { name: 'Schnell',        se: 0.02,   maxIter: 1500,  ms: 250,  exactMax: 150000 },
  standard: { name: 'Standard',       se: 0.01,   maxIter: 5000,  ms: 900,  exactMax: 600000 },
  praezise: { name: 'Präzise',        se: 0.005,  maxIter: 20000, ms: 2500, exactMax: 2500000 },
  tief:     { name: 'Tiefenanalyse',  se: 0.0025, maxIter: 60000, ms: 6000, exactMax: 6000000 }
};
var PHI = 0.6180339887498949;

// ---------- Cache ----------
var cache = new Map(), CACHE_MAX = 300;
function cacheGet(k) { if (!cache.has(k)) return null; var v = cache.get(k); cache.delete(k); cache.set(k, v); return v; }
function cachePut(k, v) { cache.set(k, v); if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value); }
function cacheClear() { cache.clear(); }

function prepRange(w, deadMask) {
  var idx = [], cum = [], tot = 0;
  for (var k = 0; k < NC; k++) {
    var x = w[k];
    if (x > 0 && !deadMask[C1[k]] && !deadMask[C2[k]]) { tot += x; idx.push(k); cum.push(tot); }
  }
  return { idx: idx, cum: cum, tot: tot };
}
function bsearch(cum, x) { var lo = 0, hi = cum.length - 1; while (lo < hi) { var mid = (lo + hi) >> 1; if (cum[mid] > x) hi = mid; else lo = mid + 1; } return lo; }

/** Exakte Heads-up-Equity gegen eine Range (Board mit 3–5 Karten, oder 0 Karten gegen wenige Kombos) */
function exactHU(hero, board, R, deadMask, limit) {
  var need = 5 - board.length, rest = [], c, i, j;
  var nCombos = R.idx.length;
  var runouts = need === 0 ? 1 : need === 1 ? 46 - board.length + 1 : need === 2 ? 0 : -1;
  // Anzahl Runouts genau bestimmen
  var avail = 0; for (c = 0; c < 52; c++) if (!deadMask[c]) avail++;
  avail -= 2; // Gegnerkarten
  runouts = need === 0 ? 1 : need === 1 ? avail : need === 2 ? avail * (avail - 1) / 2 : need === 5 ? 1712304 : -1;
  if (runouts < 0 || nCombos * runouts > limit) return null;
  var hArr = hero.concat(board), oArr = [0, 0].concat(board), hb = hArr.length;
  for (i = 0; i < need; i++) { hArr.push(0); oArr.push(0); }
  var sumW = 0, sumEq = 0, win = 0, tie = 0, evals = 0;
  for (var t = 0; t < nCombos; t++) {
    var k = R.idx[t], w = R.cum[t] - (t ? R.cum[t - 1] : 0), a = C1[k], b = C2[k];
    oArr[0] = a; oArr[1] = b;
    rest.length = 0;
    for (c = 0; c < 52; c++) if (!deadMask[c] && c !== a && c !== b) rest.push(c);
    var s = 0, n = 0, wn = 0, tn = 0;
    if (need === 0) {
      var hs = evaluate(hArr), os = evaluate(oArr); n = 1; if (hs > os) { s = 1; wn = 1; } else if (hs === os) { s = 0.5; tn = 1; }
    } else if (need === 1) {
      for (i = 0; i < rest.length; i++) { hArr[hb] = oArr[hb] = rest[i]; var h1 = evaluate(hArr), o1 = evaluate(oArr); n++; if (h1 > o1) { s += 1; wn++; } else if (h1 === o1) { s += 0.5; tn++; } }
    } else if (need === 2) {
      for (i = 0; i < rest.length; i++) { hArr[hb] = oArr[hb] = rest[i];
        for (j = i + 1; j < rest.length; j++) { hArr[hb + 1] = oArr[hb + 1] = rest[j]; var h2 = evaluate(hArr), o2 = evaluate(oArr); n++; if (h2 > o2) { s += 1; wn++; } else if (h2 === o2) { s += 0.5; tn++; } } }
    } else if (need === 5) {
      var L = rest.length;
      for (var x1 = 0; x1 < L; x1++) for (var x2 = x1 + 1; x2 < L; x2++) for (var x3 = x2 + 1; x3 < L; x3++) for (var x4 = x3 + 1; x4 < L; x4++) for (var x5 = x4 + 1; x5 < L; x5++) {
        hArr[2] = oArr[2] = rest[x1]; hArr[3] = oArr[3] = rest[x2]; hArr[4] = oArr[4] = rest[x3]; hArr[5] = oArr[5] = rest[x4]; hArr[6] = oArr[6] = rest[x5];
        var h5 = evaluate(hArr), o5 = evaluate(oArr); n++; if (h5 > o5) { s += 1; wn++; } else if (h5 === o5) { s += 0.5; tn++; }
      }
    }
    evals += 2 * n;
    sumW += w; sumEq += w * s / n; win += w * wn / n; tie += w * tn / n;
  }
  if (!(sumW > 0)) return null;
  return { eq: sumEq / sumW, win: win / sumW, tie: tie / sumW, se: 0, lo: sumEq / sumW, hi: sumEq / sumW, iters: 0, evals: evals, method: 'exakt', exact: true };
}

/**
 * equity({hero, board, ranges, level, rng, budget, deadline, exact})
 * budget: {left, used} – gemeinsame Obergrenze der Simulationen einer Entscheidung
 */
function equity(o) {
  var hero = o.hero, board = o.board || [], ranges = o.ranges || [], L = LEVELS[o.level || 'standard'] || LEVELS.standard;
  var rng = o.rng || PT.makeRng(), t0 = U.now(), deadline = o.deadline || (t0 + L.ms);
  var dead = hero.concat(board).concat(o.dead || []), deadMask = H.deadMaskOf(dead);
  var key = o.cache === false ? null : ['eq', PT.cardsStr(hero), PT.cardsStr(board), PT.cardsStr(o.dead || []), ranges.map(PT.ranges.hash).join(','), o.level || 'standard'].join('|');
  if (key) { var hit = cacheGet(key); if (hit) { var cp = Object.assign({}, hit); cp.cached = true; cp.iters = 0; return cp; } }
  if (!ranges.length) return { eq: 1, se: 0, lo: 1, hi: 1, iters: 0, method: 'kein Gegner', exact: true };
  var R = ranges.map(function (w) { return prepRange(w, deadMask); });
  if (R.some(function (r) { return !(r.tot > 0); })) return { eq: null, se: null, iters: 0, method: 'leere Range', exact: false };
  var res = null;
  if (R.length === 1 && o.exact !== false && (board.length >= 3 || (board.length === 0 && R[0].idx.length <= 2 && L.exactMax >= 3000000))) {
    res = exactHU(hero, board, R[0], deadMask, L.exactMax);
  }
  if (!res) res = monteCarlo(hero, board, R, deadMask, L, rng, o.budget, deadline, o.minIter);
  res.ms = Math.round(U.now() - t0);
  if (key && res.eq != null && (res.exact || res.iters >= 200)) cachePut(key, res);
  return res;
}
function monteCarlo(hero, board, R, deadMask, L, rng, budget, deadline, minIter) {
  var maxIter = Math.min(L.maxIter, budget ? Math.max(0, budget.left) : L.maxIter);
  var need = 5 - board.length, deck = [], c, j, k;
  for (c = 0; c < 52; c++) if (!deadMask[c]) deck.push(c);
  var hArr = hero.concat(board), oArr = [];
  for (k = 0; k < need; k++) hArr.push(0);
  for (j = 0; j < R.length; j++) oArr.push([0, 0].concat(hArr.slice(2)));
  var mark = new Int32Array(52), stamp = 0, sum = 0, sum2 = 0, valid = 0, it = 0, rejected = 0, wins = 0, ties = 0;
  var hu = R.length === 1, off = rng(), minN = minIter || 300, D = deck.length;
  var tmp = new Array(D);
  while (it < maxIter) {
    it++;
    if ((it & 127) === 0 && U.now() > deadline) break;
    stamp++;
    var ok = false;
    for (var tr = 0; tr < 50 && !ok; tr++) {
      stamp++; ok = true;
      for (j = 0; j < R.length; j++) {
        var r = R[j], u = hu ? ((off + it * PHI) % 1) : rng();
        if (hu && tr > 0) u = rng();
        var kk = r.idx[bsearch(r.cum, u * r.tot)];
        if (mark[C1[kk]] === stamp || mark[C2[kk]] === stamp) { ok = false; break; }
        mark[C1[kk]] = stamp; mark[C2[kk]] = stamp; oArr[j][0] = C1[kk]; oArr[j][1] = C2[kk];
      }
    }
    if (!ok) { rejected++; continue; }
    // Restliche Boardkarten ohne Zurücklegen ziehen
    var nT = 0;
    for (var d = 0; d < D; d++) { var cc = deck[d]; if (mark[cc] !== stamp) tmp[nT++] = cc; }
    for (var b = 0; b < need; b++) {
      var pick = b + Math.floor(rng() * (nT - b)), t = tmp[b]; tmp[b] = tmp[pick]; tmp[pick] = t;
      var pos = 2 + board.length + b; hArr[pos] = tmp[b];
      for (j = 0; j < oArr.length; j++) oArr[j][pos] = tmp[b];
    }
    var hs = evaluate(hArr), lose = false, tc = 0;
    for (j = 0; j < oArr.length; j++) { var os = evaluate(oArr[j]); if (os > hs) { lose = true; break; } if (os === hs) tc++; }
    var share = lose ? 0 : 1 / (1 + tc);
    if (!lose) { if (tc) ties++; else wins++; }
    sum += share; sum2 += share * share; valid++;
    if (valid >= minN && (valid & 63) === 0) {
      var m0 = sum / valid, var0 = Math.max(0, sum2 / valid - m0 * m0), se0 = Math.sqrt(var0 / valid);
      if (se0 <= L.se) break;
    }
  }
  if (budget) { budget.left -= it; budget.used += it; if (budget.calls) budget.calls.push(it); }
  if (!valid) return { eq: null, se: null, iters: it, method: 'Monte Carlo', exact: false, rejected: rejected };
  var m = sum / valid, vr = Math.max(0, sum2 / valid - m * m), se = Math.sqrt(vr / valid);
  return { eq: m, se: se, lo: clamp(m - 1.96 * se, 0, 1), hi: clamp(m + 1.96 * se, 0, 1), win: wins / valid, tie: ties / valid,
    iters: it, valid: valid, rejected: rejected, method: 'Monte Carlo', exact: false };
}

/**
 * Erwarteter Gewinn aus festen Beiträgen (All-in, Side Pots). Nur Pots, für die der Held berechtigt ist, zählen.
 * o: {hero, heroTotal, board, opps:[{w, total, folded}], dead, rng, iters, budget}
 * Gibt {win (erwartete Chips), se, iters, pots} zurück.
 */
function potShare(o) {
  var entries = [{ seat: 0, total: o.heroTotal, folded: false }];
  o.opps.forEach(function (x, i) { entries.push({ seat: i + 1, total: x.total, folded: !!x.folded }); });
  if (o.deadMoney) entries.push({ seat: entries.length, total: o.deadMoney, folded: true });
  // Pots wie bei der Abrechnung (ohne Rake)
  var live = entries.filter(function (e) { return !e.folded; }), levels = [], pots = [], prev = 0;
  live.forEach(function (e) { if (levels.indexOf(e.total) < 0) levels.push(e.total); });
  levels.sort(function (a, b) { return a - b; });
  var maxTop = 0; entries.forEach(function (e) { if (e.total > maxTop) maxTop = e.total; });
  levels.forEach(function (Lv, li) {
    var amt = 0;
    entries.forEach(function (e) { var hi2 = li === levels.length - 1 ? e.total : Math.min(e.total, Lv); amt += Math.max(0, hi2 - Math.min(e.total, prev)); });
    pots.push({ amount: amt, eligible: live.filter(function (e) { return e.total >= Lv; }).map(function (e) { return e.seat; }) });
    prev = Lv;
  });
  // nicht gecallter Überschuss des alleinigen Höchstbeitrags fließt zurück
  var sorted = entries.slice().sort(function (a, b) { return b.total - a.total; });
  var refund = 0;
  if (sorted.length > 1 && sorted[0].total > sorted[1].total) {
    var ex = sorted[0].total - sorted[1].total, last = pots[pots.length - 1];
    if (last && last.eligible.length === 1) { last.amount -= ex; if (sorted[0].seat === 0) refund = ex; }
  }
  var liveOpps = o.opps.map(function (x, i) { return { w: x.w, seat: i + 1, folded: x.folded }; }).filter(function (x) { return !x.folded; });
  var board = o.board || [], dead = o.hero.concat(board).concat(o.dead || []), deadMask = H.deadMaskOf(dead);
  var R = liveOpps.map(function (x) { return prepRange(x.w, deadMask); });
  var rng = o.rng || PT.makeRng(), maxIt = Math.min(o.iters || 3000, o.budget ? Math.max(0, o.budget.left) : 1e9);
  var need = 5 - board.length, deck = [], c, j;
  for (c = 0; c < 52; c++) if (!deadMask[c]) deck.push(c);
  var hArr = o.hero.concat(board), oArr = [];
  for (j = 0; j < need; j++) hArr.push(0);
  for (j = 0; j < R.length; j++) oArr.push([0, 0].concat(hArr.slice(2)));
  var mark = new Int32Array(52), stamp = 0, sum = 0, sum2 = 0, n = 0, it = 0, tmp = new Array(deck.length);
  var scores = new Array(entries.length);
  while (it < maxIt) {
    it++; stamp++;
    var ok = true;
    for (var tr = 0; tr < 50; tr++) {
      stamp++; ok = true;
      for (j = 0; j < R.length; j++) {
        var kk = R[j].idx[bsearch(R[j].cum, rng() * R[j].tot)];
        if (mark[C1[kk]] === stamp || mark[C2[kk]] === stamp) { ok = false; break; }
        mark[C1[kk]] = stamp; mark[C2[kk]] = stamp; oArr[j][0] = C1[kk]; oArr[j][1] = C2[kk];
      }
      if (ok) break;
    }
    if (!ok) continue;
    var nT = 0; for (var d = 0; d < deck.length; d++) if (mark[deck[d]] !== stamp) tmp[nT++] = deck[d];
    for (var b = 0; b < need; b++) {
      var pick = b + Math.floor(rng() * (nT - b)), t = tmp[b]; tmp[b] = tmp[pick]; tmp[pick] = t;
      hArr[2 + board.length + b] = tmp[b]; for (j = 0; j < oArr.length; j++) oArr[j][2 + board.length + b] = tmp[b];
    }
    scores[0] = evaluate(hArr);
    for (j = 0; j < R.length; j++) scores[liveOpps[j].seat] = evaluate(oArr[j]);
    var won = refund;
    for (var p = 0; p < pots.length; p++) {
      var pt = pots[p]; if (pt.eligible.indexOf(0) < 0 || pt.amount <= 0) continue;
      var best = -1, cnt = 0;
      for (var e = 0; e < pt.eligible.length; e++) { var sc = scores[pt.eligible[e]]; if (sc > best) { best = sc; cnt = 1; } else if (sc === best) cnt++; }
      if (scores[0] === best) won += pt.amount / cnt;
    }
    sum += won; sum2 += won * won; n++;
  }
  if (o.budget) { o.budget.left -= it; o.budget.used += it; if (o.budget.calls) o.budget.calls.push(it); }
  var m = n ? sum / n : 0, vr = n ? Math.max(0, sum2 / n - m * m) : 0;
  return { win: m, se: n ? Math.sqrt(vr / n) : null, iters: it, pots: pots, refund: refund };
}

PT.equity = { LEVELS: LEVELS, equity: equity, exactHU: exactHU, potShare: potShare, prepRange: prepRange, cacheClear: cacheClear,
  cacheSize: function () { return cache.size; } };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
