# Quellen und Methodengrundlagen – PokerTrainer 2.0

Recherche vom 26.11.2026 (alle URLs an diesem Tag abgerufen). Keine Rechtsberatung.

Status-Marken je Eintrag:

- **[BELEGT]**: Aussage direkt in der genannten Quelle geprüft.
- **[TEILWEISE]**: Quelle gefunden, aber nur ein Teil ließ sich prüfen (z. B. nur Inhaltsverzeichnis, Volltext gesperrt).
- **[NACHGERECHNET]**: per eigenem Code bestätigt.
- **[NICHT GEFUNDEN]**: keine belastbare Quelle gefunden. Die Aussage ist dann eine eigene Einschätzung und so gekennzeichnet.

Wörtliche Zitate sind kurz gehalten (höchstens 15 Wörter je Quelle). Alles andere ist in eigenen Worten.

---

## 1. Pokerregeln Cash Game NLHE

### 1.1 Poker TDA Rules 2026, Version 1.1
- **Herausgeber:** Poker Tournament Directors Association (TDA), 2026. Laut Kopfzeile der Online-Fassung: Version 1.1 vom 21.09.2026.
- **URL (HTML-Volltext):** https://www.pokertda.com/view-poker-tda-rules/
- **URL (Download, Dropbox-Ordner mit PDF/Word, Longform inkl. Illustration Addendum):** über https://www.pokertda.com/poker-tda-rules/
- **Zweck im Projekt:** Referenz für Betting-Logik und Showdown. **Achtung:** Die TDA-Regeln gelten für Turniere. Eine eigene Cash-Game-Fassung gibt es nicht. Für Cash-spezifische Punkte siehe 1.3.
- **Regelnummern 2026** (im HTML-Volltext geprüft) **[BELEGT]**:

| Thema | Regel 2026 | Inhalt (eigene Worte) |
|---|---|---|
| Mindest-Raise | **Rule 45 (Raise Amounts)** | Ein Raise muss mindestens so groß sein wie der größte vorherige volle Bet oder Raise der laufenden Setzrunde. Gemessen wird das Inkrement. Das zeigt das Beispiel in Rule 47: Erhöhen auf 1100 gesamt gilt dort als Raise um 700. Ein Raise ab 50 % dieses Inkrements, aber unter dem Minimum, muss auf den vollen Mindest-Raise ergänzt werden. Liegt er unter 50 %, gilt er als Call, außer der Spieler hat vorher „Raise“ angesagt oder ist all-in. |
| Letzte Chips | **Rule 47 (Multiple Chip Betting)** | Wer seine letzten Chips setzt, ist all-in, unabhängig von der 50-%-Schwelle. |
| Unvollständiger All-in-Raise / Wiedereröffnung | **Rule 49 (Re-Opening the Bet)** | In No-Limit und Pot-Limit eröffnet ein Short All-in unter einem vollen Bet oder Raise die Setzrunde **nicht** für Spieler, die schon gehandelt haben und jetzt nicht mindestens einem vollen Bet oder Raise gegenüberstehen. Das gilt auch für mehrere kumulierte Short All-ins. Kurzzitat: „the minimum raise is always the last full valid bet or raise of the round“. In Limit braucht die Wiedereröffnung mindestens 50 % eines vollen Bets. |
| Unterraises korrigieren | **Rule 54** | Ein Bet oder Raise unter dem Minimum wird auf der laufenden Straße korrigiert. |
| Odd Chip | **Rule 21 (Awarding Odd Chips)** | Zuerst in die kleinste Chip-Einheit auflösen. Bei Board-Spielen mit zwei oder mehr High-Händen geht der Odd Chip an den ersten Sitz links vom Button. |
| All-in-Showdown | **Rule 17 (Face Up for All-Ins)** | Ist ein Spieler all-in und ist keine weitere Setzaktion möglich, werden alle Hände sofort aufgedeckt. |
| Showdown-Reihenfolge | **Rule 18 (Non All-In Showdowns and Showdown Order)** | Ohne freiwilliges Aufdecken zeigt zuerst der letzte Aggressor der letzten Setzrunde. Gab es dort keinen Bet, zeigt zuerst der Spieler, der in dieser Runde als Erster am Zug war. |
| Side Pots | **Rule 23 (Side Pots)** | Nur die Überschrift geprüft. |
| Nicht gecallte Einsätze | **Rule 16-B, Rule 67-A** | **[TEILWEISE]** Beide Regeln sagen, dass ein nicht gecallter Bet oder Raise zurückgegeben wird, allerdings jeweils im Zusammenhang mit Muck- oder Showdown-Unregelmäßigkeiten. Eine eigenständige allgemeine Regel „uncalled bet returned“ wurde nicht gefunden. In der Praxis ist sie gängig. |

- **Nummernwechsel gegenüber 2019:** Raise Amounts 43 → 45, Re-Opening 47 → 49, Odd Chips 20 → 21, Face Up for All-Ins 16 → 17. Alte Zitate deshalb nicht ungeprüft übernehmen.
- **Nicht geprüft:** Die PDF- und Word-Fassung 2026 aus Dropbox und das Illustration Addendum 2026 ließen sich nicht abrufen.

### 1.2 Poker TDA Rules 2019 (Longform mit Illustration Addendum)
- **Herausgeber:** Poker TDA, 2019, als Kopie beim Regulierungsportal von Virginia abgelegt.
- **URL:** https://ris.dls.virginia.gov/uploads/11VAC20/dibr/Poker%20Tournament%20Directors%20Assoc_2019%20Rules-20221228170122.pdf
- **Zweck:** Beispiel für **mehrere Short All-ins** (2019 noch Rule 47) **[BELEGT für 2019]**. Zwei Short All-ins, die zusammen ein volles Raise-Inkrement ergeben, eröffnen die Setzrunde für den ersten Bettor wieder. Wer schon gehandelt hat und weniger als ein volles Raise vor sich hat, darf nur callen oder folden. Der Mindest-Raise bleibt danach der letzte volle Bet oder Raise der Runde, im Beispiel 300. Rule 20 (2019) zeigt außerdem einen Split bei identischen Händen.

### 1.3 Robert's Rules of Poker, Version 11
- **Autor:** Robert („Bob“) Ciaffone. Ein Erscheinungsjahr wurde im Dokument nicht gefunden.
- **URL:** https://www.pagat.com/docs/RobsPkrRules11.pdf
- **Zweck:** Cash-Game-orientiertes Regelwerk als Ergänzung zur TDA **[BELEGT]**:
  - Section 14 (No-Limit), Rules 2–4: Der Raise muss mindestens so groß sein wie der vorherige Bet oder Raise der Runde. Ein Short All-in unter einem vollen Raise eröffnet die Runde nicht für Spieler, die schon gehandelt haben. Mehrere Short All-ins, die zusammen einen Raise ergeben, eröffnen sie wieder. Die Halber-Bet-Regel gilt nur in Limit.
  - Section 3 „Ties“, Rule 5a: Der Odd Chip geht an die erste Hand im Uhrzeigersinn vom Button.
  - Section 3 „The Showdown“, Rule 7: Side Pots werden vor dem Main Pot entschieden. Rule 8: Der letzte Aggressor zeigt zuerst. Ohne Bet in der letzten Runde zeigt zuerst, wer als Erster am Zug war.
  - Eine Rückgabe nicht gecallter Einsätze in No-Limit ist dort **[NICHT GEFUNDEN]**. Für Pot-Limit steht, dass Überschüsse zurückgegeben werden.

