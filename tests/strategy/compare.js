/* Strategischer Vergleich (reproduzierbar): Coach 2.1 gegen Coach 2.0.1, Bot als Held, Referenzstrategien,
   dem Coach unbekannte synthetische Gegner, mehrere Seeds, Stacktiefen und Tischzusammensetzungen.
   Aufruf: node tests/strategy/compare.js [--plan haupt|schnell|entwicklung] [--jobs 2] [--only <Text>] [--aggregate]
   Läufe werden einzeln in tests/results/strategy-runs/ zwischengespeichert (Schlüssel: Job + Prüfsumme der Engine-Dateien),
   die Auswertung landet in tests/results/strategy.json. Bericht: node tools/report.js */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const ROOT = path.join(__dirname, '..', '..');
const V201 = process.env.PT_V201 || path.join(ROOT, '..', 'wt-v201');
const RUNS = path.join(ROOT, 'tests', 'results', 'strategy-runs');

if (!isMainThread) {
  const HS = require('./harness.js'), j = workerData;
  const t0 = Date.now(), r = HS.runMatch(j.opts);
  r.wallMs = Date.now() - t0;
  parentPort.postMessage(r);
  return;
}
const { blockBootstrap, pairRuns, perHandSd } = require('./bootstrap.js');
const ENV_MODULES = ['core', 'evaluator', 'preflop-data', 'rules', 'ranges', 'equity', 'stats', 'bots', 'session'];
const COACH_MODULES = ['core', 'evaluator', 'preflop-data', 'rules', 'ranges', 'equity', 'stats', 'bots', 'session', 'ev', 'cfr', 'coach'];
function hashFiles(root, mods) { const h = crypto.createHash('sha256'); mods.forEach(m => { const f = path.join(root, 'assets', 'js', 'engine', m + '.js'); if (fs.existsSync(f)) h.update(fs.readFileSync(f)); }); return h.digest('hex').slice(0, 12); }
function version(root) { const m = /PT\.VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(root, 'assets', 'js', 'engine', 'core.js'), 'utf8')); return m ? m[1] : '?'; }

const HEROES = {
  'coach21': { kind: 'coach', root: ROOT, mode: 'exploit', name: 'Coach 2.1 (exploitativ)' },
  'coach201': { kind: 'coach', root: V201, mode: 'exploit', name: 'Coach 2.0.1 (exploitativ)' },
  'coach21-gto': { kind: 'coach', root: ROOT, mode: 'gto', name: 'Coach 2.1 (gleichgewichtsnah)' },
  'coach21-rein': { kind: 'coach', root: ROOT, mode: 'exploit', popBlend: 0, name: 'Coach 2.1, reines Populationsmodell (Entwicklungsvariante)' },
  'coach201-gto': { kind: 'coach', root: V201, mode: 'gto', name: 'Coach 2.0.1 (gleichgewichtsnah)' },
  'bot': { kind: 'bot', id: 'g004', name: 'Gegner-KI als Held (Profil g004, Stil ausgeglichen)' },
  'potodds': { kind: 'potodds', name: 'Referenz: Pot-Odds-Schwelle' },
  'pushfold': { kind: 'pushfold', name: 'Referenz: Push/Fold-Chart (≤ 20 BB), sonst Pot-Odds-Schwelle' }
};
const COMP_NAME = { 'bots|gemischt': 'Gegner-KI, gemischt', 'bots|anfaenger': 'Gegner-KI, Anfänger', 'bots|experte': 'Gegner-KI, Experte', 'bots|fortgeschritten': 'Gegner-KI, Fortgeschritten',
  'mixed|gemischt': 'halb Gegner-KI, halb synthetisch', 'synth|gemischt': 'nur synthetische Strategien (gemischt)' };
['maniac', 'station', 'rock', 'mdf', 'random', 'switcher'].forEach(k => { COMP_NAME['synth:' + k + '|gemischt'] = 'synthetisch: ' + { maniac: 'Maniac', station: 'Calling Station', rock: 'Rock', mdf: 'MDF-Verteidiger', random: 'zufällig-legal', switcher: 'Stilwechsler' }[k]; });

