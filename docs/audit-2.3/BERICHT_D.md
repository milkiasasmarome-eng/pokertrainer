# Prüfbericht D: Softwarequalität und Sicherheit – PokerTrainer 2.3.0 (Stand 9f09c0c)

Prüfer D, 2026-11-27. Klon `/home/claude/review23/D` (detached 9f09c0c), Vergleich mit `origin/sicherung-2.2.0`. Im Arbeitsstand wurde nichts korrigiert.
Proben liegen außerhalb des Klons in `/tmp/probeD/` (budget.js, fit.js, size.js, shown.js, d11.js, pw-export.js, pw-sandbox.js, pw-dist.js).
`tests/strategy/final23/` wurde nicht geöffnet.

## Ausgeführt

| Prüfung | Ergebnis |
|---|---|
| `node tests/run.js --quick` | 130 bestanden, 0 fehlgeschlagen |
| `node tests/e2e.js http://127.0.0.1:8781/ --nur=robust` | 19 bestanden, 0 fehlgeschlagen, keine fremden Anfragen |
| `node tools/check-version.js`, `node tools/check-build.js` | einheitlich 2.3.0; Build reproduzierbar (sw.js, dist identisch nach zweimaligem Bau) |
| `node --check` für alle Skripte (engine, ui, worker, recovery, sw.js) | ohne Fehler |
| Offline-Datei `dist/PokerTrainer_2.3.html` über file:// mit Netz aus (Chromium) | Start 0,9 s, Analyse im Web Worker (Blob), Tipp nach 178 ms, 2.000 von 5.000 Simulationen, keine CSP-Verletzung, 0 Netzanfragen, keine Konsolenfehler, `PT.ranges.ABL` = `{"hybrid":true}` |
| Export Benchmark/Ereignisse im Browser (Website, Einzeldatei, ohne Worker), 300/600/3.000 Hände | funktioniert in allen drei Wegen; Inhalt byteweise gleich dem alten Weg (`exportText`, `PT.events.text`); Messwerte siehe D23-1 bis D23-3 |
| Rechenzeit Tipp (`tests/perf-23.js 60`, nur 2.3) | 62 Entscheidungen, Median 37 ms, P95 127 ms, Maximum 412 ms |
| `hybridFit` mit 5 Gegnern × 10 aufgedeckten Blättern | kalt 132 ms, warm 1 ms |
| Neues Format der aufgedeckten Blätter (`Bet 4,50 (0,69 Pot)`), 400 Hände Session | alle 149 Bets mit Größenangabe gelesen, Aktionstext höchstens 33 Zeichen (Grenze 300) |

Unauffällig (ohne Befund): CSP in `index.html` unverändert, Offline-Datei mit `connect-src 'none'` und `worker-src blob:`; Service Worker nur Versions-/Hash-Änderung;
keine fremden Verbindungen; `PT.ranges.ABL` ist weder über Oberfläche, Einstellungen (`coachSettings` liefert nur mode/level/depth) noch über Import
(Datenbank, Sicherung, Rohsicherung) erreichbar, in Website und Einzeldatei gilt `{ hybrid: true }`; keine Prototypverschmutzung über Lerndaten
(`__proto__` scheitert an `for…in`-Schlüsselprüfung bzw. `TAG_RE` ohne Unterstrich; Sitzungsobjekte mit `__proto__` verändern `Object.prototype` nicht);
Tests D-6, A-15, D-11 und C-12 in `tests/unit/pruefung-23.js` unterscheiden zwischen altem und neuem Verhalten (D-11 gegen 2.2.0 nachgeprüft:
2.2.0 „Open 2,5 BB (All-in)“, 2.3 „All-in 2,00“).

## Befunde

### D23-1 – Mittel – Export: Knopfsperre geht beim Neuzeichnen verloren, parallele Exporte möglich (bestätigt)
- Datei: `assets/js/ui/views.js:93–100` (`x.disabled = true` auf das geklickte Element), `assets/js/ui/app.js:130–142` (`offThread`).
- Beschreibung: Gesperrt wird nur das DOM-Element des Klicks. Wechselt der Nutzer die Ansicht und kommt zurück, baut `views.analyse` die Knöpfe neu
  (aktiv); der laufende Auftrag entsperrt am Ende nur das alte, abgehängte Element. Der jeweils andere Exportknopf ist nie gesperrt. Jeder Klick startet
  einen eigenen Worker mit vollständiger Kopie aller Hände. Es gibt keine Abbruchmöglichkeit; bei hängendem Worker sieht der Nutzer nach 3,2 s (Toast)
  fünf Minuten lang keinen Hinweis, danach „Export nicht möglich: Zeitüberschreitung“ ohne Rückfall.
