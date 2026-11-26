/* CFR-Studie: Genauigkeit des River-Modellspiels an realistischen Spots aus Simulationen.
   1. Abstraktionsfehler: Lösung mit B Stärkegruppen, übertragen auf einzelne Kombinationen, im exakten Kombinationsspiel
      (gleiche Ranges, gleicher Baum) per unabhängiger Best Response bewertet (PT.cfr.evaluate). 0 = Gleichgewicht.
   2. Raises: Exploitability der Lösung ohne Raises im Spiel mit Raises (der Gegner darf erhöhen) gegen die Lösung mit Raises.
   3. Konvergenz: Exploitability nach Iterationen. 4. Rechenzeit.
   Aufruf: node tests/strategy/cfr-study.js [Spots] → Ergebnis in tests/results/strategy.json (Abschnitt cfr) */
'use strict';
const fs = require('fs'), path = require('path');
const PT = require('../load.js').load(), H = PT.hands, E = PT.eval, CI = PT.coach._intern;
const N = +(process.argv[2] || 24), SIZES = [0.5, 1.0];

/** Realistische River-Spots (Held heads-up am River, am Zug ohne offenen Einsatz) aus einer Simulation sammeln */
function collect(n, seed) {
  const out = [], db = PT.stats.newDb(), heroRec = PT.stats.newRecord('hero', 'Du'), t = PT.session.newTable(PT.session.defaultConfig(), db, seed);
  for (let i = 0; out.length < n && i < 20000; i++) {
    t.seats.forEach(s => { s.stack = 10000; });
    const h = PT.session.startHand(t, i + 1);
    while (!h.done) {
      if (h.p[h.toAct].isHero) {
        const v = PT.bots.publicView(h, 0), live = v.players.filter(q => !q.folded && q.seat !== 0);
        if (v.street === 3 && live.length === 1 && v.legal.toCall === 0 && out.length < n) {
          const q = live[0], st = CI.oppStats(db.opps[q.id] || null), opp = CI.buildRange(v, q.seat, st, true, v.pfa), heroW = CI.heroRangeFor(v);
          const ip = PT.POS_ORDER_POST[v.players[0].pos] > PT.POS_ORDER_POST[q.pos];
          const eff = Math.min(v.players[0].stack, q.stack) / Math.max(1, v.pot);
          out.push({ oopW: ip ? opp.w : heroW, ipW: ip ? heroW : opp.w, board: v.board.slice(), stack: eff, hand: h.no });
        }
        const a = PT.bots.decide(v, 'g004', PT.rng.stream(seed, 'h', h.no, h.actions.length), null);
        const r = PT.session.act(t, h, 0, a); if (!r.ok) { const L = h.legal(0); PT.session.act(t, h, 0, L.canCheck ? { type: 'check' } : { type: 'call' }); }
      } else PT.session.botAct(t, h, heroRec);
    }
    PT.session.finishHand(t, db, h, heroRec);
  }
  return out;
}
/** Exaktes Kombinationsspiel: jede Kombination ein eigener „Bucket“ */
function comboGame(sp) {
  const arr = [0, 0].concat(sp.board), O = [], I = [];
  for (let k = 0; k < H.NC; k++) { if (sp.oopW[k] > 0) { arr[0] = H.C1[k]; arr[1] = H.C2[k]; O.push({ k, w: sp.oopW[k], s: E.evaluate(arr) }); } if (sp.ipW[k] > 0) { arr[0] = H.C1[k]; arr[1] = H.C2[k]; I.push({ k, w: sp.ipW[k], s: E.evaluate(arr) }); } }
  const J = O.map(() => new Float64Array(I.length)), M = O.map(() => new Float64Array(I.length)); let tot = 0;
  O.forEach((x, i) => I.forEach((y, j) => { if (H.C1[x.k] === H.C1[y.k] || H.C1[x.k] === H.C2[y.k] || H.C2[x.k] === H.C1[y.k] || H.C2[x.k] === H.C2[y.k]) return; J[i][j] = x.w * y.w; M[i][j] = x.s > y.s ? 1 : x.s === y.s ? 0.5 : 0; tot += J[i][j]; }));
  J.forEach(r => { for (let j = 0; j < r.length; j++) r[j] /= tot; });
  return { O, I, J, M };
}
function liftedExpl(sp, cg, sol, opts) {
  const map = {}; sol.nodes.forEach(n => { map[n.name] = n; });
  const bO = PT.cfr.bucketize(sp.oopW, sp.board, sol.buckets).of, bI = PT.cfr.bucketize(sp.ipW, sp.board, sol.buckets).of;
  return PT.cfr.evaluate(cg.J, cg.M, SIZES, opts, (name, p, b, acts) => {
    const n = map[name]; if (!n) return null;
    const bk = p === 0 ? bO[cg.O[b].k] : bI[cg.I[b].k], s = n.s[bk];
    if (acts.length === n.acts.length) return s;
    return acts.map(a => { const i = n.acts.indexOf(a); return i >= 0 ? s[i] : 0; });   // Aktion fehlt im kleineren Baum → nie gewählt
  });
}
const spots = collect(N, 777), rows = [];
const t0 = Date.now();
spots.forEach((sp, si) => {
  const cg = comboGame(sp), row = { spot: si, nO: cg.O.length, nI: cg.I.length, stack: +sp.stack.toFixed(2), buckets: {}, raise: {}, conv: {} };
  [5, 10, 20, 40].forEach(B => {
    const ta = Date.now(), sol = PT.cfr.solveRiver({ oopW: sp.oopW, ipW: sp.ipW, board: sp.board, sizes: SIZES, iters: 700, buckets: B }), ms = Date.now() - ta;
    const e = liftedExpl(sp, cg, sol, {});
    row.buckets[B] = { ms, bucketExpl: +sol.exploitability.toFixed(5), comboExpl: +e.exploitability.toFixed(5), value: +sol.value.toFixed(4), comboValue: +e.value.toFixed(4) };
  });
  // Raises: Lösung ohne Raises im Spiel mit Raises bewertet, gegen Lösung mit Raises (10 und 20 Gruppen, 700 Iterationen)
  [10, 20].forEach(B => {
    const ro = { raise: true, stack: sp.stack };
    const s0 = PT.cfr.solveRiver({ oopW: sp.oopW, ipW: sp.ipW, board: sp.board, sizes: SIZES, iters: 700, buckets: B, stack: sp.stack });
    const ta = Date.now(), s1 = PT.cfr.solveRiver({ oopW: sp.oopW, ipW: sp.ipW, board: sp.board, sizes: SIZES, iters: 700, buckets: B, raise: true, stack: sp.stack }), ms = Date.now() - ta;
    const e0 = liftedExpl(sp, cg, s0, ro), e1 = liftedExpl(sp, cg, s1, ro), e0n = liftedExpl(sp, cg, s0, { stack: sp.stack });
    row.raise[B] = { ms, noRaiseInRaiseGame: +e0.exploitability.toFixed(5), raiseInRaiseGame: +e1.exploitability.toFixed(5), noRaiseInNoRaiseGame: +e0n.exploitability.toFixed(5), raiseFreqIP: raiseFreq(s1, 'IP gegen Bet '), raiseFreqOOP: raiseFreq(s1, 'OOP gegen Bet ') };
  });
  [100, 300, 700, 2500].forEach(it => { const s = PT.cfr.solveRiver({ oopW: sp.oopW, ipW: sp.ipW, board: sp.board, sizes: SIZES, iters: it, buckets: 10, raise: true, stack: sp.stack }); row.conv[it] = +s.exploitability.toFixed(6); });
  rows.push(row);
  console.log(JSON.stringify(row));
});
function raiseFreq(sol, prefix) { let f = 0, n = 0; sol.nodes.filter(nd => nd.name.indexOf(prefix) === 0).forEach(nd => { const ri = nd.acts.findIndex(a => a.indexOf('raise') === 0); if (ri < 0) return; nd.s.forEach(s => { f += s[ri]; n++; }); }); return n ? +(f / n).toFixed(3) : null; }
const mean = (k1, k2, k3) => { const xs = rows.map(r => k3 != null ? r[k1][k2][k3] : r[k1][k2]).filter(x => x != null); return xs.length ? +(xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(5) : null; };
const max = (k1, k2, k3) => +Math.max(...rows.map(r => r[k1][k2][k3])).toFixed(5);
const summary = { spots: rows.length, sizes: SIZES, ms: Date.now() - t0,
  buckets: Object.fromEntries([5, 10, 20, 40].map(B => [B, { comboExplMean: mean('buckets', B, 'comboExpl'), comboExplMax: max('buckets', B, 'comboExpl'), bucketExplMean: mean('buckets', B, 'bucketExpl'), msMean: mean('buckets', B, 'ms') }])),
  raise: Object.fromEntries([10, 20].map(B => [B, { noRaiseInRaiseGameMean: mean('raise', B, 'noRaiseInRaiseGame'), noRaiseInRaiseGameMax: max('raise', B, 'noRaiseInRaiseGame'), raiseInRaiseGameMean: mean('raise', B, 'raiseInRaiseGame'), raiseInRaiseGameMax: max('raise', B, 'raiseInRaiseGame'), noRaiseInNoRaiseGameMean: mean('raise', B, 'noRaiseInNoRaiseGame'), msMean: mean('raise', B, 'ms'), raiseFreqIPMean: mean('raise', B, 'raiseFreqIP'), raiseFreqOOPMean: mean('raise', B, 'raiseFreqOOP') }])),
  convergence: Object.fromEntries([100, 300, 700, 2500].map(it => [it, mean('conv', it)])) };
console.log(JSON.stringify(summary, null, 1));
const file = path.join(__dirname, '..', 'results', 'strategy.json');
let prev = {}; try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* neu */ }
prev.cfr = { date: new Date().toISOString(), summary, rows };
fs.writeFileSync(file, JSON.stringify(prev, null, 1));
