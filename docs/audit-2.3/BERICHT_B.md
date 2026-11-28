# Prüfbericht B – Strategie und Generalisierung, PokerTrainer 2.3.0 (Commit 3cb136d)

Arbeitskopie: `/home/claude/review23/B`, Stand 3cb136d. Eigene Prüfskripte: `/home/claude/review23/B/tmp_b23/` (wfluct.js, match.js, spots.js, gto.js, gto2.js, gto3.js, pf.js).
Nicht gelesen oder verwendet: `tests/strategy/final23/BESCHREIBUNG.md`, `tests/strategy/final23/index.js`, comp `f23`.
Rechenlast: etwa 12–13 CPU-Minuten, kein Befehl über 3 Minuten.

`node tests/run.js --quick`: **130 bestanden, 0 fehlgeschlagen** (73 s). Dabei wurde `tests/results/unit-quick.json` im Klon überschrieben. Die Testsuite enthält **keinen** Test für das hybride Modell (siehe B23-12).

Schwere: Hoch, Mittel, Niedrig, Hinweis. „Bestätigt“ heißt: reproduziert oder direkt aus den Daten abgelesen. „Vermutung“ heißt: plausibel, aber nicht isoliert geprüft.

---

## B23-1 – Hoch – bestätigt: Das hybride Modell erkennt den Polarisierer nicht, gegen ihn bleibt die Regression von 2.2 bestehen

**Datei/Zeile:** `assets/js/engine/coach.js` 85–92 (Docstring: „Polarisierer: Luft aggressiv … geht zum robusten Modell 2.1 über“), 108–112 (`pairLL`), 113–121 (`fitOf`).

**Beschreibung:** Laut Ursachenanalyse ist der Polarisierer der Fall, in dem die Range-Tabelle allein verantwortlich ist (R −61,6). Dort müsste das Modell zu 2.1 übergehen. Es tut das Gegenteil: Gegen `final:polar` liegt das Tabellengewicht praktisch immer bei 1.
- Nach 1.500 Händen hatten **4.801 von 4.827** Beobachtungen bei vollem Fenster ein w ≥ 0,8. Das z je Gegner lag meist bei +1 bis +2,9.
- Ursache: `pairLL` prüft nur aggressiv gegen passiv bei gegebener Stärke. Die Einsatzgröße fasst es zusammen (`bs+bl+bo`). Der Fehler der Tabelle gegen den Polarisierer liegt aber in der Größe („große Einsätze gelten als stark“).
- Dazu erreichen Bluffs selten den Showdown. Die aufgedeckten Blätter des Polarisierers passen deshalb gut zur Tabelle.

Folgen im Spiel (gleiche Karten, Seed 23997, je 1.200 Hände):

| | Raise-Labels postflop | Checks | BB/100 (All-in-bereinigt) |
|---|---:|---:|---:|
| 2.3 | 16/352 = 4,5 % | 27,3 % | 73,6 |
| 2.1.0 | 2/360 = 0,6 % | 35,3 % | 137,2 |

Das ist ein einzelner Seed und damit nicht belegt. Er stimmt aber mit `strategy-sel23.json` überein: `selReg-varCz-coach210`, Polarisierer **−39,5 [−66,3; −12,4]**.

**Reproduktion:** `node tmp_b23/wfluct.js final:polar 1500 777`; `node tmp_b23/match.js 23 final:polar 1200 23997 noend` gegen `… 210 final:polar 1200 23997 noend`.

**Vorschlag:**
- Größenklasse in die Passungsprüfung aufnehmen: Likelihood je `sizeKey` oder Stärke der aufgedeckten Hand je Größenklasse gegen die Tabelle.
- Docstring an die tatsächliche Wirkung anpassen.
- Regressionstest: gegen `final:polar` soll w deutlich unter 1 liegen.

## B23-2 – Hoch – bestätigt aus den Daten: Gewählt wurde ein Modell, das auf Va23 belegt schlechter ist als 2.1.0. P1 ist damit voraussichtlich nicht zu erreichen

**Datei:** `docs/ABNAHMEKRITERIEN_2.3.md` (Regel zur Modellwahl), `tests/results/strategy-sel23.json`.

