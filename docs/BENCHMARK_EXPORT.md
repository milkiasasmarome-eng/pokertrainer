# Benchmark-Export (Schema-Version 1)

Der Benchmark-Export schreibt **je eigener Entscheidung** einen Datensatz, mit dem sich der Coach später unabhängig und offline
mit anderen Verfahren vergleichen lässt (z. B. mit einem eigenen Solver-Lauf oder einer anderen Version des Trainers).
Er ist kein Hilfsmittel für fremde Pokerplattformen: Er enthält ausschließlich Hände, die der Trainer selbst ausgeteilt hat.

- **Erzeugen:** Bereich „Handhistorie“ → Schaltfläche „Export Benchmark“. Exportiert werden die Hände, die der aktuelle Filter zeigt.
- **Datei:** `PokerTrainer_Benchmark_v1_JJJJ-MM-TT.json` (UTF-8, JSON).
- **Code:** `assets/js/engine/export.js` (`PT.benchmark.build`, `exportText`, `validate`, `coachInput`), Felder der Handhistorie in
  `assets/js/engine/training.js` (`makeDecision`, `slimDecision`, `validHand`).
- **Tests:** `tests/unit/benchmark-export.js` (Schema, strenge Prüfung, Trennung, Datenschutz, Reproduzierbarkeit) und
  `tests/e2e/robust.js` (Export mit manipulierten Texten im Browser).

## Grundsätze

1. **Trennung der Informationsstände.** `knownAtDecision` enthält nur, was der Spieler zum Entscheidungszeitpunkt wusste:
   eigene Karten, Board bis zur aktuellen Straße, alle bisherigen öffentlichen Aktionen, Stacks, legale Optionen und die
   beobachteten Gegnerwerte aus *früheren* Händen. Alles, was erst danach bekannt wurde (weitere Aktionen, weitere Boardkarten,
   aufgedeckte Karten, Pot-Verteilung, Ergebnis), steht ausschließlich in `revealedLater` und ist dort als
   „nicht für die Bewertung verwenden“ gekennzeichnet. `PT.benchmark.validate` lehnt einen Export ab, wenn später aufgedeckte
   Karten im Entscheidungsabschnitt auftauchen.
2. **Keine persönlichen Daten.** Keine Zeitstempel (auch nicht in den Gegnerwerten), keine Sitzungskennungen, keine
   Einstellungen außer Analysemodus und -stufe, kein Lernprofil, keine eigenen Statistikwerte. Der Spieler heißt in den Daten „Du“,
   die Gegner sind die fiktiven Computergegner des Trainers. Die Hand-ID ist ein nicht sprechender Hash.
3. **Reproduzierbar.** Gleiche Hände ergeben byteweise dieselbe Datei (kein Exportzeitpunkt im Inhalt, feste Sortierung).
   Jede Coach-Analyse lässt sich mit `PT.benchmark.coachInput(d)` → `PT.coach.analyze(...)` nachrechnen (gleicher Seed,
   gleiche Gegnerwerte, gleiche Stufe). Das Austeilen ist über `deal.tableSeed` und `deal.handNumber`
   (`PT.rng.stream(tableSeed, 'deal', handNumber)`) bzw. `deal.trainingSeed` reproduzierbar.
4. **Versioniert.** `schemaVersion` beschreibt das Dateiformat, `coach.softwareVersion` und `coach.modelVersion` den Stand, mit dem
   die Empfehlung *damals* berechnet wurde; `software.version` den Stand, der exportiert hat.

## Aufbau der Datei

```json
{
  "format": "PokerTrainer-Benchmark",
  "schemaVersion": 1,
  "software": { "name": "PokerTrainer", "version": "2.0.1" },
  "modelVersion": "coach-2.0.1",
  "units": { "money": "Cent Spielgeld (blinds.bb = 1 Big Blind)", "equity": "Anteil 0–1", "ev": "Cent, …" },
  "separation": "knownAtDecision enthält ausschließlich …",
  "hands": 12, "skippedHands": 0, "count": 31,
  "contentHash": "1a2b3c4d",
  "decisions": [ { … }, … ]
}
```

