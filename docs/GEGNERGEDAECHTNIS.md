# Gegnergedächtnis (Datenformat 3)

Je Computergegner speichert die Datenbank neben den Langzeitwerten (Zähler/Nenner je Gelegenheit, 17 Werte) jetzt

1. ein **Kurzzeitgedächtnis** aus exponentiell abklingenden Zählern,
2. die **Erkennung einer veränderten Spielweise** (Kurzzeit gegen ältere Beobachtungen, statistischer Test mit Hysterese),
3. die getrennte **Kartenkenntnis**: am Showdown beobachtete Karten gegen gespielte Hände, deren Karten unbekannt blieben.

Alle Werte entstehen nur aus dem, was am Tisch sichtbar war (Aktionen, am Showdown aufgedeckte Karten). Der interne Spielstil eines Computergegners (`BOT`, `BASE`, `styleOf`, `paramsOf` in `bots.js`) fließt nie in Datenbank, Anzeige oder Coach-Schnittstelle; ein Test prüft das (gleiche Beobachtungen bei Gegnern verschiedener Stile ergeben identische Profile, `stats.js` und die Oberfläche greifen nicht auf den Stil zu).

Code: `assets/js/engine/stats.js` (Abschnitt „Kurzzeitgedächtnis“, Export/Import), Gegnerdialog und Gegnerliste in `assets/js/ui/views.js`, Migration beim Start in `assets/js/ui/app.js` (`migrateStoredDb`).

## 1. Kurzzeitgedächtnis

**Alter** wird in eigenen Händen des Gegners gemessen. Nach jeder Hand, die er spielt, gilt

- λ = 0,5^(1/H) mit der **Halbwertszeit H = 100 Hände** (λ ≈ 0,99309),
- Handgewicht: h ← λ·h + 1,
- je Wert k: a ← λ·a + Treffer, s₁ ← λ·s₁ + Gelegenheiten, s₂ ← λ²·s₂ + Gelegenheiten.

Damit ist mit dem Gewicht wᵢ = λ^(Alter) jeder einzelnen Gelegenheit i: a = Σ wᵢxᵢ, s₁ = Σ wᵢ, s₂ = Σ wᵢ². Eine Beobachtung zählt nach 100 Händen halb, nach 200 Händen ein Viertel.

- Kurzzeitanteil p_r = a / s₁; effektive Stichprobe (Kish) n_eff = s₁² / s₂; 95-%-Wilson-Intervall mit n_eff; geglättet wie die Langzeitwerte (a + m·k)/(s₁ + k) mit Populationsmittel m und Stärke k aus `PT.ranges.PRIOR`/`PRIOR_K`.
- Obergrenzen bei einer Gelegenheit je Hand: s₁ ≤ 1/(1 − λ) ≈ 144,8; n_eff ≤ (1 + λ)/(1 − λ) ≈ 288,5.
- Gespeichert wird auf 4 Nachkommastellen gerundet. Der Rundungsfehler bleibt unter 0,5·10⁻⁴/(1 − λ) ≈ 0,007; die Importprüfung lässt 0,01 Toleranz.
- **Archiv und Rückkehr:** Ohne neue Hände altert das Gedächtnis nicht. Ein Gegner, der den Tisch verlässt und später zurückkehrt, bringt Langzeitwerte, Kurzzeitgedächtnis, Kartenzähler und Veränderungsanzeige unverändert mit; die erste Hand nach der Rückkehr altert das Gedächtnis ab dem gespeicherten Stand. Grund: Abklingen soll alte Beobachtungen durch neue ersetzen; ohne neue Beobachtungen gäbe es nichts, was sie ersetzt. Ändert ein Gegner während der Abwesenheit sein Spiel, füllt sich das Kurzzeitgedächtnis nach der Rückkehr mit dem neuen Verhalten, und der Test (Abschnitt 2) vergleicht es mit den älteren Beobachtungen.

## 2. Erkennung veränderter Spielweise

