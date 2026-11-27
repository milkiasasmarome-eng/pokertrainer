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
| training | Handdatensätze, Entscheidungsdatensätze, strenge Prüfung, Lernprofil, Ziele, Spaced Repetition, Szenarien, Quiz, Textexport | `makeDecision`, `validHand`, `generate`, `profile`, `quiz` |
| export | Benchmark-Export je Entscheidung (Schema 1), Nachrechnung, Import einschließlich Rohsicherung | `PT.benchmark.build`, `validate`, `coachInput`, `PT.dataport.parseImport` |
| speech | Steuerung der Browser-Sprachausgabe | `Speech`, `toSpeech` |

Abhängigkeiten laufen nur in Ladereihenfolge (oben nach unten). Kein Modul greift auf DOM oder Netzwerk zu.

## Datenfluss einer Entscheidung

1. `session.startHand` erzeugt das Deck aus `stream(seed, 'deal', handNr)`; Bots nutzen `stream(seed, 'bots', handNr)`.
2. Ist der Held am Zug, baut `app.onHeroTurn` die öffentliche Sicht (`bots.publicView(hand, 0)`, enthält nur die eigenen Karten) und eine Momentaufnahme der Gegnerwerte. Der Coach erhält einen eigenen Seed aus Tisch-Seed, Handnummer und Aktionsindex.
3. Der Worker führt `coach.analyze` aus: Ranges beider Modi → gemeinsame Equity je Kombination → Equity, Unsicherheit → Kandidaten → EV je Aktion → Klassifikation → Texte. Obergrenze: 5.000 Simulationen (Schnell/Standard).
4. Nach der Aktion bewertet `coach.grade` die gewählte Aktion; ist die gewählte Größe nicht unter den Kandidaten, wird mit derselben Momentaufnahme und demselben Seed nachgerechnet.
5. Entscheidung → Entscheidungsdatensatz (`training.makeDecision`, inkl. Benchmark-Zusatzfeldern `x`), Lernprofil (`training.addDecision`), ggf. Wiederholungsstapel; Handende → Datenbank (`stats.dbApplyHand`, nur öffentliche Informationen), Handhistorie (`training.makeHandRecord`).

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

## Start und Wiederherstellung (seit 2.1)

Eine Aufnahme zeigte den Trainer dauerhaft bei „Lade …“. Ursache waren Startschritte ohne Zeitlimit: `indexedDB.open` für die
eigene Datenbank und für die Suche nach Daten aus Entwurf 2 (`onblocked` fehlte), Web Locks und das Lesen der Daten. Bekannt ist
z. B. ein WebKit-Fehler, bei dem `indexedDB.open` beim ersten Laden nie antwortet. Seit 2.1 gilt:

```
assets/js/recovery.js (erstes Skript, ohne Engine)        assets/js/ui/app.js boot()
  Skript-Ladefehler (Capture) ──▶ Fehleranzeige            Tab-Sperre          3 s  → Rückfall BroadcastChannel
  nach 4 s: „dauert länger als üblich“                     Store.init          6 s  → nur Arbeitsspeicher + Hinweis
  nach 20 s nicht bereit ──▶ Fehleranzeige                 Daten lesen         8 s  → Fehleranzeige (weiterspielen ohne Speicherung)
  PTRecovery.ready() ◀──────────────────────────────────── Migrationssuche     3–5 s → übersprungen
                                                           Prüfen, Wiederaufnahme (try/catch, Tisch-Kopie) → bereit
```

- **Fehleranzeige** (`role="alertdialog"`, Fokusfalle): „Neu laden“, „Weiter warten“ (bei Zeitüberschreitung), „Ohne gespeicherte
  Daten starten“ (`?start=sicher`) bzw. „Ohne Speicherung weiterspielen“, und zweistufig „1. Sicherung herunterladen“ →
  Bestätigung „Ich habe die Sicherungsdatei gespeichert“ → „2. Lokale Daten zurücksetzen“. Ohne erfolgreiche Sicherung ist
  Zurücksetzen nicht möglich.
- **Rohsicherung** (`PokerTrainer-Rohsicherung`, Version 1): alle Einträge aller Speicherbereiche und `pokertrainer*`-Schlüssel des
  localStorage unverändert (nicht endliche Zahlen als Text). Einlesen über „Sicherung importieren“: `PT.dataport.parseImport`
  übernimmt gültige Einträge (dieselben Prüfungen wie beim Laden), zählt und überspringt beschädigte.
- **Abgesicherter Start** `?start=sicher`: Speicher nur im Arbeitsspeicher, gespeicherte Daten werden weder gelesen noch verändert.
- **Speicherwahl:** IndexedDB; fehlt sie oder ist sie gesperrt (`InvalidStateError`, `SecurityError`, privater Modus) → localStorage
  mit Hinweis; antwortet sie nicht, ist sie blockiert oder fehlerhaft (`VersionError`, fehlende Speicherbereiche) → nur
  Arbeitsspeicher, damit keine zweite, abweichende Datenhaltung im localStorage entsteht.
