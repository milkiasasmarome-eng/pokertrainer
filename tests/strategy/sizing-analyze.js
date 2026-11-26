/* Auswertung der Größenstudie (tests/strategy/sizing-study.js).
   Aufruf: node tests/strategy/sizing-analyze.js <label> [comp] [--save]
   --save schreibt die Auswertung in tests/results/strategy.json (Abschnitt sizing.<label>-<comp>). */
'use strict';
const fs = require('fs'), path = require('path');
const label = process.argv[2] || 'base', comp = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : 'bots';
const dir = path.join(__dirname, '..', 'results', 'sizing-study');
const files = fs.readdirSync(dir).filter(f => f.startsWith(label + '-' + comp + '-') && f.endsWith('.json'));
const spots = [], meta = [];
files.forEach(f => { const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); d.spots.forEach(s => spots.push(s)); meta.push({ file: f, seed: d.seed, hands: d.hands, spots: d.spots.length }); });
const SIZES = ['0.33', '0.5', '0.75', '1', '1.5'];
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const se = a => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1) / a.length); };
const r3 = x => x == null ? null : +x.toFixed(3);
const nrK = n => n >= 3 ? '3+' : String(n);
// A. Reaktionen: beobachtet gegen vorhergesagt
function calib(filter, keyFn) {
  const T = {};
  spots.filter(s => !s.facing && filter(s)).forEach(s => s.acts.forEach(a => {
    if (a.lab === 'check' || !a.pf) return;
    a.resp.forEach((r, i) => {
      if (r !== 'f' && r !== 'c' && r !== 'r') return;
      const k = keyFn(s, a, i); const t = T[k] || (T[k] = { n: 0, f: 0, r: 0, pf: 0, pfG: 0, pr: 0 });
      t.n++; if (r === 'f') t.f++; if (r === 'r') t.r++; t.pf += a.pf[i] || 0; t.pfG += a.pfG ? a.pfG[i] || 0 : 0; t.pr += a.pr ? a.pr[i] || 0 : 0;
    });
  }));
  return Object.keys(T).sort().map(k => { const t = T[k]; return { key: k, n: t.n, obsFold: r3(t.f / t.n), obsRaise: r3(t.r / t.n), predFold: r3(t.pf / t.n), predFoldGto: r3(t.pfG / t.n), predRaise: r3(t.pr / t.n), seFold: r3(Math.sqrt((t.f / t.n) * (1 - t.f / t.n) / t.n)) }; });
}
const calStreetSize = calib(() => true, (s, a) => 'St' + s.st + ' n' + nrK(s.nR) + ' ' + a.lab);
const calSize = calib(() => true, (s, a) => a.lab);
const calHU = calib(s => s.nR === 1, (s, a) => (s.cbet ? 'C-Bet ' : 'Bet ') + 'St' + s.st + ' ' + a.lab);
const calHud = calib(s => s.nR === 1, (s, a, i) => s.hud[i] + ' ' + a.lab);
// B. Wert je Größe relativ zum Check (gepaart je Spot)
const eqK = e => e < 0.35 ? 'Equity < 35 %' : e < 0.6 ? 'Equity 35–60 %' : 'Equity ≥ 60 %';
function valueBy(keyFn) {
  const T = {};
  spots.filter(s => !s.facing).forEach(s => {
    const ck = s.acts.filter(a => a.lab === 'check')[0]; if (!ck) return;
    s.acts.forEach(a => { if (a.lab === 'check') return; const k = keyFn(s) + ' | ' + a.lab, t = T[k] || (T[k] = { d: [], m: [] }); t.d.push(a.real - ck.real); if (a.ev != null && ck.ev != null) t.m.push(a.ev - ck.ev); });
  });
  return Object.keys(T).sort().map(k => ({ key: k, n: T[k].d.length, realVsCheck: r3(mean(T[k].d)), se: r3(se(T[k].d)), modelVsCheck: r3(mean(T[k].m)) }));
}
const valStreetEq = valueBy(s => 'St' + s.st + ' ' + eqK(s.eq) + ' n' + nrK(s.nR));
const valEq = valueBy(s => eqK(s.eq));
const valAll = valueBy(() => 'alle');
// C. Strategien im Vergleich (gepaart über dieselben Spots): Modell-Argmax, fester Einsatz, immer Check
function policies(filter) {
  const P = { 'Modell (beste EV)': [], 'Modell, Größe frei nach Ausspielung (Orakel)': [], 'immer Check': [] };
  SIZES.forEach(x => { P['Modell entscheidet Bet/Check, Größe fest ' + x] = []; P['immer Bet ' + x] = []; });
  const base = [];
  spots.filter(s => !s.facing && filter(s)).forEach(s => {
    const ck = s.acts.filter(a => a.lab === 'check')[0]; if (!ck || s.acts.length < 2) return;
    const best = s.acts.filter(a => a.ev != null).sort((p, q) => q.ev - p.ev)[0]; if (!best) return;
    base.push(ck.real);
    P['Modell (beste EV)'].push(best.real - ck.real);
    P['immer Check'].push(0);
    P['Modell, Größe frei nach Ausspielung (Orakel)'].push(best.lab === 'check' ? 0 : Math.max(...s.acts.filter(a => a.lab !== 'check').map(a => a.real)) - ck.real);
    SIZES.forEach(x => { const a = s.acts.filter(q => q.lab === x)[0] || s.acts[s.acts.length - 1]; P['immer Bet ' + x].push(a.real - ck.real); P['Modell entscheidet Bet/Check, Größe fest ' + x].push(best.lab === 'check' ? 0 : a.real - ck.real); });
  });
  return { spots: base.length, rows: Object.keys(P).map(k => ({ policy: k, vsCheck: r3(mean(P[k])), se: r3(se(P[k])) })) };
}
const polAll = policies(() => true), polHU = policies(s => s.nR === 1), polMW = policies(s => s.nR >= 2);
// D. Equity, wenn gecallt wird (heads-up): Modell gegen tatsächliche Hand des Callers
function eqCall() {
  const T = {};
  spots.filter(s => !s.facing && s.nR === 1).forEach(s => s.acts.forEach(a => {
    if (a.eqReal == null || a.eqCall == null) return;
    const k = 'St' + s.st + ' ' + a.lab, t = T[k] || (T[k] = { p: [], o: [] }); t.p.push(a.eqCall); t.o.push(a.eqReal);
  }));
  return Object.keys(T).sort().map(k => ({ key: k, n: T[k].p.length, predEqWhenCalled: r3(mean(T[k].p)), obsEqWhenCalled: r3(mean(T[k].o)), se: r3(se(T[k].o)) }));
}
const eqc = eqCall();
// E. Gegen eine Bet: Fold/Call/Raise
function facing() {
  const T = {};
  spots.filter(s => s.facing).forEach(s => {
    const fo = s.acts.filter(a => a.lab === 'fold')[0]; if (!fo) return;
    s.acts.forEach(a => { const k = 'St' + s.st + ' ' + a.lab, t = T[k] || (T[k] = { d: [], m: [] }); t.d.push(a.real - fo.real); if (a.ev != null && fo.ev != null) t.m.push(a.ev - fo.ev); });
  });
  return Object.keys(T).sort().map(k => ({ key: k, n: T[k].d.length, realVsFold: r3(mean(T[k].d)), se: r3(se(T[k].d)), modelVsFold: r3(mean(T[k].m)) }));
}
const fac = facing();
// F. Welche Größe empfiehlt das Modell (unter den untersuchten Aktionen), welche gewinnt in der Ausspielung im Mittel
const chosen = {}; spots.filter(s => !s.facing).forEach(s => { const b = s.acts.filter(a => a.ev != null).sort((p, q) => q.ev - p.ev)[0]; if (b) chosen[b.lab] = (chosen[b.lab] || 0) + 1; });
const out = { label, comp, files: meta, spots: spots.length, betSpots: spots.filter(s => !s.facing).length, facingSpots: spots.filter(s => s.facing).length,
  calibration: { bySize: calSize, byStreetSizeN: calStreetSize, headsUp: calHU, byHudType: calHud }, value: { all: valAll, byEq: valEq, byStreetEqN: valStreetEq },
  policies: { all: polAll, headsUp: polHU, multiway: polMW }, eqWhenCalled: eqc, facing: fac, modelChoice: chosen };
const show = (t, rows) => { console.log('\n## ' + t); rows.forEach(r => console.log(JSON.stringify(r))); };
console.log('Spots: ' + out.spots + ' (Bet ' + out.betSpots + ', gegen Bet ' + out.facingSpots + ')');
show('Reaktion je Größe', calSize); show('Reaktion heads-up', calHU); show('Reaktion nach Straße/Gegnerzahl', calStreetSize); show('HUD-Typ', calHud);
show('Wert gegen Check (alle)', valAll); show('Wert gegen Check nach Equity', valEq); show('Strategien alle (' + polAll.spots + ')', polAll.rows); show('Strategien HU (' + polHU.spots + ')', polHU.rows); show('Strategien Multiway (' + polMW.spots + ')', polMW.rows);
show('Equity wenn gecallt', eqc); show('Gegen Bet', fac); console.log('\nModellwahl', JSON.stringify(chosen));
if (process.argv.includes('--save')) {
  const file = path.join(__dirname, '..', 'results', 'strategy.json');
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* neu */ }
  prev.sizing = prev.sizing || {}; out.value.byStreetEqN = valStreetEq; prev.sizing[label + '-' + comp] = out;
  fs.writeFileSync(file, JSON.stringify(prev, null, 1));
}
