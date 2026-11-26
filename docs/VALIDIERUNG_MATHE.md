# Validierung Mathematik (Zweig mathe-2.1, Basis 2.0.1)

Stand 26.11.2026. Alle Zahlen stammen aus Läufen auf dieser Maschine: 2 Kerne (Intel Xeon 2,1 GHz), Node v22.23.5, Chrome 153.0.8010.12 (Playwright). Während fast aller Messungen liefen Prozesse anderer Agenten mit (Lastmittel bis etwa 5,5 auf 2 Kernen). Laufzeiten sind deshalb eher zu hoch als zu niedrig.

Vorher-Werte stammen von der Engine 2.0.1 (Commit 5e6b77f), die als unveränderte Kopie geladen wurde. Ein Hilfsskript führt die neuen Tests `tests/unit/mathe-*.js` gegen diese Kopie aus. Dort bestanden 1 von 15 Tests. Der eine bestandene Test ist eine Schutzprüfung der Abdeckung auf Stufe Schnell und kein Befundtest.

Befehle zum Nachvollziehen:

```bash
node tests/run.js --quick                   # enthält alle neuen Unit-Tests
node tests/long.js evalref evalref7 mccov   # Langläufe, Ergebnis in tests/results/long.json
node tests/perf-coach.js beide              # Laufzeiten Node und Chromium, Ergebnis in tests/results/perf-coach.json
```

## Übersicht

| Befund | Ergebnis | Beleg vor der Korrektur (Engine 2.0.1) | Test |
|---|---|---|---|
| A2 leere Ranges | bestätigt | `potShare` lieferte bei leerer Range 176 Chips Gewinn (bewertete undefinierte Karten), bei unmöglicher Verteilung still 0. `equity` verbrauchte 5.000 Simulationen ohne Kennzeichnung. `evCall` übernahm die 176 als `expectedWin`. | `tests/unit/mathe-a2-leer.js` (4 Tests, vorher alle 4 fehlgeschlagen) |
| A3 Cache ohne Qualität | bestätigt | Nach einer Analyse mit Budget 300 kam die Anfrage mit Budget 5.000 aus dem Cache (0 Simulationen, SE 0,0289 statt ≤ 0,01). Eine Mindestanzahl wurde nicht geprüft. | `tests/unit/mathe-a3-cache.js` (2 Tests, vorher beide fehlgeschlagen) |
| A4 Zeitgrenzen | bestätigt | Bei einer Deadline von 5 ms lief `exactHU` 318 ms und meldete „exakt“. `potShare` ignorierte die Deadline (200.000 von 200.000 Versuchen). | `tests/unit/mathe-a4-zeit.js` (2 Tests, vorher beide fehlgeschlagen) |
| A5 Range-Kennung | bestätigt | Von 500 Verteilungen mit Störungen unter 0,0005 erhielten 476 eine schon vergebene Kennung. Der Equity-Cache lieferte für eine Range mit anderer Equity den alten Wert: 0,0398 statt 0,0103. | `tests/unit/mathe-a5-hash.js` (3 Tests, vorher alle 3 fehlgeschlagen) |
| Monte Carlo: Verzerrung und Abdeckung | bestätigt | „HU Turn, Held klar vorn“ (exakt 0,98864): auf Präzise 0,99027 (z = 6,2), Abdeckung 84–89 % auf allen Stufen. In Weyl-Spots lag die Abdeckung bei 100 %, der SE war bis 83-fach zu groß. | `tests/unit/mathe-mc.js` (4 Tests), Langlauf `mccov` |
| Handbewertung | keine Abweichung gefunden | – | `tests/unit/mathe-eval.js` (3 Tests), Langläufe `evalref` und `evalref7` |

## A2 – leere Ranges und unmögliche gemeinsame Verteilungen

**Befund bestätigt.**

- **(a) Range durch bekannte Karten vollständig entfernt.** Beispiel: Der Gegner hat nur AhKh, der Held hält Ah.
  - `prepRange` lieferte eine leere Liste.
  - `bsearch` gab den Index 0 zurück. Damit war `idx[0]` undefiniert, und es wurden undefinierte Karten bewertet.
  - Ergebnis vorher: Gewinn 176, SE 25,3, ohne jede Kennzeichnung.
  - `equity()` gab zwar `eq: null` zurück, aber ohne `failed` und ohne Grund.
