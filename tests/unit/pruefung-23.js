/* 2.3 (Arbeitspaket 9): Regressionstests zu den offenen und teilweise behobenen Prüfbefunden aus 2.2 (docs/audit-2.2/PRUEFUNG_2.2.md). */
'use strict';
module.exports = function (T) {
  const { test, ok, PT } = T;
  test('Prüfbefund C-7: Reparatur der Lerndaten zählt jede verworfene oder gekürzte Struktur und hält die Grenzen der Prüfung ein', () => {
    const L = PT.training.newLearning();
    const srs = []; for (let i = 0; i < 400; i++) srs.push({ key: 'k' + i, cat: 'cbet', box: 1, due: 0, seed: i, label: 'Spot ' + i, reviews: 0 });
    const good = Object.assign({}, L, { srs });
    ok(PT.training.validLearning(good) === null, 'Testdaten gültig: ' + PT.training.validLearning(good));
    // 1) pp kein Array → gezählt
    const r1 = PT.training.repairLearning(Object.assign({}, good, { pp: 'kaputt' }));
    ok(r1 && r1.removed >= 1 && r1.learning.pp === undefined, 'pp kein Array: removed ' + (r1 && r1.removed));
    // 2) gültige Wiederholungen bis 1.000 bleiben erhalten (vorher still auf 300 gekürzt)
    const r2 = PT.training.repairLearning(Object.assign({}, good, { quiz: null }));
    ok(r2.learning.srs.length === good.srs.length, 'Wiederholungen erhalten: ' + r2.learning.srs.length + ' von ' + good.srs.length);
    // 3) Sessions bleiben erhalten (vorher verworfen)
    const r3 = PT.training.repairLearning(Object.assign({}, good, { sessions: [{ t: 1, n: 5 }, { t: 2, n: 3 }], quiz: null }));
    ok(r3.learning.sessions.length === 2, 'Sessions erhalten: ' + r3.learning.sessions.length);
    // 4) ungültige Session zählt
    const r4 = PT.training.repairLearning(Object.assign({}, good, { sessions: [{ t: 1 }, 7] }));
    ok(r4.removed === 1 && r4.learning.sessions.length === 1, 'ungültige Session gezählt: removed ' + r4.removed);
    // 5) reparierte Daten bestehen die Prüfung
    ok(PT.training.validLearning(r3.learning) === null, 'repariert gültig: ' + PT.training.validLearning(r3.learning));
  });
};
