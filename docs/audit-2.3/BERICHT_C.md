# Prüfbericht C 2.3: Gegner-KI und Gegnergedächtnis

Stand: 9f09c0c, Klon /home/claude/review23/C. Prüfskripte liegen in /home/claude/review23/C/pruef_c/ (t1 bis t9), der Arbeitsstand ist unverändert.
`node tests/run.js --quick`: 130 bestanden, 0 fehlgeschlagen. Rechenlast insgesamt etwa 3 CPU-Minuten.
Nicht geöffnet: tests/strategy/final23/. Die Zusammensetzung „f23“ wurde nicht verwendet.

## Übersicht

| Kennung | Schwere | Kurzbeschreibung | Status |
|---|---|---|---|
| C23-1 | hoch | Modellwahl und Abstimmung gelten für ein anderes w-Modell als das ausgelieferte; die Doku beschreibt das alte Modell | bestätigt |
| C23-2 | hoch | pairLL wertet jede Aktion in einer festen Zelle (`fr` bzw. `s3`, HU). Bets des Preflop-Aggressors gelten als unwahrscheinlich, w misst damit Stil und Rolle statt Tabellenpassung | bestätigt (Messung) |
| C23-3 | mittel | Selbst gegen die Gegner-KI E, an die die Tabelle angepasst ist, liegt w im Mittel bei 0,70 bis 0,77 (LAG 0,33). Mit mehr Daten sinkt w; ein einzelnes Blatt verschiebt w um bis zu 0,73 | bestätigt (Messung) |
| C23-4 | mittel | Einträge ohne Größenangabe (aus 2.1/2.2 und Format 1) verzerren w nach oben, der aggressive Teiltest zA fällt praktisch aus. Für Polarisierer steigt w von 0,10 auf 0,41 | bestätigt (Messung) |
| C23-5 | mittel | hybridFit kennt kein Alter der Blätter: keine Kopplung an die Veränderungserkennung, verzögerte Reaktion auf Phasenwechsel. Ohne eigene Blätter hängt w von den Tischnachbarn ab | bestätigt (Code und Messung) |
| C23-6 | niedrig | Über 300 Zeichen je Straße wird nicht gekürzt. Ein überlanger Eintrag verwirft den ganzen Gegnerdatensatz beim Laden, und der Import scheitert insgesamt | bestätigt (konstruiert); mit Bots nicht erreicht |
| C23-7 | niedrig | Die Größe wird auf zwei Nachkommastellen gerundet. An den Grenzen 0,6 und 1,1 fällt die Größenklasse dadurch anders aus als in der Tabelle (etwa 0,1 % der Bets) | bestätigt |
| C23-8 | niedrig | Kein Test für die Größenangabe in shownEntry, für shownPairs, pairLL, fitOf und hybridFit | bestätigt |
| C23-9 | niedrig | synth23: Tr und Va haben dieselbe Sitzzuordnung, die Gewichte je Profil sind ungleich (5 bis 19 Pool-IDs). Ka hat kein Polar-Profil, Va nur einen Phasenwechsel, der Phasenwechsel spiegelt nur drei Parameter | bestätigt |
| C23-10 | niedrig | `long.js calib` meldet fest „hands: 200000“. Die Postflop-Stile der Gegner-KI sind kaum getrennt | bestätigt |
| C23-11 | Info | hybridFit läuft auch preflop, wo w nicht verwendet wird (kalt 46 ms) | bestätigt |
| C23-12 | Info | `docs/TESTBERICHT_2.3.md` steht im CHANGELOG, fehlt aber | bestätigt |

Ohne Befund geprüft:
- Ausgabe über `esc()` im Gegnerdialog.
- 2.1 und 2.2 lesen die neuen Einträge.
- Export und Import mit 5.000 Gegnern.
- Legale Aktionen der synthetischen Gruppen.
- Trennung der Gruppen E/V/T.
- Kalibrierung aller Stile.
- Keine Speisung aus nicht beobachtbaren Daten.

Details folgen am Ende.

