# Prüfagent C – PokerTrainer 2.2 (Gegnergedächtnis, Lernsystem, Datenbank, Ereignisstrom)

Stand: Zweig `entwicklung-2.2`, Commit `7a2413a`. Geprüft in der Kopie `/home/claude/review22/C/repo` (Repository unverändert).
Skripte: `/home/claude/review22/C/skripte/` (Aufruf jeweils `node <Skript>` aus diesem Ordner; jede Rechnung < 3 min, ein Prozess, kein Browser).

## Übersicht

| Befund | Schwere | Kurz |
|---|---|---|
| C-1 | schwer | Vorher-Nachher-Test: rund 20 % der Standardtests (neuer Nutzer) können nie abgeschlossen werden, weil `generate()` für einen festen Seed `null` liefert |
| C-2 | schwer | Vorher-Nachher-Test läuft im Standard-Tippmodus „vorher“: die Empfehlung wird vor jeder Testentscheidung angezeigt und gesprochen |
| C-3 | mittel | Bewertung wird der falschen Testsituation zugeordnet (oder verworfen), wenn „Nächste Situation“ vor dem Ende der asynchronen Bewertung gewählt wird |
| C-4 | mittel | Ereignisstrom (`PT.events`): `handRecord` enthält Tisch-Seed und Handnummer → verdeckte Karten aller Gegner (auch künftiger Hände) rekonstruierbar; außerdem Zeitstempel und Sitzungskennung in `id`/`session` |
| C-5 | mittel | `PT.events.validate` ist leicht umgehbar und wirft bei unvollständigen Dateien Ausnahmen statt einer Meldung |
| C-6 | gering | `validPP` prüft keine Schlüssel: beliebige Zusatzfelder (auch 1 MB Text, HTML, `__proto__`), doppelte IDs, leere Phasen, widersprüchlicher Zustand werden angenommen |
| C-7 | gering | `repairLearning`: ungültiges `pp` (kein Array) wird still verworfen (removed = 0 → keine Meldung, keine Rohsicherung); zugleich werden gültige SRS-Einträge > 300 still gekürzt |
| C-8 | gering | Neuer Vorher-Nachher-Test wird angelegt und gespeichert, auch wenn `startTraining` wegen laufender Hand abbricht (verwaiste Tests verdrängen ältere aus der Anzeige) |
| C-9 | gering | Hypothesen: Normalnäherung → Fehlerrate „gestützt“ unter H0 6–7 % statt ≤ 5 %; „Vermutung“ erscheint bei 10–40 Gelegenheiten fast immer (74–99 % unter H0) |
| C-10 | gering | Verbesserungstabelle: 14 Einzeltests ohne Mehrfachkorrektur → unter H0 in 45 % der Fälle mindestens eine farbige Zeile |
| C-11 | gering | Kategorie/Spot „constructor“ aus importierten Lerndaten wird als `function Object() { [native code] }` angezeigt (`AREAS`, `SPOTS`, `MISTAKES` sind normale Objekte) |
| C-12 | gering | Migrierte Format-1-Datensätze: `agg` = 0 → Coach behandelt Gegner mit z. B. 2.000 Händen als „ohne Daten“ (volle Unsicherheit) |
| C-13 | gering | Dokumentation/Kommentare veraltet oder falsch (t-Quantil „Fehler < 0,01 ab df = 2“, LERNSYSTEM „erste 10 gegen letzte 10 ab 20“, HYP-Kommentar Wilson, PAI-Doku „ohne Zeitstempel“) |

---

## C-1 (schwer) Vorher-Nachher-Test bleibt dauerhaft unvollständig, wenn eine feste Testsituation nicht erzeugt werden kann

- **Datei/Zeile:** `assets/js/engine/training.js` 337–347 (`prePostNew`, feste Seeds), 464–495 (`generate`, höchstens 240 Versuche, sonst `null`);
  `assets/js/ui/app.js` 534–541 (`nextHand`: `item = tr.queue.shift()` vor `generate`; bei `null` nur Meldung und `return`).
