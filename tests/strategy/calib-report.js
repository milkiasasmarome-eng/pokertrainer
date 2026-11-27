/* Auswertung der Equity-Kalibrierung (Arbeitspaket 1): Mittelwerte von Schätzung (est), mathematischer Referenz gegen die
   angenommene Range (ref) und tatsächlicher Equity (true) je Gruppe, mit 95-%-Intervall (Bootstrap über Entscheidungen). 
   Aufruf: node tests/strategy/calib-report.js <Datei.json>... [--json Ausgabe] */
'use strict';
const fs = require('fs');
const { sizeBucket } = require('./equity-calib.js');
const args = process.argv.slice(2), jsonOut = args.indexOf('--json') >= 0 ? args.splice(args.indexOf('--json'), 2)[1] : null;
const recs = []; args.forEach(f => { const r = JSON.parse(fs.readFileSync(f, 'utf8')); r.recs.forEach(x => { x.src = r.group + '|' + r.seed; if (x.est == null) { x.est = x.ref; delete x.ref; } recs.push(x); }); });
const ST = { 1: 'Flop', 2: 'Turn', 3: 'River' };
function ciCluster(list, fn) {
  if (!list.length || list[0].h == null) return null;
  const C = new Map(); let S = 0, N = 0;
  list.forEach(r => { const k = r.src + '|' + r.h, v = fn(r), c = C.get(k) || [0, 0]; c[0] += v; c[1] += 1; C.set(k, c); S += v; N++; });
  const m = S / N, k = C.size; if (k < 2) return [NaN, NaN]; let q = 0; C.forEach(([s, n]) => { q += (s - m * n) * (s - m * n); });
  const se = Math.sqrt(k / (k - 1) * q) / N; return [m - 1.96 * se, m + 1.96 * se];
}
function ci(xs) { if (xs.length < 2) return [NaN, NaN]; const m = xs.reduce((a, b) => a + b, 0) / xs.length; const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1)); const se = sd / Math.sqrt(xs.length); return [m - 1.96 * se, m + 1.96 * se]; }
function summary(list) {
  const n = list.length, est = list.map(r => r.est), tr = list.map(r => r.tr), d = list.map(r => r.est - r.tr);
  const withRef = list.filter(r => r.ref != null), mathE = withRef.map(r => r.est - r.ref), rangeE = withRef.map(r => r.ref - r.tr);
  const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
  return { n, est: mean(est), true: mean(tr), bias: mean(d), biasCI: ciCluster(list, r => r.est - r.tr) || ci(d), nRef: withRef.length, mathErr: mean(mathE), mathAbs: mean(mathE.map(Math.abs)), rangeErr: mean(rangeE), rangeCI: ciCluster(withRef, r => r.ref - r.tr) || ci(rangeE),
    brier: mean(list.map(r => (r.est - r.tr) ** 2)) };
}
const groups = {
  'Straße': r => ST[r.st],
  'Straße × Gegneraktion': r => ST[r.st] + ' · ' + (r.fk === 'keine' ? 'kein Einsatz offen' : (r.lead ? 'Lead ' : r.fk === 'raise' ? 'Raise ' : 'Bet ') + sizeBucket(r.f)),
  'Straße × Gegnerzahl': r => ST[r.st] + ' · ' + (r.n > 1 ? 'Mehrgegner' : 'Heads-up'),
  'Einsatz offen × Stil des Setzenden': r => r.fk === 'keine' || !r.style ? null : ST[r.st] + ' · ' + r.style,
  'Schätzung (Klassen)': r => 'est ' + (Math.min(9, Math.floor(r.est * 10)) / 10).toFixed(1) + '–' + (Math.min(9, Math.floor(r.est * 10)) / 10 + 0.1).toFixed(1),
  'Position': r => r.ip ? 'in Position' : 'out of Position'
};
const out = { files: args, total: summary(recs), groups: {} };
const f3 = x => isFinite(x) ? x.toFixed(3) : '–';
console.log('Gesamt: n=' + out.total.n + ' est ' + f3(out.total.est) + ' true ' + f3(out.total.true) + ' Bias ' + f3(out.total.bias) + ' [' + out.total.biasCI.map(f3).join('; ') + '] Brier ' + f3(out.total.brier));
Object.entries(groups).forEach(([name, fn]) => {
  const parts = {}; recs.forEach(r => { const k = fn(r); if (k) (parts[k] = parts[k] || []).push(r); });
  out.groups[name] = {};
  console.log('\n' + name + '\n  Gruppe | n | est | true | est−true [95 %] | Rechenfehler est−ref (|·|) | Range-Fehler ref−true [95 %]');
  Object.keys(parts).sort().forEach(k => { const s = summary(parts[k]); out.groups[name][k] = s; if (s.n < 15) return;
    console.log('  ' + k + ' | ' + s.n + ' | ' + f3(s.est) + ' | ' + f3(s.true) + ' | ' + f3(s.bias) + ' [' + s.biasCI.map(f3).join('; ') + '] | ' + f3(s.mathErr) + ' (' + f3(s.mathAbs) + ') | ' + f3(s.rangeErr) + ' [' + s.rangeCI.map(f3).join('; ') + ']'); });
});
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out, null, 1));
