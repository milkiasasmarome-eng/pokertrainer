/* PokerTrainer – Browser-Tests zum Gegnergedächtnis (Format 3): Migration der gespeicherten Datenbank aus Format 2
   mit Sicherung vor der Umwandlung, Gegnerdialog (Kurzzeit/Langzeit, Veränderung, beobachtet/geschätzt/unbekannt), Maskierung importierter Texte.
   Aufruf: node tests/e2e-gedaechtnis.js [Basis-URL]   (Standard: http://127.0.0.1:8765/, statischer Server im Projektordner)
   Ergebnis: tests/results/e2e-gedaechtnis.json */
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8765/';
const OUT = path.join(__dirname, 'results');
const results = []; let cur = null;
async function test(name, fn) {
  const t0 = Date.now(); cur = { name, ok: true, checks: 0, notes: [] };
  try { await fn(); } catch (e) { cur.ok = false; cur.notes.push('Ausnahme: ' + String(e && e.message || e).split('\n')[0]); }
  cur.ms = Date.now() - t0; results.push(cur);
  console.log((cur.ok ? 'BESTANDEN ' : 'FEHLER    ') + name + ' (' + cur.checks + ' Prüfungen, ' + cur.ms + ' ms)' + (cur.ok ? '' : '\n   ' + cur.notes.join('\n   ')));
}
function ok(c, m) { cur.checks++; if (!c) { cur.ok = false; cur.notes.push(m || 'Bedingung verletzt'); } }
const ready = p => p.waitForFunction(() => window.PTUI && window.PTUI.S && window.PTUI.S.ready, null, { timeout: 15000 });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE + 'index.html#tisch', { waitUntil: 'load' }); await ready(page);

  let oldList = null;
  await test('Migration Format 2 → 3: Sicherung der alten Datenbank vor der Umwandlung, Langzeitwerte unverändert', async () => {
    // Gespeicherte Datenbank im Format 2 (wie PokerTrainer 2.0.1) anlegen: Engine spielt 400 Hände, Datensätze ohne Gedächtnisfelder
    oldList = await page.evaluate(async () => {
      const PT = window.PT, db = PT.stats.newDb(), hero = PT.stats.newRecord('hero', 'Du'), t = PT.session.newTable(PT.session.defaultConfig(), db, 99);
      for (let i = 0; i < 400; i++) { const h = PT.session.startHand(t, i + 1); while (!h.done) { if (h.p[h.toAct].isHero) { const L = h.legal(0); PT.session.act(t, h, 0, L.canCheck ? { type: 'check' } : { type: 'fold' }); } else PT.session.botAct(t, h, hero); } PT.session.finishHand(t, db, h, hero); }
      const strip = r => { const o = JSON.parse(JSON.stringify(r)); delete o.recent; delete o.cards; delete o.chg; return o; };
      const list = PT.stats.dbList(db).map(strip);
      window.PTUI.S.readonly = true;  // diese Seite schreibt nichts mehr (auch nicht beim Neuladen über pagehide)
      await window.PTUI.Store.put('opps', list, true);
      const meta = await window.PTUI.Store.get('meta', 'state'); meta.heroRec = strip(hero); await window.PTUI.Store.put('meta', meta);
      return list;
    });
    ok(oldList.length >= 5, oldList.length + ' Gegner im Format 2 gespeichert');
    const dlP = page.waitForEvent('download', { timeout: 15000 });
    await page.reload(); await ready(page);
    const dl = await dlP, name = dl.suggestedFilename();
    ok(/^Sicherung_PokerTrainer_\d{4}-\d{2}-\d{2}_Datenbank\.json$/.test(name), 'Sicherung als Datei: ' + name);
    const file = path.join(require('os').tmpdir(), 'e2e-sicherung-format2.json'); await dl.saveAs(file);
    const txt = fs.readFileSync(file, 'utf8'), bk = JSON.parse(txt);
    ok(bk.version === 2 && bk.count === oldList.length && JSON.stringify(bk.opponents) === JSON.stringify(oldList), 'Sicherung enthält die unveränderten alten Datensätze (Format 2)');
    const st = await page.evaluate(async (old) => {
      const S = window.PTUI.S, PT = window.PT, stored = await window.PTUI.Store.all('opps');
      return { notice: document.getElementById('notice').textContent, allV3: PT.stats.dbList(S.db).every(r => PT.stats.recordVersion(r) === 3),
        storedV3: stored.every(r => PT.stats.recordVersion(r) === 3), same: old.every(o => JSON.stringify(S.db.opps[o.id].stats) === JSON.stringify(o.stats) && S.db.opps[o.id].hands === o.hands),
        heroV3: PT.stats.recordVersion(S.heroRec) === 3, heroHands: S.heroRec.hands };
    }, oldList);
    ok(/Format 3/.test(st.notice) && /gesichert/.test(st.notice), 'Hinweis zur Umwandlung: ' + st.notice.slice(0, 120));
    ok(st.allV3 && st.storedV3, 'Datenbank im Arbeitsspeicher und im Browser-Speicher im Format 3');
    ok(st.same, 'Langzeitwerte exakt übernommen'); ok(st.heroV3 && st.heroHands === 400, 'eigene Werte umgewandelt (' + st.heroHands + ' Hände)');
    const reimp = await page.evaluate(t2 => { const r = window.PT.stats.dbImport(t2); return { ok: r.ok, migrated: r.migrated, n: r.count }; }, txt);
    ok(reimp.ok && reimp.migrated && reimp.n === oldList.length, 'Sicherungsdatei wieder importierbar');
    const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="migdl"]')]);
    ok(dl2.suggestedFilename() === name, 'Sicherung erneut herunterladbar');
    // Zweiter Start: keine erneute Umwandlung
    let again = false; const h = () => { again = true; }; page.on('download', h);
    await page.reload(); await ready(page); await page.waitForTimeout(2000); page.off('download', h);
    ok(!again && !/Format 3/.test(await page.textContent('#notice')), 'kein zweites Mal');
  });

  await test('Gegnerdialog: Kurzzeit- und Langzeitwerte, erkannte Veränderung, beobachtet/geschätzt/unbekannt, Maskierung', async () => {
    const id = await page.evaluate(() => {
      const PT = window.PT, S = window.PTUI.S, id = S.table.seats[1].id, r = S.db.opps[id];
      // synthetischer Verlauf mit Stilwechsel (nur Beobachtungen), dazu ein importiert wirkender Aktionstext mit HTML
      const rng = PT.makeRng('dlg');
      for (let i = 0; i < 500; i++) { const I = { stats: PT.stats.emptyStats(), agg: PT.stats.emptyAgg(), pos: 'BTN' }; I.stats.vpip = [rng() < (i < 350 ? 0.2 : 0.6) ? 1 : 0, 1]; I.stats.pfr = [0, 1]; PT.stats.applyToRecord(r, I, Date.now()); }
      r.shown.unshift({ hand: 1, ts: 1, pos: 'BTN', cards: 'AhKd', board: 'Ts9h2c', actions: ['<img src=x onerror="document.title=\'XSS\'">', '', '', ''], net: 0 });
      if (r.shown.length > 10) r.shown.length = 10;
      return id;
    });
    await page.evaluate(i => window.PTUI.showOpp(i), id);
    await page.waitForSelector('#modal:not([hidden])');
    const body = await page.textContent('#modalBody'), html = await page.innerHTML('#modalBody');
    ok(/Veränderte Spielweise erkannt/.test(body) && /VPIP: zuletzt/.test(body), 'Hinweis auf erkannte Veränderung');
    ok(/Langzeit/.test(body) && /Kurzzeit \(Halbwertszeit 100 Hände\)/.test(body), 'Kurzzeit- und Langzeitwerte');
    ok(/Beobachtet: Karten am Showdown/.test(body) && /Geschätzt: Werte aus Aktionen/.test(body) && /unbekannt/.test(body), 'Trennung beobachtet / geschätzt / unbekannt');
    ok(!/<img src=x/.test(html) && /&lt;img src=x/.test(html) && !/XSS/.test(await page.title()), 'importierter Text maskiert, kein Skript');
    await page.keyboard.press('Escape');
    await page.evaluate(() => { location.hash = '#gegner'; }); await page.waitForTimeout(400);
    await page.click('[data-gtab="alle"]'); await page.waitForTimeout(200);
    ok(/↑ VPIP/.test(await page.textContent('#glist')), 'Gegnerliste zeigt die Veränderung');
  });

  await test('Konsole: keine JavaScript-Fehler', async () => { ok(errors.length === 0, errors.slice(0, 5).join(' | ')); });
  await browser.close();
  const out = { base: BASE, date: new Date().toISOString(), passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, tests: results };
  fs.writeFileSync(path.join(OUT, 'e2e-gedaechtnis.json'), JSON.stringify(out, null, 1));
  console.log('\n' + out.passed + ' bestanden, ' + out.failed + ' fehlgeschlagen');
  process.exit(out.failed ? 1 : 0);
})();
