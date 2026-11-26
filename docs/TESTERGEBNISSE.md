# Testergebnisse (automatisch erzeugt)

Erzeugt mit `node tools/report.js` aus `tests/results/*.json`. Stand: 2026-11-26 19:03 UTC.

## Node-Testsuite (vollständig)

Ausgeführt: 2026-11-26T19:01:37.584Z · Node v22.23.5 · **41 bestanden, 0 fehlgeschlagen**

| Test | Ergebnis | Prüfungen | Dauer | Hinweise |
|---|---|---:|---:|---|
| Handbewertung: alle 2.598.960 Fünf-Karten-Hände (Kategorien, 7.462 Werte, Ordnung = Referenz) | bestanden | 4 | 0.4 s |  |
| Handbewertung: 300.000 zufällige Sieben-Karten-Paare gegen Best-of-Five-Referenz | bestanden | 2 | 14.6 s |  |
| Handbewertung: feste Testfälle (Kategorien und Vergleiche) | bestanden | 32 | 0.0 s |  |
| Regeln: Blinds, Reihenfolge, Mindest-Raise, BB-Option, Walk | bestanden | 27 | 0.0 s |  |
| Regeln: unvollständiger All-in öffnet nicht, mehrere Short All-ins öffnen kumuliert, Mindest-Raise bleibt | bestanden | 11 | 0.0 s |  |
| Regeln: Wiedereröffnung nach vollem Raise, Re-Raise-Größen | bestanden | 2 | 0.0 s |  |
| Regeln: mehrere Side Pots, Berechtigung, nicht gecallter Überschuss, Chipbilanz | bestanden | 11 | 0.0 s |  |
| Regeln: Split Pot und Odd Chip (erster Gewinner links vom Button) | bestanden | 6 | 0.0 s |  |
| Regeln: Heads-up-Hand, ungleiche Stacks, All-in auf Flop und Turn | bestanden | 9 | 0.0 s |  |
| Regeln: kurzer Big Blind (All-in für weniger), Rake optional und konsistent | bestanden | 6 | 0.0 s |  |
| Regeln: Replayer spielt gespeicherte Verläufe exakt nach (2.000 Hände) | bestanden | 2 | 1.0 s |  |
| Simulation: 10.000 Hände, Invarianten nach jeder Aktion, keine hängende Hand, Chipbilanz | bestanden | 3 | 3.3 s | {"hands":10000,"actions":87099,"showdowns":1709,"sidePots":6,"splitPots":81,"swaps":333} |
| Fuzz: zufällige und ungültige Eingaben, zufällige Stacks (1–400 BB) | bestanden | 3 | 2.1 s | 8000 Hände mit zufälligen Stacks |
| Eigenschaft: gefoldete Spieler gewinnen nie, Gewinner sind berechtigt, keine Karte doppelt | bestanden | 2 | 1.5 s |  |
| Zufall: getrennte Ströme; Coach an/aus ändert den Spielverlauf nicht | bestanden | 3 | 1.1 s |  |
| Fairness: Bots und Coach sehen keine verdeckten Karten | bestanden | 12 | 0.0 s |  |
| Equity: exakte Enumeration bekannter Preflop-Duelle (je 1.712.304 Boards) gegen unabhängige Schleife und Literaturwerte | bestanden | 8 | 2.4 s | AhAd vs KsKc: 81.26 %; AsAh vs KsKh: 82.64 %; AsKs vs QhQd: 46.21 %; 7c2d vs AhAs: 12.58 % |
| Equity: Monte-Carlo gegen exakte Enumeration (Fehler ≤ 4 Standardfehler) | bestanden | 4 | 0.6 s | AhAd  KsKc: exakt 81.26 %, MC 81.52 % (SE 0.49, n 6253); AsKs  QhQd: exakt 46.21 %, MC 47.03 % (SE 0.50, n 9785); 8h9h Th7h2c AcAd: exakt 56.26 %, MC 56.57 % (SE 0.50, n 9700); AhKd Ks8c3d : exakt 88.28 %, MC 88.34 % (SE 0.53, n 3440) |
| Equity: Mehrgegner-Simulation (AA gegen KK gegen QQ) gegen exakte Enumeration | bestanden | 1 | 0.3 s | AA 3-Wege: exakt 67.67 % (1370754 Boards), MC 67.33 % |
| Pot Odds und Side-Pot-Berechtigung: nur erreichbare Pots zählen | bestanden | 6 | 0.0 s |  |
| EV-Referenz: River-Call mit exakter Equity entspricht eq·(Pot+Call) − Call | bestanden | 3 | 0.1 s |  |
| Kombinatorik und Blocker | bestanden | 7 | 0.0 s |  |
| Statistik: Wilson-Intervall, Beta-Glättung, kleine Stichproben unbekannt statt 0 | bestanden | 6 | 0.0 s |  |
| Statistik: Zähler stimmen mit unabhängiger Kontrollzählung überein (VPIP, PFR, 3-Bet, Fold gegen 3-Bet, C-Bet, Fold gegen C-Bet, WTSD) | bestanden | 623 | 1.9 s | 623 Zähler/Nenner-Paare verglichen |
| CFR+: analytisches River-Spiel (Bluff-Anteil b/(1+2b), Call-Häufigkeit 1/(1+b)), Exploitability ≈ 0 | bestanden | 13 | 0.1 s |  |
| Coach: Obergrenze von 5.000 Simulationen je Entscheidung, Antwortzeit, keine Ausnahme | bestanden | 1146 | 11.5 s | 1144 Analysen, max. 5000 Simulationen, max. 96 ms (Node, ein Kern) |
| Coach: Bewertung nutzt nur Entscheidungsinformationen; sieben Stufen; Fehlerkategorien | bestanden | 12 | 0.1 s |  |
| Training: alle 14 Kategorien erzeugen Situationen, reproduzierbar über Seeds | bestanden | 28 | 0.3 s |  |
| Training: Quizfragen rechnen korrekt, Kompetenzprofil und Spaced Repetition | bestanden | 405 | 0.0 s |  |
| Datenbank: Gegner verlassen den Tisch und kehren zurück, kein Doppeleintrag, 100er-Pool | bestanden | 6 | 2.0 s |  |
| Datenbank: Export und Import ergeben dieselbe Datenbank; 5.000 Gegner | bestanden | 3 | 0.7 s |  |
| Import: beschädigte und manipulierte Dateien werden abgelehnt, bestehende Daten unverändert | bestanden | 18 | 0.1 s |  |
| Migration: Datenbank aus Entwurf 2 (Version 1) und vollständige Sicherung | bestanden | 9 | 0.0 s |  |
| Wiederaufnahme: laufende Hand wird nach Neuladen exakt wiederhergestellt | bestanden | 79 | 0.0 s |  |
| Handhistorie: Datensätze sind gültig und exportierbar | bestanden | 2 | 0.1 s |  |
| Sprachausgabe: nur der jüngste Tipp wird gesprochen, ältere brechen ab; ohne Sprachfunktion kein Fehler | bestanden | 5 | 0.0 s |  |
| Regression Prüfer A: Check-Raise-Nenner, Replay mit Rake, Dead Money je Spieler, Stack 0, Heldenplatz | bestanden | 9 | 0.0 s |  |
| Regression Prüfer A: EV-Call-Zweig mit Call-Range, Jam-Raise-Zweig, Monte-Carlo-Stoppregel | bestanden | 3 | 0.1 s |  |
| Regression Prüfer C: Preflop nach Faustregel-Chart (kein 3-Bet/Open mit beliebigen Händen, kein Open-Limp) | bestanden | 9 | 0.0 s |  |
| Regression Prüfer C: keine Multiway-Bluffs ohne Rückhalt, keine Flop-Overbets, Live-Tipp ≤ 5.000 Simulationen | bestanden | 3 | 0.1 s |  |
| Regression Prüfer C: Importprüfung Lerndaten (XSS, __proto__, Ziele, Momentaufnahmen), Reparatur beim Laden | bestanden | 7 | 0.0 s |  |

