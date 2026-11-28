# Prüfung B 2.2 – Strategie, Einsatzgrößen, Gegner-KI

Grundlage: Kopie `/home/claude/review22/B/repo` (Zweig entwicklung-2.2, Commit 72d085f), Vergleich mit 2.1.0 (`/home/claude/wt-v210`).
Alle Skripte unter `/home/claude/review22/B/skripte/`, Rohdaten unter `/home/claude/review22/B/daten/`. Im Repository wurde nichts geändert.
Beide Versionen laufen über `tests/strategy/engine-vm.js` in getrennten Kontexten (feste Uhr, deterministisch). Hilfen: `skripte/lib.js`.

Wichtigstes Prüfwerkzeug: `skripte/b07-truth.js` – „Wahrheit“ eines Spots gegen einen echten Gegner der Gegner-KI 2.2 (nur Studie, verdeckte
Karten erlaubt): Statistik des Gegners aus einer Session, Verwerfungsstichprobe seiner Karten bei gleicher öffentlicher Linie, tatsächliche
Antwort auf jede Kandidatengröße und tatsächliche Equity des Helden; daneben die Vorhersage von Coach 2.2 und 2.1.0 für dieselbe Sicht.

## Übersicht

| Befund | Schwere | Kurz |
|---|---|---|
| B-1 | mittel | River-Leads: Overbet-Leads werden als zu bluff-lastig gelesen (Regression gegenüber 2.1), Raise gegen Leads mit Bluffcatchern erscheint +EV |
| B-2 | mittel | Leads („vor dem Aggressor“) ohne Gegneranpassung: Equity-Bias je Stil bis +0,14 (lp, Nit) bzw. −0,10 (vl); besteht seit 2.1 |
| B-3 | mittel | Preflop-Range: Linien „call“/„open“ mit 6–25 BB werden als Push/Fold gelesen, auch ohne All-in (Iso-Raise über Limper, Spots mit späterer 3-Bet); fehlender Tabellenschlüssel → Top-11-%-Range mit AA voll |
| B-4 | gering | Untergrenze 0,02 der Tabellen-Likelihood verwässert seltene Aktionen (River-Raise, Leads) |
| B-5 | gering | ≤ 15 BB: „Push-or-Fold-Chart“, aber Empfehlung Min-Raise; Open-EV hängt nicht vom Stack ab (seit 2.1, gegen die Gegner-KI ohne messbaren Schaden) |
| B-6 | gering | Fold gegen River-Overbets um ≈ 0,15–0,2 unterschätzt (konservativ, verschenkt EV) |
| B-7 | gering | Gegner-KI-Eigenheiten: River-Overbet-Bluff ohne Mehrspielerfaktor, „Check-Raise-Bluff“ auch als Raise in Position, „größenunempfindliche“ Stations folden gegen kleine Einsätze häufiger |
| B-8 | gering | Push/Fold-Lösung: einzelne Klassen nicht monoton im Stack; AP4-Test misst Breiten nach Klassen statt Kombos |
| B-9 | gering | Gleichgewichtsnaher Modus nutzt jetzt die Populationstabelle der Gegner-KI für Ranges (dokumentiert, aber Bezeichnung) |

Keine schweren Befunde. Fairness ohne Befund (Abschnitt „Geprüft und korrekt“).

---

## B-1 (mittel) – River-Leads: Overbet-Leads zu bluff-lastig, Raise gegen Leads überschätzt

**Dateien:** `assets/js/engine/ranges.js` Z. 384 (Tabelle `LIK`, Zellen `3|va|h`, Ergebnis `bo`), Z. 406 (`familyTarget`: `k === 'va'` → `r = 1`),
`assets/js/engine/ranges.js` Z. 465–477 (Tabellenpfad `narrowPostflop`), `assets/js/engine/bots.js` Z. 294 (Eigenheit `rare`).

