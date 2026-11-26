/* PokerTrainer 2.0 – Range-Engine, Preflop-Charts, Boardanalyse, Handmerkmale.
   Ranges sind Float64Array(1326) mit Gewichten 0..1 je Kombination.
   Alle Charts sind Faustregel-Charts (kein Solver-Ergebnis). */
(function (G) {
'use strict';
var PT = G.PT, H = PT.hands, U = PT.util, E = PT.eval, clamp = U.clamp;
var NC = H.NC, C1 = H.C1, C2 = H.C2, CLS = H.CLS;

// ---------- Grundoperationen ----------
function empty() { return new Float64Array(NC); }
function full() { var w = new Float64Array(NC); w.fill(1); return w; }
function fromClassWeights(cw) { var w = new Float64Array(NC); for (var k = 0; k < NC; k++) w[k] = cw[CLS[k]]; return w; }
function removeDead(w, dead) {
  if (!dead || !dead.length) return w;
  var m = H.deadMaskOf(dead);
  for (var k = 0; k < NC; k++) if (m[C1[k]] || m[C2[k]]) w[k] = 0;
  return w;
}
function total(w) { var s = 0; for (var k = 0; k < NC; k++) s += w[k]; return s; }
function combosCount(w) { return total(w); }
function classWeights(w) {
  var cw = new Float64Array(169), cn = new Float64Array(169);
  for (var k = 0; k < NC; k++) { cw[CLS[k]] += w[k]; cn[CLS[k]] += 1; }
  return { sum: cw, n: cn };
}
/** Anteil der Range an allen 1326 Kombinationen (ohne Kartenentfernung) */
function widthOf(w) { return total(w) / NC; }
function hashRange(w) {
  var h = 2166136261 >>> 0;
  for (var k = 0; k < NC; k++) { var v = Math.round(w[k] * 1000); if (v) { h ^= (k * 1009 + v); h = Math.imul(h, 16777619) >>> 0; } }
  return h.toString(36);
}

// ---------- weiche Top-x-Bänder ----------
/** Gewicht einer Klasse für das Band [lo, hi] (Anteil der stärksten Kombinationen) mit weichen Rändern */
function soft(x, edge, width) { return clamp((edge - x) / Math.max(1e-6, width) + 0.5, 0, 1); }
function bandClass(idx, lo, hi, topW, edgeW) {
  var x = H.classTop(idx), ew = edgeW == null ? 0.02 : edgeW;
  var inHi = soft(x, hi, ew), inLo = lo > 0 ? soft(x, lo, ew) : 0;
  return clamp(inHi - inLo + inLo * (topW == null ? 1 : topW), 0, 1);
}
function band(lo, hi, topW, edgeW) {
  var cw = new Float64Array(169);
  for (var i = 0; i < 169; i++) cw[i] = bandClass(i, lo, hi, topW, edgeW);
  return fromClassWeights(cw);
}

// ---------- Preflop-Charts (Faustregeln für 6-max, 100 BB) ----------
var RFI_W = { UTG: 0.17, HJ: 0.21, CO: 0.28, BTN: 0.46, SB: 0.40, BB: 0 };
var V3_W = { UTG: 0.035, HJ: 0.04, CO: 0.05, BTN: 0.065, SB: 0.07, BB: 0.07 };       // nach Position des Openers
var DEF_W = {                                                                       // Call+3-Bet gesamt, Held-Position → Opener
  BB: { UTG: 0.24, HJ: 0.28, CO: 0.34, BTN: 0.44, SB: 0.55 },
  SB: { UTG: 0.085, HJ: 0.095, CO: 0.11, BTN: 0.13 },
  BTN: { UTG: 0.13, HJ: 0.15, CO: 0.18 },
  CO: { UTG: 0.11, HJ: 0.13 },
  HJ: { UTG: 0.10 }
};
var BLUFF3 = ['A5s', 'A4s', 'A3s', 'A2s', 'K9s', 'Q9s', 'J9s', 'T8s', '97s', '86s', '76s', '65s', '54s', 'K8s'];
var BLUFF4 = ['A5s', 'A4s', 'A3s', 'K9s'];
var BLUFF3_IDX = BLUFF3.map(H.nameToIdx), BLUFF4_IDX = BLUFF4.map(H.nameToIdx);
function chartRow() { return { fold: 1, call: 0, raise: 0 }; }
/** Chart je Klasse: Array(169) von {fold, call, raise} */
function chart(kind, o) {
  o = o || {};
  var out = new Array(169), i, x, r;
  for (i = 0; i < 169; i++) out[i] = chartRow();
  var scale = o.scale || 1;
  if (kind === 'rfi') {
    var W = clamp((RFI_W[o.pos] || 0.2) * scale, 0.02, 0.95);
    for (i = 0; i < 169; i++) { r = bandClass(i, 0, W, 1, 0.03); out[i] = { raise: r, call: 0, fold: 1 - r }; }
  } else if (kind === 'iso') {
    var Wi = clamp((RFI_W[o.pos] || 0.2) * 0.62 * scale, 0.03, 0.6);
    for (i = 0; i < 169; i++) {
      r = bandClass(i, 0, Wi, 1, 0.03);
      var lim = o.pos === 'BB' ? 1 - r : (o.pos === 'SB' ? bandClass(i, Wi, Wi + 0.18, 0, 0.04) : bandClass(i, Wi, Wi + 0.08, 0, 0.03) * 0.5);
      out[i] = { raise: r, call: o.pos === 'BB' ? 1 - r : lim, fold: o.pos === 'BB' ? 0 : Math.max(0, 1 - r - lim) };
    }
  } else if (kind === 'vsOpen') {
    var hero = o.pos, op = o.opener, size = o.sizeBB || 2.5;
    var sz = Math.sqrt(2.5 / clamp(size, 2, 6));
    var V = (V3_W[op] || 0.05) * scale * (o.squeeze ? 0.85 : 1);
    var D = ((DEF_W[hero] && DEF_W[hero][op]) || 0.1) * sz * (o.squeeze ? 0.6 : 1) * (o.callScale || 1);
    D = Math.max(D, V + 0.01);
    var bluffF = (hero === 'SB' || hero === 'BB' || hero === 'BTN') ? 0.55 : 0.4;
    if (o.squeeze) bluffF *= 0.5;
    for (i = 0; i < 169; i++) {
      x = H.classTop(i);
      var v = bandClass(i, 0, V, 1, 0.012), c = bandClass(i, 0, D, 1, 0.03) - v;
      var b = BLUFF3_IDX.indexOf(i) >= 0 && x > V ? bluffF * (o.bluffScale == null ? 1 : o.bluffScale) : 0;
      var rr = clamp(v + b, 0, 1), cc = clamp(c - b, 0, 1 - rr);
      if (hero === 'SB') { rr = clamp(rr + cc * 0.55, 0, 1); cc = cc * 0.45; }
      out[i] = { raise: rr, call: cc, fold: clamp(1 - rr - cc, 0, 1) };
    }
  } else if (kind === 'vs3bet') {
    var ip = !!o.ip, ow = o.openW || 0.22;
    var V4 = clamp(0.012 + ow * 0.035, 0.012, 0.05) * scale, C4 = clamp(ow * (ip ? 0.38 : 0.31), 0.03, 0.3) * (o.callScale || 1);
    for (i = 0; i < 169; i++) {
      var v4 = bandClass(i, 0, V4, 1, 0.006), c4 = bandClass(i, 0, C4, 1, 0.02) - v4;
      var b4 = BLUFF4_IDX.indexOf(i) >= 0 ? 0.45 * (o.bluffScale == null ? 1 : o.bluffScale) : 0;
      var r4 = clamp(v4 + b4, 0, 1), cc4 = clamp(c4 - b4, 0, 1 - r4);
      out[i] = { raise: r4, call: cc4, fold: clamp(1 - r4 - cc4, 0, 1) };
    }
  } else if (kind === 'vs4bet') {
    var V5 = 0.012 * scale, C5 = (o.deep ? 0.03 : 0.022) * (o.callScale || 1);
    for (i = 0; i < 169; i++) {
      var v5 = bandClass(i, 0, V5, 1, 0.004), c5 = clamp(bandClass(i, 0, C5, 1, 0.008) - v5, 0, 1);
      out[i] = { raise: v5, call: c5, fold: clamp(1 - v5 - c5, 0, 1) };
    }
  } else if (kind === 'push') {
    // Push/Fold bei kurzem effektivem Stack (o.bb = Stack in BB)
    var base = { UTG: 0.13, HJ: 0.16, CO: 0.22, BTN: 0.34, SB: 0.48, BB: 0.48 }[o.pos] || 0.2;
    var Wp = clamp(base * Math.pow(10 / clamp(o.bb || 10, 3, 30), 0.85) * scale, 0.02, 0.9);
    for (i = 0; i < 169; i++) { r = bandClass(i, 0, Wp, 1, 0.02); out[i] = { raise: r, call: 0, fold: 1 - r }; }
  } else if (kind === 'callPush') {
    var Wc = clamp((o.vsWidth || 0.2) * 0.55 * (o.callScale || 1), 0.02, 0.7);
    for (i = 0; i < 169; i++) { var cp = bandClass(i, 0, Wc, 1, 0.02); out[i] = { raise: 0, call: cp, fold: 1 - cp }; }
  }
  return out;
}
/** Range-Gewichte aus einem Chart und einer Aktion ('raise'/'call'/'fold' oder Summe) */
function rangeFromChart(ch, which) {
  var cw = new Float64Array(169);
  for (var i = 0; i < 169; i++) {
    var c = ch[i];
    cw[i] = which === 'raise' ? c.raise : which === 'call' ? c.call : which === 'play' ? c.raise + c.call : c.fold;
  }
  return fromClassWeights(cw);
}

// ---------- Glättung von Gegnerwerten ----------
var PRIOR = { vpip: 0.27, pfr: 0.19, threeBet: 0.075, fourBet: 0.06, foldTo3Bet: 0.55, foldTo4Bet: 0.5, steal: 0.36, foldToSteal: 0.6,
  cbetFlop: 0.62, cbetTurn: 0.5, cbetRiver: 0.45, foldToCbet: 0.44, foldToCbetTurn: 0.45, checkRaise: 0.08, afq: 0.42, wtsd: 0.28, wsd: 0.5 };
var PRIOR_K = { vpip: 25, pfr: 25, threeBet: 25, fourBet: 15, foldTo3Bet: 15, foldTo4Bet: 10, steal: 15, foldToSteal: 15,
  cbetFlop: 15, cbetTurn: 12, cbetRiver: 10, foldToCbet: 15, foldToCbetTurn: 10, checkRaise: 20, afq: 25, wtsd: 20, wsd: 15 };
/** Beta-Binomial-Schätzer: (n + m·k) / (d + k). stats: {key:[n,d]} */
function smooth(stats, prior) {
  var P = prior || PRIOR, o = {};
  Object.keys(PRIOR).forEach(function (k) {
    var nd = stats && stats[k] ? stats[k] : [0, 0];
    o[k] = (nd[0] + P[k] * PRIOR_K[k]) / (nd[1] + PRIOR_K[k]);
  });
  return o;
}

// ---------- Preflop-Range eines Gegners aus seinem Verlauf ----------
/**
 * line: {kind:'open'|'iso'|'limp'|'call'|'3bet'|'call3'|'4bet'|'call4'|'5bet'|'cold3'|'check'|'none', pos, opener, sizeBB, squeeze}
 * sm: geglättete Werte (smooth), gto: true → Grundmodell ohne Gegnerwerte
 */
function preflopRange(line, sm, gto) {
  var s = gto ? smooth(null) : sm, kind = line.kind, ch, w;
  var pfrScale = clamp(s.pfr / PRIOR.pfr, 0.25, 2.6), vpScale = clamp(s.vpip / PRIOR.vpip, 0.3, 2.6), tbScale = clamp(s.threeBet / PRIOR.threeBet, 0.3, 3);
  switch (kind) {
    case 'open': ch = chart('rfi', { pos: line.pos, scale: pfrScale }); w = rangeFromChart(ch, 'raise'); break;
    case 'iso': w = band(0, clamp(0.13 * pfrScale, 0.04, 0.5), 1, 0.03); break;
    case 'limp':
      var passive = clamp((s.vpip - s.pfr) / 0.25, 0, 1);
      w = band(clamp(s.pfr * 0.6, 0, 0.4), clamp(s.vpip * 1.05, 0.08, 0.9), 0.15 + 0.5 * passive, 0.04); break;
    case 'call':
      var callW = clamp(s.vpip - s.pfr * 0.65, 0.04, 0.8) * (line.pos === 'BB' ? 1.6 : line.pos === 'SB' ? 0.8 : 1) * Math.sqrt(2.5 / clamp(line.sizeBB || 2.5, 2, 8));
      w = band(clamp(s.threeBet * 0.7, 0, 0.12), clamp(callW + s.threeBet * 0.7, 0.05, 0.85), 0.25, 0.04); break;
    case '3bet': case 'cold3':
      ch = chart('vsOpen', { pos: line.pos, opener: line.opener || 'CO', sizeBB: line.sizeBB, scale: tbScale, squeeze: line.squeeze, bluffScale: clamp(tbScale, 0.2, 2) });
      w = rangeFromChart(ch, 'raise'); break;
    case 'call3':
      var ffs = clamp(s.foldTo3Bet, 0.2, 0.9), wid = clamp(RFI_W[line.pos] || 0.2, 0.1, 0.5) * pfrScale * (1 - ffs);
      w = band(0.02, clamp(wid + 0.02, 0.03, 0.35), 0.35, 0.02); break;
    case '4bet': w = band(0, clamp(0.022 * clamp(s.fourBet / PRIOR.fourBet, 0.4, 2.5), 0.008, 0.06), 1, 0.006);
      BLUFF4_IDX.forEach(function (ci) { for (var k = 0; k < NC; k++) if (CLS[k] === ci) w[k] = Math.max(w[k], 0.35 * clamp(s.fourBet / PRIOR.fourBet, 0.2, 2)); }); break;
    case 'call4': w = band(0.008, 0.035, 0.4, 0.008); break;
    case '5bet': w = band(0, 0.014, 1, 0.004); break;
    case 'check': w = band(clamp(s.pfr * 0.75, 0.03, 0.5), 1, 0.2, 0.05); break;
    default: w = full();
  }
  return w;
}

// ---------- Handstärke und Draws auf einem Board ----------
function drawInfo(c1, c2, board) {
  var fd = false, nfd = false, bdfd = false, so = 0, su, m = (1 << (c1 >> 2)) | (1 << (c2 >> 2)), bm = 0, i;
  var sc = [0, 0, 0, 0]; for (i = 0; i < board.length; i++) sc[board[i] & 3]++;
  for (su = 0; su < 4; su++) {
    var hn = ((c1 & 3) === su ? 1 : 0) + ((c2 & 3) === su ? 1 : 0);
    if (hn && hn + sc[su] === 4 && board.length < 5) {
      fd = true;
      var top = -1; [c1, c2].forEach(function (c) { if ((c & 3) === su && (c >> 2) > top) top = c >> 2; });
      var hiMissing = 12; while (hiMissing >= 0) { var has = false; for (var j = 0; j < board.length; j++) if ((board[j] & 3) === su && (board[j] >> 2) === hiMissing) has = true; if (!has) break; hiMissing--; }
      if (top === hiMissing) nfd = true;
    }
    if (hn && hn + sc[su] === 3 && board.length === 3) bdfd = true;
  }
  for (i = 0; i < board.length; i++) { m |= 1 << (board[i] >> 2); bm |= 1 << (board[i] >> 2); }
  if (E.straightHigh(m) < 0 && board.length < 5) {
    for (var r = 0; r < 13; r++) {
      if (m & (1 << r)) continue;
      if (E.straightHigh(m | (1 << r)) >= 0 && E.straightHigh(bm | (1 << r)) < 0) so++;
    }
  }
  return { fd: fd, nfd: nfd, bdfd: bdfd, so: so, oesd: so >= 2, gut: so === 1, strong: fd || so >= 2, combo: fd && so >= 1 };
}
/** Relative Stärke jeder Kombination einer Range auf dem Board (Perzentil 0..1, Mitte der Gleichstände) und Draw-Flag */
function rangeStrength(w, board) {
  var items = [], k, tot = 0, arr = [0, 0].concat(board);
  for (k = 0; k < NC; k++) if (w[k] > 0) { arr[0] = C1[k]; arr[1] = C2[k]; items.push({ k: k, s: E.evaluate(arr), w: w[k] }); tot += w[k]; }
  items.sort(function (a, b) { return a.s - b.s; });
  var v = new Float64Array(NC), d = new Uint8Array(NC), sc = new Int32Array(NC), cum = 0, i = 0;
  while (i < items.length) {
    var j = i, gw = 0;
    while (j < items.length && items[j].s === items[i].s) { gw += items[j].w; j++; }
    var x = tot > 0 ? (cum + gw / 2) / tot : 0.5;
    for (var t = i; t < j; t++) { v[items[t].k] = x; sc[items[t].k] = items[t].s; }
    cum += gw; i = j;
  }
  if (board.length < 5) for (i = 0; i < items.length; i++) { k = items[i].k; var di = drawInfo(C1[k], C2[k], board); d[k] = di.strong ? 1 : 0; }
  return { v: v, d: d, score: sc, n: items.length };
}

/**
 * Bayes-Aktualisierung einer Range nach einer Postflop-Aktion.
 * act: 'bet'|'raise'|'call'|'check'; ctx: {size (Einsatz/Pot), cbet (bool), street}
 * prof: {aggr 0..1, bluff 0..1, station 0..1}
 * Wahrscheinlichkeiten sind Modellannahmen (Faustregel); Untergrenze 0,04 verhindert Überreaktion.
 */
function likelihood(act, x, draw, ctx, prof) {
  var size = ctx.size || 0.6, late = ctx.street === 3, p;
  var bluff = prof.bluff, aggr = prof.aggr, station = prof.station;
  if (act === 'bet') {
    if (x >= 0.72) p = 0.85;
    else if (x >= 0.45) p = (ctx.cbet ? 0.45 : 0.3) * (late ? 0.7 : 1);
    else if (draw && !late) p = 0.35 + 0.4 * aggr;
    else p = (ctx.cbet ? bluff : bluff * 0.6) * (late ? 0.8 : 1);
    if (size > 1.1 && x < 0.85 && x >= 0.45) p *= 0.5;
  } else if (act === 'check') {
    if (x >= 0.85) p = 0.3 + 0.2 * (1 - aggr);
    else if (x >= 0.72) p = 0.45;
    else if (x >= 0.45) p = 0.8;
    else if (draw && !late) p = 0.55;
    else p = 1 - bluff * (ctx.cbet ? 1 : 0.6);
  } else if (act === 'call') {
    var t = clamp(0.22 + 0.22 * Math.min(size, 1.5) - 0.18 * station + (late ? 0.06 : 0), 0.08, 0.7);
    if (x >= 0.9) p = 0.45 + 0.3 * (1 - aggr);
    else if (x >= t) p = 0.85;
    else if (draw && !late) p = 0.8;
    else p = 0.06 + 0.45 * station;
  } else if (act === 'raise') {
    if (x >= 0.88) p = 0.6;
    else if (x >= 0.72) p = 0.2;
    else if (draw && !late) p = 0.12 + 0.25 * aggr;
    else p = 0.03 + 0.12 * aggr * bluff;
  } else p = 1;
  return Math.max(0.04, Math.min(1, p));
}
/** Wendet alle Postflop-Aktionen eines Spielers bis einschließlich Straße `upto` an. */
function narrowPostflop(w, actions, seat, board, prof, pfaSeat, upto) {
  var streets = [1, 2, 3];
  streets.forEach(function (s) {
    if (s > upto) return;
    var acts = actions.filter(function (a) { return a.st === s && a.s === seat && (a.t === 'bet' || a.t === 'raise' || a.t === 'call' || a.t === 'check'); });
    if (!acts.length) return;
    var bd = board.slice(0, s === 1 ? 3 : s === 2 ? 4 : 5), hs = rangeStrength(w, bd);
    acts.forEach(function (a) {
      var ctx = { street: s, size: a.pot > 0 ? Math.max(a.a - (a.cur || 0), a.a) / Math.max(1, a.pot) : 0.6, cbet: s === 1 && seat === pfaSeat && a.t === 'bet' };
      if (a.t === 'call') ctx.size = a.tc / Math.max(1, a.pot);
      for (var k = 0; k < NC; k++) if (w[k] > 0) w[k] *= likelihood(a.t, hs.v[k], hs.d[k] === 1, ctx, prof);
    });
  });
  return w;
}
function profileOf(sm) {
  var aggr = clamp((sm.afq - 0.25) / 0.35, 0, 1);
  var bluff = clamp(sm.cbetFlop * 1.05 - 0.38, 0.08, 0.7);
  var station = clamp((sm.wtsd - 0.22) / 0.16, 0, 1) * 0.6 + clamp((0.5 - sm.foldToCbet) / 0.3, 0, 1) * 0.4;
  return { aggr: aggr, bluff: bluff, station: clamp(station, 0, 1) };
}

// ---------- Boardanalyse ----------
function analyzeBoard(board) {
  var n = board.length, o = { n: n };
  if (n < 3) return { n: n, labels: [], wet: 0 };
  var rc = new Int8Array(13), sc = [0, 0, 0, 0], rm = 0, i;
  for (i = 0; i < n; i++) { rc[board[i] >> 2]++; sc[board[i] & 3]++; rm |= 1 << (board[i] >> 2); }
  var maxR = 0, pairs = 0; for (i = 0; i < 13; i++) { if (rc[i] > maxR) maxR = rc[i]; if (rc[i] >= 2) pairs++; }
  var suitMax = Math.max.apply(null, sc);
  o.paired = maxR >= 2; o.trips = maxR >= 3; o.doublePaired = pairs >= 2;
  o.suitMax = suitMax; o.monotone = suitMax >= 3 && n === 3 ? true : suitMax >= 3 && suitMax === n;
  o.flushPossible = suitMax >= 3; o.flushDraw = suitMax === 2 && n < 5; o.fourFlush = suitMax >= 4; o.rainbow = suitMax === 1;
  // Straßen: Anzahl 5er-Fenster mit mindestens 3 Boardrängen
  var win = 0, maxIn = 0;
  for (var lo = -1; lo <= 8; lo++) {
    var cnt = 0;
    for (var r = lo; r < lo + 5; r++) { var rr = r < 0 ? 12 : r; if (rm & (1 << rr)) cnt++; }
    if (cnt >= 3) win++; if (cnt > maxIn) maxIn = cnt;
  }
  o.straightPossible = maxIn >= 3; o.connected = maxIn; o.straightWindows = win;
  var hi = -1; for (i = 12; i >= 0; i--) if (rm & (1 << i)) { hi = i; break; }
  o.high = hi; o.highLabel = PT.cards.RANK_LABEL[hi];
  o.broadway = 0; for (i = 8; i <= 12; i++) if (rm & (1 << i)) o.broadway++;
  var wet = 0;
  if (o.flushDraw) wet += 0.25; if (suitMax >= 3) wet += 0.4;
  wet += clamp((maxIn - 1) / 3, 0, 1) * 0.35 + clamp(win / 4, 0, 1) * 0.2;
  if (o.paired) wet -= 0.15;
  o.wet = clamp(wet, 0, 1);
  // Dynamik: Anteil möglicher nächster Karten, die Flush/Straße/Board-Paar/Overcard bringen
  if (n < 5) {
    var change = 0, cnt2 = 0, dead = H.deadMaskOf(board);
    for (var c = 0; c < 52; c++) {
      if (dead[c]) continue; cnt2++;
      var r2 = c >> 2, s2 = c & 3, ch = false;
      if (sc[s2] + 1 >= 3 && sc[s2] < 3) ch = true;
      var m2 = rm | (1 << r2), best = 0;
      for (var lo2 = -1; lo2 <= 8; lo2++) { var c3 = 0; for (var q = lo2; q < lo2 + 5; q++) { var qq = q < 0 ? 12 : q; if (m2 & (1 << qq)) c3++; } if (c3 > best) best = c3; }
      if (best >= 4 && maxIn < 4) ch = true;
      if (r2 > hi) ch = true;
      if (ch) change++;
    }
    o.dynamic = cnt2 ? change / cnt2 : 0;
  } else o.dynamic = 0;
  var labels = [];
  labels.push(o.wet >= 0.55 ? 'nass' : o.wet <= 0.25 ? 'trocken' : 'mittel');
  if (o.monotone) labels.push('monoton'); else if (o.flushDraw) labels.push('zweifarbig'); else if (o.rainbow) labels.push('Rainbow');
  if (o.paired) labels.push(o.trips ? 'Drilling auf dem Board' : 'gepaart');
  if (o.straightPossible) labels.push('verbunden');
  if (n < 5) labels.push(o.dynamic >= 0.45 ? 'dynamisch' : 'statisch');
  o.labels = labels;
  return o;
}

/** Beschreibung der eigenen Hand auf dem Board (gemachte Hand, Draws, Outs) */
function handFeatures(hole, board) {
  var all = hole.concat(board), sc = E.evaluate(all), cat = sc >> 20, f = { score: sc, cat: cat, name: E.handName(sc) };
  if (board.length < 3) {
    f.desc = PT.handClassName(hole[0], hole[1]); f.draw = { strong: false }; f.outs = 0; return f;
  }
  var bsc = board.length >= 5 ? E.evaluate(board) : -1, bcat = bsc >= 0 ? bsc >> 20 : -1;
  var br = board.map(function (c) { return c >> 2; }).sort(function (a, b) { return b - a; });
  var uniq = br.filter(function (r, i) { return br.indexOf(r) === i; });
  var h0 = hole[0] >> 2, h1 = hole[1] >> 2, pp = h0 === h1, desc = f.name;
  if (cat === 1) {
    var p = (sc >> 16) & 15;
    if (pp && p > uniq[0]) desc = 'Overpair';
    else if (pp) desc = p > uniq[uniq.length - 1] ? 'Pocket Pair unter einer Overcard' + (uniq.filter(function (r) { return r > p; }).length > 1 ? ' (mehrere Overcards)' : '') : 'Pocket Pair unter dem Board';
    else if (br.indexOf(p) >= 0 && (h0 === p || h1 === p)) {
      desc = p === uniq[0] ? 'Top Pair' : p === uniq[1] ? 'Second Pair' : 'schwaches Paar';
      if (p === uniq[0]) { var kick = h0 === p ? h1 : h0; desc += kick >= 11 ? ' (guter Kicker)' : kick <= 7 ? ' (schwacher Kicker)' : ''; }
    } else desc = 'Paar auf dem Board';
  } else if (cat === 3) desc = pp ? 'Set' : (br.filter(function (r) { return r === ((sc >> 16) & 15); }).length >= 2 ? 'Trips' : 'Drilling');
  else if (cat === 2 && bcat < 2) desc = 'Two Pair';
  f.desc = desc;
  f.draw = drawInfo(hole[0], hole[1], board);
  // Outs: Karten, die die Hand in eine deutlich stärkere Klasse heben (mit Beteiligung der eigenen Karten)
  if (board.length < 5) {
    var dead = H.deadMaskOf(all), outs = 0, dirty = 0, arr = all.concat([0]), barr = board.concat([0]);
    var bs = E.evaluate(board.length >= 5 ? board : board), b5 = board.length;
    for (var c = 0; c < 52; c++) {
      if (dead[c]) continue;
      arr[arr.length - 1] = c; barr[barr.length - 1] = c;
      var ns = E.evaluate(arr), nc = ns >> 20, nb = (b5 + 1 >= 5) ? E.evaluate(barr) >> 20 : -1;
      // Verbesserung muss von den eigenen Karten kommen; Two Pair mit einem Board-Paar zählt nicht als Out
      var bc0 = E.evaluate(board) >> 20, ownCat = cat > bc0 ? cat : 0;
      var target = Math.max(2, ownCat + 1);
      if (ownCat >= 4) target = ownCat + 1;
      var nbAll = E.evaluate(board.concat([c])) >> 20;
      if (nc === 2 && (bc0 >= 1 || nbAll >= 1) && ownCat === 0) target = 3;
      if (nc >= target && nc > nb && nc > nbAll) {
        outs++;
        var bd2 = analyzeBoard(board.concat([c]));
        if ((nc <= 4 && bd2.suitMax >= 3 && !(analyzeBoard(board).suitMax >= 3)) || (nc <= 5 && bd2.paired && !analyzeBoard(board).paired)) dirty++;
      }
    }
    f.outs = outs; f.dirtyOuts = dirty; f.cleanOuts = outs - dirty;
  } else { f.outs = 0; f.dirtyOuts = 0; f.cleanOuts = 0; }
  void bs;
  return f;
}

PT.ranges = { empty: empty, full: full, band: band, bandClass: bandClass, fromClassWeights: fromClassWeights, removeDead: removeDead,
  total: total, combosCount: combosCount, classWeights: classWeights, widthOf: widthOf, hash: hashRange,
  chart: chart, rangeFromChart: rangeFromChart, RFI_W: RFI_W, DEF_W: DEF_W, V3_W: V3_W, BLUFF3: BLUFF3, BLUFF4: BLUFF4,
  PRIOR: PRIOR, PRIOR_K: PRIOR_K, smooth: smooth, preflopRange: preflopRange, profileOf: profileOf,
  drawInfo: drawInfo, rangeStrength: rangeStrength, likelihood: likelihood, narrowPostflop: narrowPostflop,
  analyzeBoard: analyzeBoard, handFeatures: handFeatures };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
