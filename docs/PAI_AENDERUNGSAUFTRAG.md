# Änderungsauftrag an das PAI-Projekt (Adaptive Poker Intelligence)

Stand: 27.11.2026. Geprüft gegen https://github.com/milkiasasmarome-eng/Assist, Zweig `main`, Commit `1b0c4da` (Version 0.1.0, letzter Stand
vom 26.11.2026). Das PAI-Repository wurde nicht verändert.

## Anlass

PokerTrainer schreibt seit 2.1.0 Sicherungen im Format „PokerTrainer-Backup“ Version 3. PAI 0.1.0 lehnt sie ab:
`Nicht unterstützte Version 3 (unterstützt: 2)` (`src/data/adapters/pokertrainer.js`, Zeile 24).

## Was sich zwischen Version 2 und 3 geändert hat

| Teil | Version 2 | Version 3 |
|---|---|---|
| Kopf | `format`, `version`, `app`, `exported`, `checksum`, `payload` | zusätzlich `halfLife` (Halbwertszeit des Gegnergedächtnisses, Zahl 1–100.000) |
| `payload.hands[]` | Hand-Datensatz `v: 1` | **unverändert** `v: 1` |
| `payload.opponents[]` | Langzeitwerte, Aktionszähler `agg` | zusätzlich Kurzzeitwerte; seit 2.3 Bet-Größen in aufgedeckten Blättern („Bet 3,00 (0,5 Pot)“) |
| Lerndaten | wie bisher | seit 2.2 zusätzlich Feld `pp` (Vorher-Nachher-Test) |

PAI liest nur `payload.hands`. Für PAI ändert sich der Inhalt also nicht, nur die Kopfversion.

## Auftrag

1. In `src/data/adapters/pokertrainer.js` die Versionsprüfung ersetzen:
   ```js
   if (![2, 3].includes(json.version)) throw new Error(`Nicht unterstützte Version ${json.version} (unterstützt: 2, 3)`);
   ```
   Unbekannte Versionen (z. B. 4) bleiben abgelehnt.
2. **Positivliste je Hand** (Prüfbefund E23-1): übernommen werden nur `id`, `v`, `ts`, `sb`, `bb`, `button`, `seats` (Platz, Spieler-ID, Name, Startstack),
   `heroSeat`, `hero` (eigene Karten), `actions`, `board`, `shown`, `won`, `returned`, `rake`, `showdown`. **Nie übernehmen:** `seed`, `no`, `tseed`,
   `session`, `decisions`, `training`, sowie aus der Sicherung `payload.table`, `settings`, `learning`, `opponents`, `halfLife`. Aus Tisch-Seed und
   Handnummer lassen sich alle verdeckten Karten nachbauen, auch künftiger Hände. Test: kein `pai.hand` enthält eines dieser Felder.
3. **Trainingsszenarien** (E23-3): Hände mit `training` ≠ null stammen aus geskripteten Übungen (Gegner nach Drehbuch). Nicht übernehmen oder als
   eigene Herkunft (`origin: 'scenario'`) kennzeichnen und vom Gegnergedächtnis ausschließen. Test mit Szenariohänden.
4. **Aufgedeckte Blätter** (E23-2): `validateHand` lehnt `shown` für Plätze ab, die vor dem Showdown gefoldet haben.
5. Testfälle: Version 3 wird gelesen (gleiche Händezahl, keine Fehler); Version 2 bleibt lesbar; Version 4 wird mit Meldung abgelehnt; Punkte 2–4.
6. Dokumentation: in PAIs README bzw. `docs/DATENBANKSCHEMA.md` (Abschnitt zu den Importquellen) „PokerTrainer-Backup Version 2 und 3“ und die
   Positivliste ergänzen.
7. Unverändert lassen: eigene Bewertung, eigene Equity und Kennzahlen, keine Übernahme von Coach-Bewertungen des Trainers.
8. Später, getrennt: Für den Kanal `pai` im Ereignisstrom gibt es noch kein Schema; der Trainer lehnt einen gefüllten Kanal derzeit ab (E23-4).
   Ein gemeinsames Schema wird erst festgelegt, wenn PAI Empfehlungen in den Strom schreiben soll.

## Nachweis auf Seiten des Trainers

`tests/pai-integration.mjs`, Fall „Nach Änderungsauftrag (Kopie von PAI)“: Eine temporäre Kopie von PAI mit genau dieser Änderung liest
60 von 60 Händen aus einer Sicherung Version 3 und lehnt Version 4 ab. Das PAI-Repository selbst bleibt unberührt.
Die Punkte 2–4 prüft der Trainer auf seiner Seite (`tests/pai-integration.mjs`: keine verbotenen Felder in den umgewandelten Händen, `shown` nur für
Plätze am Showdown, Szenariohände gekennzeichnet); ob PAI sie selbst durchsetzt, zeigt erst PAIs eigener Test nach dem Auftrag.

## Unabhängigkeit

Beide Systeme rechnen weiter getrennt: eigene Handbewertung, Equity, Kennzahlen und Empfehlungen. Der Trainer füllt im Ereignisstrom nur den Kanal
`pokertrainer-coach`; der Kanal `pai` bleibt leer, bis PAI ihn selbst füllt.
