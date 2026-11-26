# Coach und Strategie 2.1 – Analyse, Methoden, Ergebnisse, Grenzen

Stand: 26.11.2026, Zweig `strategie-2.1`. Alle Zahlen stammen aus ausgeführten Läufen; Rohdaten und Auswertungen liegen in `tests/results/strategy.json` (Abschnitte `sizing`, `responseFit`, `cfr`, Vergleiche) und `tests/results/strategy-runs/`. Der Block am Ende („Automatisch erzeugte Ergebnisse“) wird mit `node tools/report-strategy.js` ausschließlich aus diesen Dateien erzeugt; Aussagen wie „in k von n Läufen vorn“ werden dort gezählt, nicht von Hand geschrieben. Der Coach bleibt eine Faustregel mit Modellannahmen („Faustregel, kein Solver-Ergebnis“); nichts hier ist eine GTO-Lösung für No-Limit Hold'em.

<!-- KURZFASSUNG-START -->
## Kurzfassung

Die Kurzfassung steht am Ende dieses Dokuments unter „Fazit“, nachdem alle Messungen beschrieben sind.
<!-- KURZFASSUNG-ENDE -->

## 1. Warum empfahl der Coach so selten ½ Pot?

### Daten

Größenstudie mit gegenfaktischen Ausspielungen (`tests/strategy/sizing-study.js`): Der Held spielt nach dem Coach. An jedem Postflop-Spot, an dem er setzen darf, wird die Hand für **jede** Kandidatenaktion kopiert (Check, Bet ⅓, ½, ¾, 1 und 1,5 Pot; gegen eine Bet: Fold, Call, Raise 2,5× und 3,5×) und mit denselben Karten und demselben Zufallsstrom der Gegner zu Ende gespielt (gemeinsame Zufallszahlen). Gemessen werden je Größe die erste Reaktion jedes Gegners, der realisierte Wert relativ zum sofortigen Fold (All-in-bereinigt, siehe Abschnitt 6) und die Vorhersage des Coaches. Die Kopien sind nur ein Messinstrument der Simulation; der Coach selbst sieht nie verdeckte Karten.

Basislauf mit dem Reaktionsmodell von 2.0.1 (`label base`, Seeds 503 und 504, 6.750 Hände, 2.073 Spots, davon 1.593 ohne offenen Einsatz, Gegner-KI gemischt, 100 BB):

| Größe | Fold beobachtet | Fold vorhergesagt (2.0.1, exploitativ) | Raise beobachtet | Raise vorhergesagt |
|---|---:|---:|---:|---:|
| ⅓ Pot | 36,7 % | 26,9 % | 4,6 % | 14,6 % |
| ½ Pot | 48,9 % | 35,2 % | 5,0 % | 12,9 % |
| ¾ Pot | 56,4 % | 44,3 % | 5,3 % | 11,1 % |
| Pot | 62,8 % | 47,6 % | 5,7 % | 10,4 % |
| 1,5 Pot | 74,2 % | 47,7 % | 6,2 % | 10,3 % |

(je Größe rund 1.840 Gegnerreaktionen, Standardfehler der beobachteten Fold-Rate ≈ 1,1 Prozentpunkte). Im ersten, kürzeren Basislauf (Seeds 501/502) zeigte sich dasselbe Bild je Straße: Heads-up am River foldeten die Gegner gegen ⅓ Pot in 61 % der Fälle, vorhergesagt waren 21 %; gegen 1,5 Pot 91 % statt 43 %.

Realisierter Wert gegenüber Check (BB je Spot, gepaart über dieselben Spots, Standardfehler in Klammern) und der Wert, den das 2.0.1-Modell für dieselbe Differenz erwartete:

| Hand (Modell-Equity) | ⅓ | ½ | ¾ | Pot | 1,5 Pot |
|---|---:|---:|---:|---:|---:|
| < 35 % realisiert | +1,05 (0,52) | +0,83 (0,64) | +0,86 (0,73) | +0,77 (0,81) | +1,53 (0,85) |
| < 35 % Modell 2.0.1 | −1,03 | −1,37 | −1,56 | −2,23 | −4,64 |
| 35–60 % realisiert | +0,55 (0,66) | +0,16 (0,66) | −1,00 (0,76) | −1,16 (0,82) | −0,17 (0,93) |
| 35–60 % Modell 2.0.1 | −0,36 | −0,75 | −1,38 | −2,05 | −3,57 |
| ≥ 60 % realisiert | +0,56 (1,31) | +1,30 (1,36) | −0,25 (1,45) | −0,14 (1,59) | +0,22 (1,70) |
| ≥ 60 % Modell 2.0.1 | +2,49 | +3,05 | +3,44 | +3,93 | +4,90 |