- **Beschreibung:** Die Seeds eines Tests stehen fest (`hashStr(id|cat|phase|i)`), `generate` ist für einen Seed deterministisch. Liefert es `null`,
  ist der Eintrag schon aus der Warteschlange entfernt; sein `s` bleibt `null`. „Vorher-Test fortsetzen“ bzw. „Nachher-Test starten“ stellt denselben
  Seed erneut an → wieder `null`. Die Phase wird nie vollständig: Zustand bleibt `pre` (kein Training/Nachher-Test möglich) bzw. kommt nie auf `fertig`;
  `prePostResult` liefert nie ein Urteil. Zusätzlich meldet die Oberfläche nach dem letzten Eintrag „Testphase abgeschlossen“, obwohl ein Eintrag fehlt.
- **Messung:** `node pp2-generate.js 400` → `river-call` liefert für 1,5 % der Seeds keine Situation, `value-bet` für 0,7 %.
  `node pp3-stuck.js 150` → **30 von 150 (20 %)** Standardtests eines neuen Nutzers (Kategorien `cbet, river-call, blind-defense` – bei wenig Daten
  immer diese) enthalten mindestens einen nicht erzeugbaren Seed; Wiederholung mit demselben Seed liefert wieder `null`.
  Beispiel: `now = 1764200000000`, Eintrag `pp:pp4200000000:post:6`, `river-call`, Seed 3774358808.
- **Erwartet:** Jeder angelegte Test ist abschließbar. **Tatsächlich:** jeder fünfte nicht.
- **Vorschlag:** In `prePostNew` jeden Seed sofort mit `generate` prüfen und bei `null` deterministisch weiterzählen (`…|i|2`, `…|i|3`), oder in
  `nextHand` bei `null` den Eintrag mit Ersatz-Seed neu anlegen und speichern. Zusätzlich Test: alle Seeds eines neuen Tests erzeugbar
  (Regressionstest in `tests/unit/strategie-22.js` mit z. B. 200 `now`-Werten). Optional „Test abbrechen“-Knopf für alte Tests.

## C-2 (schwer) Vorher-Nachher-Test zeigt die Empfehlung vor der Entscheidung (Tippmodus „vorher“, Standard)

- **Datei/Zeile:** `assets/js/ui/app.js` 786–793 (`startTraining` setzt nur `test`), 615–635 (`onHeroTurn`: Tipp und Sprachausgabe im Modus „vorher“),
  456–480 (`renderTip` kennt keinen Testmodus).
- **Beschreibung:** Während der Testsituationen gelten die normalen Tippeinstellungen. Im Standardmodus „vorher“ erscheint und erklingt die
  Empfehlung, bevor der Spieler handelt (auch Kurzfassung über den Knöpfen und „Tiefenanalyse“). Die gemessene „Entscheidungsqualität“ ist dann
  im Wesentlichen das Befolgen des Tipps; Vorher- und Nachher-Werte liegen nahe 100, die Differenz sagt nichts aus. Im Modus „nachher“ bekommt der
  Spieler nach jeder Vorher-Situation das Urteil mit Empfehlung (Lernen innerhalb der Vorher-Messung). Tippmodus, Analysemodus (`smode`) und Stufe
  werden im Test nicht gespeichert, Vorher und Nachher können also unter verschiedenen Bedingungen laufen.
- **Reproduktion:** Codepfad (kein Browsertest erlaubt): `S.training.test` wird außer in `nextHand` (Test-Ende) nirgends gelesen;
  `grep -n "\.test\b" assets/js/ui/app.js`.
- **Erwartet:** Testsituationen ohne Tipp und ohne Urteil bis zum Ende der Phase, gleiche Coach-Einstellungen in beiden Phasen.
- **Vorschlag:** Bei `S.training.test` Tipps und Urteil unterdrücken (effektiver Modus „aus“, Sprachausgabe aus, Tiefenanalyse gesperrt), Ergebnis erst am
  Ende der Phase zeigen; `smode`/`level` beim Anlegen im Test speichern und bei der Bewertung erzwingen; Hinweis in der Trainingsleiste.

## C-3 (mittel) Bewertung landet bei der falschen Testsituation

- **Datei/Zeile:** `assets/js/ui/app.js` 535 (`tr.review = item.key` beim Start jeder Situation), 685–688 (`gradeDecision` liest
  `S.training.review` erst nach Auflösung der Analyse-/Nachberechnungs-Promise), 527–531 (`nextHand` wartet nicht auf `S.pendingGrades`).
