# Prüfbericht E: Benutzeroberfläche und PAI-Kompatibilität – PokerTrainer 2.3.0 (Stand 4782d23)

Prüfagent E, 27.11.2026. Ich habe nur in der eigenen Kopie `/home/claude/review23/E` gearbeitet und keinen Arbeitsstand geändert. PAI (`/home/claude/milkiasasmarome-eng/assist`, Commit 1b0c4da) habe ich nur gelesen; `git status` ist danach sauber. `tests/strategy/final23/` habe ich nicht geöffnet.
Hilfsskripte liegen unter `/tmp/E_scripts/` (Playwright: `pw1.js` bis `pw5.js`; Node: `pf.js`, `leak.js`, `vacuous.mjs`, `train.mjs`).

## Ausgeführt (Ergebnis)

| Prüfung | Ergebnis |
|---|---|
| `node tests/run.js --quick` | 137 bestanden, 0 fehlgeschlagen |
| `node tests/e2e.js http://127.0.0.1:8782/ --nur=a11y` | 5 von 5 bestanden (axe WCAG 2.2 AA, Tastatur, Fokusfalle, Live-Regionen, ariaSnapshot) |
| `node tests/e2e.js … --nur=cd` (Layout 320–1366 px, Fokus beim Neuzeichnen) | 8 von 8 bestanden |
| `PT_PAI_ROOT=… node tests/pai-integration.mjs` | 14 von 15 bestanden. Der eine Fehler ist die bekannte Versionsprüfung: PAI 0.1.0 lehnt Format 3 ab. Exit-Code 0 (siehe E23-11) |
| PAI-Querprüfung `tools/pokertrainer-cross.cjs` mit PT 2.3, 1.500 Hände, Heldenaktionen zufällig | 1.500 von 1.500 Händen von PAI angenommen, 0 Fehler (16 Side Pots, 17 Split Pots, 341 All-ins) |
| Reproduzierbarkeit des Ereignisstroms in getrennten Prozessen und nach einem Vorlauf mit anderem Seed | gleiche Prüfsumme (8bbd451a, 183 Ereignisse) |
| `tools/check-version.js`, `tools/check-build.js` | einheitlich 2.3.0; Build reproduzierbar |
| Browser (Website): Versionstexte, Hinweis „Faustregel, kein Solver-Ergebnis“, Tipp-Modi vorher/nachher/aus, ungültige Beträge (`abc`, `0`, `-5`, `99999`, `1,234`, `1e3`), frei gewählte Größe, Sprachschalter, `#ohne-sprache`, keine Hand ohne „Nächste Hand“ | alles erfüllt. Tipps erscheinen nach 2 bis 291 ms. Meldungen sind deutsch. Mit `#ohne-sprache` erscheint ein Hinweis und der Trainer läuft ohne Ton weiter. Ohne Klick steht der Handzähler nach 4 s noch bei 7. Keine Anfragen nach außen, keine Skriptfehler |
| Breiten 320/360/375/414/480/600/768/820 px | kein Querscrollen der Seite. Die Tableiste scrollt waagrecht, das ist so gewollt (`overflow-x:auto`). Die Wertetabelle im Gegnerdialog scrollt bei 320 px innerhalb des Dialogs |
| Offline-Datei `dist/PokerTrainer_2.3.html` über file:// | Version 2.3/2.3.0, Tipp erscheint, keine Anfragen nach außen, keine Fehler |
| Service Worker | aktiv. Cache `pokertrainer-2.3.0-b8a8b63df4f1` mit 30 Einträgen. Der Cache-Schlüssel hängt vom Inhalt ab und ändert sich mit jedem Commit. Offline neu geladen ist der Trainer bedienbar und gibt Tipps |
| Größenangabe im Gegnerdialog | wird angezeigt, z. B. „Turn: Bet 1,50 (0,6 Pot)“ (Xenia) |

## Befunde

