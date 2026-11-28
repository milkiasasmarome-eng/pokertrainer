# Testbericht und Qualitätsbewertung – PokerTrainer 2.3.0

Stand: 28.11.2026, Zweig `entwicklung-2.3`, eingefrorener Stand der abschließenden Läufe acb0748 (danach nur Oberfläche, Texte, Tests, Doku).
Tabellen aus den Rohdaten: [ERGEBNISSE_2.3.md](ERGEBNISSE_2.3.md) (`node tools/report-23.js`). Kriterien vorab: [ABNAHMEKRITERIEN_2.3.md](ABNAHMEKRITERIEN_2.3.md).
Ursachen der Regression 2.2: [URSACHENANALYSE_2.3.md](URSACHENANALYSE_2.3.md). Modellwahl: [STRATEGIEVARIANTEN_2.3.md](STRATEGIEVARIANTEN_2.3.md).
Prüfung: [audit-2.3/PRUEFUNG_2.3.md](audit-2.3/PRUEFUNG_2.3.md).

## 1. Technische Stabilität

| Prüfung | Ergebnis |
|---|---|
| Unit-Tests `node tests/run.js` | 137 bestanden, 0 fehlgeschlagen |
| Regel-Langlauf `tests/long.js` | 1.000.000 Hände, 0 Fehler, 8.659 Side Pots, 8.778 Split Pots, 32.730 ungültige Eingaben abgewiesen |
| Handbewertung | 133.784.560 Sieben-Karten-Hände gleich den Literaturwerten; Einzelbewertung ohne Abweichung |
| Monte-Carlo-Abdeckung | 94,84–95,38 %, im vorab festgelegten Band |
| Gegner-KI | alle sechs Stile im Zielbereich (200.000 Hände) |
| Browsertests `tests/e2e.js` | 52 bestanden (Spiel, Tipp-Modi, Sprache, Import/Export, XSS, Offline, Einzeldatei, Layout 320–1366 px, axe-core); Tipp im Mittel 38 ms, höchstens 192 ms |
| Gedächtnis-Browsertests | 3 bestanden |
| PAI `tests/pai-integration.mjs` | 16 von 18; offen nur die beiden an PAI hängenden Fälle (Format 3, Karten gefoldeter Spieler), Änderungsauftrag liegt vor |
| Rechenzeit Tipp (Node, 699 Entscheidungen, ohne Last) | Median 18,9 ms, P95 50,9 ms, P99 229 ms, Maximum 395 ms, 0 über 1 s (2.1.0: 17,6 / 45,5 / 232 / 253) |
| Abschließende Vergleiche | 328 Läufe, 820.000 Hände, 0 ungültige Coach-Aktionen, höchstens 5.000 Simulationen, Coach höchstens 513 ms |

Nicht ausführbar und offen: echter Screenreader, deutsche Systemstimme, echte Mobilgeräte, Lernwirkung bei echten Nutzern.

## 2. Mathematische Korrektheit und Kalibrierung

| Kriterium (vorab) | 2.1.0 | 2.3 | erfüllt |
|---|---|---|---|
| Brier Range-Equity V / T nicht schlechter als 2.1.0 | 0,089 / 0,090 | 0,082 / 0,084 | ja |
| Brier Equity als Held V / T nicht schlechter als 2.1.0 | 0,083 / 0,078 | 0,081 / **0,084** | **nein (T)** |
| Bias je Straße ±0,03, Range-Kalibrierung V und T | Flop V −0,026, T −0,027 | größter Betrag 0,025 | ja |
| Bias je Straße ±0,03, Equity als Held V und T | River V +0,050, T +0,060 | größter Betrag 0,028 | ja (erstmals) |
| Fold-Vorhersage je Größe, mittlerer Fehler V / T nicht schlechter als 2.2 | 2.2: 0,048 / 0,027 | 0,026 / **0,037** | **nein (T)** |
| Push/Fold-Exploitability ≤ 0,005 | – | ≤ 0,0031 | ja |

Rechenfehler der Equity (Schätzung gegen exakte Aufzählung der angenommenen Range) am River 0,000; alle Abweichungen sind Range-Fehler.
Gegen unbekannte Strategien unterschätzt der Coach seine Equity weiter, wie 2.1.0 (Bias F23 −0,045 bis −0,047, Ka23 −0,049, am River nach einem
Check −0,147). Die Toleranz ±0,03 wurde nicht verändert. ECE wird nur beschreibend berichtet (bei rund 900 Spots liegt schon das Rauschen um 0,02–0,03).

## 3. Strategische Qualität (Plan v23)

All-in-bereinigte BB/100, gepaart, Block-Bootstrap; Nichtunterlegenheit mit dem konservativeren von geschichtetem und zweistufigem Verfahren.

