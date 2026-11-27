/* Getrennte Gegnergruppen (2.2, Arbeitspaket 5): Entwicklung (E), Validierung (V), abschließender Test (T).
   Feste, vor allen Läufen festgelegte Aufteilung des 100er-Pools, je Spielstil geschichtet (50 % E, 25 % V, Rest T; je Stil gerundet: 52/26/22),
   Reihenfolge innerhalb eines Stils nach einer Prüfsumme der Kennung (Salz „gruppen-2.2“).
   Modelle des Coaches (z. B. die Aktions-Likelihoods der Range-Schätzung) werden nur an Gruppe E angepasst,
   an V ausgewählt und an T sowie an synthetischen, dem Coach unbekannten Strategien abschließend gemessen.
   Die Aufteilung gilt nur für Studien und Vergleiche; im Trainer spielt der ganze Pool. */
'use strict';
function make(PT) {
  const byStyle = {};
  PT.bots.POOL.forEach(p => { const st = PT.bots.styleOf(p.id); (byStyle[st] = byStyle[st] || []).push(p.id); });
  const G = { E: [], V: [], T: [] };
  Object.keys(byStyle).sort().forEach(st => {
    const ids = byStyle[st].slice().sort((a, b) => (PT.rng.hashStr(a + '|gruppen-2.2') >>> 0) - (PT.rng.hashStr(b + '|gruppen-2.2') >>> 0));
    const nE = Math.round(ids.length * 0.5), nV = Math.round(ids.length * 0.25);
    ids.forEach((id, i) => { (i < nE ? G.E : i < nE + nV ? G.V : G.T).push(id); });
  });
  Object.keys(G).forEach(k => G[k].sort());
  return G;
}
module.exports = { make };
