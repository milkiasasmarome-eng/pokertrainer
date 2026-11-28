# Ergebnisse 2.2 (automatisch erzeugt)

Erzeugt von `node tools/report-22.js` am 2026-11-27 aus den Rohdaten. Kriterien: `docs/ABNAHMEKRITERIEN_2.2.md` (vor den Läufen festgelegt).

## Strategische Vergleiche (Arbeitspaket 9)

Quelle: `tests/results/strategy-v22.json`, 154 Läufe, 385.000 Helden-Hände, 506.799 Coach-Entscheidungen, 0 ungültige Coach-Aktionen, Rechenzeit 13.110 CPU-s. Umgebungen: {"neu":"f5bcef508cbf","ref":"ref-bcf2e37cab9b"}.

| Vergleich | Hände je Held | Paare | Blöcke | Differenz BB/100 (bereinigt) | 95-%-Intervall | roh | Urteil |
|---|---:|---:|---:|---:|---|---:|---|
| H1: Coach 2.2 gegen 2.1.0, Gegner-KI 2.2, gemischt, 100 BB (Hauptvergleich) | 100.000 | 40 | 200 | 25,5 | [21,2; 29,9] | 25,2 | belegt besser |
| Coach 2.2 gegen 2.0.1, Gegner-KI 2.2, 100 BB (Teilmenge der H1-Seeds) | 10.000 | 4 | 20 | 41,7 | [28,3; 56,2] | 44,4 | belegt besser |
| Coach 2.2 gegen Gegner-KI als Held, 100 BB (Teilmenge der H1-Seeds) | 10.000 | 4 | 20 | 50,5 | [37,8; 62,9] | 59,3 | belegt besser |
| H2: Coach 2.2 gegen 2.1.0, unveränderte Gegner-KI 2.1 (Referenzumgebung), 100 BB | 15.000 | 6 | 30 | 37,2 | [26,0; 48,6] | 34,6 | belegt besser |
| H3: Coach 2.2 gegen 2.1.0, nur Testgruppe T der Gegner-KI, 100 BB | 7.500 | 3 | 15 | 29,7 | [19,9; 40,8] | 27,1 | zu wenig Blöcke (kein Beleg) |
| H4: Coach 2.2 gegen 2.1.0, abschließend unbekannte Strategien | 15.000 | 6 | 30 | -16,8 | [-30,4; -4,7] | -15,0 | belegt schlechter |
| ↳ abschließend unbekannt: Fallensteller | 2.500 | 1 | 5 | -42,5 | [-63,6; -21,0] | -29,0 | zu wenig Blöcke (kein Beleg) |
| ↳ abschließend unbekannt: Minraiser | 2.500 | 1 | 5 | 8,7 | [-17,1; 34,7] | -10,9 | zu wenig Blöcke (kein Beleg) |
| ↳ abschließend unbekannt: Polarisierer | 2.500 | 1 | 5 | -47,0 | [-100,9; -4,3] | -49,5 | zu wenig Blöcke (kein Beleg) |
| ↳ abschließend unbekannt: Positionsspieler | 2.500 | 1 | 5 | -29,7 | [-70,3; 4,1] | -35,2 | zu wenig Blöcke (kein Beleg) |
| ↳ abschließend unbekannt: eng preflop, aggressiv postflop | 2.500 | 1 | 5 | 6,2 | [-11,9; 25,0] | 21,6 | zu wenig Blöcke (kein Beleg) |
| ↳ abschließend unbekannt: umgekehrtes Größensignal | 2.500 | 1 | 5 | 3,5 | [-17,3; 23,3] | 13,1 | zu wenig Blöcke (kein Beleg) |
| Coach 2.2 gegen 2.0.1, abschließend unbekannte Strategien | 15.000 | 6 | 30 | -21,8 | [-35,8; -7,1] | -16,9 | belegt schlechter |
| ↳ abschließend unbekannt: Fallensteller | 2.500 | 1 | 5 | -25,7 | [-52,3; 0,9] | -11,6 | zu wenig Blöcke (kein Beleg) |
| ↳ abschließend unbekannt: Minraiser | 2.500 | 1 | 5 | -31,9 | [-43,3; -11,5] | -50,1 | zu wenig Blöcke (kein Beleg) |
| ↳ abschließend unbekannt: Polarisierer | 2.500 | 1 | 5 | -29,2 | [-60,6; 3,1] | -45,0 | zu wenig Blöcke (kein Beleg) |
| ↳ abschließend unbekannt: Positionsspieler | 2.500 | 1 | 5 | -14,6 | [-77,4; 41,7] | -3,5 | zu wenig Blöcke (kein Beleg) |
| ↳ abschließend unbekannt: eng preflop, aggressiv postflop | 2.500 | 1 | 5 | -46,5 | [-85,4; -7,7] | -17,5 | zu wenig Blöcke (kein Beleg) |
| ↳ abschließend unbekannt: umgekehrtes Größensignal | 2.500 | 1 | 5 | 17,3 | [-1,9; 32,0] | 26,4 | zu wenig Blöcke (kein Beleg) |
| H5: Coach 2.2 gegen 2.1.0, Stacktiefen 15/25/40/200 BB | 20.000 | 8 | 40 | 6,9 | [-1,4; 14,0] | 5,1 | nicht belegt (Intervall enthält 0) |
| ↳ 15 BB | 5.000 | 2 | 10 | -0,4 | [-2,9; 2,0] | -6,5 | zu wenig Blöcke (kein Beleg) |
| ↳ 25 BB | 5.000 | 2 | 10 | 4,4 | [-0,7; 9,2] | 11,5 | zu wenig Blöcke (kein Beleg) |
| ↳ 40 BB | 5.000 | 2 | 10 | 12,8 | [1,5; 24,1] | 16,5 | zu wenig Blöcke (kein Beleg) |
| ↳ 200 BB | 5.000 | 2 | 10 | 10,8 | [-20,7; 36,0] | -0,9 | zu wenig Blöcke (kein Beleg) |
| Coach 2.2 gegen Referenz Push/Fold, 15 BB | 5.000 | 2 | 10 | 6,0 | [3,1; 8,6] | 3,7 | zu wenig Blöcke (kein Beleg) |
| H6: gleichgewichtsnah 2.2 gegen 2.0.1 | 10.000 | 4 | 20 | -0,9 | [-13,6; 10,9] | 13,9 | nicht belegt (Intervall enthält 0) |
| gleichgewichtsnah 2.2 gegen 2.1.0 | 10.000 | 4 | 20 | 0,0 | [0,0; 0,0] | 0,0 | nicht belegt (Intervall enthält 0) |

