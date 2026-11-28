# Prüfung D – PokerTrainer 2.2 (Softwarequalität, Performance, Sicherheit)

Prüfstand: Zweig `entwicklung-2.2`, Commit `7a2413a`; Vergleich `sicherung-2.1.0` (`/home/claude/wt-v210`, Commit 270ed7e).
Arbeitskopie `/home/claude/review22/D/repo` (keine Datei im Repository geändert), Skripte in `/home/claude/review22/D/skripte/`.
Rechner: 2 Kerne, parallel lief `compare.js --plan v22 --jobs 2` (Last 2,4–3,6). Alle Zeiten sind deshalb eher zu hoch;
2.2 und 2.1.0 wurden immer **abwechselnd an derselben Entscheidung im selben Prozess** gemessen, damit beide dieselbe Last tragen.

## Befunde

### D-1 (mittel) Ereignisstrom: Seeds im `handRecord` machen alle verdeckten Karten rekonstruierbar
- Datei: `assets/js/engine/export.js` Z. 218 (`x.handRecord = h ? strip(h) : null`), Felder `seed`, `tseed` aus `training.makeHandRecord`.
- Beschreibung: Der neue Ereignisstrom verspricht „Keine verdeckten Karten anderer Spieler“ und eine Trennung „nie für die Entscheidung derselben Hand“
  (`separation`, docs/PAI_INTEGRATION.md). `handRecord` enthält aber den Tisch-Seed und die Handnummer. Das Deck ist
  `PT.cards.shuffledDeck(PT.rng.stream(seed, 'deal', no))`. Damit kennt eine Engine, die den Strom liest, die Hole Cards aller Gegner und alle
  späteren Boardkarten, und zwar nicht nur für diese Hand, sondern für **jede Hand der Session** (gleicher Tisch-Seed). Eine Engine, die den Strom der
  Reihe nach abarbeitet und `afterHand`/`handRecord` früherer Hände als „Gedächtnis“ nutzen darf, sieht ab Hand 2 die Karten aller späteren Hände.
  Die Prüfung `validateEvents` erkennt das nicht (sie prüft nur `observed`).
- Reproduktion: `node skripte/seed-leck.js /home/claude/review22/D/repo` (25 Hände, `tests/app-sim.js`, Seed 98765).
- Erwartet: Aus dem Export sind nur aufgedeckte Karten ableitbar. Tatsächlich: Heldenkarten 25/25, aufgedeckte Gegnerkarten 30/30 exakt
  reproduziert, damit 110 verdeckte Gegnerblätter (und die Boards späterer Straßen) ableitbar.
- Vorschlag: In `buildEvents` `seed` und `tseed` aus `handRecord` entfernen (bzw. eigener, ausdrücklich gekennzeichneter Abschnitt „reproduction“
  nur auf Wunsch); `validateEvents` um „kein Seed in handRecord“ ergänzen; Test in `tests/unit/strategie-22.js`. Im Benchmark-Export (2.1) ist
  `deal.tableSeed` dokumentiert und gewollt; dort ist es eine bewusste Entscheidung, im Ereignisstrom widerspricht es der eigenen Zusage.

### D-2 (mittel) Export Ereignisse: lange Blockade des Hauptthreads und sehr große Zeichenketten
- Datei: `assets/js/ui/views.js` Z. 94; `assets/js/engine/export.js` Z. 203–222.
- Beschreibung: Der Export läuft im Hauptthread. `buildEvents` ruft `build()` (Benchmark inklusive eigener Prüfsummen-Serialisierung), serialisiert
  `out` für die Prüfsumme, `text()` serialisiert erneut, und die Oberfläche parst das Ergebnis vollständig (`JSON.parse(et)`), nur um zwei Zähler
  für die Meldung zu lesen. Je Entscheidung ≈ 10 KB `observed` (davon ≈ 7 KB Gegnerwerte).
- Reproduktion: `node skripte/export-zeit2.js <repo> 1000` und `node --max-old-space-size=2048 skripte/export-zeit.js <repo>` (Hände aus
  `app-sim.js` vervielfältigt; unter Last gemessen).
