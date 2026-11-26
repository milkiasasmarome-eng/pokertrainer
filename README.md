# PokerTrainer 2.0

**Live:** https://milkiasasmarome-eng.github.io/pokertrainer/

No-Limit-Hold'em-Trainer im Browser: 6-max Cash Game mit Spielgeld gegen 100 wiederkehrende Computergegner, Echtzeit-Coach mit Equity, Pot Odds und EV-Vergleich, Hand-Replayer, Range-Matrix, Gegnerdatenbank und persönlichem Lernfortschritt. Kostenlos, ohne Konto, ohne Server, läuft offline.

> Nur virtuelles Spielgeld. Kein Glücksspiel, keine Zahlungsfunktionen, keine Verbindung zu Pokerplattformen. Alle Empfehlungen sind Modellschätzungen, keine Solver-Ergebnisse.

## Nutzung

| Variante | So geht's |
|---|---|
| Website | Link oben öffnen. Funktioniert auf Desktop, Tablet und Smartphone. |
| App installieren | Im Browser „Installieren“ bzw. „Zum Home-Bildschirm“ wählen (PWA). Danach auch offline nutzbar. |
| Offline-Datei | [`dist/PokerTrainer_2.1.html`](dist/PokerTrainer_2.1.html) herunterladen und per Doppelklick öffnen – eine einzige Datei, keine Installation. |

Daten (Gegnerdatenbank, Handhistorie, Lernfortschritt) bleiben im jeweiligen Browser. Export, Import und Löschen unter **Einstellungen → Daten**. Siehe [PRIVACY.md](PRIVACY.md).

## Funktionen

- **Tisch:** Blinds 0,50/1 (einstellbar), Startstack 100 BB, automatischer Nachkauf, Gegnerwechsel alle 30 Hände, Main- und Side-Pot-Anzeige, Einsatz-Presets und Schieberegler, Tastatursteuerung.
- **Coach:** Modi „vorher“, „nachher“, „aus“; Strategiemodus *exploitativ* (nutzt beobachtete Gegnerwerte) oder *gleichgewichtsnah* (ausgewogenes Modell, River-Modellspiel mit CFR+); drei Erklärtiefen; Klassifikation von „mathematisch eindeutig“ bis „hohe Unsicherheit“; Bewertung in sieben Stufen (Optimal bis Schwerer Fehler); Sprachausgabe.
- **Gegner-KI:** 100 Persönlichkeiten in sechs Stilen mit individuellen Parametern, Können und begrenzter Anpassung an dein beobachtbares Spiel; Schwierigkeit über die Tischzusammensetzung (Anfänger, Fortgeschritten, Experte, gemischt).
- **Lernen:** Handhistorie mit Filter und Export, Replayer mit „damals bekannt / später bekannt“ und „Entscheidung erneut treffen“, Fehlerdatenbank, Kompetenzprofil, 14 Trainingskategorien, Spaced Repetition, Wissensquiz, Lernziele.
- **Analyse:** Range-Matrix 13 × 13 (Open, Verteidigung, 3-/4-Bet, Push/Fold, geschätzte Gegner-Range), Gegnerdatenbank mit 17 Werten, Stichprobengröße, Intervallen und geglätteten Werten.

## Projektstruktur

```
index.html                 Website (lädt Module aus assets/)
sw.js                      Service Worker (erzeugt von tools/build.js)
manifest.webmanifest       Web-App-Manifest
assets/css/app.css         Oberfläche
assets/js/engine/*.js      Spiel- und Trainingslogik (ohne DOM, auch in Node testbar)
assets/js/ui/*.js          Oberfläche: Persistenz (store), Controller (app), Ansichten (views)
assets/js/worker.js        Web Worker für Coach-Analysen
dist/PokerTrainer_2.1.html portable Einzeldatei (erzeugt von tools/build.js)
tests/                     Testsuite, Langläufer, Browser-Tests, Ergebnisse
tools/                     Build, Bilder, Preflop-Tabelle, Prüfprogramme
docs/                      Architektur, Methoden, Testbericht, Audit, Quellen
```

Website und Offline-Datei nutzen dieselben Quelldateien; `tools/build.js` setzt die Einzeldatei zusammen.

## Entwicklung

Voraussetzung: Node.js 22. Keine Abhängigkeiten.

```bash
node tools/build.js            # sw.js und dist/PokerTrainer_2.1.html erzeugen
node tests/run.js --quick      # schnelle Testsuite (läuft auch in GitHub Actions)
node tests/run.js              # vollständige Testsuite
node tests/long.js             # Langläufer: 7-Karten-Enumeration, 1.000.000 Hände, Kalibrierung, Coach-Vergleich
python3 -m http.server 8000    # lokal ansehen: http://localhost:8000/
```

Bei jeder Änderung: Version in `assets/js/engine/core.js` (`PT.VERSION`) und in den `?v=`-Parametern von `index.html` und `assets/js/worker.js` anheben, `node tools/build.js` ausführen, Tests laufen lassen, `CHANGELOG.md` ergänzen. Ein Push auf `main` startet Tests und Veröffentlichung (GitHub Actions → GitHub Pages).

Hinweise für KI-Assistenten und neue Mitwirkende: [AGENTS.md](AGENTS.md). Ausführlich: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md), [docs/METHODEN.md](docs/METHODEN.md), [docs/TESTBERICHT.md](docs/TESTBERICHT.md), [docs/AUDIT.md](docs/AUDIT.md), [docs/QUELLEN.md](docs/QUELLEN.md).

## Grenzen

Der Coach ist ein heuristisches, mathematisch begründetes Modell: Ranges aus Faustregeln und Bayes-Aktualisierung, EV mit Modellannahmen zu Reaktionen und späteren Straßen. Das River-Modellspiel ist ein vereinfachtes Gleichgewicht (eine bis zwei Größen, keine Raises, Stärkegruppen). Es ist **kein** vollständiger GTO-Solver. Details und alle bekannten Einschränkungen: [docs/TESTBERICHT.md](docs/TESTBERICHT.md).
