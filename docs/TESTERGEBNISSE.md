# Testergebnisse (automatisch erzeugt)

Erzeugt mit `node tools/report.js` aus `tests/results/*.json`. Stand: 2026-11-27 09:43 UTC.

## Node-Testsuite (vollständig)

Ausgeführt: 2026-11-27T09:43:51.564Z · Node v22.23.5 · **114 bestanden, 0 fehlgeschlagen**

| Test | Ergebnis | Prüfungen | Dauer | Hinweise |
|---|---|---:|---:|---|
| Handbewertung: alle 2.598.960 Fünf-Karten-Hände (Kategorien, 7.462 Werte, Ordnung = Referenz) | bestanden | 4 | 0.5 s |  |
| Handbewertung: 300.000 zufällige Sieben-Karten-Paare gegen Best-of-Five-Referenz | bestanden | 2 | 19.1 s |  |
| Handbewertung: feste Testfälle (Kategorien und Vergleiche) | bestanden | 32 | 0.0 s |  |
| Regeln: Blinds, Reihenfolge, Mindest-Raise, BB-Option, Walk | bestanden | 27 | 0.0 s |  |
| Regeln: unvollständiger All-in öffnet nicht, mehrere Short All-ins öffnen kumuliert, Mindest-Raise bleibt | bestanden | 11 | 0.0 s |  |
| Regeln: Wiedereröffnung nach vollem Raise, Re-Raise-Größen | bestanden | 2 | 0.0 s |  |
| Regeln: mehrere Side Pots, Berechtigung, nicht gecallter Überschuss, Chipbilanz | bestanden | 11 | 0.0 s |  |
| Regeln: Split Pot und Odd Chip (erster Gewinner links vom Button) | bestanden | 6 | 0.0 s |  |
| Regeln: Heads-up-Hand, ungleiche Stacks, All-in auf Flop und Turn | bestanden | 9 | 0.0 s |  |
| Regeln: kurzer Big Blind (All-in für weniger), Rake optional und konsistent | bestanden | 6 | 0.0 s |  |
| Regeln: Replayer spielt gespeicherte Verläufe exakt nach (2.000 Hände) | bestanden | 2 | 1.5 s |  |
| Simulation: 10.000 Hände, Invarianten nach jeder Aktion, keine hängende Hand, Chipbilanz | bestanden | 3 | 4.5 s | {"hands":10000,"actions":87083,"showdowns":1693,"sidePots":5,"splitPots":78,"swaps":333} |
| Fuzz: zufällige und ungültige Eingaben, zufällige Stacks (1–400 BB) | bestanden | 3 | 2.6 s | 8000 Hände mit zufälligen Stacks |
| Eigenschaft: gefoldete Spieler gewinnen nie, Gewinner sind berechtigt, keine Karte doppelt | bestanden | 2 | 1.8 s |  |
| Zufall: getrennte Ströme; Coach an/aus ändert den Spielverlauf nicht | bestanden | 3 | 1.9 s |  |
| Fairness: Bots und Coach sehen keine verdeckten Karten | bestanden | 12 | 0.0 s |  |
| Equity: exakte Enumeration bekannter Preflop-Duelle (je 1.712.304 Boards) gegen unabhängige Schleife und Literaturwerte | bestanden | 8 | 3.0 s | AhAd vs KsKc: 81.26 %; AsAh vs KsKh: 82.64 %; AsKs vs QhQd: 46.21 %; 7c2d vs AhAs: 12.58 % |
| Equity: Monte-Carlo gegen exakte Enumeration (Fehler ≤ 4 Standardfehler) | bestanden | 4 | 0.9 s | AhAd  KsKc: exakt 81.26 %, MC 81.44 % (SE 0.46, n 7476); AsKs  QhQd: exakt 46.21 %, MC 46.29 % (SE 0.50, n 10256); 8h9h Th7h2c AcAd: exakt 56.26 %, MC 56.37 % (SE 0.50, n 10256); AhKd Ks8c3d : exakt 88.28 %, MC 88.23 % (SE 0.38, n 7172) |
| Equity: Mehrgegner-Simulation (AA gegen KK gegen QQ) gegen exakte Enumeration | bestanden | 1 | 0.6 s | AA 3-Wege: exakt 67.67 % (1370754 Boards), MC 67.25 % |
| Pot Odds und Side-Pot-Berechtigung: nur erreichbare Pots zählen | bestanden | 6 | 0.0 s |  |
| EV-Referenz: River-Call mit exakter Equity entspricht eq·(Pot+Call) − Call | bestanden | 3 | 0.1 s |  |
| Kombinatorik und Blocker | bestanden | 7 | 0.0 s |  |
| Statistik: Wilson-Intervall, Beta-Glättung, kleine Stichproben unbekannt statt 0 | bestanden | 6 | 0.0 s |  |
| Statistik: Zähler stimmen mit unabhängiger Kontrollzählung überein (VPIP, PFR, 3-Bet, Fold gegen 3-Bet, C-Bet, Fold gegen C-Bet, WTSD) | bestanden | 623 | 2.9 s | 623 Zähler/Nenner-Paare verglichen |
| CFR+: analytisches River-Spiel (Bluff-Anteil b/(1+2b), Call-Häufigkeit 1/(1+b)), Exploitability ≈ 0 | bestanden | 13 | 0.1 s |  |
| Coach: Obergrenze von 5.000 Simulationen je Entscheidung, Antwortzeit, keine Ausnahme | bestanden | 1203 | 20.3 s | 1201 Analysen, max. 5000 Simulationen, max. 170 ms (Node, ein Kern) |
| Coach: Bewertung nutzt nur Entscheidungsinformationen; sieben Stufen; Fehlerkategorien | bestanden | 12 | 0.2 s |  |
| Training: alle 14 Kategorien erzeugen Situationen, reproduzierbar über Seeds | bestanden | 28 | 0.3 s |  |
| Training: Quizfragen rechnen korrekt, Kompetenzprofil und Spaced Repetition | bestanden | 405 | 0.0 s |  |
| Datenbank: Gegner verlassen den Tisch und kehren zurück, kein Doppeleintrag, 100er-Pool | bestanden | 6 | 2.6 s |  |
| Datenbank: Export und Import ergeben dieselbe Datenbank; 5.000 Gegner | bestanden | 3 | 1.0 s |  |
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
| Benchmark: neue Entscheidungsfelder werden erzeugt und streng geprüft (alte Datensätze bleiben gültig) | bestanden | 46 | 6.0 s |  |
| Benchmark: Schema, Trennung Entscheidungszeitpunkt / später, keine persönlichen Daten, byteweise reproduzierbar | bestanden | 10 | 0.3 s |  |
| Benchmark: Nachrechnung aus dem Export (gleicher Seed, gleiche Gegnerwerte) ergibt dieselbe Empfehlung und dieselben EV | bestanden | 3 | 2.4 s |  |
| A1: Ergebnisse beider Modi unabhängig von der Reihenfolge; faire Budgetverteilung; erschöpftes Budget ohne ungültige Werte | bestanden | 3 | 6.3 s |  |
| A6: Bayes-Beleg für Exploits (Beta-CDF, Monotonie in Stichprobe und Abweichung, kein Exploit ohne Beleg) | bestanden | 6 | 0.0 s |  |
| Import: manipulierte Datenbank mit gültiger Prüfsumme (Typen, NaN-Ersatz, 1e308, negative Zahlen, HTML, __proto__) wird abgelehnt | bestanden | 32 | 1.3 s |  |
| Import: Sicherung mit manipulierten Händen (Zeit 1e308, Ergebnis als Text, HTML in Namen, fremde Felder) wird abgelehnt | bestanden | 16 | 0.3 s |  |
| Import: Größenlimit PT.stats.MAX_IMPORT (keine Verarbeitung zu großer Dateien), große gültige Sicherung in vertretbarer Zeit | bestanden | 4 | 1.3 s |  |
| Rohsicherung: beschädigte lokale Daten werden gesichert, gültige Einträge beim Import übernommen, beschädigte übersprungen | bestanden | 9 | 0.0 s |  |
| Statisch: kein Netzwerkzugriff im App-Code, CSP in Website und Offline-Datei, kein eval | bestanden | 7 | 0.0 s |  |
| Deadline: comboEquities bricht ab, kennzeichnet „abgebrochen“, nicht im Cache, keine Lücken | bestanden | 4 | 0.3 s |  |
| Deadline: River-Modellspiel bricht nach mindestens 50 Iterationen ab und meldet die erreichte Zahl | bestanden | 3 | 0.1 s |  |
| Gegnergedächtnis: Abklingen mit Halbwertszeit in Händen, gewichtete Zähler und Testvarianz exakt | bestanden | 6 | 0.2 s |  |
| Gegnergedächtnis: Erkennung veränderter Spielweise (Mindestzahl, Richtung, Hysterese, beste Schätzung, Coach-Schnittstelle) | bestanden | 13 | 0.0 s |  |
| Datenformat 3: Export → Import identisch, 5.000 Gegner, strenge Prüfung, Migration aus Format 2 und 1 | bestanden | 49 | 3.4 s |  |
| Rückkehrer: Langzeitwerte und Kurzzeitgedächtnis bleiben über Archiv und Rückkehr erhalten und laufen weiter | bestanden | 6 | 4.0 s |  |
| Fairness: Gedächtnis, Profil und Coach-Schnittstelle nutzen nur Beobachtetes, nie den internen Stil | bestanden | 5 | 0.0 s |  |
| Gegner-KI: Anpassung an synthetische Heldenstrategien nur über beobachtbare Heldenwerte | bestanden | 4 | 21.2 s |  |
| Gegnergedächtnis: synthetische Gegner wechseln mitten in der Session die Spielweise | bestanden | 3 | 5.1 s |  |
| Gleichgewichtsnaher Modus: kein Bluff als alleinige Empfehlung bei Gleichstand; exploitativ ohne Mischhinweis | bestanden | 3 | 3.6 s |  |
| A2 potShare: Range durch bekannte Karten vollständig entfernt → Fehlschlag statt Zufallszahl | bestanden | 4 | 0.0 s |  |
| A2 potShare: einzeln gültige Ranges ohne gemeinsame konfliktfreie Verteilung → Fehlschlag, kein stiller 0-Gewinn | bestanden | 5 | 0.0 s |  |
| A2 equity: leere Range und unmögliche Verteilung → {eq: null, failed, reason}; Budget wird nicht verbraucht | bestanden | 11 | 0.0 s |  |
| A2 evCall: Rückfall bei fehlgeschlagener Side-Pot-Rechnung, gekennzeichnet in parts | bestanden | 4 | 0.0 s |  |
| A3 Cache: erst kleines Budget, dann großes → neue Rechnung mit besserer Qualität | bestanden | 3 | 0.0 s |  |
| A3 Cache: Stufen, Zeitabbruch, Mindestanzahl, exakt vor Monte Carlo | bestanden | 7 | 0.1 s |  |
| A4 exactHU: sehr kleine Deadline → Abbruch, Monte-Carlo-Rückfall, nie „exakt“ | bestanden | 6 | 0.3 s |  |
| A4 potShare und Monte Carlo halten die Deadline | bestanden | 2 | 0.0 s |  |
| A5 Range-Kennung: Unterschiede < 0,0005 ergeben verschiedene Kennungen | bestanden | 4 | 0.0 s |  |
| A5 Range-Kennung: gleiche Verteilung in anderer Skalierung → gleiche Kennung; Format | bestanden | 5 | 0.0 s |  |
| A5 Equity-Cache: verschiedene Verteilungen mit früher gleicher Kennung liefern ihre eigene Equity | bestanden | 3 | 0.0 s |  |
| Handbewertung Referenz: Klassen der unabhängigen Referenz, alle 2.598.960 Fünf-Karten-Hände einzeln | bestanden | 7 | 0.4 s |  |
| Handbewertung Referenz: geschichtete Sieben-, Sechs- und Fünf-Karten-Hände, Paarvergleiche, Invarianzen | bestanden | 5 | 1.8 s |  |
| Handbewertung Referenz: die Prüfung erkennt eingebaute Fehler (Mutationsprobe) | bestanden | 4 | 0.1 s |  |
| MC: Intervall für beschränkte Größen (Ränder, Split-lastig, Binomial) | bestanden | 6 | 0.0 s |  |
| MC: Stichprobenumfang hängt nicht von den Werten ab (fester Umfang bei Budgetgrenze, Pilot nicht in der Schätzung) | bestanden | 4 | 0.0 s |  |
| MC: keine Randverzerrung (Regression 2.0.1: exakt 0,9886, MC-Mittel 0,9903 auf Präzise) | bestanden | 2 | 0.6 s |  |
| MC: Abdeckung der 95-%-Intervalle (Stichprobe der Referenzfälle, Stufe Schnell und Budget 1.000) | bestanden | 6 | 1.9 s |  |
| Prüfer A 2.1: Cache nutzt Einträge nur nach Umfang, Ersetzung nach Umfang, Hash ohne Sammelkennung, seltene Tupel, Fehler nie 0 | bestanden | 7 | 0.2 s |  |
| Prüfer A 2.1: Veränderungstest robust (NaN) und AFq mit Design-Effekt | bestanden | 2 | 0.0 s |  |
| Prüfung C1: Zahlenüberlauf (1e999 → Infinity) wird beim Import abgelehnt, Export→Import bleibt verlustfrei | bestanden | 5 | 0.0 s |  |
| Prüfung C4: Gegner-ID „__proto__“ wird abgelehnt (vorher gezählt, aber verschwunden), kein Prototyp verändert | bestanden | 3 | 0.0 s |  |
| Prüfung C14: Importgrenze deckt die größte eigene Sicherung (3.000 Hände) ab; Oberfläche nutzt dieselbe Grenze | bestanden | 3 | 2.6 s |  |
| Prüfung C2: Archivfassung 2.0.1 (gleiche IndexedDB) wird nicht im selben Ursprung veröffentlicht | bestanden | 2 | 0.0 s |  |
| Prüfung C6: Trainingskategorie „constructor“ (aus Object.prototype) erzeugt keine Ausnahme | bestanden | 3 | 0.0 s |  |
| Bewertung 2.1: Interpolierte Größe hat größere Unsicherheit als die Nachrechnung; Nachrechnung wird bevorzugt | bestanden | 4 | 0.0 s |  |
| Bewertung 2.1: Abstand Empfehlung – höchster Modell-EV wird gemeldet (Preflop-Anker); kein „eindeutig“ bei Alternativen in der Unsicherheit | bestanden | 2 | 6.0 s |  |
| Bewertung 2.1: Genäherte oder fehlgeschlagene EV-Werte werden gekennzeichnet, nicht als 0 gewertet, Unsicherheit erweitert | bestanden | 4 | 0.0 s |  |
| CFR 2.1: unabhängige Best Response stimmt mit der Exploitability der Lösung überein (ohne/mit Raises, Stackgrenze) | bestanden | 144 | 1.0 s |  |
| CFR 2.1: analytische Spiele – dominierter Raise ändert die geschlossene Lösung nicht; Raise-Option nützt dem Erhöhenden | bestanden | 11 | 0.1 s |  |
| CFR 2.1: River-Modell im Coach mit Raise-Option, Exploitability und Rechenzeit | bestanden | 4 | 0.1 s |  |
| Prüfer A 5: comboEquities-Cache nur nach Umfang, Teilergebnis nie für größere Anfrage, Rückgabe als Kopie | bestanden | 5 | 0.0 s |  |
| Prüfer A 7: leere Range gekennzeichnet statt „exakt“ mit SE 0; Coach fällt gekennzeichnet zurück, Klassifikation „unsicher“ | bestanden | 6 | 0.0 s |  |
| Prüfer A 4: ausgefallene Mehrgegner-Equity als Näherung gekennzeichnet, Unsicherheit erhöht | bestanden | 3 | 0.1 s |  |
| Prüfer A 12: Bayes-Beleg vergleicht auf derselben Skala (Break-even in den größenunabhängigen Rohwert umgerechnet) | bestanden | 3 | 0.0 s |  |
| Prüfer B 1: Chart-Anker misst Fold am Chartgewicht (kein Fold mit Händen, die der Chart zu 100 % spielt) | bestanden | 21 | 0.0 s |  |
| Prüfer B 9: Kurzzeit- und Langzeitwerte nicht gemischt (VPIP ≥ PFR) | bestanden | 5 | 0.0 s |  |
| Prüfer B 12: respond.inner wird auch nach einer Ausnahme zurückgesetzt | bestanden | 2 | 0.0 s |  |
| Prüfer B 6: Ergebnis unabhängig von Reihenfolge der Modi, Cache-Zustand und Wiederholung (Seeds 77 und 991) | bestanden | 2 | 3.8 s |  |
| Prüfer B 5: kein Exploit ohne eigene Beobachtung; Beleg auf der Fold-Rate, die das Modell verwendet | bestanden | 4 | 0.0 s |  |
| Prüfer B 8: Short Stack – keine Raises ab einem Drittel des effektiven Stacks außer All-in (Commitment) | bestanden | 2 | 0.0 s |  |
| Prüfer B 3: Gegner-KI – starke Hände folden je nach Stil gegen sehr große Einsätze, kleine Einsätze unverändert | bestanden | 3 | 0.0 s |  |
| Prüfer B 11: River-Lead in den Aggressor – Range wertlastig geschätzt, kein Raise mit dem Bluffcatcher | bestanden | 4 | 0.0 s |  |
| Prüfer B 2: frei gewählte Größen – große Verluste nie „Gut“/„Vertretbar“, Extrapolation nie Empfehlung | bestanden | 5 | 0.0 s |  |
| Prüfer B 7: gleichgewichtsnaher Modus – reiner Bluff gegen MDF-Verteidigung nicht strukturell −EV | bestanden | 3 | 0.0 s |  |
| Prüfer B 4: Callrange-Zusammensetzung scharf bei gleicher Fold-Rate (keine mit der Größe wachsende Überschätzung der Equity) | bestanden | 4 | 0.0 s |  |
| Reaktionsmodell 2.1: Fold steigt mit der Einsatzgröße, Wahrscheinlichkeiten gültig, gleichgewichtsnaher Modus bleibt MDF | bestanden | 10 | 0.0 s |  |
| Reaktionsmodell 2.1: Gegnerwerte verschieben die Schwelle in die richtige Richtung (Fold gegen C-Bet, WTSD) | bestanden | 1 | 0.0 s |  |
| Reaktionsmodell 2.1: Callrange und Raiserange zerlegen die Weiterspielrange; Raise unmöglich, wenn der Gegner nur noch callen kann | bestanden | 3 | 0.1 s |  |
| Vergleichsrahmen: Block-Bootstrap deckt den wahren Mittelwert ab, gepaarte Differenz identischer Läufe ist 0 | bestanden | 2 | 0.1 s |  |
| Vergleichsrahmen: All-in-Bereinigung reproduziert die Abrechnung und ändert River-Entscheidungen nicht | bestanden | 3 | 2.9 s |  |
| Vergleichsrahmen: Berichtsaussagen werden aus den Daten gezählt (z. B. „in k von n Läufen vorn“) und geteilte Läufe gekennzeichnet | bestanden | 4 | 0.0 s |  |
| Version: Website, PWA, Offline-Datei, CHANGELOG und Dokumentation einheitlich (tools/check-version.js) | bestanden | 18 | 0.0 s |  |

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

