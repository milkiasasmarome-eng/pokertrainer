# Prüfbericht A 2.3.0 – Mathematik und Statistik

Prüfstand: `/home/claude/review23/A`, Commit `3cb136d`. Prüfskripte: `/home/claude/review23/A/pruefA/`. Am Arbeitsstand wurde nichts geändert.
`tests/strategy/final23/` habe ich nicht geöffnet (weder `BESCHREIBUNG.md` noch `index.js`), und ich habe keinen Lauf mit `comp: 'f23'` gestartet.
Kennzeichnung: **bestätigt** = mit Skript oder eindeutig am Code nachgewiesen; **Vermutung** = begründet, aber nicht gemessen.

## Kurzergebnis

- `node tests/run.js --quick`: 130 bestanden, 0 fehlgeschlagen (66 s).
- Budget: ≤ 5.000 Simulationen je automatischem Tipp eingehalten (siehe A23-13, dort steht auch die Grenze dieser Aussage).
- Hybridfit, `pLE`, Holm und ECE haben keine eigenen Unit-Tests (`grep` in `tests/run.js`, `tests/unit/`).

| Kennung | Schwere | Kurz |
|---|---|---|
| A23-1 | schwer | Die normierte Mischung der Ranges lässt Tipp und Range-Anzeige „1 Kombinationen“ zeigen (83 % der Postflop-Entscheidungen) |
| A23-2 | mittel | Die z-Statistik von `fitOf` ist kein Anpassungstest: feste Referenz, Abhängigkeit der Paare, Auswahleffekt |
| A23-3 | mittel | Holm mit 5 % einseitig widerspricht α = 2,5 % je Test; Holm kann Nichtunterlegenheit belegen, wo der Einzeltest scheitert |
| A23-4 | mittel | Die Handzahlen im Plan v23 weichen von ABNAHMEKRITERIEN_2.3.md ab (P4, S1, S2, S4) |
| A23-5 | mittel | Der geschichtete Block-Bootstrap ignoriert die Streuung zwischen Seeds; das Intervall gilt nur bedingt auf die Seeds |
| A23-6 | gering | `fC` ist identisch mit dem Produktstand: S4-Vergleiche mit Differenz 0, 30.000 Hände Rechenzeit ohne Nutzen |
| A23-7 | gering | Die Regel für abgebrochene Läufe (dreimal wiederholen, Seed für alle Helden streichen) ist nicht umgesetzt |
| A23-8 | gering | Der Schlüssel von `fitCache` enthält die Aktionen nicht: falsche Paare bei Läufen mit gleichem Seed im selben Prozess |
| A23-9 | gering | ECE ohne Rauschniveau und Intervall; Werte je Straße liegen auf dem Rauschniveau |
| A23-10 | gering | `sizeShrink` ist gültig, aber `sizeShare` ist nicht der „Populationsanteil“; der Cache wird nie geleert |
| A23-11 | gering | Doku und Code passen nicht zusammen (Kriterium d, fehlendes Dokument, `tabBlendBig`, `FIT.rho`); Tests fehlen |
| A23-12 | gering | Randfälle: NaN-Pfad bei k = 0, doppelte Karte zwischen Hand und Board wird angenommen, Range und Reaktion mit verschiedenem Tabellengewicht |
| A23-13 | gering (Auslegung) | Budget eingehalten; die Nachberechnung im Modus „nachher“ kann aber bis zu 2 × 5.000 Simulationen je Entscheidung kosten |
| Hinweis | – | Die Modellwahl folgt der Regel. Die gewählte Variante ist auf Va23 aber belegt schlechter als 2.1.0 (größer als δ) |

---

## A23-1 (schwer, bestätigt): Die normierte Mischung verfälscht die angezeigte Range

**Datei/Zeile:** `assets/js/engine/coach.js` 80–81 (Mischung), 165–168 (`classMatrix`), 415 (`combos`, `width`), 689 (Erklärtext); `assets/js/ui/app.js` 442; `assets/js/ui/views.js` 277.

