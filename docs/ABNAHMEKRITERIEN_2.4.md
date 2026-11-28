# Abnahmekriterien 2.4 (vor den Läufen festgelegt)

Stand: 28.11.2026, vor dem ersten Lauf von `dev24`. Grundlage: Kriterien und Verfahren 2.3 (`ABNAHMEKRITERIEN_2.3.md`), unverändert soweit hier
nichts anderes steht. Statistik: all-in-bereinigte BB/100, gepaarte Seeds, Block-Bootstrap (500er-Blöcke), Nichtunterlegenheit mit dem konservativeren
von geschichtetem und zweistufigem Verfahren, mindestens 20 Blöcke.

## Fragestellung

P4 (gleichgewichtsnah 2.3 gegen 2.0.1) ist in 2.3 nicht bestanden (−6,3 [−12,5; −0,1]). Hypothese H-G1 aus den Rohdaten von Plan v23 (Gruppe pG):
Seit der Korrektur „Prüfer B 7“ (2.1) entfallen im gleichgewichtsnahen Modus die Fold-Korrekturen 2.0.1 (Raise-/Overbet-Abschlag `alpha`,
konservativer Abschlag `shrink`). Der Modus raist dadurch postflop rund dreimal so oft wie 2.0.1 (8,1 % statt 2,7 % der Postflop-Entscheidungen) und
callt seltener (3,1 % statt 4,9 %); dasselbe Muster zeigen 2.1.0 und 2.2.0 (Gruppen `gto`, `h6gto`).

## Varianten (Schalter in `PT.ranges.ABL`, nur gleichgewichtsnaher Modus)

| Kennung | Änderung |
|---|---|
| g24-0 | Stand 2.3 (Referenz) |
| g24-R | Fold-Korrekturen 2.0.1 nur für Raises und Jams gegen einen Einsatz (`gtoRaiseAdj`); Bets bleiben bei reiner MDF-Annahme (Prüfer B 7 bleibt erfüllt) |
| g24-P | alle Fold-Korrekturen 2.0.1 (`gtoPopAdj`), Prüfer B 7 wäre wieder verletzt |

## Entwicklung (Plan `dev24`)

Gegner-KI 2.2, gemischt, 100 BB, Seeds 24001–24008 (8 × 2.500 Hände je Held, 40 Blöcke), Helden g24-0, g24-R, g24-P und 2.0.1 gleichgewichtsnah.
Wahlregel: höchste Differenz gegen 2.0.1; liegt g24-R höchstens 2 BB/100 unter g24-P, wird g24-R gewählt (kleinere Änderung, Prüfer B 7 bleibt
erfüllt). Liegt keine Variante über g24-0, bleibt der Modus unverändert und experimentell. Höchstens fünf Varianten insgesamt.

## Abschließende Prüfung (Plan `val24`, nach dem Einfrieren)

| Kennung | Vergleich | Gegner | Hände je Held / Seeds | Kriterium |
|---|---|---|---|---|
| P4' | gewählte Variante gegen 2.0.1 gleichgewichtsnah | Gegner-KI 2.2, gemischt, 100 BB | 60.000 / 24 (Seeds 24401–24424, unberührt) | nicht unterlegen, δ_gto = 8 BB/100 (wie 2.3), einseitig 2,5 % |
| G2 | gewählte Variante gegen g24-0 (Stand 2.3) | wie P4' | wie P4' | beschreibend |
| G3 | gewählte Variante gegen 2.0.1 gleichgewichtsnah | unbekannte synthetische Strategien (synth23, Gruppe Ka23, in 2.3 nur für Kalibrierung genutzt, nie für Strategiewahl) | 15.000 / 6 (Seeds 24451–24456) | beschreibend (zu wenige Blöcke für ein Urteil unter 30) |

Bestanden P4', wird der Modus auf den gewählten Stand gesetzt. Die Kennzeichnung „experimentell“ entfällt nur, wenn zusätzlich G3 nicht belegt
schlechter ist als 2.0.1. Der exploitative Modus (Voreinstellung) bleibt unverändert; ein Test sichert, dass seine Empfehlungen identisch bleiben.

## Rechenzeit und Abbruch

Ein Lauf mit 2.500 Händen dauert etwa 55 s je Prozess; 4 Kerne, höchstens 3 Prozesse parallel. dev24: 32 Läufe (≈ 10 min), val24: 72 Läufe
(≈ 25 min). Abbruch: Fehler im Lauf dreimal wiederholt, dann entfällt der Seed für alle Helden (Regel A23-7). Während val24 keine Änderung an
Engine-Dateien.
