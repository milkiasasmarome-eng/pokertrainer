/* Kalibrierung des Populationsmodells der Reaktionen (exploitativer Modus, Flop bis River) an aggregiertem, am Tisch sichtbarem Verhalten.
   Daten: Größenstudie (tests/strategy/sizing-study.js) – je Spot, Einsatzgröße und reagierendem Gegner die beobachtete erste Reaktion
   (Fold/Call/Raise), die vom Coach geschätzte Range des Gegners (als Verteilung der absoluten Handstärke) und seine HUD-Werte.
   Verdeckte Karten und interne Spielstile werden nicht verwendet. Modell (je Kombination k mit absoluter Stärke x, Preis π):
     θ = c0[Straße] + c1[Straße]·π + c2·(Gegner − 1) + c3·[Raise] + λ·(logit f̂ − logit f₀)   (f̂: geglätteter Fold-Wert des Gegners)
     P(weiter | k) = σ((x − θ)/τ), Draws: max(…, σ((Draw-Equity − π − c4)/τd))
     P(Raise | k) = r0·σ((x − r1)/0,02) + rd·[Draw]
   Schätzung: Maximum Likelihood (Nelder-Mead) auf den Trainings-Seeds, Prüfung auf getrennten Seeds (Log-Loss, Kalibrierung je Größe).
   Aufruf: node tests/strategy/fit-response.js <label> <trainSeeds> <testSeeds> [comp]   z. B.: base 501 502 bots */