**Beschreibung:** Bei `wTab < 0.999` wird `w = wTab·w/sT + (1−wTab)·wL/sL` gebildet. Die Summe ist dann 1 statt der Zahl der Restkombinationen. Die Mischung selbst ist mathematisch in Ordnung: eine konvexe Kombination zweier normierter Posteriori, die Gewichte liegen in [0, 1], und Equity, Reaktion und Unsicherheit hängen nur von relativen Gewichten ab. Die Ausgabe aber deutet die absolute Summe als Kombinationszahl:
- `combos = R.total(w)` ergibt „geschätzt 1 Kombinationen“ und eine Breite von 0,08 %.
- `classMatrix` rundet auf drei Stellen. Der Höchstwert liegt bei 0,019, viele Klassen fallen auf 0. Die Matrix ist dann fast leer.

Ohne Mischung (`wTab ≥ 0.999`) bleibt die Range unnormiert. Die Anzeige springt deshalb je nach Datenlage zwischen den Skalen.

**Reproduktion:** `node pruefA/combos.js`. Produktstand: in 83 % der Postflop-Gegnerangaben `combos ≤ 1`, Median 1. Variante B: 1 %, Median 129,9.
`node pruefA/combos-text.js` gibt zum Beispiel aus: „Tara (BB, Call gegen Raise, 14 Hände, unsicher): geschätzt 1 Kombinationen – stark 7 % …“.

**Vorschlag:** Nach der Mischung auf die Masse zurückskalieren, z. B. `w *= wTab·sT + (1−wTab)·sL`. Alternativ nur normierte Größen anzeigen. Test: `combos` mit und ohne Mischung in derselben Größenordnung.

## A23-2 (mittel, bestätigt): Die z-Statistik von `fitOf` misst nicht die Anpassung

**Datei/Zeile:** `coach.js` 94 (`FIT`), 96–122 (`shownPairs`, `pairLL`, `fitOf`), 124–130 (`hybridFit`).

**Beschreibung:**
1. **Feste Referenz statt Modellerwartung.** `z = (m − llRef)/(llSd/√n)` vergleicht die mittlere Log-Likelihood mit einer Konstanten. Was das Modell selbst für die Paare erwartet (−H(p), je Paar verschieden), bleibt außen vor. Ein Gegner, der *exakt* nach der Tabelle handelt, bekommt deshalb je nach Zusammensetzung seiner Paare ein ganz anderes Gewicht:

   | Lage der Paare | n = 30 | mittleres w | w = 0 |
   |---|---|---|---|
   | mittelstarke Hände (0,85–0,95), ohne Einsatz | 30 | 0,26 | 27 % |
   | starke Hände mit Einsatz | 30 | 0,09 | 49 % |
   | gleichverteilt mit Einsatz | 30 | 0,98 | – |

   Ein Spieler, der mit schwachen Händen immer passiv bleibt, erreicht w = 1. An der Gegner-KI selbst ist der Unterschied zu einem Score-Test klein (Mittel −0,14 gegen −0,07). Bei fremden Strategien mit anderer Showdown-Verteilung wirkt er voll.
2. **Vereinfachte Zellen.** `pairLL` setzt immer `fr` bzw. `s3`, `|h` und Draw = 0, auch bei C-Bets (`ag`), anderen Größen und Mehrgegnerpots.
3. **Abhängigkeit.** Im Schnitt stammen 3,2 Paare aus einer Hand (gleiche Stärke über mehrere Aktionen hinweg). Der Design-Effekt liegt bei 1,32–1,38. `llSd` = 0,546 im Code, gemessen sind 0,573–0,584. Unter der Nullhypothese (Gegner-KI E/V) hat z eine Streuung von 1,31 statt 1. Je Tisch fallen 6–8 % der Gegner auf w = 0, nominal wären es P(z ≤ −2) = 2,3 %. Das mittlere w unter der Nullhypothese liegt bei 0,73–0,77. Die Tabelle wird damit auch für genau die Population, an der sie angepasst ist, nie voll genutzt. Zusammen mit `zHi = 0` ist das gewollt, „Belastbarkeit“ ist dafür aber die falsche Bezeichnung.
4. **Auswahleffekt.** Der Kommentar in Zeile 92 („betrifft Referenz und Gegner gleich“) ist nicht begründet. Welche Hände zum Showdown kommen, hängt von der Strategie ab. Bei unbekannten Strategien, also genau dort, wo der Test greifen soll, ist die Auswahl anders als in der Referenz (Vermutung, logisch begründet, nicht gemessen).

