# Coach und Strategie 2.1 – Analyse, Methoden, Ergebnisse, Grenzen

Stand: 26.11.2026, Zweig `strategie-2.1`; Korrekturen nach Prüfung B am 27.11.2026 (Zweig `strat-fix-2.1`, Abschnitt 2a). Studien und Kalibrierung liefen auf dem Stand nach dem Merge von Mathe 2.1 und Gegnergedächtnis (main 05832f2), der Hauptvergleich auf dem Stand mit allen Zweigen und den Prüfer-A-Korrekturen (main b7dde90 + Strategie, Commit b9f3a8f); dazwischen änderten sich Equity-Cache, Range-Kennung und Veränderungserkennung, nicht die Gegner-KI. Alle Zahlen stammen aus ausgeführten Läufen; Rohdaten und Auswertungen liegen in `tests/results/strategy.json` (Abschnitte `sizing`, `responseFit`, `cfr`, Vergleiche) und `tests/results/strategy-runs/`. Der Block am Ende („Automatisch erzeugte Ergebnisse“) wird mit `node tools/report-strategy.js` ausschließlich aus diesen Dateien erzeugt; Aussagen wie „in k von n Läufen vorn“ werden dort gezählt, nicht von Hand geschrieben. Der Coach bleibt eine Faustregel mit Modellannahmen („Faustregel, kein Solver-Ergebnis“); nichts hier ist eine GTO-Lösung für No-Limit Hold'em.

<!-- KURZFASSUNG-START -->
## Kurzfassung

Die Kurzfassung steht am Ende dieses Dokuments unter „Fazit“, nachdem alle Messungen beschrieben sind.
<!-- KURZFASSUNG-ENDE -->

## 1. Warum empfahl der Coach so selten ½ Pot?

### Daten

Größenstudie mit gegenfaktischen Ausspielungen (`tests/strategy/sizing-study.js`): Der Held spielt nach dem Coach. An jedem Postflop-Spot, an dem er setzen darf, wird die Hand für **jede** Kandidatenaktion kopiert (Check, Bet ⅓, ½, ¾, 1 und 1,5 Pot; gegen eine Bet: Fold, Call, Raise 2,5× und 3,5×) und mit denselben Karten und demselben Zufallsstrom der Gegner zu Ende gespielt (gemeinsame Zufallszahlen). Gemessen werden je Größe die erste Reaktion jedes Gegners, der realisierte Wert relativ zum sofortigen Fold (All-in-bereinigt, siehe Abschnitt 6) und die Vorhersage des Coaches. Die Kopien sind nur ein Messinstrument der Simulation; der Coach selbst sieht nie verdeckte Karten.

Basislauf mit dem Reaktionsmodell von 2.0.1 (`label base`, Seeds 503 und 504, 7.000 Hände, 2.095 Spots, davon 1.621 ohne offenen Einsatz, Gegner-KI gemischt, 100 BB; Stand nach dem Merge von Mathe 2.1 und Gegnergedächtnis):

| Größe | Fold beobachtet | Fold vorhergesagt (2.0.1, exploitativ) | Raise beobachtet | Raise vorhergesagt |
|---|---:|---:|---:|---:|
| ⅓ Pot | 35,2 % | 27,2 % | 4,5 % | 14,5 % |
| ½ Pot | 47,6 % | 35,5 % | 5,0 % | 12,8 % |
| ¾ Pot | 54,7 % | 44,6 % | 5,3 % | 11,0 % |
| Pot | 61,6 % | 47,9 % | 5,8 % | 10,3 % |
| 1,5 Pot | 72,6 % | 47,9 % | 6,4 % | 10,2 % |

(je Größe rund 1.870 Gegnerreaktionen, Standardfehler der beobachteten Fold-Rate ≈ 1,1 Prozentpunkte). Am River heads-up ist die Lücke am größten (Prüf-Seed 504: gegen ⅓ Pot 53,8 % Fold beobachtet, 21,8 % vorhergesagt; gegen 1,5 Pot 89,0 % statt 43,5 %).

Realisierter Wert gegenüber Check (BB je Spot, gepaart über dieselben Spots, Standardfehler in Klammern) und der Wert, den das 2.0.1-Modell für dieselbe Differenz erwartete:

| Hand (Modell-Equity) | ⅓ | ½ | ¾ | Pot | 1,5 Pot |
|---|---:|---:|---:|---:|---:|
| < 35 % realisiert | +0,57 (0,50) | +0,28 (0,61) | +0,05 (0,72) | +0,65 (0,82) | +0,81 (0,87) |
| < 35 % Modell 2.0.1 | −1,03 | −1,35 | −1,59 | −2,37 | −4,70 |
| 35–60 % realisiert | +0,84 (0,71) | +0,12 (0,73) | −0,90 (0,82) | −0,86 (0,84) | −0,36 (0,95) |
| 35–60 % Modell 2.0.1 | −0,38 | −0,79 | −1,47 | −2,12 | −3,56 |
| ≥ 60 % realisiert | +0,48 (1,29) | +1,50 (1,34) | +0,04 (1,46) | −0,03 (1,58) | −0,80 (1,63) |
| ≥ 60 % Modell 2.0.1 | +2,45 | +2,96 | +3,35 | +3,72 | +4,64 |

Welche Aktion das 2.0.1-Modell unter diesen sechs wählte: Check 913-mal, ⅓ 149, ½ 90, ¾ 129, Pot 21, 1,5 Pot 319 (von 1.621 Spots; in echten Spots ist die Overbet auf dem Flop und multiway kein Kandidat).

### Befund

1. **½ Pot ist in den Daten nicht schlechter als die anderen Größen.** Über alle Spots: ⅓ +0,64 (0,48), ½ +0,57 (0,51), ¾ −0,27 (0,57), Pot −0,04 (0,61), 1,5 Pot −0,03 (0,65) BB gegenüber Check; die Unterschiede liegen innerhalb von ein bis zwei Standardfehlern. „Immer ½ Pot“ hätte über dieselben Spots +0,60 (0,50) BB gegenüber Check gebracht, die Wahl des 2.0.1-Modells −0,12 (0,47).
2. **Zwei Modellfehler drängen ½ Pot heraus.** (a) Folds werden unterschätzt, am stärksten am River und bei großen Einsätzen (die Overbet-Korrektur und der konservative Abschlag machen die Fold-Kurve oberhalb von Pot flach). Dadurch erscheinen Bluffs und Semi-Bluffs mit schwachen Händen negativ (Modell −1,0 bis −4,7 BB), obwohl sie realisiert eher positiv sind; mit diesen Händen wählt das Modell Check statt einer kleinen oder mittleren Bet. (b) Die Equity gegen die Callrange wird überschätzt (heads-up, gemessen gegen die tatsächliche Hand des Callers, nur zur Auswertung): Flop ½ Pot 0,47 statt 0,40 beobachtet, Turn ½ Pot 0,43 statt 0,35, River ½ Pot 0,37 statt 0,21. Mit einer zu schwachen Callrange steigt der Modellwert von Value-Bets monoton mit der Größe (≥ 60 %: +2,5 → +4,6 BB), realisiert ist die Kurve flach mit dem höchsten Punktwert bei ½ Pot. Für Value „gewinnt“ deshalb die größte Größe, für schwache Hände der Check – ½ Pot ist selten das Maximum.
3. **Raises werden überschätzt** (Modell 10–15 %, beobachtet 4–6 %), was Bets zusätzlich bestraft.
4. **Fehlanpassung an Gegnertypen:** Gegen Spieler mit HUD-Typ „Nit“ sagte 2.0.1 nach ⅓ Pot 15 % Fold voraus, beobachtet 63 % (27 Reaktionen), weil die Untergrenze aus der Range-Zusammensetzung („starke Hände spielen immer weiter“) bei engen Ranges sehr hoch ausfällt.

