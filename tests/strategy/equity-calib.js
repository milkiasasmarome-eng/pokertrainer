/* Arbeitspaket 1 (2.2): Kalibrierung der Equity-Schätzung des Coaches.
   Der Held spielt mit der Empfehlung des Coaches; an jeder Postflop-Entscheidung werden drei Größen festgehalten:
     est  – Equity-Schätzung des Coaches (an.equity.eq, nur aus öffentlicher Sicht und Datenbankwerten)
     ref  – mathematische Referenz: exakte Equity gegen die vom Coach angenommene Range (Heads-up; River/Turn vollständig
            aufgezählt, Flop 4.000 Stichproben aus einem eigenen Zufallsstrom), unabhängig von der Equity-Engine des Coaches
            (eigene Aufzählung, nur die Handbewertung wird geteilt)
     true – tatsächliche Equity gegen die verdeckten Karten der Gegner (nur der Studie bekannt; Aufzählung aller Restboards,
            Deck ohne alle ausgeteilten Startkarten)
   est − ref ist der Fehler der Equity-Rechnung, ref − true (im Mittel einer Gruppe) der Fehler der angenommenen Range.
   Da die verdeckten Karten Zufallsziehungen aus der tatsächlichen Strategie des Gegners sind, ist eine Schätzung kalibriert,
   wenn der Mittelwert von true in jeder Gruppe dem Mittelwert von est entspricht. Hier gibt es keinen Auswahleffekt:
   ausgewertet werden alle Entscheidungen, nicht nur aufgedeckte Hände.
   Aufruf: node tests/strategy/equity-calib.js <Seed> <Hände> <Gruppe E|V|T|alle|synth:<name>> <Ausgabe.json> [Wurzel] */
'use strict';
const fs = require('fs'), path = require('path');
const HS = require('./harness.js'), PT = HS.PT, GROUPS = require('./groups.js').make(PT);
const E = PT.eval;

function runoutsEq(heroCards, oppCards, board, dead, rng, maxSamples) {
  const used = new Uint8Array(52); dead.forEach(c => { used[c] = 1; }); board.forEach(c => { used[c] = 1; });
  const rest = []; for (let c = 0; c < 52; c++) if (!used[c]) rest.push(c);
  const need = 5 - board.length; let sum = 0, n = 0;
  const one = b => {
    const hs = E.evaluate(heroCards.concat(b)); let best = hs, ties = 1, lose = false;
    for (const oc of oppCards) { const s = E.evaluate(oc.concat(b)); if (s > best) { lose = true; break; } if (s === hs) ties++; }
    sum += lose ? 0 : 1 / ties; n++;
  };
  if (need === 0) one(board);
  else if (need === 1) rest.forEach(c => one(board.concat([c])));
  else if (need === 2 && (!maxSamples || rest.length * (rest.length - 1) / 2 <= maxSamples)) { for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) one(board.concat([rest[i], rest[j]])); }
  else { for (let s = 0; s < maxSamples; s++) { const i = Math.floor(rng() * rest.length); let j = Math.floor(rng() * (rest.length - 1)); if (j >= i) j++; one(board.concat([rest[i], rest[j]])); } }
  return n ? sum / n : null;
}
/** Exakte bzw. gesampelte Equity des Helden gegen eine gewichtete Range (Heads-up) */
function rangeEq(C, hero, board, w, rng) {
  const H = C.hands, used = new Uint8Array(52); hero.concat(board).forEach(c => { used[c] = 1; });
  const combos = []; let tot = 0;
  for (let k = 0; k < 1326; k++) { if (!(w[k] > 0)) continue; const a = H.C1[k], b = H.C2[k]; if (used[a] || used[b]) continue; combos.push([k, a, b, w[k]]); tot += w[k]; }
  if (!tot) return null;
  if (board.length >= 4) { let s = 0; combos.forEach(([k, a, b, x]) => { s += x * runoutsEq(hero, [[a, b]], board, hero.concat([a, b]), null, 0); }); return s / tot; }
  // Flop: 4.000 Stichproben (Kombination nach Gewicht, dann Restboard)
  const cum = []; let acc = 0; combos.forEach(c => { acc += c[3]; cum.push(acc); });
  let s = 0; const N = 4000;
  for (let i = 0; i < N; i++) {
    const r = rng() * acc; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
    const [, a, b] = combos[lo]; s += runoutsEq(hero, [[a, b]], board, hero.concat([a, b]), rng, 1);
  }
  return s / N;
}
function facing(v) {
  const L = v.legal; if (!(L.toCall > 0)) return { kind: 'keine', f: 0, lead: false, actor: -1 };
  let last = null; for (let i = v.actions.length - 1; i >= 0; i--) { const a = v.actions[i]; if (a.st === v.street && (a.t === 'bet' || a.t === 'raise')) { last = a; break; } }
  const f = L.toCall / Math.max(1, v.pot - L.toCall);
  return { kind: last ? last.t : 'bet', f, lead: !!(last && last.t === 'bet' && PT.ranges.isLead(v.actions, last, last.s, v.pfa)), actor: last ? last.s : -1 };
}
function sizeBucket(f) { return f <= 0 ? 'keine' : f <= 0.4 ? '≤40 %' : f <= 0.7 ? '41–70 %' : f <= 1.1 ? '71–110 %' : '>110 %'; }

