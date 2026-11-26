/* PokerTrainer – Ereignis-Schnittstelle für Adaptive Poker Intelligence (PAI), Kanal "pai-events-v1".
   Freiwillig (Einstellung „PAI-Schnittstelle“, Standard aus). Einseitig: Der Trainer sendet, empfängt aber nichts.
   Grundsatz: Ein Ereignis enthält nur, was der Spieler am Tisch zu diesem Zeitpunkt weiß – eigene Karten, Board,
   öffentliche Aktionen, Stacks, aufgedeckte Karten. Nicht enthalten: verdeckte Karten anderer Spieler, Seeds,
   Bot-Stile und -Parameter, Gegnerstatistiken des Trainers, Empfehlungen und Bewertungen des Trainer-Coaches. */
(function (G) {
'use strict';
var PT = G.PT;
var CHANNEL = 'pai-events-v1', VERSION = 1;

function seatsOf(h) { return h.p.map(function (q) { return { seat: q.seat, id: q.id, name: q.name, start: q.start }; }); }
function actionsOf(h) { return h.actions.map(function (a) { return { st: a.st, s: a.s, t: a.t, a: a.a }; }); }

/** Entscheidung des Spielers auf Platz seat (vor seiner Aktion). meta: {decisionId, handId, ts} */
function decisionEvent(h, seat, meta) {
  return {
    v: VERSION, type: 'decision', decisionId: String(meta.decisionId), handId: String(meta.handId), ts: meta.ts,
    heroSeat: seat, heroCards: PT.cardsStr(h.p[seat].cards), board: h.board.map(PT.cardStr), street: h.street,
    button: h.button, sb: h.sb, bb: h.bb, seats: seatsOf(h), actions: actionsOf(h)
  };
}

/** Tatsächlich gewählte Aktion zu einer Entscheidung (für Nachbewertung und Abbruch veralteter Empfehlungen). */
function actedEvent(meta, rec) {
  return { v: VERSION, type: 'acted', decisionId: String(meta.decisionId), handId: String(meta.handId), ts: meta.ts, action: { t: rec.t, a: rec.a, ai: !!rec.ai } };
}

/** Abgeschlossene Hand in öffentlicher Form (nur aufgedeckte Karten, keine eigenen verdeckten Karten). */
function handEvent(h, meta) {
  var r = h.publicRecord();
  return {
    v: VERSION, type: 'hand', handId: String(meta.handId), ts: meta.ts,
    record: {
      v: 1, id: String(meta.handId), ts: r.ts, no: r.no, button: r.button, sb: r.sb, bb: r.bb, n: r.n,
      seats: r.seats.map(function (s) { return { seat: s.seat, id: s.id, name: s.name, pos: s.pos, start: s.start }; }),
      actions: r.actions.map(function (a) { return { st: a.st, s: a.s, t: a.t, a: a.a, add: a.add, ai: a.ai }; }),
      board: r.board.slice(), shown: r.shown.slice(), won: r.won.slice(), returned: r.returned.slice(), rake: r.rake, showdown: r.showdown
    }
  };
}

/** Sender über BroadcastChannel (gleiche Herkunft). Ohne BroadcastChannel: stiller Leerlauf. */
function Sender() { this.ch = null; this.sent = 0; }
Sender.prototype.post = function (ev) {
  if (!this.ch) { if (typeof G.BroadcastChannel !== 'function') return false; this.ch = new G.BroadcastChannel(CHANNEL); }
  this.ch.postMessage(ev); this.sent++; return true;
};
Sender.prototype.close = function () { if (this.ch) { this.ch.close(); this.ch = null; } };

PT.paiBridge = { CHANNEL: CHANNEL, VERSION: VERSION, decisionEvent: decisionEvent, actedEvent: actedEvent, handEvent: handEvent, Sender: Sender };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