---

## 2. Kombinatorik und Häufigkeiten

### 2.1 Eigene vollständige Aufzählung **[NACHGERECHNET]**
- **Code:** `tools/verify-handcount.c`. Er zählt alle C(52,5) = 2.598.960 Fünf-Karten-Hände und alle C(52,7) = 133.784.560 Sieben-Karten-Hände (beste 5 aus 7) durch. Laufzeit etwa 6 s.
- **Zweck:** Testvektoren für die Handbewertung. Die Ergebnisse stimmen mit 2.2 und 2.3 überein.

| Kategorie | 5 Karten | unterschiedliche Werte (5 Karten) | 7 Karten (beste 5) | unterschiedliche Werte (7 Karten) |
|---|---:|---:|---:|---:|
| Straight Flush (inkl. Royal) | 40 | 10 | 41.584 | 10 |
| Four of a Kind | 624 | 156 | 224.848 | 156 |
| Full House | 3.744 | 156 | 3.473.184 | 156 |
| Flush | 5.108 | 1.277 | 4.047.644 | 1.277 |
| Straight | 10.200 | 10 | 6.180.020 | 10 |
| Three of a Kind | 54.912 | 858 | 6.461.620 | 575 |
| Two Pair | 123.552 | 858 | 31.433.400 | 763 |
| One Pair | 1.098.240 | 2.860 | 58.627.800 | 1.470 |
| High Card | 1.302.540 | 1.277 | 23.294.460 | 407 |
| **Summe** | **2.598.960** | **7.462** | **133.784.560** | **4.824** |

- Die 4.824 Werte, die bei 7 Karten als beste Hand vorkommen, stammen aus eigener Rechnung. Eine externe Quelle dafür wurde nicht gesucht.

### 2.2 Poker probability
- **Herausgeber:** Wikipedia (englisch), laufend aktualisiert.
- **URL:** https://en.wikipedia.org/wiki/Poker_probability
- **Zweck:** Tabellen für 5 und 7 Karten sowie 7.462 unterschiedliche Fünf-Karten-Werte **[BELEGT]**, identisch mit 2.1. Die Quelle ist sekundär. Sie verweist unter anderem auf Brian Alspach (SFU), MathWorld und suffe.cool. Die Zahlen gelten erst durch 2.1 als gesichert.

### 2.3 Poker (MathWorld)
- **Autor:** Eric W. Weisstein, Wolfram MathWorld.
- **URL:** https://mathworld.wolfram.com/Poker.html
- **Zweck:** Unabhängige Bestätigung der Fünf-Karten-Häufigkeiten **[BELEGT]**. Royal Flush 4 und Straight Flush 36 sind dort getrennt geführt, die Kategorie High Card fehlt. Keine Angaben zu 7 Karten.

---

## 3. Monte-Carlo: Standardfehler, Konfidenzintervall, Stoppregel

### 3.1 Monte Carlo theory, methods and examples, Kap. 2 „Simple Monte Carlo“
- **Autor:** Art B. Owen, 2013 (Online-Buch, Stanford).
- **URL:** https://artowen.su.domains/mc/
- **Zweck:** Lehrbuchquelle für Fehlerschätzung, Standardfehler, CLT-, Chebyshev- und Hoeffding-Intervalle sowie zufälligen Stichprobenumfang. **[TEILWEISE]**: Nur das Inhaltsverzeichnis wurde geprüft, das Kapitel-PDF sperrt automatische Abrufe.

### 3.2 On the Asymptotic Theory of Fixed-Width Sequential Confidence Intervals for the Mean
- **Autoren:** Y. S. Chow, Herbert Robbins. *Annals of Mathematical Statistics* 36(2), S. 457–462, 1965. DOI 10.1214/aoms/1177700156.
- **URL:** https://doi.org/10.1214/aoms/1177700156
- **Zweck:** Klassische Stoppregel: Stichproben ziehen, bis die Halbbreite des Konfidenzintervalls unter ε liegt. Die Regel ist asymptotisch gültig. **[BELEGT]** für die Bibliografie (Crossref) und über zitierende Arbeiten. Den Volltext blockiert Project Euclid.

### 3.3 Tandem-width Sequential Confidence Intervals for a Bernoulli Proportion
- **Autoren:** T. Yaacoub, D. Goldsman, Y. Mei, G. V. Moustakides. Jahr und Venue sind im abgerufenen Repository-Eintrag nicht angegeben.
- **URL:** https://par.nsf.gov/servlets/purl/10173259
- **Zweck:** Sequentielle Intervalle speziell für Anteile, also für Equity als Gewinnanteil. Optional. **[TEILWEISE]**

### 3.4 Kennzahlen für das Projekt **[NACHGERECHNET]**
- Der Standardfehler eines Anteilsschätzers ist SE = √(p(1−p)/n). Er ist am größten bei p = 0,5. Unentschieden mit 0,5 gewertet halten die Varianz bei höchstens 0,25.

| n | SE bei p=0,5 | 95-%-Halbbreite bei p=0,5 | 95-%-Halbbreite bei p=0,3 |
|---:|---:|---:|---:|
| 500 | 0,0224 | ±4,4 Prozentpunkte | ±4,0 Prozentpunkte |
| 1.000 | 0,0158 | ±3,1 Prozentpunkte | ±2,8 Prozentpunkte |
| 2.000 | 0,0112 | ±2,2 Prozentpunkte | ±2,0 Prozentpunkte |
| 5.000 | 0,0071 | ±1,4 Prozentpunkte | ±1,3 Prozentpunkte |

- Für ±1 Prozentpunkt im ungünstigsten Fall bräuchte man etwa 9.604 Durchläufe. Mit der Obergrenze von 5.000 sind also etwa ±1,4 Prozentpunkte erreichbar.

---

## 4. Bayes für kleine Stichproben (Glättung von Raten, Intervalle)

### 4.1 Data Analysis Using Stein's Estimator and Its Generalizations
- **Autoren:** Bradley Efron, Carl Morris. *JASA* 70(350), S. 311–319, 1975.
- **URL (Lehrkopie):** https://www.medicine.mcgill.ca/epidemiology/hanley/bios602/MultilevelData/EfronMorrisJASA1975.pdf
- **Zweck:** Grundlage für empirischen Bayes und Shrinkage **[BELEGT]**. Im Beispiel werden Schlagquoten von 18 Spielern nach je 45 At-Bats stark zum Gesamtmittel gezogen. Die Vorhersage für den Rest der Saison war so deutlich besser als mit den Rohwerten: Fehlerquadratsumme 5,01 gegenüber 17,56. Das passt direkt auf VPIP und PFR bei wenigen Händen.

### 4.2 Bayesian Data Analysis, 3. Auflage
- **Autoren:** A. Gelman, J. Carlin, H. Stern, D. Dunson, A. Vehtari, D. Rubin. CRC Press, 2013. Das PDF ist für nichtkommerzielle Zwecke frei.
- **URL:** https://sites.stat.columbia.edu/gelman/book/
- **Zweck:** Kap. 2.1–2.4 behandeln Binomialdaten mit Beta-Prior, die Posterior als Kompromiss aus Daten und Prior und informative Priors. Kap. 5 behandelt hierarchische Modelle, 5.3 konjugierte hierarchische Modelle. **[TEILWEISE]**: Nur das Inhaltsverzeichnis wurde geprüft.

