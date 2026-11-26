/* Gemeinsame Simulationshilfe: spielt Hände mit Bots (Held spielt mit Bot-Logik eines festen Profils). */
'use strict';
const PT = require('./load.js').load();
function heroPolicy(h, rng, mode) {
  const s = h.toAct, L = h.legal(s);
  if (mode === 'random') {
    // zufällige, teils ungültige Eingaben (Fuzz)
    const r = rng();
    if (r < 0.08) return { type: ['fold','check','call','bet','raise','allin','xyz'][Math.floor(rng()*7)], amount: Math.floor(rng()*30000) - 500 };
    if (r < 0.25 && L.canFold) return { type: 'fold' };
    if (r < 0.55) return L.canCheck ? { type: 'check' } : { type: 'call' };
    if (L.canRaise) { const lo = L.minTo, hi = L.maxTo; return { type: L.isBet ? 'bet' : 'raise', amount: lo + Math.floor(rng() * (hi - lo + 1)) }; }
    return L.canCheck ? { type: 'check' } : { type: 'call' };
  }
  return PT.bots.decide(PT.bots.publicView(h, s), 'g002', rng, null);
}
function run(opts) {
  const n = opts.hands, seed = opts.seed >>> 0, db = PT.stats.newDb(), heroRec = PT.stats.newRecord('hero', 'Du');
  const cfg = Object.assign(PT.session.defaultConfig(), opts.cfg || {});
  const t = PT.session.newTable(cfg, db, seed);
  const hrng = PT.makeRng('hero|' + seed);
  const out = { hands: 0, actions: 0, invalidRejected: 0, errors: [], fallbacks: 0, showdowns: 0, sidePots: 0, splitPots: 0, allIns: 0, swaps: 0, rebuys: 0, maxActions: 0 };
  for (let i = 0; i < n; i++) {
    const h = PT.session.startHand(t, i + 1);
    const before = h.startSum;
    let guard = 0;
    while (!h.done) {
      if (++guard > 500) { out.errors.push('Hand hängt #' + h.no); break; }
      if (h.p[h.toAct].isHero) {
        let a = heroPolicy(h, hrng, opts.heroMode);
        let r = PT.session.act(t, h, h.toAct, a);
        let tries = 0;
        while (!r.ok) { out.invalidRejected++; if (++tries > 20) { const L = h.legal(h.toAct); a = L.canCheck ? { type: 'check' } : { type: 'call' }; }
          else a = heroPolicy(h, hrng, opts.heroMode); r = PT.session.act(t, h, h.toAct, a); }
      } else {
        const r = PT.session.botAct(t, h, heroRec);
        if (r && r.fallback) out.fallbacks++;
      }
      out.actions++;
      if (opts.check !== false) { const e = h.check(); if (e.length) { out.errors.push('#' + h.no + ': ' + e.join('; ')); break; } }
    }
    if (h.check().length) out.errors.push('#' + h.no + ' Ende: ' + h.check().join('; '));
    if (h.stackSum() + (h.result.rake || 0) !== before) out.errors.push('#' + h.no + ' Chips');
    out.hands++;
    if (h.result.showdown) out.showdowns++;
    if (h.result.pots.length > 1) out.sidePots++;
    if (h.result.pots.some(p => p.winners.length > 1)) out.splitPots++;
    if (h.p.some(q => q.allIn)) out.allIns++;
    out.maxActions = Math.max(out.maxActions, h.actions.length);
    const res = PT.session.finishHand(t, db, h, heroRec);
    if (res.ev.swap) out.swaps++;
    out.rebuys += res.ev.rebuys.length;
    if (opts.onHand) opts.onHand(h, res, t, db);
    if (out.errors.length > 20) break;
  }
  out.db = db; out.table = t; out.heroRec = heroRec;
  return out;
}
module.exports = { PT, run };