- **(b) Einzeln gültige Ranges ohne gemeinsame konfliktfreie Verteilung.** Beispiel: zwei Gegner, beide nur KsKc.
  - Vorher lieferte `potShare` still `win: 0` bei `se: null`.
  - `equity()` verbrauchte das volle Budget von 5.000 Versuchen und gab `eq: null` ohne Grund zurück.

**Korrektur in `equity.js`:**

- `prepRange` prüft endliche, positive Gesamtgewichte.
- Bei leerer Range liefern `equity` und `potShare` `{eq/win: null, failed: true, reason}`.
- Gibt es nach 64 Versuchen zu je 50 Ziehungen keine gültige Verteilung, endet die Rechnung als Fehlschlag „keine konfliktfreie Verteilung …“. Höchstens 64 Versuche zählen gegen das Budget.
- Kein Budget oder Zeitgrenze vor der ersten Stichprobe führt zu einem Fehlschlag mit Grund.
- Nie NaN, undefined oder ungültige Karten.

**Korrektur in `ev.evCall`** (einzige Änderung in `ev.js`):

- Schlägt `potShare` fehl, folgt ein Rückfall über die aktuelle Equity mit `parts.approx = true`, `parts.failed = true` und `parts.reason`.
- Ist die Equity unbekannt, gilt 0,5.
- Der bisherige Budget-Rückfall trägt jetzt auch `reason`.
- `potShare` erhält die Deadline des Coachs.

**Prüfung von `equity()`:** Fall (a) war schon vorher abgefangen, nur ohne Kennzeichnung. Fall (b) ist jetzt gekennzeichnet, und das Budget wird nicht mehr verbraucht.

**Offen:** `coach.slimParts` übernimmt `approx`, `failed` und `reason` nicht in die Coach-Ausgabe. Die Kennzeichnung endet deshalb in `evaluateAction`. `coach.js` lag außerhalb meines Auftrags.

## A3 – Equity-Cache mit Qualitätsangabe

**Befund bestätigt.** Der Schlüssel `['eq', hero, board, dead, ranges-hash, level]` enthielt weder Budget noch Mindestanzahl, Zeitabbruch oder die Methode. Gespeichert wurde jedes Ergebnis mit mindestens 200 Iterationen.

**Korrektur:**

- **Schlüssel:** ohne Stufe.
- **Jeder Eintrag trägt seine Qualität:** `exact`, `se`, `n` (Stichproben der Schätzung), `iters`, `aborted` (`'zeit'` oder `'budget'`), `seTarget` und `planned`.
- **Nutzung (`usable`):**
  - Ein exakter Eintrag wird immer genutzt.
  - Würde die Anfrage selbst exakt rechnen, werden Monte-Carlo-Einträge nie genutzt.
  - Ein Monte-Carlo-Eintrag wird sonst genutzt, wenn er nicht abgebrochen ist, `se` den Ziel-SE der Stufe erreicht und `n` die Mindestanzahl erfüllt.
  - **Erweiterung gegenüber der Vorgabe:** Ein Eintrag wird auch genutzt, wenn er mindestens so viele Stichproben hat, wie die Anfrage selbst höchstens ziehen dürfte. Er ist dann nicht schlechter als eine neue Rechnung mit derselben Obergrenze.
- **Ersetzen:** Ein besserer Eintrag wird nie durch einen schlechteren ersetzt. Exakt schlägt alles, sonst gewinnt der kleinere SE.
- **Kopien:** Der Cache speichert eine Kopie, Aufrufer können ihn also nicht verändern.

**Test:**

- Nach einer Analyse mit Budget 300 rechnet die Anfrage mit Budget 5.000 neu (SE ≤ Ziel). Die spätere kleine Anfrage nutzt den besseren Eintrag.
- Präzise nach Schnell rechnet neu, Schnell nach Präzise nutzt den Cache.
- Nach einem Zeitabbruch wird neu gerechnet.
- Die Mindestanzahl 300 wird nicht durch einen Eintrag mit 200 Stichproben bedient.
- Ein Monte-Carlo-Eintrag bedient keine exakt mögliche Anfrage. Ein exakter Eintrag bedient jede Anfrage.

## A4 – Zeitgrenzen

