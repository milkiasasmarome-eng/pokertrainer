/* Vergleichsrahmen: Block-Bootstrap für BB/100 und gepaarte Differenzen.
   Eingabe: je Lauf die Summen in BB je 100 aufeinanderfolgende Hände (blocks). Ein Bootstrap-Block umfasst L Hände
   (Vielfaches von 100, aufeinanderfolgend); gezogen wird mit Zurücklegen innerhalb jedes Laufs (geschichtet), damit
   jeder Lauf (Seed/Bedingung) mit seiner Handzahl eingeht. Kennzahl: Summe aller Ergebnisse / Hände · 100. */
'use strict';
function makeRng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
/** runs: [{blocks: [Summe je 100 Hände], hands}], L: Blocklänge in Händen. Liefert {bb100, lo, hi, se, n, blocks} */
function blockBootstrap(runs, L, B, seed, ths) {
  L = L || 500; B = B || 2000;
  const k = Math.max(1, Math.round(L / 100));
  const strata = runs.map(r => {
    const bl = [], hs = [];
    for (let i = 0; i < r.blocks.length; i += k) {
      let s = 0, n = 0;
      for (let j = i; j < Math.min(i + k, r.blocks.length); j++) { s += r.blocks[j]; n += (j === r.blocks.length - 1 && r.partialLast) ? r.partialLast : 100; }
      bl.push(s); hs.push(n);
    }
    return { bl, hs };
  }).filter(s => s.bl.length);
  let tot = 0, hands = 0; strata.forEach(s => { s.bl.forEach(x => { tot += x; }); s.hs.forEach(x => { hands += x; }); });
  const est = hands ? tot / hands * 100 : 0, rng = makeRng(seed || 12345), reps = new Float64Array(B);
  for (let b = 0; b < B; b++) {
    let S = 0, N = 0;
    strata.forEach(st => { const m = st.bl.length; for (let i = 0; i < m; i++) { const j = Math.floor(rng() * m); S += st.bl[j]; N += st.hs[j]; } });
    reps[b] = N ? S / N * 100 : 0;
  }
  const sorted = Array.from(reps).sort((a, b) => a - b), mean = sorted.reduce((s, x) => s + x, 0) / B;
  const sd = Math.sqrt(sorted.reduce((s, x) => s + (x - mean) * (x - mean), 0) / (B - 1));
  const q = p => sorted[Math.min(B - 1, Math.max(0, Math.floor(p * B)))];
  // 2.3: einseitige p-Werte P(Wiederholung ≤ Schwelle) für Nichtunterlegenheitstests (ths: Liste von Schwellen in BB/100)
  const pLE = {}; (ths || []).forEach(t => { let c = 0; for (let i = 0; i < B; i++) if (sorted[i] <= t) c++; pLE[t] = c / B; });
  return { bb100: est, lo: q(0.025), hi: q(0.975), se: sd, hands, nBlocks: strata.reduce((s, x) => s + x.bl.length, 0), blockHands: k * 100, reps: B, pLE };
}
/** Gepaarte Differenz zweier Läufe mit gleichen Seeds und Handnummern: Block für Block A − B */
function pairRuns(a, b) {
  const n = Math.min(a.blocks.length, b.blocks.length), blocks = [];
  for (let i = 0; i < n; i++) blocks.push(a.blocks[i] - b.blocks[i]);
  return { blocks, hands: Math.min(a.hands, b.hands), partialLast: a.hands === b.hands ? a.partialLast : undefined };
}
/** Standardabweichung je Hand (BB) aus Summe und Quadratsumme */
function perHandSd(r, adj) { const s = adj ? r.sumBBAdj : r.sumBB, q = adj ? r.sumSqAdj : r.sumSq, n = r.hands; return n > 1 ? Math.sqrt(Math.max(0, (q - s * s / n) / (n - 1))) : null; }
module.exports = { blockBootstrap, pairRuns, perHandSd, makeRng };
