/* PokerTrainer – individuelle Referenzprüfung der Handbewertung (PT.eval.evaluate) gegen tests/ref/handref.js.
   Jede Prüfung vergleicht einzelne Bewertungen bzw. einzelne Paarvergleiche, keine Häufigkeiten. */
'use strict';
const ref = require('./handref.js');

/** Alle 2.598.960 Fünf-Karten-Hände (oder jede stride-te): Klassenbijektion evaluate ↔ Referenz, Kategorie, Ordnung */
function fiveCardAll(E, stride) {
  ref.build();
  stride = stride || 1;
  const s2r = new Int32Array(9 << 20).fill(-1), r2s = new Int32Array(7462).fill(-1), cats = new Array(9).fill(0), a = [0, 0, 0, 0, 0];
  let n = 0, idx = 0, mapBad = 0, catBad = 0, examples = [];
  for (let c0 = 0; c0 < 52; c0++) for (let c1 = c0 + 1; c1 < 52; c1++) for (let c2 = c1 + 1; c2 < 52; c2++) for (let c3 = c2 + 1; c3 < 52; c3++) for (let c4 = c3 + 1; c4 < 52; c4++) {
    if ((idx++ % stride) !== 0) continue;
    a[0] = c0; a[1] = c1; a[2] = c2; a[3] = c3; a[4] = c4;
    const s = E.evaluate(a), r = ref.eval5(c0, c1, c2, c3, c4), cr = ref.category(r);
    n++; cats[cr]++;
    if ((s >> 20) !== cr) { catBad++; if (examples.length < 5) examples.push({ cards: a.slice(), s, r }); }
    if (s2r[s] === -1) s2r[s] = r; else if (s2r[s] !== r) { mapBad++; if (examples.length < 5) examples.push({ cards: a.slice(), s, r, other: s2r[s] }); }
    if (r2s[r] === -1) r2s[r] = s; else if (r2s[r] !== s) { mapBad++; if (examples.length < 5) examples.push({ cards: a.slice(), s, r, otherS: r2s[r] }); }
  }
  let classes = 0, order = 0, prev = -1;
  for (let r = 0; r < 7462; r++) { if (r2s[r] === -1) continue; classes++; if (!(r2s[r] > prev)) order++; prev = r2s[r]; }
  return { hands: n, cats, classes, mapMismatch: mapBad, catMismatch: catBad, orderViolations: order, examples, s2r };
}