Welche Aktion das 2.0.1-Modell unter diesen sechs wählte: Check 909-mal, ⅓ 148, ½ 83, ¾ 124, Pot 19, 1,5 Pot 310 (von 1.593 Spots; in echten Spots kommen Overbets auf dem Flop und multiway nicht als Kandidat vor).

### Befund

1. **½ Pot ist in den Daten nicht schlechter als die anderen Größen.** Über alle Spots: ⅓ +0,74 (0,47), ½ +0,73 (0,50), ¾ −0,08 (0,55), Pot −0,15 (0,61), 1,5 Pot +0,58 (0,65) BB gegenüber Check; die Unterschiede zwischen den Größen liegen innerhalb von ein bis zwei Standardfehlern. „Immer ½ Pot“ hätte über dieselben Spots +0,75 (0,50) BB gegenüber Check gebracht, die Wahl des 2.0.1-Modells +0,14 (0,49).
2. **Zwei Modellfehler drängen ½ Pot heraus.** (a) Folds werden unterschätzt, am stärksten am River und bei großen Einsätzen (die Overbet-Korrektur und der konservative Abschlag machen die Fold-Kurve oberhalb von Pot flach). Dadurch erscheinen Bluffs und Semi-Bluffs mit schwachen Händen negativ (Modell −1 bis −4,6 BB), obwohl sie realisiert positiv sind; mit diesen Händen wählt das Modell Check statt einer kleinen oder mittleren Bet. (b) Die Equity gegen die Callrange wird überschätzt (Heads-up, gemessen gegen die tatsächliche Hand des Callers, nur zur Auswertung): Flop ½ Pot 0,44 statt 0,37 beobachtet (erster Basislauf), Turn ½ Pot 0,44 statt 0,36, River ½ Pot 0,37 statt 0,21. Mit einer zu schwachen Callrange steigt der Modellwert von Value-Bets monoton mit der Größe (≥ 60 %: +2,5 → +4,9 BB), realisiert ist die Kurve flach. Für Value „gewinnt“ deshalb die größte Größe, für schwache Hände der Check – ½ Pot ist selten das Maximum.
3. **Raises werden überschätzt** (Modell 10–15 %, beobachtet 4–6 %), was Bets zusätzlich bestraft.
4. Fehlanpassung an Gegnertypen: Gegen Spieler mit HUD-Typ „Nit“ sagte 2.0.1 nach ⅓ Pot 10 % Fold voraus (beobachtet 54 %, erster Basislauf, 43 Reaktionen), weil die Untergrenze aus der Range-Zusammensetzung („starke Hände spielen immer weiter“) bei engen Ranges sehr hoch ausfällt.

## 2. Reaktionsmodell 2.1

### Populationsmodell (Schwellenmodell)

Ein Gegner spielt mit einer Kombination weiter, wenn ihre absolute Stärke x (Perzentil gegen alle mit dem Board verträglichen Hände, `PT.ev.absStrength`) über einer Schwelle θ liegt, die mit dem Preis π = Call / (Pot nach dem Call) steigt. Draws spielen weiter, wenn ihre Draw-Equity aus den Outs den Preis deckt:

- θ = c0[Straße] + c1[Straße]·π + c2·(Gegner − 1) + c3·[Raise des Helden] + lf·(logit f̂ − logit f₀) + lw·(logit WTSD − logit WTSD₀) + lv·(logit VPIP − logit VPIP₀) + lp·((VPIP − PFR) − (VPIP₀ − PFR₀))
- P(weiter | x) = σ((x − θ)/τ), für Draws max(…, σ((Equity_Draw − π − c4)/τd)); P(Raise | x) = r0·σ((x − r1)/0,02) + rd·[Draw]
- f̂: geglätteter Fold-Wert gegen C-Bets (Flop) bzw. Turn-C-Bets; alle Gegnerwerte mit dem Beta-Prior der App geglättet.

