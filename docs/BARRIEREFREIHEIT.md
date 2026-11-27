# Barrierefreiheit – Prüfbericht (Stand 2.1, Zweig ui-2.1)

Ziel: WCAG 2.2 Stufe AA. Geprüft wurde automatisiert mit axe-core und mit eigenen Browsertests (Playwright, Chromium) sowie
durch Auswertung des Accessibility-Baums. **Ein echter Screenreader-Test mit Sprachausgabe hat nicht stattgefunden** (siehe
„Grenzen“). Alle Prüfungen sind wiederholbar: `node tests/e2e.js http://127.0.0.1:8767/ --nur=a11y` (Teil von `node tests/e2e.js`
und des Workflows). Rohdaten: `tests/results/a11y/axe.json`, Accessibility-Bäume `tests/results/a11y/aria-*.yml`.

## 1. Automatische Prüfung mit axe-core

- Werkzeug: axe-core 4.14.1 (npm, nur in `tests/`, nicht Teil der Website), Regeln mit den Tags `wcag2a`, `wcag2aa`, `wcag21a`,
  `wcag21aa`, `wcag22aa` (Test schlägt fehl) und `best-practice` (wird gemeldet).
- Umfang: 24 Prüfläufe – Tisch mit Tipp „vorher“ (erweiterte Ansicht, aufgeklappter EV-Vergleich), Tisch nach dem Urteil „nachher“,
  Gegnerdialog, alle sieben Bereiche (Handhistorie mit geöffnetem Replayer, Range-Matrix mit gewählter Hand), Fehleranzeige der
  Startüberwachung – jeweils **hell und dunkel** – sowie Smartphone 360 × 740 (Tisch mit Hinweisleiste, Range-Matrix).
- **Ergebnis nach den Korrekturen: 0 Verstöße gegen WCAG-Regeln, 0 Best-Practice-Meldungen.**

Befunde vor den Korrekturen (alle behoben):

| Befund (axe-Regel) | Schwere | Stelle | Korrektur |
|---|---|---|---|
| `aria-required-children`, `aria-required-parent`, `aria-allowed-attr` (339 Knoten) | kritisch | Range-Matrix: `role="grid"` ohne Zeilen, `gridcell` mit `aria-pressed` | Gruppe mit Schaltflächen, ein Tab-Stopp, Pfeiltasten/Pos1/Ende (Roving Tabindex), Werte für Raise/Call/Fold im Namen |
| `color-contrast` | ernst | Werte an gefoldeten Plätzen (Deckkraft 72 % → 3,5 : 1), „Alle Daten löschen“ dunkel (3,2 : 1), Bewertungs- und Klassifikationsabzeichen (4,3–4,5 : 1) | keine Deckkraft auf Text (gestrichelter Rahmen statt Transparenz), eigene Textfarben für Fehler/Erfolg im Dunkelmodus, dunklere Abzeichenfarben (≥ 5,3 : 1) |
| `label-content-name-mismatch` | ernst | Ansicht-Schalter („Einfach“ sichtbar, „Erweiterte Ansicht“ als Name), Gegnerplätze („Werte von … anzeigen“ ohne sichtbaren Text) | fester sichtbarer Text + `aria-pressed`; Platzname = sichtbarer Inhalt, ausgeschrieben für Screenreader („Yara, SB, Stack 95,50 (96 BB), VPIP 0 %, …, alle Werte anzeigen“) |
| `aria-prohibited-attr` | ernst | `aria-label` auf `div` (Board, eigener Platz) | `role="group"` |
| `aria-hidden-focus` | ernst | Kurz-Tipp auf dem Smartphone: `aria-hidden` mit Link darin | `aria-hidden` entfernt |
| `region` | mäßig | Hinweisleiste außerhalb von Landmarks | `role="region"` mit Namen „Hinweise“ |
| `empty-table-header`, `heading-order` | gering | leere Spaltenköpfe (EV-Tabelle, Fortschritt), Sprung h2 → h4 (Replayer, Range-Details) | unsichtbare Spaltennamen, Tabellenbeschriftung, h3 |

Von axe nicht entscheidbare Fälle („incomplete“, v. a. Text auf dem Filzverlauf, Matrixfelder mit Farbfüllung, `skip-link`, Namen
von Links mit `aria-label`) wurden von Hand nachgerechnet bzw. geprüft:

| Paar | Kontrast | Anforderung |
|---|---|---|
| Pot/Board-Text #eef5f1 auf hellstem Filzton #1b7d67 / auf Pot-Fläche | 4,54 : 1 / 7,53 : 1 | 4,5 : 1 |
| Einsatzbetrag weiß auf Chip-Fläche | 10,9 : 1 | 4,5 : 1 |
| Matrix-Beschriftung #111 auf Fold / Call / Raise (Raise-Farbe auf #d85f45 geändert, vorher 4,48) | 6,1 / 5,3 / 5,1 : 1 | 4,5 : 1 |
| Kartenfarben auf Kartengrund: Rot / Schwarz / vierfarbig Blau / Grün | 5,2 / 16,8 / 5,7 / 5,1 : 1 | 4,5 : 1 |
| Nebentext hell / dunkel (Panel, Panel 2) | 6,5 / 5,9 · 7,1 / 6,5 : 1 | 4,5 : 1 |
| Fokusrahmen #2f7de1 auf Panel hell / dunkel | 3,9 / 4,2 : 1 | 3 : 1 (1.4.11) |
| Fokus auf Gegnerplätzen über dem Filz: blauer Rahmen + weißer Ring (Blau auf Filz allein wäre 1,8 : 1) | Ring auf Filz > 6 : 1, Blau auf Ring 3,9 : 1 | 3 : 1 |
| Markierung „am Zug“ #f1c94b auf Filz | 4,7 : 1 | 3 : 1 |

Der Sprunglink („Zum Inhalt springen“) ist nur bei Fokus sichtbar und führt auf `<main tabindex="-1">`; geprüft im Tastaturtest.

## 2. Eigene Prüfungen im Browser (alle bestanden)

| Kriterium | Prüfung (tests/e2e/a11y.js, tests/e2e.js) | Ergebnis |
|---|---|---|
| 2.1.1 Tastatur | sechs Hände nur mit Tastatur: N (Nächste Hand), C/K, F, R → Betrag tippen → Enter; T (Tipp-Modus), 1–9/A (Presets), Esc | bestanden |
| 2.1.2 keine Tastaturfalle, Dialoge | Gegnerdialog per Enter: Fokus auf „Schließen“, 14 × Tab und 5 × Umschalt+Tab bleiben im Dialog, Hintergrund `inert`, Esc schließt, Fokus zurück auf den Platz; Fehleranzeige ebenso | bestanden |
| 2.4.1 Bereiche überspringen | erster Tab-Stopp ist der Sprunglink; Landmarks banner, navigation „Bereiche“, main, contentinfo, Region „Hinweise“ | bestanden |
| 2.4.3 Fokusreihenfolge | 70 Tab-Stopps hell und dunkel: Sprunglink → Kopf → Navigation → Tisch → Aktionen → Coach → Verlauf → Fußzeile | bestanden |
| 2.4.7 Fokus sichtbar | jeder Tab-Stopp hat Rahmen ≥ 2 px oder Schatten; in Bereichen mit `overflow` nach innen versetzt (vorher in Navigation und Moduswahl abgeschnitten) | bestanden |
| 2.4.11 Fokus nicht verdeckt | Mittelpunkt bzw. eine Ecke des fokussierten Elements ist sichtbar (`elementFromPoint`), nicht außerhalb des Fensters | bestanden |
| 2.5.3 Name im Label | Tastenkürzel-Hinweise (`<kbd>`) sind `aria-hidden`, Kürzel stehen in `aria-keyshortcuts`; Namen: „Fold“, „Call 3,00“, „Raise auf“, „½ (4,50)“ | bestanden |
| 2.5.8 Zielgröße (Minimum) | alle Bedienelemente außerhalb von Fließtext ≥ 24 × 24 px (Kontrollkästchen und Fußzeilenlink vergrößert); axe `target-size` auf dem Smartphone | bestanden |
| 1.1.1 / 1.3.1 Karten | jede Karte `role="img"` mit Rang und Farbe („König Herz“), verdeckte Karten „verdeckte Karte“; Farbe nie einziges Merkmal (Symbol ♠♥♦♣, Text) | bestanden |
| 4.1.3 Statusmeldungen | am Tisch drei Live-Regionen: `#announce` (sparsam: eigener Zug mit Straße, Board, Aktionen seit der eigenen letzten Aktion und Callbetrag; Coach-Empfehlung; Handende; Moduswechsel), `#msg` (Fehler, `alert`), `#toast`; in der Handhistorie zusätzlich die Schrittanzeige des Replayers, in den Ranges die Detailbox. Status, Pot, Ergebnis und Tippfeld sind **nicht** mehr live (vorher Ansage bei jeder Bot-Aktion) | bestanden |
| 2.1.4 Tastenkürzel aus einem Zeichen | neue Einstellung „Tastenkürzel aus einem Zeichen“ (Standard an) schaltet F, C, R, N, T, 1–9, A, ? ab; vorher nicht abschaltbar (Verstoß Stufe A) | behoben |
| 3.1/3.3 Verständlichkeit Coach | Tipp beginnt für Screenreader mit „Empfehlung:“, Begründung als ganzer Satz, Kennzahlen beschriftet (Equity, Benötigt, Pot, Eff. Stack), Fachbegriffe als Schaltflächen mit Glossar, „Faustregel, kein Solver-Ergebnis“ sichtbar; Erklärtiefe Einsteiger/Fortgeschritten/Experte | bestanden |
| 2.3.3 / prefers-reduced-motion | keine Animationen (Puls, Kartenausteilen), kein weiches Scrollen, auch per JavaScript (`scrollIntoView`) | bestanden |
| 1.4.10 Umbruch | kein horizontales Scrollen bei 320, 360, 390, 820, 1440 px Breite in allen Bereichen | bestanden |
| 1.4.3 / 1.4.11 Kontraste | axe in hell und dunkel, Nachrechnung siehe oben | bestanden |