## 2. Reaktionsmodell 2.1

### Populationsmodell (Schwellenmodell)

Ein Gegner spielt mit einer Kombination weiter, wenn ihre absolute Stärke x (Perzentil gegen alle mit dem Board verträglichen Hände, `PT.ev.absStrength`) über einer Schwelle θ liegt, die mit dem Preis π = Call / (Pot nach dem Call) steigt. Draws spielen weiter, wenn ihre Draw-Equity aus den Outs den Preis deckt:

- θ = c0[Straße] + c1[Straße]·π + c2·(Gegner − 1) + c3·[Raise des Helden] + lf·(logit f̂ − logit f₀) + lw·(logit WTSD − logit WTSD₀) + lv·(logit VPIP − logit VPIP₀) + lp·((VPIP − PFR) − (VPIP₀ − PFR₀))
- P(weiter | x) = σ((x − θ)/τ), für Draws max(…, σ((Equity_Draw − π − c4)/τd)); P(Raise | x) = r0·σ((x − r1)/0,02) + rd·[Draw]
- f̂: geglätteter Fold-Wert gegen C-Bets (Flop) bzw. Turn-C-Bets; alle Gegnerwerte mit dem Beta-Prior der App geglättet.

Die Callrange ist w·(P(weiter) − P(Raise)), die Raiserange w·P(Raise) – weiche Gewichte je Kombination statt eines harten Schnitts. Damit ist das Modell zusammensetzungsabhängig: Eine schwache Range foldet mehr als eine starke, ohne Sonderregeln für Untergrenzen oder Overbets.

**Kalibrierung** (`tests/strategy/fit-response.js`): Maximum Likelihood (Nelder-Mead, Parametergrenzen) auf den beobachteten ersten Reaktionen im Basislauf. Eingehen nur am Tisch sichtbare Größen: Aktion des Gegners, Einsatzgröße, Straße, Gegnerzahl, die vom Coach aus öffentlichen Informationen geschätzte Range und die HUD-Werte. Keine verdeckten Karten, keine internen Spielstile. Prüfung auf getrenntem Seed (Training 503, Prüfung 504; 4.915 bzw. 5.531 Reaktionen): Log-Loss Prüfung 0,772 (2.0.1: 0,895), Training 0,775 (2.0.1: 0,924). Fold-Rate auf dem Prüf-Seed beobachtet / Modell 2.1 / Modell 2.0.1: ⅓ 32,4 / 32,3 / 27,6 %, ½ 47,0 / 43,2 / 35,7 %, ¾ 53,7 / 54,0 / 44,7 %, Pot 59,9 / 61,4 / 47,9 %, 1,5 Pot 70,9 / 71,4 / 47,8 %; River heads-up ⅓ Pot 53,8 / 49,2 / 21,8 %. Raise gegen Bets beobachtet 4–6 %, Modell 6 %. Die endgültigen Parameter (Training auf 503 und 504) stehen in `ev.js` (`POP`) und in `strategy.json` (`responseFit.final`). Geschätzte Wirkung der Gegnerwerte: Passivität (VPIP − PFR) senkt die Schwelle deutlich (lp = −0,79), hoher WTSD senkt sie (lw = −0,12), der Fold-Wert gegen C-Bets und VPIP allein wirken kaum (lf = 0,01, lv = −0,03) – die Range-Schätzung aus VPIP/PFR erklärt den Großteil bereits.

### Validierung und Übertragbarkeit – und warum gemittelt wird

Alle Validierungsläufe nutzen Seeds, die nicht zur Kalibrierung dienten, und den gemergten Stand (Gegner-KI mit stärkerer Anpassung an beobachtbare Werte des Helden). Die Strategiewerte sind gepaart über die Spots des jeweiligen Laufs; zwischen Läufen sind die Spots verschieden (der Held spielt anders), die Werte also nur innerhalb eines Laufs vergleichbar.

| Lauf (Seed, 2.000 Hände) | Held | Fold ⅓ beob./Modell | Fold 1,5 Pot beob./Modell | Modellwahl gegen „immer Check“ (BB je Spot) | „immer ½ Pot“ |
|---|---|---:|---:|---:|---:|
| `v21p` (505), Gegner-KI | reines Populationsmodell | 26,6 / 31,4 % | 67,6 / 68,7 % | −2,97 (1,36), 453 Spots | +0,59 (1,27) |
| `v21b` (505), Gegner-KI | gemittelt (2.1) | 28,0 / 30,5 % | 68,9 / 58,9 % | −1,39 (1,06), 466 Spots | +0,18 (0,92) |
| `v21b` (601), synthetisch | gemittelt (2.1) | 21,6 / 20,4 % | 29,0 / 42,7 % | +1,27 (1,80), 409 Spots | −3,89 (1,97) |
| `base` (503/504), Gegner-KI | Modell 2.0.1 | 35,2 / 27,2 % | 72,6 / 47,9 % | −0,12 (0,47), 1.621 Spots | +0,60 (0,50) |

- **Gegen einen aggressiveren Helden passen sich die Gegner an** und folden seltener (⅓ Pot 27–28 % statt 35 %). Das reine Populationsmodell überschätzt dann Folds bei mittleren Größen und wählt in fast der Hälfte der Spots die Overbet; seine Größenwahl ist realisiert schlechter als „immer Check“ (−2,97 ± 1,36 BB), getrieben von Overbets auf Flop und Turn (Flop 1,5 Pot −6,2 ± 2,7 BB über 120 Spots, Turn −8,5 ± 4,8 über 56; Modell jeweils deutlich positiv).
- **Unbekannte Strategien** (Maniac, Calling Station, Rock, MDF-Verteidiger, zufällig-legal, Stilwechsler): Die Fold-Kurve ist fast flach (⅓ 22 %, 1,5 Pot 29 %). Das gemittelte Modell trifft kleine Größen (20 % vorhergesagt) und überschätzt große (43 %), das MDF-Modell des gleichgewichtsnahen Modus liegt bei 38–50 %. Log-Loss gemittelt 0,83 gegen 0,93 für das MDF-Modell (Raise-Anteil dort mit 10 % angesetzt).
- **Modellmittelung:** Der Coach 2.1 nutzt als Fold-Rate das Mittel aus Populationsmodell und strukturellem Modell 2.0.1; die Schwelle des Populationsmodells wird auf diese Fold-Rate verschoben (Call- und Raiserange bleiben weiche Gewichte des Schwellenmodells). Auswahl auf Entwicklungs-Seeds (7001, 7002, 7011, 7021; je 2.500 Hände, gepaart): gemittelt − 2.0.1 = −0,4 BB/100 [−22,8; 21,0], rein − 2.0.1 = −13,7 [−35,7; 8,3], gemittelt − rein = +13,3 [−0,7; 28,3] – keine Differenz belegt, die Mittelung ist aber die einzige Variante ohne negativen Punktwert gegenüber 2.0.1. Die Hauptläufe nutzen andere Seeds.
- **Offen bleibt** (Stand vor Prüfung B; aktualisiert in Abschnitt 2a): Auch mit Mittelung sind große Einsätze realisiert schwächer, als das Modell erwartet (`v21b`: „immer Bet 1,5 Pot“ −2,97 ± 1,41 BB gegen Check). Ursache sind nach den Diagnosen die überschätzte Equity gegen die Callrange auf Flop und Turn und das Spiel nach einem gecallten großen Einsatz (Abschnitt „Weitere geprüfte Bausteine“). ½ Pot ist in allen Läufen unter den besten festen Größen.

### Weitere geprüfte Bausteine

