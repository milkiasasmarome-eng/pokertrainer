/* Prüfbefund A6: Exploit-Abweichung vom Chart nach Bayes-Beleg statt fester Mindestzahl von Beobachtungen */
'use strict';
module.exports = function (T) {
  const { PT, test, ok } = T;
  test('A6: Bayes-Beleg für Exploits (Beta-CDF, Monotonie in Stichprobe und Abweichung, kein Exploit ohne Beleg)', () => {
    const B = PT.coach.betaCdf;
    ok(Math.abs(B(0.3, 2, 5) - 0.579825) < 1e-5 && Math.abs(B(0.5, 2, 2) - 0.5) < 1e-9, 'Beta-CDF stimmt mit Referenzwerten');
    function run(folds, n) {
      const h = T.spot('BB', '7c2s', '', [['BTN', 'raise', 2.5]]);
      const btn = h.p.find(q => q.pos === 'BTN'), rec = PT.stats.newRecord(btn.id, btn.name);
      rec.hands = Math.max(n * 4, 1); rec.stats.foldTo3Bet = [folds, n]; rec.stats.vpip = [Math.round(rec.hands * 0.3), rec.hands]; rec.stats.pfr = [Math.round(rec.hands * 0.25), rec.hands];
      const a = PT.coach.analyze({ view: PT.bots.publicView(h, 0), opps: { [btn.id]: rec }, settings: { mode: 'exploit', level: 'standard' }, seed: 5, live: true });
      return a;
    }
    const none = run(0, 0), few = run(9, 10), many = run(90, 100), mid = run(55, 100);
    ok(none.best === 'fold', 'ohne Beobachtungen: Chart (Fold mit 72o), ist ' + none.bestLabel);
    const pFew = few.chart && few.chart.evidence ? few.chart.evidence.p : null, pMany = many.chart && many.chart.evidence ? many.chart.evidence.p : null;
    ok(pFew != null && pMany != null && pMany >= pFew, 'Beleg wächst mit der Stichprobe bei gleicher Rate (' + pFew + ' → ' + pMany + ')');
    ok(mid.best === 'fold', 'durchschnittliche Fold-Rate (55 %) rechtfertigt keinen Bluff-3-Bet mit 72o, ist ' + mid.bestLabel);
    ok(many.best !== 'fold' || (many.chart && many.chart.evidence && many.chart.evidence.p < 0.9), '90 % Fold gegen 3-Bet über 100 Gelegenheiten: Exploit, sofern das Modell ihn vorn sieht (' + many.bestLabel + ', p=' + pMany + ')');
    ok(few.best === 'fold' || pFew >= 0.9, 'wenige Beobachtungen: Exploit nur mit ausreichendem Beleg');
  });
};
