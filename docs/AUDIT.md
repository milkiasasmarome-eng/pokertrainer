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