**Beschreibung.** In der Zelle „River, vor dem Aggressor, Heads-up“ (`3|va|h`) liegt P(Bet > 1,1 Pot | Luft, Klasse 0–2) bei 0,011–0,015, bei den
stärksten Klassen 7–9 bei 0,04–0,11 (Verhältnis nur ≈ 3–7; bei ¾-Pot-Leads 0,025–0,042 gegen 0,17–0,21). Ein Teil dieser „Luft-Overbets“ stammt aus der
neuen Eigenheit `rare` (River-Overbet-Bluff mit Luft, 3–6 % je Entscheidung), die in der Anpassungsgruppe E bei 10 von 52 Gegnern (19 %), in V bei 5/26,
in T nur bei 1/22 vorkommt (`node -e` in Abschnitt „Reproduktion“). Folge: Gegen die 85 % der Gegner ohne diese Eigenheit liest der Coach Overbet-Leads als
zu schwach; die geschätzte Equity steigt in 2.2 mit der Lead-Größe (TAG-Gegner: 450 → 0,36; 650 → 0,55; 1.200 → 0,63), in 2.1 war sie größenunabhängig.
Dazu bewertet 2.2 einen Raise gegen den Lead mit einem Bluffcatcher als +EV (oft zweitbeste Aktion), weil die zu bluff-lastige Range auch hohe
Fold-Raten gegen den Raise ergibt.

**Belege.**
- Kalibrierung aller River-/Turn-Leads, Gegner-KI gegen Gegner-KI (`tests/strategy/range-calib.js … lead`, je 40.000 Hände, Auswertung `skripte/b09-leadreport.js`):

  | Gruppe | Lead | n | wahre Equity | Bias 2.2 | Bias 2.1.0 |
  |---|---|---:|---:|---:|---:|
  | T | alle Leads | 864 | 0,357 | +0,027 | +0,010 |
  | T | Lead > 1,1 Pot | 61 | 0,293 | **+0,128** | +0,024 |
  | T | River-Lead > 1,1 Pot | 38 | 0,263 | **+0,144** | +0,068 |
  | V | Lead > 1,1 Pot | 75 | 0,384 | **+0,058** | −0,025 |
  | V | alle Leads | 886 | 0,361 | +0,019 | +0,001 |

- Einzelspot gegen echten Gegner (`b07-truth.js`, TAG g006, BTN gegen BB, Board Ks9d4h2sJd, Held Kc5c, Linie: Flop-C-Bet ⅓ gecallt, Turn Check-Check,
  River-Lead 6,50 in 8,60):

  | | Equity | Call | Raise 2,5× |
  |---|---:|---:|---:|
  | Coach 2.2 | 0,545 | +5,55 BB | +2,74 BB (Fold 0,46) |
  | Coach 2.1.0 | 0,530 | +5,21 BB | +2,47 BB (Fold 0,34) |
  | Wahrheit (n = 74) | **0,041** | **−5,60 BB** | **−15,0 BB (Fold 0,04)** |

  LAG g049, Lead 7,00: Coach 2.2 Equity 0,49, Raise 2,5× +0,45; Wahrheit Equity 0,20, Raise −10,7 (Fold 0,20). Lp g009, Lead 5,50: Coach 2.2 0,48,
  Raise +1,43; Wahrheit 0,26, Raise −6,4. 2.1 bewertete den Raise in diesen Spots negativ.

**Reproduktion.**
```
cd /home/claude/review22/B/repo
node tests/strategy/range-calib.js 902 40000 T /home/claude/review22/B/daten/rc_lead_T_repo.json /home/claude/review22/B/repo '' lead
node tests/strategy/range-calib.js 902 40000 T /home/claude/review22/B/daten/rc_lead_T_v21.json /home/claude/wt-v210 '' lead
node /home/claude/review22/B/skripte/b09-leadreport.js /home/claude/review22/B/daten/rc_lead_T_repo.json /home/claude/review22/B/daten/rc_lead_T_v21.json
cd /home/claude/review22/B/skripte
node b07-truth.js tag lead Kc5c Ks9d4h2sJd 25000 1000      # ebenso lag, lp
node b08-leadcell.js                                       # Tabellenzellen 3|va|h
```
**Erwartet:** Overbet-Leads der Gegner-KI sind überwiegend Value (Donk-Zweig in `bots.js` Z. 286: stark × (0,35 + donk), sonst × 2·donk);
die Equity sollte mit der Lead-Größe nicht steigen, ein Raise mit einem Bluffcatcher nicht +EV erscheinen. **Tatsächlich:** siehe Tabellen.

