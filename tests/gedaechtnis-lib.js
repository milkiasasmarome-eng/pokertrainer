/* Gemeinsame Bausteine der Messreihen zum Gegnergedächtnis und zur Anpassung der Gegner-KI
   (tests/gedaechtnis-eval.js und tests/unit/gedaechtnis.js).
   Die Messung darf den internen Stil der Computergegner kennen (sie prüft die Gegner-KI); Datenbank, Anzeige und Coach nutzen ihn nie. */
'use strict';
const PT = require('./load.js').load();
const S = PT.stats, B = PT.bots;
function wald(k1, n1, k0, n0) {
  const p1 = n1 ? k1 / n1 : 0, p0 = n0 ? k0 / n0 : 0, se = Math.sqrt((n1 ? p1 * (1 - p1) / n1 : 0) + (n0 ? p0 * (1 - p0) / n0 : 0));
  return { p1: +p1.toFixed(4), n1, p0: +p0.toFixed(4), n0, diff: +(p1 - p0).toFixed(4), ci: [+(p1 - p0 - 1.96 * se).toFixed(4), +(p1 - p0 + 1.96 * se).toFixed(4)], rel: p0 ? +((p1 / p0) - 1).toFixed(3) : null };
}
function wilson(k, n, raw) {
  if (!n) return null; const p = k / n, z = 1.96, z2 = z * z, den = 1 + z2 / n, c = (p + z2 / (2 * n)) / den, h = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / den;
  return raw ? [Math.max(0, c - h), c + h] : [+(c - h).toFixed(4), +(c + h).toFixed(4)];
}
function quantile(a, q) { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }


const HERO_BOT = 'g003';  // Held spielt mit der Logik eines TAG-Computergegners, Abweichungen siehe heroDecide
const STYLE_IDS = {}; B.POOL.forEach(p => { const s = B.styleOf(p.id); (STYLE_IDS[s] = STYLE_IDS[s] || []).push(p.id); });

/** Spielt n Hände; switchMap: id → { at: Hand des Gegners, as: Bot-ID, deren Logik danach gilt } */
function playHands(t, db, heroRec, n, heroKind, hrng, opts) {
  for (let i = 0; i < n; i++) {
    const h = PT.session.startHand(t, t.handNo + 1);
    let guard = 0;
    while (!h.done) {
      if (++guard > 500) throw new Error('Hand hängt');
      if (h.p[h.toAct].isHero) {
        let a = heroDecide(h, hrng, heroKind), r = PT.session.act(t, h, 0, a);
        if (!r.ok) { const L = h.legal(0); r = PT.session.act(t, h, 0, L.canCheck ? { type: 'check' } : { type: 'call' }); }
      } else PT.session.botAct(t, h, heroRec);
    }
    const res = PT.session.finishHand(t, db, h, heroRec);
    if (opts && opts.onHand) opts.onHand(h, res);
  }
}
function preInfo(v) {
  const pre = v.actions.filter(a => a.st === 0 && a.t !== 'sb' && a.t !== 'bb');
  let rc = 0, opener = -1, limpers = 0, callers = 0;
  pre.forEach(a => { if (a.t === 'raise' || a.t === 'bet') { rc++; if (rc === 1) opener = a.s; callers = 0; } else if (a.t === 'call') { if (rc === 0) limpers++; else callers++; } });
  return { rc, opener, limpers, callers, pre };
}
/** Synthetische Heldenstrategien (nur Verhalten; die Bots sehen davon nur die öffentlichen Werte des Helden) */
function heroDecide(h, rng, kind) {
  const v = B.publicView(h, 0), L = v.legal;
  if (v.street === 0) {
    const pi = preInfo(v);
    let c = 0, idx3 = -1; pi.pre.forEach((a, j) => { if (a.t === 'raise' || a.t === 'bet') { c++; if (c === 2) idx3 = j; } });
    const facing3 = pi.rc === 2 && pi.opener === 0 && idx3 >= 0 && !pi.pre.slice(idx3 + 1).some(a => a.s === 0);
    if ((kind === 'f3b90' || kind === 'f3b45') && facing3) {
      return rng() < (kind === 'f3b90' ? 0.9 : 0.45) ? { type: 'fold' } : { type: 'call' };
    }
    if ((kind === 'steal90' || kind === 'steal45') && pi.rc === 1 && pi.limpers === 0 && pi.callers === 0 && (v.players[0].pos === 'SB' || v.players[0].pos === 'BB') &&
        ['CO', 'BTN', 'SB'].indexOf(v.players[pi.opener].pos) >= 0 && !pi.pre.some(a => a.s === 0)) {
      if (rng() < (kind === 'steal90' ? 0.9 : 0.45)) return { type: 'fold' };
      return { type: 'call' };
    }
  } else if (kind === 'station') {
    return L.toCall > 0 ? { type: 'call' } : { type: 'check' };
  }
  return B.decide(v, HERO_BOT, rng, null);
}
function newSetup(seed, ids, cfgOver) {
  const db = S.newDb(), heroRec = S.newRecord('hero', 'Du');
  const cfg = Object.assign(PT.session.defaultConfig(), cfgOver || {});
  const t = PT.session.newTable(cfg, db, seed);
  if (ids) { ids.forEach((id, i) => { t.seats[i + 1].id = id; }); PT.session.syncStatuses(t, db); }
  return { db, heroRec, t };
}