**Gewichteter Zwei-Anteile-Test „Kurzzeit gegen älter“.** Für einen Wert mit Langzeit [n, d] und Kurzzeit [a, s₁, s₂] bekommen dieselben Beobachtungen zwei Gewichtungen: wᵢ (Kurzzeit) und 1 − wᵢ (älterer Teil).

- p_r = a / s₁, p_o = (n − a) / w₂ mit w₂ = d − s₁ = Σ(1 − wᵢ), gepoolt p̄ = (n + 0,5)/(d + 1).
- Varianz der Differenz unter H₀ (unveränderter Anteil p), exakt auch bei überlappenden Gewichten:
  Var(p_r − p_o) = p(1 − p) · Σᵢ (wᵢ/s₁ − (1 − wᵢ)/w₂)² = p(1 − p) · V mit
  **V = s₂/s₁² − 2(s₁ − s₂)/(s₁·w₂) + (d − 2s₁ + s₂)/w₂²** (nur aus d, s₁, s₂ berechenbar).
- Stetigkeitskorrektur: z = sign(p_r − p_o) · max(0, |p_r − p_o| − 0,5/n_eff) / √(p̄(1 − p̄)·V).
- **Mindestzahl an Gelegenheiten:** s₁ ≥ 15, w₂ ≥ 40 und min(p̄, 1 − p̄)·n_eff ≥ 5 (erwartete Treffer und Nicht-Treffer im Kurzzeitfenster). Sonst kein Test („zu wenig Daten für Vergleich“).
- **Alarm** ab |z| ≥ 3,75; er endet erst, wenn |z| unter 2,0 fällt, das Vorzeichen wechselt oder die Mindestzahl nicht mehr erfüllt ist (Hysterese). Gespeichert wird `chg[k] = [Hand des Alarmbeginns, Richtung ±1]`.
- **Geprüfte Werte (7):** VPIP, PFR, 3-Bet, C-Bet Flop, Fold gegen C-Bet, AFq, WTSD. Bei H = 100 erreichen C-Bet Flop und Fold gegen C-Bet die Mindestzahl selten (0,02–0,10 Gelegenheiten je Hand, also s₁ ≈ 3–14); geprüft werden praktisch VPIP, PFR, 3-Bet, AFq und WTSD.
- **Kontrollierte Fehlalarmrate:** Ziel ist höchstens 5 % Wahrscheinlichkeit für mindestens einen Fehlalarm je stationärem Gegner in 1.000 seiner Hände, über alle 7 Werte zusammen. Die Schwellen wurden per Simulation gewählt (Abschnitt 7), nicht analytisch; wiederholtes Prüfen nach jeder Hand und mehrere Werte sind in den gemessenen Raten enthalten.
- **Folge einer erkannten Veränderung:** Für den betroffenen Wert nutzt die beste Schätzung (`profile.est`, `effectiveStats`) die Kurzzeitzähler statt der Langzeitzähler, geglättet mit demselben Populationsprior.

## 3. Beobachtet, geschätzt, unbekannt

- **Beobachtet:** am Showdown aufgedeckte Karten. `cards.sd` zählt alle Showdowns des Gegners, `shown` hält wie bisher die zehn jüngsten Blätter mit Position und Aktionen je Straße.
- **Unbekannt:** `cards.hid` zählt gespielte Hände (VPIP oder Flop gesehen), in denen seine Karten verdeckt blieben; dazu jeder Wert ohne Gelegenheit (Anzeige „unbekannt“, nie 0 %).
- **Geschätzt:** alle Anteile aus Aktionen, mit Rohwert, Zähler/Nenner, Wilson-Intervall und geglättetem Wert, langfristig und kurzfristig.
- `cards.from`: Hand des Datensatzes, ab der gezählt wird (0 bei neuen Gegnern, bisherige Handzahl bei aus Format 1/2 umgewandelten Datensätzen, weil frühere Hände nicht gezählt wurden).