**Vorschlag.** (a) Die Eigenheit `rare` in der Tabelle getrennt halten oder ihre Overbets in der Anpassung herausrechnen (sie ist am Tisch nicht
beobachtbar und gehört nicht in die Populationszelle aller Gegner); E/V/T nach Eigenheiten schichten (`groups.js`). (b) Für `va`-Zellen eine
gegnerbezogene Anpassung über einen eigenen Lead-Zähler (Später-Liste, Datenformat) oder wenigstens eine skeptische Schrumpfung der Luft-Anteile
bei Overbets. (c) Regressionstest: TAG-Spot oben, Equity nach Overbet-Lead nicht größer als nach ¾-Lead; Raise gegen Lead mit Top Pair schwachem Kicker nicht > Call.

## B-2 (mittel) – Leads ohne Gegneranpassung: Bias je Stil (besteht seit 2.1, durch 2.2 nicht behoben)

**Datei:** `assets/js/engine/ranges.js` Z. 406 (`else if (k === 'va') r = 1;`), dokumentiert in `docs/RIVER_EQUITY.md` Abschnitt 2.

**Beschreibung.** Für Leads bleibt die Populationstabelle unverändert. Die Gegner-KI leadet aber stark stilabhängig (`P.donk` 0,03 bei Nit/TAG
bis 0,15 bei vl, dazu `bluff`). Ergebnis gegen River-Leads (Kalibrierung wie B-1, Gruppe T): lp Bias +0,101 (n = 101, ≤ 0,6 Pot), vl −0,102 (n = 59,
≤ 1,1 Pot); alle Straßen: lp +0,123 (n = 222), Nit +0,139 (n = 28), vl −0,054 (n = 207). Gruppe V: lp +0,107, Nit +0,107, vl −0,075. Gegen Nit/lp
callt der Coach Leads also mit deutlich zu hoher Equity, gegen vl foldet er zu oft. Die Werte von 2.1.0 sind ähnlich (lp +0,102, Nit +0,147, vl −0,076):
keine Regression, aber der angekündigte Nutzen der dynamischen Range (AP1) greift bei Leads nicht.

**Reproduktion:** wie B-1 (`b09-leadreport.js`, Zeilen „Stil“). **Vorschlag:** Lead-Frequenz je Gegner zählen (Bet als Nicht-Aggressor vor dem
Aggressor; Gelegenheiten = Entscheidungen in dieser Lage) und wie bei den anderen Familien über `famTransform` anpassen; bis dahin für `va` wenigstens
`rFirst` mit halbem Gewicht verwenden und auf V prüfen.

## B-3 (mittel) – Preflop-Range: Push/Fold-Charts für Linien, die gar keine Jams sind

**Datei:** `assets/js/engine/ranges.js` Z. 213–225 (`preflopRange`, Fälle `open` und `call`), `assets/js/engine/coach.js` Z. 36–49 (`lineOf`:
`sizeBB = lastTo / bb` ist die **letzte** Raise-Höhe der Hand, nicht die des Spielers, und nie mit dem Stack verglichen).

**Beschreibung.** 2.2 nimmt für `open` und `call` mit 6 ≤ sizeBB ≤ 25 die Jam- bzw. Call-gegen-Jam-Range des Push/Fold-Modellspiels. Geprüft wird
weder, ob die Aktion ein All-in war (`a.ai`), noch der effektive Stack. Betroffen:
1. **Iso-Raise über Limper** (Kandidaten des Coaches `[2; 2,5; 3] BB + 1 BB je Limper` erreichen 6 BB bei 3 Limpern; die Gegner-KI iso-raist auf
   3,5 BB + Limper bzw. aus den Blinds 4,5 BB + Limper): Der Limp-Caller bekommt die Call-gegen-Jam-Range. Der Schlüssel `Held-Position>Limper-Position`
   (z. B. `BTN>UTG`) existiert in der Tabelle nicht (nur spätere Positionen als Caller), daher fällt `chart('callPush')` auf die alte Formel mit
   `vsWidth = 0,2` zurück: oberste 11 % aller Hände, **AA mit Gewicht 1,0** (2.1: Call-Range mit Deckel, AA 0,25).
2. **Spots mit späterer 3-Bet:** UTG öffnet 2,5, CO 3-bettet auf 8, Held BTN: UTGs Range wird als 8-BB-Jam-Range geschätzt; ebenso der Caller
   eines Opens, wenn danach 3-gebettet wird (`call` mit sizeBB 11).
3. **Held öffnet tief groß** (z. B. 10 BB mit 100 BB): BB-Caller als Call-gegen-Jam-Range.

