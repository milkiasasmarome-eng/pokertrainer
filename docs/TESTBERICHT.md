# Testbericht und Qualitätsbewertung – PokerTrainer 2.1.0

Stand: 27.11.2026. Alle Zahlen stammen aus tatsächlich ausgeführten Läufen auf dem veröffentlichten Stand 2.1.0. Rohdaten in `tests/results/`, automatisch erzeugte Übersichten in [TESTERGEBNISSE.md](TESTERGEBNISSE.md) und im Ergebnisblock von [STRATEGIE.md](STRATEGIE.md). Die Abnahmekriterien wurden vor der Umsetzung festgelegt: [ABNAHMEKRITERIEN_2.1.md](ABNAHMEKRITERIEN_2.1.md). Der Testbericht zu 2.0.1 steht in der Git-Historie (Tag `v2.0.1`).

## 1. Ausgeführte Prüfungen

| Bereich | Prüfung | Ergebnis |
|---|---|---|
| Regeln | 1.000.000 simulierte Hände, 8 Konfigurationen, Invarianten nach jeder Aktion (2.1.0, mit geänderter Gegner-KI neu gelaufen) | 0 Fehler, 8.840.507 Aktionen, 8.679 Side-Pot- und 9.118 Split-Pot-Hände, 32.671 ungültige Eingaben abgewiesen |
| Regeln (unabhängig) | Referenz-Zustandsmaschine des Prüfers A (300.000 Hände, 57 Szenarien); `rules.js` seit 2.0.1 unverändert | 0 Abweichungen |
| Handbewertung, Häufigkeit | alle 133.784.560 Sieben-Karten-Hände: Kategorienhäufigkeiten | gleich den Literaturwerten |
| Handbewertung, individuell | jede Fünf- und jede Sieben-Karten-Hand einzeln gegen eine unabhängige Best-of-Five-Referenz; Paarvergleiche mit Gleichständen und Kickern; Permutations- und Farbinvarianz; Mutationsprobe | 0 Abweichungen; 4 von 4 eingebauten Fehlern erkannt |
| Monte Carlo | Abdeckung der 95-%-Intervalle je Stufe gegen exakte Enumeration, Toleranz vorab festgelegt (93,0–97,5 % gesamt, ≥ 90 % je Fall, \|z\| ≤ 3,5) | Schnell 95,4 %, Standard 95,3 %, Präzise 95,1 %, Tiefenanalyse 95,1 %; größtes \|z\| 2,85 |
| Befunde A1–A6 | je ein Reproduktionstest vor der Korrektur | alle sechs bestätigt und behoben (`docs/AUDIT.md`) |
| Strategie | 241 Läufe, 602.500 Hände, 442.434 Coach-Entscheidungen, gepaarte Seeds, getrennte Zufallsströme, Block-Bootstrap | siehe Abschnitt 3 |
| Gegner-KI | Kalibrierung 200.000 Hände, sechs Stile; Anpassung an synthetische Heldenstrategien | alle Zielbereiche; Anpassungen mit Intervall ohne 0 (`GEGNERGEDAECHTNIS.md`) |
| Gegnergedächtnis | Fehlalarm- und Erkennungsraten, Rückkehrer, Migration Format 2 → 3 | im Zielbereich; 3/3 Browsertests |
| Unit-Tests | `node tests/run.js` (114 Tests) | alle bestanden |
| Browsertests | `node tests/e2e.js` (52 Tests: Spiel, Coach in drei Modi, Sprache, Import/Export mit Sicherung, XSS, Wiederherstellung, Mehrfach-Tabs, Offline, Einzeldatei, Layout 320–1366 px, axe-core) | 52/52 |
| Leistung | lokal: LCP 132 ms, CLS 0,004, Tipp Mittel 37 ms, Maximum 187 ms; Chromium mit 4-facher CPU-Drosselung: längster Tipp 1.048 ms | unter 2 s |

## 2. Unabhängige Prüfungen

Vier getrennte Prüfagenten (A Mathematik, B Strategie, C Architektur/Sicherheit/Datenbank, D Oberfläche/Barrierefreiheit/PWA) haben 2.1 geprüft und gezielt Gegenbeispiele gesucht. Befunde und Korrekturen: `docs/AUDIT.md`, `docs/audit-2.1/`. Ein echter Screenreader-Test war technisch nicht ausführbar (Orca lief in der Prüfumgebung nicht zuverlässig); ersatzweise liefen axe-core, der Barrierefreiheitsbaum von Chromium, ein Mitschnitt aller Live-Ansagen und Fokusprüfungen.

**Korrektur zum Abschlussbericht 2.0.1:** Dort stand, der Vergleichsbot habe in 1 von 6 Läufen vor dem Coach gelegen. Laut Tabelle waren es 2 Läufe (exploitativ Seed 23: −18,1 gegen −15,7; Seed 24: 8,3 gegen 28,3). Die beiden gleichgewichtsnahen Läufe nutzten zudem dieselben Bot-Vergleichsläufe wie die exploitativen Seeds 21 und 22 und waren keine unabhängigen Stichproben. Zusammenfassungen entstehen jetzt automatisch aus den Rohdaten (`tools/report-strategy.js`).

## 3. Strategischer Vergleich 2.0.1 gegen 2.1

All-in-bereinigte BB/100, 95-%-Intervall per Block-Bootstrap (Blöcke à 500 Hände). „Belegt“ heißt: Intervall ganz über 0.