| Feld | Bedeutung |
|---|---|
| `format`, `schemaVersion` | Kennung und Version des Formats (diese Beschreibung: 1) |
| `software.version` | Version des exportierenden Trainers |
| `modelVersion` | aktuelle Modellversion des Coaches beim Export (`PT.coach.MODEL_VERSION`, sonst `coach-<Version>`) |
| `hands`, `skippedHands`, `count` | Zahl der exportierten Hände, übersprungene ungültige Datensätze, Zahl der Entscheidungen |
| `contentHash` | FNV-1a (32 Bit, hex) über `JSON.stringify(decisions)` – erkennt Veränderungen, keine Signatur |

### Ein Entscheidungsdatensatz

| Feld | Bedeutung |
|---|---|
| `decisionId` | `<handId>-A<actionIndex>`, eindeutig |
| `handId` | stabiler, nicht sprechender Hash der Hand |
| `actionIndex` | Index der Aktion im vollständigen Aktionsprotokoll der Hand (Blinds mitgezählt) |
| `sequence` | n-te eigene Entscheidung in dieser Hand |
| `training` | Trainingskategorie oder `null` (Tischhand) |
| `complete` | `true`, wenn alle Felder vorliegen (Hände ab 2.1). Hände aus 2.0.x haben keine Rechenangaben: `false` |
| `deal` | `tableSeed`, `handNumber`, `trainingSeed` – Seeds zum Nachstellen des Austeilens |

**`knownAtDecision`** (Entscheidungszeitpunkt)

| Feld | Bedeutung |
|---|---|
| `street` | `preflop`, `flop`, `turn`, `river` |
| `heroSeat`, `position` | eigener Platz (0–5) und Position (`UTG`, `HJ`, `CO`, `BTN`, `SB`, `BB`) |
| `holeCards` | eigene Karten, z. B. `["As","Kd"]` (Rang `2…9 T J Q K A`, Farbe `c d h s`) |
| `board` | Board bis zur aktuellen Straße (0, 3, 4 oder 5 Karten) |
| `button`, `blinds` | Platz des Buttons; `{ "sb": 50, "bb": 100 }` in Cent |
| `potTotal`, `toCall` | Pot einschließlich aller Einsätze; zu zahlender Betrag |
| `stacks[]` | je Platz: `seat`, `name`, `position`, `stack`, `bet` (Einsatz dieser Straße), `committed` (in der Hand eingezahlt), `start`, `folded`, `allIn`, `hero` |
| `actions[]` | bisherige Aktionen: `street`, `seat`, `type` (`sb`, `bb`, `fold`, `check`, `call`, `bet`, `raise`), `amount` (bei Bet/Raise: „auf“-Betrag), `allIn` |
| `legal` | `fold`, `check`, `call`, `callAmount`, `raise`, `isBet`, `minTo`, `maxTo` |
| `opponents[]` | beobachtete Gegnerwerte zum Entscheidungszeitpunkt, wie sie der Coach erhielt (Datenformat der Gegnerdatenbank, seit 2.1 Format 3): `id`, `name`, `hands`, `stats` (je Wert `[Zähler, Nenner]`), `agg`, `pos`, `shown` (bis zu 10 früher aufgedeckte Blätter), ab Format 3 `recent` (Kurzzeitgedächtnis), `cards` (Kartenkenntnis), `chg`. Entfernt: alle Zeitstempel (`ts`, `lastSeen`, `firstSeen`) und der Tischstatus |
| `publicView` | unveränderte öffentliche Sicht (`PT.bots.publicView(hand, 0)`), die der Coach erhalten hat – maßgeblich für Nachrechnungen |

**`coach`** (Empfehlung zum Entscheidungszeitpunkt)