- **Beschreibung:** Handelt der Spieler, bevor die Analyse fertig ist (Modus „nachher“/„aus“ oder schneller Klick), oder wählt er eine Einsatzgröße
  außerhalb der Kandidaten (zweite Analyse bis 1,4 s), endet die Hand oft sofort (Fold). Ein Klick auf „Nächste Situation“ setzt `tr.review` auf die
  nächste Situation, bevor die alte Bewertung eingetragen ist: Die Bewertung wird der nächsten Situation zugeschrieben (deren eigene Bewertung
  überschreibt sie später), die alte Situation bleibt offen. Bei der letzten Situation ist `S.training` danach `null` → Bewertung verworfen.
  Gleiches gilt für Wiederholungen (`srsReview`).
- **Reproduktion:** `node pp4-race.js` (Nachbildung der Reihenfolge mit den echten Funktionen) → `pre[0].s = null, pre[1].s = 17`
  (erwartet `pre[0] = 17, pre[1] = null`).
- **Vorschlag:** Schlüssel beim Zug festhalten (`S.cur.review = S.training.review` in `onHeroTurn`) und in `gradeDecision` `cur.review` verwenden;
  `prePostRecord` unabhängig von `S.training` aufrufen; optional `nextHand` erst nach `Promise.all(S.pendingGrades)`.

## C-4 (mittel) Ereignisstrom gibt über `handRecord` Seeds, Zeitstempel und Sitzungskennung weiter

- **Datei/Zeile:** `assets/js/engine/export.js` 215–219 (`x.handRecord = strip(h)`; `strip` entfernt nur Schlüssel `ts`, `lastSeen`, `firstSeen`),
  `training.js` 11 (`id: 'h' + session + '-' + no + '-' + ts`), `app.js` 15 (`sessionId: Date.now()`), `session.js` 84–93 (Deck = `stream(seed,'deal',no)`).
- **Beschreibung:** (a) `handRecord.seed` + `handRecord.no` reichen, um das Deck jeder Hand am selben Tisch nachzubauen: verdeckte Karten aller Gegner
  in dieser Hand (auch ohne Showdown) **und in künftigen Händen**. Der Strom behauptet „Keine verdeckten Karten anderer Spieler“ und soll unabhängige
  Engines (PAI) vergleichen; eine Engine, die die Datei liest, hat diesen Kanal (auch für die Entscheidungen derselben Datei). (b) `handRecord.id` enthält
  den Zeitstempel der Hand, `handRecord.session` die Startzeit der Sitzung (ms) – entgegen `docs/PAI_INTEGRATION.md` („ohne Zeitstempel“) und dem
  Grundsatz des Benchmark-Exports (nicht sprechende IDs, keine Sitzungskennungen). (c) Hinweis: Coach-Empfehlung steht im selben Ereignis und
  zusätzlich in `handRecord.decisions` (`rec`, `evs`, `x.alt`); die „Trennung der Kanäle“ ist nur Konvention.
- **Reproduktion:** `node ev2-seed.js` → „Hände 40, alle Karten rekonstruiert 40, davon nie aufgedeckte Gegnerblätter 175“, nächste Hand vorhersagbar;
  „id/session im handRecord: h1700000000000-1-1700000000000 1700000000000“.
- **Vorschlag:** In `handRecord` `seed`, `tseed`, `session` entfernen und `id` durch `handId(h)` ersetzen (PAI-Adapter braucht sie nicht für das
  Handformat); Seeds nur im ausdrücklich gekennzeichneten Benchmark-Abschnitt `deal`, mit Hinweis, dass sie alle Karten offenlegen. Doku anpassen.

## C-5 (mittel) `PT.events.validate` umgehbar, Ausnahmen bei unvollständigen Dateien

- **Datei/Zeile:** `assets/js/engine/export.js` 226–242.
- **Beschreibung:** Geprüft werden nur `publicView.players[].cards`, Länge von `observed.actions` und `observed.board`, Kanalnamen und die Teilzeichenketten
  `"style"`/`"P"`. Nicht erkannt: Gegnerkarten in `observed.stacks[]` oder unter anderem Schlüssel (`hole`), spätere Boardkarten/Aktionen in
  `observed.publicView` (nur `observed.board`/`observed.actions` werden gezählt, nicht verglichen), interne Parameter unter anderem Namen, gefüllter
  `pai`-Kanal, jedes Ereignis mit `complete: false`. `payload: [null]`, fehlendes `events` oder fehlendes `publicView` führen zu `TypeError`.
  Fehlalarm: jeder Textwert `"P"` im Zustand gilt als „interne Gegnerparameter“. Die Gegner-ID (`g001` …) bestimmt den Stil über die offene Tabelle
  in `bots.js` (fester Seed 20261126) – die Prüfung auf „interne Parameter“ ist daher ohnehin nur eine Formalprüfung.
