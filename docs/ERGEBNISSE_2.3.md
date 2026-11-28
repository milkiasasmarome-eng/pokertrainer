# Ergebnisse 2.3 (automatisch erzeugt)

Erzeugt von `node tools/report-23.js` am 2026-11-28 aus den Rohdaten. Kriterien: `docs/ABNAHMEKRITERIEN_2.3.md` (vor den Läufen festgelegt).

## Abschließende Vergleiche (Arbeitspaket 10)

Quelle: `tests/results/strategy-v23.json`, 328 Läufe, 820.000 Helden-Hände, 1.115.913 Coach-Entscheidungen, 0 ungültige Coach-Aktionen, Rechenzeit 25.288 CPU-s. Prüfsummen: {"v21":{"root":".","version":"2.3.0","coachHash":"8ae4d9c3989d"},"v210":{"root":"/home/claude/wt-v210","version":"2.1.0","coachHash":"8aeb416982fb"},"v201":{"root":"/home/claude/wt-v201","version":"2.0.1","coachHash":"8977eca6b2c0"},"envHash":{"neu":"7664ae1e00ed","ref":"ref-bcf2e37cab9b"}}.

| Kennung | Vergleich | Hände je Held | unabhängige Kartenfolgen | Blöcke | Differenz BB/100 | 95-%-Intervall | Nichtunterlegenheit (δ, untere Grenze, p, Holm) | Urteil |
|---|---|---:|---:|---:|---:|---|---|---|
| P1 | Coach 2.3 gegen 2.1.0, neue abschließende Testgruppe F23 | 100.000 | 40 | 200 | -1,3 | [-3,4; 0,8] | δ 5, -4,1, p = 0,005, Holm (Stufe 0,013): nicht unterlegen → nicht unterlegen | nicht belegt (Intervall enthält 0) |
| | ↳ f23 | 100.000 | | 200 | -1,3 | [-3,4; 0,8] | | nicht belegt (Intervall enthält 0) |
| P2 | Coach 2.3 gegen 2.1.0, Gegner-KI 2.2 (ganzer Pool) | 100.000 | 40 | 200 | 19,3 | [16,0; 22,5] | δ 5, 14,7, p = < 0,0001, Holm (Stufe 0,006): nicht unterlegen → nicht unterlegen | belegt besser |
| P3 | Coach 2.3 gegen 2.1.0, Gegner-KI Testgruppe T | 25.000 | 10 | 50 | 28,6 | [19,4; 37,7] | δ 5, 15,8, p = < 0,0001, Holm (Stufe 0,008): nicht unterlegen → nicht unterlegen | belegt besser |
| P4 | gleichgewichtsnah 2.3 gegen 2.0.1 | 60.000 | 24 | 120 | -6,3 | [-12,5; -0,1] | δ 8, -14,8, p = 0,346, Holm (Stufe 0,025): nicht belegt → Nichtunterlegenheit nicht belegt | belegt schlechter |
| S1 | Coach 2.3 gegen 2.2.0, Gegner-KI 2.2 | 15.000 | 6 | 30 | -8,5 | [-16,0; -1,0] | – | belegt schlechter |
| S2 | Coach 2.3 gegen 2.1.0, unveränderte Gegner-KI 2.1 | 25.000 | 10 | 50 | 21,6 | [14,3; 28,9] | δ 5, 9,1, p = < 0,0001 → nicht unterlegen | belegt besser |
| S3 | Coach 2.3 gegen 2.1.0, Regressionsset (frühere FINAL) | 15.000 | 6 | 30 | 0,0 | [-4,0; 4,1] | δ 5, -4,6, p = 0,017 → nicht unterlegen | nicht belegt (Intervall enthält 0) |
| | ↳ abschließend unbekannt: Fallensteller | 2.500 | | 5 | -0,8 | [-13,1; 12,3] | | zu wenig Blöcke (kein Beleg) |
| | ↳ abschließend unbekannt: Minraiser | 2.500 | | 5 | -1,0 | [-2,2; 0,0] | | zu wenig Blöcke (kein Beleg) |
| | ↳ abschließend unbekannt: Polarisierer | 2.500 | | 5 | -4,0 | [-14,2; 7,9] | | zu wenig Blöcke (kein Beleg) |
| | ↳ abschließend unbekannt: Positionsspieler | 2.500 | | 5 | -2,9 | [-5,2; -0,5] | | zu wenig Blöcke (kein Beleg) |
| | ↳ abschließend unbekannt: eng preflop, aggressiv postflop | 2.500 | | 5 | -0,2 | [-0,9; 0,3] | | zu wenig Blöcke (kein Beleg) |
| | ↳ abschließend unbekannt: umgekehrtes Größensignal | 2.500 | | 5 | 9,1 | [-8,0; 24,5] | | zu wenig Blöcke (kein Beleg) |
| S4F-fA | Coach 2.3 gegen Robustes Basismodell (A), F23 | 15.000 | 6 | 30 | 1,7 | [-2,7; 6,3] | – | nicht belegt (Intervall enthält 0) |
| S4K-fA | Coach 2.3 gegen Robustes Basismodell (A), Gegner-KI 2.2 | 15.000 | 6 | 30 | 19,0 | [13,4; 24,0] | – | belegt besser |
| S4F-fB | Coach 2.3 gegen Adaptives Modell (B), F23 | 15.000 | 6 | 30 | 12,1 | [0,8; 22,5] | – | belegt besser |
| S4K-fB | Coach 2.3 gegen Adaptives Modell (B), Gegner-KI 2.2 | 15.000 | 6 | 30 | -8,5 | [-16,0; -1,0] | – | belegt schlechter |
| S4F-coach201 | Coach 2.3 gegen Coach 2.0.1 (exploitativ), F23 | 15.000 | 6 | 30 | -5,0 | [-24,2; 11,1] | – | nicht belegt (Intervall enthält 0) |
| S4K-coach201 | Coach 2.3 gegen Coach 2.0.1 (exploitativ), Gegner-KI 2.2 | 15.000 | 6 | 30 | 30,6 | [21,3; 39,7] | – | belegt besser |
| S4F-coach220 | Coach 2.3 gegen Coach 2.2.0 (exploitativ), F23 | 15.000 | 6 | 30 | 12,1 | [0,8; 22,5] | – | belegt besser |
| S4K-coach220 | Coach 2.3 gegen Coach 2.2.0 (exploitativ), Gegner-KI 2.2 | 15.000 | 6 | 30 | -8,5 | [-16,0; -1,0] | – | belegt schlechter |
| S4F-coach210 | Coach 2.3 gegen Coach 2.1.0 (exploitativ), F23 | 100.000 | 40 | 200 | -1,3 | [-3,4; 0,8] | – | nicht belegt (Intervall enthält 0) |
| S4K-coach210 | Coach 2.3 gegen Coach 2.1.0 (exploitativ), Gegner-KI 2.2 | 100.000 | 40 | 200 | 19,3 | [16,0; 22,5] | – | belegt besser |
| S5 | Coach 2.3 gegen 2.1.0, 15 und 25 BB | 20.000 | 8 | 40 | 2,5 | [1,0; 3,8] | – | belegt besser |
| | ↳ 15 BB | 10.000 | | 20 | -0,3 | [-1,4; 0,8] | | nicht belegt (Intervall enthält 0) |
| | ↳ 25 BB | 10.000 | | 20 | 5,2 | [2,7; 7,7] | | belegt besser |
| S6 | Coach 2.3 gegen Push/Fold-Referenz, 15 BB | 10.000 | 4 | 20 | 2,0 | [0,0; 3,8] | – | belegt besser |