| Kennung | Vergleich | Hände je Held / Seeds | Differenz | 95-%-Intervall | Ergebnis |
|---|---|---:|---:|---|---|
| **P1** | 2.3 − 2.1.0, neue versiegelte Testgruppe F23 | 100.000 / 40 | −1,3 | [−3,4; 0,8] | **nicht unterlegen** (untere Grenze −4,1 > −5; p = 0,005; Holm bestanden) |
| **P2** | 2.3 − 2.1.0, Gegner-KI 2.2, ganzer Pool | 100.000 / 40 | +19,3 | [16,0; 22,5] | **nicht unterlegen**, belegt besser |
| **P3** | 2.3 − 2.1.0, Gegner-KI Testgruppe T | 25.000 / 10 | +28,6 | [19,4; 37,7] | **nicht unterlegen**, belegt besser |
| **P4** | gleichgewichtsnah 2.3 − 2.0.1 | 60.000 / 24 | −6,3 | [−12,5; −0,1] | **nicht bestanden** (untere Grenze −14,8 < −8), belegt schlechter |
| S1 | 2.3 − 2.2.0, Gegner-KI 2.2 | 15.000 / 6 | −8,5 | [−16,0; −1,0] | belegt schlechter |
| S2 | 2.3 − 2.1.0, unveränderte Gegner-KI 2.1 | 25.000 / 10 | +21,6 | [14,3; 28,9] | belegt besser |
| S3 | 2.3 − 2.1.0, Regressionsset (frühere unbekannte) | 15.000 / 6 | 0,0 | [−4,0; 4,1] | nicht belegt (2.2 lag hier bei −16,8) |
| S4 | 2.3 − 2.2.0, F23 | 15.000 / 6 | +12,1 | [0,8; 22,5] | belegt besser |
| S4 | 2.3 − robustes Modell A, F23 / Gegner-KI | 15.000 / 6 | +1,7 / +19,0 | [−2,7; 6,3] / [13,4; 24,0] | nicht belegt / belegt besser |
| S4 | 2.3 − 2.0.1, F23 / Gegner-KI | 15.000 / 6 | −5,0 / +30,6 | [−24,3; 11,1] / [21,3; 39,7] | nicht belegt / belegt besser |
| S5 | 2.3 − 2.1.0, 15 und 25 BB | 20.000 / 8 | +2,5 | [1,0; 3,8] | belegt besser (erstmals) |
| S6 | 2.3 − Push/Fold-Referenz, 15 BB | 10.000 / 4 | +2,0 | [0,0; 3,8] | belegt besser (20 Blöcke) |

Raises nach dem Flop gegen F23: 2.3 2,5 %, 2.1.0 2,3 %, 2.2.0 5,2 % aller Postflop-Entscheidungen. Die erhöhte Raise-Häufigkeit von 2.2 beruhte auf
überschätzten Fold-Raten (Fold-Vorhersage für empfohlene Raises gegen das Regressionsset: vorhergesagt 0,29, beobachtet 0,06) und ist behoben.

### Gesonderte Bewertung der Generalisierung

| Befund | Ergebnis |
|---|---|
| neue versiegelte Testgruppe (P1) | gleichwertig mit 2.1.0 im Rahmen der Grenze 5 BB/100 (−1,3 [−3,4; 0,8]) |
| Validierungsgruppe Va23 (Modellwahl, mehrfach genutzt) | −2,8 [−12,5; 6,8] |
| Regressionsset | 0,0 [−4,0; 4,1] |
| gegenüber 2.2.0 auf F23 | +12,1 belegt besser |
| Equity gegen unbekannte Strategien | Unterschätzung wie 2.1.0, nicht verbessert |

Die Generalisierung ist **auf den Stand von 2.1.0 zurückgeführt, nicht darüber hinaus verbessert**. Der Vorsprung gegen die eigene Gegner-KI
(+19,3 gegenüber 2.1.0) bleibt dabei zu etwa zwei Dritteln erhalten (2.2.0 lag 8,5 höher).

## 4. Freigabekriterien des Auftrags

