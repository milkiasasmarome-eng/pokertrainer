# Ursachenanalyse der strategischen Regression 2.2 (Arbeitspaket 1, 2.3)

Rohdaten: `tests/results/strategy-abl23.json`, Läufe `tests/results/strategy-runs/a1*`. Plan `abl23` in `tests/strategy/compare.js`.
Seeds 23001–23006 (Regressionsset) und 23101–23104 (Gegner-KI V), in keiner anderen Studie verwendet.

## Versuchsaufbau

Kontrollierte Ablation: Coach 2.2 mit genau einer ersetzten Komponente (Schalter `PT.ranges.ABL`, nur für Vergleichsläufe), gepaart mit Coach 2.2
auf denselben Karten. Komponenten:

| Kürzel | ersetzt durch Stand 2.1 |
|---|---|
| R | Range-Eingrenzung nach Aktionen (Populationstabelle → Likelihood 2.1 nach relativer Stärke) |
| S | Reaktionsmodell (Mischung Tabelle/2.1 → nur Modell 2.1) |
| A | Anpassung der Tabelle an den einzelnen Gegner (λ, γ) abgeschaltet |
| D | Datenlage nach Händen statt nach Gelegenheiten |
| RS, RSD | Kombinationen (Wechselwirkungen) |

Gegner: Regressionsset (die sechs früher abschließend unbekannten Strategien, je 2.500 Hände, zusammen 15.000 Hände je Variante) und Gegner-KI,
Validierungsgruppe V (10.000 Hände). Block-Bootstrap, 500er-Blöcke; Differenz = Coach 2.2 − Variante (negativ: die Variante ist besser).

## Ergebnis

| Variante | Regressionsset: 2.2 − Variante | Gegner-KI V: 2.2 − Variante |
|---|---|---|
| S (Reaktionsmodell 2.1) | **−18,9 [−29,9; −8,5]** belegt | **+15,2 [0,9; 28,6]** belegt |
| R (Range 2.1) | −11,2 [−23,9; 0,9] nicht belegt | +5,3 [−6,8; 17,5] nicht belegt |
| A (ohne Gegneranpassung) | +4,7 [−5,7; 15,5] | −5,5 [−13,3; 2,2] |
| D (Datenlage nach Händen) | 0,0 [−0,1; 0,2] | −3,4 [−8,5; 2,3] |
| RS | −17,7 [−30,8; −4,9] belegt | +29,5 [15,5; 43,2] belegt |
| RSD | −17,9 [−30,9; −5,1] belegt | +30,4 [17,7; 43,1] belegt |

Kontrolle: RSD spielt auf allen 10 Seeds exakt wie Coach 2.1.0 (Differenz 0). Damit gibt es keine weitere, unerkannte Ursache.

Nach Strategie (2.2 − Variante, je 2.500 Hände, einzeln nicht belegt): Polarisierer R −61,6, S −8,0; Fallensteller R −11,7, S −31,4;
Positionsspieler R +19,2, S −27,2; „eng preflop, aggressiv postflop“ R −34,5, S −25,6.

## Befund

1. **Hauptursache ist das Reaktionsmodell** (belegt). Die aus der Gegner-KI erhobene Aktionstabelle sagt gegen fremde Strategien zu viele Folds
   voraus. Das macht Bets und vor allem Raises scheinbar profitabel: Raises postflop 6,7 % der Entscheidungen (2.1: 2,1 %), Checks 27,8 % (2.1: 31,5 %).
2. **Die Range-Tabelle trägt bei einzelnen Strategien bei** (über das Set −11,2, einzeln nicht belegt). Sie ist gegen den Polarisierer allein verantwortlich: Große
   Einsätze gelten als stark, beim Polarisierer sind sie zur Hälfte Luft.
3. **Mehrere Ursachen wirken gleichzeitig, aber nicht additiv.** Je nach Strategie überwiegt die Range (Polarisierer) oder die Reaktion
   (Fallensteller, Positionsspieler). Über das ganze Regressionsset ist die Wechselwirkung unteradditiv: S allein −18,9, R allein −11,2, beide
   zusammen −17,7. Wer die Reaktion ersetzt, beseitigt dort fast den ganzen Verlust; die Range-Tabelle wirkt vor allem gegen einzelne
   Strategien (Prüfbefund B23-8). Gegen die Gegner-KI verstärken sich beide Teile (RS +29,5 > S + R = +20,4).
4. Die Gegneranpassung (λ, γ) und die Datenlage nach Gelegenheiten erklären die Regression nicht.
5. Derselbe Mechanismus, der gegen die Gegner-KI +30 BB/100 bringt, kostet gegen fremde Spielweisen. Die Tabellen sind an der Gegner-KI angepasst
   und übertragen sich nicht. Die Gegner-KI ist für den Trainer die eigentliche Zielgruppe; für allgemeine strategische Qualität ist das Übertragen entscheidend.

Folgerung für 2.3 (Arbeitspakete 2 und 3): ein robustes Basismodell ohne die angepassten Tabellen, ein adaptives Modell mit Tabellen und ein
hybrides Modell, das die Tabellen nur so weit nutzt, wie sie für die Gegner am Tisch nachweislich passen. Ergebnisse der Modellwahl:
`docs/STRATEGIEVARIANTEN_2.3.md`.