- **Equity Realization:** Aus den Ausspielungen lässt sich die Realisierung im Call-Zweig grob schätzen (realisierter Wert / (Modell-Equity · Pot nach dem Call)). Im Basislauf liegt sie auf Flop und Turn bei 0,94–1,09, nur Turn-Overbets 0,75; im Validierungslauf `v21` nach großen Flop-Bets 0,52–0,67, weil der Held danach selbst zu aggressiv weiterspielt. Für die Realisierung beim Check sind die Stichproben je Equity-Klasse zu klein (n ≈ 20–80, Streuung größer als die Effekte). **Keine Änderung** an `realization()`; eine belastbare Kalibrierung braucht deutlich mehr Spots.
- **Equity gegen die Callrange:** Mit dem Populationsmodell ist sie am River kalibriert (z. B. ½ Pot 0,375 vorhergesagt, 0,346 beobachtet), auf dem Turn bleibt eine Überschätzung von 0,04–0,08 (beide Modelle). Nicht korrigiert, weil eine Korrektur verdeckte Karten der Caller als Kalibrierungsdaten bräuchte; als Grenze dokumentiert.
- **Effektive Stacks/SPR:** Der Preis π nutzt den tatsächlich zahlbaren Call (begrenzt durch den Stack des Gegners); ein Raise ist ausgeschlossen, wenn der Gegner nur noch callen kann (Test). SPR wirkt wie bisher über die Realisierung.
- **Blocker:** Ranges werden je Kombination nach Entfernung der eigenen Karten geführt; Equity, Callrange und Fold-Rate enthalten den Kartenentzug damit exakt. Der Blocker-Text bleibt eine Erklärung.
- **Board Texture, Range- und Nut-Advantage:** Die absolute Stärke und die Draw-Equity hängen direkt vom Board ab. Dass Gegner auf die Range des Helden (Range- oder Nut-Advantage) reagieren, modelliert 2.1 nicht – die Gegner-KI tut das auch nicht, echte Spieler teilweise schon. Offen.
- **Multiway:** Der Gegnerterm c2 ist klein (0,01); der Abschlag von 2.0.1 je weiterem Gegner entfällt im Populationsmodell und bleibt über die Mittelung zur Hälfte erhalten. In den Ausspielungen des Basislaufs waren kleine Multiway-Bets realisiert positiv, die Stichproben (≈ 180 Spots) sind aber klein.
- **Kandidaten:** Unverändert ⅓, ½, ¾, Pot, Overbet 1,5 (nur Turn/River heads-up) und All-in; keine Regel bevorzugt bestimmte Größen. Seit Prüfung B preflop keine Raises ab ⅓ des effektiven Stacks außer All-in.

## 2a. Korrekturen nach Prüfung B (27.11.2026)

Vollständige Tabelle mit Ursachen, Tests und Kennzahlen: `docs/audit-2.1/PRUEFUNG_B.md`. Für die Methoden relevant:

- **Gegner-KI (B3):** Starke Hände folden je nach Stil gegen sehr große Einsätze (Calling Stations kaum, Nits/TAGs meist); die Call-Schwelle steigt auch über 1,6 Pot. Stil-Kalibrierung weiter in allen Zielbereichen. Danach **Neukalibrierung** des Populationsmodells (Basislauf `base`, Seeds 503/504, je 3.500 Hände, 2.503 Spots; Training 5.758, Prüfung 6.428 Reaktionen): Prüf-Log-Loss 0,771 (2.0.1-Modell 0,894), final (503 + 504) 0,772; Fold beobachtet/Modell auf dem Prüf-Seed ⅓ 32,7/32,9 %, ½ 47,0/43,5 %, ¾ 54,0/53,9 %, Pot 59,9/61,1 %, 1,5 Pot 71,8/70,7 %. Die Parameter vor Prüfung B stehen als `responseFit.holdout_vorPruefungB`/`final_vorPruefungB` in `strategy.json`; die Werte in Abschnitt 2 oben beschreiben den Stand davor.
- **Zusammensetzung der Callrange (B4):** Die Fold-Rate bleibt die kalibrierte; die Callrange wird mit scharfem Schnitt (τc = 0,03) zusammengesetzt – unter allen monotonen Zusammensetzungen gleicher Quote die stärkste und damit die vorsichtige Annahme für eigene Bets. Gemessen (Seed 505, je 2.000 Hände, alt `v21b` gegen neu `v21c`): Equity gegen die tatsächliche Caller-Hand auf dem Turn (Modell/beobachtet) ½ Pot 0,496/0,456 → 0,492/0,494, Pot 0,484/0,415 → 0,439/0,448; River ⅓ Pot 0,436/0,329 → 0,365/0,276; Modell-EV gegenüber Check für Equity ≥ 60 % bei ⅓ … 1,5 Pot 2,5 → 4,8 BB (monoton steigend) → 2,2 … 2,9 BB (flach).
- **Offen nach Prüfung B (B4):** (1) Die Mittelung mit dem 2.0.1-Modell unterschätzt Folds bei 1,5 Pot gegen die Gegner-KI (0,58 statt 0,73), das bevorzugt große Value-Bets um etwa 0,15 Pot gegenüber ½ Pot; gegen unbekannte Strategien folden Gegner bei großen Einsätzen dagegen seltener (Abschnitt 2), deshalb unverändert. (2) Im Call-Zweig realisieren starke Hände bei einem Rest-SPR von 3–6 weniger als modelliert (−0,22 Pot), bei SPR ≥ 10 mehr; eine Anpassung an realisierten Ergebnissen war zwischen den Seeds instabil (Steigung 0,52 bzw. −0,08, Prüf-Fehler größer) und wurde nicht übernommen. (3) Die River-Equity gegen Caller bleibt überschätzt.
- **Gleichgewichtsnaher Modus (B7):** reine MDF ohne Populationskorrekturen; ein reiner Bluff ist dort indifferent (EV 0), wie im Gleichgewicht. Größenstudie e5 (Seed 4244): Check mit Equity < 30 % 214 von 222 → 143 von 229.
- **Bewertung (B2):** Reaktionsunsicherheit begrenzt, Toleranz der Notenstufen höchstens ¼ Pot, Größen jenseits aller Kandidaten als Extrapolation gekennzeichnet (nie Empfehlung, höchstens „Gut“).
- **Preflop (B1, B5, B8):** Fold am Chartgewicht; Exploit-Beleg auf der tatsächlich verwendeten Fold-Rate mit skeptischem Prior (ohne eigene Beobachtung kein Exploit); Raises ab ⅓ des effektiven Stacks nur als All-in.
- **Ranges (B11):** Leads in den Aggressor nach absoluter Stärke, Häufigkeiten an Showdowns der Gegner-KI gemessen (Politik „Lead immer callen“).

## 3. River-Modellspiel (CFR+)