- **Beschädigte lokale Daten** werden beim Start einzeln geprüft (Einstellungen mit Wertebereichen, Tisch, laufende Hand, eigene
  Werte, Gegner, Lerndaten mit Reparatur, Hände beim Anzeigen); Ungültiges wird übersprungen und im Hinweis genannt.
- **Mehrere Fenster** (Browser-Tab und installierte PWA teilen denselben Speicher): Der zweite ist schreibgeschützt (auch Import,
  Löschen, neue Session) und bietet „Hier weiterspielen“ an, sobald der schreibende geschlossen wurde (wartende Web-Lock-Anfrage).
- **Updates:** „Jetzt aktualisieren“ ist während einer Hand gesperrt; vor dem Neuladen werden alle offenen Schreibvorgänge
  abgeschlossen (`flushWrites`, auch die Speicherung der zuletzt beendeten Hand). Andere Tabs erhalten den Hinweis, neu zu laden.

## Datenprüfung und Sicherheit (seit 2.1)

- Alle Daten aus Dateien *und* aus dem lokalen Speicher gelten als nicht vertrauenswürdig. Handdatensätze werden vor jeder Anzeige,
  Sicherung und jedem Export mit `PT.training.validHand` geprüft (`PTUI.loadHands`); jedes Feld ist auf Typ und Wertebereich
  geprüft (endliche Zahlen, ganzzahlige Beträge, begrenzte Texte, bekannte Schlüssel). Textausgaben laufen über `esc()`.
- Importdateien werden im Web Worker geprüft (`PTUI.offThread('import', …)`); Dateien über der Importgrenze (`PT.stats.MAX_IMPORT`, 256 MB) werden vor dem Lesen abgelehnt. Die Grenze deckt jede vollständige Sicherung ab, die der Trainer selbst erzeugt (bis 3.000 Hände); eine Sicherung vor Import oder Löschen, die größer wäre, bricht den Vorgang ab, bevor etwas geändert wird.
  Gemessen: 23 MB Sicherung in 1,3 s, längste Blockade der Oberfläche 0,3 s.
- Vor jedem Import und vor „Alle Daten löschen“ wird eine Sicherung heruntergeladen; enthält der Speicher beschädigte Einträge,
  zusätzlich die Rohsicherung. Behoben: Der Import einer vollständigen Sicherung mit Lerndaten brach in 2.0.1 mit einem
  `ReferenceError` ab; die Markierung „Migration erledigt“ ging beim ersten Speichern verloren.
- Keine externen Verbindungen: CSP (`default-src 'self'`, keine Inline-Skripte; Einzeldatei `connect-src 'none'`), statische Prüfung
  des App-Codes auf Netzwerk-APIs (`tests/unit/daten-sicherheit.js`) und Netzwerkprotokoll aller Seiten in den Browsertests.

## Benchmark-Export (seit 2.1)

Je Entscheidung ein Datensatz mit getrennten Abschnitten `knownAtDecision` (Spielzustand zum Entscheidungszeitpunkt, `publicView`)
und `revealedLater` (spätere Informationen). Format, Felder, Datenschutz und Nachrechnung: [BENCHMARK_EXPORT.md](BENCHMARK_EXPORT.md).

## Tests und Veröffentlichung (seit 2.1)

| Prüfung | Werkzeug | im Workflow |
|---|---|---|
| Build zweimal, gleiche Ausgabe, eingecheckter Stand aktuell | `tools/check-build.js` | Pflicht |
| Website, Worker, sw.js, Offline-Datei, Manifest, CHANGELOG, README/Doku: gleiche Version | `tools/check-version.js` (auch in `tests/run.js`) | Pflicht |
| Schnelle Regressionstests | `node tests/run.js --quick` | Pflicht |
| Vollständige Suite mit mathematischen Referenztests | `node tests/run.js` | Pflicht |
| Browsertests (Grundfunktionen, Start/Wiederherstellung, Sicherheit/Daten, Barrierefreiheit, Netzwerk) | `node tests/e2e.js` mit Playwright/Chromium, axe-core aus `tests/package.json` | Pflicht |
| Browsertests Gegnergedächtnis (Migration auf Format 3 mit Sicherung) | `node tests/e2e-gedaechtnis.js` | Pflicht |
| Live-Smoke-Test nach der Veröffentlichung (Version im HTML, sw.js, Offline-Datei, Start im Browser; Wiederholung bis 10 min) | `node tests/smoke-live.js --browser` | nach dem Deployment |
| Langläufer | `node tests/long.js` | getrennt, `langlauf.yml` (manuell) |

Die Veröffentlichung (`deploy`) hängt von allen Pflichtjobs ab. Ergebnisdateien, Screenshots und Accessibility-Bäume werden als
Artefakte hochgeladen. Testwerkzeuge liegen nur in `tests/` (`npm ci --prefix tests`) und werden nicht veröffentlicht.