---

## C23-1 (hoch): Validierung und Doku decken das ausgelieferte Modell nicht ab
**Dateien:**
- assets/js/engine/coach.js:97 (FIT), 116–135 (pairLL, fitOf)
- docs/STRATEGIEVARIANTEN_2.3.md:14–17
- CHANGELOG.md:13

**Beschreibung:** Commit 9f09c0c ändert das Maß für w grundlegend:
- Größenklassen bs/bl/bo statt nur Bet gegen Check.
- Neue Referenzwerte: llRef −0,5748 statt −0,463, llSd 0,7404 statt 0,546.
- Designeffekt deff 1,417.
- Ein getrennter aggressiver Test zA, maßgeblich ist min(z, zA).

Die Schwellen 0/−2 und k = 8 wurden aber mit dem alten Maß abgestimmt (tune23) und gewählt (sel23, Commit 5b1cc92, vor 9f09c0c). Die Ergebnisdateien strategy-sel23.json und strategy-tune23.json wurden danach nicht neu erzeugt. Der Kommentar in coach.js:97 („Schwellen auf Tr23 und Gegner-KI E abgestimmt, auf Va23/V gewählt“) und STRATEGIEVARIANTEN_2.3.md (−0,463/0,546, „Bet/Check … Raise/Call“) beschreiben noch das alte Modell.

**Reproduktion:** `node pruef_c/t9_oldnew.js` (8.000 Hände je Gruppe, Seed 8080) vergleicht w nach altem und neuem Modell für dieselben Gegner:

| Gruppe | mittleres \|Δw\| je Gegner | Anteil \|Δw\| > 0,3 | w alt | w neu |
|---|---:|---:|---:|---:|
| E | 0,10 | 10 % | 0,75 | 0,77 |
| V | 0,15 | 31 % | 0,63 | 0,75 |
| Tr | 0,10 | 11 % | 0,24 | 0,26 |
| Va | 0,15 | 21 % | 0,37 | 0,35 |

Die Mittelwerte sind ähnlich, für einzelne Gegner unterscheidet sich w aber deutlich.

**Vorschlag:** Abstimmung (Tr23/E) und Modellwahl (Va23/V) mit dem Produktstand wiederholen, oder die Änderung B23-1 zurücknehmen. Die Doku auf das neue Maß bringen. Bis dahin keine Aussage „auf Va23/V gewählt“ für 9f09c0c treffen.

## C23-2 (hoch): Feste Zelle in pairLL vermischt Rolle und Stil mit „Tabelle passt nicht“
**Datei:** assets/js/engine/coach.js:117. Der Zellschlüssel ist immer `<Straße>|fr|h` ohne offenen Einsatz bzw. `<Straße>|s3|h` mit Einsatz.

**Beschreibung:** Ein aufgedecktes Blatt enthält nur die eigenen Aktionen, deshalb bewertet pairLL jede Aktion so, als hätte niemand die Initiative gehabt (`fr`), heads-up, bei mittlerer Einsatzgröße (`s3`). Die Tabelle unterscheidet dagegen `ag` (Aggressor), `va`, `fr`, s1–s6 und `rr`. C-Bets des Preflop-Aggressors sind unter `fr` viel seltener als unter `ag`. Wer oft Preflop-Aggressor ist, also TAG und LAG, bekommt deshalb systematisch eine niedrige Log-Likelihood, auch wenn die Tabelle genau zu ihm passt. Der Referenzwert ist über die Mischung der Gruppe E gemittelt. Das Maß unterscheidet also Spielstil und Rolle, nicht die Passung der Tabelle.

**Reproduktion:** Gegner-KI E, 12.000 Hände, Flop ohne offenen Einsatz (`node pruef_c/t3_sizes.js 12000 E 5151` und Auswertung):
- Letzte Preflop-Aktion Raise: mittlere LL −1,08, Bet-Anteil 44 % (207 Paare).
- Sonst: mittlere LL −0,56, Bet-Anteil 11 % (244 Paare).

