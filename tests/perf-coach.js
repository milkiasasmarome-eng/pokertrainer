/* PokerTrainer – Laufzeitmessung des Coachs (automatischer Tipp und Tiefenanalyse) in realistisch langsamen Spots,
   in Node und in Chromium mit CPU-Drosselung (CDP Emulation.setCPUThrottlingRate).
   Aufruf: node tests/perf-coach.js [node|browser|beide] [Basis-URL]
   Browser: statischer Server im Projektordner, z. B. python3 -m http.server 8766 --bind 127.0.0.1
   Ergebnis: tests/results/perf-coach.json (wird zusammengeführt, nicht überschrieben) */
'use strict';
const fs = require('fs'), path = require('path');

// Spot-Aufbau: läuft unverändert in Node und im Browser (wird als Quelltext übergeben)
function buildSpot(PT, def) {
  const pos = PT.POS6, button = (0 - pos.indexOf(def.hero) + 6) % 6, ids = ['g001', 'g002', 'g003', 'g004', 'g005'];
  const players = [{ id: 'hero', name: 'Du', stack: 10000, isHero: true }].concat(ids.map(id => ({ id, name: PT.bots.nameOf(id), stack: 10000 })));
  // Positionsbezogene Stacks (z. B. für Side Pots): Sitz i hat den Abstand (i − Button) zum Button
  if (def.stacks) players.forEach((p, i) => { const ps = pos[(i - button + 6) % 6]; if (def.stacks[ps]) p.stack = def.stacks[ps]; });
  const deck = PT.rules.deckFor({ n: 6, button, board: def.board ? (PT.parseCards(def.board) || []).map(PT.cardStr) : [], seats: players }, { 0: PT.parseCards(def.cards) });
  const h = new PT.Hand({ players, button, sb: 50, bb: 100, deck, no: 1 }).start();
  const seatOf = p => p === 'H' ? 0 : h.p.findIndex(q => q.pos === p);
  for (const [p, t, amt] of def.script) {
    const s = seatOf(p); let g = 0;
    while (h.toAct !== s && g++ < 20) { const L = h.legal(h.toAct); h.act(h.toAct, L.canCheck ? { type: 'check' } : { type: 'fold' }); }
    const r = h.act(s, amt ? { type: t, amount: Math.round(amt * 100) } : { type: t }); if (!r.ok) throw new Error(def.name + ': ' + p + ' ' + t + ': ' + r.error);
  }
  let g = 0; while (h.toAct !== 0 && !h.done && g++ < 20) { const L = h.legal(h.toAct); h.act(h.toAct, L.canCheck ? { type: 'check' } : { type: 'fold' }); }
  return PT.bots.publicView(h, 0);
}
const SPOTS = [
  { name: 'HU Flop, BTN gegen breite BB-Verteidigung', hero: 'BTN', cards: 'AhJc', board: 'Ts7d2c9h4s', script: [['H', 'raise', 2.5], ['BB', 'call'], ['BB', 'check']] },
  { name: 'HU Flop, BB gegen BTN-Open (OOP)', hero: 'BB', cards: 'Td9d', board: 'Kd7c2h5s3c', script: [['BTN', 'raise', 2.5], ['H', 'call']] },
  { name: 'Multiway Flop, 5 Spieler im Limp-Pot', hero: 'BB', cards: '8h7h', board: '9h6c2dQsKd', script: [['UTG', 'call'], ['HJ', 'call'], ['CO', 'call'], ['BTN', 'call'], ['SB', 'call'], ['H', 'check'], ['SB', 'check']] },
  { name: 'Multiway Turn, 3 Spieler', hero: 'BTN', cards: 'QdJd', board: 'Td8c3hKs2c', script: [['UTG', 'raise', 2.5], ['CO', 'call'], ['H', 'call'], ['UTG', 'bet', 3], ['CO', 'call'], ['H', 'call'], ['UTG', 'check'], ['CO', 'check']] },
  { name: 'Multiway Turn, 4 Spieler nach Limp', hero: 'CO', cards: '9s9c', board: '9d7h4cJs2h', script: [['UTG', 'call'], ['HJ', 'call'], ['H', 'call'], ['BB', 'check'], ['BB', 'check'], ['UTG', 'check'], ['HJ', 'check'], ['H', 'check'], ['BB', 'check'], ['UTG', 'bet', 2], ['HJ', 'call']] },
  { name: 'River HU (Modellspiel CFR+)', hero: 'BB', cards: 'Ah5h', board: 'Kh9c4h2s7d', script: [['BTN', 'raise', 2.5], ['H', 'call'], ['H', 'check'], ['BTN', 'check'], ['H', 'check'], ['BTN', 'check']] },
  { name: 'All-in-Call, 2 Gegner All-in (Side Pots)', hero: 'BTN', cards: 'QsQh', board: '', stacks: { UTG: 3000, HJ: 6000, BTN: 6000 }, script: [['UTG', 'raise', 30], ['HJ', 'raise', 60]] },
  { name: 'Preflop Squeeze-Spot, 3 Spieler', hero: 'BTN', cards: 'AsTs', board: '', script: [['UTG', 'raise', 2.5], ['HJ', 'call']] }
];
// Messung (Quelltext läuft in Node und im Browser)
// Je Wiederholung eine andere Starthand des Helden (kalte Caches wie bei einer neuen Entscheidung)
const HOLDINGS = ['AhJc', 'KdQd', '9s9c', 'Ts8s', 'AcKs', '7h6h', 'QcJh', '5d5c', 'AsQh', 'JdTd', 'KhKc', '8c7c', 'Ad5d', 'QsTs', '6s6d', 'KcJs'];
function measure(PT, buildSrc, spots, cfg, holdings) {
  const build = new Function('PT', 'def', 'return (' + buildSrc + ')(PT, def);');
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const out = [];
  spots.forEach(def => {
    const used = (def.board || '').match(/../g) || [];
    const hs = [def.cards].concat(holdings.filter(x => x !== def.cards && !used.some(c => x.indexOf(c) >= 0)));
    const views = [];
    for (let i = 0; i < cfg.reps; i++) { try { views.push(build(PT, Object.assign({}, def, { cards: hs[i % hs.length] }))); } catch (e) { out.push({ name: def.name, error: String(e.message || e) }); return; } }
    const v = views[0], times = [], iters = [];
    for (let i = 0; i < cfg.reps; i++) {
      if (PT.equity.cacheClear) PT.equity.cacheClear();
      const vi = views[i], t0 = now();
      const a = PT.coach.analyze({ view: vi, opps: {}, settings: { mode: i % 2 ? 'gto' : 'exploit', level: cfg.level }, seed: 1000 + i, live: cfg.live });
      times.push(now() - t0); iters.push(a.iters);
    }
    times.sort((x, y) => x - y);
    out.push({ name: def.name, street: v.street, opps: v.players.filter(q => q.seat !== v.seat && !q.folded).length, reps: cfg.reps,
      medianMs: Math.round(times[Math.floor(times.length / 2)]), p90Ms: Math.round(times[Math.floor(times.length * 0.9)]), maxMs: Math.round(times[times.length - 1]), maxIters: Math.max.apply(null, iters) });
  });
  return out;
}
const CONFIGS = [{ id: 'auto-tipp', level: 'standard', live: true, reps: 12 }, { id: 'praezise', level: 'praezise', live: false, reps: 6 }];