- Gemessen: 1.000 Hände (3.397 Entscheidungen): Aufbau 2,6 s + Serialisierung 0,7 s + Parsen in der Oberfläche 1,6 s ≈ 5 s, 71 MB.
  3.000 Hände (Obergrenze der Handhistorie, 10.200 Entscheidungen): 18,3 s + 5,4 s Parsen ≈ 24 s eingefroren, 212 MB Zeichenkette
  (Benchmark-Export 2.1 zum Vergleich: 10,1 s + 5,1 s, 282 MB – bestehendes Problem, durch den neuen Export verdoppelt).
- Erwartet: Oberfläche bleibt bedienbar, kein Speicherrisiko auf Mobilgeräten. Tatsächlich: mehrere bis über 20 Sekunden ohne Reaktion; auf
  Geräten mit wenig Speicher droht ein Tab-Absturz.
- Vorschlag: Zähler aus dem Objekt statt aus `JSON.parse` lesen (`PT.events.build` liefert `hands`/`events`); in `buildEvents` die Prüfsumme von
  `build()` nicht berechnen (Option) und `out` nur einmal serialisieren; Export im Analyse-Worker erzeugen (Worker ist vorhanden) und als Blob
  herunterladen; ggf. Gegnerwerte je Hand statt je Entscheidung ablegen.

### D-3 (gering) Ereignisstrom: Coach-Empfehlungen stehen im `handRecord`
- Datei: `assets/js/engine/export.js` Z. 218.
- Beschreibung: `separation` sagt „keine Engine sieht die Empfehlung der anderen“. `handRecord.decisions[]` enthält `rec`, `evs`, `grade`, `loss`
  des PokerTrainer-Coaches. Nach der Hand ist das für Auswertung vertretbar, steht aber im Widerspruch zum Wortlaut; eine PAI-Engine mit Gedächtnis
  kann daraus die Coach-Empfehlungen früherer Hände lernen.
- Reproduktion: `node skripte/hr-dec.js <repo>` → Felder `i,st,chosen,rec,cls,eq,need,grade,score,loss,cats,tags,evs,…`.
- Vorschlag: Coach-Felder aus `handRecord.decisions` entfernen oder die Trennungszusage präzisieren („nach der Hand sichtbar“).

### D-4 (gering) `PT.events.validate` wirft Ausnahmen statt einer Meldung
- Datei: `assets/js/engine/export.js` Z. 226–240.
- Beschreibung: Bei strukturell falschen, aber prüfsummengültigen Eingaben (`payload: [{}]`, `[null]`, Ereignis ohne `publicView`) entsteht
  `TypeError` (`hnd.events.length`, `k.publicView.players`). Die Funktion ist für Empfänger gedacht (Rückgabe null oder Fehlertext).
- Reproduktion: `node skripte/sicherheit.js <repo>` → `events.validateRobust`.
- Vorschlag: `Array.isArray(hnd && hnd.events)`, `k.publicView && Array.isArray(k.publicView.players)`, `Array.isArray(k.actions)`,
  `Array.isArray(k.board)` prüfen bzw. den Rumpf mit `try/catch` → „Struktur ungültig“ umschließen.

### D-5 (gering) Range-Schätzung: Zelle mit fester Spielerzahl 6
- Datei: `assets/js/engine/ranges.js` Z. 487 (`cellAt(actions, idx, seat, pfaSeat, 6)`).
- Beschreibung: `cellAt` zählt Mitspieler über die Sitze 0…nPlayers−1, die nicht gefoldet haben. Mit fester 6 zählen bei Händen mit 2–5 Spielern
  nicht vorhandene Sitze als „im Pot“; jede Entscheidung wird als Mehrgegnerzelle (`|m`) behandelt. `actionCell` (Erhebung der Tabelle) nutzt dagegen
  `v.players.length`. Am Trainertisch (immer 6 Plätze) folgenlos; betroffen sind Engine-Aufrufe und importierte Hände mit `n` 2–5 (laut `validHand`
  zulässig), etwa bei der Nachanalyse in der Handhistorie und im Benchmark/PAI-Abgleich.