Absolute Ergebnisse je Held und Bedingung (bereinigt, BB/100):

| Gruppe | Held | Bedingung | Hände | BB/100 | 95-%-Intervall |
|---|---|---|---:|---:|---|
| h1 | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, gemischt, 100 BB | 10.000 | -3,4 | [-14,0; 7,9] |
| h1 | Coach 2.0.1 (exploitativ) | Gegner-KI, gemischt, 100 BB | 10.000 | 5,4 | [-6,6; 16,8] |
| h1 | Coach 2.1.0 (exploitativ) | Gegner-KI, gemischt, 100 BB | 100.000 | 33,0 | [27,6; 38,9] |
| h1 | Coach 2.2 (exploitativ) | Gegner-KI, gemischt, 100 BB | 100.000 | 58,5 | [52,5; 64,5] |
| h2ref | Coach 2.1.0 (exploitativ) | Gegner-KI, gemischt, 100 BB | 15.000 | 18,5 | [6,8; 30,2] |
| h2ref | Coach 2.2 (exploitativ) | Gegner-KI, gemischt, 100 BB | 15.000 | 55,7 | [43,7; 68,0] |
| h3T | Coach 2.1.0 (exploitativ) | Gegner-KI, gemischt, 100 BB | 7.500 | 26,5 | [5,9; 44,5] |
| h3T | Coach 2.2 (exploitativ) | Gegner-KI, gemischt, 100 BB | 7.500 | 56,2 | [36,2; 74,2] |
| h4final | Coach 2.0.1 (exploitativ) | abschließend unbekannt: Positionsspieler, 100 BB | 2.500 | 54,7 | [22,5; 86,0] |
| h4final | Coach 2.0.1 (exploitativ) | abschließend unbekannt: Minraiser, 100 BB | 2.500 | 107,7 | [72,4; 143,0] |
| h4final | Coach 2.0.1 (exploitativ) | abschließend unbekannt: eng preflop, aggressiv postflop, 100 BB | 2.500 | 139,8 | [67,0; 210,8] |
| h4final | Coach 2.0.1 (exploitativ) | abschließend unbekannt: Polarisierer, 100 BB | 2.500 | 40,7 | [8,3; 74,7] |
| h4final | Coach 2.0.1 (exploitativ) | abschließend unbekannt: umgekehrtes Größensignal, 100 BB | 2.500 | 58,8 | [28,6; 87,2] |
| h4final | Coach 2.0.1 (exploitativ) | abschließend unbekannt: Fallensteller, 100 BB | 2.500 | 72,9 | [8,6; 137,3] |
| h4final | Coach 2.1.0 (exploitativ) | abschließend unbekannt: Positionsspieler, 100 BB | 2.500 | 69,8 | [46,2; 88,2] |
| h4final | Coach 2.1.0 (exploitativ) | abschließend unbekannt: Minraiser, 100 BB | 2.500 | 67,0 | [45,0; 94,8] |
| h4final | Coach 2.1.0 (exploitativ) | abschließend unbekannt: eng preflop, aggressiv postflop, 100 BB | 2.500 | 87,0 | [37,8; 136,2] |
| h4final | Coach 2.1.0 (exploitativ) | abschließend unbekannt: Polarisierer, 100 BB | 2.500 | 58,4 | [13,5; 103,3] |
| h4final | Coach 2.1.0 (exploitativ) | abschließend unbekannt: umgekehrtes Größensignal, 100 BB | 2.500 | 72,5 | [28,4; 118,5] |
| h4final | Coach 2.1.0 (exploitativ) | abschließend unbekannt: Fallensteller, 100 BB | 2.500 | 89,7 | [16,3; 158,0] |
| h4final | Coach 2.2 (exploitativ) | abschließend unbekannt: Positionsspieler, 100 BB | 2.500 | 40,1 | [-4,6; 81,3] |
| h4final | Coach 2.2 (exploitativ) | abschließend unbekannt: Minraiser, 100 BB | 2.500 | 75,8 | [46,6; 106,0] |
| h4final | Coach 2.2 (exploitativ) | abschließend unbekannt: eng preflop, aggressiv postflop, 100 BB | 2.500 | 93,2 | [45,7; 133,7] |
| h4final | Coach 2.2 (exploitativ) | abschließend unbekannt: Polarisierer, 100 BB | 2.500 | 11,4 | [-43,1; 76,9] |
| h4final | Coach 2.2 (exploitativ) | abschließend unbekannt: umgekehrtes Größensignal, 100 BB | 2.500 | 76,1 | [46,9; 107,7] |
| h4final | Coach 2.2 (exploitativ) | abschließend unbekannt: Fallensteller, 100 BB | 2.500 | 47,3 | [-19,3; 107,6] |
| h5stack | Coach 2.1.0 (exploitativ) | Gegner-KI, gemischt, 15 BB | 5.000 | 5,2 | [1,9; 9,0] |
| h5stack | Coach 2.1.0 (exploitativ) | Gegner-KI, gemischt, 200 BB | 5.000 | 64,5 | [30,7; 101,3] |
| h5stack | Coach 2.1.0 (exploitativ) | Gegner-KI, gemischt, 25 BB | 5.000 | 8,2 | [-2,8; 19,8] |
| h5stack | Coach 2.1.0 (exploitativ) | Gegner-KI, gemischt, 40 BB | 5.000 | 20,6 | [3,1; 36,9] |
| h5stack | Coach 2.2 (exploitativ) | Gegner-KI, gemischt, 15 BB | 5.000 | 4,8 | [0,2; 8,7] |
| h5stack | Coach 2.2 (exploitativ) | Gegner-KI, gemischt, 200 BB | 5.000 | 75,3 | [21,2; 126,5] |
| h5stack | Coach 2.2 (exploitativ) | Gegner-KI, gemischt, 25 BB | 5.000 | 12,6 | [2,8; 23,2] |
| h5stack | Coach 2.2 (exploitativ) | Gegner-KI, gemischt, 40 BB | 5.000 | 33,4 | [22,3; 44,1] |
| h5stack | Referenz: Push/Fold-Chart (≤ 20 BB), sonst Pot-Odds-Schwelle | Gegner-KI, gemischt, 15 BB | 5.000 | -1,2 | [-6,3; 4,3] |
| h6gto | Coach 2.0.1 (gleichgewichtsnah) | Gegner-KI, gemischt, 100 BB | 10.000 | 10,9 | [0,6; 21,6] |
| h6gto | Coach 2.1.0 (gleichgewichtsnah) | Gegner-KI, gemischt, 100 BB | 10.000 | 10,0 | [-4,2; 26,2] |
| h6gto | Coach 2.2 (gleichgewichtsnah) | Gegner-KI, gemischt, 100 BB | 10.000 | 10,0 | [-4,7; 26,5] |

