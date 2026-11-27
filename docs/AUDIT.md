# Audit von Entwurf 2 (Ausgangsversion)

Geprüft wurde der Quellcode von `PokerTrainer_Entwurf` (Entwurf 2, Artefakt-Version 1795663727-9736, 2.229 Zeilen, eine HTML-Datei mit `<script id="engine">` und `<script id="ui">`). Die frühere Bewertung „7,8 von 10“ wurde nicht übernommen, sondern am Code nachvollzogen.

## Was solide war und übernommen wurde

| Bereich | Befund | Übernahme in 2.0 |
|---|---|---|
| Handbewertung | Bitmasken-Bewertung für 5–7 Karten mit korrekten Kategorien und Kickern | unverändert übernommen, jetzt gegen alle 2.598.960 bzw. 133.784.560 Kombinationen und eine unabhängige Referenz geprüft |
| Setzlogik | Mindest-Raise über „letzter voller Raise“, Wiedereröffnung über `cur − actedAt ≥ lastFull` (entspricht der Cash-Game-Regel für kumulierte Short All-ins) | übernommen, um Rückgabe je Setzrunde, Heads-up, Rake und Invariantenprüfung erweitert |
| Side Pots / Odd Chip | Pot-Ebenen aus den Beiträgen der nicht gefoldeten Spieler, Odd Chip an den ersten Gewinner links vom Button | übernommen |
| Gegnerpool | 100 Namen, Stilverteilung 20/15/15/25/15/10, Rotation alle 30 Hände, Archiv | übernommen; Parameter neu kalibriert |
| Datenbank | strenge Importprüfung, Prüfsumme, kein Doppeleintrag | übernommen und erweitert (17 Werte, Positionen, Migration v1 → v2) |
| Sprachausgabe | nur jüngster Tipp, Abbruch älterer, nur lokale deutsche Stimmen | übernommen; Ausspracheregel korrigiert (siehe unten) |
| Visueller Charakter | Filztisch, Elfenbeinkarten, Chip-Rot, responsive Platzierung | übernommen und ausgebaut |

## Gefundene Fehler und Schwächen (am Code belegt)

| Nr. | Schwere | Befund | Folge | Behebung in 2.0 |
|---|---|---|---|---|
| A1 | schwer | Ein einziger Zufallsgenerator `rng` für Austeilen, Bot-Entscheidungen und Tipp-Simulation (`PT.advise(..., { rng: rng })`) | Ein- oder Ausschalten des Coaches veränderte Karten und Bot-Verhalten aller folgenden Hände | getrennte, benannte Ströme je Hand (`deal`, `bots`, `tisch`, Coach-Seed); Test „Coach an/aus“ |
| A2 | schwer | Pot Odds aus `toCall / (pot + toCall)` statt aus dem zahlbaren Betrag | bei Short-Stack-All-in falsche benötigte Equity, auch Pots, die der Spieler nicht gewinnen kann, zählten | `PT.ev.potOdds`: zahlbarer Betrag und gewinnbarer Pot je Side-Pot-Berechtigung |
| A3 | schwer | Bewertung „gut“, wenn die Raise-Größe zwischen 60 % und 180 % der Empfehlung lag | strategisch schlechte Größen wurden als gut bewertet | EV der tatsächlich gewählten Größe wird neu berechnet; sieben Stufen relativ zur Unsicherheit |
| A4 | mittel | Monte-Carlo verwarf bei Kartenkonflikten einzelne Gegner-Kombinationen und zog neu (pro Gegner bis zu 12 Versuche), danach Abbruch der Iteration | leichte Verzerrung der Mehrgegner-Equity | Rejection-Sampling des gesamten Tupels; Test gegen exakte 3-Wege-Enumeration |
| A5 | mittel | EV einer Bet nahm genau einen Caller an (Pot + 2 × Bet), Fold-Wahrscheinlichkeiten unabhängig multipliziert, kein Re-Raise | Multiway-EV unrealistisch | Reaktionsmodell je Gegner mit Fold/Call/Raise, alle Caller-Teilmengen, Re-Raise-Zweig, Side-Pot-Rückgabe |
| A6 | mittel | Nicht gecallte Einsätze wurden erst am Handende zurückgegeben | Pot-Anzeige und EV während der Hand zu groß | Rückgabe am Ende jeder Setzrunde |
| A7 | mittel | Tipp-Berechnung im Hauptthread (bis 1,2 s Zeitbremse) | Oberfläche konnte stocken | Web Worker, Abbruch veralteter Analysen |
| A8 | mittel | Bots ohne Boardtextur, ohne Barrel-/Delayed-C-Bet-/Float-Logik, ohne Anpassung | wenig realistische Gegner | neue Postflop-Logik mit Rollen, Textur, Sizing, SPR, Anpassung an beobachtbare Werte |
| A9 | mittel | Starre Top-x-%-Bänder für Ranges ohne Bayes-Aktualisierung pro Kombination nach Aktionsart und Größe | Range-Schätzung grob | Likelihood-Modell je Kombination nach jeder Aktion (mit Untergrenze gegen Überreaktion) |
| A10 | gering | `toSpeech` las Zahlen wie „25“ als Handklasse („Zwei Fünf“) | falsche Ansage von Prozentwerten | Regel nur für echte Handklassen; Test |
| A11 | gering | Laufende Hand beim Schließen verworfen | Datenverlust einer Hand | exakte Wiederaufnahme über Seed und Aktionsprotokoll |
| A12 | gering | Keine Handhistorie, kein Replayer, kein Lernprofil, kein Training, keine Range-Matrix | Lernziel nur teilweise erreicht | neu implementiert |

