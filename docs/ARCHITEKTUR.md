# Architektur

## Überblick

```
Browser (Hauptthread)                      Web Worker                      Speicher
┌──────────────────────────┐   postMessage  ┌──────────────────┐            ┌──────────────────────┐
│ ui/app.js  Controller    │ ─────────────▶ │ worker.js        │            │ IndexedDB pokertrainer2│
│  Tisch, Coach-Panel,     │ ◀───────────── │  PT.coach.analyze│            │  meta, opps, hands,   │
│  Ablauf, Tastatur        │                └──────────────────┘            │  learn, backup        │
│ ui/views.js  Ansichten   │                                                └──────────▲───────────┘
│ ui/store.js  Persistenz  │ ───────────────────────────────────────────────────────────┘
│ engine/*.js  (PT)        │   gleiche Engine im Hauptthread, im Worker und in Node (Tests)
└──────────────────────────┘
sw.js (Service Worker): versionierter Cache aller Dateien, Offline-Betrieb, Update nach Bestätigung
```

## Engine-Module (`assets/js/engine/`, Namensraum `PT`)

| Modul | Aufgabe | wichtige Funktionen |
|---|---|---|
| core | Hilfen, Formatierung, Zufallsströme (xoshiro128**, splitmix32), Karten, 169 Klassen, 1.326 Kombinationen, Rangfolge | `PT.rng.stream(seed, name, nr)`, `PT.hands.*` |
| evaluator | Handbewertung 5–7 Karten (Ganzzahl-Score), unabhängige Referenz | `PT.eval.evaluate`, `evalRef` |
| preflop-data | Equity-Tabelle Klasse gegen Klasse (169 × 169) | `PT.preflopData` |
| rules | Hand-Zustandsmaschine: Blinds, Legalität, Aktionen, Rückgabe, Pots, Rake, Invarianten, Replay | `PT.Hand`, `PT.rules.settle`, `replay` |
| ranges | Charts (Open, Verteidigung, 3-/4-Bet, Push/Fold), Range-Inferenz, Bayes-Aktualisierung, Draws, Boardanalyse, Handmerkmale | `chart`, `preflopRange`, `narrowPostflop`, `analyzeBoard` |
| equity | exakte Enumeration, Monte-Carlo, adaptive Stoppregel, Cache, Side-Pot-Anteile | `equity`, `exactHU`, `potShare` |
| stats | HUD-Werte je Gelegenheit, Datenbank, Gegnergedächtnis (Kurzzeit, Veränderungserkennung), Export/Import, Validierung, Migration | `handStats`, `dbApplyHand`, `dbImport`, `profile`, `effectiveStats` |
| bots | 100 Gegnerprofile, öffentliche Sicht, Entscheidungen | `publicView`, `decide` |
| session | Tisch, Button, Nachkauf, Rotation, Schwierigkeit, Ströme, Wiederaufnahme | `newTable`, `startHand`, `finishHand`, `resumeHand` |
| ev | Equity je Kombination, Reaktionsmodelle, EV je Aktion und Größe, Pot Odds | `comboEquities`, `respond`, `evaluateAction` |
| cfr | River-Modellspiel, CFR+, Exploitability | `solveMatrix`, `solveRiver` |
| coach | Analyse beider Strategiemodi, Klassifikation, Erklärungen, Bewertung, Fehlerkategorien, Glossar | `analyze`, `grade` |
| training | Handdatensätze, Lernprofil, Ziele, Spaced Repetition, Szenarien, Quiz, Textexport | `generate`, `profile`, `quiz` |
| speech | Steuerung der Browser-Sprachausgabe | `Speech`, `toSpeech` |

Abhängigkeiten laufen nur in Ladereihenfolge (oben nach unten). Kein Modul greift auf DOM oder Netzwerk zu.

## Datenfluss einer Entscheidung