| Feld | Bedeutung |
|---|---|
| `analysisMode` | `exploit` (nutzt Gegnerwerte) oder `gto` (gleichgewichtsnahes Modell) |
| `level` | Analysestufe (`schnell`, `standard`; Live-Tipps immer höchstens 5.000 Simulationen) |
| `recommendation` | `label`, `type`, `amount` (bei Bet/Raise der „auf“-Betrag, sonst `null`) |
| `classification` | `eindeutig`, `klar`, `knapp`, `mehrere`, `unsicher` |
| `alternatives[]` | bis zu 12 bewertete Aktionen: `label`, `type`, `amount`, `ev` (Cent), `uncertainty` (Cent, Modell- und Simulationsunsicherheit) |
| `equity` | `value`, `standardError`, `method` (z. B. „Monte Carlo“, „exakt“), `rangeLow`/`rangeHigh` (Spanne je nach Range-Annahme) |
| `potOddsNeed` | benötigte Equity laut Pot Odds (zahlbarer Betrag, erreichbarer Pot) |
| `iterations`, `maxIterations` | genutzte und erlaubte Simulationen |
| `durationMs` | Berechnungsdauer der Analyse |
| `modelVersion`, `softwareVersion` | Stand des Coaches bei der Berechnung |
| `seed`, `extraSizes` | Coach-Seed und zusätzlich bewertete Einsatzgrößen (wenn die gewählte Größe nachgerechnet wurde) |

Alle EV-Angaben sind **Modellschätzungen** („Faustregel, kein Solver-Ergebnis“), keine Solver-Frequenzen.

**`playerDecision`**: `label`, `type`, `amount` der eigenen Aktion; `grade` (Optimal … Schwerer Fehler), `score` (0–100), `evLoss` (Cent).
Die Bewertung nutzt nur Informationen des Entscheidungszeitpunkts.

**`revealedLater`** (erst danach bekannt): `notice`, `laterActions[]`, `finalBoard`, `shownCards[]` (`seat`, `name`, `cards`),
`showdown`, `heroNet` (Ergebnis in Cent), `pots[]` (`amount`, `winners`).

## Nachrechnen

```js
const PT = require('./tests/load.js').load();          // Engine in Node
const exp = JSON.parse(fs.readFileSync('PokerTrainer_Benchmark_v1_….json', 'utf8'));
if (PT.benchmark.validate(exp)) throw new Error('ungültig');
for (const d of exp.decisions.filter(x => x.complete)) {
  PT.equity.cacheClear();
  const a = PT.coach.analyze(PT.benchmark.coachInput(d));   // gleicher Seed, gleiche Gegnerwerte, gleiche Stufe
  // a.bestLabel === d.coach.recommendation.label, a.actions[i].ev ≈ d.coach.alternatives[i].ev
}
```

Gemessen (`tests/unit/benchmark-export.js`): alle Empfehlungen und mindestens 95 % der EV-Tabellen stimmen exakt überein;
in der Entwicklung waren es 56 von 56. Abweichungen sind nur möglich, wenn eine Analyse an das Zeitlimit von 1,4 s
stößt (überlastete Maschine) – dann ist `iterations` kleiner als bei der Nachrechnung. Die Gegnerwerte werden ohne Zeitstempel
exportiert; der Coach nutzt keine Zeitstempel, die Nachrechnung ist dadurch nicht beeinträchtigt.

## Prüfung der gespeicherten Felder

Die zusätzlichen Felder liegen je Entscheidung im Handdatensatz unter `x` (`v`, `sw`, `mv`, `lvl`, `it`, `max`, `ms`, `eq`, `best`, `ch`,
`ex`, `alt`) und werden beim Import einer Sicherung streng geprüft (`PT.training.validHand`): nur bekannte Schlüssel, Zahlen endlich
und im Wertebereich, Texte begrenzt (Labels ≤ 80 Zeichen), Versionen nur aus `[0-9A-Za-z.+-]`, höchstens 12 Alternativen,
Aktionstypen aus einer festen Liste. Datensätze aus 2.0.x ohne `x` bleiben gültig und erscheinen mit `complete: false`.

## Änderungen am Schema

Neue Felder erhöhen `schemaVersion` nur, wenn sich Bedeutung oder Pflichtfelder ändern; zusätzliche optionale Felder sind
abwärtskompatibel. Empfänger sollen unbekannte Felder ignorieren und `schemaVersion` prüfen.