/** Pläne. Seeds sind vor den Läufen festgelegt; Entwicklungsläufe nutzen andere Seeds als der Hauptvergleich. */
function plan(name) {
  const jobs = [];
  const add = (group, heroes, cond, seeds, hands) => seeds.forEach(sd => heroes.forEach(hk => jobs.push({ group, hero: hk, comp: cond.comp, difficulty: cond.difficulty, startBB: cond.startBB, seed: sd, hands })));
  // Läufe zu je 2.500 Händen (Zwischenspeicherung je Lauf; ein Neustart wiederholt höchstens die laufenden Jobs).
  // Reihenfolge: zuerst die gepaarten Coach-Läufe des Hauptvergleichs, Seed für Seed, damit Teilergebnisse ausgewogen sind.
  if (name === 'haupt') {
    const STACKS = [40, 100, 200], COMPS = [['bots', 'gemischt'], ['bots', 'anfaenger'], ['bots', 'experte'], ['mixed', 'gemischt']], H = 2500;
    const conds = []; STACKS.forEach(sb => COMPS.forEach(([c, d]) => conds.push({ comp: c, difficulty: d, startBB: sb })));
    for (let si = 1; si <= 4; si++) conds.forEach((cd, ci) => add('zentral', ['coach21', 'coach201'], cd, [1000 + (ci + 1) * 10 + si], H));
    for (let si = 1; si <= 4; si++) conds.forEach((cd, ci) => add('zentral', ['bot', 'potodds'], cd, [1000 + (ci + 1) * 10 + si], H));
    ['maniac', 'station', 'rock', 'mdf', 'random', 'switcher'].forEach((k, i) => add('unbekannt', ['coach21', 'coach201', 'bot'], { comp: 'synth:' + k, difficulty: 'gemischt', startBB: 100 }, [2001 + 10 * i, 2002 + 10 * i], H));
    add('kurz', ['coach21', 'coach201', 'pushfold'], { comp: 'bots', difficulty: 'gemischt', startBB: 15 }, [3001, 3002, 3003], H);
    add('gto', ['coach21-gto', 'coach201-gto'], { comp: 'bots', difficulty: 'gemischt', startBB: 100 }, [4001, 4002], H);
  } else if (name === 'entwicklung') {
    add('zentral', ['coach21', 'coach201', 'coach21-rein'], { comp: 'bots', difficulty: 'gemischt', startBB: 100 }, [7001, 7002], 2500);
    add('zentral', ['coach21', 'coach201', 'coach21-rein'], { comp: 'mixed', difficulty: 'gemischt', startBB: 40 }, [7011], 2500);
    add('zentral', ['coach21', 'coach201', 'coach21-rein'], { comp: 'bots', difficulty: 'experte', startBB: 200 }, [7021], 2500);
  } else if (name === 'pruefb') {
    // Prüfer B: kleiner gepaarter Vergleich neu gegen alt; mit PT_V201=<Arbeitsbaum vor den Korrekturen> steht „coach201“ für den alten Stand
    add('zentral', ['coach21', 'coach201'], { comp: 'bots', difficulty: 'gemischt', startBB: 100 }, [7101, 7102], 2500);
    add('zentral', ['coach21', 'coach201'], { comp: 'mixed', difficulty: 'gemischt', startBB: 40 }, [7111], 2500);
  } else if (name === 'pruefb40') {
    // Nachprüfung der 40-BB-Bedingung (halb synthetisch) mit weiteren Seeds
    add('zentral', ['coach21', 'coach201'], { comp: 'mixed', difficulty: 'gemischt', startBB: 40 }, [7112, 7113], 2500);
  } else {
    add('zentral', ['coach21', 'coach201', 'bot'], { comp: 'bots', difficulty: 'gemischt', startBB: 100 }, [9001], 400);
    add('unbekannt', ['coach21', 'coach201'], { comp: 'synth:station', difficulty: 'gemischt', startBB: 100 }, [9002], 300);
  }
  return jobs;
}
const condKey = j => j.comp + '|' + j.difficulty + '|' + j.startBB;
const jobId = j => [j.group, j.hero, j.comp.replace(':', '-'), j.difficulty, j.startBB + 'BB', 's' + j.seed, j.hands].join('_');

