# River-Equity und dynamische Range-Modellierung (Arbeitspaket 1, 2.2)

Zahlen: `docs/ERGEBNISSE_2.2.md` (automatisch aus `tests/results/calib-2.2/`). Dieses Dokument beschreibt Ursache, Methode und Grenzen.

## 1. Ausgangsbefund und Ursache

2.1 dokumentierte nach einem gegnerischen Pot-Lead am River eine geschätzte Equity von 0,60 gegenüber 0,38 gegen die tatsächlichen Hände
(Prüfer B, Befund 11). Untersucht wurde getrennt:

| Mögliche Ursache | Ergebnis |
|---|---|
| Rechenfehler der Equity (Aufzählung, Monte Carlo, Cache) | **nein.** Die Schätzung des Coaches weicht von einer exakten, unabhängigen Aufzählung gegen dieselbe Range im Mittel um 0,000 (River, Turn) bzw. 0,008 (Flop, Monte Carlo) ab. |
| Angenommene Range des Gegners | **ja.** Die Abweichung entsteht vollständig im Range-Fehler (Referenz gegen die angenommene Range minus Equity gegen die tatsächlichen Karten). |
| Gewichtung der Kombinationen nach einer Aktion | **Hauptursache.** Die 2.1-Likelihood bewertete Bet, Check und Call nach der *relativen* Stärke innerhalb der bereits verengten Range. Eine nach Flop-Call und Turn-Check schon starke Range erschien so am River zum Teil als „Bluff-Bereich“. Die Gegner-KI entscheidet aber nach der *absoluten* Stärke (Perzentil gegen alle möglichen Hände). 2.1 korrigierte das nur für Leads. |
| Einsatzgröße und Handstärke | Die Gegner-KI wählt kleine Größen mit mittleren Händen („thin“), große mit starken Händen und polarisierten Bluffs (Overbet). 2.1 berücksichtigte die Größe nur grob (über 1,1 Pot halbiert). |
| Boardstruktur, Blocker | Gehen über die absolute Stärke je Kombination ein (Perzentil auf dem konkreten Board, Kartenentfernung exakt). |
| Mehrgegner, Position | eigene Zellen (Mehrgegner) bzw. Lage (Aggressor/vor dem Aggressor/frei). |
| Auswahleffekte bei aufgedeckten Händen | In der eigenen Simulation vermieden: Die Kalibrierung nutzt alle Entscheidungen mit den verdeckten Karten, die nur der Studie bekannt sind, nicht nur Showdowns. Im Trainer selbst sind aufgedeckte Hände eine verzerrte Stichprobe (Bluffs, die keinen Call bekommen, bleiben verdeckt); deshalb gehen Showdowns nicht direkt in die Likelihood ein. |
| Statistische Unsicherheit | Jede Gruppe mit 95-%-Intervall über die Entscheidungen; Gruppen unter 15 Spots werden nicht berichtet. |

## 2. Dynamische, probabilistische Range-Modellierung

- **Populationstabelle** (`tests/strategy/fit-likelihood.js`, `tools/build-likelihood.js`, eingebettet in `ranges.js`): Für jede Postflop-Entscheidung eines
  Gegners der Entwicklungsgruppe E (52 Profile; Gruppen in `tests/strategy/groups.js`) wird die Zelle aus öffentlicher Sicht bestimmt – Straße, Lage
  (ohne offenen Einsatz: Aggressor der Vorstraße / vor dem Aggressor / frei; mit Einsatz: Einsatz-Pot-Verhältnis in sechs Klassen oder Re-Raise),
  Mehrgegner – sowie Draw-Flag und absolute Stärke in zehn Klassen, und die gewählte Aktion gezählt (Check / Bet ≤ 0,6 / ≤ 1,1 / > 1,1 Pot bzw.
  Fold / Call / Raise). 300.000 Hände Gegner-KI gegen Gegner-KI; Platz 0 setzt mit zufälligen Größen (0,25–2,2 Pot), damit Reaktionen auf alle Größen
  vorkommen. Glättung: Dirichlet-Prior aus der übergeordneten Zelle (α = 8).
- **Anpassung an den einzelnen Gegner** (`oppAdjust`, `famTransform`): Aus den am Tisch gezählten Werten des Gegners – Bet-Anteil ohne offenen Einsatz
  und Fold-Anteil gegen Einsätze (Aktionszähler `agg`, je an ihren Gelegenheiten), C-Bet je Straße, Fold gegen C-Bet, WTSD – entsteht je Familie eine
  Zielhäufigkeit (Chancenverhältnis zur Population, geglättet mit 30 Pseudo-Gelegenheiten). Liegt sie über der Population, kommt der Überschuss
  stärkeunabhängig hinzu (P' = P + λ(1 − P): Bluffs und Calls mit beliebigen Händen); liegt sie darunter, fällt er zuerst bei schwachen Händen weg
  (P' = P^γ). λ bzw. γ treffen die Zielhäufigkeit im Mittel über die Stärkeverteilung der Familie. Für Leads (Lage „vor dem Aggressor“) bleibt die
  Populationstabelle unverändert: Auf der Validierungsgruppe V war das genauer (Bias 0,020 gegen 0,046), weil die gepoolten Bet-Zähler vor allem
  C-Bets enthalten.
- Zur Laufzeit gehen nur öffentliche Aktionen und die Datenbankwerte ein; verdeckte Karten und interne Gegnerparameter kennt nur die Studie.

## 3. Validierung

- Getrennte Gruppen: Anpassung an E, Modellwahl an V, abschließend T und dem Coach unbekannte Strategien (sechs synthetische aus 2.1 sowie sechs neue,
  vor den Tests festgelegte: Polarisierer, umgekehrtes Größensignal, Fallensteller, Positionsspieler, eng/aggressiv, Minraiser).
- Messungen: `tests/strategy/range-calib.js` (Range des Coaches gegen die tatsächlichen Karten an allen Heads-up-Spots, Gegner-KI gegen Gegner-KI),
  `tests/strategy/equity-calib.js` (Coach als Held, Schätzung `an.equity.eq`), Auswertung `calib-report.js` nach Straße, Einsatzgröße, Gegneraktion,
  Gegnerzahl, Stil des Setzenden, Position und Schätzklasse. Ablauf aller abschließenden Messungen: `sh tools/messungen-2.2.sh`.

## 4. Grenzen

- Gegen dem Coach unbekannte, stark abweichende Strategien (Maniac, zufällig-legal) bleibt die Equity unterschätzt; die Anpassung über gepoolte Zähler
  erfasst nur einen Teil der Abweichung. Ein eigener Zähler je Familie (Lage × Straße) würde helfen, braucht aber ein neues Datenformat (Später-Liste).
- Die Tabelle beschreibt die Gegner-KI dieses Trainers. Sie ist kein Modell menschlicher Spieler.
- Die Kalibrierung ist eine Aussage über Mittelwerte je Gruppe; einzelne Spots können deutlich abweichen.