**Befund bestätigt** für `exactHU` (ohne Deadline) und `potShare` (ohne Deadline). `monteCarlo` prüfte die Deadline schon vorher.

**Korrektur:**

- **`exactHU(…, deadline)`:** Nach je 8 Kombinationen wird die Restzeit aus dem Tempo der letzten 8 hochgerechnet. Reicht sie nicht oder ist die Deadline überschritten, kommt `{aborted: true, done, of}` zurück, nie ein Teilergebnis mit `exact: true`. Im Preflop-Fall (5 Boardkarten) wird zusätzlich in der äußeren Schleife geprüft.
- **`equity()`:** Bei einer abgebrochenen Aufzählung folgt Monte Carlo mit der Restzeit. Das Ergebnis trägt `exactAborted` und den Methodenvermerk „exakte Aufzählung wegen Zeitgrenze abgebrochen“.
- **`potShare`:** prüft die Deadline alle 128 Versuche und kennzeichnet einen Abbruch mit `aborted: 'zeit'`.

**Test:** Präzise, AhKd auf Ks8c3d gegen alle Kombinationen (1.081 × 990 Runouts), Deadline 5 ms:

- `exact: false`, Abbruch vermerkt.
- Ein Monte-Carlo-Rückfall mit Intervall, verträglich mit dem exakten Wert.
- Laufzeit unter 150 ms. Vorher 318 ms, und das Ergebnis hieß „exakt“.

**Nur gelesen und gemeldet:**

- **`ev.comboEquities`** hat keine Deadline. Der Aufwand ist durch `exactMax` begrenzt (Standard 600.000 und Präzise 2,5 Mio. Auswertungen) sowie, bei Monte Carlo je Kombination, durch das Budget. Gemessen in Node pro Analyse: Standard 0–12 ms, Präzise 70–114 ms (Heads-up-Flop). Das ist der größte Anteil der Präzise-Analyse auf dem Flop.
- **`cfr.solveRiver`** (aufgerufen aus `coach.riverModel`) hat eine feste Iterationszahl (700, Tiefenanalyse 2.500) und keine Deadline. In Node: 54–73 ms (Standard/Präzise) und 166 ms (Tiefenanalyse). Das ist der langsamste Teil des automatischen Tipps am River.
- **`ranges.rangeStrength` und `narrowPostflop`** brauchen 0–7 ms. Beim ersten Aufruf nach dem Laden sind es bis 46 ms (JIT).

### Gemessene Laufzeiten (`tests/perf-coach.js`)

Acht Spots, je Wiederholung eine andere Starthand des Helden (kalte Caches), Modi exploit und gto im Wechsel. Gemessen wird `PT.coach.analyze` direkt (Node bzw. `page.evaluate` im Chromium-Hauptthread). Angegeben ist das Maximum in ms; in Klammern der langsamste Spot.

| Umgebung | Automatischer Tipp (Standard, live, 12 Wdh.) | Präzise (6 Wdh.) | Tiefenanalyse (4 Wdh.) |
|---|---|---|---|
| Node | 105 (River HU, CFR+) | 168 (Mehrgegner-Flop, 5 Spieler) | 321 (River HU) |
| Chromium, ohne Drosselung | 131 (River HU) | 126 (HU Flop OOP) | 270 (River HU) |
| Chromium, Drosselung 4× | **406** (River HU) | 627 (HU Flop BTN) | 1.048 (River HU) |
| Chromium, Drosselung 6× | **540** (River HU) | 671 (HU Flop OOP) | 1.753 (River HU) |

- **Ziel erreicht:** Der automatische Tipp blieb in allen gemessenen Spots unter 2 s, auch bei 4× und 6× Drosselung. Die Mediane lagen bei 4× zwischen 17 und 252 ms.
- **Simulationsgrenze:** Höchstens 4.200 Simulationen je automatischem Tipp (Grenze 5.000 unverändert).
- **App mit Web Worker:** `tests/e2e.js` gegen diesen Zweig bestand 19 von 19 Fällen mit `tipMaxMs` 332 ohne Drosselung. Die portable Einzeldatei in `dist/` wurde nicht neu gebaut und enthält noch die Engine 2.0.1.
- **Wertebereiche je Spot:** in `tests/results/perf-coach.json`. Ein erster Lauf bei höherer Fremdlast (vor dem Neustart der Umgebung) ergab bei 4× höchstens 401 ms und bei 6× höchstens 650 ms.