## 3. Screenreader

- **NVDA, JAWS, VoiceOver, TalkBack:** in dieser Umgebung nicht verfügbar (Linux-Container ohne Windows/macOS/Android).
- **Orca 46.1 mit espeak-ng** ließ sich installieren (`apt-get install orca espeak-ng at-spi2-core speech-dispatcher`) und mit
  Xvfb, eigener D-Bus-Sitzung, AT-SPI und Chrome (`--force-renderer-accessibility`, sichtbares Fenster) starten. Orca erkannte
  Chrome über AT-SPI und sprach laut Protokoll den Fenstertitel („PokerTrainer 2.0 – No-Limit Hold'em Trainer mit Coach“).
  Danach blieb Orca in drei Versuchen in der Sprachausgabe hängen (keine Audioausgabe im Container, Verbindung zu
  speech-dispatcher nicht hergestellt: `established: False`); Fokuswechsel und Ansagen der Seite wurden nicht mehr protokolliert.
  **Ein aussagekräftiger Screenreader-Test war damit nicht möglich.** Das wird hier nicht als bestanden gewertet.
- **Ersatzprüfung:** Accessibility-Baum von Chromium (`locator.ariaSnapshot()`, Playwright) für die zentralen Abläufe, gespeichert
  in `tests/results/a11y/`: Tisch mit eigenem Zug (`aria-tisch.yml`), Gegnerdialog, Handhistorie mit Replayer, Fehleranzeige.
  Geprüft: Landmarks, Überschrift „Coach“, Gruppe „Tipp-Modus“ mit Zustand `[pressed]`, Aktionsknöpfe ohne Kürzel-Rauschen,
  Karten als Bilder mit Rang und Farbe, Gegnerplätze mit allen Werten, „Empfehlung: …“ und „Faustregel, kein Solver-Ergebnis“,
  benannter Dialog mit Tabelle, beschriftete Replayer-Schritte, Fehleranzeige als `alertdialog` mit Namen.
  Der Baum zeigt, *was* ein Screenreader erhält, nicht, *wie* er es vorliest (Lesereihenfolge im Lesemodus, Ausführlichkeit,
  Verhalten der Live-Region und der Tastenkürzel im Fokus- und Lesemodus).

## 4. Grenzen und offene Punkte

- Automatische Werkzeuge erkennen nur einen Teil der WCAG-Probleme; die eigenen Tests decken die oben genannten Kriterien ab,
  nicht jedes Erfolgskriterium (z. B. nicht geprüft: 1.4.12 Textabstände, 1.4.4 Zoom 200 % auf allen Geräten, 1.4.13 Tooltips,
  3.3.x bei allen Formularfeldern der Einstellungen).
- Tastenkürzel aus einem Zeichen gelten nur am Tisch und nur, wenn kein Eingabefeld, Dialog, Link oder Knopf außerhalb der
  Aktionsleiste den Fokus hat (in der Aktionsleiste – Fold, Check/Call, Raise, Beträge, Nächste Hand – bleiben sie aktiv);
  sie lassen sich abschalten. Ein Umbelegen der Tasten gibt es nicht (für 2.1.4 genügt das Abschalten).
- Der Tisch ist eine grafische Anordnung; Screenreader-Nutzer folgen dem Spiel über die Ansagen beim eigenen Zug und den
  Handverlauf (Liste). Bot-Aktionen werden nicht einzeln angesagt (bewusst sparsam).
- Ein Test mit Menschen, die Screenreader oder Vergrößerung täglich nutzen, steht aus.
