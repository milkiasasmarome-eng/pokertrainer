/* 2.3 (Arbeitspaket 6): Kalibrierung der Fold-Vorhersage für die tatsächlich empfohlenen Bets und Raises des Coaches.
   Für jede eigene Bet-/Raise-Entscheidung: vorhergesagte Wahrscheinlichkeit, dass alle Gegner folden (pAllFold aus der EV-Rechnung),
   gegen das beobachtete Ergebnis (alle verbleibenden Gegner folden, bevor der Held wieder handelt oder die Straße endet).
   Eine überschätzte Fold-Rate macht Raises und Bluffs scheinbar profitabel (Hypothese zur erhöhten Raise-Häufigkeit in 2.2).
   Aufruf: node tests/strategy/aggr-calib.js <Seed> <Hände> <comp[@Pool]> <Ausgabe.json> [abl-JSON] [Wurzel] */
'use strict';
const fs = require('fs'), path = require('path');
const HS = require('./harness.js');
const [seed, hands, compArg, outFile, ablArg, rootArg] = process.argv.slice(2);
const root = rootArg || path.join(__dirname, '..', '..'), [comp, pool] = compArg.split('@');
const hero = { kind: 'coach', root, mode: 'exploit', abl: ablArg && ablArg !== '-' ? JSON.parse(ablArg) : undefined };
const recs = [], open = [];
const opts = { seed: +seed, hands: +hands, startBB: 100, difficulty: 'gemischt', comp, hero,
  onDecision: ({ an, v, h }) => {
    const b = an.actions[0]; if (v.street === 0 || (b.type !== 'bet' && b.type !== 'raise')) return;
    const p = b.parts || {}; if (p.pAllFold == null) return;
    open.push({ h, idx: h.actions.length, st: v.street, pred: p.pAllFold, kind: b.type, size: v.pot > 0 ? (b.amount - v.players[v.seat].bet) / v.pot : 0, label: b.label, n: v.players.filter(q => !q.folded && q.seat !== v.seat).length });
  } };
if (pool) opts.pool = require('./groups.js').make(HS.PT)[pool];
const origEnd = null; void origEnd;
// Auswertung nach jeder Hand: offene Entscheidungen der beendeten Hand auflösen
const PTs = HS.PT, finish = PTs.session.finishHand;
PTs.session.finishHand = function (t, db, h, heroRec) {
  for (let i = open.length - 1; i >= 0; i--) { const o = open[i]; if (o.h !== h) continue; open.splice(i, 1);
    const acts = h.actions.slice(o.idx + 1); let allFold = true, any = false;
    for (const a of acts) { if (a.st !== o.st || a.s === 0) break; any = true; if (a.t !== 'fold') { allFold = false; break; } }
    if (any) recs.push({ st: o.st, kind: o.kind, size: +o.size.toFixed(2), pred: +o.pred.toFixed(4), obs: allFold ? 1 : 0, n: o.n }); }
  return finish.apply(this, arguments);
};
HS.runMatch(opts);
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const grp = f => { const g = {}; recs.forEach(r => { const k = f(r); (g[k] = g[k] || []).push(r); }); const o = {}; Object.keys(g).sort().forEach(k => { const l = g[k], d = l.map(r => r.pred - r.obs), m = mean(d), sd = Math.sqrt(mean(d.map(x => (x - m) ** 2)) || 0);
  o[k] = { n: l.length, pred: +mean(l.map(r => r.pred)).toFixed(3), obs: +mean(l.map(r => r.obs)).toFixed(3), bias: +m.toFixed(3), ci: [+(m - 1.96 * sd / Math.sqrt(l.length)).toFixed(3), +(m + 1.96 * sd / Math.sqrt(l.length)).toFixed(3)] }; }); return o; };
const out = { seed: +seed, hands: +hands, comp: compArg, abl: hero.abl || null, n: recs.length, total: grp(() => 'alle'), byKind: grp(r => r.kind), bySize: grp(r => r.kind === 'raise' ? 'Raise' : r.size <= 0.4 ? '≤ 0,4 Pot' : r.size <= 0.8 ? '0,4–0,8 Pot' : r.size <= 1.15 ? '0,8–1,15 Pot' : '> 1,15 Pot') };
fs.writeFileSync(outFile, JSON.stringify(out, null, 1)); console.log(compArg, JSON.stringify(out.total), JSON.stringify(out.byKind));
