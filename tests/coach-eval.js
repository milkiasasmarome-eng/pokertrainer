/* Bewertet den Coach indirekt: Ein Held, der stets der Coach-Empfehlung folgt, spielt gegen die Bots;
   Vergleich mit einem Helden, der die Bot-Logik eines TAG-Profils nutzt. Gleiche Seeds (gepaarter Vergleich). */
'use strict';
const PT = require('./load.js').load();
function play(policy, hands, seed, mode) {
  const db = PT.stats.newDb(), heroRec = PT.stats.newRecord('hero', 'Du');
  const t = PT.session.newTable(PT.session.defaultConfig(), db, seed), hr = PT.makeRng('h' + seed);
  let decisions = 0, ms = 0, maxMs = 0, maxIt = 0;
  for (let i = 0; i < hands; i++) {
    const h = PT.session.startHand(t, i);
    while (!h.done) {
      if (h.p[h.toAct].isHero) {
        let a;
        if (policy === 'coach') {
          const t0 = Date.now();
          const an = PT.coach.analyze({ view: PT.bots.publicView(h, 0), opps: db.opps, settings: { mode: mode || 'exploit', level: 'standard' }, seed: i * 31 + h.actions.length });
          const d = Date.now() - t0; ms += d; maxMs = Math.max(maxMs, d); maxIt = Math.max(maxIt, an.iters); decisions++;
          a = { type: an.actions[0].type, amount: an.actions[0].amount };
        } else a = PT.bots.decide(PT.bots.publicView(h, 0), 'g004', hr, null);
        let r = PT.session.act(t, h, 0, a);
        if (!r.ok) { const L = h.legal(0); PT.session.act(t, h, 0, L.canCheck ? { type: 'check' } : { type: 'call' }); }
      } else PT.session.botAct(t, h, heroRec);
    }
    PT.session.finishHand(t, db, h, heroRec);
  }
  return { net: PT.session.heroNet(t) / t.cfg.bb, hands, decisions, avgMs: decisions ? ms / decisions : 0, maxMs, maxIt };
}
const hands = +(process.argv[2] || 1500), seeds = (process.argv[3] || '11,12').split(',').map(Number), mode = process.argv[4] || 'exploit';
const out = [];
for (const s of seeds) {
  const c = play('coach', hands, s, mode), b = play('bot', hands, s);
  out.push({ seed: s, coachBB100: +(c.net / hands * 100).toFixed(1), botBB100: +(b.net / hands * 100).toFixed(1), avgMs: +c.avgMs.toFixed(1), maxMs: c.maxMs, maxIt: c.maxIt });
  console.log(JSON.stringify(out[out.length - 1]));
}
