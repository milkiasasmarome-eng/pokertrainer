/* Browser-Tests 2.1: Initialisierung (Abschnitt 13) sowie Sicherheit und Daten (Abschnitt 15).
   Wird von tests/e2e.js aufgerufen: require('./e2e/robust.js')(H) */
'use strict';
const fs = require('fs'), path = require('path');

// ---------- Helfer im Browser ----------
const IDB = {
  /** Alle Einträge eines Speicherbereichs lesen */
  all: (store) => new Promise((res, rej) => { const rq = indexedDB.open('pokertrainer2'); rq.onsuccess = () => { const d = rq.result; const g = d.transaction(store).objectStore(store).getAll(); g.onsuccess = () => { d.close(); res(g.result); }; g.onerror = () => rej(g.error); }; rq.onerror = () => rej(rq.error); }),
  /** Einträge direkt schreiben (umgeht jede Prüfung der App – simuliert beschädigte oder manipulierte lokale Daten) */
  put: ([store, vals]) => new Promise((res, rej) => { const rq = indexedDB.open('pokertrainer2'); rq.onsuccess = () => { const d = rq.result; const tx = d.transaction(store, 'readwrite'); vals.forEach(v => tx.objectStore(store).put(v)); tx.oncomplete = () => { d.close(); res(); }; tx.onerror = () => rej(tx.error); }; rq.onerror = () => rej(rq.error); })
};
// Init-Skripte (laufen vor allen Skripten der Seite)
const INIT = {
  slowIdb: () => { const o = IDBFactory.prototype.open; IDBFactory.prototype.open = function (name) { if (name !== 'pokertrainer2') return o.apply(this, arguments); const self = this, args = arguments, fake = {}; setTimeout(() => { const rq = o.apply(self, args); ['onupgradeneeded', 'onsuccess', 'onerror', 'onblocked'].forEach(k => { rq[k] = ev => { fake.result = rq.result; fake.error = rq.error; fake.transaction = rq.transaction; if (fake[k]) fake[k](ev); }; }); }, 2500); return fake; }; },
  hangIdb: () => { const o = IDBFactory.prototype.open; IDBFactory.prototype.open = function (name) { if (name !== 'pokertrainer2') return o.apply(this, arguments); return {}; }; },
  noIdb: () => { Object.defineProperty(window, 'indexedDB', { get() { return undefined; }, configurable: true }); },
  idbSecurity: () => { IDBFactory.prototype.open = function () { throw new DOMException('Der Zugriff auf IndexedDB ist in diesem Kontext nicht erlaubt.', 'SecurityError'); }; },
  noStorage: () => { Object.defineProperty(window, 'indexedDB', { get() { return undefined; }, configurable: true }); Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('verboten', 'SecurityError'); }, configurable: true }); },
  readError: () => { const g = IDBObjectStore.prototype.getAll; IDBObjectStore.prototype.getAll = function () { if (this.name === 'opps') throw new DOMException('Lesefehler (simuliert)', 'UnknownError'); return g.apply(this, arguments); }; },
  noWorker: () => { delete window.Worker; window.Worker = undefined; },
  noSpeech: () => { try { delete window.speechSynthesis; delete window.SpeechSynthesisUtterance; } catch (e) { /* */ } Object.defineProperty(window, 'speechSynthesis', { get() { return undefined; }, configurable: true }); window.SpeechSynthesisUtterance = undefined; },
  speechThrows: () => { Object.defineProperty(window, 'speechSynthesis', { get() { throw new Error('Sprachfunktion gesperrt'); }, configurable: true }); },
  heartbeat: () => { window.__gap = 0; let last = performance.now(); (function tick() { const n = performance.now(); window.__gap = Math.max(window.__gap, n - last); last = n; window.__hb = requestAnimationFrame(tick); })(); },
  cspLog: () => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); }
};