### 4.3 Probable Inference, the Law of Succession, and Statistical Inference
- **Autor:** Edwin B. Wilson. *JASA* 22(158), S. 209–212, 1927. DOI 10.2307/2276774.
- **URL:** https://doi.org/10.2307/2276774
- **Zweck:** Originalquelle des Wilson-Intervalls **[BELEGT]** (Bibliografie über Crossref).

### 4.4 Interval Estimation for a Binomial Proportion
- **Autoren:** Lawrence D. Brown, T. Tony Cai, Anirban DasGupta. *Statistical Science* 16(2), 2001, S. 101–133. Die Seitenzahl ist nicht über Crossref bestätigt. DOI 10.1214/ss/1009213286.
- **URL:** https://doi.org/10.1214/ss/1009213286
- **Zweck:** Begründet die Wahl des Intervalls **[BELEGT]**, Abstract über das Repository der University of Pennsylvania. Für kleine n empfehlen die Autoren das Wilson-Intervall oder das Jeffreys-Intervall, für größere n Agresti-Coull. Das Wald-Intervall ist bei kleinem n unzuverlässig.

### 4.5 Formeln für das Projekt (eigene Darstellung)
- **Beta-Binomial-Glättung:** geglättete Rate = (x + α) / (n + α + β). Den Prior Beta(α, β) schätzt man aus dem Gegnerpool nach Momentenmethode (empirischer Bayes). Alternativ nimmt man einen festen schwachen Prior, z. B. α + β ≈ 20 bis 50 „Pseudohände“.
- **Wilson-Intervall (95 %):** Mitte = (p̂ + z²/2n) / (1 + z²/n). Halbbreite = z/(1 + z²/n) · √(p̂(1−p̂)/n + z²/4n²), mit z = 1,96. Beispiel: 3 aus 10 ergibt [0,108; 0,603].
- **Verknüpfung:** Abschnitt 6.3 (Dirichlet-Prior) und 6.4 (Dirichlet-Prior mit fiktiven Händen) nutzen dasselbe Prinzip.

---

## 5. Spieltheorie und CFR, Exploitability

### 5.1 Regret Minimization in Games with Incomplete Information
- **Autoren:** M. Zinkevich, M. Johanson, M. Bowling, C. Piccione. NIPS 20, 2007.
- **URL:** https://proceedings.neurips.cc/paper/2007/hash/08d98638c6fcd194a4b1e6992063e944-Abstract.html
- **Zweck:** Einführung von CFR (Counterfactual Regret) **[BELEGT]**. Wer den Counterfactual Regret minimiert, minimiert auch den Gesamt-Regret. Self-Play nähert sich so dem Nash-Gleichgewicht. Gezeigt an Abstraktionen von Limit Hold'em mit etwa 10¹² Zuständen.

### 5.2 Solving Large Imperfect Information Games Using CFR+
- **Autor:** Oskari Tammelin. arXiv:1407.5042, 18.07.2014.
- **URL:** https://arxiv.org/abs/1407.5042
- **Zweck:** Einführung von CFR+ **[BELEGT]**. Laut Autor oft mindestens zehnmal schneller als CFR, bei teils geringerem Speicherbedarf.

### 5.3 Solving Heads-Up Limit Texas Hold'em
- **Autoren:** O. Tammelin, N. Burch, M. Johanson, M. Bowling. IJCAI 2015, S. 645–651.
- **URL:** https://www.ijcai.org/proceedings/2015/97
- **Zweck:** Technik hinter Cepheus und Beweis der Korrektheit von CFR+ und Regret-Matching+ **[BELEGT]**.

### 5.4 Heads-up limit hold'em poker is solved
- **Autoren:** M. Bowling, N. Burch, M. Johanson, O. Tammelin. *Science* 347(6218), S. 145–149, 2015. DOI 10.1126/science.1259433. Erweiterte Fassung: *Communications of the ACM* 60(11), 2017.
- **URL:** https://doi.org/10.1126/science.1259433 ; CACM-Fassung: https://www.cs.ualberta.ca/~games/poker/publications/heads-up_limit_poker_is_solved.acm2017.pdf
- **Zweck:** Definition von **Exploitability** **[BELEGT]** (CACM-Fassung). Gemeint ist der erwartete Verlust gegen eine Best Response, gemessen in Milli-Big-Blinds pro Spiel (mbb/g). „Essentially solved“ heißt: Ein Leben lang Spielen (200 Hände pro Stunde, 12 Stunden am Tag, 70 Jahre) reicht nicht aus, um die Strategie mit 95 % Konfidenz von einer exakten Lösung zu unterscheiden. Daraus folgt die Schwelle von 1 mbb/g. Cepheus erreicht 0,986 mbb/g.

### 5.5 Superhuman AI for heads-up no-limit poker: Libratus beats top professionals
- **Autoren:** Noam Brown, Tuomas Sandholm. *Science* 359(6374), S. 418–424, 2018. DOI 10.1126/science.aao1733.
- **URL:** https://doi.org/10.1126/science.aao1733
- **Zweck:** Stand der Technik bei Heads-up NLHE **[BELEGT]**, nur die Bibliografie über Crossref.

### 5.6 Superhuman AI for multiplayer poker
- **Autoren:** Noam Brown, Tuomas Sandholm. *Science* 365(6456), S. 885–890, 2019. DOI 10.1126/science.aay2400.
- **URL:** https://doi.org/10.1126/science.aay2400
- **Zweck:** Pluribus, Sechser-NLHE, also dieselbe Tischgröße wie im Trainer **[BELEGT]**, nur die Bibliografie. Wichtig für die Projektkommunikation: Echte Gleichgewichtsberechnung liegt weit außerhalb dessen, was ein Browser-Trainer leisten kann. Deshalb bleibt es bei „Faustregel, kein Solver-Ergebnis“.

---

## 6. Opponent Modeling im Poker

### 6.1 Opponent Modeling in Poker
- **Autoren:** D. Billings, D. Papp, J. Schaeffer, D. Szafron. AAAI-98, S. 493–499.
- **URL:** https://mlanthology.org/aaai/1998/billings1998aaai-opponent ; PDF: https://www.cs.ualberta.ca/~games/poker/publications/AAAI98.pdf
- **Zweck:** Das Programm Loki beobachtet Gegner, baut Modelle auf und nutzt deren Muster aus **[BELEGT]**, Abstract. Details zu den Gewichtstabellen standen nicht im geprüften Abstract.

### 6.2 The challenge of poker
- **Autoren:** D. Billings, A. Davidson, J. Schaeffer, D. Szafron. *Artificial Intelligence* 134(1–2), S. 201–240, 2002. DOI 10.1016/S0004-3702(01)00130-8.
- **URL:** https://doi.org/10.1016/S0004-3702(01)00130-8
- **Zweck:** Übersicht über Hand-Stärke, Gegnermodell und Simulation in Poker-KI **[BELEGT]**, nur die Bibliografie.

### 6.3 Bayes' Bluff: Opponent Modelling in Poker
- **Autoren:** F. Southey, M. Bowling, B. Larson, C. Piccione, N. Burch, D. Billings, C. Rayner. UAI 2005, S. 550–558. Auch als arXiv:1207.1411.
- **URL:** https://arxiv.org/abs/1207.1411 ; BibTeX: https://webdocs.cs.ualberta.ca/~bowling/publications/05uai.bib
- **Zweck:** Bayessches Gegnermodell **[BELEGT]**. Aus Prior und beobachtetem Spiel entsteht eine Posterior über Gegnerstrategien, darauf folgt eine Antwortstrategie. Gezeigt mit Dirichlet-Priors. Das ist die theoretische Grundlage, um Datenbankwerte mit wenigen Händen vorsichtig zu gewichten.

