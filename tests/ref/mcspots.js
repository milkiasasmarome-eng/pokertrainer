/* PokerTrainer – Referenzfälle für die Monte-Carlo-Prüfung (Abdeckung, Verzerrung) mit exakter Enumeration
   über die unabhängige Handbewertung tests/ref/handref.js. Alle Fälle sind reproduzierbar (feste Karten und Gewichte). */
'use strict';
const ref = require('./handref.js');

function make(PT) {
  const H = PT.hands, R = PT.ranges, NC = H.NC, C = s => PT.parseCards(s);
  const W = [1, 0.5, 0.25, 0.75];
  function rangeOf(list, weighted) {
    const w = new Float64Array(NC);
    list.forEach((s, i) => { const c = C(s); if (!c || c.length !== 2) throw new Error('Kombination ' + s); w[H.comboIdx(c[0], c[1])] = weighted ? W[i % 4] : 1; });
    return w;
  }
  /** alle Kombinationen der angegebenen Klassen (z. B. 'AA', 'AKs', 'AKo', 'AK') */
  function classes(names, weight) {
    const w = new Float64Array(NC);
    names.forEach(n => { const forms = n.length === 2 && n[0] !== n[1] ? [n + 's', n + 'o'] : [n]; forms.forEach(f => { const idx = H.nameToIdx(f); for (let k = 0; k < NC; k++) if (H.CLS[k] === idx) w[k] = weight || 1; }); });
    return w;
  }
  function band(lo, hi) { return R.band(lo, hi, 1, 0.02); }
  const spots = [
    { id: 'hu-flop-toppair', name: 'HU Flop, Top Pair gegen Top 30 %', hero: 'AhKd', board: 'Ks8c3d', ranges: () => [band(0, 0.3)], group: 'HU Flop' },
    { id: 'hu-flop-flushdraw', name: 'HU Flop, Flushdraw gegen Top 50 %', hero: 'AhQh', board: 'Th7h2c', ranges: () => [band(0, 0.5)], group: 'HU Flop' },
    { id: 'hu-flop-set', name: 'HU Flop, Set gegen Overpairs (nahe 1)', hero: '8s8d', board: '8c5h2s', ranges: () => [classes(['AA', 'KK', 'QQ', 'JJ'])], group: 'HU Flop' },
    { id: 'hu-flop-runner', name: 'HU Flop, Runner-Runner (nahe 0)', hero: '7c2d', board: 'AhAsKd', ranges: () => [classes(['AK', 'KK'])], group: 'HU Flop' },
    { id: 'hu-turn-gutshot', name: 'HU Turn, Gutshot (~9 %)', hero: 'QcJd', board: 'AhKd9s4c', ranges: () => [rangeOf(['AsAd', 'KsKc', '9h9c', '4h4d', 'AcKc', 'Ad9d', 'Kh9h'])], group: 'HU Turn' },
    { id: 'hu-turn-2outs', name: 'HU Turn, 2 Outs (~2,6 %)', hero: '7c7d', board: 'AhKd9s4c', ranges: () => [rangeOf(['AsAd', 'KsKc', '9h9c', '4h4d', 'AcKc', 'Ad9d', 'Kh9h'])], group: 'HU Turn' },
    { id: 'hu-turn-vorn', name: 'HU Turn, Held klar vorn (~0,99)', hero: 'AsAd', board: 'AhKd9s4c', ranges: () => [rangeOf(['AcQs', 'AcJc', 'KsKc', 'QdTd', 'QhQs', 'KcQc', '9h9c', 'Ks4s', 'JhJs', 'KhQh', '8c8d', 'Th8h'])], group: 'HU Turn' },
    { id: 'hu-turn-tot', name: 'HU Turn, Held ohne Outs (exakt 0)', hero: '7c2d', board: 'AhKd9s4c', ranges: () => [rangeOf(['AsQs', 'AcJc', 'KsKc', 'AdTd', 'QhQs', 'AcKc', '9h9c', 'Ks4s', 'AsAd', 'KhQh', '8c8d', 'Ac7d'])], group: 'Rand' },
    { id: 'hu-turn-split', name: 'HU Turn, Split-lastig (Nut Straight, seltene Verluste)', hero: 'Ac2d', board: 'TsJdQcKh', ranges: () => { const w = classes(['A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9']); const p = classes(['TT', 'JJ', 'QQ', 'KK']); const x = classes(['98', '87', '76'], 0.5); for (let k = 0; k < NC; k++) w[k] = Math.max(w[k], p[k], x[k]); return [w]; }, group: 'Split' },
    { id: 'hu-river-mix', name: 'HU River, gewichtete Range mit Splits', hero: 'QcJd', board: 'Qh8d5s3c2h', ranges: () => [rangeOf(['AsQs', 'KcQd', 'QsJs', 'JcJh', 'TdTs', '9h9c', '8s7s', 'AhKh', 'QdJh', 'Js9s', '6c6d', '4c4d'], true)], group: 'HU River' },
    { id: 'hu-river-board', name: 'HU River, Board spielt meist (Split-lastig)', hero: 'Ad2c', board: 'Ts9d8h7c6s', ranges: () => { const w = classes(['A3', 'A4', 'A5', 'K2', 'K3', 'K4', 'Q2', 'Q3']); const j = classes(['J2', 'J3'], 0.5); for (let k = 0; k < NC; k++) w[k] = Math.max(w[k], j[k]); return [w]; }, group: 'Split' },
    { id: 'mw-turn-gutshot', name: '2 Gegner Turn, Gutshot', hero: 'QcJd', board: 'AhKd9s4c', ranges: () => [rangeOf(['AsAd', 'KsKc', '9h9c', 'AcQs']), rangeOf(['4h4d', 'AcKc', 'Ad9d', 'Kh9h', 'AsJs'])], group: 'Multiway' },
    { id: 'mw-turn-tot', name: '2 Gegner Turn, Held ohne Outs (exakt 0)', hero: '7c2d', board: 'AhKd9s4c', ranges: () => [rangeOf(['AsQs', 'AcJc', 'KsKc', 'AdTd', 'QhQs', 'AcKc', '9h9c']), rangeOf(['Ks4s', 'AsAd', 'KhQh', '8c8d', 'Ac7d', 'QsJs', 'TcTd'])], group: 'Rand' },
    { id: 'mw-river-mitte', name: '2 Gegner River, ausgeglichen', hero: 'QcJd', board: 'Qh8d5s3c2h', ranges: () => [rangeOf(['AsQs', 'KcQd', 'JcJh', 'TdTs', '9h9c', '8s7s', 'AhKh', '6c6d']), rangeOf(['AcAd', 'Qs9s', 'JsTs', '8h8c', '5c5d', 'Kd9d', '7h6h', '4c4d'])], group: 'Multiway' },
    { id: 'mw-river-3gew', name: '3 Gegner River, gewichtete Ranges', hero: 'AsKs', board: 'Kd9h5c3s2d', ranges: () => [rangeOf(['AcKc', 'KhQh', 'KcJc', '9c9d', 'AhAd', 'QsQd'], true), rangeOf(['5h5d', '3h3d', 'Ah9s', 'KcTc', 'JhJs', 'Tc9c'], true), rangeOf(['4h4c', '6h4h', 'AdQd', 'QhJh', '8h8d', 'Kh5h'], true)], group: 'Multiway' },
    { id: 'mw-turn-konflikt', name: '2 Gegner Turn, gewichtet mit Kartenüberschneidung', hero: 'JhTh', board: 'Qh9c2h4d', ranges: () => [rangeOf(['AhKh', 'AhAs', 'KsKc', 'QsQd', 'AsQs', 'KhQc', 'Ah9h', 'Ks9s'], true), rangeOf(['AhAs', 'AsKs', 'KsKc', 'QcQd', 'KhQc', 'Ad9d', 'AhQs', '9s9d'], true)], group: 'Multiway' },
    { id: 'mw-flop-klein', name: '2 Gegner Flop, kleine Ranges', hero: 'JhTh', board: '9h8c2h', ranges: () => [rangeOf(['AsAd', 'KsKc', 'AhAc', 'QdQc']), rangeOf(['9s9d', 'Ah9c', 'AdKd', 'Qh9s', 'KcKd'])], group: 'Multiway' },
    { id: 'mw-turn-vorn', name: '3 Gegner Turn, Held nahe 1', hero: '9s9d', board: '9h5c2dKs', ranges: () => [rangeOf(['AsKd', 'KhQh', 'KcJc', 'AhAd']), rangeOf(['5h5d', 'QcQd', 'Ac5s', 'JhJs']), rangeOf(['4h3h', '6h4h', 'AdQs', 'TsTc'])], group: 'Multiway' },
    { id: 'mw-river-konstant', name: '2 Gegner River, Board spielt immer (konstant 1/3)', hero: '3c2d', board: 'AhKdQcJsTd', ranges: () => [rangeOf(['4h4d', '5c6c', '7h8h', '9c9h']), rangeOf(['4s4c', '5s6s', '7d8d', '3h3s'])], group: 'Konstant' },
    { id: 'pf-aa-kk', name: 'Preflop AA gegen KK', hero: 'AhAd', board: '', ranges: () => [rangeOf(['KsKc'])], group: 'Preflop' },
    { id: 'pf-72-aa', name: 'Preflop 72o gegen AA (~0,12)', hero: '7c2d', board: '', ranges: () => [rangeOf(['AhAs'])], group: 'Preflop' }
  ];
  /** exakte Equity mit der unabhängigen Referenzbewertung: alle konfliktfreien Gegner-Tupel (Gewicht Π w) × alle Runouts */
  function exactRef(sp) {
    ref.build();
    const hero = C(sp.hero), board = sp.board ? C(sp.board) : [], ranges = sp.ranges(), dead = new Uint8Array(52);
    hero.concat(board).forEach(c => { dead[c] = 1; });
    const lists = ranges.map(w => { const l = []; for (let k = 0; k < NC; k++) if (w[k] > 0 && !dead[H.C1[k]] && !dead[H.C2[k]]) l.push([H.C1[k], H.C2[k], w[k]]); return l; });
    const need = 5 - board.length, used = new Uint8Array(52), holes = [];
    let sw = 0, se = 0, tuples = 0, runoutsTotal = 0;
    const hc = new Array(7), oc = new Array(7), rest = [];
    function evalTuple(wt) {
      rest.length = 0; for (let c = 0; c < 52; c++) if (!dead[c] && !used[c]) rest.push(c);
      let s = 0, n = 0; const L = rest.length, bd = board.slice();
      const one = () => {
        for (let i = 0; i < 5; i++) hc[2 + i] = bd[i];
        hc[0] = hero[0]; hc[1] = hero[1]; const h0 = ref.evalBest(hc);
        let lose = false, tie = 0;
        for (const o of holes) { oc[0] = o[0]; oc[1] = o[1]; for (let i = 0; i < 5; i++) oc[2 + i] = bd[i]; const v = ref.evalBest(oc); if (v > h0) { lose = true; break; } if (v === h0) tie++; }
        s += lose ? 0 : 1 / (1 + tie); n++;
      };
      (function rec(start, depth) {
        if (depth === need) { one(); return; }
        for (let i = start; i < L; i++) { bd.push(rest[i]); rec(i + 1, depth + 1); bd.pop(); }
      })(0, 0);
      sw += wt; se += wt * s / n; tuples++; runoutsTotal += n;
    }
    (function rec(j, wt) {
      if (j === lists.length) { evalTuple(wt); return; }
      for (const [a, b, x] of lists[j]) { if (used[a] || used[b]) continue; used[a] = used[b] = 1; holes.push([a, b]); rec(j + 1, wt * x); holes.pop(); used[a] = used[b] = 0; }
    })(0, 1);
    return { eq: se / sw, tuples, runouts: runoutsTotal };
  }
  function inputs(sp) { return { hero: C(sp.hero), board: sp.board ? C(sp.board) : [], ranges: sp.ranges() }; }
  return { spots, exactRef, inputs };
}
// Konfigurationen je Analysestufe (Budget wie beim automatischen Tipp: Mehrgegner-Anteil 1.200, Preflop Heads-up 1.000)
const CONFIGS = [
  { id: 'schnell', level: 'schnell' },
  { id: 'standard', level: 'standard' },
  { id: 'praezise', level: 'praezise' },
  { id: 'tief', level: 'tief' },
  { id: 'standard-budget1000', level: 'standard', budget: 1000 },
  { id: 'schnell-budget300', level: 'schnell', budget: 300 }
];
// Vorab festgelegte Toleranzen (vor dem ersten Lauf dokumentiert in docs/VALIDIERUNG_MATHE.md)
const TOL = { aggLo: 0.93, aggHi: 0.975, spotLo: 0.90, zMax: 3.5 };
module.exports = { make, CONFIGS, TOL };