1.000.000 Hände, 8.840.507 Aktionen, Invarianten (Chipbilanz, Kartenintegrität, Spieler am Zug, Einsätze) nach **jeder** Aktion geprüft: **0 Fehler**. Showdowns 244.982, Hände mit Side Pots 8.679, mit Split Pots 9.118, mit All-in 117.288, Gegnerwechsel 41.662, Nachkäufe 74.032, abgewiesene ungültige Eingaben 32.671, Bot-Rückfälle 0. Dauer 218 s auf 2 Kernen.

Konfigurationen (je 1/8): `{"cfg":{},"heroMode":null}`, `{"cfg":{},"heroMode":null}`, `{"cfg":{"rebuyBelowBB":0,"topUp":false},"heroMode":null}`, `{"cfg":{},"heroMode":"random"}`, `{"cfg":{"rake":{"on":true,"pct":0.05,"capBB":3,"nfnd":true}},"heroMode":null}`, `{"cfg":{"startBB":20,"rebuyBelowBB":5},"heroMode":"random"}`, `{"cfg":{"startBB":300},"heroMode":null}`, `{"cfg":{"difficulty":"experte","swapEvery":10},"heroMode":"random"}`.

### Kalibrierung der Gegner-KI

200.000 simulierte Hände, Werte aus der Statistik-Engine (nur öffentliche Aktionen). Zielbereiche: typische 6-max-Werte je Spielertyp. HUD-Typ: Anteil der Gegner mit ≥ 300 Händen, deren Typ nach Projektregel zum Stil passt.