**Reproduktion:**
- `node pruefA/fitprobe.js` (modellkonforme synthetische Paare)
- `node pruefA/zcheck.js E 20000 4243` und `node pruefA/zcheck.js V 20000 4243` (Design-Effekt, Streuung von z, Anteil w = 0)
- `node pruefA/zstyle.js E` und `node pruefA/zstyle.js V` (z je Spielstil, Vergleich mit dem Score-Test)

**Vorschlag:** Score-Test je Paar mit der tatsächlichen Zelle: z = Σ(lᵢ − E[lᵢ]) / √(Σ Var[lᵢ]). Die Varianz nach Händen geklumpt schätzen (Summe je Hand). Die Schwellen danach auf Tr23 neu abstimmen. Den Satz zum Auswahleffekt streichen oder belegen.

## A23-3 (mittel, bestätigt): Das Holm-Niveau widerspricht dem Einzeltest

**Datei/Zeile:** `tests/strategy/compare.js` 227–228 (Einzeltest: `lo` = 2,5-%-Quantil), 244–245 (Holm mit `0.05/(m−i)`); `docs/ABNAHMEKRITERIEN_2.3.md` 29–31.

**Beschreibung:**
- Das Dokument nennt für jeden Test „einseitig, α = 2,5 % vor Korrektur“ und für die Familie „Holm, Familienfehler 5 %, einseitig“. Das passt nicht zusammen: 5 % einseitig entspricht dem doppelten α je Test. Der Code nutzt 0,05. Die Holm-Stufen sind damit 0,0125 / 0,0167 / 0,025 / **0,05**. Die letzte Hypothese kann Holm bestehen, obwohl ihr eigener Test bei 2,5 % scheitert (Fall 1 im Skript: p = 0,04, Holm „nicht unterlegen“, Einzeltest „nicht belegt“).
- Holm prüft die Mindestzahl von 20 Blöcken nicht.
- Fehlt ein P-Vergleich (`compare` kehrt ohne Paare zurück), läuft Holm still über m = 3 Hypothesen mit lockereren Stufen (Fall 2 im Skript).
- In Ordnung sind: Richtung (`pLE` = Anteil ≤ −δ), Gleichwertigkeit von `lo > −δ` und `p ≤ 0,025` bei B = 10.000 (Auflösung 10⁻⁴, MC-Fehler bei 0,0125 etwa 0,001), Sortierung und Abbruch der Holm-Schritte.

**Reproduktion:** `node pruefA/holm.js`. Das Skript schneidet die Holm-Zeilen wörtlich aus `compare.js` aus.

**Vorschlag:** Familienniveau 0,025 einseitig (passend zum 95-%-Intervall) oder das Dokument eindeutig korrigieren. Holm nur über vollständige P1–P4 laufen lassen; fehlt ein Test, gilt er als nicht bestanden. Die Mindestblöcke in die Holm-Entscheidung aufnehmen.

## A23-4 (mittel, bestätigt): Die Handzahlen im Plan v23 weichen von den Abnahmekriterien ab

**Datei/Zeile:** `compare.js` 85–97; `ABNAHMEKRITERIEN_2.3.md` 51, 60–63.

| Kennung | Dokument | Plan |
|---|---:|---:|
| P4 | 60.000 | 40.000 (16 Seeds) |
| S1 | 25.000 | 15.000 (nur `i < 6`) |
| S2 | 25.000 | 20.000 (8 Seeds) |
| S4 | je 25.000 | je 15.000 |

P1–P3, S3, S5 und S6 stimmen. Bei S1 („nicht belegt schlechter“, Teil von Freigabekriterium 4) senkt die kleinere Stichprobe die Trennschärfe. Das Kriterium wird dadurch leichter erfüllt.

