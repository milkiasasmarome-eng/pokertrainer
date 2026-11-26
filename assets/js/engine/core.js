/* PokerTrainer 2.0 – Kern: Namensraum, Hilfen, Zufall, Karten, Starthandklassen.
   Kein DOM. Läuft im Browser, im Web Worker und in Node. */
(function (G) {
'use strict';
var PT = G.PT || (G.PT = {});
PT.VERSION = '2.1.0';
PT.BUILD = '2026-11-26';

// ---------- Hilfen ----------
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function now() {
  try { if (G.performance && G.performance.now) return G.performance.now(); } catch (e) { /* leer */ }
  return Date.now();
}
/** Betrag in Cent → „1.234,50“ */
function fmt(u) {
  if (u == null || !isFinite(u)) return '–';
  var neg = u < 0; u = Math.abs(Math.round(u));
  var w = Math.floor(u / 100), c = u % 100;
  return (neg ? '−' : '') + String(w).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + (c < 10 ? '0' : '') + c;
}
function fmtSigned(u) { return (u > 0 ? '+' : u < 0 ? '−' : '±') + fmt(Math.abs(u)); }
function fmtBB(u, bb, d) {
  if (u == null || !isFinite(u)) return '–';
  var x = u / (bb || 100), dd = d == null ? (Math.abs(x) >= 10 ? 0 : 1) : d;
  var t = Math.abs(x).toFixed(dd), zero = Number(t) === 0;
  return (x < 0 && !zero ? '−' : '') + t.replace('.', ',') + ' BB';
}
function pct(x, d) { if (x == null || !isFinite(x)) return '–'; return (x * 100).toFixed(d || 0).replace('.', ',') + ' %'; }
/** „4,50“ / „4.50“ / „4“ → Cent; sonst null */
function parseAmount(str) {
  if (typeof str !== 'string') return null;
  var s = str.replace(/\s/g, '');
  if (!/^\d{1,9}([.,]\d{1,2})?$/.test(s)) return null;
  var parts = s.split(/[.,]/), w = parseInt(parts[0], 10), c = parts[1] ? parseInt((parts[1] + '0').slice(0, 2), 10) : 0;
  var v = w * 100 + c;
  return isFinite(v) && v <= 9e11 ? v : null;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function isInt(x, lo, hi) { return typeof x === 'number' && Math.floor(x) === x && x >= lo && x <= hi; }
function fnv1a(str) {
  var h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return ('0000000' + h.toString(16)).slice(-8);
}
function deepClone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
PT.util = { clamp: clamp, now: now, fmt: fmt, fmtSigned: fmtSigned, fmtBB: fmtBB, pct: pct, parseAmount: parseAmount,
  esc: esc, isInt: isInt, fnv1a: fnv1a, deepClone: deepClone };
PT.fmt = fmt; PT.fmtSigned = fmtSigned; PT.pct = pct; PT.parseAmount = parseAmount; PT.clamp = clamp;

// ---------- Zufall: xoshiro128** mit getrennten, benannten Strömen ----------
function splitmix32(a) {
  return function () {
    a |= 0; a = (a + 0x9e3779b9) | 0;
    var t = a ^ (a >>> 16); t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15); t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0);
  };
}
function hashStr(s) {
  var h = 2166136261 >>> 0;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
/** Erzeugt einen Zufallsgenerator [0,1). seed: Zahl oder Text; ohne seed kryptografisch zufällig. */
function makeRng(seed) {
  var sm;
  if (seed == null) {
    var s0 = 0;
    try {
      if (G.crypto && G.crypto.getRandomValues) { var u = new Uint32Array(1); G.crypto.getRandomValues(u); s0 = u[0]; }
      else s0 = Math.floor(Math.random() * 4294967296);
    } catch (e) { s0 = Math.floor(Math.random() * 4294967296); }
    sm = splitmix32(s0);
  } else sm = splitmix32(typeof seed === 'number' ? seed >>> 0 : hashStr(String(seed)));
  var a = sm(), b = sm(), c = sm(), d = sm();
  if (!(a | b | c | d)) a = 1;
  function next() {
    var r = Math.imul(b, 5); r = (r << 7) | (r >>> 25); r = Math.imul(r, 9) >>> 0;
    var t = b << 9;
    c ^= a; d ^= b; b ^= c; a ^= d; c ^= t; d = (d << 11) | (d >>> 21);
    return r / 4294967296;
  }
  next.int = function (n) { return Math.floor(next() * n); };
  return next;
}
/** Abgeleiteter Strom: unabhängig vom Verbrauch anderer Ströme. */
function stream(masterSeed) {
  var parts = Array.prototype.slice.call(arguments, 1).join('|');
  return makeRng(String(masterSeed >>> 0) + '|' + parts);
}
function newSeed() {
  try { if (G.crypto && G.crypto.getRandomValues) { var u = new Uint32Array(1); G.crypto.getRandomValues(u); return u[0] >>> 0; } } catch (e) { /* leer */ }
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
PT.rng = { make: makeRng, stream: stream, newSeed: newSeed, hashStr: hashStr };
PT.makeRng = makeRng;

// ---------- Karten: 0..51 = Rang*4 + Farbe (Rang 0 = Zwei, 12 = Ass; Farbe c d h s) ----------
var RANKS = '23456789TJQKA', SUITS = 'cdhs';
var RANK_LABEL = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
var RANK_NAME_DE = ['Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn', 'Bube', 'Dame', 'König', 'Ass'];
var SUIT_SYM = ['♣︎', '♦︎', '♥︎', '♠︎'];
var SUIT_NAME = ['Kreuz', 'Karo', 'Herz', 'Pik'];
function cardStr(c) { return RANKS.charAt(c >> 2) + SUITS.charAt(c & 3); }
function cardLabel(c) { return RANK_LABEL[c >> 2] + SUIT_SYM[c & 3]; }
function parseCard(s) {
  if (typeof s !== 'string' || s.length !== 2) return -1;
  var r = RANKS.indexOf(s.charAt(0).toUpperCase()), u = SUITS.indexOf(s.charAt(1).toLowerCase());
  return r < 0 || u < 0 ? -1 : r * 4 + u;
}
/** „AhKd“ → [50, 45]; doppelte oder ungültige Karten → null */
function parseCards(s) {
  if (typeof s !== 'string' || s.length % 2) return null;
  var out = [], seen = {};
  for (var i = 0; i < s.length; i += 2) {
    var c = parseCard(s.substr(i, 2));
    if (c < 0 || seen[c]) return null;
    seen[c] = 1; out.push(c);
  }
  return out;
}
function cardsStr(a) { return a.map(cardStr).join(''); }
function shuffledDeck(rng) {
  var d = new Array(52);
  for (var c = 0; c < 52; c++) d[c] = c;
  for (var i = 51; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = d[i]; d[i] = d[j]; d[j] = t; }
  return d;
}
PT.cards = { RANKS: RANKS, SUITS: SUITS, RANK_LABEL: RANK_LABEL, RANK_NAME_DE: RANK_NAME_DE, SUIT_SYM: SUIT_SYM, SUIT_NAME: SUIT_NAME,
  str: cardStr, label: cardLabel, parse: parseCard, parseMany: parseCards, many: cardsStr, shuffledDeck: shuffledDeck,
  rank: function (c) { return c >> 2; }, suit: function (c) { return c & 3; } };
PT.cardStr = cardStr; PT.cardLabel = cardLabel; PT.parseCards = parseCards; PT.cardsStr = cardsStr;

// ---------- 169 Starthandklassen und 1.326 Kombinationen ----------
// Klassenindex: Paar r*13+r; suited hi*13+lo; offsuit lo*13+hi (Matrixzeile = erster Rang).
function classIdx(c1, c2) {
  var r1 = c1 >> 2, r2 = c2 >> 2;
  if (r1 === r2) return r1 * 13 + r1;
  var hi = r1 > r2 ? r1 : r2, lo = r1 > r2 ? r2 : r1;
  return (c1 & 3) === (c2 & 3) ? hi * 13 + lo : lo * 13 + hi;
}
function className(idx) {
  var a = Math.floor(idx / 13), b = idx % 13;
  if (a === b) return RANKS[a] + RANKS[a];
  return a > b ? RANKS[a] + RANKS[b] + 's' : RANKS[b] + RANKS[a] + 'o';
}
function nameToIdx(n) {
  var a = RANKS.indexOf(n.charAt(0)), b = RANKS.indexOf(n.charAt(1));
  if (a < 0 || b < 0) return -1;
  if (a === b) return a * 13 + a;
  var hi = Math.max(a, b), lo = Math.min(a, b);
  return n.charAt(2) === 's' ? hi * 13 + lo : lo * 13 + hi;
}
function classCombos(idx) { var a = Math.floor(idx / 13), b = idx % 13; return a === b ? 6 : a > b ? 4 : 12; }
var NC = 1326, CC1 = new Uint8Array(NC), CC2 = new Uint8Array(NC), CCL = new Uint8Array(NC);
var COMBO_OF = new Int16Array(52 * 52).fill(-1);
(function () {
  var k = 0;
  for (var a = 0; a < 52; a++) for (var b = a + 1; b < 52; b++) {
    CC1[k] = a; CC2[k] = b; CCL[k] = classIdx(a, b); COMBO_OF[a * 52 + b] = k; COMBO_OF[b * 52 + a] = k; k++;
  }
})();
// Rangfolge der 169 Klassen (Vorab-Stärke, gängige Heads-up-/6-max-Reihenfolge), stärkste zuerst.
var ORDER = ('AA KK QQ JJ TT 99 AKs AQs 88 AKo AJs ATs KQs AQo 77 AJo KJs KQo KTs QJs JTs ATo A8s A9s 66 KJo 55 A7s QTs ' +
  'K9s KTo A5s 44 T9s A9o A6s QJo K8s A4s A8o Q9s A3s 33 QTo A2s K7s 22 A7o K9o J9s 98s T8s 87s A5o Q8s 76s JTo K5s 65s ' +
  'K6s A6o J8s 97s A4o K8o Q9o K4s 54s A3o Q7s K7o Q6s J9o K3s 86s T9o J7s A2o Q8o K2s Q5s K6o T7s 75s Q4s J8o K5o J6s ' +
  'Q3s Q7o T8o K4o J5s T6s Q2s K3o 98o Q6o J4s 96s J7o J3s K2o Q5o T7o J2s T5s Q4o 97o T4s 95s 87o J6o Q3o 85s T3s J5o ' +
  'T2s T6o Q2o 94s J4o 96o 84s 86o 74s 64s 76o J3o 93s T5o 92s 53s T4o J2o 85o 83s 95o 65o 73s 63s 75o 43s T3o 82s 52s ' +
  'T2o 94o 93o 54o 72s 74o 62s 84o 42s 64o 92o 32s 53o 83o 63o 73o 43o 82o 62o 52o 72o 42o 32o').split(' ');
var CLS_END = new Float64Array(169), CLS_START = new Float64Array(169), CLS_RANK = new Int16Array(169);
(function () {
  var cum = 0;
  for (var i = 0; i < ORDER.length; i++) {
    var idx = nameToIdx(ORDER[i]), c = classCombos(idx);
    CLS_START[idx] = cum / NC; cum += c; CLS_END[idx] = cum / NC; CLS_RANK[idx] = i;
  }
})();
/** Anteil der Kombinationen, die mindestens so stark sind (Mitte der Klasse), 0 = AA, 1 = 32o */
function classTop(idx) { return (CLS_START[idx] + CLS_END[idx]) / 2; }
function handTop(c1, c2) { return classTop(classIdx(c1, c2)); }
function comboIdx(a, b) { return COMBO_OF[a * 52 + b]; }
/** Kombinationen einer Klasse, die mit toten Karten verträglich sind */
function liveCombos(idx, deadMask) {
  var out = [];
  for (var k = 0; k < NC; k++) if (CCL[k] === idx) {
    if (deadMask && (deadMask[CC1[k]] || deadMask[CC2[k]])) continue;
    out.push(k);
  }
  return out;
}
function deadMaskOf(cards) { var m = new Uint8Array(52); for (var i = 0; i < cards.length; i++) m[cards[i]] = 1; return m; }
PT.hands = { NC: NC, C1: CC1, C2: CC2, CLS: CCL, ORDER: ORDER, CLS_END: CLS_END, CLS_START: CLS_START, CLS_RANK: CLS_RANK,
  classIdx: classIdx, className: className, nameToIdx: nameToIdx, classCombos: classCombos, classTop: classTop, handTop: handTop,
  comboIdx: comboIdx, liveCombos: liveCombos, deadMaskOf: deadMaskOf };
PT.handClassName = function (c1, c2) { return className(classIdx(c1, c2)); };

// ---------- Positionen (6-max), nach Abstand zum Button ----------
PT.POS6 = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];
PT.POS_ORDER_PRE = { UTG: 0, HJ: 1, CO: 2, BTN: 3, SB: 4, BB: 5 };
PT.POS_ORDER_POST = { SB: 0, BB: 1, UTG: 2, HJ: 3, CO: 4, BTN: 5 };
PT.POS_NAME = { UTG: 'Under the Gun', HJ: 'Hijack', CO: 'Cutoff', BTN: 'Button', SB: 'Small Blind', BB: 'Big Blind' };

if (typeof module !== 'undefined' && module.exports) module.exports = PT;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
