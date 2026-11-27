# Ergebnisse 2.3 (automatisch erzeugt)

Erzeugt von `node tools/report-23.js` am 2026-11-27 aus den Rohdaten. Kriterien: `docs/ABNAHMEKRITERIEN_2.3.md` (vor den Läufen festgelegt).

## Abschließende Vergleiche (Arbeitspaket 10)

_Keine Daten (tests/results/strategy-v23.json fehlt)._

## Ursachenanalyse, Abstimmung und Modellwahl (Arbeitspakete 1–3)

Ablation (Plan abl23; Differenz = Coach 2.2 − Variante):

| Vergleich | Hände | Differenz BB/100 | 95-%-Intervall | Urteil |
|---|---:|---:|---|---|
| Ablation, Regressionsset (frühere FINAL): Coach 2.2 gegen Ablation: Range-Eingrenzung 2.1 | 15.000 | -11,2 | [-23,9; 0,9] | nicht belegt (Intervall enthält 0) |
| Ablation, Validierungsgruppe V: Coach 2.2 gegen Ablation: Range-Eingrenzung 2.1 | 10.000 | 5,3 | [-6,8; 17,5] | nicht belegt (Intervall enthält 0) |
| Ablation, Regressionsset (frühere FINAL): Coach 2.2 gegen Ablation: Reaktionsmodell 2.1 | 15.000 | -18,9 | [-29,9; -8,5] | belegt schlechter |
| Ablation, Validierungsgruppe V: Coach 2.2 gegen Ablation: Reaktionsmodell 2.1 | 10.000 | 15,2 | [0,9; 28,6] | belegt besser |
| Ablation, Regressionsset (frühere FINAL): Coach 2.2 gegen Ablation: ohne Gegneranpassung der Tabelle | 15.000 | 4,7 | [-5,7; 15,5] | nicht belegt (Intervall enthält 0) |
| Ablation, Validierungsgruppe V: Coach 2.2 gegen Ablation: ohne Gegneranpassung der Tabelle | 10.000 | -5,5 | [-13,3; 2,2] | nicht belegt (Intervall enthält 0) |
| Ablation, Regressionsset (frühere FINAL): Coach 2.2 gegen Ablation: Datenlage nach Händen (2.1) | 15.000 | 0,0 | [-0,1; 0,2] | nicht belegt (Intervall enthält 0) |
| Ablation, Validierungsgruppe V: Coach 2.2 gegen Ablation: Datenlage nach Händen (2.1) | 10.000 | -3,4 | [-8,5; 2,3] | nicht belegt (Intervall enthält 0) |
| Ablation, Regressionsset (frühere FINAL): Coach 2.2 gegen Ablation: Range und Reaktion 2.1 | 15.000 | -17,7 | [-30,8; -4,9] | belegt schlechter |
| Ablation, Validierungsgruppe V: Coach 2.2 gegen Ablation: Range und Reaktion 2.1 | 10.000 | 29,5 | [15,5; 43,2] | belegt besser |
| Ablation, Regressionsset (frühere FINAL): Coach 2.2 gegen Ablation: Range, Reaktion, Datenlage 2.1 | 15.000 | -17,9 | [-30,9; -5,1] | belegt schlechter |
| Ablation, Validierungsgruppe V: Coach 2.2 gegen Ablation: Range, Reaktion, Datenlage 2.1 | 10.000 | 30,4 | [17,7; 43,1] | belegt besser |
| Ablation, Regressionsset (frühere FINAL): Coach 2.2 gegen Coach 2.1.0 (exploitativ) | 15.000 | -17,9 | [-30,9; -5,1] | belegt schlechter |
| Ablation, Validierungsgruppe V: Coach 2.2 gegen Coach 2.1.0 (exploitativ) | 10.000 | 30,4 | [17,7; 43,1] | belegt besser |
| Restprüfung Regressionsset: Ablation: Range, Reaktion, Datenlage 2.1 gegen 2.1.0 | 15.000 | 0,0 | [0,0; 0,0] | nicht belegt (Intervall enthält 0) |
| Restprüfung V: Ablation: Range, Reaktion, Datenlage 2.1 gegen 2.1.0 | 10.000 | 0,0 | [0,0; 0,0] | nicht belegt (Intervall enthält 0) |

