# Prüfbericht A – Mathematik, Equity, EV, Statistik (PokerTrainer 2.2)

Prüfstand: Kopie von `/home/claude/pokertrainer` (Zweig entwicklung-2.2, Commit 72d085f) unter `/home/claude/review22/A/repo`.
Im Repository wurde nichts geändert. Eigene Prüfskripte: `/home/claude/review22/A/skripte/`. Alle Befehle laufen in diesem
Verzeichnis, `REPO=/home/claude/review22/A/repo`. Jede Rechnung dauert unter 3 Minuten, es lief immer nur ein Prozess.

Übersicht: **1 schwer, 4 mittel, 11 gering** (16 Befunde). Was ich geprüft und für korrekt befunden habe, steht am Ende.

---

## A-1 (schwer) Push-Chart mit scale < 1 multipliziert alle Jam-Anteile: Die Gegner-KI foldet AA/KK als Erster im Pot

- Datei: `assets/js/engine/ranges.js`, Zeile 161–164 (`chart('push')`, 2.2-Zweig). Betroffen sind die Gegner-KI (`bots.js` Z. 135–139, `scale: Math.sqrt(P.rfi)`)
  und die Range-Schätzung (`preflopRange` Z. 215, `scale: Math.sqrt(pfrScale)`).
- Beschreibung: Für scale ≤ 1 gilt `r = jr[i] · scale`. Damit sinkt **jede** Klasse um denselben Faktor, auch AA. Der alte Chart (2.1) hat die
  Bandbreite verkleinert, AA blieb bei 1. Die Gegner-KI jammt nur mit der Wahrscheinlichkeit `pw.raise` und foldet sonst (`passive(L)`).
  Nits (`rfi` 0,52, also scale 0,72) folden AA damit in 28 % der Fälle, loose-passive Spieler (scale 0,88) in 12 %.
  Für die Range-Schätzung des Coaches kürzt sich ein gleicher Faktor bei der Normierung heraus. Dort hat „Breite mit PFR skaliert“ für
  enge Spieler also gar keine Wirkung. Dasselbe gilt für `chart('callPush')` mit `callScale` (Z. 167): Die Nash-Call-Ranges enthalten
  praktisch nur reine Klassen (0 oder 1), deshalb bleibt die normierte Form bei callScale 0,55 bis 1,61 unverändert (23,1 %).
- Reproduktion: `node push-scale.js $REPO 6000`
- Erwartet: Premium-Hände (AA, KK, QQ, AKs) gehen mit 10 BB als Erster im Pot immer All-in. Engere Spieler haben eine engere, aber
  weiterhin oben geschlossene Range.
  Tatsächlich: Bei scale 0,72 ist AA = 0,72. In der Simulation folden Nits Premium-Hände in 30 % der Fälle (40 Fälle), loose-passive in 8 % (53 Fälle).
- Vorschlag: Breite über die Ordnung der Klassen skalieren, nicht über die Wahrscheinlichkeit. Etwa: Klassen nach Jam-Anteil bzw.
  `classTop` sortieren und die Schwelle so setzen, dass die kombinationsgewichtete Breite = scale × Gleichgewichtsbreite ist (weiche Kante
  wie `bandClass`). Dasselbe für `callPush`. Regressionstest: `chart('push',{scale:0.5})[AA].raise === 1`.

## A-2 (mittel) Push-Chart mit scale > 1: Breite wächst um mehr als „× scale“ und Müllhände kommen gleichmäßig dazu

- Datei: `ranges.js` Z. 164 (Zweig `scale > 1`).
- Beschreibung: Der Zuschlag `(1 − jr)·(scale − 1)·bandClass(i, 0, 0.9)·0.5` ist für alle Klassen in den oberen 90 % gleich groß. Bei UTG 10 BB und
  scale 1,32 (sehr loose Gegner-KI) bekommen K9o, A2o, T7o und 94o dasselbe Gewicht 0,16. Die Breite wächst auf das 1,81-Fache
  (Kommentar: „Breite × scale“). Bei scale 1,61 (maximales pfrScale) wächst sie auf das 2,55-Fache.