- **Änderung:** optionaler Raise (IP-Raise gegen eine Bet und Check-Raise, Pot-Raise auf 1 + 3s, begrenzt durch den effektiven Stack), Einsätze größer als der Stack werden zum All-in. Der Coach verwendet den Baum mit Raises, 10 Stärkegruppen und 700 Iterationen (Tiefenanalyse: 20 Gruppen, 2.500 Iterationen); gegen einen River-Raise zeigt er kein Modell (der Baum bildet ihn nur mit fester Größe ab).
- **Validierung:** (1) Unabhängige Best Response (`PT.cfr.evaluate`, rekursiv je Bucket, ohne Regret-Code) stimmt mit Spielwert und Exploitability der CFR+-Lösung auf 10⁻⁹ überein, für zufällige Spiele mit und ohne Raises und mit Stackgrenze (Test). (2) Analytisches Spiel „Nuts/Luft gegen Bluffcatcher“: Mit Raise-Option bleibt die geschlossene Lösung (Bluffanteil, Call-Häufigkeit 1/(1 + b)) erhalten, der dominierte Raise des Bluffcatchers wird nicht gewählt. (3) Eine zusätzliche Option für IP senkt den Spielwert von OOP nicht, ein Check-Raise erhöht ihn nicht weniger (Nullsummen-Eigenschaft).
- **Genauigkeit an realistischen Spots** (`tests/strategy/cfr-study.js`, 24 River-Spots aus Simulationen, Ranges aus dem Coach, Größen ½ und 1 Pot): Die Lösung **ohne Raises** ist im Spiel mit Raises im Mittel um 17,2 % des Pots ausnutzbar (höchstens 34,1 %); die Lösung mit Raises um 0,91 % (10 Stärkegruppen) bzw. 0,48 % (20 Gruppen). Abstraktionsfehler ohne Raises (Exploitability der Bucket-Lösung im exakten Kombinationsspiel): 5 Gruppen 1,19 %, 10 Gruppen 0,46 %, 20 Gruppen 0,31 %, 40 Gruppen 0,24 % des Pots. Konvergenz (10 Gruppen, mit Raises, Exploitability im Modellspiel): 100 Iterationen 0,28 %, 300 0,057 %, 700 0,015 %, 2.500 0,002 %. Rechenzeit in Node: 10 Gruppen mit Raises Ø 74 ms (ohne Raises 39 ms), 20 Gruppen mit Raises Ø 126 ms. Der Nutzen der Raise-Option ist damit nachgewiesen (Modellgenauigkeit um gut eine Größenordnung besser), die Rechenzeit bleibt weit unter 2 s. 20 Gruppen bringen gegenüber 10 nur 0,4 Prozentpunkte und bleiben der Tiefenanalyse vorbehalten. Das Modellspiel ändert keine Empfehlung, es erscheint nur im Erklärtext.

## 4. Entscheidungsbewertung (grade)

- **Frei gewählte Größen:** Die App rechnet die gewählte Größe nach (`input.extra`). Die Interpolation bleibt nur Rückfall; gemessen an 150 Spots gegen die Nachrechnung: mittlerer Fehler 0,019 BB, 90. Perzentil 0,044 BB, höchstens 0,36 BB; relativ zum EV-Abstand der Nachbargrößen im Mittel 15 %, im 90. Perzentil 30 %; die Bewertungsstufe wich in 9 von 150 Fällen ab. Neu: Die Unsicherheit einer interpolierten Größe wird um 35 % des Abstands erweitert (außerhalb der bewerteten Größen um den vollen Abstand), das Ergebnis trägt `interpolated` und `interpErr`.
- **Empfehlung vs. höchster Modell-EV:** `grade()` meldet `modelTopLabel` und `recGapBB` (preflop kann der Chart-Anker vom Modellmaximum abweichen); bewertet wird gegen die Empfehlung, eine Aktion außerhalb des Charts bleibt gedeckelt.
- **Knappe Alternativen:** `withinU` kennzeichnet Verluste innerhalb der Unsicherheit; „Optimal“ wird bei gleichwertigen Alternativen nicht als „eindeutig“ formuliert (seit 81a4e86), und die Klassifikation „eindeutig“ verlangt einen Abstand ≥ 3u zur besten Aktion einer anderen Gruppe (Test über simulierte Entscheidungen).

- **Robustheit (Prüfer A, 2.1):** Genäherte oder fehlgeschlagene EV-Werte (z. B. Side-Pot-Berechnung ohne Budget) tragen `approx`/`failed`/`reason`, gehen nie als 0 ein und erweitern die Unsicherheit (Näherung ≥ 10 %, Ausfall ≥ 25 % des Pots); ist die beste Aktion betroffen, lautet die Klassifikation „unsicher“. Leere Ranges liefern „leere Range“ statt „exakt“ mit SE 0; der Coach fällt gekennzeichnet auf 0,5 mit SE 0,29 zurück. Fällt die Mehrgegner-Simulation aus, ist das Produkt der Heads-up-Equities als Näherung beschriftet (SE 0,06 statt 0,02). Der Cache der Equity je Kombination liefert nur Einträge mit mindestens dem angefragten Umfang und immer eine Kopie. Der Bayes-Beleg für preflop-Exploits rechnet die Break-even-Fold-Rate der gewählten Größe in den größenunabhängigen Rohwert zurück, bevor sie mit der Posterior verglichen wird. Gegnerwerte kommen über `PT.stats.effectiveStats` (bei erkannter Änderung der Spielweise Kurzzeitwerte). Regressionstests: `tests/unit/strategie-pruefer-a.js`, `strategie-bewertung.js`.

## 5. Vergleichsrahmen (`tests/strategy/`)

- **Isolation:** `engine-vm.js` lädt Coach 2.0.1 (Arbeitsbaum `wt-v201`, Zweig `sicherung-2.0.1`) und 2.1 je Lauf in einen eigenen vm-Kontext (eigene Caches, Uhr fest: keine Zeitbremse, Ergebnisse unabhängig von der Rechnerlast). Tisch, Regeln, Gegner-KI und Statistik stammen für alle Helden aus derselben Umgebung (dieser Zweig; Prüfsumme `envHash` im Ergebnis). Der Coach erhält nur `publicView` und die Datenbankwerte der Gegner am Tisch (JSON-Kopie).
- **Helden:** Coach 2.1 und 2.0.1 (exploitativ, zusätzlich gleichgewichtsnah), Gegner-KI als Held (Profil g004, Stil „ausgeglichen“; im alten Bericht fälschlich „TAG-Bot“ genannt), Referenz Pot-Odds-Schwelle (Equity gegen zufällige Hände, Call ab Pot Odds, Bet ab fester Schwelle), Referenz Push/Fold (Chart bis 20 BB).
- **Gegner:** Gegner-KI in den Schwierigkeiten gemischt, Anfänger, Experte; halb Gegner-KI/halb synthetisch; je eine synthetische Strategie allein (Maniac, Calling Station, Rock, MDF-Verteidiger, zufällig-legal, Stilwechsler alle 60 Hände). Die synthetischen Strategien stehen nur in `tests/strategy/strategies.js`, nutzen nur die öffentliche Sicht und sitzen unter Pool-Namen am Tisch; der Coach erfährt nur ihre HUD-Werte.
- **Zufallsströme:** Karten aus `session.streams` (deal), Gegnerentscheidungen (bots), Rotation (tisch), Coach-Seed aus Tisch-Seed, Handnummer und Aktionszahl. Gleiche Seeds geben jedem Helden dieselben Karten je Handnummer. **Grenze:** Sobald zwei Helden verschieden handeln, laufen Gegnerentscheidungen, Datenbankwerte und Anpassung der Gegner auseinander; die Paarung senkt die Streuung nur in den Händen, die gleich verlaufen.
- **Stacks:** Vor jeder Hand werden alle Stacks auf die Starttiefe gesetzt (40, 100, 200 BB; Push/Fold-Vergleich 15 BB).
- **All-in-Bereinigung (Primärkennzahl, vor den Hauptläufen festgelegt):** Endet eine Hand im Showdown, nachdem vor dem River niemand mehr handeln konnte, wird das Ergebnis des Helden durch seinen Erwartungswert über alle restlichen Boards ersetzt (Deck ohne alle zwölf ausgeteilten Karten und ohne Board; Flop/Turn exakt, preflop 600 Stichproben). Das ist der bedingte Erwartungswert gegeben alle ausgeteilten Karten und damit unverzerrt; Rohwerte werden immer mit berichtet. Test: Abrechnung mit dem echten Board reproduziert das Ergebnis in allen Showdowns.
- **Statistik:** BB/100 = Summe / Hände · 100; 95-%-Intervalle per Block-Bootstrap (Blöcke von 500 aufeinanderfolgenden Händen, 2.000 Wiederholungen, geschichtet je Lauf); gepaarte Differenz Block für Block (gleiche Seeds, gleiche Handnummern). Eine Verbesserung gilt nur als belegt, wenn das Intervall der Differenz ganz über 0 liegt. Läufe, die in mehreren Vergleichen vorkommen (z. B. ein Lauf der Gegner-KI als Held als Basis für 2.1 und 2.0.1), werden im Bericht gekennzeichnet.
- **Etappen:** Läufe zu je 2.500 Händen mit eigener Ergebnisdatei (Schlüssel: Job und Prüfsumme der Engine-Dateien); ein Neustart der Umgebung wiederholt nur unfertige Läufe. Folge: Jede Session beginnt mit leerer Datenbank; der exploitative Modus hat je Lauf höchstens 2.500 Hände Gegnerwissen.
- **Rechenzeit:** Das River-Modellspiel erzeugt nur Erklärtext; in den Massenläufen rechnet 2.1 es nicht mit (`skipModel`, Empfehlungen unverändert), 2.0.1 schon. Vollständiger Tipp 2.1 mit Modellspiel (`PT_COACH_FULL=1`, Seed 8801, 600 Hände, Node, Rechner mit anderen Läufen geteilt): exploitativ Ø 17,0 ms, höchstens 225 ms über 759 Entscheidungen; gleichgewichtsnah Ø 17,5 ms, höchstens 233 ms; höchstens 4.343 Simulationen je Entscheidung (Grenze 5.000).

