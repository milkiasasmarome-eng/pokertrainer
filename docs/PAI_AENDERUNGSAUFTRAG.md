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
| `payload.opponents[]` | Langzeitwerte | zusätzlich Kurzzeitwerte und Aktionszähler (`agg`) |
| Lerndaten | wie bisher | zusätzlich Feld `pp` (Vorher-Nachher-Test) |

PAI liest nur `payload.hands`. Für PAI ändert sich der Inhalt also nicht, nur die Kopfversion.

## Auftrag

1. In `src/data/adapters/pokertrainer.js` die Versionsprüfung ersetzen:
   ```js
   if (![2, 3].includes(json.version)) throw new Error(`Nicht unterstützte Version ${json.version} (unterstützt: 2, 3)`);
   ```
   Unbekannte Versionen (z. B. 4) bleiben abgelehnt. `halfLife`, `opponents` und Lerndaten weiter nicht übernehmen.
2. Testfall ergänzen: Sicherung Version 3 mit Händen `v: 1` wird gelesen (gleiche Händezahl, keine Fehler); Version 4 wird mit Meldung abgelehnt;
   Version 2 bleibt lesbar.
3. Dokumentation (`docs/DATENBANKSCHEMA.md`, Abschnitt Adapter) um „PokerTrainer-Backup Version 2 und 3“ ergänzen.
4. Unverändert lassen: eigene Bewertung, eigene Equity und Kennzahlen, keine Übernahme von Coach-Bewertungen des Trainers.

## Nachweis auf Seiten des Trainers

`tests/pai-integration.mjs`, Fall „Nach Änderungsauftrag (Kopie von PAI)“: Eine temporäre Kopie von PAI mit genau dieser Änderung liest
60 von 60 Händen aus einer Sicherung Version 3 und lehnt Version 4 ab. Das PAI-Repository selbst bleibt unberührt.

## Unabhängigkeit

Beide Systeme rechnen weiter getrennt: eigene Handbewertung, Equity, Kennzahlen und Empfehlungen. Der Trainer füllt im Ereignisstrom nur den Kanal
`pokertrainer-coach`; der Kanal `pai` bleibt leer, bis PAI ihn selbst füllt.
