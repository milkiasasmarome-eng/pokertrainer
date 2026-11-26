/* PokerTrainer 2.0 – Langläufer: vollständige Sieben-Karten-Enumeration, 1.000.000 simulierte Hände (parallel),
   Kalibrierung der Gegner-KI, Coach-Bewertung gegen Referenz. Aufruf: node tests/long.js [teil...]
   Ergebnis: tests/results/long.json */
'use strict';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs'), path = require('path');

if (!isMainThread) {
  const sim = require('./sim-lib.js'), PT = sim.PT;
  const { kind, hands, seed, cfg, heroMode } = workerData;
  if (kind === 'sim') {
    const r = sim.run({ hands, seed, cfg, heroMode });
    parentPort.postMessage({ hands: r.hands, actions: r.actions, errors: r.errors.slice(0, 20), errorCount: r.errors.length, invalidRejected: r.invalidRejected,
      fallbacks: r.fallbacks, showdowns: r.showdowns, sidePots: r.sidePots, splitPots: r.splitPots, allIns: r.allIns, swaps: r.swaps, rebuys: r.rebuys, maxActions: r.maxActions });
  } else if (kind === 'calib') {
    const r = sim.run({ hands, seed, cfg });
    const agg = {};
    Object.values(r.db.opps).forEach(rec => {
      const st = PT.bots.styleOf(rec.id), a = agg[st] || (agg[st] = { h: 0, s: PT.stats.emptyStats(), ag: PT.stats.emptyAgg(), players: 0, vp: [] });
      a.h += rec.hands; a.players++; PT.stats.STATS.forEach(k => { a.s[k][0] += rec.stats[k][0]; a.s[k][1] += rec.stats[k][1]; });
      Object.keys(a.ag).forEach(k => { a.ag[k] += rec.agg[k]; });
      if (rec.hands >= 300) a.vp.push({ id: rec.id, vpip: rec.stats.vpip[0] / rec.stats.vpip[1], pfr: rec.stats.pfr[0] / rec.stats.pfr[1], typ: PT.stats.playerType(rec) });
    });
    parentPort.postMessage(agg);
  }
  return;
}

const PT = require('./load.js').load();
const parts = process.argv.slice(2).length ? process.argv.slice(2) : ['eval7', 'sim', 'calib', 'coach'];
let prev = {}; try { prev = JSON.parse(fs.readFileSync(path.join(__dirname, 'results', 'long.json'), 'utf8')); } catch (e) { /* neu */ }
const out = Object.assign(prev, { app: PT.VERSION, date: new Date().toISOString(), node: process.version, cpus: require('os').cpus().length });
function runWorker(data) { return new Promise((res, rej) => { const w = new Worker(__filename, { workerData: data }); w.on('message', res); w.on('error', rej); }); }
function save() { fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'results', 'long.json'), JSON.stringify(out, null, 1)); }

