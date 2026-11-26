# Mathematische und strategische Methoden

Jede Kennzahl im Coach gehört zu einer von drei Klassen. Die Oberfläche kennzeichnet sie entsprechend.

| Klasse | Beispiele | Kennzeichnung |
|---|---|---|
| **exakt** | Handbewertung, Kombinatorik, Pot Odds, Equity per vollständiger Aufzählung (Heads-up auf Flop/Turn/River) | „exakt“ |
| **statistisch geschätzt** | Monte-Carlo-Equity (Mehrgegner, Preflop), Kontrolle der Preflop-Tabelle | Standardfehler und 95-%-Intervall |
| **Modellannahme** | Ranges, Reaktionswahrscheinlichkeiten, Equity Realization, implizite Odds, River-Modellspiel | „Modellschätzung, kein Solver-Ergebnis“, Modellunsicherheit |

## 1. Handbewertung

Score = Kategorie · 2²⁰ + Rang-Nibbles; größer ist besser. Prüfung: alle 2.598.960 Fünf-Karten-Hände (Kategorienhäufigkeiten, 7.462 Werte, Ordnung identisch zur Referenz `eval5Ref`), alle 133.784.560 Sieben-Karten-Hände (Häufigkeiten, 4.824 Werte), 300.000 zufällige Sieben-Karten-Paare gegen die Best-of-Five-Referenz.

## 2. Equity

- **Exakt (Heads-up gegen Range):** Für jede gegnerische Kombination k mit Gewicht wₖ werden alle Runouts aufgezählt. Da jede Kombination gleich viele Runouts hat, gilt Equity = Σ wₖ·eₖ / Σ wₖ. Grenzwerte je Genauigkeitsstufe (z. B. Standard 600.000 Auswertungen).
- **Monte-Carlo:** Gegnerkombinationen werden gemäß Gewicht gezogen; bei Kartenkonflikten wird das gesamte Tupel verworfen (exaktes Rejection-Sampling der bedingten Verteilung). Heads-up wird die Kombination über eine Weyl-Folge geschichtet gewählt (Varianzreduktion). Restliche Boardkarten ohne Zurücklegen. Schätzer: Mittelwert der Pot-Anteile (Split = 1/(Anzahl Gewinner)), Standardfehler aus der Stichprobenvarianz, 95-%-Intervall ±1,96·SE. Adaptive Stoppregel: Abbruch, wenn SE ≤ Ziel (Schnell 2 %, Standard 1 %, Präzise 0,5 %, Tiefenanalyse 0,25 %), nach Mindestzahl, oder bei Erreichen des Budgets bzw. Zeitlimits. Live-Stufen halten insgesamt höchstens 5.000 Simulationen je Entscheidung ein.
- **Equity je Kombination** (`ev.comboEquities`): Grundlage für Teil-Ranges (z. B. die Callrange gegen eine Bet) ohne neue Simulation. Flop/Turn/River exakt, sonst wenige Runouts je Kombination innerhalb des Budgets (Mittelwerte über viele Kombinationen bleiben genau).
- **Preflop-Tabelle:** Equity Klasse gegen Klasse, 12.000 Stichproben je Paar (SE ≈ 0,45 %), erzeugt mit `tools/precompute-preflop.js`. Bei Analysen wird die Tabelle gegen eine direkte Simulation kalibriert.
- **Mehrgegner-Teilmengen:** Equity gegen eine Teilmenge S von Gegnern ≈ Π eqᵢ, kalibriert auf die simulierte Gesamt-Equity (Faktor κ). Gekennzeichnete Näherung.
- **Side Pots** (`equity.potShare`): Aus festen Endbeiträgen werden die Pots wie bei der Abrechnung gebildet; je Stichprobe gewinnt der Held nur Pots, für die er berechtigt ist. Ergebnis: erwartete Chips.

## 3. Ranges

- Startbasis: Faustregel-Charts für 6-max/100 BB (Open je Position 17–46 %, Verteidigung je Position und Opener, 3-Bet mit Value- und Bluff-Anteil, 4-Bet, Push/Fold), weiche Ränder → gemischte Häufigkeiten an Grenzhänden.
- Gegnerwerte skalieren die Breite (z. B. Open-Range ∝ geglätteter PFR). Glättung: Beta-Binomial (n + m·k)/(d + k) mit Populationsmittel m und Stärke k (z. B. VPIP: m = 27 %, k = 25). Anzeige zusätzlich mit Wilson-Intervall.
- Postflop: Bayes-Aktualisierung je Kombination: wₖ ← wₖ · P(Aktion | relative Stärke, Draw, Einsatzgröße, Profil). Die Wahrscheinlichkeiten sind ein gekennzeichnetes Modell, mit Untergrenze 0,04 gegen Überreaktion bei wenig Daten.
- Kartenentfernung: bekannte Karten (eigene, Board) setzen Gewichte betroffener Kombinationen auf 0; die Range-Matrix zeigt die verbleibenden Kombinationen.

## 4. EV-Engine

EV relativ zum sofortigen Fold (EV(Fold) = 0). Pot P enthält alle bisherigen Einsätze.

