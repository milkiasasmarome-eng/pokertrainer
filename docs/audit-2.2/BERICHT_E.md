# Prüfbericht E – Oberfläche, Barrierefreiheit, PWA, PAI-Integration (PokerTrainer 2.2, Commit 83c926e)

Prüfumgebung: Kopie `/home/claude/review22/E/repo` (unverändert, Commit 83c926e, Zweig entwicklung-2.2); für Prüfungen hinter Befund E-1
zusätzlich `/home/claude/review22/E/repo-fix` (= Kopie mit einer einzigen Korrektur: Zeilenumbruch nach dem Kommentar in views.js Z. 94).
Eigene Skripte: `/home/claude/review22/E/skripte/`. Chrome `/usr/bin/google-chrome`, Playwright 1.63.0, axe-core 4.14.1.
Ein echter Screenreader (NVDA/JAWS/VoiceOver) ist hier nicht verfügbar: **nicht ausführbar**, Ersatz nur über axe und den Accessibility-Baum.

## Befunde

### E-1 (schwer) – views.js hat einen Syntaxfehler: alle Bereiche außer dem Tisch und der Gegnerdialog fallen aus
- Datei/Zeile: `assets/js/ui/views.js` Z. 94 (eingeführt in 83c926e „Prüfagent D … Ereignisexport einmal serialisiert“), identisch in `dist/PokerTrainer_2.2.html`.
- Beschreibung: Der Zeilenkommentar `// einmal serialisieren (Prüfer D 2.2, D-2)` steht mitten in der Zeile und kommentiert den Rest aus:
  `H.download(...)`, `H.toast(...)` und die schließende Klammer `}`. Die nächste Zeile beginnt mit `else` → `SyntaxError: Unexpected token 'else'`.
  Das ganze Skript `views.js` wird nicht ausgeführt.
- Reproduktion: `node --check assets/js/ui/views.js` (auch `git show 83c926e:assets/js/ui/views.js | node --check -`) → SyntaxError Z. 95.
- Erwartet: Datei parst; Export Ereignisse lädt Datei herunter. Tatsächlich: siehe Browserbefund unten (Abschnitt E-1 Browser).
- Vorschlag: Kommentar ans Zeilenende bzw. als `/* … */`; `node --check` für alle Dateien unter `assets/js` in `tests/run.js --quick` und `tools/check-build.js`
  aufnehmen (der Build kopiert den Fehler ungeprüft in die Offline-Datei).
- Browserbefund (Skript `skripte/e1-syntax.js`, Website :8790 und `file://…/dist/PokerTrainer_2.2.html`): Konsole `pageerror: Unexpected token 'else'`;
  `PTUI.views` und `PTUI.showOpp` fehlen; die Bereiche Training, Handhistorie, Gegner, Fortschritt, Einstellungen bleiben **leer** (kein Text);
  Klick auf einen Gegnerplatz öffnet keinen Dialog. Der Tisch selbst startet und spielt. Damit scheitern im aktuellen Stand die FAT-Fälle
  3 (Klick zeigt alle Werte), 9 (Lernfortschritt), 10–14, 17–22, 24 und alle Einstellungen.
- Warum die Tests das nicht gefunden haben: `tests/results/e2e.json` stammt von 10:00 UTC (Commit 270ed7e), also vor den drei 2.2-Commits
  7a2413a/07eb7f1/83c926e; die Browsertests liefen auf dem Endstand nicht. Die Teilmenge `--nur=a11y` prüft keine Konsolenfehler, und axe
  findet in leeren Bereichen keine Verstöße – sie wäre vermutlich auch mit E-1 grün (abgeleitet, nicht ausgeführt: `--nur=a11y` lief nur einmal, auf repo-fix).

