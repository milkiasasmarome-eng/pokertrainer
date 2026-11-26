/* 2.1 Strategie: Entscheidungsbewertung – frei gewählte Größen (Nachrechnung vs. Interpolation), knappe Alternativen, Abstand zum höchsten Modell-EV */
'use strict';
module.exports = function (T) {
  const { PT, test, ok } = T;
  test('Bewertung 2.1: Interpolierte Größe hat größere Unsicherheit als die Nachrechnung; Nachrechnung wird bevorzugt', () => {
    const h = T.spot('BTN', 'AhQd', 'Qc7d2s', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check']]);
    const v = PT.bots.publicView(h, 0), inp = { view: v, opps: {}, settings: { mode: 'exploit', level: 'standard' }, seed: 4, live: true };
    const a = PT.coach.analyze(inp), bets = a.actions.filter(x => x.type === 'bet').sort((p, q) => p.amount - q.amount);
    const mid = Math.round((bets[0].amount + bets[1].amount) / 2 / 10) * 10;
    const gi = PT.coach.grade(a, { type: 'bet', amount: mid });
    const re = PT.coach.analyze(Object.assign({}, inp, { extra: [mid] })), gr = PT.coach.grade(re, { type: 'bet', amount: mid });
    ok(gi.interpolated && !gr.interpolated, 'Interpolation nur ohne Nachrechnung');
    ok(gi.u >= Math.max(bets[0].u, bets[1].u) - 1e-9, 'Unsicherheit der Interpolation nicht kleiner als die der Nachbarn');
    ok(Math.abs(gi.loss - gr.loss) <= gi.u + 0.05 * v.bb, 'Interpolierter Verlust liegt im Rahmen seiner Unsicherheit (' + gi.loss.toFixed(1) + ' vs ' + gr.loss.toFixed(1) + ' ± ' + gi.u.toFixed(1) + ')');
    const out = PT.coach.grade(a, { type: 'bet', amount: Math.min(v.legal.maxTo, bets[bets.length - 1].amount + 2 * v.bb) });
    ok(out.interpolated ? out.u >= bets[bets.length - 1].u : true, 'außerhalb der bewerteten Größen: volle Unsicherheit');
  });
  test('Bewertung 2.1: Abstand Empfehlung – höchster Modell-EV wird gemeldet (Preflop-Anker); kein „eindeutig“ bei Alternativen in der Unsicherheit', () => {
    const a = T.coachOn(T.spot('BB', '7c2s', '', [['BTN', 'raise', 2.5]]), 'exploit'), g = PT.coach.grade(a, { type: 'fold' });
    ok(g.recGapBB >= 0 && typeof g.modelTopLabel === 'string', 'recGapBB/modelTopLabel vorhanden (' + g.recGapBB.toFixed(2) + ', ' + g.modelTopLabel + ')');
    if (a.chart && a.chart.applied) ok(g.recGapBB > 0, 'Chart-Anker: höchster Modell-EV liegt über der Empfehlung');
    // Stichprobe aus Simulationen: „eindeutig“ nur mit Abstand ≥ 3u zur besten Alternative einer anderen Aktionsgruppe
    let bad = 0, n = 0; const db = PT.stats.newDb();
    const t = PT.session.newTable(PT.session.defaultConfig(), db, 812), heroRec = PT.stats.newRecord('hero', 'Du');
    for (let i = 0; i < (T.QUICK ? 60 : 250); i++) {
      const hh = PT.session.startHand(t, i + 1);
      while (!hh.done) {
        if (hh.p[hh.toAct].isHero) {
          const an = PT.coach.analyze({ view: PT.bots.publicView(hh, 0), opps: db.opps, settings: { mode: 'exploit', level: 'standard' }, seed: i, live: true }); n++;
          const grp = x => x.type === 'bet' || x.type === 'raise' ? 'aggr' : x.type, b = an.actions[0], other = an.actions.filter(x => grp(x) !== grp(b))[0];
          if (an.classification === 'eindeutig' && other && an.actions.length > 1 && b.ev - other.ev < 3 * Math.max(b.u, other.u) - 1e-9) bad++;
          const r = PT.session.act(t, hh, 0, b.amount ? { type: b.type, amount: b.amount } : { type: b.type });
          if (!r.ok) { const L = hh.legal(0); PT.session.act(t, hh, 0, L.canCheck ? { type: 'check' } : { type: 'fold' }); }
        } else PT.session.botAct(t, hh, heroRec);
      }
      PT.session.finishHand(t, db, hh, heroRec);
    }
    ok(bad === 0, '„eindeutig“ nur bei Abstand ≥ 3u (' + bad + ' von ' + n + ' Entscheidungen verletzt)');
  });
  test('Bewertung 2.1: Genäherte oder fehlgeschlagene EV-Werte werden gekennzeichnet, nicht als 0 gewertet, Unsicherheit erweitert', () => {
    const h = T.spot('BB', 'AhQd', '', [['BTN', 'raise', 100]]);   // All-in des Buttons, Held im Big Blind
    const v = PT.bots.publicView(h, 0);
    const a = PT.coach.analyze({ view: v, opps: {}, settings: { mode: 'exploit', level: 'standard' }, seed: 5, live: true, maxSim: 0 });
    const c = a.actions.filter(x => x.type === 'call')[0];
    ok(c && c.approx && c.parts.approx, 'Call gegen All-in ohne Budget: als Näherung gekennzeichnet (' + (c ? c.reason : '-') + ')');
    ok(c && isFinite(c.ev) && Math.abs(c.ev) > 0, 'EV der Näherung endlich und nicht pauschal 0 (' + (c ? c.ev : '-') + ')');
    ok(c && c.u >= 0.1 * v.pot - 1e-9, 'Unsicherheit der Näherung erweitert');
    ok(!a.actions.some(x => !isFinite(x.ev) || !isFinite(x.u)), 'alle Werte endlich');
  });
};