### 6.4 Game Theory-Based Opponent Modeling in Large Imperfect-Information Games
- **Autoren:** Sam Ganzfried, Tuomas Sandholm. AAMAS 2011, S. 533–540.
- **URL:** https://www.cs.huji.ac.il/~jeff/aamas11/papers/B4_R56.pdf
- **Zweck:** DBBR (Deviation-Based Best Response) **[BELEGT]**. Beobachtete Aktionshäufigkeiten werden mit einem Gleichgewichts-Prior gemischt, gewichtet über fiktive Hände, damit wenige Beobachtungen weniger zählen. Die Autoren warnen, dass Exploitation den eigenen Spieler angreifbar macht. Das ist ein Vorbild für „Tipp an Datenbankwerte anpassen, aber gedämpft“.

---

## 7. Expected Value, Pot Odds, MDF, Equity Realization

### 7.1 The Mathematics of Poker
- **Autoren:** Bill Chen, Jerrod Ankenman. ConJelCo, Pittsburgh, 2006. ISBN 978-1-886070-25-7.
- **URL (Katalog):** https://www.biblio.com/9781886070257
- **Zweck:** Standardwerk zu EV, Pot Odds und spieltheoretischen Toy-Games. **[TEILWEISE]**: Bibliografie und ISBN sind belegt und das Buch wird in 7.2 zitiert. Der Buchinhalt selbst war nicht abrufbar.

### 7.2 Most Important Fundamental Rule of Poker Strategy
- **Autoren:** Sam Ganzfried, Max Chiswick. arXiv:1906.09895, v3 vom 21.02.2020. Nicht begutachteter Preprint.
- **URL:** https://arxiv.org/abs/1906.09895
- **Zweck:** Formale Definition der **Minimum Defense Frequency** **[BELEGT]**: Gegen einen Bet b in einen Pot P callt man mit Anteil P/(P+b), damit Bluffs indifferent werden. Bei Pot-Bet sind das 50 %. Die Autoren stellen die „100–50–25 MIN rule“ vor, die zusätzlich den Range-Vorteil berücksichtigt.

### 7.3 Applications of No-Limit Hold'em
- **Autor:** Matthew Janda. Two Plus Two Publishing, Mai 2013.
- **URL:** https://www.pokernews.com/books/applications-of-no-limit-hold-em.htm ; Inhaltsverzeichnis: https://www.obalkyknih.cz/file/toc/1007351/pdf
- **Zweck:** Buchquelle zu Equity und EV, mit Abschnitten „Understanding Equity“ und „Comparing Equity To Expected Value“. **[TEILWEISE]**: Nur das Inhaltsverzeichnis wurde geprüft. Einen Abschnitt namens „Equity Realization“ gibt es dort nicht.

### 7.4 Equity realization (EQR) in poker: what it measures and how to read it
- **Autor:** „Doro“, Poker Academy (poker.academy), 16.08.2023, aktualisiert 17.09.2026. Fachblog, kein Peer Review.
- **URL:** https://poker.academy/blog/post/how-to-understand-equity-realisation-eqr
- **Zweck:** Arbeitsdefinition **EQR = (EV / Pot) / Equity** **[BELEGT]** für diese Quelle. Größter Einflussfaktor ist laut Artikel die Position: In Position etwa 1,14–1,17, Out of Position etwa 0,78–0,87, jeweils in Solver-Reports. Weitere Faktoren sind Board-Textur und Spielbarkeit. Die Werte setzen Solver-Strategien voraus.

### 7.5 Which hands over or under realise equity?
- **Autor:** Barry Carter, PokerStrategy.com, 22.05.2024, aktualisiert 21.02.2026.
- **URL:** https://www.pokerstrategy.com/news/content/Which-hands-over-or-under-realise-equity_131327/
- **Zweck:** Zweite Fachquelle **[BELEGT]**, qualitativ. Suited Hände realisieren über ihrer Equity, kleine Paare und mittelstarke Hände eher darunter.

### 7.6 Formeln für das Projekt (eigene Herleitung, Standard)
- **Pot Odds (nötige Equity für einen Call):** C / (P_gesamt + C). Dabei ist C der zu zahlende Betrag und P_gesamt der Pot inklusive gegnerischem Bet. Gegen einen Bet b in einen Pot P ergibt das b / (P + 2b).
- **MDF:** P / (P + b). Bluff-Break-even, also nötige Fold-Frequenz des Gegners: b / (P + b).
- **Equity Realization in begutachteter Literatur:** **[NICHT GEFUNDEN]**. Der Begriff stammt aus der Solver-Praxis. Im Trainer sollte er nur als grobe Positionskorrektur verwendet und so gekennzeichnet werden.

---

## 8. GitHub Pages: Grenzen, Bedingungen, Daten, Kosten

### 8.1 GitHub Pages limits
- **Herausgeber:** GitHub Docs.
- **URL:** https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- **Zweck:** Technische Grenzen **[BELEGT]**:
  - Quell-Repo: empfohlen höchstens 1 GB.
  - Veröffentlichte Seite: höchstens 1 GB.
  - Deployment: Timeout nach 10 Minuten.
  - Bandbreite: weiche Grenze von 100 GB pro Monat.
  - Builds: weiche Grenze von 10 pro Stunde. Sie gilt nicht für Builds über einen eigenen GitHub-Actions-Workflow.
  - Bei Rate Limiting antwortet GitHub mit HTTP 429.
  - Pages ist kein kostenloses Hosting für Online-Geschäfte, E-Commerce oder kommerzielles SaaS. Keine sensiblen Transaktionen wie Passwörter oder Kreditkartendaten.

### 8.2 About GitHub Pages
- **Herausgeber:** GitHub Docs.
- **URL:** https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages
- **Zweck:** **[BELEGT]**
  - Kosten: Mit GitHub Free ist Pages für öffentliche Repos verfügbar.
  - Ein Pages-Site pro Repository.
  - **Datenerhebung:** Beim Besuch einer Pages-Seite wird die IP-Adresse des Besuchers zu Sicherheitszwecken protokolliert und gespeichert. Das gilt auch für Besucher, die nicht bei GitHub angemeldet sind.

### 8.3 GitHub Terms for Additional Products and Features, Abschnitt „Pages“
- **URL:** https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features
- **Zweck:** **[BELEGT]** Pages ist für statische Seiten gedacht, vor allem als Schaufenster für persönliche Projekte und Projekte von Organisationen. Kurzzitat: „not intended for or allowed to be used as a free web hosting service“, nämlich für Online-Geschäfte, E-Commerce oder kommerzielles SaaS. Spendenbuttons und Crowdfunding-Links sind erlaubt. Glücksspiel wird nicht erwähnt.

### 8.4 GitHub Acceptable Use Policies
- **URL:** https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies
- **Zweck:** **[BELEGT]** Verboten sind unter anderem rechtswidrige Inhalte, Malware, Spam, „get-rich-quick schemes“, exzessive Bandbreite und Werbung als Hauptzweck. Glücksspiel, Wetten, Casino und Online-Gaming werden **nicht** erwähnt. Pages-Inhalte fallen ausdrücklich unter die Werberegeln.

### 8.5 GitHub Terms of Service
- **URL:** https://docs.github.com/en/site-policy/github-terms/github-terms-of-service
- **Zweck:** **[BELEGT]** Glücksspiel wird nicht erwähnt. Konten gibt es ab 13 Jahren. GitHub darf rechtswidrige oder regelwidrige Inhalte entfernen und den Zugang auch ohne Grund sperren.

