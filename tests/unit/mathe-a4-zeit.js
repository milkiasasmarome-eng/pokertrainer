/* A4 – Zeitgrenzen: exakte Enumeration und Side-Pot-Simulation prüfen die Deadline; eine abgebrochene exakte
   Aufzählung gilt nie als exakt, Rückfall ist ein gekennzeichnetes Monte-Carlo-Ergebnis. */
'use strict';
module.exports = function (T) {
  const { PT, test, ok } = T, Q = PT.equity, R = PT.ranges, H = PT.hands, C = s => PT.parseCards(s), now = PT.util.now;
  test('A4 exactHU: sehr kleine Deadline → Abbruch, Monte-Carlo-Rückfall, nie „exakt“', () => {
    const hero = C('AhKd'), board = C('Ks8c3d'), w = R.full(); R.removeDead(w, hero.concat(board));
    // Präzise: 1.081 Kombinationen × 990 Runouts ≈ 1,07 Mio. Auswertungspaare → ohne Deadline mehrere hundert ms
    Q.cacheClear();
    const t0 = now(), r = Q.equity({ hero, board, ranges: [w], level: 'praezise', rng: PT.makeRng(1), deadline: t0 + 5, cache: false });
    const ms = now() - t0;
    ok(r.exact === false, 'nicht als exakt gekennzeichnet (exact ' + r.exact + ', Methode ' + r.method + ')');
    ok(r.exactAborted && r.exactAborted.aborted === true && r.exactAborted.done < r.exactAborted.of, 'Abbruch der Aufzählung vermerkt');
    ok(r.eq > 0.5 && r.eq < 1 && r.se > 0 && r.lo < r.eq && r.hi > r.eq, 'Monte-Carlo-Rückfall mit Intervall (' + (r.eq * 100).toFixed(1) + ' % ± ' + (r.se * 100).toFixed(1) + ')');
    ok(ms < 150, 'Laufzeit begrenzt (' + ms.toFixed(0) + ' ms)');
    // direkter Aufruf: Rückgabe {aborted}, kein Ergebnis mit exact: true
    const dm = H.deadMaskOf(hero.concat(board)), x = Q.exactHU(hero, board, Q.prepRange(w, dm), dm, 1e9, now() + 2);
    ok(x && x.aborted === true && x.exact !== true && x.eq === undefined, 'exactHU liefert bei Abbruch kein Teilergebnis als exakt');
    // ausreichende Deadline: exakt
    const full = Q.equity({ hero, board, ranges: [w], level: 'praezise', deadline: Infinity, cache: false });
    ok(full.exact === true && Math.abs(full.eq - r.eq) <= 4 * r.se + 0.01, 'mit genug Zeit exakt; Rückfall verträglich (' + full.eq.toFixed(4) + ')');
  });
  test('A4 potShare und Monte Carlo halten die Deadline', () => {
    const hero = C('AhAd'), board = C('2c7d9s');
    const t0 = now(), r = Q.potShare({ hero, heroTotal: 1000, board, opps: [{ w: R.full(), total: 1000 }, { w: R.full(), total: 1000 }], rng: PT.makeRng(1), iters: 200000, deadline: t0 - 1 });
    ok(r.iters <= 128 && r.aborted === 'zeit' && r.n > 0 && isFinite(r.win), 'potShare bricht an der Zeitgrenze ab (' + r.iters + ' Versuche)');
    const t1 = now(), m = Q.equity({ hero, board, ranges: [R.full(), R.full()], level: 'tief', rng: PT.makeRng(2), deadline: t1 + 3, cache: false });
    ok(m.aborted === 'zeit' && now() - t1 < 100 && m.eq > 0 && m.se > 0, 'Monte Carlo: Zeitabbruch gekennzeichnet (' + m.n + ' Stichproben)');
  });
};