Anzeige: Der Gegnerdialog (Klick auf einen Platz oder auf eine Zeile der Gegnerdatenbank) zeigt die Abschnitte „Veränderung der Spielweise“ (Hinweis mit zuletzt/vorher/Langzeit, Beginn, z), „Geschätzt: Werte aus Aktionen“ (Langzeit und Kurzzeit nebeneinander, Status je Wert) und „Beobachtet: Karten am Showdown“ (Zähler beobachtet/unbekannt, Blätter). Die Gegnerliste hat eine Spalte „Veränderung“. Alle Texte aus Datensätzen laufen über `esc()`.

## 4. Datenformat 3, Import, Export, Migration

Datensatz (zusätzlich zu Format 2):

```
recent: { h: Zahl, stats: { <17 Werte>: [a, s1, s2] } }   // Kurzzeitgedächtnis
cards:  { sd: Ganzzahl, hid: Ganzzahl, from: Ganzzahl }     // Kartenkenntnis
chg:    { <Wert aus den 7 geprüften>: [Beginn, ±1] }        // aktive Veränderungsanzeige
```

- **Prüfung beim Import (Format 3):** genau diese Felder (unbekannte und fehlende Felder werden abgelehnt), Zahlen endlich und ≥ 0, a ≤ s₁, s₂ ≤ s₁, s₁ ≤ Langzeit-Nenner, a ≤ Langzeit-Zähler, s₁ − a ≤ Langzeit-Nenner − Langzeit-Zähler (je mit Toleranz 0,01), h ≤ min(Hände, 1/(1 − λ)), sd + hid ≤ Hände − from, Beginn 1 … Hände, Richtung ±1, Schlüssel von `chg` nur aus den 7 geprüften Werten (damit auch kein `__proto__`). Weiterhin: Prüfsumme, Anzahl, Größenlimit 60 MB, höchstens 100.000 Einträge, keine Doppel-IDs. Eine beschädigte Datei lässt die bestehende Datenbank unverändert.
- **Kopf der Datei:** `"format":"PokerTrainer-DB","version":3,…,"halfLife":100`. Weicht die Halbwertszeit einer Datei ab, wird das Kurzzeitgedächtnis verworfen (Langzeitwerte bleiben), statt es falsch zu deuten.
- **Ältere Formate:** Datenbankdateien Version 1 und 2 sowie vollständige Sicherungen Version 2 bleiben importierbar und werden umgewandelt. Jeder Datensatz wird streng in seinem eigenen Format geprüft (ein Format-3-Datensatz in einer Datei Version 2 wird abgelehnt und umgekehrt). Momentaufnahmen in Lerndaten dürfen Format 2 oder 3 haben (`validRecord(r, false)`).
- **Umwandlung Format 2 → 3:** Langzeitwerte, Positionswerte, Blätter und Zeitstempel bleiben exakt; das Kurzzeitgedächtnis beginnt leer (alle alten Beobachtungen zählen als „älter“), `cards.from` = bisherige Handzahl.
- **Migration im Browser beim Start** (`app.js: migrateStoredDb`): Enthält der Speicher Datensätze im Format 2 (oder 1), werden diese **vor der Umwandlung** unverändert als Datei `Sicherung_PokerTrainer_JJJJ-MM-TT_Datenbank.json` (Datenbankdatei Version 2) im Store `backup` abgelegt und heruntergeladen; erst danach wird die umgewandelte Datenbank gespeichert. Ein Hinweis meldet die Umwandlung und bietet „Sicherung erneut herunterladen“. Schlägt die Sicherung fehl, wird nichts überschrieben und der Tab speichert nicht. Rückweg: Gesicherte Freigabe öffnen und gesicherte Datenbank importieren. Achtung (Prüfung C2): Die gesicherte Freigabe 2.0.1 (`archiv/`) nutzt dieselbe IndexedDB „pokertrainer2“ wie 2.1 und überschreibt beim Öffnen im selben Ursprung (Website oder ebenfalls per `file://` geöffnete Offline-Datei) Daten im Format 3 ohne Rückfrage. Sie wird deshalb nicht mehr auf der Website veröffentlicht; für den Rückweg vorher in 2.1 eine vollständige Sicherung exportieren und die gesicherte Freigabe in einem eigenen Browserprofil öffnen.
- Export → Import ergibt dieselbe Datenbank (kanonischer Vergleich, auch mit aktiven Veränderungsanzeigen); 5.000 Gegner mit vollem Gedächtnis: Export und Import identisch, Datei rund 13 MB (Test mit zehn Blättern je Gegner).
- Vollständige Sicherungen haben jetzt Version 3; Version 2 bleibt importierbar.