| ID | Schwere | Kurzbeschreibung | Status |
|---|---|---|---|
| E23-1 | mittel | Die Sicherung, die PAI lesen soll, enthält Tisch-Seed und Handnummer je Hand. Damit lassen sich alle verdeckten Karten nachbauen. Der Änderungsauftrag sagt dazu nichts | bestätigt |
| E23-2 | mittel | Der Integrationstest „Keine Datenleckage“ kann kein Leck finden. PAI nimmt aufgedeckte Karten gefoldeter Spieler an | bestätigt |
| E23-3 | mittel | Trainingsszenarien (geskriptete Gegner, automatisch gespielte Heldenaktionen) landen in PAI als normale Beobachtungen. Der Trainer selbst schließt sie aus | bestätigt |
| E23-4 | niedrig–mittel | Der Kanal „pai“ im Ereignisstrom lässt sich nicht gültig füllen: `PT.events.validate` lehnt jeden Inhalt ab. Für den Kanal gibt es kein Schema | bestätigt |
| E23-5 | niedrig | Änderungsauftrag und PAI_INTEGRATION.md: sachliche Fehler, ein verwiesener Abschnitt existiert nicht, PAI_INTEGRATION.md ist veraltet und widerspricht dem Änderungsauftrag | bestätigt |
| E23-6 | niedrig | Der Push/Fold-Text (B23-10) ist nur teilweise behoben: weiterhin doppelt, „um 0,0 BB vorn“, Größenhinweis bei einem Fold, 459 Zeichen Sprachausgabe, falsche BB-Angabe unter 3 BB | bestätigt |
| E23-7 | niedrig | D23-3 ist nicht wirksam behoben: Im Sandbox-iframe ohne Download erscheint weiter die Erfolgsmeldung. Ein leerer Export erzeugt weiter eine Datei | bestätigt |
| E23-8 | niedrig | D23-1: Die Sperre wirkt, nach dem Neuzeichnen sind die Exportknöpfe aber sichtbar aktiv, ohne `disabled` und ohne `aria-disabled` | bestätigt |
| E23-9 | niedrig | Die neue Größenangabe „(x Pot)“ ist nicht dokumentiert (CHANGELOG, BENCHMARK_EXPORT, Schema bleibt 1) und im Dialog nicht erklärt. Darstellung „(0,333 Pot)“ und „(All-in) (1,2 Pot)“ | bestätigt |
| E23-10 | Hinweis | „Raise 2,5×: Die Bet gewinnt den Pot …“: falscher Fachbegriff bei Raises (nicht neu in 2.3) | bestätigt |
| E23-11 | Hinweis | `tests/pai-integration.mjs` endet immer mit Exit-Code 0, auch bei Fehlern oder fehlendem PAI | bestätigt |
| E23-12 | Hinweis | Modus „nachher“: Während der nächsten Entscheidung derselben Hand bleibt das alte Urteil stehen (vermutlich nicht neu) | bestätigt |
| E23-13 | Hinweis | Sicherung je Hand rund 35 KB, davon 86 % Entscheidungs-Snapshots. Bei 3.000 Händen sind das rund 106 MB, die PAI ganz parsen muss | bestätigt (Messung), Folgen für PAI vermutet |
| E23-14 | Hinweis | Die Kürzung in `shownEntry` (C23-6) lässt eine Aktion aus der Mitte weg und hängt danach kürzere Aktionen an. Dadurch entsteht eine widersprüchliche Folge | Vermutung (mit Bots nicht erreichbar) |

---

### E23-1 – Mittel – Die Sicherung, die PAI lesen soll, verrät alle verdeckten Karten (Seed + Handnummer)

