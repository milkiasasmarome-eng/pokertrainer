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
  test('Prüfer B 6: Ergebnis unabhängig von Reihenfolge der Modi, Cache-Zustand und Wiederholung (Seeds 77 und 991)', () => {
    let n = 0, diff = 0, mw = 0;
    for (const seed of [77, 991]) {
      const db = PT.stats.newDb(), heroRec = PT.stats.newRecord('hero', 'Du'), t = PT.session.newTable(PT.session.defaultConfig(), db, seed), list = [];
      for (let i = 0; list.length < (T.QUICK ? 18 : 50) && i < 300; i++) {
        const h = PT.session.startHand(t, i);
        while (!h.done) {
          if (h.p[h.toAct].isHero) { list.push({ view: PT.bots.publicView(h, 0), opps: JSON.parse(JSON.stringify(db.opps)) }); const L = h.legal(0); PT.session.act(t, h, 0, L.canCall && L.callAmt <= 300 ? { type: 'call' } : L.canCheck ? { type: 'check' } : { type: 'fold' }); }
          else PT.session.botAct(t, h, heroRec);
        }
        PT.session.finishHand(t, db, h, heroRec);
      }
      list.forEach((s, i) => {
        const run = order => PT.coach.analyze({ view: s.view, opps: s.opps, settings: { mode: 'exploit', level: 'standard' }, seed: seed * 1000 + i, live: true, skipModel: true, _order: order });
        const sig = a => a.actions.map(x => x.label + ':' + x.ev.toFixed(6)).join('|') + '#' + a.otherMode.actions.map(x => x.label + ':' + (x.ev || 0).toFixed(6)).join('|') + '#' + a.iters;
        PT.equity.cacheClear(); const cold = sig(run(['exploit', 'gto']));
        const warm = sig(run(['gto', 'exploit'])), again = sig(run(['exploit', 'gto']));
        n++; if (cold !== warm || cold !== again) diff++;
        if (s.view.players.filter(q => !q.folded && q.seat !== 0).length > 1) mw++;
      });
    }
    ok(diff === 0, n + ' Entscheidungen (' + mw + ' Multiway): kalt, umgekehrt und wiederholt gleich (' + diff + ' verschieden)');
    // cacheClear leert auch den Cache der Equity je Kombination
    const hero = C('AhKd'), board = C('Qs7c2d'), w = PT.ranges.removeDead(PT.ranges.full(), hero.concat(board));
    const o = () => ({ budget: { left: 2000, used: 0 }, rng: PT.makeRng('b6'), exactMax: 1000, maxIter: 2000 });
    PT.ev.comboEquities(hero, board, w, o()); const hit = PT.ev.comboEquities(hero, board, w, o()); PT.equity.cacheClear(); const miss = PT.ev.comboEquities(hero, board, w, o());
    ok(hit.info.cached && !miss.info.cached, 'PT.equity.cacheClear leert ev.comboEquities-Cache');
  });
  test('Prüfer B 5: kein Exploit ohne eigene Beobachtung; Beleg auf der Fold-Rate, die das Modell verwendet', () => {
    // Ohne Gegnerdaten: keine Abweichung vom Chart über den Exploit-Weg (früher 23 Fälle, z. B. HJ 22, SB T7s, BB 3-Bet AJo/44)
    const cases = [['HJ', '2s2h', []], ['SB', 'Ts7s', []], ['BB', 'AsJh', [['BTN', 'raise', 2.5]]], ['BB', '4s4h', [['BTN', 'raise', 2.5]]], ['CO', '2s2h', []]];
    let ex = 0; for (const [pos, cards, script] of cases) { const a = coach(T.spot(pos, cards, '', script), 'exploit'); if (a.chart && a.chart.exploit) ex++; }
    ok(ex === 0, 'ohne Beobachtungen kein Exploit (' + ex + ' von ' + cases.length + ')');
    const steal = (rate, n, cards) => {
      const h = T.spot('BTN', cards || '7c2d', '', []), bb = h.p.find(q => q.pos === 'BB'), r = PT.stats.newRecord(bb.id, bb.name);
      r.hands = Math.max(3 * n, 1); r.stats.foldToSteal = [Math.round(rate * n), n]; r.stats.vpip = [Math.round(0.75 * n), 3 * n]; r.stats.pfr = [Math.round(0.54 * n), 3 * n];
      return coach(h, 'exploit', { opps: { [bb.id]: r } });
    };
    // Konsistenz: an der Schwelle r* erreicht die Modell-Fold-Rate genau fBe
    const a10 = steal(0.9, 10), ev = a10.chart && a10.chart.evidence;
    ok(ev && ev.w > 0 && ev.fBeRaw > 0, 'Beleg berechnet (n = 10)');
    if (ev) {
      const top = a10.actions.find(x => x.type === 'raise' && x.amount === ev.to), fr = top && top.parts.folds.find(x => x.pf && x.pf.key === 'foldToSteal' && x.pf.w > 0);
      ok(fr && Math.abs(fr.pf.chartF * (1 - fr.pf.w) + ev.fBeRaw * fr.pf.g.mul * fr.pf.w - ev.fBe) < 1e-9, 'chartF·(1 − w) + g(r*)·w = fBe');
    }
    // Anpassung bleibt möglich: 90 % Fold über 100 Gelegenheiten → Steal mit 72o
    ok(steal(0.9, 100).actions[0].type === 'raise', 'BB foldet 90 % (n = 100): Steal mit 72o');
  });
};