// ---------- geschichtete Erzeugung von Händen ----------
function gen(rng) {
  const used = new Uint8Array(52), out = [];
  const ri = n => Math.floor(rng() * n);
  function add(c) { if (used[c]) return false; used[c] = 1; out.push(c); return true; }
  function addRank(r) { for (let t = 0; t < 40; t++) if (add(r * 4 + ri(4))) return true; for (let s = 0; s < 4; s++) if (add(r * 4 + s)) return true; return false; }
  function addRandom(k) { while (k > 0) { if (add(ri(52))) k--; } }
  function distinctRanks(k, excl) { const rs = []; while (rs.length < k) { const r = ri(13); if (rs.indexOf(r) < 0 && (!excl || excl.indexOf(r) < 0)) rs.push(r); } return rs; }
  function ofRank(r, k) { const ss = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = ri(i + 1); const t = ss[i]; ss[i] = ss[j]; ss[j] = t; } for (let i = 0; i < k; i++) add(r * 4 + ss[i]); }
  return { used, out, ri, add, addRank, addRandom, distinctRanks, ofRank };
}
const STRATA = {
  zufall: (rng, n) => { const g = gen(rng); g.addRandom(n); return g.out; },
  flush5: (rng, n) => { const g = gen(rng), s = g.ri(4); g.distinctRanks(5).forEach(r => g.add(r * 4 + s)); g.addRandom(n - 5); return g.out; },
  flush6: (rng, n) => { const g = gen(rng), s = g.ri(4); g.distinctRanks(Math.min(6, n)).forEach(r => g.add(r * 4 + s)); g.addRandom(n - Math.min(6, n)); return g.out; },
  flush7: (rng, n) => { const g = gen(rng), s = g.ri(4); g.distinctRanks(n).forEach(r => g.add(r * 4 + s)); return g.out; },
  strasse: (rng, n) => { const g = gen(rng), h = 3 + g.ri(10); for (let i = 0; i < 5; i++) g.addRank(h === 3 && i === 4 ? 12 : h - i); g.addRandom(n - 5); return g.out; },
  wheel: (rng, n) => { const g = gen(rng); [12, 0, 1, 2, 3].forEach(r => g.addRank(r)); g.addRandom(n - 5); return g.out; },
  straightflush: (rng, n) => { const g = gen(rng), h = 3 + g.ri(10), s = g.ri(4); for (let i = 0; i < 5; i++) g.add((h === 3 && i === 4 ? 12 : h - i) * 4 + s); g.addRandom(n - 5); return g.out; },
  flush_und_strasse: (rng, n) => { const g = gen(rng), h = 4 + g.ri(9), s = g.ri(4);
    for (let i = 0; i < 6 && g.out.length < n; i++) { const r = h === 4 && i === 5 ? 12 : Math.max(0, h - i); if (g.ri(10) < 6) { if (!g.add(r * 4 + s)) g.addRank(r); } else g.addRank(r); }
    g.addRandom(n - g.out.length); return g.out; },
  zwei_drillinge: (rng, n) => { const g = gen(rng), rs = g.distinctRanks(2); rs.forEach(r => g.ofRank(r, 3)); g.addRandom(n - 6); return g.out; },
  drilling_zwei_paare: (rng, n) => { const g = gen(rng), rs = g.distinctRanks(3); g.ofRank(rs[0], 3); g.ofRank(rs[1], 2); if (n >= 7) g.ofRank(rs[2], 2); g.addRandom(n - g.out.length); return g.out; },
  drilling_paar: (rng, n) => { const g = gen(rng), rs = g.distinctRanks(2); g.ofRank(rs[0], 3); g.ofRank(rs[1], 2); g.addRandom(n - 5); return g.out; },
  vierling_drilling: (rng, n) => { const g = gen(rng), rs = g.distinctRanks(2); g.ofRank(rs[0], 4); g.ofRank(rs[1], Math.min(3, n - 4)); g.addRandom(n - g.out.length); return g.out; },
  vierling_paar: (rng, n) => { const g = gen(rng), rs = g.distinctRanks(2); g.ofRank(rs[0], 4); g.ofRank(rs[1], 2); g.addRandom(n - 6); return g.out; },
  vierling: (rng, n) => { const g = gen(rng); g.ofRank(g.ri(13), 4); g.addRandom(n - 4); return g.out; },
  drei_paare: (rng, n) => { const g = gen(rng), rs = g.distinctRanks(3); rs.forEach(r => g.ofRank(r, 2)); g.addRandom(n - 6); return g.out; },
  zwei_paare: (rng, n) => { const g = gen(rng), rs = g.distinctRanks(2); rs.forEach(r => g.ofRank(r, 2)); g.addRandom(n - 4); return g.out; },
  ein_paar: (rng, n) => { const g = gen(rng), p = g.ri(13); g.ofRank(p, 2); g.distinctRanks(n - 2, [p]).forEach(r => g.addRank(r)); return g.out; },
  hoch: (rng, n) => { const g = gen(rng); g.distinctRanks(n).forEach(r => g.addRank(r)); return g.out; }
};

/** Einzelvergleich: evaluate(cards) über die Klassenbijektion s2r gegen die Best-of-Five-Referenz */
function checkHands(E, s2r, strat, nCards, count, rng) {
  const f = STRATA[strat], cats = new Array(9).fill(0); let bad = 0, unknown = 0; const examples = [];
  for (let i = 0; i < count; i++) {
    const c = f(rng, nCards), s = E.evaluate(c), r = ref.evalBest(c), m = s2r[s];
    cats[ref.category(r)]++;
    if (m === -1) unknown++;
    if (m !== r) { bad++; if (examples.length < 3) examples.push({ cards: c.slice(), s, r, m }); }
  }
  return { strat, nCards, count, cats, mismatch: bad, unknownValue: unknown, examples };
}

