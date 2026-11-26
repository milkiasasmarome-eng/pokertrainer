/* Erzeugt docs/TESTERGEBNISSE.md aus den gespeicherten Testergebnissen (tests/results/*.json).
   Nur tatsächlich ausgeführte Tests erscheinen; fehlende Ergebnisdateien werden als „nicht ausgeführt“ gemeldet. */
'use strict';
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', 'tests', 'results');
function load(f) { try { return JSON.parse(fs.readFileSync(path.join(R, f), 'utf8')); } catch (e) { return null; } }
const unit = load('unit.json'), quick = load('unit-quick.json'), long = load('long.json'), e2e = load('e2e.json'), live = load('e2e-live.json'), lv = load('live.json');
const L = [];
L.push('# Testergebnisse (automatisch erzeugt)', '', 'Erzeugt mit `node tools/report.js` aus `tests/results/*.json`. Stand: ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC.', '');
function suite(title, s) {
  L.push('## ' + title, '');
  if (!s) { L.push('**Nicht ausgeführt** (keine Ergebnisdatei).', ''); return; }
  L.push('Ausgeführt: ' + s.date + (s.node ? ' · Node ' + s.node : '') + (s.base ? ' · ' + s.base : '') + ' · **' + s.passed + ' bestanden, ' + s.failed + ' fehlgeschlagen**', '');
  L.push('| Test | Ergebnis | Prüfungen | Dauer | Hinweise |', '|---|---|---:|---:|---|');
  s.tests.forEach(t => L.push('| ' + t.name.replace(/\|/g, '/') + ' | ' + (t.ok ? 'bestanden' : '**fehlgeschlagen**') + ' | ' + t.checks + ' | ' + (t.ms / 1000).toFixed(1) + ' s | ' + (t.notes || []).join('; ').replace(/\|/g, '/').slice(0, 300) + ' |'));
  L.push('');
}
suite('Node-Testsuite (vollständig)', unit);
if (!unit) suite('Node-Testsuite (Schnelllauf)', quick);
L.push('## Langläufer', '');
if (!long) L.push('**Nicht ausgeführt.**', '');
else {
  if (long.eval7) L.push('### Sieben-Karten-Enumeration', '', 'Alle ' + long.eval7.total.toLocaleString('de-DE') + ' Kombinationen in ' + (long.eval7.ms / 1000).toFixed(1) + ' s; ' + long.eval7.distinct + ' verschiedene Werte; Häufigkeiten ' + (long.eval7.ok ? '**identisch** mit den Referenzwerten' : '**abweichend**') + '.', '',
    '| Kategorie | gezählt | Referenz |', '|---|---:|---:|', ...['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'].map((n, i) => '| ' + n + ' | ' + long.eval7.cats[i].toLocaleString('de-DE') + ' | ' + long.eval7.expected[i].toLocaleString('de-DE') + ' |'), '');
  if (long.sim) L.push('### Massensimulation', '', long.sim.hands.toLocaleString('de-DE') + ' Hände, ' + long.sim.actions.toLocaleString('de-DE') + ' Aktionen, Invarianten (Chipbilanz, Kartenintegrität, Spieler am Zug, Einsätze) nach **jeder** Aktion geprüft: **' + long.sim.errorCount + ' Fehler**. ' +
    'Showdowns ' + long.sim.showdowns.toLocaleString('de-DE') + ', Hände mit Side Pots ' + long.sim.sidePots.toLocaleString('de-DE') + ', mit Split Pots ' + long.sim.splitPots.toLocaleString('de-DE') + ', mit All-in ' + long.sim.allIns.toLocaleString('de-DE') +
    ', Gegnerwechsel ' + long.sim.swaps.toLocaleString('de-DE') + ', Nachkäufe ' + long.sim.rebuys.toLocaleString('de-DE') + ', abgewiesene ungültige Eingaben ' + long.sim.invalidRejected.toLocaleString('de-DE') + ', Bot-Rückfälle ' + long.sim.botFallbacks + '. Dauer ' + Math.round(long.sim.ms / 1000) + ' s auf ' + long.cpus + ' Kernen.', '',
    'Konfigurationen (je 1/8): ' + long.sim.configs.map(c => '`' + c + '`').join(', ') + '.', '');
  if (long.calib) {
    L.push('### Kalibrierung der Gegner-KI', '', long.calib.hands.toLocaleString('de-DE') + ' simulierte Hände, Werte aus der Statistik-Engine (nur öffentliche Aktionen). Zielbereiche: typische 6-max-Werte je Spielertyp. HUD-Typ: Anteil der Gegner mit ≥ 300 Händen, deren Typ nach Projektregel zum Stil passt.', '',
      '| Stil | Hände | VPIP | PFR | 3-Bet | AF | C-Bet | Fold vs C-Bet | WTSD | W$SD | Zielbereiche erfüllt | HUD-Typ |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|');
    Object.keys(long.calib.styles).forEach(k => { const s = long.calib.styles[k], st = s.stats; L.push('| ' + k + ' | ' + s.hands.toLocaleString('de-DE') + ' | ' + st.vpip + ' | ' + st.pfr + ' | ' + st.threeBet + ' | ' + st.af + ' | ' + st.cbetFlop + ' | ' + st.foldToCbet + ' | ' + st.wtsd + ' | ' + st.wsd + ' | ' + Object.keys(s.checks).map(c => c + (s.checks[c] ? ' ✓' : ' ✗')).join(', ') + ' | ' + s.hudTypeMatch + ' |'); });
    L.push('');
  }
  if (long.coach) {
    L.push('### Coach gegen Referenz', '', 'Ein Held, der stets der Coach-Empfehlung folgt, spielt gegen die Bots; Vergleich mit einem Helden, der die Bot-Logik eines TAG-Profils nutzt (gleiche Seeds). Spielgeld-Ergebnisse streuen stark (≈ ±25 BB/100 je 2.500 Hände); sie sind nur ein grober Plausibilitätsnachweis.', '',
      '| Modus | Seed | Coach BB/100 | TAG-Bot BB/100 | Ø ms je Analyse | max. ms | max. Simulationen |', '|---|---:|---:|---:|---:|---:|---:|');
    long.coach.exploit.forEach(r => L.push('| exploitativ | ' + r.seed + ' | ' + r.coachBB100 + ' | ' + r.botBB100 + ' | ' + r.avgMs + ' | ' + r.maxMs + ' | ' + r.maxIt + ' |'));
    long.coach.gto.forEach(r => L.push('| gleichgewichtsnah | ' + r.seed + ' | ' + r.coachBB100 + ' | ' + r.botBB100 + ' | ' + r.avgMs + ' | ' + r.maxMs + ' | ' + r.maxIt + ' |'));
    L.push('', 'Mittel exploitativ: Coach ' + long.coach.exploitAvgCoach.toFixed(1) + ' BB/100, TAG-Bot ' + long.coach.exploitAvgBot.toFixed(1) + ' BB/100. Mittel gleichgewichtsnah: Coach ' + long.coach.gtoAvgCoach.toFixed(1) + ', TAG-Bot ' + long.coach.gtoAvgBot.toFixed(1) + '.', '');
  }
}
suite('Browser-Tests lokal (Playwright, Chrome)', e2e);
if (e2e && e2e.perf) L.push('Gemessen (lokaler Server, Desktop-Chrome ohne Drosselung): Ladezeit ' + e2e.perf.loadMs + ' ms, bereit nach ' + e2e.perf.readyMs + ' ms, LCP ' + Math.round(e2e.perf.lcp) + ' ms, CLS ' + e2e.perf.cls.toFixed(3) + ', Tipp nach Zugbeginn Ø ' + e2e.perf.tipAvgMs + ' ms (max. ' + e2e.perf.tipMaxMs + ' ms), übertragene Daten ' + Math.round(e2e.perf.transfer / 1024) + ' KB.', '');
L.push('## Live-Website', '');
if (lv) { L.push('Geprüft am ' + lv.date + ' unter ' + lv.url + ' (' + lv.browser + '):', ''); lv.checks.forEach(c => L.push('- ' + (c.ok ? '✓ ' : '✗ ') + c.name + (c.detail ? ': ' + c.detail : ''))); L.push(''); }
else L.push('**Nicht ausgeführt.**', '');
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'TESTERGEBNISSE.md'), L.join('\n') + '\n');
console.log('docs/TESTERGEBNISSE.md geschrieben');