### 8.6 GitHub General Privacy Statement
- **Stand:** gültig ab 27.04.2026.
- **URL:** https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement
- **Zweck:** Inhalt für PRIVACY.md **[BELEGT]**:
  - Erhoben werden unter anderem IP-Adresse, Geräte- und Sessiondaten, Datum und Uhrzeit der Anfrage, Referrer und aufgerufene Seiten.
  - Zwecke sind unter anderem Sicherheit, Missbrauchserkennung und Betrieb.
  - Die Speicherdauer richtet sich nach dem Zweck. Eine feste Frist wird nicht genannt.
  - Verantwortlich ist GitHub, Inc. oder GitHub B.V.
  - Übermittlung in die USA, gestützt auf das EU-U.S. Data Privacy Framework und Standardvertragsklauseln (Beschluss 2021/914).
  - Pages wird **nicht eigens** erwähnt.

### 8.7 GitHub Actions billing
- **URL:** https://docs.github.com/en/billing/concepts/product-billing/github-actions
- **Zweck:** **[BELEGT]** Standard-Runner von GitHub sind in öffentlichen Repos kostenlos, ebenso Self-hosted Runner. Larger Runner kosten auch in öffentlichen Repos Geld und sollten daher nicht verwendet werden.

### 8.8 Securing your GitHub Pages site with HTTPS
- **URL:** https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https
- **Zweck:** **[BELEGT]** Alle Pages-Seiten unterstützen HTTPS. Seiten unter github.io, die nach dem 15.06.2016 angelegt wurden, laufen automatisch über HTTPS. „Enforce HTTPS“ ist eine eigene Einstellung. Das ist wichtig für den Service Worker, siehe 11.

### 8.9 Ergebnis Poker-Trainer mit Spielgeld auf Pages
- In ToS, AUP und Pages-Bedingungen gibt es **kein ausdrückliches Verbot** von Glücksspiel- oder Poker-Inhalten **[BELEGT]** (Stichwortprüfung). Ein Trainer ohne Echtgeld, ohne Zahlungen, ohne Werbung und ohne Konten fällt auch nicht unter die genannten kommerziellen Ausschlüsse.
- Restrisiko (eigene Einschätzung): GitHub kann Inhalte nach eigenem Ermessen entfernen (8.5). Hinweise auf Echtgeld-Pokerseiten, Affiliate-Links oder Werbung würden das Bild ändern.
- Deutsches Glücksspielrecht: siehe 9.7.

---

## 9. Rechtliches Deutschland: Impressum und Datenschutz

### 9.1 Digitale-Dienste-Gesetz (DDG), § 5 Allgemeine Informationspflichten
- **Fundstelle:** ausgefertigt am 06.05.2024, BGBl. 2024 I Nr. 149, in Kraft seit 14.05.2024. Ersetzt § 5 TMG.
- **URL:** https://www.gesetze-im-internet.de/ddg/__5.html
- **Zweck:** **[BELEGT]** Die Pflicht trifft Anbieter von „geschäftsmäßige[n], in der Regel gegen Entgelt angebotene[n] digitale[n] Dienste[n]“. Anzugeben sind unter anderem Name und Anschrift (Nr. 1) sowie Angaben zur schnellen elektronischen Kontaktaufnahme einschließlich E-Mail-Adresse (Nr. 2). „Digitaler Dienst“ ist in § 1 Abs. 4 DDG über Art. 1 Abs. 1 lit. b der Richtlinie (EU) 2015/1535 definiert.

### 9.2 Medienstaatsvertrag (MStV), § 18 Abs. 1 und 2
- **Fassung:** Fassung vom 14.04.2020, Text gültig ab 01.12.2025 (Bayern.Recht).
- **URL:** https://www.gesetze-bayern.de/Content/Document/MStV-18
- **Zweck:** **[BELEGT]**
  - Abs. 1 trifft Telemedien, die „nicht ausschließlich persönlichen oder familiären Zwecken dienen“. Sie müssen **Name und Anschrift** leicht erkennbar, unmittelbar erreichbar und ständig verfügbar halten. Eine E-Mail-Adresse verlangt Abs. 1 nicht.
  - Abs. 2 verlangt bei journalistisch-redaktionell gestalteten Angeboten zusätzlich einen Verantwortlichen. Das ist für einen Trainer ohne redaktionelle Inhalte voraussichtlich nicht einschlägig (eigene Einschätzung).

### 9.3 Leitfaden Impressumspflicht 2024
- **Herausgeber:** Niedersächsische Landesmedienanstalt (NLM). Der Herausgeber ist aus der Domain abgeleitet, im Text nicht ausdrücklich genannt.
- **URL:** https://www.nlm.de/fileadmin/dateien/pdf/leitfaden_impressumspflicht_2024.pdf
- **Zweck:** Sicht der Aufsicht **[BELEGT]**:
  - Die Ausnahme für persönliche oder familiäre Zwecke wird „sehr eng ausgelegt“. Im Zweifel ein einfaches Impressum anbieten.
  - Nötig sind Vor- und Nachname und eine Postanschrift. Ein Postfach reicht nicht.
  - Die Anschrift eines Dritten (z. B. Büroservice, Anwalt) reicht nur, wenn er schriftlich zugestimmt hat, Zustellungen anzunehmen.

### 9.4 Impressumspflicht
- **Herausgeber:** Landesanstalt für Kommunikation Baden-Württemberg (LFK). Kein Datum angegeben.
- **URL:** https://lfk.de/impressumspflicht
- **Zweck:** **[BELEGT]**
  - Websites und Blogs, die über rein private Nutzung hinausgehen, fallen unter § 18 Abs. 1 MStV.
  - Private Nutzung liegt vor allem dann vor, wenn ein Angebot nur Freunden oder Familie zugänglich ist.
  - Nach § 18 Abs. 1 MStV sind Name und Wohnsitzanschrift anzugeben, ohne E-Mail-Pflicht. Nach § 5 DDG kommen E-Mail und weitere Angaben hinzu.

### 9.5 Infos kompakt: Impressumspflicht
- **Herausgeber:** Landesanstalt für Medien NRW. Älterer Stand, zitiert noch RStV und TMG.
- **URL:** https://www.medienanstalt-nrw.de/fileadmin/user_upload/lfm-nrw/Regulierung/Beschwerde/Infos_kompakt/Infos_kompakt-Impressumspflicht.pdf
- **Zweck:** **[BELEGT]** Passwortgeschützte Seiten für einen festen Kreis sind klar ausgenommen. Schon ein Werbebanner kann eine Seite aus dem privaten Bereich herausheben. Rechtsstand veraltet, das Prinzip ist unverändert.

### 9.6 Kommentierungen zu „geschäftsmäßig“ (§ 5 DDG)
- **IHK Karlsruhe, „Impressumspflichten“, Stand Oktober 2025:** https://www.ihk.de/karlsruhe/fachthemen/recht/internetrecht/impressumspflichten-6266634 **[BELEGT]**
  - Entscheidend ist eine nachhaltige, nicht nur gelegentliche Tätigkeit. Gewinnerzielungsabsicht ist nicht nötig.
  - Bußgeld bis 50.000 €. Abmahnungen nach UWG sind möglich.
  - Die Ausnahme in § 18 MStV gilt nur für rein private Nutzung.
