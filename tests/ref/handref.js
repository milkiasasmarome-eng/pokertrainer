/* PokerTrainer – unabhängige Referenz der Handbewertung (nur Tests).
   Algorithmus: konstruktive Aufzählung aller 7.462 Äquivalenzklassen der Fünf-Karten-Hände in absteigender Stärke
   direkt aus den Pokerregeln (geschachtelte Schleifen je Kategorie), Zuordnung einer Hand zu ihrer Klasse über die
   Multimenge der Ränge (absteigend sortiertes Rangtupel) und ein Flush-Bit; Sieben Karten = bestes der 21 Fünfer-Blätter.
   Teilt mit der Engine nur die Kartenkodierung (0..51 = Rang·4 + Farbe, Rang 0 = Zwei, 12 = Ass).
   Unabhängig von evaluator.js: weder Bitmasken (evaluate) noch Vergleichsfunktion über Gruppenformen (eval5Ref). */
'use strict';

const CAT_NAMES = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'];
const KEYS = 13 * 13 * 13 * 13 * 13 * 2;
let TABLE = null;

/** Rangfolgen der zehn Straßen, höchste zuerst; jede als absteigendes Rangtupel (Wheel: A 5 4 3 2 → [12,3,2,1,0]) */
function straightTuples() {
  const out = [];
  for (let h = 12; h >= 4; h--) out.push([h, h - 1, h - 2, h - 3, h - 4]);
  out.push([12, 3, 2, 1, 0]);
  return out;
}
/** alle Mengen aus fünf verschiedenen Rängen, absteigend lexikografisch (stärkste zuerst) */
function fiveDistinct() {
  const out = [];
  for (let a = 12; a >= 4; a--) for (let b = a - 1; b >= 3; b--) for (let c = b - 1; c >= 2; c--) for (let d = c - 1; d >= 1; d--) for (let e = d - 1; e >= 0; e--) out.push([a, b, c, d, e]);
  return out;
}
function keyOf(desc, flush) { return ((((desc[0] * 13 + desc[1]) * 13 + desc[2]) * 13 + desc[3]) * 13 + desc[4]) * 2 + (flush ? 1 : 0); }

/** Baut die geordnete Klassenliste (stärkste zuerst) und die Zuordnungstabelle Schlüssel → Stärke (0 = schwächste) */
function build() {
  if (TABLE) return TABLE;
  const classes = [];   // {cat, tuple (Regelreihenfolge), flush}
  const st = straightTuples(), stKeys = new Set(st.map(t => t.join(',')));
  const isStraight = t => stKeys.has(t.join(','));
  // 8 Straight Flush
  st.forEach(t => classes.push({ cat: 8, tuple: t, flush: true }));
  // 7 Vierling: Vierlingsrang, dann Kicker
  for (let q = 12; q >= 0; q--) for (let k = 12; k >= 0; k--) if (k !== q) classes.push({ cat: 7, tuple: [q, q, q, q, k], flush: false });
  // 6 Full House: Drillingsrang, dann Paarrang
  for (let t = 12; t >= 0; t--) for (let p = 12; p >= 0; p--) if (p !== t) classes.push({ cat: 6, tuple: [t, t, t, p, p], flush: false });
  // 5 Flush: fünf verschiedene Ränge ohne Straße
  fiveDistinct().forEach(t => { if (!isStraight(t)) classes.push({ cat: 5, tuple: t, flush: true }); });
  // 4 Straße
  st.forEach(t => classes.push({ cat: 4, tuple: t, flush: false }));
  // 3 Drilling: Drillingsrang, dann zwei Kicker absteigend
  for (let t = 12; t >= 0; t--) for (let a = 12; a >= 0; a--) for (let b = a - 1; b >= 0; b--) if (a !== t && b !== t) classes.push({ cat: 3, tuple: [t, t, t, a, b], flush: false });
  // 2 Two Pair: höheres Paar, niedrigeres Paar, Kicker
  for (let p = 12; p >= 0; p--) for (let q = p - 1; q >= 0; q--) for (let k = 12; k >= 0; k--) if (k !== p && k !== q) classes.push({ cat: 2, tuple: [p, p, q, q, k], flush: false });
  // 1 Paar: Paarrang, dann drei Kicker absteigend
  for (let p = 12; p >= 0; p--) for (let a = 12; a >= 0; a--) for (let b = a - 1; b >= 0; b--) for (let c = b - 1; c >= 0; c--) if (a !== p && b !== p && c !== p) classes.push({ cat: 1, tuple: [p, p, a, b, c], flush: false });
  // 0 Höchste Karte
  fiveDistinct().forEach(t => { if (!isStraight(t)) classes.push({ cat: 0, tuple: t, flush: false }); });
  const N = classes.length, map = new Int16Array(KEYS).fill(-1), cat = new Int8Array(N);
  classes.forEach((c, i) => {
    const strength = N - 1 - i, desc = c.tuple.slice().sort((x, y) => y - x), k = keyOf(desc, c.flush);
    if (map[k] !== -1) throw new Error('Referenz: doppelte Klasse ' + c.tuple.join(','));
    map[k] = strength; cat[strength] = c.cat; c.strength = strength;
  });
  const perCat = new Array(9).fill(0); classes.forEach(c => perCat[c.cat]++);
  TABLE = { map, cat, N, classes, perCat };
  return TABLE;
}

const R5 = new Int32Array(5);
/** Stärke (0..7461) genau fünf verschiedener Karten */
function eval5(c0, c1, c2, c3, c4) {
  const T = TABLE || build();
  R5[0] = c0 >> 2; R5[1] = c1 >> 2; R5[2] = c2 >> 2; R5[3] = c3 >> 2; R5[4] = c4 >> 2;
  // Einfügesortierung absteigend
  for (let i = 1; i < 5; i++) { const x = R5[i]; let j = i - 1; while (j >= 0 && R5[j] < x) { R5[j + 1] = R5[j]; j--; } R5[j + 1] = x; }
  const s = c0 & 3, flush = (c1 & 3) === s && (c2 & 3) === s && (c3 & 3) === s && (c4 & 3) === s;
  const v = T.map[((((R5[0] * 13 + R5[1]) * 13 + R5[2]) * 13 + R5[3]) * 13 + R5[4]) * 2 + (flush ? 1 : 0)];
  if (v < 0) throw new Error('Referenz: unmögliche Hand');
  return v;
}
// Indizes der 21 Fünfer-Teilmengen von sieben Karten (6 bzw. 1 für sechs/fünf Karten werden allgemein erzeugt)
const SUBSETS = {};
function subsets(n) {
  if (SUBSETS[n]) return SUBSETS[n];
  const out = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) out.push(a, b, c, d, e);
  return (SUBSETS[n] = Int8Array.from(out));
}
/** Stärke der besten Fünfer-Kombination aus 5 bis 7 Karten */
function evalBest(cards) {
  const S = subsets(cards.length); let best = -1;
  for (let i = 0; i < S.length; i += 5) {
    const v = eval5(cards[S[i]], cards[S[i + 1]], cards[S[i + 2]], cards[S[i + 3]], cards[S[i + 4]]);
    if (v > best) best = v;
  }
  return best;
}
function category(strength) { return (TABLE || build()).cat[strength]; }

module.exports = { build, eval5, evalBest, category, CAT_NAMES, keyOf };