- **Datei/Zeile:** `assets/js/engine/training.js:11` (`seed: meta.seed`, `no`, `session`, `tseed` im Handdatensatz), `assets/js/engine/session.js:85–93` (Deck = `PT.rng.stream(t.seed, 'deal', no)`), `assets/js/ui/views.js:458` (Sicherung mit `hands` und `table`), `docs/PAI_INTEGRATION.md:24–28`, `docs/PAI_AENDERUNGSAUFTRAG.md:28`.
- **Beschreibung:** Jeder Handdatensatz in `payload.hands` trägt Tisch-Seed und Handnummer. Daraus lassen sich Deck und alle Hole Cards nachbauen, auch die gefoldeter Spieler. Die Sicherung enthält außerdem `payload.table` mit dem Seed des laufenden Tisches, also auch künftige Hände.
  Für den Ereignisstrom wird genau deshalb alles entfernt (`export.js:223–225`, Prüfer C 2.2, C-4). `PAI_INTEGRATION.md` begründet damit sogar, dass der Ereignisstrom keine Handnummer trägt. Für das Gedächtnis schickt das Dokument PAI dann aber über die Sicherung, die Seed und Handnummer enthält. Das widerspricht sich.
  Der PAI-Adapter 0.1.0 übernimmt `seed`, `no`, `tseed`, `session` und `decisions` heute nicht. PAI selbst ist also derzeit sauber. Der Änderungsauftrag macht daraus aber keine Pflicht: Er nennt nur „`halfLife`, `opponents` und Lerndaten weiter nicht übernehmen“, nicht `seed`, `no`, `tseed`, `session`, `decisions` und `table`. Die Aussage „PAI erhält fremde Karten nur aus aufgedeckten Blättern“ ist damit eine Eigenschaft des heutigen PAI-Codes, keine abgesicherte Zusage.
- **Reproduktion:** `node /tmp/E_scripts/leak.js` baut aus `seed` und `no` einer Sicherung 20 von 20 Heldenblättern nach. Die 32 aufgedeckten Blätter stimmen überein, 84 nie aufgedeckte Blätter werden rekonstruiert. Beispiel Hand 3: aufgedeckt waren nur Platz 0 und 3, nachgebaut sind alle sechs Blätter.
- **Vorschlag:** In den Änderungsauftrag eine Positivliste der Felder aufnehmen, die PAI übernehmen darf, und ausdrücklich verbieten, `seed`, `no`, `tseed`, `session`, `decisions`, `table`, `settings` oder `learning` zu übernehmen. Dazu einen PAI-Test, der prüft, dass `pai.hand` keines dieser Felder enthält. Besser noch: Der Trainer bietet eine eigene „Sicherung für externe Engines“ ohne Seed-Felder an. Oder der Ereignisstrom bekommt einen stabilen, nicht sprechenden Zeitschlüssel (Reihenfolge statt Zeitstempel), damit das Gedächtnis ohne Seed auskommt.

### E23-2 – Mittel – Der Integrationstest „Keine Datenleckage“ ist wirkungslos; PAI akzeptiert Karten gefoldeter Spieler

- **Datei/Zeile:** `tests/pai-integration.mjs:83–86`; PAI `src/data/hand.js` (Prüfung von `shown`: nur Platz, Anzahl und Dubletten).
- **Beschreibung:** Prüfung (9) vergleicht die Plätze in `pai.hand.shown` mit `src.shown`, also mit der Eingabe derselben Umwandlung. Ein Leck in den Daten des Trainers kann so nie auffallen. Die zweite Bedingung sucht `"cards":[`. In `pai.hand` sind Karten aber Strings, die Bedingung trifft also nie zu.
  PAIs `validateHand` prüft außerdem nicht, ob ein Platz mit aufgedeckten Karten beim Showdown noch im Spiel war.
- **Reproduktion:** `node /tmp/E_scripts/vacuous.mjs` schreibt in 20 Hände je ein verdecktes Blatt eines gefoldeten Spielers in `shown` (aus Seed und Handnummer nachgebaut). PAI nimmt alle 20 Hände ohne Fehler an. Prüfung (9) meldet „0 Funde“.
- **Vorschlag:** Im Test gegen die tatsächlich aufgedeckten Blätter prüfen: `shown` nur für Plätze, die am Showdown beteiligt sind, ungefoldet nach der letzten Aktion. Dazu ein Negativtest mit eingeschleustem Leck, der rot werden muss. Im Änderungsauftrag für PAI ergänzen: `validateHand` lehnt `shown` für gefoldete Plätze ab.