Die Callrange ist w·(P(weiter) − P(Raise)), die Raiserange w·P(Raise) – weiche Gewichte je Kombination statt eines harten Schnitts. Damit ist das Modell zusammensetzungsabhängig: Eine schwache Range foldet mehr als eine starke, ohne Sonderregeln für Untergrenzen oder Overbets.

**Kalibrierung** (`tests/strategy/fit-response.js`): Maximum Likelihood (Nelder-Mead, Parametergrenzen) auf den beobachteten ersten Reaktionen im Basislauf. Eingehen nur am Tisch sichtbare Größen: Aktion des Gegners, Einsatzgröße, Straße, Gegnerzahl, die vom Coach aus öffentlichen Informationen geschätzte Range und die HUD-Werte. Keine verdeckten Karten, keine internen Spielstile. Prüfung auf getrenntem Seed (Training 503, Prüfung 504; je rund 5.100 Reaktionen): Log-Loss Prüfung 0,757 (2.0.1: 0,898), Training 0,765 (2.0.1: 0,925). Fold-Rate auf dem Prüf-Seed beobachtet / Modell 2.1 / Modell 2.0.1: ⅓ 33,4 / 32,8 / 27,0 %, ½ 48,0 / 43,7 / 35,1 %, ¾ 55,0 / 54,4 / 44,2 %, Pot 60,6 / 61,8 / 47,4 %, 1,5 Pot 72,4 / 71,5 / 47,5 %; River heads-up ⅓ Pot 58,3 / 50,8 / 21,5 %. Die endgültigen Parameter (Training auf 503 und 504) stehen in `ev.js` (`POP`) und in `strategy.json` (`responseFit.final`). Geschätzte Wirkung der Gegnerwerte: Passivität (VPIP − PFR) senkt die Schwelle deutlich (lp = −0,86), hoher WTSD senkt sie (lw = −0,10), hoher Fold-Wert gegen C-Bets hebt sie nur schwach (lf = 0,04); VPIP allein wirkt kaum (lv ≈ 0).

### Validierung und Übertragbarkeit – und warum gemittelt wird

- **Gegen einen aggressiveren Helden** (Validierungslauf `v21`, Seed 505, Held = Coach mit Populationsmodell): Die Gegner-KI passt sich an beobachtbare Werte des Helden an (u. a. Aggression), sie foldet dann seltener. Beobachtet ⅓ 26 %, 1,5 Pot 67 %; das Modell sagte 31 % und 69 % voraus. Die Größenwahl des reinen Populationsmodells war in diesem Lauf realisiert **schlechter** als „immer Check“ (−3,0 BB je Spot, Standardfehler 1,4; 463 Spots), vor allem durch Overbets auf Flop und Turn (Turn 1,5 Pot: −13,9 ± 5,1 BB über 61 Spots, Modell +4,4).
- **Gegen dem Coach unbekannte Strategien** (`v21`, Zusammensetzung „synthetisch“, Seed 601; Maniac, Calling Station, Rock, MDF-Verteidiger, zufällig-legal, Stilwechsler): Die Fold-Kurve ist fast flach (⅓ 22 %, 1,5 Pot 29 %); das Populationsmodell sagt 13 % bzw. 42 % voraus, das MDF-Modell 38 % bzw. 46 %. Log-Loss Populationsmodell 0,853 gegen 0,850 für das Modell 2.0.1 – keine Verbesserung bei unbekannten Strategien.
- **Folgerung:** Das Populationsmodell beschreibt die Gegner-KI gegen den Helden, an dem es kalibriert wurde, deutlich besser, überschätzt aber Folds bei großen Einsätzen, sobald sich die Gegner anpassen oder anders spielen. Der Coach 2.1 nutzt deshalb eine **Modellmittelung**: Die Fold-Rate ist das Mittel aus Populationsmodell und strukturellem Modell 2.0.1; die Schwelle des Populationsmodells wird so verschoben, dass sie diese Fold-Rate trifft (die Zusammensetzung der Call- und Raiserange bleibt die des Populationsmodells). Die Mittelung wurde auf Entwicklungs-Seeds (7001–7021) gegen das reine Populationsmodell ausgewählt (gepaart gegen 2.0.1 über 10.000 Hände: rein −7,4 BB/100 [−28,3; 12,7], gemittelt +1,7 [−19,0; 21,1]; beides nicht belegt). Die Hauptläufe verwenden andere Seeds.
<!-- VALIDIERUNG-GEMITTELT -->