Mittleres w der Gegner-KI E je Stil (Gegner mit mindestens 8 Blättern):

| Stil | lp | nit | tag | bal | vl | lag |
|---|---:|---:|---:|---:|---:|---:|
| w | 0,94 | 0,90 | 0,72 | 0,70 | 0,53 | 0,33 |

**Vorschlag:** Im Blatt die Rolle mitspeichern:
- Preflop-Aggressor ja/nein.
- Ob vor der eigenen Aktion gesetzt wurde, und die Größe des gesetzten Betrags.
- Spielerzahl.

pairLL sollte dann in derselben Zelle rechnen wie narrowPostflop. Alternativ die Referenz je Rolle bilden (llRef für PFA und Nicht-PFA getrennt).

## C23-3 (mittel): Das w-Maß bestraft auch die richtige Population; es ist bei wenigen Daten instabil
**Datei:** coach.js:132–134 (zHi = 0, min(z, zA)).

**Beschreibung:** w = 1 gibt es nur bei z ≥ 0 und zA ≥ 0. Wenn die Tabelle exakt passt, liegt z um 0. Deshalb bekommt etwa die Hälfte der passenden Gegner, mit dem Minimum aus zwei Tests noch mehr, ein vermindertes Gewicht. Dazu kommt die Stilstreuung aus C23-2. Mit mehr Daten wird z extremer, deshalb sinkt w für die Gegner-KI E mit der Zahl der Blätter. Ein neues Blatt kann w stark verschieben.

**Reproduktion** (`t3_sizes.js`, Auswertung in den Shell-Einzeilern):
- Gegner-KI E mit 10 Blättern (Seed 9123): 47 % der Gegner haben w < 1, 9 % w = 0.
- Seed 5151: w im Mittel 0,698, Anteil w = 1 38 %, w = 0 8 %. Unter der Annahme N(0,1) wären für w = 0 etwa 2 bis 4,5 % zu erwarten.
- w nach Zahl der Blätter j, bei Pool-w = 1: 1,00 (j = 0), 0,92 (2), 0,85 (4), 0,80 (7), 0,76 (10).
- Mittlere Änderung |Δw| je neuem Blatt 0,057, höchstens 0,73.

**Vorschlag:**
- zHi deutlich unter 0 legen, z. B. −1, oder w über die Posteriori-Wahrscheinlichkeit „passt“ gegen „passt nicht“ bestimmen.
- Den Minimum-Operator für die Mehrfachprüfung korrigieren.
- Gewicht glätten, z. B. exponentiell über die Blätter.
- Mit Stil-stratifizierter Referenz prüfen.

## C23-4 (mittel): Alte Einträge ohne Größenangabe heben w an und schalten zA aus
**Dateien:**
- coach.js:109 (`'b'` ohne Größe) und 121 (P(Bet) = Summe aller Größen)
- stats.js:407–417 (migrateV2/migrateV1 übernehmen die Blätter unverändert)

**Beschreibung:** Bei Einträgen aus 2.1/2.2 (Format 3 ohne Größe), aus Format 2 und aus Format 1 (C-12) ist die Likelihood einer Bet die Summe aller Größenklassen. Die Referenzen llRef und llRefA stammen aber aus Einträgen mit Größe. Dadurch ist die LL systematisch zu hoch, w liegt zu hoch, und der aggressive Test (B23-1) greift praktisch nicht. Wer von 2.2 auf 2.3 wechselt, hat bis zu 10 alte Blätter je Gegner, die erst nach etwa 10 neuen Showdowns ersetzt sind. Bei etwa 18 Händen je aufgedecktem Blatt sind das rund 180 Hände je Gegner.

**Reproduktion** (`t3_sizes.js` mit dem Entfernen der Größenangabe, also wie ein Eintrag aus 2.2):

| Messgröße (Gegner-KI E, Seed 5151) | mit Größe | ohne Größe |
|---|---:|---:|
| LL je Paar (Ref −0,575) | −0,589 | −0,497 |
| aggressive LL (Ref −1,704) | −1,742 | −1,159 |
| Median zA | −0,16 | +1,11 |
| w im Mittel | 0,70 | 0,87 |