### E-2 (mittel) – Vorher-Nachher-Test: Die Trainingsleiste zeigt nach jeder Situation „Ø Qualität“ (Bewertung während des Tests)
- Datei/Zeile: `assets/js/ui/app.js` Z. 689 (`S.training.scores.push(g.score)` auch für `pp:`-Situationen) und Z. 507–513 (`renderTrainbar`).
- Beschreibung: Laut docs/LERNSYSTEM.md §3 und Prüfer C (C-2) gibt es im Test „weder Tipp noch Urteil“. Die Leiste zeigt aber nach der ersten
  bewerteten Situation „Ø Qualität 90“, danach den laufenden Mittelwert; aus der Änderung lässt sich jede Einzelbewertung zurückrechnen
  (Situation 1: 90 → Situation 4: 66 …). Zusätzlich steht „· Wiederholung“ in der Leiste (weil `tr.review` gesetzt ist), obwohl es keine Wiederholung ist.
- Reproduktion: `node skripte/e2-prepost.js http://127.0.0.1:8791/` → in 56 von 59 eigenen Zügen enthält `#trainbar` „Ø Qualität“ (Protokoll in `skripte/e2-prepost.json`, Feld `log`).
- Erwartet: im Test keine Bewertung sichtbar (höchstens „Situation k von 12“). Tatsächlich: laufender Mittelwert sichtbar.
- Vorschlag: in `renderTrainbar` bei `tr.test` weder Ø Qualität noch „Wiederholung“ anzeigen, stattdessen „Situation k von N“ (N = Länge der Warteschlange beim Start + bereits erledigte).

### E-3 (mittel) – Tipp-Modus und Bewertungsmodus lassen sich während des Tests umschalten; Änderungen in den Einstellungen gehen danach still verloren
- Datei/Zeile: `assets/js/ui/app.js` Z. 760–775 (`setMode`, `setSMode` ohne Sperre), Z. 868 (Taste T), Z. 217 (`metaRecord` überschreibt mit `S.testSaved`), Z. 800 (`restoreTestSettings`);
  `assets/js/ui/views.js` Z. 560–578 (Einstellungen: Tipp-Modus, Strategiemodus, Stufe frei wählbar, kein Hinweis auf den Test).
- Beschreibung: (a) Taste „T“ (oder Klick auf „vorher“ in der Modusgruppe) im Test → `tipMode` = „vorher“, der Tipp mit Empfehlung erscheint sofort
  („Empfehlung: Fold, Mathematisch eindeutig …“), die Entscheidung wird trotzdem als Testsituation gewertet. Gleiches gilt für Strategiemodus und Stufe
  (dann nicht mehr „immer exploitativ, Standard“). (b) Wer im Test unter Einstellungen den Tipp-Modus bewusst ändert (z. B. „nachher“), sieht die Änderung
  live, gespeichert wird aber der alte Wert (`metaRecord`), und am Testende setzt `restoreTestSettings` den alten Wert zurück – ohne Meldung.
  (c) Einstellungen zeigen während des Tests „Tipp-Modus: aus“, ohne zu sagen, dass das nur für den Test gilt.
- Reproduktion: `skripte/e2-prepost.js`: `tDuringTest` = { tipMode: "vorher", tip: true }, `changedDuringTest` = { live: "nachher", stored: "vorher" }, `einstellungenTm.cTm` = "aus", `hint` = false.
- Erwartet: Modusgruppe/Einstellungen während des Tests gesperrt (`aria-disabled` + Erklärung) oder die Wahl wird nach dem Test übernommen.
- Vorschlag: In `setMode`/`setSMode`/`setSetting` bei `S.training && S.training.test` nicht umschalten, sondern Hinweis „Während des Vorher-Nachher-Tests sind Tipps aus“
  (per `announce`); in den Einstellungen dieselbe Zeile anzeigen; alternativ Änderungen in `S.testSaved` schreiben, damit sie nach dem Test gelten.

### E-4 (gering) – Sicherung während des Tests enthält die Testeinstellungen
- Datei/Zeile: `assets/js/ui/views.js` Z. 449 (`backupNow`: `settings: S.settings`).
- Beschreibung: `metaRecord` speichert bewusst nie die Testeinstellungen (Prüfer C 2.2), die Sicherung aber schon: tipMode „aus“, smode „exploit“, level „standard“.
  Wer diese Sicherung später einspielt, hat Tipps aus. Gleiches gilt für automatische Sicherungen vor Import/Löschen während eines Tests.
