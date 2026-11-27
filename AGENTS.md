# Hinweise für KI-Assistenten und Mitwirkende

Dieses Repository enthält den PokerTrainer 2.2: einen eigenständigen No-Limit-Hold'em-Trainer (6-max Cash Game, Spielgeld), der vollständig im Browser läuft und über GitHub Pages veröffentlicht wird.

## Grundsätze (nicht verhandelbar)

1. **Nur Spielgeld, keine Verbindung nach außen.** Keine Server, keine Tracker, keine externen Skripte/Schriften/CDNs, keine KI-API zur Laufzeit. Die CSP in `index.html` erlaubt nur eigene Dateien.
2. **Kein Hilfsprogramm für fremde Pokerplattformen.** Keine Overlays, Bildschirmauslesung, Eingabemasken für fremde Hände, keine Daten echter Spieler. Tipps nur für Hände, die der Trainer selbst austeilt.
3. **Fairness:** Bots und Coach sehen nie verdeckte Karten anderer Spieler. Entscheidungen erhalten nur `PT.bots.publicView(hand, seat)` (eigene Karten + öffentliche Informationen). Die Kartenverteilung hängt nur vom Seed und der Handnummer ab (`PT.session.streams`).
4. **Ehrliche Kennzeichnung:** Empfehlungen sind Modellschätzungen; im Tippfeld steht sichtbar „Faustregel, kein Solver-Ergebnis“ (Projektvorgabe). Nie als GTO-Solver bezeichnen.
5. **Oberfläche auf Deutsch**, Poker-Fachbegriffe englisch.
6. **Datenformate nur mit Migration ändern** (siehe `PT.stats.dbImport`, `migrateV1`, `PTUI.Store.findLegacy`), vorher Sicherung anbieten.

## Architektur in Kürze

- `assets/js/engine/` – reine Logik, kein DOM, globaler Namensraum `PT` (Browser, Web Worker, Node):
  `core` (Hilfen, Zufallsströme xoshiro128**, Karten, 169 Klassen, 1.326 Kombos) → `evaluator` (Handbewertung + Referenz) → `preflop-data` (Equity-Tabelle 169×169) → `rules` (Hand-Zustandsmaschine, Pots, Replay) → `ranges` (Charts, Range-Inferenz, Boardanalyse) → `equity` (Enumeration, Monte-Carlo, Side-Pot-Anteile) → `stats` (HUD-Werte, Datenbank, Import/Export) → `bots` (Gegner-KI, Pool) → `session` (Tisch, Rotation, Nachkauf, Wiederaufnahme) → `ev` (EV-Engine, Reaktionsmodelle) → `cfr` (River-Modellspiel CFR+) → `coach` (Analyse, Erklärung, Bewertung, Glossar) → `training` (Handhistorie, Lernprofil, Szenarien, Quiz, SRS) → `speech`.
- `assets/js/ui/` – `store` (IndexedDB/localStorage/Speicher, Migration), `app` (Controller, Tisch, Coach-Panel, Analyse im Web Worker, Mehrfach-Tab-Schutz, Service-Worker-Updates), `views` (alle weiteren Bereiche).
- Ablauf einer Entscheidung: `onHeroTurn` → `Analyzer.run('analyze', {view, opps, settings, seed})` (Worker) → Anzeige → `heroAct` → `gradeDecision` (ggf. Nachberechnung der gewählten Größe) → `PT.training.addDecision` → Hand-Datensatz.

## Arbeitsweise

```bash
node tools/build.js && node tests/run.js --quick   # vor jedem Commit
node tests/run.js                                  # vollständige Suite (~1 min)
node tests/long.js                                 # Langläufer (~10 min)
node tests/e2e.js                                  # Browser-Tests (Playwright + Chrome, lokaler Server)
```

- Versionsnummer: `PT.VERSION` in `core.js`, `?v=` in `index.html` und `worker.js`, `CHANGELOG.md`. `tools/build.js` bricht ab, wenn `index.html` nicht zur Version passt.
- Die Obergrenze von 5.000 Simulationen je Live-Entscheidung (Stufen Schnell/Standard) ist eine Projektvorgabe; Tests prüfen sie.
- Neue Fehler: reproduzierbaren Test in `tests/run.js` ergänzen.
- Projektstand und Lernprotokoll werden außerhalb des Repos im Claude-Projekt „Poker“ gepflegt (`PokerTrainer_Stand`).

## Hinweise aus der unabhängigen Prüfung (2.0.1)
- Preflop folgt der Coach dem Faustregel-Chart; Abweichungen nur bei belegtem Exploit (`coach.preflopAnchor`). Wer die EV-Annahmen ändert, muss `tests/run.js` „Regression Prüfer C“ grün halten.
- Importierte Daten sind nicht vertrauenswürdig: jede neue Ausgabe von Daten aus Sicherungen über `esc()`, jedes neue Feld in `validHand`/`validLearning` prüfen.
- Der automatische Tipp darf 5.000 Simulationen je Entscheidung nicht überschreiten (`input.live`).

