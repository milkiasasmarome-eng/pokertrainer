/* 2.3.1/2.4: Bericht aus Rohdaten für die Prüfung des gleichgewichtsnahen Modus (docs/ABNAHMEKRITERIEN_2.4.md).
   Liest die Einzelläufe aus tests/results/strategy-runs/ direkt (P4 aus Plan v23 mit 2.3.0, P4' und G3 aus Plan val24 mit 2.3.1),
   paart nach Seed und rechnet mit denselben Verfahren wie tests/strategy/compare.js (Block-Bootstrap 500 Hände, all-in-bereinigt,
   Nichtunterlegenheit = konservativeres von geschichtetem und zweistufigem Verfahren).
   Aufruf: node tools/report-24.js  → tests/results/report-24.json und Tabelle auf der Konsole */
'use strict';
const fs = require('fs'), path = require('path');
const { blockBootstrap, pairRuns } = require('../tests/strategy/bootstrap.js');
const RUNS = path.join(__dirname, '..', 'tests', 'results', 'strategy-runs'), L = 500;
const load = (group, hero, seeds, comp) => seeds.map(sd => { const f = path.join(RUNS, [group, hero, comp || 'bots', 'gemischt', '100BB', 's' + sd, 2500].join('_') + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; });
const range = (a, n) => Array.from({ length: n }, (_, i) => a + i);
const metric = r => ({ blocks: r.blocksAdj, hands: r.hands, partialLast: r.partialLast });
function pairs(spec) { const out = []; spec.forEach(([g, a, b, seeds, comp]) => { const A = load(g, a, seeds, comp), B = load(g, b, seeds, comp); A.forEach((ra, i) => { if (ra && B[i]) out.push([ra, B[i]]); }); }); return out; }
function evaluate(id, title, ps, delta) {
  if (!ps.length) return { id, title, missing: true };
  const pr = ps.map(([a, b]) => pairRuns(metric(a), metric(b))), bs = blockBootstrap(pr, L, 2000, 7);
  const res = { id, title, seeds: ps.length, hands: bs.hands, blocks: bs.nBlocks, diff: +bs.bb100.toFixed(2), lo: +bs.lo.toFixed(2), hi: +bs.hi.toFixed(2),
    verdict: bs.nBlocks < 20 ? 'zu wenig Blöcke' : bs.lo > 0 ? 'belegt besser' : bs.hi < 0 ? 'belegt schlechter' : 'nicht belegt', aAhead: ps.filter(([a, b]) => a.sumBBAdj > b.sumBBAdj).length,
    raiseShare: share(ps.map(p => p[0]), /Raise/), raiseShareRef: share(ps.map(p => p[1]), /Raise/), invalid: ps.reduce((s, [a]) => s + a.invalid, 0), decisions: ps.reduce((s, [a]) => s + a.decisions, 0) };
  if (delta != null) { const s1 = blockBootstrap(pr, L, 10000, 11, [-delta]), s2 = blockBootstrap(pr, L, 10000, 13, [-delta], true), lo = Math.min(s1.lo, s2.lo), p = Math.max(s1.pLE[-delta], s2.pLE[-delta]);
    res.ni = { delta, lo: +lo.toFixed(2), loStrat: +s1.lo.toFixed(2), loHier: +s2.lo.toFixed(2), p: +p.toFixed(4), verdict: bs.nBlocks < 20 ? 'zu wenig Blöcke' : lo > -delta && p <= 0.025 ? 'nicht unterlegen' : 'Nichtunterlegenheit nicht belegt' }; }
  return res;
}
function share(list, re) { let r = 0, t = 0; list.forEach(x => { Object.keys(x.labels || {}).forEach(k => { t += x.labels[k]; if (re.test(k)) r += x.labels[k]; }); }); return t ? +(r / t * 100).toFixed(1) : null; }
const P4 = ['pG', 'coach23-gto', 'coach201-gto', range(23801, 24)], P4s = ['vG', 'coach23-gto', 'coach201-gto', range(24401, 24)];
const out = { date: new Date().toISOString(), method: 'all-in-bereinigt, gepaart nach Seed, Block-Bootstrap 500 Hände; Nichtunterlegenheit: konservativeres Verfahren (geschichtet/zweistufig), einseitig 2,5 %', results: [] };
/* Gleichheitsprüfung: 2.3.1 auf dem P4-Seed 23801 gegen den gespeicherten 2.3.0-Lauf */
const [v0] = load('pG', 'coach23-gto', [23801]), [v1] = load('vId', 'coach23-gto', [23801]);
out.identity = v0 && v1 ? { ok: v0.sumBB === v1.sumBB && v0.decisions === v1.decisions && JSON.stringify(v0.labels) === JSON.stringify(v1.labels), sumBB: [v0.sumBB, v1.sumBB], decisions: [v0.decisions, v1.decisions] } : { ok: false, missing: true };
out.results.push(evaluate('P4', 'P4 (Plan v23, 2.3.0): gleichgewichtsnah gegen 2.0.1', pairs([P4]), 8));
out.results.push(evaluate("P4'", "P4' (Plan val24, 2.3.1, neue Seeds): gleichgewichtsnah gegen 2.0.1", pairs([P4s]), 8));
out.results.push(evaluate('P4-gesamt', 'P4-gesamt (P4 ∪ P4′, Urteil): gleichgewichtsnah gegen 2.0.1', pairs([P4, P4s]), 8));
out.results.push(evaluate('G3', 'G3: gleichgewichtsnah gegen 2.0.1, synth23 Ka23 (beschreibend)', pairs([['vKa', 'coach23-gto', 'coach201-gto', range(24451, 6), 'p23-Ka']]), null));
fs.writeFileSync(path.join(__dirname, '..', 'tests', 'results', 'report-24.json'), JSON.stringify(out, null, 1));
const f = x => String(x).replace('.', ',');
console.log('Gleichheit 2.3.0/2.3.1 auf Seed 23801: ' + (out.identity.ok ? 'identisch' : 'NICHT identisch') + ' ' + JSON.stringify(out.identity));
console.log('| Kennung | Vergleich | Seeds | Hände | Differenz | 95-%-Intervall | Urteil | Nichtunterlegenheit (δ 8) | Raise-Anteil 2.3.1 / 2.0.1 |');
console.log('|---|---|---:|---:|---:|---|---|---|---|');
out.results.forEach(r => console.log(r.missing ? '| ' + r.id + ' | fehlt |' : '| ' + r.id + ' | ' + r.title + ' | ' + r.seeds + ' | ' + r.hands + ' | ' + f(r.diff) + ' | [' + f(r.lo) + '; ' + f(r.hi) + '] | ' + r.verdict + ' | ' +
  (r.ni ? r.ni.verdict + ' (untere Grenze ' + f(r.ni.lo) + ', p = ' + f(r.ni.p) + ')' : '–') + ' | ' + f(r.raiseShare) + ' % / ' + f(r.raiseShareRef) + ' % |'));