- Reproduktion: `skripte/e2-prepost.js` → `backupDuringTest` = { tipMode: "aus", smode: "exploit", level: "standard" } (vorher eingestellt: vorher/exploit/standard).
- Vorschlag: in `backupNow` dieselbe Zusammenführung wie `metaRecord` verwenden (`S.testSaved ? Object.assign({}, S.settings, S.testSaved) : S.settings`).

### E-5 (mittel) – Schnelles Handeln im Test verliert Bewertungen; Test meldet „abgeschlossen“, obwohl eine Situation fehlt
- Datei/Zeile: `assets/js/ui/app.js` Z. 528 (`nextHand` → `Analyzer.cancel()` bricht **alle** offenen Analysen ab, auch die, auf die `gradeDecision` noch wartet),
  Z. 534 (Testende allein nach leerer Warteschlange), Z. 668 (`gradeDecision` → `null` bei abgebrochener Analyse).
- Beschreibung: Handelt der Spieler, bevor die Analyse fertig ist (z. B. Taste F, Fold beendet die Hand sofort) und drückt gleich N / „Nächste Hand“, wird die
  Analyse abgebrochen, die Entscheidung nie bewertet und `prePostRecord` nicht aufgerufen. Die Warteschlange ist trotzdem leer → Toast
  „Testphase abgeschlossen (Vorher-Test)“, Fortschritt zeigt „Vorher: 74 (11 Situationen)“ und „Vorher-Test fortsetzen“. Die Zuordnung über `cur.review` (C-3) hilft hier nicht,
  weil gar keine Bewertung entsteht. Außerhalb des Tests geht dieselbe Entscheidung dem Lernprofil verloren (wohl seit 2.0).
- Reproduktion: `node skripte/e2-race.js` (handelt und klickt ohne Wartezeit) → `pp: [{ state: "pre", pre: "11/12" }]`, Toast „abgeschlossen“; nach 2,5 s unverändert.
- Erwartet: alle 12 Situationen bewertet, oder das Testende nennt die fehlende Situation und bietet die Fortsetzung direkt an.
- Vorschlag: In `nextHand` nur die Analyse der aktuellen Live-Situation abbrechen, nicht die Bewertungsanalysen (`S.pendingGrades`), oder vor dem Testende
  `Promise.all(S.pendingGrades)` abwarten und nur bei vollständig erfasster Phase „abgeschlossen“ melden; sonst die fehlenden Situationen erneut einreihen.

### E-6 (mittel) – Fokus geht beim Start und beim Ende des Tests verloren (2.4.3 Fokusreihenfolge)
- Datei/Zeile: `assets/js/ui/app.js` Z. 789–799 (`startTraining` setzt `location.hash='#tisch'`), Z. 534 (Testende setzt `location.hash='#fortschritt'`), `route()` ohne Fokusführung.
- Beschreibung: Nach Enter auf „Neuen Vorher-Nachher-Test starten“ (Fortschritt) wechselt die Ansicht zum Tisch; der gedrückte Knopf verschwindet, `document.activeElement`
  ist `BODY`. Ebenso nach dem letzten „Nächste Hand“ (Wechsel zu Fortschritt): Fokus auf `BODY`. Ein Screenreader beginnt dann am Seitenanfang; die Ansage
  „Du bist am Zug …“ kommt zwar über `#announce`, der Fokus liegt aber nicht in der Aktionsleiste bzw. nicht beim Testergebnis. Gleiches gilt für „Gezielt üben“, „… üben“,
  „Nachher-Test starten“ und die älteren „Training“-Knöpfe (gleicher Weg über `startTraining`).
- Reproduktion: `skripte/e2-prepost.js` → `afterStart.active` = "BODY", `afterPre.active` = "BODY".
- Zusätzlich mobil (390 × 740, `skripte/e3-scroll.js`): Nach Tippen auf „Neuen Vorher-Nachher-Test starten“ bleibt die Scrollposition aus Fortschritt
  erhalten (scrollY 1219); Aktionsleiste (top −340 px) und Trainingsleiste liegen oberhalb des sichtbaren Bereichs, man sieht die Mitte der Tischseite.
