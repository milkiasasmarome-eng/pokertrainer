# Abnahmekriterien 2.3 (vor den abschließenden Tests festgelegt)

Festgelegt am 27.11.2026, bevor einer der unten genannten abschließenden Läufe gestartet wurde. Die endgültigen Modellversionen werden vor dem ersten
abschließenden Lauf mit einem Commit eingefroren; dessen Kennung und die Prüfsummen der Engine-Module stehen in `tests/results/strategy-v23.json`
(`versions`). Danach wird an Coach, Range-, Reaktions- oder Anpassungsmodell nichts mehr geändert. Wird nach dem Einfrieren ein Fehler gefunden, der eine
Engine-Datei ändert, werden **alle** abschließenden Läufe neu gestartet (Lernprotokoll 2.2) und die alten Läufe getrennt abgelegt.

## Gegnergruppen und ihre Verwendung

| Gruppe | Quelle | Verwendung |
|---|---|---|
| Gegner-KI E | `tests/strategy/groups.js` | Erhebung der Populationstabelle (seit 2.2) |
| Gegner-KI V | `groups.js` | Modellwahl gegen bekannte Gegner |
| Gegner-KI T | `groups.js` | abschließend, bekannte Gegner (Testgruppe) |
| synthetisch E23 | `tests/strategy/synth23.js`, Gruppe `E` (12 Profile) | Ursachenanalyse, Modellentwurf |
| synthetisch Tr23 | `synth23.js`, Gruppe `Tr` (10) | Anpassung freier Parameter |
| synthetisch Va23 | `synth23.js`, Gruppe `Va` (10) | Modellwahl gegen unbekannte Strategien |
| synthetisch Ka23 | `synth23.js`, Gruppe `Ka` (8) | Range- und Equity-Kalibrierung |
| Regressionsset | `FINAL` in `strategies.js` (2.2 abschließend, seit der Analyse nicht mehr unberührt) | Regressionstest, Ursachenanalyse |
| **abschließende Testgruppe F23** | `tests/strategy/final23/` (unabhängiger Prüfagent, Siegel `SIEGEL.txt`) | **nur** abschließende Tests; Beschreibung bis danach verschlossen |

Die Seeds der abschließenden Läufe (23501 ff.) kommen in keiner Entwicklung, Anpassung oder Kalibrierung vor.

## Primäre Kennzahl und Verfahren

- All-in-bereinigte BB/100 des Helden, gepaarte Differenz je Seed (gleiche Karten je Handnummer), Block-Bootstrap mit 500er-Blöcken, je Lauf geschichtet,
  10.000 Wiederholungen. Läufe zu je 2.500 Händen. Jede Kartenfolge (Seed) ist eine unabhängige Zufallsfolge; ihre Anzahl wird je Vergleich berichtet.
- „Belegt besser“: 95-%-Intervall ganz über 0 und mindestens 20 Blöcke. „Belegt schlechter“: Intervall ganz unter 0.
- **Nichtunterlegenheit** (einseitig, α = 2,5 % je Test vor Korrektur): untere Grenze des Bootstrap-Intervalls über −δ. p-Wert = Anteil der
  Bootstrap-Wiederholungen ≤ −δ.
- **Mehrfachvergleiche:** Holm-Korrektur über die primären Tests P1–P4 (Familienfehler 5 %, einseitig). Sekundäre Vergleiche werden ohne Korrektur
  und als beschreibend gekennzeichnet berichtet.
- **Abgebrochene Läufe:** Ein Lauf, der nicht vollständig endet, wird wiederholt (gleicher Seed, gleiche Handzahl). Scheitert er dreimal, geht der Seed
  für **alle** Helden des Vergleichs aus der Auswertung, und das wird berichtet. Läufe werden nie nach ihrem Ergebnis ausgeschlossen.

## Nichtunterlegenheitsgrenzen (fachliche Begründung)

- **δ = 5 BB/100** für Coach gegen Coach: 5 BB/100 sind 0,05 BB je Hand, ein Viertel des Vorsprungs von 2.2 auf 2.1.0 gegen die Gegner-KI (+25,5) und
  weniger als ein Zehntel des Abstands der Coaches zur Gegner-KI als Held (+50). Kleinere Unterschiede ändern in einer Trainingssession von einigen hundert
  Händen nichts Sichtbares; größere würden über Monate Training einen spürbaren Unterschied der Empfehlungsqualität bedeuten.
