# Testbericht und Qualitätsbewertung – PokerTrainer 2.2.0

Stand: 27.11.2026, Zweig `entwicklung-2.2`. Alle Zahlen stammen aus Läufen auf diesem Stand. Rohdaten: `tests/results/`. Tabellen aus den Rohdaten:
[ERGEBNISSE_2.2.md](ERGEBNISSE_2.2.md) (`node tools/report-22.js`). Abnahmekriterien vor den Läufen festgelegt: [ABNAHMEKRITERIEN_2.2.md](ABNAHMEKRITERIEN_2.2.md).
Folgeaudit zu 2.1: [audit-2.2/FOLGEAUDIT.md](audit-2.2/FOLGEAUDIT.md). Unabhängige Prüfung: [audit-2.2/PRUEFUNG_2.2.md](audit-2.2/PRUEFUNG_2.2.md).

## 1. Ausgeführte Prüfungen

| Bereich | Prüfung | Ergebnis |
|---|---|---|
| Regeln | `tests/long.js`: 1.000.000 Hände, 8 Konfigurationen, Invarianten nach jeder Aktion (`rules.js` seit 2.0.1 unverändert) | 0 Fehler, 8.842.931 Aktionen, 8.659 Side Pots, 8.778 Split Pots, 32.730 ungültige Eingaben abgewiesen |
| Handbewertung | 133.784.560 Sieben-Karten-Hände (Häufigkeiten), 10,8 Mio. Einzelhände gegen unabhängige Referenz, Permutation, Farbe | gleich den Literaturwerten, 0 Abweichungen |
| Monte Carlo | Abdeckung der 95-%-Intervalle je Stufe | 95,05–95,38 %, im vorab festgelegten Band |
| Gegner-KI | Stil-Kalibrierung, 200.000 Hände, neue Eigenheiten aktiv | alle sechs Stile im Zielbereich, Spielertyp der Anzeige 198/200 |
| Strategie | Plan `v22`: 154 Läufe, Hauptvergleich 100.000 Hände je Held, gepaarte Seeds 22001 ff. (nie in der Entwicklung genutzt) | Abschnitt 3 |
| Range und Equity | `range-calib.js` (V, T, synthetische und unbekannte Strategien), `equity-calib.js` (Coach als Held), Lead-Studie | Abschnitt 4 |
| Reaktionsmodell | `sizing-study.js` auf V und T, gegenfaktische Ausspielung jeder Größe | Abschnitt 4 |
| Push/Fold | fiktives Spiel 3–25 BB, Exploitability | ≤ 0,0031 BB je Hand (Kriterium ≤ 0,005) |
| Unit-Tests | `node tests/run.js` | 124 bestanden, 0 fehlgeschlagen |
| Browsertests | `node tests/e2e.js` (Spiel, drei Tipp-Modi, Sprache, Import/Export, XSS, Wiederherstellung, Mehrfach-Tabs, Offline, Einzeldatei, Layout 320–1366 px, axe-core) und `tests/e2e-gedaechtnis.js` | 52/52 und 3/3 |
| PAI | `tests/pai-integration.mjs` gegen PAI 0.1.0 | 8/9; offen: PAI liest Trainer-Sicherungen Format 3 nicht (PAI unterstützt 2) |
| Leistung | `tests/perf-22.js`, 800 Hände, Node, ohne Last | Median 19,1 ms, P95 51,5 ms, P99 232,9 ms, Maximum 331 ms, 0 über 1 s (2.1.0: 19,0 / 45,5 / 220,5 / 290) |
| Leistung Browser | e2e: LCP 128 ms, CLS 0,004, Tipp Mittel 44 ms, Maximum 201 ms | unter 2 s |
| Unabhängige Prüfung | fünf Prüfagenten A–E | 60 Befunde (4 schwer), Status je Befund in `PRUEFUNG_2.2.md` |

Nicht ausführbar und offen: Test mit echtem Screenreader (NVDA, VoiceOver), Sprachausgabe mit deutscher Systemstimme, echte Mobilgeräte,
messbare Lernwirkung bei echten Nutzern (keine Nutzerdaten).

## 2. Folgeaudit (Kurzfassung)