## A5 – Range-Kennung

**Befund bestätigt.**

- `Math.round(w·1000)` fasste Gewichte unter 0,0005 als 0 zusammen. Die Kombination fiel dabei ganz aus der Kennung heraus.
- Beispiel: AQ mit Gewicht 1, alle anderen Kombinationen mit 0,0004 bzw. 0,0001. Die Restmasse lag bei 0,45 bzw. 0,11 Kombinationen, die Equity (exakt, River) bei 0,0398 bzw. 0,0103 – und doch gab es dieselbe Kennung.
- Der Cache gab für die zweite Range den Wert der ersten zurück.
- Gleiche Verteilungen in anderer Skalierung erhielten verschiedene Kennungen (35 von 36). Das kostete nur Cache-Treffer.

**Korrektur in `ranges.hashRange`:**

- Normalisierung rₖ = wₖ/Σw und Quantisierung auf 2⁻³⁶.
- Der Träger geht immer ein: jedes k mit wₖ > 0, auch wenn rₖ auf 0 gerundet wird.
- Zwei unabhängige 32-Bit-Hashes (FNV-1a, Murmur3-Mischung mit fmix32) über (k, rₖ), Präfix „h2“.
- Nicht-positive und NaN-Gewichte zählen wie 0, Infinity ergibt „h2inf“, eine leere Range „h2leer“.
- Laufzeit etwa 10,6 µs je Kennung (Node).

**Normalisierung ist für alle Nutzer konsistent:**

- Die Equity (`equity.js`) hängt nur von relativen Gewichten ab (Ziehung proportional zu w, exakt Σ wₖ·eₖ/Σ wₖ).
- `ev.comboEquities` hängt nur vom Träger ab.
- Fehlerschranke durch die Quantisierung: Verteilungen, die nach Normalisierung in jeder Komponente um weniger als 2⁻³⁷ abweichen, können dieselbe Kennung bekommen. Ihre Equity unterscheidet sich höchstens um Σ|Δrₖ| ≤ 1.326 · 2⁻³⁷ ≈ 1·10⁻⁸.

**Test:**

- Eine Kombination +0,0004, eine neue Kombination mit 0,0004 und eine mit 1·10⁻¹² ergeben jeweils eine neue Kennung.
- 500 zufällige Störungen unter 0,0005: 0 Kollisionen (vorher 476).
- 36 feste Skalierungen (0,5 bis 1000, 1/3, 0,9996): alle Kennungen gleich.
- Zufällige Skalierungen: höchstens 2 von 400 abweichend zugelassen. Gemessen wurden 0 von 2.000 in einem Probelauf.
- Der Equity-Cache liefert je Range die eigene Equity.

## Monte-Carlo-Equity

### Untersuchung (Engine 2.0.1)

- **Pilot-Einfluss (Zwei-Stufen-Verzerrung).**
  - Die Pilotstichprobe (300) bestimmte den Gesamtumfang und floss in die Schätzung ein. Damit hing n von den Pilotwerten ab.
  - Am Rand verkürzt ein „günstiger“ Pilot (keine Niederlage) den Lauf auf 300, ein ungünstiger verlängert ihn. Die Schätzung wird dadurch zum Rand gezogen.
  - Gemessen mit dem Prüfskript des Prüfers, 600 Läufe: „HU Turn, Held klar vorn“ (exakt 0,98864) ergab auf Präzise 0,99027 mit z = 8,7 und Abdeckung 84,3 %, auf Standard Abdeckung 85,8 %. „2 Outs“ auf Präzise: z = −4,5.
