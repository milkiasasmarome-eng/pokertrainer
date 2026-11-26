# Mathematische und strategische Methoden

Jede Kennzahl im Coach gehört zu einer von drei Klassen. Die Oberfläche kennzeichnet sie entsprechend.

| Klasse | Beispiele | Kennzeichnung |
|---|---|---|
| **exakt** | Handbewertung, Kombinatorik, Pot Odds, Equity per vollständiger Aufzählung (Heads-up auf Flop/Turn/River) | „exakt“ |
| **statistisch geschätzt** | Monte-Carlo-Equity (Mehrgegner, Preflop), Kontrolle der Preflop-Tabelle | Standardfehler und 95-%-Intervall |
| **Modellannahme** | Ranges, Reaktionswahrscheinlichkeiten, Equity Realization, implizite Odds, River-Modellspiel | „Modellschätzung, kein Solver-Ergebnis“, Modellunsicherheit |

## 1. Handbewertung

Score = Kategorie · 2²⁰ + Rang-Nibbles; größer ist besser. Prüfung: alle 2.598.960 Fünf-Karten-Hände (Kategorienhäufigkeiten, 7.462 Werte, Ordnung identisch zur Referenz `eval5Ref`), alle 133.784.560 Sieben-Karten-Hände (Häufigkeiten, 4.824 Werte), 300.000 zufällige Sieben-Karten-Paare gegen die Best-of-Five-Referenz.

Seit 2.1 zusätzlich eine **individuelle Referenzprüfung** gegen eine unabhängige Referenz (`tests/ref/handref.js`): Die 7.462 Klassen werden konstruktiv aus den Regeln in absteigender Stärke aufgezählt, eine Hand wird über die Multimenge ihrer Ränge und ein Flush-Bit ihrer Klasse zugeordnet, sieben Karten = bestes der 21 Fünfer-Blätter. Jede einzelne Bewertung wird verglichen (nicht nur Häufigkeiten): alle Fünf-Karten-Hände, geschichtete Sieben-Karten-Stichproben (Flush, Straße, Wheel, Straight Flush, zwei Drillinge, Drilling plus zwei Paare, Vierlinge, drei Paare …), Paarvergleiche mit gemeinsamem Board (Gleichstände, Kicker, Board spielt), Permutations- und Farbinvarianz; optional alle 133.784.560 Sieben-Karten-Hände einzeln (`node tests/long.js evalref7`). Ergebnisse: [VALIDIERUNG_MATHE.md](VALIDIERUNG_MATHE.md).

## 2. Equity