- **Check:** R · eq · P, R = Equity Realization (Position, Handtyp, SPR; River = 1).
- **Call:** Ohne weitere Setzrunden (All-in) side-pot-genau: E[Gewinn] − c. Sonst R · eq · (P + c) − c + implizite Odds (nur starke Draws: Trefferwahrscheinlichkeit · min(Reststack, Pot) · Auszahlungsrate).
- **Pot Odds:** c = tatsächlich zahlbarer Betrag (≤ Stack); gewinnbarer Pot = Σ min(Beitragᵢ, eigener Endbeitrag). Benötigte Equity = c / gewinnbarer Pot.
- **Bet/Raise auf B:** Für jeden reagierenden Gegner Fold/Call/Raise. Grundlage: MDF = P/(P + a) (a = eigener Zusatzeinsatz), bei n Reagierenden je Spieler 1 − (1 − MDF)^(1/n); Untergrenze aus starken Händen, Top Pair und Draws abhängig von der Einsatzgröße; Korrektur für Overbets und Raises; im exploitativen Modus Anpassung an Fold gegen C-Bet, WTSD und Aggression (geglättet). Callrange = oberster Anteil nach Stärke (Draws aufgewertet), Raiserange = oberster Teil davon. EV = Σ über alle Caller-Teilmengen P(S) · (R · eq_S · Pot_S − effektiver Einsatz) + P(Re-Raise) · max(−a, EV gegen Raiserange). Nicht gecallte Teile des eigenen Einsatzes werden zurückgerechnet.
- **Unsicherheit:** Simulation (∂EV/∂eq · SE) und Modell (∂EV/∂eq · Range-Spanne + Reaktionsunsicherheit je nach Datenbasis des Gegners), kombiniert als Wurzel der Quadratsumme.
- **Klassifikation:** eindeutig (Abstand ≥ max(1,5 BB; 0,2 · Pot) und ≥ 3u), klar (≥ 2u), knapp (≥ 0,5u), mehrere vertretbar, hohe Unsicherheit (große u oder kaum Gegnerdaten).

## 5. Gleichgewichtsnaher Modus und CFR+

- Gegnermodell ohne beobachtete Werte (Populationsprior), Verteidigung nach MDF, Faustregel-Charts.
- River-Modellspiel (Heads-up): OOP check/bet (eine oder zwei Größen), IP fold/call bzw. check/bet, OOP fold/call; keine Raises. Hände beider Seiten in je 10 Stärkegruppen; gemeinsame Verteilung J und Showdown-Equity M aus allen nicht kollidierenden Kombinationspaaren. Gelöst mit CFR+ (alternierende Aktualisierung, Regret-Matching⁺, linear gewichtete Durchschnittsstrategie). Exploitability = (BR_OOP + BR_IP)/2 in Pot-Anteilen.
- Validierung: Spiel „Nuts/Luft gegen Bluffcatcher“ – erwartet Bluffanteil an der Bet-Range b/(1 + 2b) und Call-Häufigkeit 1/(1 + b); erreicht auf ±0,02 bei Exploitability < 0,2 % des Pots.

## 6. Bewertung der Spielerentscheidung

Verlust L = EV(beste Aktion) − EV(gewählte Aktion mit tatsächlicher Größe). Stufen relativ zu BB, Pot und Unsicherheit u: Optimal (L ≤ 0,02 BB), Sehr gut (≤ max(0,1 BB; 0,5u)), Gut (≤ max(0,3 BB; u)), Vertretbar (≤ max(0,75 BB; 1,5u)), Ungenau (≤ max(1,5 BB; 0,15 Pot)), Fehler (≤ max(4 BB; 0,4 Pot)), sonst Schwerer Fehler. Punktwerte 100/90/80/65/45/20/0. Das Handergebnis fließt nie ein.

## 7. Gegner-KI

Sechs Stile mit Grundparametern (Open-Breite, Limp, Iso, Call-Breite, 3-/4-Bet, Bluffanteile, C-Bet, Barrel, River, Delayed C-Bet, Float, Check-Raise, Slowplay, Overbet, Sizing, „Stickiness“), individuelle Abweichung je Gegner (±10 %), Können (0–1) und Anpassungsfähigkeit. Postflop: Perzentil der eigenen Hand gegen alle Kombinationen auf dem Board (einmal je Board berechnet), Klassen Monster/stark/mittel/schwach/Luft, Draws, Textur, Rolle (Aggressor, Barrel, Delayed C-Bet, Donk, Float), SPR, Multiway-Abschlag. Anpassung nur an öffentliche Werte des Helden mit Mindeststichprobe und Schrumpfung n/(n + k).

Kalibrierung: 200.000 simulierte Hände, Werte je Stil gegen Zielbereiche (siehe Testbericht).

## 8. Lernsystem

- Kompetenz je Situation/Straße/Position: Mittel der Punktwerte, geglättet zum Prior 70 mit Stärke 8, 95-%-Intervall aus der Standardabweichung.
- Trend: letzte w gegen vorherige w Entscheidungen (w ≤ 100) mit Intervall; nur bei Abstand größer als das Intervall als Verbesserung markiert.
- Spaced Repetition: Leitner-Boxen mit Abständen 0/1/3/7/16/35 Tagen; Fehlentscheidungen (≤ „Ungenau“) kommen in den Stapel, Wiederholung reproduziert die Situation über den gespeicherten Seed bzw. die Momentaufnahme.
- Spielgeld-Ergebnis getrennt: BB/100 mit 95-%-Intervall aus der Stichprobenstreuung.

Quellen: [QUELLEN.md](QUELLEN.md).