### E23-3 – Mittel – Trainingsszenarien verfälschen PAIs Gegnergedächtnis

- **Datei/Zeile:** `assets/js/ui/app.js:719` (`if (!h.isTraining)`: nur echte Hände zählen für die Gegnerdatenbank), `app.js:729` (Trainingshände werden mit `training: curCat` gespeichert), `assets/js/engine/training.js:480–505` (`generate`: Gegner nach Skript, z. B. `stealThenFold` und `foldToHero`; Heldenaktionen vor der Zielsituation spielt die Gegner-KI `g004`; Auswahl der Hände durch Verwerfen), `export.js:225` (Ereignisstrom löscht `training`); PAI `adapters/pokertrainer.js` (setzt für alle Hände `origin: 'training'` und wertet `rec.training` nicht aus).
- **Beschreibung:** Der Trainer zählt Szenariohände bewusst nicht für die Gegnerwerte. In der Sicherung stehen sie aber zusammen mit den echten Händen, und PAI übernimmt sie ohne Kennzeichen als normale Beobachtungen. Geskriptete Gegneraktionen, ausgewählte Situationen und Heldenaktionen, die nicht vom Spieler stammen, fließen so in PAIs Profile ein (VPIP/PFR, Muster, Hypothesen). Im Ereignisstrom fehlt das Kennzeichen ganz.
  Weder Änderungsauftrag noch PAI_INTEGRATION.md erwähnen das.
- **Reproduktion:** `node /tmp/E_scripts/train.mjs`: 30 Szenariohände „blind-defense“. PAI übernimmt 30 von 30, die PAI-Hand enthält kein Trainingskennzeichen, und in den Gegnerprofilen von PAI stehen 31 PFR-Zähler aus Szenariohänden.
- **Vorschlag:** Änderungsauftrag Punkt 1 ergänzen: Hände mit `training != null` nicht übernehmen oder als eigene Herkunft (`origin: 'scenario'`) markieren und vom Gedächtnis ausschließen. Im Ereignisstrom `training` als boolesches Kennzeichen behalten, das verrät keinen Seed. Integrationstest mit Szenariohänden ergänzen.

### E23-4 – Niedrig bis mittel – Der Kanal „pai“ lässt sich nicht gültig füllen

- **Datei/Zeile:** `assets/js/engine/export.js:251` (`if (e.recommendations.pai !== null) return … 'Kanal „pai“ wird vom Trainer nicht gefüllt'`), `docs/PAI_INTEGRATION.md` Abschnitt 3, `docs/PAI_AENDERUNGSAUFTRAG.md` Abschnitt „Unabhängigkeit“.
- **Beschreibung:** Laut Dokumentation bleibt der Kanal leer, „bis PAI ihn selbst füllt“. `PT.events.validate` lehnt aber jeden gefüllten Kanal ab. Ein von PAI ergänzter Strom ist damit für den Trainer immer ungültig. Es fehlen außerdem:
  - ein Schema für den Kanal (Felder, Einheiten, Engine-Kennung),
  - eine Regel für die Prüfsumme nach dem Ergänzen (`contentHash` = fnv1a über `JSON.stringify(payload)` in der Schlüsselreihenfolge von JavaScript; andere Sprachen können das kaum nachbilden),
  - eine Versionsregel (bleibt Schema 1?).
- **Reproduktion:** Kanal mit `{engine:'pai', action:{type:'fold'}}` füllen, `contentHash` neu berechnen. `PT.events.validate` meldet: „Hand 1, Ereignis 1: Kanal „pai“ wird vom Trainer nicht gefüllt“.
- **Vorschlag:** Das Kanalschema festlegen (z. B. `{engine:'pai', softwareVersion, modelVersion, action:{type,amount}, equity, alternatives[]}`). Die Prüfung so umbauen, dass sie Schreibrechte der Erzeuger prüft (`software.name` ≠ PokerTrainer darf nur `pai` schreiben) statt den Kanal pauschal abzulehnen. Die Prüfsumme kanonisch definieren oder je Kanal getrennt führen. Das gehört in den Änderungsauftrag oder in ein eigenes Schnittstellendokument.

