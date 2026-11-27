# Abnahmekriterien 2.2 (vor den abschließenden Tests festgelegt)

Festgelegt am 27.11.2026, bevor einer der unten genannten Läufe gestartet wurde (Commit dieser Datei vor dem ersten Lauf des Plans `v22`).
Alle Läufe: `node tests/strategy/compare.js --plan v22 --jobs 2`. Seeds 22001 ff. wurden in keiner Entwicklung, Anpassung oder Kalibrierung verwendet.
Primäre Kennzahl: All-in-bereinigte BB/100 des Helden (gepaarte Differenz, Block-Bootstrap mit 500er-Blöcken, 2.000 Wiederholungen, je Lauf geschichtet).
„Belegt besser“ heißt: 95-%-Intervall der Differenz ganz über 0 und mindestens 20 Blöcke. „Belegt schlechter“: Intervall ganz unter 0.

## Vergleiche

| Kennung | Frage | Umgebung (Gegner) | Hände je Held | Kriterium |
|---|---|---|---:|---|
| H1 | Coach 2.2 gegen 2.1.0 (exploitativ) | Gegner-KI 2.2, gemischtes Feld, 100 BB, ganzer Pool | 100.000 | **Hauptkriterium:** nicht belegt schlechter; „Fortschritt“ nur bei belegt besser |
| H1b | Coach 2.2 gegen 2.0.1 und gegen Gegner-KI als Held | wie H1 (Seeds 22001–22004) | 10.000 | nur beschreibend |
| H2 | Coach 2.2 gegen 2.1.0 | **unveränderte Gegner-KI 2.1** (Arbeitsbaum `sicherung-2.1.0`) | 15.000 | trennt Coach-Änderung von Gegner-Änderung; nicht belegt schlechter |
| H3 | Coach 2.2 gegen 2.1.0 | nur Testgruppe T der Gegner-KI (`tests/strategy/groups.js`) | 7.500 | nicht belegt schlechter |
| H4 | Coach 2.2 gegen 2.1.0 und 2.0.1 | sechs abschließend unbekannte Strategien (`FINAL` in `tests/strategy/strategies.js`) | 15.000 | nicht belegt schlechter |
| H5 | Coach 2.2 gegen 2.1.0 je Stacktiefe | 15, 25, 40, 200 BB | je 5.000 | 15 BB: Schließen der Validierungslücke heißt hier nur „gemessen“; Fortschritt nur bei belegt besser |
| H6 | gleichgewichtsnaher Modus 2.2 gegen 2.0.1 und 2.1.0 | wie H1 | 10.000 | **Übernahme als „gleichgewichtsnah“ nur, wenn nicht belegt schlechter als 2.0.1**, sonst Kennzeichnung „experimentell“ |

## Weitere Kriterien

- Equity-Kalibrierung (Arbeitspaket 1): auf der Validierungsgruppe V und der Testgruppe T Brier-Wert der Range-Equity nicht schlechter als 2.1.0, Bias je Straße innerhalb ±0,03 (`tests/strategy/range-calib.js`, `calib-report.js`). Unbekannte Strategien: Bias wird berichtet, kein Zielwert.
- Reaktionsmodell (Arbeitspaket 2): mittlerer absoluter Fehler der vorhergesagten Fold-Rate über ⅓ … 1,5 Pot auf V und T kleiner als mit dem Reaktionsmodell 2.1 (`tests/strategy/sizing-study.js` / `sizing-analyze.js`).
- Push/Fold-Modellspiel (Arbeitspaket 4): Exploitability der Lösung ≤ 0,005 BB je Hand in jeder Stacktiefe.
- Technik: alle Node-Tests und Browsertests grün, ≤ 5.000 Simulationen je automatischem Tipp, Tipp ≤ 2 s (95. Perzentil der Rechenzeit ≤ 1.000 ms in Node).
- Bewertung: unveränderte gewichtete Qualitätsmatrix aus `docs/TESTBERICHT.md` (2.1). Eine Teilnote wird nur angehoben, wenn ein Kriterium oben erfüllt ist.
