# Unabhängige Abschlussprüfung 2.2 (Arbeitspaket 11)

Fünf getrennte Prüfagenten, jeweils auf einer Kopie des Repositorys, ohne Schreibzugriff auf den Arbeitsstand, höchstens zwei gleichzeitig
(Lernprotokoll 2.1). Vollständige Berichte mit Reproduktionsskripten: `BERICHT_A.md` … `BERICHT_E.md` in diesem Ordner (Skriptpfade beziehen sich
auf die Prüfumgebung). Geprüfte Stände: A und B Commit 72d085f, C und D 7a2413a, E 83c926e.

| Agent | Bereich | Befunde | schwer | mittel | gering |
|---|---|---:|---:|---:|---:|
| A | Mathematik, Equity, EV, Statistik | 16 | 1 | 4 | 11 |
| B | Strategie, Einsatzgrößen, Gegner-KI | 9 | 0 | 3 | 6 |
| C | Gegnergedächtnis, Lernsystem, Datenbank | 13 | 2 | 3 | 8 |
| D | Softwarequalität, Performance, Sicherheit | 11 | 0 | 2 | 9 |
| E | Oberfläche, Barrierefreiheit, PWA, PAI | 11 | 1 | 6 | 4 |
| **Summe** | | **60** | **4** | **18** | **38** |

Nach den Korrekturen von A und B wurden die Likelihood-Tabelle, das Push/Fold-Modellspiel und die Stil-Kalibrierung der Gegner-KI neu berechnet und
der Hauptvergleich (Plan `v22`) **vollständig neu** gestartet; die 45 vorher fertigen Läufe liegen getrennt in `tests/results/strategy-runs-v22-vorlauf/`
und gehen in keinen Bericht ein. Die Befunde von C, D und E betreffen keine Datei, die in die Vergleichsläufe eingeht (Prüfsummen der Engine-Module).

## Status je Befund