**Beschreibung:** Auf Va23 sind alle Varianten der C-Familie belegt schlechter als 2.1.0. Das gewählte Cz liegt bei −9,19 [−17,87; −0,86], C bei −10,8 [−20,9; −1,2].
- Die untere Grenze −17,9 liegt weit unter −δ = −5. Gegen unbekannte Strategien ist Nichtunterlegenheit (P1) damit unwahrscheinlich.
- Auf dem Regressionsset liegt Cz bei −21,6 gegen 2.1.0 (beschreibend, 15 Blöcke). Das ist schlechter als 2.2 dort (−17,9). Die Regression ist also nicht behoben.
- Die Regel lässt diese Wahl zu, weil A (≈ 2.1.0: 0,11 [0; 0,31]) am V-Kriterium scheitert. Sie verlangt aber keine Nichtunterlegenheit auf Va23.
- Aussagen wie „hybrides Modell nutzt die Tabellen nur so weit, wie sie nachweislich passen“ oder „Regression behoben“ sind durch Va23 nicht gedeckt.

**Vorschlag:** Den Befund vor dem Einfrieren offen dokumentieren und die Prognose für P1 nennen. Fachlich prüfen, ob A als Rückfall gewählt werden muss, wenn kein Kandidat auf Va23 nicht unterlegen ist. Eine Regeländerung ist erst nach Offenlegung zulässig und muss als nachträglich gekennzeichnet sein.

## B23-3 – Mittel – bestätigt: Modellwahl über nachträglich ergänzte Varianten auf Va23, Ergebnisse unvollständig abgelegt

**Datei:** `tests/strategy/compare.js` 49–58, 101, 108, 253–256; `tests/results/strategy-sel23.json`, `strategy-tune23.json`; `/home/claude/wt-dev23/tests/results/strategy-sel23.json` (19:30Z) und `strategy-tune23.json` (19:20Z).

**Beschreibung:**
- Die Regel (unverändert seit ef86371, 17:02) nennt nur A, B, C. Auf Va23/V liefen zusätzlich S, C2, C3, C5 und Cz. Gewählt wurde Cz, also C mit geänderten Schwellen. Der Kommentar in `coach.js:94` sagt selbst: „auf Va23/V gewählt“.
- Der Vorsprung von Cz vor C (untere Grenze −17,9 gegen −20,9, Differenz −9,2 gegen −10,8) ist klein gegenüber dem Standardfehler (etwa 4,5). Die Wahl ist im Wesentlichen Rauschen, und das Intervall des Gewinners ist nach oben verzerrt. Va23 ist damit als unberührte Validierung verbraucht.
- Die Abstimmung ist nicht regelkonform belegt. In `wt-dev23` hat t-z1 (zHi 1, zLo −1) auf Tr die höchste untere Grenze (−3,78 gegen −4,35 bei t-z) und auf E den höchsten Wert (12,1 gegen 8,75). Weitergegeben wurde aber t-z.
- t-z1 wurde danach als `varCz1` auf Va/V gemessen und verworfen. Auf Va war es besser: −5,94 [−12,46; 0,47], nicht belegt schlechter als 2.1.0. Auf V war es belegt schlechter als B: −12,98.
- Die committeten Dateien enthalten t-z1, t-zsq und varCz1 nicht. Der Plan `tune23` in `compare.js` des Commits führt t-zsq und t-z1 trotzdem auf. Datei und Plan widersprechen sich.
- Eine Regel für die Abstimmung (welches Kriterium auf Tr/E) ist nirgends vorab festgelegt.

**Vorschlag:** Alle gemessenen Varianten mit Zeitpunkt und Ergebnis ablegen, auch t-z1, t-zsq und varCz1. Die Wahl innerhalb der C-Familie auf Va23 als nachträgliche Abweichung kennzeichnen. Für die abschließende Bewertung nur F23 heranziehen.

## B23-4 – Mittel – bestätigt: Das V-Kriterium „nicht belegt schlechter als 2.2“ wurde nicht direkt gemessen

**Datei:** `tests/strategy/compare.js` 108 (Plan `sel23`, ohne coach22/coach220).

**Beschreibung:** `sel23` enthält auf den V-Seeds keinen 2.2-Helden. Als Ersatz dient offenbar varB, also 2.3-Code ohne `hybrid` und mit den Korrekturen D-5, D-6, A-15, D-11 und C-12. Dass varB genauso spielt wie 2.2.0, ist weder gezeigt noch dokumentiert.

**Vorschlag:** coach220 auf den Seeds 23211–23214 nachmessen oder den Ersatz begründen. Für die Wahl ist das unkritisch, weil Cz gegen B bei −2,5 [−10,5; 5,9] liegt.

## B23-5 – Mittel – bestätigt: Fehlende Dokumente, auf die verwiesen wird

