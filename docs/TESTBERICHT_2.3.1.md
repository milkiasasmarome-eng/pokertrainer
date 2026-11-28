# Testbericht und Qualitätsbewertung – PokerTrainer 2.3.1

Stand: 28.11.2026, Zweig `entwicklung-2.3`. Eingefrorene Stände: `6d6e575` (val24), `88f1191` (val24b, Produktstand der Engine). Danach nur
Oberflächentexte, Tests, Doku. Kriterien vorab: [ABNAHMEKRITERIEN_2.4.md](ABNAHMEKRITERIEN_2.4.md). Tabellen aus Rohdaten: `node tools/report-24.js`
→ `tests/results/report-24.json`. Grundlage und frühere Zahlen: [TESTBERICHT_2.3.md](TESTBERICHT_2.3.md).

## 1. Übernahme und Reproduzierbarkeit

| Prüfung | Ergebnis |
|---|---|
| Repository, Zweige, Commit-Stand | `entwicklung-2.3` = PR #3 = `601df61` (2.3.0) beim Start; keine unveröffentlichten Änderungen; Referenzen `sicherung-2.0.1/2.1.0/2.2.0` unverändert |
| Build | `node tools/check-build.js`: zweimal gebaut, identisch, eingecheckt aktuell |
| Version | `node tools/check-version.js`: einheitlich 2.3.1 |
| Unit-Tests `node tests/run.js` (voll, mit Mathe-Referenz) | 140 bestanden, 0 fehlgeschlagen (2.3.0: 137; neu E23-14, E23-10, Modus-Schalter) |
| Browsertests `tests/e2e.js` | 52 bestanden; zwei zufällige Fehlschläge (Hand ohne eigene Entscheidung) in den Tests behoben |
| Gedächtnis-Browsertests | 3 bestanden |
| CI auf PR #3 | Schnelltests grün; Browsertests nach der Testkorrektur siehe PR |
| Gleichheit 2.3.0 / 2.3.1 (vor der Modusänderung) | Seed 23801 bitgleich (3.558 Entscheidungen, Summe 1.244,4 BB) |
| Langläufer (1 Mio. Hände), 7-Karten-Prüfung | nicht wiederholt: Regeln, Handbewertung, Equity, Gegner-KI unverändert (Begründung CLAUDE.md) |

Fehlende Berechtigungen: Tag-Pushes und Änderungen an PAI (nur lesend) – beides nicht nötig.

## 2. Gleichgewichtsnaher Modus (P4)

Ursache (H-G1): Seit 2.1 fehlten im Modus die Fold-Korrekturen für Raises; Raise-Anteil postflop 8 % statt 2,6 % (2.0.1).

| Kennung | Vergleich | Hände | Differenz BB/100 | 95-%-Intervall | Urteil |
|---|---|---:|---:|---|---|
| P4 | 2.3.0 gegen 2.0.1 (Plan v23) | 60.000 | −6,28 | [−12,49; −0,13] | belegt schlechter |
| P4' | 2.3.1 vor Korrektur gegen 2.0.1, neue Seeds | 60.000 | −2,04 | [−7,90; 3,69] | nicht belegt |
| P4-gesamt | P4 ∪ P4' | 120.000 | −4,16 | [−8,81; 0,20] | Nichtunterlegenheit nicht belegt |
| G3 | vor Korrektur gegen 2.0.1, synth23 Ka23 | 15.000 | −31,58 | [−50,0; −14,3] | belegt schlechter |
| dev24b Tr23 | Korrektur gegen Stand 2.3 (Abstimmung) | 15.000 | +52,25 | [41,07; 63,38] | belegt besser |
| dev24b Va23 | Korrektur gegen Stand 2.3 (Wahl) | 15.000 | +43,07 | [32,35; 55,17] | belegt besser |
| dev24b Va23 | Korrektur gegen 2.0.1 | 15.000 | −25,30 | [−43,28; −7,74] | belegt schlechter |
| **P4R** | **Produktstand 2.3.1 gegen 2.0.1, neue Seeds** | 60.000 | **+7,66** | **[3,81; 11,43]** | **nicht unterlegen (untere Grenze +2,07), belegt besser** |
| vR-0 | Produktstand gegen Stand 2.3, neue Seeds | 60.000 | +11,46 | [7,02; 16,13] | belegt besser |

Raise-Anteil postflop im Produktstand 1,5 % (2.0.1: 2,5 %). Der exploitative Modus ist unverändert (Test „2.3.1 (H-G1)“), P1–P3 aus 2.3 gelten weiter.
**Bewertung:** P4 ist mit dem neuen Kandidaten bestanden (P4R). Gegen unbekannte Strategien bleibt der Modus schwächer als 2.0.1 (Va23 −25,3), und für
einen abschließenden Generalisierungsnachweis gibt es keine unberührte Gruppe mehr. Er bleibt daher „experimentell“ und nicht voreingestellt.

