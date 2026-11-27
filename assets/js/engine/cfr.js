/* PokerTrainer 2.0 – Begrenztes spieltheoretisches Modell: River-Spiel mit CFR+.
   Vereinfachungen (bewusst): nur River, ein Spieler out of Position (OOP) und einer in Position (IP),
   eine oder zwei Betgrößen, höchstens ein Raise (Pot-Raise, optional), Hände in Stärkegruppen (Buckets) zusammengefasst,
   Ranges stammen aus dem Range-Modell der App. Ergebnis: Gleichgewicht dieses Modellspiels,
   kein vollständiger Solver für No-Limit Hold'em. Exploitability wird mitgeliefert. */
(function (G) {
'use strict';
var PT = G.PT, H = PT.hands, E = PT.eval;
var NC = H.NC, C1 = H.C1, C2 = H.C2;

/**
 * Baum (Pot = 1, Einsätze in Pot-Anteilen):
 *   OOP: check | bet s
 *     nach bet s → IP: fold | call | (raise R)       nach raise → OOP: fold | call
 *     nach check → IP: check | bet s → OOP: fold | call | (raise R)   nach Check-Raise → IP: fold | call
 * opts.raise: false (Standard, wie 2.0.1), 'ip', 'oop' oder true (beide). Raise = Pot-Raise auf 1 + 3s, begrenzt durch opts.stack
 * (effektiver Reststack in Pot-Anteilen). Einsätze größer als der Stack werden zum All-in zusammengefasst.
 */
function buildTree(sizes, opts) {
  opts = opts || {};
  var S = opts.stack != null && opts.stack > 0 ? opts.stack : Infinity, ra = opts.raise;
  var ipR = ra === true || ra === 'ip', oopR = ra === true || ra === 'oop';
  var sz = []; sizes.forEach(function (x) { var y = Math.min(x, S); if (y > 0 && sz.indexOf(y) < 0) sz.push(y); });
  function rTo(s) { var to = Math.min(1 + 3 * s, S); return to > s + 1e-9 ? Math.round(to * 1000) / 1000 : null; }
  var root = { p: 0, name: 'OOP', acts: ['check'].concat(sz.map(function (s) { return 'bet' + s; })), kids: [] };
  var chk = { p: 1, name: 'IP nach Check', acts: ['check'].concat(sz.map(function (s) { return 'bet' + s; })), kids: [] };
  root.kids.push(chk);
  sz.forEach(function (s) {
    var r = ipR ? rTo(s) : null, n = { p: 1, name: 'IP gegen Bet ' + s, acts: ['fold', 'call'], kids: [{ term: 'fold', folder: 1, lost: 0 }, { term: 'sd', inv: s }] };
    if (r) { n.acts.push('raise' + r); n.kids.push({ p: 0, name: 'OOP gegen Raise ' + s, acts: ['fold', 'call'], kids: [{ term: 'fold', folder: 0, lost: s }, { term: 'sd', inv: r }] }); }
    root.kids.push(n);
  });
  chk.kids.push({ term: 'sd', inv: 0 });
  sz.forEach(function (s) {
    var r = oopR ? rTo(s) : null, n = { p: 0, name: 'OOP gegen Bet ' + s, acts: ['fold', 'call'], kids: [{ term: 'fold', folder: 0, lost: 0 }, { term: 'sd', inv: s }] };
    if (r) { n.acts.push('raise' + r); n.kids.push({ p: 1, name: 'IP gegen Check-Raise ' + s, acts: ['fold', 'call'], kids: [{ term: 'fold', folder: 1, lost: s }, { term: 'sd', inv: r }] }); }
    chk.kids.push(n);
  });
  var list = [];
  (function index(n) { if (n.term) return; n.id = list.length; list.push(n); n.kids.forEach(index); })(root);
  return { root: root, nodes: list, sizes: sz };
}
/** Nutzen für OOP an einem Endknoten (Grundlinie: jeder „besitzt“ den halben Pot): Fold → ±(0,5 + verlorener Einsatz), Showdown → M·(1 + 2·inv) − inv − 0,5 */
function termUtil(n, m) {
  if (n.term === 'fold') return n.folder === 1 ? 0.5 + (n.lost || 0) : -0.5 - (n.lost || 0);
  return m * (1 + 2 * n.inv) - n.inv - 0.5;
}

/**
 * Löst das Matrixspiel. J[i][j]: gemeinsame Wahrscheinlichkeit der Buckets (OOP i, IP j), M[i][j]: Equity OOP.
 * iters: CFR+-Iterationen. Gibt Durchschnittsstrategie, Spielwert und Exploitability (in Pot-Anteilen) zurück.
 */
function solveMatrix(J, M, sizes, iters, opts) {
  var BO = J.length, BI = J[0].length, T = buildTree(sizes, opts), nodes = T.nodes;
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
      var u = termUtil(n, M[i][j]);
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
  var done = iters, aborted = false;
  for (var t = 1; t <= iters; t++) {
    walk(T.root, oneO, oneI, 0, false, -1, t); walk(T.root, oneO, oneI, 1, false, -1, t);
    // Zeitgrenze: nach mindestens 50 Iterationen abbrechen dürfen; Exploitability wird für die erreichte Iteration ehrlich ausgewiesen
    if (opts && opts.deadline && t >= 50 && (t & 15) === 0 && PT.util.now() > opts.deadline) { done = t; aborted = true; break; }
  }
  function sumv(v) { var s = 0; for (var i = 0; i < v.length; i++) s += v[i]; return s; }
  var val = walk(T.root, oneO, oneI, -1, true, -1, 0), gameV = sumv(val.vO);
  var brO = sumv(walk(T.root, oneO, oneI, -1, true, 0, 0).vO), brI = sumv(walk(T.root, oneO, oneI, -1, true, 1, 0).vI);
  var expl = (brO + brI) / 2; // ≥ 0; 0 im exakten Gleichgewicht (Einheit: Pot)
  var avgStrat = nodes.map(function (n) { var B = n.p === 0 ? BO : BI, out = []; for (var b = 0; b < B; b++) out.push(Array.from(strat(n, b, true))); return { name: n.name, p: n.p, acts: n.acts, s: out }; });
  return { value: gameV, exploitability: expl, nodes: avgStrat, iters: done, aborted: aborted, brO: brO, brI: brI, tree: T };
}
/**
 * Unabhängige Prüfung: Wert und Best-Response-Werte fester Strategien (je Knoten-Name und Bucket eine Verteilung) in einem Spiel J/M.
 * strat(nodeName, player, bucket) → Array der Wahrscheinlichkeiten; fehlende Knoten (z. B. Raise-Knoten) → erste Aktion des Knotens mit
 * Wahrscheinlichkeit 1, außer der Knoten bietet „fold“/„call“ und „call“ ist vorgegeben (opts.defaultAct).
 * Rechnet je Bucket rekursiv (kein Regret-Code), damit sie die CFR-Implementierung nicht wiederverwendet.
 */
function evaluate(J, M, sizes, opts, strat) {
  var T = buildTree(sizes, opts), BO = J.length, BI = J[0].length;
  function sOf(n, b) { var x = strat(n.name, n.p, b, n.acts); if (!x) { x = n.acts.map(function () { return 0; }); x[n.acts.indexOf('call') >= 0 && n.acts[0] === 'fold' ? n.acts.indexOf('call') : 0] = 1; } return x; }
  // Wert für OOP-Bucket i gegen IP-Bucket j, beide spielen ihre Strategie (oder ein Spieler die beste Antwort je eigenem Bucket)
  function val(n, i, j) { if (n.term) return termUtil(n, M[i][j]); var s = sOf(n, n.p === 0 ? i : j), v = 0; for (var a = 0; a < n.acts.length; a++) if (s[a] > 0) v += s[a] * val(n.kids[a], i, j); return v; }
  var game = 0, i, j;
  for (i = 0; i < BO; i++) for (j = 0; j < BI; j++) if (J[i][j]) game += J[i][j] * val(T.root, i, j);
  // Best Response OOP: je Bucket i Maximum über eigene Aktionen in jedem eigenen Knoten (Gegenstrategie fest)
  function brO(n, i, w) { // w[j]: Gewicht des IP-Buckets j auf diesem Pfad
    if (n.term) { var u = 0; for (var j2 = 0; j2 < BI; j2++) if (w[j2]) u += w[j2] * termUtil(n, M[i][j2]); return u; }
    if (n.p === 0) { var best = -Infinity; for (var a = 0; a < n.acts.length; a++) best = Math.max(best, brO(n.kids[a], i, w)); return best; }
    var tot = 0; for (var a2 = 0; a2 < n.acts.length; a2++) { var w2 = new Float64Array(BI), any = false; for (var j3 = 0; j3 < BI; j3++) { w2[j3] = w[j3] * sOf(n, j3)[a2]; if (w2[j3]) any = true; } if (any) tot += brO(n.kids[a2], i, w2); }
    return tot;
  }
  function brI(n, j, w) {
    if (n.term) { var u = 0; for (var i2 = 0; i2 < BO; i2++) if (w[i2]) u -= w[i2] * termUtil(n, M[i2][j]); return u; }
    if (n.p === 1) { var best = -Infinity; for (var a = 0; a < n.acts.length; a++) best = Math.max(best, brI(n.kids[a], j, w)); return best; }
    var tot = 0; for (var a2 = 0; a2 < n.acts.length; a2++) { var w2 = new Float64Array(BO), any = false; for (var i3 = 0; i3 < BO; i3++) { w2[i3] = w[i3] * sOf(n, i3)[a2]; if (w2[i3]) any = true; } if (any) tot += brI(n.kids[a2], j, w2); }
    return tot;
  }
  var bO = 0, bI = 0;
  for (i = 0; i < BO; i++) { var wi = new Float64Array(BI); for (j = 0; j < BI; j++) wi[j] = J[i][j]; bO += brO(T.root, i, wi); }
  for (j = 0; j < BI; j++) { var wj = new Float64Array(BO); for (i = 0; i < BO; i++) wj[i] = J[i][j]; bI += brI(T.root, j, wj); }
  return { value: game, brO: bO, brI: bI, exploitability: (bO + bI) / 2 };
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
 * River-Spot lösen. o: {oopW, ipW, board, sizes, iters, buckets, heroCombo, heroIsOOP, raise, stack}
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
  var sol = solveMatrix(J, M, sizes, iters, { raise: o.raise || false, stack: o.stack, deadline: o.deadline });
  sol.J = o.keepMatrix ? J : undefined; sol.M = o.keepMatrix ? M : undefined; sol.bO = o.keepMatrix ? bO : undefined; sol.bI = o.keepMatrix ? bI : undefined;
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

PT.cfr = { buildTree: buildTree, solveMatrix: solveMatrix, solveRiver: solveRiver, bucketize: bucketize, evaluate: evaluate, termUtil: termUtil };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
