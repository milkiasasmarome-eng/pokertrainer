/* Messung der Tischdarstellung (Prüfung D, t4/t7): feste Spielsituation mit Einsätzen an allen Plätzen (bzw. All-in) aufbauen und
   Überlappungen zwischen Namensschildern, Karten, Einsätzen, Markern, Aktionen, Pot und Board sowie Elemente außerhalb des Tisches
   bzw. des Fensters melden. Beide Funktionen laufen im Browser (page.evaluate). */
'use strict';
module.exports = {
  setup: (variant) => {
    const PT = window.PT, S = window.PTUI.S; S.table.button = 3;
    const h = PT.session.startHand(S.table, 777), bb = h.bb;
    if (variant === 'river') {
      // alle bis zum River mitgehen (Held passiv), auf dem River setzen und erhöhen die Gegner, bis der Held am Zug ist
      let g = 0, k = 0;
      while (!h.done && g++ < 200) { const s = h.toAct, Lg = h.legal(s);
        if (h.street < 3 || s === 0) { h.act(s, Lg.canCheck ? { type: 'check' } : { type: 'call' }); if (h.street === 3 && s === 0) break; continue; }
        if (h.street === 3 && h.p.filter(q => !q.folded).length && k < 3) { k++; const r = h.act(s, { type: Lg.isBet ? 'bet' : 'raise', amount: Math.min(Lg.maxTo, Math.max(Lg.minTo, Lg.minTo + k * 5 * bb)) }); if (!r.ok) h.act(s, { type: 'call' }); }
        else h.act(s, Lg.canCheck ? { type: 'check' } : { type: 'call' });
        if (h.street === 3 && h.toAct === 0) break; }
      S.hand = h; S.reveal = false; window.PTUI.render(); return h.p.map(q => q.bet);
    }
    const seq = variant === 'allin' ? [['raise', 3], ['call'], ['raise', 10], ['allin'], ['call']] : [['raise', 3], ['call'], ['raise', 9.5], ['call'], ['call']];
    for (const x of seq) { const s = h.toAct; if (s === 0) break; const Lg = h.legal(s); let a;
      if (x[0] === 'raise') a = { type: 'raise', amount: Math.min(Lg.maxTo, Math.max(Lg.minTo, Math.round(x[1] * bb))) }; else if (x[0] === 'allin') a = { type: 'raise', amount: Lg.maxTo }; else a = Lg.canCheck ? { type: 'check' } : { type: 'call' };
      const r = h.act(s, a); if (!r.ok) h.act(s, Lg.canCheck ? { type: 'check' } : { type: 'call' }); }
    S.hand = h; S.reveal = false; window.PTUI.render();
    return h.p.map(q => q.bet);
  },
  measure: () => {
    const R = e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
    const items = [], tb = R(document.getElementById('table')), iw = document.documentElement.clientWidth;
    document.querySelectorAll('#seats .seat').forEach((s, i) => {
      items.push({ k: 'Platz' + i, ...R(s.querySelector('.plate')) });
      s.querySelectorAll('.hole .card').forEach((c, j) => items.push({ k: 'Karte' + i + '.' + j, own: i, ...R(c) }));
      const cm = s.querySelector('.chipmark'); if (cm) items.push({ k: 'Marker' + i, own: i, mark: true, ...R(cm) });
      const la = s.querySelector('.lastact'); if (la && la.textContent) items.push({ k: 'Aktion' + i, own: i, ...R(la) });
    });
    document.querySelectorAll('#seats .bet').forEach(b => { const n = +b.className.match(/b(\d)/)[1]; items.push({ k: 'Einsatz' + n, own: n, bet: true, ...R(b) }); });
    document.querySelectorAll('#pots .pot').forEach((x, i) => items.push({ k: 'Pot' + i, ...R(x) }));
    document.querySelectorAll('#board .card').forEach((x, i) => items.push({ k: 'Board' + i, ...R(x) }));
    const ov = [];
    for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
      const A = items[a], B = items[b];
      const same = (A.own != null && (A.own === B.own || B.k === 'Platz' + A.own)) || (B.own != null && A.k === 'Platz' + B.own);
      if (same && !A.bet && !B.bet) continue;
      const w = Math.min(A.r, B.r) - Math.max(A.l, B.l), h = Math.min(A.b, B.b) - Math.max(A.t, B.t);
      if (w > 2 && h > 2) ov.push(A.k + '×' + B.k + ' (' + Math.round(w) + '×' + Math.round(h) + ')');
    }
    const out = items.filter(x => x.l < -1 || x.r > iw + 1 || (x.mark && (x.l < tb.l - 1 || x.r > tb.r + 1))).map(x => x.k + ' [' + Math.round(x.l) + '–' + Math.round(x.r) + ']');
    const clipped = [...document.querySelectorAll('#seats .plate .hud, #seats .plate .nm, #seats .plate .stk, #seats .plate .hud2')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.className);
    const sw = document.documentElement.scrollWidth;
    return { ov, out, clipped, hscroll: sw > iw + 1, sw };
  }
};