## 5. Schnittstelle für Coach und Anzeige

| Funktion | Ergebnis |
|---|---|
| `PT.stats.profile(rec)` | wie bisher (`hands`, 17 Werte in %, `af`, `bel`, `typ`) und zusätzlich: `recent` = `{ hands, halfLife, stats: { k: { rate, pct, n, d, neff, ci, sm, quality } } }`; `change` = `{ detected, keys: [{ key, label, dir, z, recent, older, long, since, ago, neff }], tested, z: { k: z oder null }, params }`; `cards` = `{ observed, unknown, from, counted, share }`; `est` = beste Schätzung je Wert (0–1); `estSrc` = `'kurzzeit'`, `'langzeit'` oder `'prior'`; `quality` = `'geschätzt'` oder `'unbekannt'` |
| `PT.stats.effectiveStats(rec)` | `{ stats: { k: [Zähler, Nenner] }, changed: [k…], linked: [k…], hands, longHands }` – bei erkannter Veränderung die Kurzzeitzähler, sonst die Langzeitzähler; direkt mit `PT.ranges.smooth(eff.stats)` nutzbar. `hands` ist bei Veränderung das Kurzzeit-Handgewicht (für Datenbasis/Unsicherheit). Funktioniert auch mit Format-2-Datensätzen (dann Langzeit). |
| `PT.stats.changeTest(nd, rc)` | z-Test eines Werts: `{ z, recent, older, long, s1, neff, old }` oder `null` (Mindestzahl nicht erreicht) |
| `PT.stats.recentProfile(rec)`, `changeProfile(rec)` | Teilstücke von `profile` |
| `PT.stats.MEMORY` | `{ HALF_LIFE, LAMBDA, H_MAX, CHANGE_KEYS, CHANGE: { zOn, zOff, minRecent, minOld, minExp, cc } }` |
| `PT.stats.loadRecord(r)`, `recordVersion(r)`, `needsMigration(list)`, `migrateV2(r)`, `rawExport(list, version)` | Laden und Umwandeln beliebiger bekannter Formate, Sicherungsdateien alter Formate |
| `PT.stats.setMemoryParams(o)` | nur für Messreihen (Parameterstudie), nicht in der App |

**Nutzung im Coach** (umgesetzt): `coach.oppStats(dbRec)` rechnet mit `S.effectiveStats(dbRec)` (`eff.stats`, `eff.hands`). Seit Prüfung B liefert `effectiveStats` zusätzlich `linked`: Werte mit gemeinsamem Nenner je Hand (VPIP, PFR), die wegen eines Alarms des Partnerwerts ebenfalls aus den Kurzzeitzählern kommen; `profile().est` folgt derselben Regel. Der frühere Vorschlag an dieser Stelle ist damit erledigt.

## 6. Gegner-KI: Anpassung an synthetische Heldenstrategien

**Messaufbau** (`tests/gedaechtnis-eval.js adapt`, Bausteine in `tests/gedaechtnis-lib.js`): Der Held spielt mit der Logik eines TAG-Computergegners (g003) und weicht nur im untersuchten Punkt ab. Je Strategie 2 Seeds × 20.000 Hände, gemessen ab Hand 1.500 (Heldenwerte aufgebaut). Die Bots kennen nur die öffentlichen Werte des Helden (`heroRec`). Bluff-, Value- und C-Bet-Situationen: Bot am Zug ohne offenen Einsatz, Heads-up gegen den Helden; Handklasse aus dem Perzentil der Bot-Karten auf dem Board (Luft < 52 % ohne starken Draw, mittel 76–90 %, stark ≥ 90 %) – nur zur Messung. Effekte als Differenz der Anteile mit 95-%-Wald-Intervall (Entscheidungen als unabhängig behandelt).

