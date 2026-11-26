# Testbericht und Qualitätsbewertung – PokerTrainer 2.0.1

Stand: 26.11.2026. Alle Zahlen stammen aus tatsächlich ausgeführten Läufen; die Rohdaten stehen in `tests/results/*.json`, die automatisch erzeugte Übersicht in [TESTERGEBNISSE.md](TESTERGEBNISSE.md).

## 1. Was geprüft wurde

| Bereich | Prüfung | Ergebnis |
|---|---|---|
| Handbewertung | alle 2.598.960 Fünf-Karten-Hände gegen Referenzimplementierung; alle 133.784.560 Sieben-Karten-Kombinationen (Kategorienhäufigkeiten exakt); 300.000 zufällige Sieben-Karten-Paare | 0 Abweichungen |
| Regeln | 1.000.000 simulierte Hände in 8 Konfigurationen (Invarianten nach jeder Aktion: Chipsumme, Pots, Reihenfolge, Mindest-Raise, Wiedereröffnung) | 0 Fehler, 0 hängende Hände, 8.778 Side-Pot- und 9.347 Split-Pot-Hände, 33.724 ungültige Eingaben korrekt abgewiesen |
| Regeln (unabhängig) | Prüfer A: 300.000 Zufallshände gegen eine eigene Referenz-Zustandsmaschine, 57 handgerechnete Szenarien | 0 Abweichungen |
| Equity | exakte Enumeration gegen Brute Force; Monte-Carlo-Abdeckung; Mehrgegner; Side-Pot-Anteile | siehe Grenzen (Randfälle bei „Präzise“) |
| EV-Engine | Pot Odds aus zahlbarem Betrag, Rückgabe nicht gecallter Beträge, Multiway-Teilmengen, Call-Zweig, Jam-Zweig, Dead Money | korrekt nach Korrektur der Befunde B2–B4 |
| CFR+ | analytisches River-Spiel (Bluffanteil, Call-Häufigkeit), 4 analytische und 18 zufällige Spiele (Prüfer A) | Exploitability → 0, Werte exakt |
| Statistik | 17 HUD-Werte gegen Kontrollzählung (Prüfer A: 2,04 Mio. Vergleiche) | 0 Abweichungen |
| Gegner-KI | 200.000 Hände, 6 Stile, Zielbereiche je Stil, HUD-Typ-Zuordnung | alle Zielbereiche erreicht; HUD-Typ 199 von 200 Spielern passend |
| Coach gegen Bots | 6 × 2.500 Hände, Held = Coach-Empfehlung vs. derselbe Platz mit Bot-Strategie | siehe Abschnitt 3 |
| Oberfläche | 19 Browsertests (Chrome/Playwright): Hand spielen, Tipp ≤ 2 s, Modi, Tastatur, Import/Export inkl. Sicherung vor Import und XSS-Abwehr, Replayer, Training, Wiederaufnahme, Mehrere Tabs, Neustart, Offline, ohne Sprachfunktion, 3 Bildschirmgrößen, Barrierefreiheit, Einzeldatei per file://, Konsole | alle bestanden |
| Leistung | LCP, CLS, Tippzeit | LCP 110–170 ms, CLS 0,004, Tipp im Mittel ≈ 20 ms, höchstens ≈ 100 ms |
| Website | Live-Test der veröffentlichten Seite (siehe TESTERGEBNISSE, Abschnitt Live) | siehe dort |

## 2. Unabhängige Prüfung

Zwei Prüfagenten haben 2.0.0 getrennt geprüft. Gefunden wurden 8 Befunde in Regeln/Mathematik (2 schwer) und 17 in Strategie/UX/Sicherheit (4 schwer). Alle sind in 2.0.1 behoben und als Regressionstests nachgestellt; Liste in [AUDIT.md](AUDIT.md). Besonders wichtig:

- Der Coach empfahl preflop 3-Bets, 4-Bets und Opens mit beliebigen Händen. Ursache: größenunabhängige Fold-Raten. Jetzt: größenabhängige Folds, Spielbarkeit der Starthand und der Faustregel-Chart als Anker. Ergebnis im Raster über alle 169 Klassen: CO öffnet 60 Klassen, UTG 37, BTN 91; BB gegen BTN-Open: 29 × 3-Bet, 71 × Call, 69 × Fold.
- XSS über eine manipulierte Sicherung (nur in der Einzeldatei ausführbar, auf der Website von der CSP blockiert) ist geschlossen; Lerndaten werden streng geprüft.

## 3. Coach gegen die Computergegner