**Belege** (`skripte/b03-linesize.js`, `skripte/b15-isocall.js`):

| Spot | 2.2 | 2.1.0 |
|---|---|---|
| 3 Limper, Iso 6 BB, UTG callt: Anteil AA/KK/QQ/AK der Caller-Range | **23,3 %** | 7,5 % |
| gleiche Linie, Iso 4 BB (Kontrolle, sizeBB < 6) | 6,2 % | 6,2 % |
| Flop 7h4c2d, Held AsKd, Equity | 0,633 | 0,742 |
| HJ öffnet, CO callt, BTN 3-Bet 11: CO-Range, mittlere Top-Position | 0,045 (AA 1,0) | 0,084 (AA 0,25) |

Die Unstetigkeit zwischen 5,5 und 6 BB ist ein klares Zeichen: Dieselbe Linie wird ab 6 BB plötzlich als Premium-lastig gelesen.

**Reproduktion:** `cd /home/claude/review22/B/skripte && node b03-linesize.js && node b15-isocall.js`.
**Erwartet:** Push/Fold-Ranges nur, wenn die Aktion des Openers ein All-in war bzw. der Call gegen ein All-in erfolgte (oder der effektive Stack
≤ 25 BB ist), mit dem Stack als `bb`; sonst die bisherigen Formeln. **Vorschlag:** In `lineOf` die eigene Raise-Höhe des Spielers (`a.a` seiner
Aktion) und `a.ai` bzw. den effektiven Stack mitgeben; `preflopRange` nur dann auf `push`/`callPush`, sonst Formel 2.1. Fehlt ein Schlüssel
`jammer>pos`, nicht still auf die Altformel mit `vsWidth = 0,2` fallen. Regressionstest: Iso 6 BB über 3 Limper – Caller-Range wie bei 5,5 BB.

## B-4 (gering) – Untergrenze 0,02 der Tabellen-Likelihood

**Datei:** `assets/js/engine/ranges.js` Z. 475 (`w[k2] *= Math.max(0.02, …)`).
**Beschreibung.** Für seltene Aktionen (River-Raise: P ≈ 0,000–0,015 für Klassen 0–5, Tabelle `3|s3|h`; Leads) hebt die Untergrenze 0,02 schwache
Kombinationen auf das 1,5- bis 10-Fache ihrer Daten-Likelihood. Versuch in einer Kopie (`/home/claude/review22/B/exp`, nur Untergrenze 0,002), Gruppe T,
6.000 Hände, 11.535 Heads-up-Spots (`b10-allreport.js`):

| Zelle | Bias Untergrenze 0,02 | Bias 0,002 |
|---|---:|---:|
| River gegen Raise (n = 37) | +0,149 | +0,127 |
| Flop gegen Raise (n = 88) | +0,068 | +0,029 |
| Flop-Lead ≤ 0,6 (n = 46) | +0,072 | +0,012 |
| River gegen Bet, Gegner lp (n = 102) | +0,051 | +0,008 |
| River-Lead ≤ 0,6 (n = 32) | −0,029 | −0,084 (schlechter) |
| mittlerer Absolutfehler gesamt | 0,220 | 0,219 |

**Vorschlag:** Untergrenze relativ zur Zelle (z. B. 0,1 × kleinste beobachtete Rate oder Dirichlet-Glättung der Zelle statt fester Untergrenze),
auf V wählen. Auch mit 0,002 bleibt der River-Raise-Bias hoch (+0,13; 2.1: +0,20): Der Coach überschätzt gegen River-Raises weiterhin seine Equity.
**Reproduktion:** `node tests/strategy/range-calib.js 903 6000 T <aus.json> /home/claude/review22/B/exp` und dasselbe mit `…/repo`, dann `b10-allreport.js`.

## B-5 (gering) – Short Stack ≤ 15 BB: Push/Fold-Chart angezeigt, Min-Raise empfohlen; Open-EV unabhängig vom Stack

**Dateien:** `assets/js/engine/coach.js` Z. 364 (`heroChart`: ≤ 15 BB `chart('push')`), Z. 374–376 (`chartWeight`: jede Raise-Größe zählt als
„aggr“ mit `hc.raise`), `assets/js/engine/ev.js` Z. 486–495 (`evRaised`) und Preflop-Zweig von `respond` (keine Stackabhängigkeit).