- Reproduktion: `node push-scale.js $REPO 100` (oberer Teil der Ausgabe). Dazu die Einzelwerte:
  `node -e "const PT=require('$REPO/tests/load.js').load();const c=PT.ranges.chart('push',{pos:'UTG',bb:10,scale:1.32});['K9o','94o'].forEach(n=>console.log(n,c[PT.hands.nameToIdx(n)].raise))"`
- Erwartet: Die Range wird um die nächstschwächeren Klassen erweitert, ihre Breite liegt ungefähr bei scale × Gleichgewichtsbreite.
  Tatsächlich: Die Erweiterung ist nicht monoton in der Handstärke, die Breite ist um das 1,8- bis 2,6-Fache größer.
- Vorschlag: wie bei A-1, ein gemeinsames, monotones Breitenverfahren für scale < 1 und scale > 1.

## A-3 (mittel) Bezugspunkt der Gegneranpassung: PRIOR bzw. Prober-Grundraten statt Populationsmittel der Tabelle

- Datei: `ranges.js` Z. 398–413 (`familyTarget`), Z. 445–449 (`aggRates`). Die Grundraten stammen aus `tools/build-likelihood.js` (`table.pool`).
- Beschreibung: Die Aktionstabelle beschreibt bereits die Population der Gruppe E. Die Gegneranpassung vergleicht die Werte des Gegners aber mit
  `PT.ranges.PRIOR` (cbet*, foldToCbet*, afq, wtsd) und mit `LIK.pool` (gemessen gegen den Prober mit zufälligen Größen von 0,25 bis 2,2 Pot).
  Beide Bezugspunkte weichen deutlich vom Populationsmittel am Tisch ab (Pool, 8.000 Hände):
  foldToCbetTurn 0,348 gegen PRIOR 0,45, wtsd 0,331 gegen 0,28, foldToCbet 0,517 gegen 0,44, afq 0,485 gegen 0,42, aggFold 0,545 gegen pool.fold 0,569.
  Ein gut beobachteter **Durchschnittsgegner** wird deshalb systematisch verschoben, etwa am Turn gegen ~0,75 Pot:
  Weiterspielen 0,505 → 0,572 (Fold-Rate −6,7 Pp.). Weitere Beispiele: River s3 0,258 → 0,280, Flop s2 0,478 → 0,451, River-C-Bet 0,309 → 0,297.
  Bei wenigen Beobachtungen liegen die Werte durch die Glättung nahe am Bezugspunkt, die Verschiebung ist dann 0. Die Verzerrung wächst also
  mit der Datenmenge. Die Anpassung (Range-Schätzung und `likRespond`) hängt so an der Stichprobengröße statt am Gegner.
- Reproduktion: `node pop-vs-prior.js $REPO 8000 alle` (ganzer Pool) bzw. `node pop-vs-prior.js $REPO 5000 E` (Gruppe E)
- Erwartet: Bei Gegnerwerten = Populationsmittel ist keine Anpassung nötig (Faktor 1).
  Tatsächlich: Verschiebungen bis 6,7 Pp. in der Weiterspielquote.
- Vorschlag: Die Populationsmittel genau dieser Werte in `fit-likelihood.js` aus denselben Daten mitzählen und in `LIK` ablegen (z. B. `LIK.ref`),
  dann in `familyTarget` und `aggRates` (Glättungsziel und Bezug) verwenden. Den Prober-Effekt auf `pool.fold` entweder herausrechnen (nur
  Bot-gegen-Bot-Entscheidungen für die Grundrate) oder je Größenklasse beziehen.

## A-4 (mittel) `training.improvement`: Regression zur Mitte, ohne jede Lernwirkung erscheint „Verbesserung“

- Datei: `assets/js/engine/training.js` Z. 311–320; Anzeige `assets/js/ui/views.js` Z. 501 und 507 ff. („Verbesserung in zuvor schwachen Situationen“, grün markiert, wenn |Diff| > Intervall).
- Beschreibung: „Zuvor problematisch“ wird an denselben ersten 10 Entscheidungen festgestellt, die auch den Vorher-Wert liefern. Wer so auswählt,
  bekommt danach im Mittel eine Verbesserung, auch wenn sich nichts ändert. Außerdem verwendet die Rechnung bei n = 10 den Wert 1,96
  statt des t-Quantils (≈ 2,10).
