/* PokerTrainer 2.0 – Langläufer: vollständige Sieben-Karten-Enumeration, 1.000.000 simulierte Hände (parallel),
   Kalibrierung der Gegner-KI, Coach-Bewertung gegen Referenz, individuelle Referenzprüfung der Handbewertung (evalref),
   Abdeckung und Verzerrung der Monte-Carlo-Equity gegen exakte Enumeration (mccov). Aufruf: node tests/long.js [teil...]
   Ergebnis: tests/results/long.json (Teile werden zusammengeführt) */
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
  } else if (kind === 'evalref') {
    // Individuelle Referenzprüfung: eigene Klassentabelle (alle 2.598.960 Fünf-Karten-Hände), dann die zugeteilten Aufträge
    const X = require('./ref/evalcheck.js'), E = PT.eval, five = X.fiveCardAll(E), res = [];
    workerData.jobs.forEach(j => {
      const rng = PT.makeRng('evalref|' + j.seed), t0 = Date.now(); let r;
      if (j.type === 'hands') r = X.checkHands(E, five.s2r, j.strat, j.nCards, j.count, rng);
      else if (j.type === 'pairs') r = X.checkPairs(E, j.board, j.count, rng);
      else if (j.type === 'pairsSame') r = X.checkPairsSame(E, j.strat, j.count, rng);
      else if (j.type === 'perm') r = X.checkPermutations(E, j.strat, j.count, j.k, rng);
      else if (j.type === 'suits') r = X.checkSuits(E, j.strat, j.count, rng);
      r.type = j.type; r.ms = Date.now() - t0; res.push(r);
    });
    parentPort.postMessage({ five: { hands: five.hands, classes: five.classes, mapMismatch: five.mapMismatch, catMismatch: five.catMismatch, orderViolations: five.orderViolations }, res });
  } else if (kind === 'evalref7') {
    // alle Sieben-Karten-Hände mit erster Karte aus workerData.c0s einzeln gegen die Referenz
    const X = require('./ref/evalcheck.js'), ref = require('./ref/handref.js'), E = PT.eval, five = X.fiveCardAll(E), s2r = five.s2r, a = [0, 0, 0, 0, 0, 0, 0];
    let n = 0, bad = 0; const cats = new Array(9).fill(0), seen = new Uint8Array(7462), ex = [];
    workerData.c0s.forEach(c0 => {
      for (let c1 = c0 + 1; c1 < 52; c1++) for (let c2 = c1 + 1; c2 < 52; c2++) for (let c3 = c2 + 1; c3 < 52; c3++) for (let c4 = c3 + 1; c4 < 52; c4++)
        for (let c5 = c4 + 1; c5 < 52; c5++) for (let c6 = c5 + 1; c6 < 52; c6++) {
          a[0] = c0; a[1] = c1; a[2] = c2; a[3] = c3; a[4] = c4; a[5] = c5; a[6] = c6;
          const r = ref.evalBest(a); n++; cats[ref.category(r)]++; seen[r] = 1;
          if (s2r[E.evaluate(a)] !== r) { bad++; if (ex.length < 3) ex.push(a.slice()); }
        }
    });
    parentPort.postMessage({ n, bad, cats, seen: Array.from(seen), ex });
  } else if (kind === 'mccov') {
    const L = require('./ref/mccov-lib.js');
    parentPort.postMessage(workerData.spots.map(id => L.runSpot(PT, id, workerData.K)));
  }
  return;
}