- **Gepaarte Rollout-Bewertung je Entscheidungspunkt (varianzarm, `decision-eval.js`):** 24 Sessions zu je 400 Händen (zwölf Zusammensetzungen und Stacktiefen, darunter alle sechs unbekannten Strategien, je zwei Seeds), der Pfad folgt abwechselnd 2.1 und 2.0.1. An jedem Entscheidungspunkt empfehlen beide Coaches (gleiche öffentliche Sicht, gleiche Gegnerwerte). Unterscheiden sie sich, werden beide Aktionen ab dem echten Zustand je 100-mal zu Ende gespielt – gleiche verdeckte Karten der Gegner, je Rollout-Index gleiche künftige Boardkarten und gleiche Gegner-Zufallsströme für beide Aktionen; danach spielt der Held mit der festen Politik g004 weiter (keine Coach-Aufrufe im Rollout). Kennzahl: mittlere EV-Differenz je Punkt mit Cluster-Bootstrap über Hände. Das ist ein Ein-Schritt-Vergleich der ersten Aktion: Er bewertet, welche Aktion besser ist, wenn danach durchschnittlich weitergespielt wird, nicht die Folgeentscheidungen des Coaches.

Aufrufe: `node tests/strategy/compare.js --plan haupt --jobs 2` (Hauptvergleich), `--plan entwicklung` (Auswahl auf Entwicklungs-Seeds), `node tests/strategy/sizing-study.js <Wurzel> <Seed> <Hände> <Zusammensetzung> <Label>`, `node tests/strategy/sizing-analyze.js <Label> <Zusammensetzung> --save`, `node tests/strategy/fit-response.js <Label> <Training> <Prüfung>`, `node tests/strategy/cfr-study.js <Spots>`, `node tests/strategy/decision-eval.js --k 100 --hands 400`, Bericht `node tools/report-strategy.js` bzw. `node tools/report.js`.

## 6. Automatisch erzeugte Ergebnisse

<!-- AUTO-STRATEGIE-START (erzeugt mit node tools/report-strategy.js, nicht von Hand bearbeiten) -->
Erzeugt aus `tests/results/strategy.json` (Plan „haupt“, 2026-11-27T09:21:20.031Z, Node v22.23.5, 2 Kerne). 241 Läufe, 602.500 Hände, 442.434 Coach-Entscheidungen, davon von den Regeln abgelehnt: **0**. Rechenzeit 9.805 s (Summe der Läufe).

Methode: All-in-bereinigte BB/100 (unverzerrt, vor den Hauptläufen festgelegt); Rohwerte zusätzlich. 95-%-Intervalle per Block-Bootstrap (Blöcke von 500 aufeinanderfolgenden Händen, 2000 Wiederholungen, geschichtet je Lauf). Urteil: belegt, wenn das 95-%-Intervall der Differenz ganz über 0 liegt. Alle Stacks werden vor jeder Hand auf die Starttiefe gesetzt. Zufallsströme: Karten: deal; Gegner: bots; Tisch/Rotation: tisch; Coach: Tisch-Seed|Hand|Aktionszahl. Versionen: 2.1 (8aeb416982fb), 2.0.1 (8977eca6b2c0), Umgebung bcf2e37cab9b.

### Hauptvergleich: Coach 2.1 − Coach 2.0.1

Differenz **14,0 BB/100** [9,1; 18,9] über 120.000 gepaarte Hände (roh, ohne All-in-Bereinigung: 14,9 [9,1; 20,8]). Urteil: **belegt besser**. In 42 von 48 gepaarten Läufen lag 2.1 vorn, in 6 2.0.1 (Einzelläufe streuen stark; maßgeblich ist das Intervall). Entscheidungen: 2.1 168.424, 2.0.1 164.027; abgelehnte Empfehlungen 2.1 0, 2.0.1 0.

| Stacktiefe | Differenz BB/100 (bereinigt) | 95-%-Intervall | roh | Hände | 2.1 vorn | Urteil |
|---|---:|---|---:|---:|---:|---|
| 40 BB | 6,1 | [2,5; 10,0] | 5,1 | 40.000 | 14/16 | besser |
| 100 BB | 16,3 | [9,1; 23,5] | 15,9 | 40.000 | 15/16 | besser |
| 200 BB | 19,7 | [7,0; 32,7] | 23,9 | 40.000 | 13/16 | besser |

| Zusammensetzung | Differenz BB/100 (bereinigt) | 95-%-Intervall | roh | Hände | 2.1 vorn | Urteil |
|---|---:|---|---:|---:|---:|---|
| Gegner-KI, Anfänger | 15,5 | [7,8; 24,0] | 17,2 | 30.000 | 10/12 | besser |
| Gegner-KI, Experte | 18,3 | [10,1; 27,0] | 17,9 | 30.000 | 12/12 | besser |
| Gegner-KI, gemischt | 13,5 | [5,5; 21,8] | 11,8 | 30.000 | 11/12 | besser |
| halb Gegner-KI, halb synthetisch | 8,8 | [−4,7; 22,7] | 12,8 | 30.000 | 9/12 | offen |

In keiner Teilgruppe (Stacktiefe, Zusammensetzung, Bedingung) liegt das Intervall ganz unter 0.

### Alle Vergleiche

| Vergleich | Differenz BB/100 (bereinigt) | 95-%-Intervall | roh | Hände | A vorn | Urteil | geteilte Läufe |
|---|---:|---|---:|---:|---:|---|---|
| Coach 2.1 gegen Coach 2.0.1 (Hauptvergleich) | 14,0 | [9,1; 18,9] | 14,9 | 120.000 | 42/48 | belegt besser | 96 Läufe auch in: v201-bot, v21-bot, v21-potodds |
| Coach 2.1 gegen Gegner-KI als Held | 42,6 | [35,7; 49,8] | 42,9 | 120.000 | 40/48 | belegt besser | 96 Läufe auch in: v201-bot, v21-v201, v21-potodds |
| Coach 2.0.1 gegen Gegner-KI als Held | 28,6 | [22,0; 35,2] | 28,0 | 120.000 | 38/48 | belegt besser | 96 Läufe auch in: v21-bot, v21-v201 |
| Coach 2.1 gegen Referenz Pot-Odds-Schwelle | 94,5 | [84,1; 105,1] | 99,5 | 120.000 | 47/48 | belegt besser | 48 Läufe auch in: v21-v201, v21-bot |
| Coach 2.1 gegen Coach 2.0.1, dem Coach unbekannte Gegnerstrategien | 43,5 | [28,2; 58,7] | 40,9 | 30.000 | 10/12 | belegt besser | 12 Läufe auch in: v21-bot-unbekannt |
| Coach 2.1 gegen Gegner-KI als Held, unbekannte Gegnerstrategien | 165,7 | [128,8; 203,9] | 163,9 | 30.000 | 12/12 | belegt besser | 12 Läufe auch in: v21-v201-unbekannt |
| Coach 2.1 gegen Coach 2.0.1, 15 BB | −0,0 | [−1,5; 1,7] | −0,8 | 7.500 | 1/3 | zu wenig Blöcke für ein Intervall | 3 Läufe auch in: v21-pushfold |
| Coach 2.1 gegen Referenz Push/Fold, 15 BB | 7,0 | [4,7; 9,4] | 5,9 | 7.500 | 3/3 | zu wenig Blöcke für ein Intervall | 3 Läufe auch in: v21-v201-kurz |
| Coach 2.1 gegen 2.0.1, gleichgewichtsnaher Modus | −20,6 | [−35,4; −7,5] | −14,1 | 5.000 | 0/2 | zu wenig Blöcke für ein Intervall | – |

