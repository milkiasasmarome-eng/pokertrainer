/* 2.1 Strategie: Regressionstests zu den Prüfer-A-Befunden 4, 5, 7 und 12 in ev.js/coach.js */
'use strict';
module.exports = function (T) {
  const { PT, test, ok } = T;
  const C = s => PT.parseCards(s);
  test('Prüfer A 5: comboEquities-Cache nur nach Umfang, Teilergebnis nie für größere Anfrage, Rückgabe als Kopie', () => {
    const hero = C('AhKd'), board = C('Qs7c2d'), w = PT.ranges.removeDead(PT.ranges.full(), hero.concat(board));
    // Flop exakt ist bei kleinem exactMax nicht möglich → Monte Carlo; kleines Budget erzeugt ein Teilergebnis
    const small = PT.ev.comboEquities(hero, board, w, { budget: { left: 300, used: 0 }, rng: PT.makeRng('c1'), exactMax: 1000, maxIter: 300 });
    ok(small.info.partial, 'kleines Budget: Teilergebnis (' + small.info.method + ', ' + small.info.iters + ')');
    const big = PT.ev.comboEquities(hero, board, w, { budget: { left: 5000, used: 0 }, rng: PT.makeRng('c2'), exactMax: 1000, maxIter: 5000 });
    ok(!big.info.cached && !big.info.partial, 'große Anfrage erhält kein Teilergebnis aus dem Cache');
    const again = PT.ev.comboEquities(hero, board, w, { budget: { left: 5000, used: 0 }, rng: PT.makeRng('c3'), exactMax: 1000, maxIter: 5000 });
    ok(again.info.cached && again.e !== big.e, 'gleiche Anfrage: Cache-Treffer als Kopie (eigenes Array)');
    again.e[0] = 99; const third = PT.ev.comboEquities(hero, board, w, { budget: { left: 5000, used: 0 }, rng: PT.makeRng('c4'), exactMax: 1000, maxIter: 5000 });
    ok(third.e[0] !== 99, 'Änderung am gelieferten Array verändert den Cache nicht');
    const smaller = PT.ev.comboEquities(hero, board, w, { budget: { left: 1000, used: 0 }, rng: PT.makeRng('c5'), exactMax: 1000, maxIter: 1000 });
    ok(smaller.info.cached, 'kleinere Anfrage darf den umfangreicheren Eintrag nutzen');
  });
  test('Prüfer A 7: leere Range gekennzeichnet statt „exakt“ mit SE 0; Coach fällt gekennzeichnet zurück, Klassifikation „unsicher“', () => {
    const hero = C('AhKd'), board = C('Qs7c2d'), r = PT.ev.comboEquities(hero, board, new Float64Array(1326), {});
    ok(r.info.failed && r.info.method === 'leere Range' && r.info.se == null, 'comboEquities: leere Range gekennzeichnet (' + r.info.method + ')');
    // EV-Funktionen prüfen fehlende Equity: kein NaN, kein stilles −Call
    const h = T.spot('BTN', 'AhKd', 'Qs7c2d', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'bet', 2]]);
    const v = PT.bots.publicView(h, 0), ctx = { v, me: v.players[0], L: v.legal, street: 1, pot: v.pot, eqNow: null, opps: [{ p: v.players.find(q => q.pos === 'BB') }], feat: PT.ranges.handFeatures(v.cards, v.board), ip: true, spr: 5, nOpp: 1, board: v.board, maxOppStack: 9000 };
    const ec = PT.ev.evCall(ctx), ek = PT.ev.evCheck(Object.assign({}, ctx));
    ok(isFinite(ec.ev) && ec.parts.failed && ec.parts.approx, 'evCall ohne Equity: endlich und gekennzeichnet (' + ec.ev + ')');
    ok(isFinite(ek.ev) && ek.parts.failed, 'evCheck ohne Equity: endlich und gekennzeichnet');
    // Coach: Range des Gegners künstlich leer → gekennzeichneter Rückfall
    const orig = PT.ranges.preflopRange;
    try {
      PT.ranges.preflopRange = function () { return new Float64Array(1326); };
      const a = PT.coach.analyze({ view: v, opps: {}, settings: { mode: 'exploit', level: 'standard' }, seed: 7, live: true });
      ok(a.equity.failed && /Rückfall/.test(a.equity.method) && a.equity.se >= 0.29, 'Equity als Rückfall gekennzeichnet (' + a.equity.method + ', SE ' + a.equity.se + ')');
      ok(a.classification === 'unsicher', 'Klassifikation „unsicher“ (' + a.classification + ')');
      ok(a.actions.every(x => isFinite(x.ev) && isFinite(x.u)), 'alle EV-Werte endlich');
    } finally { PT.ranges.preflopRange = orig; }
  });
  test('Prüfer A 4: ausgefallene Mehrgegner-Equity als Näherung gekennzeichnet, Unsicherheit erhöht', () => {
    const h = T.spot('BTN', 'AhKd', 'Qs7c2d', [['CO', 'raise', 2.5], ['H', 'call'], ['BB', 'call'], ['BB', 'check'], ['CO', 'check']]);
    const v = PT.bots.publicView(h, 0), orig = PT.equity.equity;
    try {
      PT.equity.equity = function (o) { if (o.ranges && o.ranges.length > 1) return { eq: null, iters: 0, method: 'Monte Carlo', failed: true, reason: 'Test: Ausfall' }; return orig.apply(this, arguments); };
      const a = PT.coach.analyze({ view: v, opps: {}, settings: { mode: 'exploit', level: 'standard' }, seed: 8, live: true });
      ok(a.equity.approx && /Näherung: Produkt/.test(a.equity.method) && !/Monte Carlo \(Mehrgegner\)/.test(a.equity.method), 'als Näherung beschriftet (' + a.equity.method + ')');
      ok(a.equity.se >= 0.06, 'Standardfehler ehrlich erhöht (' + a.equity.se + ')');
      ok(a.classification !== 'eindeutig' || a.gap >= 3 * a.uncertainty, 'keine „eindeutig“-Einstufung ohne großen Abstand');
    } finally { PT.equity.equity = orig; }
  });
  test('Prüfer A 12: Bayes-Beleg vergleicht auf derselben Skala (Break-even in den größenunabhängigen Rohwert umgerechnet)', () => {
    function run(size) {
      const h = T.spot('BB', '7c2s', '', [['BTN', 'raise', 2.5]]);
      const btn = h.p.find(q => q.pos === 'BTN'), rec = PT.stats.newRecord(btn.id, btn.name);
      rec.hands = 400; rec.stats.foldTo3Bet = [80, 100]; rec.stats.vpip = [120, 400]; rec.stats.pfr = [100, 400];
      const v = PT.bots.publicView(h, 0), amt = Math.round(size * 250);
      return PT.coach.analyze({ view: v, opps: { [btn.id]: rec }, settings: { mode: 'exploit', level: 'standard' }, seed: 5, live: true, extra: [amt] });
    }
    const a = run(4.2), ev = a.chart && a.chart.evidence;
    ok(ev && ev.key === 'foldTo3Bet', 'Beleg berechnet (' + (ev ? ev.key : '-') + ')');
    if (ev) {
      // Seit Prüfer B, Befund 5: Umkehr der ganzen Modell-Fold-Rate f = chartF·(1 − w) + (r + 0,07·(Vielfaches − 3))·w, skeptischer Prior um r*
      const exp = (ev.fBe - ev.chartF * (1 - ev.w)) / ev.w - 0.07 * (ev.mult - 3);
      ok(Math.abs(ev.w - 100 / 125) < 1e-9 && Math.abs(ev.fBeRaw - exp) < 1e-9, 'fBeRaw = Rate, bei der die Modell-Fold-Rate fBe erreicht (' + ev.fBeRaw.toFixed(4) + ' vs ' + exp.toFixed(4) + ')');
      const k = PT.ranges.PRIOR_K.foldTo3Bet, aa = ev.fBeRaw * k + 80, bb = (1 - ev.fBeRaw) * k + 20;
      ok(Math.abs(ev.p - (1 - PT.coach.betaCdf(ev.fBeRaw, aa, bb))) < 1e-9, 'Wahrscheinlichkeit aus der Posterior (skeptischer Prior um die Schwelle)');
    }
  });
};