Der zwölfte Befund von Prüfer B war B10 (Dokumentation), erledigt. Die 602.500 Hände aus 2.1 bestehen aus 241 Läufen mit 162.500 unabhängigen
Kartenfolgen; die übrigen Hände sind gepaarte Wiederholungen derselben Karten. Gegnerbedingungen innerhalb des 2.1-Vergleichs waren identisch,
berichtsübergreifende Zahlen nicht. Die Blöcke sind nach Bereinigung praktisch unabhängig (Lag 5: 0,004). Die gleichgewichtsnahe „Regression“ von
−20,6 BB/100 und der 15-BB-Befund beruhten auf weniger als 20 Blöcken und waren kein Beleg. Details: `audit-2.2/FOLGEAUDIT.md`.

## 3. Strategische Vergleiche (Plan v22)

All-in-bereinigte BB/100, gepaarte Differenz, Block-Bootstrap (500er-Blöcke). „Belegt“ nur mit Intervall ohne 0 und mindestens 20 Blöcken.

| Kennung | Vergleich | Hände je Held | Differenz | 95-%-Intervall | Urteil | Kriterium |
|---|---|---:|---:|---|---|---|
| H1 | Coach 2.2 − 2.1.0, Gegner-KI 2.2 | 100.000 | **+25,5** | [21,2; 29,9] | belegt besser | erfüllt (Fortschritt) |
| H1b | Coach 2.2 − 2.0.1 | 10.000 | +41,7 | [28,3; 56,2] | belegt besser | beschreibend |
| H1b | Coach 2.2 − Gegner-KI als Held | 10.000 | +50,5 | [37,8; 62,9] | belegt besser | beschreibend |
| H2 | Coach 2.2 − 2.1.0, **unveränderte Gegner-KI 2.1** | 15.000 | +37,2 | [26,0; 48,6] | belegt besser | erfüllt |
| H3 | Coach 2.2 − 2.1.0, nur Testgruppe T | 7.500 | +29,7 | [19,9; 40,8] | zu wenig Blöcke (15) | erfüllt (nicht schlechter) |
| **H4** | **Coach 2.2 − 2.1.0, abschließend unbekannte Strategien** | 15.000 | **−16,8** | **[−30,4; −4,7]** | **belegt schlechter** | **nicht erfüllt** |
| **H4** | **Coach 2.2 − 2.0.1, abschließend unbekannte Strategien** | 15.000 | **−21,8** | **[−35,8; −7,1]** | **belegt schlechter** | **nicht erfüllt** |
| H5 | Coach 2.2 − 2.1.0, vier Stacktiefen | 20.000 | +6,9 | [−1,4; 14,0] | nicht belegt | 15 BB gemessen, kein Fortschritt |
| H5 | ↳ 15 BB / 25 BB / 40 BB / 200 BB | je 5.000 | −0,4 / +4,4 / +12,8 / +10,8 | 40 BB: [1,5; 24,1] | je zu wenig Blöcke | – |
| – | Coach 2.2 − Push/Fold-Referenz, 15 BB | 5.000 | +6,0 | [3,1; 8,6] | zu wenig Blöcke | beschreibend |
| H6 | gleichgewichtsnah 2.2 − 2.0.1 | 10.000 | −0,9 | [−13,6; 10,9] | nicht belegt | erfüllt → Name „Gleichgewichtsnah“ bleibt |
| H6 | gleichgewichtsnah 2.2 − 2.1.0 | 10.000 | 0,0 | – | identisches Spiel | – |

0 ungültige Coach-Aktionen in allen Läufen; Coach-Rechenzeit in den Läufen höchstens 655 ms und 5.000 Simulationen.

### H4: strategische Regression gegen unbekannte Strategien

Die Verbesserung gegen die Gegner-KI überträgt sich **nicht** auf Strategien, die dem Coach unbekannt sind. 2.1 war hier gegen 2.0.1 noch
+43,5 BB/100 besser; 2.2 ist gegen beide Vorgänger belegt schlechter. Aufteilung (je 2.500 Hände, 5 Blöcke, einzeln kein Beleg):

