/* Handbewertung: individuelle Referenzprüfung gegen eine unabhängige Best-of-Five-Referenz (tests/ref/handref.js:
   konstruktive Aufzählung der 7.462 Klassen, Zuordnung über Rang-Multimenge). Langlauf: node tests/long.js evalref */
'use strict';
module.exports = function (T) {
  const { PT, test, ok, eq, QUICK } = T, E = PT.eval;
  const ref = require('../ref/handref.js'), X = require('../ref/evalcheck.js');
  let five = null;
  test('Handbewertung Referenz: Klassen der unabhängigen Referenz, alle 2.598.960 Fünf-Karten-Hände einzeln', () => {
    const t = ref.build();
    eq(t.N, 7462, 'Klassen der Referenz'); eq(t.perCat.join(','), '1277,2860,858,858,10,1277,156,156,10', 'Klassen je Kategorie (High Card … Straight Flush)');
    five = X.fiveCardAll(E);
    eq(five.cats.join(','), '1302540,1098240,123552,54912,10200,5108,3744,624,40', 'Häufigkeiten der Referenz (Literaturwerte)');
    eq(five.classes, 7462, 'alle Klassen erreicht'); eq(five.mapMismatch, 0, 'Klassen evaluate ↔ Referenz eineindeutig (jede Hand einzeln)');
    eq(five.catMismatch, 0, 'Kategorie je Hand'); eq(five.orderViolations, 0, 'Ordnung der 7.462 Klassen identisch');
  });
  test('Handbewertung Referenz: geschichtete Sieben-, Sechs- und Fünf-Karten-Hände, Paarvergleiche, Invarianzen', () => {
    if (!five) five = X.fiveCardAll(E);
    const rng = PT.makeRng('mathe-eval'), n7 = QUICK ? 3000 : 30000;
    let hands = 0, bad = 0;
    Object.keys(X.STRATA).forEach(st => { const r = X.checkHands(E, five.s2r, st, 7, n7, rng); hands += r.count; bad += r.mismatch; if (r.mismatch) ok(false, st + ': ' + JSON.stringify(r.examples[0])); });
    ['zufall', 'flush5', 'strasse', 'wheel', 'vierling', 'zwei_paare'].forEach(st => [5, 6].forEach(nc => { const r = X.checkHands(E, five.s2r, st, nc, n7 / 3, rng); hands += r.count; bad += r.mismatch; }));
    eq(bad, 0, 'Einzelvergleiche (' + hands + ')');
    let pb = 0, pn = 0, ties = 0;
    Object.keys(X.BOARDS).forEach(b => { const r = X.checkPairs(E, b, QUICK ? 1500 : 15000, rng); pb += r.mismatch; pn += r.count; ties += r.ties; });
    ['zwei_drillinge', 'drilling_zwei_paare', 'flush7', 'strasse', 'wheel', 'drei_paare'].forEach(st => { const r = X.checkPairsSame(E, st, QUICK ? 1000 : 10000, rng); pb += r.mismatch; pn += r.count; });
    eq(pb, 0, 'Vorzeichen der Paarvergleiche (' + pn + ', davon ' + ties + ' Gleichstände mit gemeinsamem Board)');
    ok(ties > pn / 50, 'Gleichstände kommen in nennenswerter Zahl vor');
    const p = X.checkPermutations(E, 'zufall', QUICK ? 5 : 50, 5040, rng), s = X.checkSuits(E, 'flush_und_strasse', QUICK ? 300 : 3000, rng);
    eq(p.mismatch, 0, 'Permutationsinvarianz (' + p.evals + ' Reihenfolgen)'); eq(s.mismatch + s.refMismatch, 0, 'Invarianz unter 24 Farbvertauschungen (' + s.evals + ')');
  });
  test('Handbewertung Referenz: die Prüfung erkennt eingebaute Fehler (Mutationsprobe)', () => {
    if (!five) five = X.fiveCardAll(E);
    const base = E.evaluate;
    const mutants = {
      'Wheel als 6-hoch-Straße': c => { const v = base(c); return (v >> 20) === 4 && ((v >> 16) & 15) === 3 ? (4 << 20) | (4 << 16) : v; },
      'Flush ohne fünfte Karte': c => { const v = base(c); return (v >> 20) === 5 ? v & ~15 : v; },
      'Full House: Paarrang ignoriert': c => { const v = base(c); return (v >> 20) === 6 ? v & ~(15 << 12) : v; },
      'Zwei Paare ohne Kicker': c => { const v = base(c); return (v >> 20) === 2 ? v & ~(15 << 8) : v; }
    };
    Object.keys(mutants).forEach(name => {
      const M = { evaluate: mutants[name] }, rng = PT.makeRng('mut|' + name);
      let found = 0;
      ['wheel', 'flush7', 'zwei_drillinge', 'drei_paare', 'zwei_paare'].forEach(st => { found += X.checkHands(M, five.s2r, st, 7, 500, rng).mismatch; });
      Object.keys(X.BOARDS).forEach(b => { found += X.checkPairs(M, b, 300, rng).mismatch; });
      ok(found > 0, 'Mutante „' + name + '“ erkannt (' + found + ' Abweichungen)');
    });
  });
};