## Langläufer

### Sieben-Karten-Enumeration

Alle 133.784.560 Kombinationen in 12.1 s; 4824 verschiedene Werte; Häufigkeiten **identisch** mit den Referenzwerten.

| Kategorie | gezählt | Referenz |
|---|---:|---:|
| High Card | 23.294.460 | 23.294.460 |
| Pair | 58.627.800 | 58.627.800 |
| Two Pair | 31.433.400 | 31.433.400 |
| Three of a Kind | 6.461.620 | 6.461.620 |
| Straight | 6.180.020 | 6.180.020 |
| Flush | 4.047.644 | 4.047.644 |
| Full House | 3.473.184 | 3.473.184 |
| Four of a Kind | 224.848 | 224.848 |
| Straight Flush | 41.584 | 41.584 |

### Massensimulation

1.000.000 Hände, 8.871.942 Aktionen, Invarianten (Chipbilanz, Kartenintegrität, Spieler am Zug, Einsätze) nach **jeder** Aktion geprüft: **0 Fehler**. Showdowns 251.620, Hände mit Side Pots 8.778, mit Split Pots 9.347, mit All-in 121.201, Gegnerwechsel 41.662, Nachkäufe 77.207, abgewiesene ungültige Eingaben 33.724, Bot-Rückfälle 0. Dauer 154 s auf 2 Kernen.