| Stil | Hände | VPIP | PFR | 3-Bet | AF | C-Bet | Fold vs C-Bet | WTSD | W$SD | Zielbereiche erfüllt | HUD-Typ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| lp | 197.210 | 33.4 | 8.6 | 4.8 | 0.75 | 47.1 | 45.2 | 43.1 | 52.4 | vpip ✓, pfr ✓, af ✓, wtsd ✓ | 40/40 |
| vl | 158.800 | 44.1 | 24.9 | 12.8 | 2.61 | 64.9 | 55.3 | 29.4 | 45.3 | vpip ✓, pfr ✓, af ✓ | 30/30 |
| nit | 142.290 | 11.5 | 8.4 | 2.5 | 2.6 | 55.3 | 53.7 | 39 | 57.2 | vpip ✓, pfr ✓ | 30/30 |
| tag | 239.600 | 21.1 | 16.9 | 7 | 3.2 | 62 | 51.1 | 34.5 | 50.8 | vpip ✓, pfr ✓, threeBet ✓, af ✓ | 50/50 |
| lag | 151.370 | 30.6 | 25.3 | 10.6 | 3.79 | 65.9 | 53.8 | 30.6 | 46.3 | vpip ✓, pfr ✓, threeBet ✓, af ✓ | 29/30 |
| bal | 110.730 | 22.7 | 18 | 7.8 | 3.41 | 60.5 | 54 | 32.9 | 50.9 | vpip ✓, pfr ✓, threeBet ✓ | 20/20 |

### Coach gegen Referenz

Ein Held, der stets der Coach-Empfehlung folgt, spielt gegen die Bots; Vergleich mit einem Helden, der die Bot-Logik des Profils g004 (Stil „ausgeglichen“) nutzt (gleiche Seeds). Spielgeld-Ergebnisse streuen stark (≈ ±25 BB/100 je 2.500 Hände); sie sind nur ein grober Plausibilitätsnachweis.

| Modus | Seed | Coach BB/100 | Bot g004 BB/100 | Ø ms je Analyse | max. ms | max. Simulationen |
|---|---:|---:|---:|---:|---:|---:|
| exploitativ | 21 | 61.6 | 16.5 | 25.1 | 291 | 5000 |
| exploitativ | 22 | 28 | -10.1 | 25 | 345 | 4800 |
| exploitativ | 23 | -18.1 | -15.7 | 24.6 | 314 | 4800 |
| exploitativ | 24 | 8.3 | 28.3 | 23.3 | 344 | 4800 |
| gleichgewichtsnah | 21 | 43.1 | 16.5 | 25 | 318 | 4800 |
| gleichgewichtsnah | 22 | 17.7 | -10.1 | 25.1 | 372 | 4800 |

Mittel exploitativ: Coach 19.9 BB/100, Bot 4.8 BB/100. Mittel gleichgewichtsnah: Coach 30.4, Bot 3.2. In 2 von 6 Läufen lag der Bot vorn (aus den Daten gezählt; die Bot-Läufe je Seed dienen beiden Modi als Basis und sind keine unabhängigen Stichproben).