- Reproduktion: `node /tmp/probeD/pw-export.js 300 hangworker` (Worker ignoriert bench/events): nach `#gegner` → `#analyse` ist der Knopf wieder aktiv
  (`disabled:false`), zweiter Klick erzeugt den zweiten Export-Worker (`workers 1 → 2`).
- Vorschlag: Zustand je Exportart in einer Modulvariable (`hist.exporting`) halten und beim Rendern berücksichtigen; während des Exports
  dauerhafte Statuszeile mit „Abbrechen“ (Worker beenden) statt kurzem Toast.

### D23-2 – Mittel – Export großer Historien: Oberfläche blockiert weiterhin, sehr hoher Spitzenspeicher, harte Grenze der Stringlänge (bestätigt / Hochrechnung)
- Datei: `assets/js/engine/export.js:98–101` (`exportJob` liefert einen einzigen String), `assets/js/ui/views.js:96–98`, `assets/js/ui/app.js:45–53`.
- Beschreibung: Der Auftrag kopiert alle Hände per Structured Clone in den Worker und den fertigen Text (ein String) zurück; `download` erzeugt daraus
  zusätzlich einen Blob. Das Serialisieren beim Senden, das Deserialisieren des Ergebnisstrings und der Blob laufen im Hauptthread.
  Gemessen in Chromium (Website, Worker aktiv):
  300 Hände: Benchmark 29 MB, 2,0 s, längste Blockade der Oberfläche 351 ms;
  3.000 Hände (Höchstzahl der Historie): Benchmark 294 MB, 13,9 s, längste Blockade 2.529 ms, Heap des Hauptthreads +561 MB nach dem Export; Ereignisse 122 MB, 16,0 s, Blockade 2.142 ms.
  Ohne Worker (Rückfall) 600 Hände: Blockade 1,5 s. Die Aussage „die Oberfläche bleibt bedienbar“ (Kommentar D-2) gilt damit nur eingeschränkt.
  Hochrechnung: Benchmark-Text ≈ 29 KB je Entscheidung; V8-Grenze 536.870.888 Zeichen → ab etwa 18.000 Entscheidungen (rund 6 je Hand bei 3.000 Händen)
  scheitert `JSON.stringify` mit „Invalid string length“ (Meldung „Export nicht möglich …“). Spitzenspeicher über beide Isolates bei 3.000 Händen grob
  Hände (Haupt) + Kopie (Worker) + Exportobjekt + String (Worker) + String (Haupt) + Blob, deutlich über 1 GB (Vermutung, nicht gemessen; Risiko „Aw, Snap“ auf Geräten mit wenig Speicher).
- Reproduktion: `node /tmp/probeD/size.js` (Größen je Hand), `node /tmp/probeD/pw-export.js 3000 site`.
- Vorschlag: im Worker in Teilen serialisieren und einen `Blob` aus Teilstrings zurückgeben (Blob wird ohne Kopie des Inhalts übergeben);
  Hände im Worker direkt aus IndexedDB lesen statt sie zu senden; Benchmark ohne Einrückung (`null, 1` kostet Platz) oder als JSON Lines.

### D23-3 – Niedrig – Export meldet Erfolg, obwohl kein Download möglich war (bestätigt in Nachbildung)
- Datei: `assets/js/ui/app.js:45–53` (`download` gibt immer `true` zurück), `assets/js/ui/views.js:97–98` (Erfolgstoast unabhängig vom Ergebnis).
- Beschreibung: In einer Umgebung ohne Download-Recht (sandboxed iframe ohne `allow-downloads`, Claude-Vorschau ohne Fähigkeit „downloads“ bzw. wenn
  `claude.use('downloads')` scheitert) blockiert der Browser den Anker-Download still; der Trainer zeigt trotzdem „Benchmark-Export: n Entscheidungen …“.
  Nur wenn `claudeDl.save` existiert und scheitert, erscheint „Speichern nicht möglich“. Außerdem wird ein leerer Export (0 Hände) ohne Hinweis erzeugt.
- Reproduktion: `node /tmp/probeD/pw-sandbox.js`: Varianten „ohneClaude“ und „claudeOhneDownloads“ → 0 Downloads, Toast meldet Erfolg.
  (Die echte Claude-Vorschau wurde nicht geprüft; Vermutung, dass sie sich wie die Nachbildung verhält.)
- Vorschlag: In eingebetteten Kontexten ohne `S.claudeDl` (z. B. `window.top !== window`) Text zusätzlich zum Kopieren anbieten oder ehrlich
  „Download angestoßen – falls nichts erscheint, Website oder Offline-Datei nutzen“; bei 0 Händen Hinweis statt Datei.

