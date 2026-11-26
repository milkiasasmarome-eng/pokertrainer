/* PokerTrainer – Messreihen zum Gegnergedächtnis und zur Anpassung der Gegner-KI (Abschnitt 11).
   Aufruf: node tests/gedaechtnis-eval.js [null] [switch] [adapt]   (ohne Angabe: alle Teile)
   Umgebungsvariablen: REPS (Wiederholungen je Wechselszenario, Standard 24), ADAPT_HANDS (Hände je Heldenstrategie und Seed, Standard 20000),
   NULL_OPP (synthetische Gegner der Nullmessung), PARAMS (JSON, nur für Parameterstudien), SCEN (Auswahl der Szenarien), OUT (Ergebnisdatei)
   Ergebnis: tests/results/gedaechtnis.json
   Hinweis: Die Messung darf den internen Stil der Computergegner kennen (sie prüft die Gegner-KI);
   Datenbank, Anzeige und Coach nutzen ihn nie. */
'use strict';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs'), path = require('path');

if (!isMainThread) {
  const L = require('./gedaechtnis-lib.js');
  if (workerData.params) L.PT.stats.setMemoryParams(workerData.params);
  if (workerData.kind === 'switch') parentPort.postMessage(L.runSwitch(workerData.scen, workerData.reps, workerData.pre, workerData.post, workerData.seed0));
  else if (workerData.kind === 'adapt') parentPort.postMessage(L.runAdapt(workerData.kinds, workerData.hands, workerData.seed, 1500));
  else if (workerData.kind === 'null') parentPort.postMessage(L.runNull(workerData.nOpp, workerData.hands));
  return;
}
const { wald, wilson, quantile } = require('./gedaechtnis-lib.js');

// ---------------- Hauptprozess ----------------
const PT = require('./load.js').load();
const parts = process.argv.slice(2).length ? process.argv.slice(2) : ['null', 'switch', 'adapt'];
const file = process.env.OUT ? path.resolve(process.env.OUT) : path.join(__dirname, 'results', 'gedaechtnis.json');
let prev = {}; try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* neu */ }
const out = Object.assign(prev, { app: PT.VERSION, date: new Date().toISOString(), node: process.version, params: { halfLife: PT.stats.MEMORY.HALF_LIFE, change: PT.stats.MEMORY.CHANGE, keys: PT.stats.MEMORY.CHANGE_KEYS } });
const PARAMS = process.env.PARAMS ? JSON.parse(process.env.PARAMS) : null;
if (PARAMS) { PT.stats.setMemoryParams(PARAMS); out.params = { halfLife: PT.stats.MEMORY.HALF_LIFE, change: PT.stats.MEMORY.CHANGE, keys: PT.stats.MEMORY.CHANGE_KEYS }; }
function runWorker(data) { data.params = PARAMS; return new Promise((res, rej) => { const w = new Worker(__filename, { workerData: data }); w.on('message', res); w.on('error', rej); }); }
function save() { fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true }); fs.writeFileSync(file, JSON.stringify(out, null, 1)); }

