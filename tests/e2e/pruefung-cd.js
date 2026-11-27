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

  await test('Prüfung C3: Rohsicherung ohne lesbare IndexedDB gilt als unvollständig – Zurücksetzen nur nach ausdrücklicher Bestätigung; Fokus nach „Weiter warten“ (D t12)', async () => {
    const { c, p } = await fresh();
    await p.goto(BASE + 'index.html#tisch'); await ready(p); for (let i = 0; i < 2; i++) await playOne(p); await p.waitForTimeout(500);
    await p.evaluate(() => localStorage.setItem('pokertrainer2.meta', '{"v":{"x":1}}'));  // Altbestand aus Entwurf 2: früher genügte er als „Sicherung“
    const nOpps = (await p.evaluate(IDB.all, 'opps')).length;
    await p.close();
    const q = await c.newPage(); await q.addInitScript(INIT.readError);
    await q.goto(BASE + 'index.html#tisch'); await q.waitForSelector('#recovery', { timeout: 25000 });
    const [dl] = await Promise.all([q.waitForEvent('download'), q.click('#recBackup')]);
    const f = path.join(OUT, 'c3-roh.json'); await dl.saveAs(f); const dump = JSON.parse(fs.readFileSync(f, 'utf8')); fs.unlinkSync(f);
    ok(dump.incomplete === true && /opps/.test(dump.indexedDBError) && Array.isArray(dump.indexedDB.pokertrainer2.meta), 'nicht lesbarer Bereich benannt, übrige Bereiche gesichert: ' + dump.indexedDBError);
    await q.waitForSelector('#recSaved:not([disabled])');
    ok(/unvollständig/.test(await q.textContent('#recStatus')), 'Hinweis „unvollständig“');
    await q.check('#recSaved');
    ok(await q.locator('#recReset').isDisabled() && await q.locator('#recLoss').isVisible(), 'Zurücksetzen bleibt gesperrt, Verlust-Bestätigung angeboten');
    ok(await q.evaluate(() => window.PTRecovery.reset().then(() => 'gelöscht', e => e.message)) !== 'gelöscht', 'PTRecovery.reset lehnt ohne Bestätigung ab');
    await q.close();
    const r = await c.newPage(); await r.goto(BASE + 'manifest.webmanifest');
    ok((await r.evaluate(IDB.all, 'opps')).length === nOpps, 'Gegnerdaten unverändert (' + nOpps + ')');
    // t12: „Weiter warten“ gibt den Fokus an das vorherige Element zurück
    await r.goto(BASE + 'index.html#tisch'); await ready(r);
    await r.focus('#bNext'); await r.evaluate(() => window.PTRecovery.fail('timeout', 'Test')); await r.waitForSelector('#recWait');
    await r.click('#recWait');
    ok(await r.evaluate(() => document.activeElement && document.activeElement.id) === 'bNext', 'Fokus zurück auf „Nächste Hand“');
    await c.close();
  });
};