- **Weyl-Schichtung (Quasi-Monte-Carlo über die Gegnerkombination, nur Heads-up).** Varianz des Mittelwerts × n, je 400 Wiederholungen mit n = 1.000:

  | Spot | i.i.d. | Weyl | Verhältnis |
  |---|---|---|---|
  | Flop, AhKd gegen Top 30 % | 0,0917 | 0,0595 | 0,65 |
  | Flop, Flushdraw gegen Top 50 % | 0,1966 | 0,1708 | 0,87 |
  | Flop, Overpair gegen alle | 0,1318 | 0,1311 | 0,99 |
  | Preflop, AKo gegen Top 15 % | 0,2302 | 0,2004 | 0,87 |
  | Preflop, 76s gegen Top 40 % | 0,2399 | 0,2435 | 1,02 |
  | Turn, Gutshot gegen Top 30 % | 0,1948 | 0,1000 | 0,51 |

  - Die Folge ist nicht unabhängig, daher überschätzt der i.i.d.-Standardfehler den Fehler.
  - Gemessen an den Referenzfällen (Engine 2.0.1, je 400 Läufe):
    - Am River (Ergebnis hängt nur von der Kombination ab) war der gemeldete SE 12- bis 83-fach zu groß.
    - Auf dem Flop war er 1,1- bis 1,3-fach zu groß, bei Abdeckung 97,5–99 %.
    - Split-lastige Turn-Spots erreichten 99,8–100 % Abdeckung.
  - Geschichtete Blöcke mit gültiger Varianzschätzung (Latin-Schichten zu 2–64 Punkten, 400 × 1.024) ergaben Verhältnisse von 0,72–1,20 (Top Pair 0,74–0,97, Gutshot 0,72–1,06). Mit Weyl waren es 0,65 bzw. 0,51. Die Kombinationsreihenfolge ist nach Karten sortiert, nicht nach Stärke; grobe Schichten helfen deshalb kaum.
  - Ein randomisiertes QMC mit unabhängigen Replikaten bräuchte 10–20 Replikate und hat am Rand schlechte Intervalle. Es wurde verworfen.
  - Im Programm nutzt der Coach Heads-up-Monte-Carlo nur preflop (Gewinn 0–13 %). Heads-up postflop rechnet er exakt bzw. über `comboEquities`.
- **Standardfehler bei Split Pots.** Die Untergrenze `p(1−p)·0,25` des alten SE nahm φ ≥ 0,25 an. In Split-lastigen Spots ist φ kleiner, dort war der SE zu groß.
- **Gesamtbild vorher.** Auf denselben 21 Referenzfällen (je 400 Läufe) lag die Gesamtabdeckung je Stufe bei 95,4–96,1 %. Sie sah unauffällig aus, weil Überdeckung (Weyl, Split) und Unterdeckung am Rand sich ausglichen. Je Fall reichte sie von 84,3 bis 100 %. Größtes |z| der Verzerrung: 6,7.

### Neues Verfahren (`equity.js`)

- **Ziehung:** unabhängige Stichproben, auch Heads-up (die Weyl-Folge ist entfernt).
- **Umfang:**
  - Erlaubt die Obergrenze nicht Pilot plus ungünstigsten Fall nWC = ⌈0,25/T²⌉, wird ein fester Umfang min(nWC, Obergrenze) gezogen. Der Umfang ist dann unabhängig von den Werten, die Schätzung erwartungstreu.
  - Das gilt im Coach praktisch immer: Die Mehrgegner-Anteile liegen bei 600–1.200, Preflop Heads-up bei 800–1.000.
  - Sonst greift das Zwei-Stufen-Verfahren: Ein Pilot (256) dient nur zur Planung (obere 99-%-Schranke der Varianz), die Schätzung kommt allein aus der zweiten Stufe. Bedingt auf N₂ ist sie erwartungstreu, und der Ziel-SE wird fast immer erreicht.
  - Ein Zeitabbruch hängt nur von der Zeit ab. Bleibt die zweite Stufe deshalb unter 100 Stichproben, zählen Pilot und zweite Stufe zusammen. Dieses Ereignis hängt nur von der Zeit ab, nicht von den Werten.
- **Intervall:** Wilson-Score-Intervall mit Varianzfaktor φ = s²/(m(1−m)) ≤ 1 und effektivem Umfang nₑ = n/φ.
  - s² enthält je eine Pseudo-Beobachtung bei 0 und 1. Bei lauter Split Pots (konstant 1/2 bzw. 1/3) ist das Intervall deshalb schmal, aber nicht leer.
  - Am Rand gilt φ = 1, also das binomiale Wilson-Intervall. Es gilt lo = 0, wenn m = 0, und hi = 1, wenn m = 1.
- **SE:** √(s²/n).
- **Kennzeichnung:** `aborted: 'zeit'` bzw. `'budget'` (Umfang unter der Planung), `n`, `pilot`, `planned`, `seTarget`, `phi`.