`docs/STRATEGIEVARIANTEN_2.3.md` fehlt. Verwiesen wird darauf in `coach.js:94`, `ranges.js:469` und `URSACHENANALYSE_2.3.md:52`. Ebenso fehlen `docs/TESTBERICHT_2.3.md` (Verweis in `SHORTSTACK.md` §5) und `tests/results/strategy-v23.json` (Einfrierprotokoll laut Abnahmekriterien).
- Ohne STRATEGIEVARIANTEN ist die Modellwahl im Commit nicht nachvollziehbar.
- Das Einfrierprotokoll muss vor dem ersten abschließenden Lauf vorliegen.

## B23-6 – Mittel – bestätigt (Ursache teils Vermutung): Das Tabellengewicht schwankt stark und beruht dauerhaft auf höchstens 10 Showdowns

**Datei:** `coach.js` 94 (zHi 0, zLo −2, k 8, minPairs 4), 124–130; `stats.js:34` (`SHOWN_MAX = 10`).

**Beschreibung:**
- Grundlage sind nur die zehn jüngsten aufgedeckten Blätter, also etwa 30 Paare. Die Belege werden nie größer, und w ändert sich, wenn das Fenster weiterrückt.
- Mit zHi = 0 bekommt die Tabelle volles Gewicht nur, wenn ein Gegner mindestens durchschnittlich zur Gegner-KI passt. Etwa die Hälfte der Gegner-KI liegt zufällig darunter.

Messung (Held = Pot-Odds-Referenz, Gewicht aus `__hybridFit` nach jeder Hand):

| Gegner | Seed | Befund |
|---|---|---|
| Gegner-KI | 777 | 18 % der Beobachtungen mit w < 0,4; einzelne KI-Gegner im Mittel 0,15 (g053), z bis −3,48 |
| Gegner-KI | 4242 | 37 % mit w < 0,5. Mit 0 oder 1 Showdown (Gewicht aus dem Pool) Median 0,44 bzw. 0,38, P10 0,00 |
| Fallensteller | 777 | w meist niedrig (61 % < 0,2), springt je Gegner aber bis zu 20-mal um ≥ 0,25 in 1.500 Händen; Höchstwerte 0,8–0,9 |

Für das Training heißt das: Die Empfehlung gegen denselben Gegner kann allein deshalb kippen, weil ein alter Showdown aus dem Fenster fällt.

**Vermutung:**
- `llRef` und `llSd` wurden mit dem Helden g004 erhoben (`fit-hybrid.js`). Welche Hände zum Showdown kommen, hängt vom Spiel des Helden ab. Bei einem Lernenden mit anderem Stil verschiebt sich z.
- Die Paare innerhalb einer Hand sind abhängig, deshalb ist die Streuung von z unterschätzt.

**Reproduktion:** `node tmp_b23/wfluct.js bots 1200 4242`, `… final:trapper 1500 777`.

**Vorschlag:**
- Hinreichende Statistiken über alle Showdowns in der Datenbank führen (Zähler je Stärke-Klasse und Aktion) statt nur der zehn Blätter.
- Hysterese einbauen.
- Schwellen relativ zur gemessenen z-Verteilung der Gegner-KI setzen, zum Beispiel zHi = P10 statt Mittelwert.

## B23-7 – Mittel – bestätigt: Docstring und Code stimmen nicht überein

**Datei/Zeile:** `coach.js` 85–92 gegen 113–121.

Der Docstring beschreibt die Entscheidung über die Konsistenz d (aggressiv − passiv). `fitOf` berechnet d, nutzt es aber nicht: w hängt nur vom z der Log-Likelihood ab.

**Vorschlag:** Entweder d verwenden (siehe B23-1) oder den Docstring korrigieren.

## B23-8 – Mittel – bestätigt: Ursachenanalyse – Zahlen richtig gelesen, Wechselwirkungen einseitig beschrieben

**Datei:** `docs/URSACHENANALYSE_2.3.md`, Befunde 2 und 3.

Richtig ist:
- Vorzeichen (Differenz = 2.2 − Variante) und Werte stimmen mit `strategy-abl23.json` überein.
- Die Belegt-Regel ist korrekt angewandt (≥ 20 Blöcke; V hat genau 20).
- „Einzeln nicht belegt“ je Strategie ist korrekt, weil es nur 5 Blöcke sind.
- Die RSD-Kontrolle ist schlüssig.
- Die Raise- und Check-Anteile stimmen: 6,74 % / 27,79 % gegen 2,07 % / 31,46 %.