- Reproduktion: `node training-null.js $REPO 2000` (Bewertungen i.i.d. aus der Notenskala 100/90/80/65/45/20/0, keine Lernwirkung)
- Erwartet: In „zuvor schwachen“ Spots im Mittel ±0, „sicher verbessert“ in höchstens 2,5 % der Fälle.
  Tatsächlich: 11 % der Spots gelten als „zuvor schwach“. Dort beträgt die mittlere Differenz **+17,3 Punkte**, und **18,3 %** sind grün als
  sichere Verbesserung markiert. Über alle Spots ist das Ergebnis in 6,8 % der Fälle „sicher“ (nominal 5 %).
- Vorschlag: Problemfeststellung und Vorher-Messung trennen (z. B. Entscheidungen 1–10 bestimmen „problematisch“, 11–20 sind „vorher“,
  die letzten 10 „nachher“), oder den Vorher-Wert zum Gesamtmittel schrumpfen. t-Quantil mit Welch-Freiheitsgraden verwenden.
  Ein Hinweis in der Anzeige wäre nur ein Notbehelf.

## A-5 (mittel) `preflopRange` liest die Raise-Größe als Stacktiefe, ohne All-in-Prüfung; Rückfall auf alten callPush-Zweig

- Datei: `ranges.js` Z. 213–225. Die Linie kommt aus `coach.js` `lineOf` (`sizeBB` = letzter Raise preflop).
- Beschreibung:
  (a) `open` mit 6–25 BB wird immer als Jam mit Stack = sizeBB behandelt, `call` gegen 6–25 BB immer als Call gegen einen Jam. Beispiele:
  Caller gegen ein Iso-Raise von 6,5 BB (tiefe Stacks) bekommen die Nash-Call-Range gegen einen 6,5-BB-Jam (BB gegen BTN 33,7 %).
  Bei 5,9 BB liefert der alte Pfad 16,6 %, die Range springt an der Grenze 6 BB also auf das Doppelte. Eigene Opens des Spielers mit 6+ BB
  (`heroRangeFor`, River-Modellspiel) werden ebenfalls als Jam gelesen: SB 6 BB ergibt 68,3 %, SB 5,9 BB ergibt 40,0 %.
  Umgekehrt nutzen Jams > 25 BB den RFI-Chart, auch wenn der effektive Stack ≤ 18 BB war (die Gegner-KI jammt nach effektivem Stack).
  (b) Sitzt der Opener **nach** dem Caller (Limp, dann Raise, dann Call) oder ist er der BB, gibt es keinen Schlüssel `opener>pos`.
  `pfRow` liefert dann null und `chart()` fällt auf den alten `callPush`-Zweig mit `vsWidth` = 0,2 zurück (Top 11 %, unabhängig vom Limp-Verhalten).
- Häufigkeit (Bot gegen Bot, 6.000 Hände): 42 Opens zwischen 6 und 25 BB, alle All-in. 3 Jams > 25 BB. 12 Calls auf dem 6–25-BB-Pfad, davon 6 gegen
  Raises ohne All-in und 3 im Rückfall (b). Selten, aber logisch falsch, und bei menschlichen Spielern mit großen Opens häufiger.
- Reproduktion: `node ranges-check.js $REPO` (Abschnitt c), `node pf-lines.js $REPO 6000`
- Erwartet: Jam-Ranges nur für All-in-Aktionen, mit der Tiefe = effektiver Stack. Sonst der normale Open/Call-Pfad.
  Tatsächlich: siehe oben.
- Vorschlag: In `lineOf` das All-in-Flag (`a.ai`) und den effektiven Stack (`start` der Beteiligten) mitgeben. Den PF-Pfad nur bei
  `ai && 6 ≤ eff ≤ 25` wählen, `bb: eff`. Fehlt ein `callPush`-Schlüssel, auf den 2.1-Zweig `call` zurückfallen statt auf den alten callPush-Chart.

## A-6 (gering) Preflop-Equity-Tabelle ist Monte Carlo, nicht „exakt über alle Boards“