- **Dr. Daniel S. Huber, IT-Recht Kanzlei, „Impressumspflicht nach dem DDG“, Stand 05.05.2025:** https://www.it-recht-kanzlei.de/website-impressumspflicht-digitale-dienste-gesetz.html **[BELEGT]**
  - „Geschäftsmäßig“ wird weit gelesen. Schon ein mittelbarer kommerzieller Zweck genügt, z. B. Finanzierung über Werbung.
  - Ob eine werbefreie, nicht kommerzielle Seite erfasst ist, lässt der Artikel offen.
- **Wissenschaftliche Dienste des Bundestages, WD 10 – 3000 – 035/22, „Erweiterte Impressumspflicht nach Medienstaatsvertrag“, 13.03.2023:** https://bundestag.de/resource/blob/944576/fe2087b8762a42290d4172c6358e17cf/WD-10-035-22-pdf-data.pdf **[BELEGT]** Seiten, die die Öffentlichkeit informieren, dienen in der Regel nicht rein privaten Zwecken und fallen unter § 18 Abs. 1 MStV. Anwendungsfall dort sind Abgeordnete.

### 9.7 Glücksspielrecht (zur Frage „Spielgeld problematisch?“)
- **Glücksspielstaatsvertrag 2021, § 3 Abs. 1:** https://www.revosax.sachsen.de/vorschrift/19073-Gluecksspielstaatsvertrag-2021 **[BELEGT]** Glücksspiel setzt ein **Entgelt** für den Erwerb einer Gewinnchance voraus. Außerdem muss die Entscheidung ganz oder überwiegend vom Zufall abhängen.
- **BVerwG, Urteil vom 22.01.2014, 8 C 26.12 (Pokerturnier Wittenberg), Pressemitteilung Nr. 5/2014:** https://www.bverwg.de/pm/2014/5 **[BELEGT]**
  - Das Gericht beanstandete nicht, dass bei Texas Hold'em nach der Vorinstanz der Zufall überwiegt.
  - Eine reine Teilnahmegebühr, die die Veranstaltungskosten deckt, ist aber kein Entgelt im Sinne von § 3 Abs. 1 GlüStV.
  - Ergebnis für das Projekt (eigene Einschätzung, gestützt auf Wortlaut und Urteil): Ein kostenloser Trainer mit Spielgeld ohne jede Zahlung ist **kein Glücksspiel** im Sinne des GlüStV.
- **USK-Leitkriterien, Dezember 2022, gültig ab 01.01.2023, Abschnitt 4.16:** https://usk.de/wp-content/uploads/2022/12/USK-Leitkriterien-2022-1.pdf **[BELEGT]**
  - Simuliertes Glücksspiel ohne Echtgeld wird bei Altersfreigaben berücksichtigt (Normalisierung, unrealistische Gewinnerwartung).
  - Abschwächend wirken unrealistische Gestaltung und „Übungschips“ statt virtueller Währung.
  - Eine Altersfreigabe ist für eine Website nicht verpflichtend. Jugendschutz nach JMStV wurde **nicht** vertieft geprüft.

### 9.8 Datenschutz: DSGVO, Rechtsprechung, Aufsicht
- **DSGVO (VO (EU) 2016/679):** https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:32016R0679 **[BELEGT]**
  - Art. 2 Abs. 2 lit. c und ErwG 18: Ausnahme für „ausschließlich persönlicher oder familiärer Tätigkeiten“.
  - Art. 4 Nr. 7: Verantwortlicher ist, wer über Zwecke und Mittel entscheidet.
  - Art. 6 Abs. 1 lit. f: berechtigtes Interesse.
  - Art. 13 Abs. 1 und 2: Pflichtinformationen, nämlich Identität und Kontakt, Zwecke, Rechtsgrundlage, berechtigte Interessen, Empfänger, Drittlandtransfer, Speicherdauer, Betroffenenrechte, Beschwerderecht.
  - Art. 13 Abs. 4: Ausnahme, wenn die betroffene Person die Informationen schon hat.
- **EuGH, Urteil vom 06.11.2003, C-101/01 (Lindqvist), Rn. 47:** https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:62001CJ0101 **[BELEGT]** Eine Veröffentlichung im Internet für eine unbegrenzte Zahl von Personen fällt nicht unter die Haushaltsausnahme.
- **EuGH, Urteil vom 19.10.2016, C-582/14 (Breyer):** https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:62014CJ0582 **[BELEGT]** Dynamische IP-Adressen sind für einen Websitebetreiber personenbezogen, wenn er rechtliche Mittel hat, die Person mit Hilfe des Zugangsanbieters zu bestimmen.
- **LG München I, Urteil vom 20.01.2022, 3 O 17493/20 (Google Fonts):** https://www.gesetze-bayern.de/Content/Document/Y-300-Z-GRURRS-B-2022-N-612 **[BELEGT]** Fonts wurden dynamisch von Google geladen, die IP-Adresse ohne Einwilligung übermittelt. Das Gericht sprach Unterlassung und 100 € Schadensersatz nach Art. 82 DSGVO zu. Der Dienst wäre auch ohne Verbindung zu Google nutzbar gewesen.
- **LfD Niedersachsen, „Informationen für Betreiber von Webseiten und Apps (‚Digitale Dienste‘)“, Stand Juli 2025:** https://www.lfd.niedersachsen.de/download/130984 **[BELEGT]**
  - Schon die IP-Adresse ist personenbeziehbar, also gilt die DSGVO für Websites in der Regel.
  - Die Art.-13-Informationen gibt man üblicherweise in einer Datenschutzerklärung.
  - Die Haushaltsausnahme gilt nicht für Seiten, die einem unbestimmten Personenkreis offenstehen oder über Suchmaschinen auffindbar sind.
- **TDDDG § 25:** https://www.gesetze-im-internet.de/ttdsg/__25.html **[BELEGT]** Speichern und Auslesen von Informationen auf dem Endgerät braucht eine Einwilligung. Ausnahme (Abs. 2 Nr. 2): Es ist „unbedingt erforderlich“ für einen vom Nutzer „ausdrücklich gewünschten“ digitalen Dienst.
- **DSK, „Orientierungshilfe der Aufsichtsbehörden für Anbieter:innen von digitalen Diensten“ (OH Digitale Dienste), Version 1.2, November 2024:** https://datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf **[BELEGT]**
  - § 25 TDDDG ist technikneutral und erfasst Local- und Session-Storage (Rz. 21). IndexedDB ist nicht ausdrücklich genannt.
  - Die Ausnahme wird streng und je Funktion geprüft. Eine Zusatzfunktion gilt erst als gewünscht, wenn der Nutzer sie aktiv nutzt (Rz. 74–81).
  - Einstellungen ohne eindeutige Kennung können erforderlich sein (Rz. 81).

