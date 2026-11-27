# Persönliches Trainings- und Fortschrittssystem (Arbeitspaket 7, 2.2)

## 1. Was erfasst wird

Jede bewertete Entscheidung (am Tisch und im Training) speichert kompakt: Bewertung 0–100, geschätzten modellabhängigen EV-Verlust in BB, Straße,
Position, Situation (Spot), Fehlerkategorien, Gegnertyp, Trainingskategorie, Session (`PT.training.addDecision`, unverändert seit 2.0).
Neu in 2.2 ausgewertet (`assets/js/engine/training.js`, Ansicht „Fortschritt“):

| Auswertung | Funktion | Inhalt |
|---|---|---|
| Fehlerfelder | `errorAreas` | Einsatzgröße, Pot Odds (inkl. Draws), Range-Einschätzung (mittelstarke Hände, zu viele Calls/Folds, Gegnertyp), Aggression, Starthände und Position; Anzahl, davon letzte 100, geschätzter EV-Verlust (zu gleichen Teilen auf die Kategorien einer Entscheidung verteilt) |
| Wiederkehrende Fehler | `recurring` | gleiche Situation und gleiche Fehlerkategorie mindestens dreimal mit Bewertung ≤ 45; Knopf „Gezielt üben“ startet die passende Trainingskategorie |
| Verbesserung in zuvor schwachen Situationen | `improvement` | ab 30 Entscheidungen je Situation: die ersten 10 bestimmen „zuvor schwach“ (Mittel < 60), verglichen werden die Entscheidungen 11–20 mit den letzten 10 (getrennt, sonst entstünde Scheinverbesserung durch Regression zur Mitte; Prüfer A 2.2), Differenz mit 95-%-Intervall (Welch, t-Quantil); „eindeutig“ nach Holm-Korrektur über alle Situationen |
| Fehler nach Position und Straße, Entwicklung der Qualität | `profile` (seit 2.0) | Tabellen und Verlauf je 25 Entscheidungen |

## 2. Gezielte Übungen und Wiederholung

- Trainingsszenarien je Kategorie aus echten Spielverläufen mit den Computergegnern (`generate`), Empfehlungen aus den schwächsten Kategorien.
- Wiederholung früherer Fehler unter vergleichbaren Bedingungen (Spaced Repetition mit Momentaufnahme des Spots, seit 2.0).

## 3. Vorher-Nachher-Test

- `prePostNew` legt je Kategorie (Standard: die drei schwächsten) vier Testsituationen für „vorher“ und vier für „nachher“ an; die Seeds sind vorab
  festgelegt, verschieden (vergleichbare, nicht identische Situationen) und so gewählt, dass der Generator für jeden Seed eine Situation erzeugt;
  das Gegnerfeld ist fest („gemischt“, keine adaptive Schwierigkeit). Während des Tests gibt es weder Tipp noch Urteil, bewertet wird immer
  exploitativ mit Stufe Standard (Prüfer C 2.2); die eigenen Einstellungen gelten danach wieder. Die Bewertung wird der Situation zugeordnet, in der
  die Entscheidung fiel, auch wenn sie erst nach dem Wechsel zur nächsten Situation fertig wird.
- Ablauf in der Oberfläche: Vorher-Test → Training der Kategorien → Nachher-Test. Ergebnis: mittlere Bewertung und EV-Verlust je Phase, Differenz mit
  95-%-Intervall (Welch, t-Quantil; Urteil erst, wenn beide Phasen vollständig sind), je Kategorie. Gespeichert in den Lerndaten (`L.pp`, streng geprüft und reparierbar, in Sicherungen enthalten).

## 4. Was das System nachweist – und was nicht

- **Implementiert und getestet** ist die Messmöglichkeit (`tests/unit/strategie-22.js`, AP7).
- **Nicht nachgewiesen** ist eine Lernwirkung bei menschlichen Nutzern. Dafür fehlen Daten: Es gibt keine Nutzerstudie, keine Kontrollgruppe und
  keine Erhebung außerhalb des eigenen Geräts (der Trainer sendet keine Daten). Ein positiver Vorher-Nachher-Unterschied eines einzelnen Nutzers zeigt
  eine Veränderung seiner Entscheidungen in diesen Testsituationen; Übungseffekte, Zufall der Situationen und Modellfehler des Coaches sind nicht
  ausgeschlossen. Die Oberfläche sagt das ausdrücklich.
- Die Bewertung beruht auf dem Modell des Coaches (Faustregel, kein Solver-Ergebnis). Ein Modellfehler wirkt sich auf „vorher“ und „nachher“ gleich aus,
  verzerrt aber den absoluten EV-Verlust.
