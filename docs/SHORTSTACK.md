# Short Stack und Stacktiefen (Arbeitspaket 4, 2.2)

Zahlen: `docs/ERGEBNISSE_2.2.md` (Abschnitte „Push/Fold-Modellspiel“ und H5).

## 1. Push/Fold-Modellspiel

`tools/solve-pushfold.js` löst ein vereinfachtes Spiel für 6 bis 25 BB effektiv: Wer als Erster freiwillig handelt, geht All-in oder foldet; dahinter
callen oder folden die Spieler der Reihe nach; nach dem ersten Call folden alle übrigen. Equity aus der exakt berechneten 169 × 169-Tabelle der App,
Kartenentfernung zwischen Spielern vernachlässigt. Lösung durch fiktives Spiel (6.000 Iterationen), Prüfung über die Exploitability (Gewinn der
besten Antworten aller Plätze gegen das Profil, gewichtet mit der Erreichwahrscheinlichkeit). Ergebnis eingebettet in `ranges.js` (Block `PF`).

Das ist das Gleichgewicht dieses Modellspiels, kein Solver-Ergebnis für No-Limit Hold'em.

## 2. Verwendung

- **Coach, ungeöffneter Pot, ≤ 15 BB:** Push/Fold-Chart des Modellspiels als Anker (vorher Faustregel-Breiten).
- **Range eines Gegners, der 6–25 BB als Open setzt** (in der Regel All-in): Jam-Range des Modellspiels, Breite mit dem PFR des Gegners skaliert.
- **Call gegen einen solchen Jam:** Call-Range des Modellspiels je (Jammer, Caller), Breite mit dem VPIP skaliert.
- **Gegner-KI:** nutzt dieselben Push-Charts (mit ihrer Stilskalierung).
- 16–40 BB: unverändert Open-Raise-Charts mit Commitment-Regel (Raises ab einem Drittel des effektiven Stacks werden All-in, Prüfer B 8).
  150 BB und mehr: Charts gegen 4-Bets mit tieferer Call-Range (`deep`).

## 3. Messung

Stacktiefen 15, 25, 40 und 200 BB getrennt (H5, je zwei vorab festgelegte Seeds), dazu die Referenz Push/Fold bei 15 BB. Untersucht wurden Open-, Raise-
und All-in-Entscheidungen, Pot Commitment, Postflop-Spielraum (SPR), Implied Odds und Equity-Realisierung über die bestehenden Bausteine des Coaches
(Realisierung abhängig vom Rest-SPR, Draws mit Implied Odds nur ohne All-in).

## 4. Grenzen

- 16–25 BB: Minraise/Fold- und Jam-Strategien wären im Modellspiel zu vergleichen; dafür fehlt ein Modell mit Minraise. Der Coach rechnet hier mit den
  Open-Charts und dem EV-Modell.
- Antes und Mehrspieler-All-ins sind nicht modelliert.
