# Unabhängige Prüfung 2.1 – Prüfer C (Architektur, Performance, Sicherheit, Datenbank) und Prüfer D (Oberfläche, Barrierefreiheit, PWA, Deployment)

Stand: Zweig `fix-cd-2.1` (Basis `strategie-2.1`, 5a484dd), 27.11.2026. Die Prüfskripte des ersten Prüfagenten
(`review2-c/c1…c17`, `review2-d/t1…t12`) wurden auf diesen Stand angepasst und erneut ausgeführt bzw. ihre Ergebnisse
nachvollzogen. Jede Entscheidung „bestätigt/widerlegt“ beruht auf einem eigenen Lauf auf diesem Stand (Ausnahme C13, siehe dort).

Regressionstests: `tests/unit/pruefung-cd.js` (Unit, läuft in `node tests/run.js`) und `tests/e2e/pruefung-cd.js`
(Browser, Teil `cd` von `node tests/e2e.js`, gezielt: `node tests/e2e.js <URL> --nur=cd`; Messmodul `tests/e2e/layout-messung.js`).

## Ergebnis in Zahlen

| | Prüfer C | Prüfer D | gesamt |
|---|---|---|---|
| Hypothesen | 17 | 12 | 29 |
| bestätigt (mindestens ein Teilbefund) | 10 | 10 | 20 |
| davon behoben | 10 | 9 | 19 |
| davon offen | – | 1 (t3, Versionsnummer: Release-Schritt) | 1 |
| widerlegt (Fehlalarm des Skripts, Messhinweis oder kein Fehler) | 7 | 2 | 9 |

Zusätzlich gefunden und behoben: Einsätze lagen auf dem River auf den Board-Karten (640–1180 px), Karten der unteren
Seitenplätze auf dem Board (320–360 px) – beide nicht von t4 erfasst (nur Preflop gemessen).

## Prüfer C

