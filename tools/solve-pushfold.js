/* Push/Fold-Modellspiel (2.2, Arbeitspakete 3 und 4): vereinfachtes Gleichgewicht für kurze effektive Stacks im 6-max.
   Spiel: Blinds 0,5/1 BB, alle Spieler mit S BB. Wer als Erster freiwillig handelt, geht All-in oder foldet (kein Limp, kein Minraise).
   Nach einem All-in entscheiden die Spieler dahinter der Reihe nach Call oder Fold; nach dem ersten Call folden alle übrigen
   (keine Mehrspieler-All-ins). Equity aus der Preflop-Tabelle der App (169 × 169 Klassen, Monte Carlo mit 12.000 Stichproben je Paar, Standardfehler ≈ 0,45 Pp.);
   Kartenentfernung zwischen den Spielern wird vernachlässigt. Lösung: fiktives Spiel (gemittelte beste Antworten), danach
   Exploitability = Summe der Gewinne bester Antworten aller Plätze gegen das Profil (BB je Hand).
   Ergebnis: Jam-Anteil je Position und Klasse sowie Call-Anteil je (Jammer, Caller) und Klasse, für mehrere Stacktiefen.
   Kein Solver für No-Limit Hold'em: nur dieses Modellspiel. Aufruf: node tools/solve-pushfold.js [--write] [--iter 3000] */
'use strict';
const fs = require('fs'), path = require('path');
const PT = require('../tests/load.js').load(), H = PT.hands;
const POS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'], BLIND = { SB: 0.5, BB: 1 };
const W = new Float64Array(169); for (let k = 0; k < H.NC; k++) W[H.CLS[k]] += 1; const WT = 1326;
const EQ = new Float64Array(169 * 169); for (let i = 0; i < 169; i++) for (let j = 0; j < 169; j++) EQ[i * 169 + j] = PT.ev.eqClass(i, j);
function eqVs(i, r) { let s = 0, t = 0; for (let j = 0; j < 169; j++) { const x = W[j] * r[j]; if (x > 0) { s += x * EQ[i * 169 + j]; t += x; } } return t > 0 ? s / t : 0.5; }
function width(r) { let s = 0; for (let j = 0; j < 169; j++) s += W[j] * r[j]; return s / WT; }