const PT = require('./load.js').load();
const parts = process.argv.slice(2).length ? process.argv.slice(2) : ['eval7', 'sim', 'calib', 'coach', 'evalref', 'mccov'];
let prev = {}; try { prev = JSON.parse(fs.readFileSync(path.join(__dirname, 'results', 'long.json'), 'utf8')); } catch (e) { /* neu */ }
const out = Object.assign(prev, { app: PT.VERSION, date: new Date().toISOString(), node: process.version, cpus: require('os').cpus().length });
function runWorker(data) { return new Promise((res, rej) => { const w = new Worker(__filename, { workerData: data }); w.on('message', res); w.on('error', rej); }); }
// Beim Speichern die Datei neu lesen und nur die Teile dieses Laufs ersetzen (parallele Läufe verlieren nichts)
function save() {
  const f = path.join(__dirname, 'results', 'long.json');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  let cur = {}; try { cur = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { /* neu */ }
  ['app', 'date', 'node', 'cpus'].concat(parts).forEach(k => { if (out[k] !== undefined) cur[k] = out[k]; });
  fs.writeFileSync(f, JSON.stringify(cur, null, 1));
}

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
    out.calib = { hands: 2 * +(process.env.CALIB_HANDS || 100000), styles: {}, ms: 0 };   /* 2.4 (C23-10): tatsächliche Händezahl */
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
  if (parts.includes('evalref')) {
    // Individuelle Referenzprüfung der Handbewertung gegen tests/ref/handref.js (konstruktive Klassenaufzählung, Best of Five)
    const X = require('./ref/evalcheck.js'), t0 = Date.now(), E = PT.eval;
    const five = X.fiveCardAll(E);
    const strata = Object.keys(X.STRATA), small = ['zufall', 'flush5', 'flush6', 'strasse', 'wheel', 'straightflush', 'drilling_paar', 'vierling', 'zwei_paare', 'ein_paar', 'hoch'];
    const scale = +(process.env.EVALREF_SCALE || 1), jobs = [];
    let seed = 0;
    strata.forEach(st => { const n = Math.round((st === 'zufall' ? 4000000 : 400000) * scale); for (let h = 0; h < 2; h++) jobs.push({ type: 'hands', strat: st, nCards: 7, count: n / 2, seed: ++seed }); });
    small.forEach(st => { const n = Math.round((st === 'zufall' ? 1000000 : 100000) * scale); jobs.push({ type: 'hands', strat: st, nCards: 6, count: n, seed: ++seed }); });
    small.filter(st => st !== 'flush6').forEach(st => jobs.push({ type: 'hands', strat: st, nCards: 5, count: Math.round(100000 * scale), seed: ++seed }));
    Object.keys(X.BOARDS).forEach(b => jobs.push({ type: 'pairs', board: b, count: Math.round(200000 * scale), seed: ++seed }));
    ['zwei_drillinge', 'drilling_zwei_paare', 'drilling_paar', 'flush7', 'flush_und_strasse', 'strasse', 'wheel', 'vierling_paar', 'drei_paare', 'hoch'].forEach(st => jobs.push({ type: 'pairsSame', strat: st, count: Math.round(100000 * scale), seed: ++seed }));
    jobs.push({ type: 'perm', strat: 'zufall', count: Math.round(300 * scale), k: 5040, seed: ++seed });
    strata.forEach(st => jobs.push({ type: 'perm', strat: st, count: Math.round(10000 * scale), k: 20, seed: ++seed }));
    strata.forEach(st => jobs.push({ type: 'suits', strat: st, count: Math.round(5000 * scale), seed: ++seed }));
    // Aufträge abwechselnd auf zwei Threads
    const split = [[], []]; jobs.forEach((j, i) => split[i % 2].push(j));
    const done = await Promise.all(split.map(js => runWorker({ kind: 'evalref', jobs: js })));
    const res = [].concat(...done.map(d => d.res)), sum = (t, k) => res.filter(r => r.type === t).reduce((a, r) => a + r[k], 0);
    const byStrat = {}; res.filter(r => r.type === 'hands').forEach(r => { const k = r.strat + '/' + r.nCards, b = byStrat[k] || (byStrat[k] = { count: 0, mismatch: 0, cats: new Array(9).fill(0) }); b.count += r.count; b.mismatch += r.mismatch; r.cats.forEach((c, i) => { b.cats[i] += c; }); });
    const sevenCats = new Array(9).fill(0); res.filter(r => r.type === 'hands' && r.nCards === 7).forEach(r => r.cats.forEach((c, i) => { sevenCats[i] += c; }));
    out.evalref = {
      reference: 'tests/ref/handref.js (konstruktive Aufzählung der 7.462 Klassen, Zuordnung über Rang-Multimenge + Flush-Bit, bestes der 21 Fünfer-Blätter)',
      five: { hands: five.hands, cats: five.cats, classes: five.classes, mapMismatch: five.mapMismatch, catMismatch: five.catMismatch, orderViolations: five.orderViolations, workerTables: done.map(d => d.five) },
      seven: { hands: res.filter(r => r.type === 'hands' && r.nCards === 7).reduce((a, r) => a + r.count, 0), mismatch: res.filter(r => r.type === 'hands' && r.nCards === 7).reduce((a, r) => a + r.mismatch, 0), cats: sevenCats },
      sixAndFive: { hands: res.filter(r => r.type === 'hands' && r.nCards < 7).reduce((a, r) => a + r.count, 0), mismatch: res.filter(r => r.type === 'hands' && r.nCards < 7).reduce((a, r) => a + r.mismatch, 0) },
      byStrat,
      pairs: { count: sum('pairs', 'count'), mismatch: sum('pairs', 'mismatch'), ties: sum('pairs', 'ties'), byBoard: res.filter(r => r.type === 'pairs').map(r => ({ board: r.board, count: r.count, mismatch: r.mismatch, ties: r.ties })) },
      pairsSame: { count: sum('pairsSame', 'count'), mismatch: sum('pairsSame', 'mismatch'), ties: sum('pairsSame', 'ties'), byStrat: res.filter(r => r.type === 'pairsSame').map(r => ({ strat: r.strat, count: r.count, mismatch: r.mismatch, ties: r.ties })) },
      permutations: { hands: sum('perm', 'count'), evals: sum('perm', 'evals'), mismatch: sum('perm', 'mismatch') },
      suits: { hands: sum('suits', 'count'), evals: sum('suits', 'evals'), mismatch: sum('suits', 'mismatch'), refMismatch: sum('suits', 'refMismatch') },
      examples: res.filter(r => r.examples && r.examples.length).slice(0, 5).map(r => r.examples[0]),
      scale, ms: Date.now() - t0 };
    const ev = out.evalref;
    ev.ok = five.mapMismatch + five.catMismatch + five.orderViolations === 0 && five.classes === 7462 && ev.seven.mismatch === 0 && ev.sixAndFive.mismatch === 0 && ev.pairs.mismatch === 0 && ev.pairsSame.mismatch === 0 && ev.permutations.mismatch === 0 && ev.suits.mismatch + ev.suits.refMismatch === 0;
    console.log('evalref', JSON.stringify({ ok: ev.ok, five: ev.five.hands, seven: ev.seven, pairs: ev.pairs.count + '/' + ev.pairs.mismatch, pairsSame: ev.pairsSame.count, perm: ev.permutations, suits: ev.suits, ms: ev.ms })); save();
  }
  if (parts.includes('evalref7')) {
    // Vollständige individuelle Prüfung: alle 133.784.560 Sieben-Karten-Hände gegen die Best-of-Five-Referenz
    const t0 = Date.now(), cost = c0 => { let x = 1; for (let i = 0; i < 6; i++) x = x * (51 - c0 - i) / (i + 1); return x; }, split = [[], []], load = [0, 0];
    for (let c0 = 0; c0 <= 45; c0++) { const w = load[0] <= load[1] ? 0 : 1; split[w].push(c0); load[w] += cost(c0); }
    const done = await Promise.all(split.map(c0s => runWorker({ kind: 'evalref7', c0s })));
    const cats = new Array(9).fill(0), seen = new Array(7462).fill(0); done.forEach(d => { d.cats.forEach((c, i) => { cats[i] += c; }); d.seen.forEach((v, i) => { if (v) seen[i] = 1; }); });
    const expected = [23294460, 58627800, 31433400, 6461620, 6180020, 4047644, 3473184, 224848, 41584];
    out.evalref7 = { hands: done.reduce((x, d) => x + d.n, 0), mismatch: done.reduce((x, d) => x + d.bad, 0), cats, catsOk: cats.join() === expected.join(), classesSeen: seen.reduce((x, y) => x + y, 0),
      examples: [].concat(...done.map(d => d.ex)).slice(0, 3), ms: Date.now() - t0 };
    out.evalref7.ok = out.evalref7.hands === 133784560 && out.evalref7.mismatch === 0 && out.evalref7.catsOk && out.evalref7.classesSeen === 4824;
    console.log('evalref7', JSON.stringify(out.evalref7)); save();
  }
  if (parts.includes('mccov')) {
    // Abdeckung und Verzerrung der Monte-Carlo-Equity je Analysestufe gegen exakte Enumeration (Referenzbewertung)
    const L = require('./ref/mccov-lib.js'), t0 = Date.now(), K = +(process.env.MCCOV_RUNS || 1000);
    const ids = L.make(PT).spots.map(s => s.id), split = [[], []];
    // teure Fälle (Preflop, breite Flop-Ranges) gleichmäßig verteilen
    const heavy = ids.filter(id => /^pf-|flop-(toppair|flushdraw)|mw-flop|mw-river-mitte|mw-turn-konflikt/.test(id)), light = ids.filter(id => heavy.indexOf(id) < 0);
    heavy.concat(light).forEach((id, i) => split[i % 2].push(id));
    const done = await Promise.all(split.map(sp => runWorker({ kind: 'mccov', spots: sp, K })));
    const spots = [].concat(...done).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)), j = L.judge(spots);
    out.mccov = { runsPerConfig: K, configs: L.CONFIGS, tolerance: j.tolerance, levels: j.levels, ok: j.ok, problems: j.problems, spots, ms: Date.now() - t0 };
    console.log('mccov', JSON.stringify({ ok: j.ok, levels: Object.keys(j.levels).map(k => k + ' ' + (100 * j.levels[k].coverage).toFixed(2) + ' %'), problems: j.problems, ms: out.mccov.ms })); save();
  }
  console.log('fertig');
})();
