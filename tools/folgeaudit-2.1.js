/* Folgeaudit 2.2, Abschnitt 2: Aufschlüsselung der 2.1-Hauptvergleiche aus den Rohdaten (tests/results/strategy.json und strategy-runs/).
   Aufruf: node tools/folgeaudit-2.1.js → docs/audit-2.2/folgeaudit-daten.json */
'use strict';
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', 'tests', 'results'), S = JSON.parse(fs.readFileSync(path.join(R, 'strategy.json'), 'utf8'));
const ids = new Set(S.runs.map(r => r.id));
const runs = fs.readdirSync(path.join(R, 'strategy-runs')).filter(f => f.endsWith('.json') && ids.has(f.replace(/\.json$/, ''))).map(f => JSON.parse(fs.readFileSync(path.join(R, 'strategy-runs', f), 'utf8')));
const out = { quelle: 'tests/results/strategy.json (App ' + S.app + ', ' + S.date + ')', laeufe: runs.length, haendeSumme: runs.reduce((s, r) => s + r.hands, 0) };
// 1) Aufschlüsselung nach Gruppe und Held
const by = {}; runs.forEach(r => { const k = r.job.group + ' | ' + r.job.hero; const o = by[k] = by[k] || { laeufe: 0, haende: 0 }; o.laeufe++; o.haende += r.hands; });
out.nachGruppeUndHeld = by;
// unabhängige Kartenfolgen: gleiche Seeds teilen die Karten (gepaarte Läufe)
const seeds = {}; runs.forEach(r => { seeds[r.job.group + '|' + r.job.comp + '|' + r.job.difficulty + '|' + r.job.startBB + '|' + r.job.seed] = r.hands; });
out.unabhaengigeKartenfolgen = { anzahlSeeds: Object.keys(seeds).length, haende: Object.values(seeds).reduce((a, b) => a + b, 0) };
out.coachHaende = runs.filter(r => r.job.hero.indexOf('coach') === 0).reduce((s, r) => s + r.hands, 0);
// 2) Identische Gegnerbedingungen: Umgebungsprüfsumme je Lauf
const env = {}; runs.forEach(r => { env[r.key.env] = (env[r.key.env] || 0) + 1; });
out.umgebungsPruefsummen = env;
// 3) Unabhängigkeit der Blöcke: Autokorrelation (Lag 1) der 100-Hände-Blocksummen innerhalb der Läufe
function demean(list) { return list.map(b => { const m = b.reduce((a, x) => a + x, 0) / b.length; return b.map(x => x - m); }); }
function acf(list) { list = demean(list); let n = 0, sxy = 0, sx = 0, sy = 0, sxx = 0, syy = 0; list.forEach(b => { for (let i = 1; i < b.length; i++) { const x = b[i - 1], y = b[i]; n++; sx += x; sy += y; sxy += x * y; sxx += x * x; syy += y * y; } });
  const cov = sxy / n - (sx / n) * (sy / n), vx = sxx / n - (sx / n) ** 2, vy = syy / n - (sy / n) ** 2; return { lag1: cov / Math.sqrt(vx * vy), paare: n }; }
out.autokorrelationBlock100 = { coach21: acf(runs.filter(r => r.job.hero === 'coach21').map(r => r.blocksAdj)), alle: acf(runs.map(r => r.blocksAdj)) };
// Lag 5 (= Abstand zweier 500er-Blöcke)
function acfLag(list, L) { list = demean(list); const xs = [], ys = []; list.forEach(b => { for (let i = L; i < b.length; i++) { xs.push(b[i - L]); ys.push(b[i]); } }); const m = a => a.reduce((s, x) => s + x, 0) / a.length, mx = m(xs), my = m(ys);
  let c = 0, vx = 0, vy = 0; xs.forEach((x, i) => { c += (x - mx) * (ys[i] - my); vx += (x - mx) ** 2; vy += (ys[i] - my) ** 2; }); return c / Math.sqrt(vx * vy); }
out.autokorrelationBlock100.lag5_alle = acfLag(runs.map(r => r.blocksAdj), 5);
// 4) Vergleiche: Blöcke, geteilte Läufe, Urteil
out.vergleiche = S.comparisons.map(c => ({ id: c.id, diff: c.adj.diff, ci: [c.adj.lo, c.adj.hi], haende: c.adj.hands, paare: c.adj.pairs, bloecke: c.adj.blocks, urteil: c.verdict, geteiltMit: c.sharedWith }));
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'audit-2.2', 'folgeaudit-daten.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ laeufe: out.laeufe, haende: out.haendeSumme, unabh: out.unabhaengigeKartenfolgen, coachHaende: out.coachHaende, env: out.umgebungsPruefsummen, acf: out.autokorrelationBlock100 }, null, 1));