Absolute Ergebnisse je Held und Bedingung (bereinigt, BB/100):

| Gruppe | Held | Bedingung | Hände | BB/100 | 95-%-Intervall |
|---|---|---|---:|---:|---|
| pF | Coach 2.0.1 (exploitativ) | f23, 100 BB | 15.000 | 91,7 | [70,7; 112,6] |
| pF | Coach 2.1.0 (exploitativ) | f23, 100 BB | 100.000 | 104,0 | [95,9; 112,0] |
| pF | Coach 2.2.0 (exploitativ) | f23, 100 BB | 15.000 | 74,6 | [61,0; 87,9] |
| pF | Coach 2.3 (exploitativ) | f23, 100 BB | 100.000 | 102,7 | [94,8; 111,1] |
| pF | Robustes Basismodell (A) | f23, 100 BB | 15.000 | 85,1 | [69,9; 100,4] |
| pF | Adaptives Modell (B) | f23, 100 BB | 15.000 | 74,6 | [61,2; 88,7] |
| pG | Coach 2.0.1 (gleichgewichtsnah) | Gegner-KI, gemischt, 100 BB | 60.000 | 19,5 | [13,1; 25,3] |
| pG | Coach 2.3 (gleichgewichtsnah) | Gegner-KI, gemischt, 100 BB | 60.000 | 13,2 | [6,1; 20,5] |
| pK | Coach 2.0.1 (exploitativ) | Gegner-KI, gemischt, 100 BB | 15.000 | -1,4 | [-15,8; 12,4] |
| pK | Coach 2.1.0 (exploitativ) | Gegner-KI, gemischt, 100 BB | 100.000 | 26,1 | [20,4; 31,8] |
| pK | Coach 2.2.0 (exploitativ) | Gegner-KI, gemischt, 100 BB | 15.000 | 37,6 | [22,5; 54,2] |
| pK | Coach 2.3 (exploitativ) | Gegner-KI, gemischt, 100 BB | 100.000 | 45,4 | [39,9; 51,3] |
| pK | Robustes Basismodell (A) | Gegner-KI, gemischt, 100 BB | 15.000 | 10,1 | [-4,0; 25,1] |
| pK | Adaptives Modell (B) | Gegner-KI, gemischt, 100 BB | 15.000 | 37,6 | [22,1; 54,9] |
| pT | Coach 2.1.0 (exploitativ) | Gegner-KI, gemischt, 100 BB | 25.000 | 25,3 | [12,8; 37,7] |
| pT | Coach 2.3 (exploitativ) | Gegner-KI, gemischt, 100 BB | 25.000 | 53,8 | [40,7; 67,2] |
| sKurz | Coach 2.1.0 (exploitativ) | Gegner-KI, gemischt, 15 BB | 10.000 | 4,9 | [-0,1; 9,8] |
| sKurz | Coach 2.1.0 (exploitativ) | Gegner-KI, gemischt, 25 BB | 10.000 | 10,9 | [3,8; 17,1] |
| sKurz | Coach 2.3 (exploitativ) | Gegner-KI, gemischt, 15 BB | 10.000 | 4,5 | [-0,3; 9,4] |
| sKurz | Coach 2.3 (exploitativ) | Gegner-KI, gemischt, 25 BB | 10.000 | 16,2 | [10,2; 21,9] |
| sKurz | Referenz: Push/Fold-Chart (≤ 20 BB), sonst Pot-Odds-Schwelle | Gegner-KI, gemischt, 15 BB | 10.000 | 2,6 | [-1,9; 6,9] |
| sRef | Coach 2.1.0 (exploitativ) | Gegner-KI, gemischt, 100 BB | 25.000 | 23,1 | [10,3; 35,5] |
| sRef | Coach 2.3 (exploitativ) | Gegner-KI, gemischt, 100 BB | 25.000 | 44,6 | [32,8; 56,5] |
| sReg | Coach 2.1.0 (exploitativ) | abschließend unbekannt: Positionsspieler, 100 BB | 2.500 | 78,7 | [9,7; 145,0] |
| sReg | Coach 2.1.0 (exploitativ) | abschließend unbekannt: Minraiser, 100 BB | 2.500 | 100,0 | [80,8; 118,2] |
| sReg | Coach 2.1.0 (exploitativ) | abschließend unbekannt: eng preflop, aggressiv postflop, 100 BB | 2.500 | 81,7 | [35,1; 125,1] |
| sReg | Coach 2.1.0 (exploitativ) | abschließend unbekannt: Polarisierer, 100 BB | 2.500 | 55,5 | [10,9; 88,3] |
| sReg | Coach 2.1.0 (exploitativ) | abschließend unbekannt: umgekehrtes Größensignal, 100 BB | 2.500 | 103,5 | [42,5; 173,7] |
| sReg | Coach 2.1.0 (exploitativ) | abschließend unbekannt: Fallensteller, 100 BB | 2.500 | 91,0 | [16,1; 145,6] |
| sReg | Coach 2.3 (exploitativ) | abschließend unbekannt: Positionsspieler, 100 BB | 2.500 | 75,8 | [4,2; 136,9] |
| sReg | Coach 2.3 (exploitativ) | abschließend unbekannt: Minraiser, 100 BB | 2.500 | 99,0 | [79,6; 117,1] |
| sReg | Coach 2.3 (exploitativ) | abschließend unbekannt: eng preflop, aggressiv postflop, 100 BB | 2.500 | 81,5 | [37,7; 126,7] |
| sReg | Coach 2.3 (exploitativ) | abschließend unbekannt: Polarisierer, 100 BB | 2.500 | 51,5 | [0,4; 88,9] |
| sReg | Coach 2.3 (exploitativ) | abschließend unbekannt: umgekehrtes Größensignal, 100 BB | 2.500 | 112,7 | [67,2; 169,9] |
| sReg | Coach 2.3 (exploitativ) | abschließend unbekannt: Fallensteller, 100 BB | 2.500 | 90,2 | [11,1; 155,0] |