## Strategischer Vergleich

Erzeugt aus `tests/results/strategy.json` (Plan „haupt“, 2026-11-27T09:21:20.031Z, Node v22.23.5, 2 Kerne). 241 Läufe, 602.500 Hände, 442.434 Coach-Entscheidungen, davon von den Regeln abgelehnt: **0**. Rechenzeit 9.805 s (Summe der Läufe).

Methode: All-in-bereinigte BB/100 (unverzerrt, vor den Hauptläufen festgelegt); Rohwerte zusätzlich. 95-%-Intervalle per Block-Bootstrap (Blöcke von 500 aufeinanderfolgenden Händen, 2000 Wiederholungen, geschichtet je Lauf). Urteil: belegt, wenn das 95-%-Intervall der Differenz ganz über 0 liegt. Alle Stacks werden vor jeder Hand auf die Starttiefe gesetzt. Zufallsströme: Karten: deal; Gegner: bots; Tisch/Rotation: tisch; Coach: Tisch-Seed|Hand|Aktionszahl. Versionen: 2.1 (8aeb416982fb), 2.0.1 (8977eca6b2c0), Umgebung bcf2e37cab9b.

### Hauptvergleich: Coach 2.1 − Coach 2.0.1

Differenz **14,0 BB/100** [9,1; 18,9] über 120.000 gepaarte Hände (roh, ohne All-in-Bereinigung: 14,9 [9,1; 20,8]). Urteil: **belegt besser**. In 42 von 48 gepaarten Läufen lag 2.1 vorn, in 6 2.0.1 (Einzelläufe streuen stark; maßgeblich ist das Intervall). Entscheidungen: 2.1 168.424, 2.0.1 164.027; abgelehnte Empfehlungen 2.1 0, 2.0.1 0.

| Stacktiefe | Differenz BB/100 (bereinigt) | 95-%-Intervall | roh | Hände | 2.1 vorn | Urteil |
|---|---:|---|---:|---:|---:|---|
| 40 BB | 6,1 | [2,5; 10,0] | 5,1 | 40.000 | 14/16 | besser |
| 100 BB | 16,3 | [9,1; 23,5] | 15,9 | 40.000 | 15/16 | besser |
| 200 BB | 19,7 | [7,0; 32,7] | 23,9 | 40.000 | 13/16 | besser |

| Zusammensetzung | Differenz BB/100 (bereinigt) | 95-%-Intervall | roh | Hände | 2.1 vorn | Urteil |
|---|---:|---|---:|---:|---:|---|
| Gegner-KI, Anfänger | 15,5 | [7,8; 24,0] | 17,2 | 30.000 | 10/12 | besser |
| Gegner-KI, Experte | 18,3 | [10,1; 27,0] | 17,9 | 30.000 | 12/12 | besser |
| Gegner-KI, gemischt | 13,5 | [5,5; 21,8] | 11,8 | 30.000 | 11/12 | besser |
| halb Gegner-KI, halb synthetisch | 8,8 | [−4,7; 22,7] | 12,8 | 30.000 | 9/12 | offen |

In keiner Teilgruppe (Stacktiefe, Zusammensetzung, Bedingung) liegt das Intervall ganz unter 0.

### Alle Vergleiche

| Vergleich | Differenz BB/100 (bereinigt) | 95-%-Intervall | roh | Hände | A vorn | Urteil | geteilte Läufe |
|---|---:|---|---:|---:|---:|---|---|
| Coach 2.1 gegen Coach 2.0.1 (Hauptvergleich) | 14,0 | [9,1; 18,9] | 14,9 | 120.000 | 42/48 | belegt besser | 96 Läufe auch in: v201-bot, v21-bot, v21-potodds |
| Coach 2.1 gegen Gegner-KI als Held | 42,6 | [35,7; 49,8] | 42,9 | 120.000 | 40/48 | belegt besser | 96 Läufe auch in: v201-bot, v21-v201, v21-potodds |
| Coach 2.0.1 gegen Gegner-KI als Held | 28,6 | [22,0; 35,2] | 28,0 | 120.000 | 38/48 | belegt besser | 96 Läufe auch in: v21-bot, v21-v201 |
| Coach 2.1 gegen Referenz Pot-Odds-Schwelle | 94,5 | [84,1; 105,1] | 99,5 | 120.000 | 47/48 | belegt besser | 48 Läufe auch in: v21-v201, v21-bot |
| Coach 2.1 gegen Coach 2.0.1, dem Coach unbekannte Gegnerstrategien | 43,5 | [28,2; 58,7] | 40,9 | 30.000 | 10/12 | belegt besser | 12 Läufe auch in: v21-bot-unbekannt |
| Coach 2.1 gegen Gegner-KI als Held, unbekannte Gegnerstrategien | 165,7 | [128,8; 203,9] | 163,9 | 30.000 | 12/12 | belegt besser | 12 Läufe auch in: v21-v201-unbekannt |
| Coach 2.1 gegen Coach 2.0.1, 15 BB | −0,0 | [−1,5; 1,7] | −0,8 | 7.500 | 1/3 | zu wenig Blöcke für ein Intervall | 3 Läufe auch in: v21-pushfold |
| Coach 2.1 gegen Referenz Push/Fold, 15 BB | 7,0 | [4,7; 9,4] | 5,9 | 7.500 | 3/3 | zu wenig Blöcke für ein Intervall | 3 Läufe auch in: v21-v201-kurz |
| Coach 2.1 gegen 2.0.1, gleichgewichtsnaher Modus | −20,6 | [−35,4; −7,5] | −14,1 | 5.000 | 0/2 | zu wenig Blöcke für ein Intervall | – |

Läufe, die in mehreren Vergleichen vorkommen (z. B. ein Lauf der Gegner-KI als Held, der für 2.1 und 2.0.1 als Basis dient), sind dort **keine unabhängigen Stichproben**: Die Intervalle der betroffenen Vergleiche sind einzeln gültig, ihre Differenzen untereinander aber korreliert.

#### Gegen dem Coach unbekannte Strategien (2.1 − 2.0.1)

| Gegnerstrategie | Differenz BB/100 | 95-%-Intervall | Hände | Urteil |
|---|---:|---|---:|---|
| synthetisch: Calling Station | 176,3 | [99,5; 255,8] | 5.000 | besser |
| synthetisch: MDF-Verteidiger | −9,0 | [−32,9; 18,6] | 5.000 | offen |
| synthetisch: Maniac | 20,7 | [−9,7; 58,4] | 5.000 | offen |
| synthetisch: Rock | 13,9 | [4,3; 23,3] | 5.000 | besser |
| synthetisch: Stilwechsler | 11,3 | [−7,8; 29,1] | 5.000 | offen |
| synthetisch: zufällig-legal | 47,8 | [29,7; 65,9] | 5.000 | besser |

### Absolute Ergebnisse je Held und Bedingung

