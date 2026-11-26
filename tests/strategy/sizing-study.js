/* Größenstudie mit gegenfaktischen Ausspielungen.
   Der Held spielt nach dem Coach. An jedem Postflop-Spot des Helden wird die Hand für jede Kandidatenaktion
   (Check bzw. Fold/Call und Einsätze von ⅓, ½, ¾, 1 und 1,5 Pot bzw. Raises) kopiert und mit denselben Karten und demselben
   Zufallsstrom der Gegner zu Ende gespielt (gemeinsame Zufallszahlen). Gemessen werden je Größe: erste Reaktion jedes Gegners
   (Fold/Call/Raise), realisierter Wert relativ zum sofortigen Fold (All-in-bereinigt) und die Modellvorhersage des Coaches.
   Aufruf: node tests/strategy/sizing-study.js <root> <seed> <hände> <comp> <label>
   Ergebnis: tests/results/sizing-study/<label>-<comp>-<seed>.json (Zwischenergebnisse, nicht eingecheckt) */
'use strict';
const fs = require('fs'), path = require('path');
const HS = require('./harness.js'), PT = HS.PT;
const root = process.argv[2] || path.join(__dirname, '..', '..'), seed = +(process.argv[3] || 501), hands = +(process.argv[4] || 2000), comp = process.argv[5] || 'bots', label = process.argv[6] || 'v21';
const C = HS.loadEngine(root);
if (/^base/.test(label) && C.ev.POP) C.ev.POP.off = true;   // Basislauf: Reaktionsmodell wie 2.0.1 (MDF mit Korrekturen)
if (/^v21p/.test(label) && C.ev.POP) C.ev.POP.blend = 0;    // reines Populationsmodell (ohne Mittelung), nur zum Vergleich
const FRACS = [0.33, 0.5, 0.75, 1.0, 1.5], RAISES = [2.5, 3.5];
const outDir = path.join(__dirname, '..', 'results', 'sizing-study'); fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, label + '-' + comp + '-' + seed + '.json');

function fit(to, L, bb) { const u = Math.max(1, Math.round(bb / 10)); to = Math.round(to / u) * u; return Math.max(L.minTo, Math.min(L.maxTo, to)); }
/** Exakte Equity des Helden gegen eine bekannte Hand (nur für die Auswertung, nie für den Coach) */
function exactEq(hero, opp, board) {
  const used = new Uint8Array(52); hero.concat(opp, board).forEach(c => { used[c] = 1; });
  const rest = []; for (let c = 0; c < 52; c++) if (!used[c]) rest.push(c);
  const need = 5 - board.length; let s = 0, n = 0;
  const one = b => { const a = PT.eval.evaluate(hero.concat(b)), o = PT.eval.evaluate(opp.concat(b)); s += a > o ? 1 : a === o ? 0.5 : 0; n++; };
  if (need === 0) one(board); else if (need === 1) rest.forEach(x => one(board.concat([x]))); else for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) one(board.concat([rest[i], rest[j]]));
  return s / n;
}
/** Kompakte Beschreibung der geschätzten Range eines Gegners (exploitatives Modell des Coaches): Gewichte nach absoluter Stärke x
    (25 Klassen) ohne Draws, Draws getrennt nach x (10 Klassen) und Draw-Equity (12 Klassen bis 0,6). Grundlage der Kalibrierung. */