### Weitere geprüfte Bausteine

- **Equity Realization:** Aus den Ausspielungen lässt sich die Realisierung im Call-Zweig grob schätzen (realisierter Wert / (Modell-Equity · Pot nach dem Call)). Im Basislauf liegt sie auf Flop und Turn bei 0,94–1,09, nur Turn-Overbets 0,75; im Validierungslauf `v21` nach großen Flop-Bets 0,52–0,67, weil der Held danach selbst zu aggressiv weiterspielt. Für die Realisierung beim Check sind die Stichproben je Equity-Klasse zu klein (n ≈ 20–80, Streuung größer als die Effekte). **Keine Änderung** an `realization()`; eine belastbare Kalibrierung braucht deutlich mehr Spots.
- **Equity gegen die Callrange:** Mit dem Populationsmodell ist sie am River kalibriert (z. B. ½ Pot 0,375 vorhergesagt, 0,346 beobachtet), auf dem Turn bleibt eine Überschätzung von 0,04–0,08 (beide Modelle). Nicht korrigiert, weil eine Korrektur verdeckte Karten der Caller als Kalibrierungsdaten bräuchte; als Grenze dokumentiert.
- **Effektive Stacks/SPR:** Der Preis π nutzt den tatsächlich zahlbaren Call (begrenzt durch den Stack des Gegners); ein Raise ist ausgeschlossen, wenn der Gegner nur noch callen kann (Test). SPR wirkt wie bisher über die Realisierung.
- **Blocker:** Ranges werden je Kombination nach Entfernung der eigenen Karten geführt; Equity, Callrange und Fold-Rate enthalten den Kartenentzug damit exakt. Der Blocker-Text bleibt eine Erklärung.
- **Board Texture, Range- und Nut-Advantage:** Die absolute Stärke und die Draw-Equity hängen direkt vom Board ab. Dass Gegner auf die Range des Helden (Range- oder Nut-Advantage) reagieren, modelliert 2.1 nicht – die Gegner-KI tut das auch nicht, echte Spieler teilweise schon. Offen.
- **Multiway:** Der Gegnerterm c2 ist klein (0,01); der Abschlag von 2.0.1 je weiterem Gegner entfällt im Populationsmodell und bleibt über die Mittelung zur Hälfte erhalten. In den Ausspielungen des Basislaufs waren kleine Multiway-Bets realisiert positiv, die Stichproben (≈ 180 Spots) sind aber klein.
- **Kandidaten:** Unverändert ⅓, ½, ¾, Pot, Overbet 1,5 (nur Turn/River heads-up) und All-in; keine Regel bevorzugt bestimmte Größen.

## 3. River-Modellspiel (CFR+)

- **Änderung:** optionaler Raise (IP-Raise gegen eine Bet und Check-Raise, Pot-Raise auf 1 + 3s, begrenzt durch den effektiven Stack), Einsätze größer als der Stack werden zum All-in. Der Coach verwendet den Baum mit Raises, 10 Stärkegruppen und 700 Iterationen (Tiefenanalyse: 20 Gruppen, 2.500 Iterationen); gegen einen River-Raise zeigt er kein Modell (der Baum bildet ihn nur mit fester Größe ab).
- **Validierung:** (1) Unabhängige Best Response (`PT.cfr.evaluate`, rekursiv je Bucket, ohne Regret-Code) stimmt mit Spielwert und Exploitability der CFR+-Lösung auf 10⁻⁹ überein, für zufällige Spiele mit und ohne Raises und mit Stackgrenze (Test). (2) Analytisches Spiel „Nuts/Luft gegen Bluffcatcher“: Mit Raise-Option bleibt die geschlossene Lösung (Bluffanteil, Call-Häufigkeit 1/(1 + b)) erhalten, der dominierte Raise des Bluffcatchers wird nicht gewählt. (3) Eine zusätzliche Option für IP senkt den Spielwert von OOP nicht, ein Check-Raise erhöht ihn nicht weniger (Nullsummen-Eigenschaft).
- **Genauigkeit an realistischen Spots** (`tests/strategy/cfr-study.js`, Ranges aus dem Coach, Spots aus Simulationen): Abstraktionsfehler = Exploitability der Bucket-Lösung im exakten Kombinationsspiel; die Lösung ohne Raises ist im Spiel mit Raises stark ausnutzbar; Tabellen im automatisch erzeugten Block. Der Nutzen der Raise-Option ist damit nachgewiesen (Modellgenauigkeit), die Rechenzeit bleibt im Budget. Das Modellspiel ändert keine Empfehlung, es erscheint nur im Erklärtext.

