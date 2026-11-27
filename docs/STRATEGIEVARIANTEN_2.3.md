# Strategievarianten und Modellwahl 2.3 (Arbeitspakete 2 und 3)

Rohdaten: `tests/results/strategy-sel23.json` (Modellwahl), `tests/results/strategy-tune23.json` (Abstimmung). Seeds 23201 ff. (Va23, V,
Regressionsset) und 23231 ff. (Tr23, Gegner-KI E), in keiner anderen Studie verwendet. Je Lauf 2.500 Hände, gepaart, Block-Bootstrap (500er-Blöcke).

## Die drei Ansätze

| | Range nach Aktionen | Reaktion auf eigene Einsätze | Anpassung an den Gegner |
|---|---|---|---|
| **A robust** | Likelihood 2.1 nach relativer Stärke | Populations-/MDF-Modell 2.1 | Glättung der Gegnerwerte wie 2.1, keine Tabellenanpassung |
| **B adaptiv** | Populationstabelle (Gegner-KI) mit λ/γ-Anpassung | Mischung Tabelle/2.1 (Anteil 0,5) | voll, wie 2.2 |
| **C hybrid** | Mischung aus Tabelle und 2.1, Gewicht w je Gegner | Tabellenanteil 0,5·w | nur so weit, wie die Tabelle zum Gegner passt |

Das Gewicht w (`hybridFit` in `coach.js`, Stand nach den Prüfungen A–D) misst, ob die aufgedeckten Blätter eines Gegners zur Tabelle passen: je
Straße Stärke der Hand, Lage (Aggressor der Vorstraße oder frei), Art und Größe der eigenen Aktion (Check / Bet ≤ 0,6 / ≤ 1,1 / > 1,1 Pot ohne offenen
Einsatz, Raise/Call mit Einsatz). Log-Likelihood unter der Tabelle, **getrennt für aggressive und passive Aktionen** gegen die Referenzwerte der
Gegner-KI (Gruppe E, vier Läufe à 8.000 Hände: aggressiv −1,298 ± 0,753, passiv −0,414 ± 0,457 je Paar, Designeffekt 1,297 für Aktionen derselben
Hand). Maßgeblich ist der kleinere z-Wert; z ≥ 0 → w = 1, z ≤ −2 → w = 0, dazwischen linear; gepoolt über alle Gegner am Tisch als Vorwissen
(Stärke 8 Paare). Ohne aufgedeckte Blätter gilt w = 1. Größensignale gehen in C nur zur Hälfte ein (`sizeShrink` 0,5). Bets werden seit 2.3 mit
ihrer Größe in den aufgedeckten Blättern gespeichert (`docs/GEGNERGEDAECHTNIS.md`, Abschnitt 9).
Der Produktstand 2.3 ist C (`PT.ranges.ABL = { hybrid: true }`); A und B bleiben als Schalter für Vergleichsläufe.

## Abstimmung freier Parameter (nur Trainingsgruppen Tr23 und Gegner-KI E)

| Einstellung | Tr23 gegen 2.1.0 | Gegner-KI E gegen 2.1.0 |
|---|---|---|
| C, Schwellen −1/−3 | −6,0 [−15,8; 4,1] | +10,6 [−4,6; 24,4] |
| C, Vorwissen 0,5 | −5,9 | +10,6 (kein Unterschied) |
| **C, Schwellen 0/−2** | **+2,2 [−4,4; 9,2]** | **+8,8 [−5,7; 22,1]** |
| C, 0/−2, Vorwissen 0,5, Reaktion erst nach Bestätigung | +2,3 | +7,1 |
| C, 0/−2, Reaktion quadratisch | +1,8 | +6,8 |
| C, Schwellen +1/−1 | −0,1 [−3,8; 4,0] | +12,1 [−1,4; 25,0] |

Tr23: 12.500 Hände, E: 7.500 Hände je Variante. Gewählt wurden die Schwellen 0/−2 und +1/−1 zur Validierung.

## Modellwahl (Validierungsgruppen Va23 und Gegner-KI V)

Regel (vorab, `docs/ABNAHMEKRITERIEN_2.3.md`): unter den Varianten, die auf V **nicht belegt schlechter als B (2.2)** sind, die mit der
höchsten unteren Intervallgrenze gegen 2.1.0 auf Va23.