- **Exakt (Heads-up gegen Range):** Für jede gegnerische Kombination k mit Gewicht wₖ werden alle Runouts aufgezählt. Da jede Kombination gleich viele Runouts hat, gilt Equity = Σ wₖ·eₖ / Σ wₖ. Grenzwerte je Genauigkeitsstufe (z. B. Standard 600.000 Auswertungen). Seit 2.1 mit Zeitgrenze: nach je 8 Kombinationen wird die Restzeit aus dem jüngsten Tempo hochgerechnet; reicht sie nicht, bricht die Aufzählung ab und das Ergebnis ist ein gekennzeichnetes Monte-Carlo-Ergebnis (nie „exakt“).
- **Monte-Carlo (seit 2.1):** Gegnerkombinationen werden gemäß Gewicht unabhängig gezogen; bei Kartenkonflikten wird das gesamte Tupel verworfen (exaktes Rejection-Sampling der bedingten Verteilung; findet sich nach 64 Versuchen mit je 50 Ziehungen keine gültige Verteilung, endet die Rechnung als gekennzeichneter Fehlschlag). Restliche Boardkarten ohne Zurücklegen. Schätzer: Mittelwert der Pot-Anteile X ∈ [0, 1] (Split = 1/(Anzahl Gewinner)). Stichprobenumfang unabhängig von den Werten der Schätzstichprobe: Reicht die Obergrenze (Budget, Höchstzahl der Stufe) nicht für Pilot plus ungünstigsten Fall nWC = ⌈0,25/T²⌉ (Var X ≤ 1/4), wird ein fester Umfang min(nWC, Obergrenze) gezogen; sonst bestimmt eine Pilotstichprobe (256) aus einer oberen 99-%-Schranke der Varianz den Umfang der zweiten Stufe, und nur die zweite Stufe geht in die Schätzung ein (bedingt erwartungstreu). Zielfehler T: Schnell 2 %, Standard 1 %, Präzise 0,5 %, Tiefenanalyse 0,25 %. Intervall: Wilson-Score-Intervall mit Varianzfaktor φ = s²/(m(1−m)) ≤ 1, d. h. effektiver Binomialumfang nₑ = n/φ (Split Pots verkleinern φ); s² mit je einer Pseudo-Beobachtung bei 0 und 1, am Rand φ = 1. Die frühere Pilotregel (Pilot in der Schätzung) war zu den Rändern verzerrt, die frühere Weyl-Schichtung machte den i.i.d.-Standardfehler ungültig (Belege in VALIDIERUNG_MATHE.md). Abbruch an der Zeitgrenze ist gekennzeichnet (`aborted: 'zeit'`), Budgetgrenze vor dem Zielfehler ebenso (`'budget'`). Der automatische Tipp am Tisch rechnet immer mit höchstens 5.000 Simulationen je Entscheidung; Präzise und Tiefenanalyse gelten nur für die Schaltfläche „Tiefenanalyse“ und die Nachanalyse.
- **Cache (seit 2.1):** Schlüssel aus Karten, toten Karten und Range-Kennungen (ohne Stufe); jeder Eintrag trägt seine Qualität (exakt, SE, Stichproben, Abbruch). Genutzt wird er nur, wenn er exakt ist, oder – falls die Anfrage nicht exakt rechnen würde – wenn er nicht abgebrochen ist, den Ziel-SE der Stufe erreicht und die Mindestanzahl erfüllt, oder mindestens so viele Stichproben hat, wie die Anfrage höchstens ziehen dürfte. Ein besserer Eintrag wird nie durch einen schlechteren ersetzt.
- **Range-Kennung (seit 2.1):** normalisierte Gewichte wₖ/Σw, quantisiert auf 2⁻³⁶, Träger immer enthalten, 2 × 32 Bit (FNV-1a, Murmur3-Mischung), Präfix „h2“. Gleiche Verteilungen in anderer Skalierung erhalten dieselbe Kennung.
- **Equity je Kombination** (`ev.comboEquities`): Grundlage für Teil-Ranges (z. B. die Callrange gegen eine Bet) ohne neue Simulation. Flop/Turn/River exakt, sonst wenige Runouts je Kombination innerhalb des Budgets (Mittelwerte über viele Kombinationen bleiben genau).
- **Preflop-Tabelle:** Equity Klasse gegen Klasse, 12.000 Stichproben je Paar (SE ≈ 0,45 %), erzeugt mit `tools/precompute-preflop.js`. Bei Analysen wird die Tabelle gegen eine direkte Simulation kalibriert.
- **Mehrgegner-Teilmengen:** Equity gegen eine Teilmenge S von Gegnern ≈ Π eqᵢ, kalibriert auf die simulierte Gesamt-Equity (Faktor κ). Gekennzeichnete Näherung.
- **Side Pots** (`equity.potShare`): Aus festen Endbeiträgen werden die Pots wie bei der Abrechnung gebildet; je Stichprobe gewinnt der Held nur Pots, für die er berechtigt ist. Gefoldete Beiträge gehen einzeln ein, damit jeder Betrag im richtigen Pot landet (Prüfbefund B3). Ergebnis: erwartete Chips. Seit 2.1: leere Range, keine konfliktfreie Verteilung oder kein Budget → `{win: null, failed: true, reason}`; `ev.evCall` rechnet dann gekennzeichnet über die aktuelle Equity (`parts.approx`, `parts.failed`, `parts.reason`).

## 3. Ranges

- Startbasis: Faustregel-Charts für 6-max/100 BB (Open je Position 17–46 %, Verteidigung je Position und Opener, 3-Bet mit Value- und Bluff-Anteil, 4-Bet, Push/Fold), weiche Ränder → gemischte Häufigkeiten an Grenzhänden.
- Gegnerwerte skalieren die Breite (z. B. Open-Range ∝ geglätteter PFR). Glättung: Beta-Binomial (n + m·k)/(d + k) mit Populationsmittel m und Stärke k (z. B. VPIP: m = 27 %, k = 25). Anzeige zusätzlich mit Wilson-Intervall.
- Postflop: Bayes-Aktualisierung je Kombination: wₖ ← wₖ · P(Aktion | relative Stärke, Draw, Einsatzgröße, Profil). Die Wahrscheinlichkeiten sind ein gekennzeichnetes Modell, mit Untergrenze 0,04 gegen Überreaktion bei wenig Daten.
- Kartenentfernung: bekannte Karten (eigene, Board) setzen Gewichte betroffener Kombinationen auf 0; die Range-Matrix zeigt die verbleibenden Kombinationen.

## 4. EV-Engine

EV relativ zum sofortigen Fold (EV(Fold) = 0). Pot P enthält alle bisherigen Einsätze.