### D23-4 – Mittel – Budget: eine Entscheidung kann automatisch bis zu 10.000 Simulationen kosten (bestätigt)
- Datei: `assets/js/ui/app.js:676–684` (`gradeDecision`), `assets/js/engine/coach.js:191–198`.
- Beschreibung: Je Aufruf von `analyze` mit `live: true` gilt die Grenze 5.000 korrekt. Wählt der Spieler eine Größe, die nicht unter den Kandidaten ist
  (Schieberegler, freier Betrag – der Normalfall), startet `gradeDecision` automatisch eine zweite vollständige Analyse mit eigenem Budget von 5.000.
  Im Modus „nachher“ ist diese Bewertung der Tipp. Gemessen (`node /tmp/probeD/budget.js`): Flop-Spot CO, Stufe Standard: Tipp 3.378 + Nachberechnung
  3.378 = 6.756 Simulationen für eine Entscheidung; obere Grenze 2 × 5.000. Ein Cache-Treffer senkt den Zähler nicht. Vom Spieler ausgelöst kommen
  hinzu: Tiefenanalyse (Präzise 20.000, Tief 60.000) und jeder Wechsel des Strategiemodus während des Zugs (`setSMode`, app.js:781–787) mit je 5.000,
  ohne Abbruch der vorherigen Analyse. Die Projektvorgabe lautet „höchstens 5.000 Durchläufe je Entscheidung“; Tests prüfen nur je Aufruf.
- Vorschlag: Budget je Entscheidung führen (`cur.simUsed`) und der Nachberechnung nur den Rest geben (oder nur die zusätzliche Größe gegen die
  vorhandenen Ranges/Equities bewerten); Test, der die Summe je Entscheidung über `onHeroTurn` + `gradeDecision` prüft. Bei `setSMode` laufende Analyse abbrechen.

### D23-5 – Mittel – Ausgelieferter Modellstand C ist nicht der gewählte/validierte; Dokumentation veraltet (bestätigt)
- Datei: `assets/js/engine/coach.js:97` (`FIT`), `coach.js` `fitOf`/`pairLL`/`buildRange` (A23-1, A23-2, B23-1 in 9f09c0c), `docs/STRATEGIEVARIANTEN_2.3.md:16`, `tests/results/strategy-sel23.json`, `strategy-tune23.json` (zuletzt in 5b1cc92).
- Beschreibung: Modellwahl und Abstimmung (sel23/tune23) liefen mit `llRef −0,463`, `llSd 0,546`, ohne Designeffekt, ohne getrennte Prüfung der
  aggressiven Aktionen, ohne Größenklassen in `pairLL` und ohne Massenskalierung. Commit 9f09c0c ändert all das (`llRef −0,5748`, `llSd 0,7404`,
  `llRefA/llSdA`, `deff 1,417`, `min(z, zA)`, Masse) – danach wurden weder Modellwahl noch Abstimmung wiederholt. Das Dokument nennt weiter die alten
  Werte, der Code-Kommentar „Schwellen auf Tr23 und Gegner-KI E abgestimmt, auf Va23/V gewählt“ gilt für die neue Funktion nicht. Auch `unit.json`
  (19:36 UTC) und `e2e.json` (19:43 UTC), auf die sich `docs/ERGEBNISSE_2.3.md` stützt, stammen von vor 9f09c0c (21:00 +0100). `tests/results/perf-23.json`
  fehlt; das Abnahmekriterium „P95 ≤ 1.000 ms, Maximum < 2 s“ ist für 2.3 nicht dokumentiert belegt (eigene kleine Messung oben: erfüllt).
- Vorschlag: In STRATEGIEVARIANTEN klar trennen „gewählt mit Fassung 5b1cc92, ausgeliefert 9f09c0c mit Änderungen …“; vor F23 mindestens V/Va23 für den
  ausgelieferten Stand wiederholen oder die Änderungen als nicht validiert kennzeichnen; volle Suite, e2e und perf-23 auf 9f09c0c neu laufen lassen.

### D23-6 – Niedrig – Regressionstest für D-2 fehlt, obwohl CHANGELOG „je ein Regressionstest“ behauptet; Kernfunktionen von Modell C ohne Unit-Test (bestätigt)
- Datei: `CHANGELOG.md:22–23`, `tests/unit/pruefung-23.js`.
- Beschreibung: Kein Test ruft `PT.benchmark.exportJob`, den Worker-Auftrag `bench`/`events`, `PTUI.offThread` oder den Rückfall auf (grep über `tests/`
  ohne final23). Der einzige Browsertest mit Benchmark-Knopf (`tests/e2e/robust.js:305`) prüft nur den Dateinamen. Ebenso gibt es keinen Unit-Test für
  `hybridFit`, `fitOf`, `pairLL`, `shownPairs` (Größenklassen, Text mit „(All-in) (x Pot)“, alte Einträge ohne Größe) und keinen Wächter, dass
  `PT.ranges.ABL` im Produktstand genau `{ hybrid: true }` ist. Der D-5-Test prüft nur 6 Plätze, wo der alte fest verdrahtete Wert 6 dasselbe Ergebnis hätte.