| Unbekannte Strategie | 2.2 − 2.1.0 | 2.2 − 2.0.1 |
|---|---:|---:|
| Polarisierer | −47,0 [−101,0; −4,3] | −29,2 |
| Fallensteller | −42,5 [−63,6; −21,0] | −25,7 |
| Positionsspieler | −29,7 [−70,3; 4,1] | −14,6 |
| Minraiser | +8,7 | −31,9 |
| eng preflop, aggressiv postflop | +6,2 | −46,6 |
| umgekehrtes Größensignal | +3,5 | +17,3 |

Befund aus den Aktionsverteilungen (`tests/results/strategy-runs/h4final_*`): Gegen Polarisierer und Fallensteller checkt Coach 2.2 seltener
(31–32 % gegen 39–40 % der Postflop-Entscheidungen), setzt öfter ⅓ und ½ Pot und raist mit 2,5× rund zehnmal so oft (3,5 % gegen 0,3 %). Beide
Strategien verteidigen anders als die Gegner-KI: Der Fallensteller checkt starke Hände und check-raist, der Polarisierer setzt nur Nuts und Luft.
Die Populationstabelle (Range und Reaktion) ist an der Gegner-KI angepasst; die Anpassung an den einzelnen Gegner (λ, γ) korrigiert solche
Umkehrungen in 2.500 Händen nicht ausreichend. Die Ursache ist damit eingegrenzt, nicht isoliert. Ein Gegentest (z. B. Reaktionsmodell 2.1 bei
unbekannten Strategien) wäre ein neuer, vorab festzulegender Vergleich. Er ist nicht gelaufen.

**Folge:** Der Coach ist gegen die Computergegner des Trainers, für die er gebaut ist, deutlich stärker, auch gegen die unveränderte Gegner-KI 2.1
und die Testgruppe. Er verallgemeinert schlechter auf fremde Spielweisen als 2.1.0. Für das Training im Trainer überwiegt der Gewinn, für die
Übertragung auf andere Gegner ist 2.2 ein Rückschritt. Das ist bei der Freigabe abzuwägen.

## 4. Mathematik, Range und Reaktionsmodell

| Kriterium (vorab) | 2.1.0 | 2.2 | erfüllt |
|---|---|---|---|
| Brier Range-Equity V / T | 0,088 / 0,088 | 0,079 / 0,079 | ja |
| Brier Equity Coach als Held V / T | 0,079 / 0,087 | 0,069 / 0,075 | ja |
| Bias je Straße innerhalb ±0,03, Range-Kalibrierung V und T | Flop T −0,032 | größter Betrag 0,022 | ja |
| Bias je Straße innerhalb ±0,03, Equity Coach als Held | River V +0,037, T +0,048 | River V −0,024, **T −0,049** [−0,107; 0,010] | **nein** (T River, 195 Spots) |
| Fold-Vorhersage je Größe, mittlerer absoluter Fehler V / T | 0,121 / 0,083 | 0,048 / 0,027 | ja |
| Push/Fold-Exploitability | – | ≤ 0,0031 BB je Hand | ja |

River nach einem Bet von 71–110 % Pot (Ausgangsbefund 0,60 gegen 0,38): Bias 2.1.0 −0,227 → 2.2 −0,044 auf V, −0,111 → +0,033 auf T. Der Rechenfehler
der Equity (Schätzung gegen exakte Aufzählung derselben Range) ist 0,000 am River; die Abweichungen sind Range-Fehler. Gegen unbekannte synthetische
Strategien bleibt ein Bias von −0,074 (2.1: −0,105), gegen die abschließend unbekannten −0,049 (2.1: −0,053). Der Coach unterschätzt dort seine Equity.

## 5. Qualitätsbewertung

Unveränderte gewichtete Matrix aus `docs/TESTBERICHT.md` (2.1). Eine Teilnote steigt nur, wenn ein vorab festgelegtes Kriterium erfüllt ist; sie sinkt,
wenn ein Kriterium verfehlt wird.