(async () => {
  if (parts.includes('null')) {
    const t0 = Date.now(), r = await runWorker({ kind: 'null', nOpp: +(process.env.NULL_OPP || 1000), hands: 1000 });
    out.null = Object.assign(r, { ms: Date.now() - t0 }); console.log('null', JSON.stringify(out.null)); save();
  }
  if (parts.includes('switch')) {
    const t0 = Date.now(), reps = +(process.env.REPS || 24), pre = 600, post = 400;
    let scen = [
      { name: 'TAG → LAG', from: 'tag', to: 'lag' }, { name: 'LAG → TAG', from: 'lag', to: 'tag' }, { name: 'Nit → sehr loose', from: 'nit', to: 'vl' },
      { name: 'TAG → Nit', from: 'tag', to: 'nit' }, { name: 'TAG → loose-passiv', from: 'tag', to: 'lp' }, { name: 'loose-passiv → TAG', from: 'lp', to: 'tag' },
      { name: 'ausgeglichen → LAG', from: 'bal', to: 'lag' }, { name: 'Kontrolle TAG → TAG', from: 'tag', to: 'tag' }, { name: 'Kontrolle TAG → ausgeglichen', from: 'tag', to: 'bal' }
    ];
    if (process.env.SCEN) scen = scen.filter((x, i) => process.env.SCEN.split(',').map(Number).indexOf(i) >= 0);
    const half = Math.ceil(scen.length / 2);
    const res = [].concat(...await Promise.all([runWorker({ kind: 'switch', scen: scen.slice(0, half), reps, pre, post, seed0: 7100 }), runWorker({ kind: 'switch', scen: scen.slice(half), reps, pre, post, seed0: 7100 })]));
    // Zielwerte der Stile (Kalibrierungsläufe, 200.000 Hände) für den Schätzfehler
    let calib = null; try { calib = JSON.parse(fs.readFileSync(path.join(__dirname, 'results', 'long.json'), 'utf8')).calib.styles; } catch (e) { calib = null; }
    let allFalse = 0, allPreHands = 0, oOn = 0, oH = 0;
    out.switch = { pre, post, reps, horizon: 300, scenarios: res.map(R => {
      const det = R.runs.filter(r => r.delay != null && r.delay <= 300), delays = det.map(r => r.delay);
      R.runs.forEach(r => { allFalse += r.falsePre; allPreHands += pre; oOn += r.othersOnsets; oH += r.othersHands; });
      const keys = {}; det.forEach(r => r.keys.forEach(k => { keys[k] = (keys[k] || 0) + 1; }));
      const err = {};
      if (calib) ['vpip', 'pfr'].forEach(k => [100, 200, 300].forEach(at => {
        const truth = calib[R.to].stats[k] / 100, xs = R.runs.map(r => r.err[k] && r.err[k][at]).filter(Boolean);
        if (!xs.length) return;
        err[k + '@' + at] = { truth: +truth.toFixed(3), maeMemory: +(xs.reduce((a, x) => a + Math.abs(x.mem - truth), 0) / xs.length).toFixed(4), maeLong: +(xs.reduce((a, x) => a + Math.abs(x.long - truth), 0) / xs.length).toFixed(4) };
      }));
      return { name: R.name, runs: R.runs.length, detected: det.length, rate: +(det.length / R.runs.length).toFixed(3), rateCI: wilson(det.length, R.runs.length),
        delayMedian: quantile(delays, 0.5), delayQ1: quantile(delays, 0.25), delayQ3: quantile(delays, 0.75), firstKeys: keys, estimateError: err };
    }) };
    out.switch.falseAlarmsSwitcherPre = { onsets: allFalse, hands: allPreHands, per1000: +(1000 * allFalse / allPreHands).toFixed(3) };
    out.switch.falseAlarmsStationary = { onsets: oOn, hands: oH, per1000: +(1000 * oOn / oH).toFixed(3), ciPer1000: wilson(oOn, oH, true).map(x => +(1000 * x).toFixed(3)) };
    out.switch.ms = Date.now() - t0;
    console.log('switch', JSON.stringify(out.switch)); save();
  }
  if (parts.includes('adapt')) {
    const t0 = Date.now(), hands = +(process.env.ADAPT_HANDS || 20000);
    const kinds = ['base', 'f3b45', 'f3b90', 'station', 'steal45', 'steal90'];
    const seeds = [8801, 8802];
    const parts2 = await Promise.all(seeds.map(sd => runWorker({ kind: 'adapt', kinds, hands, seed: sd })));
    const agg = {};
    kinds.forEach(k => { agg[k] = {}; parts2.forEach(p => Object.keys(p[k]).forEach(m => { if (m === 'heroStats') { (agg[k].heroStats = agg[k].heroStats || []).push(p[k][m]); return; } const a = agg[k][m] || (agg[k][m] = [0, 0]); a[0] += p[k][m][0]; a[1] += p[k][m][1]; })); });
    const eff = (k1, k0, m) => wald(agg[k1][m][0], agg[k1][m][1], agg[k0][m][0], agg[k0][m][1]);
    out.adapt = { handsPerSeed: hands, seeds, measuredAfterHand: 1500, heroStats: Object.fromEntries(kinds.map(k => [k, agg[k].heroStats])),
      effects: {
        'Held foldet 90 % gegen 3-Bets: 3-Bet der Bots gegen Opens des Helden (vs. 45 %)': eff('f3b90', 'f3b45', 'tb'),
        'Held foldet 90 % gegen 3-Bets: Call der Bots gegen Opens des Helden (vs. 45 %)': eff('f3b90', 'f3b45', 'tbCall'),
        'Held foldet 90 % gegen Steals: Steal-Versuche der Bots (vs. 45 %)': eff('steal90', 'steal45', 'steal'),
        'Calling Station: Bluff-Bets der Bots mit Luft, Heads-up gegen den Helden (vs. Grundstrategie)': eff('station', 'base', 'bluff'),
        'Calling Station: davon Flop': eff('station', 'base', 'bluffFlop'),
        'Calling Station: davon Turn/River': eff('station', 'base', 'bluffTR'),
        'Calling Station: River-Bet mit mittlerer Hand (dünner Value)': eff('station', 'base', 'thinRiver'),
        'Calling Station: River-Bet mit starker Hand': eff('station', 'base', 'valueRiver'),
        'Calling Station: C-Bet Flop Heads-up': eff('station', 'base', 'cbet')
      }, raw: agg, ms: Date.now() - t0 };
    console.log('adapt', JSON.stringify(out.adapt.effects, null, 1)); save();
  }
  console.log('fertig');
})();
