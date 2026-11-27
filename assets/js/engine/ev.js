/* PokerTrainer 2.0 – EV-Engine.
   Schätzt Erwartungswerte aller legalen Aktionen (Fold, Check, Call, mehrere Bet-/Raise-Größen, All-in)
   relativ zum sofortigen Fold. Methode: Equity je gegnerischer Kombination (exakt, sonst simuliert),
   Reaktionsmodelle je Gegner (Fold/Call/Raise mit Wahrscheinlichkeiten, Multiway über Teilmengen),
   Side-Pot-Berechtigung, Equity Realization für spätere Straßen. Alle Ergebnisse sind Modellschätzungen. */
(function (G) {
'use strict';
var PT = G.PT, H = PT.hands, E = PT.eval, R = PT.ranges, Q = PT.equity, U = PT.util, clamp = U.clamp;
var NC = H.NC, C1 = H.C1, C2 = H.C2, CLS = H.CLS, evaluate = E.evaluate;

// ---------- Preflop-Tabelle (169 × 169, Klasse gegen Klasse) ----------
var PF = null;
function pfTable() {
  if (PF) return PF;
  if (!PT.preflopData) return null;
  var raw = PT.preflopData, bin = typeof atob === 'function' ? atob(raw) : Buffer.from(raw, 'base64').toString('binary');
  var n = bin.length / 2, t = new Float32Array(169 * 169);
  for (var i = 0, k = 0; i < 169; i++) for (var j = i; j < 169; j++, k++) {
    var v = (bin.charCodeAt(2 * k) | (bin.charCodeAt(2 * k + 1) << 8)) / 65535;
    t[i * 169 + j] = v; t[j * 169 + i] = 1 - v;
  }
  void n;
  PF = t; return PF;
}
function eqClass(i, j) { var t = pfTable(); return t ? t[i * 169 + j] : 0.5; }

// ---------- Equity je gegnerischer Kombination ----------
/**
 * Liefert e[k] = Equity des Helden gegen Kombination k (nur für k mit w[k] > 0 sinnvoll).
 * Exakt auf River und Turn, auf dem Flop exakt bis zum Auswertungslimit, sonst wenige zufällige Runouts je Kombination
 * (zählen gegen das Simulationsbudget). Preflop aus der Klassentabelle.
 */
var ceCache = new Map();
/** Umfang einer Anfrage: so viele Stichproben würde comboEquitiesRaw ziehen (ohne Budget-Kürzung durch andere Aufrufe) */
function ceAllow(o) { return o.budget ? Math.max(0, Math.min(o.budget.left, o.maxIter || 4000)) : 2000; }
/** Ist der gespeicherte Eintrag für die Anfrage gut genug? Nur nach Art und Umfang (Prüfbefund 2.1, Prüfer A, Befund 5), nie nach dem Wert. */
function ceUsable(hit, o) {
  var m = hit.info.method;
  if (m === 'exakt' || m === 'Tabelle') return !hit.info.failed;
  if (hit.info.partial) return false;                       // Teilergebnis (zu wenig Budget) nie für spätere Anfragen
  var n = Math.max(1, hit.info.n || 1);
  return Math.floor(hit.info.iters / n) >= Math.floor(ceAllow(o) / n);   // Monte Carlo: mindestens so viele Runouts je Kombination wie jetzt möglich
}
function ceBetter(a, b) { // ist a mindestens so gut wie b?
  var ea = a.info.method === 'exakt' || a.info.method === 'Tabelle', eb = b.info.method === 'exakt' || b.info.method === 'Tabelle';
  if (ea !== eb) return ea; if (ea) return true;
  if (!!a.info.partial !== !!b.info.partial) return !a.info.partial;
  return a.info.iters >= b.info.iters;
}
function comboEquities(hero, board, w, o) {
  o = o || {};
  var ck = PT.cardsStr(hero) + '|' + PT.cardsStr(board) + '|' + PT.cardsStr(o.dead || []) + '|' + R.hash(w) + '|' + (o.exactMax || 0);
  // Prüfer B, Befund 6: Mit gekennzeichnetem Zufallsstrom (Coach) gilt ein Eintrag nur für denselben Strom und denselben Umfang; ein Treffer
  // ist dann genau das Ergebnis einer frischen Rechnung und belastet das Budget mit dessen Umfang. So hängt kein Ergebnis davon ab,
  // was vorher gerechnet wurde (Reihenfolge der Modi, Wiederholung, Nachrechnung).
  var tagged = !!(o.rng && o.rng.tag);
  if (tagged) ck += '|' + o.rng.tag + '|' + ceAllow(o);
  var hit = ceCache.get(ck);
  // Kopie liefern: Aufrufer dürfen das Array nicht mit dem Cache teilen
  if (hit && ceUsable(hit, o)) {
    var nominal = tagged && hit.info.method === 'Monte Carlo' ? hit.info.iters : 0;
    if (nominal && o.budget) { o.budget.left -= nominal; o.budget.used += nominal; }
    return { e: Float32Array.from(hit.e), info: Object.assign({}, hit.info, { cached: true, iters: nominal }) };
  }
  var res = comboEquitiesRaw(hero, board, w, o);
  if (!res.info.failed && !res.info.aborted && (!hit || ceBetter(res, hit))) { ceCache.delete(ck); ceCache.set(ck, { e: Float32Array.from(res.e), info: Object.assign({}, res.info) }); if (ceCache.size > 60) ceCache.delete(ceCache.keys().next().value); }
  return res;
}
function comboEquitiesRaw(hero, board, w, o) {
  var e = new Float32Array(NC), dead = H.deadMaskOf(hero.concat(board).concat(o.dead || [])), ks = [], k;
  for (k = 0; k < NC; k++) if (w[k] > 0 && !dead[C1[k]] && !dead[C2[k]]) ks.push(k);
  var info = { method: 'exakt', evals: 0, iters: 0, n: ks.length, se: 0 };
  // Leere Range (Prüfbefund 2.1, Prüfer A, Befund 7): gekennzeichnet statt „exakt“ mit SE 0
  if (!ks.length) { info.method = 'leere Range'; info.failed = true; info.se = null; info.reason = 'keine mögliche Kombination'; return { e: e, info: info }; }
  if (board.length === 0) {
    var hc = H.classIdx(hero[0], hero[1]);
    for (var t = 0; t < ks.length; t++) e[ks[t]] = eqClass(hc, CLS[ks[t]]);
    info.method = 'Tabelle'; info.se = 0.005; return { e: e, info: info };
  }
  var rest = [], c; for (c = 0; c < 52; c++) if (!dead[c]) rest.push(c);
  var need = 5 - board.length, hA = hero.concat(board), oA = [0, 0].concat(board), hb = hA.length, i, j;
  for (i = 0; i < need; i++) { hA.push(0); oA.push(0); }
  var avail = rest.length - 2, runouts = need === 0 ? 1 : need === 1 ? avail : avail * (avail - 1) / 2;
  var limit = o.exactMax || 600000, exact = ks.length * runouts * 2 <= limit;
  var allow = o.budget ? Math.max(0, Math.min(o.budget.left, o.maxIter || 4000)) : 2000;
  var perCombo = exact ? 0 : Math.floor(allow / ks.length);
  var subset = null;
  if (!exact && perCombo < 1) {
    // zu wenig Budget: zufällige Teilmenge der Kombinationen mit je einem Runout, Rest über Klassenmittel
    var sh = ks.slice(), rr = o.rng || PT.makeRng();
    for (var z = sh.length - 1; z > 0; z--) { var y = Math.floor(rr() * (z + 1)); var tt = sh[z]; sh[z] = sh[y]; sh[y] = tt; }
    subset = sh.slice(0, Math.max(0, allow)); perCombo = 1;
  }
  var allKs = ks; if (subset) ks = subset;
  var rng = o.rng || PT.makeRng(), sampled = 0, doneN = ks.length;
  for (var q = 0; q < ks.length; q++) {
    // Zeitgrenze (Abnahmekriterium „Deadline überall“): abbrechen, Rest über Klassenmittel, gekennzeichnet und nicht im Cache
    if (o.deadline && (q & 7) === 0 && q > 0 && PT.util.now() > o.deadline) { doneN = q; info.aborted = true; break; }
    k = ks[q]; var a = C1[k], b = C2[k], s = 0, n = 0;
    oA[0] = a; oA[1] = b;
    if (need === 0) { var hs = evaluate(hA), os = evaluate(oA); s = hs > os ? 1 : hs === os ? 0.5 : 0; n = 1; }
    else if (exact) {
      if (need === 1) {
        for (i = 0; i < rest.length; i++) { var x = rest[i]; if (x === a || x === b) continue; hA[hb] = oA[hb] = x; var h1 = evaluate(hA), o1 = evaluate(oA); s += h1 > o1 ? 1 : h1 === o1 ? 0.5 : 0; n++; }
      } else {
        for (i = 0; i < rest.length; i++) { var x1 = rest[i]; if (x1 === a || x1 === b) continue; hA[hb] = oA[hb] = x1;
          for (j = i + 1; j < rest.length; j++) { var x2 = rest[j]; if (x2 === a || x2 === b) continue; hA[hb + 1] = oA[hb + 1] = x2;
            var h2 = evaluate(hA), o2 = evaluate(oA); s += h2 > o2 ? 1 : h2 === o2 ? 0.5 : 0; n++; } }
      }
    } else {
      for (var m = 0; m < perCombo; m++) {
        var y1, y2;
        do { y1 = rest[Math.floor(rng() * rest.length)]; } while (y1 === a || y1 === b);
        hA[hb] = oA[hb] = y1;
        if (need === 2) { do { y2 = rest[Math.floor(rng() * rest.length)]; } while (y2 === a || y2 === b || y2 === y1); hA[hb + 1] = oA[hb + 1] = y2; }
        var h3 = evaluate(hA), o3 = evaluate(oA); s += h3 > o3 ? 1 : h3 === o3 ? 0.5 : 0; n++;
      }
      sampled += perCombo;
    }
    info.evals += 2 * n;
    e[k] = n ? s / n : 0.5;
  }
  if (info.aborted) { ks = ks.slice(0, doneN); if (!subset) subset = ks; }
  if (subset) {
    var cs = new Float64Array(169), cn = new Float64Array(169), gs = 0, gn = 0;
    ks.forEach(function (k3) { cs[CLS[k3]] += e[k3]; cn[CLS[k3]]++; gs += e[k3]; gn++; });
    var done = {}; ks.forEach(function (k3) { done[k3] = 1; });
    allKs.forEach(function (k3) { if (!done[k3]) e[k3] = cn[CLS[k3]] ? cs[CLS[k3]] / cn[CLS[k3]] : (gn ? gs / gn : 0.5); });
    info.partial = true;
  }
  if (info.aborted) { info.method = exact ? 'exakt (abgebrochen, Rest genähert)' : 'Monte Carlo (abgebrochen, Rest genähert)'; info.se = Math.max(info.se || 0, 0.05); }
  if (!exact) {
    info.method = info.aborted ? info.method : 'Monte Carlo'; info.iters = sampled;
    if (o.budget) { o.budget.left -= sampled; o.budget.used += sampled; if (o.budget.calls) o.budget.calls.push(sampled); }
    info.se = 0.5 / Math.sqrt(Math.max(1, sampled));
  }
  return { e: e, info: info };
}
function rangeEq(e, w) {
  var s = 0, t = 0;
  for (var k = 0; k < NC; k++) { var x = w[k]; if (x > 0) { s += x * e[k]; t += x; } }
  return t > 0 ? s / t : null;
}

// ---------- Absolute Handstärke (öffentlich: nur Board) ----------
/**
 * Für jede Kombination: Perzentil gegen alle mit dem Board verträglichen Kombinationen (x, Mitte der Gleichstände),
 * Flag „starker Draw“ (Flush Draw oder Open-Ender, Flop/Turn) und Draw-Equity aus den Outs (Flop zwei Karten, Turn eine).
 * Grundlage des Populationsmodells der Reaktionen (Version 2.1). Kein Wissen über verdeckte Karten, nur das Board.
 */
var absCache = { key: '', val: null };
function absStrength(board) {
  var key = PT.cardsStr(board);
  if (absCache.key === key) return absCache.val;
  var w = new Float64Array(NC), dead = H.deadMaskOf(board), k;
  for (k = 0; k < NC; k++) if (!dead[C1[k]] && !dead[C2[k]]) w[k] = 1;
  var rs = R.rangeStrength(w, board), de = new Float32Array(NC);
  if (board.length < 5) for (k = 0; k < NC; k++) if (rs.d[k]) {
    var di = R.drawInfo(C1[k], C2[k], board), outs = (di.fd ? 9 : 0) + (di.so >= 2 ? 8 : di.so === 1 ? 4 : 0) - (di.fd && di.so ? 2 : 0);
    de[k] = board.length === 3 ? 1 - (1 - outs / 47) * (1 - outs / 46) : outs / 46;
  }
  absCache = { key: key, val: { x: rs.v, d: rs.d, de: de, w: w } };
  return absCache.val;
}

// ---------- Reaktionsmodell ----------
/** Stärke-Score je Kombination für die Reaktion auf einen Einsatz (Draws zählen mit). */
function strengthScores(opp, ctx) {
  if (opp._sc) return opp._sc;
  var sc = new Float32Array(NC), w = opp.w;
  if (ctx.street === 0) {
    for (var k = 0; k < NC; k++) if (w[k] > 0) sc[k] = 1 - H.classTop(CLS[k]);
  } else {
    var hs = R.rangeStrength(w, ctx.board);
    for (var k2 = 0; k2 < NC; k2++) if (w[k2] > 0) sc[k2] = Math.min(0.995, hs.v[k2] + (hs.d[k2] && ctx.street < 3 ? 0.28 : 0));
  }
  opp._sc = sc; return sc;
}
/** Teilt die Range nach Score: oberste Anteile → weiter (cont), davon oberste → Raise */
function splitRange(w, sc, contFrac, raiseFrac) {
  var items = [], tot = 0, k;
  for (k = 0; k < NC; k++) if (w[k] > 0) { items.push(k); tot += w[k]; }
  items.sort(function (a, b) { return sc[b] - sc[a]; });
  var contW = new Float64Array(NC), raiseW = new Float64Array(NC), callW = new Float64Array(NC), acc = 0, cTarget = contFrac * tot, rTarget = raiseFrac * tot;
  for (var i = 0; i < items.length; i++) {
    k = items[i]; var x = w[k];
    if (acc >= cTarget) break;
    var take = Math.min(x, cTarget - acc);
    contW[k] = take;
    var rTake = acc < rTarget ? Math.min(take, rTarget - acc) : 0;
    raiseW[k] = rTake; callW[k] = take - rTake;
    acc += take;
  }
  return { contW: contW, raiseW: raiseW, callW: callW, tot: tot };
}
// ---------- Populationsmodell der Reaktionen (Version 2.1, exploitativer Modus, Flop bis River) ----------
/**
 * Ein Gegner spielt gegen einen Einsatz mit einer Kombination weiter, wenn ihre absolute Stärke x (Perzentil gegen alle Hände auf dem Board)
 * über einer Schwelle θ liegt, die mit dem Preis π = Call / (Pot nach dem Call) steigt; Draws spielen weiter, wenn ihre Draw-Equity den Preis deckt.
 *   θ = c0[Straße] + c1[Straße]·π + c2·(Gegner − 1) + c3·[Raise des Helden] + lf·(logit f̂ − logit f₀) + lw·(logit WTSD − logit WTSD₀)
 *       + lv·(logit VPIP − logit VPIP₀) + lp·((VPIP − PFR) − (VPIP₀ − PFR₀))   (alle Gegnerwerte geglättet, Index 0: Populationsprior)
 *   P(weiter | x) = σ((x − θ)/τ),  Draws: max(…, σ((Equity_Draw − π − c4)/τd)),  P(Raise | x) = r0·σ((x − r1)/0,02) + rd·[Draw]
 * f̂: geglätteter Fold-Wert des Gegners gegen C-Bets (Flop) bzw. Turn-C-Bets. Die Konstanten sind an aggregiertem, am Tisch sichtbarem Verhalten
 * der Gegnerpopulation geschätzt (Maximum Likelihood, tests/strategy/fit-response.js; Daten und Prüfung auf getrennten Seeds: docs/STRATEGIE.md).
 * Keine verdeckten Karten, keine internen Spielstile. Modellannahme, kein Solver-Ergebnis.
 */
// Neu kalibriert nach Prüfer B (Gegner-KI B3, Lead-Ranges B11): Seeds 503/504, je 3.500 Hände, strategy.json responseFit.final
var POP = { c0: [0, 0.1798, 0.0364, 0.258], c1: [0, 1.8703, 2.3214, 2.0446], c2: 0.0301, c3: -0.0772, tau: 0.1353, c4: -0.1876, taud: 0.015, lf: 0.0142, lw: -0.1309, r0: 0.364, r1: 0.9141, rd: 0.1525, lv: -0.0265, lp: -0.7811, blend: 0.5, tauC: 0.03, tabBlend: 0.5 };
function logit(p) { p = clamp(p, 0.01, 0.99); return Math.log(p / (1 - p)); }
function sigm(z) { return 1 / (1 + Math.exp(-z)); }
/** Anteil der Range, der bei Schwelle th weiterspielt */
function contShare(w, A, st, th, price) {
  var W = 0, C = 0, P = POP;
  for (var k = 0; k < NC; k++) { var x0 = w[k]; if (!(x0 > 0)) continue; var pc = sigm((A.x[k] - th) / P.tau); if (st < 3 && A.d[k]) pc = Math.max(pc, sigm((A.de[k] - price - P.c4) / P.taud)); W += x0; C += x0 * pc; }
  return W > 0 ? C / W : 0;
}
function popRespond(opp, ctx, heroAdd, potBefore, nResp, kind, target) {
  var st = ctx.street, A = absStrength(ctx.board), w = opp.w, sm = opp.sm, P = POP;
  var callAmt = Math.max(0, Math.min(ctx.me.bet + heroAdd, opp.p.bet + opp.p.stack) - opp.p.bet);
  var price = callAmt / Math.max(1, potBefore + heroAdd + callAmt), isRaise = ctx.L.toCall > 0 ? 1 : 0;
  var fHat = st === 1 ? sm.foldToCbet : st === 2 ? sm.foldToCbetTurn : null, f0 = st === 1 ? R.PRIOR.foldToCbet : R.PRIOR.foldToCbetTurn;
  var th = P.c0[st] + P.c1[st] * price + P.c2 * (nResp - 1) + P.c3 * isRaise + (fHat != null ? P.lf * (logit(fHat) - logit(f0)) : 0) + P.lw * (logit(sm.wtsd) - logit(R.PRIOR.wtsd))
    + P.lv * (logit(sm.vpip) - logit(R.PRIOR.vpip)) + P.lp * ((sm.vpip - sm.pfr) - (R.PRIOR.vpip - R.PRIOR.pfr));
  var canRaise = opp.p.stack > callAmt, contW = new Float64Array(NC), callW = new Float64Array(NC), raiseW = new Float64Array(NC), W = 0, Cn = 0, Rs = 0;
  if (target != null) {
    // Schwelle so verschieben, dass die Fold-Rate dem Zielwert entspricht (Mischung mit dem strukturellen Modell, siehe respond)
    var lo = th - 0.6, hi = th + 0.6;
    for (var it = 0; it < 24; it++) { var mid = (lo + hi) / 2; if (contShare(w, A, st, mid, price) > 1 - target) lo = mid; else hi = mid; }
    th = (lo + hi) / 2;
  }
  for (var k = 0; k < NC; k++) {
    var x0 = w[k]; if (!(x0 > 0)) continue;
    var x = A.x[k], pc = sigm((x - th) / P.tau), draw = st < 3 && A.d[k];
    if (draw) pc = Math.max(pc, sigm((A.de[k] - price - P.c4) / P.taud));
    var pr = canRaise ? Math.min(pc, P.r0 * sigm((x - P.r1) / 0.02) + (draw ? P.rd : 0)) : 0;
    W += x0; Cn += x0 * pc; Rs += x0 * pr;
    contW[k] = x0 * pc; raiseW[k] = x0 * pr; callW[k] = x0 * (pc - pr);
  }
  if (!(W > 0)) return null;
  if (P.tauC > 0 && P.tauC < P.tau) {
    // Prüfer B, Befund 4: Zusammensetzung der Call- und Raiserange. Die Fold-Rate stammt aus dem kalibrierten Modell mit τ (τ enthält
    // auch die Unsicherheit der Range-Schätzung, er ist nur über Fold/Weiter bestimmt). Welche Kombinationen weiterspielen, ist aus
    // diesen Daten nicht bestimmbar. Annahme: Weiterspielen ist monoton in der Stärke. Unter allen monotonen Zusammensetzungen mit
    // derselben Weiterspielquote ist die mit dem schärfsten Schnitt die stärkste Callrange – die vorsichtige Wahl für die eigene Bet
    // (Value wird nicht gegen zu schwache Callranges überschätzt, was mit der Größe wächst). Umgesetzt mit Breite τc und einer
    // Schwelle, die dieselbe Weiterspielquote ergibt; Draws und Raise-Anteile wie oben.
    var share = Cn / W, loC = th - 0.8, hiC = th + 0.8;
    var contC = function (t) { var c = 0; for (var q = 0; q < NC; q++) { var y = w[q]; if (!(y > 0)) continue; var pq = sigm((A.x[q] - t) / P.tauC); if (st < 3 && A.d[q]) pq = Math.max(pq, sigm((A.de[q] - price - P.c4) / P.taud)); c += y * pq; } return c / W; };
    for (var it2 = 0; it2 < 26; it2++) { var md = (loC + hiC) / 2; if (contC(md) > share) loC = md; else hiC = md; }
    var thC = (loC + hiC) / 2; Rs = 0;
    for (var k3 = 0; k3 < NC; k3++) {
      var y0 = w[k3]; if (!(y0 > 0)) continue;
      var x3 = A.x[k3], dr3 = st < 3 && A.d[k3], pc3 = sigm((x3 - thC) / P.tauC);
      if (dr3) pc3 = Math.max(pc3, sigm((A.de[k3] - price - P.c4) / P.taud));
      var pr3 = canRaise ? Math.min(pc3, P.r0 * sigm((x3 - P.r1) / 0.02) + (dr3 ? P.rd : 0)) : 0;
      Rs += y0 * pr3; contW[k3] = y0 * pc3; raiseW[k3] = y0 * pr3; callW[k3] = y0 * (pc3 - pr3);
    }
    Cn = share * W;
  }
  var nObs = (opp.raw && opp.raw[st === 1 ? 'foldToCbet' : 'foldToCbetTurn'] ? opp.raw[st === 1 ? 'foldToCbet' : 'foldToCbetTurn'][1] : 0) + (opp.raw && opp.raw.wtsd ? opp.raw.wtsd[1] : 0);
  return { f: clamp(1 - Cn / W, 0, 1), c: Math.max(0, (Cn - Rs) / W), r: Rs / W, contW: contW, callW: callW, raiseW: raiseW,
    basis: 'Populationsmodell, angepasst an Gegnerwerte (' + nObs + ' Beobachtungen)', model: 'pop', theta: th, price: price };
}
/**
 * 2.2 (Arbeitspaket 2): Reaktion aus der datenbasierten Aktionstabelle (PT.ranges.likDist). Für jede Kombination der geschätzten Range:
 * P(Fold/Call/Raise | absolute Stärke, Draw, Straße, Preis-Klasse der Einsatzgröße, Mehrgegner), angepasst an die beobachteten Werte des
 * Gegners (Fold gegen Einsätze, Fold gegen C-Bets, WTSD; PT.ranges.oppAdjust). Dieselbe Tabelle beschreibt die Range-Aktualisierung
 * nach Aktionen; Reaktion und Range-Schätzung sind damit konsistent. Größen über 2 Pot liegen außerhalb der Daten (Klasse s6).
 */
function likRespond(opp, ctx, heroAdd, potBefore, nResp) {
  if (!R.likDist || !R.likelihoodTable || !R.likelihoodTable()) return null;
  var st = ctx.street, A = absStrength(ctx.board), w = opp.w;
  var callAmt = Math.max(0, Math.min(ctx.me.bet + heroAdd, opp.p.bet + opp.p.stack) - opp.p.bet);
  var f = callAmt / Math.max(1, potBefore + heroAdd - callAmt), facingRaise = ctx.L.toCall > 0;  // wie in den Daten: Einsatz / Pot vor dem Einsatz
  var nLive = ctx.opps ? ctx.opps.length : nResp;   // 2.3 (A-15): wie in den Daten zählen alle nicht gefoldeten Gegner, auch All-in
  var sk = facingRaise ? 'rr' : R.sizeKey(f), key = st + '|' + sk + '|' + (Math.max(nResp, nLive) > 1 ? 'm' : 'h'), cache = {};
  var canRaise = opp.p.stack > callAmt, contW = new Float64Array(NC), callW = new Float64Array(NC), raiseW = new Float64Array(NC), W = 0, Cn = 0, Rs = 0, miss = 0;
  for (var k = 0; k < NC; k++) {
    var x0 = w[k]; if (!(x0 > 0)) continue;
    var xa = A.x[k], dr = st < 3 && A.d[k] ? 1 : 0, d = R.likDist(key, dr, R.xaBucket(xa));
    if (!d) { miss++; continue; }
    d = R.oppAdjust(d, true, xa, null, key, opp.sm, cache);
    var pc = clamp((d.c || 0) + (d.r || 0), 0, 1), pr = canRaise ? clamp(d.r || 0, 0, pc) : 0;
    W += x0; Cn += x0 * pc; Rs += x0 * pr;
    contW[k] = x0 * pc; raiseW[k] = x0 * pr; callW[k] = x0 * (pc - pr);
  }
  if (!(W > 0) || miss > 0) return null;
  var nObs = opp.raw && opp.raw.foldToCbet ? opp.raw.foldToCbet[1] : 0;
  return { f: clamp(1 - Cn / W, 0, 1), c: Math.max(0, (Cn - Rs) / W), r: Rs / W, contW: contW, callW: callW, raiseW: raiseW,
    basis: 'Aktionstabelle der Population, angepasst an Gegnerwerte (' + nObs + ' Beobachtungen)', model: 'tab', sk: sk, price: callAmt / Math.max(1, potBefore + heroAdd + callAmt) };
}
/**
 * Reaktion eines Gegners auf einen Einsatz. heroAdd: Chips, die der Held hinzufügt; potBefore: Pot vor der Aktion.
 * Rückgabe: {f, c, r} (Wahrscheinlichkeiten), contW/callW/raiseW (Ranges), basis (Text)
 */
/** 2.3: Gewicht der Aktionstabelle in der Reaktion je Größenklasse (Prüfbefund B-6: Overbets s5/s6 eigenes Gewicht, auf V gewählt) */
function tabWeight(sk) { if ((sk === 's5' || sk === 's6') && POP.tabBlendBig != null) return POP.tabBlendBig; return POP.tabBlend; }
function respond(opp, ctx, heroAdd, potBefore, nResp, kind) {
  if (ctx.street > 0 && ctx.mode !== 'gto' && !POP.off && !POP.tabOff && !R.ABL.respLegacy && !respond.inner) {
    var tr = likRespond(opp, ctx, heroAdd, potBefore, nResp), a = tr ? tabWeight(tr.sk) * (opp.wTab != null ? opp.wTab : 1) : 0;   // 2.3: Modell C skaliert das Tabellengewicht je Gegner
    if (tr && a > 0 && a < 1) {
      // Modellmittelung (2.2): Mischung aus Aktionstabelle und Reaktionsmodell 2.1 (Populationsmodell gemittelt mit MDF). Die Tabelle
      // überschätzt Folds gegen kleine Einsätze, das 2.1-Modell unterschätzt sie gegen große (Größenstudie Gruppe V, docs/STRATEGIE.md);
      // die Mischung ist über alle Größen am genauesten. Gemischt werden die Reaktionsranges, Fold-Rate und Zusammensetzung folgen daraus.
      var alt, prevOff = POP.tabOff; POP.tabOff = true; try { alt = respond(opp, ctx, heroAdd, potBefore, nResp, kind); } finally { POP.tabOff = prevOff; }
      if (alt && alt.contW) {
        var cw = new Float64Array(NC), cl = new Float64Array(NC), rw = new Float64Array(NC);
        for (var q = 0; q < NC; q++) { cw[q] = a * tr.contW[q] + (1 - a) * alt.contW[q]; cl[q] = a * tr.callW[q] + (1 - a) * alt.callW[q]; rw[q] = a * tr.raiseW[q] + (1 - a) * alt.raiseW[q]; }
        return { f: a * tr.f + (1 - a) * alt.f, c: a * tr.c + (1 - a) * alt.c, r: a * tr.r + (1 - a) * alt.r, contW: cw, callW: cl, raiseW: rw,
          basis: 'Aktionstabelle gemittelt mit Populations-/MDF-Modell, angepasst an Gegnerwerte', model: 'tab+pop', price: tr.price };
      }
    }
    if (tr && a >= 1) return tr;   // 2.3 (D-6): Gewicht 0 heißt Modell 2.1, nicht reine Tabelle
  }
  if (ctx.street > 0 && ctx.mode !== 'gto' && !POP.off && !respond.inner) {  // POP.off: nur für Studien (Reaktionsmodell 2.0.1)
    var pr0 = popRespond(opp, ctx, heroAdd, potBefore, nResp, kind);
    if (pr0 && POP.blend > 0) {
      // Modellmittelung: Fold-Rate = Mittel aus Populationsmodell und strukturellem Modell (MDF mit Korrekturen, Stand 2.0.1).
      // Grund: Das Populationsmodell ist an einem eher passiven Helden kalibriert; gegen einen aggressiven Helden (Gegner passen sich an)
      // und gegen unbekannte Strategien überschätzt es Folds bei großen Einsätzen (Validierung, docs/STRATEGIE.md).
      // Prüfer B, Befund 12: Flag immer zurücksetzen, auch wenn der innere Aufruf eine Ausnahme wirft
      var old; respond.inner = true; try { old = respond(opp, ctx, heroAdd, potBefore, nResp, kind); } finally { respond.inner = false; }
      var tf = POP.blend * old.f + (1 - POP.blend) * pr0.f, pr1 = popRespond(opp, ctx, heroAdd, potBefore, nResp, kind, tf);
      if (pr1) { pr1.basis = 'Populationsmodell gemittelt mit MDF-Modell, angepasst an Gegnerwerte'; return pr1; }
    }
    if (pr0) return pr0; }
  var mdf = potBefore / Math.max(1, potBefore + heroAdd), gtoDef = 1 - Math.pow(1 - mdf, 1 / Math.max(1, nResp));
  var sm = opp.sm, prof = opp.prof, def = gtoDef, basis = 'MDF', pfInfo = null;
  if (ctx.street === 0) {
    // Preflop: Fold-Wahrscheinlichkeit aus Chart/Modell, im exploitativen Modus mit Gegnerwerten gemischt
    var chartF = clamp(1 - gtoDef * 0.85, 0.1, 0.95), statF = null, nObs = 0, lk = opp.line ? opp.line.kind : 'none', raw = opp.raw || {};
    function obs(k) { return raw[k] ? raw[k][1] : 0; }
    var toBB = (ctx.me.bet + heroAdd) / ctx.bb, mult = (ctx.me.bet + heroAdd) / Math.max(1, ctx.cur || ctx.bb);
    if (opp.pending || lk === 'none') {
      if (kind === 'open' || kind === 'iso') {
        // Verteidigungsanteil der noch ausstehenden Spieler aus dem Faustregel-Chart (Position gegen Opener), abhängig von der Raise-Größe
        var bl = opp.p.pos === 'SB' || opp.p.pos === 'BB', hp = ctx.me.pos;
        var dw = (R.DEF_W[opp.p.pos] && R.DEF_W[opp.p.pos][hp]) || (opp.p.pos === 'BB' ? 0.3 : opp.p.pos === 'SB' ? 0.1 : 0.08);
        var defPF = clamp(dw * Math.sqrt(2.5 / clamp(toBB / (kind === 'iso' ? 1 + 0.4 * (ctx.pre ? ctx.pre.limpers : 1) : 1), 1.6, 8)), 0.03, 0.8);
        chartF = 1 - defPF;
        if (bl) { statF = clamp(sm.foldToSteal * Math.pow(2.5 / clamp(toBB, 1.6, 8), -0.25), 0.05, 0.97); nObs = obs('foldToSteal'); } else { statF = clamp(1 - sm.vpip * 0.4, 0.6, 0.97); nObs = opp.hands; }
      } else chartF = kind === 'jam' ? clamp(1 - gtoDef * 0.45, 0.7, 0.97) : 0.95;
    } else if (lk === 'open' || lk === 'iso') { chartF = kind === 'jam' ? 0.62 : clamp(0.5 + 0.07 * (mult - 3), 0.38, 0.68); statF = clamp(sm.foldTo3Bet + 0.07 * (mult - 3), 0.05, 0.97); nObs = obs('foldTo3Bet'); }
    else if (lk === '3bet') { chartF = kind === 'jam' ? 0.6 : clamp(0.5 + 0.08 * (mult - 2.3), 0.38, 0.7); statF = clamp(sm.foldTo4Bet + 0.08 * (mult - 2.3), 0.05, 0.97); nObs = obs('foldTo4Bet'); }
    else if (lk === 'limp') { chartF = clamp(0.5 + 0.05 * (toBB - 4), 0.3, 0.75); statF = clamp(1 - sm.vpip * 0.8 + 0.05 * (toBB - 4), 0.1, 0.9); nObs = opp.hands; }
    var f0 = chartF, wObs = 0;
    if (ctx.mode !== 'gto' && statF != null) { wObs = nObs / (nObs + 25); f0 = chartF * (1 - wObs) + statF * wObs; basis = 'Gegnerwerte (' + nObs + ' Gelegenheiten)'; }
    else basis = 'Faustregel-Chart';
    def = clamp(1 - f0, 0.04, 0.96);
    // Bestandteile der Fold-Rate für den Bayes-Beleg (Prüfer B, Befund 5): f = chartF·(1 − w) + g(Rate)·w, g = Größenanpassung der Statistik
    var pfKey = null, pfG = null;
    if (ctx.mode !== 'gto' && statF != null) {
      if ((opp.pending || lk === 'none') && (kind === 'open' || kind === 'iso') && (opp.p.pos === 'SB' || opp.p.pos === 'BB')) { pfKey = 'foldToSteal'; pfG = { mul: Math.pow(clamp(toBB, 1.6, 8) / 2.5, 0.25) }; }
      else if (lk === 'open' || lk === 'iso') { pfKey = 'foldTo3Bet'; pfG = { add: 0.07 * (mult - 3) }; }
      else if (lk === '3bet') { pfKey = 'foldTo4Bet'; pfG = { add: 0.08 * (mult - 2.3) }; }
    }
    pfInfo = { chartF: chartF, statF: statF, w: wObs, n: nObs, key: pfKey, g: pfG };
  } else if (ctx.mode !== 'gto') {
    var adj = 0;
    if (kind === 'cbet') adj += (R.PRIOR.foldToCbet - sm.foldToCbet) * 0.9;
    adj += (prof.station - 0.4) * 0.18 - (heroAdd / Math.max(1, potBefore) - 0.66) * 0.08;
    def = clamp(gtoDef + adj, 0.08, 0.95);
    basis = 'MDF, angepasst an Gegnerwerte';
  }
  if (opp.floor != null) {
    // Untergrenze: starke Hände spielen weiter; Top Pair und Draws hängen von der Einsatzgröße ab
    var s0 = heroAdd / Math.max(1, potBefore), F = opp.floor;
    var fl = F.strong * (ctx.street === 3 ? clamp(1.15 - 0.15 * s0, 0.55, 1) : 1) + F.good * clamp(1.1 - 0.5 * s0, 0.12, 0.85) + F.draw * clamp(0.8 - 0.3 * s0, 0.1, 0.6);
    def = Math.max(def, clamp(fl * (ctx.mode === 'gto' ? 1 : 0.85 + 0.3 * prof.station), 0, 0.95));
  }
  // Prüfer B, Befund 7: Im gleichgewichtsnahen Modus gilt die Gleichgewichtsannahme MDF ohne die Populationskorrekturen (Overbet-/Raise-
  // Korrektur und konservativer Abschlag). Diese machten jeden reinen Bluff strukturell −EV (Fold-Rate unter der Break-even-Rate),
  // sodass der Modus praktisch nie bluffte; im Gleichgewicht ist ein Bluff gegen MDF-Verteidigung gerade indifferent.
  var popAdj = ctx.mode !== 'gto';
  if (ctx.street > 0 && popAdj) {
    // Korrektur für Overbets und Raises: polarisierte große Einsätze und Raises gegen eine gezeigte Bet werden seltener gefoldet,
    // als die reine MDF-Annahme für eine Einzelhand nahelegt (Modellannahme).
    var sz = heroAdd / Math.max(1, potBefore), alpha = sz <= 0.75 ? 1 : Math.max(0.7, 1 - 0.3 * (sz - 0.75));
    if (kind === 'raise' || kind === 'jam' && ctx.L.toCall > 0) alpha *= 0.85;
    def = 1 - (1 - def) * alpha;
  }
  if (ctx.street > 0 && popAdj) {
    // Konservative Fold-Schätzung: Die MDF-Annahme überschätzt Folds gegen Gegner, die nicht ausgewogen verteidigen
    // (Population der Computergegner: Fold gegen Turn-C-Bet beobachtet 34 % statt 43 % nach MDF). Im Multiway-Pot zusätzlich weniger Folds je Spieler.
    var cbObs = opp.raw && opp.raw.foldToCbet ? opp.raw.foldToCbet[1] : 0;
    var shrink = (ctx.mode !== 'gto' && kind === 'cbet' && cbObs >= 30 ? 0.04 : 0.12) + 0.07 * (nResp - 1) + (ctx.street === 3 && heroAdd > potBefore ? 0.05 : 0);
    def = 1 - (1 - def) * (1 - clamp(shrink, 0, 0.35));
  }
  var raiseFrac = def * (ctx.mode === 'gto' ? 0.16 : clamp(0.08 + 0.22 * prof.aggr, 0.05, 0.35));
  if (opp.p.stack <= heroAdd) raiseFrac = 0;
  var sp = splitRange(opp.w, strengthScores(opp, ctx), def, raiseFrac);
  return { f: 1 - def, c: def - raiseFrac, r: raiseFrac, contW: sp.contW, callW: sp.callW, raiseW: sp.raiseW, basis: basis, pf: ctx.street === 0 ? pfInfo : undefined };
}

// ---------- Equity Realization ----------
function realization(ctx, kind) {
  if (ctx.street === 3) return 1;
  var Rz = ctx.street === 0 ? (ctx.ip ? 0.95 : 0.82) : (ctx.ip ? 1.0 : 0.9);
  var f = ctx.feat;
  if (ctx.street > 0 && f) {
    if (f.cat >= 2 && f.cat < 4) Rz *= 1.04;
    else if (f.cat >= 4) Rz *= 1.06;
    else if (f.cat === 0 && f.draw && f.draw.strong) Rz *= 0.94;
    else if (f.cat === 1 && /schwach|unter dem Board|Board/.test(f.desc || '')) Rz *= 0.88;
  }
  if (ctx.street === 0 && ctx.nOpp > 1) Rz *= Math.pow(0.95, ctx.nOpp - 1);
  if (ctx.street === 0) Rz *= playability(ctx.v.cards);
  if (kind === 'bet') Rz += 0.03;
  var spr = ctx.spr;
  if (spr < 1) Rz = Rz + (1 - Rz) * (1 - spr);
  return clamp(Rz, 0.6, 1.1);
}

/** Spielbarkeit einer Starthand nach dem Flop (Modellannahme): Paare und suited Hände realisieren mehr Equity, unverbundene schwache Offsuit-Hände weniger */
function playability(cards) {
  var r1 = cards[0] >> 2, r2 = cards[1] >> 2, hi = Math.max(r1, r2), lo = Math.min(r1, r2), suited = (cards[0] & 3) === (cards[1] & 3);
  if (hi === lo) return 1;
  var gap = hi - lo - 1, f = suited ? 1.0 : 0.9;
  f -= 0.025 * Math.min(gap, 4);
  if (hi < 8) f -= 0.04;            // höchste Karte unter T
  if (lo >= 8) f += 0.03;           // beide Karten Broadway
  if (hi === 12 && suited) f += 0.02; // Ax suited: Nut-Flush-Potenzial
  return clamp(f, 0.7, 1.05);
}
// ---------- Hilfen ----------
function prod(a) { var p = 1; for (var i = 0; i < a.length; i++) p *= a[i]; return p; }
/** Equity gegen eine Teilmenge von Gegnern mit gegebenen Ranges (Produktnäherung, auf Gesamt-Equity kalibriert) */
function subsetEq(ctx, parts) {
  if (!parts.length) return 1;
  var eqs = parts.map(function (x) { var r = rangeEq(x.opp.e, x.w); return r == null ? 0.5 : r; });
  if (parts.length === 1) return eqs[0];
  var kappa = ctx.kappa || 1;
  return clamp(prod(eqs) * Math.pow(kappa, (parts.length - 1) / Math.max(1, ctx.nOpp - 1)), 0, 1);
}

// ---------- Aktionen ----------
/** Aktuelle Equity mit Kennzeichnung: fehlt sie (null/NaN), neutraler Rückfall 0,5 mit Flag statt stiller Werte (Prüfer A, Befund 7) */
function eqOf(ctx) { var ok = ctx.eqNow != null && isFinite(ctx.eqNow); return { eq: ok ? ctx.eqNow : 0.5, failed: !ok || !!ctx.eqFailed, approx: !ok || !!ctx.eqFailed || !!ctx.eqApprox, reason: !ok ? 'Equity nicht berechenbar' : ctx.eqReason || null }; }
function flag(parts, q) { if (q.approx) parts.approx = true; if (q.failed) parts.failed = true; if (q.reason && (q.approx || q.failed)) parts.reason = q.reason; return parts; }
function evCheck(ctx) {
  var Rz = realization(ctx, 'check'), q = eqOf(ctx);
  var ev = Rz * q.eq * ctx.pot;
  return { ev: ev, dEdq: Rz * ctx.pot, parts: flag({ realization: Rz, equity: q.eq, pot: ctx.pot }, q) };
}
/** Pot Odds anhand des tatsächlich zahlbaren Betrags und des gewinnbaren Pots (Side Pots berücksichtigt) */
function potOdds(ctx) {
  var L = ctx.L, me = ctx.me, c = L.callAmt;
  if (!(c > 0)) return null;
  var heroFinal = me.total + c, winnable = 0;
  ctx.v.players.forEach(function (q) { winnable += q.seat === me.seat ? heroFinal : Math.min(q.total, heroFinal); });
  return { call: c, winnable: winnable, need: c / winnable, capped: c < L.toCall };
}
function evCall(ctx) {
  var L = ctx.L, me = ctx.me, c = L.callAmt, heroAllIn = c >= me.stack;
  var others = ctx.opps.filter(function (o) { return !o.p.allIn; });
  var po = potOdds(ctx);
  if (heroAllIn || others.length === 0) {
    // keine weiteren Setzrunden: Side-Pot-genaue Abrechnung
    var heroFinal = me.total + c;
    // Näherung über die aktuelle Equity, gekennzeichnet (approx, Grund); Equity unbekannt → 0,5 als neutraler Wert
    var approx = function (reason, failed) {
      var eqA = ctx.eqNow != null && isFinite(ctx.eqNow) ? ctx.eqNow : 0.5;
      return { ev: eqA * (po ? po.winnable : ctx.pot + c) - c, dEdq: po ? po.winnable : ctx.pot, parts: { allin: true, approx: true, failed: !!failed, reason: reason, call: c, winnable: po ? po.winnable : null } };
    };
    if (ctx.budget.left < 200) return approx('Simulationsbudget erschöpft', false);
    var share = Q.potShare({ hero: ctx.v.cards, heroTotal: heroFinal, board: ctx.board, rng: ctx.rng, budget: ctx.budget, iters: Math.min(1500, ctx.budget.left), deadline: ctx.deadline,
      opps: ctx.opps.map(function (o) { return { w: o.w, total: Math.min(o.p.total, heroFinal + 1e12), folded: false }; }),
      dead_: ctx.deadList || null, deadMoney: ctx.deadList ? 0 : ctx.deadMoney });
    if (share.failed || share.win == null || !isFinite(share.win)) return approx(share.reason || 'Side-Pot-Berechnung nicht möglich', true);
    return { ev: share.win - c, dEdq: po ? po.winnable : ctx.pot, se: share.se, parts: { allin: true, expectedWin: share.win, call: c, winnable: po ? po.winnable : null, iters: share.n, aborted: share.aborted || null } };
  }
  var Rz = realization(ctx, 'call'), potAfter = ctx.pot + c;
  var implied = 0, f = ctx.feat;
  if (ctx.street > 0 && ctx.street < 3 && f && f.draw && f.draw.strong && f.cat <= 1) {
    var outs = Math.max(f.cleanOuts || 0, 0), pHit = outs / (ctx.street === 1 ? 47 : 46), main = ctx.opps[0];
    var behind = Math.max(0, Math.min(me.stack - c, ctx.maxOppStack));
    implied = pHit * Math.min(behind, potAfter) * (0.2 + 0.25 * (main ? main.prof.station : 0.4));
  }
  var q = eqOf(ctx), ev = Rz * q.eq * potAfter - c + implied;
  return { ev: ev, dEdq: Rz * potAfter, parts: flag({ realization: Rz, equity: q.eq, potAfter: potAfter, call: c, implied: implied }, q) };
}
function evBet(ctx, to, kind) {
  var me = ctx.me, a = to - me.bet, pot = ctx.pot, L = ctx.L;
  var resp = ctx.opps.filter(function (o) { return !o.p.allIn; }), allins = ctx.opps.filter(function (o) { return o.p.allIn; });
  var nR = resp.length;
  var R0 = resp.map(function (o) { return respond(o, ctx, a, pot, nR, kind); });
  var heroAllIn = to >= me.bet + me.stack;
  // Re-Raise-Zweig
  var pNoRaise = prod(R0.map(function (r) { return 1 - r.r; })), pRaise = 1 - pNoRaise, evRaised = 0;
  if (pRaise > 1e-6) {
    var ri = 0; R0.forEach(function (r, i) { if (r.r > R0[ri].r) ri = i; });
    var ro = resp[ri], raiseTo = Math.min(ro.p.bet + ro.p.stack, Math.max(to * 3, to + ctx.bb * 2)), heroMax = me.bet + me.stack;
    var callTo = Math.min(raiseTo, heroMax), extra = callTo - to, eqR = rangeEq(ro.e, R0[ri].raiseW);
    if (eqR == null) eqR = 0.3;
    var potR = pot + (callTo - me.bet) + (Math.min(raiseTo, callTo) - ro.p.bet);
    var Rr = (callTo >= heroMax || raiseTo >= ro.p.bet + ro.p.stack) ? 1 : 0.92;
    evRaised = Math.max(-a, Rr * eqR * potR - (callTo - me.bet));
    if (heroAllIn) evRaised = eqR * (pot + a + Math.min(to - ro.p.bet, ro.p.stack)) - a;
  }
  // Teilmengen der Caller (ohne Raise)
  var evNR = 0, sumP = 0, branches = [], RzBet = realization(ctx, 'bet');
  var n = Math.min(nR, 5);
  for (var mask = 0; mask < (1 << n); mask++) {
    var p = 1, S = [];
    for (var i = 0; i < n; i++) {
      var ri2 = R0[i], denom = Math.max(1e-9, 1 - ri2.r), cp = ri2.c / denom, fp = ri2.f / denom;
      if (mask & (1 << i)) { p *= cp; S.push(i); } else p *= fp;
    }
    if (p < 1e-7) continue;
    var ev, eqS = null, potS = pot;
    if (!S.length && !allins.length) ev = pot;
    else {
      var levelMax = 0, calls = 0;
      S.forEach(function (i2) { var o = resp[i2]; levelMax = Math.max(levelMax, Math.min(to, o.p.bet + o.p.stack)); });
      allins.forEach(function (o) { levelMax = Math.max(levelMax, o.p.bet); });
      var heroEff = Math.min(to, Math.max(levelMax, me.bet)), addEff = heroEff - me.bet;
      S.forEach(function (i2) { var o = resp[i2]; calls += Math.max(0, Math.min(heroEff, o.p.bet + o.p.stack) - o.p.bet); });
      potS = pot + addEff + calls;
      var parts = S.map(function (i2) { return { opp: resp[i2], w: R0[i2].callW }; }).concat(allins.map(function (o) { return { opp: o, w: o.w }; }));
      eqS = subsetEq(ctx, parts);
      var allInNow = heroEff >= me.bet + me.stack || S.every(function (i2) { var o = resp[i2]; return o.p.bet + o.p.stack <= heroEff; });
      var Rz = allInNow ? 1 : RzBet;
      ev = Rz * eqS * potS - addEff;
    }
    evNR += p * ev; sumP += p;
    branches.push({ callers: S.map(function (i2) { return resp[i2].p.name; }), p: p * pNoRaise, ev: ev, eq: eqS, pot: potS });
  }
  if (sumP > 0) evNR /= sumP;
  var total = pNoRaise * evNR + pRaise * evRaised;
  var pAllFold = prod(R0.map(function (r) { return r.f; }));
  // Ableitung nach Equity (für Unsicherheit): Anteil der Fälle mit Showdown-Beteiligung
  var dEdq = 0; branches.forEach(function (b) { if (b.eq != null) dEdq += b.p * b.pot * RzBet; });
  return { ev: total, dEdq: dEdq, parts: { to: to, add: a, pAllFold: allins.length ? 0 : pAllFold, pRaise: pRaise, evRaised: evRaised, branches: branches.slice(0, 8),
    folds: R0.map(function (r, i) { return { name: resp[i].p.name, f: r.f, c: r.c, r: r.r, basis: r.basis, pf: r.pf }; }), realization: RzBet } };
}

// ---------- Kandidaten-Größen ----------
function candidates(ctx) {
  var L = ctx.L, me = ctx.me, pot = ctx.pot, out = [], bb = ctx.bb, seen = {};
  function fit(to) {
    var u = Math.max(1, Math.round(bb / 10));
    to = Math.round(to / u) * u;
    if (to < L.minTo) to = L.minTo;
    if (to > L.maxTo) to = L.maxTo;
    return to;
  }
  function add(to, label, kind) { var nominal = to; to = fit(to); if (seen[to]) return; seen[to] = 1;
    // 2.3 (Prüfbefund D-11): liegt der Stack unter der Nenngröße, nennt die Beschriftung den tatsächlichen Betrag
    if (to === L.maxTo && nominal > to + 0.5 && label !== 'All-in') label = 'All-in ' + U.fmt(to);
    out.push({ type: L.isBet ? 'bet' : 'raise', amount: to, label: label, kind: kind }); }
  if (L.canFold) out.push({ type: 'fold', label: 'Fold' });
  if (L.canCheck) out.push({ type: 'check', label: 'Check' });
  if (L.canCall) out.push({ type: 'call', amount: L.callAmt, label: 'Call ' + U.fmt(L.callAmt) });
  if (L.canRaise) {
    if (ctx.street === 0) {
      var pre = ctx.pre;
      if (pre.rc === 0) {
        var base = pre.limpers * bb;
        [2, 2.5, 3].forEach(function (x) { var to = x * bb + base + (me.pos === 'SB' && pre.limpers === 0 ? 0.5 * bb : 0); add(to, (pre.limpers ? 'Iso-Raise auf ' : 'Open ') + String(Math.round(to / bb * 10) / 10).replace('.', ',') + ' BB', pre.limpers ? 'iso' : 'open'); });
      } else if (pre.rc === 1) {
        var ip = ctx.ip, m = ip ? [2.8, 3.3] : [3.6, 4.2];
        m.forEach(function (x) { add(pre.lastTo * x + pre.callers * pre.lastTo, '3-Bet ' + String(x).replace('.', ',') + '×', '3bet'); });
      } else if (pre.rc === 2) {
        [2.2, 2.6].forEach(function (x) { add(pre.lastTo * x, '4-Bet ' + String(x).replace('.', ',') + '×', '4bet'); });
      }
      if (ctx.eff <= 35 * bb || pre.rc >= 3 || (pre.rc === 2 && ctx.eff <= 60 * bb)) add(L.maxTo, 'All-in', 'jam');
      // Prüfer B, Befund 8: Festlegung (Commitment). Ein Raise auf mindestens ein Drittel des effektiven Stacks S lässt gegen ein All-in
      // nur noch einen Call von höchstens 2S/3 in einen Pot von mindestens 2S offen; benötigt wären höchstens 33 % Equity, die eine
      // Raise-Hand gegen eine Shove-Range fast immer hat – der Held müsste praktisch immer callen. Ein solcher Raise ist schwächer als das
      // All-in selbst (der Gegner behält die Wahl, schwache Hände zu folden und starke zu shoven) und wird durch das All-in ersetzt.
      if (ctx.eff > 0) {
        var commit = ctx.eff / 3, dropped = false;
        out = out.filter(function (a) { var drop = (a.type === 'bet' || a.type === 'raise') && a.amount < L.maxTo && a.amount >= commit; if (drop) dropped = true; return !drop; });
        if (dropped) add(L.maxTo, 'All-in', 'jam');
      }
    } else if (L.isBet) {
      [[0.33, '⅓ Pot'], [0.5, '½ Pot'], [0.75, '¾ Pot'], [1.0, 'Pot'], [1.5, 'Overbet 1,5×']].forEach(function (x) {
        // Overbets nur auf Turn und River im Heads-up (Modellannahme: auf dem Flop und multiway kaum sinnvoll, Reaktionen dort schlecht belegt)
        if (x[0] > 1 && (ctx.street === 1 || ctx.nOpp > 1)) return;
        add(me.bet + pot * x[0], 'Bet ' + x[1], ctx.cbetSpot ? 'cbet' : 'bet');
      });
      if (L.maxTo - me.bet <= 2.5 * pot) add(L.maxTo, 'All-in', 'jam');
    } else {
      var facing = ctx.cur - (ctx.prevCur || 0);
      [2.5, 3.5].forEach(function (x) { add(ctx.cur + (x - 1) * Math.max(facing, ctx.L.toCall), 'Raise ' + String(x).replace('.', ',') + '×', 'raise'); });
      add(ctx.cur + (pot + ctx.L.toCall), 'Raise Pot', 'raise');
      if (L.maxTo - me.bet <= 3 * (pot + ctx.L.toCall)) add(L.maxTo, 'All-in', 'jam');
    }
    out.forEach(function (a) { if ((a.type === 'bet' || a.type === 'raise') && a.amount === L.maxTo) a.label = (/^All-in/.test(a.label) ? a.label : a.label + ' (All-in)'), a.allin = true; });
  }
  return out;
}

/** Bewertet eine Aktion; liefert {ev, u (Unsicherheit), parts} */
function evaluateAction(ctx, act) {
  var r;
  if (act.type === 'fold') r = { ev: 0, dEdq: 0, parts: {} };
  else if (act.type === 'check') r = evCheck(ctx);
  else if (act.type === 'call') r = evCall(ctx);
  else r = evBet(ctx, act.amount, act.kind || (ctx.street === 0 ? (ctx.pre.rc === 0 ? 'open' : ctx.pre.rc === 1 ? '3bet' : '4bet') : (ctx.cbetSpot ? 'cbet' : 'bet')));
  var simU = (r.dEdq || 0) * (ctx.eqSE || 0) + (r.se || 0);
  var modelU = (r.dEdq || 0) * (ctx.eqRangeSpread || 0);
  if (act.type === 'bet' || act.type === 'raise') {
    // Unsicherheit der Reaktionsannahmen wächst mit der Einsatzgröße und der Zahl der Gegner
    // Prüfer B, Befund 2: Die Unsicherheit der Fold-Wahrscheinlichkeit ist eine Wahrscheinlichkeit und wächst nur bis zur doppelten Pot-Größe
    // (höchstens foldUnc); die Wirkung auf den EV wächst über |Pot − EV| ohnehin linear mit der Größe. Früher wuchs sie mit szU unbegrenzt,
    // die Unsicherheit also quadratisch, und neutralisierte große Verluste (z. B. All-in-Bluff mit 17-fachem Pot „Gut“).
    var szU = Math.min(2, Math.max(1, ((act.amount || 0) - ctx.me.bet) / Math.max(1, ctx.pot))), nU = Math.max(1, ctx.opps.filter(function (o) { return !o.p.allIn; }).length);
    modelU += Math.abs(ctx.pot - (r.ev || 0)) * ctx.foldUnc * 0.5 * szU * Math.sqrt(nU) + 0.02 * ctx.pot;
  }
  r.uSim = simU; r.uModel = modelU; r.u = Math.sqrt(simU * simU + modelU * modelU);
  return r;
}

// PT.equity.cacheClear leert auch diesen Cache (Prüfer B, Befund 6)
if (Q.onClear) Q.onClear(function () { ceCache.clear(); });
PT.ev = { absStrength: absStrength, POP: POP, popRespond: popRespond, likRespond: likRespond, pfTable: pfTable, eqClass: eqClass, comboEquities: comboEquities, rangeEq: rangeEq, respond: respond, splitRange: splitRange,
  realization: realization, playability: playability, potOdds: potOdds, evCheck: evCheck, evCall: evCall, evBet: evBet, candidates: candidates, evaluateAction: evaluateAction, subsetEq: subsetEq };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