Aktionen postflop, Gruppe pF (Anteil aller Postflop-Entscheidungen):

| Held | check | fold | call | ⅓ | ½ | ¾ | Pot | Overbet | All-in | Raises |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Coach 2.3 (exploitativ) | 31,9 % | 20,1 % | 10,8 % | 8,0 % | 4,1 % | 5,6 % | 8,6 % | 4,4 % | 4,0 % | 2,5 % |
| Coach 2.1.0 (exploitativ) | 32,5 % | 20,4 % | 10,6 % | 7,2 % | 3,9 % | 5,7 % | 8,5 % | 4,6 % | 4,2 % | 2,3 % |
| Robustes Basismodell (A) | 34,4 % | 20,6 % | 10,9 % | 6,6 % | 3,6 % | 5,4 % | 8,2 % | 4,5 % | 3,8 % | 1,8 % |
| Adaptives Modell (B) | 30,1 % | 19,2 % | 9,5 % | 8,2 % | 5,8 % | 4,5 % | 8,2 % | 5,8 % | 3,4 % | 5,2 % |
| Coach 2.0.1 (exploitativ) | 38,8 % | 19,0 % | 11,5 % | 4,0 % | 2,6 % | 2,1 % | 7,4 % | 6,3 % | 4,8 % | 3,4 % |
| Coach 2.2.0 (exploitativ) | 30,1 % | 19,2 % | 9,5 % | 8,2 % | 5,8 % | 4,5 % | 8,2 % | 5,8 % | 3,4 % | 5,2 % |