## 4. Entscheidungsbewertung (grade)

- **Frei gewählte Größen:** Die App rechnet die gewählte Größe nach (`input.extra`). Die Interpolation bleibt nur Rückfall; gemessen an 150 Spots gegen die Nachrechnung: mittlerer Fehler 0,019 BB, 90. Perzentil 0,044 BB, höchstens 0,36 BB; relativ zum EV-Abstand der Nachbargrößen im Mittel 15 %, im 90. Perzentil 30 %; die Bewertungsstufe wich in 9 von 150 Fällen ab. Neu: Die Unsicherheit einer interpolierten Größe wird um 35 % des Abstands erweitert (außerhalb der bewerteten Größen um den vollen Abstand), das Ergebnis trägt `interpolated` und `interpErr`.
- **Empfehlung vs. höchster Modell-EV:** `grade()` meldet `modelTopLabel` und `recGapBB` (preflop kann der Chart-Anker vom Modellmaximum abweichen); bewertet wird gegen die Empfehlung, eine Aktion außerhalb des Charts bleibt gedeckelt.
- **Knappe Alternativen:** `withinU` kennzeichnet Verluste innerhalb der Unsicherheit; „Optimal“ wird bei gleichwertigen Alternativen nicht als „eindeutig“ formuliert (seit 81a4e86), und die Klassifikation „eindeutig“ verlangt einen Abstand ≥ 3u zur besten Aktion einer anderen Gruppe (Test über simulierte Entscheidungen).

## 5. Vergleichsrahmen (`tests/strategy/`)

- **Isolation:** `engine-vm.js` lädt Coach 2.0.1 (Arbeitsbaum `wt-v201`, Zweig `sicherung-2.0.1`) und 2.1 je Lauf in einen eigenen vm-Kontext (eigene Caches, Uhr fest: keine Zeitbremse, Ergebnisse unabhängig von der Rechnerlast). Tisch, Regeln, Gegner-KI und Statistik stammen für alle Helden aus derselben Umgebung (dieser Zweig; Prüfsumme `envHash` im Ergebnis). Der Coach erhält nur `publicView` und die Datenbankwerte der Gegner am Tisch (JSON-Kopie).
- **Helden:** Coach 2.1 und 2.0.1 (exploitativ, zusätzlich gleichgewichtsnah), Gegner-KI als Held (Profil g004, Stil „ausgeglichen“; im alten Bericht fälschlich „TAG-Bot“ genannt), Referenz Pot-Odds-Schwelle (Equity gegen zufällige Hände, Call ab Pot Odds, Bet ab fester Schwelle), Referenz Push/Fold (Chart bis 20 BB).
- **Gegner:** Gegner-KI in den Schwierigkeiten gemischt, Anfänger, Experte; halb Gegner-KI/halb synthetisch; je eine synthetische Strategie allein (Maniac, Calling Station, Rock, MDF-Verteidiger, zufällig-legal, Stilwechsler alle 60 Hände). Die synthetischen Strategien stehen nur in `tests/strategy/strategies.js`, nutzen nur die öffentliche Sicht und sitzen unter Pool-Namen am Tisch; der Coach erfährt nur ihre HUD-Werte.
- **Zufallsströme:** Karten aus `session.streams` (deal), Gegnerentscheidungen (bots), Rotation (tisch), Coach-Seed aus Tisch-Seed, Handnummer und Aktionszahl. Gleiche Seeds geben jedem Helden dieselben Karten je Handnummer. **Grenze:** Sobald zwei Helden verschieden handeln, laufen Gegnerentscheidungen, Datenbankwerte und Anpassung der Gegner auseinander; die Paarung senkt die Streuung nur in den Händen, die gleich verlaufen.
- **Stacks:** Vor jeder Hand werden alle Stacks auf die Starttiefe gesetzt (40, 100, 200 BB; Push/Fold-Vergleich 15 BB).
- **All-in-Bereinigung (Primärkennzahl, vor den Hauptläufen festgelegt):** Endet eine Hand im Showdown, nachdem vor dem River niemand mehr handeln konnte, wird das Ergebnis des Helden durch seinen Erwartungswert über alle restlichen Boards ersetzt (Deck ohne alle zwölf ausgeteilten Karten und ohne Board; Flop/Turn exakt, preflop 600 Stichproben). Das ist der bedingte Erwartungswert gegeben alle ausgeteilten Karten und damit unverzerrt; Rohwerte werden immer mit berichtet. Test: Abrechnung mit dem echten Board reproduziert das Ergebnis in allen Showdowns.
- **Statistik:** BB/100 = Summe / Hände · 100; 95-%-Intervalle per Block-Bootstrap (Blöcke von 500 aufeinanderfolgenden Händen, 2.000 Wiederholungen, geschichtet je Lauf); gepaarte Differenz Block für Block (gleiche Seeds, gleiche Handnummern). Eine Verbesserung gilt nur als belegt, wenn das Intervall der Differenz ganz über 0 liegt. Läufe, die in mehreren Vergleichen vorkommen (z. B. ein Lauf der Gegner-KI als Held als Basis für 2.1 und 2.0.1), werden im Bericht gekennzeichnet.
- **Etappen:** Läufe zu je 2.500 Händen mit eigener Ergebnisdatei (Schlüssel: Job und Prüfsumme der Engine-Dateien); ein Neustart der Umgebung wiederholt nur unfertige Läufe. Folge: Jede Session beginnt mit leerer Datenbank; der exploitative Modus hat je Lauf höchstens 2.500 Hände Gegnerwissen.
- **Rechenzeit:** Das River-Modellspiel erzeugt nur Erklärtext; in den Massenläufen rechnet 2.1 es nicht mit (`skipModel`, Empfehlungen unverändert), 2.0.1 schon. Die Zeitmessung des vollständigen Tipps steht in Abschnitt 3 und in den Tests (≤ 2 s, ≤ 5.000 Simulationen).

