# Änderungsprotokoll

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionen nach [Semantic Versioning](https://semver.org/lang/de/).

## [Unveröffentlicht] – Zweig ui-2.1

### Neu
- **Startüberwachung und Wiederherstellung** (`assets/js/recovery.js`): Zeitlimits für alle Startschritte (IndexedDB, Tab-Sperre, Daten lesen, Migrationssuche), Hinweis nach 4 s, Fehleranzeige spätestens nach 20 s oder sofort bei fehlender Programmdatei. Wiederherstellung: „Neu laden“, abgesicherter Start (`?start=sicher`, gespeicherte Daten bleiben unberührt), Rohsicherung aller lokalen Daten und erst danach „Lokale Daten zurücksetzen“. Rohsicherungen lassen sich importieren; gültige Einträge werden übernommen.
- **Benchmark-Export** je Entscheidung (Handhistorie → „Export Benchmark“, Schema-Version 1, `docs/BENCHMARK_EXPORT.md`): Spielzustand zum Entscheidungszeitpunkt getrennt von späteren Informationen, Coach-Empfehlung, Alternativen mit EV und Unsicherheit, Equity, Modus, Stufe, Modell- und Softwareversion, Rechenaufwand, Seeds; ohne persönliche Daten, byteweise reproduzierbar, nachrechenbar.
- **Mehrere Fenster:** Browser-Tab und installierte App teilen die Daten; das zweite Fenster ist schreibgeschützt (auch Import, Löschen, neue Session) und bietet „Hier weiterspielen“ an, sobald das erste geschlossen ist.
- Einstellung „Tastenkürzel aus einem Zeichen“ (abschaltbar, WCAG 2.1.4); Einstellungen → Daten → „Rohsicherung exportieren“.
- **CI:** Build-Reproduzierbarkeit (`tools/check-build.js`), Versionsgleichheit (`tools/check-version.js`), vollständige Suite, Browsertests mit Chromium und axe-core in GitHub Actions als Pflicht vor der Veröffentlichung, Live-Smoke-Test danach (`tests/smoke-live.js`), Testartefakte, Langläufer getrennt (`langlauf.yml`).

### Behoben
- Trainer blieb dauerhaft bei „Lade …“, wenn IndexedDB nicht antwortete oder blockiert war.
- Import einer vollständigen Sicherung mit Lerndaten brach mit einem Skriptfehler ab (Dialog blieb bei „Sichere aktuelle Daten …“).
- Die Markierung „Migration aus Entwurf 2 erledigt“ ging beim ersten Speichern verloren; die alte Datenbank wurde bei jedem Start erneut gesichert.
- Beschädigte Einträge im lokalen Speicher (Einstellungen außerhalb des Wertebereichs, laufende Hand, Hände) konnten Folgefehler auslösen oder ungeprüft angezeigt werden; Handdatensätze werden jetzt vor jeder Anzeige, Sicherung und jedem Export streng geprüft (endliche Zahlen, Wertebereiche, bekannte Felder).
- Barrierefreiheit (axe-core, WCAG 2.2 AA, hell und dunkel: 0 Verstöße, Bericht `docs/BARRIEREFREIHEIT.md`): Range-Matrix ohne ungültige Grid-Rollen und mit Pfeiltasten, Kontraste (gefoldete Plätze, Abzeichen, Dunkelmodus), Namen von Schaltern und Plätzen, Fokusfalle und inerter Hintergrund in Dialogen, nicht abgeschnittener Fokus, sparsame Live-Ansagen statt Ansage bei jeder Bot-Aktion, Zielgrößen ≥ 24 px, reduzierte Bewegung auch beim Scrollen.

### Geändert
- Importdateien werden im Web Worker geprüft (23 MB in 1,3 s, längste Blockade der Oberfläche 0,3 s); Dateien über 60 MB werden vor dem Lesen abgelehnt.
- Antwortet IndexedDB nicht oder ist sie fehlerhaft, arbeitet der Trainer nur im Arbeitsspeicher (statt in einem zweiten, abweichenden Speicher im localStorage); „Jetzt aktualisieren“ schließt vorher alle Schreibvorgänge ab.

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