## Hinweise ab 2.1 (Zweig ui-2.1)
- Start: Jeder neue asynchrone Startschritt braucht ein Zeitlimit (`withTimeout`) und einen Rückfall; `PTRecovery.ready()` erst, wenn der Trainer bedienbar ist. Lokale Daten nie ohne vorherige (Roh-)Sicherung löschen.
- Gespeicherte Hände nur über `PTUI.loadHands()` lesen (prüft mit `validHand`); neue Felder in Hand- oder Entscheidungsdatensätzen in `validHand` bzw. `validDecisionFields` (training.js) und in `docs/BENCHMARK_EXPORT.md` ergänzen.
- Barrierefreiheit: `node tests/e2e.js <URL> --nur=a11y` muss grün bleiben (axe-core aus `tests/package.json`, `npm ci --prefix tests`). Live-Ansagen nur über `announce()`.
- Vor dem Commit zusätzlich `node tools/check-version.js`; CI prüft außerdem `node tools/check-build.js`.
- Prüfung C/D 2.1 (`docs/audit-2.1/PRUEFUNG_C_D.md`): Bereiche mit Knöpfen nur über `setHtml`/`PTUI.h.keepFocus` neu zeichnen (Fokus bleibt erhalten); Tischlayout-Änderungen mit `node tests/e2e.js <URL> --nur=cd` prüfen (Überdeckungen 320–1366 px); Importgrenze nur über `PT.stats.MAX_IMPORT`.

## Hinweise zu Coach und Strategie (2.1)
- Das Reaktionsmodell postflop (exploitativ) ist ein an der Gegnerpopulation kalibriertes Schwellenmodell (`PT.ev.POP`, `popRespond`), gemittelt mit dem MDF-Modell. Wer Gegner-KI, Range-Schätzung oder Statistik ändert, muss neu kalibrieren: `node tests/strategy/sizing-study.js <Wurzel> <Seed> <Hände> bots base`, dann `node tests/strategy/fit-response.js base <Training> <Prüfung>` (siehe docs/STRATEGIE.md).
- Strategische Vergleiche nur über `tests/strategy/compare.js` (gepaarte Seeds, Block-Bootstrap, All-in-Bereinigung); Bericht mit `node tools/report-strategy.js`. Eine Verbesserung gilt erst als belegt, wenn das 95-%-Intervall der Differenz über 0 liegt.


## Hinweise aus der Prüfung B (2.1)
- Preflop-Anker: Jede Aktion (auch Fold) wird am Chartgewicht gemessen (`coach.chartWeight`); Ausnahme ist reiner Call/Fold gegen ein All-in.
- Exploit-Beleg (`coach.preflopAnchor`): Posterior der tatsächlich im Modell verwendeten Fold-Rate, skeptischer Prior an der Break-even-Schwelle, mindestens eine eigene Beobachtung.
- Gegner-KI: Calls hängen von Einsatzgröße und Stil ab. Nach jeder Änderung an `bots.js` Kalibrierung prüfen (`node tests/long.js calib`) und das Populationsmodell neu anpassen (siehe oben).
- Caches (`equity`, `ev.comboEquities`) nur für denselben Zufallsstrom und Umfang; `PT.equity.cacheClear()` leert beide. Analysen müssen unabhängig von der Reihenfolge der Modi bleiben (`tests/unit/strategie-pruefer-b.js`).

## Hinweise ab 2.2
- Range-Likelihoods und Reaktionstabelle sind an die Gegnergruppe E angepasst. Wer `bots.js`, `stats.js` oder die Zellen in `ranges.js` ändert, sammelt neu
  (`node tests/strategy/fit-likelihood.js <Seed> 300000 E <Datei>`), baut die Tabelle (`node tools/build-likelihood.js <Datei>`) und prüft auf V und T
  (`sh tools/messungen-2.2.sh`). Modellwahl nur auf V; T und die Strategien `FINAL` in `tests/strategy/strategies.js` nur für abschließende Tests.
- Push/Fold-Modellspiel neu lösen: `node tools/solve-pushfold.js --iter 6000 --write` (Exploitability ≤ 0,005 BB je Hand, Test in `tests/unit/strategie-22.js`).
- Vergleiche mit veränderter Gegner-KI immer zusätzlich in der Referenzumgebung (`env: 'ref'` im Plan, unveränderte Gegner-KI aus `sicherung-2.1.0`).
- Kriterien vor den Läufen festlegen (`docs/ABNAHMEKRITERIEN_2.2.md`), Berichte nur aus Rohdaten (`node tools/report-22.js`).
- Ereignisstrom für unabhängige Engines: `PT.events` (export.js). Der Kanal `pai` wird vom Trainer nie gefüllt.
- Bekannte Schwäche 2.2 (H4 in `docs/TESTBERICHT_2.2.md`): gegen unbekannte Strategien (Polarisierer, Fallensteller) schwächer als 2.1.0. Änderungen an
  Reaktionsmodell oder Range-Tabelle zusätzlich gegen `FINAL` prüfen, nicht nur gegen V und T.