Konfigurationen (je 1/8): `{"cfg":{},"heroMode":null}`, `{"cfg":{},"heroMode":null}`, `{"cfg":{"rebuyBelowBB":0,"topUp":false},"heroMode":null}`, `{"cfg":{},"heroMode":"random"}`, `{"cfg":{"rake":{"on":true,"pct":0.05,"capBB":3,"nfnd":true}},"heroMode":null}`, `{"cfg":{"startBB":20,"rebuyBelowBB":5},"heroMode":"random"}`, `{"cfg":{"startBB":300},"heroMode":null}`, `{"cfg":{"difficulty":"experte","swapEvery":10},"heroMode":"random"}`.

### Kalibrierung der Gegner-KI

200.000 simulierte Hände, Werte aus der Statistik-Engine (nur öffentliche Aktionen). Zielbereiche: typische 6-max-Werte je Spielertyp. HUD-Typ: Anteil der Gegner mit ≥ 300 Händen, deren Typ nach Projektregel zum Stil passt.

| Stil | Hände | VPIP | PFR | 3-Bet | AF | C-Bet | Fold vs C-Bet | WTSD | W$SD | Zielbereiche erfüllt | HUD-Typ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| lp | 197.210 | 33.5 | 8.6 | 4.6 | 0.74 | 47.3 | 44.5 | 43.6 | 52.4 | vpip ✓, pfr ✓, af ✓, wtsd ✓ | 40/40 |
| vl | 158.800 | 44.1 | 24.8 | 12.6 | 2.58 | 64.8 | 55.2 | 29.8 | 45.4 | vpip ✓, pfr ✓, af ✓ | 30/30 |
| nit | 142.290 | 11.5 | 8.4 | 2.4 | 2.57 | 55.3 | 53.3 | 39.7 | 57.5 | vpip ✓, pfr ✓ | 30/30 |
| tag | 239.600 | 21 | 16.8 | 6.7 | 3.16 | 61.5 | 51.4 | 34.8 | 51.2 | vpip ✓, pfr ✓, threeBet ✓, af ✓ | 50/50 |
| lag | 151.370 | 30.5 | 25.1 | 10.2 | 3.75 | 65.7 | 53.3 | 31 | 46.3 | vpip ✓, pfr ✓, threeBet ✓, af ✓ | 27/30 |
| bal | 110.730 | 22.6 | 17.8 | 7.2 | 3.27 | 60.4 | 54 | 33.3 | 51 | vpip ✓, pfr ✓, threeBet ✓ | 20/20 |

### Coach gegen Referenz

Ein Held, der stets der Coach-Empfehlung folgt, spielt gegen die Bots; Vergleich mit einem Helden, der die Bot-Logik eines TAG-Profils nutzt (gleiche Seeds). Spielgeld-Ergebnisse streuen stark (≈ ±25 BB/100 je 2.500 Hände); sie sind nur ein grober Plausibilitätsnachweis.