| Gruppe | Held | Bedingung | BB/100 (bereinigt) | 95-%-Intervall | roh | Hände | Entscheidungen | abgelehnt |
|---|---|---|---:|---|---:|---:|---:|---:|
| gto | Coach 2.0.1 (gleichgewichtsnah) | Gegner-KI, gemischt, 100 BB | 13,5 | [−2,9; 29,6] | 14,1 | 5.000 | 6.775 | 0 |
| gto | Coach 2.1 (gleichgewichtsnah) | Gegner-KI, gemischt, 100 BB | −7,0 | [−21,9; 7,7] | 0,0 | 5.000 | 6.979 | 0 |
| kurz | Coach 2.0.1 (exploitativ) | Gegner-KI, gemischt, 15 BB | 7,7 | [4,6; 10,6] | 8,4 | 7.500 | 7.178 | 0 |
| kurz | Coach 2.1 (exploitativ) | Gegner-KI, gemischt, 15 BB | 7,7 | [4,5; 11,0] | 7,6 | 7.500 | 7.220 | 0 |
| kurz | Referenz: Push/Fold-Chart (≤ 20 BB), sonst Pot-Odds-Schwelle | Gegner-KI, gemischt, 15 BB | 0,6 | [−3,4; 4,8] | 1,7 | 7.500 | 0 | 0 |
| unbekannt | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | synthetisch: Maniac, 100 BB | 202,2 | [160,3; 247,3] | 176,1 | 5.000 | 0 | 0 |
| unbekannt | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | synthetisch: MDF-Verteidiger, 100 BB | 33,6 | [6,4; 59,9] | 39,5 | 5.000 | 0 | 0 |
| unbekannt | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | synthetisch: zufällig-legal, 100 BB | 141,4 | [100,3; 185,6] | 130,6 | 5.000 | 0 | 0 |
| unbekannt | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | synthetisch: Rock, 100 BB | 22,6 | [3,4; 42,7] | 23,7 | 5.000 | 0 | 0 |
| unbekannt | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | synthetisch: Calling Station, 100 BB | 128,4 | [60,6; 197,4] | 132,7 | 5.000 | 0 | 0 |
| unbekannt | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | synthetisch: Stilwechsler, 100 BB | 149,8 | [97,4; 205,5] | 139,8 | 5.000 | 0 | 0 |
| unbekannt | Coach 2.0.1 (exploitativ) | synthetisch: Maniac, 100 BB | 213,3 | [146,6; 282,8] | 153,8 | 5.000 | 5.816 | 0 |
| unbekannt | Coach 2.0.1 (exploitativ) | synthetisch: MDF-Verteidiger, 100 BB | 107,1 | [78,9; 144,1] | 130,8 | 5.000 | 6.717 | 0 |
| unbekannt | Coach 2.0.1 (exploitativ) | synthetisch: zufällig-legal, 100 BB | 161,8 | [96,0; 229,1] | 172,1 | 5.000 | 6.212 | 0 |
| unbekannt | Coach 2.0.1 (exploitativ) | synthetisch: Rock, 100 BB | 37,8 | [22,9; 50,2] | 38,8 | 5.000 | 5.495 | 0 |
| unbekannt | Coach 2.0.1 (exploitativ) | synthetisch: Calling Station, 100 BB | 718,3 | [546,4; 923,0] | 714,8 | 5.000 | 9.566 | 0 |
| unbekannt | Coach 2.0.1 (exploitativ) | synthetisch: Stilwechsler, 100 BB | 172,8 | [132,1; 214,2] | 170,3 | 5.000 | 6.525 | 0 |
| unbekannt | Coach 2.1 (exploitativ) | synthetisch: Maniac, 100 BB | 233,9 | [179,6; 292,6] | 207,9 | 5.000 | 5.931 | 0 |
| unbekannt | Coach 2.1 (exploitativ) | synthetisch: MDF-Verteidiger, 100 BB | 98,1 | [73,7; 126,0] | 112,2 | 5.000 | 6.809 | 0 |
| unbekannt | Coach 2.1 (exploitativ) | synthetisch: zufällig-legal, 100 BB | 209,6 | [144,5; 282,6] | 214,4 | 5.000 | 6.442 | 0 |
| unbekannt | Coach 2.1 (exploitativ) | synthetisch: Rock, 100 BB | 51,6 | [31,4; 71,6] | 57,4 | 5.000 | 5.612 | 0 |
| unbekannt | Coach 2.1 (exploitativ) | synthetisch: Calling Station, 100 BB | 894,6 | [671,0; 1146,8] | 860,9 | 5.000 | 10.010 | 0 |
| unbekannt | Coach 2.1 (exploitativ) | synthetisch: Stilwechsler, 100 BB | 184,2 | [137,6; 232,6] | 172,9 | 5.000 | 6.696 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, Anfänger, 100 BB | 16,4 | [4,3; 27,9] | 10,4 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, Anfänger, 200 BB | 15,9 | [−12,2; 46,2] | 11,9 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, Anfänger, 40 BB | 12,8 | [4,3; 21,1] | 15,2 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, Experte, 100 BB | 2,8 | [−11,1; 16,0] | 5,7 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, Experte, 200 BB | 1,2 | [−14,7; 17,1] | 6,1 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, Experte, 40 BB | −0,7 | [−7,7; 6,1] | 0,6 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, gemischt, 100 BB | −0,7 | [−11,5; 8,4] | 4,4 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, gemischt, 200 BB | 11,5 | [−7,8; 28,7] | 9,1 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | Gegner-KI, gemischt, 40 BB | 1,2 | [−5,2; 7,3] | −0,4 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | halb Gegner-KI, halb synthetisch, 100 BB | 108,0 | [76,5; 139,9] | 121,5 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | halb Gegner-KI, halb synthetisch, 200 BB | 163,3 | [119,4; 213,2] | 174,6 | 10.000 | 0 | 0 |
| zentral | Gegner-KI als Held (Profil g004, Stil ausgeglichen) | halb Gegner-KI, halb synthetisch, 40 BB | 39,1 | [19,5; 61,4] | 33,0 | 10.000 | 0 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, Anfänger, 100 BB | 26,3 | [11,2; 41,1] | 25,7 | 10.000 | 14.224 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, Anfänger, 200 BB | 33,8 | [−1,9; 67,2] | 29,4 | 10.000 | 14.101 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, Anfänger, 40 BB | 15,9 | [4,7; 27,4] | 28,5 | 10.000 | 13.993 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, Experte, 100 BB | 3,0 | [−10,5; 16,9] | 6,2 | 10.000 | 13.121 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, Experte, 200 BB | 17,5 | [−9,9; 46,0] | 32,7 | 10.000 | 13.178 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, Experte, 40 BB | 11,2 | [1,5; 21,3] | 7,9 | 10.000 | 12.833 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, gemischt, 100 BB | 2,4 | [−9,8; 13,9] | 7,1 | 10.000 | 13.502 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, gemischt, 200 BB | −0,9 | [−17,3; 15,7] | −4,2 | 10.000 | 13.735 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | Gegner-KI, gemischt, 40 BB | 9,5 | [2,9; 16,2] | 4,4 | 10.000 | 13.228 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | halb Gegner-KI, halb synthetisch, 100 BB | 172,1 | [134,9; 211,7] | 178,8 | 10.000 | 14.269 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | halb Gegner-KI, halb synthetisch, 200 BB | 331,8 | [272,3; 396,9] | 316,7 | 10.000 | 14.006 | 0 |
| zentral | Coach 2.0.1 (exploitativ) | halb Gegner-KI, halb synthetisch, 40 BB | 91,5 | [68,2; 116,5] | 94,5 | 10.000 | 13.837 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, Anfänger, 100 BB | 51,6 | [29,8; 76,8] | 51,7 | 10.000 | 14.960 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, Anfänger, 200 BB | 43,8 | [10,7; 77,6] | 43,6 | 10.000 | 14.799 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, Anfänger, 40 BB | 27,1 | [15,7; 37,6] | 39,9 | 10.000 | 14.613 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, Experte, 100 BB | 21,6 | [8,3; 36,7] | 24,1 | 10.000 | 13.195 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, Experte, 200 BB | 44,8 | [14,9; 70,0] | 56,1 | 10.000 | 13.218 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, Experte, 40 BB | 20,3 | [10,2; 30,0] | 20,4 | 10.000 | 12.916 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, gemischt, 100 BB | 10,7 | [−4,2; 25,2] | 15,5 | 10.000 | 13.693 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, gemischt, 200 BB | 25,0 | [0,5; 54,8] | 22,5 | 10.000 | 14.095 | 0 |
| zentral | Coach 2.1 (exploitativ) | Gegner-KI, gemischt, 40 BB | 15,7 | [6,1; 25,3] | 4,9 | 10.000 | 13.499 | 0 |
| zentral | Coach 2.1 (exploitativ) | halb Gegner-KI, halb synthetisch, 100 BB | 184,8 | [146,5; 224,7] | 190,1 | 10.000 | 14.749 | 0 |
| zentral | Coach 2.1 (exploitativ) | halb Gegner-KI, halb synthetisch, 200 BB | 347,3 | [286,9; 411,0] | 348,0 | 10.000 | 14.527 | 0 |
| zentral | Coach 2.1 (exploitativ) | halb Gegner-KI, halb synthetisch, 40 BB | 89,6 | [64,8; 113,8] | 90,4 | 10.000 | 14.160 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, Anfänger, 100 BB | −53,2 | [−75,9; −29,1] | −51,2 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, Anfänger, 200 BB | −85,0 | [−115,0; −53,2] | −85,9 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, Anfänger, 40 BB | −41,3 | [−53,1; −28,7] | −35,4 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, Experte, 100 BB | −97,1 | [−120,3; −75,8] | −106,0 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, Experte, 200 BB | −122,0 | [−160,2; −88,3] | −120,2 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, Experte, 40 BB | −66,9 | [−82,3; −51,5] | −68,6 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, gemischt, 100 BB | −104,0 | [−125,5; −80,6] | −99,2 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, gemischt, 200 BB | −94,8 | [−123,5; −67,5] | −92,9 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | Gegner-KI, gemischt, 40 BB | −57,3 | [−67,8; −46,1] | −57,1 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | halb Gegner-KI, halb synthetisch, 100 BB | 144,5 | [90,2; 197,4] | 145,0 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | halb Gegner-KI, halb synthetisch, 200 BB | 270,1 | [192,0; 354,3] | 222,5 | 10.000 | 0 | 0 |
| zentral | Referenz: Pot-Odds-Schwelle | halb Gegner-KI, halb synthetisch, 40 BB | 54,8 | [30,1; 79,5] | 61,9 | 10.000 | 0 | 0 |

