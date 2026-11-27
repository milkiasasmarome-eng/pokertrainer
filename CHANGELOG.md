# Änderungsprotokoll

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionen nach [Semantic Versioning](https://semver.org/lang/de/).

## [2.1.0] – 2026-11-27

Folgeaudit mit Überprüfung der externen Befunde A1–A6, vier unabhängigen Prüfagenten (A Mathematik, B Strategie, C Architektur/Sicherheit/Datenbank, D Oberfläche/Barrierefreiheit/PWA), statistisch abgesicherten Strategievergleichen und neuem Gegnergedächtnis. Details: `docs/AUDIT.md`, `docs/TESTBERICHT.md`, `docs/VALIDIERUNG_MATHE.md`, `docs/STRATEGIE.md`, `docs/audit-2.1/`.

### Mathematik (Befunde A2–A5, Prüfer A)
- **A2** Leere oder unvereinbare Ranges in Side-Pot- und Equity-Rechnungen: gekennzeichneter Fehlschlag statt stiller 0 oder NaN, bis in EV-Engine und Coach verfolgt.
- **A3/A5** Equity-Cache berücksichtigt Methode, erreichte Genauigkeit, Zufallsstrom und Umfang; Range-Kennung ohne Informationsverlust (exakte Gewichte statt Rundung auf 1/1000).
- **A4** Zeitgrenze überall: exakte Enumeration, Side-Pot-Simulation, Equity je Kombination und River-Modellspiel brechen ab und kennzeichnen das Ergebnis; ein abgebrochenes exaktes Ergebnis gilt nie als exakt.
- **Monte Carlo:** Stoppregel ohne Verzerrung, Intervall passend zu Equity-Werten mit geteilten Pots; Abdeckung je Analysestufe gegen exakte Enumeration geprüft.
- **Handbewertung:** unabhängige Best-of-Five-Referenz, individuelle Prüfung jeder Fünf-Karten-Hand, Kicker, Gleichstände, Board spielt, Permutations- und Farbinvarianz; Häufigkeits- und Individualprüfung im Bericht getrennt.

### Coach und Strategie (Befunde A1, A6, Prüfer B)
- **A1** Beide Analysemodi teilen gemeinsame Zwischenergebnisse und erhalten gleiche Budget- und Zeitanteile mit eigenen Zufallsströmen; Ergebnis unabhängig von Reihenfolge und Cache-Zustand.
- **A6** Exploits nur mit Bayes-Beleg auf der tatsächlich verwendeten Fold-Rate und mindestens einer eigenen Beobachtung statt starrer 20 Beobachtungen; Kurz- und Langzeitwerte auf gemeinsamer Zeitskala.
- Postflop-Reaktionsmodell an der Gegnerpopulation kalibriert (Log-Loss auf Prüfdaten 0,771 gegen 0,894 in 2.0.1); Callrange mit scharfem Schnitt; Leads nach absoluter Stärke eingegrenzt.
- Preflop: Fold wird wie jede Aktion am Chart gemessen; Short Stack ohne Nicht-All-in-Raises ab einem Drittel des Stacks.
- Bewertung frei gewählter Größen mit begrenzter Modellunsicherheit; reine Bluffs im gleichgewichtsnahen Modus EV-neutral statt systematisch negativ.
- Gegner-KI: Calls hängen von Einsatzgröße und Stil ab (vorher callten starke Hände jede Größe).

### Gegnergedächtnis
- Datenformat 3 mit Langzeit- und Kurzzeitwerten, Showdowns getrennt von Schätzungen, Erkennung von Stilwechseln; Migration aus Format 2 mit Sicherung.

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

### Behoben (unabhängige Prüfung 2.1, Prüfer C und D – `docs/audit-2.1/PRUEFUNG_C_D.md`)
- Daten: Import lehnt nicht endliche Zahlen (1e999) und die Gegner-ID `__proto__` ab; Rohsicherung ohne lesbare IndexedDB gilt als unvollständig (Zurücksetzen nur nach Bestätigung des Verlusts); beschädigte lokale Einträge werden vor dem ersten Überschreiben roh gesichert (Start, Import); Importgrenze 256 MB statt 60 MB, damit jede eigene vollständige Sicherung wieder einlesbar ist; Archivfassung 2.0.1 wird nicht mehr im selben Ursprung veröffentlicht.
- Performance: Handende liest die Handhistorie nicht mehr vollständig (bei 3.000 Händen 1,8 s Blockade).
- Mehrere Tabs: ohne Web Locks kein zweiter schreibender Tab mehr; nach einem Update schreibt der neu geladene Tab weiter; ein Tab mit altem Programmstand startet keine Worker des neuen Stands.
- Barrierefreiheit: Fokus bleibt beim Neuzeichnen erhalten (Plätze, Hinweise, Replayer, Gegnerliste, eigene Aktion, Quiz), Sprunglink ohne Bereichswechsel, Kürzel nicht auf Knöpfen außerhalb der Aktionsleiste, Zug-Ansage nur einmal, wichtige Hinweise werden angesagt, Handverlauf per Tastatur scrollbar, Hinweis ohne JavaScript, Fokus nach „Weiter warten“.
- Darstellung: keine Überdeckungen am Tisch von 320 bis 1366 px (eigene Karten, Pot, Board, Einsätze, Marker); HUD-Werte umbrechen bei größeren Textabständen.

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