| Modus | Seed | Coach BB/100 | TAG-Bot BB/100 | Ø ms je Analyse | max. ms | max. Simulationen |
|---|---:|---:|---:|---:|---:|---:|
| exploitativ | 21 | 61.6 | 16.5 | 25.1 | 291 | 5000 |
| exploitativ | 22 | 28 | -10.1 | 25 | 345 | 4800 |
| exploitativ | 23 | -18.1 | -15.7 | 24.6 | 314 | 4800 |
| exploitativ | 24 | 8.3 | 28.3 | 23.3 | 344 | 4800 |
| gleichgewichtsnah | 21 | 43.1 | 16.5 | 25 | 318 | 4800 |
| gleichgewichtsnah | 22 | 17.7 | -10.1 | 25.1 | 372 | 4800 |

Mittel exploitativ: Coach 19.9 BB/100, TAG-Bot 4.8 BB/100. Mittel gleichgewichtsnah: Coach 30.4, TAG-Bot 3.2.

## Browser-Tests lokal (Playwright, Chrome)

Ausgeführt: 2026-11-26T19:03:14.850Z · http://127.0.0.1:8765/ · **19 bestanden, 0 fehlgeschlagen**

| Test | Ergebnis | Prüfungen | Dauer | Hinweise |
|---|---|---:|---:|---|
| Laden: keine Fehler, Leistungswerte (LCP, CLS, Ladezeit) | bestanden | 3 | 1.1 s | Ladezeit 190 ms, bereit nach 293 ms, LCP 112 ms, CLS 0.004 |
| Hand spielen: Tipp „vorher“ erscheint binnen 2 Sekunden, keine neue Hand ohne „Nächste Hand“ | bestanden | 15 | 23.6 s | 60 Tipps, Ø 21 ms, max. 95 ms |
| Ungültiger Betrag, Tastatursteuerung, Tipp-Modi „nachher“ und „aus“ | bestanden | 13 | 6.0 s |  |
| Live-Anzeige und Gegnerdetails, Dialog mit Esc schließen | bestanden | 3 | 0.1 s |  |
| Alle Bereiche öffnen; Range-Matrix, Gegnerliste, Fortschritt, Hilfe | bestanden | 13 | 4.8 s |  |
| Export und Import der Datenbank, beschädigte Datei wird abgelehnt | bestanden | 8 | 2.4 s |  |
| Sicherheit: manipulierte Sicherung mit Skript in Lerndaten wird abgelehnt (keine Ausführung) | bestanden | 2 | 0.3 s |  |
| Handhistorie und Replayer: vor, zurück, damals/später bekannt, Entscheidung erneut treffen | bestanden | 5 | 6.1 s |  |
| Training: Kategorie starten, Situation bewerten, Quiz | bestanden | 5 | 1.5 s |  |
| Einstellungen: Darstellung, neue Session mit Seed | bestanden | 3 | 0.9 s |  |
| Neuladen während einer laufenden Hand: exakte Wiederaufnahme | bestanden | 3 | 3.1 s |  |
| Mehrere Tabs: zweiter Tab ist schreibgeschützt | bestanden | 3 | 0.4 s |  |
| Daten bleiben nach Neustart erhalten | bestanden | 1 | 0.5 s |  |
| Offline: Service Worker installiert, Seite lädt und spielt ohne Netz | bestanden | 3 | 3.9 s |  |
| Browser ohne Sprachfunktion: Meldung, Trainer läuft weiter | bestanden | 2 | 9.7 s |  |
| Darstellung auf Smartphone, Tablet und Desktop (kein horizontales Scrollen) | bestanden | 32 | 22.0 s |  |
| Barrierefreiheit: Namen für Bedienelemente, Bilder mit Alt, Fokusreihenfolge, Kontrast | bestanden | 7 | 0.5 s | Kontrast Nebentext 6.48:1, Text 17.07:1 |
| Portable Einzeldatei (file://): lädt, spielt, Coach per Blob-Worker | bestanden | 2 | 9.7 s |  |
| Konsole: keine JavaScript-Fehler, keine 404 | bestanden | 1 | 0.0 s |  |

Gemessen (lokaler Server, Desktop-Chrome ohne Drosselung): Ladezeit 190 ms, bereit nach 293 ms, LCP 112 ms, CLS 0.004, Tipp nach Zugbeginn Ø 21 ms (max. 95 ms), übertragene Daten 427 KB.

## Live-Website

**Nicht ausgeführt.**

