/* Vergleichsrahmen: synthetische Gegnerstrategien (dem Coach unbekannt) und mathematisch definierte Referenzstrategien für den Helden.
   Alle Strategien sehen nur die öffentliche Sicht ihres Platzes (publicView: eigene Karten, Board, Aktionen, Stacks).
   Sie gehören nicht zum App-Code; der Coach kennt sie nicht und erfährt nur, was am Tisch sichtbar ist (Datenbankwerte). */
'use strict';

function make(PT) {
  const H = PT.hands, R = PT.ranges, E = PT.eval;
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const top = v => H.classTop(H.classIdx(v.cards[0], v.cards[1]));     // 0 = beste Starthand, 1 = schlechteste
  const me = v => v.players[v.seat];
  const nOpp = v => v.players.filter(q => !q.folded && q.seat !== v.seat).length;
  const strength = v => v.board.length >= 3 ? PT.bots.percentile(v.cards, v.board).p : 1 - top(v);  // Perzentil gegen zufällige Hände
  const check = L => L.canCheck ? { type: 'check' } : { type: 'fold' };
  const call = L => L.canCall ? { type: 'call' } : { type: 'check' };
  function raiseTo(v, to) {
    const L = v.legal;
    if (!L.canRaise) return call(L);
    to = Math.round(clamp(to, L.minTo, L.maxTo));
    return { type: L.isBet ? 'bet' : 'raise', amount: to };
  }
  const potBet = (v, f) => me(v).bet + Math.max(v.bb, f * v.pot);
  const draw = v => v.board.length >= 3 && v.board.length < 5 ? R.drawInfo(v.cards[0], v.cards[1], v.board) : { strong: false };
  const preRaises = v => v.actions.filter(a => a.st === 0 && (a.t === 'raise' || a.t === 'bet')).length;

  /** Maniac: sehr weit, sehr aggressiv, große Einsätze */
  function maniac(v, rng) {
    const L = v.legal, x = strength(v);
    if (v.street === 0) {
      const t = top(v), rc = preRaises(v);
      if (t <= 0.6 - 0.15 * rc && rng() < 0.85) return raiseTo(v, Math.max(v.cur * 3, 3 * v.bb));
      if (L.toCall <= 0) return check(L);
      return t <= 0.75 ? call(L) : { type: 'fold' };
    }
    if (L.toCall === 0) return rng() < 0.7 ? raiseTo(v, potBet(v, 1)) : check(L);
    if (rng() < (x > 0.6 ? 0.45 : 0.25)) return raiseTo(v, v.cur * 3 + v.pot * 0.2);
    return x >= 0.35 || draw(v).strong || rng() < 0.3 ? call(L) : { type: 'fold' };
  }
  /** Calling Station: callt fast alles, erhöht kaum */
  function station(v, rng) {
    const L = v.legal, x = strength(v);
    if (v.street === 0) {
      const t = top(v);
      if (t <= 0.03 && L.canRaise && rng() < 0.7) return raiseTo(v, Math.max(v.cur * 3, 3 * v.bb));
      if (L.toCall <= 0) return check(L);
      return t <= (L.toCall > 10 * v.bb ? 0.15 : 0.6) ? call(L) : { type: 'fold' };
    }
    if (L.toCall === 0) return x >= 0.9 && rng() < 0.6 ? raiseTo(v, potBet(v, 0.5)) : check(L);
    const need = L.callAmt / (v.pot + L.callAmt);
    return x >= 0.3 + 0.3 * need + (v.street === 3 ? 0.1 : 0) || draw(v).strong ? call(L) : { type: 'fold' };
  }
  /** Rock: sehr eng, setzt nur mit starken Händen, foldet viel */
  function rock(v, rng) {
    const L = v.legal, x = strength(v);
    if (v.street === 0) {
      const t = top(v), rc = preRaises(v);
      if (t <= (rc ? 0.03 : 0.08)) return raiseTo(v, Math.max(v.cur * 3, 3 * v.bb));
      if (t <= 0.11 && L.toCall <= 4 * v.bb) return L.toCall > 0 ? call(L) : check(L);
      return check(L);
    }
    if (L.toCall === 0) return x >= 0.85 ? raiseTo(v, potBet(v, 0.66)) : check(L);
    if (x >= 0.96 && rng() < 0.5) return raiseTo(v, v.cur * 3);
    return x >= 0.82 ? call(L) : { type: 'fold' };
  }
  /** MDF-Verteidiger: preflop Faustregel-Chart; postflop verteidigt er genau den MDF-Anteil (nach Perzentil), Bets polarisiert */
  function mdf(v, rng) {
    const L = v.legal, x = strength(v), p = me(v);
    if (v.street === 0) {
      const ci = H.classIdx(v.cards[0], v.cards[1]), rc = preRaises(v);
      let row;
      if (rc === 0) row = R.chart('rfi', { pos: p.pos })[ci];
      else if (rc === 1) { const op = v.actions.filter(a => a.st === 0 && (a.t === 'raise' || a.t === 'bet'))[0]; row = R.chart('vsOpen', { pos: p.pos, opener: v.players[op.s].pos, sizeBB: op.a / v.bb })[ci]; }
      else if (rc === 2) row = R.chart('vs3bet', { openW: 0.25, ip: false })[ci];
      else row = R.chart('vs4bet', {})[ci];
      const r = rng();
      if (r < row.raise) return raiseTo(v, rc === 0 ? 2.5 * v.bb : v.cur * 3);
      if (r < row.raise + row.call) return L.toCall > 0 ? call(L) : check(L);
      return check(L);
    }
    if (L.toCall === 0) {
      if (x >= 0.8 || (x < 0.12 && rng() < 0.6)) return raiseTo(v, potBet(v, 0.66));
      return check(L);
    }
    const bet = L.toCall, potBefore = v.pot - bet, mdfV = potBefore / Math.max(1, potBefore + bet);
    const defend = 1 - Math.pow(1 - mdfV, 1 / Math.max(1, nOpp(v)));
    if (x >= 0.95 && rng() < 0.4) return raiseTo(v, v.cur * 3);
    return x >= 1 - defend || (draw(v).strong && rng() < 0.5) ? call(L) : { type: 'fold' };
  }
  /** Zufällig legal: gleichverteilte legale Aktionen, zufällige Größe */
  function randomLegal(v, rng) {
    const L = v.legal, opts = [];
    if (L.toCall > 0 && L.canFold) opts.push('fold');
    opts.push(L.canCheck ? 'check' : 'call');
    if (L.canRaise) opts.push('raise');
    const o = opts[Math.floor(rng() * opts.length)];
    if (o === 'raise') return raiseTo(v, L.minTo + rng() * (Math.min(L.maxTo, me(v).bet + 2 * v.pot + L.toCall) - L.minTo));
    return { type: o };
  }
  /** Stilwechsler: alle 60 Hände Wechsel zwischen Maniac und Rock (Phase je Gegner versetzt) */
  function switcher(v, rng, info) {
    const phase = Math.floor(((info && info.handNo) || 0) / 60 + ((info && info.salt) || 0)) % 2;
    return phase === 0 ? maniac(v, rng) : rock(v, rng);
  }
  const SYNTH = { maniac, station, rock, mdf, random: randomLegal, switcher };

  // ---------- Referenzstrategien für den Helden ----------
  const FULL = R.full();
  /** Pot-Odds-Schwelle: Equity gegen zufällige Hände (je Gegner im Pot); Call ab Pot Odds, Bet/Raise ab fester Schwelle */
  function potOdds(v, rng) {
    const L = v.legal, n = Math.max(1, nOpp(v));
    const res = PT.equity.equity({ hero: v.cards, board: v.board, ranges: new Array(n).fill(FULL), level: 'schnell', rng, budget: { left: 400, used: 0 }, cache: false });
    const eq = res.eq == null ? 0.5 : res.eq, fair = 1 / (n + 1);
    if (L.toCall > 0) {
      const need = L.callAmt / (v.pot + L.callAmt);
      if (eq >= Math.max(0.7, fair + 0.35) && L.canRaise) return raiseTo(v, v.cur * 3);
      return eq >= need ? call(L) : { type: 'fold' };
    }
    if (eq >= Math.max(0.6, fair + 0.25)) return v.street === 0 ? raiseTo(v, 3 * v.bb) : raiseTo(v, potBet(v, 0.66));
    return check(L);
  }
  /** Push/Fold bei kurzem Stack (≤ 20 BB effektiv): All-in nach Push-Chart, Call gegen All-in nach Call-Chart; tiefer: Pot-Odds-Schwelle */
  function pushFold(v, rng) {
    const L = v.legal, p = me(v), effBB = Math.min(p.stack + p.bet, Math.max(...v.players.filter(q => q.seat !== v.seat && !q.folded).map(q => q.stack + q.bet))) / v.bb;
    if (v.street > 0 || effBB > 20) return potOdds(v, rng);
    const ci = H.classIdx(v.cards[0], v.cards[1]), rc = preRaises(v);
    if (rc === 0) {
      const row = R.chart('push', { pos: p.pos, bb: effBB })[ci];
      if (row.raise >= 0.5) return L.canRaise ? { type: L.isBet ? 'bet' : 'raise', amount: L.maxTo } : call(L);
      return check(L);
    }
    const op = v.actions.filter(a => a.st === 0 && (a.t === 'raise' || a.t === 'bet'))[0];
    const row = R.chart('callPush', { vsWidth: (R.RFI_W[v.players[op.s].pos] || 0.2) * 1.2 })[ci];
    if (row.call >= 0.5) return L.canRaise ? { type: L.isBet ? 'bet' : 'raise', amount: L.maxTo } : call(L);
    return check(L);
  }
  return { SYNTH, potOdds, pushFold };
}
module.exports = { make };
