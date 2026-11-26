/* PokerTrainer 2.0 – Handbewertung.
   evaluate(): schnelle Bitmasken-Bewertung für 5 bis 7 Karten, liefert eine vergleichbare Ganzzahl
   (Kategorie << 20 | Rang-Nibbles). evalRef(): unabhängige, bewusst einfache Referenz (bestes Fünfer-Blatt
   aus allen Teilmengen), nur für Tests und Gegenprüfung. */
(function (G) {
'use strict';
var PT = G.PT;
var RL = PT.cards.RANK_LABEL;

var _rc = new Int8Array(13);
function topRanks(m, k) {
  var r = 0, n = 0;
  for (var i = 12; i >= 0 && n < k; i--) if (m & (1 << i)) { r = (r << 4) | i; n++; }
  return r << (4 * (k - n));
}
/** höchste Straße in einer Rang-Bitmaske, Wheel (A-5) = 3, keine = -1 */
function straightHigh(m) {
  for (var h = 12; h >= 4; h--) if (((m >> (h - 4)) & 31) === 31) return h;
  return (m & 0x100F) === 0x100F ? 3 : -1;
}
function evaluate(cards) {
  var i, c, r, s, n = cards.length, rm = 0, m0 = 0, m1 = 0, m2 = 0, m3 = 0, n0 = 0, n1 = 0, n2 = 0, n3 = 0;
  for (i = 0; i < 13; i++) _rc[i] = 0;
  for (i = 0; i < n; i++) {
    c = cards[i]; r = c >> 2; s = c & 3; _rc[r]++; rm |= 1 << r;
    if (s === 0) { m0 |= 1 << r; n0++; } else if (s === 1) { m1 |= 1 << r; n1++; } else if (s === 2) { m2 |= 1 << r; n2++; } else { m3 |= 1 << r; n3++; }
  }
  var fm = n0 >= 5 ? m0 : n1 >= 5 ? m1 : n2 >= 5 ? m2 : n3 >= 5 ? m3 : 0;
  if (fm) { var sf = straightHigh(fm); if (sf >= 0) return (8 << 20) | (sf << 16); }
  var q = -1, t1 = -1, t2 = -1, p1 = -1, p2 = -1;
  for (r = 12; r >= 0; r--) {
    var k = _rc[r];
    if (k === 4) q = r;
    else if (k === 3) { if (t1 < 0) t1 = r; else if (t2 < 0) t2 = r; }
    else if (k === 2) { if (p1 < 0) p1 = r; else if (p2 < 0) p2 = r; }
  }
  if (q >= 0) return (7 << 20) | (q << 16) | (topRanks(rm & ~(1 << q), 1) << 12);
  if (t1 >= 0 && (t2 >= 0 || p1 >= 0)) return (6 << 20) | (t1 << 16) | ((t2 > p1 ? t2 : p1) << 12);
  if (fm) return (5 << 20) | topRanks(fm, 5);
  var st = straightHigh(rm);
  if (st >= 0) return (4 << 20) | (st << 16);
  if (t1 >= 0) return (3 << 20) | (t1 << 16) | (topRanks(rm & ~(1 << t1), 2) << 8);
  if (p1 >= 0 && p2 >= 0) return (2 << 20) | (p1 << 16) | (p2 << 12) | (topRanks(rm & ~(1 << p1) & ~(1 << p2), 1) << 8);
  if (p1 >= 0) return (1 << 20) | (p1 << 16) | (topRanks(rm & ~(1 << p1), 3) << 4);
  return topRanks(rm, 5);
}
var CAT_NAME = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'];
var CAT_DE = ['Höchste Karte', 'Ein Paar', 'Zwei Paare', 'Drilling', 'Straße', 'Flush', 'Full House', 'Vierling', 'Straight Flush'];
function category(score) { return score >> 20; }
function handName(score) {
  var cat = score >> 20, r1 = (score >> 16) & 15, r2 = (score >> 12) & 15;
  switch (cat) {
    case 8: return r1 === 12 ? 'Royal Flush' : 'Straight Flush bis ' + RL[r1];
    case 7: return 'Four of a Kind ' + RL[r1];
    case 6: return 'Full House ' + RL[r1] + ' über ' + RL[r2];
    case 5: return 'Flush ' + RL[r1] + '-hoch';
    case 4: return 'Straight bis ' + RL[r1];
    case 3: return 'Three of a Kind ' + RL[r1];
    case 2: return 'Two Pair ' + RL[r1] + ' und ' + RL[r2];
    case 1: return 'Pair ' + RL[r1];
    default: return 'High Card ' + RL[(score >> 16) & 15];
  }
}

// ---------- Referenzimplementierung (unabhängig, langsam) ----------
/** Bewertet genau fünf Karten; gibt [Kategorie, Tiebreak...] zurück */
function eval5Ref(cs) {
  var ranks = cs.map(function (c) { return c >> 2; }).sort(function (a, b) { return b - a; });
  var suits = cs.map(function (c) { return c & 3; });
  var flush = suits.every(function (s) { return s === suits[0]; });
  var uniq = ranks.filter(function (r, i) { return ranks.indexOf(r) === i; });
  var straight = -1;
  if (uniq.length === 5) {
    if (ranks[0] - ranks[4] === 4) straight = ranks[0];
    else if (ranks[0] === 12 && ranks[1] === 3 && ranks[2] === 2 && ranks[3] === 1 && ranks[4] === 0) straight = 3;
  }
  var cnt = {};
  ranks.forEach(function (r) { cnt[r] = (cnt[r] || 0) + 1; });
  var groups = Object.keys(cnt).map(function (r) { return [cnt[r], +r]; });
  groups.sort(function (a, b) { return b[0] - a[0] || b[1] - a[1]; });
  var shape = groups.map(function (g) { return g[0]; }).join('');
  var tb = groups.map(function (g) { return g[1]; });
  if (straight >= 0 && flush) return [8, straight];
  if (shape === '41') return [7].concat(tb);
  if (shape === '32') return [6].concat(tb);
  if (flush) return [5].concat(ranks);
  if (straight >= 0) return [4, straight];
  if (shape === '311') return [3].concat(tb);
  if (shape === '221') return [2].concat(tb);
  if (shape === '2111') return [1].concat(tb);
  return [0].concat(ranks);
}
function cmpKey(a, b) {
  for (var i = 0; i < Math.max(a.length, b.length); i++) {
    var x = a[i] == null ? -1 : a[i], y = b[i] == null ? -1 : b[i];
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
/** Bestes Fünfer-Blatt aus 5 bis 7 Karten (alle Teilmengen) */
function evalRef(cards) {
  var n = cards.length, best = null;
  for (var a = 0; a < n; a++) for (var b = a + 1; b < n; b++) for (var c = b + 1; c < n; c++)
    for (var d = c + 1; d < n; d++) for (var e = d + 1; e < n; e++) {
      var k = eval5Ref([cards[a], cards[b], cards[c], cards[d], cards[e]]);
      if (!best || cmpKey(k, best) > 0) best = k;
    }
  return best;
}

PT.eval = { evaluate: evaluate, handName: handName, category: category, CAT_NAME: CAT_NAME, CAT_DE: CAT_DE,
  straightHigh: straightHigh, eval5Ref: eval5Ref, evalRef: evalRef, cmpKey: cmpKey };
PT.evaluate = evaluate; PT.handName = handName;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