### Vorab festgelegte Toleranz (Langlauf `mccov`)

Festgelegt in `tests/ref/mcspots.js` (`TOL`), bevor irgendein Abdeckungslauf stattfand, und committet (799e383) vor dem Langlauf mit 1.000 Läufen.

- Gesamtabdeckung je Konfiguration über alle nicht degenerierten Fälle: **93,0–97,5 %**.
- Abdeckung je Fall: **≥ 90 %**.
- Verzerrung je Fall: **|z| ≤ 3,5**.
- Degenerierte Fälle (exakt 0, exakt 1, konstant 1/3): **jeder Lauf trifft exakt**.

Offenlegung: Nach einem Probelauf mit 100 Läufen habe ich die Streuung im z-Wert von „empirische Streuung“ auf „max(empirische Streuung, Wurzel des mittleren gemeldeten SE²)“ umgestellt. Der Grund war ein Fall mit seltenem Ereignis (exakt 0,00017), in dem fast alle Läufe 0 liefern. Die empirische Streuung weniger Läufe ist dort kein Maßstab (z = −4,1 bei korrekt arbeitendem Schätzer). Die Toleranzwerte selbst blieben unverändert.

### Referenzfälle

21 Fälle mit exakter Enumeration über die unabhängige Referenzbewertung. Sie stimmen mit `exactHU` der Engine auf 4·10⁻¹⁶ überein.

- **Heads-up Flop (4):** Top Pair gegen Top 30 %, Flushdraw gegen Top 50 %, Set gegen Overpairs (0,91), Runner-Runner (0,00017).
- **Heads-up Turn (5):** Gutshot (0,091), 2 Outs (0,026), klar vorn (0,989), ohne Outs (0), Split-lastig (Nut Straight mit seltenen Verlusten).
- **Heads-up River (2):** gewichtete Range mit Splits; Board spielt meist.
- **Mehrgegner (8):** 2 und 3 Gegner, Flop/Turn/River, gewichtete Ranges, Kartenüberschneidung, nahe 1, exakt 0, konstant 1/3.
- **Preflop (2):** AA gegen KK, 72o gegen AA.

Konfigurationen: Schnell, Standard, Präzise, Tiefenanalyse ohne Budgetgrenze, dazu Standard mit Budget 1.000 und Schnell mit Budget 300 (wie im Coach). Je Fall und Konfiguration 1.000 reproduzierbare Läufe (`cache: false`, `exact: false`, eigener Seed).

### Ergebnisse (Langlauf `mccov`, 1.000 Läufe, 292 s)

18 nicht degenerierte Fälle, also je Konfiguration 18.000 Läufe:

| Konfiguration | Abdeckung 95 % | Spanne je Fall | mittl. \|Bias\| | größtes \|z\| | mittl. RMSE | mittl. Versuche |
|---|---|---|---|---|---|---|
| Schnell | 95,38 % | 93,8–98,5 % | 3,0·10⁻⁴ | 1,96 | 0,0123 | 625 |
| Standard | 95,25 % | 92,9–96,6 % | 1,8·10⁻⁴ | 1,59 | 0,0079 | 1.710 |
| Präzise | 95,10 % | 94,3–96,2 % | 9,9·10⁻⁵ | 1,97 | 0,0040 | 6.067 |
| Tiefenanalyse | 95,05 % | 93,0–98,5 % | 7,5·10⁻⁵ | 2,85 | 0,0020 | 23.504 |
| Standard, Budget 1.000 | 94,84 % | 93,6–95,7 % | 2,6·10⁻⁴ | 2,16 | 0,0098 | 1.000 |
| Schnell, Budget 300 | 95,20 % | 91,7–97,2 % | 3,1·10⁻⁴ | 1,59 | 0,0177 | 300 |

- **Toleranz:** keine Beanstandung (`mccov.ok = true`, `problems` leer). Alle drei degenerierten Fälle wurden in jedem Lauf exakt getroffen.
- **SE kalibriert:** Das Verhältnis aus mittlerem gemeldetem SE und tatsächlicher Streuung lag in allen Fällen außer dem Fall mit seltenem Ereignis bei 0,94–1,07.
- **Fall mit seltenem Ereignis** (Runner-Runner, exakt 0,00017):
  - Dort ist das Intervall konservativ: Abdeckung bis 98,5 %, SE-Verhältnis bis 7,5. Das liegt an Wilson bei m = 0 und den Pseudo-Beobachtungen.
  - Mit Budget 300 lag die Abdeckung bei 91,7 %. Das ist der kleinste Wert je Fall.