Abstimmung (Plan tune23, nur Trainingsgruppen):

| Vergleich | Hände | Differenz BB/100 | 95-%-Intervall | Urteil |
|---|---:|---:|---|---|
| Abstimmung Tr23: Abstimmung: C (Standard) gegen 2.1.0 | 12.500 | -6,0 | [-15,8; 4,1] | nicht belegt (Intervall enthält 0) |
| Abstimmung Gegner-KI E: Abstimmung: C (Standard) gegen 2.1.0 | 7.500 | 10,6 | [-4,6; 24,4] | zu wenig Blöcke (kein Beleg) |
| Abstimmung Tr23: Abstimmung: C, Vorwissen 0,5 gegen 2.1.0 | 12.500 | -5,9 | [-15,8; 4,3] | nicht belegt (Intervall enthält 0) |
| Abstimmung Gegner-KI E: Abstimmung: C, Vorwissen 0,5 gegen 2.1.0 | 7.500 | 10,6 | [-4,6; 24,4] | zu wenig Blöcke (kein Beleg) |
| Abstimmung Tr23: Abstimmung: C, empfindlichere Schwellen gegen 2.1.0 | 12.500 | 2,2 | [-4,3; 9,2] | nicht belegt (Intervall enthält 0) |
| Abstimmung Gegner-KI E: Abstimmung: C, empfindlichere Schwellen gegen 2.1.0 | 7.500 | 8,8 | [-5,7; 22,1] | zu wenig Blöcke (kein Beleg) |
| Abstimmung Tr23: Abstimmung: C, empfindlich, Vorwissen 0,5, Reaktion robust vorab gegen 2.1.0 | 12.500 | 2,3 | [-4,3; 9,3] | nicht belegt (Intervall enthält 0) |
| Abstimmung Gegner-KI E: Abstimmung: C, empfindlich, Vorwissen 0,5, Reaktion robust vorab gegen 2.1.0 | 7.500 | 7,1 | [-7,0; 20,0] | zu wenig Blöcke (kein Beleg) |
| Abstimmung Tr23: Abstimmung: C empfindlich, Reaktion quadratisch gegen 2.1.0 | 12.500 | 1,8 | [-4,9; 9,0] | nicht belegt (Intervall enthält 0) |
| Abstimmung Gegner-KI E: Abstimmung: C empfindlich, Reaktion quadratisch gegen 2.1.0 | 7.500 | 6,8 | [-7,1; 19,6] | zu wenig Blöcke (kein Beleg) |
| Abstimmung Tr23: Abstimmung: C sehr empfindlich gegen 2.1.0 | 12.500 | 0,0 | [-3,8; 4,0] | nicht belegt (Intervall enthält 0) |
| Abstimmung Gegner-KI E: Abstimmung: C sehr empfindlich gegen 2.1.0 | 7.500 | 12,1 | [-1,4; 25,0] | zu wenig Blöcke (kein Beleg) |

Modellwahl (Plan sel23, Validierungsgruppen):

