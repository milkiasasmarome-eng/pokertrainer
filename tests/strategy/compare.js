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
const V210 = process.env.PT_V210 || path.join(ROOT, '..', 'wt-v210');   // 2.2: Coach 2.1.0 und unveränderte Gegner-KI 2.1 (Referenzumgebung)
const V220 = process.env.PT_V220 || path.join(ROOT, '..', 'wt-v220');   // 2.3: gesicherter Stand 2.2.0
const ENV_ROOT = { neu: ROOT, ref: V210 };
const RUNS = path.join(ROOT, 'tests', 'results', 'strategy-runs');

if (!isMainThread) {
  const HS = require('./harness.js'), j = workerData;
  if (j.opts.group) j.opts.pool = require('./groups.js').make(HS.PT)[j.opts.group];
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
  'coach22': { kind: 'coach', root: ROOT, mode: 'exploit', name: 'Coach 2.2 (exploitativ)' },
  'coach22-gto': { kind: 'coach', root: ROOT, mode: 'gto', name: 'Coach 2.2 (gleichgewichtsnah)' },
  // 2.3 abschließende Helden (Plan v23): Produktstand und die drei Varianten mit ausdrücklichen Schaltern
  'coach23': { kind: 'coach', root: ROOT, mode: 'exploit', name: 'Coach 2.3 (exploitativ)' },
  'coach23-gto': { kind: 'coach', root: ROOT, mode: 'gto', name: 'Coach 2.3 (gleichgewichtsnah)' },
  'fA': { kind: 'coach', root: ROOT, mode: 'exploit', abl: { rangeLegacy: true, respLegacy: true, hybrid: false }, name: 'Robustes Basismodell (A)' },
  'fB': { kind: 'coach', root: ROOT, mode: 'exploit', abl: { hybrid: false }, name: 'Adaptives Modell (B)' },
  'fC': { kind: 'coach', root: ROOT, mode: 'exploit', abl: { hybrid: true }, name: 'Hybrides Modell (C)' },
  // 2.3 Strategievarianten (Arbeitspaket 3): A robust (Range und Reaktion 2.1, keine Tabellenanpassung), B adaptiv (Tabellen wie 2.2), C hybrid
  'varA': { kind: 'coach', root: ROOT, mode: 'exploit', abl: { rangeLegacy: true, respLegacy: true }, name: 'Variante A: robustes Basismodell' },
  'varB': { kind: 'coach', root: ROOT, mode: 'exploit', abl: {}, name: 'Variante B: adaptives Modell' },
  'varC': { kind: 'coach', root: ROOT, mode: 'exploit', abl: { hybrid: true }, name: 'Variante C: kontrolliertes hybrides Modell' },
  'varS': { kind: 'coach', root: ROOT, mode: 'exploit', abl: { respLegacy: true }, name: 'Variante S: Tabellen-Range, Reaktionsmodell 2.1 (aus der Ablation)' },
  'varC2': { kind: 'coach', root: ROOT, mode: 'exploit', abl: { hybrid: true, respLegacy: true }, name: 'Variante C2: hybride Range, Reaktionsmodell 2.1' },
  // 2.3 Ablation (Arbeitspaket 1): Coach 2.2 mit einzelnen Komponenten im Stand 2.1
  'abl-R': { kind: 'coach', root: ROOT, mode: 'exploit', abl: { rangeLegacy: true }, name: 'Ablation: Range-Eingrenzung 2.1' },
  'abl-S': { kind: 'coach', root: ROOT, mode: 'exploit', abl: { respLegacy: true }, name: 'Ablation: Reaktionsmodell 2.1' },
  'abl-A': { kind: 'coach', root: ROOT, mode: 'exploit', abl: { noAdapt: true }, name: 'Ablation: ohne Gegneranpassung der Tabelle' },
  'abl-D': { kind: 'coach', root: ROOT, mode: 'exploit', abl: { dataHands: true }, name: 'Ablation: Datenlage nach Händen (2.1)' },
  'abl-RS': { kind: 'coach', root: ROOT, mode: 'exploit', abl: { rangeLegacy: true, respLegacy: true }, name: 'Ablation: Range und Reaktion 2.1' },
  'abl-RSD': { kind: 'coach', root: ROOT, mode: 'exploit', abl: { rangeLegacy: true, respLegacy: true, dataHands: true }, name: 'Ablation: Range, Reaktion, Datenlage 2.1' },
  'coach220': { kind: 'coach', root: V220, mode: 'exploit', name: 'Coach 2.2.0 (exploitativ)' },
  'coach220-gto': { kind: 'coach', root: V220, mode: 'gto', name: 'Coach 2.2.0 (gleichgewichtsnah)' },
  'coach210': { kind: 'coach', root: V210, mode: 'exploit', name: 'Coach 2.1.0 (exploitativ)' },
  'coach210-gto': { kind: 'coach', root: V210, mode: 'gto', name: 'Coach 2.1.0 (gleichgewichtsnah)' },
  'bot': { kind: 'bot', id: 'g004', name: 'Gegner-KI als Held (Profil g004, Stil ausgeglichen)' },
  'potodds': { kind: 'potodds', name: 'Referenz: Pot-Odds-Schwelle' },
  'pushfold': { kind: 'pushfold', name: 'Referenz: Push/Fold-Chart (≤ 20 BB), sonst Pot-Odds-Schwelle' }
};
const COMP_NAME = { 'bots|gemischt': 'Gegner-KI, gemischt', 'bots|anfaenger': 'Gegner-KI, Anfänger', 'bots|experte': 'Gegner-KI, Experte', 'bots|fortgeschritten': 'Gegner-KI, Fortgeschritten',
  'mixed|gemischt': 'halb Gegner-KI, halb synthetisch', 'synth|gemischt': 'nur synthetische Strategien (gemischt)' };