/** Wechselszenarien: Ein Gegner spielt pre eigene Hände nach Stil „from“, danach mit der Logik eines Gegners des Stils „to“.
    Kein Gegnerwechsel am Tisch (swapEvery 0), damit der Verlauf durchgehend beobachtet wird. */
function runSwitch(scen, reps, pre, post, seed0) {
  const out = [];
  const origDecideFor = B.decideFor;
  try {
    scen.forEach((sc, si) => {
      const R = { name: sc.name, from: sc.from, to: sc.to, runs: [] };
      for (let rep = 0; rep < reps; rep++) {
        const rng = PT.makeRng('sw|' + sc.name + '|' + rep + '|' + seed0);
        const pick = st => STYLE_IDS[st][Math.floor(rng() * STYLE_IDS[st].length)];
        const sw = pick(sc.from); let as = pick(sc.to); while (as === sw) as = pick(sc.to);
        const others = []; while (others.length < 4) { const st = ['lp', 'vl', 'nit', 'tag', 'lag', 'bal'][Math.floor(rng() * 6)], id = pick(st); if (id !== sw && id !== as && others.indexOf(id) < 0) others.push(id); }
        const ids = [sw].concat(others); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const x = ids[i]; ids[i] = ids[j]; ids[j] = x; }
        const { db, heroRec, t } = newSetup((seed0 + si * 1000 + rep) >>> 0, ids, { swapEvery: 0 });
        B.decideFor = function (hand, seat, r2, ctx) {
          const id = hand.p[seat].id, rec = db.opps[id];
          if (id === sw && rec && rec.hands >= pre) return B.decide(B.publicView(hand, seat), as, r2, ctx);
          return origDecideFor(hand, seat, r2, ctx);
        };
        const onset = {}; let falsePre = 0, firstAfter = null, firstKeys = null, othersOnsets = 0, othersHands = 0;
        const errAt = {};  // Schätzfehler VPIP/PFR nach dem Wechsel
        const hrng = PT.makeRng('hero|sw|' + rep + '|' + si);
        playHands(t, db, heroRec, pre + post, 'base', hrng, { onHand: () => {
          ids.forEach(id => {
            const r = db.opps[id], now = Object.keys(r.chg), prev = onset[id] || {};
            const fresh = now.filter(k => !prev[k]); const cur = {}; now.forEach(k => { cur[k] = 1; }); onset[id] = cur;
            if (id === sw) {
              if (r.hands <= pre) falsePre += fresh.length ? 1 : 0;
              else if (fresh.length && firstAfter == null) { firstAfter = r.hands - pre; firstKeys = fresh; }
              const after = r.hands - pre;
              if (after === 100 || after === 200 || after === 300) {
                const p = S.profile(r);
                ['vpip', 'pfr'].forEach(k => { (errAt[k] = errAt[k] || {})[after] = { mem: p.est[k], long: PT.ranges.smooth(r.stats)[k] }; });
              }
            } else { othersHands++; if (fresh.length) othersOnsets++; }
          });
        } });
        B.decideFor = origDecideFor;
        R.runs.push({ sw, as, delay: firstAfter, keys: firstKeys, falsePre, othersOnsets, othersHands, err: errAt });
      }
      out.push(R);
    });
  } finally { B.decideFor = origDecideFor; }
  return out;
}
/** Anpassung der Bots an synthetische Heldenstrategien: zählt Entscheidungen der Bots in festgelegten Situationen ab Hand measureFrom */
function runAdapt(kinds, hands, seed, measureFrom) {
  const out = {};
  const origDecideFor = B.decideFor;
  try {
    kinds.forEach(kind => {
      const C = { tb: [0, 0], tbCall: [0, 0], steal: [0, 0], cbet: [0, 0], bluff: [0, 0], bluffFlop: [0, 0], bluffTR: [0, 0], thinRiver: [0, 0], valueRiver: [0, 0], strongBet: [0, 0], heroStats: null };
      const inc = (k, hit) => { C[k][1]++; if (hit) C[k][0]++; };
      B.decideFor = function (hand, seat, r2, ctx) {
        const v = B.publicView(hand, seat), id = hand.p[seat].id, a = B.decide(v, id, r2, ctx), L = v.legal;
        const isRaise = a.type === 'raise' || a.type === 'bet' || a.type === 'allin';
        const live = v.players.filter(q => !q.folded), heroLive = v.players[0] && !v.players[0].folded;
        const late = hand.no > (measureFrom == null ? 1500 : measureFrom);  // erst nach Aufbau der Heldenwerte messen
        if (late && v.street === 0) {
          const pi = preInfo(v);
          if (pi.rc === 1 && pi.opener === 0 && L.canRaise && !pi.pre.some(x => x.s === seat)) { inc('tb', isRaise); inc('tbCall', a.type === 'call'); }
          if (pi.rc === 0 && pi.limpers === 0 && ['CO', 'BTN', 'SB'].indexOf(v.players[seat].pos) >= 0 && heroLive && (v.players[0].pos === 'SB' || v.players[0].pos === 'BB')) inc('steal', isRaise);
        } else if (late && v.street >= 1 && heroLive && live.length === 2 && L.toCall === 0 && L.canRaise) {
          const pr = B.percentile(v.cards, v.board).p, di = v.street < 3 ? PT.ranges.drawInfo(v.cards[0], v.cards[1], v.board) : { strong: false };
          const firstFlopPfa = v.street === 1 && v.pfa === seat && !v.actions.some(x => x.st === 1 && (x.t === 'bet' || x.t === 'raise'));
          if (firstFlopPfa) inc('cbet', isRaise);
          if (pr < 0.52 && !di.strong) { inc('bluff', isRaise); inc(v.street === 1 ? 'bluffFlop' : 'bluffTR', isRaise); }
          if (v.street === 3 && pr >= 0.76 && pr < 0.9) inc('thinRiver', isRaise);
          if (v.street === 3 && pr >= 0.9) inc('valueRiver', isRaise);
          if (pr >= 0.9) inc('strongBet', isRaise);
        }
        return a;
      };
      const { db, heroRec, t } = newSetup(seed, null, {});
      playHands(t, db, heroRec, hands, kind, PT.makeRng('hero|ad|' + kind + '|' + seed), null);
      B.decideFor = origDecideFor;
      const hp = S.profile(heroRec);
      C.heroStats = { hands: heroRec.hands, vpip: hp.vpip, pfr: hp.pfr, foldTo3Bet: hp.foldTo3Bet, foldToSteal: hp.foldToSteal, foldToCbet: hp.foldToCbet, wtsd: hp.wtsd, afq: hp.afq };
      out[kind] = C;
    });
  } finally { B.decideFor = origDecideFor; }
  return out;
}
/** Fehlalarmrate mit stationären Bernoulli-Strömen (Gelegenheitsraten und Anteile wie bei den Computergegnern gemessen) */
function runNull(nOpp, hands) {
  const PROFS = {
    TAG: { vpip: [0.99, 0.22], pfr: [0.99, 0.175], threeBet: [0.4, 0.07], cbetFlop: [0.08, 0.6], foldToCbet: [0.04, 0.53], afq: [0.2, 0.57], wtsd: [0.15, 0.34] },
    Nit: { vpip: [0.99, 0.115], pfr: [0.99, 0.084], threeBet: [0.41, 0.028], cbetFlop: [0.03, 0.55], foldToCbet: [0.02, 0.5], afq: [0.08, 0.46], wtsd: [0.08, 0.38] },
    'sehr loose': { vpip: [0.99, 0.44], pfr: [0.99, 0.25], threeBet: [0.44, 0.126], cbetFlop: [0.09, 0.64], foldToCbet: [0.07, 0.54], afq: [0.34, 0.5], wtsd: [0.28, 0.32] } };
  const out = {}, zs = [];
  Object.keys(PROFS).forEach(name => {
    const prof = PROFS[name], rng = PT.makeRng('null|' + name);
    let onsets = 0, anyIn = 0, flagged = 0; const byKey = {};
    for (let o = 0; o < nOpp; o++) {
      const r = S.newRecord('x', 'X'); let had = false;
      for (let h = 0; h < hands; h++) {
        const I = { stats: S.emptyStats(), agg: S.emptyAgg(), pos: 'BTN' };
        Object.keys(prof).forEach(k => { const rate = prof[k][0], p = prof[k][1]; const ops = rng() < rate ? 1 : 0; I.stats[k] = [ops && rng() < p ? 1 : 0, ops]; });
        const before = Object.assign({}, r.chg);
        S.applyToRecord(r, I, h);
        Object.keys(r.chg).forEach(k => { if (!before[k]) { onsets++; byKey[k] = (byKey[k] || 0) + 1; had = true; } });
        if (Object.keys(r.chg).length) flagged++;
        if (name === 'TAG' && o < 60 && h % 25 === 0) { const tt = S.changeTest(r.stats.vpip, r.recent.stats.vpip); if (tt) zs.push(tt.z); }
      }
      if (had) anyIn++;
    }
    out[name] = { opponents: nOpp, hands, onsetsPer1000: +(1000 * onsets / (nOpp * hands)).toFixed(4), pAnyAlarm: +(anyIn / nOpp).toFixed(4), pAnyCI: wilson(anyIn, nOpp), flaggedShare: +(flagged / (nOpp * hands)).toFixed(5), byKey };
  });
  const m = zs.reduce((a, b) => a + b, 0) / zs.length, sd = Math.sqrt(zs.reduce((a, b) => a + (b - m) * (b - m), 0) / (zs.length - 1));
  out.zVpipTAG = { n: zs.length, mean: +m.toFixed(3), sd: +sd.toFixed(3), shareAbsOver2: +(zs.filter(z => Math.abs(z) > 2).length / zs.length).toFixed(4) };
  return out;
}
module.exports = { PT, wald, wilson, quantile, preInfo, heroDecide, playHands, newSetup, STYLE_IDS, HERO_BOT, runSwitch, runAdapt, runNull };
