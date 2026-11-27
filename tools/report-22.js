/* Ergebnisbericht 2.2 aus den Rohdaten (Arbeitspaket 9: „Erzeuge die Ergebnisberichte automatisch aus den tatsächlichen Rohdaten“).
   Quellen: tests/results/strategy-v22.json (Plan v22), tests/results/calib-2.2/*.sum.json und sizing_*.txt, tests/results/pushfold-solution.json,
   tests/results/perf-coach.json, tests/results/unit.json, tests/results/pai-integration.json. Kein Wert wird von Hand eingetragen.
   Aufruf: node tools/report-22.js → docs/ERGEBNISSE_2.2.md */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), RES = path.join(ROOT, 'tests', 'results');
const rd = f => { try { return JSON.parse(fs.readFileSync(path.join(RES, f), 'utf8')); } catch (e) { return null; } };
const f1 = x => x == null || !isFinite(x) ? '–' : (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
const f3 = x => x == null || !isFinite(x) ? '–' : x.toFixed(3).replace('.', ',');
const n0 = x => x == null ? '–' : Math.round(x).toLocaleString('de-DE');
/** Urteil nach der Regel aus docs/ABNAHMEKRITERIEN_2.2.md */
function verdictText(c) {
  const a = c.adj; if (!a || a.blocks < 20) return 'zu wenig Blöcke (kein Beleg)';
  return a.lo > 0 ? 'belegt besser' : a.hi < 0 ? 'belegt schlechter' : 'nicht belegt (Intervall enthält 0)';
}
function strategySection(S) {
  if (!S) return '_Keine Daten (tests/results/strategy-v22.json fehlt)._\n';
  let t = 'Quelle: `tests/results/strategy-v22.json`, ' + S.totals.runs + ' Läufe, ' + n0(S.totals.hands) + ' Helden-Hände, ' + n0(S.totals.coachDecisions) + ' Coach-Entscheidungen, ' +
    S.totals.invalidCoach + ' ungültige Coach-Aktionen, Rechenzeit ' + n0(S.totals.cpuSeconds) + ' CPU-s. Umgebungen: ' + JSON.stringify(S.versions.envHash) + '.\n\n';
  t += '| Vergleich | Hände je Held | Paare | Blöcke | Differenz BB/100 (bereinigt) | 95-%-Intervall | roh | Urteil |\n|---|---:|---:|---:|---:|---|---:|---|\n';
  S.comparisons.filter(c => /^h\d/.test(c.id)).forEach(c => { t += '| ' + c.title + ' | ' + n0(c.adj.hands) + ' | ' + c.adj.pairs + ' | ' + c.adj.blocks + ' | ' + f1(c.adj.diff) + ' | [' + f1(c.adj.lo) + '; ' + f1(c.adj.hi) + '] | ' + f1(c.raw.diff) + ' | ' + verdictText(c) + ' |\n';
    Object.keys(c.split || {}).forEach(k => (c.split[k] || []).forEach(s => { t += '| ↳ ' + s.value + ' | ' + n0(s.hands) + ' | ' + s.pairs + ' | ' + s.blocks + ' | ' + f1(s.diff) + ' | [' + f1(s.lo) + '; ' + f1(s.hi) + '] | ' + f1(s.rawDiff) + ' | ' + verdictText({ adj: s }) + ' |\n'; })); });
  t += '\nAbsolute Ergebnisse je Held und Bedingung (bereinigt, BB/100):\n\n| Gruppe | Held | Bedingung | Hände | BB/100 | 95-%-Intervall |\n|---|---|---|---:|---:|---|\n';
  S.absolute.forEach(a => { t += '| ' + a.group + ' | ' + a.heroName + ' | ' + a.condName + ' | ' + n0(a.adj.hands) + ' | ' + f1(a.adj.bb100) + ' | [' + f1(a.adj.lo) + '; ' + f1(a.adj.hi) + '] |\n'; });
  // Größenverteilung postflop je Held (H1)
  const dist = {}; S.runs.filter(r => r.group === 'h1').forEach(r => { const d = dist[r.hero] = dist[r.hero] || {}; Object.entries(r.labels || {}).forEach(([k, v]) => { d[k] = (d[k] || 0) + v; }); });
  const keys = ['check', 'fold', 'call', '⅓', '½', '¾', 'Pot', 'Overbet', 'All-in'];
  t += '\nAktionen postflop in H1 (Anteil aller Postflop-Entscheidungen):\n\n| Held | ' + keys.join(' | ') + ' | Raises |\n|---|' + keys.map(() => '---:').join('|') + '|---:|\n';
  Object.keys(dist).forEach(h => { const d = dist[h], tot = Object.values(d).reduce((a, b) => a + b, 0), r = Object.keys(d).filter(k => /^Raise/.test(k)).reduce((s, k) => s + d[k], 0);
    t += '| ' + (S.heroes[h] || h) + ' | ' + keys.map(k => f1(100 * (d[k] || 0) / tot) + ' %').join(' | ') + ' | ' + f1(100 * r / tot) + ' % |\n'; });
  const ms = S.runs.filter(r => r.avgMs != null && /^coach22/.test(r.hero)), mx = Math.max.apply(null, ms.map(r => r.maxMs)), it = Math.max.apply(null, ms.map(r => r.maxIters));
  t += '\nRechenzeit Coach 2.2 in den Läufen (Node, feste Uhr im Coach): Mittel ' + f1(ms.reduce((s, r) => s + r.avgMs * r.decisions, 0) / Math.max(1, ms.reduce((s, r) => s + r.decisions, 0))) + ' ms je Entscheidung, Maximum ' + n0(mx) + ' ms, höchstens ' + n0(it) + ' Simulationen.\n';
  return t;
}
function calibSection() {
  const D = path.join(RES, 'calib-2.2'); if (!fs.existsSync(D)) return '_Keine Kalibrierungsdaten._\n';
  const sums = {}; fs.readdirSync(D).filter(f => f.endsWith('.sum.json')).forEach(f => { sums[f.replace('.sum.json', '')] = JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); });
  let t = '| Datensatz | Version | Spots | Schätzung | tatsächlich | Bias [95 %] | Brier |\n|---|---|---:|---:|---:|---|---:|\n';
  Object.keys(sums).sort().forEach(k => { const s = sums[k].total, v = /_210$/.test(k) ? '2.1.0' : '2.2'; t += '| ' + k.replace(/_(210|22)$/, '') + ' | ' + v + ' | ' + n0(s.n) + ' | ' + f3(s.est) + ' | ' + f3(s.true) + ' | ' + f3(s.bias) + ' [' + f3(s.biasCI[0]) + '; ' + f3(s.biasCI[1]) + '] | ' + f3(s.brier) + ' |\n'; });
  const pick = (k, g, rows) => { const s = sums[k]; if (!s || !s.groups[g]) return ''; return rows.filter(r => s.groups[g][r]).map(r => { const x = s.groups[g][r]; return '| ' + k + ' | ' + r + ' | ' + n0(x.n) + ' | ' + f3(x.est) + ' | ' + f3(x.true) + ' | ' + f3(x.bias) + ' [' + f3(x.biasCI[0]) + '; ' + f3(x.biasCI[1]) + '] | ' + f3(x.mathErr) + ' | ' + f3(x.rangeErr) + ' |\n'; }).join(''); };
  t += '\nRiver nach Gegneraktion (Range-Kalibrierung; Rechenfehler = Schätzung − exakte Referenz gegen die angenommene Range, Range-Fehler = Referenz − tatsächlich):\n\n| Datensatz | Gruppe | Spots | Schätzung | tatsächlich | Bias [95 %] | Rechenfehler | Range-Fehler |\n|---|---|---:|---:|---:|---|---:|---:|\n';
  ['rc_V_210', 'rc_V_22', 'rc_T_210', 'rc_T_22', 'lead_V_210', 'lead_V_22', 'ec_V_210', 'ec_V_22', 'ec_T_210', 'ec_T_22'].forEach(k => { const s = sums[k]; if (!s) return; t += pick(k, 'Straße × Gegneraktion', Object.keys(s.groups['Straße × Gegneraktion'] || {}).filter(r => /^River/.test(r) && s.groups['Straße × Gegneraktion'][r].n >= 15)); });
  return t;
}
function sizingSection() {
  const D = path.join(RES, 'calib-2.2'); let t = '';
  ['V', 'T'].forEach(g => { const rows = {}; ['fin22' + g, 'v22alt' + g].forEach(l => { const f = path.join(D, 'sizing_' + l + '.txt'); if (!fs.existsSync(f)) return;
      const lines = fs.readFileSync(f, 'utf8').split('\n'); const i0 = lines.indexOf('## Reaktion je Größe'); if (i0 < 0) return;
      for (let i = i0 + 1; i < lines.length && lines[i].startsWith('{'); i++) { const o = JSON.parse(lines[i]); (rows[o.key] = rows[o.key] || {})[l] = o; } });
    if (!Object.keys(rows).length) return;
    t += '\nGruppe ' + g + ': beobachtete Fold-Rate (gegenfaktische Ausspielung) gegen Vorhersage\n\n| Größe (Pot) | n | beobachtet | Modell 2.2 | Modell 2.1 |\n|---|---:|---:|---:|---:|\n';
    let e22 = 0, e21 = 0, k = 0; Object.keys(rows).forEach(s => { const a = rows[s]['fin22' + g], b = rows[s]['v22alt' + g]; if (!a || !b) return; t += '| ' + s.replace('.', ',') + ' | ' + a.n + ' | ' + f3(a.obsFold) + ' | ' + f3(a.predFold) + ' | ' + f3(b.predFold) + ' (beob. ' + f3(b.obsFold) + ') |\n'; e22 += Math.abs(a.predFold - a.obsFold); e21 += Math.abs(b.predFold - b.obsFold); k++; });
    if (k) t += '| mittlerer absoluter Fehler | | | ' + f3(e22 / k) + ' | ' + f3(e21 / k) + ' |\n';
  });
  return t || '_Keine Größenstudie._\n';
}
function pushfoldSection() {
  const P = rd('pushfold-solution.json'); if (!P) return '_Keine Lösung._\n';
  let t = '| Stack (BB) | Exploitability (BB/Hand) | Jam UTG | HJ | CO | BTN | SB |\n|---:|---:|---:|---:|---:|---:|---:|\n';
  Object.keys(P).sort((a, b) => a - b).forEach(S => { const w = P[S].widths; t += '| ' + S + ' | ' + P[S].exploitability.toFixed(5).replace('.', ',') + ' | ' + ['UTG', 'HJ', 'CO', 'BTN', 'SB'].map(p => f1(100 * w[p]) + ' %').join(' | ') + ' |\n'; });
  return t;
}
function testsSection() {
  const U = rd('unit.json'), P = rd('pai-integration.json'), perf = rd('perf-22.json'), E = rd('e2e.json'), G = rd('e2e-gedaechtnis.json'), L = rd('long.json'); let t = '';
  if (U) t += '- Node-Tests (`node tests/run.js`): ' + U.passed + ' bestanden, ' + U.failed + ' fehlgeschlagen (App ' + U.app + ').\n';
  if (E) t += '- Browsertests (`node tests/e2e.js`, ' + E.date.slice(0, 10) + '): ' + E.passed + ' bestanden, ' + E.failed + ' fehlgeschlagen; LCP ' + n0(E.perf.lcp) + ' ms, CLS ' + f3(E.perf.cls) + ', Tipp Mittel ' + n0(E.perf.tipAvgMs) + ' ms, Maximum ' + n0(E.perf.tipMaxMs) + ' ms.\n';
  if (G) t += '- Gedächtnis-Browsertests (`node tests/e2e-gedaechtnis.js`): ' + G.passed + ' bestanden, ' + G.failed + ' fehlgeschlagen.\n';
  if (L) { if (L.sim) t += '- Regel-Langlauf (`node tests/long.js`, App ' + L.app + '): ' + n0(L.sim.hands) + ' Hände, ' + L.sim.errorCount + ' Fehler, ' + n0(L.sim.sidePots) + ' Side Pots, ' + n0(L.sim.splitPots) + ' Split Pots.\n';
    if (L.eval7) t += '- Sieben-Karten-Häufigkeiten: ' + (L.eval7.ok ? 'gleich den Literaturwerten' : 'ABWEICHUNG') + ' (' + n0(L.eval7.total) + ' Hände).\n';
    if (L.calib) t += '- Stil-Kalibrierung der Gegner-KI (200.000 Hände): ' + (L.calib.ok ? 'alle Stile im Zielbereich' : 'nicht alle Stile im Zielbereich') + '.\n';
    if (L.mccov) t += '- Monte-Carlo-Abdeckung: ' + (L.mccov.ok ? 'im vorab festgelegten Toleranzband' : 'außerhalb des Toleranzbands') + ' (' + (L.mccov.configs || []).length + ' Stufen, je ' + L.mccov.runsPerConfig + ' Läufe).\n'; }
  if (P) t += '- PAI-Integration (`tests/pai-integration.mjs`, PAI ' + P.pai + '): ' + P.results.filter(r => r.ok).length + ' von ' + P.results.length + ' bestanden' + (P.results.some(r => !r.ok) ? '; offen: ' + P.results.filter(r => !r.ok).map(r => r.name).join('; ') : '') + '.\n';
  if (perf) Object.keys(perf.versions).forEach(v => { const x = perf.versions[v]; t += '- Rechenzeit Tipp (`tests/perf-22.js`, ' + perf.hands + ' Hände, Node) ' + v + ': ' + x.decisions + ' Entscheidungen, Median ' + f1(x.medianMs) + ' ms, 95. Perzentil ' + f1(x.p95Ms) + ' ms, Maximum ' + f1(x.maxMs) + ' ms, über 1 s: ' + x.over1000 + '.\n'; });
  return t || '_Keine Testergebnisse._\n';
}
function build() {
  const S = rd('strategy-v22.json');
  return '# Ergebnisse 2.2 (automatisch erzeugt)\n\nErzeugt von `node tools/report-22.js` am ' + new Date().toISOString().slice(0, 10) + ' aus den Rohdaten. Kriterien: `docs/ABNAHMEKRITERIEN_2.2.md` (vor den Läufen festgelegt).\n\n' +
    '## Strategische Vergleiche (Arbeitspaket 9)\n\n' + strategySection(S) + '\n## Equity- und Range-Kalibrierung (Arbeitspaket 1)\n\n' + calibSection() +
    '\n## Reaktionsmodell und Einsatzgrößen (Arbeitspaket 2)\n' + sizingSection() + '\n## Push/Fold-Modellspiel (Arbeitspaket 4)\n\n' + pushfoldSection() + '\n## Tests\n\n' + testsSection();
}
module.exports = { verdictText, build };
if (require.main === module) { const md = build(); fs.writeFileSync(path.join(ROOT, 'docs', 'ERGEBNISSE_2.2.md'), md); console.log('docs/ERGEBNISSE_2.2.md: ' + md.length + ' Zeichen'); }
