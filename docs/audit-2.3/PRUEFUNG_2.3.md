# Unabhängige Prüfung 2.3 (Arbeitspaket 11)

Fünf getrennte Prüfagenten, jeweils auf einem eigenen Klon, ohne Schreibzugriff auf den Arbeitsstand, höchstens zwei gleichzeitig. **Alle Prüfungen
liefen vor den abschließenden Vergleichen** (Lernprotokoll 2.2). Geprüfte Stände: A und B 3cb136d, C und D 9f09c0c, E 4782d23. Eingefrorener Stand der
abschließenden Läufe: acb0748. Berichte: `BERICHT_A.md` … `BERICHT_E.md` (Skriptpfade beziehen sich auf die Prüfumgebung).

| Agent | Bereich | Befunde | schwer/hoch | mittel | gering/Hinweis |
|---|---|---:|---:|---:|---:|
| A | Mathematik und Statistik | 13 | 1 | 4 | 8 |
| B | Strategie und Generalisierung | 15 | 2 | 7 | 6 |
| C | Gegner-KI und Gegnergedächtnis | 12 | 2 | 3 | 7 |
| D | Softwarequalität und Sicherheit | 8 | 0 | 4 | 4 |
| E | Oberfläche und PAI | 14 | 0 | 3 | 11 |
| **Summe** | | **62** | **5** | **21** | **36** |

Regressionstests: `tests/unit/pruefung-23.js` (Node), `tests/pai-integration.mjs` (PAI). Nach jeder Korrektur liefen `node tests/run.js --quick`
und die betroffenen Tests erneut; die Modellwahl wurde nach den Korrekturen am hybriden Modell mit derselben Regel wiederholt.

## Status je Befund