function solve(S, iters) {
  // jam[p][i], call[p][q][i]: Anteile 0..1 (gemittelte Strategien)
  const jam = POS.slice(0, 5).map(() => new Float64Array(169).fill(0.3)), call = POS.slice(0, 5).map(() => POS.map(() => new Float64Array(169).fill(0.2)));
  const brJam = (p) => { const out = new Float64Array(169), ev = new Float64Array(169); const after = POS.map((_, q) => q).filter(q => q > p);
    const cw = after.map(q => width(call[p][q])), dead = q => 1.5 - (BLIND[POS[p]] || 0) - (BLIND[POS[q]] || 0);
    const eqq = after.map(q => call[p][q]);
    for (let i = 0; i < 169; i++) { let pf = 1, e = 0; after.forEach((q, k) => { const pc = pf * cw[k]; if (pc > 0) e += pc * (eqVs(i, eqq[k]) * (2 * S + dead(q)) - S); pf *= 1 - cw[k]; });
      e += pf * (1.5 - (BLIND[POS[p]] || 0)); const fold = -(BLIND[POS[p]] || 0); ev[i] = e - fold; out[i] = e > fold ? 1 : 0; }
    return { out, ev }; };
  const brCall = (p, q) => { const out = new Float64Array(169), ev = new Float64Array(169), dead = 1.5 - (BLIND[POS[p]] || 0) - (BLIND[POS[q]] || 0);
    for (let i = 0; i < 169; i++) { const e = eqVs(i, jam[p]) * (2 * S + dead) - S, fold = -(BLIND[POS[q]] || 0); ev[i] = e - fold; out[i] = e > fold ? 1 : 0; } return { out, ev }; };
  for (let t = 1; t <= iters; t++) {
    const a = 1 / (t + 1);
    for (let p = 0; p < 5; p++) { const b = brJam(p).out; for (let i = 0; i < 169; i++) jam[p][i] += a * (b[i] - jam[p][i]); }
    for (let p = 0; p < 5; p++) for (let q = p + 1; q < 6; q++) { const b = brCall(p, q).out; for (let i = 0; i < 169; i++) call[p][q][i] += a * (b[i] - call[p][q][i]); }
  }
  // Exploitability: Gewinn der besten Antwort gegenüber der Profilstrategie je Entscheidung, gewichtet mit Kombinationen und Erreichwahrscheinlichkeit
  let expl = 0; const detail = [];
  for (let p = 0; p < 5; p++) { let reach = 1; for (let r = 0; r < p; r++) reach *= 1 - width(jam[r]);
    const { ev } = brJam(p); let g = 0; for (let i = 0; i < 169; i++) { const best = Math.max(0, ev[i]), cur = jam[p][i] * ev[i]; g += W[i] / WT * (best - cur); }
    expl += reach * g; detail.push({ pos: POS[p], reach: +reach.toFixed(4), gain: +g.toFixed(5), width: +width(jam[p]).toFixed(4) });
    for (let q = p + 1; q < 6; q++) { let rq = reach * width(jam[p]); for (let r = p + 1; r < q; r++) rq *= 1 - width(call[p][r]);
      const c = brCall(p, q).ev; let g2 = 0; for (let i = 0; i < 169; i++) { const best = Math.max(0, c[i]), cur = call[p][q][i] * c[i]; g2 += W[i] / WT * (best - cur); }
      expl += rq * g2; } }
  return { S, jam, call, exploitability: expl, detail };
}
const STACKS = [3, 4.5, 6, 8, 10, 12, 15, 18, 20, 25];
if (require.main === module) {
  const args = process.argv.slice(2), it = +(args[args.indexOf('--iter') + 1] || 3000);
  if (!(EQ[0] > 0)) throw new Error('Preflop-Equity-Tabelle nicht verfügbar (PT.ev.eqClass)');
  const res = {}, t0 = Date.now();
  STACKS.forEach(S => { const r = solve(S, args.includes('--iter') ? it : 3000);
    res[S] = { exploitability: +r.exploitability.toFixed(5), jam: {}, call: {}, widths: {} };
    r.jam.forEach((j, p) => { res[S].jam[POS[p]] = Array.from(j, x => Math.round(x * 100) / 100); res[S].widths[POS[p]] = +width(j).toFixed(3); });
    r.call.forEach((row, p) => row.forEach((c, q) => { if (q > p) res[S].call[POS[p] + '>' + POS[q]] = Array.from(c, x => Math.round(x * 100) / 100); }));
    console.log(S + ' BB: Exploitability ' + r.exploitability.toFixed(5) + ' BB/Hand, Jam-Breiten ' + POS.slice(0, 5).map(p => p + ' ' + (res[S].widths[p] * 100).toFixed(1) + ' %').join(', ') +
      ', Call BB gegen BTN ' + (width(r.call[3][5]) * 100).toFixed(1) + ' %, gegen SB ' + (width(r.call[4][5]) * 100).toFixed(1) + ' %');
  });
  console.log('Rechenzeit ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  fs.writeFileSync(path.join(__dirname, '..', 'tests', 'results', 'pushfold-solution.json'), JSON.stringify(res));
  if (args.includes('--write')) {
    // Kompakt: je Stack, Position bzw. Paar eine Zeichenkette mit 169 Ziffern 0–9 (Anteil · 9, gerundet)
    const enc = a => a.map(x => Math.min(9, Math.round(x * 9))).join('');
    const slim = { v: 1, stacks: STACKS, jam: {}, call: {}, expl: {} };
    STACKS.forEach(S => { slim.expl[S] = res[S].exploitability; slim.jam[S] = {}; slim.call[S] = {}; Object.keys(res[S].jam).forEach(p => { slim.jam[S][p] = enc(res[S].jam[p]); }); Object.keys(res[S].call).forEach(k => { slim.call[S][k] = enc(res[S].call[k]); }); });
    const f = path.join(__dirname, '..', 'assets', 'js', 'engine', 'ranges.js'), src = fs.readFileSync(f, 'utf8');
    const next = src.replace(/\/\*PF-START\*\/[\s\S]*?\/\*PF-END\*\//, '/*PF-START*/' + JSON.stringify(slim) + '/*PF-END*/');
    if (next === src) throw new Error('Block PF nicht gefunden'); fs.writeFileSync(f, next); console.log('geschrieben: ' + f);
  }
}
module.exports = { solve, eqVs, width, POS, STACKS };