### E23-5 – Niedrig – Änderungsauftrag und PAI_INTEGRATION.md: Ungenauigkeiten und Widersprüche

- **Datei/Zeile:** `docs/PAI_AENDERUNGSAUFTRAG.md:15–18`, `:31`; `docs/PAI_INTEGRATION.md:1`, `:15–24`; PAI `docs/DATENBANKSCHEMA.md`.
- **Beschreibung:**
  1. Die Tabelle nennt `agg` als neu in Version 3. Die PAI-Testdatei (Version 2, App 2.0.1) enthält `agg` bereits, und `REC_KEYS_V2` in `stats.js:312` auch. Neu in Version 3 sind `recent`, `cards` und `chg`; `cards` und `chg` fehlen in der Tabelle.
  2. „Lerndaten: zusätzlich Feld `pp`“ ist keine Änderung von Version 2 zu 3. `pp` kam mit 2.2 innerhalb von Version 3 (CHANGELOG 2.2). Sicherungen aus 2.1 sind Version 3 ohne `pp`.
  3. „`payload.hands[]` unverändert `v: 1`“: Die PAI-relevanten Felder sind unverändert. Seit 2.0.1 sind aber `tseed`, `tags` und `decisions[].x` hinzugekommen, und die Aktionen tragen `pot`, `cur`, `tc` und `cr`. „Unverändert“ sollte auf „PAI-relevante Felder unverändert, zusätzliche optionale Felder“ präzisiert werden.
  4. Punkt 3 verweist auf `docs/DATENBANKSCHEMA.md`, „Abschnitt Adapter“. Diesen Abschnitt gibt es in PAI nicht. Abschnitte sind: Logische Bereiche, SQLite, IndexedDB, Schlüssel, Profil, Sicherung PAI-Backup, Migration. Die Kopfzeile des Adapters („Version 2“, Zeile 1) und `docs/module/A_*` werden nicht erwähnt.
  5. `PAI_INTEGRATION.md` ist nicht auf 2.3 aktualisiert. Es spricht von 2.2, nennt „40 von 40 Händen“ (der Test prüft 60) und erwähnt den Änderungsauftrag nicht. Laut Zeile 21 änderte Version 3 „nur die Gegnerdatensätze“; der Änderungsauftrag nennt dagegen auch `halfLife` im Kopf.
- **Reproduktion:** Fixture `tests/fixtures/pokertrainer-sicherung.json` in PAI enthält `"version":2` und `"agg":{…}`. `grep -n '^#' docs/DATENBANKSCHEMA.md` in PAI.
- **Vorschlag:** Tabelle korrigieren, Zielabschnitt benennen (neuer Abschnitt „Import: PokerTrainer-Backup Version 2 und 3“ oder `docs/module/A_Trainingsdaten.md`). PAI_INTEGRATION.md auf 2.3 bringen und auf den Änderungsauftrag verweisen. Die Auflagen aus E23-1 bis E23-3 in den Auftrag aufnehmen. Ohne sie ist der Auftrag zwar für das Lesen ausreichend (eine Zeile, an einer Kopie belegt), aber nicht für die Datenhygiene.

### E23-6 – Niedrig – Push/Fold-Text: B23-10 nur teilweise behoben