function rangeHist(input, seat) {
  const I = C.coach._intern, q = input.view.players[seat], st = I.oppStats(input.opps[q.id] || null);
  const rg = I.buildRange(input.view, seat, st, false, input.view.pfa), A = C.ev.absStrength(input.view.board), w = rg.w;
  const hst = new Array(25).fill(0), dr = {}; let tot = 0;
  for (let k = 0; k < w.length; k++) { const x = w[k]; if (!(x > 0)) continue; tot += x; }
  for (let k = 0; k < w.length; k++) { const x = w[k]; if (!(x > 0)) continue; const xb = Math.min(24, Math.floor(A.x[k] * 25));
    if (A.d[k] && input.view.board.length < 5) { const key = Math.min(9, Math.floor(A.x[k] * 10)) + ',' + Math.min(11, Math.floor(A.de[k] / 0.05)); dr[key] = (dr[key] || 0) + x / tot; }
    else hst[xb] += x / tot; }
  const raw = st.raw, pick = k => raw[k] ? raw[k].slice() : [0, 0];
  return { h: hst.map(x => +x.toFixed(4)), dr: Object.keys(dr).map(k => k.split(',').map(Number).concat([+dr[k].toFixed(4)])).filter(x => x[2] > 0),
    hands: st.hands, vpip: pick('vpip'), pfr: pick('pfr'), fcb: pick('foldToCbet'), fcbT: pick('foldToCbetTurn'), wtsd: pick('wtsd'), afq: pick('afq'), cr: pick('checkRaise'), line: rg.line.kind };
}
function decideCoach(h, db, sd, mode, extra) { const an = C.coach.analyze(HS.coachInput(h, db, sd, mode, extra)); return an; }
/** Spielt eine Kopie nach der Heldenaktion zu Ende; liefert realisierten Wert und erste Reaktionen der Gegner */
function rollout(h, a, db, heroRec, cfSeed) {
  const c = HS.cloneHand(h), st = c.street, heroTot = c.p[0].total;
  c.botRng = PT.rng.stream(seed, 'cf', h.no, h.actions.length);
  const r0 = c.act(0, a); if (!r0.ok) return null;
  const first = {}; let open = true, guard = 0;
  while (!c.done) {
    if (++guard > 300) throw new Error('Ausspielung hängt');
    const s = c.toAct;
    if (c.p[s].isHero) {
      open = false;
      const an = decideCoach(c, db, cfSeed, 'exploit'), b = an.actions[0];
      let r = c.act(0, b.amount ? { type: b.type, amount: b.amount } : { type: b.type });
      if (!r.ok) { const L = c.legal(0); c.act(0, L.canCheck ? { type: 'check' } : { type: 'fold' }); }
    } else {
      const before = c.actions.length;
      HS.oppAct(c, s, comp, heroRec, (x, y) => c.act(x, y));
      const ac = c.actions[before];
      if (open && ac && ac.st === st && !(s in first)) first[s] = ac.t === 'fold' ? 'f' : ac.t === 'call' ? 'c' : ac.t === 'raise' || ac.t === 'bet' ? 'r' : ac.t === 'check' ? 'x' : '?';
    }
    if (c.street !== st) open = false;
  }
  let eqReal = null;
  const callers = Object.keys(first).filter(k => first[k] === 'c');
  if (callers.length === 1 && Object.keys(first).every(k => first[k] !== 'r')) eqReal = exactEq(h.p[0].cards, c.p[+callers[0]].cards, h.board);
  const adj = HS.allInAdjusted(c, seed + '|cfai|' + h.no + '|' + h.actions.length + '|' + JSON.stringify(a));
  return { real: (adj.adj + heroTot) / c.bb, first, eqReal };
}
const spots = [];
const db = PT.stats.newDb(), heroRec = PT.stats.newRecord('hero', 'Du');
const cfg = Object.assign(PT.session.defaultConfig(), { startBB: 100 });
const t = PT.session.newTable(cfg, db, seed), start = cfg.startBB * cfg.bb, t0 = Date.now();
for (let i = 0; i < hands; i++) {
  t.seats.forEach(s => { s.stack = start; });
  const h = PT.session.startHand(t, i + 1);
  while (!h.done) {
    const s = h.toAct;
    if (h.p[s].isHero) {
      const L = h.legal(0), v = PT.bots.publicView(h, 0), me = h.p[0];
      let an;
      if (h.street > 0 && L.canRaise) {
        const facing = L.toCall > 0, pot = h.potTotal(), acts = [], extra = [];
        if (!facing) { acts.push({ type: 'check', lab: 'check', x: 0 }); FRACS.forEach(x => { const to = fit(me.bet + pot * x, L, h.bb); if (!acts.some(q => q.amount === to)) { acts.push({ type: 'bet', amount: to, lab: String(x), x: (to - me.bet) / pot }); extra.push(to); } }); }
        else {
          acts.push({ type: 'fold', lab: 'fold', x: 0 }, { type: 'call', lab: 'call', x: 0 });
          RAISES.forEach(m => { const to = fit(h.cur + (m - 1) * L.toCall, L, h.bb); if (!acts.some(q => q.amount === to)) { acts.push({ type: 'raise', amount: to, lab: 'r' + m, x: (to - me.bet) / pot }); extra.push(to); } });
        }
        an = decideCoach(h, db, seed, 'exploit', extra);
        const ag = decideCoach(h, db, seed, 'gto', extra);
        const resp = h.p.filter(q => !q.isHero && !q.folded && !q.allIn).map(q => q.seat);
        const inp0 = HS.coachInput(h, db, seed, 'exploit');
        const rh = resp.map(sx => rangeHist(inp0, sx));
        const rec = { rh, aggrPrev: h.actions.some(x => x.st === h.street - 1 && x.s === 0 && (x.t === 'bet' || x.t === 'raise')), st: h.street, facing, nR: resp.length, potBB: pot / h.bb, spr: an.spr, eq: an.equity.eq, ip: an.ip, pfa: h.pfa === 0, chosen: an.actions[0].label,
          hands: resp.map(sx => (db.opps[h.p[sx].id] || { hands: 0 }).hands), hud: resp.map(sx => PT.stats.playerType(db.opps[h.p[sx].id] || null)), cbet: !!(an.spotTags && an.spotTags.indexOf('cbet') >= 0), acts: [] };
        for (const a of acts) {
          const m = an.actions.filter(x => x.type === a.type && (a.amount == null || x.amount === a.amount))[0], g = ag.actions.filter(x => x.type === a.type && (a.amount == null || x.amount === a.amount))[0];
          const ro = rollout(h, a.amount != null ? { type: a.type, amount: a.amount } : { type: a.type }, db, heroRec, seed + '|cf');
          if (!ro) continue;
          const folds = m && m.parts && m.parts.folds ? m.parts.folds : null, gf = g && g.parts && g.parts.folds ? g.parts.folds : null;
          const one = m && m.parts && m.parts.branches ? m.parts.branches.filter(b => b.callers && b.callers.length === 1)[0] : null;
          rec.acts.push({ lab: a.lab, x: +a.x.toFixed(3), allin: a.amount === L.maxTo, ev: m ? +(m.ev / h.bb).toFixed(3) : null, u: m ? +(m.u / h.bb).toFixed(3) : null, evG: g ? +(g.ev / h.bb).toFixed(3) : null,
            real: +ro.real.toFixed(3), pf: folds ? folds.map(f => +f.f.toFixed(3)) : null, pr: folds ? folds.map(f => +f.r.toFixed(3)) : null, pfG: gf ? gf.map(f => +f.f.toFixed(3)) : null,
            eqCall: one && one.eq != null ? +one.eq.toFixed(3) : null, eqReal: ro.eqReal != null ? +ro.eqReal.toFixed(3) : null, resp: resp.map(sx => ro.first[sx] || '-') });
        }
        spots.push(rec);
      } else an = decideCoach(h, db, seed, 'exploit');
      const b = an.actions[0];
      let r = PT.session.act(t, h, 0, b.amount ? { type: b.type, amount: b.amount } : { type: b.type });
      if (!r.ok) { const L2 = h.legal(0); PT.session.act(t, h, 0, L2.canCheck ? { type: 'check' } : { type: 'fold' }); }
    } else HS.oppAct(h, s, comp, heroRec, (x, y) => PT.session.act(t, h, x, y));
  }
  PT.session.finishHand(t, db, h, heroRec);
  if ((i + 1) % 250 === 0) { fs.writeFileSync(outFile, JSON.stringify({ label, root, seed, comp, hands: i + 1, ms: Date.now() - t0, spots })); }
}
fs.writeFileSync(outFile, JSON.stringify({ label, root, seed, comp, hands, ms: Date.now() - t0, spots }));
console.log(outFile, spots.length, 'Spots', Math.round((Date.now() - t0) / 1000) + ' s');