(async () => {
  if (parts.includes('eval7')) {
    const t0 = Date.now(), E = PT.eval, cats = new Array(9).fill(0), seen = new Set(), a = [0, 0, 0, 0, 0, 0, 0];
    for (let c0 = 0; c0 < 52; c0++) for (let c1 = c0 + 1; c1 < 52; c1++) for (let c2 = c1 + 1; c2 < 52; c2++) for (let c3 = c2 + 1; c3 < 52; c3++)
      for (let c4 = c3 + 1; c4 < 52; c4++) for (let c5 = c4 + 1; c5 < 52; c5++) for (let c6 = c5 + 1; c6 < 52; c6++) {
        a[0] = c0; a[1] = c1; a[2] = c2; a[3] = c3; a[4] = c4; a[5] = c5; a[6] = c6;
        const s = E.evaluate(a); cats[s >> 20]++; seen.add(s);
      }
    const expected = [23294460, 58627800, 31433400, 6461620, 6180020, 4047644, 3473184, 224848, 41584];
    out.eval7 = { total: cats.reduce((x, y) => x + y, 0), cats, expected, ok: cats.join() === expected.join() && seen.size === 4824, distinct: seen.size, ms: Date.now() - t0 };
    console.log('eval7', JSON.stringify(out.eval7)); save();
  }
  if (parts.includes('sim')) {
    const t0 = Date.now(), jobs = [];
    const N = +(process.env.SIM_HANDS || 1000000), q = Math.round(N / 8);
    // 8 Pakete auf 2 Threads: Standard, zufällige Stacks ohne Nachkauf, Fuzz-Eingaben, Rake, kurze und tiefe Stacks
    const configs = [
      { cfg: {}, heroMode: null }, { cfg: {}, heroMode: null }, { cfg: { rebuyBelowBB: 0, topUp: false }, heroMode: null }, { cfg: {}, heroMode: 'random' },
      { cfg: { rake: { on: true, pct: 0.05, capBB: 3, nfnd: true } }, heroMode: null }, { cfg: { startBB: 20, rebuyBelowBB: 5 }, heroMode: 'random' },
      { cfg: { startBB: 300 }, heroMode: null }, { cfg: { difficulty: 'experte', swapEvery: 10 }, heroMode: 'random' }
    ];
    const results = [];
    for (let i = 0; i < configs.length; i += 2) {
      const batch = [0, 1].map(k => runWorker({ kind: 'sim', hands: q, seed: 1000 + i + k, cfg: configs[i + k].cfg, heroMode: configs[i + k].heroMode }));
      (await Promise.all(batch)).forEach(r => results.push(r));
      console.log('sim', results.length * q, 'Hände', Math.round((Date.now() - t0) / 1000) + ' s');
    }
    const sum = k => results.reduce((s, r) => s + r[k], 0);
    out.sim = { hands: sum('hands'), actions: sum('actions'), errorCount: sum('errorCount'), errors: results.flatMap(r => r.errors).slice(0, 10), invalidRejected: sum('invalidRejected'),
      botFallbacks: sum('fallbacks'), showdowns: sum('showdowns'), sidePots: sum('sidePots'), splitPots: sum('splitPots'), allIns: sum('allIns'), swaps: sum('swaps'), rebuys: sum('rebuys'),
      maxActions: Math.max(...results.map(r => r.maxActions)), configs: configs.map(c => JSON.stringify(c)), ms: Date.now() - t0 };
    console.log('sim', JSON.stringify(out.sim)); save();
  }
  if (parts.includes('calib')) {
    const t0 = Date.now();
    const parts2 = await Promise.all([runWorker({ kind: 'calib', hands: +(process.env.CALIB_HANDS || 100000), seed: 501, cfg: {} }), runWorker({ kind: 'calib', hands: +(process.env.CALIB_HANDS || 100000), seed: 502, cfg: {} })]);
    const agg = {};
    parts2.forEach(p => Object.keys(p).forEach(st => { const a = agg[st] || (agg[st] = { h: 0, s: PT.stats.emptyStats(), ag: PT.stats.emptyAgg(), players: 0, vp: [] }), b = p[st];
      a.h += b.h; a.players += b.players; PT.stats.STATS.forEach(k => { a.s[k][0] += b.s[k][0]; a.s[k][1] += b.s[k][1]; }); Object.keys(a.ag).forEach(k => { a.ag[k] += b.ag[k]; }); a.vp = a.vp.concat(b.vp); }));
    // Zielbereiche (typische 6-max-Werte je Spielertyp; HUD-Typ nach Projektregel)
    const T = { lp: { vpip: [28, 40], pfr: [5, 14], af: [0.3, 1.5], wtsd: [32, 48], typ: 'loose-passiv' }, vl: { vpip: [40, 60], pfr: [18, 32], af: [1.8, 4], typ: 'sehr loose' },
      nit: { vpip: [9, 16], pfr: [6, 13], typ: 'Nit' }, tag: { vpip: [18, 26], pfr: [14, 22], threeBet: [5, 10], af: [2, 4], typ: 'TAG' },
      lag: { vpip: [27, 36], pfr: [21, 30], threeBet: [8, 14], af: [2.5, 5], typ: 'LAG' }, bal: { vpip: [20, 28], pfr: [16, 23], threeBet: [5, 10], typ: 'TAG' } };
    out.calib = { hands: 200000, styles: {}, ms: 0 };
    let allOk = true;
    Object.keys(T).forEach(st => {
      const a = agg[st], r = {}; PT.stats.STATS.forEach(k => { r[k] = a.s[k][1] ? +(100 * a.s[k][0] / a.s[k][1]).toFixed(1) : null; });
      r.af = +((a.ag.bet + a.ag.raise) / Math.max(1, a.ag.call)).toFixed(2);
      const checks = {}; Object.keys(T[st]).forEach(k => { if (k === 'typ') return; const v = r[k]; checks[k] = v >= T[st][k][0] && v <= T[st][k][1]; if (!checks[k]) allOk = false; });
      const typMatch = a.vp.filter(x => x.typ === T[st].typ).length;
      out.calib.styles[st] = { players: a.players, hands: a.h, stats: r, targets: T[st], checks, hudTypeMatch: typMatch + '/' + a.vp.length };
    });
    out.calib.ok = allOk; out.calib.ms = Date.now() - t0;
    console.log('calib', JSON.stringify(out.calib)); save();
  }
  if (parts.includes('coach')) {
    const { execFileSync } = require('child_process'), t0 = Date.now();
    // Seeds parallel in eigenen Prozessen (gleiche Ergebnisse wie nacheinander, nur schneller)
    const { execFile } = require('child_process');
    const one = (hands, seed, mode) => new Promise((res, rej) => execFile('node', [path.join(__dirname, 'coach-eval.js'), String(hands), String(seed), mode], { encoding: 'utf8', maxBuffer: 1e7 }, (e, so) => e ? rej(e) : res(so.trim().split('\n').map(l => JSON.parse(l)))));
    const jobs = [[21, 'exploit'], [22, 'exploit'], [23, 'exploit'], [24, 'exploit'], [21, 'gto'], [22, 'gto']].map(([sd, m]) => one(2500, sd, m).then(r => ({ m, r })));
    const done = await Promise.all(jobs);
    const ex = [].concat(...done.filter(d => d.m === 'exploit').map(d => d.r)), gt = [].concat(...done.filter(d => d.m === 'gto').map(d => d.r));
    const avg = (arr, k) => arr.reduce((s, x) => s + x[k], 0) / arr.length;
    out.coach = { exploit: ex, gto: gt, exploitAvgCoach: avg(ex, 'coachBB100'), exploitAvgBot: avg(ex, 'botBB100'), gtoAvgCoach: avg(gt, 'coachBB100'), gtoAvgBot: avg(gt, 'botBB100'), ms: Date.now() - t0 };
    console.log('coach', JSON.stringify(out.coach)); save();
  }
  console.log('fertig');
})();