Läufe, die in mehreren Vergleichen vorkommen (z. B. ein Lauf der Gegner-KI als Held, der für 2.1 und 2.0.1 als Basis dient), sind dort **keine unabhängigen Stichproben**: Die Intervalle der betroffenen Vergleiche sind einzeln gültig, ihre Differenzen untereinander aber korreliert.

#### Gegen dem Coach unbekannte Strategien (2.1 − 2.0.1)

| Gegnerstrategie | Differenz BB/100 | 95-%-Intervall | Hände | Urteil |
|---|---:|---|---:|---|
| synthetisch: Calling Station | 176,3 | [99,5; 255,8] | 5.000 | besser |
| synthetisch: MDF-Verteidiger | −9,0 | [−32,9; 18,6] | 5.000 | offen |
| synthetisch: Maniac | 20,7 | [−9,7; 58,4] | 5.000 | offen |
| synthetisch: Rock | 13,9 | [4,3; 23,3] | 5.000 | besser |
| synthetisch: Stilwechsler | 11,3 | [−7,8; 29,1] | 5.000 | offen |
| synthetisch: zufällig-legal | 47,8 | [29,7; 65,9] | 5.000 | besser |

### Absolute Ergebnisse je Held und Bedingung

| Gruppe | Held | Bedingung | BB/100 (bereinigt) | 95-%-Intervall | roh | Hände | Entscheidungen | abgelehnt |
|---|---|---|---:|---|---:|---:|---:|---:|
| gto | Coach 2.0.1 (gleichgewichtsnah) | Gegner-KI, gemischt, 100 BB | 13,5 | [−2,9; 29,6] | 14,1 | 5.000 | 6.775 | 0 |
| gto | Coach 2.1 (gleichgewichtsnah) | Gegner-KI, gemischt, 100 BB | −7,0 | [−21,9; 7,7] | 0,0 | 5.000 | 6.979 | 0 |
| kurz | Coach 2.0.1 (exploitativ) | Gegner-KI, gemischt, 15 BB | 7,7 | [4,6; 10,6] | 8,4 | 7.500 | 7.178 | 0 |
| kurz | Coach 2.1 (exploitativ) | Gegner-KI, gemischt, 15 BB | 7,7 | [4,5; 11,0] | 7,6 | 7.500 | 7.220 | 0 |
| kurz | Referenz: Push/Fold-Chart (≤ 20 BB), sonst Pot-Odds-Schwelle | Gegner-KI, gemischt, 15 BB | 0,6 | [−3,4; 4,8] | 1,7 | 7.500 | 0 | 0 |
| unbekannt | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | synthetisch: Maniac, 100 BB | 202,2 | [160,3; 247,3] | 176,1 | 5.000 | 0 | 0 |
| unbekannt | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | synthetisch: MDF-Verteidiger, 100 BB | 33,6 | [6,4; 59,9] | 39,5 | 5.000 | 0 | 0 |
| unbekannt | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | synthetisch: zufällig-legal, 100 BB | 141,4 | [100,3; 185,6] | 130,6 | 5.000 | 0 | 0 |
| unbekannt | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | synthetisch: Rock, 100 BB | 22,6 | [3,4; 42,7] | 23,7 | 5.000 | 0 | 0 |
| unbekannt | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | synthetisch: Calling Station, 100 BB | 128,4 | [60,6; 197,4] | 132,7 | 5.000 | 0 | 0 |
| unbekannt | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | synthetisch: Stilwechsler, 100 BB | 149,8 | [97,4; 205,5] | 139,8 | 5.000 | 0 | 0 |
| unbekannt | Coach 2.0.1 (exploitativ) | synthetisch: Maniac, 100 BB | 213,3 | [146,6; 282,8] | 153,8 | 5.000 | 5.816 | 0 |
| unbekannt | Coach 2.0.1 (exploitativ) | synthetisch: MDF-Verteidiger, 100 BB | 107,1 | [78,9; 144,1] | 130,8 | 5.000 | 6.717 | 0 |
| unbekannt | Coach 2.0.1 (exploitativ) | synthetisch: zufällig-legal, 100 BB | 161,8 | [96,0; 229,1] | 172,1 | 5.000 | 6.212 | 0 |
| unbekannt | Coach 2.0.1 (exploitativ) | synthetisch: Rock, 100 BB | 37,8 | [22,9; 50,2] | 38,8 | 5.000 | 5.495 | 0 |
| unbekannt | Coach 2.0.1 (exploitativ) | synthetisch: Calling Station, 100 BB | 718,3 | [546,4; 923,0] | 714,8 | 5.000 | 9.566 | 0 |
| unbekannt | Coach 2.0.1 (exploitativ) | synthetisch: Stilwechsler, 100 BB | 172,8 | [132,1; 214,2] | 170,3 | 5.000 | 6.525 | 0 |
| unbekannt | Coach 2.1 (exploitativ) | synthetisch: Maniac, 100 BB | 233,9 | [179,6; 292,6] | 207,9 | 5.000 | 5.931 | 0 |
| unbekannt | Coach 2.1 (exploitativ) | synthetisch: MDF-Verteidiger, 100 BB | 98,1 | [73,7; 126,0] | 112,2 | 5.000 | 6.809 | 0 |
| unbekannt | Coach 2.1 (exploitativ) | synthetisch: zufällig-legal, 100 BB | 209,6 | [144,5; 282,6] | 214,4 | 5.000 | 6.442 | 0 |
| unbekannt | Coach 2.1 (exploitativ) | synthetisch: Rock, 100 BB | 51,6 | [31,4; 71,6] | 57,4 | 5.000 | 5.612 | 0 |
| unbekannt | Coach 2.1 (exploitativ) | synthetisch: Calling Station, 100 BB | 894,6 | [671,0; 1146,8] | 860,9 | 5.000 | 10.010 | 0 |
| unbekannt | Coach 2.1 (exploitativ) | synthetisch: Stilwechsler, 100 BB | 184,2 | [137,6; 232,6] | 172,9 | 5.000 | 6.696 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, Anfänger, 100 BB | 16,4 | [4,3; 27,9] | 10,4 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, Anfänger, 200 BB | 15,9 | [−12,2; 46,2] | 11,9 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, Anfänger, 40 BB | 12,8 | [4,3; 21,1] | 15,2 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, Experte, 100 BB | 2,8 | [−11,1; 16,0] | 5,7 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, Experte, 200 BB | 1,2 | [−14,7; 17,1] | 6,1 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, Experte, 40 BB | −0,7 | [−7,7; 6,1] | 0,6 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, gemischt, 100 BB | −0,7 | [−11,5; 8,4] | 4,4 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, gemischt, 200 BB | 11,5 | [−7,8; 28,7] | 9,1 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, gemischt, 40 BB | 1,2 | [−5,2; 7,3] | −0,4 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | halb Gegner-KI, halb synthetisch, 100 BB | 108,0 | [76,5; 139,9] | 121,5 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | halb Gegner-KI, halb synthetisch, 200 BB | 163,3 | [119,4; 213,2] | 174,6 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | halb Gegner-KI, halb synthetisch, 40 BB | 39,1 | [19,5; 61,4] | 33,0 | 10.000 | 0 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, Anfänger, 100 BB | 26,3 | [11,2; 41,1] | 25,7 | 10.000 | 14.224 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, Anfänger, 200 BB | 33,8 | [−1,9; 67,2] | 29,4 | 10.000 | 14.101 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, Anfänger, 40 BB | 15,9 | [4,7; 27,4] | 28,5 | 10.000 | 13.993 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, Experte, 100 BB | 3,0 | [−10,5; 16,9] | 6,2 | 10.000 | 13.121 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, Experte, 200 BB | 17,5 | [−9,9; 46,0] | 32,7 | 10.000 | 13.178 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, Experte, 40 BB | 11,2 | [1,5; 21,3] | 7,9 | 10.000 | 12.833 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, gemischt, 100 BB | 2,4 | [−9,8; 13,9] | 7,1 | 10.000 | 13.502 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, gemischt, 200 BB | −0,9 | [−17,3; 15,7] | −4,2 | 10.000 | 13.735 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, gemischt, 40 BB | 9,5 | [2,9; 16,2] | 4,4 | 10.000 | 13.228 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | halb Gegner-KI, halb synthetisch, 100 BB | 172,1 | [134,9; 211,7] | 178,8 | 10.000 | 14.269 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | halb Gegner-KI, halb synthetisch, 200 BB | 331,8 | [272,3; 396,9] | 316,7 | 10.000 | 14.006 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | halb Gegner-KI, halb synthetisch, 40 BB | 91,5 | [68,2; 116,5] | 94,5 | 10.000 | 13.837 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, Anfänger, 100 BB | 51,6 | [29,8; 76,8] | 51,7 | 10.000 | 14.960 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, Anfänger, 200 BB | 43,8 | [10,7; 77,6] | 43,6 | 10.000 | 14.799 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, Anfänger, 40 BB | 27,1 | [15,7; 37,6] | 39,9 | 10.000 | 14.613 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, Experte, 100 BB | 21,6 | [8,3; 36,7] | 24,1 | 10.000 | 13.195 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, Experte, 200 BB | 44,8 | [14,9; 70,0] | 56,1 | 10.000 | 13.218 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, Experte, 40 BB | 20,3 | [10,2; 30,0] | 20,4 | 10.000 | 12.916 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, gemischt, 100 BB | 10,7 | [−4,2; 25,2] | 15,5 | 10.000 | 13.693 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, gemischt, 200 BB | 25,0 | [0,5; 54,8] | 22,5 | 10.000 | 14.095 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, gemischt, 40 BB | 15,7 | [6,1; 25,3] | 4,9 | 10.000 | 13.499 | 0 |
| zentral | Coach 2.1 (exploitativ) | halb Gegner-KI, halb synthetisch, 100 BB | 184,8 | [146,5; 224,7] | 190,1 | 10.000 | 14.749 | 0 |
| zentral | Coach 2.1 (exploitativ) | halb Gegner-KI, halb synthetisch, 200 BB | 347,3 | [286,9; 411,0] | 348,0 | 10.000 | 14.527 | 0 |
| zentral | Coach 2.1 (exploitativ) | halb Gegner-KI, halb synthetisch, 40 BB | 89,6 | [64,8; 113,8] | 90,4 | 10.000 | 14.160 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, Anfänger, 100 BB | −53,2 | [−75,9; −29,1] | −51,2 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, Anfänger, 200 BB | −85,0 | [−115,0; −53,2] | −85,9 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, Anfänger, 40 BB | −41,3 | [−53,1; −28,7] | −35,4 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, Experte, 100 BB | −97,1 | [−120,3; −75,8] | −106,0 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, Experte, 200 BB | −122,0 | [−160,2; −88,3] | −120,2 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, Experte, 40 BB | −66,9 | [−82,3; −51,5] | −68,6 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, gemischt, 100 BB | −104,0 | [−125,5; −80,6] | −99,2 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, gemischt, 200 BB | −94,8 | [−123,5; −67,5] | −92,9 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, gemischt, 40 BB | −57,3 | [−67,8; −46,1] | −57,1 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | halb Gegner-KI, halb synthetisch, 100 BB | 144,5 | [90,2; 197,4] | 145,0 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | halb Gegner-KI, halb synthetisch, 200 BB | 270,1 | [192,0; 354,3] | 222,5 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | halb Gegner-KI, halb synthetisch, 40 BB | 54,8 | [30,1; 79,5] | 61,9 | 10.000 | 0 | 0 |