module.exports = async function (H) {
  const { browser, BASE, OUT, test, ok, note, waitTurnOrNext, playHand } = H;
  const ready = (p, ms) => p.waitForFunction(() => window.PTUI && window.PTUI.S && window.PTUI.S.ready, null, { timeout: ms || 15000 });
  async function fresh(opts) {
    const c = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, serviceWorkers: 'block' }, opts || {}));
    const p = await c.newPage(); H.watchNet(p, 'robust'); await p.addInitScript(INIT.cspLog);
    return { c, p };
  }
  async function playOne(p) { await p.evaluate(() => window.PTUI.setSetting('speed', 'sehrschnell')); return playHand(p); }
  const noPwn = async p => p.evaluate(() => document.querySelectorAll('[data-pwn]').length + (window.__pwn ? 100 : 0));

  // =============== Initialisierung ===============
  await test('Start: erster Aufruf ohne Datenbank legt den Speicher an; vorhandene Datenbank wird geladen', async () => {
    const { c, p } = await fresh();
    const t0 = Date.now(); await p.goto(BASE + 'index.html#tisch'); await ready(p);
    const ms = Date.now() - t0;
    const info = await p.evaluate(() => window.PTUI.Store.info());
    ok(info.mode === 'idb' && !info.reason, 'IndexedDB genutzt: ' + JSON.stringify(info));
    ok(!/Lade/.test(await p.textContent('#status')), 'kein Ladezustand mehr');
    ok(await p.locator('#bNext').isEnabled(), '„Nächste Hand“ bereit');
    ok(await p.locator('#recovery').count() === 0, 'keine Fehleranzeige');
    ok(await playOne(p), 'Hand gespielt');
    await p.waitForTimeout(400);
    const stores = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('pokertrainer2'); q.onsuccess = () => { r(Array.from(q.result.objectStoreNames)); q.result.close(); }; }));
    ok(stores.join() === 'backup,hands,learn,meta,opps', 'Speicherbereiche angelegt: ' + stores.join());
    const before = await p.evaluate(() => window.PTUI.S.table.handNo);
    await p.reload(); await ready(p);
    ok(await p.evaluate(() => window.PTUI.S.table.handNo) === before && before >= 1, 'vorhandene Datenbank geladen (Hand ' + before + ')');
    note('erster Start bereit nach ' + ms + ' ms');
    await c.close();
  });

  await test('Start: beschädigte lokale Daten (manipulierte IndexedDB-Einträge) → Start, Hinweis, kein eingeschleustes HTML', async () => {
    const { c, p } = await fresh();
    await p.goto(BASE + 'index.html#tisch'); await ready(p); await playOne(p); await p.waitForTimeout(500);
    const good = (await p.evaluate(IDB.all, 'hands'))[0];
    ok(!!good, 'eine gültige Hand gespeichert');
    const evil = Object.assign({}, good, { id: 'boese1', no: '<img src=x data-pwn=1 onerror="window.__pwn=1">', ts: Infinity, heroNet: '<b data-pwn=1>' });
    const evil2 = Object.assign({}, good, { id: 'boese2', seats: [{ name: '<i data-pwn=1>' }] });
    await p.evaluate(IDB.put, ['hands', [evil, evil2, { id: 'boese3' }]]);
    await p.evaluate(IDB.put, ['opps', [{ id: 'g001', name: '<img data-pwn=1>', hands: NaN }, { id: 'kaputt' }]]);
    await p.evaluate(IDB.put, ['learn', [{ k: 'learning', v: { v: 1, decisions: 'kaputt' } }]]);
    const meta = (await p.evaluate(IDB.all, 'meta'))[0];
    meta.settings = Object.assign({}, meta.settings, { tipMode: '<b data-pwn=1>', speechRate: NaN, theme: 7, seed: { x: 1 } });
    meta.heroRec = { kaputt: true };
    await p.evaluate(IDB.put, ['meta', [meta]]);
    await p.reload(); await ready(p);
    const notice = await p.textContent('#notice');
    ok(/Beschädigte Einträge/.test(notice) && /Gegner-Einträge/.test(notice), 'Hinweis auf übersprungene Einträge: ' + notice.slice(0, 160));
    ok(await p.evaluate(() => window.PTUI.S.settings.tipMode) === 'vorher' && await p.evaluate(() => window.PTUI.S.settings.theme) === 'auto', 'ungültige Einstellungen durch Standardwerte ersetzt');
    ok(await playOne(p), 'Hand mit reparierten Daten gespielt');
    for (const v of ['analyse', 'gegner', 'fortschritt', 'training', 'einstellungen', 'tisch']) { await p.evaluate(x => { location.hash = '#' + x; }, v); await p.waitForTimeout(450); }
    await p.evaluate(() => { location.hash = '#analyse'; }); await p.waitForTimeout(600);
    ok(/beschädigte Einträge/.test(await p.textContent('#hskip')), 'Handhistorie meldet beschädigte Einträge');
    ok(await noPwn(p) === 0, 'kein eingeschleustes Element in allen Ansichten');
    await c.close();
  });

  await test('Start: beschädigte laufende Hand wird verworfen, Tischstand bleibt erhalten', async () => {
    const { c, p } = await fresh();
    await p.goto(BASE + 'index.html#tisch'); await ready(p); await playOne(p); await p.waitForTimeout(400);
    const meta = (await p.evaluate(IDB.all, 'meta'))[0], no = meta.table.handNo;
    meta.table.running = { no: no + 1, button: 2, ts: 1, acts: [{ s: 0, type: 'raise', amount: -5 }, 'kaputt'] };
    await p.evaluate(IDB.put, ['meta', [meta]]);
    await p.reload(); await ready(p);
    ok(/konnte nicht wiederhergestellt werden/.test(await p.textContent('#notice')), 'Hinweis „verworfen“');
    ok(await p.evaluate(() => window.PTUI.S.table.handNo) === no && await p.evaluate(() => window.PTUI.S.table.running) === null, 'Tischstand erhalten, keine hängende Hand');
    ok(await playOne(p), 'nächste Hand spielbar');
    await c.close();
  });

  await test('Start: Lesefehler beim Laden → Fehleranzeige mit Wiederherstellung, Trainer läuft ohne Speicherung weiter', async () => {
    const { c, p } = await fresh();
    await p.goto(BASE + 'index.html#tisch'); await ready(p); await playOne(p); await p.waitForTimeout(400);
    const metaBefore = JSON.stringify((await p.evaluate(IDB.all, 'meta'))[0].table.handNo);
    await p.addInitScript(INIT.readError);
    await p.reload(); await ready(p);
    await p.waitForSelector('#recovery', { timeout: 5000 });
    const txt = await p.textContent('#recovery');
    ok(/Gespeicherte Daten konnten nicht geladen werden/.test(txt) && /Lesefehler/.test(txt), 'verständliche Meldung mit Ursache');
    ok(await p.locator('#recReload').isVisible() && await p.locator('#recContinue').isVisible() && await p.locator('#recBackup').isVisible(), 'Neu laden, Weiterspielen, Sicherung');
    ok(await p.locator('#recReset').isDisabled(), 'Zurücksetzen erst nach Sicherung möglich');
    ok(await p.evaluate(() => document.activeElement && document.activeElement.id) === 'recReload', 'Fokus im Dialog');
    await p.keyboard.press('Escape');
    ok(await p.locator('#recovery').count() === 0, 'Esc: ohne Speicherung weiterspielen');
    ok(await p.evaluate(() => window.PTUI.Store.mode()) === 'mem' && /nicht nutzbar|nicht gespeichert/.test(await p.textContent('#notice')), 'Hinweis: Sitzung wird nicht gespeichert');
    ok(await playOne(p), 'Hand ohne Speicherung gespielt');
    const after = await p.evaluate(IDB.all, 'meta');
    ok(JSON.stringify(after[0].table.handNo) === metaBefore, 'gespeicherte Daten unverändert');
    await c.close();
  });

  await test('Start: langsame Initialisierung (IndexedDB antwortet nach 2,5 s) → normaler Start, Ladeanzeige nur vorübergehend', async () => {
    const { c, p } = await fresh();
    await p.addInitScript(INIT.slowIdb);
    const t0 = Date.now(); await p.goto(BASE + 'index.html#tisch');
    await p.waitForTimeout(800);
    ok(/Lade/.test(await p.textContent('#status')), 'Ladeanzeige während des Wartens');
    await ready(p, 12000); const ms = Date.now() - t0;
    ok(await p.evaluate(() => window.PTUI.Store.mode()) === 'idb', 'IndexedDB nach Verzögerung genutzt');
    ok(await p.locator('#recovery').count() === 0, 'keine Fehleranzeige');
    ok(await playOne(p), 'Hand gespielt'); note('bereit nach ' + ms + ' ms');
    await c.close();
  });

  await test('Start: IndexedDB antwortet nie → nach Zeitlimit spielbar ohne Speicherung, Hinweis mit „Neu laden“, kein Dauer-„Lade …“', async () => {
    const { c, p } = await fresh();
    await p.addInitScript(INIT.hangIdb);
    const t0 = Date.now(); await p.goto(BASE + 'index.html#tisch');
    await p.waitForTimeout(4600);
    ok(/dauert länger/.test(await p.textContent('#status')), 'Hinweis „dauert länger als üblich“ nach 4 s');
    await ready(p, 15000); const ms = Date.now() - t0;
    ok(ms < 12000, 'bereit nach ' + ms + ' ms (Zeitlimit 6 s)');
    const n = await p.textContent('#notice');
    ok(/antwortet nicht/.test(n) && await p.locator('#notice [data-act="reload"]').count() === 1, 'Hinweis mit Ursache und „Neu laden“');
    ok(await playOne(p), 'Hand gespielt');
    await c.close();
  });

  await test('Start: Programmdatei fehlt / App startet nie → Fehleranzeige; Rohsicherung, Zurücksetzen nur nach Sicherung, Import der Rohsicherung', async () => {
    const { c, p } = await fresh();
    await p.goto(BASE + 'index.html#tisch'); await ready(p); await playOne(p); await playOne(p); await p.waitForTimeout(600);
    const before = await p.evaluate(() => ({ hands: null, no: window.PTUI.S.table.handNo, opps: Object.keys(window.PTUI.S.db.opps).length }));
    before.hands = (await p.evaluate(IDB.all, 'hands')).length;
    // a) Skript-Ladefehler: sofortige Anzeige
    await p.route('**/assets/js/engine/ranges.js*', r => r.abort());
    await p.reload(); await p.waitForSelector('#recovery', { timeout: 6000 });
    ok(/Programmdatei fehlt/.test(await p.textContent('#recovery')) && /ranges\.js/.test(await p.textContent('#recovery')), 'Meldung nennt die fehlende Datei');
    await p.unroute('**/assets/js/engine/ranges.js*');
    // b) App wird nie bereit (Controller leer): Zeitlimit der Startüberwachung (20 s)
    await p.route('**/assets/js/ui/app.js*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* leer */' }));
    const t0 = Date.now(); await p.reload();
    await p.waitForSelector('#recovery', { timeout: 30000 });
    note('Fehleranzeige nach ' + (Date.now() - t0) + ' ms');
    ok(/dauert ungewöhnlich lange/.test(await p.textContent('#recovery')), 'Meldung „Start dauert ungewöhnlich lange“');
    ok(await p.locator('#recWait').isVisible() && await p.locator('#recSafe').isVisible(), 'Weiter warten / Ohne gespeicherte Daten starten');
    // Fokusfalle
    for (let i = 0; i < 8; i++) await p.keyboard.press('Tab');
    ok(await p.evaluate(() => !!document.activeElement.closest('#recovery')), 'Fokus bleibt im Dialog');
    // Sicherung, erst danach Zurücksetzen
    ok(await p.locator('#recSaved').isDisabled() && await p.locator('#recReset').isDisabled(), 'Zurücksetzen gesperrt');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#recBackup')]);
    ok(/Sicherung_PokerTrainer_\d{4}-\d\d-\d\d_Rohdaten\.json/.test(dl.suggestedFilename()), 'Rohsicherung: ' + dl.suggestedFilename());
    const rawPath = path.join(OUT, 'rohsicherung-test.json'); await dl.saveAs(rawPath);
    const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
    ok(raw.format === 'PokerTrainer-Rohsicherung' && raw.indexedDB.pokertrainer2.hands.length === before.hands, 'Rohsicherung enthält alle ' + before.hands + ' Hände');
    await p.waitForSelector('#recSaved:not([disabled])');
    ok(await p.locator('#recReset').isDisabled(), 'Zurücksetzen erst nach Bestätigung');
    await p.check('#recSaved');
    await p.unroute('**/assets/js/ui/app.js*');
    await Promise.all([p.waitForNavigation({ timeout: 15000 }), p.click('#recReset')]);
    await ready(p);
    ok(await p.evaluate(() => window.PTUI.S.table.handNo) === 0 && (await p.evaluate(IDB.all, 'hands')).length === 0, 'lokale Daten zurückgesetzt');
    // Rohsicherung wieder einlesen
    await p.evaluate(() => { location.hash = '#einstellungen'; }); await p.waitForTimeout(300);
    await p.click('#dIm'); await p.setInputFiles('#fileIn', rawPath);
    await p.waitForSelector('#impOk', { timeout: 15000 });
    ok(/Rohsicherung/.test(await p.textContent('#modalBody')), 'als Rohsicherung erkannt');
    await Promise.all([p.waitForEvent('download'), p.click('#impOk')]);
    await p.waitForFunction(() => document.getElementById('modal').hidden, null, { timeout: 15000 });
    await p.waitForTimeout(500);
    const restored = (await p.evaluate(IDB.all, 'hands')).length;
    ok(restored === before.hands, 'Hände wiederhergestellt: ' + restored + ' von ' + before.hands);
    await c.close();
  });

  await test('Start: abgesicherter Start (?start=sicher) lädt und verändert keine gespeicherten Daten', async () => {
    const { c, p } = await fresh();
    await p.goto(BASE + 'index.html#tisch'); await ready(p); await playOne(p); await p.waitForTimeout(400);
    const no = await p.evaluate(() => window.PTUI.S.table.handNo), nh = (await p.evaluate(IDB.all, 'hands')).length;
    await p.goto(BASE + 'index.html?start=sicher#tisch'); await ready(p);
    ok(/Abgesicherter Start/.test(await p.textContent('#notice')), 'Hinweis');
    ok(await p.evaluate(() => window.PTUI.S.table.handNo) === 0, 'gespeicherte Daten nicht geladen');
    ok(await playOne(p), 'Hand gespielt'); await p.waitForTimeout(400);
    ok((await p.evaluate(IDB.all, 'meta'))[0].table.handNo === no && (await p.evaluate(IDB.all, 'hands')).length === nh, 'Speicher unverändert');
    await p.click('[data-act="normalstart"]'); await ready(p);
    ok(await p.evaluate(() => window.PTUI.S.table.handNo) === no, '„Normal starten“ lädt die Daten wieder');
    await c.close();
  });

  await test('Start: Web Worker nicht verfügbar oder Worker-Datei fehlt → Coach rechnet im Hauptthread', async () => {
    for (const variant of ['ohne Worker', 'Worker-Datei 404']) {
      const { c, p } = await fresh();
      if (variant === 'ohne Worker') await p.addInitScript(INIT.noWorker);
      else await p.route('**/assets/js/worker.js*', r => r.fulfill({ status: 404, body: '' }));
      await p.goto(BASE + 'index.html#tisch'); await ready(p);
      await p.evaluate(() => window.PTUI.setSetting('speed', 'sehrschnell'));
      await p.click('#bNext');
      let tip = false;
      for (let i = 0; i < 30; i++) { const st = await waitTurnOrNext(p); if (st.next) break; await p.waitForFunction(() => /badge c-/.test(document.getElementById('tipBox').innerHTML), null, { timeout: 15000 }); tip = true; await p.click('#bCall'); }
      ok(tip, variant + ': Tipp erscheint');
      ok(await p.evaluate(() => window.PTUI.Analyzer.mode()) === 'Hauptthread', variant + ': Analyse im Hauptthread');
      await c.close();
    }
  });

  await test('Start: keine Sprachfunktion (fehlend oder gesperrt) → Hinweis, Trainer läuft ohne Ton', async () => {
    for (const [name, fn] of [['fehlt', INIT.noSpeech], ['wirft Ausnahme', INIT.speechThrows]]) {
      const { c, p } = await fresh();
      await p.addInitScript(fn);
      await p.goto(BASE + 'index.html#tisch'); await ready(p);
      ok(/keine Sprachfunktion/.test(await p.textContent('#notice')), name + ': Hinweis');
      ok(await p.locator('#speechOn').isDisabled(), name + ': Schalter deaktiviert');
      ok(await playOne(p), name + ': Hand gespielt');
      await c.close();
    }
  });

  await test('Start: privater Modus ohne IndexedDB → localStorage mit Hinweis; ohne jeden Speicher → nur Sitzung', async () => {
    for (const [name, fn] of [['indexedDB fehlt', INIT.noIdb], ['IndexedDB SecurityError', INIT.idbSecurity]]) {
      const { c, p } = await fresh();
      await p.addInitScript(fn);
      await p.goto(BASE + 'index.html#tisch'); await ready(p);
      ok(await p.evaluate(() => window.PTUI.Store.mode()) === 'ls', name + ': localStorage');
      ok(/privaten Modus/.test(await p.textContent('#notice')), name + ': Hinweis');
      ok(await playOne(p), name + ': Hand gespielt'); await p.waitForTimeout(300);
      const no = await p.evaluate(() => window.PTUI.S.table.handNo);
      await p.reload(); await ready(p);
      ok(await p.evaluate(() => window.PTUI.S.table.handNo) === no, name + ': Stand nach Neuladen erhalten');
      await c.close();
    }
    const { c, p } = await fresh();
    await p.addInitScript(INIT.noStorage);
    await p.goto(BASE + 'index.html#tisch'); await ready(p);
    ok(await p.evaluate(() => window.PTUI.Store.mode()) === 'mem' && /kein dauerhaftes Speichern/.test(await p.textContent('#notice')), 'ohne Speicher: Hinweis');
    ok(await playOne(p), 'ohne Speicher: Hand gespielt');
    await c.close();
  });

  await test('Start: installierte PWA (start_url) und Browser-Tab – offline, gleiche Daten, Übernahme nach Schließen', async () => {
    const c = await browser.newContext({ viewport: { width: 1100, height: 850 } });
    const pwa = await c.newPage(); H.watchNet(pwa, 'pwa');
    const man = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'manifest.webmanifest'), 'utf8'));
    await pwa.goto(BASE + man.start_url.replace(/^\.\//, '')); await ready(pwa);
    await pwa.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready); await pwa.waitForTimeout(1200);
    await playOne(pwa); await pwa.waitForTimeout(400);
    const no = await pwa.evaluate(() => window.PTUI.S.table.handNo);
    await c.setOffline(true);
    const tab = await c.newPage(); H.watchNet(tab, 'browser-tab');
    await tab.goto(BASE + 'index.html#tisch'); await ready(tab);
    ok(await tab.evaluate(() => window.PTUI.S.readonly) && /App-Fenster/.test(await tab.textContent('#notice')), 'zweites Fenster schreibgeschützt (offline aus dem Cache geladen)');
    ok(await tab.evaluate(() => window.PTUI.S.table.handNo) === no, 'gleiche Daten (Hand ' + no + ')');
    await pwa.close();
    await tab.waitForSelector('#notice [data-act="takeover"]', { timeout: 8000 });
    ok(true, 'Übernahme angeboten, nachdem das App-Fenster geschlossen wurde');
    await Promise.all([tab.waitForNavigation(), tab.click('#notice [data-act="takeover"]')]); await ready(tab);
    ok(!(await tab.evaluate(() => window.PTUI.S.readonly)), 'Browser-Tab schreibt jetzt');
    ok(await playOne(tab), 'Hand offline im Browser-Tab gespielt');
    await c.setOffline(false); await c.close();
  });

  // =============== Sicherheit und Daten ===============
  await test('Sicherheit: Sicherung mit HTML in allen Textfeldern und extremen Zahlen → nur als Text angezeigt (alle Ansichten, Replayer, Dialog)', async () => {
    const { c, p } = await fresh();
    await p.goto(BASE + 'index.html#tisch'); await ready(p); await playOne(p); await playOne(p); await playOne(p); await p.waitForTimeout(800);
    const payload = await p.evaluate(() => window.PTUI.loadHands().then(hands => {
      const X = '<img src=x data-pwn=1 onerror="window.__pwn=1">';
      hands.forEach(h => { h.heroNet = 999999999999; h.decisions.forEach(d => { d.chosen = X.slice(0, 80); d.rec = X.slice(0, 80); d.evs.forEach(e => { e.l = X.slice(0, 60); e.ev = 1e12; }); if (d.x) { d.x.eq.m = X.slice(0, 80); d.x.alt.forEach(a => { a.l = X.slice(0, 80); }); } }); });
      const opps = window.PT.stats.dbList(window.PTUI.S.db).map(r => { r = JSON.parse(JSON.stringify(r)); r.shown.forEach(s => { s.actions = [X, X, '', '']; }); return r; });
      return { opponents: opps, hero: window.PTUI.S.heroRec, hands, learning: window.PTUI.S.learning, settings: null, table: null };
    }));
    const txt = await p.evaluate(pl => window.PT.stats.backupExport(pl, 'xss'), payload);
    const file = path.join(OUT, 'xss-alle-felder.json'); fs.writeFileSync(file, txt);
    await p.evaluate(() => { location.hash = '#einstellungen'; }); await p.waitForTimeout(300);
    await p.click('#dIm'); await p.setInputFiles('#fileIn', file);
    await p.waitForSelector('#impOk', { timeout: 15000 });
    await Promise.all([p.waitForEvent('download'), p.click('#impOk')]);
    await p.waitForFunction(() => document.getElementById('modal').hidden, null, { timeout: 15000 }); await p.waitForTimeout(400);
    for (const v of ['analyse', 'gegner', 'fortschritt', 'training', 'tisch']) { await p.evaluate(x => { location.hash = '#' + x; }, v); await p.waitForTimeout(500); }
    await p.evaluate(() => { location.hash = '#analyse'; }); await p.waitForTimeout(700);
    await p.click('#hlist tr.click >> nth=0'); await p.waitForSelector('.replay');
    for (let i = 0; i < 12; i++) await p.click('[data-step="next"]');
    await p.click('.replay details summary');
    ok(/<img src=x/.test(await p.textContent('#view-analyse')), 'HTML erscheint als Text');
    const opp = payload.opponents.find(r => r.shown.length);
    if (opp) { await p.evaluate(id => window.PTUI.showOpp(id), opp.id); await p.waitForSelector('#modal:not([hidden])'); ok(/<img src=x/.test(await p.textContent('#modalBody')), 'Gegnerdialog zeigt Text'); await p.keyboard.press('Escape'); }
    ok(!/NaN|undefined|Infinity/.test(await p.textContent('#hlist')), 'extreme Zahlen ohne NaN/undefined');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-hx="bench"]')]);
    ok(/PokerTrainer_Benchmark_v1_/.test(dl.suggestedFilename()), 'Benchmark-Export mit manipulierten Texten');
    ok(await noPwn(p) === 0, 'kein eingeschleustes Element, kein Skript ausgeführt');
    ok((await p.evaluate(() => window.__csp)).length === 0, 'keine CSP-Verletzung (nichts versuchte nachzuladen)');
    await c.close();
  });

  await test('Daten: zu große Datei (über 60 MB) sofort abgelehnt; große gültige Sicherung wird im Worker geprüft, Oberfläche bleibt bedienbar', async () => {
    const { c, p } = await fresh();
    await p.addInitScript(INIT.heartbeat);
    await p.goto(BASE + 'index.html#tisch'); await ready(p); await playOne(p); await playOne(p); await p.waitForTimeout(600);
    const huge = path.join(OUT, 'zu-gross.tmp'); fs.writeFileSync(huge, Buffer.alloc(61 * 1024 * 1024, 32));
    await p.evaluate(() => { location.hash = '#einstellungen'; }); await p.waitForTimeout(300);
    const t0 = Date.now(); await p.click('#dIm'); await p.setInputFiles('#fileIn', huge);
    await p.waitForSelector('#modal:not([hidden])');
    ok(/zu groß/.test(await p.textContent('#modalBody')) && Date.now() - t0 < 3000, 'abgelehnt nach ' + (Date.now() - t0) + ' ms');
    fs.unlinkSync(huge); await p.keyboard.press('Escape');
    // große gültige Sicherung (~25 MB) aus den eigenen Händen
    const txt = await p.evaluate(() => window.PTUI.loadHands().then(hs => {
      const out = []; for (let i = 0; out.length < 700; i++) { const h = JSON.parse(JSON.stringify(hs[i % hs.length])); h.id = 'big' + i; h.ts = h.ts + i; out.push(h); }
      return window.PT.stats.backupExport({ opponents: window.PT.stats.dbList(window.PTUI.S.db), hero: window.PTUI.S.heroRec, hands: out, learning: window.PTUI.S.learning, settings: null, table: null }, 'gross');
    }));
    const big = path.join(OUT, 'gross.tmp'); fs.writeFileSync(big, txt);
    await p.evaluate(() => { window.__gap = 0; });
    const t1 = Date.now(); await p.click('#dIm'); await p.setInputFiles('#fileIn', big);
    await p.waitForSelector('#impOk', { timeout: 60000 });
    const gap = await p.evaluate(() => window.__gap), ms = Date.now() - t1;
    ok(gap < 1000, 'längste Blockade der Oberfläche während der Prüfung: ' + Math.round(gap) + ' ms (Datei ' + Math.round(txt.length / 1048576) + ' MB, Prüfung ' + ms + ' ms)');
    note('Importprüfung ' + Math.round(txt.length / 1048576) + ' MB: ' + ms + ' ms, längste Blockade ' + Math.round(gap) + ' ms');
    await p.click('#impNo'); fs.unlinkSync(big);
    await c.close();
  });

  await test('Daten: Migration aus Entwurf 2 (alte IndexedDB) mit automatischer Sicherung', async () => {
    const { c, p } = await fresh();
    await p.goto(BASE + 'manifest.webmanifest');
    await p.evaluate(() => new Promise((res, rej) => {
      const rq = indexedDB.open('pokertrainer-v2', 1);
      rq.onupgradeneeded = () => { const d = rq.result; d.createObjectStore('gegner', { keyPath: 'id' }); d.createObjectStore('meta', { keyPath: 'k' }); };
      rq.onsuccess = () => {
        const d = rq.result, tx = d.transaction(['gegner', 'meta'], 'readwrite');
        const st = { vpip: [12, 40], pfr: [8, 40], threeBet: [2, 30], foldTo3Bet: [1, 3], cbet: [3, 5], foldToCbet: [2, 6], wtsd: [3, 9] };
        tx.objectStore('gegner').put({ id: 'g001', name: 'Alte Anna', status: 'archiv', hands: 40, stats: st, shown: [], lastSeen: 1700000000000 });
        tx.objectStore('gegner').put({ id: 'g002', name: 'Alter Bodo', status: 'aktiv', hands: 40, stats: st, shown: [], lastSeen: 1700000000000 });
        tx.objectStore('meta').put({ k: 'tisch', v: { table: null } });
        tx.oncomplete = () => { d.close(); res(); }; tx.onerror = () => rej(tx.error);
      };
    }));
    const dlP = p.waitForEvent('download', { timeout: 15000 });
    await p.goto(BASE + 'index.html#tisch'); await ready(p);
    const dl = await dlP;
    ok(/Sicherung_PokerTrainer_\d{4}-\d\d-\d\d_Datenbank\.json/.test(dl.suggestedFilename()), 'Sicherung der alten Daten angeboten');
    ok(/Entwurf 2 übernommen: 2 Gegner/.test(await p.textContent('#notice')), 'Hinweis zur Migration');
    ok(await p.evaluate(() => window.PTUI.S.db.opps.g001 && window.PTUI.S.db.opps.g001.stats.cbetFlop[1] === 5 && window.PTUI.S.db.opps.g001.stats.fourBet[1] === 0), 'Werte umgewandelt, fehlende Werte unbekannt (0/0)');
    await playOne(p); await p.waitForTimeout(400);  // Speichern nach einer Hand darf die Markierung nicht verlieren
    let again = false; p.on('download', () => { again = true; });
    await p.reload(); await ready(p); await p.waitForTimeout(800);
    ok(!/Entwurf 2/.test(await p.textContent('#notice')) && !again, 'Migration nur einmal, keine erneute Sicherung');
    await c.close();
  });

  await test('Daten: vollständige Sicherung, Löschen (mit Sicherung) und Wiederherstellung ergeben denselben Stand', async () => {
    const { c, p } = await fresh();
    await p.goto(BASE + 'index.html#tisch'); await ready(p); for (let i = 0; i < 3; i++) await playOne(p); await p.waitForTimeout(800);
    // Status (am Tisch/Archiv) hängt vom neuen Tisch ab und wird beim Import nicht übernommen
    const snap = () => window.PTUI.loadHands().then(h => ({ hands: h.length, opps: JSON.stringify(window.PT.stats.dbList(window.PTUI.S.db).filter(r => r.hands > 0).map(r => Object.assign({}, r, { status: '' }))), dec: window.PTUI.S.learning.decisions.length }));
    const before = await p.evaluate(snap);
    await p.evaluate(() => { location.hash = '#einstellungen'; }); await p.waitForTimeout(300);
    const [bk] = await Promise.all([p.waitForEvent('download'), p.click('#dBk')]);
    const bkPath = path.join(OUT, 'sicherung-voll.json'); await bk.saveAs(bkPath);
    await p.click('#dDel'); await p.waitForSelector('#delOk');
    const [del] = await Promise.all([p.waitForEvent('download'), p.waitForNavigation({ timeout: 15000 }), p.click('#delOk')]);
    ok(/vor-Loeschen/.test(del.suggestedFilename()), 'Sicherung vor dem Löschen');
    await ready(p);
    ok((await p.evaluate(() => window.PTUI.loadHands().then(h => h.length))) === 0, 'Daten gelöscht');
    await p.evaluate(() => { location.hash = '#einstellungen'; }); await p.waitForTimeout(300);
    await p.click('#dIm'); await p.setInputFiles('#fileIn', bkPath);
    await p.waitForSelector('#impOk', { timeout: 15000 });
    await Promise.all([p.waitForEvent('download'), p.click('#impOk')]);
    await p.waitForFunction(() => document.getElementById('modal').hidden, null, { timeout: 15000 }); await p.waitForTimeout(500);
    await p.reload(); await ready(p);
    const after = await p.evaluate(snap);
    ok(after.hands === before.hands && after.dec === before.dec, 'Hände ' + after.hands + '/' + before.hands + ', Lernentscheidungen ' + after.dec + '/' + before.dec);
    ok(after.opps === before.opps, 'Gegnerdatenbank identisch');
    await c.close();
  });

  await test('Daten: schreibgeschützter zweiter Tab kann weder importieren, löschen noch eine Session starten; schreibt nichts', async () => {
    const c = await browser.newContext({ acceptDownloads: true, serviceWorkers: 'block' });
    const a = await c.newPage(); H.watchNet(a, 'tab-a');
    await a.goto(BASE + 'index.html#tisch'); await ready(a); await playOne(a); await a.waitForTimeout(400);
    const b = await c.newPage(); H.watchNet(b, 'tab-b');
    await b.goto(BASE + 'index.html#einstellungen'); await ready(b);
    ok(await b.evaluate(() => window.PTUI.S.readonly), 'Tab B schreibgeschützt');
    const metaBefore = JSON.stringify((await b.evaluate(IDB.all, 'meta'))[0]);
    await b.click('#dIm'); ok(/schreibgeschützt/.test(await b.textContent('#toast')), 'Import gesperrt');
    await b.click('#dDel'); ok(await b.locator('#delOk').count() === 0, 'Löschen gesperrt');
    await b.click('#sApply'); ok(/schreibgeschützt/.test(await b.textContent('#toast')), 'neue Session gesperrt');
    await b.selectOption('#cTh', 'dark'); await b.waitForTimeout(300);
    ok(JSON.stringify((await b.evaluate(IDB.all, 'meta'))[0]) === metaBefore, 'Tab B hat nichts geschrieben');
    await c.close();
  });

  await test('Daten: PWA-Update während einer laufenden Hand wird zurückgestellt; danach ohne Datenverlust aktualisiert', async () => {
    if (!H.UPDATE_BASE) { note('übersprungen (kein Update-Server)'); return; }
    const U = H.UPDATE_BASE, c = await browser.newContext({ viewport: { width: 1200, height: 850 } }), p = await c.newPage(); H.watchNet(p, 'update', U);
    H.resetUpdateSite();
    await p.goto(U + 'index.html#tisch'); await ready(p);
    await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(1200);
    await p.evaluate(() => window.PTUI.setSetting('speed', 'sehrschnell'));
    await playHand(p); await p.waitForTimeout(500);
    await p.click('#bNext'); const st = await waitTurnOrNext(p); ok(st.my, 'Hand läuft, Held am Zug');
    H.bumpUpdateSite();
    await p.evaluate(() => window.PTUI.swReg.update());
    await p.waitForSelector('#notice [data-act="swupdate"]', { timeout: 20000 });
    await p.evaluate(() => { window.__marker = 1; });
    await p.click('#notice [data-act="swupdate"]'); await p.waitForTimeout(800);
    ok(/laufende Hand beenden/.test(await p.textContent('#toast')) && await p.evaluate(() => window.__marker) === 1, 'Update während der Hand zurückgestellt');
    for (let i = 0; i < 40; i++) { const s2 = await waitTurnOrNext(p); if (s2.next) break; await p.click('#bCall'); }
    await p.waitForFunction(() => !window.PTUI.S.reveal, null, { timeout: 10000 });
    // Erwartet: jede beendete Hand ist gespeichert (Tisch-Handnummer = Zahl der Hände), auch die gerade beendete
    const no = await p.evaluate(() => window.PTUI.S.table.handNo), hands = no;
    await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click('#notice [data-act="swupdate"]')]);
    await ready(p);
    ok(await p.evaluate(() => window.__marker) === undefined, 'Seite neu geladen');
    const cacheNames = await p.evaluate(() => caches.keys());
    ok(cacheNames.length === 1 && /pokertrainer-/.test(cacheNames[0]), 'nur der neue Cache: ' + cacheNames.join(', '));
    ok(await p.evaluate(() => window.PTUI.S.table.handNo) === no, 'Tischstand erhalten (Hand ' + no + ')');
    ok(await p.evaluate(() => window.PTUI.loadHands().then(h => h.length)) === hands, 'zuletzt beendete Hand gespeichert (' + hands + ' Hände)');
    await c.close();
  });
};
module.exports.INIT = INIT;
module.exports.IDB = IDB;
