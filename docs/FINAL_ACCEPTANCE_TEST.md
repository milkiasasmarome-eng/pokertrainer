# Final Acceptance Test – PokerTrainer 2.3.1 (vorbereitet)

Kompakte Abnahme: Alles technisch Prüfbare läuft automatisch (Teil A). Von Hand bleibt nur, was ein Programm nicht beurteilen kann (Teil B, fünf
Bündel, zusammen etwa 30–40 Minuten). Antwort je Bündel: „passt“ oder Fehlerbeschreibung mit Nummer. Ein Fehler wird behoben, das Bündel wiederholt
und im Lernprotokoll vermerkt. Nach dem letzten bestandenen Bündel und dem Wort **„Freigabe“** folgt die Veröffentlichung (Teil C).

**Prüfgegenstand:** Offline-Datei `dist/PokerTrainer_2.3.html` aus dem Zweig `entwicklung-2.3` (Fußzeile **2.3.1**). Download:
`https://github.com/milkiasasmarome-eng/pokertrainer/raw/entwicklung-2.3/dist/PokerTrainer_2.3.html`, dann per Doppelklick öffnen.
Alternativ lokal: im Repository `python3 -m http.server 8767`, dann `http://127.0.0.1:8767/`. Die öffentliche Website zeigt bis zur Freigabe 2.1.0.
Der Final Acceptance Test zu 2.3.0 (Fall 1 offen) entfällt: 2.3.1 enthält 2.3.0 vollständig; der exploitative Modus entscheidet unverändert, nur der
experimentelle gleichgewichtsnahe Modus raist seltener (P4R, `docs/TESTBERICHT_2.3.1.md`).

## Teil A – automatisch geprüft (kein Handgriff nötig)

| Bereich (frühere Fälle) | Nachweis | Ergebnis 2.3.1 |
|---|---|---|
| Spielablauf, Beträge, Tipp-Modi, Tastatur, keine Hand ohne „Nächste Hand“, Tipp ≤ 2 s (1–6, 23, 28, 30) | `tests/e2e.js` Tests 2–3; `tests/run.js` | bestanden |
| Live-Anzeige, Gegnerdetails, alle Bereiche (3, 20) | `tests/e2e.js` Tests 4–5 | bestanden |
| Export/Import, beschädigte Datei, Sicherung vor Import, Neustart, Wiederaufnahme (9–11, 24) | `tests/e2e.js` 6, 11, 13, 31–35 | bestanden |
| Replayer, Benchmark-, Ereignisexport, Exportsperre (12, 13, 21, 22b) | `tests/e2e.js` 8; `tests/run.js` (Benchmark, Ereignisstrom, D23-1) | bestanden |
| Training, Quiz (14) | `tests/e2e.js` 9 | bestanden |
| Offline, PWA-Start, Einzeldatei, Update während einer Hand (15, 16, 31 lokal) | `tests/e2e.js` 14, 18, 30, 37 | bestanden |
| Ohne Sprachfunktion, zweiter Tab, abgesicherter Start (25–27) | `tests/e2e.js` 12, 15, 26, 28, 36 | bestanden |
| Barrierefreiheit (WCAG 2.2 AA, Tastatur, Fokus), Layout 320–1366 px | `tests/e2e.js` 16–17, 38–42, 49 | bestanden |
| Keine fremden Verbindungen, keine Skriptfehler | `tests/e2e.js` 51–52 | bestanden |
| Aufgedeckte Blätter mit Größe, Kürzung ohne Lücke, Raise-Text (22a, neu) | `tests/run.js` (C23-6, E23-14, E23-10) | bestanden |
| Push/Fold-Hinweis 15 BB (22) | `tests/run.js` (B23-10) | bestanden |
| PAI-Schnittstelle | `tests/pai-integration.mjs` 18/18 gegen PAI f4990fe; PAI-eigener Test 18 + 1 beschreibend | bestanden |

Befehle und Zahlen: `docs/TESTBERICHT_2.3.1.md`.

## Teil B – von Hand (nicht automatisierbar)

| Bündel | Du tust | Muss passieren |
|---|---|---|
| **B1 Spielgefühl und Coach** (10 min) | Offline-Datei öffnen, Fußzeile ansehen. 10–15 Hände spielen, dabei Fold, Check, Call, Bet und Raise (Betrag eintippen). Tipps lesen, einmal Strategie „Gleichgewichtsnah (experimentell)“ wählen. | Fußzeile 2.3.1. Tipps sind verständlich, passen zur Lage und tragen „Faustregel, kein Solver-Ergebnis“. Bei empfohlenem Raise ohne Value heißt es „Der Raise gewinnt …“. Nichts wirkt unplausibel oder widersprüchlich. |
| **B2 Sprache** (5 min) | Sprachausgabe einschalten, einige Entscheidungen; zweimal schnell hintereinander handeln. | Eine deutsche Systemstimme liest den Tipp verständlich vor (Zahlen, Prozente, Kartennamen). Nur der jüngste Tipp wird gesprochen. |
| **B3 Gedächtnis und Daten** (10 min) | Tempo „schnell“, 30 Hände. Einen Gegner mit Showdowns anklicken. Datenbank exportieren, Seite schließen, neu öffnen, exportierte Datei importieren. | Ein Gegner wechselt nach 30 Händen; im Dialog stehen Bets mit Größe („Bet 3,00 (0,5 Pot)“). Nach dem Neuöffnen ist alles da; der Import verlangt eine Bestätigung und ergibt denselben Stand. |
| **B4 Lernen** (10 min) | Fortschritt → „Neuen Vorher-Nachher-Test starten“, durchspielen; eine Trainingskategorie üben. | Test endet von selbst mit Hinweis; Fortschritt zeigt den Vorher-Wert und Fehlerfelder. Texte sind verständlich. |
| **B5 Smartphone** (5 min) | Offline-Datei auf dem eigenen Smartphone öffnen (oder lokale Adresse im WLAN), eine Hand spielen, Tipp lesen. | Alles lesbar und bedienbar ohne Querscrollen; Karten und Knöpfe groß genug. |

Danach: Wort **„Freigabe“** oder Fehlerliste. Lizenz und Anbieterkennzeichnung (`docs/RECHTLICHES.md`) sind vor einer Veröffentlichung zu entscheiden;
der Trainer erfindet keine Angaben.

## Teil C – Live-Nachprüfung nach „Freigabe“ (erst nach der Veröffentlichung möglich)

Veröffentlichung: Zweig `entwicklung-2.3` nach `main` (Pull Request #3); das CI testet und veröffentlicht nur von `main` und prüft die Live-Seite
automatisch (`tests/smoke-live.js`: Version 2.3.1 in HTML, Service Worker und Offline-Datei, Start im Browser, keine fremden Verbindungen).

| Nr. | Du tust | Muss passieren |
|---|---|---|
| C1 | Website mit vorhandenen Daten aus 2.1.0 öffnen (Browser oder installierte App) | Hinweis auf die neue Version; nach Bestätigung Neuladen; Gegnerwerte, Handhistorie, Lernfortschritt bleiben (Datenformat unverändert 3) |
| C2 | App installieren (Browser-Menü), Flugmodus, App öffnen | App startet ohne Internet, Fußzeile 2.3.1 |

**Rückweg bei Fehler:** Merge auf `main` mit `git revert` rückgängig machen; das CI veröffentlicht dann wieder den Stand von `sicherung-2.1.0`.
Daten bleiben erhalten (gleiches Format 3); eine eigene Exportdatei vor C1 genügt als Sicherung.