- Reproduktion: `node skripte/einheit.js <repo>` → `cellAt.HU2Spieler "1|fr|h"` gegen `cellAt.mit6 "1|fr|m"` für dieselbe Heads-up-Aktionsfolge.
- Vorschlag: `narrowPostflop` die Spielerzahl übergeben (`v.players.length` aus `buildRange`) und an `cellAt` weiterreichen.

### D-6 (gering) Randwert `POP.tabBlend = 0` liefert die reine Tabelle
- Datei: `assets/js/engine/ev.js` Z. 298–310.
- Beschreibung: Für `tabBlend` 0 wird nicht gemischt, aber `if (tr) return tr` gibt die reine Aktionstabelle zurück, also das Gegenteil des
  Gewichts 0 (erwartet: Modell 2.1). Nur für Studien relevant (Standard 0,5). `finally { POP.tabOff = false; }` setzt fest auf false statt auf den
  Vorwert; unkritisch, weil der Zweig nur bei `tabOff === false` betreten wird.
- Reproduktion: `skripte/einheit.js` → `tabBlend0.modell "tab f=0.6544 (2.1-Modell f=0.5343, pop)"`.
- Vorschlag: `if (tr && POP.tabBlend > 0)` vor `return tr`; im `finally` den gesicherten Vorwert zurückschreiben.

### D-7 (gering) Lerndaten `pp`: Prüfung nicht so streng wie die übrigen Felder
- Datei: `assets/js/engine/training.js` Z. 367 (`validPP`).
- Beschreibung: Typen, Wertebereiche, Kategorien und Längen werden geprüft (alle 15 Manipulationsfälle mit falschen Typen/Werten abgelehnt bzw.
  repariert, siehe unten). Angenommen werden aber unbekannte Zusatzfelder in Test und Eintrag (2-MB-Zusatzfeld akzeptiert und dauerhaft
  gespeichert), Einträge mit `cat` außerhalb von `cats`, `post: []` mit `state: 'fertig'`. Sonst gelten feste Schlüssellisten (`DEC_KEYS`,
  `HDEC_KEYS`, `onlyKeys`). Kein XSS, da diese Felder nicht ausgegeben werden.
- Reproduktion: `skripte/sicherheit.js` → `ppFaelle`.
- Vorschlag: Schlüssellisten für Test (`id, ts, cats, state, pre, post`) und Eintrag (`cat, seed, s, l`); `cats.indexOf(it.cat) >= 0`;
  `pre.length === post.length === cats.length · PP_PER` oder höchstens 40.

### D-8 (gering) Prototyp-Schlüssel in der Lernanzeige
- Datei: `assets/js/engine/training.js` Z. 290–300 (`AREAS[c]`), `assets/js/ui/views.js` Z. 502 (`PT.coach.SPOTS[t]`) und `MISTAKES[r.cat]`.
- Beschreibung: `TAG_RE` (`^[a-z0-9-]{1,32}$`) lässt `constructor` zu. Aus manipulierten Lerndaten erscheint in „Fehlerfelder“ bzw. „Wiederkehrende
  Fehler“ der Text „function Object() { [native code] }“ (escaped, keine Ausführung).
- Reproduktion: `skripte/sicherheit.js` → `lernanzeige`.
- Vorschlag: Nachschlagen mit `Object.prototype.hasOwnProperty.call(...)` (wie `hasScen`).

### D-9 (gering) Vorher-Nachher-Test: Test wird vor der Prüfung „laufende Hand“ angelegt
- Datei: `assets/js/ui/views.js` Z. 492.
- Beschreibung: `prePostNew` und `persistLearning` laufen, bevor `PTUI.startTraining` wegen einer laufenden Hand abbricht. Jeder weitere Klick legt einen
  neuen, verwaisten Test an; angezeigt werden nur die letzten drei, und nach 30 Klicks fallen ältere, auch abgeschlossene Tests aus `L.pp` (`PP_MAX`).
- Vorschlag: Vor `prePostNew` auf `S.hand && !S.hand.done` (und Schreibschutz) prüfen bzw. den Test erst beim tatsächlichen Start anlegen.