async function main() {
  const which = process.argv[2] || 'beide', BASE = process.argv[3] || 'http://127.0.0.1:8766/';
  const file = path.join(__dirname, 'results', 'perf-coach.json');
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* neu */ }
  const out = Object.assign(prev, { date: new Date().toISOString(), node: process.version, cpus: require('os').cpus().length, cpuModel: require('os').cpus()[0].model });
  if (which === 'node' || which === 'beide') {
    const PT = require('./load.js').load(); out.app = PT.VERSION;
    // Aufwärmen (JIT), danach messen
    measure(PT, buildSpot.toString(), SPOTS.slice(0, 2), { level: 'standard', live: true, reps: 2 }, ['2c2d', '3c3d']);
    out.node_ = {};
    CONFIGS.forEach(c => { out.node_[c.id] = measure(PT, buildSpot.toString(), SPOTS, c, HOLDINGS); console.log('Node', c.id); out.node_[c.id].forEach(r => console.log('  ' + JSON.stringify(r))); });
    out.node = out.node_; delete out.node_;
  }
  if (which === 'browser' || which === 'beide') {
    const { chromium } = require(process.env.PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
    const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
    out.browser = { version: browser.version(), rates: {} };
    const mods = ['core', 'evaluator', 'preflop-data', 'rules', 'ranges', 'equity', 'stats', 'bots', 'session', 'ev', 'cfr', 'coach', 'training', 'speech'];
    for (const rate of [1, 4, 6]) {
      const page = await browser.newPage();
      await page.goto(BASE + 'tests/results/');
      for (const m of mods) await page.addScriptTag({ url: BASE + 'assets/js/engine/' + m + '.js' });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      await page.evaluate(([src, spots, msrc]) => { const f = new Function('PT', 'src', 'spots', 'cfg', 'hs', 'return (' + msrc + ')(PT, src, spots, cfg, hs);'); f(PT, src, spots.slice(0, 2), { level: 'standard', live: true, reps: 2 }, ['2c2d', '3c3d']); }, [buildSpot.toString(), SPOTS, measure.toString()]);
      out.browser.rates[rate] = {};
      for (const c of CONFIGS) {
        const res = await page.evaluate(([src, spots, msrc, cfg, hs]) => { const f = new Function('PT', 'src', 'spots', 'cfg', 'hs', 'return (' + msrc + ')(PT, src, spots, cfg, hs);'); return f(PT, src, spots, cfg, hs); }, [buildSpot.toString(), SPOTS, measure.toString(), c, HOLDINGS]);
        out.browser.rates[rate][c.id] = res;
        console.log('Chromium Drosselung ' + rate + '×', c.id); res.forEach(r => console.log('  ' + JSON.stringify(r)));
      }
      await page.close();
    }
    await browser.close();
  }
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(out, null, 1));
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { buildSpot, SPOTS, measure, HOLDINGS };
