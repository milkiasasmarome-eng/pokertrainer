/* PokerTrainer 2.x – Browser-Tests (End-to-End) mit Playwright und Chrome/Chromium.
   Aufruf: node tests/e2e.js [Basis-URL]   (Standard: http://127.0.0.1:8765/)
   Voraussetzung: statischer Server im Projektordner, z. B. python3 -m http.server 8765 --bind 127.0.0.1
   Werkzeuge: npm --prefix tests ci (Playwright, axe-core). Browser: CHROME=Pfad, CHROME= (leer) für das Chromium von Playwright.
   Teile: diese Datei (Grundfunktionen), tests/e2e/robust.js (Start, Sicherheit, Daten), tests/e2e/a11y.js (Barrierefreiheit),
   tests/e2e/pruefung-cd.js (Regressionen der Prüfung 2.1, Prüfer C und D).
   Ergebnis: tests/results/e2e.json, Screenshots in tests/results/screens/, Barrierefreiheit in tests/results/a11y/ */
'use strict';
const path = require('path'), fs = require('fs'), http = require('http');
const LOCAL_PW = path.join(__dirname, 'node_modules', 'playwright');
const { chromium } = require(process.env.PLAYWRIGHT || (fs.existsSync(LOCAL_PW) ? LOCAL_PW : '/opt/npm-tools/node_modules/playwright'));
const CHROME = process.env.CHROME !== undefined ? (process.env.CHROME || undefined) : (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
const ONLY = (process.argv.find(a => a.startsWith('--nur=')) || '').slice(6);  // z. B. --nur=robust,a11y (nur Teilbereiche)
const BASE = process.argv.slice(2).find(a => !a.startsWith('--')) || 'http://127.0.0.1:8765/';
const ORIGIN = new URL(BASE).origin;
const OUT = path.join(__dirname, 'results'), SHOTS = path.join(OUT, 'screens');
fs.mkdirSync(SHOTS, { recursive: true });
const results = []; let cur = null;
let PART = 'basis';
async function test(name, fn) {
  if (ONLY && !ONLY.split(',').includes(PART)) return;
  const t0 = Date.now(); cur = { name, part: PART, ok: true, checks: 0, notes: [] };
  try { await fn(); } catch (e) { cur.ok = false; cur.notes.push('Ausnahme: ' + String(e && e.message || e).split('\n')[0]); }
  cur.ms = Date.now() - t0; results.push(cur);
  console.log((cur.ok ? 'BESTANDEN ' : 'FEHLER    ') + name + ' (' + cur.checks + ' Prüfungen, ' + cur.ms + ' ms)' + (cur.ok ? '' : '\n   ' + cur.notes.join('\n   ')));
}
function ok(c, m) { cur.checks++; if (!c) { cur.ok = false; cur.notes.push(m || 'Bedingung verletzt'); } }
function note(m) { cur.notes.push(m); }
async function waitTurnOrNext(page, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 15000)) {
    const st = await page.evaluate(() => ({ my: !document.getElementById('bCall').disabled, next: !document.getElementById('bNext').disabled }));
    if (st.my || st.next) return st;
    await page.waitForTimeout(80);
  }
  return { my: false, next: false };
}
async function playHand(page, policy) {
  const nextBtn = page.locator('#bNext');
  if (await nextBtn.isEnabled()) await nextBtn.click();
  for (let i = 0; i < 40; i++) {
    const st = await waitTurnOrNext(page);
    if (st.next) return true;
    if (st.my) {
      if (policy === 'fold' && await page.locator('#bFold').isEnabled()) await page.click('#bFold');
      else await page.click('#bCall');
    }
  }
  return false;
}
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const consoleErrors = [], foreign = [], requests = { n: 0 };
  // Netzwerkprotokoll aller Seiten: Jede Anfrage muss an den eigenen Ursprung gehen (oder data:/blob:/file: der Einzeldatei)
  function watchNet(page, tag, extraOrigin) {
    page.on('request', r => {
      const u = r.url(); requests.n++;
      if (/^(data|blob|file):/.test(u) || u.startsWith(ORIGIN + '/') || (extraOrigin && u.startsWith(new URL(extraOrigin).origin + '/'))) return;
      foreign.push(tag + ': ' + u);
    });
  }
  function watch(page, tag) {
    watchNet(page, tag);
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(tag + ': ' + m.text()); });
    page.on('pageerror', e => consoleErrors.push(tag + ' pageerror: ' + e.message));
    page.on('response', r => { if (r.status() >= 400) consoleErrors.push(tag + ' HTTP ' + r.status() + ' ' + r.url()); });
  }
  // Zweiter Server mit einer Kopie der Website für den Update-Test (sw.js wird dort verändert)
  const UPD_DIR = path.join(require('os').tmpdir(), 'pt-update-site-' + process.pid), ROOT = path.join(__dirname, '..');
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
  function copySite() { fs.rmSync(UPD_DIR, { recursive: true, force: true }); ['index.html', 'manifest.webmanifest', 'sw.js', 'assets', 'dist'].forEach(f => fs.cpSync(path.join(ROOT, f), path.join(UPD_DIR, f), { recursive: true })); }
  copySite();
  const updServer = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname), f = path.join(UPD_DIR, u.endsWith('/') ? u + 'index.html' : u);
    if (!f.startsWith(UPD_DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => updServer.listen(0, '127.0.0.1', r));
  const UPDATE_BASE = 'http://127.0.0.1:' + updServer.address().port + '/';
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage(); watch(page, 'desktop');
  const perf = {};

  await test('Laden: keine Fehler, Leistungswerte (LCP, CLS, Ladezeit)', async () => {
    await page.addInitScript(() => {
      window.__lcp = 0; window.__cls = 0;
      try { new PerformanceObserver(l => { l.getEntries().forEach(e => { window.__lcp = e.startTime; }); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) { /* */ }
      try { new PerformanceObserver(l => { l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; }); }).observe({ type: 'layout-shift', buffered: true }); } catch (e) { /* */ }
    });
    const t0 = Date.now();
    await page.goto(BASE + 'index.html#tisch', { waitUntil: 'load' });
    perf.loadMs = Date.now() - t0;
    await page.waitForFunction(() => window.PTUI && window.PTUI.S && window.PTUI.S.ready, null, { timeout: 15000 });
    perf.readyMs = Date.now() - t0;
    await page.waitForTimeout(800);
    const p = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { lcp: window.__lcp, cls: window.__cls, dcl: n ? n.domContentLoadedEventEnd : null, transfer: performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0) }; });
    Object.assign(perf, p);
    ok(perf.lcp < 2500, 'LCP ' + perf.lcp); ok(perf.cls < 0.1, 'CLS ' + perf.cls);
    note('Ladezeit ' + perf.loadMs + ' ms, bereit nach ' + perf.readyMs + ' ms, LCP ' + Math.round(perf.lcp) + ' ms, CLS ' + perf.cls.toFixed(3));
    ok(await page.title() === "PokerTrainer 2.1 – No-Limit Hold'em Trainer mit Coach", 'Titel');
  });

  await test('Hand spielen: Tipp „vorher“ erscheint binnen 2 Sekunden, keine neue Hand ohne „Nächste Hand“', async () => {
    const lat = [];
    await page.evaluate(() => window.PTUI.setSetting('speed', 'sehrschnell'));
    ok(await page.locator('#bNext').isEnabled(), 'Nächste Hand aktiv');
    for (let h = 0; h < 12; h++) {
      await page.click('#bNext');
      ok(!(await page.locator('#bNext').isEnabled()), 'während der Hand gesperrt');
      for (let i = 0; i < 40; i++) {
        const st = await waitTurnOrNext(page); if (st.next) break;
        const t0 = Date.now();
        await page.waitForFunction(() => /badge c-/.test(document.getElementById('tipBox').innerHTML), null, { timeout: 4000 });
        lat.push(Date.now() - t0);
        await page.click('#bCall');
      }
    }
    await page.waitForTimeout(1500);
    const still = await page.evaluate(() => !document.getElementById('bNext').disabled);
    ok(still, 'nach Handende wartet der Trainer auf „Nächste Hand“');
    const maxLat = Math.max(...lat, 0); perf.tipMaxMs = maxLat; perf.tipAvgMs = lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null;
    ok(maxLat < 2000, 'Tipp-Latenz max. ' + maxLat + ' ms'); note(lat.length + ' Tipps, Ø ' + perf.tipAvgMs + ' ms, max. ' + maxLat + ' ms');
    await page.screenshot({ path: path.join(SHOTS, 'desktop-tisch.png') });
  });

  await test('Ungültiger Betrag, Tastatursteuerung, Tipp-Modi „nachher“ und „aus“', async () => {
    let raised = false;
    for (let h = 0; h < 10 && !raised; h++) {
      await page.keyboard.press('n');
      for (let i = 0; i < 40; i++) {
        const st = await waitTurnOrNext(page); if (st.next) break;
        if (!raised && await page.locator('#bRaise').isEnabled()) {
          await page.fill('#amt', 'abc'); await page.click('#bRaise');
          ok(/Ungültiger Betrag/.test(await page.textContent('#msg')), 'Meldung bei Text');
          await page.fill('#amt', '0,01'); await page.click('#bRaise');
          ok(/Mindestens|Ungültiger Betrag/.test(await page.textContent('#msg')), 'Meldung unter Minimum');
          await page.fill('#amt', '999999'); await page.click('#bRaise');
          ok(/Höchstens|Ungültiger/.test(await page.textContent('#msg')), 'Meldung über Maximum');
          raised = true;
        }
        await page.keyboard.press('c');
      }
    }
    ok(raised, 'Raise-Situation gefunden');
    await page.click('#modes button[data-mode="nachher"]');
    await waitTurnOrNext(page);
    let graded = false;
    for (let h = 0; h < 6 && !graded; h++) {
      if (await page.locator('#bNext').isEnabled()) await page.click('#bNext');
      for (let i = 0; i < 40; i++) {
        const st = await waitTurnOrNext(page); if (st.next) break;
        ok(!/badge c-/.test(await page.innerHTML('#tipBox')) || graded, 'im Modus „nachher“ kein Tipp vor der Aktion');
        await page.click('#bCall');
        await page.waitForFunction(() => /class="grade /.test(document.getElementById('tipBox').innerHTML), null, { timeout: 5000 }); graded = true;
      }
    }
    ok(graded, 'Urteil nach der Aktion');
    await page.click('#modes button[data-mode="aus"]');
    ok(/Tipps sind aus/.test(await page.textContent('#tipBox')), 'Modus aus');
    await page.click('#modes button[data-mode="vorher"]');
    await playHand(page);
  });

  await test('Live-Anzeige und Gegnerdetails, Dialog mit Esc schließen', async () => {
    const hud = await page.locator('.seat.s1 .hud').textContent();
    ok(/\d+|–/.test(hud), 'HUD-Werte am Platz');
    await page.click('.seat.s1 .plate');
    await page.waitForSelector('#modal:not([hidden])');
    const body = await page.textContent('#modalBody');
    ok(/VPIP/.test(body) && /WTSD/.test(body) && /Belastbarkeit/.test(body), 'alle Werte im Dialog');
    await page.keyboard.press('Escape');
    ok(await page.locator('#modal').isHidden(), 'Dialog geschlossen');
  });

  await test('Alle Bereiche öffnen; Range-Matrix, Gegnerliste, Fortschritt, Hilfe', async () => {
    for (const v of ['training', 'analyse', 'ranges', 'gegner', 'fortschritt', 'einstellungen', 'hilfe', 'tisch']) {
      await page.evaluate(x => { location.hash = '#' + x; }, v); await page.waitForTimeout(400);
      const txt = await page.textContent('#view-' + v);
      ok(txt && txt.length > 40, 'Bereich ' + v + ' hat Inhalt');
    }
    await page.evaluate(() => { location.hash = '#ranges'; }); await page.waitForTimeout(300);
    ok(await page.locator('.mcell').count() === 169, '169 Zellen');
    await page.click('.mcell[data-ci="168"]');
    ok(/AA/.test(await page.textContent('#mxinfo')), 'Details zu AA');
    ok(/Kombinationen: 6/.test(await page.textContent('#mxinfo')), '6 Kombinationen AA');
    await page.evaluate(() => { location.hash = '#gegner'; }); await page.waitForTimeout(300);
    ok(await page.locator('#glist tr.click').count() >= 5, 'Gegner gelistet');
    await page.evaluate(() => { location.hash = '#fortschritt'; }); await page.waitForTimeout(800);
    ok(/bewertete Entscheidungen/.test(await page.textContent('#view-fortschritt')), 'Dashboard');
  });

  let exportPath = null;
  await test('Export und Import der Datenbank, beschädigte Datei wird abgelehnt', async () => {
    await page.evaluate(() => { location.hash = '#gegner'; }); await page.waitForTimeout(300);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-g="export"]')]);
    exportPath = path.join(OUT, 'export-test.json'); await dl.saveAs(exportPath);
    const txt = fs.readFileSync(exportPath, 'utf8'); ok(/"format":"PokerTrainer-DB","version":3/.test(txt), 'Exportformat Version 3 (Gegnergedächtnis)');
    const before = await page.evaluate(() => JSON.stringify(window.PT.stats.dbList(window.PTUI.S.db)));
    const bad = path.join(OUT, 'kaputt.json'); fs.writeFileSync(bad, txt.slice(0, Math.floor(txt.length / 2)));
    await page.click('[data-g="import"]'); await page.setInputFiles('#fileIn', bad);
    // Seit 2.1 wird die Datei im Web Worker geprüft („Datei wird geprüft …“), danach erscheint das Ergebnis
    await page.waitForFunction(() => /abgelehnt|bestätigen/.test(document.getElementById('modalH').textContent), null, { timeout: 15000 });
    ok(/abgelehnt/.test(await page.textContent('#modalH')), 'beschädigte Datei abgelehnt');
    await page.keyboard.press('Escape');
    ok(before === await page.evaluate(() => JSON.stringify(window.PT.stats.dbList(window.PTUI.S.db))), 'Datenbank unverändert');
    await page.click('[data-g="import"]'); await page.setInputFiles('#fileIn', exportPath);
    await page.waitForSelector('#impOk');
    const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#impOk')]);
    ok(/Sicherung_PokerTrainer_/.test(dl2.suggestedFilename()), 'automatische Sicherung vor dem Import');
    await page.waitForTimeout(500);
    ok(before === await page.evaluate(() => JSON.stringify(window.PT.stats.dbList(window.PTUI.S.db))), 'Export und Import ergeben dieselbe Datenbank');
    // Sicherung vor Import enthält die bisherigen Daten, nicht die importierten (Prüfbefund C4)
    const nBefore = JSON.parse(before).length;
    const alt = await page.evaluate(() => { const l = window.PT.stats.dbList(window.PTUI.S.db).slice(0, 1); return window.PT.stats.dbExport(window.PT.stats.dbFromList(l).db || window.PT.stats.dbFromList(l), 'alt'); });
    const altPath = path.join(OUT, 'import-ein-gegner.json'); fs.writeFileSync(altPath, alt);
    await page.click('[data-g="import"]'); await page.setInputFiles('#fileIn', altPath);
    await page.waitForSelector('#impOk');
    const [dl3] = await Promise.all([page.waitForEvent('download'), page.click('#impOk')]);
    const bkPath = path.join(OUT, 'sicherung-vor-import.json'); await dl3.saveAs(bkPath);
    const bk = JSON.parse(fs.readFileSync(bkPath, 'utf8'));
    ok(bk.payload && bk.payload.opponents.length === nBefore, 'Sicherung vor Import enthält die bisherigen ' + nBefore + ' Gegner (enthalten: ' + (bk.payload ? bk.payload.opponents.length : '–') + ')');
    await page.waitForTimeout(500);
    const imp = JSON.parse(alt).opponents[0];
    const after = await page.evaluate((id) => { const l = window.PT.stats.dbList(window.PTUI.S.db); return { withHands: l.filter(r => r.hands > 0).map(r => r.id), rec: window.PTUI.S.db.opps[id] ? window.PTUI.S.db.opps[id].hands : null }; }, imp.id);
    ok(after.rec === imp.hands && after.withHands.every(id => id === imp.id), 'danach gilt die importierte Datenbank (Sitzgegner ohne Hände werden ergänzt)');
    // ursprünglichen Stand wiederherstellen
    await page.click('[data-g="import"]'); await page.setInputFiles('#fileIn', exportPath);
    await page.waitForSelector('#impOk');
    await Promise.all([page.waitForEvent('download'), page.click('#impOk')]);
    await page.waitForTimeout(500);
    ok(before === await page.evaluate(() => JSON.stringify(window.PT.stats.dbList(window.PTUI.S.db))), 'Ausgangsstand wiederhergestellt');
  });
  await test('Sicherheit: manipulierte Sicherung mit Skript in Lerndaten wird abgelehnt (keine Ausführung)', async () => {
    const mal = await page.evaluate(() => {
      const L = window.PT.training.newLearning(); L.quiz.correct = '<img src=x onerror="document.title=\'XSS\'">';
      return window.PT.stats.backupExport({ opponents: window.PT.stats.dbList(window.PTUI.S.db), hero: window.PTUI.S.heroRec, hands: [], learning: L, settings: window.PTUI.S.settings, table: window.PTUI.S.table }, 'x');
    });
    const malPath = path.join(OUT, 'xss-sicherung.json'); fs.writeFileSync(malPath, mal);
    await page.evaluate(() => { location.hash = '#gegner'; }); await page.waitForTimeout(200);
    await page.click('[data-g="import"]'); await page.setInputFiles('#fileIn', malPath);
    await page.waitForFunction(() => /abgelehnt|bestätigen/.test(document.getElementById('modalH').textContent), null, { timeout: 15000 });
    ok(/abgelehnt/.test(await page.textContent('#modalH')), 'Sicherung abgelehnt');
    await page.keyboard.press('Escape');
    ok(!/XSS/.test(await page.title()), 'kein Skript ausgeführt');
  });

  await test('Handhistorie und Replayer: vor, zurück, damals/später bekannt, Entscheidung erneut treffen', async () => {
    await page.evaluate(() => { location.hash = '#analyse'; }); await page.waitForTimeout(800);
    const rows = await page.locator('#hlist tr.click').count(); ok(rows >= 5, rows + ' Hände in der Historie');
    await page.click('#hlist tr.click >> nth=0'); await page.waitForSelector('.replay');
    await page.click('[data-step="next"]'); await page.click('[data-step="next"]'); await page.click('[data-step="prev"]');
    ok(/Schritt 2 von/.test(await page.textContent('.replay')), 'Schritt 2');
    await page.click('[data-step="last"]');
    ok(/Ergebnis/.test(await page.textContent('.replay')), 'später bekannte Infos am Ende');
    // Entscheidung erneut treffen in einer Hand mit Entscheidung
    let redone = false;
    for (let r = 0; r < Math.min(rows, 8) && !redone; r++) {
      await page.click('#hlist tr.click >> nth=' + r); await page.waitForSelector('.replay');
      for (let s = 0; s < 25 && !redone; s++) {
        if (await page.locator('[data-redo]').count()) {
          await page.click('[data-redo]'); await page.waitForSelector('[data-rchoice]', { timeout: 8000 });
          await page.click('[data-rchoice] >> nth=0'); await page.waitForTimeout(200);
          ok(/Neue Entscheidung/.test(await page.textContent('#redoBox')), 'erneute Entscheidung bewertet'); redone = true;
        } else await page.click('[data-step="next"]');
      }
    }
    ok(redone, 'Replayer-Entscheidung gefunden');
    await page.screenshot({ path: path.join(SHOTS, 'desktop-replayer.png'), fullPage: true });
  });

  await test('Training: Kategorie starten, Situation bewerten, Quiz', async () => {
    await page.evaluate(() => { location.hash = '#training'; }); await page.waitForTimeout(400);
    await page.click('[data-qa] >> nth=0'); ok(/Richtig|Nicht ganz/.test(await page.textContent('#quizBox')), 'Quiz beantwortet');
    await page.click('[data-train="blind-defense"] >> nth=0');
    const st = await waitTurnOrNext(page);
    ok(st.my, 'Trainingssituation: Held am Zug');
    ok(/Training/.test(await page.textContent('#trainbar')), 'Trainingsleiste');
    await page.waitForFunction(() => /badge c-/.test(document.getElementById('tipBox').innerHTML), null, { timeout: 5000 });
    await page.click('#bFold').catch(() => page.click('#bCall'));
    for (let i = 0; i < 30; i++) { const s2 = await waitTurnOrNext(page); if (s2.next) break; await page.click('#bCall'); }
    await page.waitForTimeout(800);
    ok(/Ø Qualität/.test(await page.textContent('#trainbar')), 'Bewertung der Trainingssituation');
    await page.click('[data-act="trainstop"]');
    ok(await page.locator('#trainbar').isHidden(), 'Training beendet');
  });

  await test('Einstellungen: Darstellung, neue Session mit Seed', async () => {
    await page.evaluate(() => { location.hash = '#einstellungen'; }); await page.waitForTimeout(300);
    await page.selectOption('#cTh', 'dark'); ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'dark', 'dunkel');
    await page.selectOption('#cTh', 'light'); ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'light', 'hell');
    await page.selectOption('#cTh', 'auto');
    await page.fill('#sSeed', '12345'); await page.click('#sApply'); await page.waitForTimeout(500);
    ok(await page.evaluate(() => window.PTUI.S.table.seed) === 12345, 'Seed übernommen');
  });

  await test('Neuladen während einer laufenden Hand: exakte Wiederaufnahme', async () => {
    await page.evaluate(() => { location.hash = '#tisch'; }); await page.waitForTimeout(300);
    await page.click('#bNext'); const st = await waitTurnOrNext(page);
    ok(st.my, 'Held am Zug');
    const before = await page.evaluate(() => ({ no: window.PTUI.S.hand.no, acts: window.PTUI.S.hand.actions.length, cards: window.PT.cardsStr(window.PTUI.S.hand.p[0].cards) }));
    await page.reload(); await page.waitForFunction(() => window.PTUI && window.PTUI.S.ready);
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => window.PTUI.S.hand ? ({ no: window.PTUI.S.hand.no, acts: window.PTUI.S.hand.actions.length, cards: window.PT.cardsStr(window.PTUI.S.hand.p[0].cards) }) : null);
    ok(after && after.no === before.no && after.cards === before.cards && after.acts === before.acts, 'gleiche Hand, gleiche Karten, gleicher Stand: ' + JSON.stringify(before) + ' / ' + JSON.stringify(after));
    ok(/wiederhergestellt/.test(await page.textContent('#notice')), 'Hinweis zur Wiederherstellung');
    for (let i = 0; i < 30; i++) { const s2 = await waitTurnOrNext(page); if (s2.next) break; await page.click('#bCall'); }
  });

  await test('Mehrere Tabs: zweiter Tab ist schreibgeschützt', async () => {
    const p2 = await ctx.newPage(); watch(p2, 'tab2');
    await p2.goto(BASE + 'index.html#tisch'); await p2.waitForFunction(() => window.PTUI && window.PTUI.S.ready);
    ok(await p2.evaluate(() => window.PTUI.S.readonly), 'schreibgeschützt');
    ok(/anderen Tab/.test(await p2.textContent('#notice')), 'Hinweis');
    ok(!(await p2.locator('#bNext').isEnabled()), 'Spielen gesperrt');
    await p2.close();
  });

  await test('Daten bleiben nach Neustart erhalten', async () => {
    const before = await page.evaluate(() => ({ opps: Object.keys(window.PTUI.S.db.opps).length, hand: window.PTUI.S.table.handNo }));
    await page.reload(); await page.waitForFunction(() => window.PTUI && window.PTUI.S.ready); await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ opps: Object.keys(window.PTUI.S.db.opps).length, hand: window.PTUI.S.table.handNo }));
    ok(after.opps === before.opps && after.hand === before.hand, JSON.stringify(before) + ' → ' + JSON.stringify(after));
  });

  await test('Offline: Service Worker installiert, Seite lädt und spielt ohne Netz', async () => {
    if (!/^https?:\/\/(127\.0\.0\.1|localhost)|^https:/.test(BASE)) { note('übersprungen (kein http/https)'); return; }
    await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready);
    await page.waitForTimeout(1500);
    const ctrl = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active); });
    ok(ctrl, 'Service Worker aktiv');
    await ctx.setOffline(true);
    await page.reload(); await page.waitForFunction(() => window.PTUI && window.PTUI.S.ready, null, { timeout: 15000 });
    ok(await playHand(page), 'Hand offline gespielt');
    const tipOk = await page.evaluate(() => !!(window.PTUI.S.verdict || window.PTUI.S.analysis));
    ok(tipOk, 'Coach offline (Web Worker aus dem Cache)');
    await ctx.setOffline(false);
  });

  await test('Browser ohne Sprachfunktion: Meldung, Trainer läuft weiter', async () => {
    const p3 = await (await browser.newContext()).newPage(); watch(p3, 'ohne-sprache');
    await p3.goto(BASE + 'index.html#ohne-sprache'); await p3.waitForFunction(() => window.PTUI && window.PTUI.S.ready);
    ok(/keine Sprachfunktion/.test(await p3.textContent('#notice')), 'Meldung');
    ok(await playHand(p3), 'Hand ohne Ton gespielt');
    await p3.context().close();
  });

  await test('Darstellung auf Smartphone, Tablet und Desktop (kein horizontales Scrollen)', async () => {
    for (const [name, vp, mob] of [['smartphone', { width: 390, height: 844 }, true], ['smartphone-klein', { width: 360, height: 740 }, true], ['smartphone-320', { width: 320, height: 640 }, true], ['tablet', { width: 820, height: 1180 }, true], ['desktop', { width: 1440, height: 900 }, false]]) {
      const c = await browser.newContext({ viewport: vp, isMobile: mob, hasTouch: mob }), p = await c.newPage(); watch(p, name);
      await p.goto(BASE + 'index.html#tisch'); await p.waitForFunction(() => window.PTUI && window.PTUI.S.ready);
      await p.click('#bNext'); await waitTurnOrNext(p); await p.waitForTimeout(700);
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.screenshot({ path: path.join(SHOTS, name + '-tisch.png') });
      for (const v of ['tisch', 'training', 'analyse', 'ranges', 'gegner', 'fortschritt', 'einstellungen', 'hilfe']) {
        await p.evaluate(x => { location.hash = '#' + x; }, v); await p.waitForTimeout(350);
        const w = await p.evaluate(() => document.documentElement.scrollWidth);
        ok(w <= vp.width + 1, name + ' ' + v + ': Breite ' + w);
      }
      await c.close();
    }
  });

  await test('Barrierefreiheit: Namen für Bedienelemente, Bilder mit Alt, Fokusreihenfolge, Kontrast', async () => {
    await page.evaluate(() => { location.hash = '#tisch'; }); await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const unnamed = [...document.querySelectorAll('button, a, input, select')].filter(el => el.offsetParent !== null).filter(el => {
        const n = (el.getAttribute('aria-label') || el.textContent || el.title || (el.labels && el.labels[0] && el.labels[0].textContent) || el.getAttribute('placeholder') || '').trim();
        return !n;
      }).map(el => el.outerHTML.slice(0, 80));
      const imgs = [...document.images].filter(i => !i.hasAttribute('alt')).length;
      function lum(c) { const m = c.match(/\d+(\.\d+)?/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); }
      function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
      const panel = getComputedStyle(document.querySelector('.panel')).backgroundColor;
      const muted = getComputedStyle(document.querySelector('.speechstat')).color, ink = getComputedStyle(document.body).color;
      return { unnamed, imgs, mutedRatio: ratio(muted, panel), inkRatio: ratio(ink, panel), lang: document.documentElement.lang, skip: !!document.querySelector('.skip') };
    });
    ok(r.unnamed.length === 0, 'unbenannte Elemente: ' + r.unnamed.join(' | '));
    ok(r.imgs === 0, 'Bilder ohne alt'); ok(r.lang === 'de', 'Sprache de'); ok(r.skip, 'Sprunglink');
    ok(r.mutedRatio >= 4.5, 'Kontrast Nebentext ' + r.mutedRatio.toFixed(2)); ok(r.inkRatio >= 7, 'Kontrast Text ' + r.inkRatio.toFixed(2));
    await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.reload(); await page.waitForFunction(() => window.PTUI && window.PTUI.S.ready);
    await page.keyboard.press('Tab'); const f = await page.evaluate(() => document.activeElement && document.activeElement.className);
    ok(/skip/.test(f), 'erster Tab-Stopp: Sprunglink');
    note('Kontrast Nebentext ' + r.mutedRatio.toFixed(2) + ':1, Text ' + r.inkRatio.toFixed(2) + ':1');
  });

  await test('Portable Einzeldatei (file://): lädt, spielt, Coach per Blob-Worker', async () => {
    const file = 'file://' + path.join(__dirname, '..', 'dist', 'PokerTrainer_2.1.html');
    const c = await browser.newContext(), p = await c.newPage(); watch(p, 'einzeldatei');
    await p.goto(file + '#tisch'); await p.waitForFunction(() => window.PTUI && window.PTUI.S.ready, null, { timeout: 15000 });
    await p.click('#bNext');
    let tip = false;
    for (let i = 0; i < 30; i++) {
      const st = await waitTurnOrNext(p); if (st.next) break;
      await p.waitForFunction(() => /badge c-/.test(document.getElementById('tipBox').innerHTML), null, { timeout: 5000 }); tip = true;
      await p.click('#bCall');
    }
    ok(tip, 'Tipp in der Einzeldatei');
    ok(await p.evaluate(() => window.PTUI.Analyzer.mode()) === 'Web Worker', 'Analyse im Web Worker');
    await p.screenshot({ path: path.join(SHOTS, 'einzeldatei.png') });
    await c.close();
  });

  const H = { browser, BASE, OUT, SHOTS, test, ok, note, watch, watchNet, waitTurnOrNext, playHand, UPDATE_BASE,
    resetUpdateSite: copySite,
    bumpUpdateSite: () => { const f = path.join(UPD_DIR, 'sw.js'); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/(CACHE = 'pokertrainer-' \+ VERSION \+ '-[0-9a-f]+)'/, "$1-neu'") + '/* Update ' + Date.now() + ' */\n'); } };
  PART = 'robust'; await require('./e2e/robust.js')(H);
  PART = 'a11y'; await require('./e2e/a11y.js')(H);
  PART = 'cd'; await require('./e2e/pruefung-cd.js')(H);
  PART = 'basis';
  await test('Netzwerk: keine Verbindung zu fremden Adressen (alle Seiten, alle Tests)', async () => {
    ok(requests.n > 200, requests.n + ' Anfragen protokolliert');
    ok(foreign.length === 0, 'fremde Adressen: ' + [...new Set(foreign)].slice(0, 8).join(' | '));
  });
  await test('Konsole: keine JavaScript-Fehler, keine 404', async () => {
    const relevant = consoleErrors.filter(e => !/favicon|net::ERR_INTERNET_DISCONNECTED|ERR_FILE_NOT_FOUND.*sw\.js/.test(e));
    ok(relevant.length === 0, relevant.slice(0, 8).join(' | '));
  });

  await browser.close(); updServer.close(); fs.rmSync(UPD_DIR, { recursive: true, force: true });
  const out = { base: BASE, date: new Date().toISOString(), passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, perf, tests: results };
  fs.writeFileSync(path.join(OUT, /127\.0\.0\.1|localhost/.test(BASE) ? 'e2e.json' : 'e2e-live.json'), JSON.stringify(out, null, 1));
  console.log('\n' + out.passed + ' bestanden, ' + out.failed + ' fehlgeschlagen · ' + JSON.stringify(perf));
  process.exit(out.failed ? 1 : 0);
})();