- **Reproduktion:** `node ev3-validate.js` (12 Fälle; 8 manipulierte Dateien werden angenommen, 3 werfen Ausnahmen).
- **Vorschlag:** Positivliste der Schlüssel für `observed` und `publicView` (wie `validView`), `observed.publicView.board/actions` gegen `observed.board/actions`
  vergleichen, `complete:false` nur mit `observed: null` zulassen, `pai` muss beim Export `null` sein, Typprüfungen vor dem Zugriff (try/catch → Meldung).

## C-6 (gering) `validPP` ohne Schlüssel- und Konsistenzprüfung

- **Datei/Zeile:** `training.js` 367–372.
- **Beschreibung:** Anders als `validDecision`/`validHand` keine Positivliste: Zusatzfelder in Test und Einträgen werden angenommen und dauerhaft
  gespeichert/weitergegeben (1 MB Text, HTML-Text, `__proto__`-Schlüssel). Außerdem angenommen: Eintrags-Kategorie nicht in `cats`, leere Phasen
  (`complete` = true ohne Daten, Test nie fortsetzbar), doppelte Test-IDs (Knöpfe und `prePostRecord` finden immer den ersten), `state: 'fertig'` mit
  offenen Einträgen (kein Knopf mehr, Test tot), `ts` außerhalb des Datumsbereichs („Invalid Date“). Angezeigt wird nichts davon ungeschützt (alle
  Ausgaben laufen über `esc()` bzw. sind berechnete Zahlen) – kein XSS gefunden.
- **Reproduktion:** `node pp5-import.js` Abschnitt 3 (alle genannten Fälle „angenommen“; `cats: ['constructor']` und `pp: {}` korrekt abgelehnt).
- **Vorschlag:** Positivlisten `['id','ts','state','cats','pre','post']` und `['cat','seed','s','l']`, `num(ts, 0, 8.64e15)`, `it.cat ∈ cats`,
  Phasen nicht leer und gleich lang, eindeutige IDs in `validLearning`, Zustand aus den Einträgen ableiten statt speichern.

## C-7 (gering) `repairLearning` verwirft still

- **Datei/Zeile:** `training.js` 238–248; `app.js` 1113–1122.
- **Beschreibung:** Ist `L.pp` kein Array, wird es ohne `removed++` verworfen → keine Meldung „Lerneinträge übersprungen“ und, weil `skipped` leer bleibt,
  **keine Rohsicherung** der Originaldaten (`rawBackupFirst(skipped.length ? bad : null)`). Unabhängig von 2.2, aber über `pp` neu auslösbar:
  Sobald irgendein Teil ungültig ist, kürzt die Reparatur gültige SRS-Einträge von bis zu 1.000 (erlaubt in `validLearning`) still auf 300 und
  verwirft `sessions`.
- **Reproduktion:** `node pp5-import.js` Abschnitt 4 (`removed 0`, `pp danach undefined`) und 5 (`srs vorher 400 nachher 300`, `removed 1`).
- **Vorschlag:** jede verworfene Struktur zählen; gleiche Grenzen in Prüfung und Reparatur (300 oder 1.000).

## C-8 (gering) Verwaiste Vorher-Nachher-Tests

- **Datei/Zeile:** `views.js` 492 (`prePostNew` + `persistLearning` vor `startTraining`), `app.js` 787 (`startTraining` bricht bei laufender Hand ab).
- **Beschreibung:** Läuft am Tisch eine Hand (häufig, wenn man mitten in der Hand zu „Fortschritt“ wechselt), wird bei jedem Klick auf „Neuen
  Vorher-Nachher-Test starten“ ein Test angelegt und gespeichert, das Training startet aber nicht. Die Ansicht zeigt nur die letzten drei Tests;
  ein begonnener echter Test verschwindet nach drei solchen Klicks aus der Anzeige (Daten bleiben, sind aber nicht mehr fortsetzbar). Ab 30 Tests
  werden die ältesten gelöscht.
- **Vorschlag:** Zuerst prüfen, ob gestartet werden kann (`S.hand && !S.hand.done`), erst dann anlegen; offene Tests immer anzeigen.