**Reproduktion:** `node pruefA/plancheck.js`

**Vorschlag:** Den Plan vor dem ersten abschließenden Lauf an das Dokument anpassen oder umgekehrt, mit Datum und Begründung. Nach dem Start nicht mehr ändern.

## A23-5 (mittel; Methode bestätigt, Auswirkung auf P1 Vermutung): Das Intervall gilt nur bedingt auf die gezogenen Seeds

**Datei/Zeile:** `tests/strategy/bootstrap.js` 8–33 (Ziehen nur innerhalb jedes Laufs).

**Beschreibung:** Der geschichtete Block-Bootstrap hält jeden Lauf als Schicht fest. Die Unterschiede zwischen Seeds (Tischbesetzung, bei S3 eine andere Strategie je Seed) gehen nicht in die Streuung ein. Das Intervall bezieht sich damit auf diese Seeds. P1 soll aber auf „neue unabhängige Gegner“ verallgemeinern. An vorhandenen Entwicklungsläufen ist ein Bootstrap über ganze Läufe bzw. ein t-Intervall über Seeds teils deutlich breiter:

| Vergleich | Block-Bootstrap | t über Seeds |
|---|---|---|
| a1V | [17,5; 42,9] | [−11; 71,9] |
| a1final | [−30,9; −5,3] | [−44,8; 9,0] |
| selV Cz−B | [−10,6; 6,3] | [−27,8; 22,7] (Lauf-Bootstrap [−17,8; 7,6]) |

Bei 40 Seeds (P1, P2) fällt der Unterschied vermutlich kleiner aus, das ist aber nicht gemessen.

**Reproduktion:** `node pruefA/clusterboot.js` (nur Entwicklungsläufe aus `tests/results/strategy-runs/`)

**Vorschlag:** Für P1–P4 zusätzlich einen Bootstrap über Läufe als vorab festgelegte Empfindlichkeitsanalyse berichten. Weichen die Urteile voneinander ab, gilt das vorsichtigere.

## A23-6 (gering, bestätigt): `fC` ist identisch mit dem Produktstand

**Datei/Zeile:** `compare.js` 43, 89.

**Beschreibung:** `fC.abl = {hybrid:true}` ist gleich dem Produkt-`ABL`. Der Kommentar „Variante gleich dem Produktstand wird ausgelassen“ trifft auf die Voreinstellung von `SUB` nicht zu. Folgen: S4F-fC und S4K-fC ergeben trivial 0, und 30.000 Hände werden ohne Nutzen gerechnet.

**Reproduktion:** `node pruefA/fc-ident.js` liefert 195 von 195 Entscheidungen identisch.

**Vorschlag:** `fC` aus der Voreinstellung von `SUB` nehmen und im Bericht „C = Produktstand“ vermerken.

## A23-7 (gering, bestätigt am Code): Die Regel für abgebrochene Läufe fehlt

**Datei/Zeile:** `compare.js` 183–191 (`w.on('error')` protokolliert nur), 215–220 (Paarbildung je Vergleich).

**Beschreibung:** Es gibt keine automatische Wiederholung und keinen Zähler. Fällt ein Lauf aus, verschwindet nur das betroffene Paar aus den Vergleichen, die ihn brauchen. Die übrigen Helden mit demselben Seed bleiben in anderen Vergleichen (S4, absolute Werte). Das Dokument verlangt dagegen, den Seed für alle Helden zu streichen.

**Vorschlag:** Fehlschläge je Seed zählen, nach drei Versuchen den Seed in `aggregate` für den ganzen Vergleich ausschließen und das ausweisen.

## A23-8 (gering, bestätigt): Der `fitCache`-Schlüssel enthält die Aktionen nicht

**Datei/Zeile:** `coach.js` 97.