- **Check:** R · eq · P, R = Equity Realization (Position, Handtyp, SPR; River = 1). Preflop zusätzlich Spielbarkeit der Starthand (Modellannahme): Paare 1,0, suited 1,0, offsuit 0,9, je Lücke −0,025, höchste Karte unter T −0,04, beide Broadway +0,03, Ax suited +0,02, begrenzt auf 0,7–1,05 (72o: 0,76).
- **Call:** Ohne weitere Setzrunden (All-in) side-pot-genau: E[Gewinn] − c. Sonst R · eq · (P + c) − c + implizite Odds (nur starke Draws: Trefferwahrscheinlichkeit · min(Reststack, Pot) · Auszahlungsrate).
- **Pot Odds:** c = tatsächlich zahlbarer Betrag (≤ Stack); gewinnbarer Pot = Σ min(Beitragᵢ, eigener Endbeitrag). Benötigte Equity = c / gewinnbarer Pot.
- **Bet/Raise auf B:** Für jeden reagierenden Gegner Fold/Call/Raise. Grundlage: MDF = P/(P + a) (a = eigener Zusatzeinsatz), bei n Reagierenden je Spieler 1 − (1 − MDF)^(1/n); Untergrenze aus starken Händen, Top Pair und Draws abhängig von der Einsatzgröße; Korrektur für Overbets und Raises; im exploitativen Modus Anpassung an Fold gegen C-Bet, WTSD und Aggression (geglättet). Callrange = oberster Anteil nach Stärke (Draws aufgewertet), Raiserange = oberster Teil davon. EV = Σ über alle Caller-Teilmengen P(S) · (R · eq_S · Pot_S − effektiver Einsatz) + P(Re-Raise) · max(−a, EV gegen Raiserange). Im Call-Zweig zählt nur die Callrange (die Raise-Hände stecken im Re-Raise-Zweig; Prüfbefund B2).
- **Konservative Fold-Schätzung postflop (seit 2.0.1):** Der Fold-Anteil aus MDF und Untergrenze wird um 12 % verringert (4 %, wenn genug eigene Beobachtungen „Fold gegen C-Bet“ vorliegen), je weiterem Gegner um 7 % mehr, bei River-Overbets um 5 % mehr. Grund: Die Computergegner verteidigen nicht ausgewogen (Population: Fold gegen Turn-C-Bet 34 % statt 43 % nach MDF); reine Bluffs in mehrere Gegner wurden zuvor überschätzt (Prüfbefund C6). Overbets sind nur auf Turn und River im Heads-up Kandidaten (C5). Die Reaktionsunsicherheit wächst mit Einsatzgröße und Gegnerzahl.
- **Preflop-Reaktionen (seit 2.0.1):** Noch ausstehende Spieler verteidigen nach Chart-Anteil ihrer Position gegen die Position des Raisers, skaliert mit √(2,5 BB / Raise-Größe); Blinds mit beobachtetem „Fold gegen Steal“. Fold gegen 3-Bet und 4-Bet hängt vom Vielfachen der Erhöhung ab. Vorher waren diese Werte größenunabhängig, wodurch immer die kleinste Größe gewann (C1).
- **Preflop-Anker (seit 2.0.1):** Preflop gilt der Faustregel-Chart der Situation (Open, gegen Limper, gegen Open, gegen 3-Bet, gegen 4-Bet, Push/Fold bis 15 BB) als Anker. Ein Raise mit einer Hand, die der Chart zu weniger als 12 % erhöht, und ein Open-Limp werden nur empfohlen, wenn das Modell sie im exploitativen Modus um mindestens max(0,5 BB; 1,5u) vorn sieht und die dafür nötige Fold-Annahme durch mindestens 20 eigene Beobachtungen des Gegners belegt ist. Sonst empfiehlt der Coach die beste Aktion im Chart und nennt im Text, was das vereinfachte Modell gesehen hätte. Gegen ein All-in ohne Raise-Möglichkeit entscheidet allein die Rechnung (C1, C2). Nicht gecallte Teile des eigenen Einsatzes werden zurückgerechnet.
- **Unsicherheit:** Simulation (∂EV/∂eq · SE) und Modell (∂EV/∂eq · Range-Spanne + Reaktionsunsicherheit je nach Datenbasis des Gegners), kombiniert als Wurzel der Quadratsumme.
- **Klassifikation:** eindeutig (Abstand ≥ max(1,5 BB; 0,2 · Pot) und ≥ 3u), klar (≥ 2u), knapp (≥ 0,5u), mehrere vertretbar, hohe Unsicherheit (große u oder kaum Gegnerdaten).

## 5. Gleichgewichtsnaher Modus und CFR+