Aktionen postflop in H1 (Anteil aller Postflop-Entscheidungen):

| Held | check | fold | call | ⅓ | ½ | ¾ | Pot | Overbet | All-in | Raises |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Coach 2.2 (exploitativ) | 27,2 % | 9,8 % | 5,0 % | 16,4 % | 8,7 % | 6,3 % | 13,3 % | 6,7 % | 2,1 % | 4,5 % |
| Coach 2.1.0 (exploitativ) | 32,5 % | 12,5 % | 6,5 % | 12,0 % | 5,2 % | 10,4 % | 13,2 % | 3,9 % | 2,3 % | 1,4 % |
| Coach 2.0.1 (exploitativ) | 43,6 % | 12,4 % | 6,8 % | 7,4 % | 3,4 % | 5,3 % | 10,1 % | 4,8 % | 2,7 % | 3,5 % |
| Gegner-KI als Held (Profil g004, Stil ausgeglichen) | – % | – % | – % | – % | – % | – % | – % | – % | – % | – % |

Rechenzeit Coach 2.2 in den Läufen (Node, feste Uhr im Coach): Mittel 26,3 ms je Entscheidung, Maximum 655 ms, höchstens 5.000 Simulationen.

## Equity- und Range-Kalibrierung (Arbeitspaket 1)

