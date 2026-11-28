# Einsatzgrößen (Arbeitspaket 2, 2.2)

Zahlen: `docs/ERGEBNISSE_2.2.md` (Abschnitte „Reaktionsmodell und Einsatzgrößen“ und „Aktionen postflop in H1“).

## 1. Warum 2.1 große Einsätze bevorzugte und ½ Pot selten war

Untersucht mit der Größenstudie (`tests/strategy/sizing-study.js`: an jedem Postflop-Spot werden Check und Einsätze von ⅓, ½, ¾, 1 und 1,5 Pot mit
denselben Karten und Zufallszahlen der Gegner gegenfaktisch zu Ende gespielt; gemessen werden erste Reaktion und realisierter Wert):

- Das Reaktionsmodell 2.1 (Populationsmodell gemittelt mit MDF) **unterschätzte Folds gegen große Einsätze** und lag bei ⅓ bis ½ Pot nahe an der
  Beobachtung (Coach 2.1.0, Seed 611, 1.500 Hände, 567 Spots: Fold bei 1,5 Pot beobachtet 0,70 gegen 0,59 vorhergesagt; River-Bet Pot 0,73 gegen 0,61).
  Für sich genommen hätte das große Bets eher bestraft.
- Ausschlaggebend war die **Zusammensetzung der Callrange**: Die 2.1-Range-Schätzung hielt die Ranges nach passiven Linien zu schwach (relative statt
  absolute Likelihood, Arbeitspaket 1). Gegen eine zu schwache Callrange sehen große Value-Bets besser aus, als sie sind; gleichzeitig wirkte die
  Calling-Range-Schärfe aus Prüfer B (τc) nur auf die Zusammensetzung, nicht auf die Fold-Rate.
- Die Kandidaten ⅓/½/¾/Pot/Overbet wurden immer alle bewertet; es gab keine feste Häufigkeit. Der niedrige Anteil von ½ Pot folgte aus den Modellen.

## 2. Differenzierte Bewertung in 2.2

- Reaktion je Kombination aus der Aktionstabelle (`ev.likRespond`): P(Fold/Call/Raise | absolute Stärke, Draw, Straße, Einsatz-Pot-Klasse, Mehrgegner),
  angepasst an die Fold- und C-Bet-Werte des Gegners. Damit hängen Calling- und Raising-Wahrscheinlichkeiten von Größe **und** Handstärke ab; ein
  Gegner reagiert nicht mehr auf alle Größen gleich.
- **Modellmittelung** (`POP.tabBlend = 0,5`): Mischung der Reaktionsranges aus Tabelle und 2.1-Modell. Gewählt auf der Validierungsgruppe V: Die
  Tabelle allein überschätzte Folds gegen kleine Einsätze (+0,11 bei ⅓), das 2.1-Modell unterschätzte sie gegen große (−0,12 bei 1,5 Pot); die
  Mischung lag über alle Größen am nächsten an der Beobachtung. Abschließend geprüft auf der Testgruppe T.
- Weiter berücksichtigt (unverändert aus 2.1): effektive Stacks und SPR (Commitment, All-in-Kandidaten), Position und Equity-Realisierung, Range- und
  Nut-Vorteil über die Zusammensetzung der Ranges, statistische Unsicherheit (Größe gilt als „offen“, wenn mehrere Größen innerhalb der Unsicherheit
  liegen; `sizeNote`).
- Keine erzwungenen Häufigkeiten für einzelne Größen.

## 3. Grenzen

- Größen über 2 Pot liegen außerhalb der Daten (Klasse > 1,6 Pot); frei gewählte Größen jenseits der Kandidaten bleiben als Extrapolation gekennzeichnet.
- Die Gegner-KI passt sich an das Bild des Helden an (Aggression, WTSD). Das Modell sieht das nur indirekt; deshalb die Mittelung.
- Die Verteilung der empfohlenen Größen ist eine Folge des Modells gegen diese Gegner, keine Aussage über optimale Größen im echten Spiel.