**Beschreibung:** Der Schlüssel ist `hand|ts|cards|board`. Im Harness ist `ts = Handnummer`. Zwei Läufe mit gleichem Seed im selben Prozess haben gleiche Karten, aber andere Aktionen. Beim zweiten Lauf liefert der Cache dann Paare des ersten. Betroffen ist `tests/strategy/fit-hybrid.js` mit mehreren `comp` (gleicher Seed, globale Engine). Ob `llRef`/`llSd` so entstanden sind, ist eine Vermutung. Im Browser (`ts` = Uhrzeit) und in `compare.js` (eigene Engine je Worker) tritt das praktisch nicht auf. Das Wachstum des Caches ist begrenzt (Leerung ab 4.000 Einträgen).

**Reproduktion:** `node pruefA/cachekey.js` ergibt 59 Schlüsselkollisionen mit anderen Aktionen, davon 55 mit falschen Paaren.

**Vorschlag:** `s.actions.join('/')` in den Schlüssel aufnehmen.

## A23-9 (gering, bestätigt): ECE ohne Rauschniveau

**Datei/Zeile:** `tests/strategy/calib-report.js` 26–29, 40–46.

**Beschreibung:** Die Formel ist korrekt (10 gleich breite Klassen, Σ nₖ/N · |Ø est − Ø true|). ECE ist aber nach oben verzerrt, und es fehlt ein Intervall. Auf `ec_V_22` liegt ECE gesamt bei 0,023, das Rauschniveau eines perfekt kalibrierten Schätzers bei 0,018. Je Straße liegt ECE auf dem Rauschniveau (Flop 0,018 gegen 0,021, River 0,071 gegen 0,057). Die Gruppen nach Einsatzgröße mit n = 2–30 haben ECE 0,02–0,64 und sind reines Rauschen. ECE erscheint außerdem nicht in der Konsolenausgabe, nur im JSON.

**Reproduktion:** `node tests/strategy/calib-report.js tests/results/calib-2.2/ec_V_22.json --json pruefA/ece_V22.json`, danach `node pruefA/ece-floor.js pruefA/ece_V22.json tests/results/calib-2.2/ec_V_22.json`

**Vorschlag:** ECE mit Rauschniveau bzw. Cluster-Bootstrap-Intervall berichten (nach Hand geklumpt wie `ciCluster`). Erst ab einer Mindestbesetzung je Klasse bewerten.

## A23-10 (gering, bestätigt): `sizeShrink` und `sizeShare`

**Datei/Zeile:** `assets/js/engine/ranges.js` 475–481, 505.

**Beschreibung:**
- Die Likelihood bleibt gültig: Σ über bs/bl/bo ist unverändert `tb`, x bleibt unverändert, die Anteile summieren sich auf 1 (Abweichung 2·10⁻¹⁶), die Tabellenzeilen auf 1 ± 10⁻⁴. Die Untergrenze 0,02 gilt für alle Kombinationen gleich, sie sind also vergleichbar.
- `sizeShare` gewichtet die Stärkeklassen aber gleich statt nach ihrer Häufigkeit (`LIK.fam[..].hist`). Abweichung bis 0,07, z. B. `1|fr|h` bs 0,571 statt 0,506. Das ist nicht der im Kommentar genannte „Populationsanteil“.
- `shareCache` wird bei `setLikelihoodTable` nicht geleert.

**Reproduktion:** `node pruefA/shrink.js`

**Vorschlag:** Mit `hist` gewichten oder den Kommentar anpassen. Den Cache in `setLikelihoodTable` leeren.

## A23-11 (gering, bestätigt): Doku und Code weichen voneinander ab, Tests fehlen

- `coach.js` 86–93 beschreibt als Kriterium die Konsistenz d (aggressiv − passiv). Der Code entscheidet über die z-Statistik der Log-Likelihood, d wird berechnet, aber nicht verwendet.
- `coach.js` 94 verweist auf `docs/STRATEGIEVARIANTEN_2.3.md`. Die Datei gibt es nicht (auch nicht in der Git-Historie). Woher `llRef = −0,463` und `llSd = 0,546` stammen, ist nicht dokumentiert (gemessen auf E: −0,468…−0,476 und 0,573).
- `ev.js` 296–297: Laut Kommentar haben Overbets s5/s6 ein eigenes Gewicht, „auf V gewählt“. `POP.tabBlendBig` wird aber nirgends gesetzt, das Gewicht ist immer 0,5 (toter Code).
- `coach.js` 78/83 nutzt `FIT.rho` statt `fitParams().rho`. `ABL.fit.rho` würde ignoriert. Derzeit nutzt keine Variante `rho`.
- Es fehlen Unit-Tests für `hybridFit`/`fitOf` (Wertebereich, 0 Paare), `pLE`/Holm und `ece`.