| Datensatz | Version | Spots | Schätzung | tatsächlich | Bias [95 %] | Brier |
|---|---|---:|---:|---:|---|---:|
| ec_T | 2.1.0 | 1.125 | 0,444 | 0,433 | 0,011 [-0,016; 0,037] | 0,087 |
| ec_T | 2.2 | 1.105 | 0,420 | 0,440 | -0,020 [-0,045; 0,004] | 0,075 |
| ec_V | 2.1.0 | 1.044 | 0,421 | 0,416 | 0,005 [-0,021; 0,031] | 0,079 |
| ec_V | 2.2 | 1.078 | 0,399 | 0,414 | -0,016 [-0,039; 0,008] | 0,069 |
| lead_V | 2.1.0 | 856 | 0,351 | 0,351 | -0,000 [-0,022; 0,022] | 0,106 |
| lead_V | 2.2 | 856 | 0,369 | 0,351 | 0,018 [-0,003; 0,039] | 0,095 |
| rc_T | 2.1.0 | 7.498 | 0,464 | 0,480 | -0,016 [-0,025; -0,007] | 0,088 |
| rc_T | 2.2 | 7.498 | 0,464 | 0,480 | -0,016 [-0,025; -0,008] | 0,079 |
| rc_V | 2.1.0 | 11.714 | 0,462 | 0,479 | -0,017 [-0,024; -0,010] | 0,088 |
| rc_V | 2.2 | 11.714 | 0,466 | 0,479 | -0,013 [-0,020; -0,006] | 0,079 |
| rc_final | 2.1.0 | 8.949 | 0,415 | 0,469 | -0,053 [-0,062; -0,045] | 0,102 |
| rc_final | 2.2 | 8.949 | 0,419 | 0,469 | -0,049 [-0,058; -0,040] | 0,101 |
| rc_synth | 2.1.0 | 10.245 | 0,378 | 0,483 | -0,105 [-0,113; -0,096] | 0,118 |
| rc_synth | 2.2 | 10.245 | 0,410 | 0,483 | -0,074 [-0,082; -0,065] | 0,111 |

River nach Gegneraktion (Range-Kalibrierung; Rechenfehler = Schätzung − exakte Referenz gegen die angenommene Range, Range-Fehler = Referenz − tatsächlich):