### Empfohlene Einsatzgrößen postflop (Bet ohne offenen Einsatz)

| Version | ⅓ | ½ | ¾ | Pot | Overbet | All-in | Check | Call | Fold |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2.1 | 5.382 | 2.389 | 4.009 | 6.460 | 1.837 | 2.532 | 18.927 | 3.625 | 8.467 |
| 2.0.1 | 3.505 | 1.713 | 1.933 | 4.836 | 2.278 | 2.537 | 21.230 | 3.113 | 7.160 |

Empfehlung ≠ höchster Modell-EV (Preflop-Anker am Faustregel-Chart): 2.1 in 43.048 von 217.144 Entscheidungen (19,8 %), mittlerer Modellabstand 0,42 BB; 2.0.1 in 42.111 (19,9 %), 0,35 BB.

Rechenzeit je Entscheidung (Node, ohne Zeitbremse): 2.1 Ø 25,7 ms, höchstens 360 ms; 2.0.1 Ø 14,5 ms, höchstens 351 ms. Höchstzahl Simulationen je Entscheidung: 2.1 5.000, 2.0.1 5.000 (Grenze 5.000).

### Gepaarte Rollout-Bewertung je Entscheidungspunkt (2.1 − 2.0.1)

24 Sessions, 9.600 Hände, 12.967 Entscheidungspunkte; verschiedene Empfehlung in 1.021 Punkten (7,9 %). Je Unterschied 100 gepaarte Rollouts je Aktion (gepaarte Rollouts je Entscheidungspunkt; Fortsetzung des Helden mit Gegner-KI-Profil g004; Cluster-Bootstrap über Hände (2.000 Wiederholungen)). Mittlere EV-Differenz je verschiedenem Punkt **0,822 BB** [−0,082; 1,718] → nicht belegt; umgerechnet auf alle Punkte 0,0647 BB je Entscheidung [−0,0064; 0,1353].

| Gruppe | Punkte mit Unterschied | Anteil an allen Punkten | mittlere Differenz (BB) | 95-%-Intervall | Urteil |
|---|---:|---:|---:|---|---|
| alle | 1.021 | 7,9 % | 0,822 | [−0,082; 1,718] | nicht belegt |
| Gegner-KI (bekannt) | 639 | 9,9 % | 1,466 | [0,622; 2,320] | 2.1 belegt besser |
| unbekannte Strategien | 382 | 5,9 % | −0,256 | [−2,274; 1,670] | nicht belegt |
| preflop | 234 | – | −0,140 | [−2,122; 1,842] | nicht belegt |
| postflop Bet vs. Check | 451 | – | 1,425 | [0,170; 2,607] | 2.1 belegt besser |
| postflop Größe | 288 | – | 0,024 | [−1,249; 1,279] | nicht belegt |
| postflop gegen Einsatz | 48 | – | 4,634 | [−3,961; 12,821] | nicht belegt |
| Multiway (postflop) | 160 | – | 0,476 | [−2,133; 3,073] | nicht belegt |
| Preflop | 234 | – | −0,140 | [−2,122; 1,842] | nicht belegt |
| Flop | 411 | – | 0,871 | [−0,288; 2,001] | nicht belegt |
| Turn | 217 | – | 1,385 | [−0,678; 3,698] | nicht belegt |
| River | 159 | – | 1,342 | [−0,956; 3,512] | nicht belegt |