async function main() {
  const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
  const planName = opt('plan') || 'schnell', nJobs = +(opt('jobs') || 2), only = opt('only');
  fs.mkdirSync(RUNS, { recursive: true });
  if (!fs.existsSync(path.join(V201, 'assets', 'js', 'engine', 'coach.js'))) throw new Error('Coach 2.0.1 fehlt: git -C <repo> worktree add ' + V201 + ' sicherung-2.0.1');
  const envHash = hashFiles(ROOT, ENV_MODULES), hashes = { [ROOT]: hashFiles(ROOT, COACH_MODULES), [V201]: hashFiles(V201, COACH_MODULES) };
  const jobs = plan(planName).filter(j => !only || jobId(j).indexOf(only) >= 0);
  const keyOf = j => { const H = HEROES[j.hero]; return { env: envHash, coach: H.kind === 'coach' ? hashes[H.root] : null }; };
  const fileOf = j => path.join(RUNS, jobId(j) + '.json');
  const cached = j => { try { const r = JSON.parse(fs.readFileSync(fileOf(j), 'utf8')), k = keyOf(j); return r.key && r.key.env === k.env && r.key.coach === k.coach ? r : null; } catch (e) { return null; } };
  const todo = args.includes('--aggregate') ? [] : jobs.filter(j => !cached(j));
  console.log('Plan ' + planName + ': ' + jobs.length + ' Läufe, davon ' + todo.length + ' neu, ' + nJobs + ' parallel');
  const t0 = Date.now(); let done = 0;
  await new Promise((resolve, reject) => {
    let next = 0, active = 0;
    const launch = () => {
      if (next >= todo.length && active === 0) return resolve();
      while (active < nJobs && next < todo.length) {
        const j = todo[next++], H = HEROES[j.hero]; active++;
        const w = new Worker(__filename, { workerData: { opts: { seed: j.seed, hands: j.hands, startBB: j.startBB, difficulty: j.difficulty, comp: j.comp, hero: H } } });
        w.on('message', r => { r.job = j; r.key = keyOf(j); r.id = jobId(j); fs.writeFileSync(fileOf(j), JSON.stringify(r)); done++;
          console.log('[' + done + '/' + todo.length + '] ' + r.id + ': ' + (r.sumBBAdj / r.hands * 100).toFixed(1) + ' BB/100 (bereinigt), ' + Math.round(r.wallMs / 1000) + ' s, gesamt ' + Math.round((Date.now() - t0) / 1000) + ' s'); });
        w.on('error', e => { console.error('Fehler in ' + jobId(j) + ': ' + e.stack); });
        w.on('exit', () => { active--; launch(); });
      }
    };
    launch();
  });
  aggregate(planName, jobs.map(j => cached(j)).filter(Boolean), { envHash, hashes });
}

