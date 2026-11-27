/* Ergebnisbericht 2.3 aus den Rohdaten (abgeleitet aus tools/report-22.js) (Arbeitspaket 9: „Erzeuge die Ergebnisberichte automatisch aus den tatsächlichen Rohdaten“).
   Quellen: tests/results/strategy-v23.json (Plan v23), strategy-abl23.json, strategy-sel23.json, strategy-tune23.json, tests/results/calib-2.3/*.sum.json und sizing_*.txt, tests/results/pushfold-solution.json,
   tests/results/perf-coach.json, tests/results/unit.json, tests/results/pai-integration.json. Kein Wert wird von Hand eingetragen.
   Aufruf: node tools/report-23.js → docs/ERGEBNISSE_2.3.md */
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
  if (!S) return '_Keine Daten (tests/results/strategy-v23.json fehlt)._\n';
  let t = 'Quelle: `tests/results/strategy-v23.json`, ' + S.totals.runs + ' Läufe, ' + n0(S.totals.hands) + ' Helden-Hände, ' + n0(S.totals.coachDecisions) + ' Coach-Entscheidungen, ' +
    S.totals.invalidCoach + ' ungültige Coach-Aktionen, Rechenzeit ' + n0(S.totals.cpuSeconds) + ' CPU-s. Prüfsummen: ' + JSON.stringify(S.versions) + '.\n\n';
  t += '| Kennung | Vergleich | Hände je Held | unabhängige Kartenfolgen | Blöcke | Differenz BB/100 | 95-%-Intervall | Nichtunterlegenheit (δ, untere Grenze, p, Holm) | Urteil |\n|---|---|---:|---:|---:|---:|---|---|---|\n';
  S.comparisons.filter(c => /^(P|S)\d/.test(c.id)).forEach(c => { const ni = c.ni ? 'δ ' + c.ni.delta + ', ' + f1(c.ni.lo) + ', p = ' + (c.ni.p < 0.0001 ? '< 0,0001' : f3(c.ni.p)) + (c.ni.holm ? ', Holm (Stufe ' + f3(c.ni.holmLevel) + '): ' + c.ni.holm : '') + ' → ' + c.ni.verdict : '–';
    t += '| ' + c.id + ' | ' + c.title.replace(/^[PS]\d+[^:]*: /, '') + ' | ' + n0(c.adj.hands) + ' | ' + c.seeds.length + ' | ' + c.adj.blocks + ' | ' + f1(c.adj.diff) + ' | [' + f1(c.adj.lo) + '; ' + f1(c.adj.hi) + '] | ' + ni + ' | ' + verdictText(c) + ' |\n';
    Object.keys(c.split || {}).forEach(k => (c.split[k] || []).forEach(x => { t += '| | ↳ ' + x.value + ' | ' + n0(x.hands) + ' | | ' + x.blocks + ' | ' + f1(x.diff) + ' | [' + f1(x.lo) + '; ' + f1(x.hi) + '] | | ' + verdictText({ adj: x }) + ' |\n'; })); });
  t += '\nAbsolute Ergebnisse je Held und Bedingung (bereinigt, BB/100):\n\n| Gruppe | Held | Bedingung | Hände | BB/100 | 95-%-Intervall |\n|---|---|---|---:|---:|---|\n';
  S.absolute.filter(a => /^(p|s)[A-Z]/.test(a.group)).forEach(a => { t += '| ' + a.group + ' | ' + a.heroName + ' | ' + a.condName + ' | ' + n0(a.adj.hands) + ' | ' + f1(a.adj.bb100) + ' | [' + f1(a.adj.lo) + '; ' + f1(a.adj.hi) + '] |\n'; });
  const keys = ['check', 'fold', 'call', '⅓', '½', '¾', 'Pot', 'Overbet', 'All-in'];
  ['pF', 'pK'].forEach(g => { const dist = {}; S.runs.filter(r => r.group === g).forEach(r => { const d = dist[r.hero] = dist[r.hero] || {}; Object.entries(r.labels || {}).forEach(([k, v]) => { d[k] = (d[k] || 0) + v; }); });
    t += '\nAktionen postflop, Gruppe ' + g + ' (Anteil aller Postflop-Entscheidungen):\n\n| Held | ' + keys.join(' | ') + ' | Raises |\n|---|' + keys.map(() => '---:').join('|') + '|---:|\n';
    Object.keys(dist).forEach(h => { const d = dist[h], tot = Object.values(d).reduce((a, b) => a + b, 0); if (!tot) return; const r = Object.keys(d).filter(k => /^Raise/.test(k)).reduce((s2, k) => s2 + d[k], 0);
      t += '| ' + (S.heroes[h] || h) + ' | ' + keys.map(k => f1(100 * (d[k] || 0) / tot) + ' %').join(' | ') + ' | ' + f1(100 * r / tot) + ' % |\n'; }); });
  const ms = S.runs.filter(r => r.avgMs != null && /^coach23/.test(r.hero));
  if (ms.length) t += '\nRechenzeit Coach 2.3 in den Läufen (Node, feste Uhr im Coach): Mittel ' + f1(ms.reduce((s2, r) => s2 + r.avgMs * r.decisions, 0) / Math.max(1, ms.reduce((s2, r) => s2 + r.decisions, 0))) + ' ms je Entscheidung, Maximum ' + n0(Math.max.apply(null, ms.map(r => r.maxMs))) + ' ms, höchstens ' + n0(Math.max.apply(null, ms.map(r => r.maxIters))) + ' Simulationen.\n';
  return t;
}
function devSection() {
  let t = ''; const tab = (S, re, title) => { if (!S) return; t += '\n' + title + '\n\n| Vergleich | Hände | Differenz BB/100 | 95-%-Intervall | Urteil |\n|---|---:|---:|---|---|\n';
    S.comparisons.filter(c => re.test(c.id)).forEach(c => { t += '| ' + c.title + ' | ' + n0(c.adj.hands) + ' | ' + f1(c.adj.diff) + ' | [' + f1(c.adj.lo) + '; ' + f1(c.adj.hi) + '] | ' + verdictText(c) + ' |\n'; }); };
  tab(rd('strategy-abl23.json'), /^a1(final|V)-/, 'Ablation (Plan abl23; Differenz = Coach 2.2 − Variante):');
  tab(rd('strategy-tune23.json'), /^tu/, 'Abstimmung (Plan tune23, nur Trainingsgruppen):');
  tab(rd('strategy-sel23.json'), /^sel(Va|V)-/, 'Modellwahl (Plan sel23, Validierungsgruppen):');
  return t || '_Keine Entwicklungsläufe._\n';
}
function calibSection() {
  const D = path.join(RES, 'calib-2.3'); if (!fs.existsSync(D)) return '_Keine Kalibrierungsdaten._\n';
  const sums = {}; fs.readdirSync(D).filter(f => f.endsWith('.sum.json')).forEach(f => { sums[f.replace('.sum.json', '')] = JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); });
  const ver = k => /_210$/.test(k) ? '2.1.0' : /_220$/.test(k) ? '2.2.0' : '2.3';
  let t = '| Datensatz | Version | Spots | Schätzung | tatsächlich | Bias [95 %] | Brier | ECE |\n|---|---|---:|---:|---:|---|---:|---:|\n';
  Object.keys(sums).sort().forEach(k => { const s = sums[k].total; t += '| ' + k.replace(/_(210|220|23)$/, '') + ' | ' + ver(k) + ' | ' + n0(s.n) + ' | ' + f3(s.est) + ' | ' + f3(s.true) + ' | ' + f3(s.bias) + ' [' + f3(s.biasCI[0]) + '; ' + f3(s.biasCI[1]) + '] | ' + f3(s.brier) + ' | ' + f3(s.ece) + ' |\n'; });
  t += '\nBias je Straße (Kriterium ±0,03 auf V und T, unverändert):\n\n| Datensatz | Version | Flop | Turn | River |\n|---|---|---|---|---|\n';
  Object.keys(sums).sort().forEach(k => { const g = sums[k].groups['Straße'] || {}; t += '| ' + k.replace(/_(210|220|23)$/, '') + ' | ' + ver(k) + ' | ' + ['Flop', 'Turn', 'River'].map(st => g[st] ? f3(g[st].bias) + ' [' + f3(g[st].biasCI[0]) + '; ' + f3(g[st].biasCI[1]) + '] (' + g[st].n + ')' : '–').join(' | ') + ' |\n'; });
  t += '\nRiver nach Gegneraktion (Rechenfehler = Schätzung − exakte Referenz gegen die angenommene Range, Range-Fehler = Referenz − tatsächlich):\n\n| Datensatz | Gruppe | Spots | Schätzung | tatsächlich | Bias [95 %] | Rechenfehler | Range-Fehler |\n|---|---|---:|---:|---:|---|---:|---:|\n';
  Object.keys(sums).sort().forEach(k => { const g = sums[k].groups['Straße × Gegneraktion'] || {}; Object.keys(g).filter(r => /^River/.test(r) && g[r].n >= 15).forEach(r => { const x = g[r];
    t += '| ' + k + ' | ' + r + ' | ' + n0(x.n) + ' | ' + f3(x.est) + ' | ' + f3(x.true) + ' | ' + f3(x.bias) + ' [' + f3(x.biasCI[0]) + '; ' + f3(x.biasCI[1]) + '] | ' + f3(x.mathErr) + ' | ' + f3(x.rangeErr) + ' |\n'; }); });
  return t;
}
function sizingSection() {
  let t = '';
  ['V', 'T'].forEach(g => { const rd2 = (dir, l) => { const f = path.join(RES, dir, 'sizing_' + l + '.txt'), o = {}; if (!fs.existsSync(f)) return null; const lines = fs.readFileSync(f, 'utf8').split('\n'); const i0 = lines.indexOf('## Reaktion je Größe'); if (i0 < 0) return null;
      for (let i = i0 + 1; i < lines.length && lines[i].startsWith('{'); i++) { const x = JSON.parse(lines[i]); o[x.key] = x; } return o; };
    const a = rd2('calib-2.3', 'fin23' + g), b = rd2('calib-2.2', 'fin22' + g); if (!a) return;
    t += '\nGruppe ' + g + ': beobachtete Fold-Rate (gegenfaktische Ausspielung) gegen Vorhersage\n\n| Größe (Pot) | n | beobachtet | Modell 2.3 | Modell 2.2 (eigene Messung 2.2) |\n|---|---:|---:|---:|---:|\n';
    let e = 0, e2 = 0, k = 0, k2 = 0; Object.keys(a).forEach(sz => { const x = a[sz], y = b && b[sz]; t += '| ' + sz.replace('.', ',') + ' | ' + x.n + ' | ' + f3(x.obsFold) + ' | ' + f3(x.predFold) + ' | ' + (y ? f3(y.predFold) + ' (beob. ' + f3(y.obsFold) + ')' : '–') + ' |\n'; e += Math.abs(x.predFold - x.obsFold); k++; if (y) { e2 += Math.abs(y.predFold - y.obsFold); k2++; } });
    t += '| mittlerer absoluter Fehler | | | ' + f3(e / k) + ' | ' + (k2 ? f3(e2 / k2) : '–') + ' |\n'; });
  const A = path.join(RES, 'calib-2.3'); if (fs.existsSync(A)) { const fl = fs.readdirSync(A).filter(f => /^aggr_.*\.json$/.test(f)); if (fl.length) { t += '\nFold-Vorhersage für die tatsächlich empfohlenen Bets und Raises (`tests/strategy/aggr-calib.js`; Bias = vorhergesagt − beobachtet):\n\n| Datensatz | Art | n | vorhergesagt | beobachtet | Bias [95 %] |\n|---|---|---:|---:|---:|---|\n';
    fl.sort().forEach(f => { const o = JSON.parse(fs.readFileSync(path.join(A, f), 'utf8')); Object.entries(o.bySize).forEach(([k, x]) => { t += '| ' + f.replace(/^aggr_|\.json$/g, '') + ' | ' + k + ' | ' + x.n + ' | ' + f3(x.pred) + ' | ' + f3(x.obs) + ' | ' + f3(x.bias) + ' [' + f3(x.ci[0]) + '; ' + f3(x.ci[1]) + '] |\n'; }); }); } }
  return t || '_Keine Größenstudie._\n';
}
function pushfoldSection() {
  const P = rd('pushfold-solution.json'); if (!P) return '_Keine Lösung._\n';
  let t = '| Stack (BB) | Exploitability (BB/Hand) | Jam UTG | HJ | CO | BTN | SB |\n|---:|---:|---:|---:|---:|---:|---:|\n';
  Object.keys(P).sort((a, b) => a - b).forEach(S => { const w = P[S].widths; t += '| ' + S + ' | ' + P[S].exploitability.toFixed(5).replace('.', ',') + ' | ' + ['UTG', 'HJ', 'CO', 'BTN', 'SB'].map(p => f1(100 * w[p]) + ' %').join(' | ') + ' |\n'; });
  return t;
}
function testsSection() {
  const U = rd('unit.json'), P = rd('pai-integration.json'), perf = rd('perf-23.json'), E = rd('e2e.json'), G = rd('e2e-gedaechtnis.json'), L = rd('long.json'); let t = '';
  if (U) t += '- Node-Tests (`node tests/run.js`): ' + U.passed + ' bestanden, ' + U.failed + ' fehlgeschlagen (App ' + U.app + ').\n';
  if (E) t += '- Browsertests (`node tests/e2e.js`, ' + E.date.slice(0, 10) + '): ' + E.passed + ' bestanden, ' + E.failed + ' fehlgeschlagen; LCP ' + n0(E.perf.lcp) + ' ms, CLS ' + f3(E.perf.cls) + ', Tipp Mittel ' + n0(E.perf.tipAvgMs) + ' ms, Maximum ' + n0(E.perf.tipMaxMs) + ' ms.\n';
  if (G) t += '- Gedächtnis-Browsertests (`node tests/e2e-gedaechtnis.js`): ' + G.passed + ' bestanden, ' + G.failed + ' fehlgeschlagen.\n';
  if (L) { if (L.sim) t += '- Regel-Langlauf (`node tests/long.js`, App ' + L.app + '): ' + n0(L.sim.hands) + ' Hände, ' + L.sim.errorCount + ' Fehler, ' + n0(L.sim.sidePots) + ' Side Pots, ' + n0(L.sim.splitPots) + ' Split Pots.\n';
    if (L.eval7) t += '- Sieben-Karten-Häufigkeiten: ' + (L.eval7.ok ? 'gleich den Literaturwerten' : 'ABWEICHUNG') + ' (' + n0(L.eval7.total) + ' Hände).\n';
    if (L.calib) t += '- Stil-Kalibrierung der Gegner-KI (200.000 Hände): ' + (L.calib.ok ? 'alle Stile im Zielbereich' : 'nicht alle Stile im Zielbereich') + '.\n';
    if (L.mccov) t += '- Monte-Carlo-Abdeckung: ' + (L.mccov.ok ? 'im vorab festgelegten Toleranzband' : 'außerhalb des Toleranzbands') + ' (' + (L.mccov.configs || []).length + ' Stufen, je ' + L.mccov.runsPerConfig + ' Läufe).\n'; }
  if (P) t += '- PAI-Integration (`tests/pai-integration.mjs`, PAI ' + P.pai + '): ' + P.results.filter(r => r.ok).length + ' von ' + P.results.length + ' bestanden' + (P.results.some(r => !r.ok) ? '; offen: ' + P.results.filter(r => !r.ok).map(r => r.name).join('; ') : '') + '.\n';
  if (perf) Object.keys(perf.versions).forEach(v => { const x = perf.versions[v]; t += '- Rechenzeit Tipp (`tests/perf-23.js`, ' + perf.hands + ' Hände, Node) ' + v + ': ' + x.decisions + ' Entscheidungen, Median ' + f1(x.medianMs) + ' ms, 95. Perzentil ' + f1(x.p95Ms) + ' ms, Maximum ' + f1(x.maxMs) + ' ms, über 1 s: ' + x.over1000 + '.\n'; });
  return t || '_Keine Testergebnisse._\n';
}
function build() {
  const S = rd('strategy-v23.json');
  return '# Ergebnisse 2.3 (automatisch erzeugt)\n\nErzeugt von `node tools/report-23.js` am ' + new Date().toISOString().slice(0, 10) + ' aus den Rohdaten. Kriterien: `docs/ABNAHMEKRITERIEN_2.3.md` (vor den Läufen festgelegt).\n\n' +
    '## Abschließende Vergleiche (Arbeitspaket 10)\n\n' + strategySection(S) + '\n## Ursachenanalyse, Abstimmung und Modellwahl (Arbeitspakete 1–3)\n' + devSection() +
    '\n## Equity- und Range-Kalibrierung (Arbeitspaket 5)\n\n' + calibSection() + '\n## Reaktionsmodell und Einsatzgrößen (Arbeitspaket 6)\n' + sizingSection() +
    '\n## Push/Fold-Modellspiel (Arbeitspaket 7)\n\n' + pushfoldSection() + '\n## Tests\n\n' + testsSection();
}
module.exports = { verdictText, build };
if (require.main === module) { const md = build(); fs.writeFileSync(path.join(ROOT, 'docs', 'ERGEBNISSE_2.3.md'), md); console.log('docs/ERGEBNISSE_2.3.md: ' + md.length + ' Zeichen'); }