**Beschreibung.** Bei 10 BB ungeöffnet zeigt der Coach „Push-or-Fold-Chart (10 BB effektiv)“, empfiehlt aber z. B. mit 88 aus UTG „Open 2 BB“
(+0,526 BB) vor All-in (+0,313), mit AA aus CO „Open 3 BB“. Das Open-Modell ist vom Stack unabhängig: Open 2 BB mit 88 UTG hat bei 8, 10, 15, 20, 40 und
100 BB exakt denselben EV (+0,526), dieselbe Fold-Rate 0,441, Raise-Wahrscheinlichkeit 0,132 und `evRaised = −2 BB` (Held gibt gegen jede 3-Bet
auf – bei 8 BB mit 88 offensichtlich falsch). Die Gegner-KI spielt gegen ein Open bei ≤ 18 BB nur Jam oder Fold (`bots.js` Z. 134–146).
Gegen die Gegner-KI ist der Schaden nicht messbar (`b13-pf-truth.js`, 3.000 Versuche je Größe, 88 UTG 10 BB: Open 2 BB +0,70 ± 0,13, All-in
+0,55 ± 0,13). Unverändert seit 2.1.0 (identische Werte), aber widersprüchlich zur in 2.2 eingeführten Push/Fold-Lösung.
Weitere Beobachtungen (unverändert seit 2.1): Gegen ein 2,2-BB-Open bei 10 BB flat-callt der Coach AT, QJs, 55, 22 (`b01-shortstack.js vsopen`);
bei 20–25 BB 3-Bet auf 6,2 bzw. 7,9 BB mit 76s/T8s (31 % des Stacks, knapp unter der Commitment-Grenze ⅓).
Geprüft und plausibel: Jam/Fold ungeöffnet und Call/Fold gegen Jams bei 10/15/20/25/40 BB (keine Folds mit Premiumhänden, keine Calls mit Müll;
gegen UTG-Jam 20 BB foldet 2.2 AQs und 88 – im Gleichgewicht des Modellspiels vertretbar, UTG-Jam-Range ≈ 7 %).

**Reproduktion:** `node b12-pf10.js`, `node b01-shortstack.js unopened|vsjam|vsopen`, `node b13-pf-truth.js UTG 8s8h 10 3000`.
**Vorschlag:** Bei ≤ 15 BB entweder nur All-in als chartkonform werten (`chartWeight` für Nicht-All-in-Raises 0) oder den Chart-Text ändern;
`respond`/`evRaised` preflop mit Stacktiefe (Jam-Antwort, Held callt mit Pot Odds).

## B-6 (gering) – Folds gegen River-Overbets unterschätzt

**Datei:** `assets/js/engine/ev.js` Z. 295–311 (Mischung `POP.tabBlend = 0,5`), Tabelle Klasse `s5/s6`.
**Beschreibung.** Coach-2.2-Einsätze in 1.800 Händen (6 Seeds, `b05-calib.js`, Auswertung `b05-merge.js`): River Heads-up > 1,15 Pot vorhergesagt
0,687, beobachtet **0,880** ± 0,065 (n = 25); Turn > 1,15 Pot 0,571 gegen 0,667 (n = 30). Einzelspots mit echten Gegnern (`b07-truth.js`, Linie xx):
lp 0,72 gegen 0,94; vl 0,75 gegen 0,88; Nit (Linie bcx) 0,74 gegen 0,89. Folge: Mit zweitem Paar am River nach Check-Check empfiehlt 2.2 Check
(Nit: Coach Check +4,67, Overbet +3,54; Wahrheit Check +3,11, Overbet **+7,18**; TAG ebenso: Wahrheit Overbet +6,83 gegen Check +3,09). Konservativ, keine
absurde Empfehlung, aber Verlust an EV gegen genau die Gegner, für die die Tabelle angepasst ist.
**Vorschlag:** `tabBlend` je Größe (Overbets stärker zur Tabelle) auf V wählen; River-Kalibrierung je Größenklasse in den Bericht aufnehmen.

## B-7 (gering) – Eigenheiten der Gegner-KI