| Nr. | Bereich | Hypothese | Ergebnis | Begründung (Messung) | Korrektur | Test |
|---|---|---|---|---|---|---|
| C1 | Datenbank/Import | Zahlen wie `1e999` werden zu Infinity, Import angenommen, Export schreibt `null`, Rückimport scheitert | **bestätigt** | Import ok, `lastSeen = Infinity`, Rückimport „erstmals gesehen ungültig“; Lerndaten mit `ts = 1e999` gültig | `export.js`: `parseImport` prüft nach der Formatprüfung alle Zahlen auf Endlichkeit (`allFinite`) | Unit „Prüfung C1“ |
| C2 | Deployment/Daten | Archivfassung 2.0.1 im selben Ursprung überschreibt Format-3-Daten | **bestätigt** | Nur Öffnen: eigene Werte 6 → 0 Hände; nach einer Hand Gegner 6 → 1 Hand (Langzeitwerte verloren) | `archiv/` wird nicht mehr veröffentlicht (`pages.yml`), Datei bleibt unverändert im Repository; Hinweis zum Rückweg in `GEGNERGEDAECHTNIS.md` | Unit „Prüfung C2“ (Kopierliste) |
| C3 | Wiederherstellung | „Lokale Daten zurücksetzen“ freigegeben, obwohl die Rohsicherung die IndexedDB nicht enthält | **bestätigt** | Lesefehler in „opps“ + Altschlüssel `pokertrainer2.meta`: Sicherung 1 KB ohne IndexedDB, danach 0 von 5 Gegnern, 0 von 3 Händen | `recovery.js`: jeder Speicherbereich einzeln gelesen (Fehler kostet nicht die übrigen), Sicherung gilt dann als unvollständig, Zurücksetzen nur nach ausdrücklicher Verlust-Bestätigung; Hinweis auch beim Export aus den Einstellungen | Browser „Prüfung C3“ |
| C4 | Sicherheit/Import | Gegner-ID `__proto__` | **bestätigt** | Import ok, gemeldet 2 Gegner, übernommen 1; Prototyp von `db.opps` = Datensatz (kein globaler Prototyp verschmutzt) | `export.js`: angenommener Import wird abgelehnt, wenn gezählte ≠ übernommene Gegner oder Prototyp verändert | Unit „Prüfung C4“ |
| C5 | Sicherheit | HTML aus importierten Texten in der Offline-Datei (file://, `unsafe-inline`) | widerlegt | 0 eingeschleuste Elemente, kein Skript, keine CSP-Meldung in allen Ansichten, Replayer, Dialog, Benchmark-Export | – | bestehende Tests (robust.js) |
| C6 | Robustheit | SRS-Kategorie „constructor“ (aus `Object.prototype`) | **bestätigt** | `generate('constructor')` wirft TypeError; Wiederholung bricht beim nächsten Eintrag ab | `training.js`: `hasScen` (nur eigene Schlüssel), Rückfall auf „preflop-open“; `views.js`/`app.js` nutzen die Prüfung | Unit „Prüfung C6“ |
| C7 | Projektvorgabe | Nachrechnung der gewählten Größe überschreitet 5.000 Simulationen je Entscheidung | widerlegt | höchste Summe Tipp + Nachrechnung 3.000 (Cache warm und kalt, alle Referenzspots) | – | bestehende Tests (Obergrenze) |
| C8 | Performance | Tipp > 2 s bei 4-facher Drosselung | widerlegt | Hauptthread-Rückfall (volle Drosselung, vgl. C9): Median 124 ms, max 589 ms; nach Tiefenanalyse max 95 ms | – | – |
| C9 | Messmethode | CDP-Drosselung wirkt auf Worker | Hinweis, kein App-Fehler | Faktor Hauptthread 4,2, Worker nur 1,8: Drossel-Messungen im Worker sind zu optimistisch; deshalb C8 im Hauptthread gemessen | – | – |
| C10 | Performance | `Store.addHand` liest nach jeder Hand alle Hände | **bestätigt** | 3.006 Hände (≈ 46 KB je Hand): Blockade am Handende 1,8 s (4×: 8,4 s), `addHand` 2,9 s | `store.js`: zählen und älteste Schlüssel über den Index „ts“ per Schlüssel-Cursor löschen (kein `getAll`); Rückfall für localStorage/ohne Index | Browser „Prüfung C10“ |
| C11 | Performance | Erster Tipp nach Handende mit 3.000 Händen verspätet | widerlegt | max 283 ms (6 Messungen) | (C10 entfernt die Ursache der Blockade) | – |
| C12 | Daten | Beschädigte Einträge ohne Rohsicherung entfernt (Start, Import) | **bestätigt** (beide Teile) | Start: beschädigte eigene Werte 4 → 0 Hände ohne Download; Import: nur reguläre Sicherung, beschädigter Gegner ersetzt | `app.js`: vor dem ersten Speichern beim Start Rohsicherung (einmal je Befund, Kennung je Teil im Store „backup“; misslingt sie, speichert der Tab nicht); `views.js`: Import lädt bei beschädigten Einträgen zusätzlich die Rohsicherung (wie Löschen) | Browser „Prüfung C12“ |
| C13 | Speicher | Speicherwachstum über viele Hände | widerlegt (nicht erneut ausgeführt) | Lauf des ersten Prüfers (700 Hände): Heap 1,8 → 10,4 MB, begrenzt durch Kappungen (SRS 300, Entscheidungen); DOM 831–844 Knoten, Listener 61–63 stabil. Zeit- und Blockadeanstieg je 100 Hände = C10. Neuer 2.000-Hände-Lauf aus Rechenzeitgründen nicht wiederholt | – | – |
| C14 | Daten | Vollständige Sicherung größer als die Importgrenze (60 MB) | **bestätigt** | 2.004 Hände → 67,4 MB, Wiederimport „zu groß“; 3.000 Hände ≈ 130 MB | **ENGINE** `stats.js`: `MAX_IMPORT` 256 MB (nur Importprüfung, exportiert als `PT.stats.MAX_IMPORT`); `views.js`/`export.js` nutzen dieselbe Grenze; Sicherung vor Import/Löschen bricht ab, falls sie größer wäre (nichts geändert); Prüfzeit-Limit wächst mit der Dateigröße | Unit „Prüfung C14“; bestehende Größentests auf die Konstante umgestellt |
| C15 | Mehrere Tabs | Ohne Web Locks zwei schreibende Tabs | **bestätigt** (Teil 2) | gleichzeitig: 1 Schreiber (ok); schreibender Tab 1,5 s blockiert: 2 Schreiber | `app.js`: späte Antwort „ich“ nach der Entscheidung → neuer Tab wird schreibgeschützt (`demote`) | Browser „Prüfung C15“ |
| C16 | PWA/Tabs | Update mit zwei Tabs | **bestätigt** (beide Teile) | Nach „Jetzt aktualisieren“ war Tab A schreibgeschützt (B hielt die Sperre nur wartend); alter Tab B lud `worker.js` des neuen Stands | `app.js`: wartender Tab antwortet „passiv“, neu geladener Tab übernimmt die Sperre (`steal`), B wartet wieder; nach Aktivierung eines neuen Stands in einem anderen Tab startet der alte Tab keine Worker mehr (Hauptthread) | Browser „Prüfung C16“; Originalskript c16: A schreibt nach dem Update weiter |
| C17 | Robustheit | Validierte Momentaufnahmen lassen `coach.analyze` werfen/hängen | widerlegt | 600 Fuzz-Fälle: 0 Ausnahmen, 0 nicht endliche Werte, keiner > 1,5 s | – | – |

## Prüfer D

| Nr. | Bereich | Hypothese | Ergebnis | Begründung | Korrektur | Test |
|---|---|---|---|---|---|---|
| t1/t1b | Fokus (2.4.3) | Fokus geht beim Neuzeichnen verloren | **bestätigt** | Gegnerplatz → `<body>` nach 3 Bot-Aktionen; „Jetzt aktualisieren“, Replayer „Schritt vor“, Gegner „Archiv“, nach eigener Aktion → `<body>` (40 Tabs zurück zu den Aktionen) | Plätze werden an Ort und Stelle aktualisiert (Knopf bleibt dasselbe Element); Hinweise, Tipp, Kurz-Tipp, Presets, Trainingsleiste nur bei geänderter Ausgabe; `keepFocus` für Replayer und Gegnerliste; gesperrter Aktionsknopf → Fokus bleibt in der Aktionsleiste (`#actions`), dann „Check/Call“ bzw. „Nächste Hand“ | Browser „Prüfung D (t1/t1b)“ |
| t2 | axe (2.1.1) | Verstöße in allen Ansichten | **bestätigt** (nur 1 Regel) | einzig `scrollable-region-focusable` am Handverlauf `#log` (Handende, mit Update-Hinweis) | `#log` mit `tabindex="0"` und `aria-labelledby` | Browser „Prüfung D (t6, t10, t2, t5)“ |
| t3 | PWA-Update | Update 2.0.1 → Prüfstand | **bestätigt, offen** (1 Teilbefund) | Update, Migration mit Sicherung, Offline, ein Cache: in Ordnung. `PT.VERSION` ist noch „2.0.1“ bei anderem Inhalt | nicht geändert: Versionssprung ist ein Release-Schritt (`core.js`, `index.html`, `CHANGELOG`) – siehe „Offen“ | – |
| t4/t4b/t4c | Layout | Überdeckungen am Tisch 320–1440 px | **bestätigt** | eigener Einsatz auf den Rängen der eigenen Karten (≤ 1180 px); Karten des oberen Platzes auf Pot und Einsatz (640–1100 px); Einsätze übereinander und auf Namensschildern (320–390 px); Marker rechts außerhalb des Tisches (im Coach-Panel bzw. über den Fensterrand). „verdeckt von felt“ bei ≥ 1280 px ist ein Fehlalarm (`pointer-events:none` der Karten) | `app.css`: Einsätze in px relativ zu Namensschild/Karten, Karten des oberen Platzes seitlich, Smartphone: seitliche Einsätze am Schild ausgerichtet und versetzt, kleinere Chips, Karten der unteren Seitenplätze unter dem Schild; Marker auf der Unterkante des Schilds | Browser „Prüfung D (t4/t7)“ (5 Breiten × Preflop/All-in/River) |
| t5 | Start | Startfälle | **bestätigt** (1 Teil) | „JavaScript aus“: dauerhaft „Lade …“ ohne Erklärung. „Beschädigte Daten“ war ein Skriptfehler (Hash-Navigation ohne Neuladen; t5b mit Neuladen besteht) | `<noscript>`-Hinweis | Browser (ohne JavaScript) |
| t6 | Quiz (2.4.3, 4.1.3) | Fokus nach Antwort, Ansage | **bestätigt** | Fokus → `<body>`, Ergebnis nicht angesagt | Fokus auf „Nächste Frage“, Ergebnis über `announce()`, danach Fokus auf die erste Antwort | Browser „Prüfung D (t6 …)“ |
| t7/t7b | Umbruch (1.4.10, 1.4.12) | horizontales Scrollen, Abschneiden | **bestätigt** (2 Teile) | 640 px: Marker SB/BB außerhalb (durch `overflow-x:clip` abgeschnitten) → mit t4 behoben; Textabstände: HUD-Werte mit Auslassungszeichen abgeschnitten. Fehlalarme: Sprunglink (absichtlich außerhalb), Navigation und Datentabellen (eigene Scrollbereiche), `scrollWidth` 684/363 ohne sichtbares Element außerhalb | HUD bricht um statt abzuschneiden | Browser „Prüfung D (t4/t7)“ |
| t8/t8b | Fokus sichtbar/nicht verdeckt (2.4.7, 2.4.11), Zielgröße | | widerlegt | „verlässt Bereich“: Tab-Folge erreicht das Seitenende (Kopf/Sprunglink); „verdeckt“: Messung während weichen Scrollens (nach 1,95 s sichtbar); Zielgrößen bestanden | – | – |
| t9 | Archiv | wie C2 | **bestätigt** | Langzeitwerte 4 → 0 → 2 Hände (das Skript wertete fälschlich als „ok“) | siehe C2 | Unit „Prüfung C2“ |
| t10 | Tastatur/Ansagen | Sprunglink, Kürzel, Ansagen | **bestätigt** (5 Teile) | Sprunglink wechselt zum Tisch (`#main` unbekannte Route); „F“ auf fokussiertem Gegnerplatz foldet (widerspricht BARRIEREFREIHEIT.md §4); „Du bist am Zug …“ doppelt (65 ms Abstand); „Update bereit“/„Speichern fehlgeschlagen“ nicht angesagt; Gegnerwechsel als `role="alert"` | Sprunglink über `data-goto` ohne Hash-Wechsel; Kürzel nicht auf Links/Knöpfen außerhalb der Aktionsleiste (Doku präzisiert); Zug-Ansage wartet bis 1,2 s auf den Tipp und kommt einmal; wichtige Hinweise über `announce()`; `#msg` als `role="status"`, Handende-Ansage enthält Gegnerwechsel/Nachkauf | Browser „Prüfung D (t6, t10, t2, t5)“ |
| t11/t11b | PWA | installierbar | widerlegt | „in-incognito“ nur im nicht persistenten Testkontext; persistentes Profil: keine Fehler, Symbole korrekt | – | – |
| t12 | Fehleranzeige | Fokus nach „Weiter warten“ | **bestätigt** (1 Teil) | Fokus → `<body>`; reduzierte Bewegung, Kartenfarben im Verlauf in Ordnung | `recovery.js`: Fokus zurück auf das vorherige Element (sonst Hauptbereich) | Browser „Prüfung C3 … (D t12)“ |

## Geänderte Engine-Dateien

- `assets/js/engine/stats.js` – nur Commit „ENGINE: Prüfung C14“ (19b14a7): Konstante `MAX_IMPORT` 60 → 256 MB, Fehlermeldung, Export
  `PT.stats.MAX_IMPORT`. Kein Einfluss auf Spielablauf, Gegner-KI oder Coach.
- Nicht in der geschützten Liste, aber Engine-Ordner: `export.js` (Importprüfung C1/C4), `training.js` (`hasScen`, C6).

## Nicht behebbar / offen

- **Versionsnummer (t3):** `PT.VERSION`/`?v=` stehen auf 2.0.1, obwohl sich der Inhalt geändert hat. Der Service Worker ist über die
  Inhaltsprüfsumme trotzdem korrekt; vor dem Go-live muss die Version angehoben werden (Release-Schritt, `core.js` geschützt).
- **Archivfassung per `file://`:** Auch als lokale Datei teilt die Archivfassung 2.0.1 die IndexedDB mit der ebenfalls per `file://`
  geöffneten Offline-Datei 2.1. Die Datei bleibt laut Projektvorgabe unverändert; Rückweg nur nach vollständiger Sicherung und in einem
  eigenen Browserprofil (dokumentiert).
- **Sehr große Datenbestände:** Eine vollständige Sicherung über 256 MB (praktisch nur bei 3.000 sehr langen Händen) wird erzeugt, aber vor
  Import/Löschen nicht als Sicherung akzeptiert (Vorgang bricht ab, nichts wird geändert); Speicherbedarf beim Import großer Dateien im
  Browser bleibt hoch (Datei, Kopie im Worker, Objekte).
- **Handhistorie öffnen mit 3.000 Händen:** weiterhin alle Hände lesen und prüfen (gemessen 5 s, Blockade 2,4 s ungedrosselt); das ist
  die Funktion selbst, nicht behoben.
- **Ohne Web Locks, gleichzeitiger Start zweier Tabs:** Beide können schreibgeschützt werden (sicher, aber ohne Schreiber bis zum
  Neuladen); unverändert.
- **Waagerecht scrollende Navigation** bei 320 px und 640 px (eigener Scrollbereich der Reiterleiste) bleibt so.

## Screenreader

Ein echter Screenreader-Test mit NVDA, JAWS oder VoiceOver ist in dieser Umgebung (Linux-Container ohne Windows/macOS) nicht möglich.
Versucht wurde Orca 46 mit Chrome auf einem virtuellen Bildschirm (Xvfb, AT-SPI): In einem Lauf meldete sich Orca und sprach
Chrome-Fenster und Adressleiste; der Fokus ließ sich über die Testautomatisierung aber nicht verlässlich in den Seiteninhalt bringen, und
weitere Starts blieben beim Anmelden an AT-SPI hängen. **Es liegt daher kein aussagekräftiger Screenreader-Test vor.**

Ersatzprüfungen (alle automatisiert):
- axe-core (WCAG 2.2 AA + Best Practice) in allen Ansichten, Dialogen und Zuständen, hell/dunkel, Desktop/360 px (bestehende Tests, t2);
- Accessibility-Baum von Chromium (Playwright `ariaSnapshot`, bestehende Tests);
- Mitschnitt aller Live-Ansagen per MutationObserver (Zug-Ansage genau einmal, Quiz-Ergebnis, „Speichern fehlgeschlagen“);
- Fokusführung per Tastatur (Neuzeichnen, eigene Aktion, Dialoge, Fehleranzeige, Sprunglink) und Kürzelverhalten.

Ein Test mit Menschen, die Screenreader täglich nutzen, steht weiterhin aus (vgl. `docs/BARRIEREFREIHEIT.md` §4).