### D-10 (gering) Veraltete Versionsangaben
- `index.html` Z. 19 `og:title` und Z. 25 `og:image:alt` „PokerTrainer 2.1“, `assets/js/worker.js` Z. 1 Kopfkommentar „2.1“ (in
  `dist/PokerTrainer_2.2.html` fünf Fundstellen „PokerTrainer 2.1“). `tools/check-version.js` erkennt das nicht.
- Vorschlag: Texte anpassen, `check-version.js` um `og:title`/`og:image:alt` erweitern.

### D-11 (gering, besteht seit 2.1.0) Beschriftung bei Stack unter 2,5 BB
- Beschreibung: SB mit 2 BB Stack, ungeöffneter Pot: Empfehlung „Open 2,5 BB (All-in)“, Betrag 200 = 2 BB (Betrag korrekt, Text und gesprochener Tipp
  nennen 2,5 BB). Identisch in 2.1.0.
- Reproduktion: `node skripte/dbg-label.js <repo> /home/claude/wt-v210`.
- Vorschlag: Bei All-in unter der Nenngröße die tatsächliche Größe nennen („All-in 2 BB“).

## Geprüft und in Ordnung

### Sicherheit
- CSP `index.html` unverändert gegenüber 2.1.0 (`default-src 'self'; script-src 'self'; … connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`).
- Offline-Datei `dist/PokerTrainer_2.2.html`: CSP wie 2.1 (`default-src 'none'; script-src 'unsafe-inline' blob:; connect-src 'none'; …`);
  einzige externe Adressen sind zwei Links (GitHub-Repository, GitHub-Datenschutz) zum Anklicken, nichts wird geladen; `importScripts` nur im
  Worker-Zweig `!self.PT` (in der Einzeldatei nicht aktiv).
- Keine neuen Netzwerkzugriffe (`fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`), kein `eval`/`new Function` in `assets/js`;
  der Diff gegen 2.1.0 enthält kein neues `innerHTML`/`insertAdjacentHTML`.
- Neue Ausgaben (`learnPanels`, Hypothesen, Belastbarkeit je Wert, Knopf „Export Ereignisse“): alle Texte aus Daten über `esc()`, Zahlen über
  `num`/`n0`/`pc`/`ciTxt` (numerisch bzw. escaped), Attribute `data-train`/`data-pprun` escaped, Rückweg über `hasScen` bzw. ID-Vergleich.
- Importpfad `pp` (`validLearning`, `repairLearning`, `stats.dbImport`, `dataport`): 15 Manipulationen (HTML in ID, unbekannter Zustand, leere/unbekannte
  Kategorien inkl. `__proto__`/`constructor`, Werte außerhalb, Typfehler, zu lange Listen, `pp` kein Array, 31 Tests) abgelehnt, Reparatur entfernt
  den Eintrag; `prePostRecord` mit fremden Schlüsseln (`__proto__`, Index 99, Phase `mid`, `constructor`) → false, Lerndaten bleiben gültig.
- Hypothesen mit Randdaten (leer, alle Werte 100 %, 0 % bei 1e9 Gelegenheiten, aufgedeckte Blätter mit kurzem Board) ohne Ausnahme.
- Ereignisstrom: keine Karten fremder Plätze im `observed`, keine Karten in `handRecord.seats`, keine URLs; `validate` des echten Exports = null.

### Softwarequalität (Engine)
- Fuzz-Test `skripte/fuzz.js` (feste Uhr): 1.105 Hände mit 2–6 Spielern, Stacks 1 Cent bis 1.000 BB, zufällige Größen und 25 % Raise/All-in
  (All-in-Ketten, Side Pots), 5.014 Analysen für den jeweils handelnden Platz, mit und ohne echte Gegnerwerte (1.500 Hände Bots gegen Bots):
  0 Ausnahmen, 0 nicht endliche EVs, 0 Empfehlungen außerhalb `minTo…maxTo`, 0 × mehr als 5.000 Simulationen, `POP.tabOff` nie hängen geblieben.
  Stack 0 lehnt `PT.Hand` bewusst ab („mindestens 1 Cent“), 7–9 Spieler ebenso („2 bis 6 Spieler“).