Gemessene Heldenwerte (beide Seeds): Fold gegen 3-Bet 89/91 % bzw. 46/46 %, Fold gegen Steal 91/90 % bzw. 46/45 %, Calling Station WTSD 100 %, Fold gegen C-Bet 0 %, AFq 0 %.

**Vorher (Stand 2.0.1, gleiche Messung):** Fold gegen 3-Bet ging nicht in die 3-Bet-Entscheidung ein: 3-Bet der Bots gegen Opens des Helden 6,8 % (Held foldet 45 %) gegen 6,7 % (Held foldet 90 %), Differenz −0,06 Prozentpunkte [−0,62; +0,49]. Gegen die Calling Station: Bluff-Bets mit Luft 16,4 % → 8,0 % (−8,4 Pp [−10,1; −6,7]), River-Bet mit mittlerer Hand 24,9 % → 30,1 % (+5,2 Pp [+0,1; +10,3]). Steals gegen 90 % Fold gegen Steal: 32,6 % → 42,3 % (+9,8 Pp [+8,6; +10,9]).

**Korrekturen in `bots.js`:**
- 3-Bet gegen ein Open des Helden: e₃ = Anpassungsfähigkeit · Schrumpfung(Fold gegen 3-Bet − 0,55; k = 25, mindestens 20 Gelegenheiten). e₃ > 0: Bluff-Anteil × clamp(1 + 6e₃; 0,25; 4), Anteil clamp(1,5e₃; 0; 0,5) der Calls wird zu 3-Bets, Hände der oberen Hälfte 3-betten zusätzlich mit clamp(0,5e₃; 0; 0,12) statt zu folden. e₃ < 0 (Held hält 3-Bets): weniger Bluffs, Value-Breite × (1 + 1,5·|e₃|).
- Gegen hohen WTSD: Bluff-Faktor bis 0,15 statt 0,4; neuer Faktor für mittlere Hände (dünne Value-Bets, mittlere C-Bets und Barrels) clamp(1 + Anpassungsfähigkeit · Schrumpfung(WTSD − 0,28) · 4; 0,7; 2,2).

**Nachher (`tests/results/gedaechtnis.json`, Abschnitt `adapt`):**

| Heldenstrategie | gemessen | Vergleich | Grundlage | Strategie | Differenz [95 %] | relativ |
|---|---|---|---|---|---|---|
| foldet 90 % gegen 3-Bets | 3-Bet der Bots gegen Opens des Helden | foldet 45 % | 6,5 % (n = 15.859) | 12,4 % (n = 14.757) | +5,9 Pp [+5,2; +6,5] | +90 % |
| foldet 90 % gegen 3-Bets | Call der Bots gegen Opens des Helden | foldet 45 % | 17,0 % | 14,0 % | −2,9 Pp [−3,8; −2,1] | −17 % |
| foldet 90 % gegen Steals | Steal-Versuche der Bots (Held in den Blinds) | foldet 45 % | 32,5 % (n = 13.584) | 42,4 % (n = 12.478) | +9,8 Pp [+8,6; +11,0] | +30 % |
| Calling Station | Bluff-Bet mit Luft | TAG-Grundstrategie | 17,3 % (n = 2.260) | 6,1 % (n = 4.370) | −11,2 Pp [−12,9; −9,5] | −65 % |
| Calling Station | davon Flop | | 24,4 % | 8,8 % | −15,7 Pp [−18,8; −12,5] | −64 % |
| Calling Station | davon Turn/River | | 11,7 % | 5,2 % | −6,6 Pp [−8,5; −4,7] | −56 % |
| Calling Station | River-Bet mit mittlerer Hand (dünner Value) | | 23,7 % (n = 435) | 40,6 % (n = 847) | +16,9 Pp [+11,8; +22,1] | +72 % |
| Calling Station | River-Bet mit starker Hand | | 61,3 % (n = 222) | 78,4 % (n = 514) | +17,1 Pp [+9,8; +24,5] | +28 % |
| Calling Station | C-Bet Flop Heads-up (alle Hände) | | 62,0 % | 44,6 % | −17,4 Pp [−20,9; −13,9] | −28 % |

