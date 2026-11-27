/* 2.3 (Arbeitspaket 3): Referenzwerte der Konsistenz „Stärke aggressiver − passiver Aktionen“ aus aufgedeckten Blättern.
   Aufruf: node tests/strategy/fit-hybrid.js <comp> <Hände> <Seed> [<comp2> …]  (nur Trainings- und Entwicklungsgruppen: bots mit pool E, p23:Tr, p23:E)
   Ausgabe: je Zusammensetzung mittleres d (gepoolte Paare je Gegner), Streuung je Paar, Verteilung der z-Werte je Gegner. */
'use strict';
const HS = require('./harness.js');
const C = require('../load.js').load();
const args = process.argv.slice(2), hands = +args[1] || 3000, seed = +args[2] || 777;
const comps = [args[0]].concat(args.slice(3));
const out = {};
comps.forEach(comp => {
  let db = null; const [c, pool] = comp.split('@');
  const opts = { seed, hands, startBB: 100, difficulty: 'gemischt', comp: c, hero: { kind: 'bot', id: 'g004' }, onEnd: x => { db = x.db; } };
  if (pool) opts.pool = require('./groups.js').make(HS.PT)[pool];
  HS.runMatch(opts);
  const pairsA = [], pairsP = [], per = [], lls = [];
  Object.values(db.opps).forEach(r => { const ps = []; (r.shown || []).forEach(s => { ps.push(...C.coach.__shownPairs(s)); }); ps.forEach(q => (q[0] ? pairsA : pairsP).push(q[1])); ps.forEach(q => { const l = C.coach.__pairLL(q); if (l != null) lls.push(l); });
    const f = C.coach.__fitOf(ps); if (f.w != null) per.push(f); });
  const m = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length), sd = a => { const mu = m(a); return Math.sqrt(a.reduce((s, x) => s + (x - mu) * (x - mu), 0) / Math.max(1, a.length - 1)); };
  const zs = per.map(f => f.z).sort((a, b) => a - b), q = p => zs.length ? zs[Math.floor(p * (zs.length - 1))] : null;
  out[comp] = { opps: per.length, nA: pairsA.length, nP: pairsP.length, d: +(m(pairsA) - m(pairsP)).toFixed(3), sdA: +sd(pairsA).toFixed(3), sdP: +sd(pairsP).toFixed(3),
    meanD: +m(per.map(f => f.d)).toFixed(3), z10: q(0.1), z50: q(0.5), z90: q(0.9), wMean: +m(per.map(f => f.w)).toFixed(2), ll: +m(lls).toFixed(4), llSd: +sd(lls).toFixed(4), nLL: lls.length };
  console.log(comp, JSON.stringify(out[comp]));
});