Nicht gedeckt bzw. einseitig:
- **Regressionsset unteradditiv:** R + S = −30,2, aber RS = −17,7. RS − S = +1,2: Mit dem Reaktionsmodell 2.1 kostet die Range-Tabelle auf dem Regressionsset nichts. „Zweite Ursache (−11)“ ist daher überzeichnet. R und S erklären weitgehend denselben Verlust. Genannt wird nur die Überadditivität auf V.
- **Positionsspieler und umgekehrtes Größensignal:** S allein liegt bei −27,2 bzw. −17,8, RS bei +0,65 bzw. −0,1. „Range-Tabelle mit Reaktion 2.1“ (varS) war dort besser als 2.1.0. Das bleibt unerwähnt.
- Minraiser und umgekehrtes Größensignal fehlen in der Aufzählung je Strategie.
- Für die Wechselwirkungen gibt es kein Intervall, obwohl gepaarte Läufe vorliegen.
- Bootstrap mit 2.000 statt 10.000 Wiederholungen. Das betrifft die Ablation, nicht die abschließenden Tests, und ist geringfügig.

**Vorschlag:** Befunde 2 und 3 umformulieren und den Wechselwirkungsterm mit Bootstrap-Intervall berichten.

## B23-9 – Mittel – bestätigt, schon vor 2.3 vorhanden: Der gleichgewichtsnahe Modus hängt von den Gegnerwerten ab

**Datei:** `coach.js` `prepare` / `analyzeMode`, `ev.js` `respond`. Die Ursache ist nicht isoliert.

**Beschreibung:**
- Das hybride Modell ändert den Modus **nicht**: Mit erzwungenem w = 0 und w = 1 sind die GTO-Ergebnisse identisch (`tmp_b23/gto.js`).
- Die Empfehlung hängt aber von VPIP/PFR ab. Spot: Held BTN mit JsTs, 3-way, Flop 9h8c2d, BB bettet 5, CO callt, gto-Modus:
  - ohne Daten oder VPIP 15 / PFR 12: **Call** (EV 431)
  - VPIP 30 / PFR 20: **Raise 17,5** (EV 630)
- 2.1.0 und 2.2.0 zeigen dasselbe (`tmp_b23/gto2.js`, `gto3.js`). Das widerspricht „Der Modus nutzt die Gegnerwerte nicht“ (Begründung von δ_gto in den Abnahmekriterien).

**Vorschlag:** Ursache suchen. Kandidaten: gemeinsame Equity über die Vereinigung der Träger in `prepare` (Zeilen 240–247) oder Gegnerfelder in der MDF-Reaktion. Danach einen Test „GTO unabhängig von der Datenbank“ ergänzen.

## B23-10 – Niedrig – bestätigt: Der neue Push/Fold-Text ist verschachtelt und erscheint doppelt

**Datei/Zeile:** `coach.js:428` (`kind`), eingesetzt in `coach.js:678` und in den Fold-Satz.

Ausgabe bei KTo, CO, 12 BB, Einsteiger-Text:

> „KTo gehört laut Handauswahl nach Push/Fold-Modellspiel (12 BB effektiv; vereinfachtes Spiel nur mit All-in oder Fold, keine vollständige Strategie), Größe nach EV nicht zu den spielbaren Händen. Preflop folgt der Coach hier dem Faustregel-Chart (Handauswahl nach Push/Fold-Modellspiel (…), Größe nach EV); …“

Probleme:
- „Größe nach EV“ steht mitten im Satz.
- Klammern sind verschachtelt.
- Das Modellspiel heißt hier „Faustregel-Chart“.
- Für den Text gibt es keinen Test.

Die Abgrenzung in `SHORTSTACK.md` §5 ist inhaltlich korrekt. Das hybride Modell berührt Push/Fold nicht, weil es nur postflop wirkt.

**Reproduktion:** `node tmp_b23/pf.js`.

**Vorschlag:** Kurzen Bezeichner („Push/Fold-Modellspiel, 12 BB“) und den Erklärsatz getrennt führen und einen Test für den Text ergänzen.

## B23-11 – Niedrig – bestätigt: Vergleichsläufe vor 2.3 sind am Produktstand nicht mehr reproduzierbar

**Datei/Zeile:** `tests/strategy/harness.js:99` (`Object.assign(C.ranges.ABL, hero.abl)`), `ranges.js:471` (Voreinstellung `{ hybrid: true }`).