| Kriterium | Stand |
|---|---|
| 1 keine kritischen Fehler bekannt | erfüllt (offene Befunde nur gering, `PRUEFUNG_2.3.md`) |
| 2 Regressionstests bestanden | erfüllt |
| 3 keine relevante Verschlechterung gegen neue unabhängige Gegner, Nichtunterlegenheit belegt | **erfüllt (P1)** |
| 4 Qualität gegen bekannte Gegner erhalten oder verbessert | gegenüber 2.1.0 erfüllt (P2, P3, S2); das vorab zusätzlich gesetzte S1 (nicht schlechter als 2.2.0) **nicht erfüllt** |
| 5 Kalibrierungsziele erfüllt oder transparent | ±0,03 je Straße auf V und T erfüllt; Brier als Held auf T und Fold-Vorhersage auf T verfehlt; Bias gegen unbekannte Strategien dokumentiert |
| 6 PAI-Kompatibilität geprüft | geprüft; Lesen von Format 3 braucht die Änderung in PAI (Auftrag liegt vor) |
| 7 Performance und Stabilität erhalten | erfüllt |
| 8 unabhängige Abschlussprüfungen | erfüllt (fünf Prüfagenten vor den Hauptläufen) |
| 9 Final Acceptance Test | offen |
| 10 ausdrückliche Freigabe | offen |

## 5. Qualitätsbewertung

Unveränderte Matrix. Eine Teilnote steigt nur mit erfülltem Kriterium und sinkt mit verfehltem.

| Bereich | Gewicht | Ziel | 2.1.0 | 2.2.0 | 2.3 | Begründung |
|---|---:|---:|---:|---:|---:|---|
| Regelkorrektheit | 15 % | 10 | 10 | 10 | 10 | 1 Mio. Hände ohne Fehler |
| Mathematische Zuverlässigkeit | 15 % | 9,8 | 9,8 | 9,7 | 9,7 | ±0,03 je Straße erstmals erfüllt; aber Brier als Held auf T schlechter als 2.1.0, schwerer Befund A23-1 erst in der Prüfung gefunden |
| Coach und Strategie | 20 % | 9,5 | 8,9 | 8,6 | **9,0** | P1–P3 erfüllt, Regression 2.2 behoben, Short Stack erstmals belegt besser; aber P4 nicht bestanden (gleichgewichtsnah belegt schwächer als 2.0.1), S1 belegt schlechter als 2.2.0, Fold-Vorhersage auf T schlechter |
| Gegner-KI | 10 % | 9,5 | 9,3 | 9,3 | 9,3 | Kalibrierung erfüllt; neue synthetische Gruppen sind Testmittel, keine Gegner-KI |
| Lernsystem | 10 % | 9,5 | 9,3 | 9,3 | 9,3 | keine Änderung außer C-7; Lernwirkung nicht gemessen |
| Oberfläche und Barrierefreiheit | 10 % | 9,5 | 9,3 | 9,3 | 9,3 | 52/52 Browsertests mit axe-core; kein echter Screenreader-Test |
| Performance | 5 % | 9,8 | 9,8 | 9,8 | 9,8 | P95 50,9 ms, Maximum 395 ms |
| Sicherheit und Datenschutz | 10 % | 9,8 | 9,6 | 9,6 | 9,6 | Exportsperre, Lerndaten-Prüfung; Seed in Sicherungen dokumentiert (E23-1) |
| Dokumentation, Tests, Deployment | 5 % | 9,8 | 9,7 | 9,7 | 9,7 | Kriterien vorab, Berichte aus Rohdaten, Prüfstatus je Befund |
| **Gesamt** | 100 % | **≥ 9,5** | **9,47** | **9,42** | **9,48** | |

Rechnung: 0,15·10 + 0,15·9,7 + 0,20·9,0 + 0,10·9,3 · 3 + 0,05·9,8 + 0,10·9,6 + 0,05·9,7 = 9,48.
**Das Ziel 9,5 ist nicht erreicht.** 2.3 liegt knapp über 2.1.0 und über 2.2.0. Die Generalisierung ist wiederhergestellt; der zusätzliche Abstand zu
2.2.0 gegen die Gegner-KI und der schwächere gleichgewichtsnahe Modus verhindern eine höhere Strategienote.

## 6. Verbleibende Schwächen

- Gleichgewichtsnaher Modus belegt schwächer als 2.0.1 (−6,3); jetzt als „experimentell“ gekennzeichnet.
- Gegen die Gegner-KI 8,5 BB/100 unter 2.2.0 (Preis der Vorsicht im hybriden Modell).
- Equity gegen unbekannte Strategien weiter unterschätzt (−0,05, am River nach Checks −0,15).
- Hybrides Gewicht beruht auf den zehn jüngsten aufgedeckten Blättern, ohne Alter und ohne Kopplung an die Veränderungserkennung.
- PAI liest Format 3 erst nach der beschriebenen Änderung; der Kanal „pai“ hat noch kein Schema.
- Offen und gering: B23-9, C23-5, C23-10, E23-10, E23-12, E23-14 (`PRUEFUNG_2.3.md`).
- Nicht geprüft: Screenreader, Systemstimme, Mobilgeräte, Lernwirkung. Lizenz und Anbieterkennzeichnung offen.