### Empfohlene Einsatzgrößen postflop (Bet ohne offenen Einsatz)

| Version | ⅓ | ½ | ¾ | Pot | Overbet | All-in | Check | Call | Fold |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2.1 | 5.382 | 2.389 | 4.009 | 6.460 | 1.837 | 2.532 | 18.927 | 3.625 | 8.467 |
| 2.0.1 | 3.505 | 1.713 | 1.933 | 4.836 | 2.278 | 2.537 | 21.230 | 3.113 | 7.160 |

Empfehlung ≠ höchster Modell-EV (Preflop-Anker am Faustregel-Chart): 2.1 in 43.048 von 217.144 Entscheidungen (19,8 %), mittlerer Modellabstand 0,42 BB; 2.0.1 in 42.111 (19,9 %), 0,35 BB.

Rechenzeit je Entscheidung (Node, ohne Zeitbremse): 2.1 Ø 25,7 ms, höchstens 360 ms; 2.0.1 Ø 14,5 ms, höchstens 351 ms. Höchstzahl Simulationen je Entscheidung: 2.1 5.000, 2.0.1 5.000 (Grenze 5.000).

### Gepaarte Rollout-Bewertung je Entscheidungspunkt (2.1 − 2.0.1)

24 Sessions, 9.600 Hände, 12.967 Entscheidungspunkte; verschiedene Empfehlung in 1.021 Punkten (7,9 %). Je Unterschied 100 gepaarte Rollouts je Aktion (gepaarte Rollouts je Entscheidungspunkt; Fortsetzung des Helden mit Gegner-KI-Profil g004; Cluster-Bootstrap über Hände (2.000 Wiederholungen)). Mittlere EV-Differenz je verschiedenem Punkt **0,822 BB** [−0,082; 1,718] → nicht belegt; umgerechnet auf alle Punkte 0,0647 BB je Entscheidung [−0,0064; 0,1353].

| Gruppe | Punkte mit Unterschied | Anteil an allen Punkten | mittlere Differenz (BB) | 95-%-Intervall | Urteil |
|---|---:|---:|---:|---|---|
| alle | 1.021 | 7,9 % | 0,822 | [−0,082; 1,718] | nicht belegt |
| Gegner-KI (bekannt) | 639 | 9,9 % | 1,466 | [0,622; 2,320] | 2.1 belegt besser |
| unbekannte Strategien | 382 | 5,9 % | −0,256 | [−2,274; 1,670] | nicht belegt |
| preflop | 234 | – | −0,140 | [−2,122; 1,842] | nicht belegt |
| postflop Bet vs. Check | 451 | – | 1,425 | [0,170; 2,607] | 2.1 belegt besser |
| postflop Größe | 288 | – | 0,024 | [−1,249; 1,279] | nicht belegt |
| postflop gegen Einsatz | 48 | – | 4,634 | [−3,961; 12,821] | nicht belegt |
| Multiway (postflop) | 160 | – | 0,476 | [−2,133; 3,073] | nicht belegt |
| Preflop | 234 | – | −0,140 | [−2,122; 1,842] | nicht belegt |
| Flop | 411 | – | 0,871 | [−0,288; 2,001] | nicht belegt |
| Turn | 217 | – | 1,385 | [−0,678; 3,698] | nicht belegt |
| River | 159 | – | 1,342 | [−0,956; 3,512] | nicht belegt |