['maniac', 'station', 'rock', 'mdf', 'random', 'switcher'].forEach(k => { COMP_NAME['synth:' + k + '|gemischt'] = 'synthetisch: ' + { maniac: 'Maniac', station: 'Calling Station', rock: 'Rock', mdf: 'MDF-Verteidiger', random: 'zufällig-legal', switcher: 'Stilwechsler' }[k]; });
['polar', 'sizetell', 'trapper', 'ipaggro', 'nitlag', 'minraiser'].forEach(k => { COMP_NAME['final:' + k + '|gemischt'] = 'abschließend unbekannt: ' + { polar: 'Polarisierer', sizetell: 'umgekehrtes Größensignal', trapper: 'Fallensteller', ipaggro: 'Positionsspieler', nitlag: 'eng preflop, aggressiv postflop', minraiser: 'Minraiser' }[k]; });

/** Pläne. Seeds sind vor den Läufen festgelegt; Entwicklungsläufe nutzen andere Seeds als der Hauptvergleich. */
function plan(name) {
  const jobs = [];
  const add = (group, heroes, cond, seeds, hands) => seeds.forEach(sd => heroes.forEach(hk => jobs.push({ group, hero: hk, comp: cond.comp, difficulty: cond.difficulty, startBB: cond.startBB, seed: sd, hands })));
  // Läufe zu je 2.500 Händen (Zwischenspeicherung je Lauf; ein Neustart wiederholt höchstens die laufenden Jobs).
  // Reihenfolge: zuerst die gepaarten Coach-Läufe des Hauptvergleichs, Seed für Seed, damit Teilergebnisse ausgewogen sind.
  if (name === 'v23') {
    // 2.3: vor den Läufen festgelegt (docs/ABNAHMEKRITERIEN_2.3.md). Seeds 23501 ff. kommen in keiner Entwicklung vor.
    const G = (group, heroes, cond, seeds, env) => seeds.forEach(sd => heroes.forEach(hk => jobs.push({ group, hero: hk, comp: cond.comp, difficulty: 'gemischt', startBB: cond.startBB || 100, seed: sd, hands: 2500, env: env || 'neu', pool: cond.pool || null })));
    const range = (a, n) => Array.from({ length: n }, (_, i) => a + i);
    const SUB = (process.env.PT_V23_S4 || 'fA,fB,fC,coach201,coach220').split(',').filter(Boolean);   // Variante gleich dem Produktstand wird ausgelassen (identisches Spiel)
    for (let i = 0; i < 40; i++) { G('pF', ['coach23', 'coach210'], { comp: 'f23' }, [23501 + i]); G('pK', ['coach23', 'coach210'], { comp: 'bots' }, [23601 + i]);
      if (i < 6) { G('pF', SUB, { comp: 'f23' }, [23501 + i]); G('pK', SUB, { comp: 'bots' }, [23601 + i]); } }
    G('pT', ['coach23', 'coach210'], { comp: 'bots', pool: 'T' }, range(23701, 10));
    G('pG', ['coach23-gto', 'coach201-gto'], { comp: 'bots' }, range(23801, 16));
    G('sRef', ['coach23', 'coach210'], { comp: 'bots' }, range(23901, 8), 'ref');
    ['polar', 'sizetell', 'trapper', 'ipaggro', 'nitlag', 'minraiser'].forEach((k, i) => G('sReg', ['coach23', 'coach210'], { comp: 'final:' + k }, [23951 + i]));
    [15, 25].forEach((sb, i) => G('sKurz', ['coach23', 'coach210'].concat(sb === 15 ? ['pushfold'] : []), { comp: 'bots', startBB: sb }, range(23971 + 10 * i, 4)));
  }
  if (name === 'sel23') {
    // 2.3 Modellwahl (docs/ABNAHMEKRITERIEN_2.3.md): Validierungsgruppen Va23 (unbekannte Strategien) und Gegner-KI V; dazu beschreibend das Regressionsset.
    const G = (group, heroes, cond, seeds) => seeds.forEach(sd => heroes.forEach(hk => jobs.push({ group, hero: hk, comp: cond.comp, difficulty: 'gemischt', startBB: 100, seed: sd, hands: 2500, env: 'neu', pool: cond.pool || null })));
    const HS = ['varA', 'varB', 'varC', 'coach210', 'varS', 'varC2'];
    G('selVa', HS, { comp: 'p23:Va' }, [23201, 23202, 23203, 23204, 23205, 23206]);
    G('selV', HS, { comp: 'bots', pool: 'V' }, [23211, 23212, 23213, 23214]);
    ['polar', 'trapper', 'ipaggro'].forEach((k, i) => G('selReg', HS, { comp: 'final:' + k }, [23221 + i]));
  }
  if (name === 'abl23') {
    // 2.3 Arbeitspaket 1: Ablation. Seeds 23001 ff. nur für diese Studie. Regressionsset = frühere FINAL-Strategien (nicht mehr unberührt).
    const G = (group, heroes, cond, seeds) => seeds.forEach(sd => heroes.forEach(hk => jobs.push({ group, hero: hk, comp: cond.comp, difficulty: 'gemischt', startBB: 100, seed: sd, hands: 2500, env: 'neu', pool: cond.pool || null })));
    const HS = ['coach22', 'abl-R', 'abl-S', 'abl-A', 'abl-D', 'abl-RS', 'abl-RSD', 'coach210'];
    ['polar', 'sizetell', 'trapper', 'ipaggro', 'nitlag', 'minraiser'].forEach((k, i) => G('a1final', HS, { comp: 'final:' + k }, [23001 + i]));
    G('a1V', HS, { comp: 'bots', pool: 'V' }, [23101, 23102, 23103, 23104]);
  }
  if (name === 'v23' || name === 'sel23' || name === 'abl23') { /* Pläne 2.3 oben */ } else if (name === 'v22') {
    // 2.2: Plan vor den Läufen festgelegt (docs/ABNAHMEKRITERIEN_2.2.md). Seeds 22001 ff. kommen in keiner Entwicklung vor.
    const G = (group, heroes, cond, seeds, env) => seeds.forEach(sd => heroes.forEach(hk => jobs.push({ group, hero: hk, comp: cond.comp, difficulty: cond.difficulty, startBB: cond.startBB, seed: sd, hands: 2500, env: env || 'neu', pool: cond.pool || null })));
    const range = (a, n) => Array.from({ length: n }, (_, i) => a + i);
    const B100 = { comp: 'bots', difficulty: 'gemischt', startBB: 100 };
    G('h1', ['coach22', 'coach210'], B100, range(22001, 20));
    G('h2ref', ['coach22', 'coach210'], B100, range(22101, 6), 'ref');
    ['polar', 'sizetell', 'trapper', 'ipaggro', 'nitlag', 'minraiser'].forEach((k, i) => G('h4final', ['coach22', 'coach210', 'coach201'], { comp: 'final:' + k, difficulty: 'gemischt', startBB: 100 }, [22301 + i]));
    G('h6gto', ['coach22-gto', 'coach210-gto', 'coach201-gto'], B100, range(22501, 4));
    [15, 25, 40, 200].forEach((sb, i) => G('h5stack', ['coach22', 'coach210'].concat(sb === 15 ? ['pushfold'] : []), { comp: 'bots', difficulty: 'gemischt', startBB: sb }, [22401 + 10 * i, 22402 + 10 * i]));
    G('h3T', ['coach22', 'coach210'], { comp: 'bots', difficulty: 'gemischt', startBB: 100, pool: 'T' }, range(22201, 3));
    G('h1', ['coach201', 'bot'], B100, range(22001, 4));
    G('h1', ['coach22', 'coach210'], B100, range(22021, 20));
  } else if (name === 'haupt') {
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
const condKey = j => j.comp + '|' + j.difficulty + '|' + j.startBB + (j.pool ? '|' + j.pool : '') + (j.env && j.env !== 'neu' ? '|' + j.env : '');
const jobId = j => [j.group, j.hero, j.comp.replace(':', '-'), j.difficulty, j.startBB + 'BB'].concat(j.pool ? ['pool' + j.pool] : [], j.env && j.env !== 'neu' ? ['env' + j.env] : [], ['s' + j.seed, j.hands]).join('_');

async function main() {
  const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
  const planName = opt('plan') || 'schnell', nJobs = +(opt('jobs') || 2), only = opt('only');
  fs.mkdirSync(RUNS, { recursive: true });
  if (!fs.existsSync(path.join(V201, 'assets', 'js', 'engine', 'coach.js'))) throw new Error('Coach 2.0.1 fehlt: git -C <repo> worktree add ' + V201 + ' sicherung-2.0.1');
  const envHash = hashFiles(ROOT, ENV_MODULES), hashes = { [ROOT]: hashFiles(ROOT, COACH_MODULES), [V201]: hashFiles(V201, COACH_MODULES) };
  if (fs.existsSync(path.join(V210, 'assets'))) hashes[V210] = hashFiles(V210, COACH_MODULES);
  if (fs.existsSync(path.join(V220, 'assets'))) hashes[V220] = hashFiles(V220, COACH_MODULES);
  const envHashOf = j => j.env === 'ref' ? 'ref-' + hashFiles(V210, ENV_MODULES) : envHash;
  const jobs = plan(planName).filter(j => !only || jobId(j).indexOf(only) >= 0);
  const keyOf = j => { const H = HEROES[j.hero]; return { env: envHashOf(j), coach: H.kind === 'coach' ? hashes[H.root] + (H.abl ? '|' + JSON.stringify(H.abl) : '') : null }; };
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
        const w = new Worker(__filename, { env: Object.assign({}, process.env, { PT_ENV_ROOT: ENV_ROOT[j.env || 'neu'] }), workerData: { opts: { seed: j.seed, hands: j.hands, startBB: j.startBB, difficulty: j.difficulty, comp: j.comp, hero: H, group: j.pool || undefined } } });
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
  function compare(id, title, group, a, b, splitBy, niDelta) {
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
    if (niDelta != null) { const bs = blockBootstrap(pairs.map(([ra, rb]) => pairRuns(metric(ra, true), metric(rb, true))), L, 10000, 11, [-niDelta]);
      res.ni = { delta: niDelta, lo: +bs.lo.toFixed(2), p: bs.pLE[-niDelta], verdict: bs.nBlocks < 20 ? 'zu wenig Blöcke' : bs.lo > -niDelta ? 'nicht unterlegen' : 'Nichtunterlegenheit nicht belegt', seeds: new Set(pairs.map(p => p[0].job.seed)).size }; }
    res.verdict = res.adj.blocks < 20 ? 'zu wenig Blöcke' : res.adj.lo > 0 ? 'belegt besser' : res.adj.hi < 0 ? 'belegt schlechter' : 'nicht belegt';
    res.aAhead = pairs.filter(([ra, rb]) => ra.sumBBAdj > rb.sumBBAdj).length;
    res.split = {};
    (splitBy || []).forEach(key => {
      const parts = {}; pairs.forEach(p => { const v = key === 'stack' ? p[0].job.startBB + ' BB' : key === 'comp' ? (COMP_NAME[p[0].job.comp + '|' + p[0].job.difficulty] || p[0].job.comp) : condKey(p[0].job); (parts[v] = parts[v] || []).push(p); });
      res.split[key] = Object.keys(parts).sort((x, y) => key === 'stack' ? parseFloat(x) - parseFloat(y) : x < y ? -1 : x > y ? 1 : 0).map((v, i) => Object.assign({ value: v }, one(parts[v], true, 31 + i), { rawDiff: one(parts[v], false, 31 + i).diff, aAhead: parts[v].filter(([ra, rb]) => ra.sumBBAdj > rb.sumBBAdj).length }));
    });
    comparisons.push(res);
  }
  if (planName === 'v23') {
    const D = 5, DG = 8;
    const P = [['P1', 'pF', 'coach23', 'coach210', D, 'P1: Coach 2.3 gegen 2.1.0, neue abschließende Testgruppe F23'], ['P2', 'pK', 'coach23', 'coach210', D, 'P2: Coach 2.3 gegen 2.1.0, Gegner-KI 2.2 (ganzer Pool)'],
      ['P3', 'pT', 'coach23', 'coach210', D, 'P3: Coach 2.3 gegen 2.1.0, Gegner-KI Testgruppe T'], ['P4', 'pG', 'coach23-gto', 'coach201-gto', DG, 'P4: gleichgewichtsnah 2.3 gegen 2.0.1']];
    P.forEach(([id, g, a, b, d, t]) => compare(id, t, g, a, b, id === 'P1' ? ['comp'] : [], d));
    // Holm über P1–P4 (einseitige Nichtunterlegenheit)
    const ps = comparisons.filter(c => /^P\d$/.test(c.id)).sort((x, y) => x.ni.p - y.ni.p); let stop = false;
    ps.forEach((c, i) => { const lvl = 0.05 / (ps.length - i); c.ni.holmLevel = +lvl.toFixed(4); if (!stop && c.ni.p <= lvl) c.ni.holm = 'nicht unterlegen'; else { stop = true; c.ni.holm = 'nicht belegt'; } });
    compare('S1', 'S1: Coach 2.3 gegen 2.2.0, Gegner-KI 2.2', 'pK', 'coach23', 'coach220', []);
    compare('S2', 'S2: Coach 2.3 gegen 2.1.0, unveränderte Gegner-KI 2.1', 'sRef', 'coach23', 'coach210', [], D);
    compare('S3', 'S3: Coach 2.3 gegen 2.1.0, Regressionsset (frühere FINAL)', 'sReg', 'coach23', 'coach210', ['comp'], D);
    ['fA', 'fB', 'fC', 'coach201', 'coach220', 'coach210'].forEach(b => { compare('S4F-' + b, 'S4: Coach 2.3 gegen ' + HEROES[b].name + ', F23', 'pF', 'coach23', b, []); compare('S4K-' + b, 'S4: Coach 2.3 gegen ' + HEROES[b].name + ', Gegner-KI 2.2', 'pK', 'coach23', b, []); });
    compare('S5', 'S5: Coach 2.3 gegen 2.1.0, 15 und 25 BB', 'sKurz', 'coach23', 'coach210', ['stack']);
    compare('S6', 'S6: Coach 2.3 gegen Push/Fold-Referenz, 15 BB', 'sKurz', 'coach23', 'pushfold', []);
  }
  if (planName === 'sel23') {
    [['varA', 'coach210'], ['varB', 'coach210'], ['varC', 'coach210'], ['varS', 'coach210'], ['varC2', 'coach210'], ['varC', 'varB'], ['varC', 'varA'], ['varB', 'varA'], ['varS', 'varB'], ['varC2', 'varB']].forEach(([a, b]) => {
      compare('selVa-' + a + '-' + b, 'Modellwahl Va23: ' + HEROES[a].name + ' gegen ' + HEROES[b].name, 'selVa', a, b, []);
      compare('selV-' + a + '-' + b, 'Modellwahl Gegner-KI V: ' + HEROES[a].name + ' gegen ' + HEROES[b].name, 'selV', a, b, []);
      compare('selReg-' + a + '-' + b, 'Regressionsset: ' + HEROES[a].name + ' gegen ' + HEROES[b].name, 'selReg', a, b, ['comp']);
    });
  }
  if (planName === 'abl23') {
    ['abl-R', 'abl-S', 'abl-A', 'abl-D', 'abl-RS', 'abl-RSD', 'coach210'].forEach(b => {
      compare('a1final-' + b, 'Ablation, Regressionsset (frühere FINAL): Coach 2.2 gegen ' + HEROES[b].name, 'a1final', 'coach22', b, ['comp']);
      compare('a1V-' + b, 'Ablation, Validierungsgruppe V: Coach 2.2 gegen ' + HEROES[b].name, 'a1V', 'coach22', b, []);
    });
    ['abl-RSD'].forEach(b => { compare('a1final-210-' + b, 'Restprüfung Regressionsset: ' + HEROES[b].name + ' gegen 2.1.0', 'a1final', b, 'coach210', ['comp']); compare('a1V-210-' + b, 'Restprüfung V: ' + HEROES[b].name + ' gegen 2.1.0', 'a1V', b, 'coach210', []); });
  }
  if (planName === 'v22') {
    compare('h1', 'H1: Coach 2.2 gegen 2.1.0, Gegner-KI 2.2, gemischt, 100 BB (Hauptvergleich)', 'h1', 'coach22', 'coach210', []);
    compare('h1b-v201', 'Coach 2.2 gegen 2.0.1, Gegner-KI 2.2, 100 BB (Teilmenge der H1-Seeds)', 'h1', 'coach22', 'coach201', []);
    compare('h1b-bot', 'Coach 2.2 gegen Gegner-KI als Held, 100 BB (Teilmenge der H1-Seeds)', 'h1', 'coach22', 'bot', []);
    compare('h2ref', 'H2: Coach 2.2 gegen 2.1.0, unveränderte Gegner-KI 2.1 (Referenzumgebung), 100 BB', 'h2ref', 'coach22', 'coach210', []);
    compare('h3T', 'H3: Coach 2.2 gegen 2.1.0, nur Testgruppe T der Gegner-KI, 100 BB', 'h3T', 'coach22', 'coach210', []);
    compare('h4final', 'H4: Coach 2.2 gegen 2.1.0, abschließend unbekannte Strategien', 'h4final', 'coach22', 'coach210', ['comp']);
    compare('h4final-v201', 'Coach 2.2 gegen 2.0.1, abschließend unbekannte Strategien', 'h4final', 'coach22', 'coach201', ['comp']);
    compare('h5stack', 'H5: Coach 2.2 gegen 2.1.0, Stacktiefen 15/25/40/200 BB', 'h5stack', 'coach22', 'coach210', ['stack']);
    compare('h5pushfold', 'Coach 2.2 gegen Referenz Push/Fold, 15 BB', 'h5stack', 'coach22', 'pushfold', []);
    compare('h6gto-v201', 'H6: gleichgewichtsnah 2.2 gegen 2.0.1', 'h6gto', 'coach22-gto', 'coach201-gto', []);
    compare('h6gto-v210', 'gleichgewichtsnah 2.2 gegen 2.1.0', 'h6gto', 'coach22-gto', 'coach210-gto', []);
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
  h.envHash = (planName === 'v22' || planName === 'v23') ? { neu: h.envHash, ref: 'ref-' + hashFiles(V210, ENV_MODULES) } : h.envHash;
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* neu */ }
  const out = Object.assign(prev, { app: version(ROOT), date: new Date().toISOString(), node: process.version, cpus: os.cpus().length, plan: planName,
    method: { primary: 'All-in-bereinigte BB/100 (unverzerrt, vor den Hauptläufen festgelegt); Rohwerte zusätzlich', bootstrap: { blockHands: L, reps: B, stratified: 'je Lauf' }, verdict: 'belegt, wenn das 95-%-Intervall der Differenz ganz über 0 liegt',
      stacks: 'Alle Stacks werden vor jeder Hand auf die Starttiefe gesetzt', clock: 'Uhr im Coach-Kontext fest (keine Zeitbremse), Rechenzeit außerhalb gemessen', streams: 'Karten: deal; Gegner: bots; Tisch/Rotation: tisch; Coach: Tisch-Seed|Hand|Aktionszahl' },
    versions: { v21: { root: path.relative(ROOT, ROOT) || '.', version: version(ROOT), coachHash: h.hashes[ROOT] }, v210: fs.existsSync(V210) ? { root: V210, version: version(V210), coachHash: h.hashes[V210] } : null, v201: { root: V201, version: version(V201), coachHash: h.hashes[V201] }, envHash: h.envHash },
    heroes: Object.fromEntries(Object.entries(HEROES).map(([k, v]) => [k, v.name])), runs: runTable, absolute, comparisons, shared,
    totals: { runs: runs.length, hands: runs.reduce((s, r) => s + r.hands, 0), coachDecisions: runs.filter(r => HEROES[r.job.hero].kind === 'coach').reduce((s, r) => s + r.decisions, 0),
      invalidCoach: runs.filter(r => HEROES[r.job.hero].kind === 'coach').reduce((s, r) => s + r.invalid, 0), cpuSeconds: Math.round(runs.reduce((s, r) => s + (r.wallMs || 0), 0) / 1000) } });
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  console.log('Auswertung: ' + file);
  comparisons.forEach(c => console.log(c.title + ': ' + c.adj.diff + ' BB/100 [' + c.adj.lo + '; ' + c.adj.hi + '] (' + c.adj.hands + ' Hände, roh ' + c.raw.diff + ') → ' + c.verdict));
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { plan, HEROES, jobId };