Die C-Bet-Häufigkeit sinkt insgesamt, weil die meisten Flop-Situationen Luft sind und Bluff-C-Bets gegen die Calling Station wegfallen.

**Kalibrierung der sechs Stile** (`node tests/long.js calib`, 200.000 Hände): weiterhin `ok`, alle Zielbereiche erfüllt. Vorher → nachher, z. B. TAG VPIP 21,0 → 21,1, PFR 16,8 → 16,9, 3-Bet 6,7 → 7,1, AF 3,16 → 3,22; LAG 3-Bet 10,2 → 10,6; ausgeglichen 3-Bet 7,2 → 7,8; HUD-Typ-Treffer LAG 27/30 → 29/30, alle anderen unverändert vollständig.

## 7. Messwerte der Veränderungserkennung

Alle Zahlen stammen aus `tests/gedaechtnis-eval.js` (Ergebnisdatei `tests/results/gedaechtnis.json`), Parameter H = 100, z_on = 3,75, z_off = 2,0.

**Fehlalarme, synthetische stationäre Ströme** (Teil `null`; je Profil 1.000 Gegner × 1.000 Hände, Gelegenheitsraten und Anteile wie bei den Computergegnern gemessen):

| Profil | P(mindestens ein Alarm in 1.000 Händen) [95 %] | Alarme je 1.000 Hände |
|---|---|---|
| TAG | 3,8 % [2,8; 5,2] | 0,039 |
| Nit | 2,1 % [1,4; 3,2] | 0,021 |
| sehr loose | 3,9 % [2,9; 5,3] | 0,040 |

z-Werte für VPIP unter H₀ (TAG, 2.099 Stichproben): Mittel −0,05, Streuung 0,98, Anteil |z| > 2: 5,1 % (Normalverteilung: 4,6 %).

**Computergegner mit Stilwechsel** (Teil `switch`; je Szenario 32 Wiederholungen; der Wechsler spielt 600 eigene Hände im Ausgangsstil, danach 400 Hände mit der Logik eines Gegners des Zielstils; 4 weitere Gegner und der Held am Tisch, kein Gegnerwechsel; „erkannt“ = erster Alarm höchstens 300 Hände nach dem Wechsel; Verzögerung in eigenen Händen des Wechslers):

| Szenario | erkannt [95 %] | Verzögerung Median (Quartile) | zuerst ausgelöst |
|---|---|---|---|
| Nit → sehr loose | 32/32 = 100 % [89; 100] | 39 (33–45) | VPIP 28, 3-Bet 2, PFR 2 |
| loose-passiv → TAG | 31/32 = 97 % [84; 99] | 151 (98–176) | VPIP 12, PFR 11, AFq 9 |
| TAG → loose-passiv | 28/32 = 88 % [72; 95] | 108 (74–150) | VPIP 18, AFq 7, PFR 3 |
| TAG → LAG | 17/32 = 53 % [36; 69] | 143 (113–255) | PFR 9, VPIP 8 |
| TAG → Nit | 14/32 = 44 % [28; 61] | 202 (168–244) | VPIP 10, PFR 5 |
| LAG → TAG | 11/32 = 34 % [20; 52] | 211 (148–261) | VPIP 6, PFR 4, C-Bet Flop 1 |
| ausgeglichen → LAG | 10/32 = 31 % [18; 49] | 159 (113–184) | VPIP 7, PFR 4 |
| Kontrolle TAG → TAG | 0/32 [0; 11] | – | – |
| Kontrolle TAG → ausgeglichen | 0/32 [0; 11] | – | – |