Häufigste Paare (Empfehlung 2.1 ↔ 2.0.1, Beträge durch # ersetzt): Bet ¾ Pot ↔ Check (212, 1,35 BB); Bet Pot ↔ Check (89, 3,14 BB); Bet ⅓ Pot ↔ Check (86, 0,29 BB); Call # ↔ Fold (55, 6,39 BB); Open # BB ↔ Fold (53, 0,53 BB); #-Bet #× ↔ Call # (50, −5,27 BB); Fold ↔ Call # (49, −6,93 BB); Bet Pot ↔ Bet ¾ Pot (39, −0,70 BB).

Grenze: Nach der ersten Aktion spielt der Held mit der festen Politik g004 weiter; gemessen wird die erste Aktion, nicht die ganze Linie des Coaches. Die verdeckten Karten der Gegner sind die echten (nur Auswertung).

#### Größenstudie „base-bots“ (2.095 Spots, davon 1.621 ohne offenen Einsatz)

| Größe | Beobachtungen | Fold beobachtet | Fold Modell | Raise beobachtet | Raise Modell |
|---|---:|---:|---:|---:|---:|
| 0.33 Pot | 1.885 | 35 % | 27 % | 5 % | 14 % |
| 0.5 Pot | 1.874 | 48 % | 36 % | 5 % | 13 % |
| 0.75 Pot | 1.877 | 55 % | 45 % | 5 % | 11 % |
| 1 Pot | 1.873 | 62 % | 48 % | 6 % | 10 % |
| 1.5 Pot | 1.859 | 73 % | 48 % | 6 % | 10 % |

| Strategie über dieselben Spots | Wert gegen „immer Check“ (BB je Spot) | Standardfehler |
|---|---:|---:|
| Modell (beste EV) | −0,12 | 0,47 |
| Modell, Größe frei nach Ausspielung (Orakel) | 3,91 | 0,48 |
| immer Check | 0,00 | 0,00 |
| Modell entscheidet Bet/Check, Größe fest 0.33 | 0,08 | 0,41 |
| immer Bet 0.33 | 0,64 | 0,47 |
| Modell entscheidet Bet/Check, Größe fest 0.5 | 0,32 | 0,41 |
| immer Bet 0.5 | 0,59 | 0,50 |
| Modell entscheidet Bet/Check, Größe fest 0.75 | −0,26 | 0,47 |
| immer Bet 0.75 | −0,27 | 0,56 |
| Modell entscheidet Bet/Check, Größe fest 1 | −0,22 | 0,50 |
| immer Bet 1 | −0,05 | 0,61 |
| Modell entscheidet Bet/Check, Größe fest 1.5 | −0,37 | 0,53 |
| immer Bet 1.5 | 0,17 | 0,65 |

#### Größenstudie „v21b-bots“ (578 Spots, davon 466 ohne offenen Einsatz)

| Größe | Beobachtungen | Fold beobachtet | Fold Modell | Raise beobachtet | Raise Modell |
|---|---:|---:|---:|---:|---:|
| 0.33 Pot | 576 | 28 % | 31 % | 4 % | 6 % |
| 0.5 Pot | 571 | 39 % | 40 % | 4 % | 6 % |
| 0.75 Pot | 576 | 49 % | 49 % | 4 % | 6 % |
| 1 Pot | 574 | 56 % | 54 % | 5 % | 6 % |
| 1.5 Pot | 572 | 69 % | 59 % | 6 % | 6 % |

| Strategie über dieselben Spots | Wert gegen „immer Check“ (BB je Spot) | Standardfehler |
|---|---:|---:|
| Modell (beste EV) | −1,39 | 1,06 |
| Modell, Größe frei nach Ausspielung (Orakel) | 5,97 | 0,96 |
| immer Check | 0,00 | 0,00 |
| Modell entscheidet Bet/Check, Größe fest 0.33 | 0,16 | 0,83 |
| immer Bet 0.33 | 0,29 | 0,90 |
| Modell entscheidet Bet/Check, Größe fest 0.5 | 0,34 | 0,81 |
| immer Bet 0.5 | 0,18 | 0,92 |
| Modell entscheidet Bet/Check, Größe fest 0.75 | −0,58 | 0,90 |
| immer Bet 0.75 | −0,97 | 1,02 |
| Modell entscheidet Bet/Check, Größe fest 1 | −1,90 | 1,11 |
| immer Bet 1 | −2,53 | 1,24 |
| Modell entscheidet Bet/Check, Größe fest 1.5 | −2,78 | 1,27 |
| immer Bet 1.5 | −2,97 | 1,41 |

#### Größenstudie „v21b-synth“ (605 Spots, davon 409 ohne offenen Einsatz)

| Größe | Beobachtungen | Fold beobachtet | Fold Modell | Raise beobachtet | Raise Modell |
|---|---:|---:|---:|---:|---:|
| 0.33 Pot | 759 | 22 % | 20 % | 8 % | 5 % |
| 0.5 Pot | 751 | 23 % | 27 % | 8 % | 5 % |
| 0.75 Pot | 751 | 25 % | 34 % | 8 % | 5 % |
| 1 Pot | 738 | 26 % | 39 % | 8 % | 5 % |
| 1.5 Pot | 720 | 29 % | 43 % | 8 % | 5 % |

| Strategie über dieselben Spots | Wert gegen „immer Check“ (BB je Spot) | Standardfehler |
|---|---:|---:|
| Modell (beste EV) | 1,27 | 1,80 |
| Modell, Größe frei nach Ausspielung (Orakel) | 5,64 | 1,90 |
| immer Check | 0,00 | 0,00 |
| Modell entscheidet Bet/Check, Größe fest 0.33 | −3,11 | 1,72 |
| immer Bet 0.33 | −4,50 | 1,88 |
| Modell entscheidet Bet/Check, Größe fest 0.5 | −1,65 | 1,79 |
| immer Bet 0.5 | −3,89 | 1,97 |
| Modell entscheidet Bet/Check, Größe fest 0.75 | −0,43 | 1,88 |
| immer Bet 0.75 | −2,06 | 2,17 |
| Modell entscheidet Bet/Check, Größe fest 1 | 0,73 | 1,87 |
| immer Bet 1 | −1,44 | 2,20 |
| Modell entscheidet Bet/Check, Größe fest 1.5 | 1,97 | 1,93 |
| immer Bet 1.5 | −1,63 | 2,26 |

#### River-Modellspiel (24 Spots aus Simulationen)

| Stärkegruppen | Exploitability im Kombinationsspiel Ø | max. | Rechenzeit Ø |
|---:|---:|---:|---:|
| 5 | 1,19 % Pot | 2,81 % | 19 ms |
| 10 | 0,46 % Pot | 0,76 % | 39 ms |
| 20 | 0,31 % Pot | 0,82 % | 69 ms |
| 40 | 0,24 % Pot | 0,75 % | 141 ms |

| Stärkegruppen | Lösung ohne Raises im Spiel mit Raises Ø (max.) | Lösung mit Raises Ø (max.) | Rechenzeit mit Raises |
|---:|---:|---:|---:|
| 10 | 17,18 % (34,09 %) | 0,91 % (1,61 %) | 74 ms |
| 20 | 17,09 % (32,88 %) | 0,48 % (0,99 %) | 126 ms |

Konvergenz (10 Gruppen, mit Raises, Exploitability im Modellspiel): 100 Iterationen 0,282 %, 300 Iterationen 0,057 %, 700 Iterationen 0,015 %, 2500 Iterationen 0,002 %.

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