Polarisierer aus Tr (`t5_synthw.js p23:Tr 6000 4242`), w mit und ohne Größe:
- Tr:06: 0,10 / 0,41
- Tr:07: 0,11 / 0,39
- Tr:08: 0,09 / 0,37
- Tr:04: 0,09 / 0,20

**Vorschlag:** Paare mit 'b' getrennt gegen eine eigene Referenz ohne Größe bewerten. Alternativ zA nur aus Paaren mit Größe bilden und das als „nicht prüfbar“ kennzeichnen. Ein Regressionstest sollte gemischte alte und neue Einträge abdecken.

## C23-5 (mittel): Kein Alter der Blätter, keine Kopplung an die Veränderungserkennung
**Dateien:**
- coach.js:137–143 (hybridFit nutzt r.shown ohne ts/hand)
- stats.js:265–274 (effectiveStats nutzt bei Alarm die Kurzzeitwerte)

**Beschreibung:**
- **Rückkehrer:** Nach einer Pause im Archiv zählen die 10 alten Blätter voll, auch wenn sie Tausende Hände alt sind. Die Spanne der 10 Blätter reichte bei E von 53 bis 3.980 Tischhänden, im Median 213.
- **Veränderungserkennung:** Erkennt stats.js eine Veränderung, nutzt das Gegnermodell die Kurzzeitwerte. hybridFit rechnet aber weiter mit den Blättern aus der alten Phase.
- **Phasenwechsel:** Bei Va:06 (Wechsel alle 120 Hände) liegt w früh in der Phase um 0,15 auseinander, spät um 0,45. Die Reaktion kommt also mit etwa einer halben Phase Verzögerung (`t6_phase.js`). Dabei wechseln alle Gegner gleichzeitig, und der Pool beschleunigt die Anpassung; im Trainer ist die Verzögerung größer.
- **Tischnachbarn:** Ohne eigene Blätter gilt w = Pool-w der Tischnachbarn. Setzt sich ein Polarisierer, sinkt w für alle Neulinge; steht er auf, springt es zurück.

**Vorschlag:**
- Blätter nach Alter gewichten, gemessen in eigenen Händen wie HALF_LIFE.
- Bei aktivem Veränderungsalarm nur Blätter ab chg[k][0] verwenden.
- Das Pool-Vorwissen auf die Population statt auf den aktuellen Tisch beziehen, oder dämpfen.

## C23-6 (niedrig): Grenze von 300 Zeichen ohne Kürzung
**Dateien:** stats.js:166–167 (shownEntry, ohne Kürzung), 326 (validShown), 489–492 (dbFromList überspringt den Datensatz), 446–447 (Import bricht insgesamt ab).

**Beschreibung:** Ein langer Raise-Krieg auf einer Straße erzeugt einen Eintrag über 300 Zeichen, mit Min-Raises bei 100 BB 847 Zeichen. Der Datensatz ist dann im Speicher gültig, wird beim nächsten Laden aber als ungültig übersprungen. Er verschwindet aus der Datenbank (app.js:1141 legt eine Rohsicherung an). Export und anschließender Import schlagen für die ganze Datei fehl („Eintrag 1: Aktionen in Blatt 1 ungültig“). Das Problem bestand schon vor 2.3; die Größenangabe verlängert den Text je Bet um etwa 12 Zeichen.

**Reproduktion:**
- `node pruef_c/t1_limit.js`: Min-Raise-Krieg auf dem Flop bei 100 und 250 BB.
- `t2_minraise.js`: Der Held raist immer min, die Bots reagieren normal. In 3.000 Händen höchstens 67 Zeichen, also mit der Gegner-KI praktisch nicht erreicht.

**Vorschlag:** In shownEntry auf 300 Zeichen kürzen (mit „…“). Alternativ in validShown/loadRecord zu lange Blätter kürzen oder verwerfen statt den Datensatz.

