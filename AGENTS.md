# Hinweise für KI-Assistenten und Mitwirkende

Dieses Repository enthält den PokerTrainer 2.0: einen eigenständigen No-Limit-Hold'em-Trainer (6-max Cash Game, Spielgeld), der vollständig im Browser läuft und über GitHub Pages veröffentlicht wird.

## Grundsätze (nicht verhandelbar)

1. **Nur Spielgeld, keine Verbindung nach außen.** Keine Server, keine Tracker, keine externen Skripte/Schriften/CDNs, keine KI-API zur Laufzeit. Die CSP in `index.html` erlaubt nur eigene Dateien.
2. **Kein Hilfsprogramm für fremde Pokerplattformen.** Keine Overlays, Bildschirmauslesung, Eingabemasken für fremde Hände, keine Daten echter Spieler. Tipps nur für Hände, die der Trainer selbst austeilt.
3. **Fairness:** Bots und Coach sehen nie verdeckte Karten anderer Spieler. Entscheidungen erhalten nur `PT.bots.publicView(hand, seat)` (eigene Karten + öffentliche Informationen). Die Kartenverteilung hängt nur vom Seed und der Handnummer ab (`PT.session.streams`).
4. **Ehrliche Kennzeichnung:** Empfehlungen sind Modellschätzungen („Modellschätzung, kein Solver-Ergebnis“). Nie als GTO-Solver bezeichnen.
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
