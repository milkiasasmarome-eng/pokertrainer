/* Baut die Likelihood-Tabelle der Range-Schätzung (Arbeitspaket 1, 2.2) aus den Zählungen von tests/strategy/fit-likelihood.js
   und schreibt sie in den markierten Block in assets/js/engine/ranges.js.
   Glättung: Dirichlet-Prior aus der übergeordneten Zelle (Zelle ohne Draw-Unterscheidung → gleiche Lage ohne Mehrgegner-Unterscheidung
   → Gleichverteilung), Stärke α = 8 Beobachtungen. Aufruf: node tools/build-likelihood.js <Zählungen.json>... [--check] */
'use strict';
const fs = require('fs'), path = require('path');
const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
const OUT_FIRST = ['x', 'bs', 'bl', 'bo'], OUT_FACE = ['f', 'c', 'r'], ALPHA = 8;
const counts = {}; let refRaw = null;
files.forEach(f => { const c = JSON.parse(fs.readFileSync(f, 'utf8')); if (c.__ref) { refRaw = c.__ref; delete c.__ref; }
  Object.entries(c).forEach(([k, v]) => { const t = counts[k] = counts[k] || {}; Object.entries(v).forEach(([o, n]) => { t[o] = (t[o] || 0) + n; }); }); });
const add = (map, k, v) => { const t = map[k] = map[k] || {}; Object.entries(v).forEach(([o, n]) => { t[o] = (t[o] || 0) + n; }); };
const c1 = {}, c2 = {};   // ohne Draw; ohne Draw und ohne Mehrgegner
Object.entries(counts).forEach(([k, v]) => { const [st, kind, mw, dr, xb] = k.split('|'); add(c1, [st, kind, mw, '*', xb].join('|'), v); add(c2, [st, kind, '*', '*', xb].join('|'), v); });
const outs = kind => /^(s[1-6]|rr)$/.test(kind) ? OUT_FACE : OUT_FIRST;
function post(c, prior, os) { const n = os.reduce((s, o) => s + Math.max(0, c[o] || 0), 0), d = {}; os.forEach(o => { d[o] = (Math.max(0, c[o] || 0) + ALPHA * prior[o]) / (n + ALPHA); }); return { d, n }; }
const minus = (a, b) => { const o = {}; Object.keys(a).forEach(k => { o[k] = (a[k] || 0) - ((b && b[k]) || 0); }); return o; };
const uni = os => { const u = {}; os.forEach(o => { u[o] = 1 / os.length; }); return u; };
const table = { v: 2, alpha: ALPHA, source: 'tests/strategy/fit-likelihood.js, Gruppe E', c: {}, n: {} };
const round = d => { const o = {}; Object.keys(d).forEach(k => { o[k] = +d[k].toFixed(4); }); return o; };
// Prüfer A 2.2 (A-9): Prior einer Zelle aus der Elternzelle OHNE die eigenen Zählungen (Leave-one-out), damit α = 8 wirklich 8 Beobachtungen entspricht
const lvl1 = {};
Object.entries(c2).forEach(([k, v]) => { const os = outs(k.split('|')[1]); const r = post(v, uni(os), os); table.c[k] = round(r.d); table.n[k] = r.n; });
Object.entries(c1).forEach(([k, v]) => { const p = k.split('|'), os = outs(p[1]), pk = [p[0], p[1], '*', '*', p[4]].join('|');
  const prior = post(minus(c2[pk], v), uni(os), os).d; const r = post(v, prior, os); lvl1[k] = r; table.c[k] = round(r.d); table.n[k] = r.n; lvl1[k].prior = prior; });
Object.entries(counts).forEach(([k, v]) => { const p = k.split('|'), os = outs(p[1]), pk = [p[0], p[1], p[2], '*', p[4]].join('|');
  const prior = post(minus(c1[pk], v), lvl1[pk].prior, os).d; const r = post(v, prior, os); table.c[k] = round(r.d); table.n[k] = r.n; });
// Bezugswerte der Population (A-3)
if (refRaw) { table.ref = {}; Object.keys(refRaw.stats).forEach(k => { const x = refRaw.stats[k]; if (x[1] > 0) table.ref[k] = +(x[0] / x[1]).toFixed(4); });
  const g = refRaw.agg; table.ref.aggFirst = +(g.bet / Math.max(1, g.bet + g.check)).toFixed(4); table.ref.aggFold = +(g.fold / Math.max(1, g.fold + g.call + g.raise)).toFixed(4); }
// Familien (Straße|Lage|Mehrgegner): Grundhäufigkeiten der Population, Verteilung der Stärkeklassen und Ergebnis je Klasse
table.fam = {};
Object.entries(lvl1).forEach(([k, r]) => { const p = k.split('|'), fam = [p[0], p[1], p[2]].join('|'), xb = +p[4];
  const raw = counts; const F = table.fam[fam] = table.fam[fam] || { hist: new Array(10).fill(0), p: new Array(10).fill(null), base: {} };
  F.hist[xb] += r.n; F.p[xb] = round(r.d); });
Object.entries(table.fam).forEach(([fam, F]) => { const os = outs(fam.split('|')[1]), tot = F.hist.reduce((a, b) => a + b, 0);
  os.forEach(o => { F.base[o] = +(F.hist.reduce((s, h, i) => s + h * (F.p[i] ? F.p[i][o] : 0), 0) / Math.max(1, tot)).toFixed(4); });
  F.hist = F.hist.map(h => +(h / Math.max(1, tot)).toFixed(4)); F.p = F.p.map(x => x || null); });
// Gepoolte Grundraten (alle Straßen und Lagen): Bet-Anteil ohne offenen Einsatz, Fold-Anteil gegen einen Einsatz
{ let b = 0, n1 = 0, f = 0, n2 = 0; Object.entries(counts).forEach(([k, v]) => { const kind = k.split('|')[1], n = Object.values(v).reduce((a, c) => a + c, 0);
    if (/^(s[1-6]|rr)$/.test(kind)) { f += v.f || 0; n2 += n; } else { b += (v.bs || 0) + (v.bl || 0) + (v.bo || 0); n1 += n; } });
  table.pool = { first: +(b / n1).toFixed(4), fold: +(f / n2).toFixed(4) }; }
const total = Object.values(counts).reduce((s, v) => s + Object.values(v).reduce((a, b) => a + b, 0), 0);
table.total = total;
console.log('Zellen ' + Object.keys(table.c).length + ', Beobachtungen ' + total);
if (process.argv.includes('--check')) { console.log(JSON.stringify(table).length + ' Zeichen'); process.exit(0); }
const f = path.join(__dirname, '..', 'assets', 'js', 'engine', 'ranges.js'), src = fs.readFileSync(f, 'utf8');
const slim = { v: 2, alpha: ALPHA, total, c: table.c, fam: table.fam, pool: table.pool, ref: table.ref || null };
const next = src.replace(/\/\*LIK-START\*\/[\s\S]*?\/\*LIK-END\*\//, '/*LIK-START*/' + JSON.stringify(slim) + '/*LIK-END*/');
if (next === src && src.indexOf('/*LIK-START*/') < 0) throw new Error('Block nicht gefunden');
fs.writeFileSync(f, next);
fs.writeFileSync(path.join(__dirname, '..', 'tests', 'results', 'likelihood-table.json'), JSON.stringify(table));
console.log('geschrieben: ' + f);