- **Kosten:** Die mittlere Zahl der Versuche ist höher als vorher (2.0.1 auf denselben Fällen: Schnell 370, Standard 1.241, Präzise 4.864, Tiefenanalyse 19.392). Die neue Planung nimmt eine obere Varianzschranke, und der Pilot zählt nicht zur Schätzung. Die Obergrenzen je Stufe und die 5.000 je automatischem Tipp sind unverändert.
- **Unit-Test** (`mathe-mc.js`, Schnelllauf):
  - Regression „klar vorn“ auf Präzise mit 300 Läufen: |z| < 4 und Abdeckung ≥ 90 %. Vorher z = 6,23 und Abdeckung 85,3 %.
  - Stichprobe aus 6 Fällen × 2 Konfigurationen: Abdeckung 92–98 %.
  - Randeigenschaften des Intervalls.
  - Umfang unabhängig von den Werten (Budget 1.000: genau 1.000 Stichproben in beiden Fällen, Pilot nicht in der Schätzung).

## Handbewertung

### Bisherige Prüfungen: Häufigkeitsprüfung oder individuelle Referenzprüfung

| Prüfung | Art | Umfang | Referenz |
|---|---|---|---|
| `tools/verify-handcount.c` | Häufigkeitsprüfung | alle 5- und 7-Karten-Hände: Kategorien, Zahl verschiedener Werte | eigene C-Bewertung mit demselben Bitmasken-Ansatz; wird nicht mit der JS-Bewertung verglichen |
| `tests/long.js` Teil `eval7` | Häufigkeitsprüfung | alle 133.784.560 Sieben-Karten-Hände: Kategorienhäufigkeiten, 4.824 Werte | Literaturwerte (Häufigkeiten), keine Einzelbewertung |
| `tests/run.js` „alle 2.598.960 Fünf-Karten-Hände“ | überwiegend Häufigkeitsprüfung, teilweise individuell | Häufigkeiten und 7.462 Werte für alle Hände | individuell nur die jeweils erste Hand je Wert (7.462, Kategorie gegen `eval5Ref`), die Klassengleichheit für die Stichprobe (Summe der Karten mod 97 = 0, 24.876 Hände) und die Ordnung der 7.462 Vertreter; Referenz `eval5Ref` in derselben Datei |
| `tests/run.js` „300.000 zufällige Sieben-Karten-Paare“ | individuell (Vorzeichen, Kategorie) | 300.000 Paare = 600.000 Hände, Schnelllauf 30.000 | `evalRef`/`eval5Ref` aus `evaluator.js`; gleichverteilt, also nur etwa 186 Straight Flushes und 1.008 Vierlinge erwartet |
| `tests/run.js` „feste Testfälle“ | individuell | 18 Kategorien und 13 Vergleiche | von Hand festgelegt |

### Neue unabhängige Referenz und individuelle Prüfung

`tests/ref/handref.js` arbeitet anders als `evaluate` (Bitmasken) und `eval5Ref` (Sortieren und Vergleichsfunktion über Gruppenformen):

- Die 7.462 Klassen werden in geschachtelten Schleifen je Kategorie konstruktiv in absteigender Stärke aufgezählt. Es gibt keine Vergleichsfunktion.
- Eine Hand wird über die Multimenge ihrer Ränge (absteigend sortiertes Tupel) und ein Flush-Bit per Tabelle ihrer Klasse zugeordnet.
- Sieben Karten: das Maximum über die 21 Fünfer-Blätter.
- Mit der Engine teilt sie nur die Kartenkodierung.
- Selbstprüfung: 7.462 Klassen, je Kategorie 1.277 / 2.860 / 858 / 858 / 10 / 1.277 / 156 / 156 / 10, Fünf-Karten-Häufigkeiten gleich den Literaturwerten.

Verglichen wird jede einzelne Bewertung: Der Wert von `evaluate` wird über die Klassenzuordnung aus den Fünf-Karten-Händen auf die Referenzklasse abgebildet und muss genau der Referenzbewertung entsprechen. Gemessene Zahlen:

| Prüfung | Umfang | Abweichungen |
|---|---|---|
| alle Fünf-Karten-Hände, Klassen eineindeutig, Kategorie je Hand, Ordnung | 2.598.960 Hände, 7.462 Klassen (in drei Threads unabhängig wiederholt) | 0 |
| **alle Sieben-Karten-Hände einzeln** (`evalref7`) | **133.784.560 Hände**, 4.824 Klassen erreicht, Häufigkeiten gleich den Literaturwerten, 145 s auf 2 Threads | **0** |
| geschichtete Sieben-Karten-Stichprobe (`evalref`): 4 Mio. zufällig, je 400.000 Flush mit 5/6/7 Farbkarten, Straße, Wheel, Straight Flush, Flush und Straße, zwei Drillinge, Drilling plus zwei Paare, Drilling plus Paar, Vierling plus Drilling, Vierling plus Paar, Vierling, drei Paare, zwei Paare, ein Paar, High Card | 10.800.000 Hände (580.725 Straight Flushes, 1.243.384 Vierlinge, 1.414.220 Full Houses) | 0 |
| Sechs- und Fünf-Karten-Stichproben (geschichtet) | 3.000.000 Hände | 0 |
| Paarvergleiche (Vorzeichen) mit gemeinsamem Board: zufällig, 3/4/5 Karten einer Farbe, vier zur Straße, A-2-3-4, Straße auf dem Board, Paar, zwei Paare, Drilling, Full House, Vierling auf dem Board | 2.400.000 Paare, davon 612.273 Gleichstände (z. B. Full House auf dem Board 156.639, Straße auf dem Board 138.712) | 0 |
| Paarvergleiche zweier Hände derselben Schicht (zwei Drillinge, Drilling plus zwei Paare, Flush gegen Flush, Straße gegen Straße, Wheel, drei Paare …) | 1.000.000 Paare, 84.312 Gleichstände | 0 |
| Permutationsinvarianz: 300 Hände mit allen 5.040 Reihenfolgen, je 20 zufällige für 180.000 Hände | 5.112.000 Bewertungen | 0 |
| Invarianz unter allen 24 Farbvertauschungen (Engine und Referenz) | 90.000 Hände, 2.160.000 Bewertungen | 0 |

- **Unit-Test** (`mathe-eval.js`, Schnelllauf): alle Fünf-Karten-Hände, 3.000 Hände je Schicht, Paarvergleiche, Invarianzen.
- **Mutationsprobe:** Vier eingebaute Fehler müssen erkannt werden: Wheel als 6-hoch-Straße, Flush ohne fünfte Karte, Full House ohne Paarrang, zwei Paare ohne Kicker. Alle vier wurden erkannt.

## Offene Punkte

- **`coach.slimParts`** gibt die neuen Kennzeichen aus `evCall` (`approx`, `failed`, `reason`) nicht weiter, ebenso wenig `exactAborted`/`aborted` der Equity. Das betrifft `coach.js`, außerhalb meines Auftrags.
- **Laufzeitgrenzen ohne Deadline:** `ev.comboEquities` und `cfr.solveRiver` haben keine Deadline. Gemessen bleiben sie innerhalb der Ziele. Die Tiefenanalyse am River erreichte bei 6× Drosselung 1,75 s.
- **Nicht neu gebaut:** `tools/build.js` (`sw.js`, `dist/PokerTrainer_2.0.html`) habe ich nicht ausgeführt, um Konflikte mit den anderen Zweigen zu vermeiden. Vor der Veröffentlichung neu bauen, sonst enthält die Einzeldatei die Engine 2.0.1.
- **Kosten der neuen Planung:** Ohne Budgetgrenze braucht die Monte-Carlo-Equity im Mittel mehr Simulationen als 2.0.1 (siehe oben), weil sie den Ziel-SE mit einer oberen Varianzschranke plant. Im Coach greifen fast immer die Budgetgrenzen, dort ändert sich die Zahl nicht.
- **Seltene Ereignisse:** Bei exakt sehr kleiner Equity (etwa unter 1/n) ist das Intervall konservativ (Überdeckung). Gemessen wurde das nur an einem Fall.