function run(seed, hands, group, root, mode) {
  const recs = [], C = HS.loadEngine(root || path.join(__dirname, '..', '..')), rng = PT.makeRng('calib|' + seed);
  const opts = { seed, hands, startBB: 100, difficulty: 'gemischt', comp: 'bots', hero: { kind: 'coach', root: root || path.join(__dirname, '..', '..'), mode: mode || 'exploit' } };
  if (/^[EVT]$/.test(group)) opts.pool = GROUPS[group];
  else if (group.indexOf('synth:') === 0) opts.comp = group;
  opts.onDecision = ({ an, v, h, db }) => {
    if (v.street === 0) return;
    const active = h.p.filter(q => !q.isHero && !q.folded);
    if (!active.length) return;
    const dead = []; h.p.forEach(q => q.cards.forEach(c => dead.push(c)));
    const tr = runoutsEq(v.cards, active.map(q => q.cards), v.board, dead, rng, 0);
    const fc = facing(v);
    const r = { h: h.no, st: v.street, n: active.length, est: +an.equity.eq.toFixed(4), tr: +tr.toFixed(4), fk: fc.kind, f: +fc.f.toFixed(3), lead: fc.lead ? 1 : 0, best: an.actions[0].type, ip: an.ip ? 1 : 0 };
    if (active.length === 1) {
      const q = active[0], st = C.coach._intern.oppStats(db.opps[q.id] ? JSON.parse(JSON.stringify(db.opps[q.id])) : null);
      const vv = HS.clone(v), rg = C.coach._intern.buildRange(vv, q.seat, st, mode === 'gto', vv.pfa);
      const ref = rangeEq(C, v.cards, v.board, rg.w, rng);
      if (ref != null) r.ref = +ref.toFixed(4);
      r.hands = st.hands;
      if (fc.actor === q.seat) r.style = PT.bots.styleOf(q.id) || 'synth';
    }
    recs.push(r);
  };
  const t0 = Date.now(), m = HS.runMatch(opts);
  return { seed, hands, group, mode: mode || 'exploit', wallMs: Date.now() - t0, bb100Adj: m.sumBBAdj / m.hands * 100, recs };
}
if (require.main === module) {
  const [seed, hands, group, out, root, mode] = process.argv.slice(2);
  const r = run(+seed, +hands, group || 'alle', root, mode);
  fs.writeFileSync(out, JSON.stringify(r));
  console.log(out + ': ' + r.recs.length + ' Entscheidungen, ' + Math.round(r.wallMs / 1000) + ' s');
}
module.exports = { run, runoutsEq, rangeEq, facing, sizeBucket };