### 9.9 Ergebnis Impressum (Faktenlage, keine Rechtsberatung)
- **§ 5 DDG:** Voraussetzung ist ein geschäftsmäßiger, in der Regel entgeltlicher Dienst. Gewinnabsicht ist nicht nötig, und schon mittelbare Finanzierung wie Werbung kann reichen (9.6). Bei einem werbefreien, kostenlosen Open-Source-Hobbyprojekt ohne kommerziellen Zweck spricht viel gegen § 5 DDG. Eine Gerichtsentscheidung genau zu diesem Fall wurde **[NICHT GEFUNDEN]**.
- **§ 18 Abs. 1 MStV:** Diese Pflicht ist unabhängig von Kommerz. Ausgenommen sind nur Angebote, die ausschließlich persönlichen oder familiären Zwecken dienen. Die Landesmedienanstalten legen die Ausnahme eng aus. Als privat sehen sie praktisch nur Angebote für einen geschlossenen Kreis an (9.3–9.5). Eine öffentliche, über Suchmaschinen auffindbare Website für beliebige Nutzer fällt nach dieser Lesart **eher nicht** darunter. Dann sind **Name und ladungsfähige Anschrift** nötig.
- **Strittig bzw. ungeklärt:** Ob ein rein privates Hobbyprojekt, das nur „aus Spaß“ öffentlich geteilt wird, dennoch „persönlichen Zwecken“ dient. Die Aufsicht sagt im Zweifel Impressum. Eine abweichende Gerichtsentscheidung wurde nicht gefunden.

### 9.10 Ergebnis Datenschutzerklärung (Faktenlage, keine Rechtsberatung)
- Die DSGVO ist anwendbar. Die Haushaltsausnahme greift bei öffentlichen Websites nicht (Lindqvist, LfD NI), und IP-Adressen sind personenbezogen (Breyer).
- Die IP-Protokollierung nimmt GitHub vor (8.2). GitHub bezeichnet sich in seiner Privacy Statement als Verantwortlicher (8.6). Ob der Seitenbetreiber für diese Logs mitverantwortlich ist, weil er GitHub als Mittel wählt, wurde für GitHub Pages in keiner Behördenäußerung oder Entscheidung gefunden **[NICHT GEFUNDEN]**.
- Die Aufsicht (LfD NI) erwartet die Art.-13-Informationen über eine Datenschutzerklärung. Eigene Einschätzung: Eine kurze, zutreffende PRIVACY.md bzw. Datenschutzseite ist der risikoarme Weg, auch ohne Cookies und Tracking.
- Für die lokale Speicherung der Gegner-Datenbank (localStorage oder IndexedDB) ist § 25 TDDDG einschlägig. Die Ausnahme „unbedingt erforderlich für den ausdrücklich gewünschten Dienst“ passt, solange nur gespeichert wird, was die gewünschte Trainerfunktion braucht. Keine Kennungen, keine Analyse.

---

## 10. Core Web Vitals

### 10.1 Web Vitals
- **Autor:** Philip Walton, web.dev (Google). Veröffentlicht 04.05.2020, aktualisiert 31.10.2024.
- **URL:** https://web.dev/articles/vitals
- **Zweck:** **[BELEGT]** Die Core Web Vitals sind LCP, INP und CLS. Bewertet wird das **75. Perzentil** der Seitenaufrufe, getrennt nach Mobil und Desktop. INP hat 2024 FID als stabile Core-Web-Vital-Metrik abgelöst.

### 10.2 Einzelartikel zu den Schwellen
- **LCP:** https://web.dev/articles/lcp (aktualisiert 04.09.2025)
- **INP:** https://web.dev/articles/inp (aktualisiert 02.09.2025)
- **CLS:** https://web.dev/articles/cls (aktualisiert 12.04.2023)

| Metrik | gut | verbesserungswürdig | schlecht |
|---|---|---|---|
| LCP | ≤ 2,5 s | > 2,5 s bis 4,0 s | > 4,0 s |
| INP | ≤ 200 ms | > 200 ms bis 500 ms | > 500 ms |
| CLS | ≤ 0,1 | > 0,1 bis 0,25 | > 0,25 |

Alle Werte **[BELEGT]**. Die Zwischenbereiche ergeben sich aus den genannten Grenzen.

---

## 11. Web App Manifest und Service Worker (MDN)

### 11.1 Making PWAs installable
- **Herausgeber:** MDN Web Docs (Mozilla), zuletzt geändert 06.10.2026.
- **URL:** https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- **Zweck:** Installierbarkeit **[BELEGT]**:
  - Das Manifest muss auf jeder Seite verlinkt sein (`<link rel="manifest">`).
  - Chromium verlangt `name` oder `short_name`, `icons` mit 192 px und 512 px, `start_url`, `display` und/oder `display_override` und `prefer_related_applications` false oder nicht gesetzt.
  - Auslieferung über HTTPS oder localhost. `file://` reicht nicht.
  - Ein Service Worker ist laut MDN **keine** Voraussetzung für die Installierbarkeit.
  - Firefox Desktop installiert keine Manifest-PWAs. Safari ab macOS Sonoma bietet „Add to Dock“. iOS kennt kein `beforeinstallprompt`.

### 11.2 Using Service Workers
- **Herausgeber:** MDN, zuletzt geändert 25.09.2026.
- **URL:** https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- **Zweck:** Update-Lebenszyklus **[BELEGT]**:
  - Ablauf: register → install (einmalig, Assets cachen) → **waiting**, solange die alte Version noch Seiten steuert → activate, sobald alle alten Seiten geschlossen sind. In `activate` alte Caches löschen.
  - `skipWaiting()` aktiviert sofort. `clients.claim()` übernimmt offene, noch nicht gesteuerte Seiten.
  - Für jede neue Version einen neuen Cache-Namen verwenden.
  - Der Standard-Scope ist das Verzeichnis des Skripts.
  - Service Worker brauchen einen sicheren Kontext (HTTPS oder localhost).

### 11.3 ServiceWorkerRegistration.update()
- **Herausgeber:** MDN, zuletzt geändert 06.03.2024.
- **URL:** https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/update
- **Zweck:** **[BELEGT]** `update()` lädt das Skript neu und installiert eine neue Version nur, wenn sie nicht Byte für Byte gleich ist. Liegt der letzte Abruf mehr als 24 h zurück, wird der HTTP-Cache umgangen. Ein festes automatisches Prüfintervall nennt die Seite nicht.

---

## Konsequenzen für das Projekt

**Regeln und Engine**