- **Datei/Zeile:** `assets/js/engine/coach.js:441–443` (`chartRef`), `:449` (`kind`), `:688` (Fold-Satz „gehört laut …“), `:699`, `:790–792` (`chartCapText`).
- **Beschreibung:** Bei 11 BB effektiv, UTG mit Q2o, lautet der Text auf Einsteiger-Stufe und in der Sprachausgabe (459 Zeichen):
  „Fold: Q2o gehört laut Handauswahl des Push/Fold-Modellspiels bei 11 BB effektiv nicht zu den spielbaren Händen. Preflop folgt der Coach hier der Handauswahl des Push/Fold-Modellspiels bei 11 BB effektiv (vereinfachtes Spiel …; die Größe wählt das EV-Modell); das vereinfachte EV-Modell sähe All-in um 0,0 BB vorn, aber nur wegen Fold-Annahmen …“
  - Die Bezeichnung steht weiterhin doppelt.
  - „um 0,0 BB vorn“ und in der Bewertung „rechnet zwar mit 0,0 BB mehr“ sind sinnlos, wenn der Abstand auf 0 gerundet wird.
  - „die Größe wählt das EV-Modell“ steht bei einer Fold-Empfehlung.
  - „laut Handauswahl …“ ohne Artikel.
  - Der Text ist länger als die Projektvorgabe „Begründung in einem Satz“.
  - Unter 3 BB effektiv steht „bei 2 BB effektiv“. `pfRow` (`ranges.js:106`) begrenzt aber auf die gelöste Untergrenze von 3 BB; das Modellspiel ist für 2 BB nicht gelöst.
  - Ein Test für den Text fehlt weiterhin.
- **Reproduktion:** `node /tmp/E_scripts/pf.js` (Tisch mit 12 BB, Seed 777).
- **Vorschlag:** Die Klammer aus `chartRef` nur einmal und nur auf der Stufe „fortgeschritten/experte“ ausgeben. Den Satz „das vereinfachte EV-Modell sähe …“ nur bei einem Abstand von mindestens 0,05 BB bringen. BB-Angabe auf den Gültigkeitsbereich begrenzen („unter 3 BB: Handauswahl wie bei 3 BB“). Für die Sprachausgabe nur den ersten Satz verwenden. Einen Texttest ergänzen.

### E23-7 – Niedrig – D23-3 nicht wirksam behoben (Erfolgsmeldung ohne Download, leerer Export)

- **Datei/Zeile:** `assets/js/ui/app.js:45–53` (`download` gibt im Claude-Pfad sofort `true` zurück und sonst `true` nach `a.click()`; `false` nur bei einer Ausnahme), `assets/js/ui/views.js:99–100`.
- **Beschreibung:** Der in D23-3 gemeldete Fall, ein still blockierter Anker-Download, löst keine Ausnahme aus. Die Prüfung `okDl !== false` ändert dort also nichts. Im Claude-Pfad erscheint bei einem Fehler zuerst die Erfolgsmeldung und dann „Speichern nicht möglich“. Bei 0 Händen entsteht weiterhin eine Datei mit dem Hinweis „0 Entscheidungen aus 0 Händen“.
- **Reproduktion:** `node /tmp/E_scripts/pw5.js` (iframe `sandbox="allow-scripts allow-same-origin"`): 0 Downloads, Meldung „Ereignisstrom: 0 Entscheidungen aus 0 Händen.“ `node /tmp/E_scripts/pw4.js`: leerer Export lädt `PokerTrainer_Ereignisse_v1_…json`.
- **Vorschlag:** Wie in D23-3 vorgeschlagen: In eingebetteten Kontexten („Download angestoßen – falls nichts erscheint …“ oder Text zum Kopieren) den Erfolg nicht behaupten. Im Claude-Pfad auf das Promise warten. Bei 0 Händen einen Hinweis statt einer Datei zeigen. Die CHANGELOG-Aussage zu D23-3 relativieren.

### E23-8 – Niedrig – D23-1: Sperre wirkt, ist aber nicht sichtbar