'use strict';
const fs = require('fs'), path = require('path');
const label = process.argv[2] || 'base', train = (process.argv[3] || '501').split(','), test = (process.argv[4] || '502').split(','), comp = process.argv[5] || 'bots';
const dir = path.join(__dirname, '..', 'results', 'sizing-study');
const PRIOR = { foldToCbet: 0.44, foldToCbetTurn: 0.45, wtsd: 0.28, vpip: 0.27, pfr: 0.19 }, K = { foldToCbet: 15, foldToCbetTurn: 10, wtsd: 20, vpip: 25, pfr: 25 };
const logit = p => Math.log(p / (1 - p)), sig = z => 1 / (1 + Math.exp(-z));
function load(seeds, c) {
  const obs = [];
  seeds.forEach(sd => {
    const sp = String(sd).split(':'), lab = sp.length > 1 ? sp[0] : label, sdd = sp.length > 1 ? sp[1] : sd, cc = sp.length > 2 ? sp[2] : (c || comp);
    const f = path.join(dir, lab + '-' + cc + '-' + sdd + '.json'); if (!fs.existsSync(f)) return;
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    d.spots.forEach(s => s.acts.forEach(a => {
      if (a.lab === 'check' || a.lab === 'fold' || a.lab === 'call' || !s.rh) return;
      a.resp.forEach((r, i) => {
        if (r !== 'f' && r !== 'c' && r !== 'r') return;
        const rh = s.rh[i]; if (!rh) return;
        const sx = a.x, price = sx / (1 + 2 * sx);
        const sm = (k, nd) => (nd[0] + PRIOR[k] * K[k]) / (nd[1] + K[k]);
        const fStat = s.st === 1 ? logit(sm('foldToCbet', rh.fcb)) - logit(PRIOR.foldToCbet) : s.st === 2 ? logit(sm('foldToCbetTurn', rh.fcbT)) - logit(PRIOR.foldToCbetTurn) : 0;
        const wStat = logit(sm('wtsd', rh.wtsd)) - logit(PRIOR.wtsd);
        const vp = rh.vpip ? sm('vpip', rh.vpip) : PRIOR.vpip, pf = rh.pfr ? sm('pfr', rh.pfr) : PRIOR.pfr;
        const vStat = logit(vp) - logit(PRIOR.vpip), pStat = (vp - pf) - (PRIOR.vpip - PRIOR.pfr);
        obs.push({ st: s.st, nR: s.nR, raise: s.facing ? 1 : 0, price, sx, h: rh.h, dr: rh.dr, fStat, wStat, vStat, pStat, code: r, pf: a.pf ? a.pf[i] : null, pr: a.pr ? a.pr[i] : null, lab: a.lab, hud: s.hud[i] });
      });
    }));
  });
  return obs;
}
const NAMES = ['c0_1', 'c0_2', 'c0_3', 'c1_1', 'c1_2', 'c1_3', 'c2', 'c3', 'tau', 'c4', 'taud', 'lf', 'lw', 'r0', 'r1', 'rd', 'lv', 'lp'];
const X0 = [0.25, 0.3, 0.22, 1.6, 1.5, 2.0, 0, 0, 0.12, -0.2, 0.04, 0.05, -0.05, 0.55, 0.94, 0.2, 0, -0.3];
const BX = Array.from({ length: 25 }, (_, i) => (i + 0.5) / 25), DX = Array.from({ length: 10 }, (_, i) => (i + 0.5) / 10), DE = Array.from({ length: 12 }, (_, i) => (i + 0.5) * 0.05);
const LO = [0, 0, 0, -1, -1, -1, -0.1, -0.2, 0.015, -0.3, 0.015, -0.5, -0.5, 0, 0.75, 0, -0.5, -2], HI = [1, 1, 1, 3, 3, 3, 0.2, 0.4, 0.3, 0.3, 0.3, 0.5, 0.5, 1, 1, 0.4, 0.5, 2];
const bound = p => p.map((v, i) => Math.min(HI[i], Math.max(LO[i], v)));
function predict(p0, o) {
  const p = bound(p0);
  const st = o.st, th = p[st - 1] + p[2 + st] * o.price + p[6] * (o.nR - 1) + p[7] * o.raise + (st < 3 ? p[11] * o.fStat : 0) + p[12] * o.wStat + p[16] * (o.vStat || 0) + p[17] * (o.pStat || 0);
  const tau = Math.max(0.01, p[8]), taud = Math.max(0.01, p[10]);
  let cont = 0, rai = 0;
  for (let b = 0; b < 25; b++) { const w = o.h[b]; if (!w) continue; const x = BX[b], pc = sig((x - th) / tau), pr = Math.min(pc, Math.max(0, p[13]) * sig((x - p[14]) / 0.02)); cont += w * pc; rai += w * pr; }
  for (const [xb, eb, w] of o.dr) { const x = DX[xb], pc = Math.max(sig((x - th) / tau), st < 3 ? sig((DE[eb] - o.price - p[9]) / taud) : 0), pr = Math.min(pc, Math.max(0, p[15]) + Math.max(0, p[13]) * sig((x - p[14]) / 0.02)); cont += w * pc; rai += w * pr; }
  const tot = o.h.reduce((s, x) => s + x, 0) + o.dr.reduce((s, x) => s + x[2], 0) || 1;
  cont /= tot; rai /= tot;
  const pF = Math.min(0.995, Math.max(0.005, 1 - cont)), pR = Math.min(0.99, Math.max(0.002, rai));
  return { f: pF, r: Math.min(pR, 1 - pF - 0.001), c: Math.max(0.001, 1 - pF - pR) };
}
function nll(p, obs) { let s = 0; p.forEach((v, i) => { if (v < LO[i]) s += (LO[i] - v) * 10 * obs.length; if (v > HI[i]) s += (v - HI[i]) * 10 * obs.length; }); for (const o of obs) { const q = predict(p, o); s -= Math.log(o.code === 'f' ? q.f : o.code === 'r' ? Math.max(1e-4, q.r) : Math.max(1e-4, q.c)); } return s / obs.length; }
function nllOld(obs) { let s = 0, n = 0; for (const o of obs) { if (o.pf == null) continue; const f = Math.min(0.995, Math.max(0.005, o.pf)), r = Math.min(0.99, Math.max(0.002, o.pr || 0)), c = Math.max(0.001, 1 - f - r); s -= Math.log(o.code === 'f' ? f : o.code === 'r' ? r : c); n++; } return n ? s / n : null; }
function nelderMead(f, x0, iters) {
  const n = x0.length; let S = [x0.slice()]; for (let i = 0; i < n; i++) { const x = x0.slice(); x[i] += Math.abs(x[i]) > 0.05 ? 0.15 * x[i] : 0.05; S.push(x); }
  let F = S.map(f);
  for (let it = 0; it < iters; it++) {
    const idx = F.map((v, i) => i).sort((a, b) => F[a] - F[b]); S = idx.map(i => S[i]); F = idx.map(i => F[i]);
    const c = new Array(n).fill(0); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c[j] += S[i][j] / n;
    const xr = c.map((v, j) => v + (v - S[n][j])), fr = f(xr);
    if (fr < F[0]) { const xe = c.map((v, j) => v + 2 * (v - S[n][j])), fe = f(xe); if (fe < fr) { S[n] = xe; F[n] = fe; } else { S[n] = xr; F[n] = fr; } }
    else if (fr < F[n - 1]) { S[n] = xr; F[n] = fr; }
    else { const xc = c.map((v, j) => v + 0.5 * (S[n][j] - v)), fc = f(xc); if (fc < F[n]) { S[n] = xc; F[n] = fc; } else { for (let i = 1; i <= n; i++) { S[i] = S[i].map((v, j) => S[0][j] + 0.5 * (v - S[0][j])); F[i] = f(S[i]); } } }
  }
  const bi = F.indexOf(Math.min(...F)); return { x: S[bi], f: F[bi] };
}
function calibTable(p, obs, keyFn) {
  const T = {}; obs.forEach(o => { const k = keyFn(o), t = T[k] || (T[k] = { n: 0, f: 0, r: 0, pf: 0, pr: 0, of: 0, ofn: 0 }); const q = predict(p, o); t.n++; if (o.code === 'f') t.f++; if (o.code === 'r') t.r++; t.pf += q.f; t.pr += q.r; if (o.pf != null) { t.of += o.pf; t.ofn++; } });
  return Object.keys(T).sort().map(k => { const t = T[k]; return { key: k, n: t.n, obsFold: +(t.f / t.n).toFixed(3), newFold: +(t.pf / t.n).toFixed(3), oldFold: t.ofn ? +(t.of / t.ofn).toFixed(3) : null, obsRaise: +(t.r / t.n).toFixed(3), newRaise: +(t.pr / t.n).toFixed(3) }; });
}
if (require.main === module) {
  const tr = load(train), te = load(test);
  console.log('Beobachtungen: Training ' + tr.length + ', Prüfung ' + te.length);
  let best = { x: X0, f: nll(X0, tr) };
  for (let round = 0; round < 4; round++) { const r = nelderMead(p => nll(p, tr), best.x, 1500); if (r.f < best.f - 1e-6) best = r; else break; console.log('Runde ' + round + ': NLL ' + r.f.toFixed(4)); }
  const P = bound(best.x).map(v => +v.toFixed(4));
  const res = { label, comp, train, test, nTrain: tr.length, nTest: te.length, params: Object.fromEntries(NAMES.map((k, i) => [k, P[i]])), vector: P,
    logLoss: { trainNew: +nll(P, tr).toFixed(4), trainOld: +nllOld(tr).toFixed(4), testNew: +nll(P, te).toFixed(4), testOld: +nllOld(te).toFixed(4) },
    calibTest: { bySize: calibTable(P, te, o => o.lab), byStreetSize: calibTable(P, te, o => 'St' + o.st + (o.nR > 1 ? ' MW' : ' HU') + ' ' + o.lab), byHud: calibTable(P, te, o => o.hud) } };
  console.log(JSON.stringify(res, null, 1));
  const file = path.join(__dirname, '..', 'results', 'strategy.json');
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* neu */ }
  prev.responseFit = prev.responseFit || {}; prev.responseFit[label + '-' + comp] = res;
  fs.writeFileSync(file, JSON.stringify(prev, null, 1));
}
module.exports = { load, predict, nll, nllOld, NAMES, calibTable, bound };