- Erwartet: Fokus nach dem Start auf der Trainingsleiste bzw. „Nächste Hand“/Aktionsleiste, nach dem Testende auf der Überschrift „Vorher-Nachher-Test“ bzw. dem Kasten des Tests.
- Vorschlag: nach `route()` bei Wechseln aus Knöpfen heraus das Ziel fokussieren (`tabindex="-1"` + `focus({preventScroll:true})`, wie bei `data-goto`).

### E-7 (gering) – Verbesserungstabelle: „eindeutig“ nur über Farbe; Erklärtext beschreibt eine andere Regel als der Code
- Datei/Zeile: `assets/js/ui/views.js` Z. 509–510 (`td class="n good|bad"` nur bei `x.sure`), Erklärtext Z. 510.
- Beschreibung: Ob eine Differenz „eindeutig“ ist (Holm-korrigiert), zeigt nur die Textfarbe (grün, normale Schriftstärke; rot ist fett). Ohne Farbwahrnehmung oder
  mit Screenreader ist das nicht erkennbar (WCAG 1.4.1). Der Kasten des Vorher-Nachher-Tests macht es richtig („(nicht eindeutig)“ als Text). Außerdem sagt der Text
  „Farbig nur, wenn die Differenz größer ist als ihr 95-%-Intervall“, gefärbt wird aber nach Holm-Korrektur (`sure`), also seltener.
- Reproduktion: `skripte/e2-lernen.js` → `struct.colored`: Zeilen „Blind Defense +9,6 ± 6,2“ usw. nur mit `class="n good"`; Accessibility-Baum (`skripte/aria-fortschritt.yml`) ohne Hinweis.
- Vorschlag: Zusatz „eindeutig“/„nicht eindeutig“ als Text oder Symbol mit `sr`-Text; Erklärtext auf „… nach Holm-Korrektur über alle Situationen“ ändern.

### E-8 (gering) – Gegnerdialog: zweistufiger Tabellenkopf ohne `scope`/`headers`; Schwellen der „Belastbarkeit des Werts“ nur im `title`; „gestützt“ neben „unsicher“
- Datei/Zeile: `assets/js/ui/views.js` Z. 366–367, 371–372; `assets/js/engine/training.js` Z. 387, 396–412.
- Beschreibung: (a) Kopf mit `rowspan`/`colspan` („Langzeit“ über Rohwert/Z/N/95 %/geglättet, „Kurzzeit“ über Rohwert/eff. n/95 %) ohne `scope="col"`/`scope="colgroup"`
  und ohne `headers`; „Rohwert“ und „95 %“ kommen doppelt vor, ein Screenreader kann sie nur über die Gruppenzeile unterscheiden (Chromium leitet das ab, ob NVDA/VoiceOver
  die Gruppe mitlesen, ist hier nicht prüfbar). Erste Spalte ist `td` mit Knopf statt Zeilenkopf. (b) Die Schwellen (unter 20 unsicher, 20–99 Tendenz, ab 100 belastbar) stehen nur
  im `title` des Spaltenkopfs – per Tastatur/Touch nicht erreichbar; der sichtbare Hinweistext nennt sie nicht. (c) Eine Hypothese kann „gestützt“ sein, während derselbe Wert in der
  Tabelle „unsicher“ heißt (Node: `foldTo3Bet = [1,13]` → „gestützt“, `statReliability` → „unsicher“) – statistisch begründbar, für Nutzer widersprüchlich.
- Reproduktion: `skripte/e2-gegner-export.js` (`modal.ths`), axe ohne Verstoß (nur `label-content-name-mismatch` „incomplete“).
- Vorschlag: `scope="colgroup"`/`scope="col"` und `th scope="row"` für die Wertspalte; Schwellen in den sichtbaren Hinweistext; bei „gestützt“ mit weniger als 20 Gelegenheiten Zusatz „(wenige Gelegenheiten)“.