- Datei: `tools/solve-pushfold.js` Z. 4 (Kommentar). Die Tabelle entsteht in `tools/precompute-preflop.js` (MC, Standard 12.000 Stichproben je Paar).
- Beschreibung: Die exakte Aufzählung aller 1.712.304 Boards (eigene Kombinationsaufzählung, App-Bewertung; eine unabhängige Bewertung stimmt
  in der Reihenfolge 20.000/20.000 Mal überein) ergibt für 45 zufällige Klassenpaare einen RMS-Fehler von 0,49 Pp., maximal 1,05 Pp.
  Beispiele: AKs gegen QQ, Tabelle 0,4724, exakt 0,4605 (+1,19 Pp.). AQo gegen AJs, Tabelle 0,6861, exakt 0,6966. Das entspricht dem MC-Rauschen von 12.000 Stichproben.
  Für das Push/Fold-Modell ist das klein, die Aussage „exakt“ stimmt aber nicht.
- Reproduktion: `node eqexact.js $REPO AKs:QQ 55:AKs AQo:AJs AA:KK`, `node eqexact-sample.js $REPO 60`, `node eqcheck.js $REPO 30000`
- Vorschlag: Kommentar korrigieren („Monte Carlo, 12.000 Stichproben, SE ≈ 0,45 Pp.“) oder die Tabelle exakt rechnen (Suit-Isomorphie: je Paar
  höchstens 12 Gegnerkombinationen × 1,7 Mio. Boards, offline machbar).

## A-7 (gering) `oppAdjust`: raiseMul verschiebt die Fold-Rate weg vom Zielwert; Klammer [0,005; 0,985] auch ohne Anpassung

- Datei: `ranges.js` Z. 434 und 437.
- Beschreibung: Der Raise-Anteil wird vor der Transformation mit `raiseMul` (aus afq) multipliziert, ohne den Call-Anteil zu senken. Damit steigt die
  Weiterspielquote, obwohl die beobachteten Fold-Werte (aggFold, foldToCbet) genau am Bezugspunkt liegen: Bei afq 0,75 sinkt die Fold-Rate
  am Turn s3 von 0,495 auf 0,457, am Flop s2 von 0,522 auf 0,503. Aggression geht also doppelt ein. Unabhängig davon setzt die Klammer
  `A2 ≤ 0,985` auch bei T ohne λ/γ eine Fold-Mindestrate von 1,5 % für die stärksten Hände (≈ +0,4 Pp. Fold im Mittel).
- Reproduktion: `node raisemul.js $REPO`
- Erwartet: Fold-Rate unverändert, wenn die Fold-Werte des Gegners dem Bezug entsprechen.
  Tatsächlich: bis −3,8 Pp.
