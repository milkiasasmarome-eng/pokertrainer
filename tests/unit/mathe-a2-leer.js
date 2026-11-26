/* A2 – Schutz vor leeren Ranges und unmöglichen gemeinsamen Verteilungen in potShare() und equity(),
   Wirkung bis ev.evCall (sauberer Rückfall mit Kennzeichnung). Nie NaN, undefined, ungültige Karten oder still 0. */
'use strict';
module.exports = function (T) {
  const { PT, test, ok, eq } = T, R = PT.ranges, H = PT.hands, Q = PT.equity, C = s => PT.parseCards(s);
  const one = s => { const w = R.empty(), c = C(s); w[H.comboIdx(c[0], c[1])] = 1; return w; };
  const finiteOrNull = x => x === null || (typeof x === 'number' && isFinite(x));
  test('A2 potShare: Range durch bekannte Karten vollständig entfernt → Fehlschlag statt Zufallszahl', () => {
    // Gegner nur AhKh, der Held hält Ah: vorher wurden undefinierte Karten bewertet (Gewinn 176 statt Fehler)
    const r = Q.potShare({ hero: C('AhAd'), heroTotal: 1000, board: C('2c7d9s'), opps: [{ w: one('AhKh'), total: 1000 }], rng: PT.makeRng(1), iters: 500 });
    ok(r.failed === true && r.win === null, 'failed und win = null (ist ' + JSON.stringify({ win: r.win, failed: r.failed }) + ')');
    ok(typeof r.reason === 'string' && /leer/.test(r.reason), 'Grund genannt: ' + r.reason);
    const r2 = Q.potShare({ hero: C('AhAd'), heroTotal: 1000, board: C('2c7d9s'), opps: [{ w: one('QsQc'), total: 1000 }, { w: one('AhKh'), total: 1000 }], rng: PT.makeRng(1), iters: 500 });
    ok(r2.failed === true && r2.win === null, 'zweiter Gegner leer → Fehlschlag');
    // Board-Karte entfernt die Range
    const r3 = Q.potShare({ hero: C('AsAd'), heroTotal: 1000, board: C('Kh7d9s'), opps: [{ w: one('KhQh'), total: 1000 }], rng: PT.makeRng(2), iters: 300 });
    ok(r3.failed === true, 'Board-Karte entfernt einzige Kombination');
  });
  test('A2 potShare: einzeln gültige Ranges ohne gemeinsame konfliktfreie Verteilung → Fehlschlag, kein stiller 0-Gewinn', () => {
    const r = Q.potShare({ hero: C('AhAd'), heroTotal: 1000, board: C('2c7d9s'), opps: [{ w: one('KsKc'), total: 1000 }, { w: one('KsKc'), total: 1000 }], rng: PT.makeRng(1), iters: 500 });
    ok(r.failed === true && r.win === null, 'zwei Gegner mit derselben Einzelkombination (ist ' + JSON.stringify({ win: r.win, failed: r.failed }) + ')');
    ok(r.iters <= 64, 'früher Abbruch nach höchstens 64 Versuchen (ist ' + r.iters + ')');
    const r2 = Q.potShare({ hero: C('AhAd'), heroTotal: 1000, board: C('2c7d9s'), opps: [{ w: one('KsKc'), total: 1000 }, { w: one('KsKd'), total: 1000 }], rng: PT.makeRng(1), iters: 500 });
    ok(r2.failed === true, 'überlappende Einzelkombinationen (gemeinsame Karte Ks)');
    const r3 = Q.potShare({ hero: C('AhAd'), heroTotal: 1000, board: C('2c7d9s'), opps: [{ w: one('KsKc'), total: 1000 }], rng: PT.makeRng(1), iters: 500, budget: { left: 0, used: 0 } });
    ok(r3.failed === true && /budget/i.test(r3.reason), 'kein Budget → Fehlschlag mit Grund');
    // gültiger Fall: endliche Werte, Karten gültig
    const g = Q.potShare({ hero: C('AhAd'), heroTotal: 1000, board: C('2c7d9s'), opps: [{ w: one('KsKc'), total: 1000 }, { w: one('QsQc'), total: 1000 }], rng: PT.makeRng(1), iters: 2000 });
    ok(!g.failed && g.win > 0 && g.win <= 3000 && isFinite(g.se), 'gültiger Mehrgegner-Fall: Gewinn ' + g.win);
  });
  test('A2 equity: leere Range und unmögliche Verteilung → {eq: null, failed, reason}; Budget wird nicht verbraucht', () => {
    const a = Q.equity({ hero: C('AhAd'), board: C('2c7d9s'), ranges: [one('AhKh')], cache: false });
    ok(a.eq === null && a.failed === true && typeof a.reason === 'string', 'leere Range gekennzeichnet');
    const bud = { left: 5000, used: 0 };
    const b = Q.equity({ hero: C('AhAd'), board: C('2c7d9s'), ranges: [one('KsKc'), one('KsKc')], cache: false, rng: PT.makeRng(2), budget: bud });
    ok(b.eq === null && b.failed === true && /konfliktfrei/.test(b.reason || ''), 'keine konfliktfreie Verteilung gekennzeichnet: ' + b.reason);
    ok(bud.used <= 64, 'Budget kaum verbraucht (' + bud.used + ' statt 5.000)');
    [a, b].forEach(r => ['eq', 'se', 'lo', 'hi'].forEach(k => ok(finiteOrNull(r[k]), k + ' ist Zahl oder null')));
  });
  test('A2 evCall: Rückfall bei fehlgeschlagener Side-Pot-Rechnung, gekennzeichnet in parts', () => {
    // Held All-in-Call; einziger Gegner hat laut Range nur AhKh, der Held hält Ah → potShare schlägt fehl
    const hero = C('AhAd'), board = C('2c7d9s');
    const ctx = { L: { callAmt: 900, toCall: 900 }, me: { seat: 0, stack: 900, total: 100, bet: 100 }, board, rng: PT.makeRng(3), budget: { left: 5000, used: 0, calls: [] },
      v: { cards: hero, players: [{ seat: 0, total: 100 }, { seat: 1, total: 1000 }] }, opps: [{ p: { allIn: true, total: 1000, bet: 1000, stack: 0 }, w: one('AhKh') }],
      eqNow: 0.8, pot: 1100, deadList: [], deadMoney: 0, deadline: Infinity };
    const r = PT.ev.evCall(ctx);
    ok(typeof r.ev === 'number' && isFinite(r.ev), 'EV endlich (' + r.ev + ')');
    ok(r.parts && r.parts.approx === true && r.parts.failed === true && typeof r.parts.reason === 'string', 'parts: approx, failed, reason (' + JSON.stringify(r.parts) + ')');
    eq(r.parts.expectedWin, undefined, 'kein expectedWin aus ungültiger Rechnung');
    const ok2 = PT.ev.evCall(Object.assign({}, ctx, { opps: [{ p: { allIn: true, total: 1000, bet: 1000, stack: 0 }, w: one('KsKc') }], budget: { left: 5000, used: 0, calls: [] } }));
    ok(ok2.parts.approx !== true && ok2.parts.expectedWin > 0, 'gültiger Fall rechnet side-pot-genau');
  });
};
