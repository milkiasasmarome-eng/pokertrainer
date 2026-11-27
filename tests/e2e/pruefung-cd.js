/* Browser-Regressionstests zur unabhängigen Prüfung 2.1 (Prüfer C: Daten, Tabs, Performance; Prüfer D: Oberfläche,
   Barrierefreiheit, Layout). Befunde: docs/audit-2.1/PRUEFUNG_C_D.md. Gezielt ausführbar: node tests/e2e.js <URL> --nur=cd
   Wird von tests/e2e.js aufgerufen: require('./e2e/pruefung-cd.js')(H) */
'use strict';
const fs = require('fs'), path = require('path');
const { IDB, INIT } = require('./robust.js');

module.exports = async function (H) {
  const { browser, BASE, OUT, test, ok, note, waitTurnOrNext, playHand } = H;
  const ready = (p, ms) => p.waitForFunction(() => window.PTUI && window.PTUI.S && window.PTUI.S.ready, null, { timeout: ms || 15000 });
  async function fresh(opts) {
    const c = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, serviceWorkers: 'block' }, opts || {}));
    const p = await c.newPage(); H.watchNet(p, 'pruefung-cd');
    return { c, p };
  }
  async function playOne(p, policy) { await p.evaluate(() => window.PTUI.setSetting('speed', 'sehrschnell')); return playHand(p, policy); }
  /** n Kopien gespeicherter Hände direkt in IndexedDB (ältere Zeitstempel), Blöcke zu 250 je Transaktion */
  async function fillHands(p, n, tiny) {
    const base = tiny ? null : await p.evaluate(() => window.PTUI.loadHands().then(hs => hs.map(h => JSON.stringify(h))));
    for (let from = 0; from < n; from += 250) {
      await p.evaluate(([base, from, n]) => new Promise((res, rej) => {
        const rq = indexedDB.open('pokertrainer2'); rq.onsuccess = () => { const d = rq.result, tx = d.transaction('hands', 'readwrite'), os = tx.objectStore('hands');
          for (let i = from; i < Math.min(n, from + 250); i++) { const h = base ? JSON.parse(base[i % base.length]) : { seats: [] }; h.id = 'syn' + i; h.ts = 1e12 + i; os.put(h); }
          tx.oncomplete = () => { d.close(); res(); }; tx.onerror = () => rej(tx.error); }; }), [base, from, n]);
    }
  }

  // ---------------- Prüfer C ----------------
  await test('Prüfung C10: Handende liest nicht alle gespeicherten Hände (kein getAll), Obergrenze 3.000 bleibt, älteste werden entfernt', async () => {
    const { c, p } = await fresh();
    await p.goto(BASE + 'index.html#tisch'); await ready(p); await playOne(p); await p.waitForTimeout(400);
    await fillHands(p, 3005, true);
    await p.reload(); await ready(p);
    await p.evaluate(() => { window.__getAll = 0; const g = IDBObjectStore.prototype.getAll; IDBObjectStore.prototype.getAll = function () { if (this.name === 'hands') window.__getAll++; return g.apply(this, arguments); }; });
    const t0 = Date.now(); await playOne(p, 'fold'); await p.evaluate(() => window.PTUI.flushWrites(8000));
    const n = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('pokertrainer2'); q.onsuccess = () => { const t = q.result.transaction('hands'), os = t.objectStore('hands'), cn = os.count(), o = os.get('syn0'), y = os.get('syn3004'); t.oncomplete = () => { q.result.close(); r({ n: cn.result, oldest: !!o.result, keep: !!y.result }); }; }; }));
    ok(await p.evaluate(() => window.__getAll) === 0, 'kein getAll auf „hands“ am Handende (' + await p.evaluate(() => window.__getAll) + ')');
    ok(n.n === 3000 && !n.oldest && n.keep, 'auf 3.000 gekürzt, älteste entfernt: ' + JSON.stringify(n));
    note('Hand mit 3.006 gespeicherten Händen in ' + (Date.now() - t0) + ' ms');
    await c.close();
  });
};