| Lauf | Coach (BB/100) | Bot auf demselben Platz (BB/100) |
|---|---:|---:|
| exploitativ, Seed 21 | 61,6 | 16,5 |
| exploitativ, Seed 22 | 28,0 | −10,1 |
| exploitativ, Seed 23 | −18,1 | −15,7 |
| exploitativ, Seed 24 | 8,3 | 28,3 |
| gleichgewichtsnah, Seed 21 | 43,1 | 16,5 |
| gleichgewichtsnah, Seed 22 | 17,7 | −10,1 |
| **Mittel exploitativ** | **19,9** | **4,8** |
| **Mittel gleichgewichtsnah** | **30,4** | **3,2** |

Vor den Korrekturen lag der Coach bei 3,7 gegenüber 3,0 BB/100. Einordnung: 2.500 Hände je Lauf haben eine Standardabweichung von grob ±20 BB/100; ein einzelner Lauf sagt wenig, der Mittelwert über 10.000 Hände (exploitativ) liegt mit etwa ±10 BB/100 Unsicherheit über dem Bot. Spielgeld-Ergebnisse sind kein Beweis für richtige Einzelentscheidungen; dafür gibt es die Regressionstests mit festen Spots.

## 4. Qualitätsbewertung (gewichtet, ehrlich)

| Bereich | Gewicht | Note (0–10) | Begründung |
|---|---:|---:|---|
| Regelkorrektheit | 15 % | 9,8 | 1 Mio. Hände und unabhängige Referenz ohne Abweichung; Sonderfälle mit Tests |
| Mathematik (Bewertung, Equity, Pot Odds) | 15 % | 9,5 | vollständige Enumeration; kleine Monte-Carlo-Randabweichung bei „Präzise“ |
| Coach-Strategie | 20 % | 8,3 | begründete Heuristik mit Unsicherheitsangabe, preflop am Chart verankert; kein Solver, postflop eher große Einsätze, Reaktionsmodell vereinfacht |
| Gegner-KI | 10 % | 8,8 | kalibriert, alle Zielbereiche erreicht; Anpassung an den Spieler begrenzt |
| Lernsystem | 10 % | 8,8 | Historie, Replayer, Fehlerdatenbank, 14 Kategorien, SRS, Quiz; Lernwirkung nicht empirisch geprüft |
| Oberfläche und Barrierefreiheit | 10 % | 8,8 | responsiv, Tastatur, Namen für Bedienelemente, Kontrast geprüft; kein Test mit echtem Screenreader |
| Leistung | 5 % | 9,6 | schnelle Ladezeit, Tipps weit unter 2 s |
| Sicherheit und Datenschutz | 10 % | 9,2 | nur lokale Daten, strikte CSP, strenge Importprüfung; Anbieterkennzeichnung offen |
| Dokumentation, Tests, Bereitstellung | 5 % | 9,3 | automatische Tests vor jeder Veröffentlichung, Doku für Menschen und KI-Assistenten |
| **Gesamt** | 100 % | **9,1** | |

**Das Ziel 9,5 ist nicht erreicht.** Die größte Lücke ist die Coach-Strategie: Ein heuristisches Modell kann einen echten Solver nicht ersetzen. Ohne Solver und ohne Server ist eine deutlich höhere Note hier nach meiner Einschätzung nicht ehrlich zu vergeben.

## 5. Bekannte Grenzen

- **Kein GTO-Solver.** Empfehlungen sind Modellschätzungen („Faustregel, kein Solver-Ergebnis“). Das River-Modellspiel ist ein vereinfachtes Gleichgewicht (eine bis zwei Größen, keine Raises, 10 Stärkegruppen).
- **Reaktionsmodell:** Fold-/Call-Wahrscheinlichkeiten beruhen auf MDF, Range-Zusammensetzung, konservativem Abschlag und (exploitativ) geglätteten Gegnerwerten. Die Größenwahl postflop bevorzugt eher große Einsätze; ½ Pot wird selten empfohlen.
- **Preflop-Anker:** Abweichungen vom Faustregel-Chart werden nur bei belegtem Exploit empfohlen. Gegen die Computergegner wären manche Bluff-3-Bets kurzfristig profitabel; der Coach empfiehlt sie erst, wenn die eigenen Beobachtungen das stützen.
- **Monte-Carlo am Rand:** Bei Equity nahe 0 oder 1 und Stufe „Präzise“ weicht der Mittelwert um etwa 0,17 Prozentpunkte ab, das 95-%-Intervall deckt dort etwa 84–86 % statt 95 % ab (Prüfskript von Prüfer A, je 600 Läufe). Für Entscheidungen ohne Bedeutung, aber dokumentiert.
- **Sprachausgabe** nur mit lokaler deutscher Systemstimme (keine Online-Stimmen, keine Verbindung nach außen).
- **Anbieterkennzeichnung:** Ob für diese private, kostenlose Seite ein Impressum nötig ist, ist offen; Name und Anschrift wurden nicht erfunden (`PRIVACY.md`).
- **Final Acceptance Test** nach Projektanweisung steht für 2.0.1 noch aus (siehe Abschlussbericht).
