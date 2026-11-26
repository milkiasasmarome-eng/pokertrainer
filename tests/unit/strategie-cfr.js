/* 2.1 Strategie: River-Modellspiel mit optionalem Raise, unabhängige Best-Response-Prüfung, analytische Spiele */
'use strict';
module.exports = function (T) {
  const { PT, test, ok } = T;
  const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, msg + ': erwartet ' + b + ' ± ' + tol + ', erhalten ' + a);
  test('CFR 2.1: unabhängige Best Response stimmt mit der Exploitability der Lösung überein (ohne/mit Raises, Stackgrenze)', () => {
    const rng = PT.makeRng('cfr-unabh');
    for (let g = 0; g < (T.QUICK ? 4 : 12); g++) {
      const B = 3 + (g % 3), J = [], M = []; let tot = 0;
      for (let i = 0; i < B; i++) { J.push([]); M.push([]); for (let j = 0; j < B; j++) { const w = rng(); J[i].push(w); tot += w; M[i].push(i > j ? 0.85 + 0.15 * rng() : i < j ? 0.15 * rng() : 0.5); } }
      J.forEach(r => r.forEach((x, j) => { r[j] = x / tot; }));
      [false, 'ip', 'oop', true].forEach(ra => {
        const opts = { raise: ra, stack: g % 2 ? 1.2 : 4 }, s = PT.cfr.solveMatrix(J, M, [0.5, 1], 1500, opts), map = {}; s.nodes.forEach(n => { map[n.name] = n; });
        const e = PT.cfr.evaluate(J, M, [0.5, 1], opts, (name, p, b) => map[name].s[b]);
        near(e.value, s.value, 1e-9, 'Spielwert Spiel ' + g + ' Raise ' + ra);
        near(e.exploitability, s.exploitability, 1e-9, 'Exploitability Spiel ' + g + ' Raise ' + ra);
        ok(s.exploitability < 0.004, 'Exploitability klein (' + s.exploitability.toExponential(2) + ')');
      });
    }
  });
  test('CFR 2.1: analytische Spiele – dominierter Raise ändert die geschlossene Lösung nicht; Raise-Option nützt dem Erhöhenden', () => {
    // Nuts/Luft (OOP) gegen Bluffcatcher (IP): IP-Raise ist dominiert (gegen Nuts teurer, gegen Luft nicht mehr wert als Call)
    [[0.3, 1], [0.25, 0.5]].forEach(([rho, b]) => {
      const s = PT.cfr.solveMatrix([[rho], [1 - rho]], [[1], [0]], [b], 4000, { raise: true }), root = s.nodes[0];
      const airBet = 1 - root.s[1][0], expAir = Math.min(1, rho * (b / (1 + b)) / (1 - rho));
      near(airBet, expAir, 0.02, 'Bluff-Häufigkeit mit Raise-Option (ρ=' + rho + ', b=' + b + ')');
      const ipb = s.nodes.filter(n => n.name === 'IP gegen Bet ' + b)[0];
      near(ipb.s[0][1], 1 / (1 + b), 0.02, 'Call-Häufigkeit'); ok(ipb.s[0][2] < 0.01, 'kein Raise mit dem Bluffcatcher (' + ipb.s[0][2].toFixed(4) + ')');
    });
    // Zusätzliche Aktion nur für IP: Spielwert von IP sinkt nicht (Nullsummenspiel)
    const J = [[0.2, 0.1, 0.1], [0.1, 0.2, 0.1], [0.05, 0.05, 0.1]], M = [[0.5, 0.1, 0.05], [0.9, 0.5, 0.2], [0.95, 0.8, 0.5]];
    const a = PT.cfr.solveMatrix(J, M, [0.75], 3000, {}), b2 = PT.cfr.solveMatrix(J, M, [0.75], 3000, { raise: 'ip' }), c = PT.cfr.solveMatrix(J, M, [0.75], 3000, { raise: 'oop' });
    ok(b2.value <= a.value + 0.002, 'IP-Raise: OOP-Wert sinkt oder bleibt (' + a.value.toFixed(4) + ' → ' + b2.value.toFixed(4) + ')');
    ok(c.value >= a.value - 0.002, 'Check-Raise: OOP-Wert steigt oder bleibt (' + a.value.toFixed(4) + ' → ' + c.value.toFixed(4) + ')');
    // Stackgrenze: Einsatz größer als der Stack wird zum All-in, kein Raise mehr möglich
    const t = PT.cfr.buildTree([0.5, 2], { raise: true, stack: 1 });
    ok(t.sizes.join() === '0.5,1', 'Größen auf den Stack begrenzt (' + t.sizes.join() + ')');
    ok(!t.nodes.some(n => n.name === 'OOP gegen Raise 1'), 'kein Raise gegen ein All-in');
    ok(t.nodes.some(n => n.name === 'OOP gegen Raise 0.5' && n.kids[1].inv === 1), 'Raise gegen 0,5 Pot auf den Stack begrenzt');
  });
  test('CFR 2.1: River-Modell im Coach mit Raise-Option, Exploitability und Rechenzeit', () => {
    const h = T.spot('BTN', 'AhKd', '2c7d9hJsKs', [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check'], ['H', 'bet', 3], ['BB', 'call'], ['BB', 'check'], ['H', 'check'], ['BB', 'bet', 6]]);
    const a = PT.coach.analyze({ view: PT.bots.publicView(h, 0), opps: {}, settings: { mode: 'gto', level: 'standard' }, seed: 3, live: true });
    ok(a.model && a.model.freqs.some(f => /^Raise/.test(f.act)), 'IP gegen River-Bet: Raise als Modellaktion (' + (a.model ? a.model.freqs.map(f => f.act).join(', ') : 'kein Modell') + ')');
    ok(a.model && a.model.exploitability < 0.02, 'Exploitability des Modellspiels < 2 % des Pots');
    ok(a.model && /kein No-Limit-Solver/.test(a.model.note), 'ehrliche Kennzeichnung im Modelltext');
    ok(a.ms < 2000 && a.iters <= 5000, 'Tipp ≤ 2 s und ≤ 5.000 Simulationen (' + a.ms + ' ms, ' + a.iters + ')');
  });
};
