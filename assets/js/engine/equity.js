/* PokerTrainer 2.0 – Equity-Engine.
   Exakte Enumeration (Heads-up gegen Range auf Flop/Turn/River, wenn der Aufwand es erlaubt und die Zeit reicht),
   sonst Monte-Carlo mit gewichteten Ranges, Kartenentfernung, unabhängigen Stichproben, erwartungstreuer Planung
   des Stichprobenumfangs, Standardfehler und Wilson-artigem 95-%-Intervall für beschränkte Größen.
   Side-Pot-genaue Potanteile für All-in-Situationen. Fehlschläge (leere Range, keine konfliktfreie Verteilung,
   kein Budget) werden gekennzeichnet zurückgegeben (failed, reason), nie als Zahl. */
(function (G) {
'use strict';
var PT = G.PT, H = PT.hands, E = PT.eval, U = PT.util;
var NC = H.NC, C1 = H.C1, C2 = H.C2, evaluate = E.evaluate;

// Genauigkeitsstufen: Ziel-Standardfehler, Höchstzahl Simulationen, Zeitbudget, Grenze exakter Auswertungen
var LEVELS = {
  schnell:  { name: 'Schnell',        se: 0.02,   maxIter: 1500,  ms: 250,  exactMax: 150000 },
  standard: { name: 'Standard',       se: 0.01,   maxIter: 5000,  ms: 900,  exactMax: 600000 },
  praezise: { name: 'Präzise',        se: 0.005,  maxIter: 20000, ms: 2500, exactMax: 2500000 },
  tief:     { name: 'Tiefenanalyse',  se: 0.0025, maxIter: 60000, ms: 6000, exactMax: 6000000 }
};
var Z95 = 1.959963984540054, Z99 = 2.5758293035489;
var PILOT = 256;          // Pilotstichprobe (nur zur Planung, fließt nicht in die Schätzung ein)
var NO_VALID_ABORT = 64;  // Mehrgegner: so viele Versuche (je bis zu 50 Ziehungen) ohne gültige Verteilung → Fehlschlag

// ---------- Statistik einer Stichprobe x ∈ [0,1] ----------
/**
 * Schätzer, Standardfehler und Wilson-artiges Intervall für den Mittelwert einer beschränkten Größe X ∈ [0,1]
 * (Potanteil mit Split Pots: 0, 1/k, 1 – keine reine Binomialgröße). Für X ∈ [0,1] gilt Var X ≤ μ(1−μ); der
 * Varianzfaktor φ = s²/(m(1−m)) ∈ (0,1] macht daraus eine effektive Binomial-Stichprobe nₑ = n/φ, auf die das
 * Wilson-Score-Intervall angewendet wird. s² enthält je eine Pseudo-Beobachtung bei 0 und 1 (Untergrenze für nie
 * beobachtete Ausgänge, z. B. lauter Split Pots); am Rand (m = 0 oder 1) gilt φ = 1 (reines Binomial-Wilson).
 */
function summarize(n, sum, sum2, z) {
  if (!(n > 0)) return null;
  z = z || Z95;
  var m = sum / n; if (m < 0) m = 0; else if (m > 1) m = 1;
  var S = Math.max(0, sum2 - sum * m), Sps = m * m + (1 - m) * (1 - m);
  var v = (S + Sps) / (n + 1), pq = m * (1 - m);
  var phi = pq > 0 ? Math.min(1, v / pq) : 1, ne = n / phi, z2 = z * z, den = 1 + z2 / ne;
  var center = (m + z2 / (2 * ne)) / den, hw = z / den * Math.sqrt(pq / ne + z2 / (4 * ne * ne));
  var lo = Math.max(0, Math.min(m, center - hw)), hi = Math.min(1, Math.max(m, center + hw));
  if (m === 0) lo = 0; if (m === 1) hi = 1;
  return { m: m, se: Math.sqrt(Math.min(v, 0.25) / n), lo: lo, hi: hi, phi: phi, n: n, v: v };
}
/** Nötiger Umfang für den Ziel-Standardfehler T aus einer Pilotstichprobe: obere 99-%-Schranke der Varianz je Stichprobe */
function planSize(n0, sum, sum2, T) {
  var s = summarize(n0, sum, sum2, Z99);
  var mu = s.lo > 0.5 ? s.lo : s.hi < 0.5 ? s.hi : 0.5;
  var phiU = Math.min(1, s.phi * (1 + Z99 * Math.sqrt(2 / Math.max(1, n0 - 1))));
  // Untergrenze: Die Pseudo-Beobachtungen in summarize ergeben se ≥ ≈ 0,71/n; darunter wäre das Ziel nie erreichbar
  return Math.max(Math.ceil(phiU * mu * (1 - mu) / (T * T)), Math.ceil(0.75 / T));
}

// ---------- Cache mit Qualitätsangabe ----------
// Schlüssel ohne Stufe; jeder Eintrag trägt seine erreichte Qualität (exact, se, n, iters, aborted). Ein Eintrag wird
// nur genutzt, wenn er die angeforderte Qualität erfüllt (siehe usable); ein besserer Eintrag wird nie durch einen
// schlechteren ersetzt.
var cache = new Map(), CACHE_MAX = 300;
function cacheGet(k) { if (!cache.has(k)) return null; var v = cache.get(k); cache.delete(k); cache.set(k, v); return v; }
function better(a, b) { // ist a mindestens so gut wie b? Nur nach Art und Umfang, nie nach dem geschätzten Fehler (sonst wertabhängige Auswahl)
  if (a.exact) return true;
  if (b.exact) return false;
  return a.n >= b.n;
}
function cachePut(k, v) {
  var old = cache.get(k);
  if (old && !better(v, old)) return;
  cache.delete(k); cache.set(k, v);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}
var clearHooks = [];
function onClear(fn) { clearHooks.push(fn); }
function cacheClear() { cache.clear(); clearHooks.forEach(function (fn) { fn(); }); }
/**
 * req: {seT (Ziel-SE der Stufe), minN (Mindestanzahl), nMax (höchstens mögliche Stichproben der Anfrage), exactPossible}
 * Nutzbar: exakt; oder (Anfrage würde nicht exakt rechnen) und n ≥ minN und
 *   (nicht abgebrochen und se ≤ Ziel-SE)  oder  (n ≥ nMax: die Anfrage könnte selbst nicht mehr Stichproben ziehen).
 */
function usable(e, req) {
  // Prüfbefund 2.1 (Prüfer A, Befund 1): Die Entscheidung hängt nur vom Umfang ab, nicht vom geschätzten Standardfehler.
  // Ein wertabhängiges Kriterium (se ≤ Ziel) bevorzugt Einträge nahe 0/1 und verzerrt die zurückgegebene Equity.
  if (e.eq == null) return false;
  if (e.exact) return true;
  if (req.exactPossible) return false;
  if (e.n < req.minN) return false;
  var nWorst = Math.ceil(0.25 / (req.seT * req.seT));  // Umfang, der für jede Equity das Fehlerziel erreicht
  return e.n >= Math.min(nWorst, req.nMax);
}

function prepRange(w, deadMask) {
  var idx = [], cum = [], tot = 0, bad = false;
  for (var k = 0; k < NC; k++) {
    var x = w[k];
    if (x > 0 && !deadMask[C1[k]] && !deadMask[C2[k]]) { if (x === Infinity) bad = true; tot += x; idx.push(k); cum.push(tot); }
  }
  return { idx: idx, cum: cum, tot: tot, ok: !bad && isFinite(tot) && tot > 0 };
}
/** Alle verträglichen Kombinationstupel der Gegner mit Gewicht (Produkt der Einzelgewichte); null, wenn zu viele */
var JOINT_MAX = 2000000;
function jointTuples(R, nR) {
  var prod = 1; for (var j = 0; j < nR; j++) { prod *= R[j].idx.length; if (prod > JOINT_MAX) return null; }
  var tup = [], cum = [], tot = 0, cur = new Array(nR), used = {};
  function wOf(r, i) { return r.cum[i] - (i ? r.cum[i - 1] : 0); }
  (function rec(j, wAcc) {
    if (j === nR) { tot += wAcc; cum.push(tot); for (var q = 0; q < nR; q++) tup.push(cur[q]); return; }
    var r = R[j];
    for (var i = 0; i < r.idx.length; i++) {
      var k = r.idx[i], a = C1[k], b = C2[k];
      if (used[a] || used[b]) continue;
      used[a] = used[b] = true; cur[j] = k;
      rec(j + 1, wAcc * wOf(r, i));
      used[a] = used[b] = false;
    }
  })(0, 1);
  return { tup: tup, cum: cum, tot: tot };
}
function bsearch(cum, x) { var lo = 0, hi = cum.length - 1; while (lo < hi) { var mid = (lo + hi) >> 1; if (cum[mid] > x) hi = mid; else lo = mid + 1; } return lo; }
function failed(reason, extra) { return Object.assign({ eq: null, win: null, se: null, lo: null, hi: null, iters: 0, n: 0, failed: true, reason: reason, method: 'nicht berechenbar', exact: false }, extra || {}); }
function rangeProblem(R) {
  for (var j = 0; j < R.length; j++) if (!R[j].ok) return 'leere Range (Gegner ' + (j + 1) + '): keine Kombination mit Gewicht > 0 verträglich mit den bekannten Karten';
  return null;
}
function choose(n, k) { if (k < 0 || k > n) return 0; var r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); }

/** Aufwand der exakten Heads-up-Enumeration (Kombinationen × Runouts) oder -1, wenn nicht aufzählbar */
function exactCost(board, R, deadMask) {
  var need = 5 - board.length;
  if (need !== 0 && need !== 1 && need !== 2 && need !== 5) return -1;
  var avail = 0; for (var c = 0; c < 52; c++) if (!deadMask[c]) avail++;
  return R.idx.length * choose(avail - 2, need);
}
/**
 * Exakte Heads-up-Equity gegen eine Range (Board mit 3–5 Karten, oder 0 Karten gegen wenige Kombos).
 * deadline (optional): Nach je 8 Kombinationen wird die Restzeit aus dem jüngsten Tempo hochgerechnet; reicht sie nicht,
 * bricht die Aufzählung ab und liefert {aborted: true, done, of} (nie ein als exakt gekennzeichnetes Teilergebnis).
 */
function exactHU(hero, board, R, deadMask, limit, deadline) {
  var need = 5 - board.length, rest = [], c, i, j;
  var nCombos = R.idx.length, cost = exactCost(board, R, deadMask);
  if (cost < 0 || cost > limit || !nCombos) return null;
  var hArr = hero.concat(board), oArr = [0, 0].concat(board), hb = hArr.length;
  for (i = 0; i < need; i++) { hArr.push(0); oArr.push(0); }
  var sumW = 0, sumEq = 0, win = 0, tie = 0, evals = 0, hasDl = deadline != null && isFinite(deadline);
  var tLast = hasDl ? U.now() : 0, tStart = tLast;
  for (var t = 0; t < nCombos; t++) {
    if (hasDl && t > 0 && (t & 7) === 0) {
      var now = U.now(), rate = (now - tLast) / 8;
      if (now > deadline || now + rate * (nCombos - t) > deadline) return { aborted: true, done: t, of: nCombos, evals: evals, ms: now - tStart };
      tLast = now;
    }
    var k = R.idx[t], w = R.cum[t] - (t ? R.cum[t - 1] : 0), a = C1[k], b = C2[k];
    oArr[0] = a; oArr[1] = b;
    rest.length = 0;
    for (c = 0; c < 52; c++) if (!deadMask[c] && c !== a && c !== b) rest.push(c);
    var s = 0, n = 0, wn = 0, tn = 0;
    if (need === 0) {
      var hs = evaluate(hArr), os = evaluate(oArr); n = 1; if (hs > os) { s = 1; wn = 1; } else if (hs === os) { s = 0.5; tn = 1; }
    } else if (need === 1) {
      for (i = 0; i < rest.length; i++) { hArr[hb] = oArr[hb] = rest[i]; var h1 = evaluate(hArr), o1 = evaluate(oArr); n++; if (h1 > o1) { s += 1; wn++; } else if (h1 === o1) { s += 0.5; tn++; } }
    } else if (need === 2) {
      for (i = 0; i < rest.length; i++) { hArr[hb] = oArr[hb] = rest[i];
        for (j = i + 1; j < rest.length; j++) { hArr[hb + 1] = oArr[hb + 1] = rest[j]; var h2 = evaluate(hArr), o2 = evaluate(oArr); n++; if (h2 > o2) { s += 1; wn++; } else if (h2 === o2) { s += 0.5; tn++; } } }
    } else {
      var L = rest.length;
      for (var x1 = 0; x1 < L; x1++) {
        if (hasDl && (x1 & 3) === 0 && U.now() > deadline) return { aborted: true, done: t, of: nCombos, evals: evals, ms: U.now() - tStart };
        for (var x2 = x1 + 1; x2 < L; x2++) for (var x3 = x2 + 1; x3 < L; x3++) for (var x4 = x3 + 1; x4 < L; x4++) for (var x5 = x4 + 1; x5 < L; x5++) {
          hArr[2] = oArr[2] = rest[x1]; hArr[3] = oArr[3] = rest[x2]; hArr[4] = oArr[4] = rest[x3]; hArr[5] = oArr[5] = rest[x4]; hArr[6] = oArr[6] = rest[x5];
          var h5 = evaluate(hArr), o5 = evaluate(oArr); n++; if (h5 > o5) { s += 1; wn++; } else if (h5 === o5) { s += 0.5; tn++; }
        }
      }
    }
    evals += 2 * n;
    sumW += w; sumEq += w * s / n; win += w * wn / n; tie += w * tn / n;
  }
  if (!(sumW > 0)) return null;
  var eq = sumEq / sumW;
  return { eq: eq, win: win / sumW, tie: tie / sumW, se: 0, lo: eq, hi: eq, iters: 0, n: nCombos, evals: evals, method: 'exakt', exact: true, aborted: null };
}

/**
 * equity({hero, board, ranges, level, rng, budget, deadline, exact, minIter, dead, cache})
 * budget: {left, used, calls} – gemeinsame Obergrenze der Simulationen einer Entscheidung (gezählt werden Versuche)
 * Rückgabe: {eq, se, lo, hi, win, tie, iters, n, method, exact, aborted ('zeit'|'budget'|null), seTarget, planned, ...}
 *           oder bei Fehlschlag {eq: null, failed: true, reason}.
 */
function equity(o) {
  var hero = o.hero, board = o.board || [], ranges = o.ranges || [], L = LEVELS[o.level || 'standard'] || LEVELS.standard;
  var rng = o.rng || PT.makeRng(), t0 = U.now(), deadline = o.deadline || (t0 + L.ms);
  var dead = hero.concat(board).concat(o.dead || []), deadMask = H.deadMaskOf(dead);
  if (!ranges.length) return { eq: 1, se: 0, lo: 1, hi: 1, iters: 0, n: 0, method: 'kein Gegner', exact: true };
  var R = ranges.map(function (w) { return prepRange(w, deadMask); });
  var prob = rangeProblem(R);
  if (prob) return failed(prob, { method: 'leere Range' });
  var exactPossible = false;
  if (R.length === 1 && o.exact !== false && (board.length >= 3 || (board.length === 0 && R[0].idx.length <= 2 && L.exactMax >= 3000000))) {
    var cost = exactCost(board, R[0], deadMask); exactPossible = cost >= 0 && cost <= L.exactMax;
  }
  var nMax = Math.min(L.maxIter, o.budget ? Math.max(0, o.budget.left) : L.maxIter);
  var req = { seT: L.se, minN: o.minIter || 0, nMax: nMax, exactPossible: exactPossible };
  var key = o.cache === false ? null : ['eq', PT.cardsStr(hero), PT.cardsStr(board), PT.cardsStr(o.dead || []), ranges.map(PT.ranges.hash).join(',')].join('|');
  // Prüfer B, Befund 6: gekennzeichneter Strom (Coach) → Eintrag nur für denselben Strom und dieselbe Anfrage; Treffer melden den Nennumfang
  var tagged = !!(o.rng && o.rng.tag);
  if (key && tagged) key += '|' + o.rng.tag + '|' + nMax + '|' + (o.minIter || 0);
  if (key) {
    var hit = cacheGet(key);
    if (hit && usable(hit, req)) { var cp = Object.assign({}, hit); cp.cached = true; cp.iters = tagged ? (hit.iters || 0) : 0; return cp; }
  }
  var res = null, exAb = null;
  if (exactPossible) {
    res = exactHU(hero, board, R[0], deadMask, L.exactMax, deadline);
    if (res && res.aborted) { exAb = res; res = null; }
  }
  if (!res) res = monteCarlo(hero, board, R, deadMask, L, rng, o.budget, deadline, o.minIter);
  if (exAb) { res.exactAborted = exAb; res.method += ' (exakte Aufzählung wegen Zeitgrenze abgebrochen)'; }
  res.ms = Math.round(U.now() - t0);
  if (key && res.eq != null) cachePut(key, Object.assign({}, res));
  return res;
}

/**
 * Monte-Carlo-Equity mit unabhängigen Stichproben (Gegnerkombinationen nach Gewicht, Rejection bei Kartenkonflikten,
 * Restboard ohne Zurücklegen). Stichprobenumfang (gültige Stichproben):
 *  - Reicht die Obergrenze nicht für Pilot + ungünstigsten Fall (nWC = ⌈0,25/T²⌉, denn Var X ≤ 1/4), oder lohnt kein Pilot:
 *    fester Umfang N = min(nWC, Obergrenze) – unabhängig von den Werten, damit erwartungstreu.
 *  - Sonst Zwei-Stufen-Verfahren: Pilot (256) nur zur Planung von N₂ aus einer oberen Varianzschranke, die Schätzung
 *    stammt allein aus der unabhängigen zweiten Stichprobe (bedingt auf N₂ erwartungstreu; die frühere Variante mit
 *    Pilotproben in der Schätzung war zu den Rändern hin verzerrt).
 *  - Zeitabbruch: Stichprobenzahl hängt dann nur von der Zeit ab (nicht von den Werten). Bricht die zweite Stufe vor
 *    100 Stichproben ab, zählen Pilot und zweite Stufe zusammen (Ereignis hängt nur von der Zeit ab).
 */
function monteCarlo(hero, board, R, deadMask, L, rng, budget, deadline, minIter) {
  var cap = Math.min(L.maxIter, budget ? Math.max(0, budget.left) : L.maxIter);
  var T = L.se, nWC = Math.ceil(0.25 / (T * T)), minN = Math.max(0, minIter || 0);
  var need = 5 - board.length, deck = [], c, j, k;
  for (c = 0; c < 52; c++) if (!deadMask[c]) deck.push(c);
  var hArr = hero.concat(board), oArr = [];
  for (k = 0; k < need; k++) hArr.push(0);
  for (j = 0; j < R.length; j++) oArr.push([0, 0].concat(hArr.slice(2)));
  var mark = new Int32Array(52), stamp = 0, it = 0, rejected = 0, D = deck.length, tmp = new Array(D), nR = R.length, nb = board.length;
  var usePilot = cap >= nWC + PILOT && nWC >= 4 * PILOT;
  // planned: Umfang, der für das Ziel nötig ist (fester Weg: ungünstigster Fall); target: tatsächlich angestrebter Umfang
  var phase = usePilot ? 0 : 1, planned = usePilot ? 0 : Math.max(nWC, minN), target = usePilot ? PILOT : Math.min(planned, cap);
  var aborted = null, timeOut = false, J = null, jointEmpty = false;
  var s = [0, 0], s2 = [0, 0], cnt = [0, 0], wins = [0, 0], ties = [0, 0];
  while (true) {
    if (cnt[phase] >= target) {
      if (phase === 0) { phase = 1; planned = Math.max(minN, Math.min(nWC, Math.max(100, planSize(cnt[0], s[0], s2[0], T)))); target = planned; continue; }
      break;
    }
    if (it >= cap) { aborted = 'budget'; break; }
    if (cnt[0] + cnt[1] === 0 && it >= NO_VALID_ABORT && !J) {
      // Rejection Sampling findet keine verträgliche Verteilung: vollständige Aufzählung der Kombinationstupel (wenn klein genug).
      // So scheitern seltene, aber gültige Lagen nicht mehr (Prüfer A, Befund 4); ein Fehlschlag ist dann belegt.
      J = jointTuples(R, nR);
      if (!J) break;                                  // zu groß zum Aufzählen: wie bisher als nicht berechenbar melden
      if (!J.tot) { jointEmpty = true; break; }        // nachweislich keine verträgliche Verteilung
    }
    it++;
    if ((it & 127) === 0 && U.now() > deadline) { aborted = 'zeit'; timeOut = true; break; }
    var ok = false;
    if (J) {
      stamp++; ok = true;
      var ti = bsearch(J.cum, rng() * J.tot) * nR;
      for (j = 0; j < nR; j++) { var kj = J.tup[ti + j]; mark[C1[kj]] = stamp; mark[C2[kj]] = stamp; oArr[j][0] = C1[kj]; oArr[j][1] = C2[kj]; }
    } else for (var tr = 0; tr < 50 && !ok; tr++) {
      stamp++; ok = true;
      for (j = 0; j < nR; j++) {
        var r = R[j], kk = r.idx[bsearch(r.cum, rng() * r.tot)];
        if (mark[C1[kk]] === stamp || mark[C2[kk]] === stamp) { ok = false; break; }
        mark[C1[kk]] = stamp; mark[C2[kk]] = stamp; oArr[j][0] = C1[kk]; oArr[j][1] = C2[kk];
      }
    }
    if (!ok) { rejected++; continue; }
    var nT = 0;
    for (var d = 0; d < D; d++) { var cc = deck[d]; if (mark[cc] !== stamp) tmp[nT++] = cc; }
    for (var b = 0; b < need; b++) {
      var pick = b + Math.floor(rng() * (nT - b)), t = tmp[b]; tmp[b] = tmp[pick]; tmp[pick] = t;
      var pos = 2 + nb + b; hArr[pos] = tmp[b];
      for (j = 0; j < nR; j++) oArr[j][pos] = tmp[b];
    }
    var hs = evaluate(hArr), lose = false, tc = 0;
    for (j = 0; j < nR; j++) { var os = evaluate(oArr[j]); if (os > hs) { lose = true; break; } if (os === hs) tc++; }
    var share = lose ? 0 : 1 / (1 + tc);
    if (!lose) { if (tc) ties[phase]++; else wins[phase]++; }
    s[phase] += share; s2[phase] += share * share; cnt[phase]++;
  }
  if (budget) { budget.left -= it; budget.used += it; if (budget.calls) budget.calls.push(it); }
  var nAll = cnt[0] + cnt[1];
  if (!nAll) {
    if (jointEmpty) return failed('keine konfliktfreie Verteilung der Gegnerkarten (alle Kombinationstupel geprüft)', { iters: it, rejected: rejected, method: 'Monte Carlo' });
    if (it >= NO_VALID_ABORT && rejected === it) return failed('keine konfliktfreie Verteilung der Gegnerkarten gefunden (' + (it * 50) + ' Ziehungen verworfen)', { iters: it, rejected: rejected, method: 'Monte Carlo' });
    return failed(timeOut ? 'Zeitgrenze vor der ersten Stichprobe erreicht' : 'kein Simulationsbudget', { iters: it, rejected: rejected, method: 'Monte Carlo', aborted: aborted });
  }
  // Schätzung: zweite Stufe allein; nur wenn sie wegen der Zeit unter 100 Stichproben blieb, zusammen mit dem Pilot
  // (Abbruch durch Budget in der Pilotphase: nur der Pilot liegt vor; die Zahl angenommener Ziehungen hängt bei Rejection
  // Sampling nicht von den Werten ab, daher ebenfalls erwartungstreu.)
  var useBoth = usePilot && cnt[1] < 100 && timeOut, pilotOnly = usePilot && !useBoth && cnt[1] === 0;
  var n = useBoth ? nAll : pilotOnly ? cnt[0] : cnt[1], sum = useBoth ? s[0] + s[1] : pilotOnly ? s[0] : s[1], sum2 = useBoth ? s2[0] + s2[1] : pilotOnly ? s2[0] : s2[1];
  var wn = useBoth ? wins[0] + wins[1] : pilotOnly ? wins[0] : wins[1], tn = useBoth ? ties[0] + ties[1] : pilotOnly ? ties[0] : ties[1];
  var st = summarize(n, sum, sum2, Z95);
  if (!aborted && n < planned) aborted = 'budget';
  return { eq: st.m, se: st.se, lo: st.lo, hi: st.hi, phi: st.phi, win: wn / n, tie: tn / n,
    iters: it, n: n, valid: nAll, rejected: rejected, pilot: usePilot ? cnt[0] : 0, planned: planned, seTarget: T, aborted: aborted,
    method: 'Monte Carlo', exact: false };
}

/**
 * Erwarteter Gewinn aus festen Beiträgen (All-in, Side Pots). Nur Pots, für die der Held berechtigt ist, zählen.
 * o: {hero, heroTotal, board, opps:[{w, total, folded}], dead, dead_, deadMoney, rng, iters, budget, deadline}
 * Gibt {win (erwartete Chips), se, iters, n, pots, refund} zurück; bei Fehlschlag {win: null, failed: true, reason}.
 * Fester Stichprobenumfang (iters, durch Budget begrenzt), Abbruch an der Zeitgrenze.
 */
function potShare(o) {
  var entries = [{ seat: 0, total: o.heroTotal, folded: false }];
  o.opps.forEach(function (x, i) { entries.push({ seat: i + 1, total: x.total, folded: !!x.folded }); });
  // Gefoldete Beiträge einzeln, damit jeder Betrag im richtigen Pot (Main/Side) landet
  (o.dead_ || []).forEach(function (t) { if (t > 0) entries.push({ seat: entries.length, total: t, folded: true }); });
  if (o.deadMoney) entries.push({ seat: entries.length, total: o.deadMoney, folded: true });
  // Pots wie bei der Abrechnung (ohne Rake)
  var live = entries.filter(function (e) { return !e.folded; }), levels = [], pots = [], prev = 0;
  live.forEach(function (e) { if (levels.indexOf(e.total) < 0) levels.push(e.total); });
  levels.sort(function (a, b) { return a - b; });
  levels.forEach(function (Lv, li) {
    var amt = 0;
    entries.forEach(function (e) { var hi2 = li === levels.length - 1 ? e.total : Math.min(e.total, Lv); amt += Math.max(0, hi2 - Math.min(e.total, prev)); });
    pots.push({ amount: amt, eligible: live.filter(function (e) { return e.total >= Lv; }).map(function (e) { return e.seat; }) });
    prev = Lv;
  });
  // nicht gecallter Überschuss des alleinigen Höchstbeitrags fließt zurück
  var sorted = entries.slice().sort(function (a, b) { return b.total - a.total; });
  var refund = 0;
  if (sorted.length > 1 && sorted[0].total > sorted[1].total) {
    var ex = sorted[0].total - sorted[1].total, last = pots[pots.length - 1];
    if (last && last.eligible.length === 1) { last.amount -= ex; if (sorted[0].seat === 0) refund = ex; }
  }
  var liveOpps = o.opps.map(function (x, i) { return { w: x.w, seat: i + 1, folded: x.folded }; }).filter(function (x) { return !x.folded; });
  var board = o.board || [], dead = o.hero.concat(board).concat(o.dead || []), deadMask = H.deadMaskOf(dead);
  var R = liveOpps.map(function (x) { return prepRange(x.w, deadMask); });
  var prob = rangeProblem(R);
  if (prob) return { win: null, se: null, iters: 0, n: 0, pots: pots, refund: refund, failed: true, reason: prob };
  var rng = o.rng || PT.makeRng(), maxIt = Math.min(o.iters || 3000, o.budget ? Math.max(0, o.budget.left) : 1e9);
  var deadline = o.deadline != null ? o.deadline : Infinity;
  var need = 5 - board.length, deck = [], c, j;
  for (c = 0; c < 52; c++) if (!deadMask[c]) deck.push(c);
  var hArr = o.hero.concat(board), oArr = [];
  for (j = 0; j < need; j++) hArr.push(0);
  for (j = 0; j < R.length; j++) oArr.push([0, 0].concat(hArr.slice(2)));
  var mark = new Int32Array(52), stamp = 0, sum = 0, sum2 = 0, n = 0, it = 0, tmp = new Array(deck.length), rejected = 0, aborted = null;
  var scores = new Array(entries.length);
  while (it < maxIt) {
    if (n === 0 && it >= NO_VALID_ABORT) break;
    it++;
    if ((it & 127) === 0 && U.now() > deadline) { aborted = 'zeit'; break; }
    var ok = true;
    for (var tr = 0; tr < 50; tr++) {
      stamp++; ok = true;
      for (j = 0; j < R.length; j++) {
        var kk = R[j].idx[bsearch(R[j].cum, rng() * R[j].tot)];
        if (mark[C1[kk]] === stamp || mark[C2[kk]] === stamp) { ok = false; break; }
        mark[C1[kk]] = stamp; mark[C2[kk]] = stamp; oArr[j][0] = C1[kk]; oArr[j][1] = C2[kk];
      }
      if (ok) break;
    }
    if (!ok) { rejected++; continue; }
    var nT = 0; for (var d = 0; d < deck.length; d++) if (mark[deck[d]] !== stamp) tmp[nT++] = deck[d];
    for (var b = 0; b < need; b++) {
      var pick = b + Math.floor(rng() * (nT - b)), t = tmp[b]; tmp[b] = tmp[pick]; tmp[pick] = t;
      hArr[2 + board.length + b] = tmp[b]; for (j = 0; j < oArr.length; j++) oArr[j][2 + board.length + b] = tmp[b];
    }
    scores[0] = evaluate(hArr);
    for (j = 0; j < R.length; j++) scores[liveOpps[j].seat] = evaluate(oArr[j]);
    var won = refund;
    for (var p = 0; p < pots.length; p++) {
      var pt = pots[p]; if (pt.eligible.indexOf(0) < 0 || pt.amount <= 0) continue;
      var best = -1, cnt = 0;
      for (var e = 0; e < pt.eligible.length; e++) { var sc = scores[pt.eligible[e]]; if (sc > best) { best = sc; cnt = 1; } else if (sc === best) cnt++; }
      if (scores[0] === best) won += pt.amount / cnt;
    }
    sum += won; sum2 += won * won; n++;
  }
  if (o.budget) { o.budget.left -= it; o.budget.used += it; if (o.budget.calls) o.budget.calls.push(it); }
  if (!n) {
    var why = it === 0 ? 'kein Simulationsbudget' : rejected === it ? 'keine konfliktfreie Verteilung der Gegnerkarten gefunden' : 'Zeitgrenze vor der ersten Stichprobe erreicht';
    return { win: null, se: null, iters: it, n: 0, rejected: rejected, pots: pots, refund: refund, failed: true, reason: why, aborted: aborted };
  }
  // Standardfehler mit je einer Pseudo-Beobachtung bei 0 und beim höchstmöglichen Gewinn (Untergrenze wie in summarize):
  // nie 0 für eine Schätzung, auch wenn alle Stichproben gleich ausfielen
  var wMax = refund; pots.forEach(function (pt) { if (pt.eligible.indexOf(0) >= 0) wMax += pt.amount; });
  var m = sum / n, S = Math.max(0, sum2 - sum * m), vr = (S + m * m + (wMax - m) * (wMax - m)) / (n + 1);
  return { win: m, se: Math.sqrt(vr / n), iters: it, n: n, rejected: rejected, pots: pots, refund: refund, aborted: aborted };
}

PT.equity = { LEVELS: LEVELS, equity: equity, exactHU: exactHU, exactCost: exactCost, potShare: potShare, prepRange: prepRange, summarize: summarize,
  planSize: planSize, usable: usable, cacheClear: cacheClear, onClear: onClear, cacheSize: function () { return cache.size; } };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