/** Auswertung: absolute Ergebnisse je Held und Bedingung, gepaarte Vergleiche mit Block-Bootstrap, Kennzeichnung geteilter Läufe */
function aggregate(planName, runs, h) {
  const L = 500, B = 2000;
  const byHero = {}; runs.forEach(r => { (byHero[r.job.hero] = byHero[r.job.hero] || []).push(r); });
  const metric = (r, adj) => ({ blocks: adj ? r.blocksAdj : r.blocks, hands: r.hands, partialLast: r.partialLast });
  const summary = (list, adj, seed) => { const bs = blockBootstrap(list.map(r => metric(r, adj)), L, B, seed); return { bb100: +bs.bb100.toFixed(2), lo: +bs.lo.toFixed(2), hi: +bs.hi.toFixed(2), se: +bs.se.toFixed(2), hands: bs.hands, blocks: bs.nBlocks }; };
  const decisions = list => list.reduce((s, r) => s + r.decisions, 0), invalid = list => list.reduce((s, r) => s + r.invalid, 0);
  // Absolute Ergebnisse je Lauf und je Held/Bedingung
  const runTable = runs.map(r => ({ id: r.id, group: r.job.group, hero: r.job.hero, cond: condKey(r.job), seed: r.job.seed, hands: r.hands, decisions: r.decisions, invalid: r.invalid,
    bb100: +(r.sumBB / r.hands * 100).toFixed(2), bb100Adj: +(r.sumBBAdj / r.hands * 100).toFixed(2), sdHand: +(perHandSd(r, false) || 0).toFixed(2), sdHandAdj: +(perHandSd(r, true) || 0).toFixed(2),
    allinHands: r.allinHands, avgMs: r.decisions ? +(r.ms / r.decisions).toFixed(1) : null, maxMs: +r.maxMs.toFixed(0), maxIters: r.maxIters, labels: r.labels, preLabels: r.preLabels, classes: r.classes,
    chartApplied: r.chartApplied, chartGapBB: +r.chartGapBB.toFixed(2), wallMs: r.wallMs, usedIn: [] }));
  const runById = {}; runTable.forEach(x => { runById[x.id] = x; });
  const absolute = [];
  const groups = {}; runs.forEach(r => { const k = r.job.group + '|' + r.job.hero + '|' + condKey(r.job); (groups[k] = groups[k] || []).push(r); });
  Object.keys(groups).sort().forEach((k, i) => { const list = groups[k], j = list[0].job;
    absolute.push({ group: j.group, hero: j.hero, heroName: HEROES[j.hero].name, cond: condKey(j), condName: (COMP_NAME[j.comp + '|' + j.difficulty] || j.comp) + ', ' + j.startBB + ' BB', startBB: j.startBB,
      runs: list.map(r => r.id), seeds: list.map(r => r.job.seed), adj: summary(list, true, 100 + i), raw: summary(list, false, 100 + i), decisions: decisions(list), invalid: invalid(list) }); });
  // Gepaarte Vergleiche
  const comparisons = [];
  function compare(id, title, group, a, b, splitBy) {
    const pairs = [];
    runs.filter(r => r.job.group === group && r.job.hero === a).forEach(ra => {
      const rb = runs.filter(r => r.job.group === group && r.job.hero === b && condKey(r.job) === condKey(ra.job) && r.job.seed === ra.job.seed && r.job.hands === ra.job.hands)[0];
      if (rb) pairs.push([ra, rb]);
    });
    if (!pairs.length) return;
    pairs.forEach(([ra, rb]) => { runById[ra.id].usedIn.push(id); runById[rb.id].usedIn.push(id); });
    const one = (ps, adj, sd) => { const bs = blockBootstrap(ps.map(([ra, rb]) => pairRuns(metric(ra, adj), metric(rb, adj))), L, B, sd);
      return { diff: +bs.bb100.toFixed(2), lo: +bs.lo.toFixed(2), hi: +bs.hi.toFixed(2), se: +bs.se.toFixed(2), hands: bs.hands, pairs: ps.length, blocks: bs.nBlocks }; };
    const res = { id, title, group, a, b, aName: HEROES[a].name, bName: HEROES[b].name, adj: one(pairs, true, 7), raw: one(pairs, false, 7), decisionsA: decisions(pairs.map(p => p[0])), decisionsB: decisions(pairs.map(p => p[1])),
      invalidA: invalid(pairs.map(p => p[0])), invalidB: invalid(pairs.map(p => p[1])), seeds: [...new Set(pairs.map(p => p[0].job.seed))], runsA: pairs.map(p => p[0].id), runsB: pairs.map(p => p[1].id) };
    res.verdict = res.adj.blocks < 20 ? 'zu wenig Blöcke' : res.adj.lo > 0 ? 'belegt besser' : res.adj.hi < 0 ? 'belegt schlechter' : 'nicht belegt';
    res.aAhead = pairs.filter(([ra, rb]) => ra.sumBBAdj > rb.sumBBAdj).length;
    res.split = {};
    (splitBy || []).forEach(key => {
      const parts = {}; pairs.forEach(p => { const v = key === 'stack' ? p[0].job.startBB + ' BB' : key === 'comp' ? (COMP_NAME[p[0].job.comp + '|' + p[0].job.difficulty] || p[0].job.comp) : condKey(p[0].job); (parts[v] = parts[v] || []).push(p); });
      res.split[key] = Object.keys(parts).sort((x, y) => key === 'stack' ? parseFloat(x) - parseFloat(y) : x < y ? -1 : x > y ? 1 : 0).map((v, i) => Object.assign({ value: v }, one(parts[v], true, 31 + i), { rawDiff: one(parts[v], false, 31 + i).diff, aAhead: parts[v].filter(([ra, rb]) => ra.sumBBAdj > rb.sumBBAdj).length }));
    });
    comparisons.push(res);
  }
  compare('v21-v201', 'Coach 2.1 gegen Coach 2.0.1 (Hauptvergleich)', 'zentral', 'coach21', 'coach201', ['stack', 'comp', 'cond']);
  compare('v21-bot', 'Coach 2.1 gegen Gegner-KI als Held', 'zentral', 'coach21', 'bot', ['stack', 'comp']);
  compare('v201-bot', 'Coach 2.0.1 gegen Gegner-KI als Held', 'zentral', 'coach201', 'bot', ['stack', 'comp']);
  compare('v21-potodds', 'Coach 2.1 gegen Referenz Pot-Odds-Schwelle', 'zentral', 'coach21', 'potodds', ['stack', 'comp']);
  compare('v21-v201-unbekannt', 'Coach 2.1 gegen Coach 2.0.1, dem Coach unbekannte Gegnerstrategien', 'unbekannt', 'coach21', 'coach201', ['comp']);
  compare('v21-bot-unbekannt', 'Coach 2.1 gegen Gegner-KI als Held, unbekannte Gegnerstrategien', 'unbekannt', 'coach21', 'bot', ['comp']);
  compare('v21-v201-kurz', 'Coach 2.1 gegen Coach 2.0.1, 15 BB', 'kurz', 'coach21', 'coach201', []);
  compare('v21-pushfold', 'Coach 2.1 gegen Referenz Push/Fold, 15 BB', 'kurz', 'coach21', 'pushfold', []);
  compare('v21-v201-gto', 'Coach 2.1 gegen 2.0.1, gleichgewichtsnaher Modus', 'gto', 'coach21-gto', 'coach201-gto', []);
  compare('rein-v201', 'Entwicklung: reines Populationsmodell gegen 2.0.1', 'zentral', 'coach21-rein', 'coach201', []);
  compare('v21-rein', 'Entwicklung: gemittelt gegen reines Populationsmodell', 'zentral', 'coach21', 'coach21-rein', []);
  // Läufe, die in mehreren Vergleichen vorkommen, sind dort keine unabhängigen Stichproben
  const shared = runTable.filter(x => x.usedIn.length > 1).map(x => ({ id: x.id, hero: x.hero, usedIn: x.usedIn }));
  comparisons.forEach(c => { c.sharedRuns = c.runsB.concat(c.runsA).filter(id => runById[id].usedIn.length > 1); c.sharedWith = [...new Set(c.sharedRuns.flatMap(id => runById[id].usedIn))].filter(x => x !== c.id); });
  const file = path.join(ROOT, 'tests', 'results', planName === 'haupt' ? 'strategy.json' : 'strategy-' + planName + '.json');
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* neu */ }
  const out = Object.assign(prev, { app: version(ROOT), date: new Date().toISOString(), node: process.version, cpus: os.cpus().length, plan: planName,
    method: { primary: 'All-in-bereinigte BB/100 (unverzerrt, vor den Hauptläufen festgelegt); Rohwerte zusätzlich', bootstrap: { blockHands: L, reps: B, stratified: 'je Lauf' }, verdict: 'belegt, wenn das 95-%-Intervall der Differenz ganz über 0 liegt',
      stacks: 'Alle Stacks werden vor jeder Hand auf die Starttiefe gesetzt', clock: 'Uhr im Coach-Kontext fest (keine Zeitbremse), Rechenzeit außerhalb gemessen', streams: 'Karten: deal; Gegner: bots; Tisch/Rotation: tisch; Coach: Tisch-Seed|Hand|Aktionszahl' },
    versions: { v21: { root: path.relative(ROOT, ROOT) || '.', version: version(ROOT), coachHash: h.hashes[ROOT] }, v201: { root: V201, version: version(V201), coachHash: h.hashes[V201] }, envHash: h.envHash },
    heroes: Object.fromEntries(Object.entries(HEROES).map(([k, v]) => [k, v.name])), runs: runTable, absolute, comparisons, shared,
    totals: { runs: runs.length, hands: runs.reduce((s, r) => s + r.hands, 0), coachDecisions: runs.filter(r => HEROES[r.job.hero].kind === 'coach').reduce((s, r) => s + r.decisions, 0),
      invalidCoach: runs.filter(r => HEROES[r.job.hero].kind === 'coach').reduce((s, r) => s + r.invalid, 0), cpuSeconds: Math.round(runs.reduce((s, r) => s + (r.wallMs || 0), 0) / 1000) } });
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  console.log('Auswertung: ' + file);
  comparisons.forEach(c => console.log(c.title + ': ' + c.adj.diff + ' BB/100 [' + c.adj.lo + '; ' + c.adj.hi + '] (' + c.adj.hands + ' Hände, roh ' + c.raw.diff + ') → ' + c.verdict));
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { plan, HEROES, jobId };