## A23-12 (gering, bestätigt): Randfälle

**Reproduktion:** `node pruefA/robust.js`

- 0 Gegner, fehlendes `opps`, 0 Paare, ungültige Karten, Board kürzer als die Straße und All-in-Texte werden korrekt behandelt: leere Paarliste, w0 = 1.
- **NaN-Pfad:** Mit `ABL.fit.k = 0` und ohne Paare wird w = 0/0 = NaN. Die Range nutzt dann die reine Tabelle (`NaN < 0.999` ist falsch), die Reaktion fällt auf das Modell 2.1 zurück (`a > 0` ist falsch). Das ist inkonsistent, aber nur über Testparameter erreichbar.
- Eine doppelte Karte zwischen Hand und Board (`AhKs` + `Ah…`) erzeugt in `shownPairs` ein Paar. Der Import schützt durch `validShown`, intern wird nicht geprüft.
- Die Range nutzt das Tabellengewicht wTab, die Reaktion `0,5·wTab` (`tabBlend`). Die Konsistenz von Range und Reaktion, die der Kommentar in `ev.js` 267 behauptet, gilt nur teilweise.
- In Ordnung sind: D-6 (a = 0 fällt sauber auf das Modell 2.1 zurück, stetig in a), A-15 (die Zählung der Mehrgegnerzelle stimmt mit `cellAt` überein) und `contW`/`callW`/`raiseW` (auf derselben Skala gemischt, f ist linear konsistent).

## A23-13 (gering, Auslegung): Budget

**Messung:**

| Lauf | maxIters | P95 | max. Zeit |
|---|---:|---:|---:|
| `node pruefA/budget.js 200 p23:Tr` | 3.212 | 2.400 | 806 ms |
| `PT_COACH_FULL=1 node pruefA/budget.js 300 p23:Tr` | 3.984 | – | – |
| `node pruefA/budget.js 400 bots` | 5.000 | 2.761 | – |

Kein Tipp lag über 5.000, `maxSim` war immer 5.000. Die Berechnung von `hybridFit` (Perzentile durch Aufzählung) läuft nicht über das Simulationsbudget.

**Grenze (bestätigt am Code):** `assets/js/ui/app.js` 676–683. Wählt der Spieler eine Größe außerhalb der Kandidaten, startet `gradeDecision` eine zweite Analyse mit `live: true`. Für diese eine Entscheidung können dann bis zu 2 × 5.000 Simulationen anfallen. Das Problem besteht seit vor 2.3 und hängt nicht am hybriden Modell. Ob „je automatischem Tipp“ auch das Urteil im Modus „nachher“ meint, ist eine Auslegungsfrage.

**Vorschlag:** Das Restbudget der ersten Analyse an die Nachberechnung übergeben (`maxSim = 5000 − a.iters`) oder die Auslegung festhalten.

## Hinweis (kein Fehler): Modellwahl

Die Regel aus ABNAHMEKRITERIEN_2.3.md ist korrekt angewendet (`tests/results/strategy-sel23.json`):
- A hat die höchste untere Grenze auf Va23 ([0; 0,31]), ist aber auf V belegt schlechter als B (−30,9 [−43,6; −18,3]).
- Danach kommt C/Cz. Cz gegen B auf V: −2,5 [−10,5; 5,9], nicht belegt schlechter.

Die gewählte Variante ist auf Va23 (unbekannte Strategien, Stellvertreter für P1) aber **belegt schlechter als 2.1.0**: Cz −9,2 [−17,9; −0,9], C −10,8 [−20,9; −1,2]. Der Punktschätzer liegt damit jenseits von δ = 5. Ein positiver Ausgang von P1 ist nach den Validierungsdaten nicht zu erwarten. Das ist keine Aussage über F23.