**Datei:** `assets/js/engine/bots.js` Z. 47–54, 254–258, 294, 309–310, 333.
- `rare` (River-Overbet-Bluff, Z. 294) wirkt vor allen anderen Regeln und **ohne Mehrspielerfaktor** `mw`: Ein Gegner mit Luft overbettet am River auch im
  Vier-Spieler-Pot und als Nicht-Aggressor mit 3–6 %. Nicht ungültig, aber eine Linie, die in Mehrspielerpots absurd ist; sie verzerrt zudem die
  Populationstabelle (B-1).
- „Check-Raise-Bluff am Turn“ (Z. 333) prüft nicht `hsI.iCheckedThis`; die Zusatzrate gilt auch für Raises in Position gegen eine Bet.
- `sizeSens = 0,45` („Calling Stations kaum größenabhängig“, Z. 50/309): Die Skalierung um f = 0,66 hebt die Call-Schwelle gegen kleine Einsätze
  (¼ Pot: t0 0,620 → 0,665), solche Gegner folden gegen kleine C-Bets also **häufiger** als ohne Eigenheit. Gemessen (`b11-calib-stile.js`, 12.000 Hände):
  lp/vl mit 0,45: Fold gegen C-Bet 47,9 % / 57,1 % gegenüber 44,0 % / 55,3 % ohne Eigenheit.
- Geprüft und korrekt: 12.000 Hände ohne Fehler, ohne abgelehnte Aktion, ohne Rückfall; alle Stile in den Zielbereichen von `tests/long.js calib`
  (VPIP, PFR, 3-Bet, AF, WTSD) – auch getrennt für Gegner mit `rare`, `sizeSens`, `shift` und ohne Eigenheit. Die Phasen (`shift`) hängen nur von der
  öffentlichen Handnummer ab.
**Vorschlag:** `rare` mit `mw` multiplizieren und nur als Aggressor/IP zulassen; `iCheckedThis` für den Check-Raise-Zusatz; `sizeSens` um eine
kleine Größe (z. B. f = 0,33) zentrieren, wenn „Station“ gemeint ist.

## B-8 (gering) – Push/Fold-Lösung: Einzelklassen nicht monoton, Test misst Breite nach Klassen

**Dateien:** `assets/js/engine/ranges.js` Z. 101 (`PF`), `tests/unit/strategie-22.js` AP4 (`PT.hands.CLS_W` existiert nicht → jede Klasse Gewicht 1).
**Beschreibung.** Die Breiten nach Kombos stimmen mit dem bekannten Heads-up-Gleichgewicht überein (SB-Jam 10 BB 58,0 %, BB-Call 37,3 %; 15 BB
46,0 %/27,5 %; 20 BB 39,9 %/20,6 %) – korrekt. Einzelne Klassen springen aber gegen den Stack: UTG A5s 0 bei 20 BB, 0,56 bei 25 BB; UTG QJs 0,78 bei
20 BB, 0 bei 25 BB; UTG 25 BB: 88 0,33 < A5s 0,56 (`b02-pfchart.js`). Bei Exploitability ≤ 0,0042 BB/Hand kosten diese Indifferenz-Artefakte kaum EV,
wirken als angezeigte Chart-Empfehlung (Push-Chart bei ≤ 15 BB) aber unplausibel. Der AP4-Test prüft Breiten ungewichtet nach 169 Klassen.
**Vorschlag:** Für die Anzeige glätten (Mischung benachbarter Stacks oder Monotonie-Projektion in Handstärke), Test mit Kombogewichten
(`PT.hands.classCombos`).

## B-9 (gering) – Gleichgewichtsnaher Modus: Ranges aus der Populationstabelle der Gegner-KI

**Datei:** `assets/js/engine/ranges.js` Z. 454 (`useTable` unabhängig vom Modus), `coach.js` `buildRange` (gto: `sm = smooth(null)`).
**Beschreibung.** Seit 2.2 grenzt auch „gleichgewichtsnah“ die Ranges mit der an der Gegner-KI angepassten Tabelle ein (in `docs/GLEICHGEWICHT_2.2.md`
erwähnt). Die Reaktion bleibt MDF ohne Gegnerwerte (geprüft: Basis „MDF“, reiner Bluff exakt EV 0). Die Ranges sind damit populationsangepasst, nicht
ausgewogen; das ist eine inhaltliche Änderung des Modus. In 326 Postflop-Spots (3 Seeds, `MODE=gto node b04-sim.js <Seed> 300`) empfiehlt 2.2 häufiger
Check (155 gegen 134) und Fold (24 gegen 18), seltener Call (10 gegen 15). Beispiel TV1 (`b06-spots.js TV1`): River zweites Paar, Equity 0,57 (2.2) gegen
0,92 (2.1), Empfehlung Check statt Overbet. Plausibel (die 2.1-Range war nachweislich zu schwach, siehe „Geprüft“), aber der Name verspricht etwas
anderes. **Vorschlag:** im Modustext nennen („Ranges: Populationsmodell der Computergegner, Reaktion: MDF“) oder im gleichgewichtsnahen Modus die
Faustregel-Likelihood (`legacy`) bzw. eine symmetrische Tabelle verwenden.

