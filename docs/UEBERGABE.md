# Übergabe – laufende Arbeit

Stand: 28.11.2026, nach der Entwicklungsrunde 2.3.1. Diese Datei beschreibt nur den aktuellen Arbeitsstand und den nächsten Schritt;
Geschichte und Regeln: `docs/PROJEKTSTAND.md`, `docs/LERNPROTOKOLL.md`, `CLAUDE.md`.

## Versionen

| Stand | Ort | Status |
|---|---|---|
| 2.0.1 | Zweig `sicherung-2.0.1`, `archiv/PokerTrainer_2.0.1.html` | Referenz (gleichgewichtsnaher Modus) |
| 2.1.0 | `main` = `sicherung-2.1.0`, `gh-pages` | **öffentlich** |
| 2.2.0 | Zweig `sicherung-2.2.0`, `archiv/PokerTrainer_2.2.0.html`, PR #2 | nicht freigegeben, Referenz |
| 2.3.0 | Commit `601df61` auf `entwicklung-2.3` | nicht freigegeben, in 2.3.1 enthalten |
| 2.3.1 | Zweig `entwicklung-2.3`, eingefroren `6d6e575` (danach nur Doku, Berichte, Tests) | **Release-Kandidat**, Final Acceptance Test vorbereitet |

## Offen beim Auftraggeber

1. Final Acceptance Test Teil B (`docs/FINAL_ACCEPTANCE_TEST.md`), dann „Freigabe“ oder Fehlerliste.
2. Lizenz und Anbieterkennzeichnung (`docs/RECHTLICHES.md`).
3. Entscheidung, ob die PAI-Echtzeitschnittstelle (`pai-schnittstelle-2.1`, PR #1) übernommen werden soll (eigener Auftrag).

## Nächste sinnvolle technische Schritte (je eigener Auftrag)

1. **Equity gegen unbekannte Strategien am River nach Checks** (F23 −0,15, Ka23 −0,08, Gegner-KI V/T ≈ 0): Diagnose in
   `docs/TESTBERICHT_2.3.1.md` §4. Ansatz: Showdown-Kalibrierung je Gegner (gezeigte Hände gegen die vorhergesagte Range) statt globaler
   Verbreiterung; Entwicklung nur auf Tr23/E, Wahl auf Va23/V, Abschluss auf einer **neuen** versiegelten Gruppe (F23 ist verbraucht).
2. **Gleichgewichtsnaher Modus:** Variante `gtoRaiseAdj` (Schalter in `ev.js`) normalisiert den Raise-Anteil, ohne belegten BB/100-Vorteil. Ein
   echter Fortschritt braucht vermutlich Mischstrategien statt Einzelhand-Empfehlung (B7-Problem) oder ein Modellspiel auch für Turn/Flop.
3. Offene geringe Befunde: B-6, B23-9, C23-5, E23-12 (`docs/TESTBERICHT_2.3.1.md` §5).

## Umgebung

- Referenz-Arbeitsbäume für Vergleiche: `git worktree add ../wt-v201 origin/sicherung-2.0.1` (ebenso `wt-v210`, `wt-v220`).
- PAI-Klon (nur lesen) für `tests/pai-integration.mjs`: `git clone https://github.com/milkiasasmarome-eng/assist ../milkiasasmarome-eng/assist`,
  dann `git -C … fetch origin entwicklung/0.4.0` und `npm ci` im Klon.
- Browsertests: `npm ci --prefix tests`; Chromium aus Playwright (`CHROME=`). Der erste Lauf direkt nach der Installation hatte einmal
  sechs Zeitüberschreitungen, der Wiederholungslauf 52/52 – bei Fehlschlägen erst wiederholen, dann untersuchen.
