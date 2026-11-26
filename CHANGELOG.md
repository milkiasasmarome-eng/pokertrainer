# Änderungsprotokoll

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionen nach [Semantic Versioning](https://semver.org/lang/de/).

## [2.1.0] – 2026-11-27 (Entwicklungsfassung auf Zweig `pai-schnittstelle`)

### Neu
- **PAI-Schnittstelle (freiwillig, Standard aus):** Einstellung „PAI-Schnittstelle“ sendet über den Browserkanal `pai-events-v1`
  (nur dieselbe Website) Entscheidungssituationen, die gewählte Aktion und abgeschlossene Hände an eine geöffnete Seite von
  Adaptive Poker Intelligence. Inhalt: eigene Karten, Board, öffentliche Aktionen, Stacks, aufgedeckte Karten. Nicht enthalten:
  verdeckte Karten anderer Spieler, Seeds, Bot-Stile und -Parameter, Gegnerstatistiken, Tipps und Bewertungen des Coaches.
  Einseitig: Der Trainer empfängt nichts. Test „PAI-Schnittstelle“ in `tests/run.js` prüft die Felder und schließt Kartenlecks aus.

## [2.0.1] – 2026-11-26

Korrekturen nach zwei unabhängigen Prüfungen (Details: `docs/AUDIT.md`).

### Behoben
- **Coach preflop:** keine 3-Bets, 4-Bets und Opens mehr mit beliebigen Händen, keine Open-Limps; Fold-Raten hängen von Raise-Größe und Position ab; Spielbarkeit der Starthand in der Equity Realization; Faustregel-Chart als Anker, Abweichung nur bei belegtem Exploit.
- **Coach postflop:** konservative Fold-Schätzung, keine Bluffs in mehrere Gegner ohne Rückhalt, Overbets nur auf Turn/River heads-up, Call-Zweig der Bet-EV nur gegen die Callrange, Dead Money je Spieler im richtigen Pot, Jam-Raise-Zweig korrigiert.
- **Sicherheit und Daten:** XSS über manipulierte Sicherung geschlossen; strenge Prüfung von Lerndaten, Handdatensätzen und Momentaufnahmen; „Sicherung vor Import“ enthält die bisherigen Daten; Check-Raise-Zähler werden beim Laden und Import nicht mehr verworfen; Replayer mit Rake.
- **Bedienung:** Enter auf Links startet keine Hand; Karten mit Farbe für Screenreader; Kurz-Tipp über den Aktionen auf dem Smartphone; Einsatzchips und Marker verdecken nichts; Handliste scrollbar; Kontrast verbessert; Texte korrigiert.
- **Offline:** Service-Worker-Cache je Inhaltsstand (Updates kommen auch ohne Versionssprung an), nur die App-Seite aus dem Cache.
- **Projektvorgabe:** automatischer Tipp immer höchstens 5.000 Simulationen; Hinweis „Faustregel, kein Solver-Ergebnis“ im Tippfeld.

## [2.0.0] – 2026-11-26

Erste öffentliche Version als Website (GitHub Pages), installierbare Web-App und portable Offline-Datei.

### Neu
- **Engine:** vollständige No-Limit-Regeln inklusive unvollständiger All-in-Raises, kumulierter Short All-ins (Cash-Game-Regel), Rückgabe nicht gecallter Einsätze je Setzrunde, mehrerer Side Pots, Split Pots mit Odd Chip, Heads-up-Händen, kurzem Big Blind und optionalem Rake („No Flop, No Drop“, gedeckelt, standardmäßig aus).
- **Getrennte Zufallsströme** für Kartenverteilung, Bots, Tisch und Coach: Coach an/aus verändert den Spielverlauf nicht; optionaler Seed macht Sessions reproduzierbar.
- **Handbewertung** mit unabhängiger Referenzimplementierung, geprüft an allen 2.598.960 Fünf-Karten- und 133.784.560 Sieben-Karten-Kombinationen.
- **Equity-Engine:** exakte Enumeration (Heads-up gegen Range auf Flop/Turn/River), Monte-Carlo mit gewichteten Ranges, Kartenentfernung, Mehrgegner-Rejection-Sampling, adaptive Stoppregel, Standardfehler und 95-%-Intervall, Preflop-Tabelle 169 × 169, Zwischenspeicher; vier Genauigkeitsstufen.
- **Range-Engine:** 1.326 Kombinationen je Gegner, Faustregel-Charts (Open, Verteidigung, 3-/4-Bet, Push/Fold), Bayes-Aktualisierung nach jeder Aktion, Boardanalyse (nass/trocken, statisch/dynamisch, gepaart, monoton).
- **EV-Engine:** EV aller legalen Aktionen und mehrerer Einsatzgrößen mit Fold-/Call-/Raise-Wahrscheinlichkeiten je Gegner, Multiway über alle Caller-Teilmengen, Side-Pot-Berechtigung, Pot Odds aus dem tatsächlich zahlbaren Betrag, Equity Realization, implizite Odds, Unsicherheit getrennt nach Simulation und Modell.
- **Gleichgewichtsnaher Modus** mit vereinfachtem River-Modellspiel (CFR+, Exploitability-Angabe) und **exploitativer Modus** mit geglätteten Gegnerwerten; Erklärung bei abweichenden Empfehlungen.
- **Coach:** Empfehlung, Größe, Alternativen, Equity, benötigte Equity, Pot Odds, effektiver Stack, SPR, geschätzte Range, EV-Tabelle, Klassifikation (eindeutig bis hohe Unsicherheit), drei Erklärtiefen, Glossar zum Nachschlagen, persönliche Hinweise; Bewertung in sieben Stufen nur nach Entscheidungsinformationen.
- **Gegner-KI:** 100 persistente Gegner (20 loose-passiv, 15 sehr loose, 15 Nit, 25 TAG, 15 LAG, 10 ausgeglichen) mit individuellen Parametern, Können und begrenzter Anpassung an beobachtbare Werte des Spielers; Schwierigkeitsstufen über die Tischzusammensetzung; statistisch kalibriert.
- **Gegnerdatenbank** mit 17 Werten je Gelegenheit, Aggressionszählern und Positionswerten, Wilson-Intervallen und Beta-Glättung; Migration aus Entwurf 2 (Format Version 1).
- **Lernsystem:** Handhistorie mit Suche, Filter und Export, Hand-Replayer (vor/zurück, damals vs. später bekannt, Entscheidung erneut treffen), Fehlerdatenbank, Kompetenzprofil, 14 Trainingskategorien, Spaced Repetition, Wissensquiz, Lernziele, Statistik-Dashboard getrennt vom Spielgeld-Ergebnis.
- **Oberfläche:** Bereiche Tisch, Training, Handhistorie, Ranges (13 × 13 Matrix), Gegner, Fortschritt, Einstellungen, Hilfe; Hell/Dunkel, einfache und erweiterte Ansicht, Tastatursteuerung, responsive bis 360 px, Sprachausgabe mit Abbruch älterer Tipps.
- **Web-App:** Manifest, Icons, Service Worker mit versioniertem Cache und kontrolliertem Update, Offline-Betrieb; Web Worker für Analysen; Schutz bei mehreren Tabs; exakte Wiederaufnahme einer beim Neuladen laufenden Hand.
- **Qualitätssicherung:** Node-Testsuite, Langläufer (1.000.000 Hände, Kalibrierung, Coach-Vergleich), Browser-Tests, GitHub Actions für Tests und Veröffentlichung.

### Geändert gegenüber Entwurf 2
- Ein gemeinsamer Zufallsgenerator für Karten, Bots und Tipps wurde durch getrennte Ströme ersetzt.
- Pot Odds nutzen den zahlbaren Betrag und den erreichbaren Pot statt des offenen Einsatzes.
- Die Bewertung „gut/vertretbar/Fehler“ mit pauschalen Größenintervallen wurde durch eine EV-basierte Bewertung der tatsächlich gewählten Größe ersetzt (die drei alten Stufen werden weiter mit angezeigt).
- Speicherbereich `pokertrainer2` (IndexedDB); Daten aus `pokertrainer-v2` werden nach automatischer Sicherung übernommen.