### E-9 (gering) – Vorher-Nachher-Test: Testende nur über „Nächste Hand“, keine Angabe „k von N“, Zähler beginnt nach Neuladen bei 1; mehrere offene Tests nicht unterscheidbar
- Datei/Zeile: `assets/js/ui/app.js` Z. 507–513, 534; `assets/js/ui/views.js` Z. 512–519.
- Beschreibung: Nach der 12. Situation steht der Tisch mit „Nächste Hand“ da; erst dieser Klick beendet den Test (FAT 17 verlangt „endet nach der letzten Situation von selbst“ –
  die Projektregel „keine neue Hand ohne Nächste Hand“ spricht für den Knopf, dann sollte er aber „Test abschließen“ heißen). Die Leiste zeigt „Situation 12“ ohne Gesamtzahl;
  nach Neuladen und „Nachher-Test starten“ zählt sie wieder ab 1 (es fehlen nur noch 9). Ein neuer Test lässt ältere offene Tests liegen; alle tragen „Test vom 27.11.2026“ ohne Uhrzeit,
  die Knöpfe „Gezielt üben“ (bis zu sechs gleichnamige) nennen ihr Ziel nicht im Namen.
- Reproduktion: `skripte/e2-prepost.js` (Feld `log`: „Situation 12 …“, nach Neuladen „Situation 1“ mit `resumeQueue` = 9); `skripte/e2-lernen.js` (`struct.buttons`, `struct.boxes`).
- Vorschlag: „Situation k von N“, Knopf am Ende „Test abschließen“; Datum mit Uhrzeit; `aria-label` bzw. sichtbarer Zusatz „Gezielt üben: 4-Bet-Pots“; beim Neustart offenen Test fortsetzen oder verwerfen lassen.

### E-10 (mittel) – Browsertests decken 2.2 nicht ab: Offline-Datei-Test zeigt auf 2.1, Ergebnisse veraltet, neue Panels ohne Test
- Datei/Zeile: `tests/e2e.js` Z. 388 (`dist/PokerTrainer_2.1.html` – existiert nicht mehr), `tests/results/e2e.json` (10:00 UTC, vor 7a2413a), `tests/e2e/a11y.js` Z. 53 (Fortschritt nur leer geprüft), `tools/check-build.js`.
- Beschreibung: Der Test „Portable Einzeldatei“ lädt eine Datei, die es im Zweig nicht gibt (Build schreibt `PokerTrainer_2.2.html`). Die a11y-Suite prüft Fortschritt und Gegnerdialog nur mit
  wenig/keinen Daten (keine Fehlerfelder, keine Verbesserungstabelle, kein Testkasten, keine Hypothesen) und meldet keine Konsolenfehler – deshalb blieb E-1 unbemerkt.
  `check-build.js` meldet „Build reproduzierbar und aktuell“ auch mit dem Syntaxfehler (geprüft in der unveränderten Kopie).
- Vorschlag: Dateiname aus `PT.VERSION` ableiten; Syntaxprüfung (`node --check`) aller Quellen in `run.js --quick`; die Skripte `skripte/e2-lernen.js`, `e2-prepost.js`, `e2-race.js`,
  `e2-gegner-export.js` als Vorlage für Tests „Lernfortschritt mit Daten“, „Vorher-Nachher-Test vollständig“, „Ereignisexport“ übernehmen; Browsertests vor der Freigabe auf dem Endstand laufen lassen.

### E-11 (mittel) – PAI_INTEGRATION.md: Die „Alternative Ereignisstrom“ verliert Zeitfolge und Hand-Identität; „Handdatensätze seit 2.0 unverändert“ stimmt nicht ganz
- Datei/Zeile: `docs/PAI_INTEGRATION.md` §2 letzter Absatz und §3; `assets/js/engine/export.js` Z. 220 (`hr.ts = 0`, `hr.id = k`), Z. 215 (`Object.keys(byHand).sort()`).
- Beschreibung: Der Ereignisstrom setzt in jedem `handRecord` `ts = 0` und ersetzt die ID durch den Hash `H…`; die Hände sind nach diesem Hash sortiert. PAI ordnet Hände nach
  `(ts, id)` (`src/memory/memory.js` `byTsId`), `applyObservation` verlangt „Hände je Spieler zeitlich aufsteigend“ (`src/memory/profile.js`), Sitzungen, „zuletzt gesehen“ und die
  Stilwechsel-Erkennung (`src/patterns/change.js`) brauchen die Reihenfolge. Über den Ereignisstrom eingelesen wäre die Reihenfolge zufällig, alle Hände in einer „Sitzung“ mit ts 0, und
  dieselbe Hand hätte eine andere ID als über die Sicherung (`pokertrainer:<id>` gegen `pokertrainer:H…`) → doppelt gezählt, wenn beide Wege genutzt werden. PAI hat außerdem
  noch keinen Leser für `PokerTrainer-Ereignisse` (Adapter erkennt nur `PokerTrainer-Backup`). Die Seeds zu entfernen (C-4) ist richtig; die Zeitfolge geht dabei unnötig mit verloren.
  Nebenbei: Handformat 1 bekam in 2.1 das optionale Feld `tseed` (2.0.1: `HAND_KEYS` ohne `tseed`); für PAI folgenlos, weil der Adapter unbekannte Felder ignoriert.