---

## Geprüft und als korrekt bzw. plausibel befunden

**Range-Schätzung (AP1)**
- Gesamtkalibrierung, Gruppe T, 6.000 Hände, 11.535 Heads-up-Spots (`range-calib.js 903 6000 T`, `b10-allreport.js`): mittlerer Absolutfehler 0,220
  (2.1: 0,230). Gegen Bets am River ≤ 1,1 Pot Bias +0,004 (2.1: −0,182), am Turn +0,008 (2.1: −0,101), Flop −0,003 (2.1: −0,072). Gepaarte und monotone
  Boards: Bias −0,011 bis +0,031 (2.1: −0,072 bis −0,007). Gegen Bets am River je Stil |Bias| ≤ 0,051 (2.1 bis 0,163). F4 ist damit bestätigt behoben.
- Check-Raise am Flop gegen echte Gegner (`b07-truth.js <stil> cr AhJd Js7c2d8h3s`): Equity 2.2 / Wahrheit / 2.1: TAG 0,629 / 0,569 / 0,737; LAG 0,714 /
  0,696 / 0,781; Nit 0,462 / 0,482 / 0,552.
- River nach Check-Check mit zweitem Paar (`b07-truth.js nit|tag xx Ts9s Kd9h4c2s7d`): 2.2 0,51/0,55, Wahrheit 0,34, 2.1 0,83/0,91.
- Extreme Gegnerwerte (erfundene Profile Station/Nit/Maniac, `b06-spots.js`): keine numerischen Ausreißer; `famTransform` trifft die Zielhäufigkeit
  (λ bzw. γ ∈ [1; 8], Begrenzungen 0,005/0,985), Range-Breiten plausibel (Station nach Check-Check 28 %, Nit 2 %).

**Reaktionsmodell und Größenwahl (AP2)**
- Vorhergesagte gegen beobachtete Fold-Rate an den tatsächlich empfohlenen Einsätzen (Coach 2.2 als Held, 1.800 Hände, 421 Einsätze, `b05-calib.js`,
  `b05-merge.js`): Flop HU ⅓ 0,346/0,300 (n = 70), ½ 0,425/0,460 (50), Pot 0,555/0,649 (57); River ⅓ 0,341/0,379 (29); Flop-Raise HU 0,393/0,375 (24).
  Keine systematische Überschätzung; Ausnahme Overbets (B-6, konservativ).
- Deutlich mehr Flop-Raises gegen Einsätze (2.2: 30 + 6 von 80 Spots, 2.1: 4 + 5; Folds 22 gegen 45, `b04-sim.js`, 6 Seeds) – **gerechtfertigt**: Gegen
  die C-Bet eines TAG mit A-hoch (`HPOS=BB TPOS=BTN b07-truth.js tag cbf Ah8c Qd7c3h9s2d`) foldet der echte Gegner gegen Raise 2,5× zu 0,65 (Coach: 0,41),
  wahre Equity 0,45 (Coach 0,33); der Coach ist hier eher zu vorsichtig.
- Verteilung der Größen ohne offenen Einsatz (643 gemeinsame Spots, gleiche Sicht und Datenbank, 2.2 / 2.1): Flop Check 68/90, ⅓ 68/45, ½ 34/19, ¾ 29/37,
  Pot 49/57; Turn Overbet 32/26, Check 73/72; River Overbet 18/7, ¾ 8/16, ⅓ 8/14, Check 31/32. Mehr kleine Flop-Bets und mehr River-Overbets – beides durch
  die beobachteten Reaktionen gedeckt (B-6: Overbet-Folds sogar unterschätzt). 392 von 643 Empfehlungen identisch.