- Tabellen (`skripte/einheit.js`): LIK 1.862 Zellen, Summen = 1 (Rundung ±0,0001), keine negativen Werte; alle 1.000 Zellen, die `cellAt`/`likRespond`
  erzeugen können, finden über die Rückfallstufen Daten (0 fehlend), `likRespond` fällt sonst sauber auf 2.1 zurück. PF: 10 Stacks, je 5 Jam- und
  15 Call-Zeilen, alle 169 Ziffern; `pfRow`/`chart('push'|'callPush')` mit bb 0, 0,5, 2,99, 25,01, 1e9, NaN, −5, ∞, undefined und unbekannten
  Positionen ohne Ausnahme und ohne NaN (`o.bb || 10`, Klemmung 3–25); `scaleWidth` gültig für f = 0, 1e−9, NaN, −1, 100, monoton, leere Zeile → 0.
- `oppAdjust` mit Extremwerten 0/1 der geglätteten Werte: gültige Verteilungen. NaN wäre schädlich (NaN-Gewichte), ist aber nicht erreichbar:
  `agg`-Zähler werden beim Import als ganze Zahlen ≥ 0 geprüft (`stats.js` Z. 372 f.), `smooth` liefert alle benötigten Schlüssel.
- `POP.tabOff`: `try/finally` wirkt; Ausnahme im inneren Aufruf (per Proxy erzwungen) → Ausnahme kommt durch, `tabOff` danach false.
  Leere Range und Gegner ohne Reststack: keine Ausnahme (All-in-Gegner werden in `evBet` ohnehin nicht befragt).
- Determinismus (`skripte/determinismus.js`, Vorlage B 6, feste Uhr): 126 Entscheidungen (110 postflop, 52 Mehrspieler; 100, 40 und 15 BB, Gegner mit
  Werten): kalt, umgekehrte Reihenfolge der Modi, wiederholt und in frischer Engine-Instanz (leere `PF_DEC`/`CLS_N`) identisch (0 Abweichungen).
- Globale Zustände: `PF_DEC` (höchstens 200 × 169 Werte), `CLS_N`, Tabellen-Cache je Aufruf von `narrowPostflop`; keine reihenfolgeabhängigen Caches.
- `node tests/run.js --quick`: 122 bestanden, 0 fehlgeschlagen.

### Performance (automatischer Tipp, Stufe Standard, mit Modellspiel wie in der App)
Reale Entscheidungen (`skripte/perf-real.js`, Gegner-KI 2.2, gemischt), 2.2 und 2.1.0 abwechselnd an derselben Entscheidung:

| Lauf | Entscheidungen | Median 2.2 / 2.1 | P95 2.2 / 2.1 | P99 2.2 / 2.1 | Max 2.2 / 2.1 | > 1 s | max. Simulationen |
|---|---|---|---|---|---|---|---|
| 100 BB, Seed 31001 | 2.192 | 20,6 / 20,1 ms | 118 / 100 ms | 266 / 250 ms | 513 / 407 ms | 0 / 0 | 4.278 |
| 15 BB, Seed 31002 | 2.073 | 21,2 / 21,4 ms | 45 / 44 ms | 62 / 59 ms | 110 / 93 ms | 0 / 0 | 5.000 |

Nach Straße (100 BB, Median/P95 in ms, 2.2 gegen 2.1): Preflop 17/37 gegen 17/36; Flop HU 35/83 gegen 32/81; Flop Mehrspieler 94/185 gegen 86/154;
Turn HU 32/72 gegen 29/60; Turn Mehrspieler 83/206 gegen 64/136; River HU (CFR+) 228/360 gegen 221/342; River Mehrspieler 49/118 gegen 49/88.