- Reproduktion: `node skripte/e4-pai.mjs` → `events.tsValues` = [0], `idsEqualBackupPath` = 0, `fileOrderChronological` = false, `paiOrderChronological` = false; PAI-Adapter/Validator akzeptieren die 39 handRecords.
- Vorschlag: im Ereignisstrom eine laufende Nummer (`seq`) bzw. ein auf Reihenfolge reduzierter Zeitstempel (z. B. `ts` = Rang × 1000) und chronologische Sortierung; im Dokument
  die Alternative als „erfordert neuen PAI-Adapter; Zeitfolge über `seq`“ beschreiben und vor gemischter Nutzung beider Wege warnen.

## Geprüft und in Ordnung (repo-fix, d. h. nach Behebung von E-1)

- **Offizielle Browsertests** (je einmal, auf repo-fix :8791): `node tests/e2e.js … --nur=a11y` 5/5 bestanden (axe 0 WCAG-Verstöße hell/dunkel, Tastatur, Fokusfalle, Live-Regionen,
  Accessibility-Baum); `--nur=cd` 8/8 bestanden (u. a. Tisch ohne Überdeckungen 320–1366 px).
- **Lernfortschritt mit Daten** (160 Entscheidungen, drei Tests in den Zuständen pre/training/fertig): axe 0 Verstöße hell und dunkel, keine „incomplete“; neue Tabellen „Fehlerfelder“
  und „Verbesserung …“ mit `th scope="col"`; Überschriftenfolge h2 → h3 lückenlos; „Vorher: 46 (12 Situationen) · Nachher: 76 (12) · Differenz +30,0 ± 3,1“, bei unklarer Differenz „(nicht eindeutig)“ als Text;
  Hinweis „Ein Nachweis allgemeiner Lernwirkung ist das nicht“ sichtbar.
- **Vorher-Nachher-Test im Browser** (12 + 12 Situationen): Tipp-Feld zeigt in keinem Zug eine Empfehlung, `#tipMini` leer, keine Coach-Ansage; Modus während des Tests „aus“, „exploit“,
  „standard“; Testende mit Toast (`aria-live="polite"`) und Wechsel zu Fortschritt; danach Einstellungen exakt wiederhergestellt (vorher/exploit/standard); gespeicherte Einstellungen während des
  Tests unverändert („vorher“); nach Neuladen mitten im Nachher-Test: Einstellungen korrekt, bereits gewertete 3 Situationen erhalten, Fortsetzung mit den 9 fehlenden; Endzustand „fertig“ mit Differenz und Intervall.
  Zuordnung der Bewertung zur Situation (cur.review) bei normalem Tempo korrekt (12/12).
- **Gegnerdialog** (Gegner mit 570 Händen): Spalte „Belastbarkeit des Werts“ je Wert (unsicher/Tendenz/belastbar nach Gelegenheiten), Abschnitt „Verhaltenshypothesen“ mit „gestützt“ als
  Text (nicht nur Farbe), Fokus auf „Schließen“, axe 0 Verstöße.
- **Ereignisexport** (Tastatur: Enter auf „Export Ereignisse (PAI)“): Download `PokerTrainer_Ereignisse_v1_2026-11-27.json`, `PT.events.validate` = null, Kanal `pai` überall `null`,
  Datei endet mit Zeilenumbruch, Toast „Ereignisstrom: 16 Entscheidungen aus 3 Händen.“, Fokus bleibt auf dem Knopf. (Im unveränderten Stand ohne Funktion, E-1.)
