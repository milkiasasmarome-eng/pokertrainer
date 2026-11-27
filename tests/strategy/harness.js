/* Vergleichsrahmen: spielt eine Session mit einer Heldenstrategie gegen eine Tischzusammensetzung.
   Getrennte Zufallsströme: Karten (session.streams deal), Gegnerentscheidungen (bots), Tisch/Rotation (tisch),
   Coach-Seed aus Tisch-Seed, Handnummer und Aktionszahl. Gleiche Seeds ⇒ gleiche Karten je Handnummer für alle Helden.
   Grenze: Sobald zwei Helden verschieden handeln, laufen Gegnerentscheidungen, Datenbankwerte und Anpassung auseinander. */
'use strict';
const path = require('path');
const PT = require('../load.js').load();            // Umgebung: Regeln, Gegner-KI, Tisch, Statistik (eine feste Version für alle Helden)
const { loadEngine } = require('./engine-vm.js');
const STRAT = require('./strategies.js').make(PT);
const SYNTH_KEYS = Object.keys(STRAT.SYNTH), FINAL_KEYS = Object.keys(STRAT.FINAL);
const clone = o => JSON.parse(JSON.stringify(o));
const BLOCK = 100;
// River-Modellspiel (nur Erklärtext) in Massensimulationen auslassen; PT_COACH_FULL=1 rechnet es mit (für Zeitmessungen)
const COACH_FULL = process.env.PT_COACH_FULL === '1';                                     // Ergebnisse werden je 100 aufeinanderfolgenden Händen gespeichert

/** Welche synthetische Strategie ein Pool-Gegner in Zusammensetzung comp spielt (null = Gegner-KI) */
function synthFor(id, comp) {
  if (comp === 'bots' || !comp) return null;
  const h = PT.rng.hashStr(id + '|synth');
  if (comp === 'mixed' && (h >>> 8) % 2 === 0) return null;
  if (comp.indexOf('synth:') === 0) return comp.slice(6);
  if (comp.indexOf('final:') === 0) return comp.slice(6);
  if (comp === 'final') return FINAL_KEYS[h % FINAL_KEYS.length];
  if (comp === 'finalmixed') return (h >>> 8) % 2 === 0 ? null : FINAL_KEYS[h % FINAL_KEYS.length];
  return SYNTH_KEYS[h % SYNTH_KEYS.length];
}
/** All-in-Bereinigung: Endet die Hand im Showdown, nachdem vor dem River niemand mehr handeln konnte, wird das Ergebnis des Helden
    durch seinen Erwartungswert über alle restlichen Boards ersetzt (Deck ohne alle 12 ausgeteilten Karten und ohne Board).
    Das ist der bedingte Erwartungswert gegeben alle bekannten Karten und daher unverzerrt. Flop/Turn exakt, preflop 600 Stichproben. */
