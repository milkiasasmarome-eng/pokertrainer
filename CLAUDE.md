# CLAUDE.md – PokerTrainer

Kompakte Arbeitsanweisung für Claude Code. Verbindlich zusätzlich: [AGENTS.md](AGENTS.md) (Grundsätze, Architektur, Hinweise je Version).
Laufende Aufgaben und nächster Schritt: [docs/UEBERGABE.md](docs/UEBERGABE.md). Projektstand und Lernprotokoll: [docs/PROJEKTSTAND.md](docs/PROJEKTSTAND.md),
[docs/LERNPROTOKOLL.md](docs/LERNPROTOKOLL.md) – vor größeren Änderungen lesen, nach wesentlichen Schritten ergänzen.

## Ziel und Umfang
No-Limit-Hold'em-Trainer (6-max Cash Game, nur Spielgeld) im Browser: Computergegner mit Gedächtnis, Equity/EV, exploitativer Coach,
experimenteller gleichgewichtsnaher Modus, Lernsystem, Import/Export, PWA, Offline-Einzeldatei, GitHub Pages.
**Nie:** Echtgeld, fremde Pokerplattformen (Overlays, Fremdhände, echte Spieler), Server/Tracker/CDN/KI-API zur Laufzeit, Solver-/GTO-Behauptungen,
Einsicht des Coaches in verdeckte oder künftige Karten. Live-Tipp ≤ 5.000 Simulationen und ≤ 2 s, nur der jüngste Tipp wird gesprochen,
keine neue Hand ohne Nutzeraktion, Hinweis „Faustregel, kein Solver-Ergebnis“ im Tippfeld.

## Verzeichnisse
`assets/js/engine/` reine Logik (Namensraum `PT`, Ladereihenfolge in AGENTS.md) · `assets/js/ui/` Oberfläche · `tests/` (`run.js` Einheit,
`e2e*.js` Browser, `long.js` Langläufer, `strategy/` Vergleiche, `results/` Rohdaten) · `tools/` Build, Berichte · `docs/` Berichte, Kriterien, Audits ·
`dist/` Offline-Datei (erzeugt) · `archiv/` gesicherte Freigaben.

## Befehle
```bash
node tools/build.js && node tests/run.js --quick && node tools/check-version.js   # vor jedem Commit (~1 min)
node tools/check-build.js                                                         # Build reproduzierbar (CI)
python3 -m http.server 8767 --bind 127.0.0.1 &   # lokale Testanwendung: http://127.0.0.1:8767/
npm ci --prefix tests && CHROME= node tests/e2e.js http://127.0.0.1:8767/        # Browsertests (~6 min)
PT_PAI_ROOT=<Klon von milkiasasmarome-eng/assist> node tests/pai-integration.mjs  # PAI-Schnittstelle
node tests/strategy/compare.js --plan <Plan> --jobs 3                              # Strategievergleich (Referenz-Arbeitsbäume siehe unten)
```
Referenz-Arbeitsbäume neben dem Repository: `git worktree add ../wt-v201 origin/sicherung-2.0.1` (ebenso `wt-v210` ← `sicherung-2.1.0`, `wt-v220` ← `sicherung-2.2.0`).
Langläufer (`node tests/long.js`, 1 Mio. Hände) und volle Mathe-Referenz nur, wenn Regeln, Handbewertung, Equity oder Gegner-KI geändert wurden.

## Entwicklungsregeln
- Kein Neubau. Ablauf: Fehler belegen → kleinsten Reproduktionstest schreiben → Ursache → gezielte Korrektur → schneller Vergleich →
  unabhängige Prüfung → große Läufe nur mit eingefrorenem Stand. Höchstens fünf Versuche je Ansatz, höchstens fünf Korrekturzyklen je Runde.
- Jeder bestätigte Fehler bekommt einen Regressionstest in `tests/unit/` (jeder Schutztest mit Negativtest).
- Kommentare in Codezeilen nur als `/* */` oder am Zeilenende; Syntaxtest läuft in `tests/run.js`.
- Datenformate nur mit Migration und vorheriger Sicherung ändern (Format derzeit 3). Importierte Daten sind nicht vertrauenswürdig (`esc()`, `validHand`).
- Versionsnummer an allen Stellen (`tools/check-version.js`); Tests leiten Versionen aus `PT.VERSION` ab.
- Varianten nur über Schalter `PT.ranges.ABL` in Vergleichsläufen; Produktstand sichert der Test „Wächter“.

## Mathematik und Strategie
- Referenzwerte selbst nachrechnen (Brute Force), nie aus dem Gedächtnis. Häufigkeits- und Einzelprüfung getrennt benennen.
- Strategische Aussagen nur aus `tests/strategy/compare.js` (gepaarte Seeds, Block-Bootstrap 500 Hände, All-in-Bereinigung, ≥ 20 Blöcke).
  „Belegt besser“ nur, wenn das 95-%-Intervall der Differenz über 0 liegt; fehlende Signifikanz ist keine Gleichwertigkeit.
- Kriterien, Seeds, Teststärke, Rechenzeit und Abbruch **vor** den Läufen in `docs/ABNAHMEKRITERIEN_<Version>.md` festlegen.
- Gegnergruppen trennen: Abstimmung nur auf Training/E, Wahl auf Validierung/V, abschließende Nachweise nur auf unberührten Gruppen.
  Ausgewertete Gruppen (F23, Va23, Regressionsset, Seeds bisheriger Pläne) gelten danach nur noch als Entwicklungs-/Regressionsdaten.
- Während laufender Vergleiche keine Engine-Datei ändern (die Worker laden die Dateien je Lauf neu). Läufe speichern je Lauf zwischen (Wiederaufnahme).
- Berichte nur aus Rohdaten erzeugen (`tools/report-*.js`), nie von Hand zusammenfassen.

## Git und Freigabe
- Entwicklung auf `entwicklung-2.3` (fortgeführt für 2.4; Pull Request #3 nur für das CI). Kleine Commits, keine Force-Pushes, keine fremden Zweige.
- Referenzen unverändert lassen: `sicherung-2.0.1`, `sicherung-2.1.0` (= öffentlich), `sicherung-2.2.0`; 2.3.0 = Commit `601df61`.
- **Kein Merge nach `main`, keine Änderung an `gh-pages` oder der öffentlichen Seite ohne ausdrückliche „Freigabe“.** Das CI veröffentlicht nur von `main`.
- Final Acceptance Test: `docs/FINAL_ACCEPTANCE_TEST.md` (gebündelte Fälle, Live-Nachprüfung getrennt). Lizenz und Anbieterkennzeichnung entscheidet der Auftraggeber.
- PAI (`milkiasasmarome-eng/assist`) nur lesen; nötige Änderungen dort nur in `docs/PAI_AENDERUNGSAUFTRAG.md` beschreiben.

## Datenschutz, Kosten, Schleifenschutz
- Keine Zugangsdaten, persönlichen Daten oder privaten Trainingsdaten ins Repository. Keine kostenpflichtigen Dienste oder APIs.
- Höchstens zwei KI-Prüfagenten gleichzeitig; klassische Testskripte bevorzugen. Kurze Berichte, Details in Dateien.
- Vor großen Läufen Laufzeit schätzen (Coach-Lauf 2.500 Hände ≈ 55 s je Prozess). Bei Ressourcengrenzen Stand committen und nächsten Schritt in `docs/UEBERGABE.md` notieren.
