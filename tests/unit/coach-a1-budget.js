/* Prüfbefund A1: gemeinsames Simulationsbudget beider Analysemodi – Reihenfolge, Verteilung, erschöpftes Budget */
'use strict';
module.exports = function (T) {
  const { PT, test, ok } = T;
  function spots(n, seed) {
    const sim = require('../sim-lib.js'), out = [];
    sim.run({ hands: 400, seed, onHand: () => {}, onDecision: null });
    // Entscheidungspunkte des Helden aus frischen Händen sammeln
    const db = PT.stats.newDb(), heroRec = PT.stats.newRecord('hero', 'Du'), t = PT.session.newTable(PT.session.defaultConfig(), db, seed);
    for (let i = 0; out.length < n && i < 400; i++) {
      const h = PT.session.startHand(t, i);
      while (!h.done) {
        if (h.p[h.toAct].isHero) { out.push({ view: PT.bots.publicView(h, 0), opps: JSON.parse(JSON.stringify(db.opps)) }); const L = h.legal(0); PT.session.act(t, h, 0, L.canCheck ? { type: 'check' } : { type: 'call' }); }
        else PT.session.botAct(t, h, heroRec);
      }
      PT.session.finishHand(t, db, h, heroRec);
    }
    return out;
  }
  test('A1: Ergebnisse beider Modi unabhängig von der Reihenfolge; faire Budgetverteilung; erschöpftes Budget ohne ungültige Werte', () => {
    const list = spots(T.QUICK ? 24 : 60, 77);
    let same = 0, diff = 0, fair = 0, mw = 0, bad = 0;
    for (const [i, s] of list.entries()) {
      const run = (order, maxSim) => { PT.equity.cacheClear(); return PT.coach.analyze({ view: s.view, opps: s.opps, settings: { mode: 'exploit', level: 'standard' }, seed: 1000 + i, live: true, _order: order, maxSim }); };
      const a = run(['exploit', 'gto']), b = run(['gto', 'exploit']);
      const evA = a.actions.map(x => x.label + ':' + x.ev.toFixed(6)).join('|') + '#' + a.otherMode.actions.map(x => x.label + ':' + (x.ev || 0).toFixed(6)).join('|');
      const evB = b.actions.map(x => x.label + ':' + x.ev.toFixed(6)).join('|') + '#' + b.otherMode.actions.map(x => x.label + ':' + (x.ev || 0).toFixed(6)).join('|');
      if (evA === evB) same++; else diff++;
      if (a.equity.vs.length > 1) mw++;
      if (Math.abs(a.budgetShare.granted - (a.otherBudget ? a.otherBudget.granted : a.budgetShare.granted)) <= 1 && a.budgetShare.used <= a.budgetShare.granted) fair++;
      const z = run(['exploit', 'gto'], 0);
      if (!z.actions.length || z.actions.some(x => !isFinite(x.ev) || !isFinite(x.u))) bad++;
    }
    ok(diff === 0, 'gleiche Ergebnisse bei umgekehrter Reihenfolge (' + same + ' gleich, ' + diff + ' verschieden, ' + mw + ' Multiway)');
    ok(fair === list.length, 'jeder Modus erhält die Hälfte des Restbudgets und überschreitet sie nicht');
    ok(bad === 0, 'erschöpftes Budget: nur endliche EV-Werte (' + bad + ' fehlerhaft)');
  });
};
