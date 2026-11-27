# Folgeaudit 2.2 (Abschnitt 2 des Auftrags)

Stand 27.11.2026. Grundlage: Repository-Stand 2.1.0 (Zweig `sicherung-2.1.0`, unverändert gesichert), Rohdaten `tests/results/strategy.json` und
`tests/results/strategy-runs/`. Zahlen dieses Dokuments erzeugt `node tools/folgeaudit-2.1.js` (Ausgabe `docs/audit-2.2/folgeaudit-daten.json`).
Die Prüfaufträge wurden als Hypothesen behandelt; bestätigt ist nur, was die Rohdaten zeigen.

## 2.1 Status der zwölf Befunde von Prüfer B

| Befund | Status 2.1 | Status 2.2 |
|---|---|---|
| B1, B2, B3, B5, B6, B7, B8, B9, B12 | behoben, je mit Regressionstest (`tests/unit/strategie-pruefer-b.js`) | Tests laufen weiter; B3 angepasst (siehe unten) |
| B4 Größenwahl zu groß | teilweise behoben | Arbeitspaket 2: neues Reaktionsmodell (Aktionstabelle gemittelt mit dem 2.1-Modell); Kalibrierung je Größe in `docs/EINSATZGROESSEN.md` |
| B11 River-Bluffcatcher | teilweise behoben | Arbeitspaket 1: datenbasierte Range-Likelihoods nach absoluter Stärke für alle Aktionen; Kalibrierung in `docs/RIVER_EQUITY.md` |
| **B10 Dokumentation** | **bestätigt und erledigt** (Dokumentationsbefund ohne Codefehler: GEGNERGEDAECHTNIS.md, METHODEN.md, STRATEGIE.md ergänzt) | unverändert erledigt; das ist der zwölfte Befund, der in „9 behoben, 2 teilweise“ fehlte |

## 2.2 Aufschlüsselung der 602.500 Hände

Die Zahl ist richtig gezählt, beschreibt aber **Helden-Hände über alle Helden**, nicht unabhängige Hände:

| Gruppe | Held | Läufe | Hände |
|---|---|---:|---:|
| zentral (Gegner-KI, 40/100/200 BB, 4 Zusammensetzungen) | Coach 2.1 | 48 | 120.000 |
| | Coach 2.0.1 | 48 | 120.000 |
| | Gegner-KI als Held | 48 | 120.000 |
| | Referenz Pot-Odds | 48 | 120.000 |
| unbekannte Strategien (6 synthetische, 100 BB) | Coach 2.1 / 2.0.1 / Gegner-KI | je 12 | je 30.000 |
| kurz (15 BB) | Coach 2.1 / 2.0.1 / Push/Fold | je 3 | je 7.500 |
| gleichgewichtsnah (100 BB) | Coach 2.1 / 2.0.1 | je 2 | je 5.000 |
| **Summe** | | **241** | **602.500** |

- Läufe desselben Seeds teilen die Karten (gepaarter Vergleich). **Unabhängige Kartenfolgen: 65 Seeds × 2.500 = 162.500 Hände.**
- Hände mit einem Coach als Held: 325.000 (2.1 und 2.0.1, beide Modi). Coach 2.1 allein: 162.500 (davon 5.000 gleichgewichtsnah).
- Der Hauptvergleich „2.1 gegen 2.0.1“ beruht auf 120.000 gepaarten Händen je Held (48 Paare, 240 Blöcke).

## 2.3 Identische Gegnerbedingungen

- Alle 241 Läufe tragen dieselbe Umgebungsprüfsumme (`bcf2e37cab9b`, Module core … session inklusive Gegner-KI). Innerhalb des 2.1-Hauptvergleichs
  spielten alle Helden gegen dieselbe Gegner-KI. **Bestätigt: identische Bedingungen innerhalb des Vergleichs.**
- **Nicht vergleichbar** sind Zahlen über Berichte hinweg: „+19,9 BB/100 gegen Bots“ (2.0.1) wurde mit der Gegner-KI 2.0.1 gemessen, die 2.1-Werte mit
  der nach Prüfer B (B3) geänderten Gegner-KI; der im Projektstand genannte „Zwischenstand vor Prüfung B: +8,8“ lief ebenfalls mit einer älteren
  Umgebung. Diese Zahlen sind keine Zeitreihe. 2.2 trennt deshalb ausdrücklich: H1 (Gegner-KI 2.2) und H2 (unveränderte Gegner-KI 2.1).
- Grenze des gepaarten Vergleichs (unverändert dokumentiert in `harness.js`): Sobald zwei Helden verschieden handeln, laufen die Zufallszahlen der
  Gegner innerhalb der Hand und die Datenbankwerte auseinander. Die Paarung senkt die Varianz, macht die Bedingungen aber nicht deterministisch gleich.

