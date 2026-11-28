/* Arbeitspaket 10 (2.2, fortgeschrieben 2.3): Rechenzeit des automatischen Tipps an realen Entscheidungen (nicht nur an ausgewählten Spots).
   Coach 2.3, 2.2.0 und 2.1.0 spielen dieselben Seeds (Gegner-KI 2.2, gemischt, 100 BB und 15 BB). Gemessen wird jede Analyse
   (beide Modi, Stufe „Standard“, höchstens 5.000 Simulationen) mit der echten Uhr: Median, 95. und 99. Perzentil, Maximum, langsamste Spots.
   Aufruf: node tests/perf-23.js [Hände] [Wurzel 2.1.0] [Wurzel 2.2.0] → tests/results/perf-23.json */
'use strict';
const fs = require('fs'), path = require('path');
const HS = require('./strategy/harness.js'), { loadEngine } = require('./strategy/engine-vm.js');
const hands = +(process.argv[2] || 400), OLD = process.argv[3] || path.join(__dirname, '..', '..', 'wt-v210'), V22 = process.argv[4] || path.join(__dirname, '..', '..', 'wt-v220');
function q(a, p) { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }
const out = { date: new Date().toISOString(), hands, versions: {} };
[['2.3', path.join(__dirname, '..')], ['2.2.0', V22], ['2.1.0', OLD]].forEach(([name, root]) => {
  if (!fs.existsSync(path.join(root, 'assets'))) return;
  const C = loadEngine(root, { realClock: true }), res = { all: [], slow: [] };
  [[100, 23901], [15, 23902]].forEach(([bb, seed]) => {
    // eigene Schleife mit echter Uhr: Entscheidungen aus der Session nachstellen
    const db = HS.PT.stats.newDb(), heroRec = HS.PT.stats.newRecord('hero', 'Du'), cfg = Object.assign(HS.PT.session.defaultConfig(), { startBB: bb }), t = HS.PT.session.newTable(cfg, db, seed);
    for (let i = 0; i < Math.round(hands / 2); i++) {
      t.seats.forEach(s => { s.stack = bb * 100; });
      const h = HS.PT.session.startHand(t, i + 1);
      while (!h.done) {
        const s = h.toAct;
        if (h.p[s].isHero) {
          const input = HS.coachInput(h, db, seed, 'exploit'); input.skipModel = false;
          const t0 = process.hrtime.bigint(), an = C.coach.analyze(input), ms = Number(process.hrtime.bigint() - t0) / 1e6;
          res.all.push(ms); if (ms > 300) res.slow.push({ ms: Math.round(ms), street: an.street, opps: an.opponents.filter(o => !o.pending).length, iters: an.iters, situation: an.situation });
          const b = an.actions[0]; let r = HS.PT.session.act(t, h, 0, b.amount ? { type: b.type, amount: b.amount } : { type: b.type });
          if (!r.ok) { const L = h.legal(0); HS.PT.session.act(t, h, 0, L.canCheck ? { type: 'check' } : { type: 'fold' }); }
        } else HS.oppAct(h, s, 'bots', heroRec, (x, y) => HS.PT.session.act(t, h, x, y));
      }
      HS.PT.session.finishHand(t, db, h, heroRec);
    }
  });
  const a = res.all;
  out.versions[name] = { decisions: a.length, medianMs: +q(a, 0.5).toFixed(1), p95Ms: +q(a, 0.95).toFixed(1), p99Ms: +q(a, 0.99).toFixed(1), maxMs: +Math.max.apply(null, a).toFixed(1),
    over1000: a.filter(x => x > 1000).length, over2000: a.filter(x => x > 2000).length, slowest: res.slow.sort((x, y) => y.ms - x.ms).slice(0, 8) };
  console.log(name + ': ' + JSON.stringify(out.versions[name]).slice(0, 300));
});
fs.writeFileSync(path.join(__dirname, 'results', 'perf-23.json'), JSON.stringify(out, null, 1));