## C-9 (gering) Hypothesen: Fehlerrate und „Vermutung“

- **Datei/Zeile:** `training.js` 384–396.
- **Beschreibung:** z-Test mit Normalnäherung ab 10 Gelegenheiten. Unter H0 (alle Werte exakt am Populationsmittel `LIK.ref`, binomial) liegt die
  Wahrscheinlichkeit für mindestens eine „gestützte“ Hypothese bei 7,4 % (n=10), 5,5 % (20), 6,3 % (40), 6,8 % (100); Einzeltests bis 7,1 %
  (`afq`, n=20). „Vermutung“ (|Abweichung| > 10 Prozentpunkte) erscheint unter H0 bei n=10 in 99 %, n=20 in 94 %, n=40 in 74 % der Gegner – die Liste
  zeigt bei kurzer Beobachtung fast immer Zufall. Hypothesen nutzen nur Langzeitwerte, auch wenn eine Veränderung erkannt ist.
- **Reproduktion:** `node st2-fehlerrate.js` (Teil 3), `node st3-hyp-key.js` (exakte Binomialrechnung je Wert).
- **Vorschlag:** exakter Binomialtest (oder Mid-p) statt Normalnäherung; „Vermutung“ erst ab z. B. 30 Gelegenheiten oder relativ zur Standardabweichung.

## C-10 (gering) Verbesserungstabelle ohne Mehrfachkorrektur

- **Datei/Zeile:** `training.js` 322–331, Anzeige `views.js` 508–510.
- **Beschreibung:** Je Spot korrekt getrennt (1–10 Auswahl, 11–20 vorher, letzte 10 nachher → keine Regression zur Mitte; Fehlerrate je Zeile 4,1 %).
  Bei 14 Spots ist unter H0 aber in 45,5 % der Fälle mindestens eine Zeile farbig; der Hinweis „damit keine Scheinverbesserung durch Zufall entsteht“
  bezieht sich nur auf die Trennung. Ohne Streuung (z. B. alle 100 → alle 40) wird ein großer Unterschied als „± –“ und nicht farbig gezeigt.
- **Reproduktion:** `node st2-fehlerrate.js` (Teil 1).
- **Vorschlag:** Holm über die angezeigten Zeilen (wie bei den Hypothesen) oder Hinweis auf die Zahl der Vergleiche.

## C-11 (gering) „constructor“ als Kategorie

- **Datei/Zeile:** `training.js` 290 (`AREAS`), 296–298; `views.js` 502–505 (`PT.coach.SPOTS[t]`, `PT.coach.MISTAKES[r.cat]`), 479 (Fehlerkategorien).
- **Beschreibung:** `TAG_RE` erlaubt `constructor`; Nachschlagen in normalen Objekten liefert die geerbte Funktion. Anzeige „function Object() { [native code] }“
  als Feld, Spot und Kategorie (über `esc()`, also harmlos, aber gegen die Regel aus Prüfung C6, nur eigene Schlüssel zu nutzen).
- **Reproduktion:** `node lp1-constructor.js`.
- **Vorschlag:** `hasOwnProperty`-Nachschlagen (Hilfsfunktion `own(obj,k)`) oder die Tabellen mit `Object.create(null)` anlegen; alternativ in
  `validDecision` nur bekannte Kategorien/Spots zulassen.

## C-12 (gering) Format-1-Migration und Datenlage im Coach

- **Datei/Zeile:** `stats.js` 407–416 (`migrateV1`: `agg` bleibt 0), `coach.js` 63–66, 269–277.
- **Beschreibung:** Seit 2.2 bestimmt `agg.n` (statt Hände) die Datenlage. Für aus Format 1 umgewandelte Gegner ist `agg` = 0 – ein Gegner mit 2.000 Händen
  und 250 beobachteten Folds gegen C-Bet gilt als „ohne Daten“ (`dataW` = 1, `foldUnc` = 0,14). Format 1 ist alt, die Wirkung ist klein und vorsichtig.
  Format 2/3 mit `agg`, fehlendes `agg` und Format-2-Momentaufnahmen laufen fehlerfrei durch `oppStats`, `hypotheses`, `analyze`.
- **Reproduktion:** `node db1-alt.js`.
- **Vorschlag:** Rückfall auf Hände, wenn `agg.n === 0` und `hands > 0`, oder `nFace` mindestens aus `foldToCbet[1]`.