| Vergleich | Hände | Differenz BB/100 | 95-%-Intervall | Urteil |
|---|---:|---:|---|---|
| Coach 2.1 − Coach 2.0.1 (exploitativ, 3 Stacktiefen × 4 Zusammensetzungen) | 120.000 | **+14,0** | [9,1; 18,9] | belegt besser |
| dasselbe gegen dem Coach unbekannte Gegnerstrategien (6 synthetische) | 30.000 | **+43,5** | [28,2; 58,7] | belegt besser |
| 15 BB effektiv | 7.500 | −0,0 | [−1,5; 1,7] | zu wenig Blöcke |
| gleichgewichtsnaher Modus | 5.000 | **−20,6** | [−35,4; −7,5] | zu wenig Blöcke, deutlich schlechter |

Absolut (gegen die Gegner-KI auf demselben Platz): Coach 2.1 +42,6 [35,7; 49,8], Coach 2.0.1 +28,6 [22,0; 35,2], 2.1 liegt 94,5 BB/100 [84,1; 105,1] über der Referenzstrategie „Pot-Odds-Schwelle“. 0 von 442.434 Empfehlungen wurden von den Regeln abgelehnt. In keiner Teilgruppe (Stacktiefe, Zusammensetzung) liegt das Intervall ganz unter 0. Zwischenstand vor Prüfung B: +8,8 [4,6; 12,9]; die Korrekturen aus Prüfung B haben den Abstand vergrößert.

Der gleichgewichtsnahe Modus ist schwächer als in 2.0.1. Ursache: 2.0.1 rechnete auch dort mit dem konservativen Fold-Abschlag, also implizit exploitativ gegen die Computergegner. 2.1 rechnet dort ausgewogen. Ein Hauptvergleich zeigte zusätzlich Überbluffen bei EV-Gleichstand (−42,7); das ist korrigiert (Gleichstand → passive Aktion, Bluff als gleichwertige Alternative genannt). Voreinstellung bleibt der exploitative Modus.

## 4. Qualitätsbewertung

Bewertet an den vorab festgelegten Kriterien. Zusätzliche Funktionen oder größere Testmengen heben keine Note.

| Bereich | Gewicht | Ziel | Ist | Begründung |
|---|---:|---:|---:|---|
| Regelkorrektheit | 15 % | 10 | 10 | alle Kriterien erfüllt |
| Mathematische Zuverlässigkeit | 15 % | 9,8 | 9,8 | A2–A5 behoben; Abdeckung je Stufe im Toleranzband; Handbewertung individuell unabhängig geprüft |
| Coach und Strategie | 20 % | 9,5 | 8,9 | Hauptvergleich und unbekannte Strategien belegt besser; aber gleichgewichtsnaher Modus schlechter als 2.0.1, Größenwahl für starke Hände weiter groß (½ Pot ≈ 6 %), River-Equity gegen Caller und nach Leads überschätzt (B4, B11 teilweise), 15 BB nicht belegt |
| Gegner-KI | 10 % | 9,5 | 9,3 | Kalibrierung und Anpassung belegt; Anpassungsmessung stammt von vor der Größenkorrektur B3 (Kalibrierung danach erneut bestanden) |
| Lernsystem | 10 % | 9,5 | 9,3 | Bewertung ergebnisunabhängig, keine „eindeutig“-Aussage bei Gleichstand; frei gewählte Größen nachgerechnet; Lernwirkung nicht empirisch gemessen; sehr große Bluffs ohne Nachrechnung zu mild |
| Oberfläche und Barrierefreiheit | 10 % | 9,5 | 9,3 | axe-core ohne A/AA-Verstöße, Tastatur und Fokus geprüft, kein hängender Start; kein echter Screenreader-Test |
| Performance | 5 % | 9,8 | 9,8 | Tipp < 2 s auch bei 4-facher Drosselung, LCP < 1 s, Zeitgrenze in allen Berechnungen |
| Sicherheit und Datenschutz | 10 % | 9,8 | 9,6 | alle Kriterien erfüllt; zehn in der Prüfung C gefundene Schwächen behoben, danach keine erneute unabhängige Prüfung |
| Dokumentation, Tests, Deployment | 5 % | 9,8 | 9,7 | CI mit Pflichttests, reproduzierbarer Build, Versionsgleichheit, Live-Smoke-Test |
| **Gesamt** | 100 % | **≥ 9,5** | **9,47** | |

**Das Ziel 9,5 ist knapp nicht erreicht.** Die Lücke liegt fast vollständig im Bereich Coach und Strategie.

## 5. Verbleibende Schwächen

- **Kein Solver.** Empfehlungen sind Modellschätzungen; das River-Modellspiel ist ein vereinfachtes Gleichgewicht. Hinweis im Tippfeld: „Faustregel, kein Solver-Ergebnis“.
- **Gleichgewichtsnaher Modus** gegen die Computergegner schwächer als 2.0.1 (−20,6 BB/100 auf 5.000 Händen).
- **Größenwahl:** Starke Hände wählen weiter meist Pot oder Overbet; ½ Pot selten. Das Reaktionsmodell ist kalibriert, aber die Equity gegen Caller auf dem River ist überschätzt.
- **River nach Leads:** Equity-Schätzung verbessert (0,87 → 0,60), gegen die echten Hände der Gegner-KI 0,38.
- **Short Stack:** Gegen Open und 3-Bet gelten bei 20 BB weiter die 100-BB-Charts (ohne Nicht-All-in-Raises); Vorteil gegen 2.0.1 bei 15 BB nicht belegt.
- **Barrierefreiheit:** kein Test mit echtem Screenreader.
- **Rechtliches:** Anbieterkennzeichnung und Lizenz offen (`docs/RECHTLICHES.md`).