| Datensatz | Gruppe | Spots | Schätzung | tatsächlich | Bias [95 %] | Rechenfehler | Range-Fehler |
|---|---|---:|---:|---:|---|---:|---:|
| rc_V_210 | River · Bet 41–70 % | 163 | 0,235 | 0,169 | 0,067 [0,024; 0,109] | – | – |
| rc_V_210 | River · Bet 71–110 % | 232 | 0,264 | 0,491 | -0,227 [-0,286; -0,169] | – | – |
| rc_V_210 | River · Bet >110 % | 43 | 0,249 | 0,523 | -0,274 [-0,416; -0,132] | – | – |
| rc_V_210 | River · Lead 41–70 % | 28 | 0,346 | 0,321 | 0,025 [-0,098; 0,148] | – | – |
| rc_V_210 | River · Lead 71–110 % | 25 | 0,264 | 0,380 | -0,116 [-0,276; 0,044] | – | – |
| rc_V_210 | River · kein Einsatz offen | 1.951 | 0,529 | 0,511 | 0,018 [0,004; 0,031] | – | – |
| rc_V_22 | River · Bet 41–70 % | 163 | 0,240 | 0,169 | 0,071 [0,033; 0,110] | – | – |
| rc_V_22 | River · Bet 71–110 % | 232 | 0,447 | 0,491 | -0,044 [-0,096; 0,007] | – | – |
| rc_V_22 | River · Bet >110 % | 43 | 0,327 | 0,523 | -0,196 [-0,331; -0,060] | – | – |
| rc_V_22 | River · Lead 41–70 % | 28 | 0,334 | 0,321 | 0,013 [-0,091; 0,117] | – | – |
| rc_V_22 | River · Lead 71–110 % | 25 | 0,292 | 0,380 | -0,088 [-0,260; 0,083] | – | – |
| rc_V_22 | River · kein Einsatz offen | 1.951 | 0,496 | 0,511 | -0,015 [-0,028; -0,002] | – | – |
| rc_T_210 | River · Bet 41–70 % | 97 | 0,230 | 0,180 | 0,050 [-0,002; 0,102] | – | – |
| rc_T_210 | River · Bet 71–110 % | 142 | 0,276 | 0,387 | -0,111 [-0,178; -0,044] | – | – |
| rc_T_210 | River · Bet >110 % | 25 | 0,250 | 0,360 | -0,110 [-0,246; 0,025] | – | – |
| rc_T_210 | River · Lead 41–70 % | 21 | 0,367 | 0,262 | 0,105 [0,012; 0,199] | – | – |
| rc_T_210 | River · Lead 71–110 % | 15 | 0,351 | 0,267 | 0,084 [-0,074; 0,243] | – | – |
| rc_T_210 | River · kein Einsatz offen | 1.265 | 0,539 | 0,517 | 0,022 [0,004; 0,040] | – | – |
| rc_T_22 | River · Bet 41–70 % | 97 | 0,221 | 0,180 | 0,041 [-0,002; 0,084] | – | – |
| rc_T_22 | River · Bet 71–110 % | 142 | 0,420 | 0,387 | 0,033 [-0,029; 0,095] | – | – |
| rc_T_22 | River · Bet >110 % | 25 | 0,328 | 0,360 | -0,032 [-0,180; 0,116] | – | – |
| rc_T_22 | River · Lead 41–70 % | 21 | 0,382 | 0,262 | 0,121 [0,012; 0,229] | – | – |
| rc_T_22 | River · Lead 71–110 % | 15 | 0,334 | 0,267 | 0,067 [-0,053; 0,188] | – | – |
| rc_T_22 | River · kein Einsatz offen | 1.265 | 0,499 | 0,517 | -0,018 [-0,035; -0,001] | – | – |
| lead_V_210 | River · Lead 41–70 % | 191 | 0,314 | 0,262 | 0,052 [0,012; 0,092] | – | – |
| lead_V_210 | River · Lead 71–110 % | 161 | 0,317 | 0,348 | -0,031 [-0,095; 0,034] | – | – |
| lead_V_210 | River · Lead >110 % | 43 | 0,320 | 0,384 | -0,064 [-0,185; 0,057] | – | – |
| lead_V_22 | River · Lead 41–70 % | 191 | 0,314 | 0,262 | 0,052 [0,014; 0,090] | – | – |
| lead_V_22 | River · Lead 71–110 % | 161 | 0,325 | 0,348 | -0,023 [-0,079; 0,033] | – | – |
| lead_V_22 | River · Lead >110 % | 43 | 0,393 | 0,384 | 0,009 [-0,107; 0,126] | – | – |
| ec_V_210 | River · kein Einsatz offen | 144 | 0,431 | 0,360 | 0,071 [0,006; 0,136] | 0,000 | 0,081 |
| ec_V_22 | River · kein Einsatz offen | 149 | 0,361 | 0,393 | -0,032 [-0,090; 0,027] | 0,000 | -0,041 |
| ec_T_210 | River · kein Einsatz offen | 167 | 0,480 | 0,425 | 0,055 [-0,011; 0,121] | 0,000 | 0,060 |
| ec_T_22 | River · kein Einsatz offen | 166 | 0,416 | 0,482 | -0,066 [-0,126; -0,007] | 0,000 | -0,059 |