| Befund | Kurz | Status | Nachweis |
|---|---|---|---|
| A23-1 schwer | normierte Range-Mischung: Anzeige „1 Kombination“ | behoben (Masse zurückskaliert) | Test „gemischte Range behält die Kombinationsmasse“ |
| A23-2 | z-Statistik: abhängige Paare, feste Referenz | behoben: Designeffekt 1,297, getrennte Referenzen aggressiv/passiv; bleibt eine Kennzahl, kein kalibrierter Test | Referenzwerte `fit-hybrid.js` |
| A23-3 | Holm-Niveau 5 % gegen α 2,5 % | behoben (2,5 %, m = 4 fest, ≥ 20 Blöcke) | `compare.js` Plan v23 |
| A23-4 | Handzahlen Plan ≠ Kriterien | behoben (P4 60.000, S2 25.000; S1/S4 15.000 vor den Läufen dokumentiert) | `ABNAHMEKRITERIEN_2.3.md` |
| A23-5 | Bootstrap ohne Streuung zwischen Seeds | behoben: zweistufiger Bootstrap, für Nichtunterlegenheit gilt das konservativere Verfahren | `bootstrap.js` |
| A23-6 | fC identisch mit Produktstand | behoben (entfällt) | Plan v23 |
| A23-7 | Regel für abgebrochene Läufe fehlt | behoben (drei Versuche, Seed entfällt für alle Helden) | `compare.js` |
| A23-8 | Cache-Schlüssel ohne Aktionen | behoben | – |
| A23-9 | ECE ohne Rauschniveau | dokumentiert (ECE nur beschreibend, kein Ziel) | `ERGEBNISSE_2.3.md` |
| A23-10 | sizeShare kein Populationsanteil | Kommentar korrigiert, Cache wird beim Tabellenwechsel geleert | – |
| A23-11 | Doku/Code, Tests fehlen | behoben | `STRATEGIEVARIANTEN_2.3.md`, Tests |
| A23-12 | Randfälle | behoben (keine Paare → Vorwissen; NaN-Fall durch getrennte Prüfung entfallen) | Test Hybrides Modell |
| A23-13 / D23-4 | Nachberechnung bis 2 × 5.000 Simulationen | behoben: Nachberechnung nutzt das Restbudget | Test „Budget (A23-13)“ |
| B23-1 hoch | Polarisierer nicht erkannt (Größe ignoriert) | behoben: Größen in aufgedeckten Blättern, aggressive Aktionen getrennt geprüft | Test, `fit-hybrid.js` (Polarisierer z-Median −3,7) |
| B23-2 hoch | gewählte Variante auf Va23 belegt schlechter | durch Neuwahl überholt (−2,8 [−12,5; 6,8]); P1 entscheidet | `STRATEGIEVARIANTEN_2.3.md` |
| B23-3 | Varianten nachträglich, Ergebnisse unvollständig | dokumentiert, alle Läufe abgelegt (`strategy-sel23.json`, `strategy-tune23.json`) | – |
| B23-4 | V-Kriterium gegen varB statt 2.2.0 | dokumentiert; S1 misst 2.3 gegen 2.2.0 direkt | Plan v23 |
| B23-5 | fehlende Dokumente | behoben | – |
| B23-6 / C23-3 | w schwankt, nur zehn Blätter | teilweise: Pooling über den Tisch, getrennte Referenzen; Grenze dokumentiert | `GEGNERGEDAECHTNIS.md` §9 |
| B23-7 | Docstring ≠ Code | behoben | – |
| B23-8 | Wechselwirkung einseitig | behoben | `URSACHENANALYSE_2.3.md` |
| B23-9 | gleichgewichtsnah hängt von VPIP/PFR ab | offen, besteht seit 2.1 (Preflop-Range aus Gegnerwerten); dokumentiert | – |
| B23-10 / E23-6 | Push/Fold-Text doppelt, „0,0 BB“, lang | behoben (einmal, Abstand erst ab 0,05 BB, kurze Sprachausgabe, unter 3 BB „Lösung für 3 BB“) | – |
| B23-11 | alte Vergleichsläufe nicht reproduzierbar | dokumentiert (Arbeitsbäume `sicherung-*`) | – |
| B23-12 / C23-8 / D23-6 | Tests fehlen | behoben | `pruefung-23.js` |
| B23-13 | sizeShrink ignoriert fit.rho | behoben | – |
| C23-1 hoch / D23-5 | ausgeliefertes Maß nicht validiert | behoben: Modellwahl wiederholt | `strategy-sel23.json` (varC7) |
| C23-2 hoch | feste Zelle mischt Rolle und Stil | behoben (Lage Aggressor/frei) | Referenzwerte neu |
| C23-4 | alte Einträge ohne Größe | dokumentiert (prüfen nur die Art der Aktion) | §9 |
| C23-5 | kein Alter, keine Kopplung an Veränderungserkennung | offen, dokumentiert | §9 |
| C23-6 | 300 Zeichen ohne Kürzung | behoben | Test C23-6 |
| C23-7 | Rundung vor Klasseneinteilung | behoben (drei Stellen) | – |
| C23-9 | synth23: Zuordnung, Abdeckung | dokumentiert, nicht geändert (sonst wären Abstimmung und Wahl nicht mehr vergleichbar) | – |
| C23-10 | long.js meldet fest 200.000 Hände | offen (nur Beschriftung) | – |
| D23-1 / E23-8 | Exportsperre beim Neuzeichnen verloren | behoben (Sperre unabhängig von der Ansicht, Knöpfe deaktiviert) | – |
| D23-2 | große Exporte: Speicher, Blockade | teilweise: Aufbau im Worker; Grenze bei sehr großen Historien dokumentiert | – |
| D23-3 / E23-7 | Erfolgsmeldung ohne Download, leerer Export | behoben | – |
| D23-7 | Lerndaten: Prüfung ≠ Reparatur, Rohsicherung | behoben | Test C-7 |
| D23-8 | Pooling nach Paaren statt Gegnern | dokumentiert (Gegner mit vielen Blättern zählen stärker) | – |
| E23-1 | Sicherung verrät verdeckte Karten (Seed) | Änderungsauftrag: Positivliste; Doku | `PAI_AENDERUNGSAUFTRAG.md`, Test „ohne Seed …“ |
| E23-2 | Leckagetest wirkungslos | behoben: gegen den Handverlauf, mit Negativtest; PAI-Seite im Auftrag | `pai-integration.mjs` |
| E23-3 | Szenariohände in PAIs Gedächtnis | Änderungsauftrag Punkt 3 | – |
| E23-4 | Kanal „pai“ nicht füllbar | dokumentiert (Schema später, Auftrag Punkt 8) | – |
| E23-5 | Auftrag ungenau, PAI_INTEGRATION veraltet | behoben | – |
| E23-9 | Größenangabe nicht dokumentiert | behoben (CHANGELOG, GEGNERGEDAECHTNIS) | – |
| E23-10 | „Die Bet gewinnt“ bei Raises | offen (Text, seit 2.1; Engine-Datei nach dem Einfrieren nicht geändert) | – |
| E23-11 | PAI-Test immer Exit 0 | behoben | – |
| E23-12 | Modus „nachher“: altes Urteil bleibt stehen | offen (seit 2.0, Projektvorgabe „Urteil bleibt bis zum nächsten“) | – |
| E23-13 | Sicherungsgröße für PAI | Hinweis an PAI | – |
| E23-14 | Kürzung lässt Aktion aus der Mitte weg | offen (nur bei über 300 Zeichen je Straße, mit der Gegner-KI höchstens 67; Engine nach dem Einfrieren nicht geändert) | – |

Nicht ausführbar: Test mit echtem Screenreader (NVDA, VoiceOver), Sprachausgabe mit deutscher Systemstimme, echte Mobilgeräte.
