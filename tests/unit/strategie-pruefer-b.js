/* 2.1 Strategie: Regressionstests zu den Befunden der Strategieprüfung B (docs/audit-2.1/PRUEFUNG_B.md).
   Reproduktionen nach /home/claude/review2-b (Skripte e1–e13), auf kleine, schnelle Fälle verkürzt. */
'use strict';
module.exports = function (T) {
  const { PT, test, ok } = T;
  const C = s => PT.parseCards(s);
  const coach = (h, mode, more) => PT.coach.analyze(Object.assign({ view: PT.bots.publicView(h, 0), opps: {}, settings: { mode: mode || 'exploit', level: 'standard' }, seed: 7, live: true, skipModel: true }, more || {}));

  test('Prüfer B 1: Chart-Anker misst Fold am Chartgewicht (kein Fold mit Händen, die der Chart zu 100 % spielt)', () => {
    const cases = [
      ['BTN', 'As5s', [['UTG', 'call']], 'aggr', 'A5s BTN gegen Limper'],
      ['BTN', 'KsJh', [['UTG', 'call']], 'aggr', 'KJo BTN gegen Limper'],
      ['BTN', '2s2h', [['UTG', 'call']], 'aggr', '22 BTN gegen Limper'],
      ['BTN', 'KsQh', [['H', 'raise', 2.5], ['BB', 'raise', 11]], 'call', 'KQo gegen 3-Bet'],
      ['BTN', 'JsTs', [['HJ', 'raise', 2.5]], 'call', 'JTs gegen HJ-Open']];
    for (const [pos, cards, script, want, name] of cases) for (const mode of ['exploit', 'gto']) {
      const a = coach(T.spot(pos, cards, '', script), mode), b = a.actions[0], g = b.type === 'bet' || b.type === 'raise' ? 'aggr' : b.type;
      ok(a.chart && a.chart.fold < 0.12 && g === want, name + ' [' + mode + ']: ' + b.label + ' (Chart F ' + (a.chart ? a.chart.fold : '-') + ')');
      // Ein Fold dieser Hand wird gedeckelt und als Abweichung vom Chart erklärt
      const gf = PT.coach.grade(a, { type: 'fold' });
      ok(gf.score <= 45 && /Fold/.test(gf.text) && /Chart/.test(gf.text), name + ' [' + mode + ']: Fold → ' + gf.grade);
    }
    // Ausnahme: reiner Call oder Fold gegen ein All-in bleibt Rechnung (kein Chart-Anker)
    const j = coach(T.spot('BB', '7c2d', '', [['BTN', 'allin']]), 'exploit');
    ok(!j.chart || !j.chart.applied, 'Call/Fold gegen All-in: kein Chart-Anker');
  });

  test('Prüfer B 9: Kurzzeit- und Langzeitwerte nicht gemischt (VPIP ≥ PFR)', () => {
    const r = PT.stats.newRecord('g002', PT.bots.nameOf('g002'));
    r.hands = 1000; r.stats.vpip = [210, 1000]; r.stats.pfr = [170, 1000];
    r.recent.h = 140; r.recent.stats.vpip = [12, 120, 60]; r.recent.stats.pfr = [11, 120, 60];
    r.chg = { vpip: [900, -1] };
    const eff = PT.stats.effectiveStats(r);
    ok(eff.changed.join() === 'vpip' && eff.linked.join() === 'pfr', 'VPIP mit Alarm, PFR verknüpft (' + eff.changed + ' / ' + eff.linked + ')');
    ok(eff.stats.pfr[1] === 120 && eff.stats.pfr[0] === 11, 'PFR aus derselben Zeitskala wie VPIP');
    const sm = PT.ranges.smooth(eff.stats); ok(sm.vpip >= sm.pfr, 'geglättet VPIP ' + sm.vpip.toFixed(3) + ' ≥ PFR ' + sm.pfr.toFixed(3));
    const pr = PT.stats.profile(r); ok(pr.estSrc.pfr === 'kurzzeit' && pr.est.vpip >= pr.est.pfr, 'Profil: beste Schätzung PFR ebenfalls kurzfristig');
    // Coach: auch bei inkonsistenten Eingaben nie PFR > VPIP
    r.recent.stats.pfr = [16, 120, 60];
    const h = T.spot('BTN', 'AhQd', '', [['HJ', 'raise', 2.5]]), hj = h.p.find(q => q.pos === 'HJ'), rr = JSON.parse(JSON.stringify(r)); rr.id = hj.id; rr.name = hj.name;
    const a = coach(h, 'exploit', { opps: { [hj.id]: rr } }), o = a.opponents.find(x => x.name === hj.name);
    ok(o.sm.vpip >= o.sm.pfr, 'Coach: VPIP ' + o.sm.vpip.toFixed(3) + ' ≥ PFR ' + o.sm.pfr.toFixed(3));
  });

  test('Prüfer B 12: respond.inner wird auch nach einer Ausnahme zurückgesetzt', () => {
    const opp = { p: { bet: 0, stack: 9750, name: 'X' }, w: PT.ranges.removeDead(PT.ranges.full(), C('Th7c2d9s8s')), sm: PT.ranges.smooth(null), prof: null, raw: {} };
    const ctx = { street: 1, mode: 'exploit', board: C('Th7c2d'), me: { bet: 0 }, L: { toCall: 0 }, bb: 100 };
    let thrown = false; try { PT.ev.respond(opp, ctx, 300, 550, 1, 'cbet'); } catch (e) { thrown = true; }
    ok(thrown && !PT.ev.respond.inner, 'Ausnahme ausgelöst, Flag zurückgesetzt');
    const a = coach(T.spot('BTN', '9s8s', 'Th7c2d', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check']]), 'exploit');
    ok(/Populationsmodell/.test(a.actions.find(x => x.type === 'bet').parts.folds[0].basis), 'Populationsmodell bleibt aktiv');
  });
};