1. `session.startHand` erzeugt das Deck aus `stream(seed, 'deal', handNr)`; Bots nutzen `stream(seed, 'bots', handNr)`.
2. Ist der Held am Zug, baut `app.onHeroTurn` die öffentliche Sicht (`bots.publicView(hand, 0)`, enthält nur die eigenen Karten) und eine Momentaufnahme der Gegnerwerte. Der Coach erhält einen eigenen Seed aus Tisch-Seed, Handnummer und Aktionsindex.
3. Der Worker führt `coach.analyze` aus: Ranges beider Modi → gemeinsame Equity je Kombination → Equity, Unsicherheit → Kandidaten → EV je Aktion → Klassifikation → Texte. Obergrenze: 5.000 Simulationen (Schnell/Standard).
4. Nach der Aktion bewertet `coach.grade` die gewählte Aktion; ist die gewählte Größe nicht unter den Kandidaten, wird mit derselben Momentaufnahme und demselben Seed nachgerechnet.
5. Entscheidung → Lernprofil (`training.addDecision`), ggf. Wiederholungsstapel; Handende → Datenbank (`stats.dbApplyHand`, nur öffentliche Informationen), Handhistorie (`training.makeHandRecord`).

## Persistenz

IndexedDB `pokertrainer2` (Version 1) mit den Stores `meta` (Tisch, Einstellungen, eigene Werte), `opps` (Gegner), `hands` (bis 3.000 Hände), `learn` (Lerndaten), `backup` (automatische Sicherungen). Rückfall: localStorage, sonst nur Arbeitsspeicher mit Hinweis. Während einer Hand wird nach jeder Aktion das Aktionsprotokoll gespeichert; nach einem Neuladen spielt `session.resumeHand` die Hand mit gleichem Seed exakt nach. Mehrere Tabs: Web Locks (`pokertrainer-tisch`), Rückfall BroadcastChannel; weitere Tabs sind schreibgeschützt.

Migration: Daten aus Entwurf 2 (`pokertrainer-v2` in IndexedDB oder `pokertrainer2.*` in localStorage desselben Ursprungs) werden erkannt, als Datei `Sicherung_PokerTrainer_JJJJ-MM-TT_Datenbank.json` gesichert und umgewandelt. Gegner-Datensätze im Format 2 (PokerTrainer 2.0.x) werden beim Start erkannt (`PT.stats.needsMigration`), unverändert als Datei `Sicherung_PokerTrainer_JJJJ-MM-TT_Datenbank.json` (Format 2) heruntergeladen und im Store `backup` abgelegt, erst danach ins Format 3 (Gegnergedächtnis) umgewandelt und gespeichert (`app.js: migrateStoredDb`). Import akzeptiert Version 1 (Entwurf 2), Version 2 und Version 3 sowie vollständige Sicherungen (Version 2 und 3). Details: [GEGNERGEDAECHTNIS.md](GEGNERGEDAECHTNIS.md).

## Website, PWA und Einzeldatei

- `index.html` lädt alle Module mit `?v=VERSION`. CSP erlaubt nur eigene Dateien.
- `sw.js` (erzeugt von `tools/build.js`): Cache `pokertrainer-VERSION`, Vorabladen aller Dateien, Cache-first, alte Caches werden beim Aktivieren gelöscht; neue Version wartet, bis der Nutzer „Jetzt aktualisieren“ wählt (zwischen zwei Händen).
- `dist/PokerTrainer_2.0.html`: dieselben Quellen inline; der Worker entsteht als Blob aus dem eingebetteten Engine-Code. CSP ohne Netzwerkzugriff.
- Pfade sind relativ, daher funktioniert alles im Unterverzeichnis `/pokertrainer/` von GitHub Pages.

## Veröffentlichung

Push auf `main` → GitHub Actions (`.github/workflows/pages.yml`): Build-Prüfung, Schnelltests → bei Erfolg Kopie der Website auf den Branch `gh-pages` → GitHub Pages veröffentlicht. Frühere Versionen: Historie von `main` (Wiederherstellung über `git revert`) und `gh-pages`.