function allInAdjusted(h, rngSeed) {
  const net = h.result.net[0];
  if (!h.result.showdown) return { net, adj: net, allin: false };
  let lastSt = 0; h.actions.forEach(a => { if (a.t !== 'sb' && a.t !== 'bb') lastSt = Math.max(lastSt, a.st); });
  const known = lastSt === 0 ? 0 : lastSt === 1 ? 3 : lastSt === 2 ? 4 : 5;
  if (known >= 5 || h.p[0].folded) return { net, adj: net, allin: false };
  const used = new Uint8Array(52); h.p.forEach(q => q.cards.forEach(c => { used[c] = 1; })); const base = h.board.slice(0, known); base.forEach(c => { used[c] = 1; });
  const rest = []; for (let c = 0; c < 52; c++) if (!used[c]) rest.push(c);
  const entries = h.p.map(q => ({ seat: q.seat, total: q.total, folded: q.folded, cards: q.cards }));
  const need = 5 - known; let sum = 0, n = 0;
  const one = (b) => { const r = PT.rules.settle(entries, b, h.button, h.N, h.rake, !!h.sawFlop); sum += r.payout[0] - h.p[0].total; n++; };
  if (need === 1) for (let i = 0; i < rest.length; i++) one(base.concat([rest[i]]));
  else if (need === 2) for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) one(base.concat([rest[i], rest[j]]));
  else {
    const rng = PT.makeRng(rngSeed);
    for (let s = 0; s < 600; s++) { const d = rest.slice(); const b = base.slice(); for (let k = 0; k < need; k++) { const j = k + Math.floor(rng() * (d.length - k)); const t = d[k]; d[k] = d[j]; d[j] = t; b.push(d[k]); } one(b); }
  }
  return { net, adj: sum / n, allin: true };
}
function sizeLabel(a, v) {
  if (a.type !== 'bet' && a.type !== 'raise') return a.type;
  if (a.allin) return 'All-in';
  const l = a.label || '';
  if (/⅓/.test(l)) return '⅓'; if (/½/.test(l)) return '½'; if (/¾/.test(l)) return '¾'; if (/Overbet/.test(l)) return 'Overbet'; if (/Pot$/.test(l) && /^Bet/.test(l)) return 'Pot';
  if (/^Raise/.test(l)) return v.street === 0 ? 'Raise preflop' : 'Raise ' + l.replace(/^Raise /, '');
  if (/^Open|^Iso|^3-Bet|^4-Bet/.test(l)) return l.split(' ')[0];
  return 'andere';
}
/** Entscheidung eines Gegners (Gegner-KI oder synthetische Strategie), nur aus seiner öffentlichen Sicht */
function oppDecision(h, s, comp, heroRec) {
  const q = h.p[s], sy = synthFor(q.id, comp);
  if (sy) return (STRAT.SYNTH[sy] || STRAT.FINAL[sy])(PT.bots.publicView(h, s), h.botRng, { handNo: h.no, salt: PT.rng.hashStr(q.id) % 2 });
  return PT.bots.decideFor(h, s, h.botRng, { heroStats: PT.session.heroCtx(heroRec) });
}
/** Führt eine Gegneraktion aus; ungültige Aktionen fallen wie in session.botAct auf Check/Call zurück */
function oppAct(h, s, comp, heroRec, act) {
  const a = oppDecision(h, s, comp, heroRec);
  let r = act(s, a);
  if (!r.ok) { const L = h.legal(s); r = act(s, L.canCheck ? { type: 'check' } : { type: 'call' }); r.fallback = true; }
  return r;
}
/** Coach-Analyse für den Helden (Sitz 0). Übergeben werden nur publicView und die Datenbankwerte der Gegner am Tisch. */
function coachInput(h, db, seed, mode, extra) {
  const v = PT.bots.publicView(h, 0), ids = {};
  h.p.forEach(x => { if (!x.isHero && db.opps[x.id]) ids[x.id] = db.opps[x.id]; });
  return { view: clone(v), opps: clone(ids), settings: { mode: mode || 'exploit', level: 'standard' }, seed: seed + '|' + h.no + '|' + h.actions.length, live: true, extra: extra || undefined, skipModel: !COACH_FULL };
}
/** Kopie einer laufenden Hand (gleiches Deck, gleiche Aktionen) für gegenfaktische Ausspielungen */
function cloneHand(h) {
  const c = new PT.Hand({ players: h.p.map(q => ({ id: q.id, name: q.name, stack: q.start, isHero: q.isHero })), button: h.button, sb: h.sb, bb: h.bb, deck: h.deck, no: h.no, ts: h.ts, rake: h.rake }).start();
  h.actions.forEach(a => { if (a.t === 'sb' || a.t === 'bb') return; const r = c.act(a.s, a.t === 'bet' || a.t === 'raise' ? { type: a.t, amount: a.a } : { type: a.t }); if (!r.ok) throw new Error('Kopie nicht nachspielbar'); });
  return c;
}
/**
 * opts: {seed, hands, startBB, difficulty, comp ('bots'|'mixed'|'synth'|'synth:<name>'), hero: {kind:'coach', root, mode} | {kind:'bot', id} | {kind:'potodds'} | {kind:'pushfold'},
 *        onDecision(info), shadow: {root, mode} (optional: zweiter Coach bewertet dieselben Spots ohne zu spielen)}
 */