## 3. PAI

| Prüfung | Ergebnis |
|---|---|
| Stand PAI | `entwicklung/0.4.0` = `f4990fe` (0.4.0-dev); die Annahme „0.1.0“ war veraltet |
| `tests/pai-integration.mjs` gegen f4990fe | 18/18 (Format 3 nativ, Version 4 abgelehnt, Trainingshände ausgelassen, Positivliste, keine Leckage, Negativtest) |
| PAI-eigener Test `tests/compat-pokertrainer.mjs` gegen Trainer 6d6e575 | 18 bestanden, 1 beschreibend, 0 Fehler (`tests/results/pai-compat-E231.json`) |
| Änderungsauftrag | Punkte 1–5 und 7 erledigt, 6 teilweise, 8 offen (`PAI_AENDERUNGSAUFTRAG.md`) |

## 4. Strategische Generalisierung des Coaches (Diagnose, keine Änderung)

Aus den Kalibrierungsdaten 2.3 (`tests/results/calib-2.3/ec_*.json`), Spots am River ohne offenen Einsatz, tatsächliche minus geschätzte Equity:

| Gruppe | in Position (Gegner checkt zum Helden) | ohne Position |
|---|---:|---:|
| F23 (2.3) / (2.1.0) | +0,29 / +0,28 | +0,08 / +0,05 |
| Ka23 (2.3) | +0,07 | +0,08 |
| Gegner-KI V / T | +0,00 / −0,01 | +0,01 / +0,04 |

Die Unterschätzung gegen unbekannte Strategien sitzt fast ganz beim River-Check des Gegners: Fremde Strategien checken schwächere Ranges, als das
an der Gegner-KI angepasste Modell annimmt. 2.1.0 zeigt dasselbe. Eine Korrektur (Showdown-Kalibrierung je Gegner) braucht eine neue versiegelte
Testgruppe und wurde in dieser Runde nicht begonnen. Fold-Prognosen, Alter der Beobachtungen und Gewichtung der Gegneranpassung: unverändert
gegenüber 2.3 (Befunde C23-5, B23-6 offen).

## 5. Prüfbefunde

Behoben mit Regressionstest: E23-10, E23-14, C23-10 sowie zwei zufällig fehlschlagende Browsertests. Offen (gering, dokumentiert): B-6 (2.2),
B23-9, C23-5, E23-12 (Projektvorgabe). Eine unabhängige KI-Prüfung der veränderten Komponenten wurde nicht durchgeführt; geprüft wurde mit
Regressionstests, der bitgleichen Wiedergabe und den vorab festgelegten Vergleichen (geänderter Code: drei Zeilen in `ev.js`, Textzeile in `coach.js`,
Kürzung in `stats.js`).

## 6. Qualitätsbewertung (Matrix unverändert)

| Bereich | Gewicht | 2.1.0 | 2.3.0 | 2.3.1 | Begründung |
|---|---:|---:|---:|---:|---|
| Regelkorrektheit | 15 % | 10 | 10 | 10 | unverändert |
| Mathematische Zuverlässigkeit | 15 % | 9,8 | 9,7 | 9,7 | unverändert |
| Coach und Strategie | 20 % | 8,9 | 9,0 | **9,1** | P4 bestanden (P4R +7,7); aber gegen unbekannte Strategien weiter schwächer als 2.0.1, S1 und Fold-Prognose T unverändert verfehlt |
| Gegner-KI | 10 % | 9,3 | 9,3 | 9,3 | unverändert |
| Lernsystem | 10 % | 9,3 | 9,3 | 9,3 | unverändert |
| Oberfläche und Barrierefreiheit | 10 % | 9,3 | 9,3 | 9,3 | unverändert |
| Performance | 5 % | 9,8 | 9,8 | 9,8 | Tipp im Browser höchstens 176 ms |
| Sicherheit und Datenschutz | 10 % | 9,6 | 9,6 | 9,6 | unverändert |
| Dokumentation, Tests, Deployment | 5 % | 9,7 | 9,7 | **9,8** | CLAUDE.md, Übergabe, Projektstand im Repository, Berichte aus Rohdaten, PAI mit Commit-Hashes, robuste Browsertests |
| **Gesamt** | | 9,47 | 9,48 | **9,50** | rechnerisch 9,505 |

Das Ziel 9,5 ist **rechnerisch knapp erreicht**. Die Spanne ist klein und hängt an zwei Teilnoten (+0,1 je), kein robuster Vorsprung.
Wichtiger als die Zahl: keine bekannten kritischen Fehler, keine ungültigen Empfehlungen, keine Datenleckage, Datenformat unverändert, Offline-Betrieb
erhalten.

## 7. Nicht geprüft

Echter Screenreader, deutsche Systemstimme, echte Mobilgeräte, Lernwirkung bei Nutzern (Final Acceptance Test Teil B). Lizenz und Anbieterkennzeichnung offen.