- **δ_gto = 8 BB/100** für den gleichgewichtsnahen Modus gegen 2.0.1: Der Modus nutzt die Gegnerwerte nicht und ist gegen ausnutzbare Gegner
  absichtlich weniger ertragreich; die Grenze erlaubt geringere Ausbeute, schließt aber eine Verschlechterung in der Größenordnung des 2.1-Befunds (−20,6) aus.

## Primäre Tests (Holm, Familie P)

| Kennung | Frage | Gegner | Hände je Held | Kriterium |
|---|---|---|---:|---|
| P1 | 2.3 gegen 2.1.0 | **F23** (neue abschließende Gruppe) | 100.000 | nicht unterlegen (δ = 5) |
| P2 | 2.3 gegen 2.1.0 | Gegner-KI 2.2, gemischt, ganzer Pool | 100.000 | nicht unterlegen (δ = 5) |
| P3 | 2.3 gegen 2.1.0 | Gegner-KI T | 25.000 | nicht unterlegen (δ = 5) |
| P4 | 2.3 gleichgewichtsnah gegen 2.0.1 gleichgewichtsnah | Gegner-KI 2.2, gemischt | 60.000 | nicht unterlegen (δ_gto = 8) |

Freigabekriterium 3 des Auftrags („keine relevante Verschlechterung gegen neue unabhängige Gegner, Nichtunterlegenheit belegt“) ist P1.
Freigabekriterium 4 („Qualität gegen bekannte Gegner erhalten“) ist P2 und P3 **und** zusätzlich S1 nicht belegt schlechter.

## Sekundäre Vergleiche (beschreibend)

| Kennung | Vergleich | Gegner | Hände je Held |
|---|---|---|---:|
| S1 | 2.3 gegen 2.2.0 | Gegner-KI 2.2 | 25.000 (Teilmenge der P2-Seeds) |
| S2 | 2.3 gegen 2.1.0 | unveränderte Gegner-KI 2.1 (Referenzumgebung) | 25.000 |
| S3 | 2.3 gegen 2.1.0 | Regressionsset (frühere FINAL) | 15.000 |
| S4 | Varianten A, B, C, 2.0.1, 2.1.0, 2.2.0 und 2.3 | F23 und Gegner-KI 2.2 | je 25.000 (Teilmenge der P1/P2-Seeds) |
| S5 | 2.3 gegen 2.1.0 | 15 BB und 25 BB | je 10.000 |
| S6 | 2.3 gegen Push/Fold-Referenz | 15 BB | 10.000 |

## Weitere Kriterien

- **Kalibrierung (Arbeitspaket 5):** unverändert gegenüber 2.2: Brier der Range-Equity auf V und T nicht schlechter als 2.1.0; Bias je Straße
  innerhalb ±0,03 (Range-Kalibrierung und Equity des Coaches als Held). Neu berichtet, kein neues Ziel: mittlerer Kalibrierungsfehler (ECE, 10 Klassen),
  Bias je Einsatzgröße und gegen Ka23 und F23. Die Toleranz ±0,03 wird nicht verändert.
- **Reaktionsmodell:** mittlerer absoluter Fehler der Fold-Vorhersage auf V und T nicht schlechter als 2.2.
- **Push/Fold:** Exploitability ≤ 0,005 BB je Hand je Stacktiefe.
- **Technik:** alle Node-Tests, Browsertests und PAI-Integrationstests grün (ausgenommen ausdrücklich als Abhängigkeit von PAI gekennzeichnete Fälle),
  ≤ 5.000 Simulationen je automatischem Tipp, P95 der Rechenzeit ≤ 1.000 ms, Maximum < 2 s.
- **Modellwahl** (vor dem Einfrieren): Unter A, B, C wird für 2.3 die Variante gewählt, die auf **Va23** (unbekannte Strategien) die höchste untere
  Intervallgrenze gegen 2.1.0 hat und auf **Gegner-KI V** nicht belegt schlechter als 2.2 ist. Bei Gleichstand die einfachere (A vor C vor B).
- **Bewertung:** unveränderte Matrix aus `docs/TESTBERICHT.md`. Zusätzlich gesonderte Bewertung der Generalisierung (P1, S3, S4 auf F23). Ist P1 nicht
  erfüllt, wird 2.3 nicht zur Freigabe empfohlen, unabhängig von der Gesamtnote.