Aktionen postflop, Gruppe pK (Anteil aller Postflop-Entscheidungen):

| Held | check | fold | call | ⅓ | ½ | ¾ | Pot | Overbet | All-in | Raises |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Coach 2.3 (exploitativ) | 29,1 % | 10,7 % | 5,8 % | 15,3 % | 7,2 % | 7,8 % | 13,7 % | 5,0 % | 2,1 % | 3,2 % |
| Coach 2.1.0 (exploitativ) | 32,9 % | 12,8 % | 6,6 % | 12,2 % | 5,0 % | 9,9 % | 12,8 % | 4,1 % | 2,4 % | 1,4 % |
| Robustes Basismodell (A) | 32,8 % | 12,5 % | 7,0 % | 12,2 % | 5,0 % | 10,0 % | 12,9 % | 3,9 % | 2,5 % | 1,3 % |
| Adaptives Modell (B) | 27,4 % | 9,0 % | 5,4 % | 15,4 % | 8,5 % | 6,4 % | 13,5 % | 7,4 % | 2,4 % | 4,5 % |
| Coach 2.0.1 (exploitativ) | 43,8 % | 12,3 % | 6,0 % | 8,4 % | 4,0 % | 4,6 % | 10,1 % | 5,4 % | 2,3 % | 3,1 % |
| Coach 2.2.0 (exploitativ) | 27,4 % | 9,0 % | 5,4 % | 15,4 % | 8,5 % | 6,4 % | 13,5 % | 7,4 % | 2,4 % | 4,5 % |

