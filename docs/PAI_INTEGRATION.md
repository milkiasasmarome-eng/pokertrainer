# Integration mit Adaptive Poker Intelligence (Arbeitspaket 8, 2.2; fortgeschrieben 2.3)

PAI: https://github.com/milkiasasmarome-eng/Assist, geprüfter Stand Version 0.1.0 (Commit 1b0c4da; am 27.11.2026 erneut abgefragt, unverändert), nur lesend genutzt. Beide Systeme bleiben getrennte
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
(`payload.hands`) sind seit 2.0 unverändert. **Nötige Anpassung in PAI:** `docs/PAI_AENDERUNGSAUFTRAG.md` (2.3). Das PAI-Repository wird aus diesem
Projekt nicht verändert; eine Kopie mit der Änderung liest 60 von 60 Händen aus Format 3 (`tests/pai-integration.mjs`).

**Datenschutz der Sicherung (Prüfbefund E23-1, 2.3):** Die Sicherung ist die eigene Datei des Spielers und enthält je Hand Tisch-Seed und Handnummer
(für Wiederaufnahme und Replayer). Daraus lassen sich alle verdeckten Karten nachbauen. Wer eine Sicherung an eine andere Engine gibt, gibt damit auch
diese Informationen weiter. PAI 0.1.0 übernimmt die Felder nicht; der Änderungsauftrag macht das zur Pflicht (Positivliste). Der Ereignisstrom
(Abschnitt 3) enthält sie nicht und ist deshalb der Weg für Empfehlungsvergleiche; für das Gegnergedächtnis braucht PAI die Zeitfolge aus der Sicherung.
Szenariohände aus dem Training (geskriptete Gegner, Feld `training`) gehören nicht ins Gedächtnis (E23-3, Auftrag Punkt 3).

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