Am Commit 3cb136d laufen die Helden `coach21`, `coach22`, `abl-*`, `varA`, `varS` und `varC2` mit Wurzel „.“ stillschweigend mit `hybrid: true`. „Coach 2.2“ ist dort 2.3. `abl23` und `sel23` lassen sich so nicht nachspielen. `v23` setzt `hybrid: false` für fA/fB ausdrücklich und ist nicht betroffen.

**Vorschlag:** Im Harness ABL vor dem Zuweisen auf `{}` zurücksetzen, oder die Helden geben den vollständigen Schalterstand an.

## B23-12 – Niedrig – bestätigt: Keine Tests für das hybride Modell

`tests/run.js` prüft weder `hybridFit` noch `fitOf`, die Mischung oder `sizeShrink`.

**Vorschlag:** Tests für:
- w = 0 ergibt exakt die Range 2.1
- Normierung der Mischung
- GTO-Modus unabhängig von w
- Gegner-KI → w hoch, Fallensteller → w niedrig, Polarisierer → w niedrig (nach B23-1)

## B23-13 – Hinweis – bestätigt: `sizeShrink` ignoriert `ABL.fit.rho`

`coach.js:78` und `83` verwenden `FIT.rho` statt `fitParams().rho`. Bisher hat keine Variante rho überschrieben, die Ergebnisse sind daher nicht betroffen.

## B23-14 – Hinweis – bestätigt (negatives Ergebnis): Keine absurden Mischempfehlungen gefunden; Raise-Häufigkeit nur teilweise behoben

**Mischempfehlungen:**
- Gegen den Fallensteller (1.500 Hände) wurden 325 Entscheidungen mit 0,05 < w < 0,95 zusätzlich mit w = 0 und w = 1 gerechnet.
- 89 davon (27 %) weichen bei Top-Aktion oder Betrag von mindestens einem Endpunkt ab.
- Nur 2 haben einen Aktionstyp, den keiner der Endpunkte wählt. Beide sind ein Call mit EV +6 bzw. +9 gegen Fold 0, also grenzwertig und nicht absurd.
- Konstruierte Spots verhalten sich in w monoton: Nut-Flush River HU, Luft River HU, OESD Flop 3-way, Nuts River 3-way gegen Bet+Raise, Top Pair 3-way gegen Bet+Raise, Overpair Turn gegen Check-Raise mit 2 Showdowns. Es gab keinen Fold mit Nuts und keinen Bluff-Raise.
- Auffällig: Mit 2 Showdowns wirkt das eigene z schon mit Gewicht 6/14. Im Overpair-Spot wechselt die Empfehlung von Call (w = 1) zu All-in (w ≤ 0,5).

**Raise-Häufigkeit** (Raise-Labels postflop, Zählweise wie in der Ablation):

| Gegner, Seed | 2.3 | 2.1.0 | 2.2.0 |
|---|---:|---:|---:|
| Fallensteller, 23999, 1.500 Hände | 1,06 % | 0,84 % | 2,11 % |
| Minraiser, 23998, 1.200 Hände | 5,0 % | – | – |
| Polarisierer, 23997, 1.200 Hände | 4,5 % | 0,6 % | – |

Einordnung:
- Der Fallensteller ist ein schwacher Prüffall: 2.2 hatte dort in der Ablation nur 1,48 %.
- Beim Minraiser bleibt w fast immer 0. Zum Vergleich aus der Ablation (anderer Seed): 2.1.0 4,6 %, 2.2 17,1 %.
- Gegen den Polarisierer ist die Raise-Häufigkeit **nicht** behoben (siehe B23-1).

**Reproduktion:** `node tmp_b23/match.js 23 final:trapper 1500 23999`, `node tmp_b23/spots.js`.

## B23-15 – Hinweis – bestätigt: Keine unzulässigen Informationen zur Laufzeit

- Der Coach bekommt nur `publicView` (ohne fremde Karten) und die Datensätze der Datenbank für die Gegner am Tisch (`harness.coachInput`, `views.js`).
- In `coach.js`, `ev.js` und `ranges.js` gibt es keinen Zugriff auf Stil oder Profil der Gegner-KI und keinen auf synthetische Strategien. `PT.bots.percentile` ist eine reine Funktion der Brettstärke.
- `hybridFit` nutzt nur aufgedeckte Blätter. Beim Showdown zeigen alle Spieler, es gibt kein Mucken.
- Einordnung: Die Populationstabelle wurde offline mit vollständiger Information aus der Gegner-KI erhoben. Sie enthält deren Durchschnittsverhalten. Das ist zulässiges Vorwissen und kein Leck je Gegner, erklärt aber, warum sie sich nicht auf fremde Spielweisen überträgt.