## Reaktionsmodell und Einsatzgrößen (Arbeitspaket 2)

Gruppe V: beobachtete Fold-Rate (gegenfaktische Ausspielung) gegen Vorhersage

| Größe (Pot) | n | beobachtet | Modell 2.2 | Modell 2.1 |
|---|---:|---:|---:|---:|
| 1 | 498 | 0,618 | 0,547 | 0,518 (beob. 0,655) |
| 0,33 | 502 | 0,281 | 0,314 | 0,279 (beob. 0,329) |
| 0,5 | 496 | 0,421 | 0,420 | 0,371 (beob. 0,494) |
| 0,75 | 502 | 0,546 | 0,496 | 0,466 (beob. 0,595) |
| 1,5 | 492 | 0,703 | 0,617 | 0,568 (beob. 0,736) |
| mittlerer absoluter Fehler | | | 0,048 | 0,121 |

Gruppe T: beobachtete Fold-Rate (gegenfaktische Ausspielung) gegen Vorhersage

| Größe (Pot) | n | beobachtet | Modell 2.2 | Modell 2.1 |
|---|---:|---:|---:|---:|
| 1 | 501 | 0,531 | 0,536 | 0,505 (beob. 0,584) |
| 0,33 | 505 | 0,248 | 0,300 | 0,264 (beob. 0,310) |
| 0,5 | 502 | 0,390 | 0,405 | 0,353 (beob. 0,439) |
| 0,75 | 502 | 0,486 | 0,484 | 0,451 (beob. 0,520) |
| 1,5 | 500 | 0,670 | 0,609 | 0,558 (beob. 0,693) |
| mittlerer absoluter Fehler | | | 0,027 | 0,083 |

## Push/Fold-Modellspiel (Arbeitspaket 4)

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

- Node-Tests (`node tests/run.js`): 124 bestanden, 0 fehlgeschlagen (App 2.2.0).
- Browsertests (`node tests/e2e.js`, 2026-11-27): 52 bestanden, 0 fehlgeschlagen; LCP 128 ms, CLS 0,004, Tipp Mittel 44 ms, Maximum 201 ms.
- Gedächtnis-Browsertests (`node tests/e2e-gedaechtnis.js`): 3 bestanden, 0 fehlgeschlagen.
- Regel-Langlauf (`node tests/long.js`, App 2.2.0): 1.000.000 Hände, 0 Fehler, 8.659 Side Pots, 8.778 Split Pots.
- Sieben-Karten-Häufigkeiten: gleich den Literaturwerten (133.784.560 Hände).
- Stil-Kalibrierung der Gegner-KI (200.000 Hände): alle Stile im Zielbereich.
- Monte-Carlo-Abdeckung: im vorab festgelegten Toleranzband (6 Stufen, je 1000 Läufe).
- PAI-Integration (`tests/pai-integration.mjs`, PAI 0.1.0): 8 von 9 bestanden; offen: Versionsprüfung: PAI 0.1.0 liest Sicherungen des Trainers (Format 3).
- Rechenzeit Tipp (`tests/perf-22.js`, 800 Hände, Node) 2.2: 946 Entscheidungen, Median 19,1 ms, 95. Perzentil 51,5 ms, Maximum 331,2 ms, über 1 s: 0.
- Rechenzeit Tipp (`tests/perf-22.js`, 800 Hände, Node) 2.1.0: 941 Entscheidungen, Median 19,0 ms, 95. Perzentil 45,5 ms, Maximum 289,5 ms, über 1 s: 0.
