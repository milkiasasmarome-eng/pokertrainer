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

## Ergebnis der Entwicklung und Festlegung der abschließenden Prüfung (nach dev24, vor val24)

dev24 (40 Blöcke je Vergleich, `tests/results/strategy-dev24.json`), Differenz gegen 2.0.1 gleichgewichtsnah, all-in-bereinigt:

| Variante | BB/100 | 95-%-Intervall | Raise-Anteil postflop | Call-Anteil |
|---|---:|---|---:|---:|
| g24-0 (Stand 2.3) | +4,35 | [−4,05; 12,52] | 8,6 % | 3,2 % |
| g24-R | +4,35 | [−1,79; 10,53] | 1,6 % | 6,3 % |
| g24-P | +0,07 | [−5,66; 5,95] | 1,7 % | 6,5 % |
| (2.0.1 selbst) | | | 2,6 % | 5,9 % |

Wahlregel angewandt: Keine Variante liegt über g24-0 (g24-R gleich, nicht höher). **Der Modus bleibt unverändert** (Stand 2.3, Schalter aus) und
„experimentell“. H-G1 ist als Mechanismus bestätigt (Raise-Anteil), aber ohne belegten Nutzen in BB/100.

Damit wird val24 eine **Replikation von P4 auf unberührten Seeds** für den unveränderten Modus (Version 2.3.1, Entscheidungen identisch mit 2.3.0):

| Kennung | Vergleich | Seeds | Kriterium |
|---|---|---|---|
| ID | 2.3.1 gleichgewichtsnah auf P4-Seed 23801 gegen den gespeicherten 2.3.0-Lauf | 23801 | identisches Ergebnis (Summe BB und Entscheidungen gleich) |
| P4' | 2.3.1 gleichgewichtsnah gegen 2.0.1, Gegner-KI 2.2, gemischt, 100 BB | 24401–24424 (60.000 Hände) | beschreibend |
| P4-gesamt | P4 ∪ P4' (48 Seeds, 120.000 Hände, gepaart, gleiche Verfahren) | 23801–23824, 24401–24424 | **Urteil:** nicht unterlegen mit δ_gto = 8, einseitig 2,5 % |
| G3 | 2.3.1 gleichgewichtsnah gegen 2.0.1, synth23 Gruppe Ka23 | 24451–24456 | beschreibend |

Begründung für das gepoolte Urteil: Ein zweiter Test nach einem nicht bestandenen ersten darf nicht allein entscheiden (sonst „testen, bis es passt“).
Die gepoolte Schätzung nutzt alle vorab geplanten Daten zu derselben Frage. Die Kennzeichnung „experimentell“ entfällt nur, wenn P4-gesamt besteht
und G3 nicht belegt schlechter ist. dev24 fließt nicht ein (Entwicklungsdaten).

## Ergebnis val24 und dritter Zyklus (nach val24, vor dev24b)

val24 (`tools/report-24.js` → `tests/results/report-24.json`): ID identisch (2.3.1 = 2.3.0 auf Seed 23801, 3.558 Entscheidungen); P4' −2,04
[−7,90; 3,69]; **P4-gesamt −4,16 [−8,81; 0,20], untere Grenze −9,77 < −8: P4 nicht bestanden**; G3 (Ka23) −31,58 [−50,0; −14,3], belegt schlechter,
Raise-Anteil 7,6 % gegen 3,1 %. G3 stützt H-G1, ist aber beschreibend; eine Wahl nach G3 wäre Auswahl nach Testdaten.

Dritter Zyklus (letzter für den Modus in dieser Runde), Helden g24-0, g24-R, 2.0.1 gleichgewichtsnah:

| Schritt | Gruppe | Seeds | Regel |
|---|---|---|---|
| Abstimmung | synth23 Tr23 (Trainingsgruppe) | 24501–24506 | beschreibend; R − g24-0 > 0 als Vorbedingung |
| Wahl | synth23 Va23 (Validierungsgruppe, für den Modus bisher ungenutzt) | 24511–24516 | **R wird übernommen, wenn R − g24-0 auf Tr23 > 0 und auf Va23 > 0 mit unterer Intervallgrenze > −5**; sonst bleibt der Modus unverändert |
| Prüfung (nur bei Übernahme) | Gegner-KI 2.2, gemischt, 100 BB | 24601–24624 (60.000 Hände, unberührt) | P4R: R gegen 2.0.1 nicht unterlegen (δ 8, einseitig 2,5 %); R gegen g24-0 beschreibend |

Eine unberührte Gruppe unbekannter Strategien für einen abschließenden Generalisierungsnachweis gibt es in dieser Runde nicht (E, Tr, Va, Ka und F23
sind genutzt). Der Modus bleibt daher in jedem Fall „experimentell“.

## Ergebnis dev24b und Übernahme (vor val24b)

| Gruppe | R − g24-0 | R − 2.0.1 | g24-0 − 2.0.1 |
|---|---|---|---|
| Tr23 (Abstimmung) | +52,25 [41,07; 63,38] | +5,14 [−7,33; 17,66] | −47,11 [−63,33; −31,49] |
| Va23 (Wahl) | +43,07 [32,35; 55,17] | −25,30 [−43,28; −7,74] | −68,37 [−87,58; −50,14] |

Regel erfüllt (beide > 0, untere Grenze auf Va23 > −5): **R wird Produktstand des gleichgewichtsnahen Modus** (`ev.js`, Rückschalter `gtoRaise23`).
Stand eingefroren vor val24b; während val24b keine Änderung an Engine-Dateien.