## Neu entdeckte Grenzfälle während der Entwicklung

- Overbet- und All-in-Empfehlungen mit schwachen Händen entstanden, wenn ein Gegner exakt nach MDF verteidigt (reiner Bluff = 0 EV, jede Rest-Equity macht große Einsätze attraktiv). Abhilfe: Untergrenze der Verteidigung aus starken Händen, Top Pair und Draws je Einsatzgröße sowie Overbet-/Raise-Korrektur; All-in-Kandidaten nur bei passendem SPR. Dokumentiert als Modellannahme.
- Der Service Worker löste bei der Erstinstallation über `clients.claim()` ein ungewolltes Neuladen aus; jetzt nur nach bestätigtem Update.
- Range-Matrix: falsche Zuordnung offsuit/suited unterhalb der Diagonale (in der Entwicklung durch Sichtprüfung gefunden und korrigiert).

## Unabhängige Prüfung von Version 2.0.0 und Korrekturen in 2.0.1

Zwei getrennte Prüfagenten haben 2.0.0 ohne Kenntnis der Entwicklungsnotizen geprüft (Regeln/Mathematik sowie Strategie/UX/Sicherheit). Ihre Skripte liegen außerhalb des Projekts; alle Befunde sind in `tests/run.js` (Abschnitt „Regression Prüfer A/C“) und `tests/e2e.js` als Regressionstests nachgestellt.