Häufigste Paare (Empfehlung 2.1 ↔ 2.0.1, Beträge durch # ersetzt): Bet ¾ Pot ↔ Check (212, 1,35 BB); Bet Pot ↔ Check (89, 3,14 BB); Bet ⅓ Pot ↔ Check (86, 0,29 BB); Call # ↔ Fold (55, 6,39 BB); Open # BB ↔ Fold (53, 0,53 BB); #-Bet #× ↔ Call # (50, −5,27 BB); Fold ↔ Call # (49, −6,93 BB); Bet Pot ↔ Bet ¾ Pot (39, −0,70 BB).

Grenze: Nach der ersten Aktion spielt der Held mit der festen Politik g004 weiter; gemessen wird die erste Aktion, nicht die ganze Linie des Coaches. Die verdeckten Karten der Gegner sind die echten (nur Auswertung).

#### Größenstudie „base-bots“ (2.095 Spots, davon 1.621 ohne offenen Einsatz)

| Größe | Beobachtungen | Fold beobachtet | Fold Modell | Raise beobachtet | Raise Modell |
|---|---:|---:|---:|---:|---:|
| 0.33 Pot | 1.885 | 35 % | 27 % | 5 % | 14 % |
| 0.5 Pot | 1.874 | 48 % | 36 % | 5 % | 13 % |
| 0.75 Pot | 1.877 | 55 % | 45 % | 5 % | 11 % |
| 1 Pot | 1.873 | 62 % | 48 % | 6 % | 10 % |
| 1.5 Pot | 1.859 | 73 % | 48 % | 6 % | 10 % |

| Strategie über dieselben Spots | Wert gegen „immer Check“ (BB je Spot) | Standardfehler |
|---|---:|---:|
| Modell (beste EV) | −0,12 | 0,47 |
| Modell, Größe frei nach Ausspielung (Orakel) | 3,91 | 0,48 |
| immer Check | 0,00 | 0,00 |
| Modell entscheidet Bet/Check, Größe fest 0.33 | 0,08 | 0,41 |
| immer Bet 0.33 | 0,64 | 0,47 |
| Modell entscheidet Bet/Check, Größe fest 0.5 | 0,32 | 0,41 |
| immer Bet 0.5 | 0,59 | 0,50 |
| Modell entscheidet Bet/Check, Größe fest 0.75 | −0,26 | 0,47 |
| immer Bet 0.75 | −0,27 | 0,56 |
| Modell entscheidet Bet/Check, Größe fest 1 | −0,22 | 0,50 |
| immer Bet 1 | −0,05 | 0,61 |
| Modell entscheidet Bet/Check, Größe fest 1.5 | −0,37 | 0,53 |
| immer Bet 1.5 | 0,17 | 0,65 |

#### Größenstudie „v21b-bots“ (578 Spots, davon 466 ohne offenen Einsatz)

| Größe | Beobachtungen | Fold beobachtet | Fold Modell | Raise beobachtet | Raise Modell |
|---|---:|---:|---:|---:|---:|
| 0.33 Pot | 576 | 28 % | 31 % | 4 % | 6 % |
| 0.5 Pot | 571 | 39 % | 40 % | 4 % | 6 % |
| 0.75 Pot | 576 | 49 % | 49 % | 4 % | 6 % |
| 1 Pot | 574 | 56 % | 54 % | 5 % | 6 % |
| 1.5 Pot | 572 | 69 % | 59 % | 6 % | 6 % |

| Strategie über dieselben Spots | Wert gegen „immer Check“ (BB je Spot) | Standardfehler |
|---|---:|---:|
| Modell (beste EV) | −1,39 | 1,06 |
| Modell, Größe frei nach Ausspielung (Orakel) | 5,97 | 0,96 |
| immer Check | 0,00 | 0,00 |
| Modell entscheidet Bet/Check, Größe fest 0.33 | 0,16 | 0,83 |
| immer Bet 0.33 | 0,29 | 0,90 |
| Modell entscheidet Bet/Check, Größe fest 0.5 | 0,34 | 0,81 |
| immer Bet 0.5 | 0,18 | 0,92 |
| Modell entscheidet Bet/Check, Größe fest 0.75 | −0,58 | 0,90 |
| immer Bet 0.75 | −0,97 | 1,02 |
| Modell entscheidet Bet/Check, Größe fest 1 | −1,90 | 1,11 |
| immer Bet 1 | −2,53 | 1,24 |
| Modell entscheidet Bet/Check, Größe fest 1.5 | −2,78 | 1,27 |
| immer Bet 1.5 | −2,97 | 1,41 |

#### Größenstudie „v21b-synth“ (605 Spots, davon 409 ohne offenen Einsatz)

| Größe | Beobachtungen | Fold beobachtet | Fold Modell | Raise beobachtet | Raise Modell |
|---|---:|---:|---:|---:|---:|
| 0.33 Pot | 759 | 22 % | 20 % | 8 % | 5 % |
| 0.5 Pot | 751 | 23 % | 27 % | 8 % | 5 % |
| 0.75 Pot | 751 | 25 % | 34 % | 8 % | 5 % |
| 1 Pot | 738 | 26 % | 39 % | 8 % | 5 % |
| 1.5 Pot | 720 | 29 % | 43 % | 8 % | 5 % |

| Strategie über dieselben Spots | Wert gegen „immer Check“ (BB je Spot) | Standardfehler |
|---|---:|---:|
| Modell (beste EV) | 1,27 | 1,80 |
| Modell, Größe frei nach Ausspielung (Orakel) | 5,64 | 1,90 |
| immer Check | 0,00 | 0,00 |
| Modell entscheidet Bet/Check, Größe fest 0.33 | −3,11 | 1,72 |
| immer Bet 0.33 | −4,50 | 1,88 |
| Modell entscheidet Bet/Check, Größe fest 0.5 | −1,65 | 1,79 |
| immer Bet 0.5 | −3,89 | 1,97 |
| Modell entscheidet Bet/Check, Größe fest 0.75 | −0,43 | 1,88 |
| immer Bet 0.75 | −2,06 | 2,17 |
| Modell entscheidet Bet/Check, Größe fest 1 | 0,73 | 1,87 |
| immer Bet 1 | −1,44 | 2,20 |
| Modell entscheidet Bet/Check, Größe fest 1.5 | 1,97 | 1,93 |
| immer Bet 1.5 | −1,63 | 2,26 |

#### River-Modellspiel (24 Spots aus Simulationen)

| Stärkegruppen | Exploitability im Kombinationsspiel Ø | max. | Rechenzeit Ø |
|---:|---:|---:|---:|
| 5 | 1,19 % Pot | 2,81 % | 19 ms |
| 10 | 0,46 % Pot | 0,76 % | 39 ms |
| 20 | 0,31 % Pot | 0,82 % | 69 ms |
| 40 | 0,24 % Pot | 0,75 % | 141 ms |

| Stärkegruppen | Lösung ohne Raises im Spiel mit Raises Ø (max.) | Lösung mit Raises Ø (max.) | Rechenzeit mit Raises |
|---:|---:|---:|---:|
| 10 | 17,18 % (34,09 %) | 0,91 % (1,61 %) | 74 ms |
| 20 | 17,09 % (32,88 %) | 0,48 % (0,99 %) | 126 ms |

Konvergenz (10 Gruppen, mit Raises, Exploitability im Modellspiel): 100 Iterationen 0,282 %, 300 Iterationen 0,057 %, 700 Iterationen 0,015 %, 2500 Iterationen 0,002 %.


## Browser-Tests lokal (Playwright, Chrome)

Ausgeführt: 2026-11-27T09:40:02.330Z · http://127.0.0.1:8767/ · **52 bestanden, 0 fehlgeschlagen**

| Test | Ergebnis | Prüfungen | Dauer | Hinweise |
|---|---|---:|---:|---|
| Laden: keine Fehler, Leistungswerte (LCP, CLS, Ladezeit) | bestanden | 3 | 1.1 s | Ladezeit 222 ms, bereit nach 317 ms, LCP 132 ms, CLS 0.004 |
| Hand spielen: Tipp „vorher“ erscheint binnen 2 Sekunden, keine neue Hand ohne „Nächste Hand“ | bestanden | 15 | 24.8 s | 59 Tipps, Ø 37 ms, max. 187 ms |
| Ungültiger Betrag, Tastatursteuerung, Tipp-Modi „nachher“ und „aus“ | bestanden | 11 | 4.4 s |  |
| Live-Anzeige und Gegnerdetails, Dialog mit Esc schließen | bestanden | 3 | 0.1 s |  |
| Alle Bereiche öffnen; Range-Matrix, Gegnerliste, Fortschritt, Hilfe | bestanden | 13 | 4.9 s |  |
| Export und Import der Datenbank, beschädigte Datei wird abgelehnt | bestanden | 8 | 2.9 s |  |
| Sicherheit: manipulierte Sicherung mit Skript in Lerndaten wird abgelehnt (keine Ausführung) | bestanden | 2 | 0.3 s |  |
| Handhistorie und Replayer: vor, zurück, damals/später bekannt, Entscheidung erneut treffen | bestanden | 5 | 5.6 s |  |
| Training: Kategorie starten, Situation bewerten, Quiz | bestanden | 5 | 1.5 s |  |
| Einstellungen: Darstellung, neue Session mit Seed | bestanden | 3 | 0.9 s |  |
| Neuladen während einer laufenden Hand: exakte Wiederaufnahme | bestanden | 3 | 3.3 s |  |
| Mehrere Tabs: zweiter Tab ist schreibgeschützt | bestanden | 3 | 0.7 s |  |
| Daten bleiben nach Neustart erhalten | bestanden | 1 | 0.5 s |  |
| Offline: Service Worker installiert, Seite lädt und spielt ohne Netz | bestanden | 3 | 3.9 s |  |
| Browser ohne Sprachfunktion: Meldung, Trainer läuft weiter | bestanden | 2 | 6.2 s |  |
| Darstellung auf Smartphone, Tablet und Desktop (kein horizontales Scrollen) | bestanden | 40 | 27.8 s |  |
| Barrierefreiheit: Namen für Bedienelemente, Bilder mit Alt, Fokusreihenfolge, Kontrast | bestanden | 7 | 0.5 s | Kontrast Nebentext 6.48:1, Text 17.07:1 |
| Portable Einzeldatei (file://): lädt, spielt, Coach per Blob-Worker | bestanden | 2 | 9.6 s |  |
| Start: erster Aufruf ohne Datenbank legt den Speicher an; vorhandene Datenbank wird geladen | bestanden | 7 | 2.3 s | erster Start bereit nach 283 ms |
| Start: beschädigte lokale Daten (manipulierte IndexedDB-Einträge) → Start, Hinweis, kein eingeschleustes HTML | bestanden | 6 | 8.4 s |  |
| Start: beschädigte laufende Hand wird verworfen, Tischstand bleibt erhalten | bestanden | 3 | 5.2 s |  |
| Start: Lesefehler beim Laden → Fehleranzeige mit Wiederherstellung, Trainer läuft ohne Speicherung weiter | bestanden | 8 | 5.0 s |  |
| Start: langsame Initialisierung (IndexedDB antwortet nach 2,5 s) → normaler Start, Ladeanzeige nur vorübergehend | bestanden | 4 | 5.1 s | bereit nach 2774 ms |
| Start: IndexedDB antwortet nie → nach Zeitlimit spielbar ohne Speicherung, Hinweis mit „Neu laden“, kein Dauer-„Lade …“ | bestanden | 4 | 8.4 s |  |
| Start: Programmdatei fehlt / App startet nie → Fehleranzeige; Rohsicherung, Zurücksetzen nur nach Sicherung, Import der Rohsicherung | bestanden | 11 | 26.7 s | Fehleranzeige nach 20129 ms |
| Start: abgesicherter Start (?start=sicher) lädt und verändert keine gespeicherten Daten | bestanden | 5 | 4.7 s |  |
| Start: Web Worker nicht verfügbar oder Worker-Datei fehlt → Coach rechnet im Hauptthread | bestanden | 4 | 4.8 s |  |
| Start: keine Sprachfunktion (fehlend oder gesperrt) → Hinweis, Trainer läuft ohne Ton | bestanden | 6 | 4.7 s |  |
| Start: privater Modus ohne IndexedDB → localStorage mit Hinweis; ohne jeden Speicher → nur Sitzung | bestanden | 10 | 6.8 s |  |
| Start: installierte PWA (start_url) und Browser-Tab – offline, gleiche Daten, Übernahme nach Schließen | bestanden | 5 | 7.7 s |  |
| Sicherheit: Sicherung mit HTML in allen Textfeldern und extremen Zahlen → nur als Text angezeigt (alle Ansichten, Replayer, Dialog) | bestanden | 6 | 12.1 s |  |
| Daten: zu große Datei (über der Importgrenze) sofort abgelehnt; große gültige Sicherung wird im Worker geprüft, Oberfläche bleibt bedienbar | bestanden | 2 | 12.3 s | Importprüfung 34 MB: 2714 ms, längste Blockade 500 ms |
| Daten: Migration aus Entwurf 2 (alte IndexedDB) mit automatischer Sicherung | bestanden | 4 | 3.2 s |  |
| Daten: Umstellung auf Datenformat 3 mit Sicherungs-Download beim Start gilt nicht als hängender Start | bestanden | 4 | 7.4 s |  |
| Daten: vollständige Sicherung, Löschen (mit Sicherung) und Wiederherstellung ergeben denselben Stand | bestanden | 4 | 7.9 s |  |
| Daten: schreibgeschützter zweiter Tab kann weder importieren, löschen noch eine Session starten; schreibt nichts | bestanden | 5 | 4.5 s |  |
| Daten: PWA-Update während einer laufenden Hand wird zurückgestellt; danach ohne Datenverlust aktualisiert | bestanden | 6 | 9.2 s |  |
| Barrierefreiheit: axe-core (WCAG 2.2 AA) – Tisch, Coach, alle Bereiche, Dialoge, Replayer, hell und dunkel | bestanden | 28 | 38.6 s |  |
| Barrierefreiheit: vollständige Tastaturbedienung, Fokusreihenfolge, sichtbarer und nicht verdeckter Fokus | bestanden | 10 | 14.3 s | 6 Hände nur mit Tastatur gespielt |
| Barrierefreiheit: Dialog mit Fokusfalle, Esc, Hintergrund gesperrt (inert), Fokus-Rückgabe; Range-Matrix mit Pfeiltasten | bestanden | 9 | 1.9 s |  |
| Barrierefreiheit: Live-Regionen sparsam, Ansagen beim eigenen Zug, Karten, verständliche Coach-Texte, reduzierte Bewegung, Zielgrößen | bestanden | 10 | 3.1 s |  |
| Barrierefreiheit: Accessibility-Baum der zentralen Abläufe (Playwright ariaSnapshot, Ersatz für Screenreader-Test) | bestanden | 10 | 3.8 s |  |
| Prüfung C10: Handende liest nicht alle gespeicherten Hände (kein getAll), Obergrenze 3.000 bleibt, älteste werden entfernt | bestanden | 2 | 4.1 s | Hand mit 3.006 gespeicherten Händen in 631 ms |
| Prüfung C12: beschädigte lokale Einträge – Rohsicherung vor dem ersten Überschreiben (Start, einmal je Befund) und vor dem Import | bestanden | 5 | 8.8 s |  |
| Prüfung C15: ohne Web Locks – neuer Tab gibt das Schreiben ab, wenn der beschäftigte schreibende Tab verspätet antwortet | bestanden | 2 | 3.7 s |  |
| Prüfung C16: Neu geladener schreibender Tab (Update) übernimmt die Sperre vom wartenden Tab; alter Programmstand startet keinen neuen Worker | bestanden | 5 | 3.0 s |  |
| Prüfung D (t1/t1b): Fokus bleibt beim Neuzeichnen erhalten – Gegnerplatz, Hinweisleiste, eigene Aktion, Replayer, Gegnerliste | bestanden | 6 | 7.1 s |  |
| Prüfung D (t6, t10, t2, t5): Quiz-Fokus und -Ansage, Sprunglink, Kürzel auf Knöpfen, einmalige Zug-Ansage, Statusmeldungen, Handverlauf per Tastatur, noscript | bestanden | 11 | 4.2 s |  |
| Prüfung D (t4/t7): Tisch ohne Überdeckungen (eigene Karten, Pot, Board, Einsätze, Marker) bei 320–1366 px; Werte am Platz mit Textabständen nicht abgeschnitten | bestanden | 1 | 4.5 s |  |
| Prüfung C3: Rohsicherung ohne lesbare IndexedDB gilt als unvollständig – Zurücksetzen nur nach ausdrücklicher Bestätigung; Fokus nach „Weiter warten“ (D t12) | bestanden | 6 | 5.1 s |  |
| Netzwerk: keine Verbindung zu fremden Adressen (alle Seiten, alle Tests) | bestanden | 2 | 0.0 s |  |
| Konsole: keine JavaScript-Fehler, keine 404 | bestanden | 1 | 0.0 s |  |

Gemessen (lokaler Server, Desktop-Chrome ohne Drosselung): Ladezeit 222 ms, bereit nach 317 ms, LCP 132 ms, CLS 0.004, Tipp nach Zugbeginn Ø 37 ms (max. 187 ms), übertragene Daten 586 KB.

## Live-Website

Geprüft am 2026-11-26T19:20:00Z unter https://milkiasasmarome-eng.github.io/pokertrainer/ (integrierter Browser der Claude-Desktop-App (Chromium), Desktop und Mobil-Emulation 375 × 812):

- ✓ Seite lädt über HTTPS, App startklar, Version 2.0.1: PT.VERSION 2.0.1, Fußzeile 2.0.1
- ✓ Update-Ablauf für bestehende Installation: Hinweis „Neue Version bereit“ erschien; während einer laufenden Hand wurde das Update zurückgestellt; nach der Hand aktiviert, alter Cache 2.0.0 gelöscht, neuer Cache pokertrainer-2.0.1-b029524f89e3
- ✓ Service Worker kontrolliert die Seite, Manifest erreichbar: sw.js aktiv, manifest.webmanifest gültig
- ✓ Hinweis im Tippfeld: „Faustregel, kein Solver-Ergebnis“
- ✓ 6 Hände mit Coach im Modus „vorher“ gespielt, Empfehlungen ausgeführt: 11 Tipps, längste Anzeigezeit 413 ms, höchstens 2.100 Simulationen je Entscheidung
- ✓ Preflop-Empfehlungen plausibel: QQ CO 3-Bet, 82o HJ Fold, A6s UTG Open 2 BB, T7o BB Fold, J8o SB Fold
- ✓ Alle Bereiche öffnen (Training, Handhistorie, Ranges, Gegner, Fortschritt, Einstellungen, Hilfe)
- ✓ Keine Konsolenfehler
- ✓ Keine externen Anfragen: 20 Ressourcen, alle vom eigenen Ursprung
- ✓ Smartphone-Ansicht 375 px: kein horizontales Scrollen, Kurz-Tipp über den Aktionen sichtbar

