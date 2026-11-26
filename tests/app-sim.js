/* Erzeugt Handdatensätze genau wie die Oberfläche (onHeroTurn → coach.analyze → Aktion → coach.grade →
   training.makeDecision → training.makeHandRecord), ohne Browser. Für Tests von Handhistorie, Import und Benchmark-Export. */
'use strict';
module.exports = function hands(PT, n, seed, opts) {
  opts = opts || {};
  const db = PT.stats.newDb(), hero = PT.stats.newRecord('hero', 'Du'), t = PT.session.newTable(PT.session.defaultConfig(), db, seed >>> 0), out = [];
  for (let i = 0; i < n; i++) {
    const h = PT.session.startHand(t, 1700000000000 + i * 60000), decs = [];
    while (!h.done) {
      if (h.p[h.toAct].isHero) {
        const view = PT.bots.publicView(h, 0), opps = {};
        h.p.forEach(q => { if (!q.isHero && db.opps[q.id]) opps[q.id] = JSON.parse(JSON.stringify(db.opps[q.id])); });
        const cseed = PT.rng.hashStr(t.seed + '|' + h.no + '|' + h.actions.length + '|P');
        const mode = opts.mode || (i % 2 ? 'gto' : 'exploit');
        let a = PT.coach.analyze({ view, opps, settings: { mode, level: 'standard' }, seed: cseed, live: true });
        const L = h.legal(0), k = i + decs.length;
        // abwechselnd Call/Check, Mindest-Raise und eine Größe außerhalb der Kandidaten (Nachberechnung mit extra)
        const odd = L.canRaise && L.maxTo > L.minTo + 37 ? L.minTo + 37 : null;
        const act = k % 4 === 1 && L.canRaise ? { type: L.isBet ? 'bet' : 'raise', amount: L.minTo } : k % 4 === 3 && odd ? { type: L.isBet ? 'bet' : 'raise', amount: odd } : L.canCheck ? { type: 'check' } : { type: 'call' };
        const idx = h.actions.length, pos = h.p[0].pos, st = h.street;
        const r = PT.session.act(t, h, 0, act);
        if (!r.ok) throw new Error('Aktion abgelehnt: ' + r.error);
        const chosen = { type: r.action.t, amount: r.action.a, label: r.action.t + (r.action.a ? ' ' + r.action.a : '') };
        let extra = null;
        if ((chosen.type === 'bet' || chosen.type === 'raise') && !a.actions.some(x => (x.type === 'bet' || x.type === 'raise') && x.amount === chosen.amount)) {
          extra = [chosen.amount];
          a = PT.coach.analyze({ view, opps, settings: { mode, level: 'standard' }, seed: cseed, extra, live: true });
        }
        const g = PT.coach.grade(a, chosen);
        decs.push(PT.training.makeDecision({ idx, street: st, pos, view, opps, seed: cseed, chosen, extra }, a, g));
      } else PT.session.botAct(t, h, hero);
    }
    const types = {}; h.p.forEach(q => { if (!q.isHero) types[q.id] = PT.stats.playerType(db.opps[q.id]); });
    PT.session.finishHand(t, db, h, hero);
    out.push(JSON.parse(JSON.stringify(PT.training.makeHandRecord(h, { session: 1700000000000, seed: t.seed, decisions: decs, types }))));
  }
  out.db = db; out.hero = hero;
  return out;
};