Rechenzeit Coach 2.3 in den Läufen (Node, feste Uhr im Coach): Mittel 23,6 ms je Entscheidung, Maximum 513 ms, höchstens 5.000 Simulationen.

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
| Abstimmung Tr23: Variante C nach Prüfung A/B (Größensignale, aggressive und passive Aktionen getrennt geprüft) gegen 2.1.0 | 12.500 | -2,0 | [-10,9; 7,1] | nicht belegt (Intervall enthält 0) |
| Abstimmung Gegner-KI E: Variante C nach Prüfung A/B (Größensignale, aggressive und passive Aktionen getrennt geprüft) gegen 2.1.0 | 7.500 | 10,9 | [-3,5; 23,7] | zu wenig Blöcke (kein Beleg) |

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
| Modellwahl Va23: Variante C nach Prüfung A/B (Größensignale, aggressive und passive Aktionen getrennt geprüft) gegen Coach 2.1.0 (exploitativ) | 15.000 | -2,8 | [-12,5; 6,8] | nicht belegt (Intervall enthält 0) |
| Modellwahl Gegner-KI V: Variante C nach Prüfung A/B (Größensignale, aggressive und passive Aktionen getrennt geprüft) gegen Coach 2.1.0 (exploitativ) | 10.000 | 33,1 | [19,5; 46,8] | belegt besser |
| Modellwahl Va23: Variante C nach Prüfung A/B (Größensignale, aggressive und passive Aktionen getrennt geprüft) gegen Variante B (Stand nach Prüfung A/B) | 15.000 | 35,4 | [20,9; 51,1] | belegt besser |
| Modellwahl Gegner-KI V: Variante C nach Prüfung A/B (Größensignale, aggressive und passive Aktionen getrennt geprüft) gegen Variante B (Stand nach Prüfung A/B) | 10.000 | 3,0 | [-6,2; 12,8] | nicht belegt (Intervall enthält 0) |
| Modellwahl Va23: Variante C nach Prüfung A/B (Größensignale, aggressive und passive Aktionen getrennt geprüft) gegen Variante C (abgestimmt auf Tr23): hybrid, empfindlichere Schwellen | 15.000 | 6,4 | [-1,6; 15,3] | nicht belegt (Intervall enthält 0) |
| Modellwahl Gegner-KI V: Variante C nach Prüfung A/B (Größensignale, aggressive und passive Aktionen getrennt geprüft) gegen Variante C (abgestimmt auf Tr23): hybrid, empfindlichere Schwellen | 10.000 | 5,5 | [0,7; 10,4] | belegt besser |
| Modellwahl Va23: Variante B (Stand nach Prüfung A/B) gegen Variante B: adaptives Modell | 15.000 | 0,0 | [0,0; 0,0] | nicht belegt (Intervall enthält 0) |
| Modellwahl Gegner-KI V: Variante B (Stand nach Prüfung A/B) gegen Variante B: adaptives Modell | 10.000 | 0,0 | [0,0; 0,0] | nicht belegt (Intervall enthält 0) |

## Equity- und Range-Kalibrierung (Arbeitspaket 5)

| Datensatz | Version | Spots | Schätzung | tatsächlich | Bias [95 %] | Brier | ECE |
|---|---|---:|---:|---:|---|---:|---:|

Bias je Straße (Kriterium ±0,03 auf V und T, unverändert):

| Datensatz | Version | Flop | Turn | River |
|---|---|---|---|---|

River nach Gegneraktion (Rechenfehler = Schätzung − exakte Referenz gegen die angenommene Range, Range-Fehler = Referenz − tatsächlich):

| Datensatz | Gruppe | Spots | Schätzung | tatsächlich | Bias [95 %] | Rechenfehler | Range-Fehler |
|---|---|---:|---:|---:|---|---:|---:|

## Reaktionsmodell und Einsatzgrößen (Arbeitspaket 6)

Fold-Vorhersage für die tatsächlich empfohlenen Bets und Raises (`tests/strategy/aggr-calib.js`; Bias = vorhergesagt − beobachtet):

