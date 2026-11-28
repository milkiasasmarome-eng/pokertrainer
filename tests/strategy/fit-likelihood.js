/* Arbeitspaket 1 (2.2): Anpassung der Aktions-Likelihoods der Range-Schätzung an die Entwicklungsgruppe E.
   Gegner-KI gegen Gegner-KI (nur Profile der Gruppe E, Held = Profil g004 aus E), 100 BB, gemischtes Feld.
   Für jede Postflop-Entscheidung eines E-Gegners: Zelle (Straße, Lage, Größe, Mehrgegner, Draw, absolute Stärke xa)
   und gewählte Aktion. Die verdeckten Karten kennt nur diese Studie (Modellbildung an der Entwicklungsgruppe, wie ein
   Spieler, der eine Datenbank vieler Hände auswertet); der Coach erhält zur Laufzeit nur die fertige Tabelle und
   rechnet sie auf öffentlich sichtbare Aktionen an. Validierung an Gruppe V, Test an T und synthetischen Strategien
   (tests/strategy/equity-calib.js).
   Aufruf: node tests/strategy/fit-likelihood.js <Seed> <Hände> <Gruppe> <Ausgabe.json> */
'use strict';
const fs = require('fs');
const PT = require('../load.js').load(), GROUPS = require('./groups.js').make(PT);
const R = PT.ranges, B = PT.bots;

/** Zellenmerkmale einer Entscheidung aus öffentlicher Sicht (identisch zu PT.ranges.actionCell) */
function collect(seed, hands, group) {
  const cfg = Object.assign(PT.session.defaultConfig(), { pool: GROUPS[group] || null }), db = PT.stats.newDb();
  const t = PT.session.newTable(cfg, db, seed), heroRec = PT.stats.newRecord('hero', 'Du');
  const counts = {}, sizeRng = PT.makeRng('prober|' + seed);
  const heroId = group === 'E' ? GROUPS.E.filter(id => B.styleOf(id) === 'bal')[0] : 'g004';
  for (let i = 0; i < hands; i++) {
    t.seats.forEach(s => { s.stack = 10000; });
    const h = PT.session.startHand(t, i + 1); let guard = 0;
    while (!h.done) {
      if (++guard > 400) throw new Error('Hand hängt');
      const s = h.toAct, v = B.publicView(h, s);
      let a;
      if (s === 0) {
        a = B.decide(v, heroId, h.botRng, null);
        // Prober: Einsätze des Platzes 0 postflop mit zufälliger Größe (0,25–2,2 Pot), damit die Reaktionen der Gegner alle Größen abdecken
        if (v.street > 0 && (a.type === 'bet' || a.type === 'raise') && v.legal.canRaise) {
          const L = v.legal, fr = 0.25 + sizeRng() * 1.95, me = v.players[s];
          const to = L.toCall > 0 ? v.cur + fr * (v.pot + L.toCall) : me.bet + fr * v.pot;
          a = { type: L.isBet ? 'bet' : 'raise', amount: Math.round(Math.max(L.minTo, Math.min(L.maxTo, to))) };
        }
      }
      else a = B.decideFor(h, s, h.botRng, { heroStats: PT.session.heroCtx(heroRec) });
      const cell = v.street > 0 ? R.actionCell(v, v.seat) : null;
      let r = PT.session.act(t, h, s, a);
      if (!r.ok) { const L = h.legal(s); r = PT.session.act(t, h, s, L.canCheck ? { type: 'check' } : { type: 'call' }); }
      if (cell && s !== 0) {
        const act = r.action, out = R.actionOutcome(act, cell);
        const xa = B.percentile(h.p[s].cards, h.board.slice(0, v.street === 1 ? 3 : v.street === 2 ? 4 : 5)).p;
        const dr = v.street < 3 && R.drawInfo(h.p[s].cards[0], h.p[s].cards[1], v.board).strong ? 1 : 0;
        const k = cell.key + '|' + dr + '|' + R.xaBucket(xa);
        const c = counts[k] = counts[k] || {}; c[out] = (c[out] || 0) + 1;
      }
    }
    PT.session.finishHand(t, db, h, heroRec);
  }
  // Prüfer A 2.2 (A-3): Bezugswerte der Population ohne Prober (Gegner-KI gegen Gegner-KI, Gruppe E, neue Datenbank)
  const db2 = PT.stats.newDb(), t2 = PT.session.newTable(cfg, db2, seed + 7), hr2 = PT.stats.newRecord('hero', 'Du');
  for (let i = 0; i < Math.min(60000, Math.round(hands / 5)); i++) {
    t2.seats.forEach(s => { s.stack = 10000; });
    const h = PT.session.startHand(t2, i + 1); let guard = 0;
    while (!h.done) { if (++guard > 400) throw new Error('Hand hängt'); const s = h.toAct;
      const a = s === 0 ? B.decide(B.publicView(h, s), heroId, h.botRng, null) : B.decideFor(h, s, h.botRng, { heroStats: PT.session.heroCtx(hr2) });
      let r = PT.session.act(t2, h, s, a); if (!r.ok) { const L = h.legal(s); PT.session.act(t2, h, s, L.canCheck ? { type: 'check' } : { type: 'call' }); } }
    PT.session.finishHand(t2, db2, h, hr2);
  }
  const ref = { stats: {}, agg: { bet: 0, check: 0, fold: 0, call: 0, raise: 0 } };
  Object.values(db2.opps).forEach(r => { Object.keys(r.stats).forEach(k => { const x = ref.stats[k] = ref.stats[k] || [0, 0]; x[0] += r.stats[k][0]; x[1] += r.stats[k][1]; });
    Object.keys(ref.agg).forEach(k => { ref.agg[k] += r.agg[k] || 0; }); });
  counts.__ref = ref;
  return counts;
}
if (require.main === module) {
  const [seed, hands, group, out] = process.argv.slice(2);
  const t0 = Date.now(), c = collect(+seed, +hands, group || 'E');
  fs.writeFileSync(out, JSON.stringify(c));
  console.log(out + ': ' + Object.keys(c).length + ' Zellen, ' + Math.round((Date.now() - t0) / 1000) + ' s');
}
module.exports = { collect };