| Nr. | Schwere | Befund | Korrektur |
|---|---|---|---|
| B1 | schwer | Check-Raise-Gelegenheiten (bis 3 je Hand) überschritten die Prüfgrenze „Nenner ≤ Hände“; Export/Import und Laden konnten Datensätze verwerfen | Grenze 3 × Hände; Test |
| B2 | schwer | Call-Zweig der Bet-EV rechnete gegen Call- plus Raise-Range; Value-Bets unterschätzt | Call-Zweig nur gegen die Callrange |
| B3 | mittel | Gefoldete Beiträge als ein Posten; Geld landete teils im falschen Pot | gefoldete Beiträge einzeln |
| B4 | gering | Jam-Raise-Zweig: Gegner zahlte zu viel nach | Callbetrag = Ziel − eigener Einsatz des Gegners |
| B5 | gering | Replayer ignorierte die Rake | Rake-Konfiguration im Handdatensatz |
| B6 | gering | Import prüfte Heldenplatz, gezeigte Karten, Pots, Momentaufnahmen nicht | strenge Prüfung inkl. öffentlicher Sicht und Gegnerwerten |
| B7 | gering | Adaptive MC-Stoppregel verzerrte zu den Rändern | zweistufige Stoppregel (Pilot, dann feste Anzahl); Restabweichung bei Präzise am Rand ~0,17 Prozentpunkte, siehe Testbericht |
| B8 | gering | Hand akzeptierte Stack 0 | Stack ≥ 1 Cent je Spieler |
| C1 | schwer | Coach empfahl 3-/4-Bets und Opens mit jeder Hand (größenunabhängige Fold-Raten) | größenabhängige Folds, Spielbarkeit, Preflop-Anker am Chart, Bewertungsgrenze |
| C2 | schwer | Open-Limp-Empfehlungen (z. B. UTG TT) | Open-Limp nur im Chart |
| C3 | schwer | XSS über manipulierte Sicherung (Quizzähler unmaskiert) | Ausgabe maskiert, Lerndaten streng geprüft |
| C4 | schwer | „Sicherung vor Import“ enthielt bereits die importierten Daten | Daten werden erst nach fertiger Sicherung ersetzt |
| C5 | mittel | Flop-Overbets häufig, teils „eindeutig“ | Overbets nur Turn/River heads-up, größere Unsicherheit |
| C6 | mittel | Bluffs in drei Gegner | konservative Fold-Schätzung, Multiway-Abschlag |
| C7 | mittel | Erklärtexte widersprachen den Zahlen | Texte nach Lage (Equity über/unter Bedarf, River, ungeöffneter Pot, 0 Hände) |
| C8 | mittel | Enter auf Links startete eine neue Hand | Tastenkürzel ignorieren fokussierte Links/Schaltflächen |
| C9 | mittel | Kartenfarbe für Screenreader unsichtbar | role="img" mit vollständiger Bezeichnung |
| C10 | mittel | Import halb angewendet bei manipulierten Lerndaten | Profil wird vorab berechnet; Reparatur statt Verwerfen beim Laden |
| C11 | mittel | 4-Bet-Pots nie als trainiert gezählt; River-Bluff-Situationen fehlten bei manchen Seeds | Zielentscheidung zählt für die Kategorie; mehr Versuche |
| C12 | mittel | Phone: Tipp unter den Aktionen; Tablet: Einsatzchip verdeckt; Marker über Namen; Handliste abgeschnitten | Kurz-Tipp über den Aktionen, Chips über Karten, Marker seitlich, scrollbare Tabelle |
| C13 | mittel | Service Worker: Cache nur nach Versionsnummer, Navigation lieferte überall index.html | Cache je Inhaltsprüfsumme, frisches Laden, nur App-Seite aus dem Cache |
| C14–C17 | gering | Fehlerkategorien, 5.000-Grenze bei Präzise, Kontrast, Kleinkram | korrigiert (Live-Tipp immer ≤ 5.000) |

## Folgeaudit 2.1 (Version 2.1.0)

Grundlage: externe statische Prüfung von 2.0.1 (Hypothesen A1–A6, Monte-Carlo-Abdeckung, Unabhängigkeit der Handbewertungsprüfung), danach vier getrennte Prüfagenten auf dem Stand 2.1. Jede Hypothese wurde zuerst mit einem Reproduktionstest geprüft; nur bestätigte Befunde wurden korrigiert. Ausführliche Berichte: `docs/VALIDIERUNG_MATHE.md` (A2–A5, Monte Carlo, Handbewertung, Prüfer A), `docs/audit-2.1/PRUEFUNG_B.md` (Strategie), `docs/audit-2.1/PRUEFUNG_C_D.md` (Architektur, Sicherheit, Datenbank, Oberfläche, Barrierefreiheit, PWA), `docs/STRATEGIE.md`.

### Externe Befunde A1–A6