Aufrufe: `node tests/strategy/compare.js --plan haupt --jobs 2` (Hauptvergleich), `--plan entwicklung` (Auswahl auf Entwicklungs-Seeds), `node tests/strategy/sizing-study.js <Wurzel> <Seed> <Hände> <Zusammensetzung> <Label>`, `node tests/strategy/sizing-analyze.js <Label> <Zusammensetzung> --save`, `node tests/strategy/fit-response.js <Label> <Training> <Prüfung>`, `node tests/strategy/cfr-study.js <Spots>`, Bericht `node tools/report-strategy.js` bzw. `node tools/report.js`.

## 6. Automatisch erzeugte Ergebnisse

<!-- AUTO-STRATEGIE-START (erzeugt mit node tools/report-strategy.js, nicht von Hand bearbeiten) -->
<!-- AUTO-STRATEGIE-ENDE -->

## 7. Fazit

<!-- FAZIT -->

## 8. Grenzen und offene Punkte

- Die Gegner sind Computergegner dieses Trainers und wenige synthetische Strategien; Ergebnisse gegen Menschen sind nicht gemessen.
- Das Populationsmodell ist an der Gegner-KI gegen einen bestimmten Helden kalibriert. Gegner, die sich an den Helden anpassen, und unbekannte Strategien weichen ab (Abschnitt 2); die Mittelung mildert das, ersetzt aber keine Kalibrierung gegen Menschen.
- Die Bewertung späterer Setzrunden bleibt eine Näherung über Equity Realization; die Daten reichen nicht für eine belastbare Neukalibrierung.
- Die Paarung über gemeinsame Zufallszahlen wirkt nur, solange die Helden gleich handeln; danach streuen die Differenzen wie unabhängige Läufe.
- Sessions von 2.500 Händen: Gegnerwissen des exploitativen Modus ist kürzer als bei echter Nutzung über Monate.
- Das River-Modellspiel ist ein vereinfachtes Spiel (zwei Größen, höchstens ein Raise, 10 oder 20 Stärkegruppen, feste Ranges aus dem Range-Modell) und kein No-Limit-Solver.