| Vergleich | Hände | Differenz BB/100 | 95-%-Intervall | Urteil |
|---|---:|---:|---|---|
| Modellwahl Va23: Variante A: robustes Basismodell gegen Coach 2.1.0 (exploitativ) | 15.000 | 0,1 | [0,0; 0,3] | nicht belegt (Intervall enthält 0) |
| Modellwahl Gegner-KI V: Variante A: robustes Basismodell gegen Coach 2.1.0 (exploitativ) | 10.000 | -0,7 | [-6,8; 4,0] | nicht belegt (Intervall enthält 0) |
| Modellwahl Va23: Variante B: adaptives Modell gegen Coach 2.1.0 (exploitativ) | 15.000 | -38,1 | [-55,7; -19,8] | belegt schlechter |
| Modellwahl Gegner-KI V: Variante B: adaptives Modell gegen Coach 2.1.0 (exploitativ) | 10.000 | 30,1 | [16,4; 44,2] | belegt besser |
| Modellwahl Va23: Variante C: kontrolliertes hybrides Modell gegen Coach 2.1.0 (exploitativ) | 15.000 | -10,8 | [-20,9; -1,2] | belegt schlechter |
| Modellwahl Gegner-KI V: Variante C: kontrolliertes hybrides Modell gegen Coach 2.1.0 (exploitativ) | 10.000 | 31,2 | [18,0; 44,9] | belegt besser |
| Modellwahl Va23: Variante S: Tabellen-Range, Reaktionsmodell 2.1 (aus der Ablation) gegen Coach 2.1.0 (exploitativ) | 15.000 | -26,7 | [-39,8; -13,3] | belegt schlechter |
| Modellwahl Gegner-KI V: Variante S: Tabellen-Range, Reaktionsmodell 2.1 (aus der Ablation) gegen Coach 2.1.0 (exploitativ) | 10.000 | 8,5 | [-2,1; 20,7] | nicht belegt (Intervall enthält 0) |
| Modellwahl Va23: Variante C2: hybride Range, Reaktionsmodell 2.1 gegen Coach 2.1.0 (exploitativ) | 15.000 | -15,9 | [-23,9; -8,4] | belegt schlechter |
| Modellwahl Gegner-KI V: Variante C2: hybride Range, Reaktionsmodell 2.1 gegen Coach 2.1.0 (exploitativ) | 10.000 | 9,2 | [0,0; 20,2] | nicht belegt (Intervall enthält 0) |
| Modellwahl Va23: Variante C: kontrolliertes hybrides Modell gegen Variante B: adaptives Modell | 15.000 | 27,3 | [13,1; 42,2] | belegt besser |
| Modellwahl Gegner-KI V: Variante C: kontrolliertes hybrides Modell gegen Variante B: adaptives Modell | 10.000 | 1,1 | [-4,8; 7,6] | nicht belegt (Intervall enthält 0) |
| Modellwahl Va23: Variante C: kontrolliertes hybrides Modell gegen Variante A: robustes Basismodell | 15.000 | -10,9 | [-21,1; -1,4] | belegt schlechter |
| Modellwahl Gegner-KI V: Variante C: kontrolliertes hybrides Modell gegen Variante A: robustes Basismodell | 10.000 | 31,9 | [20,1; 44,2] | belegt besser |
| Modellwahl Va23: Variante B: adaptives Modell gegen Variante A: robustes Basismodell | 15.000 | -38,2 | [-55,8; -19,9] | belegt schlechter |
| Modellwahl Gegner-KI V: Variante B: adaptives Modell gegen Variante A: robustes Basismodell | 10.000 | 30,9 | [18,3; 43,6] | belegt besser |
| Modellwahl Va23: Variante S: Tabellen-Range, Reaktionsmodell 2.1 (aus der Ablation) gegen Variante B: adaptives Modell | 15.000 | 11,4 | [-0,4; 23,2] | nicht belegt (Intervall enthält 0) |
| Modellwahl Gegner-KI V: Variante S: Tabellen-Range, Reaktionsmodell 2.1 (aus der Ablation) gegen Variante B: adaptives Modell | 10.000 | -21,6 | [-31,3; -12,3] | belegt schlechter |
| Modellwahl Va23: Variante C2: hybride Range, Reaktionsmodell 2.1 gegen Variante B: adaptives Modell | 15.000 | 22,2 | [5,6; 38,6] | belegt besser |
| Modellwahl Gegner-KI V: Variante C2: hybride Range, Reaktionsmodell 2.1 gegen Variante B: adaptives Modell | 10.000 | -20,9 | [-32,4; -9,7] | belegt schlechter |
| Modellwahl Va23: Variante C3: hybrid, Reaktion mit robustem Vorwissen gegen Coach 2.1.0 (exploitativ) | 15.000 | -11,4 | [-21,5; -2,2] | belegt schlechter |
| Modellwahl Gegner-KI V: Variante C3: hybrid, Reaktion mit robustem Vorwissen gegen Coach 2.1.0 (exploitativ) | 10.000 | 29,8 | [17,1; 42,8] | belegt besser |
| Modellwahl Va23: Variante C3: hybrid, Reaktion mit robustem Vorwissen gegen Variante B: adaptives Modell | 15.000 | 26,7 | [12,6; 41,4] | belegt besser |
| Modellwahl Gegner-KI V: Variante C3: hybrid, Reaktion mit robustem Vorwissen gegen Variante B: adaptives Modell | 10.000 | -0,4 | [-6,5; 6,1] | nicht belegt (Intervall enthält 0) |
| Modellwahl Va23: Variante C5: hybrid mit robuster Entscheidungsregel gegen Coach 2.1.0 (exploitativ) | 15.000 | -14,6 | [-22,9; -7,2] | belegt schlechter |
| Modellwahl Gegner-KI V: Variante C5: hybrid mit robuster Entscheidungsregel gegen Coach 2.1.0 (exploitativ) | 10.000 | 12,3 | [4,3; 21,7] | belegt besser |
| Modellwahl Va23: Variante C5: hybrid mit robuster Entscheidungsregel gegen Variante B: adaptives Modell | 15.000 | 23,6 | [7,8; 39,8] | belegt besser |
| Modellwahl Gegner-KI V: Variante C5: hybrid mit robuster Entscheidungsregel gegen Variante B: adaptives Modell | 10.000 | -17,8 | [-29,9; -5,7] | belegt schlechter |
| Modellwahl Va23: Variante C5: hybrid mit robuster Entscheidungsregel gegen Variante C: kontrolliertes hybrides Modell | 15.000 | -3,8 | [-11,5; 3,1] | nicht belegt (Intervall enthält 0) |
| Modellwahl Gegner-KI V: Variante C5: hybrid mit robuster Entscheidungsregel gegen Variante C: kontrolliertes hybrides Modell | 10.000 | -18,9 | [-29,8; -8,4] | belegt schlechter |
| Modellwahl Va23: Variante C (abgestimmt auf Tr23): hybrid, empfindlichere Schwellen gegen Coach 2.1.0 (exploitativ) | 15.000 | -9,2 | [-17,9; -0,9] | belegt schlechter |
| Modellwahl Gegner-KI V: Variante C (abgestimmt auf Tr23): hybrid, empfindlichere Schwellen gegen Coach 2.1.0 (exploitativ) | 10.000 | 27,6 | [16,2; 39,6] | belegt besser |
| Modellwahl Va23: Variante C (abgestimmt auf Tr23): hybrid, empfindlichere Schwellen gegen Variante B: adaptives Modell | 15.000 | 29,0 | [13,0; 45,5] | belegt besser |
| Modellwahl Gegner-KI V: Variante C (abgestimmt auf Tr23): hybrid, empfindlichere Schwellen gegen Variante B: adaptives Modell | 10.000 | -2,5 | [-10,5; 5,9] | nicht belegt (Intervall enthält 0) |
| Modellwahl Va23: Variante C (abgestimmt auf Tr23): hybrid, empfindlichere Schwellen gegen Variante A: robustes Basismodell | 15.000 | -9,3 | [-18,0; -0,9] | belegt schlechter |
| Modellwahl Gegner-KI V: Variante C (abgestimmt auf Tr23): hybrid, empfindlichere Schwellen gegen Variante A: robustes Basismodell | 10.000 | 28,3 | [19,3; 38,2] | belegt besser |
| Modellwahl Va23: Variante C (abgestimmt auf Tr23/E): hybrid, sehr empfindliche Schwellen gegen Coach 2.1.0 (exploitativ) | 15.000 | -5,9 | [-12,5; 0,5] | nicht belegt (Intervall enthält 0) |
| Modellwahl Gegner-KI V: Variante C (abgestimmt auf Tr23/E): hybrid, sehr empfindliche Schwellen gegen Coach 2.1.0 (exploitativ) | 10.000 | 17,2 | [6,9; 27,6] | belegt besser |
| Modellwahl Va23: Variante C (abgestimmt auf Tr23/E): hybrid, sehr empfindliche Schwellen gegen Variante B: adaptives Modell | 15.000 | 32,2 | [15,4; 49,8] | belegt besser |
| Modellwahl Gegner-KI V: Variante C (abgestimmt auf Tr23/E): hybrid, sehr empfindliche Schwellen gegen Variante B: adaptives Modell | 10.000 | -13,0 | [-22,9; -2,0] | belegt schlechter |
| Modellwahl Va23: Variante C (abgestimmt auf Tr23/E): hybrid, sehr empfindliche Schwellen gegen Variante A: robustes Basismodell | 15.000 | -6,0 | [-12,6; 0,4] | nicht belegt (Intervall enthält 0) |
| Modellwahl Gegner-KI V: Variante C (abgestimmt auf Tr23/E): hybrid, sehr empfindliche Schwellen gegen Variante A: robustes Basismodell | 10.000 | 17,9 | [11,1; 26,1] | belegt besser |

