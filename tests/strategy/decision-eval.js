/* Varianzarme Zusatzmessung: gepaarte Rollout-Bewertung je Entscheidungspunkt (Coach 2.1 gegen 2.0.1).
   Entscheidungspunkte stammen aus Sessions (Seeds, Zusammensetzungen, Stacks, auch unbekannte Strategien). Der Pfad der Session folgt
   abwechselnd 2.1 (ungerade Session-Nummer) und 2.0.1 (gerade), damit keine Version „ihre“ Spots bevorzugt. An jedem Punkt geben beide
   Coaches eine Empfehlung (gleiche publicView, gleiche Gegnerwerte). Nur wo sie sich unterscheiden, werden beide Aktionen ab dem echten
   Spielzustand je K-mal zu Ende gespielt: gleiche verdeckte Karten der Gegner (nur zur Auswertung, nie für den Coach), je Rollout-Index k
   gleiche künftige Boardkarten und gleiche Zufallsströme der Gegner für beide Aktionen. Nach der ersten Aktion spielt der Held mit einer festen,
   billigen Politik weiter (Gegner-KI-Profil g004) – ein Ein-Schritt-Vergleich der ersten Aktion, keine Bewertung ganzer Linien des Coaches.
   Aufruf: node tests/strategy/decision-eval.js [--k 100] [--only <Text>]; Zwischenergebnisse je Session in tests/results/decision-eval/,
   Auswertung in tests/results/strategy.json (Abschnitt decisionEval). */
'use strict';
const fs = require('fs'), path = require('path');
const HS = require('./harness.js'), PT = HS.PT, { makeRng } = require('./bootstrap.js');
const ROOT = path.join(__dirname, '..', '..'), V201 = process.env.PT_V201 || path.join(ROOT, '..', 'wt-v201');
const DIR = path.join(ROOT, 'tests', 'results', 'decision-eval');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const K = +opt('k', 100), ONLY = opt('only', null), HANDS = +opt('hands', 300);
// Sessions: Seeds vor dem Lauf festgelegt (getrennt von Kalibrierung, Entwicklung und Hauptvergleich)
const SESSIONS = [];
[['bots', 'gemischt', 100], ['bots', 'experte', 100], ['bots', 'anfaenger', 100], ['mixed', 'gemischt', 100], ['bots', 'gemischt', 40], ['bots', 'gemischt', 200],
 ['synth:maniac', 'gemischt', 100], ['synth:station', 'gemischt', 100], ['synth:rock', 'gemischt', 100], ['synth:mdf', 'gemischt', 100], ['synth:random', 'gemischt', 100], ['synth:switcher', 'gemischt', 100]]
  .forEach(([comp, diff, sb], i) => [1, 2].forEach(r => SESSIONS.push({ id: 's' + (5000 + 10 * i + r), seed: 5000 + 10 * i + r, comp, difficulty: diff, startBB: sb, path: r === 1 ? '2.1' : '2.0.1', hands: HANDS })));

