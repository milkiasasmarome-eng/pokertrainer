/* Arbeitspaket 1 (2.2): Kalibrierung der Range-Schätzung ohne Coach-Entscheidungen.
   Gegner-KI gegen Gegner-KI (Gruppe V/T oder synthetische Strategien). An jeder Heads-up-Postflop-Entscheidung eines Platzes
   wird die Range des Gegners so geschätzt, wie der Coach der angegebenen Engine-Version sie schätzen würde
   (buildRange mit den Datenbankwerten, die am Tisch sichtbar entstanden sind), und die exakte Equity der Karten des
   entscheidenden Platzes gegen diese Range (ref) mit der tatsächlichen Equity gegen die verdeckten Karten (true) verglichen.
   Ohne Auswahleffekt: alle Spots, nicht nur aufgedeckte Hände. Die Rechenmethode ist unabhängig von der Equity-Engine.
   Aufruf: node tests/strategy/range-calib.js <Seed> <Hände> <E|V|T|synth:<name>|mixed> <Ausgabe.json> [Wurzel] [gto] */
'use strict';
const fs = require('fs'), path = require('path');
const PT = require('../load.js').load(), GROUPS = require('./groups.js').make(PT), HS = require('./harness.js');
const { runoutsEq, rangeEq, sizeBucket } = require('./equity-calib.js');
const B = PT.bots;

function run(seed, hands, group, root, gto, filter) {
  const C = HS.loadEngine(root || path.join(__dirname, '..', '..'));
  const comp = group.indexOf('synth') === 0 || group === 'mixed' ? group : 'bots';
  const cfg = Object.assign(PT.session.defaultConfig(), /^[EVT]$/.test(group) ? { pool: GROUPS[group] } : {});
  const db = PT.stats.newDb(), t = PT.session.newTable(cfg, db, seed), heroRec = PT.stats.newRecord('hero', 'Du');
  const rng = PT.makeRng('rcal|' + seed), recs = [];
  for (let i = 0; i < hands; i++) {
    t.seats.forEach(s => { s.stack = 10000; });
    const h = PT.session.startHand(t, i + 1); let guard = 0;
    while (!h.done) {
      if (++guard > 400) throw new Error('Hand hängt');
      const s = h.toAct, v = B.publicView(h, s);
      const live = h.p.filter(q => !q.folded && q.seat !== s);
      let want = v.street > 0 && live.length === 1 && s !== 0;
      if (want && filter === 'lead') { const L0 = v.legal; let last = null; for (let j = v.actions.length - 1; j >= 0; j--) { const a = v.actions[j]; if (a.st === v.street && (a.t === 'bet' || a.t === 'raise')) { last = a; break; } }
        want = v.street >= 2 && L0.toCall > 0 && !!last && last.t === 'bet' && PT.ranges.isLead(v.actions, last, last.s, v.pfa); }
      if (want) {
        const q = live[0], rec = q.isHero ? heroRec : db.opps[q.id];
        const st = C.coach._intern.oppStats(rec ? JSON.parse(JSON.stringify(rec)) : null);
        const vv = HS.clone(v), rg = C.coach._intern.buildRange(vv, q.seat, st, !!gto, vv.pfa);
        const ref = rangeEq(C, v.cards, v.board, rg.w, rng);
        const dead = []; h.p.forEach(x => x.cards.forEach(c => dead.push(c)));
        const tr = runoutsEq(v.cards, [q.cards], v.board, dead, rng, 0);
        let last = null; for (let j = v.actions.length - 1; j >= 0; j--) { const a = v.actions[j]; if (a.st === v.street && (a.t === 'bet' || a.t === 'raise')) { last = a; break; } }
        const L = v.legal, f = L.toCall > 0 ? L.toCall / Math.max(1, v.pot - L.toCall) : 0;
        const lead = !!(last && last.t === 'bet' && PT.ranges.isLead(v.actions, last, last.s, v.pfa));
        // Vorgeschichte des Gegners auf früheren Straßen (Aggressor der Vorstraße?)
        let oppAggPrev = false; v.actions.forEach(a => { if (a.st === v.street - 1 && a.s === q.seat && (a.t === 'bet' || a.t === 'raise')) oppAggPrev = true; });
        const tex = PT.ranges.analyzeBoard(v.board);
        const ip = PT.POS_ORDER_POST[v.players[s].pos] > PT.POS_ORDER_POST[v.players[q.seat].pos];
        if (ref != null) recs.push({ st: v.street, fk: L.toCall > 0 ? (last ? last.t : 'bet') : 'keine', f: +f.toFixed(3), lead: lead ? 1 : 0, ref: +ref.toFixed(4), tr: +tr.toFixed(4),
          style: q.isHero ? 'held' : (B.styleOf(q.id) || '?') + (HS.synthFor(q.id, comp) ? ':' + HS.synthFor(q.id, comp) : ''), hands: st.hands, agp: oppAggPrev ? 1 : 0,
          paired: tex.paired ? 1 : 0, wet: +(tex.wet || 0).toFixed(2), mono: tex.suitMax >= 3 ? 1 : 0, ip: ip ? 1 : 0, w: +PT.ranges.total(rg.w).toFixed(1) });
      }
      let a;
      if (s === 0) a = B.decide(v, 'g004', h.botRng, null);
      else a = HS.oppDecision(h, s, comp, heroRec);
      let r = PT.session.act(t, h, s, a);
      if (!r.ok) { const L2 = h.legal(s); r = PT.session.act(t, h, s, L2.canCheck ? { type: 'check' } : { type: 'call' }); }
    }
    PT.session.finishHand(t, db, h, heroRec);
  }
  return { seed, hands, group, root: root || '.', gto: !!gto, recs };
}
if (require.main === module) {
  const [seed, hands, group, out, root, gto, filter] = process.argv.slice(2);
  const t0 = Date.now(), r = run(+seed, +hands, group || 'V', root, gto === 'gto', filter);
  r.wallMs = Date.now() - t0; fs.writeFileSync(out, JSON.stringify(r));
  console.log(out + ': ' + r.recs.length + ' Spots, ' + Math.round(r.wallMs / 1000) + ' s');
}
module.exports = { run };
