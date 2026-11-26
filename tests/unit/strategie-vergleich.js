/* 2.1 Strategie: Vergleichsrahmen – Block-Bootstrap, gepaarte Differenz, All-in-Bereinigung, automatische Berichtsaussagen */
'use strict';
module.exports = function (T) {
  const { PT, test, ok } = T;
  test('Vergleichsrahmen: Block-Bootstrap deckt den wahren Mittelwert ab, gepaarte Differenz identischer Läufe ist 0', () => {
    const BS = require('../strategy/bootstrap.js'), rng = PT.makeRng('bs');
    let cover = 0; const reps = T.QUICK ? 40 : 150;
    for (let r = 0; r < reps; r++) {
      // AR(1)-Prozess je Hand (Mittel 0,05 BB, abhängige Nachbarhände), 20.000 Hände, Summen je 100 Hände
      const blocks = []; let x = 0, s = 0;
      for (let i = 0; i < 20000; i++) { const z = (rng() + rng() + rng() - 1.5) * 4; x = 0.5 * x + z; s += 0.05 + x; if ((i + 1) % 100 === 0) { blocks.push(s); s = 0; } }
      const b = BS.blockBootstrap([{ blocks, hands: 20000 }], 500, 400, r + 1);
      if (b.lo <= 5 && 5 <= b.hi) cover++;
    }
    ok(cover / reps >= 0.85, 'Abdeckung des 95-%-Intervalls ' + (100 * cover / reps).toFixed(0) + ' % (Soll ≈ 95 %, Toleranz für kleine Wiederholungszahl)');
    const run = { blocks: [1, -2, 3, 4, -5], hands: 500 }, p = BS.pairRuns(run, run), b0 = BS.blockBootstrap([p], 100, 200, 1);
    ok(b0.bb100 === 0 && b0.lo === 0 && b0.hi === 0, 'identische Läufe: Differenz 0');
  });
  test('Vergleichsrahmen: All-in-Bereinigung reproduziert die Abrechnung und ändert River-Entscheidungen nicht', () => {
    const HS = require('../strategy/harness.js'), sim = require('../sim-lib.js');
    let n = 0, bad = 0, ai = 0, riverSame = 0, river = 0;
    sim.run({ hands: T.QUICK ? 1500 : 6000, seed: 3, onHand: (h) => {
      if (!h.result.showdown) return;
      const e = h.p.map(q => ({ seat: q.seat, total: q.total, folded: q.folded, cards: q.cards }));
      const r = HS.PT.rules.settle(e, h.board, h.button, h.N, h.rake, !!h.sawFlop); n++; if (r.payout[0] - h.p[0].total !== h.result.net[0]) bad++;
      const a = HS.allInAdjusted(h, 'u' + h.no); if (a.allin) ai++;
      const last = h.actions.filter(x => x.t !== 'sb' && x.t !== 'bb').pop();
      if (last && last.st === 3) { river++; if (!a.allin && a.adj === a.net) riverSame++; }
    } });
    ok(bad === 0, 'Abrechnung mit dem echten Board = Ergebnis (' + n + ' Showdowns, ' + bad + ' Abweichungen)');
    ok(riverSame === river, 'Entscheidung am River: keine Bereinigung (' + riverSame + '/' + river + ')');
    ok(ai > 0, 'All-ins vor dem River kommen vor (' + ai + ')');
  });
  test('Vergleichsrahmen: Berichtsaussagen werden aus den Daten gezählt (z. B. „in k von n Läufen vorn“) und geteilte Läufe gekennzeichnet', () => {
    const RS = require('../../tools/report-strategy.js');
    const mk = (id, a, lo, hi) => ({ id, title: id, a: 'coach21', b: 'coach201', adj: { diff: a, lo, hi, hands: 1000 }, raw: { diff: a, lo, hi }, runsA: ['x1', 'x2', 'x3'], runsB: ['y1', 'y2', 'y3'], aAhead: 2, decisionsA: 10, decisionsB: 10, invalidA: 0, invalidB: 0, sharedRuns: ['y1'], sharedWith: ['andere'], split: {} });
    const d = { plan: 't', date: 'd', node: 'n', cpus: 2, totals: { runs: 6, hands: 1000, coachDecisions: 20, invalidCoach: 0, cpuSeconds: 1 }, method: { primary: 'p', bootstrap: { blockHands: 500, reps: 10, stratified: 'je Lauf' }, verdict: 'v', stacks: 's', streams: 'z' },
      versions: { v21: { coachHash: 'a' }, v201: { coachHash: 'b' }, envHash: 'e' }, comparisons: [mk('v21-v201', 1, -0.5, 2.5)], absolute: [], runs: [] };
    const txt = RS.lines(d).join('\n');
    ok(/In 2 von 3 gepaarten Läufen lag 2\.1 vorn, in 1 2\.0\.1/.test(txt), 'Anzahl aus den Daten');
    ok(/nicht belegt/.test(txt), 'Intervall mit 0: „nicht belegt“');
    ok(/1 Läufe auch in: andere/.test(txt), 'geteilte Läufe gekennzeichnet');
    d.comparisons[0].adj.lo = 0.2; ok(/belegt besser/.test(RS.lines(d).join('\n')), 'Intervall über 0: „belegt besser“');
  });
};
