/* PokerTrainer 2.0 – Gegner-KI.
   100 feste Gegner mit persistentem Profil (Spielstil, individuelle Parameter, Können, Anpassungsfähigkeit).
   Ein Bot sieht nur öffentliche Informationen und seine eigenen Karten (publicView). */
(function (G) {
'use strict';
var PT = G.PT, U = PT.util, H = PT.hands, E = PT.eval, R = PT.ranges, clamp = U.clamp;

var NAMES = ('Anton Berta Carlo Dana Emil Frieda Gustav Hanna Ivo Jule Kalle Lotte Malte Nora Oskar Paula Quirin Rosa Sven Tilda ' +
  'Udo Vera Willi Xenia Yusuf Zoe Alma Bruno Cora Detlef Edda Falk Greta Hannes Ilka Jasper Kira Lars Mila Nils ' +
  'Olga Pit Ronja Sören Tara Ulf Vivi Wanda Yara Zeno Arne Bea Cem Doro Enno Fiona Gero Hilde Ines Jan ' +
  'Klara Lenz Maja Nele Ole Pia Ralf Selma Timo Ulla Valentin Wiebke Aylin Bodo Clea Dag Eva Fritz Gina Henrik ' +
  'Ida Jonas Kai Lina Mats Nina Otto Petra Rieke Silas Tamo Ute Vince Wolf Ada Björn Dörte Elif Finn Hedda').split(' ');
var STYLES = ['lp', 'vl', 'nit', 'tag', 'lag', 'bal'];
var STYLE_NAME = { lp: 'loose-passiv', vl: 'sehr loose', nit: 'Nit', tag: 'Tight Aggressive', lag: 'Loose Aggressive', bal: 'ausgeglichen' };
var STYLE_PLAN = [['lp', 20], ['vl', 15], ['nit', 15], ['tag', 25], ['lag', 15], ['bal', 10]];
// Grundparameter je Stil (Skalen relativ zum Faustregel-Chart; Häufigkeiten 0..1)
var BASE = {
  lp:  { rfi: 0.78, limp: 0.55, iso: 0.45, over: 0.65, call: 2.4, tb: 0.25, bl3: 0.1, fb: 0.55, osz: 3.5, cbet: 0.42, barrel: 0.28, river: 0.25, delayed: 0.18,
    bluff: 0.05, semi: 0.15, thin: 0.2, cr: 0.03, float: 0.04, slow: 0.3, over_b: 0.01, stick: 0.21, size: 0.5, donk: 0.12, skill: 0.25, adapt: 0.15 },
  vl:  { rfi: 1.75, limp: 0.3, iso: 1.4, over: 0.45, call: 2.4, tb: 1.9, bl3: 1.1, fb: 1.6, osz: 3, cbet: 0.76, barrel: 0.56, river: 0.42, delayed: 0.42,
    bluff: 0.3, semi: 0.55, thin: 0.45, cr: 0.12, float: 0.25, slow: 0.1, over_b: 0.1, stick: 0.12, size: 0.72, donk: 0.15, skill: 0.3, adapt: 0.2 },
  nit: { rfi: 0.52, limp: 0.04, iso: 0.5, over: 0.08, call: 0.45, tb: 0.45, bl3: 0.04, fb: 0.6, osz: 2.5, cbet: 0.55, barrel: 0.35, river: 0.25, delayed: 0.1,
    bluff: 0.05, semi: 0.2, thin: 0.1, cr: 0.05, float: 0.03, slow: 0.2, over_b: 0.01, stick: -0.16, size: 0.6, donk: 0.03, skill: 0.45, adapt: 0.25 },
  tag: { rfi: 1.0, limp: 0, iso: 1.0, over: 0.04, call: 0.85, tb: 1.0, bl3: 0.7, fb: 1.0, osz: 2.5, cbet: 0.64, barrel: 0.52, river: 0.45, delayed: 0.36,
    bluff: 0.14, semi: 0.55, thin: 0.35, cr: 0.09, float: 0.14, slow: 0.12, over_b: 0.05, stick: 0, size: 0.66, donk: 0.03, skill: 0.65, adapt: 0.6 },
  lag: { rfi: 1.5, limp: 0, iso: 1.4, over: 0.05, call: 1.2, tb: 1.55, bl3: 1.15, fb: 1.45, osz: 2.3, cbet: 0.74, barrel: 0.58, river: 0.5, delayed: 0.42,
    bluff: 0.22, semi: 0.65, thin: 0.45, cr: 0.13, float: 0.28, slow: 0.1, over_b: 0.12, stick: 0.05, size: 0.7, donk: 0.05, skill: 0.7, adapt: 0.7 },
  bal: { rfi: 1.05, limp: 0, iso: 1.05, over: 0.04, call: 0.95, tb: 1.05, bl3: 0.9, fb: 1.05, osz: 2.5, cbet: 0.6, barrel: 0.48, river: 0.44, delayed: 0.35,
    bluff: 0.17, semi: 0.55, thin: 0.4, cr: 0.1, float: 0.2, slow: 0.15, over_b: 0.08, stick: 0, size: 0.66, donk: 0.04, skill: 0.85, adapt: 0.8 }
};
var POOL = [], BOT = {}, NAME_OF = {};
(function () {
  var r = PT.makeRng(20261126), idx = NAMES.map(function (_, i) { return i; }), styleOf = [], k = 0, i;
  for (i = idx.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  STYLE_PLAN.forEach(function (pl) { for (var n = 0; n < pl[1]; n++) styleOf[idx[k++]] = pl[0]; });
  NAMES.forEach(function (nm, i2) {
    var id = 'g' + ('00' + (i2 + 1)).slice(-3), jr = PT.makeRng(1000 + i2), base = BASE[styleOf[i2]], P = {};
    var jPre = 0.9 + 0.2 * jr(), jPost = 0.9 + 0.2 * jr(), jSkill = (jr() - 0.5) * 0.2;
    Object.keys(base).forEach(function (key) {
      var v = base[key];
      if (['rfi', 'limp', 'iso', 'over', 'call', 'tb', 'bl3', 'fb'].indexOf(key) >= 0) v *= jPre;
      else if (['cbet', 'barrel', 'river', 'delayed', 'bluff', 'semi', 'thin', 'cr', 'float'].indexOf(key) >= 0) v = clamp(v * jPost, 0, 0.95);
      else if (key === 'skill') v = clamp(v + jSkill, 0.05, 0.98);
      P[key] = v;
    });
    P.noise = clamp(0.35 - 0.3 * P.skill, 0.04, 0.35);
    POOL.push({ id: id, name: nm });
    BOT[id] = { style: styleOf[i2], P: P };
    NAME_OF[id] = nm;
  });
})();
function nameOf(id) { return id === 'hero' ? 'Du' : (NAME_OF[id] || id); }

// ---------- Öffentliche Sicht ----------
/** Was ein Spieler am Tisch sehen darf: Aktionen, Board, Stacks und nur die eigenen Karten. */
function publicView(h, seat) {
  return {
    seat: seat, street: h.street, board: h.board.slice(), button: h.button, bb: h.bb, sb: h.sb, n: h.N,
    cards: h.p[seat].cards.slice(), pot: h.potTotal(), cur: h.cur, raises: h.raises, pfa: h.pfa, opener: h.opener,
    limpers: h.limpers, callsSince: h.callsSince, lastFull: h.lastFull, legal: h.legal(seat),
    players: h.p.map(function (q) {
      return { seat: q.seat, id: q.id, name: q.name, pos: q.pos, stack: q.stack, bet: q.bet, total: q.total, folded: q.folded, allIn: q.allIn, hero: q.isHero, start: q.start };
    }),
    actions: h.actions.map(function (a) { return { st: a.st, s: a.s, t: a.t, a: a.a, ai: a.ai, tc: a.tc, pot: a.pot, cur: a.cur, cr: a.cr }; })
  };
}

// ---------- Hilfen ----------
var boardCache = { key: '', sorted: null, tex: null };
function boardInfo(board) {
  var key = PT.cardsStr(board);
  if (boardCache.key === key) return boardCache;
  var dead = H.deadMaskOf(board), arr = [0, 0].concat(board), sc = [];
  for (var k = 0; k < H.NC; k++) { var a = H.C1[k], b = H.C2[k]; if (dead[a] || dead[b]) continue; arr[0] = a; arr[1] = b; sc.push(E.evaluate(arr)); }
  sc.sort(function (x, y) { return x - y; });
  boardCache = { key: key, sorted: Int32Array.from(sc), tex: R.analyzeBoard(board) };
  return boardCache;
}
/** Perzentil der eigenen Hand gegen zufällige Hände auf dem Board */
function percentile(cards, board) {
  var bi = boardInfo(board), s = E.evaluate(cards.concat(board)), a = bi.sorted, lo = 0, hi = a.length;
  while (lo < hi) { var m = (lo + hi) >> 1; if (a[m] < s) lo = m + 1; else hi = m; }
  var below = lo; lo = below; hi = a.length;
  while (lo < hi) { var m2 = (lo + hi) >> 1; if (a[m2] <= s) lo = m2 + 1; else hi = m2; }
  return { p: (below + (lo - below) / 2) / a.length, score: s, tex: bi.tex };
}
function round50(x, bb) { var u = Math.max(1, Math.round((bb || 100) / 2)); return Math.round(x / u) * u; }
function raiseTo(v, L, to) {
  if (!L.canRaise) return L.canCheck ? { type: 'check' } : { type: 'call' };
  to = Math.max(L.minTo, round50(to, v.bb));
  if (to > L.maxTo) to = L.maxTo;
  var me = v.players[v.seat];
  if (to - me.bet >= 0.4 * (me.stack + me.bet) || L.maxTo - to < v.bb) to = L.maxTo;
  if (to < L.minFull && to !== L.maxTo) to = L.maxTo;
  return { type: L.isBet ? 'bet' : 'raise', amount: to };
}
function passive(L) { return L.canCheck ? { type: 'check' } : { type: 'fold' }; }
function callOr(L) { return L.canCall ? { type: 'call' } : { type: 'check' }; }
function effStackBB(v) {
  var me = v.players[v.seat], mine = me.stack + me.bet, other = 0;
  v.players.forEach(function (q) { if (q.seat !== v.seat && !q.folded) other = Math.max(other, q.stack + q.bet); });
  return Math.min(mine, other) / v.bb;
}
function isIP(v) {
  var me = PT.POS_ORDER_POST[v.players[v.seat].pos];
  return v.players.every(function (q) { return q.seat === v.seat || q.folded || q.allIn || PT.POS_ORDER_POST[q.pos] < me; });
}
/** Anpassung an beobachtbare Werte des Helden (nur bei genug Stichprobe, geschrumpft) */
function adaptFactor(hs, key, base, k, minN) {
  if (!hs || !hs.raw || !hs.raw[key]) return 0;
  var nd = hs.raw[key]; if (nd[1] < (minN || 20)) return 0;
  var r = nd[0] / nd[1], w = nd[1] / (nd[1] + (k || 30));
  return (r - base) * w;
}

// ---------- Preflop ----------
function preflop(v, P, rng, ctx) {
  var me = v.players[v.seat], L = v.legal, pos = me.pos, idx = H.classIdx(v.cards[0], v.cards[1]);
  var x = H.classTop(idx), noisy = clamp(x * (1 + (rng() * 2 - 1) * P.noise), 0, 1);
  var pre = v.actions.filter(function (a) { return a.st === 0 && a.t !== 'sb' && a.t !== 'bb'; });
  var rc = 0, opener = -1, lastRaiser = -1, callers = 0, limpers = 0, lastTo = v.bb;
  pre.forEach(function (a) { if (a.t === 'raise' || a.t === 'bet') { rc++; if (rc === 1) opener = a.s; lastRaiser = a.s; lastTo = a.a; callers = 0; } else if (a.t === 'call') { if (rc === 0) limpers++; else callers++; } });
  var eff = effStackBB(v), hs = ctx && ctx.heroStats, heroAgg = lastRaiser >= 0 && v.players[lastRaiser].hero;
  function chartAct(row) { var r = rng(); if (r < row.raise) return 'raise'; if (r < row.raise + row.call) return 'call'; return 'fold'; }
  function rowFor(ch) { return ch[idx]; }
  // Kurzer Stack: Push/Fold
  if (eff <= 18 && rc <= 1) {
    if (rc === 0 && limpers === 0) {
      var pw = rowFor(R.chart('push', { pos: pos, bb: eff, scale: Math.sqrt(P.rfi) }));
      if (rng() < pw.raise) return { type: 'allin' };
      return pos === 'BB' ? passive(L) : passive(L);
    }
    if (rc === 1) {
      var vsW = (R.RFI_W[v.players[opener].pos] || 0.2) * 1.2;
      var cw = rowFor(R.chart('callPush', { vsWidth: vsW, callScale: P.call * 0.6 }));
      if (rng() < cw.call) return L.canRaise && eff < 12 ? { type: 'allin' } : (L.toCall >= me.stack ? { type: 'call' } : { type: 'allin' });
      return passive(L);
    }
  }
  if (rc === 0) {
    if (limpers === 0 && pos !== 'BB') {
      var heroBlind = v.players.some(function (q) { return q.hero && !q.folded && (q.pos === 'SB' || q.pos === 'BB'); });
      var adj = 1 + ((pos === 'CO' || pos === 'BTN' || pos === 'SB') && heroBlind ? clamp(adaptFactor(hs, 'foldToSteal', 0.6, 30, 30) * P.adapt * 1.5, -0.3, 0.4) : 0);
      var W = clamp((R.RFI_W[pos] || 0.2) * P.rfi * adj, 0.03, 0.95);
      if (noisy <= W) {
        if (P.limp > 0 && rng() < P.limp * (noisy > W * 0.35 ? 1 : 0.3)) return callOr(L);
        return raiseTo(v, L, (pos === 'SB' ? P.osz + 0.5 : P.osz) * v.bb);
      }
      if (P.limp > 0 && noisy <= W * (1 + 1.4 * P.limp) && rng() < P.limp) return callOr(L);
      return passive(L);
    }
    // Limper vor mir
    var Wi = clamp((R.RFI_W[pos] || 0.2) * 0.6 * P.iso, 0.02, 0.6);
    if (noisy <= Wi && L.canRaise) return raiseTo(v, L, ((pos === 'SB' || pos === 'BB') ? 4.5 : 3.5) * v.bb + limpers * v.bb);
    if (L.canCheck) return { type: 'check' };
    if (noisy <= clamp((R.RFI_W[pos] || 0.2) * (0.9 + P.over), 0.05, 0.9) && rng() < 0.4 + P.over * 0.6) return { type: 'call' };
    return { type: 'fold' };
  }
  var openerPos = v.players[opener].pos, sizeBB = lastTo / v.bb;
  if (rc === 1) {
    var tbAdj = heroAgg ? 1 + P.adapt * Math.max(0, adaptFactor(hs, 'steal', 0.4, 30, 30)) * 2.5 : 1;
    var ch = R.chart('vsOpen', { pos: pos, opener: openerPos, sizeBB: sizeBB, scale: P.tb * tbAdj, bluffScale: P.bl3 * tbAdj, callScale: P.call * tbAdj, squeeze: callers > 0 });
    var a1 = chartAct(rowFor(ch));
    if (a1 === 'raise' && L.canRaise) {
      var ip = PT.POS_ORDER_POST[pos] > PT.POS_ORDER_POST[openerPos];
      return raiseTo(v, L, lastTo * (ip ? 3 : 3.8) + callers * lastTo);
    }
    if (a1 === 'call' || (a1 === 'raise' && !L.canRaise)) {
      if (L.toCall > 0.45 * me.stack && x > 0.06) return passive(L);
      return callOr(L);
    }
    return passive(L);
  }
  if (rc === 2) {
    var ip2 = isIP(v), f4Adj = heroAgg ? 1 + P.adapt * Math.max(0, adaptFactor(hs, 'threeBet', 0.08, 40, 40)) * 5 : 1;
    var amOpener = opener === v.seat, openW = amOpener ? clamp((R.RFI_W[pos] || 0.2) * P.rfi, 0.05, 0.9) : 0.1;
    var ch2 = R.chart('vs3bet', { ip: ip2, openW: openW, scale: P.fb * f4Adj, bluffScale: P.bl3 * f4Adj, callScale: Math.sqrt(P.call) * f4Adj });
    var a2 = chartAct(rowFor(ch2));
    if (a2 === 'raise' && L.canRaise) return raiseTo(v, L, lastTo * 2.3);
    if (a2 === 'call' || a2 === 'raise') return callOr(L);
    return passive(L);
  }
  var ch3 = R.chart('vs4bet', { deep: eff > 150, scale: P.fb, callScale: Math.sqrt(P.call) });
  var a3 = chartAct(rowFor(ch3));
  if (a3 === 'raise' && L.canRaise) return { type: 'allin' };
  if (a3 === 'call' || a3 === 'raise') return callOr(L);
  return passive(L);
}

// ---------- Postflop ----------
function streetHistory(v) {
  var me = v.seat, o = { iBetPrev: false, pfaCheckedPrev: false, iCheckedThis: false, betThis: false, myBetsByStreet: [0, 0, 0, 0], aggrPrev: -1 };
  v.actions.forEach(function (a) {
    if (a.st === 0) return;
    if (a.s === me && (a.t === 'bet' || a.t === 'raise')) o.myBetsByStreet[a.st]++;
    if (a.st === v.street - 1 && (a.t === 'bet' || a.t === 'raise')) o.aggrPrev = a.s;
    if (a.st === v.street - 1 && a.s === v.pfa && a.t === 'check') o.pfaCheckedPrev = true;
    if (a.st === v.street && a.s === me && a.t === 'check') o.iCheckedThis = true;
    if (a.st === v.street && (a.t === 'bet' || a.t === 'raise')) o.betThis = true;
  });
  o.iBetPrev = v.street > 1 && o.myBetsByStreet[v.street - 1] > 0;
  return o;
}
function sizeFor(v, P, tex, kind) {
  var base = clamp(P.size, 0.33, 0.85);
  if (P.skill > 0.55) {
    if (tex.wet >= 0.55) base += 0.12; else if (tex.wet <= 0.25 && v.street === 1 && kind === 'cbet') base = Math.min(base, 0.38);
  }
  if (kind === 'overbet') base = 1.25;
  if (v.street === 3 && kind !== 'thin') base += 0.08;
  if (kind === 'thin') base = Math.min(base, 0.5);
  return clamp(base, 0.25, 1.5);
}
function postflop(v, P, rng, ctx) {
  var me = v.players[v.seat], L = v.legal, pot = v.pot;
  var pr = percentile(v.cards, v.board), p = pr.p, tex = pr.tex, cat = pr.score >> 20;
  var nOpp = v.players.filter(function (q) { return !q.folded && q.seat !== v.seat; }).length;
  var di = v.street < 3 ? R.drawInfo(v.cards[0], v.cards[1], v.board) : { strong: false, oesd: false, fd: false, gut: false };
  // Board-only-Hände abwerten (z. B. gepaartes Board ohne Beteiligung)
  var bScore = v.board.length >= 5 ? E.evaluate(v.board) : -1;
  if (bScore >= 0 && pr.score === bScore) p = Math.min(p, 0.3);
  p = clamp(p - 0.035 * (nOpp - 1) + (rng() * 2 - 1) * P.noise * 0.12, 0, 1);
  var cls = p >= 0.97 && cat >= 2 ? 'monster' : p >= 0.9 ? 'strong' : p >= 0.76 ? 'medium' : p >= 0.52 ? 'weak' : 'air';
  if (v.street === 3 && cls === 'weak') cls = p >= 0.62 ? 'weak' : 'air';
  var hsI = streetHistory(v), ip = isIP(v), spr = Math.min(me.stack, maxOppStack(v)) / Math.max(1, pot);
  var hs = ctx && ctx.heroStats, heroIn = v.players.some(function (q) { return q.hero && !q.folded; });
  var bluffMul = 1, valueMul = 1;
  if (heroIn && hs) {
    var st = adaptFactor(hs, 'wtsd', 0.28, 30, 25);
    bluffMul = clamp(1 - P.adapt * st * 3, 0.4, 1.6);
    if (v.street === 1) bluffMul *= clamp(1 + P.adapt * adaptFactor(hs, 'foldToCbet', 0.45, 20, 15) * 2.2, 0.5, 1.8);
    valueMul = clamp(1 + P.adapt * st * 1.5, 0.8, 1.4);
  }
  var mw = nOpp > 1 ? Math.pow(0.6, nOpp - 1) : 1;
  if (L.toCall === 0) {
    if (!L.canRaise) return { type: 'check' };
    var bet = function (kind) { return raiseTo(v, L, me.bet + Math.max(v.bb, pot * sizeFor(v, P, tex, kind))); };
    if (spr < 1.3 && (cls === 'monster' || cls === 'strong' || (cls === 'medium' && spr < 0.7))) return { type: 'allin' };
    var isPfa = v.pfa === v.seat, first = !hsI.betThis;
    var texMod = P.skill > 0.5 ? (tex.wet <= 0.3 ? 1.15 : tex.wet >= 0.6 ? 0.85 : 1) * (tex.high >= 11 && isPfa ? 1.1 : 1) : 1;
    var pB;
    if (cls === 'monster') pB = 1 - P.slow * (v.street < 3 ? 1 : 0.3);
    else if (cls === 'strong') pB = 0.8 * valueMul;
    else if (cls === 'medium') pB = (v.street === 3 ? P.thin : P.thin * 0.9 + 0.1) * valueMul * mw;
    else if (di.strong) pB = P.semi * mw;
    else if (cls === 'weak') pB = P.bluff * 0.6 * bluffMul * mw;
    else pB = P.bluff * bluffMul * mw;
    if (isPfa && first) {
      if (v.street === 1) {
        if (cls === 'air' || cls === 'weak') pB = clamp(P.cbet * texMod * bluffMul * 0.85, 0, 0.95) * mw;
        else if (cls === 'medium') pB = Math.max(pB, P.cbet * 0.75 * mw);
        else if (di.strong) pB = Math.max(pB, P.cbet * mw);
      } else if (hsI.iBetPrev) {
        var barrel = v.street === 2 ? P.barrel : P.river;
        var scare = P.skill > 0.55 && (v.board[v.board.length - 1] >> 2) > Math.max.apply(null, v.board.slice(0, v.board.length - 1).map(function (c) { return c >> 2; }));
        if (cls === 'air' || cls === 'weak') pB = barrel * bluffMul * (scare ? 1.3 : 0.75) * mw * (v.street === 3 && di.strong === false ? 0.9 : 1);
        else if (cls === 'medium') pB = barrel * (v.street === 3 ? 0.45 : 0.6);
      }
    } else if (!isPfa && first) {
      var pfaSeat = v.pfa, pfaLive = pfaSeat >= 0 && !v.players[pfaSeat].folded;
      var pfaAfter = pfaLive && PT.POS_ORDER_POST[v.players[pfaSeat].pos] > PT.POS_ORDER_POST[me.pos];
      if (pfaAfter && !hsI.iCheckedThis) {
        // Donk-Bet in den Aggressor
        if (cls === 'monster' || cls === 'strong') pB *= 0.35 + P.donk; else pB *= P.donk * 2;
      } else if (hsI.pfaCheckedPrev || (v.street >= 2 && hsI.aggrPrev < 0)) {
        if (cls === 'air' || cls === 'weak') pB = Math.max(pB, P.float * 1.4 * bluffMul * mw);
      } else if (ip && (cls === 'air') && v.street === 1) pB = Math.max(pB, P.float * mw);
      if (hsI.aggrPrev >= 0 && hsI.aggrPrev !== v.seat && !v.players[hsI.aggrPrev].folded && !(PT.POS_ORDER_POST[v.players[hsI.aggrPrev].pos] < PT.POS_ORDER_POST[me.pos])) pB *= 0.5;
    }
    if (rng() < clamp(pB, 0, 0.98)) {
      if (v.street === 3 && cls === 'monster' && rng() < P.over_b * 3) return bet('overbet');
      if (v.street >= 2 && (cls === 'air') && P.skill > 0.6 && rng() < P.over_b) return bet('overbet');
      return bet(cls === 'medium' ? 'thin' : (isPfa && v.street === 1 ? 'cbet' : 'value'));
    }
    return { type: 'check' };
  }
  // Einsatz offen
  var toCall = L.callAmt, price = toCall / (pot + toCall), f = L.toCall / Math.max(1, pot - L.toCall);
  var bettor = -1; for (var i = v.actions.length - 1; i >= 0; i--) { var a0 = v.actions[i]; if (a0.st === v.street && (a0.t === 'bet' || a0.t === 'raise')) { bettor = a0.s; break; } }
  var bluffy = 0.3;
  if (bettor >= 0 && v.players[bettor].hero && hs && hs.sm) bluffy = clamp(0.15 + (hs.sm.afq - 0.3) * 0.9, 0.1, 0.6);
  var t0 = clamp(0.57 + 0.2 * Math.min(f, 1.6) - 0.3 * bluffy + (v.street - 1) * 0.06 + (v.raises >= 2 ? 0.1 : 0) + (nOpp > 1 ? 0.04 : 0), 0.35, 0.95);
  var eq = clamp((p - t0) / Math.max(0.05, 1 - t0), 0, 1);
  if (di.strong && v.street < 3) {
    var outs = (di.fd ? 9 : 0) + (di.oesd ? 8 : di.gut ? 4 : 0) - (di.fd && di.so ? 2 : 0);
    eq = Math.max(eq, clamp(outs * (v.street === 1 ? 0.035 : 0.02), 0, 0.55));
  }
  var stick = P.stick * (v.street === 3 ? 0.7 : 1) + (heroIn && bettor >= 0 && v.players[bettor].hero ? P.adapt * 0.1 * Math.max(0, bluffy - 0.3) : 0);
  var allInCall = toCall >= me.stack;
  // Raise-Optionen
  if (L.canRaise && v.raises < 4) {
    var pr2 = 0;
    if (cls === 'monster') pr2 = (1 - P.slow * 0.6) * (hsI.iCheckedThis ? 0.5 + P.cr * 3 : 0.6);
    else if (cls === 'strong') pr2 = (hsI.iCheckedThis ? P.cr * 2.2 : P.cr * 1.5) * (v.raises >= 2 ? 0.2 : 1);
    else if (di.strong && v.street < 3) pr2 = P.cr * 1.4 * P.semi * 2 * (v.raises >= 2 ? 0.1 : 1);
    else if (cls === 'air' && v.raises === 1) pr2 = P.cr * 0.4 * P.bluff * 2 * bluffMul;
    if (spr < 1.5 && (cls === 'monster' || cls === 'strong')) return { type: 'allin' };
    if (rng() < clamp(pr2 * mw, 0, 0.9)) return raiseTo(v, L, v.cur * (v.street === 3 ? 2.8 : 3) + (pot - v.cur - me.bet) * 0.25);
  }
  var implied = di.strong && v.street < 3 && !allInCall ? 0.05 : 0;
  if (eq + stick + implied >= price) return { type: 'call' };
  if (cls === 'monster' || cls === 'strong') return { type: 'call' };
  return { type: 'fold' };
}
function maxOppStack(v) { var m = 0; v.players.forEach(function (q) { if (q.seat !== v.seat && !q.folded) m = Math.max(m, q.stack); }); return m; }

/** Entscheidung eines Bots. ctx: {heroStats} */
function decide(view, botId, rng, ctx) {
  var b = BOT[botId] || { style: 'tag', P: BASE.tag };
  var P = b.P;
  var a = view.street === 0 ? preflop(view, P, rng, ctx) : postflop(view, P, rng, ctx);
  return a;
}
/** Entscheidung direkt aus einer laufenden Hand (nur publicView wird weitergegeben). */
function decideFor(hand, seat, rng, ctx) {
  return decide(publicView(hand, seat), hand.p[seat].id, rng, ctx);
}

PT.bots = { NAMES: NAMES, POOL: POOL, STYLES: STYLES, STYLE_NAME: STYLE_NAME, STYLE_PLAN: STYLE_PLAN, BASE: BASE,
  nameOf: nameOf, publicView: publicView, decide: decide, decideFor: decideFor, percentile: percentile,
  styleOf: function (id) { return BOT[id] ? BOT[id].style : null; }, paramsOf: function (id) { return BOT[id] ? BOT[id].P : null; } };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
