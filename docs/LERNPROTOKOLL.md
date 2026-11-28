# Lernprotokoll PokerTrainer

> Übernommen am 28.11.2026 aus der Datei `PokerTrainer_Stand` des Claude-Projekts „Poker“ (dort bis 2.3.0 gepflegt). Ab 2.4 ist diese Datei maßgeblich.
> Namen und private Artefakt-Links entfernt.

Format: Befund. Ursache. Regel.

## Bis 2.3.0

- Selbsttest „Split Pot mit ungeradem Cent“ schlug fehl. Ursache: Testszenario falsch gebaut (2c2d ergab ein Paar, das Skript setzte auf jeder Straße). Regel: Testszenarien vor dem Lauf auf ungewollte Blätter und Folgeaktionen prüfen.
- Im Modus „nachher“ verschwand das Urteil, sobald der Spieler wieder am Zug war. Ursache: der neue Zug überschrieb das Tipp-Feld. Regel: ein Urteil bleibt stehen, bis das nächste kommt.
- Bei 400 px Breite war die Seite breiter als der Bildschirm. Ursache: nicht umbrechender Text in der Kopfzeile. Regel: Text in Flex-Zeilen darf umbrechen; jede Fassung bei 400 px auf Breite prüfen.
- Karten der Seitenplätze überlappten sich, der obere Platz ragte in die Kopfzeile. Ursache: Platz samt Karten zentriert. Regel: nur das Namensschild zentrieren, Karten zur Tischmitte hin anhängen.
- Herz-Symbol im Handverlauf erschien als Emoji. Ursache: Systemschrift ohne Kartensymbol. Regel: Text-Variante U+FE0E und Symbolschriften als Rückfall setzen.
- Die Claude-Vorschau meldete, dass Downloads dort nichts tun. Ursache: der Rahmen erlaubt Downloads nur über die Fähigkeit downloads. Regel: vor jeder Seite mit Download die Fähigkeiten der Vorschau prüfen.
- Entwurf 2: Fehlervariante „Zeichen gelöscht“ im Import-Test veränderte die Datei gar nicht. Ursache: die Ersetzung ergab denselben Text. Regel: jede Fehlervariante prüft im Test selbst, dass sie vom Original abweicht.
- Entwurf 2: Plausibilitätstest erhielt A8o statt AKs (Wiederholung zu Regel 1). Ursache: Deck paarweise statt in Austeilungsreihenfolge notiert. Regel: feste Decks nur über eine Hilfsfunktion in Austeilungsreihenfolge bauen und die Karten des Spielers im Test prüfen.
- Entwurf 2: Fold-Begründung widersprach sich („du brauchst 29 %, hast aber 32 %“). Ursache: die Entscheidung rechnet mit Equity mal Positionsfaktor, der Text zeigte rohe Equity. Regel: der Text nennt die Größe, auf der die Entscheidung beruht; jede Fassung an einer Stichprobe von Tipps gegenlesen.
- Entwurf 2: Urteil „Fehler“ mit „verschenkt Value“ nach einem verpassten Bluff. Ursache: Urteilstexte hingen nicht von der Art der Empfehlung ab. Regel: Urteil und Text richten sich nach der Art der Empfehlung (Value, Bluff, Pot Odds).
- Entwurf 2: Bei 400 px überlagerten Karten, Einsätze und Labels die Plätze (Wiederholung zu Regel 3 und 4). Ursache: feste Pixelabstände zum Platz. Regel: Karten, Label und Dealer-Button am Namensschild verankern, Einsätze über Prozentlagen setzen; jede Fassung bei 400 px per Screenshot prüfen, nicht nur die Breite messen.
- Entwurf 2: Der Handverlauf schnitt zweistellige Nummern ab. Ursache: zu kleiner Listeneinzug. Regel: Listen und Zähler mit zweistelligen Werten prüfen.
- Entwurf 2: Beim Eröffnen erschienen „Pot Odds 40 %“. Ursache: Pot Odds wurden immer aus dem Preis fürs Limpen berechnet. Regel: Kennzahlen nur zeigen, wenn sie zur Entscheidung gehören.
- 2.0.0: Coach empfahl absurde Jams und Overbets mit schwachen Händen. Ursache: Gegner verteidigte exakt nach MDF, jede Rest-Equity machte große Einsätze attraktiv. Regel: Verteidigung nie allein aus MDF, immer mit Untergrenze aus der Range-Zusammensetzung.
- 2.0.0: Ein Tipp verbrauchte 8.558 Simulationen. Ursache: Teilrechnungen hatten eigene Budgets. Regel: ein gemeinsames Budget je Entscheidung, das jede Teilrechnung abzieht; Test über alle Spots auf ≤ 5.000.
- 2.0.0: Range-Matrix vertauschte suited und offsuit unterhalb der Diagonale. Ursache: Indexformel. Regel: Matrix gegen bekannte Klassen (AKs oben rechts, AKo unten links) sichtprüfen.
- 2.0.0: Testreferenz AA gegen KK falsch (82,36 % statt 81,26 %). Ursache: Wert aus dem Gedächtnis. Regel: Referenzwerte immer selbst per Brute Force nachrechnen.
- 2.0.0: Erste Service-Worker-Installation lud die Seite neu. Ursache: `clients.claim()` löste `controllerchange` aus. Regel: Neuladen nur nach einem vom Nutzer bestätigten Update.
- 2.0.0: „25 %“ wurde als „Zwei Fünf“ vorgelesen. Ursache: Zahlen sahen aus wie Handklassen. Regel: Ausspracheregeln mit Zahlen- und Prozenttests absichern.
- 2.0.0: Board-Paare zählten als Top Pair, Two Pair mit Board-Paar als Out. Ursache: Klassifikation ohne Bezug zum Board. Regel: Handstärke immer relativ zum Board bewerten.
- 2.0.0: Stufen Präzise und Tiefenanalyse rechneten nicht mehr als Standard. Ursache: festes Budget. Regel: jede Stufe im Test auf tatsächlich mehr Simulationen prüfen.
- 2.0.0: Ein Langlauf überschrieb frühere Ergebnisse. Ursache: Ergebnisdatei neu statt ergänzt. Regel: Ergebnisdateien zusammenführen, nie stillschweigend ersetzen.
- 2.0.0: Repository-Anlage und Pages-API von der Umgebung gesperrt. Ursache: Sitzung an konfigurierte Repositories gebunden, Proxy blockiert die Pages-API. Regel: Repository vom Nutzer anlegen lassen, Pages über den Zweig `gh-pages` aktivieren.
- Prüfung 2.0.0 (C1/C2): Coach empfahl 3-Bets, 4-Bets und Opens mit jeder Hand sowie Open-Limps. Ursache: größenunabhängige Fold-Raten und ein Limp-Modell ohne Spieler dahinter. Regel: preflop am Faustregel-Chart verankern; jede Fassung mit einem Raster über alle 169 Klassen in typischen Spots prüfen.
- Prüfung 2.0.0 (C3): Skript über eine manipulierte Sicherung ausführbar. Ursache: Quizzähler unmaskiert per innerHTML, Lerndaten kaum geprüft. Regel: jede Ausgabe importierter Daten über `esc()`, jedes importierte Feld streng nach Typ und Wertebereich prüfen.
- Prüfung 2.0.0 (C4): „Sicherung vor Import“ enthielt schon die importierten Daten. Ursache: Sicherung asynchron, Ersetzen synchron. Regel: Daten erst ersetzen, wenn die Sicherung fertig erzeugt ist; im Browsertest den Inhalt der Sicherung prüfen.
- Prüfung 2.0.0 (B1): Gegner mit mehreren Check-Raise-Gelegenheiten wurden beim Laden verworfen. Ursache: Prüfgrenze „Nenner ≤ Hände“ passte nicht zur Zählung je Straße. Regel: Prüfgrenzen aus dem Zählcode ableiten und mit Mehrstraßen-Händen im Export/Import-Test prüfen.
- Prüfung 2.0.0 (B2–B4): EV-Zweige rechneten mit falscher Range, Dead Money als ein Posten, falscher Callbetrag im Jam-Zweig. Ursache: Näherungen ohne unabhängige Nachrechnung. Regel: jeden EV-Zweig an einem handgerechneten Fall nachprüfen lassen.
- Prüfung 2.0.0 (B5): Replayer ohne Rake. Ursache: Rake-Konfiguration nicht im Handdatensatz. Regel: alles, was die Abrechnung beeinflusst, im Datensatz speichern.
- Prüfung 2.0.0 (C8): Enter auf einem Link startete eine Hand. Ursache: globale Tastenkürzel ohne Blick auf das fokussierte Element. Regel: Kürzel ignorieren fokussierte Links, Schaltflächen und Eingaben.
- Prüfung 2.0.0 (C12): Kurz-Tipp fehlte auf dem Smartphone, Einsatzchips und Marker verdeckten Inhalte (Wiederholung zu Regel 3, 4 und Entwurf-2-Regel 400 px). Ursache: Layout nur bei der Hand am Tisch, nicht in allen Spielständen geprüft. Regel: Screenshots bei 390 und 820 px mit aktiven Einsätzen in mehreren Positionen ansehen.
- Prüfung 2.0.0 (C13): Updates ohne Versionssprung erreichten installierte Clients nie. Ursache: Cache-Schlüssel nur Versionsnummer. Regel: Cache-Schlüssel aus Inhaltsprüfsumme bilden.
- Prüfung 2.0.0 (B7): Monte-Carlo-Stoppregel verzerrte am Rand. Ursache: Abbruch, sobald der geschätzte Fehler klein genug war. Regel: Stichprobengröße aus einer Pilotstichprobe festlegen, dann ohne Zwischenprüfung rechnen.
- 2.1: Die Arbeitsumgebung startete zweimal neu; laufende Vergleiche, Agentenberichte und nicht committete Änderungen gingen verloren. Ursache: lange Prozesse und Agenten ohne Zwischenstand. Regel: Langläufe mit Zwischenspeicherung je Lauf; Agenten committen nach jeder Korrektur und schreiben Berichte laufend in Dateien.
- 2.1: Das Nutzungslimit wurde mitten in der Arbeit erreicht. Ursache: mehrere große Agenten parallel. Regel: höchstens zwei Agenten gleichzeitig, kurze Schlussberichte, Details in Dateien.
- 2.1: Nach Korrektur B7 überbluffte der gleichgewichtsnahe Modus (−42,7 BB/100). Ursache: Bei EV-Gleichstand wählte die Einzelhand-Empfehlung für jede schwache Hand den Bluff. Regel: Mischstrategien nie als alleinige Empfehlung; jeden Coach-Modus im Hauptvergleich messen, nicht nur den voreingestellten.
- 2.1: Browsertests im CI scheiterten an 2–3 px Überdeckungen und 17 px Querscrollen, lokal grün. Ursache: andere Schriften im CI-Browser; Raster mit fester Mindestbreite. Regel: Layout mit Reserve bauen, `minmax(min(…, 100%), 1fr)`; das CI-Ergebnis ist maßgeblich.
- 2.1: Der Abschlussbericht 2.0.1 nannte 1 statt 2 Läufe mit Vorsprung des Bots. Ursache: Zusammenfassung von Hand geschrieben. Regel: Zusammenfassungen nur aus den Rohdaten erzeugen.
- 2.1: Die Sieben-Karten-Prüfung von 2.0 prüfte nur Häufigkeiten, nicht jede Hand. Ursache: Häufigkeit als Beweis für Einzelbewertungen gewertet. Regel: Häufigkeits- und Individualprüfung getrennt benennen; Einzelbewertung gegen unabhängige Referenz.
- 2.1: Ein Browsertest prüfte den Seitentitel mit fester Versionsnummer und schlug nach dem Versionssprung fehl. Regel: Versionsangaben in Tests aus PT.VERSION ableiten.
- 2.2: Ein Zeilenkommentar vor Code kommentierte Code aus, ganze Bereiche blieben leer (Prüfbefund E-1). Ursache: `//` in einer Zeile mit Code. Regel: Kommentare in Codezeilen nur als `/* */`; Syntaxtest für alle Skripte und die Offline-Datei vor jedem Commit.
- 2.2: 45 fertige Vergleichsläufe mussten verworfen werden. Ursache: Korrekturen an Engine-Dateien während laufender Vergleiche. Regel: Prüfagenten vor den Hauptläufen; während Vergleichsläufen keine Engine-Datei ändern.
- 2.2: Der Vorher-Nachher-Test war nicht abschließbar (Prüfbefund C-1). Ursache: Seeds, aus denen sich keine passende Situation erzeugen ließ. Regel: Seeds erzeugter Tests vorab validieren.
- 2.2: Die Reaktion auf ½ Pot fiel in die Klasse ⅓. Ursache: Preis gegen den Pot nach dem Einsatz gerechnet. Regel: Einsatzgrößen immer gegen den Pot vor dem Einsatz definieren und an einem Handbeispiel prüfen.
- 2.2: Push/Fold bei 3 BB verfehlte die Exploitability-Schwelle (0,00516). Regel: Abnahmeschwelle je Stacktiefe prüfen; bei Verfehlen mehr Iterationen, nie eine weichere Schwelle.
- 2.2: Ein Test des Lernsystems lief mit Streuung 0. Regel: synthetische Testdaten immer mit Streuung erzeugen.
- 2.2: Der Browsertest des Seitentitels prüfte fest „2.1“ (Wiederholung zur Regel „Versionsangaben aus PT.VERSION“). Ursache: Regel nur am gemeldeten Test umgesetzt. Regel: nach jedem Versionssprung alle Tests per Suche nach festen Versionsnummern prüfen.
- 2.2: Ein Teillauf der Browsertests überschrieb das Gesamtergebnis (Wiederholung zur Regel „Ergebnisdateien zusammenführen“). Ursache: Teil- und Gesamtlauf schrieben dieselbe Datei. Regel: Teilläufe schreiben in eine eigene Datei (`e2e-teil.json`), umgesetzt.
- 2.2: Der Coach wurde gegen unbekannte Strategien schwächer, obwohl Validierung und Test der Gegner-KI besser waren. Ursache: Range- und Reaktionstabelle an derselben Gegner-KI angepasst, Modellwahl nur auf deren Validierungsgruppe. Regel: Modellwahl zusätzlich auf eigenen fremden Entwicklungsstrategien prüfen; abschließend unbekannte Strategien bleiben unberührt.
- 2.3: Ein Kommentar nach einer Codezeile kommentierte den Rest der Zeile aus (Wiederholung zu E-1). Ursache: Kommentar mitten in eine Deklaration eingefügt. Regel: Kommentare nur am Zeilenende nach dem letzten Code oder als `/* */`; Tests vor jedem Commit (hier fanden sie den Fehler).
- 2.3: Prüfagenten fanden nach der Modellwahl Fehler im gewählten Modell; die Wahl musste wiederholt werden. Ursache: Modellwahl vor der Prüfung. Regel: neue Modellteile erst prüfen lassen, dann wählen, dann einfrieren.
- 2.3: Das Maß w maß Stil und Rolle statt Passung (feste Lage, gemeinsame Referenz für aggressive und passive Aktionen). Ursache: Prüfstatistik ohne Kontext der Tabelle. Regel: Passungsmaße in derselben Zelle wie das Modell berechnen und je Teilgruppe eigene Referenzwerte verwenden.
- 2.3: Der Leckagetest konnte kein Leck finden. Regel: jeder Schutztest bekommt einen Negativtest, der ihn rot macht.
- 2.3: Die Arbeitsumgebung startete während der Hauptläufe neu. Regel bestätigt: Läufe mit Zwischenspeicherung je Lauf, danach einfach neu starten.

