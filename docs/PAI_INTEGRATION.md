# Integration mit Adaptive Poker Intelligence (Arbeitspaket 8, 2.2)

PAI: https://github.com/milkiasasmarome-eng/Assist, geprüfter Stand Version 0.1.0 (Commit 1b0c4da), nur lesend genutzt. Beide Systeme bleiben getrennte
Engines; der Trainer ruft PAI nicht auf und PAI übernimmt keine Coach-Bewertungen.

## 1. Entwicklungsstand der PAI-Ereignisschnittstelle

- In PAI ist die „Ereignis-Schnittstelle Trainer → Coach“ als **geplant** markiert (`docs/ARCHITEKTUR.md`, `docs/SPAETER.md` Punkt 1).
- Vorhanden: Adapter `fromPokerTrainerBackup` (liest Handdatensätze aus einer PokerTrainer-Sicherung), Handformat `pai.hand/1`, Benchmark-Format
  `pai.benchmark/1` (Entscheidungsdatensatz mit getrennten Abschnitten „available“ und „reference“), Gegnergedächtnis, Mathe-Engine.

## 2. Versionskompatibilität

| Prüfung (`tests/pai-integration.mjs`) | Ergebnis |
|---|---|
| PAI liest Handdatensätze des Trainers 2.2 (Handformat 1) mit eigenem Adapter und Validator | bestanden (60 von 60 Händen) |
| PAI liest eine Sicherungsdatei des Trainers 2.1/2.2 | **nicht kompatibel**: PAI 0.1.0 akzeptiert nur Sicherungsversion 2; der Trainer schreibt seit 2.1 Version 3 |
| VPIP/PFR auf denselben Händen, unabhängig gezählt | gleich |
| Equity auf denselben Spots, unabhängig gerechnet | gleich (Abweichung 0,0000) |

Ursache der Inkompatibilität: Version 3 änderte nur die Gegnerdatensätze (Kurzzeitgedächtnis, Kartenkenntnis, Stilwechsel). Die Handdatensätze
(`payload.hands`) sind seit 2.0 unverändert. **Nötige Anpassung in PAI** (nicht aus diesem Projekt heraus geändert, weil das PAI-Repository hier nur
lesbar ist): in `src/data/adapters/pokertrainer.js` die Versionsprüfung auf `json.version !== 2 && json.version !== 3` erweitern; die Umwandlung der
Hände bleibt gleich (von Prüfer E an einer Kopie des Adapters geprüft: 40 von 40 Händen, Ergebnis gleich wie mit Version 2). Der Ereignisstrom
(Abschnitt 3) ist als Ersatz für das Gedächtnis nur eingeschränkt geeignet: Seine Handdatensätze tragen bewusst keinen Zeitstempel und keine
Handnummer (sonst ließen sich verdeckte Karten aus dem Seed nachbauen) und eine eigene, nicht sprechende ID. PAI braucht für das Gedächtnis die
Zeitfolge; dieselbe Hand über Sicherung und Ereignisstrom eingelesen würde doppelt gezählt. Für das Gedächtnis gilt daher der Weg über die Sicherung.

## 3. Gemeinsames versioniertes Datenformat (Vorbereitung System C)

Format `PokerTrainer-Ereignisse`, Schema 1 (`PT.events`, Export in der Handhistorie: „Export Ereignisse (PAI)“):

```
{ format, schemaVersion: 1, software, channels: ["pokertrainer-coach", "pai"], separation, hands, events, contentHash,
  payload: [ { handId,
               events: [ { type: "decision", decisionId, actionIndex, complete,
                           observed: { … zum Entscheidungszeitpunkt beobachtbar: eigene Karten, Board bis zur Straße, Aktionen bis zur Entscheidung,
                                       Stacks, Positionen, erlaubte Aktionen, Gegnerwerte aus früheren Händen … },
                           recommendations: { "pokertrainer-coach": { engine, softwareVersion, modelVersion, mode, action, equity, alternatives },
                                              "pai": null },
                           chosen } ],
               afterHand: { board, shown, heroNet, showdown },      // erst nach der Hand bekannt
               handRecord: { … Handformat 1, ohne Zeitstempel … } } ] }
```

- Jede Engine schreibt nur ihren Kanal. Der Trainer füllt `pokertrainer-coach`; `pai` bleibt leer, bis PAI außerhalb des Trainers rechnet.
- `PT.events.validate` lehnt ab: verdeckte Karten anderer Spieler im beobachteten Zustand, mehr Aktionen als bis zur Entscheidung, Boardkarten späterer
  Straßen, interne Gegnerparameter, unbekannte Kanäle, falsche Prüfsumme.
- Für die getrennte **Darstellung** im Trainer fehlt eine PAI-Engine, die im Browser ohne Verbindung nach außen läuft. Der Ereignisstrom ist die
  vorbereitete Schnittstelle; eine Anzeige des PAI-Kanals folgt, sobald PAI Empfehlungen in diesem Format liefert (Später-Liste).

## 4. Gemeinsame Integrationstests

`PT_PAI_ROOT=<Pfad zu Assist> node tests/pai-integration.mjs` → `tests/results/pai-integration.json`. Ohne PAI-Arbeitsstand wird der Test übersprungen.