// ---------- Paarvergleiche mit gemeinsamem Board (Showdown) ----------
const BOARDS = {
  zufall: rng => STRATA.zufall(rng, 5),
  drei_farbe: rng => { const g = gen(rng), s = g.ri(4); g.distinctRanks(3).forEach(r => g.add(r * 4 + s)); g.addRandom(2); return g.out; },
  vier_farbe: rng => { const g = gen(rng), s = g.ri(4); g.distinctRanks(4).forEach(r => g.add(r * 4 + s)); g.addRandom(1); return g.out; },
  fuenf_farbe: rng => STRATA.flush5(rng, 5),
  vier_strasse: rng => { const g = gen(rng), h = 3 + g.ri(10); for (let i = 0; i < 4; i++) g.addRank(h === 3 && i === 3 ? 12 : h - i); g.addRandom(1); return g.out; },
  ass_bis_vier: rng => { const g = gen(rng); [12, 0, 1, 2].forEach(r => g.addRank(r)); g.addRandom(1); return g.out; },
  strasse_board: rng => STRATA.strasse(rng, 5),
  paar_board: rng => { const g = gen(rng), p = g.ri(13); g.ofRank(p, 2); g.distinctRanks(3, [p]).forEach(r => g.addRank(r)); return g.out; },
  zwei_paare_board: rng => STRATA.zwei_paare(rng, 5),
  drilling_board: rng => { const g = gen(rng), t = g.ri(13); g.ofRank(t, 3); g.distinctRanks(2, [t]).forEach(r => g.addRank(r)); return g.out; },
  full_house_board: rng => STRATA.drilling_paar(rng, 5),
  vierling_board: rng => STRATA.vierling(rng, 5)
};
function checkPairs(E, boardKind, count, rng) {
  const f = BOARDS[boardKind]; let bad = 0, ties = 0, refTies = 0; const examples = [];
  for (let i = 0; i < count; i++) {
    const board = f(rng), used = new Uint8Array(52); board.forEach(c => { used[c] = 1; });
    const hole = []; while (hole.length < 4) { const c = Math.floor(rng() * 52); if (!used[c]) { used[c] = 1; hole.push(c); } }
    const a = [hole[0], hole[1]].concat(board), b = [hole[2], hole[3]].concat(board);
    const se = Math.sign(E.evaluate(a) - E.evaluate(b)), sr = Math.sign(ref.evalBest(a) - ref.evalBest(b));
    if (se === 0) ties++; if (sr === 0) refTies++;
    if (se !== sr) { bad++; if (examples.length < 3) examples.push({ a, b, se, sr }); }
  }
  return { board: boardKind, count, mismatch: bad, ties, refTies, examples };
}
/** Paarvergleiche zweier unabhängiger Hände derselben Schicht (z. B. Full House gegen Full House) */
function checkPairsSame(E, strat, count, rng) {
  const f = STRATA[strat]; let bad = 0, ties = 0;
  for (let i = 0; i < count; i++) {
    const a = f(rng, 7), b = f(rng, 7);
    const se = Math.sign(E.evaluate(a) - E.evaluate(b)), sr = Math.sign(ref.evalBest(a) - ref.evalBest(b));
    if (sr === 0) ties++;
    if (se !== sr) bad++;
  }
  return { strat, count, mismatch: bad, ties };
}

// ---------- Invarianzen ----------
function permsOf(n) { const out = []; (function rec(p, rest) { if (!rest.length) { out.push(p); return; } rest.forEach((x, i) => rec(p.concat([x]), rest.slice(0, i).concat(rest.slice(i + 1)))); })([], Array.from({ length: n }, (_, i) => i)); return out; }
const P7 = permsOf(7), S24 = permsOf(4);
/** Permutationsinvarianz: alle 5.040 Reihenfolgen (full) oder k zufällige je Hand */
function checkPermutations(E, strat, count, k, rng) {
  const f = STRATA[strat]; let bad = 0, evals = 0;
  for (let i = 0; i < count; i++) {
    const c = f(rng, 7), s = E.evaluate(c), x = new Array(7);
    const list = k >= 5040 ? P7 : null, m = list ? list.length : k;
    for (let j = 0; j < m; j++) { const p = list ? list[j] : P7[Math.floor(rng() * 5040)]; for (let q = 0; q < 7; q++) x[q] = c[p[q]]; evals++; if (E.evaluate(x) !== s) bad++; }
  }
  return { strat, count, perHand: k >= 5040 ? 5040 : k, evals, mismatch: bad };
}
/** Farbinvarianz: alle 24 Vertauschungen der vier Farben, Engine und Referenz */
function checkSuits(E, strat, count, rng) {
  const f = STRATA[strat]; let bad = 0, refBad = 0, evals = 0;
  for (let i = 0; i < count; i++) {
    const c = f(rng, 7), s = E.evaluate(c), r = ref.evalBest(c), x = new Array(7);
    for (const p of S24) { for (let q = 0; q < 7; q++) x[q] = (c[q] & ~3) | p[c[q] & 3]; evals++; if (E.evaluate(x) !== s) bad++; if (ref.evalBest(x) !== r) refBad++; }
  }
  return { strat, count, evals, mismatch: bad, refMismatch: refBad };
}

module.exports = { fiveCardAll, STRATA, BOARDS, checkHands, checkPairs, checkPairsSame, checkPermutations, checkSuits };