Fehlalarme bei echten Computergegnern: Wechsler vor dem Wechsel 1 Alarm in 172.800 Händen (0,006 je 1.000); die übrigen, stationären Gegner am Tisch 46 Alarme in 1.152.000 Händen = 0,040 je 1.000 Hände [0,030; 0,053], also rund 4 % je 1.000 Hände – im Rahmen der Bernoulli-Messung, obwohl die Bots wegen Position, Tischbesetzung und Anpassung an den Helden nicht streng stationär sind.

**Schätzfehler nach dem Wechsel** (mittlerer absoluter Fehler der VPIP-Schätzung gegen den Stilmittelwert des Zielstils aus der Kalibrierung; enthält die individuelle Abweichung des einzelnen Bots, Kontrolle ≈ 0,017–0,023):

| Szenario | 100 Hände danach: Gedächtnis / nur Langzeit | 300 Hände danach: Gedächtnis / nur Langzeit |
|---|---|---|
| Nit → sehr loose | 0,166 / 0,276 | 0,059 / 0,216 |
| TAG → loose-passiv | 0,082 / 0,102 | 0,043 / 0,078 |
| loose-passiv → TAG | 0,108 / 0,110 | 0,047 / 0,088 |
| TAG → LAG | 0,073 / 0,074 | 0,048 / 0,057 |
| LAG → TAG | 0,075 / 0,075 | 0,045 / 0,059 |
| TAG → Nit | 0,085 / 0,085 | 0,052 / 0,066 |

**Parameterstudie** (gleiche Messung mit weniger Wiederholungen; Nullmessung mit 500 bzw. 1.000 Gegnern je Profil; Zellen: Erkennungsrate / Median der Verzögerung):

| H | z_on | Wdh. | P(Fehlalarm in 1.000 H.) TAG / Nit / sehr loose | Fehlalarme Bots je 1.000 H. | TAG → LAG | LAG → TAG | TAG → Nit | TAG → loose-passiv |
|---|---|---|---|---|---|---|---|---|
| 50 | 3,5 | 16 | 10,2 / 10,6 / 13,4 % | 0,153 | 63 % / 106 | 31 % / 146 | 31 % / 159 | 100 % / 141 |
| 50 | 4,0 | 16 | 2,6 / 1,8 / 2,2 % | 0,022 | 38 % / 173 | 0 % / – | 13 % / 190 | 63 % / 134 |
| 75 | 3,5 | 16 | 11,2 / 5,8 / 9,8 % | 0,141 | 69 % / 109 | 50 % / 176 | 44 % / 152 | 100 % / 141 |
| 75 | 3,75 | 24 | 5,1 / 2,5 / 4,4 % | 0,046 | 63 % / 126 | 29 % / 148 | 46 % / 215 | 96 % / 99 |
| 75 | 4,0 | 16 | 1,8 / 1,2 / 1,8 % | 0,019 | 44 % / 168 | 0 % / – | 13 % / 176 | 88 % / 168 |
| 100 | 3,5 | 16 | 9,4 / 5,2 / 7,6 % | 0,131 | 69 % / 160 | 56 % / 186 | 50 % / 151 | 100 % / 147 |
| **100** | **3,75** | 24 | 3,8 / 2,1 / 3,9 % | 0,042 | 58 % / 139 | 42 % / 198 | 54 % / 193 | 92 % / 105 |
| 100 | 4,0 | 16 | 1,2 / 0,4 / 0,8 % | 0,013 | 44 % / 170 | 13 % / 236 | 19 % / 184 | 88 % / 159 |

Gewählt: H = 100, z_on = 3,75 – unter den untersuchten Kombinationen diejenige, die das Fehlalarmziel (≤ 5 % je 1.000 Hände) in allen drei Profilen einhält und Abnahmen der Lockerheit (LAG → TAG, TAG → Nit) am häufigsten binnen 300 Händen erkennt (34–54 % je nach Messreihe; H = 75 mit z_on = 3,75 liegt beim Profil TAG knapp über dem Ziel, z_on = 4,0 erkennt LAG → TAG kaum). Grenze: Wechsel um weniger als etwa 10 Prozentpunkte VPIP/PFR erkennt das Verfahren binnen 300 Händen nur in rund einem Drittel bis der Hälfte der Fälle; große Wechsel (Nit ↔ sehr loose, TAG ↔ loose-passiv) zuverlässig.