| Variante | Va23 gegen 2.1.0 (15.000 Hände) | V gegen 2.1.0 (10.000) | V gegen B | Regel V erfüllt |
|---|---|---|---|---|
| A robust | +0,1 [0,0; 0,3] | −0,8 [−6,8; 4,0] | −30,9 [−43,6; −18,3] | nein |
| B adaptiv | −38,1 [−55,7; −19,8] | +30,1 [16,4; 44,2] | – | ja |
| C (Schwellen −1/−3) | −10,8 [−20,9; −1,2] | +31,2 [18,0; 44,9] | +1,1 | ja |
| **C (Schwellen 0/−2)** | **−9,2 [−17,9; −0,9]** | **+27,6 [16,2; 39,6]** | **−2,5 [−10,5; 5,9]** | **ja** |
| C (Schwellen +1/−1) | −5,9 [−12,5; 0,5] | +17,2 [6,9; 27,6] | −13,0 [−22,9; −2,0] | nein |
| C3 (Reaktion erst nach Bestätigung) | −11,4 [−21,5; −2,2] | +29,8 | −0,4 | ja |
| C5 (robuste Entscheidungsregel: Minimum über Reaktionsmodelle) | −14,6 [−22,9; −7,2] | +12,3 | −17,8 | nein |
| S (Tabellen-Range, Reaktion 2.1) | −26,7 [−39,8; −13,3] | +8,5 | −21,6 | nein |
| C2 (hybride Range, Reaktion 2.1) | −15,9 [−23,9; −8,4] | +9,2 | −20,9 | nein |

Erste Wahl: C mit Schwellen 0/−2 (untere Grenze −17,9). Die Prüfagenten A–C fanden danach Fehler im Maß w (A23-1 Anzeige, B23-1 Größen nicht
geprüft, C23-2 feste Lage, A23-2 abhängige Paare). Nach den Korrekturen wurde mit derselben Regel neu gewählt:

| Variante | Va23 gegen 2.1.0 | V gegen 2.1.0 | V gegen B | Regel V erfüllt |
|---|---|---|---|---|
| **C nach Prüfung (Produktstand 2.3)** | **−2,8 [−12,5; 6,8]** | **+33,1 [19,5; 46,8]** | **+3,0 [−6,2; 12,8]** | **ja** |
| B nach Prüfung | wie B (identisches Spiel) | wie B | – | ja |

**Gewählt: C nach Prüfung** (höchste untere Grenze auf Va23 unter den zulässigen Varianten: −12,5). Abstimmungsgruppen zur Kontrolle:
Tr23 −2,0 [−11,0; 7,1], Gegner-KI E +10,9 [−3,5; 23,7]. Regressionsset (drei Strategien, 7.500 Hände): −22,4 [−36,9; −6,9], zu wenig Blöcke.

Ehrliche Einordnung:
- Die Varianten S, C2, C3, C5 und die Abstimmung kamen nach der ersten Auswertung hinzu. Die Validierungsgruppe Va23 wurde dadurch mehrfach
  genutzt; die Wahl kann leicht an Va23 angepasst sein. Maßgeblich ist deshalb nur die unberührte abschließende Testgruppe F23.
- Die erste Wahl war auf Va23 belegt schlechter als 2.1.0 (−9,2); die Variante nach den Korrekturen ist es nicht mehr (−2,8 [−12,5; 6,8]), das
  Intervall reicht aber bis −12,5. Gegen das Regressionsset bleibt ein Rückstand. Ein robustes Modell ohne Tabellen (A) spielt dort wie 2.1.0,
  gibt aber gegen die Gegner-KI den Vorsprung von rund 30 BB/100 vollständig auf. Kein untersuchter Ansatz erreicht beides.
- Die strengere Variante (+1/−1) liegt auf Va23 näher an 2.1.0, verliert aber gegen die Gegner-KI belegt gegenüber 2.2 und ist nach der Regel ausgeschlossen.
- Der abschließende Vergleich P1 (Nichtunterlegenheit gegen 2.1.0 auf F23, δ = 5) entscheidet über die Freigabeempfehlung.