- **Datei/Zeile:** `assets/js/ui/views.js:79–80` (Knöpfe ohne Berücksichtigung von `PTUI.exportBusy`), `:96–102`.
- **Beschreibung:** Nach einem Ansichtswechsel während eines Exports sind beide Exportknöpfe aktiv dargestellt (`disabled:false`, kein `aria-disabled`/`aria-busy`). Ein Klick zeigt nur kurz „Ein Export läuft bereits.“ Ohne Fortschrittsanzeige weiß der Nutzer nicht, dass ein Export läuft. Funktional verhindert die Sperre zweite Worker, das ist bestätigt.
- **Reproduktion:** `node /tmp/E_scripts/pw4.js` (Worker künstlich um 3 s verzögert): `{"bench":false,"events":false,"busy":true,"ariaB":null}`, zweiter Klick zeigt „Ein Export läuft bereits.“
- **Vorschlag:** Beim Rendern `disabled` und `aria-disabled` aus `PTUI.exportBusy` setzen und eine dauerhafte Statuszeile „Export läuft …“ anzeigen.

### E23-9 – Niedrig – Neue Größenangabe in aufgedeckten Blättern: nicht dokumentiert, nicht erklärt

- **Datei/Zeile:** `assets/js/engine/stats.js:165–167`, `assets/js/ui/views.js:331–335` (`oppShownHtml`), `CHANGELOG.md` 2.3, `docs/BENCHMARK_EXPORT.md:81`, `export.js:207` (`EV_SCHEMA = 1`).
- **Beschreibung:** Seit 2.3 enthält `shown[].actions` Texte wie „Bet 3,00 (0,5 Pot)“. Das betrifft die Gegnerdatenbank, die Sicherung, den Benchmark (`knownAtDecision.opponents`) und den Ereignisstrom (`observed.opponents`). Im CHANGELOG und in BENCHMARK_EXPORT.md fehlt der Hinweis, und die Schema-Versionen bleiben 1. Ältere und neue Einträge stehen gemischt nebeneinander.
  PAI liest diese Texte heute nicht, ein künftiger Leser des Ereignisstroms muss aber beide Formen kennen. Im Gegnerdialog wird „(0,6 Pot)“ nicht erklärt. Durch C23-7 erscheinen drei Nachkommastellen („(0,333 Pot)“), bei All-in „Bet 77,50 (All-in) (1,2 Pot)“.
- **Reproduktion:** `node /tmp/E_scripts/pw2.js` zeigt die Dialogzeile „Turn: Bet 1,50 (0,6 Pot)“; ein Erklärtext ist nicht vorhanden.
- **Vorschlag:** CHANGELOG und BENCHMARK_EXPORT.md ergänzen („Größe der Bet relativ zum Pot vor der Bet, bis zu drei Stellen, seit 2.3; ältere Einträge ohne“). In der Oberfläche auf zwei Stellen runden (die Tabellenklasse bleibt intern auf drei Stellen) und einen Tooltip oder Hilfetext „Anteil am Pot“ zeigen. Bei All-in „(All-in, 1,2 Pot)“.

### E23-10 – Hinweis – „Raise …: Die Bet gewinnt den Pot“

- **Datei/Zeile:** `assets/js/engine/coach.js:696`.
- **Beschreibung:** Bei Raises und Preflop-Opens heißt es „Raise 2,5×: Die Bet gewinnt den Pot geschätzt …“ bzw. „Open 3 BB (All-in): Die Bet gewinnt …“. Fachlich ist das ein Raise. Gesehen im Browser und in `pf.js`; nicht neu in 2.3.
- **Vorschlag:** Je nach Aktionsart „Der Raise“, „Die Bet“ bzw. „Der Einsatz“ wählen.

### E23-11 – Hinweis – PAI-Integrationstest kann CI nicht absichern

- **Datei/Zeile:** `tests/pai-integration.mjs:21` (`process.exit(0)` ohne PAI), Ende ohne Exit-Code.
- **Beschreibung:** Bei 14 von 15 ist der Exit-Code 0, ohne PAI-Arbeitsstand ebenfalls (übersprungen). Neue Inkompatibilitäten fallen nur auf, wenn jemand die Ausgabe oder `ERGEBNISSE_2.3.md` liest.
- **Vorschlag:** Bekannte Fehler ausdrücklich erlauben (Liste `expectedFail`) und sonst mit 1 enden.