## 8. Tests

- `tests/unit/gedaechtnis.js` (läuft in `node tests/run.js --quick`): Abklingen und Halbwertszeit, gewichtete Zähler gegen explizite Gewichte, z gegen Berechnung mit expliziten Gewichten, Nullverteilung; Erkennung (Mindestzahl, Richtung, Hysterese, beste Schätzung, `effectiveStats`); Format 3 (Export = Import, 5.000 Gegner, 26 Manipulationen inkl. `__proto__` und Größenlimit, Migration aus Format 2 und 1, Sicherungen Version 2 und 3, abweichende Halbwertszeit); Rückkehrer (Datensatz im Archiv unverändert, Fortschreibung ab gespeichertem Stand, kein Doppeleintrag); Fairness; Anpassung der Gegner-KI (kleine Stichprobe); Stilwechsel (kleine Stichprobe).
- `tests/e2e-gedaechtnis.js` (Browser, Playwright): Migration einer gespeicherten Format-2-Datenbank mit Sicherung vor der Umwandlung, Wiederimport der Sicherung, kein zweites Mal; Gegnerdialog mit Veränderung, Kurzzeit/Langzeit, beobachtet/geschätzt/unbekannt, Maskierung eines HTML-Aktionstexts; Gegnerliste.
- `tests/gedaechtnis-eval.js [null] [switch] [adapt]`: Messreihen dieses Dokuments (`REPS=32 ADAPT_HANDS=20000 NULL_OPP=1000`, rund 5 Minuten auf zwei Kernen).

## 9. Grenzen und offene Punkte

- Der Coach nutzt die Schnittstelle (`coach.oppStats` über `PT.stats.effectiveStats`). Seit Prüfung B (Befund 9) gelten Werte mit gemeinsamem Nenner je Hand (VPIP, PFR) immer auf derselben Zeitskala: Schlägt einer Alarm, kommen beide aus den Kurzzeitwerten (`effectiveStats().linked`); zusätzlich ist PFR im Coach nie größer als VPIP.
- Die Bots passen sich an die Langzeitwerte des Helden an, nicht an sein Kurzzeitgedächtnis; ein Held, der mitten in der Session umstellt, wird entsprechend langsamer ausgenutzt.
- Postflop-Werte mit wenigen Gelegenheiten (C-Bet Flop, Fold gegen C-Bet) werden bei H = 100 kaum geprüft; eine längere Halbwertszeit nur für diese Werte wäre möglich, verlängert aber die Verzögerung.
- Die Fehlalarmrate ist per Simulation kalibriert, nicht analytisch beschränkt.

## Nachprüfung (Prüfagent A, 2.1)

- **AFq:** zählt mehrere, korrelierte Gelegenheiten je Hand (Design-Effekt an echten Bots gemessen 1,11). Der Veränderungstest rechnet für AFq deshalb mit einer um den Faktor 1,6 erhöhten Varianz (gemessener Wert plus Zuschlag für Korrelation in der Hand).
- **Import mit anderer Halbwertszeit:** Dabei werden nicht nur das Kurzzeitgedächtnis, sondern auch die Kartenzähler (sd/hid) und die Veränderungsmarken (chg) zurückgesetzt. Der Kopfwert der Halbwertszeit ist wie alle Kopfwerte nicht durch die Prüfsumme geschützt; die Prüfsumme schützt die Gegnerdatensätze.
- **Fehlalarm über lange Zeiträume:** Das Ziel gilt je 1.000 Hände. Über 5.000 Hände eines Gegners ergibt sich hochgerechnet eine Fehlalarmwahrscheinlichkeit von etwa 15–18 % (nicht gemessen).
- **NaN-Zähler** (nur bei beschädigten Daten im Speicher möglich): der Test liefert kein Ergebnis statt z = NaN.