## Equity- und Range-Kalibrierung (Arbeitspaket 5)

_Keine Kalibrierungsdaten._

## Reaktionsmodell und Einsatzgrößen (Arbeitspaket 6)
_Keine Größenstudie._

## Push/Fold-Modellspiel (Arbeitspaket 7)

| Stack (BB) | Exploitability (BB/Hand) | Jam UTG | HJ | CO | BTN | SB |
|---:|---:|---:|---:|---:|---:|---:|
| 3 | 0,00311 | 34,8 % | 37,9 % | 44,3 % | 52,7 % | 78,6 % |
| 4.5 | 0,00108 | 24,1 % | 28,7 % | 33,2 % | 40,7 % | 73,7 % |
| 6 | 0,00092 | 20,0 % | 24,1 % | 31,1 % | 38,0 % | 68,3 % |
| 8 | 0,00089 | 17,2 % | 20,5 % | 26,5 % | 34,8 % | 62,5 % |
| 10 | 0,00096 | 14,7 % | 17,7 % | 22,8 % | 32,3 % | 58,1 % |
| 12 | 0,00105 | 11,7 % | 15,4 % | 19,7 % | 29,7 % | 51,6 % |
| 15 | 0,00120 | 10,0 % | 12,3 % | 17,5 % | 25,1 % | 46,0 % |
| 18 | 0,00137 | 8,4 % | 11,1 % | 15,1 % | 21,4 % | 42,8 % |
| 20 | 0,00150 | 7,2 % | 9,7 % | 12,9 % | 19,5 % | 39,9 % |
| 25 | 0,00180 | 5,9 % | 7,4 % | 10,9 % | 16,1 % | 35,4 % |

## Tests

- Node-Tests (`node tests/run.js`): 130 bestanden, 0 fehlgeschlagen (App 2.3.0).
- Browsertests (`node tests/e2e.js`, 2026-11-27): 52 bestanden, 0 fehlgeschlagen; LCP 148 ms, CLS 0,004, Tipp Mittel 36 ms, Maximum 179 ms.
- Gedächtnis-Browsertests (`node tests/e2e-gedaechtnis.js`): 3 bestanden, 0 fehlgeschlagen.
- Regel-Langlauf (`node tests/long.js`, App 2.2.0): 1.000.000 Hände, 0 Fehler, 8.659 Side Pots, 8.778 Split Pots.
- Sieben-Karten-Häufigkeiten: gleich den Literaturwerten (133.784.560 Hände).
- Stil-Kalibrierung der Gegner-KI (200.000 Hände): alle Stile im Zielbereich.
- Monte-Carlo-Abdeckung: im vorab festgelegten Toleranzband (6 Stufen, je 1000 Läufe).
- PAI-Integration (`tests/pai-integration.mjs`, PAI 0.1.0): 14 von 15 bestanden; offen: Versionsprüfung: PAI 0.1.0 liest Sicherungen des Trainers (Format 3).