### E23-12 – Hinweis – Modus „nachher“: altes Urteil bleibt während der nächsten Entscheidung stehen

- **Beschreibung:** Zu Beginn einer Hand steht „Das Urteil erscheint, nachdem du gehandelt hast.“ Auf späteren Straßen derselben Hand zeigt die Box während der neuen Entscheidung noch das Urteil der vorigen, z. B. „Ungenau … Empfohlen war Bet ½ Pot“. Das verrät die aktuelle Empfehlung nicht, kann aber als aktueller Hinweis missverstanden werden. Beobachtet mit `pw1.js`; vermutlich nicht neu.
- **Vorschlag:** Beim eigenen Zug das alte Urteil einklappen oder mit „vorige Entscheidung“ beschriften.

### E23-13 – Hinweis – Umfang der Sicherung für PAI

- **Beschreibung:** 60 simulierte Hände ergeben 2,13 MB, also rund 35 KB je Hand. 86 % davon sind `decisions[].snap` (vollständige Gegnerdatensätze je Entscheidung), die PAI nicht liest. Hochgerechnet auf 3.000 Hände sind das rund 106 MB, die PAI ganz einlesen muss. Später, mit mehr aufgedeckten Blättern je Gegner, eher mehr.
- **Vorschlag:** Siehe E23-1: eine schlanke Sicherung für externe Engines ohne `decisions`, Seeds und Tisch.

### E23-14 – Hinweis (Vermutung) – Kürzung in `shownEntry`

- **Datei/Zeile:** `assets/js/engine/stats.js:167`.
- **Beschreibung:** Würde eine Straße 300 Zeichen überschreiten, wird nur die überlange Aktion verworfen. Spätere, kürzere Aktionen werden weiter angehängt. Dann entsteht eine Folge mit Lücke, z. B. ein Call ohne den vorherigen Raise. `shownPairs` wertet sie mit falscher Lage aus. Mit der Gegner-KI ist das praktisch nicht erreichbar.
- **Vorschlag:** Nach der ersten Überschreitung die Straße abschließen, z. B. mit „…“.

## Antwort auf die Prüffragen zu PAI

- **Versionsprüfung:** Bestätigt. PAI 0.1.0 lehnt Format 3 ab. Eine einzige Codezeile reicht aus, belegt an einer Kopie (60 von 60) und in meiner Querprüfung mit 1.500 Händen. Unbekannte Versionen bleiben abgelehnt.
- **Hand-Format:** Kompatibel. Die zusätzlichen Felder werden ignoriert. Trainingshände sind ein inhaltliches Problem (E23-3).
- **Kanäle:** getrennt, aber der PAI-Kanal ist nicht befüllbar (E23-4).
- **Datenleckage:** Heute keine in PAI. Die Eingabedatei enthält aber das Orakel, der Auftrag sichert das nicht ab, und der Test ist wirkungslos (E23-1, E23-2).
- **Reproduzierbarkeit:** bestätigt, auch in getrennten Prozessen.
- **Größenangaben:** keine Inkompatibilität für PAI 0.1.0, weil PAI die Texte in `opponents` nicht liest. Es fehlt die Dokumentation (E23-9).
- **Ist der Änderungsauftrag präzise und ausreichend?** Für das reine Lesen von Format 3 ja. Er enthält aber sachliche Ungenauigkeiten (E23-5). Für Unabhängigkeit und Datenhygiene fehlen die Auflagen aus E23-1 bis E23-3.

## Nicht geprüft

- Echte Sprachausgabe mit deutscher Stimme: Headless-Chrome hat keine lokale deutsche Stimme. Geprüft habe ich den Schalter, die Statuszeile, `#ohne-sprache` und den gesprochenen Text über `a.text.speech`.
- Echte Claude-Vorschau (nur nachgebildet).
- Screenreader auf Geräten (nur axe und ariaSnapshot).
- Vollständige e2e-Suite außer `a11y` und `cd`.