| Bereich | Gewicht | Ziel | 2.1.0 | 2.2 | Begründung |
|---|---:|---:|---:|---:|---|
| Regelkorrektheit | 15 % | 10 | 10 | 10 | 1 Mio. Hände ohne Fehler, Regeln unverändert |
| Mathematische Zuverlässigkeit | 15 % | 9,8 | 9,8 | 9,7 | Brier besser, River-Lücke geschlossen, Exploitability im Kriterium; aber Bias Equity T River −0,049 außerhalb ±0,03, schwerer Befund A-1 (Push-Skalierung) erst in der Prüfung gefunden, A-15 nur teilweise |
| Coach und Strategie | 20 % | 9,5 | 8,9 | **8,6** | H1, H2 belegt besser, Fold-Vorhersage deutlich besser, gleichgewichtsnaher Modus nicht mehr schlechter; aber **H4 belegt schlechter gegen beide Vorgänger** (vorab festgelegtes Kriterium verfehlt), 15 BB weiter ohne Fortschritt |
| Gegner-KI | 10 % | 9,5 | 9,3 | 9,3 | Eigenheiten, Gruppen und Kalibrierung erfüllt; kein eigenes Abnahmekriterium für Vielfalt festgelegt, daher keine Anhebung; B-1 teilweise |
| Lernsystem | 10 % | 9,5 | 9,3 | 9,3 | Fehlerfelder, wiederkehrende Fehler, Vorher-Nachher-Test; zwei schwere Befunde (C-1, C-2) behoben; Lernwirkung nicht gemessen, C-7 offen |
| Oberfläche und Barrierefreiheit | 10 % | 9,5 | 9,3 | 9,3 | 52/52 Browsertests mit axe-core; schwerer Befund E-1 behoben; kein echter Screenreader-Test |
| Performance | 5 % | 9,8 | 9,8 | 9,8 | P95 51,5 ms (Kriterium ≤ 1.000 ms), Maximum 331 ms, Browser-Tipp ≤ 201 ms |
| Sicherheit und Datenschutz | 10 % | 9,8 | 9,6 | 9,6 | Ereignisstrom mit Positivlisten und Beobachtbarkeitsprüfung; Befunde C-4/C-5/D-4 behoben; keine weitere unabhängige Prüfung danach |
| Dokumentation, Tests, Deployment | 5 % | 9,8 | 9,7 | 9,7 | Berichte aus Rohdaten, Kriterien vorab, Syntaxtest; CI auf dem Zweig grün (Pull Request #2: Schnelltests, Build, Browsertests); Teilläufe überschrieben einmal das Gesamtergebnis (behoben) |
| **Gesamt** | 100 % | **≥ 9,5** | **9,47** | **9,42** | |

**Das Ziel 9,5 ist nicht erreicht. 2.2 liegt in der Gesamtnote unter 2.1.0.** Ursache ist die belegte Regression gegen unbekannte Strategien (H4).
Rechnerisch: 0,15·10 + 0,15·9,7 + 0,20·8,6 + 0,10·9,3 + 0,10·9,3 + 0,10·9,3 + 0,05·9,8 + 0,10·9,6 + 0,05·9,7 = 9,415.

## 6. Verbleibende Schwächen

- **Verallgemeinerung:** H4 belegt schlechter (−16,8 gegen 2.1.0, −21,8 gegen 2.0.1), vor allem gegen Polarisierer und Fallensteller.
- **Equity am River als Held:** auf T −0,049 (Unterschätzung); gegen unbekannte Strategien −0,05 bis −0,07.
- **Short Stack:** 15 BB ohne Fortschritt (−0,4 [−2,9; 2,0]); Minraise-Linien für 16–25 BB fehlen.
- **Gleichgewichtsnaher Modus:** nicht schlechter als 2.0.1, aber ohne Beleg für Gleichwertigkeit (Intervall ±12); kein Solver.
- **PAI:** PAI 0.1.0 liest Sicherungen Format 3 nicht; Empfehlungskanal „pai“ bleibt leer, bis PAI ihn füllt.
- **Offene Prüfbefunde:** A-15, B-1 (teilweise), B-6, C-7, C-12, D-2 (teilweise), D-5, D-6, D-11.
- **Nicht geprüft:** echter Screenreader, deutsche Systemstimme, Mobilgeräte, Lernwirkung.
- **Rechtliches:** Lizenz und Anbieterkennzeichnung offen.