## 2.4 Konfidenzintervalle und Unabhängigkeit

- Verfahren: Block-Bootstrap mit 500er-Blöcken, je Lauf geschichtet, 2.000 Wiederholungen; Paare werden als Differenz gebootstrappt.
- **Unabhängigkeit der Blöcke geprüft:** Autokorrelation der 100-Hände-Blocksummen innerhalb der Läufe (je Lauf zentriert; die Zentrierung erzeugt
  bei 25 Blöcken eine Nullerwartung von ≈ −0,04, per Permutation bestimmt und abgezogen, Prüfer A 2.2, A-11): Lag 1 bereinigt 0,10 (alle Läufe;
  Coach 2.1: 0,15), Lag 5 (Abstand zweier 500er-Blöcke) bereinigt 0,004. Kurzfristige Abhängigkeit (Tischbesetzung, Anpassung) besteht; benachbarte
  500er-Blöcke korrelieren danach nur noch mit etwa 0,02. Die Intervalle sind für Vergleiche mit **mindestens 20 Blöcken** belastbar.
- **Nicht belastbar** waren deshalb zwei Aussagen des 2.1-Berichts, obwohl die 95-%-Intervalle 0 ausschlossen:
  - gleichgewichtsnaher Modus „−20,6 BB/100 [−35,4; −7,5]“: 2 Paare, **10 Blöcke** → nach der eigenen Regel „zu wenig Blöcke“. Eine Regression ist
    damit **nicht nachgewiesen**, aber auch nicht ausgeschlossen. 2.2 misst neu (H6, 4 Paare je Gegenmodus, 20 Blöcke je Paarung).
  - 15 BB „−0,0 [−1,5; 1,7]“: 3 Paare, 15 Blöcke → kein Beleg in beide Richtungen. 2.2 misst 15/25/40/200 BB getrennt (H5).
- Geteilte Läufe: Der Lauf „Coach 2.1“ der Gruppe zentral steckt in den Vergleichen gegen 2.0.1, gegen die Gegner-KI und gegen Pot-Odds. Diese drei
  Vergleiche sind daher **nicht voneinander unabhängig**; `strategy.json` kennzeichnet das (`sharedWith`). Das ist richtig gekennzeichnet, im Bericht aber
  nicht erwähnt.

## 2.5 Bestätigte Fehler und Regressionstests

| Nr. | Befund | bestätigt? | Regressionstest |
|---|---|---|---|
| F1 | Bericht 2.1 nannte die gleichgewichtsnahe Regression „schwächer als 2.0.1“ trotz zu wenig Blöcken | ja (Berichtsfehler) | `tests/unit/strategie-22.js`: Berichtsurteil folgt der Blockregel |
| F2 | 602.500 als „strategisch getestete Hände“ bezeichnet, ohne Hinweis auf Paarung | ja (Berichtsfehler) | `tools/folgeaudit-2.1.js` erzeugt die Aufschlüsselung aus den Rohdaten |
| F3 | PAI 0.1.0 liest Sicherungen des Trainers ab Format 3 nicht | ja | `tests/pai-integration.mjs` (Versionsprüfung, bleibt bis zur PAI-Anpassung rot) |
| F4 | Range-Schätzung: Bet-/Check-Likelihood relativ zur bereits verengten Range statt absolut (Ursache der River-Abweichung) | ja | `tests/unit/strategie-22.js` (River-Lead, Bluffcatcher) |
| F5 | Belastbarkeit im Coach nur nach Händen, nicht nach Gelegenheiten | ja | `tests/unit/strategie-22.js` |

Geänderter Test (mit Begründung, kein stilles Lockern): „Regression Prüfer C – keine Multiway-Bluffs ohne Rückhalt“ nutzte Ks8c auf 6s4c3s gegen drei
Gegner. Die Hand hat eine Overcard und einen Backdoor-Flush-Draw; das neue Reaktionsmodell sagt je Gegner Fold-Raten voraus, die in der Größenstudie
im Mehrspielerpot kalibriert sind (Flop, zwei Gegner, ½ Pot: beobachtet 0,53, vorhergesagt 0,49; Gruppe V). Der Test prüft jetzt einen Spot ohne jeden
Rückhalt (7c2d auf AsKsQh); dort muss weiterhin Check herauskommen. Prüfer B 3 (Gegner-KI) wurde nicht gelockert: Die neue Eigenschaft „kaum
größenabhängig“ gilt nur für loose-passive und sehr loose Gegner; der Test bleibt unverändert grün.
