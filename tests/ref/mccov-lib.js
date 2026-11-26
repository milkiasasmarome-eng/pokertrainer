/* PokerTrainer – Abdeckungs- und Verzerrungsprüfung der Monte-Carlo-Equity gegen exakte Enumeration (Referenzbewertung).
   runSpot führt für einen Referenzfall K unabhängige, reproduzierbare Läufe je Konfiguration aus. */
'use strict';
const { make, CONFIGS, TOL } = require('./mcspots.js');

function runSpot(PT, spotId, K, configIds, exactCache) {
  const S = make(PT), sp = S.spots.find(s => s.id === spotId), Q = PT.equity;
  const t0 = Date.now(), ex = exactCache && exactCache[spotId] != null ? { eq: exactCache[spotId] } : S.exactRef(sp), inp = S.inputs(sp);
  const out = { id: sp.id, name: sp.name, group: sp.group, exact: ex.eq, exactMs: Date.now() - t0, configs: {} };
  (configIds || CONFIGS.map(c => c.id)).forEach(cid => {
    const cfg = CONFIGS.find(c => c.id === cid);
    let sum = 0, sum2 = 0, cov = 0, its = 0, ns = 0, seSum = 0, seSq = 0, aborted = 0, fails = 0, widthSum = 0, below = 0, above = 0;
    const t1 = Date.now();
    for (let k = 0; k < K; k++) {
      const o = Object.assign({}, inp, { level: cfg.level, exact: false, cache: false, rng: PT.makeRng('mccov|' + sp.id + '|' + cid + '|' + k), deadline: Infinity });
      if (cfg.budget) o.budget = { left: cfg.budget, used: 0 };
      const r = Q.equity(o);
      if (r.eq == null) { fails++; continue; }
      sum += r.eq; sum2 += r.eq * r.eq; its += r.iters; ns += r.n; seSum += r.se; seSq += r.se * r.se; widthSum += r.hi - r.lo; if (r.aborted) aborted++;
      if (ex.eq >= r.lo && ex.eq <= r.hi) cov++; else if (ex.eq < r.lo) below++; else above++;
    }
    const n = K - fails, m = sum / n, sd = Math.sqrt(Math.max(0, (sum2 - sum * m) / Math.max(1, n - 1)));
    // z der Verzerrung: Streuung = max(empirische Streuung, mittlerer gemeldeter SE) – bei seltenen Ereignissen ist die
    // empirische Streuung weniger Läufe kein brauchbarer Maßstab (fast alle Läufe 0); konstante Fälle: |Bias| < 1e-12 → 0
    const sdz = Math.max(sd, Math.sqrt(seSq / n)), bias = m - ex.eq;
    out.configs[cid] = { runs: n, fails, mean: m, bias, z: Math.abs(bias) < 1e-12 ? 0 : sdz > 0 ? bias / (sdz / Math.sqrt(n)) : Infinity, sd,
      rmse: Math.sqrt(sd * sd * (n - 1) / n + (m - ex.eq) * (m - ex.eq)), meanSE: seSum / n, seRatio: sd > 0 ? (seSum / n) / sd : null, coverage: cov / n,
      missLow: below, missHigh: above, meanWidth: widthSum / n, meanIters: its / n, meanN: ns / n, abortedShare: aborted / n, ms: Date.now() - t1 };
  });
  return out;
}
/** Bewertung nach vorab festgelegter Toleranz */
function judge(spotResults) {
  const levels = {}, problems = [];
  spotResults.forEach(s => {
    const degenerate = s.exact === 0 || s.exact === 1 || s.group === 'Konstant';
    Object.keys(s.configs).forEach(cid => {
      const c = s.configs[cid], L = levels[cid] || (levels[cid] = { spots: 0, runs: 0, covered: 0, absBiasSum: 0, rmseSum: 0, itersSum: 0, zAbsMax: 0, degenerateOk: 0, degenerateSpots: 0 });
      if (c.fails) problems.push(s.id + '/' + cid + ': ' + c.fails + ' Fehlschläge');
      if (degenerate) { L.degenerateSpots++; if (c.coverage === 1 && Math.abs(c.bias) < 1e-12) L.degenerateOk++; else problems.push(s.id + '/' + cid + ': degenerierter Fall nicht exakt getroffen (Abdeckung ' + c.coverage + ', Bias ' + c.bias + ')'); return; }
      L.spots++; L.runs += c.runs; L.covered += Math.round(c.coverage * c.runs); L.absBiasSum += Math.abs(c.bias); L.rmseSum += c.rmse; L.itersSum += c.meanIters;
      L.zAbsMax = Math.max(L.zAbsMax, Math.abs(c.z));
      if (c.coverage < TOL.spotLo) problems.push(s.id + '/' + cid + ': Abdeckung ' + (100 * c.coverage).toFixed(1) + ' % < ' + 100 * TOL.spotLo + ' %');
      if (Math.abs(c.z) > TOL.zMax) problems.push(s.id + '/' + cid + ': Verzerrung z = ' + c.z.toFixed(2));
    });
  });
  Object.keys(levels).forEach(cid => {
    const L = levels[cid]; L.coverage = L.covered / L.runs; L.meanAbsBias = L.absBiasSum / L.spots; L.meanRMSE = L.rmseSum / L.spots; L.meanIters = L.itersSum / L.spots;
    L.ok = L.coverage >= TOL.aggLo && L.coverage <= TOL.aggHi;
    if (!L.ok) problems.push(cid + ': Gesamtabdeckung ' + (100 * L.coverage).toFixed(2) + ' % außerhalb ' + 100 * TOL.aggLo + '–' + 100 * TOL.aggHi + ' %');
    delete L.absBiasSum; delete L.rmseSum; delete L.itersSum;
  });
  return { levels, problems, ok: problems.length === 0, tolerance: TOL };
}
module.exports = { runSpot, judge, CONFIGS, TOL, make };