const same = (a, b) => a.type === b.type && (a.amount || 0) === (b.amount || 0);
const act = b => b.amount ? { type: b.type, amount: b.amount } : { type: b.type };
function deckFor(h, rng) { const d = h.deck.slice(); for (let i = d.length - 1; i > h.dp; i--) { const j = h.dp + Math.floor(rng() * (i - h.dp + 1)); const t = d[i]; d[i] = d[j]; d[j] = t; } return d; }
/** Spielt die Hand ab dem aktuellen Zustand mit Aktion a des Helden zu Ende (Board ab h.dp neu gemischt mit Strom k) */
function rollout(h, a, sess, k, heroRec) {
  const rb = PT.rng.stream(sess.seed, 'ro-board', h.no, h.actions.length, k);
  const c = new PT.Hand({ players: h.p.map(q => ({ id: q.id, name: q.name, stack: q.start, isHero: q.isHero })), button: h.button, sb: h.sb, bb: h.bb, deck: deckFor(h, rb), no: h.no, ts: h.ts, rake: h.rake }).start();
  h.actions.forEach(x => { if (x.t === 'sb' || x.t === 'bb') return; const r = c.act(x.s, x.t === 'bet' || x.t === 'raise' ? { type: x.t, amount: x.a } : { type: x.t }); if (!r.ok) throw new Error('Kopie nicht nachspielbar'); });
  const heroTot = c.p[0].total;
  c.botRng = PT.rng.stream(sess.seed, 'ro-bots', h.no, h.actions.length, k);
  const hr = PT.rng.stream(sess.seed, 'ro-held', h.no, h.actions.length, k);
  let r = c.act(0, a); if (!r.ok) return null;
  let guard = 0;
  while (!c.done) {
    if (++guard > 300) throw new Error('Rollout hängt');
    const s = c.toAct;
    if (c.p[s].isHero) { const b = PT.bots.decide(PT.bots.publicView(c, 0), 'g004', hr, null); const r2 = c.act(0, b); if (!r2.ok) { const L = c.legal(0); c.act(0, L.canCheck ? { type: 'check' } : { type: 'fold' }); } }
    else HS.oppAct(c, s, sess.comp, heroRec, (x, y) => c.act(x, y));
  }
  return (c.result.net[0] + heroTot) / c.bb;
}
function spotType(v, a, b) {
  const g = x => x.type === 'bet' || x.type === 'raise' ? 'aggr' : x.type, ga = g(a), gb = g(b), nOpp = v.players.filter(q => !q.folded && q.seat !== v.seat).length;
  const facing = v.legal.toCall > 0, pair = [ga, gb].sort().join('/');
  let t;
  if (v.street === 0) t = 'preflop';
  else if (ga === 'aggr' && gb === 'aggr') t = 'postflop Größe';
  else if (!facing) t = 'postflop Bet vs. Check';
  else t = 'postflop gegen Einsatz (' + pair + ')';
  return { type: t, street: v.street, multiway: v.street > 0 && nOpp >= 2, facing };
}
function runSession(sess) {
  const file = path.join(DIR, sess.id + '-k' + K + '-h' + sess.hands + '.json');
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const C21 = HS.loadEngine(ROOT), C201 = HS.loadEngine(V201), t0 = Date.now();
  const cfg = Object.assign(PT.session.defaultConfig(), { startBB: sess.startBB, difficulty: sess.difficulty }), start = cfg.startBB * cfg.bb;
  const db = PT.stats.newDb(), heroRec = PT.stats.newRecord('hero', 'Du'), t = PT.session.newTable(cfg, db, sess.seed);
  const out = { id: sess.id, seed: sess.seed, comp: sess.comp, difficulty: sess.difficulty, startBB: sess.startBB, path: sess.path, K, hands: 0, points: 0, differ: 0, rows: [] };
  for (let i = 0; i < sess.hands; i++) {
    t.seats.forEach(s => { s.stack = start; });
    const h = PT.session.startHand(t, i + 1);
    while (!h.done) {
      const s = h.toAct;
      if (h.p[s].isHero) {
        const inp = HS.coachInput(h, db, sess.seed, 'exploit'), v = inp.view;
        const a21 = C21.coach.analyze(HS.clone(inp)).actions[0], a201 = C201.coach.analyze(HS.clone(inp)).actions[0];
        out.points++;
        if (!same(a21, a201)) {
          out.differ++;
          let s21 = 0, s201 = 0, n = 0, dsum = 0, dsq = 0;
          for (let k = 0; k < K; k++) {
            const x = rollout(h, act(a21), sess, k, heroRec), y = rollout(h, act(a201), sess, k, heroRec);
            if (x == null || y == null) continue;
            s21 += x; s201 += y; n++; dsum += x - y; dsq += (x - y) * (x - y);
          }
          const st = spotType(v, a21, a201), m = n ? dsum / n : 0;
          out.rows.push({ hand: h.no, st: st.street, type: st.type, mw: st.multiway, a21: a21.label, a201: a201.label, ev21: +(s21 / Math.max(1, n)).toFixed(3), ev201: +(s201 / Math.max(1, n)).toFixed(3),
            d: +m.toFixed(3), seD: n > 1 ? +Math.sqrt(Math.max(0, (dsq - dsum * dsum / n) / (n - 1)) / n).toFixed(3) : null, n });
        }
        const b = sess.path === '2.1' ? a21 : a201;
        let r = PT.session.act(t, h, 0, act(b));
        if (!r.ok) { const L = h.legal(0); PT.session.act(t, h, 0, L.canCheck ? { type: 'check' } : { type: 'fold' }); }
      } else HS.oppAct(h, s, sess.comp, heroRec, (x, y) => PT.session.act(t, h, x, y));
    }
    PT.session.finishHand(t, db, h, heroRec);
    out.hands++;
  }
  out.ms = Date.now() - t0;
  fs.writeFileSync(file, JSON.stringify(out));
  return out;
}
/** Cluster-Bootstrap über Hände (Punkte derselben Hand hängen zusammen); Punkte ohne Unterschied zählen mit Differenz 0 */
function summarize(list, filter, B) {
  B = B || 2000;
  const clusters = new Map(); let points = 0, differ = 0;
  list.forEach(s => {
    points += filter.all ? s.points : 0;
    s.rows.filter(r => filter.fn(r, s)).forEach(r => { differ++; const key = s.id + '|' + r.hand; (clusters.get(key) || clusters.set(key, []).get(key)).push(r.d); });
  });
  const cl = Array.from(clusters.values()), sums = cl.map(c => c.reduce((a, x) => a + x, 0)), ns = cl.map(c => c.length);
  const nDiff = ns.reduce((a, x) => a + x, 0), tot = sums.reduce((a, x) => a + x, 0);
  const rng = makeRng(4242), reps = [];
  for (let b = 0; b < B; b++) { let S = 0, N = 0; for (let i = 0; i < cl.length; i++) { const j = Math.floor(rng() * cl.length); S += sums[j]; N += ns[j]; } reps.push(N ? S / N : 0); }
  reps.sort((x, y) => x - y);
  const q = p => reps.length ? reps[Math.min(reps.length - 1, Math.floor(p * reps.length))] : 0;
  const res = { differPoints: nDiff, meanDiffBB: nDiff ? +(tot / nDiff).toFixed(3) : null, lo: nDiff ? +q(0.025).toFixed(3) : null, hi: nDiff ? +q(0.975).toFixed(3) : null, hands: cl.length };
  if (filter.all) { res.points = points; res.differShare = points ? +(differ / points).toFixed(4) : null; res.perPointBB = points ? +(tot / points).toFixed(4) : null;
    res.perPointLo = points && nDiff ? +(q(0.025) * nDiff / points).toFixed(4) : null; res.perPointHi = points && nDiff ? +(q(0.975) * nDiff / points).toFixed(4) : null; }
  res.verdict = !nDiff ? 'keine Unterschiede' : res.lo > 0 ? '2.1 belegt besser' : res.hi < 0 ? '2.1 belegt schlechter' : 'nicht belegt';
  return res;
}
function aggregate(list) {
  const isSynth = s => s.comp.indexOf('synth') === 0, known = s => !isSynth(s);
  const groups = { 'alle': { all: true, fn: () => true } };
  const by = (name, fn, all) => { groups[name] = { all: !!all, fn }; };
  by('Gegner-KI (bekannt)', (r, s) => known(s)); by('unbekannte Strategien', (r, s) => isSynth(s));
  ['preflop', 'postflop Bet vs. Check', 'postflop Größe'].forEach(t => by(t, r => r.type === t));
  by('postflop gegen Einsatz', r => /^postflop gegen Einsatz/.test(r.type)); by('Multiway (postflop)', r => r.mw);
  [0, 1, 2, 3].forEach(st => by(['Preflop', 'Flop', 'Turn', 'River'][st], r => r.st === st));
  const out = {};
  Object.keys(groups).forEach(g => {
    const f = groups[g];
    if (g === 'Gegner-KI (bekannt)' || g === 'unbekannte Strategien') { const sub = list.filter(s => (g === 'unbekannte Strategien') === isSynth(s)); out[g] = summarize(sub, { all: true, fn: () => true }); }
    else out[g] = summarize(list, f);
  });
  const bySession = list.map(s => ({ id: s.id, comp: s.comp, startBB: s.startBB, path: s.path, hands: s.hands, points: s.points, differ: s.differ, meanDiffBB: s.rows.length ? +(s.rows.reduce((a, r) => a + r.d, 0) / s.rows.length).toFixed(3) : null, ms: s.ms }));
  const pairs = {}; list.forEach(s => s.rows.forEach(r => { const k = r.a21.replace(/[0-9.,]+/g, '#') + ' ↔ ' + r.a201.replace(/[0-9.,]+/g, '#'); const p = pairs[k] || (pairs[k] = { n: 0, d: 0 }); p.n++; p.d += r.d; }));
  const topPairs = Object.keys(pairs).map(k => ({ pair: k, n: pairs[k].n, meanDiffBB: +(pairs[k].d / pairs[k].n).toFixed(3) })).sort((a, b) => b.n - a.n).slice(0, 15);
  return { K, sessions: list.length, hands: list.reduce((a, s) => a + s.hands, 0), method: 'gepaarte Rollouts je Entscheidungspunkt; Fortsetzung des Helden mit Gegner-KI-Profil g004; Cluster-Bootstrap über Hände (2.000 Wiederholungen)', groups: out, bySession, topPairs };
}
if (require.main === module) {
  fs.mkdirSync(DIR, { recursive: true });
  const todo = SESSIONS.filter(s => !ONLY || s.id.indexOf(ONLY) >= 0 || s.comp.indexOf(ONLY) >= 0);
  const done = [];
  for (const s of todo) { const t0 = Date.now(); const r = runSession(s); done.push(r); console.log(s.id + ' ' + s.comp + ' ' + s.startBB + ' BB: ' + r.points + ' Punkte, ' + r.differ + ' verschieden, ' + Math.round((Date.now() - t0) / 1000) + ' s'); }
  const all = SESSIONS.map(s => { const f = path.join(DIR, s.id + '-k' + K + '-h' + s.hands + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; }).filter(Boolean);
  const agg = aggregate(all);
  const file = path.join(ROOT, 'tests', 'results', 'strategy.json');
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* neu */ }
  prev.decisionEval = agg; fs.writeFileSync(file, JSON.stringify(prev, null, 1));
  console.log(JSON.stringify(agg.groups, null, 1));
}
module.exports = { aggregate, summarize, SESSIONS };