function runMatch(opts) {
  const seed = opts.seed >>> 0, hands = opts.hands, start = (opts.startBB || 100) * 100;
  const cfg = Object.assign(PT.session.defaultConfig(), { startBB: opts.startBB || 100, difficulty: opts.difficulty || 'gemischt' }, opts.pool ? { pool: opts.pool } : {});
  const db = PT.stats.newDb(), heroRec = PT.stats.newRecord('hero', 'Du');
  const t = PT.session.newTable(cfg, db, seed);
  const hero = opts.hero, C = hero.kind === 'coach' ? loadEngine(hero.root) : null;
  if (C && hero.popBlend != null && C.ev.POP) C.ev.POP.blend = hero.popBlend;
  if (C && hero.abl && C.ranges.ABL) Object.assign(C.ranges.ABL, hero.abl);   // 2.3: Ablation / Strategievariante   // Variante des Reaktionsmodells (nur Entwicklungsvergleich)
  const SH = opts.shadow ? loadEngine(opts.shadow.root) : null;
  const out = { seed, hands: 0, startBB: cfg.startBB, comp: opts.comp || 'bots', difficulty: cfg.difficulty, hero: hero.kind === 'coach' ? 'coach:' + hero.mode : hero.kind,
    blocks: [], blocksAdj: [], sumSq: 0, sumSqAdj: 0, decisions: 0, invalid: 0, allinHands: 0, ms: 0, maxMs: 0, maxIters: 0,
    labels: {}, preLabels: {}, chartApplied: 0, chartGapBB: 0, classes: {}, synthSeats: 0, botSeats: 0, shadowAgree: 0, shadowN: 0, shadowEvGapBB: 0 };
  let bs = 0, bsA = 0;
  for (let i = 0; i < hands; i++) {
    t.seats.forEach(s => { s.stack = start; });            // feste Stacktiefe je Hand (sauberer Vergleich je Stackgröße)
    const h = PT.session.startHand(t, i + 1);
    let guard = 0;
    while (!h.done) {
      if (++guard > 400) throw new Error('Hand hängt: Seed ' + seed + ' Hand ' + h.no);
      const s = h.toAct, q = h.p[s];
      if (q.isHero) {
        const v = PT.bots.publicView(h, 0); let a;
        if (C) {
          const input = coachInput(h, db, seed, hero.mode);
          const t0 = process.hrtime.bigint();
          const an = C.coach.analyze(input);
          const ms = Number(process.hrtime.bigint() - t0) / 1e6;
          out.ms += ms; out.maxMs = Math.max(out.maxMs, ms); out.maxIters = Math.max(out.maxIters, an.iters || 0); out.decisions++;
          const b = an.actions[0]; a = b.amount ? { type: b.type, amount: b.amount } : { type: b.type };
          const lab = sizeLabel(b, v), tab = v.street === 0 ? out.preLabels : out.labels; tab[lab] = (tab[lab] || 0) + 1;
          out.classes[an.classification] = (out.classes[an.classification] || 0) + 1;
          if (an.chart && an.chart.applied) { out.chartApplied++; out.chartGapBB += (an.chart.modelGap || 0) / v.bb; }
          if (SH) {
            const sa = SH.coach.analyze(clone(input)), sb = sa.actions[0];
            out.shadowN++;
            if (sb.type === b.type && (sb.amount || 0) === (b.amount || 0)) out.shadowAgree++;
            else { const m = an.actions.filter(x => x.type === sb.type && (x.amount || 0) === (sb.amount || 0))[0]; if (m) out.shadowEvGapBB += (b.ev - m.ev) / v.bb; }
          }
          if (opts.onDecision) opts.onDecision({ an, v, h, t, db, action: a });
        } else if (hero.kind === 'bot') a = PT.bots.decide(v, hero.id || 'g004', PT.rng.stream(seed, 'held', h.no, h.actions.length), null);
        else if (hero.kind === 'potodds') a = STRAT.potOdds(v, PT.rng.stream(seed, 'held', h.no, h.actions.length));
        else if (hero.kind === 'pushfold') a = STRAT.pushFold(v, PT.rng.stream(seed, 'held', h.no, h.actions.length));
        let r = PT.session.act(t, h, 0, a);
        if (!r.ok) { out.invalid++; const L = h.legal(0); r = PT.session.act(t, h, 0, L.canCheck ? { type: 'check' } : { type: 'fold' }); }
      } else {
        const r = oppAct(h, s, opts.comp, heroRec, (st, a) => PT.session.act(t, h, st, a));
        if (r.fallback) out.oppFallback = (out.oppFallback || 0) + 1;
      }
    }
    const adj = allInAdjusted(h, seed + '|ai|' + h.no), bb = h.bb;
    const x = adj.net / bb, y = adj.adj / bb;
    bs += x; bsA += y; out.sumSq += x * x; out.sumSqAdj += y * y; if (adj.allin) out.allinHands++;
    h.p.forEach(p => { if (!p.isHero) { if (synthFor(p.id, opts.comp)) out.synthSeats++; else out.botSeats++; } });
    PT.session.finishHand(t, db, h, heroRec);
    out.hands++;
    if (out.hands % BLOCK === 0) { out.blocks.push(+bs.toFixed(4)); out.blocksAdj.push(+bsA.toFixed(4)); bs = 0; bsA = 0; }
  }
  if (out.hands % BLOCK) { out.blocks.push(+bs.toFixed(4)); out.blocksAdj.push(+bsA.toFixed(4)); out.partialLast = out.hands % BLOCK; }
  out.sumBB = out.blocks.reduce((s, x) => s + x, 0); out.sumBBAdj = out.blocksAdj.reduce((s, x) => s + x, 0);
  return out;
}
module.exports = { runMatch, allInAdjusted, synthFor, oppAct, oppDecision, coachInput, cloneHand, clone, PT, STRAT, BLOCK, loadEngine };
