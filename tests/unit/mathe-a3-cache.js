/* A3 – Equity-Cache mit Qualitätsangabe: eine weniger genaue Analyse (kleines Budget, Zeitabbruch, geringere Stufe,
   Monte Carlo statt exakt) darf eine genauere Anfrage nicht bedienen. */
'use strict';
module.exports = function (T) {
  const { PT, test, ok } = T, Q = PT.equity, H = PT.hands, C = s => PT.parseCards(s);
  const rangeOf = list => { const w = new Float64Array(H.NC); list.forEach(s => { const c = C(s); w[H.comboIdx(c[0], c[1])] = 1; }); return w; };
  const hero = C('QcJd'), board = C('Qh8d5s3c2h');
  const ranges = [rangeOf(['AsQs', 'KcQd', 'JcJh', 'TdTs', '9h9c', '8s7s', 'AhKh', '6c6d']), rangeOf(['AcAd', 'Qs9s', 'JsTs', '8h8c', '5c5d', 'Kd9d', '7h6h', '4c4d'])];
  test('A3 Cache: erst kleines Budget, dann großes → neue Rechnung mit besserer Qualität', () => {
    Q.cacheClear();
    const small = Q.equity({ hero, board, ranges, level: 'standard', rng: PT.makeRng(1), budget: { left: 300, used: 0 }, deadline: Infinity });
    const big = Q.equity({ hero, board, ranges, level: 'standard', rng: PT.makeRng(2), budget: { left: 5000, used: 0 }, deadline: Infinity });
    ok(!big.cached && big.iters > 300, 'zweite Anfrage rechnet neu (cached ' + !!big.cached + ', ' + big.iters + ' Simulationen)');
    ok(big.se <= Q.LEVELS.standard.se * 1.05 && big.se < small.se, 'bessere Qualität: SE ' + big.se.toFixed(4) + ' statt ' + small.se.toFixed(4));
    // gleiche kleine Anfrage noch einmal: der bessere Eintrag darf sie bedienen
    const again = Q.equity({ hero, board, ranges, level: 'standard', rng: PT.makeRng(3), budget: { left: 300, used: 0 }, deadline: Infinity });
    ok(again.cached && again.se === big.se, 'bessere Analyse bedient spätere kleinere Anfrage');
    Q.cacheClear();
  });
  test('A3 Cache: Stufen, Zeitabbruch, Mindestanzahl, exakt vor Monte Carlo', () => {
    Q.cacheClear();
    const fast = Q.equity({ hero, board, ranges, level: 'schnell', rng: PT.makeRng(4), deadline: Infinity });
    const prec = Q.equity({ hero, board, ranges, level: 'praezise', rng: PT.makeRng(5), deadline: Infinity });
    ok(!prec.cached && prec.se < fast.se, 'Präzise nach Schnell rechnet neu');
    const fast2 = Q.equity({ hero, board, ranges, level: 'schnell', rng: PT.makeRng(6), deadline: Infinity });
    ok(fast2.cached && fast2.se === prec.se, 'Schnell nach Präzise nutzt den genaueren Eintrag');
    Q.cacheClear();
    // Zeitabbruch: Eintrag gilt als abgebrochen und bedient keine normale Anfrage
    const cut = Q.equity({ hero, board, ranges, level: 'standard', rng: PT.makeRng(7), deadline: PT.util.now() - 1 });
    ok(cut.aborted === 'zeit', 'Zeitabbruch gekennzeichnet (' + cut.aborted + ', n ' + cut.n + ')');
    const full = Q.equity({ hero, board, ranges, level: 'standard', rng: PT.makeRng(8), deadline: Infinity });
    ok(!full.cached && full.n > cut.n, 'nach Zeitabbruch neue Rechnung');
    // Mindestanzahl
    Q.cacheClear();
    Q.equity({ hero, board, ranges, level: 'schnell', rng: PT.makeRng(9), budget: { left: 200, used: 0 }, deadline: Infinity });
    const m = Q.equity({ hero, board, ranges, level: 'schnell', rng: PT.makeRng(10), budget: { left: 400, used: 0 }, minIter: 300, deadline: Infinity });
    ok(!m.cached && m.n >= 300, 'Mindestanzahl 300 nicht durch 200er-Eintrag bedient');
    // exakt: Heads-up River mit Monte-Carlo-Eintrag (exact:false) und danach exakter Anfrage
    Q.cacheClear();
    const mc = Q.equity({ hero, board, ranges: [ranges[0]], level: 'praezise', exact: false, rng: PT.makeRng(11), deadline: Infinity });
    const ex = Q.equity({ hero, board, ranges: [ranges[0]], level: 'schnell' });
    ok(!mc.exact && ex.exact && !ex.cached, 'exakt mögliche Anfrage wird nicht mit Monte-Carlo-Eintrag bedient');
    const mc2 = Q.equity({ hero, board, ranges: [ranges[0]], level: 'tief', exact: false, rng: PT.makeRng(12), deadline: Infinity });
    ok(mc2.cached && mc2.exact, 'exakter Eintrag bedient jede Anfrage');
    Q.cacheClear();
  });
};
