# Gleichgewichtsnaher Modus (Arbeitspaket 3, 2.2)

Zahlen: `docs/ERGEBNISSE_2.2.md` (H6) und `tests/results/calib-2.2/sizing_*.txt` (Spalte `predFoldGto`).

## 1. Einordnung der 2.1-Messung

Die 2.1-Messung „−20,6 BB/100 gegenüber 2.0.1“ beruhte auf zwei Seed-Paaren mit zusammen zehn 500er-Blöcken. Nach der Regel des Projekts (mindestens
20 Blöcke) ist das **kein Beleg** – weder für eine Regression noch dagegen (Folgeaudit, Abschnitt 2.4). 2.2 misst unter identischen, vorab
festgelegten Bedingungen neu: Gegner-KI 2.2, gemischtes Feld, 100 BB, vier Seed-Paare je Gegenüberstellung (2.2 gegen 2.0.1 und gegen 2.1.0).

## 2. Untersuchte Ursachen (unabhängig vom exploitativen Modus)

| Baustein | Befund |
|---|---|
| Bluff-Frequenzen | Seit Prüfer B 7 ist ein reiner Bluff gegen MDF-Verteidigung EV-neutral; bei Gleichstand empfiehlt der Modus die passive Aktion und nennt den Bluff als gleichwertig (Einzelhand-Empfehlung statt Mischstrategie). Das senkt die Bluff-Häufigkeit gegenüber einer echten Mischstrategie. |
| Value-Bet-Modellierung, Einsatzgrößen | Gleichgewichtsnah nutzt weiter die MDF-Reaktion (ohne Gegnerwerte). In der Größenstudie (Gegner-KI) sagt MDF Folds gegen kleine Einsätze im Mehrspielerpot deutlich zu hoch und am River zu niedrig voraus (Spalte `predFoldGto` gegen `obsFold`). Die Fehler sind modellbedingt: MDF beschreibt einen ausgewogenen Verteidiger, nicht die Gegner-KI. |
| Range-Abstraktionen | Seit 2.2 grenzt auch der gleichgewichtsnahe Modus Ranges mit der Populationstabelle ein (ohne Gegnerwerte). |
| Vereinfachte Spielbäume, CFR-Komponenten, Konvergenz | River-Modellspiel (CFR+) gegen analytische Spiele (Nuts/Luft gegen Bluffcatcher, Bluff- und Call-Häufigkeiten in geschlossener Form) und eine unabhängige Best-Response-Rechnung geprüft (`tests/unit/strategie-cfr.js`), Exploitability < 0,4 % des Pots. Das Modellspiel erzeugt nur Erklärtext und ändert keine Empfehlung. |
| Exploitability in gelösten Modellspielen | Push/Fold-Modellspiel neu (6–25 BB): Exploitability ≤ 0,0042 BB je Hand (`tools/solve-pushfold.js`). |
| Unvollständige Modellannahmen | Größte Lücke: Ein „gleichgewichtsnaher“ Modus, der gegen die Gegner-KI gemessen wird, wird für fehlende Ausnutzung bestraft, nicht für Fehler im Gleichgewicht. Der BB/100-Vergleich misst daher Robustheit gegen diese Gegner, nicht Nähe zum Gleichgewicht. |

## 3. Entscheidung

Vorab festgelegt (`docs/ABNAHMEKRITERIEN_2.2.md`, H6): Übernahme unter dem Namen „Gleichgewichtsnah“ nur, wenn der Modus nicht belegt schlechter ist als
2.0.1; sonst Kennzeichnung „experimentell“. Das Ergebnis steht in `docs/TESTBERICHT_2.2.md`, Abschnitt H6.

Der Modus heißt nie „GTO-Solver“: Er nutzt vereinfachte Modelle (MDF-Reaktion, Faustregel-Charts, ein River-Modellspiel und das Push/Fold-Modellspiel).