- Vorschlag: raiseMul nur innerhalb des Weiterspielanteils umverteilen (r' = min(A, r·m), c' = A − r'), Klammer nur anwenden, wenn λ oder γ gesetzt ist.

## A-8 (gering) `famTransform`: γ-Bisektion endet bei 8 und erreicht extreme Zielwerte nicht

- Datei: `ranges.js` Z. 423.
- Beschreibung: Die Bisektion selbst ist korrekt (Mittel von x^γ fällt monoton in γ, die Richtung stimmt). Bei Zielwerten unter dem Mittel von x^8
  bleibt γ aber ohne Hinweis bei 8: Flop s1, Ziel 0,109, erreicht 0,396. Bei zufälligen Gegnerwerten von 0,05 bis 0,95 verfehlt die
  Transformation das Ziel in 6,1 % der Fälle um mehr als 0,02, bei Werten von 0,25 bis 0,75 in 0,4 % der Fälle.
- Reproduktion: `node famtarget.js $REPO 0.05 0.95` und `node famtarget.js $REPO 0.25 0.75` (familyTarget ist im Skript wortgleich nachgebildet, weil nicht exportiert)
- Vorschlag: Obergrenze erhöhen (z. B. 40) oder für die starken Klassen einen zusätzlichen Fold-Anteil zulassen. Erreichten Wert gegen Ziel in einem Test prüfen.

## A-9 (gering) Dirichlet-Hierarchie nutzt dieselben Zählungen doppelt (effektive Priorstärke ≈ 2,7 statt 8)

- Datei: `tools/build-likelihood.js` Z. 13–17.
- Beschreibung: Der Prior der Kindzelle ist die Posterior der Elternzelle, und diese enthält die Zählungen des Kindes bereits. Am River gibt es nur
  dr = 0, Kind- und Elternzählungen sind also identisch. Bei n = 8 wird das Gewicht des Großeltern-Priors 0,25 statt 0,5 (α_eff ≈ 2,7).
  Beispiel: `3|rr|m|0|9` (n = 1, ein Fold) ergibt f = 0,234, die Elternzelle 0,138 (die Nuts folden am River gegen einen Raise im Mehrspielerpot zu 23 %).
  Der dokumentierte Wert „α = 8 Beobachtungen“ gilt also nicht.
- Reproduktion: `node -e "const T=require('$REPO/tests/results/likelihood-table.json');['3|rr|m|0|9','3|rr|m|*|9'].forEach(k=>console.log(k,T.c[k],T.n[k]))"`
- Vorschlag: Prior des Kindes aus der Elternzelle **ohne** die Zählungen des Kindes bilden (Leave-one-out), oder wo die Elternzelle nur ein Kind
  hat (River), die Stufe überspringen.

## A-10 (gering) `calib-report.js`: Intervall ist Normalnäherung (nicht Bootstrap), Gesamtintervall zu schmal, Datensätze ohne Handkennung

- Datei: `tests/strategy/calib-report.js` Z. 2 (Kommentar „Bootstrap über Entscheidungen“), Z. 10 (`ci`). Dazu `range-calib.js` und `equity-calib.js` (keine Hand-/Seed-Kennung je Datensatz).
- Beschreibung: `ci()` ist Mittel ± 1,96·SE unter Unabhängigkeit. Mehrere Entscheidungen einer Hand (Straßen, beide Spieler) sind korreliert.
  Eine Messung mit Handkennung (Kopie von range-calib mit `hand: i`, 400 Hände, Gruppe V) ergibt: je Straße Cluster-SE ≈ naive SE (Faktor 0,98–1,00),
  über alle Straßen Faktor 1,40. Die „Gesamt“-Intervalle sind also um ~40 % zu schmal. Die Abnahme (Bias je Straße ±0,03) ist davon kaum betroffen.
  Ohne Handkennung kann nachträglich nicht korrigiert werden.
- Reproduktion: `node range-calib-hand.js 777 400 V rc-test.json && node cluster-se.js rc-test.json`
- Nebenbeobachtung (kein Befund, kleine Stichprobe): In diesem Lauf ist ref − true am Flop −0,041 ± 0,025, also nahe an der Abnahmegrenze ±0,03.
- Vorschlag: Hand- und Seed-Kennung in jeden Datensatz schreiben, Cluster-Bootstrap über Hände. Kommentar an das tatsächliche Verfahren anpassen.

## A-11 (gering) Folgeaudit: Lag-1-Autokorrelation durch Zentrierung je Lauf um ≈ 0,04 nach unten verzerrt

- Datei: `tools/folgeaudit-2.1.js` Z. 20–26; Aussage in `docs/audit-2.2/FOLGEAUDIT.md` Z. 48 f.
- Beschreibung: Die Zentrierung je Lauf (25 Blöcke) ist richtig. Ohne jede Abhängigkeit erwartet man dann aber ρ̂ ≈ −1/25. Eine Permutation der Blöcke
  innerhalb der Läufe ergibt die Nullerwartung −0,041 (alle) bzw. −0,042 (Coach 2.1). Die bereinigte Lag-1-Korrelation beträgt damit **0,10** (alle) bzw. **0,15**
  (Coach 2.1) statt 0,06 bzw. 0,11, beide klar signifikant (p < 0,003). Lag 5 ist mit 0 vereinbar (bereinigt 0,006 bzw. 0,012). Die Schlussfolgerung
  „bei 500er-Blöcken praktisch verschwunden“ bleibt haltbar: Nach dieser Lag-1-Struktur korrelieren benachbarte 500er-Blöcke mit ≈ 0,02.
  Die direkte Prüfung an 500er-Blöcken hat mit 5 Blöcken je Lauf keine Trennschärfe.
- Reproduktion: `node acf-check.js $REPO`
- Vorschlag: Die bereinigten Werte (bzw. die Nullerwartung) berichten.

## A-12 (gering) `errorAreas` zählt eine Entscheidung mehrfach, wenn mehrere Kategorien auf dasselbe Feld fallen

- Datei: `training.js` Z. 293–298 (Spalte „Fehler“ in views.js).
- Beschreibung: `pot-odds` und `draw` gehören beide zu „Pot Odds“, ebenso führen `mittelstark`, `zu-viel-call`, `zu-viel-fold` und `gegnertyp` alle zu „Range-Einschätzung“.
  `n` und `recent` zählen je Kategorie, nicht je Entscheidung. Zwei Entscheidungen erscheinen so als „5 Fehler“. Der EV-Verlust wird dagegen richtig verteilt.
- Reproduktion: `node areas.js $REPO` → `Pot Odds n=2` (1 Entscheidung), `Range-Einschätzung n=3` (1 Entscheidung)
- Vorschlag: Je Entscheidung die Menge der Felder bilden und jedes Feld einmal zählen.

## A-13 (gering) `prePostResult`: Normalnäherung bei kleinen n, „eindeutig“ zu oft

- Datei: `training.js` Z. 346–352.
- Beschreibung: Das Welch-Intervall verwendet 1,96 statt des t-Quantils. Schon ab n ≥ 2 je Phase wird es berechnet und angezeigt (auch bei laufenden Tests).
  Ohne jeden Effekt ergibt sich „eindeutig“ bei 12 gegen 12 in 6,5 % der Fälle, bei 4 gegen 4 in 9,3 %, bei 2 gegen 2 in 17,4 % (nominal 5 %).
  Ist sd = 0 (alle Noten gleich), wird das Intervall 0 und jede Differenz ≠ 0 gilt als eindeutig.
- Reproduktion: `node training-null.js $REPO 2000` (untere Zeilen)
- Vorschlag: t-Quantil mit Welch–Satterthwaite-Freiheitsgraden, Urteil erst bei vollständigen Phasen. Alternativ ein exakter Permutationstest (bei 12 + 12 trivial).

## A-14 (gering) `hypotheses`: Bezug „Durchschnitt“ ist PRIOR, nicht das Populationsmittel; keine Mehrfachtest-Korrektur

- Datei: `training.js` Z. 369–375.
- Beschreibung: Wie bei A-3 weicht PRIOR vom Populationsmittel ab (afq 0,42 gegen 0,50, wtsd 0,28 gegen 0,33, foldToCbet 0,44 gegen 0,53). In einer Simulation
  (ganzer Pool, 10.000 Hände) ist „spielt postflop aggressiv (gestützt)“ bei 46 von 93 Gegnern belegt, „passiv“ nur bei 14. „geht oft zum Showdown“ ist
  bei 18 von 93 belegt, „selten“ bei 1. Bei 8 Werten je Gegner und α = 5 % erhält ein Durchschnittsgegner zudem mit etwa 34 % Wahrscheinlichkeit
  mindestens eine „gestützte“ Hypothese.
- Reproduktion: `node hyp-check.js $REPO 10000`
- Vorschlag: Populationsmittel der Gegner-KI (oder des eigenen Datenbestands) als Bezug verwenden, Bonferroni/Holm über die 8 Werte, Text „als der Durchschnitt der Gegner“ nur mit diesem Bezug.

## A-15 (gering) likRespond im Mehrspielerpot und bei All-in-Spielern: Zelle stimmt nur für den ersten Reagierenden

- Datei: `assets/js/engine/ev.js` Z. 274–275 (Kommentar „wie in den Daten“).
- Beschreibung: Für den ersten Reagierenden sind Preis f und Zelle exakt wie in den Daten (siehe „korrekt befunden“). Weitere Reagierende bekommen
  dieselbe Zelle. In den Daten haben sie nach einem Call aber einen anderen Preis, z. B. Pot-Bet: erster `1|s4|m`, zweiter nach Call `1|s2|m`.
  Mehrgegner zählt in den Daten alle nicht gefoldeten Spieler (auch All-in), zur Laufzeit nur `nR` = Gegner ohne All-in. Ein Gegner gegen
  Held plus All-in-Spieler steht in den Daten also unter „m“, zur Laufzeit unter „h“. Am River fehlen die Zellen `3|rr|m|*|7` und `3|rr|m|*|8`.
  `likRespond` gibt dort null zurück (Rückfall, in Ordnung). `narrowPostflop` mischt in derselben Aktualisierung Tabellen-Likelihoods und alte Faustregel-Likelihoods
  für verschiedene Kombinationen (verschiedene Skalen).
- Reproduktion: `node ranges-check.js $REPO` (Abschnitt e). Fehlende Zellen:
  `node -e "const L=require('$REPO/tests/results/likelihood-table.json');console.log(['3|rr|m|*|7','3|rr|m|*|8'].map(k=>k+' '+!!L.c[k]))"`
- Vorschlag: Je Reagierendem den Preis nach den vorherigen Reaktionen bilden (oder Kommentar einschränken). Für mw auch All-in-Spieler zählen.
  Fehlt eine Zelle, auf die Elternstufe ohne Mehrgegner zurückfallen (`st|k|*|*|xb`, in build-likelihood schon berechnet, aber nicht exportiert).

## A-16 (gering) Kleinere Ungenauigkeiten im Push/Fold-Teil

- Kodierung in Neunteln: `solve-pushfold.js` Z. 59–60 und `ranges.js` Z. 100 sprechen von „Zehnteln“, kodiert und dekodiert wird aber mit x·9 bzw. /9. Die Rechnung ist intern konsistent, nur die Doku stimmt nicht.
- Unter 6 BB klammert `pfRow` auf die 6-BB-Tabelle. Die Gegner-KI nutzt die Tabelle für jeden effektiven Stack ≤ 18 BB, also auch bei 3 BB.
  Das Modellspiel selbst (solve() des Repos) ergibt bei 3 BB UTG 39,3 % / SB 78,7 %, die Gegner-KI jammt mit 20,0 % / 68,3 %. Der alte Chart skalierte mit dem Stack.
  Reproduktion: `node pf-short.js $REPO`. Vorschlag: Stacks 2, 3 und 4,5 BB in `STACKS` aufnehmen.
- Die Exploitability gilt im Modell ohne Kartenentfernung. Mit Kartenentfernung verschiebt sich das HU-Gleichgewicht bei 10 BB von 58,1 % auf 58,9 % Jam (Call 37,3 % → 37,4 %), siehe `pushfold-check.js`. Das ist dokumentiert und klein.

---

## Geprüft und korrekt befunden

1. **Push/Fold-Auszahlung** (`solve-pushfold.js`): Jammer gewinnt bei Fold aller 1,5 − eigener Blind. Pot bei Call: 2S + Dead Money mit
   Dead = 1,5 − Blind(Jammer) − Blind(Caller). Fold kostet den eigenen Blind. Caller handeln in Sitzreihenfolge, P(q callt) = Π(1 − Call früherer) · Call(q).
   Alles richtig.
2. **Exploitability**: Erreichwahrscheinlichkeiten (Jam-Knoten Π(1 − Jam vor p); Call-Knoten zusätzlich Jam(p) · Π Fold der Caller dazwischen) und
   Kombinationsgewichte sind richtig. Die Summe der lokalen Gewinne ist hier die NashConv, weil kein Spieler eigene Knoten auf einem gemeinsamen Pfad hat.
   Eine eigene, getrennt geschriebene Rechnung liefert auf derselben Strategie denselben Wert (0,067233 = 0,067233; `node pf-same2.js $REPO 200`).
   Die gespeicherte Lösung (0,01 gerundet) hat nachgerechnet 0,0009–0,0019 BB/Hand, die eingebettete Neuntel-Tabelle 0,0004–0,0012.
   Gemeldet werden 0,0021–0,0042. Die Angabe ist also konservativ, die Abnahme (≤ 0,005) erfüllt. `node pushfold-check.js $REPO 10`
3. **Unabhängige HU-Nachrechnung** (eigene CFR+-Implementierung, 4.000 Iterationen, Exploitability 1e−7): SB 10 BB Jam **58,1 %**, BB Call **37,3 %**.
   Das Repo liefert 58,0 % / 37,2 %. Übereinstimmung im Rahmen der Neuntel-Rundung.
4. **pfRow**: lineare Interpolation zwischen Nachbarstacks (9 BB = Mittel aus 8 und 10 exakt), Klammerung an den Rändern, Jam-Breiten monoton fallend in der Stacktiefe.
5. **Zellenkonsistenz Daten ↔ Laufzeit**: An 9.874 Bot-Entscheidungen sind Zelle (actionCell vor der Aktion gegen cellAt auf der Aktionsliste) und
   Ergebnis (actionOutcome) identisch (0 Abweichungen). Ebenso xa (`bots.percentile` gegen `ev.absStrength`, beide Mitte der Gleichstände gegen alle
   mit dem Board verträglichen Hände) und das Draw-Flag (`drawInfo().strong` in beiden). Der Preis f = tc/(pot − tc) ist in Daten und Laufzeit gleich definiert
   (pot = potTotal vor der Aktion einschließlich Einsätzen der Straße). **likRespond** bildet für den ersten Reagierenden in 2.485 von 2.485 Fällen
   genau den Schlüssel der Daten (Größenklasse, rr, h/m). `node cell-consistency.js $REPO 4000`
6. **Tabelle LIK**: Alle 1.551 Zellen summieren sich zu 1 (max. Abweichung 0,0001, Rundung). Die Familien-Grundraten stimmen mit Σ hist·P überein (max. 0,0002).
7. **oppAdjust**: In 39.880 Aufrufen mit zufälligen Gegnerwerten liegen alle Wahrscheinlichkeiten in [0,1] und summieren sich zu 1. Die λ-Formel trifft das Ziel
   exakt (Mittel von P + λ(1 − P) = Ziel). Bei der γ-Bisektion stimmt die Richtung, Monotonie ist gegeben, Abweichungen nur an der Grenze (A-8).
   Mittlere Abweichung vom Ziel 0,0012 bei realistischen Werten.
8. **likRespond/respond**: contW = w·(c + r), callW = w·c, raiseW = w·r, f = 1 − ΣcontW/W. Die Mischung `tabBlend` ist linear in den Ranges und den Raten,
   die Konsistenz f ↔ contW bleibt erhalten (beide Modelle normieren auf dieselbe Range-Summe W). Raise bei fehlender Raise-Möglichkeit geht in Call.
9. **equity-calib/range-calib**: `runoutsEq` behandelt Mehrspieler-Gleichstände richtig (Anteil 1/(1 + Anzahl Gleichstände), verloren, sobald ein Gegner besser ist).
   „true“ zählt alle Restboards exakt auf, mit einem Deck ohne alle ausgeteilten Startkarten. „ref“ nutzt eine unverzerrte Schätzung (Flop: 4.000 × (Kombination nach Gewicht,
   ein Runout); Turn/River exakt). Einen Auswahleffekt gibt es nicht: Erfasst werden alle Entscheidungen, und die Auswahl hängt nur an öffentlicher Information.
   E[true | öffentlich] ist die richtige Kalibrierungsgröße, auch mit den Karten gefoldeter Spieler im Deck. Doppelt gezählt wird nichts. Die Range in „ref“ ist
   dieselbe wie im Coach (`buildRange` mit demselben Modus, `prepare` in coach.js).
10. **folgeaudit**: Die Zentrierung erfolgt je Lauf (richtig), Aufschlüsselung und Seed-Zählung entsprechen den Rohdaten (241 Läufe, 25 Blöcke je Lauf). Zur Verzerrung siehe A-11.
11. **training.js**: `sd` mit n − 1, die Welch-SE-Formel hat die richtige Form (nur das Quantil fehlt, A-13), Wilson-Intervall in `stats.wilson` richtig.
    `recurring` zählt je (Spot, Kategorie) wie dokumentiert.
12. **aggRates**: Die Gelegenheiten entsprechen der Definition (ohne offenen Einsatz nur Check/Bet, mit Einsatz Fold/Call/Raise; nur postflop, `stats.js` Z. 74–75).
    Glättung mit 30 Pseudo-Gelegenheiten. Zum Bezugspunkt siehe A-3.

## Hinweise für die Nacharbeit

- Kein Befund betrifft die Obergrenze von 5.000 Simulationen oder die Fairness (keine verdeckten Karten zur Laufzeit; in `fit-likelihood.js` und den
  Kalibrierskripten werden verdeckte Karten nur in der Studie genutzt, wie dokumentiert).
- A-1 und A-2 ändern das Verhalten der Gegner-KI. Nach einer Korrektur ist die Kalibrierung neu zu prüfen (AGENTS.md: `node tests/long.js calib`), und die
  Vergleichsläufe mit kurzen Stacks (H5, 15/25 BB) sind betroffen.