## C-13 (gering) Dokumentation und Kommentare

- `training.js` 314: „Fehler < 0,01 ab df = 2“ – tatsächlich −0,45 bei df=2, −0,12 bei df=3, < 0,01 erst ab df=7 (`node st1-tq.js`). In den
  heutigen Aufrufen ist df ≥ 9 (je 10 bzw. 12 Werte), daher ohne Wirkung; bei `opts.per`/`opts.cats` kleiner wird das Intervall zu schmal.
- `training.js` 312–313 („erste 10 gegen letzte 10 … ab 20 … Normalnäherung“) und `docs/LERNSYSTEM.md` Tabelle (gleich) widersprechen dem Code
  (1–10 Auswahl, 11–20 gegen letzte 10, ab 30, t-Quantil).
- `training.js` 376–378: Kommentar beschreibt Wilson-Kriterium, Code nutzt z-Test mit Holm.
- `docs/PAI_INTEGRATION.md` Abschnitt 3: „handRecord … ohne Zeitstempel“ (siehe C-4).

---

## Geprüft und korrekt befunden

- **Fehlerfelder (`errorAreas`):** je Entscheidung jedes Feld einmal gezählt, EV-Verlust gleichmäßig auf Kategorien verteilt, Summe des Verlusts bleibt
  erhalten; leere Daten → leere Liste.
- **Wiederkehrende Fehler (`recurring`):** Schwelle ≤ 45, ≥ 3, „letzte 100“ korrekt; leere Daten ok.
- **Verbesserung (`improvement`):** keine Überlappung der Fenster (ab 30), Auswahl unabhängig von der Vorher-Messung, Fehlerrate je Zeile 4,1 % unter H0.
- **Vorher-Nachher-Ergebnis (`prePostResult`):** Welch-Intervall mit t-Quantil, Urteil nur bei vollständigen Phasen; Fehlerrate erster Art 5,1 % unter
  H0 (20.000 Läufe, schiefe diskrete Bewertungen, `node st2-fehlerrate.js` Teil 2). Auswahl der schwächsten Kategorien erzeugt keinen Regressionseffekt,
  weil Vorher- und Nachher-Situationen neue Messungen sind.
- **Erhalt nach Sicherung/Import/Neustart:** Test im Zustand „training“ mit teilweise erfasstem Nachher-Teil bleibt nach Sicherung → `parseImport`
  und nach JSON-Neustart (`validLearning`) byteweise gleich und fortsetzbar (`node pp5-import.js` 1–2). Speicherung nach jeder Testbewertung (`persistLearning`).
- **Holm-Verfahren** korrekt umgesetzt (sortiert, Schwellen 0,05/(k−i), Abbruch beim ersten Nicht-Verwerfen); `normCdf` genau; `LIK.ref` liegt in (0, 1).
- **XSS:** alle Ausgaben importierter Daten in `learnPanels`, Hypothesen, Belastbarkeit und Gegnerdialog über `esc()` bzw. berechnete Zahlen; Kategorien
  in `pp` über `hasScen` geprüft; Datenattribute escaped.
- **Gegnergedächtnis/Datenbank:** `tests/unit/gedaechtnis.js` und `tests/unit/daten-sicherheit.js` (12 Tests, Quick) grün in der Kopie
  (`node run-unit.js gedaechtnis.js daten-sicherheit.js --quick`): Format-3-Export/Import identisch mit 5.000 Gegnern, Migration 1/2 → 3, Rückkehrer
  nach Archiv (Langzeit und Kurzzeit laufen weiter, kein Doppeleintrag), manipulierte Dateien abgelehnt. 2.2-Funktionen mit Format-2-Datensätzen,
  fehlendem `agg` und Format-2-Momentaufnahmen fehlerfrei (`node db1-alt.js`).
- **Ereignisstrom, beobachteter Teil (`observed`):** enthält nur eigene Karten, Board bis zur Straße, Aktionen bis zur Entscheidung, Stacks, erlaubte
  Aktionen und Gegnerwerte aus früheren Händen (Momentaufnahme vor `finishHand`); keine Karten anderer Spieler in `publicView`; Zeitstempel in
  Gegnerwerten entfernt. Die Probleme liegen im mitgelieferten `handRecord` (C-4) und in der Prüfung (C-5).