1. **Mindest-Raise:** Das Inkrement muss mindestens so groß sein wie das größte volle Bet- oder Raise-Inkrement der laufenden Straße. Preflop gilt der Big Blind als Eröffnungs-Bet. Gespeichert wird `lastFullRaiseSize` je Straße (TDA 45 und 49, Robert's 14.3).
2. **Short All-in:** Ein All-in unter einem vollen Raise setzt `lastFullRaiseSize` nicht neu.
   - Spieler, die schon gehandelt haben, dürfen nur callen oder folden, solange das gesamte Inkrement seit ihrer letzten Aktion kleiner als ein voller Raise ist.
   - Erreichen kumulierte Short All-ins ein volles Inkrement, ist die Runde für sie wieder offen (TDA 2019 Addendum, Robert's 14.4).
   - Pro Spieler wird dafür der Betrag gespeichert, dem er bei seiner letzten Aktion gegenüberstand.
3. **Ungültiger Betrag:** Die 50-%-Regel aus TDA 45 betrifft das Schieben physischer Chips. Im Trainer wird jeder Betrag unter dem Mindest-Raise abgewiesen, außer er ist ein All-in. Das deckt sich mit der Projektvorgabe „mit Meldung zurückweisen“.
4. **Nicht gecallter Überschuss:** Er wird vor der Pot-Aufteilung an den Bettor zurückgegeben. Das ist gängige Praxis, in den Quellen aber nur indirekt belegt (TDA 16-B und 67-A).
5. **Side Pots** nach All-in-Stufen bilden und je Pot getrennt auswerten. Reihenfolge laut Robert's: Side Pots vor dem Main Pot.
6. **Odd Chip:** In 0,50er-Einheiten bzw. in der kleinsten Spieleinheit rechnen. Der Rest geht je Pot an den ersten beteiligten Gewinner links vom Button (TDA 21, Robert's 3.5a).
7. **Showdown-Reihenfolge:** Der letzte Aggressor der letzten Straße zeigt zuerst. Ohne Bet zeigt der erste aktive Spieler links vom Button zuerst. Bei All-in ohne weitere Setzmöglichkeit sofort alle Hände aufdecken (TDA 17 und 18).
8. **Handbewertung:** Die Tabelle aus 2.1 ist als Regressionstest zu verwenden: 7.462 Werte bei 5 Karten, 4.824 bei 7 Karten, alle Kategorienzahlen exakt.

**Tipps und Statistik**

9. **Monte-Carlo:** In Blöcken simulieren, z. B. zu 500 Durchläufen, mit harter Obergrenze 5.000.
   - Früh stoppen, wenn das 95-%-Intervall der Equity ganz über oder ganz unter der nötigen Equity aus den Pot Odds liegt (entscheidungsorientierte Stoppregel nach Chow-Robbins).
   - Sonst stoppen, wenn die Halbbreite unter z. B. 2 Prozentpunkten liegt. Dafür reichen bei p = 0,5 etwa 2.401 Durchläufe.
   - Bei der Obergrenze ist die Genauigkeit im ungünstigsten Fall etwa ±1,4 Prozentpunkte. Das gehört in die Begründung des Tipps.
10. **Datenbankwerte:** Neben Rohwerten optional eine Beta-Binomial-geglättete Rate anzeigen (Prior aus dem Pool, empirischer Bayes) und ein Wilson-Intervall.
    - Gegneranpassungen im Tipp nach Stichprobengröße dämpfen (Efron/Morris, Southey et al., Ganzfried/Sandholm).
    - Die festen Schwellen 100 und 500 Hände für „unsicher“, „Tendenz“ und „belastbar“ bleiben als Projektvorgabe bestehen.
11. **Formeln im Tipp:** Pot Odds = C/(P_gesamt + C), MDF = P/(P+b).
    - Equity Realization nur als gekennzeichnete grobe Positionskorrektur verwenden. Dafür gibt es nur Fachblog-Quellen.
    - Keine Aussage „GTO“ oder „optimal“. Exploitability (mbb/g, 5.4) ist das Fachmaß, ein Browser-Trainer kann es für NLHE mit sechs Spielern aber nicht berechnen.

**Hosting und Technik**

12. **GitHub Pages:**
    - Öffentliches Repo nutzen. Deploy über einen eigenen Actions-Workflow mit Standard-Runnern: kostenlos und ohne das Limit von 10 Builds pro Stunde.
    - Seite deutlich unter 1 GB halten.
    - „Enforce HTTPS“ aktivieren.
    - Keine Werbung, keine Spendenpflicht, keine Links zu Echtgeld-Pokerseiten. Damit sind die kommerziellen Ausschlüsse und die Werbe-AUP nicht berührt.
13. **Keine externen Ressourcen:** Keine CDNs, keine Webfonts von Dritten, keine Analytics. Alles wird aus dem eigenen Repo ausgeliefert (Lehre aus LG München I zu Google Fonts). Dann verarbeitet nur GitHub beim Ausliefern Daten.
14. **PWA:**
    - Manifest mit `name`, `short_name`, Icons in 192 und 512 px, `start_url: "./"`, `scope: "./"` und `display: "standalone"`. Die relativen Pfade passen zum Projektpfad `/pokertrainer/`.
    - Service Worker im Verzeichnis `/pokertrainer/` ablegen. Der Scope ist dann automatisch korrekt.
    - Versionierte Cache-Namen verwenden. Alte Caches in `activate` löschen.
    - Eine Update-Meldung „Neue Version verfügbar“ zeigen und erst auf Klick `skipWaiting()` aufrufen. Das passt zur Regel „keine automatische Aktion ohne Nutzer“.
15. **Performance-Ziele** (75. Perzentil): LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1.
    - Die Equity-Simulation muss in einen Web Worker oder in Blöcke mit `await`, sonst verletzt sie INP.
    - Layoutflächen für Tipp- und Gegnerfelder fest reservieren, damit CLS niedrig bleibt.

**Rechtstexte**

16. **PRIVACY.md bzw. Datenschutzseite** soll mindestens enthalten:
    - Verantwortlicher mit Name und Kontakt: [OFFEN: Name, Anschrift, E-Mail des Betreibers].
    - Keine Cookies, kein Tracking, keine Konten, keine Werbung, keine Verbindungen zu Dritten außer GitHub.
    - Hosting durch GitHub Pages (GitHub, Inc. bzw. GitHub B.V.): Beim Abruf werden IP-Adresse und technische Zugriffsdaten zu Sicherheitszwecken protokolliert.
    - Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO (sicherer Betrieb).
    - Übermittlung in die USA gestützt auf Data Privacy Framework und Standardvertragsklauseln, Speicherdauer laut GitHub zweckabhängig. Link auf das GitHub Privacy Statement.
    - Lokale Speicherung: Gegner-Datenbank und Einstellungen bleiben ausschließlich im Browser des Nutzers (localStorage oder IndexedDB) und werden nie übertragen. Grundlage ist § 25 Abs. 2 Nr. 2 TDDDG. Löschen über Browserdaten oder Export/Import.
    - Betroffenenrechte nach Art. 15–21 DSGVO und Beschwerderecht bei einer Aufsichtsbehörde.
17. **Impressum:** Nach der Faktenlage ist ein einfaches Impressum nach § 18 Abs. 1 MStV mit **Vor- und Nachname und ladungsfähiger Anschrift** wahrscheinlich nötig, weil die Seite öffentlich und auffindbar ist. Ein Postfach reicht nicht. Eine Zustellanschrift Dritter geht nur mit deren schriftlicher Zustimmung.
    - § 5 DDG (zusätzlich E-Mail usw.) ist bei werbefreiem, kostenlosem Betrieb eher nicht einschlägig. Eine E-Mail-Adresse anzugeben ist trotzdem unschädlich und praktisch.
    - Werte bleiben offen: [OFFEN: Name und ladungsfähige Anschrift des Betreibers].
    - Wer keine Privatanschrift veröffentlichen will, kann eine Zustelladresse mit schriftlicher Vollmacht nutzen (9.3).
    - Im Zweifel anwaltlich prüfen lassen.
18. **Hinweistext auf der Seite:** „Spielgeld, kein Echtgeld, keine Gewinne, kein Glücksspiel im Sinne des GlüStV.“ Dazu eine Altersempfehlung, z. B. ab 18, als freiwillige Vorsicht. Grundlage ist USK 4.16, Jugendschutz wurde nicht vertieft geprüft.

---

## Methodik und Grenzen

- Der Volltext war nicht abrufbar bei Owen Kap. 2 (robots-Sperre), Project Euclid (Chow-Robbins, Brown et al.; Bot-Schutz), dem TDA-PDF 2026 (Dropbox) und Chen/Ankenman (Buch). Dort stützen sich die Angaben auf Inhaltsverzeichnisse, Abstracts, Crossref-Metadaten oder zitierende Arbeiten.
- Juristische Aussagen geben Gesetzestext, Behördenleitfäden und Kommentierungen wieder. Zu „GitHub-Pages-Betreiber als (Mit-)Verantwortlicher“ und zu „Impressum bei werbefreiem Open-Source-Hobbyprojekt“ wurde keine einschlägige Gerichtsentscheidung gefunden.
