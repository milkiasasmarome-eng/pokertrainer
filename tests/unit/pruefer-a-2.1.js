/* Regressionstests zu den Befunden von Prüfer A (Version 2.1): Cache, Hash, seltene Verteilungen, Fehlerschätzung, Veränderungstest */
'use strict';
module.exports = function (T) {
  const { PT, test, ok } = T, H = PT.hands, NC = H.NC;
  const C = s => PT.parseCards(s.replace(/ /g, ''));
  const R = l => { const w = new Float64Array(NC); l.forEach(([s, v]) => { const c = C(s); w[H.comboIdx(c[0], c[1])] = v; }); return w; };
  test('Prüfer A 2.1: Cache nutzt Einträge nur nach Umfang, Ersetzung nach Umfang, Hash ohne Sammelkennung, seltene Tupel, Fehler nie 0', () => {
    const E = PT.equity;
    // Befund 1: Nutzung unabhängig vom geschätzten Fehler – ein kleiner Eintrag mit se ≤ Ziel genügt nicht mehr
    ok(!E.usable({ eq: 0.99, n: 1200, se: 0.003, exact: false, aborted: null }, { seT: 0.005, minN: 0, nMax: 20000, exactPossible: false }), 'kleiner Eintrag mit zufällig kleinem SE wird nicht genutzt');
    ok(E.usable({ eq: 0.5, n: 10000, se: 0.005, exact: false, aborted: null }, { seT: 0.005, minN: 0, nMax: 20000, exactPossible: false }), 'Eintrag mit Umfang für jede Equity wird genutzt');
    // Befund 6: unendliche Gewichte und Überlauf
    const a = new Float64Array(NC), b = new Float64Array(NC); a[5] = Infinity; b[9] = Infinity;
    ok(PT.ranges.hash(a) !== PT.ranges.hash(b), 'verschiedene ungültige Ranges haben verschiedene Kennungen');
    const big = new Float64Array(NC), small = new Float64Array(NC); big[1] = 1e306; big[2] = 1e306; small[1] = 1; small[2] = 1;
    ok(PT.ranges.hash(big) === PT.ranges.hash(small) && PT.ranges.hash(big) !== 'h2leer', 'sehr große Gewichte: kein Überlauf, proportional = gleich');
    // Befund 4: seltene, aber gültige Verteilung
    const inp = { hero: C('JhTh'), board: C('9h8c2d3s'), ranges: [R([['AhAs', 1], ['KcKd', 1e-4]]), R([['AhAs', 1], ['QcQd', 1e-4]])], level: 'standard', cache: false, deadline: Infinity };
    let fail = 0; for (let k = 0; k < 20; k++) { const r = E.equity(Object.assign({}, inp, { rng: PT.makeRng('selten' + k) })); if (r.failed || !(r.eq > 0)) fail++; }
    ok(fail === 0, 'seltene gültige Tupel: kein Fehlschlag (' + fail + ' von 20)');
    const imp = E.equity(Object.assign({}, inp, { ranges: [R([['AhAs', 1]]), R([['AhAs', 1]])], rng: PT.makeRng(1) }));
    ok(imp.failed && /alle Kombinationstupel/.test(imp.reason), 'unvereinbare Ranges: belegter Fehlschlag');
    // Befund 8: potShare nie SE 0 bei Schätzungen
    const ps = E.potShare({ hero: C('AhAd'), heroTotal: 100, board: C('2c7d9s'), rng: PT.makeRng(3), iters: 1, opps: [{ w: R([['KhKd', 1]]), total: 100 }] });
    ok(ps.n === 1 && ps.se > 0, 'potShare mit einer Stichprobe: SE > 0');
  });
  test('Prüfer A 2.1: Veränderungstest robust (NaN) und AFq mit Design-Effekt', () => {
    const S = PT.stats;
    ok(S.changeTest([NaN, 100], [5, 20, 10]) === null, 'NaN-Zähler: kein Testergebnis');
    const t1 = S.changeTest([60, 200], [30, 40, 25], 'vpip'), t2 = S.changeTest([60, 200], [30, 40, 25], 'afq');
    ok(t1 && t2 && Math.abs(t2.z) < Math.abs(t1.z), 'AFq: Varianz mit Design-Effekt erhöht (|z| kleiner)');
  });
};
