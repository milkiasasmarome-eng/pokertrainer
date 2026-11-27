/* Abnahmekriterium Performance „Deadline überall“: Equity je Kombination (ev.comboEquities) und das River-Modellspiel
   (cfr.solveMatrix/solveRiver) brechen bei abgelaufener Frist ab, kennzeichnen das Ergebnis und speichern es nicht im Cache. */
'use strict';
module.exports = function (T) {
  const { PT, test, ok } = T, R = PT.ranges, C = s => PT.parseCards(s), now = PT.util.now;
  test('Deadline: comboEquities bricht ab, kennzeichnet „abgebrochen“, nicht im Cache, keine Lücken', () => {
    const w = R.full(), hero = C('AhKh'), board = C('2c7d9s');
    const t0 = now(), r = PT.ev.comboEquities(hero, board, w, { exactMax: 6e6, deadline: t0 + 2 });
    const ms = now() - t0;
    ok(r.info.aborted === true && /abgebrochen/.test(r.info.method), 'abgebrochen gekennzeichnet (' + r.info.method + ')');
    ok(ms < 400, 'Abbruch zügig (' + Math.round(ms) + ' ms)');
    let bad = 0; const dead = PT.hands.deadMaskOf(hero.concat(board));
    for (let k = 0; k < PT.hands.NC; k++) if (!dead[PT.hands.C1[k]] && !dead[PT.hands.C2[k]] && !(r.e[k] >= 0 && r.e[k] <= 1)) bad++;
    ok(bad === 0, 'alle möglichen Kombinationen haben einen Wert in [0,1] (' + bad + ' ohne)');
    const r2 = PT.ev.comboEquities(hero, board, w, { exactMax: 6e6 });
    ok(!r2.info.cached && !r2.info.aborted, 'abgebrochenes Ergebnis wurde nicht aus dem Cache geliefert');
  });
  test('Deadline: River-Modellspiel bricht nach mindestens 50 Iterationen ab und meldet die erreichte Zahl', () => {
    const J = [], M = [], B = 20;
    for (let i = 0; i < B; i++) { J.push(new Float64Array(B).fill(1 / (B * B))); M.push(new Float64Array(B)); for (let j = 0; j < B; j++) M[i][j] = i > j ? 1 : i === j ? 0.5 : 0; }
    const a = PT.cfr.solveMatrix(J, M, [0.5, 1.0], 100000, { raise: true, stack: 3, deadline: now() + 30 });
    ok(a.aborted === true && a.iters >= 50 && a.iters < 100000, 'abgebrochen nach ' + a.iters + ' Iterationen');
    ok(isFinite(a.exploitability), 'Exploitability für den erreichten Stand ausgewiesen');
    const b = PT.cfr.solveMatrix(J, M, [0.5, 1.0], 200, { raise: true, stack: 3 });
    ok(!b.aborted && b.iters === 200, 'ohne Frist vollständig');
  });
};