Konstruierte schwere Spots (`skripte/perf-spots.js`, 10 Wiederholungen mit wechselnden Starthänden, kalte Caches, mit und ohne Gegnerwerte):
langsamster Wert 2.2 = 337 ms (River HU mit CFR+, 2.1: 311 ms); Mehrspieler-Flop mit 6 Spielern und Bet + Raise vor dem Helden 123–166 ms Median
(2.1: 98–133); Mehrspieler-River 4 Spieler 68–85 ms (2.1: 50–68); 1.000 BB tief 27–51 ms; 1,5–12 BB Push/Fold 13–35 ms; All-in-Kette mit drei
All-ins 16–19 ms; höchstens 5.000 Simulationen in allen Spots. Mehraufwand 2.2 postflop typisch +10–40 % (Tabellen-Likelihoods, zweifaches
Reaktionsmodell durch die Mischung), absolut ≤ 0,2 s; die Zeitbremse (1,4 s) wurde nie erreicht. Ziel „binnen 2 s“ mit großem Abstand erfüllt
(auf einem 3–4-mal langsameren Gerät rechnerisch ≤ 1,4 s im ungünstigsten gemessenen Spot; Browsermessung macht ein anderer Prüfer).

Laden/Speicher (`skripte/laden.js`, alle Engine-Module wie im Worker): Quelltext 566 KB (2.1: 369 KB; `ranges.js` 199 KB statt 25 KB),
Laden 25 ms (2.1: 18 ms; davon `ranges.js` 6 ms statt 0,6 ms), Heap der Engine 2,8 MB (2.1: 1,5 MB), nach erster Analyse 3,3 MB (2.1: 2,0 MB).
Offline-Datei 793 KB (2.1: 592 KB). Unkritisch. Lernanzeige bei 20.000 Entscheidungen (Obergrenze): `errorAreas` 6 ms, `recurring` 6 ms,
`improvement` 5 ms.

### Build, Versionen, Service Worker
- `node tools/build.js` → „Build 2.2.0: sw.js (30 Dateien), dist/PokerTrainer_2.2.html (793 KB)“; `node tools/check-version.js` → einheitlich 2.2.0
  (18 Prüfungen); `node tools/check-build.js` → zweimal gebaut identisch, `sw.js` und Offline-Datei byte-gleich mit dem Commit (SHA-256 verglichen).
- `sw.js`: Cache `pokertrainer-2.2.0-33ad635f820a`, Schlüssel aus SHA-256 über alle zwischengespeicherten Dateien; enthält alle Skripte aus `index.html`,
  `worker.js`, CSS, Manifest und alle sechs Icons des Manifests; Worker lädt `engine/*.js?v=2.2.0` relativ zu `assets/js/` = Cache-Einträge.
  Installation mit `cache: 'reload'`, Aktivierung löscht alte `pokertrainer-*`-Caches (2.1-Cache `pokertrainer-2.1.0-5a7854d301aa`).
- Update-Pfad von 2.1.0: neuer Cache-Schlüssel und neue `?v=`-Parameter; Wechsel erst nach `flushWrites` und `SKIP_WAITING`. Datenformate:
  `stats.js` und `store.js` unverändert, Lerndaten 2.1 ohne `pp` gültig (`L.pp == null` erlaubt), `publicView.no` neu, aber `validView` toleriert es;
  `cfg.pool` nur im Vergleichsrahmen (nicht gespeichert).

## Nachtrag: Stand 07eb7f1 (während der Prüfung erschienen)
Geprüft wurde 7a2413a. Während der Prüfung erschien Commit 07eb7f1 („Korrekturen nach Prüfagent C“). Kurzprüfung per `git archive` nach
`/home/claude/review22/D/repo-07eb` (Repository unverändert):
- D-1 behoben: `handRecord` ohne `seed`, `no`, `tseed`, `session`; Rekonstruktion mit `skripte/seed-leck.js` schlägt fehl (Heldenkarten 0/25,
  aufgedeckte Karten 0/30 reproduzierbar); `validate` lehnt Seeds im Handdatensatz ab.
- D-3 behoben: `handRecord.decisions` entfernt.
- D-4 behoben: `validate` liefert für alle fünf fehlerhaften Strukturen eine Meldung statt einer Ausnahme.
- D-9 behoben: Prüfung `PTUI.canStartTraining()` vor `prePostNew`.
- Nicht nachgeprüft in 07eb7f1: D-2 (Laufzeit Export), D-5 bis D-8, D-10, D-11 (betroffene Stellen in `ranges.js`, `ev.js`, `index.html` sind in
  07eb7f1 nicht geändert; D-2, D-7, D-8 bitte nach dem Stand von 07eb7f1 erneut bewerten).