- Gegnermodell ohne beobachtete Werte (Populationsprior), Verteidigung nach MDF, Faustregel-Charts.
- River-Modellspiel (Heads-up): OOP check/bet (eine oder zwei Größen), IP fold/call bzw. check/bet, OOP fold/call; keine Raises. Hände beider Seiten in je 10 Stärkegruppen; gemeinsame Verteilung J und Showdown-Equity M aus allen nicht kollidierenden Kombinationspaaren. Gelöst mit CFR+ (alternierende Aktualisierung, Regret-Matching⁺, linear gewichtete Durchschnittsstrategie). Exploitability = (BR_OOP + BR_IP)/2 in Pot-Anteilen.
- Validierung: Spiel „Nuts/Luft gegen Bluffcatcher“ – erwartet Bluffanteil an der Bet-Range b/(1 + 2b) und Call-Häufigkeit 1/(1 + b); erreicht auf ±0,02 bei Exploitability < 0,2 % des Pots.

## 6. Bewertung der Spielerentscheidung

Verlust L = EV(beste Aktion) − EV(gewählte Aktion mit tatsächlicher Größe). Stufen relativ zu BB, Pot und Unsicherheit u: Optimal (L ≤ 0,02 BB), Sehr gut (≤ max(0,1 BB; 0,5u)), Gut (≤ max(0,3 BB; u)), Vertretbar (≤ max(0,75 BB; 1,5u)), Ungenau (≤ max(1,5 BB; 0,15 Pot)), Fehler (≤ max(4 BB; 0,4 Pot)), sonst Schwerer Fehler. Punktwerte 100/90/80/65/45/20/0. Das Handergebnis fließt nie ein. Preflop wird eine Aktion außerhalb des Faustregel-Charts höchstens mit „Vertretbar“ (Chartanteil 3–12 %) bzw. „Ungenau“ (unter 3 %) bewertet, auch wenn das vereinfachte Modell sie vorn sieht.

## 7. Gegner-KI

Sechs Stile mit Grundparametern (Open-Breite, Limp, Iso, Call-Breite, 3-/4-Bet, Bluffanteile, C-Bet, Barrel, River, Delayed C-Bet, Float, Check-Raise, Slowplay, Overbet, Sizing, „Stickiness“), individuelle Abweichung je Gegner (±10 %), Können (0–1) und Anpassungsfähigkeit. Postflop: Perzentil der eigenen Hand gegen alle Kombinationen auf dem Board (einmal je Board berechnet), Klassen Monster/stark/mittel/schwach/Luft, Draws, Textur, Rolle (Aggressor, Barrel, Delayed C-Bet, Donk, Float), SPR, Multiway-Abschlag. Anpassung nur an öffentliche Werte des Helden mit Mindeststichprobe und Schrumpfung n/(n + k).

Anpassung an den Helden (nur dessen öffentliche Werte, Mindeststichprobe, Schrumpfung n/(n + k)): Fold gegen Steal → Steal-Breite; Fold gegen 3-Bet → 3-Bet-Bluffs, Umwandlung eines Teils der Calls in 3-Bets bzw. weniger Bluffs gegen Spieler, die 3-Bets halten (seit Format 3); 3-Bet-Häufigkeit → 4-Bet; WTSD → weniger Bluffs, mehr und dünnere Value-Bets mit mittleren Händen; Fold gegen C-Bet → C-Bet-Bluffs; AFq → Call-Schwelle. Messung mit synthetischen Heldenstrategien: [GEGNERGEDAECHTNIS.md](GEGNERGEDAECHTNIS.md), Abschnitt 6.

Kalibrierung: 200.000 simulierte Hände, Werte je Stil gegen Zielbereiche (siehe Testbericht).

## 7a. Gegnergedächtnis

Je Gegner zusätzlich zu den Langzeitwerten ein Kurzzeitgedächtnis (exponentiell abklingende Zähler, Halbwertszeit 100 eigene Hände des Gegners), ein gewichteter Zwei-Anteile-Test „Kurzzeit gegen ältere Beobachtungen“ mit Hysterese zur Erkennung veränderter Spielweise und die getrennte Zählung beobachteter (Showdown) und unbekannt gebliebener Karten. Formeln, Parameter, Messwerte und Schnittstelle: [GEGNERGEDAECHTNIS.md](GEGNERGEDAECHTNIS.md).

## 8. Lernsystem

- Kompetenz je Situation/Straße/Position: Mittel der Punktwerte, geglättet zum Prior 70 mit Stärke 8, 95-%-Intervall aus der Standardabweichung.
- Trend: letzte w gegen vorherige w Entscheidungen (w ≤ 100) mit Intervall; nur bei Abstand größer als das Intervall als Verbesserung markiert.
- Spaced Repetition: Leitner-Boxen mit Abständen 0/1/3/7/16/35 Tagen; Fehlentscheidungen (≤ „Ungenau“) kommen in den Stapel, Wiederholung reproduziert die Situation über den gespeicherten Seed bzw. die Momentaufnahme.
- Spielgeld-Ergebnis getrennt: BB/100 mit 95-%-Intervall aus der Stichprobenstreuung.

Quellen: [QUELLEN.md](QUELLEN.md).
