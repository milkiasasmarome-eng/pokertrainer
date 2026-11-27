/* 2.3: abschließende Testgruppe synthetischer Gegnerstrategien (unabhängiger Prüfagent).
   Jede Strategie sieht nur die öffentliche Sicht ihres Platzes (v): eigene Karten, Board, Aktionen, Stacks.
   Beschreibung in BESCHREIBUNG.md (bis nach den abschließenden Tests verschlossen). */
'use strict';

function make(PT) {
  const H = PT.hands, R = PT.ranges;
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

  // ---------- Grundhilfen (nur öffentliche Sicht) ----------
  const me = v => v.players[v.seat];
  const top = v => H.classTop(H.classIdx(v.cards[0], v.cards[1]));          // 0 = beste Starthand
  const rk = c => c >> 2, su = c => c & 3;
  const isPair = v => rk(v.cards[0]) === rk(v.cards[1]);
  const isSuited = v => su(v.cards[0]) === su(v.cards[1]);
  const gap = v => Math.abs(rk(v.cards[0]) - rk(v.cards[1]));
  const hasAce = v => rk(v.cards[0]) === 12 || rk(v.cards[1]) === 12;
  const strength = v => v.board.length >= 3 ? PT.bots.percentile(v.cards, v.board).p : 1 - top(v);
  const drawOn = (v, board) => board.length >= 3 && board.length < 5 ? R.drawInfo(v.cards[0], v.cards[1], board) : { strong: false, fd: false, nfd: false, oesd: false, gut: false, combo: false, bdfd: false };
  const opps = v => v.players.filter(q => !q.folded && q.seat !== v.seat);
  const nOpp = v => opps(v).length;
  const stAct = (v, st) => v.actions.filter(a => a.st === st && a.t !== 'sb' && a.t !== 'bb');
  const mine = (v, st) => stAct(v, st).filter(a => a.s === v.seat);
  const aggr = a => a.t === 'bet' || a.t === 'raise';
  const iDid = (v, st, f) => mine(v, st).some(f);
  const someoneChecked = v => stAct(v, v.street).some(a => a.t === 'check' && a.s !== v.seat);
  const preRaises = v => stAct(v, 0).filter(aggr).length;
  const effBB = v => { const p = me(v), o = opps(v); if (!o.length) return (p.stack + p.bet) / v.bb; return Math.min(p.stack + p.bet, Math.max(...o.map(q => q.stack + q.bet))) / v.bb; };
  const spr = v => { const p = me(v), o = opps(v); const rem = Math.min(p.stack, o.length ? Math.max(...o.map(q => q.stack)) : p.stack); return rem / Math.max(1, v.pot); };
  const order = (v, q) => (q.seat - v.button - 1 + v.players.length) % v.players.length;   // Reihenfolge postflop (SB zuerst)
  const inPos = v => opps(v).every(q => order(v, q) < order(v, me(v)));
  const price = v => v.legal.callAmt / Math.max(1, v.pot + v.legal.callAmt);
  const betFrac = v => { const L = v.legal, before = v.pot - L.toCall; return L.toCall / Math.max(1, before); };   // offener Einsatz im Verhältnis zum Pot davor (näherungsweise)

  // ---------- Aktionen (immer legal) ----------
  const fold = v => v.legal.canCheck ? { type: 'check' } : { type: 'fold' };
  const call = v => v.legal.canCall ? { type: 'call' } : { type: 'check' };
  function raiseTo(v, to) {
    const L = v.legal;
    if (!L.canRaise) return call(v);
    to = Math.round(clamp(to, L.minTo, L.maxTo));
    return { type: L.isBet ? 'bet' : 'raise', amount: to };
  }
  const potBet = (v, f) => me(v).bet + Math.max(v.bb, f * v.pot);         // Bet als Anteil am Pot
  const raisePot = (v, mult, add) => v.cur * mult + v.pot * (add || 0);
  const jam = v => v.legal.canRaise ? { type: v.legal.isBet ? 'bet' : 'raise', amount: v.legal.maxTo } : call(v);

  // ---------- Boardtextur (eigene Auswertung) ----------
  function texture(board) {
    if (board.length < 3) return { dry: false, wet: false, paired: false, mono: false, high: -1, flush: 0, conn: 0 };
    const rc = new Array(13).fill(0), sc = [0, 0, 0, 0];
    board.forEach(c => { rc[rk(c)]++; sc[su(c)]++; });
    const paired = rc.some(x => x >= 2), flush = Math.max(...sc), high = Math.max(...board.map(rk));
    let conn = 0;   // höchste Zahl verschiedener Ränge in einem Fenster von 5 (Straßengefahr)
    const bits = rc.map(x => x > 0 ? 1 : 0); bits.unshift(bits[12]);   // Ass auch als 1
    for (let i = 0; i + 5 <= bits.length; i++) conn = Math.max(conn, bits.slice(i, i + 5).reduce((s, x) => s + x, 0));
    const wet = flush >= 3 || conn >= 3 || (flush === 2 && conn >= 2 && high < 11);
    const dry = !wet && flush <= (board.length === 3 ? 1 : 2) && conn <= 2 && high >= 10;
    return { dry, wet, paired, mono: flush >= 3, high, flush, conn };
  }
  /** Schreckkarte: neue Karte ist Overcard zum alten Board, bringt die dritte Flushfarbe oder verbindet zur Straßengefahr */
  function scare(board) {
    if (board.length < 4) return false;
    const prev = board.slice(0, -1), c = board[board.length - 1], tp = texture(prev), tn = texture(board);
    return rk(c) > tp.high || (tn.flush >= 3 && tp.flush < 3) || (tn.conn >= 4 && tp.conn < 4);
  }

  // ---------- Preflop-Bausteine ----------
  const POSW = { UTG: 0.14, HJ: 0.18, CO: 0.25, BTN: 0.38, SB: 0.3, BB: 0.3 };
  const openSize = v => Math.max(2.5 * v.bb, v.cur * 2.5) + stAct(v, 0).filter(a => a.t === 'call').length * v.bb;
  const openerPos = v => { const r = stAct(v, 0).filter(aggr)[0]; return r ? v.players[r.s].pos : null; };
  const callersAfterRaise = v => { const acts = stAct(v, 0); let seen = false, n = 0; acts.forEach(a => { if (aggr(a)) { seen = true; n = 0; } else if (seen && a.t === 'call') n++; }); return n; };
  const limpersBefore = v => { let n = 0; for (const a of stAct(v, 0)) { if (aggr(a)) break; if (a.t === 'call') n++; } return n; };

  // =====================================================================
  // 1) Texturleser
  function textur(v, rng) {
    const L = v.legal, p = me(v);
    if (v.street === 0) {
      const t = top(v), rc = preRaises(v), w = POSW[p.pos] || 0.2;
      if (rc === 0) return t <= w ? raiseTo(v, openSize(v)) : fold(v);
      if (rc === 1) {
        const late = p.pos === 'CO' || p.pos === 'BTN' || p.pos === 'SB';
        if (t <= 0.04 || (late && t > 0.1 && t <= 0.17 && rng() < 0.3)) return raiseTo(v, raisePot(v, 3));
        return t <= 0.2 && L.toCall <= 4 * v.bb ? call(v) : fold(v);
      }
      if (t <= 0.025) return raiseTo(v, raisePot(v, 2.4));
      return t <= 0.06 && L.toCall <= 14 * v.bb ? call(v) : fold(v);
    }
    const x = strength(v), tx = texture(v.board), dr = drawOn(v, v.board);
    if (L.toCall <= 0) {
      if (v.street === 3) {
        if (x >= 0.8) return raiseTo(v, potBet(v, tx.wet ? 0.7 : 0.5));
        return x < 0.15 && rng() < 0.08 ? raiseTo(v, potBet(v, 0.6)) : fold(v);
      }
      if (tx.paired && rng() < 0.6) return raiseTo(v, potBet(v, 0.25));
      if (tx.dry) { const fr = v.street === 1 ? 0.8 : (x >= 0.6 ? 0.9 : 0.25); return rng() < fr ? raiseTo(v, potBet(v, 0.33)) : fold(v); }
      if (tx.wet) return x >= 0.75 || dr.strong ? raiseTo(v, potBet(v, 0.75)) : fold(v);
      return x >= 0.65 || (dr.strong && rng() < 0.5) ? raiseTo(v, potBet(v, 0.5)) : fold(v);
    }
    const pr = price(v);
    if (v.street === 3) { if (x >= 0.95 && rng() < 0.5) return raiseTo(v, raisePot(v, 2.6)); return x >= 0.55 + 0.4 * pr ? call(v) : fold(v); }
    if (x >= 0.92) return raiseTo(v, raisePot(v, 3, 0.2));
    if (tx.wet) { if (dr.strong && rng() < 0.35) return raiseTo(v, raisePot(v, 3, 0.2)); return x >= 0.55 || dr.strong ? call(v) : fold(v); }
    if (tx.paired && v.street === 1 && betFrac(v) <= 0.6) return x >= 0.4 ? call(v) : fold(v);
    if (tx.dry) return x >= 0.5 ? call(v) : fold(v);
    return x >= 0.5 || dr.strong ? call(v) : fold(v);
  }

  // =====================================================================
  // 2) Stacktiefe und SPR
  function sprspieler(v, rng) {
    const L = v.legal, p = me(v), eff = effBB(v);
    if (v.street === 0) {
      const t = top(v), rc = preRaises(v);
      if (eff <= 25) {
        if (rc === 0) { const w = 0.12 + (25 - eff) * 0.012; return t <= w ? jam(v) : fold(v); }
        const w = 0.06 + (25 - eff) * 0.005; return t <= w ? jam(v) : fold(v);
      }
      const speculative = isPair(v) || (isSuited(v) && gap(v) <= 2);
      if (rc === 0) { const w = (POSW[p.pos] || 0.2) + (eff >= 120 && speculative ? 0.12 : 0); return t <= w ? raiseTo(v, openSize(v)) : fold(v); }
      if (rc === 1) {
        if (t <= 0.035) return raiseTo(v, raisePot(v, 3));
        if (eff >= 120 && speculative && L.toCall <= eff * v.bb / 15) return call(v);   // Implied Odds
        return t <= 0.14 && L.toCall <= 4 * v.bb ? call(v) : fold(v);
      }
      if (t <= 0.02 || (eff < 60 && t <= 0.04)) return eff < 60 ? jam(v) : raiseTo(v, raisePot(v, 2.3));
      if (eff >= 120 && isPair(v) && L.toCall <= eff * v.bb / 20) return call(v);
      return t <= 0.05 && L.toCall <= 12 * v.bb ? call(v) : fold(v);
    }
    const x = strength(v), dr = drawOn(v, v.board), s = spr(v);
    if (s <= 2.5) {                                     // festgelegt: rein oder raus
      if (x >= 0.62 || (dr.strong && v.street < 3)) return L.toCall <= 0 ? (rng() < 0.85 ? jam(v) : raiseTo(v, potBet(v, 0.5))) : jam(v);
      if (L.toCall <= 0) return fold(v);
      return price(v) < 0.2 && x >= 0.45 ? call(v) : fold(v);
    }
    if (s <= 7) {
      if (L.toCall <= 0) { if (x >= 0.7) return raiseTo(v, potBet(v, 0.6)); if (dr.strong && rng() < 0.5) return raiseTo(v, potBet(v, 0.6)); return fold(v); }
      if (x >= 0.9) return raiseTo(v, raisePot(v, 2.8, 0.2));
      return x >= 0.5 + 0.5 * price(v) || (dr.strong && v.street < 3) ? call(v) : fold(v);
    }
    // tief: Pot-Kontrolle, nur sehr starke Hände bauen den Pot
    const raisesNow = stAct(v, v.street).filter(aggr).length;
    if (L.toCall <= 0) { if (x >= 0.85) return raiseTo(v, potBet(v, 0.5)); if (x >= 0.6 && v.street === 1 && rng() < 0.3) return raiseTo(v, potBet(v, 0.33)); return fold(v); }
    if (x >= 0.96) return raiseTo(v, raisePot(v, 2.8, 0.1));
    if (raisesNow >= 2) return x >= 0.9 ? call(v) : fold(v);               // gegen Raise: keine Einzelpaare
    if (dr.strong && v.street < 3 && L.callAmt <= 0.1 * eff * v.bb) return call(v);
    const calledBefore = v.street >= 2 && iDid(v, v.street - 1, a => a.t === 'call');
    return x >= (calledBefore ? 0.7 : 0.55) ? call(v) : fold(v);
  }

  // =====================================================================
  // 3) Geschichte über mehrere Straßen (Barrel und Float)
  function geschichte(v, rng) {
    const L = v.legal, p = me(v);
    if (v.street === 0) {
      const t = top(v), rc = preRaises(v), w = (POSW[p.pos] || 0.2) + 0.07, ip = p.pos === 'BTN' || p.pos === 'CO';
      if (rc === 0) return t <= w ? raiseTo(v, openSize(v)) : fold(v);
      if (rc === 1) {
        if (t <= 0.05 || (t <= 0.4 && rng() < 0.08)) return raiseTo(v, raisePot(v, 3));
        return t <= (ip ? 0.32 : 0.2) && L.toCall <= 3.5 * v.bb ? call(v) : fold(v);
      }
      if (t <= 0.03) return raiseTo(v, raisePot(v, 2.3));
      return t <= 0.07 && L.toCall <= 10 * v.bb ? call(v) : fold(v);
    }
    const x = strength(v), dr = drawOn(v, v.board), pfa = v.pfa === v.seat, hu = nOpp(v) === 1, st = v.street;
    const betPrev = st >= 2 && iDid(v, st - 1, aggr), calledPrev = st >= 2 && iDid(v, st - 1, a => a.t === 'call');
    const calledTwice = st === 3 && iDid(v, 1, a => a.t === 'call') && iDid(v, 2, a => a.t === 'call');
    const sc = scare(v.board);
    if (L.toCall <= 0) {
      if (st === 1) {
        if (pfa) return rng() < (hu ? 0.75 : 0.4) || x >= 0.8 ? raiseTo(v, potBet(v, 0.55)) : fold(v);
        if (someoneChecked(v) && rng() < (hu ? 0.6 : 0.3)) return raiseTo(v, potBet(v, 0.5));
        return x >= 0.85 ? raiseTo(v, potBet(v, 0.6)) : fold(v);
      }
      if (betPrev) {
        if (x >= 0.7 || (sc && rng() < 0.6) || (dr.strong && rng() < 0.5)) return raiseTo(v, potBet(v, st === 3 ? 0.8 : 0.66));
        return fold(v);
      }
      if (calledPrev && someoneChecked(v) && rng() < 0.75) return raiseTo(v, potBet(v, 0.6));
      return x >= 0.8 ? raiseTo(v, potBet(v, 0.6)) : fold(v);
    }
    const pr = price(v);
    if (st === 1) {
      if (x >= 0.9 || (dr.combo && rng() < 0.5)) return raiseTo(v, raisePot(v, 3, 0.15));
      if (x >= 0.45 || dr.strong) return call(v);
      return inPos(v) && pr < 0.35 && (x >= 0.25 || dr.bdfd) && rng() < 0.6 ? call(v) : fold(v);   // Float
    }
    if (st === 2) {
      if (x >= 0.92) return raiseTo(v, raisePot(v, 2.8, 0.1));
      if (calledPrev && x < 0.5 && !dr.strong) return rng() < 0.15 ? call(v) : fold(v);
      return x >= 0.5 || dr.strong ? call(v) : fold(v);
    }
    if (x >= 0.95 && rng() < 0.6) return raiseTo(v, raisePot(v, 2.5));
    if (calledTwice && betFrac(v) >= 0.6) return x >= 0.75 ? call(v) : fold(v);
    return x >= 0.6 ? call(v) : fold(v);
  }

  // =====================================================================
  // 4) Anzahl Gegner (heads-up aggressiv, mehrweg eng)
  function mehrweg(v, rng) {
    const L = v.legal, p = me(v);
    if (v.street === 0) {
      const t = top(v), rc = preRaises(v), lp = limpersBefore(v);
      if (rc === 0) {
        if (lp === 0) { const w = { UTG: 0.12, HJ: 0.16, CO: 0.32, BTN: 0.5, SB: 0.4, BB: 0.3 }[p.pos] || 0.2; return t <= w ? raiseTo(v, openSize(v)) : fold(v); }
        if (t <= 0.06) return raiseTo(v, openSize(v));
        return (isPair(v) || (isSuited(v) && hasAce(v)) || t <= 0.25) && L.toCall <= v.bb ? call(v) : fold(v);
      }
      const cl = callersAfterRaise(v);
      if (rc === 1 && cl === 0) {
        const late = p.pos === 'CO' || p.pos === 'BTN' || p.pos === 'SB' || p.pos === 'BB';
        if (t <= 0.06 || (late && t <= 0.35 && rng() < 0.2)) return raiseTo(v, raisePot(v, 3));
        return t <= 0.15 && L.toCall <= 4 * v.bb ? call(v) : fold(v);
      }
      if (rc === 1) { if (t <= 0.03) return raiseTo(v, raisePot(v, 3.5, 0.2)); return (isPair(v) || t <= 0.08) && L.toCall <= 4 * v.bb ? call(v) : fold(v); }
      if (t <= 0.025) return raiseTo(v, raisePot(v, 2.3));
      return t <= 0.05 && L.toCall <= 12 * v.bb ? call(v) : fold(v);
    }
    const x = strength(v), dr = drawOn(v, v.board), n = nOpp(v);
    if (n === 1) {
      if (L.toCall <= 0) return rng() < 0.7 || x >= 0.75 ? raiseTo(v, potBet(v, 0.66)) : fold(v);
      if (x >= 0.8 || (v.street < 3 && rng() < 0.15)) return raiseTo(v, raisePot(v, 3, 0.1));
      return x >= 0.35 || dr.strong ? call(v) : fold(v);
    }
    if (n === 2) {
      if (L.toCall <= 0) return x >= 0.7 || (dr.strong && rng() < 0.3) ? raiseTo(v, potBet(v, 0.6)) : fold(v);
      if (x >= 0.9) return raiseTo(v, raisePot(v, 3));
      return x >= 0.6 || (dr.strong && price(v) < 0.3) ? call(v) : fold(v);
    }
    if (L.toCall <= 0) return x >= 0.9 ? raiseTo(v, potBet(v, 0.75)) : fold(v);
    if (x >= 0.96) return raiseTo(v, raisePot(v, 3));
    return x >= 0.8 || dr.nfd || (dr.combo && v.street === 1) ? call(v) : fold(v);
  }

  // =====================================================================
  // 5) Tilt nach sichtbarem Verlust (Gedächtnis je Gegner aus der eigenen Sicht)
  const MEM = new Map(); let lastHn = -1;
  function tiltState(v, info, rng) {
    const id = me(v).id || String(v.seat), hn = info && info.handNo != null ? info.handNo : (v.no || 0), p = me(v);
    if (hn < lastHn) MEM.clear();                        // neue Session (Handnummer läuft zurück): Gedächtnis leeren
    lastHn = hn;
    let m = MEM.get(id);
    if (!m || hn < m.hand) { m = { hand: hn, start: p.start, foldInv: 0, tiltUntil: -1 }; MEM.set(id, m); }
    if (hn > m.hand) {                                   // neue Hand: Ergebnis der letzten Hand, soweit sichtbar
      const lostByFold = m.foldInv >= 10 * v.bb;
      const lostByStack = p.start != null && m.start != null && p.start < m.start - 15 * v.bb;
      if (lostByFold || lostByStack) m.tiltUntil = hn + 6 + Math.floor(rng() * 12);
      m.hand = hn; m.start = p.start; m.foldInv = 0;
    }
    const others = opps(v).concat(v.players.filter(q => q.folded && q.seat !== v.seat)).map(q => q.start).filter(s => s != null).sort((a, b) => a - b);
    const med = others.length ? others[Math.floor(others.length / 2)] : p.start;
    const steaming = p.start != null && med && p.start < 0.5 * med;
    return { m, tilt: hn <= m.tiltUntil || steaming };
  }
  function tilt(v, rng, info) {
    const S = tiltState(v, info, rng), a = S.tilt ? tiltOn(v, rng) : tiltOff(v, rng);
    if (a.type === 'fold') S.m.foldInv = Math.max(S.m.foldInv, me(v).total || 0);
    return a;
  }
  function tiltOff(v, rng) {
    const L = v.legal, p = me(v);
    if (v.street === 0) {
      const t = top(v), rc = preRaises(v);
      if (rc === 0) return t <= (POSW[p.pos] || 0.2) * 0.85 ? raiseTo(v, openSize(v)) : fold(v);
      if (rc === 1) { if (t <= 0.035) return raiseTo(v, raisePot(v, 3)); return t <= 0.12 && L.toCall <= 4 * v.bb ? call(v) : fold(v); }
      if (t <= 0.02) return raiseTo(v, raisePot(v, 2.3));
      return t <= 0.04 && L.toCall <= 12 * v.bb ? call(v) : fold(v);
    }
    const x = strength(v), dr = drawOn(v, v.board);
    if (L.toCall <= 0) return x >= 0.7 || (dr.strong && rng() < 0.3) ? raiseTo(v, potBet(v, 0.6)) : fold(v);
    if (x >= 0.93) return raiseTo(v, raisePot(v, 3));
    return x >= 0.55 + 0.3 * price(v) || (dr.strong && v.street < 3 && price(v) < 0.3) ? call(v) : fold(v);
  }
  function tiltOn(v, rng) {
    const L = v.legal;
    if (v.street === 0) {
      const t = top(v), rc = preRaises(v);
      if (rc === 0) return t <= 0.55 ? raiseTo(v, Math.max(3.5 * v.bb, v.cur * 3.5)) : (L.toCall <= v.bb && t <= 0.75 ? call(v) : fold(v));
      if (t <= 0.2 && rng() < 0.6) return raiseTo(v, raisePot(v, 3.2));
      return t <= 0.6 && L.toCall <= 15 * v.bb ? call(v) : fold(v);
    }
    const x = strength(v), dr = drawOn(v, v.board);
    if (L.toCall <= 0) return rng() < 0.65 || x >= 0.7 ? raiseTo(v, potBet(v, 0.9)) : fold(v);
    if (x >= 0.7 || rng() < 0.3) return raiseTo(v, raisePot(v, 3, 0.2));
    return x >= 0.25 || dr.strong || dr.gut ? call(v) : fold(v);
  }

  // =====================================================================
  // 6) Freizeitspieler: Limps, Limp-Reraise, Donk-Leads, Paare bis zum Ende
  function limper(v, rng) {
    const L = v.legal, p = me(v);
    if (v.street === 0) {
      const t = top(v), rc = preRaises(v), limped = iDid(v, 0, a => a.t === 'call' || a.t === 'check');
      if (rc === 0) {
        if (t <= 0.03 && rng() < 0.3) return raiseTo(v, Math.max(3 * v.bb, v.cur * 3));
        if (p.pos === 'SB') return t <= 0.7 ? call(v) : fold(v);
        return t <= 0.55 ? call(v) : fold(v);
      }
      if (limped && t <= 0.03) return raiseTo(v, raisePot(v, 3.5));        // Limp-Reraise
      if (t <= 0.02) return raiseTo(v, raisePot(v, 3));
      if (limped) return t <= 0.3 && L.toCall <= 5 * v.bb ? call(v) : fold(v);
      return t <= 0.2 && L.toCall <= 4 * v.bb ? call(v) : fold(v);
    }
    const x = strength(v), dr = drawOn(v, v.board), pf = v.pfa;
    if (L.toCall <= 0) {
      const pfaStillToAct = pf >= 0 && pf !== v.seat && !v.players[pf].folded && !stAct(v, v.street).some(a => a.s === pf) && order(v, v.players[pf]) > order(v, me(v));
      if (pfaStillToAct && x >= 0.6 && rng() < 0.7) return raiseTo(v, potBet(v, 0.4));     // Donk-Lead
      if (x >= 0.6) return raiseTo(v, potBet(v, 0.5));
      return rng() < 0.1 ? raiseTo(v, potBet(v, 0.5)) : fold(v);
    }
    if (x >= 0.95) return raiseTo(v, raisePot(v, 2.5));
    if (v.street === 3) return x >= (price(v) <= 0.4 ? 0.5 : 0.7) ? call(v) : fold(v);
    return x >= 0.45 || dr.strong || dr.gut ? call(v) : fold(v);
  }

  // =====================================================================
  // 7) Gemischte Häufigkeiten mit Texturgrößen und geometrischer Größe für Nut-Hände
  function balance(v, rng) {
    const L = v.legal, p = me(v), r = rng();
    if (v.street === 0) {
      const t = top(v), rc = preRaises(v), w = POSW[p.pos] || 0.2;
      if (rc === 0) { if (t <= w) return raiseTo(v, openSize(v)); if (t <= w * 1.25 && isSuited(v) && r < 0.35) return raiseTo(v, openSize(v)); return fold(v); }
      if (rc === 1) {
        if (t <= 0.03) return r < 0.9 ? raiseTo(v, raisePot(v, 3)) : call(v);
        if (t <= 0.08) return r < 0.4 ? raiseTo(v, raisePot(v, 3)) : call(v);
        if (t <= 0.2) return r < 0.1 ? raiseTo(v, raisePot(v, 3)) : (L.toCall <= 4 * v.bb ? call(v) : fold(v));
        if (t <= 0.4 && isSuited(v) && hasAce(v) && r < 0.4) return raiseTo(v, raisePot(v, 3));   // Blocker-3-Bet
        return fold(v);
      }
      if (t <= 0.02) return r < 0.7 ? raiseTo(v, raisePot(v, 2.3)) : call(v);
      if (t <= 0.06) return r < 0.15 ? raiseTo(v, raisePot(v, 2.3)) : (L.toCall <= 12 * v.bb ? call(v) : fold(v));
      if (t <= 0.15 && isSuited(v) && hasAce(v) && r < 0.1) return raiseTo(v, raisePot(v, 2.3));
      return fold(v);
    }
    const x = strength(v), dr = drawOn(v, v.board), tx = texture(v.board), st = v.street;
    const size = st === 1 ? (tx.dry ? 0.33 : tx.wet ? 1 : 0.66) : st === 2 ? 0.75 : (r < 0.5 ? 1 : 0.5);
    const p0 = me(v), o = opps(v), rem = Math.min(p0.stack, o.length ? Math.max(...o.map(q => q.stack)) : p0.stack);
    const geo = () => { const n = 4 - st; const g = (Math.pow((v.pot + 2 * rem) / Math.max(1, v.pot), 1 / n) - 1) / 2; return clamp(g, 0.33, 1.5); };
    if (L.toCall <= 0) {
      if (x >= 0.9) return r < 0.8 ? raiseTo(v, potBet(v, geo())) : fold(v);      // Rest: Check (Fallen)
      if (x >= 0.78) return r < 0.7 ? raiseTo(v, potBet(v, size)) : fold(v);
      if (x >= 0.45) return st === 1 && r < 0.25 ? raiseTo(v, potBet(v, 0.33)) : fold(v);
      const bl = size / (1 + 2 * size);                                             // Bluffanteil je nach Größe
      if (dr.strong && st < 3) return r < 0.6 ? raiseTo(v, potBet(v, size)) : fold(v);
      if (x < 0.3) return r < bl * (st === 3 ? 1.2 : 0.8) ? raiseTo(v, potBet(v, size)) : fold(v);
      return fold(v);
    }
    const bf = betFrac(v), alpha = bf / (1 + bf), checkedFirst = iDid(v, st, a => a.t === 'check');
    if (checkedFirst && x >= 0.85 && r < 0.6) return raiseTo(v, raisePot(v, 3, 0.15));   // Check-Raise mit Value
    if (checkedFirst && dr.strong && st < 3 && r < 0.25) return raiseTo(v, raisePot(v, 3, 0.15));
    if (x >= 0.93 && r < 0.5) return raiseTo(v, raisePot(v, 2.8, 0.1));
    if (dr.strong && st < 3 && r < 0.15) return raiseTo(v, raisePot(v, 2.8, 0.1));
    const thr = clamp(0.25 + alpha * 0.9 + (st === 3 ? 0.08 : 0) - (inPos(v) ? 0.05 : 0), 0.2, 0.9);
    return x >= thr || (dr.strong && st < 3 && alpha < 0.45) ? call(v) : fold(v);
  }

  // =====================================================================
  // 8) Initiative: viele 3-Bets und Squeezes, Continuation Bets klein, sonst Fit or Fold
  function initiative(v, rng) {
    const L = v.legal, p = me(v);
    if (v.street === 0) {
      const t = top(v), rc = preRaises(v), w = { UTG: 0.15, HJ: 0.2, CO: 0.28, BTN: 0.42, SB: 0.35, BB: 0.3 }[p.pos] || 0.2;
      if (rc === 0) return t <= w ? raiseTo(v, openSize(v)) : fold(v);
      const iOpened = iDid(v, 0, aggr);
      if (rc === 1) {
        const cl = callersAfterRaise(v), op = openerPos(v), lateOp = op === 'CO' || op === 'BTN' || op === 'SB';
        if (cl > 0) return t <= 0.18 ? raiseTo(v, raisePot(v, 3 + cl)) : (t <= 0.05 ? call(v) : fold(v));   // Squeeze
        if (t <= (lateOp ? 0.12 : 0.06)) return raiseTo(v, raisePot(v, 3));
        return p.pos === 'BB' && t <= 0.16 && L.toCall <= 3 * v.bb ? call(v) : fold(v);
      }
      if (rc === 2 && iOpened) {
        if (t <= 0.03 || (t <= 0.1 && rng() < 0.2)) return raiseTo(v, raisePot(v, 2.2));
        return t <= 0.08 && L.toCall <= 12 * v.bb ? call(v) : fold(v);
      }
      if (t <= 0.02) return jam(v);
      return t <= 0.035 && L.toCall <= 25 * v.bb ? call(v) : fold(v);
    }
    const x = strength(v), dr = drawOn(v, v.board), pfa = v.pfa === v.seat, hu = nOpp(v) === 1, st = v.street;
    if (pfa) {
      if (L.toCall <= 0) {
        if (st === 1) return rng() < (hu ? 0.95 : 0.6) ? raiseTo(v, potBet(v, 0.3)) : fold(v);
        if (st === 2) return x >= 0.6 || dr.strong ? raiseTo(v, potBet(v, 0.66)) : fold(v);
        return x >= 0.75 ? raiseTo(v, potBet(v, 0.75)) : fold(v);
      }
      if (x >= 0.9) return raiseTo(v, raisePot(v, 2.8));
      return x >= 0.45 || dr.strong ? call(v) : fold(v);
    }
    if (L.toCall <= 0) return x >= 0.7 ? raiseTo(v, potBet(v, 0.6)) : fold(v);
    if (x >= 0.9) return raiseTo(v, raisePot(v, 3));
    return x >= 0.55 || (dr.strong && st < 3) ? call(v) : fold(v);
  }

  // =====================================================================
  // 9) Passiv bis zum River, dort polarisiert (Overbets mit Nuts und verpassten Draws); Hero-Caller
  function fluss(v, rng) {
    const L = v.legal, p = me(v);
    if (v.street === 0) {
      const t = top(v), rc = preRaises(v);
      if (rc === 0) return t <= 0.25 ? raiseTo(v, openSize(v)) : (p.pos === 'SB' && t <= 0.4 ? call(v) : fold(v));
      if (t <= 0.03) return raiseTo(v, raisePot(v, 3));
      return t <= (rc === 1 ? 0.3 : 0.08) && L.toCall <= (rc === 1 ? 4 : 10) * v.bb ? call(v) : fold(v);
    }
    const x = strength(v), st = v.street;
    if (st < 3) {
      const dr = drawOn(v, v.board);
      if (L.toCall <= 0) return x >= 0.9 && rng() < 0.5 ? raiseTo(v, potBet(v, 0.5)) : fold(v);
      if (x >= 0.97) return raiseTo(v, raisePot(v, 2.5));
      return x >= 0.4 || dr.strong ? call(v) : fold(v);
    }
    const missed = drawOn(v, v.board.slice(0, 4)).strong && x < 0.35;
    if (L.toCall <= 0) {
      if (x >= 0.88) return raiseTo(v, potBet(v, 1.3));
      if (missed) return rng() < 0.7 ? raiseTo(v, potBet(v, 1.3)) : fold(v);
      if (x < 0.2) return rng() < 0.1 ? raiseTo(v, potBet(v, 1.3)) : fold(v);
      return fold(v);
    }
    if (x >= 0.95) return raiseTo(v, raisePot(v, 2.5));
    return x >= (betFrac(v) <= 1 ? 0.35 : 0.5) ? call(v) : fold(v);
  }

  // =====================================================================
  // 10) Verlauf über die Session: anfangs eng und aggressiv, mit der Zeit weiter und passiver (Zyklus 400 Hände)
  function verlauf(v, rng, info) {
    const L = v.legal, p = me(v), hn = info && info.handNo != null ? info.handNo : (v.no || 0);
    const salt = PT.rng.hashStr(String(p.id || v.seat) + '|f23v') % 400;
    const ph = ((hn + salt) % 400) / 400;                          // 0 = frisch, 1 = müde
    const loose = 0.12 + 0.35 * ph, agg = 0.85 - 0.6 * ph, callThr = 0.6 - 0.25 * ph;
    if (v.street === 0) {
      const t = top(v), rc = preRaises(v), w = (POSW[p.pos] || 0.2) * (0.7 + 0.6 * ph);
      if (rc === 0) { if (t <= w && rng() < agg + 0.1) return raiseTo(v, openSize(v)); return t <= loose && L.toCall <= v.bb ? call(v) : fold(v); }
      if (t <= 0.03 + 0.03 * (1 - ph)) return rng() < agg ? raiseTo(v, raisePot(v, 3)) : call(v);
      return t <= loose * (rc === 1 ? 1 : 0.35) && L.toCall <= (rc === 1 ? 4 : 10) * v.bb ? call(v) : fold(v);
    }
    const x = strength(v), dr = drawOn(v, v.board);
    if (L.toCall <= 0) {
      if (x >= 0.72 && rng() < 0.5 + 0.5 * agg) return raiseTo(v, potBet(v, 0.4 + 0.4 * agg));
      if ((x < 0.3 || dr.strong) && rng() < 0.35 * agg) return raiseTo(v, potBet(v, 0.6));
      return fold(v);
    }
    if (x >= 0.9 && rng() < agg) return raiseTo(v, raisePot(v, 3));
    return x >= callThr + 0.3 * price(v) || (dr.strong && v.street < 3) ? call(v) : fold(v);
  }

  const S = { textur, spr: sprspieler, geschichte, mehrweg, tilt, limper, balance, initiative, fluss, verlauf };
  const KEYS = Object.keys(S).map(k => 'f23:' + k);
  const FN = {}; Object.keys(S).forEach(k => { FN['f23:' + k] = S[k]; });
  function get(key) { return FN[key] || null; }
  /** comp 'f23' = je Gegner deterministisch eine Strategie; 'f23:<kurzname>' = alle dieselbe */
  function forSeat(id, comp) {
    if (comp === 'f23') return KEYS[PT.rng.hashStr(String(id) + '|f23') % KEYS.length];
    return FN[comp] ? comp : null;
  }
  return { KEYS, get, forSeat };
}
module.exports = { make };
