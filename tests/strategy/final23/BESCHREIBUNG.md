# Abschließende Testgruppe 2.3 (final23) – Beschreibung der Strategien

Verschlossen bis nach den abschließenden Tests. Erstellt von einem unabhängigen Prüfagenten ohne Kenntnis der Modellteile des Coaches
(coach.js, ev.js und die Tabellen in ranges.js wurden nicht gelesen). Verwendet nur die öffentliche Sicht `v` und die Hilfen
`PT.bots.percentile`, `PT.hands.classTop/classIdx`, `PT.ranges.drawInfo`, `PT.rng.hashStr`. Boardtextur, SPR, Position und
Aktionshistorie werten die Strategien selbst aus.

Zusammensetzung `f23`: jeder Pool-Gegner erhält deterministisch eine Strategie (`hashStr(id + '|f23') % 10`).
Zusammensetzung `f23:<kurzname>`: alle synthetischen Plätze spielen dieselbe Strategie.

| Schlüssel | Spielertyp | Idee |
|---|---|---|
| `f23:textur` | TAG, Texturleser | Entscheidet postflop nach Boardtextur statt nur nach Handstärke: auf trockenen, hohen Boards Range-Bet klein (⅓ Pot, Flop ~80 %), auf Turn nur mit Stärke weiter; auf nassen Boards nur Value und Draws groß (¾ Pot), Semi-Bluff-Raises mit Draws; auf gepaarten Boards häufige Mini-Bets (¼ Pot) und weite Floats gegen kleine Flop-Bets; auf trockenen Boards Fold ohne Paar. River-Größe nach Textur, kaum Bluffs. |
| `f23:spr` | Stacktiefen-Spieler | Logik nach effektiver Stacktiefe und SPR. Bis 25 BB effektiv preflop reines Push/Fold (eigene Breiten, keine Charts). Ab 120 BB Set-Mining und Suited Connectors mit Implied-Odds-Grenze (Call ≤ effektiver Stack / 15). Postflop: SPR ≤ 2,5 festgelegt (ab mittlerem Paar oder starkem Draw All-in, sonst raus); SPR 2,5–7 normal; SPR > 7 Pot-Kontrolle (Einzelpaare checken, gegen Raise folden, Draws nur bei billigem Preis). |
| `f23:geschichte` | LAG, Barrel und Float | Verhalten hängt von der eigenen Aktionsfolge über mehrere Straßen ab: als Preflop-Aggressor fast immer C-Bet heads-up; Turn/River-Barrel nur mit Stärke, Draw oder Schreckkarte (Overcard, dritte Flushfarbe, Straßengefahr), sonst Aufgeben. Als Caller floatet er den Flop in Position mit wenig und sticht zu, wenn danach gecheckt wird. Nach Flop-Call ohne Verbesserung foldet er den Turn meist; nach zwei Check-Calls foldet er große River-Bets ohne starke Hand. |
| `f23:mehrweg` | heads-up aggressiv, mehrweg Nit | Logik nach Zahl der aktiven Gegner. Preflop: weite Steals, wenn niemand eingestiegen ist; mit Limpern nur Premium-Raises und Overlimps mit Paaren/suited Assen; leichte 3-Bets aus später Position nur ohne Caller; Squeeze nur mit Premium. Postflop: heads-up Bet ~70 % und Bluff-Raises, Calls ab schwachem Paar; zu dritt moderat; ab drei Gegnern nur sehr starke Hände setzen, nur Nut-Flushdraws oder Combo-Draws callen. |
| `f23:tilt` | solider Reg mit Tilt-Phasen | Merkt sich aus der eigenen Sicht, ob er eine Hand nach ≥ 10 BB Investition gefoldet hat oder sein Stack seit der letzten Hand um > 15 BB gefallen ist; dann 6–17 Hände Tilt. Auch Tilt, wenn sein Stack unter der Hälfte des Median-Stacks der anderen liegt. Normal: eng, Pot-Odds-orientiert. Im Tilt: Opens bis ~55 % mit großen Raises, viele 3-Bets, Calls bis ~60 % auch gegen große Raises, postflop 65 % Bets (0,9 Pot), 30 % Bluff-Raises, Calls mit jedem Draw. Gedächtnis wird geleert, wenn die Handnummer zurückläuft (neue Session). |
| `f23:limper` | Freizeitspieler (Limp/Call, Fit or Fold) | Limpt preflop sehr weit (SB komplettiert bis ~70 %), Open-Raise nur selten mit Premium, Limp-Reraise mit Premium (Falle). Postflop Donk-Lead (0,4 Pot) gegen den Preflop-Aggressor, wenn getroffen; Bets ab Paar, selten Bluffs. Callt jedes Paar und jeden Draw (auch Gutshots) bis zum Turn, River nach Preis; Raises nur mit sehr starken Händen. |
| `f23:balance` | ausgewogen, gemischte Häufigkeiten | Gemischte Strategie mit Zufallsanteil in jeder Klasse: preflop gemischte 3-Bets/Calls je Stärkebereich, Blocker-3-Bets mit suited Assen, gemischte 4-Bets. Postflop Größe nach Textur (⅓ trocken, ⅔ mittel, Pot nass; Turn ¾; River ½ oder Pot gemischt); Nut-Hände mit geometrischer Größe (Pot wächst bis zum River auf All-in), 20 % Check als Falle; Bluffanteil an die Größe gekoppelt (s/(1+2s)); Check-Raises mit Value und Draws; Verteidigung nach Einsatzgröße mit Positions- und River-Aufschlag. |
| `f23:initiative` | 3-Bet-/Squeeze-Spieler, Fit or Fold ohne Initiative | Preflop: viele 3-Bets gegen späte Opens, Squeezes bis ~18 % bei Raise + Caller (Größe wächst mit Callern), selten Flat-Calls (nur BB), leichte 4-Bets gegen 3-Bets. Postflop als Preflop-Aggressor C-Bet ⅓ Pot fast immer (heads-up 95 %), Turn nur mit Stärke/Draw, River nur Value. Ohne Initiative: Fit or Fold. |
| `f23:fluss` | passiver Caller mit River-Polarisierung, Hero-Caller | Flop und Turn passiv (Bets nur mit sehr starken Händen, Calls ab schwachem Paar oder Draw, fast nie Raises). River polarisiert mit Overbets (1,3 Pot): Nuts-Bereich und verpasste Draws (aus dem Turn-Board ermittelt, 70 %), mittlere Hände checken. Callt River-Bets sehr weit (ab ~35 % Perzentil, gegen Overbets ab 50 %). |
| `f23:verlauf` | Spieler mit Ermüdung über die Session | Verhalten driftet stetig mit der Handnummer (Zyklus 400 Hände, je Gegner versetzt): frisch eng und aggressiv, später weiter, mit Limps und mehr Calls, aber deutlich passiver (weniger Value-Bets, weniger Bluffs, kleinere Größen, niedrigere Call-Schwelle). Kein Umschalten zwischen zwei Stilen, sondern kontinuierlicher Verlauf. |

## Abgrenzung zu bestehenden Strategien
- Keine verwendet die Preflop-Charts (`R.chart`), den Baustein `preTop` aus `strategies.js` oder den Parametervektor aus `synth23.js`.
- Neue Entscheidungsgrößen: eigene Boardtextur und Schreckkarten (`textur`, `geschichte`, `balance`), SPR und effektiver Stack (`spr`, `balance` geometrisch),
  Aktionshistorie über mehrere Straßen (`geschichte`, `fluss`, `balance` Check-Raise), Gegnerzahl und Limper/Caller vor dem Raise (`mehrweg`, `initiative`),
  sitzungsübergreifendes Gedächtnis aus der eigenen Sicht (`tilt`), stetige Zeitdrift (`verlauf`), Donk-Leads und Limp-Reraise (`limper`).

## Prüfung durch den Prüfagenten
- `node --check` bestanden.
- Rauchtest (Seed 4242, 150 Hände, 100 BB, Held potodds) für `f23` und alle zehn Einzelschlüssel ohne Ausnahme; keine Rückfälle auf Check/Call wegen ungültiger Aktionen.
- Zusätzlich 60 Hände je Strategie bei 15, 40 und 250 BB ohne ungültige Aktion.