## C23-7 (niedrig): Rundung der Größe vor der Klasseneinteilung
**Dateien:** stats.js:166 (zwei Nachkommastellen), coach.js:109 (Grenzen 0,6/1,1), ranges.js actionOutcome (ungerundet).

**Reproduktion:** `t3_sizes.js`, 6.448 Bets, davon 7 mit abweichender Klasse. Beispiele:
- 1450/2400 = 0,604: Tabelle bl, Blatt bs.
- 6900/6250 = 1,104: Tabelle bo, Blatt bl.

**Vorschlag:** Die Klasse aus dem ungerundeten Wert bestimmen, oder drei Nachkommastellen speichern.

## C23-8 (niedrig): Testlücke
Es gibt keine Unit-Tests zu:
- Format der Größenangabe in shownEntry (inklusive „(All-in) (x Pot)“).
- Parser shownPairs.
- pairLL (Ergebnisklassen).
- fitOf (zA, deff, minPairs).
- hybridFit (Pool, k, 0–3 Blätter).
- Cache-Schlüssel (A23-8).
- Gemischte alte und neue Einträge.

Suche in tests/run.js und tests/unit/*.js: kein Treffer für shownPairs, __fitOf, hybridFit oder „Pot)“.

**Vorschlag:** Regressionstests zu B23-1, A23-2 und A23-8 sowie zu C23-4 und C23-6 ergänzen.

## C23-9 (niedrig): synth23 – Zuordnung, Abdeckung, Phasenwechsel
**Datei:** tests/strategy/synth23.js:46–47 (phase), 75–78 (forSeat). Reproduktion: `node pruef_c/t4_synth.js`.

**Zuordnung:** `forSeat` nutzt `hashStr(id + '|p23') % ks.length`. Tr und Va haben je 10 Profile und deshalb dieselbe Zuordnung: Pool-ID X spielt Tr:i bzw. Va:i. Die Gewichte sind ungleich (Pool-IDs je Profil):
- Tr/Va: 8, 9, 5, 9, 8, 5, 15, 7, 15, 19.
- E: 5 bis 14.

Ergebnisse der Gruppen sind damit bis etwa 4:1 nach Profilen gewichtet.

**Abdeckung:**
- Größenregeln: E 2/4/3/3 (direkt/polar/umgekehrt/konstant), Tr 2/5/1/2, Va 2/3/3/2, Ka 3/0/2/3. Ka enthält kein Polar-Profil.
- Phasenwechsel haben 11 von 40 Profilen, in Va nur Va:06.
- Ein Phasenwechsel spiegelt nur bluff, trap und sens. Bei Ka:07 ändern sich die drei Werte nur um 0,12/0,07/0,29, die Phase ist also kaum anders.

**Überschneidungen:** keine identischen Profile. Das nächste Paar mit gleicher Größenregel ist E:02 und Va:09 (normierte Distanz 0,225), das nächste innerhalb einer Gruppe Tr:06 und Tr:07 (0,253). Alle Gruppen stammen aus derselben Parameterfamilie; Va prüft also Interpolation, nicht Übertragbarkeit.

**Positiv:** Alle Aktionen sind legal, 0 Rückfälle in 4 × 3.000 Händen, auch bei 30 BB. Die Entscheidungen nutzen nur publicView.

**Vorschlag:** Die Zuordnung in jeder Gruppe gleich verteilen (Rundlauf statt Hash) und mit Gruppensalz versehen. Polar-Profile in Ka aufnehmen.

## C23-10 (niedrig): Kalibrierung
**Bericht:** tests/long.js:116 schreibt `hands: 200000` fest, auch wenn CALIB_HANDS kleiner ist. Mit CALIB_HANDS=20000 waren es tatsächlich 40.000 Tischhände.

**Ergebnis** (`CALIB_HANDS=20000 node tests/long.js calib`, 24 s): alle Zielbereiche ok.

| Stil | VPIP | PFR | AF | HUD-Typ |
|---|---:|---:|---:|---:|
| lp | 33,4 | 8,8 | 0,72 | 36/37 |
| vl | 44,1 | 25,1 | 2,5 | 29/30 |
| nit | 11,2 | 8,2 | – | 28/28 |
| tag | 20,7 | 16,7 | 3,33 | 48/48 |
| lag | 30,3 | 25,0 | 3,86 | 25/29 |
| bal | 22,6 | 17,8 | – | 17/17 |

**Trennung postflop:** Fold gegen C-Bet liegt bei nit, tag, lag, bal und vl einheitlich zwischen 52 und 54 %, nur lp bei 44 %. Die Zielbereiche prüfen postflop nur AF und, bei lp, WTSD.

**Vorschlag:** Die tatsächliche Handzahl berichten. Zielwerte postflop je Stil ergänzen, falls die Stile sich dort unterscheiden sollen.

## C23-11 (Info): Rechenzeit
- hybridFit mit 5 Gegnern à 10 Blättern: kalt 46,5 ms je Analyse (erste Analyse nach Worker-Start), mit Cache 0,40 ms (`t7_perf.js`). Das ist unkritisch für die Zwei-Sekunden-Grenze.
- prepare() ruft hybridFit auch preflop auf, wo wTab nicht verwendet wird (buildRange nur bei street > 0).
- Der Cache leert sich ganz ab 4.000 Schlüsseln.

## C23-12 (Info)
CHANGELOG.md:8 verweist auf `docs/TESTBERICHT_2.3.md`; die Datei fehlt im Stand 9f09c0c.

---

## Geprüft ohne Befund
- **Darstellung und XSS:** oppShownHtml (views.js:328–334) setzt alle Felder über `esc()` (core.js:39). Die Kartenfelder gehen über parseCards. Die Funktion ist gegenüber 2.2 unverändert.
- **Rückwärtsverträglichkeit** (wt-v210, wt-v220, nur gelesen): Ein Export aus 2.3 mit 170 Blättern mit Größenangabe wird von 2.1.0 und 2.2.0 importiert (52 Gegner, nicht migriert). dbFromList überspringt dort 0 Einträge. Ältere Versionen parsen den Aktionstext nirgends.
- **Formate:** validShown ist unverändert. Format 1/2 werden migriert und die Blätter übernommen (siehe C23-4 zur Wirkung).
- **5.000 Gegner** à 10 Blätter: Export 13,6 MB in 211 ms, Import in 567 ms, kanonisch identisch. Importgrenze 256 MB, das reicht für etwa 94.000 solcher Datensätze; die Eintragsgrenze liegt bei 100.000. Nicht im Browser geprüft (Vermutung): Im localStorage-Rückfall (privater Modus) passen 13,6 MB nicht in die übliche Quote.
- **Beobachtbarkeit:** hybridFit nutzt nur r.shown, also am Showdown aufgedeckte Karten, Board und eigene Aktionstexte. Die Stärke kommt aus PT.bots.percentile(Karten, Board). input.opps enthält nur Gegner am Tisch (app.js:588, Trainingshände ohne Gegnerdaten). Spielstil und Bot-Parameter gehen nicht ein.
- **Gruppen E/V/T:** 52/26/22, disjunkt, decken den Pool von 100 vollständig ab und sind nach Stil geschichtet:

| Gruppe | lp | vl | nit | tag | lag | bal |
|---|---:|---:|---:|---:|---:|---:|
| E | 10 | 8 | 8 | 13 | 8 | 5 |
| V | 5 | 4 | 4 | 6 | 4 | 3 |
| T | 5 | 3 | 3 | 6 | 3 | 2 |

- **0–3 Blätter:** Unter 4 Paaren gilt n = 0, also w = Pool-w. Ohne Blätter am ganzen Tisch gilt w = 1. Mit 1 bis 3 Blättern wächst die Streuung von w von 0,05 auf 0,18 (C23-3).
- **Schnelltests:** `node tests/run.js --quick`: 130 bestanden, 0 fehlgeschlagen.