| Datensatz | Art | n | vorhergesagt | beobachtet | Bias [95 %] |
|---|---|---:|---:|---:|---|
| bots-V_210 | 0,4–0,8 Pot | 101 | 0,488 | 0,545 | -0,057 [-0,150; 0,036] |
| bots-V_210 | 0,8–1,15 Pot | 89 | 0,542 | 0,596 | -0,054 [-0,154; 0,047] |
| bots-V_210 | > 1,15 Pot | 24 | 0,595 | 0,583 | 0,012 [-0,187; 0,211] |
| bots-V_210 | Raise | 14 | 0,336 | 0,643 | -0,307 [-0,560; -0,053] |
| bots-V_210 | ≤ 0,4 Pot | 56 | 0,285 | 0,232 | 0,053 [-0,054; 0,160] |
| bots-V_220 | 0,4–0,8 Pot | 96 | 0,484 | 0,458 | 0,026 [-0,074; 0,126] |
| bots-V_220 | 0,8–1,15 Pot | 80 | 0,550 | 0,650 | -0,100 [-0,203; 0,002] |
| bots-V_220 | > 1,15 Pot | 43 | 0,647 | 0,698 | -0,051 [-0,179; 0,077] |
| bots-V_220 | Raise | 30 | 0,400 | 0,567 | -0,167 [-0,338; 0,004] |
| bots-V_220 | ≤ 0,4 Pot | 75 | 0,300 | 0,280 | 0,020 [-0,077; 0,117] |
| bots-V_23 | 0,4–0,8 Pot | 93 | 0,486 | 0,473 | 0,012 [-0,090; 0,114] |
| bots-V_23 | 0,8–1,15 Pot | 91 | 0,558 | 0,648 | -0,090 [-0,185; 0,005] |
| bots-V_23 | > 1,15 Pot | 32 | 0,645 | 0,688 | -0,042 [-0,194; 0,109] |
| bots-V_23 | Raise | 21 | 0,391 | 0,524 | -0,133 [-0,343; 0,077] |
| bots-V_23 | ≤ 0,4 Pot | 75 | 0,285 | 0,227 | 0,058 [-0,033; 0,150] |
| final_210 | 0,4–0,8 Pot | 56 | 0,376 | 0,411 | -0,035 [-0,156; 0,086] |
| final_210 | 0,8–1,15 Pot | 61 | 0,472 | 0,443 | 0,029 [-0,091; 0,150] |
| final_210 | > 1,15 Pot | 28 | 0,577 | 0,214 | 0,362 [0,220; 0,505] |
| final_210 | Raise | 14 | 0,161 | 0,000 | 0,161 [0,104; 0,219] |
| final_210 | ≤ 0,4 Pot | 54 | 0,211 | 0,315 | -0,104 [-0,227; 0,020] |
| final_220 | 0,4–0,8 Pot | 65 | 0,399 | 0,462 | -0,062 [-0,177; 0,052] |
| final_220 | 0,8–1,15 Pot | 60 | 0,465 | 0,417 | 0,048 [-0,075; 0,170] |
| final_220 | > 1,15 Pot | 25 | 0,624 | 0,240 | 0,384 [0,237; 0,531] |
| final_220 | Raise | 32 | 0,291 | 0,063 | 0,229 [0,150; 0,308] |
| final_220 | ≤ 0,4 Pot | 62 | 0,238 | 0,339 | -0,100 [-0,214; 0,013] |
| final_23 | 0,4–0,8 Pot | 53 | 0,402 | 0,509 | -0,108 [-0,235; 0,019] |
| final_23 | 0,8–1,15 Pot | 61 | 0,481 | 0,410 | 0,071 [-0,049; 0,191] |
| final_23 | > 1,15 Pot | 25 | 0,592 | 0,280 | 0,312 [0,156; 0,468] |
| final_23 | Raise | 16 | 0,199 | 0,000 | 0,199 [0,136; 0,263] |
| final_23 | ≤ 0,4 Pot | 57 | 0,228 | 0,316 | -0,087 [-0,205; 0,030] |

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
- PAI-Integration (`tests/pai-integration.mjs`, PAI 0.1.0): 16 von 18 bestanden; offen: Versionsprüfung: PAI 0.1.0 liest Sicherungen des Trainers (Format 3); Hinweis PAI 0.1.0: validateHand lehnt Karten gefoldeter Spieler ab (Änderungsauftrag Punkt 4).
- Rechenzeit Tipp (`tests/perf-23.js`, 600 Hände, Node) 2.3: 699 Entscheidungen, Median 18,9 ms, 95. Perzentil 50,9 ms, Maximum 394,9 ms, über 1 s: 0.
- Rechenzeit Tipp (`tests/perf-23.js`, 600 Hände, Node) 2.2.0: 699 Entscheidungen, Median 18,9 ms, 95. Perzentil 50,2 ms, Maximum 288,0 ms, über 1 s: 0.
- Rechenzeit Tipp (`tests/perf-23.js`, 600 Hände, Node) 2.1.0: 699 Entscheidungen, Median 17,6 ms, 95. Perzentil 45,5 ms, Maximum 253,4 ms, über 1 s: 0.