## 2.3.1 (28.11.2026, erste Runde in Claude Code)

- Der gleichgewichtsnahe Modus raiste seit 2.1 postflop dreimal so oft wie 2.0.1; aufgefallen erst beim Blick auf die Aktionsverteilung, nicht in BB/100. Ursache: Korrektur „Prüfer B 7“ nahm im Modus alle Fold-Korrekturen heraus, auch die für Raises. Regel: Bei jedem Modusvergleich die Aktionsanteile (Raise, Call, Fold) neben BB/100 mit der Referenz vergleichen; eine Korrektur für einen Fall (Bets) nie pauschal auf verwandte Fälle (Raises) ausdehnen.
- Gegen die Gegner-KI war die Korrektur ohne Wirkung auf BB/100 (dev24), gegen unbekannte Strategien +43 bis +52 BB/100 (dev24b). Ursache: Die Gegner-KI bestraft Über-Raisen kaum. Regel: Jede Variante auf Gegner-KI und auf synthetischen Strategien entwickeln; eine Gruppe allein entscheidet nie über „kein Nutzen“.
- Ein nicht bestandenes Kriterium (P4) darf nicht durch einen Wiederholungslauf allein bestehen. Regel: Vor einer Replikation festlegen, dass das Urteil auf der gepoolten Schätzung beruht (P4-gesamt).
- Die Annahme „PAI ist auf 0.1.0“ war veraltet (PAI 0.4.0-dev las Format 3 bereits). Regel: Stand fremder Repositories vor jeder Aussage mit `git ls-remote` prüfen und Commit-Hashes in Berichten nennen.
- Erster Browsertestlauf direkt nach der Installation: sechs Zeitüberschreitungen, Wiederholung 52/52; im CI ein zufälliger Fehler „ohne Worker: Tipp erscheint“, weil die einzige gespielte Hand ohne eigene Entscheidung endete. Regel: Browsertests, die auf eine Entscheidung warten, spielen bis zu drei Hände; bei Fehlschlägen erst im selben Stand wiederholen, dann untersuchen.
- Diagnose Equity-Unterschätzung: aufgeschlüsselt nach Lage liegt sie fast ganz beim River-Check des Gegners zum Helden (F23 in Position +0,29). Regel: Kalibrierungsfehler vor jeder Korrektur nach Straße, Lage und Gegneraktion aufschlüsseln.