- Mehrspieler-Bluffs: Luft gegen 3 Gegner (7c2d auf Qh9s4c) und gegen 2 Stations → Check (beide Modi, beide Versionen). Geänderter Test Ks8c auf 6s4c3s:
  Ohne Gegnerwerte bettet 2.2 ½ Pot (vorhergesagt alle folden 0,28). Mit echten Gegnern (lp, lp, TAG, `b14-mw-truth.js Ks8c 6s4c3s lp lp tag`) und deren
  Statistik empfiehlt 2.2 Check, sagt für ½ Pot 0,19 voraus; wahr sind 0,31 (Pot 0,49) – die Teständerung ist vertretbar.
- Keine Folds mit hoher geschätzter Equity in 969 Postflop-Entscheidungen (exploitativ und gleichgewichtsnah); Nuts gegen River-Raise → All-in,
  Set gegen Turn-Jam → Call. Overbets nur Turn/River heads-up (Kandidatenregel), All-in-Bets ≤ 2,5 Pot.
- `respond`: Mischung Tabelle/2.1-Modell im selben Maßstab (Ranges je Kombination mit Rohgewicht `w`), Flag `POP.tabOff` im `finally` zurückgesetzt,
  Rückfall auf 2.1-Modell bei fehlenden Zellen (`miss > 0`).

**Short Stack (AP4):** Push/Fold-Breiten entsprechen dem Heads-up-Gleichgewicht (B-8); Gegner-Jam-Ranges aus dem Modellspiel (12-BB-Jam BTN 29,7 %
statt 46 % in 2.1) plausibel; keine Folds mit Premiumhänden, kein Call gegen Jam mit Müll bei 10–40 BB (`b01-shortstack.js`).

**Gegner-KI (AP5):** siehe B-7 (keine ungültigen Aktionen, Stilziele eingehalten, Formel für `sizeSens = 1` identisch zu 2.1:
0,2·(min(f;1,6) − 0,66) + 0,132 = 0,2·min(f;1,6)).

**Gleichgewichtsnah (AP3):** Reaktion weiter MDF (Basis „MDF“, reiner Bluff exakt EV 0), Unterschiede nur über Ranges (B-9).

**Fairness**
- `coach.js`, `ev.js`, `ranges.js`, `cfr.js`, `equity.js` greifen nie auf `styleOf`/`paramsOf`, fremde `cards` oder zukünftige Aktionen zu
  (`grep`); `coach.analyze` liest nur `input.view` (= `publicView`), `input.opps` (Datenbank-Kopie, `snapshotOpps` in `app.js` Z. 577), `settings`,
  `seed`, `extra`, `learner`, `live`, `maxSim`, `skipModel`. Der Worker reicht nur diese Eingabe weiter.
- Neu in `publicView`: `no` (Handnummer, öffentlich). Neu im Coach: Aktionszähler `agg` (in `stats.js` Z. 74 nur aus öffentlichen Postflop-Aktionen).
- Die Tabellen `LIK` und `PF` entstehen in Studien mit verdeckten Karten (`fit-likelihood.js`, `solve-pushfold.js`) und werden eingebettet;
  zur Laufzeit gehen nur öffentliche Aktionen ein. Hinweis: Die Tabelle beschreibt die Gegner-KI anhand ihrer verdeckten Karten (Gruppe E, 52 % des
  Pools) – zulässig, aber eine Messung gegen E ist in-sample; B-1 zeigt, wie Gruppenunterschiede durchschlagen.

## Skripte
`lib.js` (Laden beider Versionen, Spots), `b01-shortstack.js`, `b02-pfchart.js`, `b03-linesize.js`, `b04-sim.js` (Session, beide Coaches, `MODE=gto`),
`b05-calib.js`/`b05-merge.js` (Fold-Kalibrierung), `b06-spots.js` (Spot-Batterie), `b07-truth.js` (Wahrheit gegen echten Gegner; `HPOS`/`TPOS`),
`b08-leadcell.js`, `b09-leadreport.js`, `b10-allreport.js`, `b11-calib-stile.js`, `b12-pf10.js`, `b13-pf-truth.js`, `b14-mw-truth.js`, `b15-isocall.js`.
Versuchskopie mit Untergrenze 0,002: `/home/claude/review22/B/exp/assets` (nur `ranges.js` Z. 475 geändert).
