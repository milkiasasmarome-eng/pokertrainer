/* Monte-Carlo-Equity: Erwartungstreue der Stoppregel, Wilson-artiges Intervall für beschränkte Größen, Ränder,
   Split-lastige Stichproben, fester Umfang bei Budgetgrenze. Langlauf mit vielen Referenzfällen: node tests/long.js mccov */
'use strict';
module.exports = function (T) {
  const { PT, test, ok, eq, QUICK } = T, Q = PT.equity;
  const L = require('../ref/mccov-lib.js');
  test('MC: Intervall für beschränkte Größen (Ränder, Split-lastig, Binomial)', () => {
    const s0 = Q.summarize(500, 0, 0), s1 = Q.summarize(500, 500, 500);
    ok(s0.lo === 0 && s0.hi > 0 && s0.hi < 0.01, 'alle 0: [0, ' + s0.hi.toFixed(4) + ']');
    ok(s1.hi === 1 && s1.lo < 1 && s1.lo > 0.99, 'alle 1: [' + s1.lo.toFixed(4) + ', 1]');
    const h = Q.summarize(500, 250, 125);   // lauter Split Pots (je 1/2)
    ok(h.lo < 0.5 && h.hi > 0.5 && h.hi - h.lo < 0.01 && h.hi - h.lo > 0, 'konstant 1/2: schmales, nicht leeres Intervall (' + (h.hi - h.lo).toFixed(5) + ')');
    const b = Q.summarize(1000, 300, 300);  // Bernoulli
    eq(b.phi, 1, 'reine Binomialgröße: φ = 1');
    const t = Q.summarize(1000, 500 + 0.5 * 400, 500 + 0.25 * 400);  // 50 % Siege, 40 % Split, 10 % Niederlagen
    ok(t.phi < 0.6 && t.se < Math.sqrt(0.7 * 0.3 / 1000), 'Split-lastig: φ < 1, kleinerer Standardfehler als binomial');
    ok(Q.planSize(256, 256, 256, 0.005) < 10000 && Q.planSize(256, 128, 128, 0.005) === 10000, 'Planung: Rand braucht weniger, Mitte den ungünstigsten Umfang');
  });
  test('MC: Stichprobenumfang hängt nicht von den Werten ab (fester Umfang bei Budgetgrenze, Pilot nicht in der Schätzung)', () => {
    const S = L.make(PT), a = S.inputs(S.spots.find(s => s.id === 'hu-turn-vorn')), b = S.inputs(S.spots.find(s => s.id === 'hu-turn-gutshot'));
    const ns = [a, b].map(x => Q.equity(Object.assign({}, x, { level: 'standard', exact: false, cache: false, rng: PT.makeRng(1), budget: { left: 1000, used: 0 }, deadline: Infinity })));
    ok(ns[0].n === 1000 && ns[1].n === 1000 && ns[0].pilot === 0, 'Budget 1.000: beide Fälle genau 1.000 Stichproben (' + ns.map(r => r.n).join('/') + ')');
    ok(ns.every(r => r.aborted === 'budget'), 'Budgetgrenze vor dem Ziel-SE gekennzeichnet');
    const p = Q.equity(Object.assign({}, a, { level: 'praezise', exact: false, cache: false, rng: PT.makeRng(2), deadline: Infinity }));
    ok(p.pilot === 256 && p.n === p.planned && p.iters === p.pilot + p.n && !p.aborted, 'Zwei-Stufen-Verfahren: Schätzung nur aus der zweiten Stufe (' + p.n + ' von ' + p.iters + ')');
    ok(p.se <= Q.LEVELS.praezise.se, 'Ziel-SE erreicht (' + p.se.toFixed(4) + ')');
  });
  test('MC: keine Randverzerrung (Regression 2.0.1: exakt 0,9886, MC-Mittel 0,9903 auf Präzise)', () => {
    const K = QUICK ? 300 : 800, r = L.runSpot(PT, 'hu-turn-vorn', K, ['praezise']), c = r.configs.praezise;
    ok(Math.abs(c.z) < 4, 'Verzerrung z = ' + c.z.toFixed(2) + ' (Mittel ' + c.mean.toFixed(5) + ', exakt ' + r.exact.toFixed(5) + ')');
    ok(c.coverage >= 0.9, 'Abdeckung ' + (100 * c.coverage).toFixed(1) + ' %');
  });
  test('MC: Abdeckung der 95-%-Intervalle (Stichprobe der Referenzfälle, Stufe Schnell und Budget 1.000)', () => {
    const K = QUICK ? 150 : 400, ids = ['hu-flop-set', 'hu-turn-2outs', 'hu-river-board', 'mw-river-mitte', 'mw-turn-konflikt', 'mw-river-konstant'];
    const res = ids.map(id => L.runSpot(PT, id, K, ['schnell', 'standard-budget1000']));
    const j = L.judge(res);
    ['schnell', 'standard-budget1000'].forEach(cid => {
      const lv = j.levels[cid];
      ok(lv.coverage >= 0.92 && lv.coverage <= 0.98, cid + ': Abdeckung ' + (100 * lv.coverage).toFixed(1) + ' % (' + lv.runs + ' Läufe)');
      ok(lv.degenerateOk === lv.degenerateSpots, cid + ': konstanter Fall exakt getroffen');
      ok(lv.zAbsMax < 4, cid + ': größte Verzerrung |z| = ' + lv.zAbsMax.toFixed(2));
    });
  });
};
