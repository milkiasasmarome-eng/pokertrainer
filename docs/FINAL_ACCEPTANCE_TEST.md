# Final Acceptance Test – PokerTrainer 2.2.0 (vorbereitet)

Nach der Projektanweisung „Poker“ ist der Final Acceptance Test die Abnahme vor einer Freigabe. Er wird gemeinsam im Chat durchgegangen: Fall für Fall, Antwort je Fall „passt“ oder Fehlerbeschreibung. Ein Fehler wird sofort behoben, der Fall wiederholt und im Lernprotokoll vermerkt. Nach dem letzten bestandenen Fall und dem Wort „Freigabe“ entstehen PokerTrainer_Freigabe und Abschluss_PokerTrainer.

Prüfgegenstand: Website https://milkiasasmarome-eng.github.io/pokertrainer/ und Offline-Datei `dist/PokerTrainer_2.2.html`, beide Version 2.2.0 (Fußzeile). Bis zur Freigabe liegt 2.2.0 auf dem Zweig `entwicklung-2.2`; für den Test die Offline-Datei aus diesem Zweig öffnen oder die Vorschau-Website nutzen, die nach „Freigabe“ veröffentlicht wird.

## Normalweg je Funktion

| Nr. | Du tust | Muss passieren |
|---|---|---|
| 1 | Website öffnen, „Nächste Hand“ wählen | Hand startet, du siehst zwei eigene Karten, fünf Gegner mit Namen; Fußzeile zeigt 2.2.0 |
| 2 | Eine Hand mit Fold, Check, Call und Bet/Raise (Betrag eintippen) zu Ende spielen | Aktionen werden ausgeführt, Pot und Stacks stimmen, am Ende Ergebnis mit Gewinner |
| 3 | Live-Anzeige ansehen, auf einen Gegnerplatz klicken | Am Platz: Name, Hände, VPIP, PFR, 3-Bet, Belastbarkeit, Spielertyp; Klick zeigt alle Werte und aufgedeckte Blätter |
| 4 | Tipp-Modus „vorher“ (Standard) | Vor deiner Aktion erscheint ein Tipp mit Aktion, Betrag, Begründung und dem Hinweis „Faustregel, kein Solver-Ergebnis“ |
| 5 | Tipp-Modus „nachher“, dann handeln | Nach der Aktion erscheint ein Urteil mit Begründung |
| 6 | Tipp-Modus „aus“ | Kein Tipp, kein Urteil |
| 7 | Sprachausgabe einschalten | Der Tipp wird auf Deutsch vorgelesen |
| 8 | 30 Hände spielen (Tempo „schnell“ hilft) | Ein Gegner verlässt den Tisch, ein anderer setzt sich; der Gegangene steht in der Gegnerdatenbank im Archiv |
| 9 | Browser schließen, Seite neu öffnen | Gegnerwerte, Handhistorie und Lernfortschritt sind erhalten; eine unterbrochene Hand wird fortgesetzt |
| 10 | Gegner → „Datenbank exportieren“ | Datei wird gespeichert |
| 11 | Gegner → Import der eben exportierten Datei | Vorher entsteht automatisch eine Sicherung; danach ist die Datenbank gleich |
| 12 | Handhistorie → eine Hand im Replayer Schritt für Schritt, „Entscheidung erneut treffen“ | Stand „damals bekannt / später bekannt“ getrennt, neue Analyse ohne spätere Karten |
| 13 | Handhistorie → „Export Benchmark“ | Datei je Entscheidung mit Spielzustand, Empfehlung, Alternativen und EV; spätere Showdown-Informationen getrennt |
| 14 | Training → eine Kategorie starten | Passende Situationen, Bewertung, Fortschritt in der Lernübersicht |
| 15 | App installieren (Browser-Menü), offline öffnen | App startet ohne Internet |
| 16 | Offline-Datei per Doppelklick öffnen | Trainer läuft ohne Internet, Version 2.2.0 |
| 17 | Fortschritt → „Neuen Vorher-Nachher-Test starten“, alle Situationen spielen | Training startet mit „Vorher-Test“ in der Leiste, endet nach der letzten Situation von selbst mit Hinweis; unter Fortschritt steht „Vorher: … (12 Situationen)“ und die Aufforderung zum Training |
| 18 | Danach eine der genannten Kategorien üben und „Nachher-Test starten“ | Nach dem Nachher-Test zeigt Fortschritt Vorher, Nachher und die Differenz mit ± Intervall; unter dem Test steht, dass damit keine allgemeine Lernwirkung nachgewiesen ist |
| 19 | Fortschritt ansehen, nachdem einige Fehler bewertet wurden | Tabellen „Fehlerfelder“ und „Verbesserung in zuvor schwachen Situationen“; bei mindestens drei gleichen Fehlern in derselben Situation ein Eintrag unter „Wiederkehrende Fehler“ mit „Gezielt üben“ |
| 20 | Auf einen Gegnerplatz klicken (Gegner mit vielen Händen) | Tabelle mit Spalte „Belastbarkeit des Werts“ (unsicher/Tendenz/belastbar je Wert) und Abschnitt „Verhaltenshypothesen“ mit „gestützt“ oder „Vermutung“ |
| 21 | Handhistorie → „Export Ereignisse (PAI)“ | Datei „PokerTrainer_Ereignisse_v1_…json“; Meldung mit Zahl der Entscheidungen |
| 22 | Einstellungen → Startstack 15 BB, neue Session, eine Hand in einem ungeöffneten Pot | Im Tipp (erweiterte Ansicht) steht „Handauswahl nach Push/Fold-Modellspiel (15 BB effektiv), Größe nach EV“; mit Händen außerhalb des Charts lautet die Empfehlung Fold |

## Fehlerfälle

| Nr. | Du tust | Muss passieren |
|---|---|---|
| 23 | Ungültigen Betrag eingeben (unter Minimum, über Stack, Text) | Meldung, keine Aktion |
| 24 | Eine beschädigte Datei importieren (z. B. Text in eine .json-Datei geschrieben) | Meldung „Import abgelehnt“, bestehende Daten unverändert |
| 25 | Seite mit `#ohne-sprache` am Ende der Adresse öffnen | Hinweis, dass keine Sprachausgabe verfügbar ist; Trainer läuft ohne Ton |
| 26 | Trainer in einem zweiten Tab öffnen | Zweiter Tab ist schreibgeschützt und bietet „Hier weiterspielen“ an, sobald der erste geschlossen ist |
| 27 | Seite mit `?start=sicher` öffnen | Abgesicherter Start; gespeicherte Daten bleiben unberührt |

## Grenzen

| Nr. | Du tust | Muss passieren |
|---|---|---|
| 28 | Mehrere Entscheidungen im Modus „vorher“ | Jeder Tipp erscheint binnen zwei Sekunden |
| 29 | Mit Sprachausgabe schnell hintereinander zwei Entscheidungen treffen | Nur der jüngste Tipp wird gesprochen, der ältere bricht ab |
| 30 | Nach Handende nichts tun | Keine neue Hand ohne „Nächste Hand“ |

## Übernahme

| Nr. | Du tust | Muss passieren |
|---|---|---|
| 31 | Installierte App bzw. Website mit Daten aus 2.1.0 öffnen, nachdem 2.2.0 veröffentlicht ist | Hinweis auf die neue Version, nach Bestätigung Neuladen; Gegnerwerte, Handhistorie und Lernfortschritt bleiben erhalten (keine Formatänderung der Datenbank) |