- Vorschlag: Unit-Test `exportJob` = `exportText`/`PT.events.text` (Inhalt und Zähler), e2e mit `INIT.noWorker` und mit Blob-Worker der Einzeldatei;
  Tests für `fitOf` an festen Paaren (w = 1 / 0 / linear), `shownPairs` an allen Textformen; `deepEqual(PT.ranges.ABL, {hybrid:true})` in run.js und gegen die Einzeldatei.

### D23-7 – Niedrig – Lerndaten: Prüfung und Reparatur nicht deckungsgleich; Reparatur ohne Rohsicherung bei „0 entfernt“ (bestätigt)
- Datei: `assets/js/engine/training.js:231` (validLearning prüft Sessions nur auf Anzahl), `:244` (repairLearning verlangt Objekte), `assets/js/ui/app.js:1136`.
- Beschreibung: (a) `validLearning` akzeptiert `sessions: [{t:1}, 7]` und sogar `['x'.repeat(1e6)]`; der Test „ungültige Session zählt“ (Teil 4 von C-7)
  prüft damit einen Weg, der allein durch eine ungültige Session nie erreicht wird. Der Kommentar „gleiche Grenzen wie validLearning“ stimmt bei den Typen nicht.
  `L.sessions` wird nirgends gelesen (das Profil berechnet eigene Sessions), Inhalt und Größe sind unbegrenzt bis zur Importgrenze.
  (b) Fehlen `decisions`/`srs`/`sessions` (undefined), liefert die Reparatur `removed = 0`; dann wird nichts in `skipped` eingetragen, `rawBackupFirst`
  läuft nicht, und beim nächsten Speichern ersetzt die reparierte Fassung den Rohstand. Dabei gehen unbekannte Felder oberster Ebene (z. B. aus einer
  neueren Version) ohne Rohsicherung verloren (`repairLearning({v:1,…,foo:{}})` → `foo` fehlt, `removed 0`).
- Reproduktion: Node-Probe im Bericht des Prüfers (Ausgaben: `sessions [{t:1},7] valid? null`, `missing decisions: … 0 foo kept? false`).
- Vorschlag: Sessions in beiden Funktionen gleich prüfen (Objekt, bekannte Felder, Zahlen) oder das Feld entfernen; in app.js die Rohsicherung an
  `bad.learn` knüpfen (nicht an `rep.removed`), oder in `repairLearning` fehlende Pflichtstrukturen und verworfene Felder oberster Ebene mitzählen.

### D23-8 – Hinweis – Gepooltes Vorwissen in `hybridFit` nach Paaren statt nach Gegnern gewichtet (Vermutung zur Auswirkung)
- Datei: `assets/js/engine/coach.js` `hybridFit` (Pool = Verkettung aller Paare).
- Beschreibung: Ein einzelner Gegner mit vielen Aktionen je Straße (oder eine importierte Datenbank mit langen Aktionstexten, bis 300 Zeichen je Straße
  erlaubt) bestimmt das Vorwissen `wPool` für alle Gegner am Tisch. Probe: ein Gegner mit 630 Paaren aus 10 Blättern setzt `w` auf 0. Kein
  Sicherheitsproblem (nur eigene Daten), aber das Modell ist für Fremdeinflüsse aus Importen empfindlich.
- Vorschlag: Pool je Gegner mitteln oder Paare je Blatt/Straße begrenzen.

## Antwort auf Prüffrage 4 (Kosten je Entscheidung)
Automatisch: Tipp ≤ 5.000 + Nachberechnung bei frei gewählter Größe ≤ 5.000 = **≤ 10.000 Simulationen** (gemessen bis 6.756). Exakte Enumeration
(`exactMax` 600.000 Auswertungen in Standard) zählt nicht als Simulation. Vom Spieler ausgelöst zusätzlich: Tiefenanalyse ≤ 20.000 bzw. ≤ 60.000 und je
Moduswechsel ≤ 5.000, ohne Obergrenze je Entscheidung. Zeitüberschreitung im Analyzer (9 s) rechnet alle offenen Aufträge im Hauptthread neu (vorbestehend).

## Nicht geprüft
Echte Claude-Vorschau (nur nachgebildet), Speicherverhalten auf schwachen Geräten (nur hochgerechnet), vollständige Suite `node tests/run.js` und alle
e2e-Teile außer „robust“, Strategiequalität (Aufgabe anderer Prüfer).
