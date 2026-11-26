/* PokerTrainer 2.0 – Begrenztes spieltheoretisches Modell: River-Spiel mit CFR+.
   Vereinfachungen (bewusst): nur River, ein Spieler out of Position (OOP) und einer in Position (IP),
   eine oder zwei Betgrößen, keine Raises, Hände in Stärkegruppen (Buckets) zusammengefasst,
   Ranges stammen aus dem Range-Modell der App. Ergebnis: Gleichgewicht dieses Modellspiels,
   kein vollständiger Solver für No-Limit Hold'em. Exploitability wird mitgeliefert. */
(function (G) {
'use strict';
var PT = G.PT, H = PT.hands, E = PT.eval;
var NC = H.NC, C1 = H.C1, C2 = H.C2;

/**
 * Baum (Pot = 1):
 *   OOP: check | bet s
 *     nach bet s → IP: fold | call
 *     nach check → IP: check | bet s → OOP: fold | call
 */
function buildTree(sizes) {
  var root = { p: 0, name: 'OOP', acts: ['check'].concat(sizes.map(function (s) { return 'bet' + s; })), kids: [] };
  var chk = { p: 1, name: 'IP nach Check', acts: ['check'].concat(sizes.map(function (s) { return 'bet' + s; })), kids: [] };
  root.kids.push(chk);
  sizes.forEach(function (s) {
    root.kids.push({ p: 1, name: 'IP gegen Bet ' + s, acts: ['fold', 'call'], kids: [{ term: 'fold', folder: 1, inv: [s, 0] }, { term: 'sd', pot: 1 + 2 * s, inv: s }] });
  });
  chk.kids.push({ term: 'sd', pot: 1, inv: 0 });
  sizes.forEach(function (s) {
    chk.kids.push({ p: 0, name: 'OOP gegen Bet ' + s, acts: ['fold', 'call'], kids: [{ term: 'fold', folder: 0 }, { term: 'sd', pot: 1 + 2 * s, inv: s }] });
  });
  var list = [];
  (function index(n) { if (n.term) return; n.id = list.length; list.push(n); n.kids.forEach(index); })(root);
  return { root: root, nodes: list };
}

/**
 * Löst das Matrixspiel. J[i][j]: gemeinsame Wahrscheinlichkeit der Buckets (OOP i, IP j), M[i][j]: Equity OOP.
 * iters: CFR+-Iterationen. Gibt Durchschnittsstrategie, Spielwert und Exploitability (in Pot-Anteilen) zurück.
 */
function solveMatrix(J, M, sizes, iters) {
  var BO = J.length, BI = J[0].length, T = buildTree(sizes), nodes = T.nodes;
  nodes.forEach(function (n) {
    var B = n.p === 0 ? BO : BI, A = n.acts.length;
    n.reg = []; n.sum = []; for (var b = 0; b < B; b++) { n.reg.push(new Float64Array(A)); n.sum.push(new Float64Array(A)); }
  });
  function strat(n, b, avg) {
    var r = avg ? n.sum[b] : n.reg[b], A = r.length, s = 0, out = new Float64Array(A), a;
    for (a = 0; a < A; a++) s += Math.max(0, r[a]);
    if (s > 0) for (a = 0; a < A; a++) out[a] = Math.max(0, r[a]) / s; else for (a = 0; a < A; a++) out[a] = 1 / A;
    return out;
  }
  function termVal(n, rO, rI) {
    var vO = new Float64Array(BO), vI = new Float64Array(BI), i, j;
    for (i = 0; i < BO; i++) for (j = 0; j < BI; j++) {
      var jw = J[i][j]; if (!jw) continue;
      var u;
      if (n.term === 'fold') u = n.folder === 1 ? 0.5 : -0.5;
      else u = M[i][j] * n.pot - n.inv - 0.5;
      vO[i] += jw * rI[j] * u; vI[j] -= jw * rO[i] * u;
    }
    return { vO: vO, vI: vI };
  }
  // upd: welcher Spieler aktualisiert (0, 1) oder -1 (keiner); avg: Durchschnittsstrategie verwenden; br: Best Response für Spieler br
  function walk(n, rO, rI, upd, avg, br, t) {
    if (n.term) return termVal(n, rO, rI);
    var B = n.p === 0 ? BO : BI, A = n.acts.length, a, b;
    var S = []; for (b = 0; b < B; b++) S.push(strat(n, b, avg && br !== n.p));
    var child = [];
    for (a = 0; a < A; a++) {
      var nO = rO, nI = rI;
      if (n.p === 0) { nO = new Float64Array(BO); for (b = 0; b < BO; b++) nO[b] = rO[b] * S[b][a]; }
      else { nI = new Float64Array(BI); for (b = 0; b < BI; b++) nI[b] = rI[b] * S[b][a]; }
      child.push(walk(n.kids[a], nO, nI, upd, avg, br, t));
    }
    var vO = new Float64Array(BO), vI = new Float64Array(BI);
    if (n.p === 0) {
      for (b = 0; b < BO; b++) {
        if (br === 0) { var mx = -Infinity; for (a = 0; a < A; a++) mx = Math.max(mx, child[a].vO[b]); vO[b] = mx; }
        else for (a = 0; a < A; a++) vO[b] += S[b][a] * child[a].vO[b];
      }
      for (a = 0; a < A; a++) for (b = 0; b < BI; b++) vI[b] += child[a].vI[b];
      if (upd === 0) for (b = 0; b < BO; b++) for (a = 0; a < A; a++) {
        n.reg[b][a] = Math.max(0, n.reg[b][a] + child[a].vO[b] - vO[b]);
        n.sum[b][a] += t * rO[b] * S[b][a];
      }
    } else {
      for (b = 0; b < BI; b++) {
        if (br === 1) { var mx2 = -Infinity; for (a = 0; a < A; a++) mx2 = Math.max(mx2, child[a].vI[b]); vI[b] = mx2; }
        else for (a = 0; a < A; a++) vI[b] += S[b][a] * child[a].vI[b];
      }
      for (a = 0; a < A; a++) for (b = 0; b < BO; b++) vO[b] += child[a].vO[b];
      if (upd === 1) for (b = 0; b < BI; b++) for (a = 0; a < A; a++) {
        n.reg[b][a] = Math.max(0, n.reg[b][a] + child[a].vI[b] - vI[b]);
        n.sum[b][a] += t * rI[b] * S[b][a];
      }
    }
    return { vO: vO, vI: vI };
  }
  var oneO = new Float64Array(BO).fill(1), oneI = new Float64Array(BI).fill(1);
  for (var t = 1; t <= iters; t++) { walk(T.root, oneO, oneI, 0, false, -1, t); walk(T.root, oneO, oneI, 1, false, -1, t); }
  function sumv(v) { var s = 0; for (var i = 0; i < v.length; i++) s += v[i]; return s; }
  var val = walk(T.root, oneO, oneI, -1, true, -1, 0), gameV = sumv(val.vO);
  var brO = sumv(walk(T.root, oneO, oneI, -1, true, 0, 0).vO), brI = sumv(walk(T.root, oneO, oneI, -1, true, 1, 0).vI);
  var expl = (brO + brI) / 2; // ≥ 0; 0 im exakten Gleichgewicht (Einheit: Pot)
  var avgStrat = nodes.map(function (n) { var B = n.p === 0 ? BO : BI, out = []; for (var b = 0; b < B; b++) out.push(Array.from(strat(n, b, true))); return { name: n.name, p: n.p, acts: n.acts, s: out }; });
  return { value: gameV, exploitability: expl, nodes: avgStrat, iters: iters };
}

/** Buckets nach gewichteten Quantilen der Handstärke */
function bucketize(w, board, B) {
  var items = [], arr = [0, 0].concat(board), tot = 0, k;
  for (k = 0; k < NC; k++) if (w[k] > 0) { arr[0] = C1[k]; arr[1] = C2[k]; items.push({ k: k, s: E.evaluate(arr), w: w[k] }); tot += w[k]; }
  items.sort(function (a, b) { return a.s - b.s; });
  var of = new Int16Array(NC).fill(-1), acc = 0, i = 0;
  while (i < items.length) {
    var j = i, gw = 0; while (j < items.length && items[j].s === items[i].s) { gw += items[j].w; j++; }
    var b = Math.min(B - 1, Math.floor((acc + gw / 2) / tot * B));
    for (var t = i; t < j; t++) of[items[t].k] = b;
    acc += gw; i = j;
  }
  return { of: of, items: items, score: items.reduce(function (m, x) { m[x.k] = x.s; return m; }, {}) };
}
/**
 * River-Spot lösen. o: {oopW, ipW, board, sizes, iters, buckets, heroCombo, heroIsOOP}
 * Gibt Strategie des Helden-Buckets und Kennzahlen zurück.
 */
function solveRiver(o) {
  var B = o.buckets || 10, sizes = o.sizes || [0.75], iters = o.iters || 800, t0 = PT.util.now();
  var wO = Float64Array.from(o.oopW), wI = Float64Array.from(o.ipW);
  if (o.heroCombo != null) { var hw = o.heroIsOOP ? wO : wI; if (!(hw[o.heroCombo] > 0)) hw[o.heroCombo] = 0.02; }
  var bO = bucketize(wO, o.board, B), bI = bucketize(wI, o.board, B);
  var J = [], M = [], i, j;
  for (i = 0; i < B; i++) { J.push(new Float64Array(B)); M.push(new Float64Array(B)); }
  bO.items.forEach(function (x) {
    var a1 = C1[x.k], a2 = C2[x.k], bi = bO.of[x.k];
    bI.items.forEach(function (y) {
      var b1 = C1[y.k], b2 = C2[y.k];
      if (a1 === b1 || a1 === b2 || a2 === b1 || a2 === b2) return;
      var ww = x.w * y.w, bj = bI.of[y.k];
      J[bi][bj] += ww; M[bi][bj] += ww * (x.s > y.s ? 1 : x.s === y.s ? 0.5 : 0);
    });
  });
  var tot = 0;
  for (i = 0; i < B; i++) for (j = 0; j < B; j++) { if (J[i][j] > 0) M[i][j] /= J[i][j]; tot += J[i][j]; }
  if (!(tot > 0)) return null;
  for (i = 0; i < B; i++) for (j = 0; j < B; j++) J[i][j] /= tot;
  var sol = solveMatrix(J, M, sizes, iters);
  var heroB = o.heroCombo != null ? (o.heroIsOOP ? bO.of[o.heroCombo] : bI.of[o.heroCombo]) : -1;
  sol.heroBucket = heroB; sol.buckets = B; sol.sizes = sizes; sol.ms = Math.round(PT.util.now() - t0);
  // Gesamthäufigkeiten (gewichtet)
  var pO = new Float64Array(B), pI = new Float64Array(B);
  for (i = 0; i < B; i++) for (j = 0; j < B; j++) { pO[i] += J[i][j]; pI[j] += J[i][j]; }
  sol.margO = Array.from(pO); sol.margI = Array.from(pI);
  var root = sol.nodes[0], betF = 0;
  for (i = 0; i < B; i++) betF += pO[i] * (1 - root.s[i][0]);
  sol.oopBetFreq = betF;
  return sol;
}

PT.cfr = { buildTree: buildTree, solveMatrix: solveMatrix, solveRiver: solveRiver, bucketize: bucketize };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