- **PWA-Aktualisierung 2.1.0 → 2.2.0** auf demselben Ursprung (`skripte/e3-update.js`, Server mit umschaltbarem Wurzelordner): Hinweis „Eine neue Version des PokerTrainers ist bereit.“ +
  „Jetzt aktualisieren“; danach Version 2.2.0, nur noch Cache `pokertrainer-2.2.0-…` (alter `pokertrainer-2.1.0-5a7854d301aa` gelöscht), Gegner, Hände, Lernentscheidungen, Tischstand gleich;
  anschließend offline neu geladen: startet, zwei Hände mit Tipp gespielt. Der Cache-Schlüssel enthält einen Inhalts-Hash (ändert sich mit jeder Quelländerung; `check-build` reproduzierbar).
  Hinweis: Mit dem unveränderten Stand würde dieselbe Aktualisierung 2.1-Nutzern einen Trainer ohne Bereiche liefern (E-1).
- **Offline-Datei** `dist/PokerTrainer_2.2.html` (repo-fix, neu gebaut) per `file://`: bereit, drei Hände mit Tipp, Analyse im Web Worker, Version 2.2.0, keine Anfrage nach außen, Fortschritt rendert.
  Unverändert (repo): lädt, Tisch spielbar, aber Bereiche leer (E-1).
- **Mobil 320/390 px**: Fortschritt (mit Daten), Handhistorie (neuer Exportknopf) und Gegnerdialog ohne Querscrollen (`scrollWidth` = Breite; breite Tabellen in `.scroll`); axe am Tisch im Test 0 Verstöße;
  Knopf „Training beenden“ 141 × 40 px. (Scrollposition beim Teststart siehe E-6.)
- **PAI-Integration** (`PT_PAI_ROOT=/home/claude/milkiasasmarome-eng/assist node tests/pai-integration.mjs`, PAI 0.1.0, Commit 1b0c4da): 8 von 9 bestanden; der eine Fehler ist die
  dokumentierte Inkompatibilität („Nicht unterstützte Version 3 (unterstützt: 2)“). Bestätigt gegen den PAI-Code (nur gelesen): `src/data/adapters/pokertrainer.js` Z. 24 prüft `json.version !== 2`;
  der Trainer schreibt seit 2.1 `BACKUP_VERSION = 3` (Zweig `sicherung-2.1.0`, stats.js Z. 296). PAI liest nur `payload.hands`; v3 ändert daran nichts (neu: `halfLife`, Gegnerfelder, `learning.pp`).
  **Vorgeschlagene Anpassung geprüft** an einer Kopie des Adapters (`skripte/pai-kopie/pokertrainer-v3.js`, Bedingung `!== 2 && !== 3`): echte 2.2-Sicherung → 40/40 Hände, 0 Fehler,
  PAI-Validator ok, Ergebnis byte-gleich mit derselben Sicherung als Version 2 → die Aussage stimmt. In PAI ist die Ereignis-Schnittstelle tatsächlich als geplant markiert
  (`docs/ARCHITEKTUR.md` Z. 13 `:::plan`, `docs/SPAETER.md` Punkt 1). Einschränkung: VPIP/PFR-Gleichheit beruht auf nur 12 Vergleichen (60 Hände); Equity 25 Spots, Abweichung 0,0000.

## Nicht ausführbar / nicht geprüft
- Echter Screenreader (NVDA, JAWS, VoiceOver, TalkBack): nicht verfügbar; Ersatz: axe-core und Chromium-Accessibility-Baum (`skripte/aria-fortschritt.yml`, `skripte/aria-gegnerdialog-22.yml`).
- Sprachausgabe im Test (keine deutsche Stimme im Container); Installation als App über das Browsermenü (nur Service Worker/Cache geprüft); echte Smartphones.
- Vollständige Browsersuite (`node tests/e2e.js` ohne `--nur`) bewusst nicht gestartet (Vorgabe: nur a11y und cd).