| Nr. | Ergebnis | Nachweis | Korrektur | Regressionstest |
|---|---|---|---|---|
| A1 Budget beider Modi | bestätigt | gemeinsames Budget: der zuerst gerechnete Modus verbrauchte mehr; Nachprüfung (Prüfer B, B6) fand zusätzlich Reihenfolgeabhängigkeit über Cache-Treffer bei Mehrgegner-All-ins (Call 23,69 gegen 23,07 BB) | gemeinsame Zwischenergebnisse (Ranges, Equity je Kombination), gleiche Budget- und Zeitanteile, eigene Zufallsströme je Modus, Cache nur für denselben Strom und Umfang, Treffer belasten das Budget mit dem Nennumfang | `tests/unit/coach-a1-budget.js`, `strategie-pruefer-b.js` (Seeds 77 und 991, Reihenfolge vertauscht) |
| A2 leere Ranges | bestätigt | `potShare` lieferte bei leerer Range 176 Chips, bei unmöglicher Verteilung still 0 | gekennzeichneter Fehlschlag bis in EV-Engine und Coach, nie als 0 | `mathe-a2-leer.js` |
| A3 Cache-Schlüssel | bestätigt | Analyse mit Budget 300 ersetzte später eine mit 5.000 (SE 0,029 statt ≤ 0,01) | Nutzung nur nach Art und Umfang (exakt oder genügend Stichproben) | `mathe-a3-cache.js` |
| A4 Zeitgrenzen | bestätigt | Deadline 5 ms: exakte Enumeration lief 318 ms und meldete „exakt“; `potShare` ohne Deadline | Deadline in Enumeration, Side-Pot-Simulation, Equity je Kombination und River-Modellspiel; Abbruch gekennzeichnet, nie „exakt“, nicht im Cache | `mathe-a4-zeit.js`, `deadline-ueberall.js` |
| A5 Range-Kennung | bestätigt | 476 von 500 leicht gestörten Verteilungen erhielten eine vergebene Kennung; Cache lieferte falsche Equity (0,0398) | Kennung aus den exakten Gewichten (normiert, mit Kartenentfernung und Modellversion) | `mathe-a5-hash.js` |
| A6 starre 20 Beobachtungen | bestätigt | Grenze ohne Bezug zu Gelegenheiten, Abweichungsstärke und Unsicherheit; Nachprüfung (B5) fand Exploits allein aus dem Prior | Beta-Posterior der tatsächlich verwendeten Fold-Rate mit skeptischem Prior an der Break-even-Schwelle; Exploit nur bei ausreichender Posterior-Wahrscheinlichkeit und mindestens einer eigenen Beobachtung | `coach-a6-bayes.js`, `strategie-pruefer-b.js` |
| Monte-Carlo-Abdeckung | bestätigt | Präzise, Equity 0,98864: Mittel 0,99027 (z = 6,2), Abdeckung 84–89 % | unverzerrte Stoppregel, Intervall für Equity mit geteilten Pots; Abdeckung je Stufe gegen exakte Enumeration im Toleranzband (siehe Testbericht) | `mathe-mc.js` |
| Handbewertung: Unabhängigkeit | teilweise bestätigt | Die 133.784.560 Sieben-Karten-Kombinationen prüften nur Kategorienhäufigkeiten | unabhängige Referenz; jede der 2.598.960 Fünf-Karten-Hände individuell; gezielte Kicker-, Gleichstands-, Straight-/Flush-, Full-House-, Board-spielt-, Permutations- und Farbinvarianz-Tests | `mathe-eval.js` |
| Widerspruch im Abschlussbericht 2.0.1 | bestätigt | Der Chat-Abschlussbericht nannte „1 von 6“ Läufen mit Vorsprung des Bots; laut Tabelle waren es 2 (exploitativ Seed 23 und 24). Außerdem nutzten die beiden gleichgewichtsnahen Läufe dieselben Bot-Vergleichsläufe wie die exploitativen Seeds 21/22 und waren keine unabhängigen Stichproben | Zusammenfassungen werden jetzt automatisch aus den Rohdaten erzeugt (`tools/report-strategy.js`), mehrfach genutzte Vergleichsläufe sind gekennzeichnet | – |

### Prüfagenten auf dem Stand 2.1

| Prüfer | Bereich | Befunde | Ergebnis |
|---|---|---|---|
| A | Mathematik, Equity, Statistik | 12 (Cache-Auswahl, SE-Untergrenzen, seltene Mehrgegner-Verteilungen, Range-Kennung, Bayes-Skala u. a.) | alle behoben (VALIDIERUNG_MATHE.md, STRATEGIE.md) |
| B | Coach-Strategie, Einsatzgrößen, Gegner-KI | 12, davon 5 schwer | 9 behoben, 2 teilweise (B4 Größenwahl, B11 River-Equity nach Lead), 1 Doku (PRUEFUNG_B.md) |
| C | Architektur, Performance, Sicherheit, Datenbank | 17 Hypothesen: 10 bestätigt und behoben, 7 widerlegt | PRUEFUNG_C_D.md |
| D | Oberfläche, Barrierefreiheit, PWA, Deployment | 12 Hypothesen: 10 bestätigt (9 behoben, 1 Versionsstand im Release erledigt), 2 widerlegt | PRUEFUNG_C_D.md |

Ein echter Screenreader-Test war in der Prüfumgebung nicht ausführbar (Orca lief nicht zuverlässig); ersatzweise liefen axe-core, der Barrierefreiheitsbaum von Chromium, ein Mitschnitt aller Live-Ansagen und Prüfungen der Fokusführung.