| Befund | Kurz | Status | Regressionstest / Nachweis |
|---|---|---|---|
| A-1 schwer | Push-Chart skaliert jede Klasse (Gegner-KI foldete AA) | behoben: Breitenskalierung monoton (`scaleWidth`) | `strategie-22.js` AP4 (AA bei scale 0,5 = 1) |
| A-2 | Breite bei scale > 1 zu groß, Müllhände gleich gewichtet | behoben (gleiches Verfahren) | AP4 |
| A-3 | Bezug der Gegneranpassung PRIOR statt Populationsmittel | behoben: `LIK.ref` aus Gegner-KI-gegen-Gegner-KI ohne Prober | Tabelle v2 |
| A-4 | Scheinverbesserung durch Regression zur Mitte | behoben: Auswahl 1–10, vorher 11–20, nachher letzte 10 | AP7 |
| A-5 / B-3 | Jam-Ranges ohne All-in-Prüfung, Rückfall auf alten Chart | behoben: `lineOf` mit All-in und effektivem Stack | AP4, Fuzz D |
| A-6 | Preflop-Tabelle als „exakt“ bezeichnet | Dokumentation korrigiert (Monte Carlo, SE ≈ 0,45 Pp.) | – |
| A-7 | raiseMul verschiebt Fold-Rate | behoben: Umverteilung im Weiterspielanteil | – |
| A-8 | γ-Bisektion bei 8 begrenzt | behoben (bis 40) | – |
| A-9 | Glättung zählt Daten doppelt | behoben: Leave-one-out-Prior | Tabelle v2 |
| A-10 | Kalibrierungsintervalle ohne Handkennung | behoben: Handkennung, cluster-robuste Fehler | `calib-report.js` |
| A-11 | Autokorrelation ohne Nullerwartung | behoben: bereinigte Werte berichtet (Lag 1: 0,10/0,15; Lag 5: 0,004) | `folgeaudit-daten.json` |
| A-12 | Fehlerfelder zählen doppelt | behoben | AP7 |
| A-13 | Vorher-Nachher-Urteil mit z statt t, auch unvollständig | behoben | AP7 |
| A-14 / C-9 | Hypothesen gegen PRIOR, ohne Mehrfachkorrektur, Vermutung zu oft | behoben: Bezug `LIK.ref`, Holm, „Vermutung“ erst ab 30 Gelegenheiten | AP6 |
| A-15 | Zelle weiterer Reagierender im Mehrspielerpot | teilweise: fehlende Zellen fallen auf die Elternstufe zurück; Preis für zweite Reagierende bleibt Näherung | – |
| A-16 | Neuntel statt Zehntel, Stacks unter 6 BB | behoben: Stacks 3 und 4,5 BB ergänzt, Dokumentation | AP4 |
| B-1 | River-Overbet-Leads zu bluff-lastig | teilweise: Ursache (seltene Overbet-Linie ohne Mehrspielerfaktor) behoben, Tabelle neu; Restabweichung je Gruppe in `ERGEBNISSE_2.2.md` | Kalibrierung T |
| B-2 | Leads ohne Gegneranpassung | geprüft, nicht übernommen: auf V Bias bei Leads −0,001 (ohne) gegen +0,014 (mit) | `tests/results/calib-2.2` |
| B-4 | Untergrenze 0,02 | geprüft, nicht übernommen: mit 0,002 auf V schlechter (Leads −0,036) | wie oben |
| B-5 | ≤ 15 BB Push-Chart angezeigt, kleines Open empfohlen | Text korrigiert („Handauswahl nach Push/Fold-Modellspiel, Größe nach EV“); Verhalten beibehalten, da gegen die Gegner-KI nicht schlechter (Open +0,70 ± 0,13 gegen All-in +0,55 ± 0,13 BB) | – |
| B-6 | Folds gegen River-Overbets unterschätzt | offen (konservative Richtung) | – |
| B-7 | Eigenheiten der Gegner-KI | behoben: Mehrspielerfaktor, Check-Raise nur nach Check, Größenempfindlichkeit um ⅓ Pot zentriert | `long.js calib` alle Stile im Ziel |
| B-8 | Push/Fold nicht monoton je Klasse, Test nach Klassen | Test kombinationsgewichtet; Nichtmonotonie einzelner Klassen dokumentiert (fiktives Spiel, Rundung) | AP4 |
| B-9 | Gleichgewichtsnah mit Populationstabelle | behoben: gleichgewichtsnah grenzt mit dem ausgewogenen Faustregelmodell ein | – |
| C-1 schwer | Vorher-Nachher-Test nicht abschließbar | behoben: nur erzeugbare Seeds | Prüfer-C-Test |
| C-2 schwer | Test zeigt Empfehlung vor der Entscheidung | behoben: Tipp aus, Modus fest, danach wiederhergestellt (nie gespeichert) | E: Browserablauf |
| C-3 / E-5 | Bewertung bei falscher Situation bzw. verloren | behoben: Schlüssel zum Entscheidungszeitpunkt, Warten auf Bewertungen | – |
| C-4 / D-1 / D-3 | Ereignisstrom mit Seeds, Zeit, Sitzung, Coach-Bewertungen | behoben | Prüfer-C-Test |
| C-5 / D-4 | Prüfung umgehbar, Ausnahmen | behoben: Positivlisten, Abgleich, Meldung statt Ausnahme | Prüfer-C-Test, AP8 |
| C-6 / D-7 | `validPP` ohne Schlüsselprüfung | behoben | Prüfer-C-Test |
| C-7 | Reparatur verwirft still | offen (Anzahl entfernter Einträge wird gemeldet, keine Rohsicherung je Eintrag) | – |
| C-8 / D-9 | verwaiste Tests | behoben | – |
| C-10 | Verbesserungstabelle ohne Mehrfachkorrektur | behoben (Holm) | – |
| C-11 / D-8 | „constructor“ als Name | behoben | – |
| C-12 | Format-1-Gegner ohne Aktionszähler | offen, dokumentiert (Coach nutzt dann die Glättung) | – |
| C-13 | veraltete Kommentare und Dokumente | behoben | – |
| D-2 | Ereignisexport blockiert die Oberfläche | teilweise: einmal statt dreimal serialisiert; großer Export bleibt im Hauptthread | – |
| D-5 | Spielerzahl 6 fest in der Zelle | offen: der Trainer hat immer sechs Plätze, im Spiel nicht erreichbar | – |
| D-6 | `tabBlend = 0` liefert reine Tabelle | offen (nur Studienschalter) | – |
| D-10 | Versionstexte 2.1 | behoben | `check-version.js` |
| D-11 | Beschriftung „Open 2,5 BB“ bei 2-BB-Stack | offen (seit 2.1, nur Beschriftung) | – |
| E-1 schwer | Syntaxfehler in views.js (Bereiche leer) | behoben | neuer Test `tests/unit/syntax.js` (alle Skripte und Offline-Datei) |
| E-2 | Ø Qualität während des Tests | behoben (ausgeblendet, „Situation k von N“) | – |
| E-3 / E-4 | Modus im Test umschaltbar, Sicherung mit Testeinstellungen | behoben (gesperrt mit Hinweis; Sicherung mit eigenen Einstellungen) | – |
| E-6 | Fokus auf BODY, mobile Leiste außerhalb | behoben (Fokus auf Trainingsleiste bzw. Überschrift, Ansage) | – |
| E-7 / E-8 | „eindeutig“ nur farbig, Tabellenkopf ohne scope | behoben | – |
| E-9 | „k von N“ am Testende | behoben | – |
| E-10 | e2e sucht Offline-Datei 2.1 | behoben (Version aus `check-version`) | – |
| E-11 | PAI-Alternative über Ereignisstrom eingeschränkt | Dokumentation präzisiert | `pai-integration.mjs` |

Nicht ausführbar: Test mit echtem Screenreader (NVDA, VoiceOver), Sprachausgabe mit deutscher Stimme, echte Mobilgeräte.
Nach den Korrekturen: `node tests/run.js` und Browsertests erneut ausgeführt (`docs/TESTBERICHT_2.2.md`).
