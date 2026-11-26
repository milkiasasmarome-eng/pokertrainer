/* PokerTrainer 2.0 – Regeln No-Limit Hold'em: Setzrunden, Mindest-Raise, unvollständige All-ins,
   Wiedereröffnung, nicht gecallte Einsätze, Side Pots, Split Pots, Odd Chip, optionaler Rake.
   Beträge sind ganze Cent. Kein DOM. */
(function (G) {
'use strict';
var PT = G.PT, U = PT.util, E = PT.eval, fmt = U.fmt;

var POS_BY_N = {
  2: ['BTN', 'BB'], 3: ['BTN', 'SB', 'BB'], 4: ['BTN', 'SB', 'BB', 'UTG'], 5: ['BTN', 'SB', 'BB', 'UTG', 'CO'],
  6: ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO']
};
var STREET_NAME = ['Preflop', 'Flop', 'Turn', 'River'];

// ---------- Pots ----------
/**
 * Verteilt den Pot. entries: [{seat, total, folded, cards}], board: Karten, button: Sitz.
 * Nicht gecallte Einsätze müssen vorher zurückgegeben sein; zur Sicherheit wird ein verbleibender
 * Überschuss des alleinigen Höchstbeitrags hier ebenfalls zurückgegeben.
 * Gibt {pots:[{amount, eligible, winners, shares}], payout, scores, returned, rake} zurück.
 */
function settle(entries, board, button, nSeats, rakeCfg, sawFlop) {
  var N = nSeats || 6;
  var E2 = entries.map(function (e) { return { seat: e.seat, total: e.total, folded: !!e.folded, cards: e.cards || [] }; });
  var res = { pots: [], payout: {}, scores: {}, returned: null, rake: 0, showdown: false };
  E2.forEach(function (e) { res.payout[e.seat] = 0; });
  var sorted = E2.slice().sort(function (a, b) { return b.total - a.total; });
  if (sorted.length > 1 && sorted[0].total > sorted[1].total) {
    var d = sorted[0].total - sorted[1].total;
    sorted[0].total -= d; res.returned = { seat: sorted[0].seat, amount: d }; res.payout[sorted[0].seat] += d;
  }
  var live = E2.filter(function (e) { return !e.folded; }), sum = 0;
  E2.forEach(function (e) { sum += e.total; });
  var levels = [];
  live.forEach(function (e) { if (levels.indexOf(e.total) < 0) levels.push(e.total); });
  levels.sort(function (a, b) { return a - b; });
  var prev = 0, assigned = 0;
  levels.forEach(function (L) {
    var amt = 0;
    E2.forEach(function (e) { amt += Math.max(0, Math.min(e.total, L) - Math.min(e.total, prev)); });
    var elig = live.filter(function (e) { return e.total >= L; }).map(function (e) { return e.seat; });
    if (amt > 0) res.pots.push({ amount: amt, eligible: elig });
    assigned += amt; prev = L;
  });
  if (!res.pots.length && sum > 0) res.pots.push({ amount: 0, eligible: live.map(function (e) { return e.seat; }) });
  if (sum > assigned) res.pots[res.pots.length - 1].amount += sum - assigned;
  // Rake (optional): Anteil am Gesamtpot, gedeckelt, „No Flop, No Drop“
  if (rakeCfg && rakeCfg.pct > 0 && (sawFlop || !rakeCfg.nfnd)) {
    var total = 0; res.pots.forEach(function (p) { total += p.amount; });
    var rk = Math.min(Math.floor(total * rakeCfg.pct), Math.max(0, Math.floor(rakeCfg.cap || 0)));
    if (rk > 0) {
      var taken = 0;
      res.pots.forEach(function (p) { var x = Math.floor(rk * p.amount / total); p.amount -= x; taken += x; });
      res.pots[0].amount -= (rk - taken);
      res.rake = rk;
    }
  }
  var showdown = live.length > 1;
  res.showdown = showdown;
  if (showdown) live.forEach(function (e) { res.scores[e.seat] = E.evaluate(e.cards.concat(board)); });
  res.pots.forEach(function (p) {
    var w;
    if (p.eligible.length === 1 || !showdown) w = p.eligible.slice(0, 1);
    else {
      var best = -1;
      p.eligible.forEach(function (s) { if (res.scores[s] > best) best = res.scores[s]; });
      w = p.eligible.filter(function (s) { return res.scores[s] === best; });
    }
    // Odd Chip: erster Gewinner links vom Button
    w.sort(function (a, b) { return ((a - button - 1 + N) % N) - ((b - button - 1 + N) % N); });
    var each = Math.floor(p.amount / w.length), rem = p.amount - each * w.length;
    p.winners = w; p.shares = {};
    w.forEach(function (s, i) { var x = each + (i < rem ? 1 : 0); p.shares[s] = x; res.payout[s] += x; });
  });
  return res;
}

/** Pots aus den aktuellen Beiträgen (für die Anzeige während der Hand) */
function potsNow(players) {
  var live = players.filter(function (q) { return !q.folded; }), levels = [];
  live.forEach(function (q) { if (q.allIn && levels.indexOf(q.total) < 0) levels.push(q.total); });
  var maxLive = 0; live.forEach(function (q) { if (q.total > maxLive) maxLive = q.total; });
  if (levels.indexOf(maxLive) < 0) levels.push(maxLive);
  levels.sort(function (a, b) { return a - b; });
  var pots = [], prev = 0;
  levels.forEach(function (L, i) {
    var amt = 0;
    players.forEach(function (q) {
      var hi = i === levels.length - 1 ? q.total : Math.min(q.total, L);
      amt += Math.max(0, hi - Math.min(q.total, prev));
    });
    var elig = live.filter(function (q) { return q.total >= L || (i === levels.length - 1 && !q.allIn); }).map(function (q) { return q.seat; });
    if (amt > 0) pots.push({ amount: amt, eligible: elig });
    prev = L;
  });
  return pots;
}

// ---------- Eine Hand ----------
/**
 * cfg: {players:[{id,name,stack,isHero}], button, sb, bb, deck|rng, no, ts, rake}
 */
function Hand(cfg) {
  var self = this, N = cfg.players.length;
  if (N < 2 || N > 6) throw new Error('2 bis 6 Spieler erforderlich');
  this.N = N; this.no = cfg.no || 1; this.ts = cfg.ts || 0; this.button = cfg.button;
  this.sb = cfg.sb || 50; this.bb = cfg.bb || 100; this.rake = cfg.rake || null;
  var names = POS_BY_N[N];
  this.p = cfg.players.map(function (x, i) {
    if (!U.isInt(x.stack, 0, 1e12)) throw new Error('Ungültiger Stack');
    return { seat: i, id: x.id, name: x.name, isHero: !!x.isHero, start: x.stack, stack: x.stack, bet: 0, total: 0,
      folded: false, allIn: false, acted: false, actedAt: 0, cards: [], pos: names[(i - cfg.button + N) % N], sittingOut: x.stack === 0 };
  });
  var d = cfg.deck ? cfg.deck.slice() : PT.cards.shuffledDeck(cfg.rng || PT.makeRng());
  if (d.length !== 52 || PT.cards.many(d.slice().sort(function (a, b) { return a - b; })) !== PT.cards.many(Array.apply(null, Array(52)).map(function (_, i) { return i; })))
    throw new Error('Ungültiges Deck');
  this.deck = d; this.dp = 0;
  this.board = []; this.street = 0; this.cur = 0; this.lastFull = this.bb; this.raises = 0;
  this.pfa = -1; this.aggr = -1; this.opener = -1; this.limpers = 0; this.callsSince = 0;
  this.actions = []; this.log = []; this.done = false; this.toAct = -1; this.result = null; this.sawFlop = null;
  this.returned = []; this.streetStartPot = [0, 0, 0, 0];
  this.startSum = 0; this.p.forEach(function (q) { self.startSum += q.stack; });
}
Hand.prototype.sbSeat = function () { return this.N === 2 ? this.button : (this.button + 1) % this.N; };
Hand.prototype.bbSeat = function () { return this.N === 2 ? (this.button + 1) % this.N : (this.button + 2) % this.N; };
Hand.prototype.start = function () {
  var N = this.N, sb = this.sbSeat(), bb = this.bbSeat();
  this.log.push('Hand #' + this.no + ' · Button: ' + this.p[this.button].name);
  this._post(sb, this.sb, 'sb'); this._post(bb, this.bb, 'bb');
  for (var r = 0; r < 2; r++) for (var i = 1; i <= N; i++) this.p[(this.button + i) % N].cards.push(this.deck[this.dp++]);
  this.cur = this.bb; this.lastFull = this.bb;
  this.toAct = this._next(bb);
  if (this.toAct < 0) this._closeStreet();
  return this;
};
Hand.prototype._post = function (s, amt, t) {
  var q = this.p[s], pay = Math.min(amt, q.stack);
  q.stack -= pay; q.bet += pay; q.total += pay; if (q.stack === 0) q.allIn = true;
  this.actions.push({ st: 0, s: s, t: t, a: pay, add: pay, ai: q.allIn, cr: false, tc: 0, pot: this.potTotal() - pay });
  this.log.push(q.name + ' postet ' + (t === 'sb' ? 'Small Blind ' : 'Big Blind ') + fmt(pay) + (q.allIn ? ' (All-in)' : ''));
};
Hand.prototype.potTotal = function () { var s = 0; for (var i = 0; i < this.N; i++) s += this.p[i].total; return s; };
Hand.prototype.liveCount = function () { var n = 0; for (var i = 0; i < this.N; i++) if (!this.p[i].folded) n++; return n; };
Hand.prototype.activeCount = function () { var n = 0; for (var i = 0; i < this.N; i++) if (!this.p[i].folded && !this.p[i].allIn) n++; return n; };
Hand.prototype._othersCanAct = function (s) {
  for (var i = 0; i < this.N; i++) { if (i === s) continue; var q = this.p[i]; if (!q.folded && !q.allIn) return true; }
  return false;
};
Hand.prototype._needs = function (s) {
  var q = this.p[s];
  if (q.folded || q.allIn) return false;
  if (q.bet < this.cur) return true;
  return !q.acted && this._othersCanAct(s);
};
Hand.prototype._next = function (from) {
  for (var i = 1; i <= this.N; i++) { var s = (from + i) % this.N; if (this._needs(s)) return s; }
  return -1;
};
/** Legale Optionen für Sitz s. Raise-Beträge sind „Raise auf“ (Gesamteinsatz der Straße). */
Hand.prototype.legal = function (s) {
  var q = this.p[s], toCall = Math.max(0, this.cur - q.bet), maxTo = q.bet + q.stack;
  // Wiedereröffnung: Wer schon gehandelt hat, darf nur erhöhen, wenn er seitdem mindestens einem vollen Raise gegenübersteht.
  var reopened = !q.acted || (this.cur - q.actedAt >= this.lastFull);
  var minFull = this.cur === 0 ? this.bb : this.cur + this.lastFull;
  var canRaise = !this.done && maxTo > this.cur && reopened && this._othersCanAct(s);
  return { toCall: toCall, callAmt: Math.min(toCall, q.stack), canCheck: toCall === 0, canCall: toCall > 0, canFold: toCall > 0,
    canRaise: canRaise, minTo: canRaise ? Math.min(minFull, maxTo) : 0, maxTo: canRaise ? maxTo : 0, minFull: minFull,
    isBet: this.cur === 0, cur: this.cur, bet: q.bet, stack: q.stack, reopened: reopened };
};
/** Prüft und normalisiert eine Aktion, ohne den Zustand zu ändern. */
Hand.prototype.validate = function (s, a) {
  if (this.done) return { ok: false, error: 'Die Hand ist beendet.' };
  if (s !== this.toAct) return { ok: false, error: 'Dieser Platz ist nicht am Zug.' };
  if (!a || typeof a !== 'object') return { ok: false, error: 'Unbekannte Aktion.' };
  var L = this.legal(s), t = a.type;
  if (t === 'allin') {
    if (L.canRaise) return { ok: true, a: { type: L.isBet ? 'bet' : 'raise', amount: L.maxTo }, L: L };
    if (L.canCall) return { ok: true, a: { type: 'call' }, L: L };
    return { ok: false, error: 'All-in ist hier nicht möglich.' };
  }
  if (t === 'fold') return L.canFold ? { ok: true, a: { type: 'fold' }, L: L } : { ok: false, error: 'Fold ist nur möglich, wenn ein Einsatz offen ist. Du kannst kostenlos checken.' };
  if (t === 'check') return L.canCheck ? { ok: true, a: { type: 'check' }, L: L } : { ok: false, error: 'Check nicht möglich: ' + fmt(L.toCall) + ' sind offen. Wähle Call, Raise oder Fold.' };
  if (t === 'call') return L.canCall ? { ok: true, a: { type: 'call' }, L: L } : { ok: false, error: 'Es ist nichts zu callen. Du kannst checken.' };
  if (t === 'raise' || t === 'bet') {
    var amt = a.amount;
    if (!L.canRaise) return { ok: false, error: L.isBet ? 'Bet nicht möglich.' : 'Raise nicht möglich: Die Setzrunde ist für dich nicht wieder eröffnet (unvollständiger All-in-Raise). Call oder Fold.' };
    if (typeof amt !== 'number' || !isFinite(amt) || Math.floor(amt) !== amt) return { ok: false, error: 'Ungültiger Betrag: Bitte eine Zahl mit höchstens zwei Nachkommastellen eingeben.' };
    if (amt > L.maxTo) return { ok: false, error: 'Ungültiger Betrag: Höchstens ' + fmt(L.maxTo) + ' (All-in).' };
    if (amt <= this.cur) return { ok: false, error: 'Ungültiger Betrag: Ein Raise muss über ' + fmt(this.cur) + ' liegen. Mindestens ' + fmt(L.minTo) + '.' };
    if (amt < L.minFull && amt !== L.maxTo) {
      return { ok: false, error: 'Ungültiger Betrag: Mindestens ' + fmt(Math.min(L.minFull, L.maxTo)) + (L.isBet ? ' (Mindest-Bet)' : ' (Mindest-Raise)') +
        (L.maxTo > L.minFull ? ', höchstens ' + fmt(L.maxTo) + ' (All-in).' : '.') };
    }
    return { ok: true, a: { type: L.isBet ? 'bet' : 'raise', amount: amt }, L: L };
  }
  return { ok: false, error: 'Unbekannte Aktion.' };
};
Hand.prototype.act = function (s, a) {
  var v = this.validate(s, a);
  if (!v.ok) return v;
  var q = this.p[s], L = v.L, t = v.a.type, rec, potBefore = this.potTotal(), curBefore = this.cur;
  if (t === 'fold') {
    q.folded = true; rec = { t: 'fold', a: 0, add: 0 };
    this.log.push(q.name + ': Fold');
  } else if (t === 'check') {
    rec = { t: 'check', a: 0, add: 0 };
    this.log.push(q.name + ': Check');
  } else if (t === 'call') {
    var pay = L.callAmt;
    q.stack -= pay; q.bet += pay; q.total += pay; if (q.stack === 0) q.allIn = true;
    rec = { t: 'call', a: pay, add: pay };
    if (this.street === 0 && this.raises === 0) this.limpers++;
    this.callsSince++;
    this.log.push(q.name + ': Call ' + fmt(pay) + (q.allIn ? ' (All-in)' : ''));
  } else {
    var amt = v.a.amount, add = amt - q.bet;
    q.stack -= add; q.bet = amt; q.total += add; if (q.stack === 0) q.allIn = true;
    var inc = amt - this.cur, full = inc >= this.lastFull;
    if (full) this.lastFull = inc;
    var wasBet = this.cur === 0;
    this.cur = amt; this.raises++; this.aggr = s; this.callsSince = 0;
    if (this.street === 0) { this.pfa = s; if (this.opener < 0) this.opener = s; }
    rec = { t: wasBet ? 'bet' : 'raise', a: amt, add: add, full: full };
    this.log.push(q.name + ': ' + (wasBet ? 'Bet ' : 'Raise auf ') + fmt(amt) + (q.allIn ? ' (All-in' + (full ? '' : ', unvollständig') + ')' : ''));
  }
  q.acted = true; q.actedAt = this.cur;
  rec.st = this.street; rec.s = s; rec.ai = q.allIn; rec.cr = L.canRaise; rec.tc = L.toCall; rec.pot = potBefore; rec.cur = curBefore;
  this.actions.push(rec);
  this._advance(s);
  return { ok: true, action: rec };
};
Hand.prototype._returnUncalled = function () {
  var hi = -1, hiSeat = -1, second = 0, tie = false, i;
  for (i = 0; i < this.N; i++) {
    var b = this.p[i].bet;
    if (b > hi) { if (hi >= 0) second = Math.max(second, hi); hi = b; hiSeat = i; tie = false; }
    else if (b === hi) tie = true;
    else if (b > second) second = b;
  }
  if (hiSeat < 0 || tie || hi <= second) return;
  var q = this.p[hiSeat], x = hi - second;
  q.bet -= x; q.total -= x; q.stack += x; if (q.stack > 0) q.allIn = false;
  this.returned.push({ seat: hiSeat, amount: x, st: this.street });
  this.log.push('Nicht gecallter Einsatz ' + fmt(x) + ' zurück an ' + q.name);
};
Hand.prototype._advance = function (from) {
  if (this.liveCount() === 1) { this._returnUncalled(); return this._settle(); }
  var n = this._next(from);
  if (n >= 0) { this.toAct = n; return; }
  this._closeStreet();
};
Hand.prototype._closeStreet = function () {
  this._returnUncalled();
  for (var guard = 0; guard < 4; guard++) {
    if (this.street === 3) return this._settle();
    this.street++;
    var k = this.street === 1 ? 3 : 1, j;
    for (j = 0; j < k; j++) this.board.push(this.deck[this.dp++]);
    if (this.street === 1) { this.sawFlop = []; for (j = 0; j < this.N; j++) if (!this.p[j].folded) this.sawFlop.push(j); }
    for (j = 0; j < this.N; j++) { var q = this.p[j]; q.bet = 0; q.acted = false; q.actedAt = 0; }
    this.cur = 0; this.lastFull = this.bb; this.raises = 0; this.aggr = -1; this.callsSince = 0;
    this.streetStartPot[this.street] = this.potTotal();
    this.log.push(STREET_NAME[this.street] + ': ' + this.board.map(PT.cardLabel).join(' '));
    var f = this._next(this.button);
    if (f >= 0) { this.toAct = f; return; }
  }
  return this._settle();
};
Hand.prototype._settle = function () {
  var self = this, live = this.p.filter(function (q) { return !q.folded; });
  var entries = this.p.map(function (q) { return { seat: q.seat, total: q.total, folded: q.folded, cards: q.cards }; });
  var r = settle(entries, live.length > 1 ? this.board : [], this.button, this.N, this.rake, !!this.sawFlop);
  if (r.returned) { this.p[r.returned.seat].total -= r.returned.amount; this.returned.push({ seat: r.returned.seat, amount: r.returned.amount, st: this.street }); }
  var shown = [];
  if (live.length > 1) {
    live.forEach(function (q) {
      var sc = r.scores[q.seat];
      shown.push({ seat: q.seat, cards: q.cards.slice(), score: sc, name: E.handName(sc) });
      self.log.push(q.name + ' zeigt ' + q.cards.map(PT.cardLabel).join(' ') + ' · ' + E.handName(sc));
    });
  }
  var multi = r.pots.length > 1;
  r.pots.forEach(function (p, i) {
    var label = multi ? (i === 0 ? 'Main Pot' : 'Side Pot ' + i) : 'Pot';
    var names = p.winners.map(function (s) { return self.p[s].name; });
    if (p.winners.length === 1) self.log.push(names[0] + ' gewinnt ' + label + ' ' + fmt(p.amount));
    else self.log.push(names.join(' und ') + ' teilen ' + label + ' ' + fmt(p.amount) + ' (Split Pot)');
  });
  if (r.rake) this.log.push('Rake ' + fmt(r.rake));
  this.p.forEach(function (q) { q.stack += r.payout[q.seat]; });
  this.result = { showdown: live.length > 1, shown: shown, pots: r.pots, returned: this.returned.slice(), payout: r.payout, rake: r.rake,
    net: this.p.map(function (q) { return q.stack - q.start; }) };
  this.done = true; this.toAct = -1;
};
Hand.prototype.stackSum = function () { var s = 0; for (var i = 0; i < this.N; i++) s += this.p[i].stack; return s; };
Hand.prototype.pots = function () { return potsNow(this.p); };
/** Prüft Invarianten; gibt eine Liste von Verstößen zurück (leer = in Ordnung). */
Hand.prototype.check = function () {
  var err = [], i, seen = {}, sum = 0, self = this;
  for (i = 0; i < this.N; i++) {
    var q = this.p[i];
    if (q.stack < 0 || q.bet < 0 || q.total < 0) err.push('negativer Betrag Sitz ' + i);
    if (!this.done && q.stack + q.total !== q.start) err.push('Bilanz Sitz ' + i);
    if (q.bet > q.total) err.push('Einsatz > Beitrag Sitz ' + i);
    if (!this.done && q.bet > this.cur) err.push('Einsatz > aktueller Einsatz Sitz ' + i);
    if (q.allIn && q.stack !== 0 && !this.done) err.push('All-in mit Stack Sitz ' + i);
    q.cards.forEach(function (c) { if (seen[c]) err.push('doppelte Karte'); seen[c] = 1; });
    sum += q.stack;
  }
  this.board.forEach(function (c) { if (seen[c]) err.push('doppelte Boardkarte'); seen[c] = 1; });
  if (!this.done) {
    if (sum + this.potTotal() !== this.startSum) err.push('Chipbilanz während der Hand');
    if (this.toAct < 0 || !this._needs(this.toAct)) err.push('ungültiger Spieler am Zug');
  } else {
    if (sum + (this.result.rake || 0) !== this.startSum) err.push('Chipbilanz nach der Hand');
    this.result.pots.forEach(function (p) {
      p.winners.forEach(function (w) { if (self.p[w].folded) err.push('gefoldeter Spieler gewinnt'); if (p.eligible.indexOf(w) < 0) err.push('nicht berechtigter Gewinner'); });
    });
  }
  return err;
};
/** Öffentlich sichtbarer Verlauf (keine verdeckten Karten außer am Showdown gezeigten). */
Hand.prototype.publicRecord = function () {
  return {
    no: this.no, ts: this.ts, button: this.button, sb: this.sb, bb: this.bb, n: this.N,
    seats: this.p.map(function (q) { return { seat: q.seat, id: q.id, name: q.name, pos: q.pos, start: q.start, hero: q.isHero }; }),
    actions: this.actions.map(function (a) { return { st: a.st, s: a.s, t: a.t, a: a.a, add: a.add, ai: a.ai, cr: a.cr, tc: a.tc, pot: a.pot, cur: a.cur }; }),
    board: this.board.map(PT.cardStr),
    showdown: !!(this.result && this.result.showdown),
    shown: this.result ? this.result.shown.map(function (x) { return { seat: x.seat, cards: PT.cardsStr(x.cards) }; }) : [],
    net: this.p.map(function (q) { return q.stack - q.start; }),
    won: this.result ? this.p.map(function (q) { return this.result.payout[q.seat] || 0; }, this) : [],
    returned: this.returned.slice(),
    rake: this.result ? this.result.rake : 0,
    sawFlop: this.sawFlop ? this.sawFlop.slice() : [],
    ended: this.done
  };
};

/** Baut aus einem gespeicherten Verlauf ein Deck, das genau diesen Verlauf erzeugt (für den Replayer). */
function deckFor(rec, holes) {
  var N = rec.n || rec.seats.length, used = {}, deck = new Array(52), slots = [], i, r;
  // Austeilreihenfolge: 2 Runden ab Platz links vom Button, danach Board
  var order = [];
  for (r = 0; r < 2; r++) for (i = 1; i <= N; i++) order.push({ seat: (rec.button + i) % N, k: r });
  order.forEach(function (o, idx) {
    var h = holes[o.seat];
    if (h && h.length === 2) { deck[idx] = h[o.k]; used[h[o.k]] = 1; } else slots.push(idx);
  });
  var b = (rec.board || []).map(PT.cards.parse);
  b.forEach(function (c, j) { deck[2 * N + j] = c; used[c] = 1; });
  for (i = 2 * N + b.length; i < 52; i++) slots.push(i);
  var rest = []; for (var c = 0; c < 52; c++) if (!used[c]) rest.push(c);
  slots.forEach(function (idx, j) { deck[idx] = rest[j]; });
  return deck;
}
/** Spielt einen Verlauf Schritt für Schritt nach. Liefert Zustände nach jeder Aktion. */
function replay(rec, holes) {
  var players = rec.seats.map(function (s) { return { id: s.id, name: s.name, stack: s.start, isHero: s.hero }; });
  var h = new Hand({ players: players, button: rec.button, sb: rec.sb, bb: rec.bb, deck: deckFor(rec, holes || {}), no: rec.no, ts: rec.ts, rake: rec.rakeCfg || null });
  var states = [], k = 0;
  function snap(label, idx) {
    states.push({ idx: idx, label: label, street: h.street, board: h.board.slice(), pot: h.potTotal(), pots: h.pots(), toAct: h.toAct, done: h.done,
      p: h.p.map(function (q) { return { stack: q.stack, bet: q.bet, total: q.total, folded: q.folded, allIn: q.allIn, pos: q.pos }; }) });
  }
  h.start();
  var acts = rec.actions.filter(function (a) { return a.t !== 'sb' && a.t !== 'bb'; });
  snap('Blinds', -1);
  for (k = 0; k < acts.length; k++) {
    var a = acts[k];
    var r2 = h.act(a.s, a.t === 'bet' || a.t === 'raise' ? { type: a.t, amount: a.a } : { type: a.t });
    if (!r2.ok) { states.push({ error: 'Aktion ' + (k + 1) + ' nicht nachspielbar: ' + r2.error }); break; }
    snap(h.p[a.s].name + ': ' + PT.actionText(a), k);
  }
  return { hand: h, states: states };
}
function actionText(a) {
  var ai = a.ai ? ' (All-in)' : '';
  switch (a.t) {
    case 'sb': return 'SB ' + fmt(a.a); case 'bb': return 'BB ' + fmt(a.a);
    case 'fold': return 'Fold'; case 'check': return 'Check';
    case 'call': return 'Call ' + fmt(a.a) + ai; case 'bet': return 'Bet ' + fmt(a.a) + ai;
    case 'raise': return 'Raise auf ' + fmt(a.a) + ai;
  }
  return String(a.t);
}

PT.rules = { Hand: Hand, settle: settle, potsNow: potsNow, replay: replay, deckFor: deckFor, POS_BY_N: POS_BY_N, STREET_NAME: STREET_NAME };
PT.Hand = Hand; PT.actionText = actionText;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
