/* Live-Smoke-Test der veröffentlichten Website nach dem Deployment.
   Aufruf: node tests/smoke-live.js [URL] [--versuche=N] [--warten=Sekunden] [--browser]
   Standard-URL: https://milkiasasmarome-eng.github.io/pokertrainer/
   Vergleicht Version im HTML (?v=, Fußzeile), sw.js (gesamter Inhalt inkl. Cache-Prüfsumme), Offline-Datei und Manifest
   mit dem lokalen Stand. GitHub Pages braucht nach dem Push einige Minuten; daher Wiederholung mit Wartezeit.
   Mit --browser zusätzlich: Seite in Chromium laden, Start abwarten, PT.VERSION prüfen (Playwright).
   Ergebnis: tests/results/smoke-live.json */
'use strict';
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), opt = k => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : null; };
const BASE = (args.find(a => !a.startsWith('--')) || 'https://milkiasasmarome-eng.github.io/pokertrainer/').replace(/\/?$/, '/');
const TRIES = +(opt('versuche') || 20), WAIT = +(opt('warten') || 30) * 1000, BROWSER = args.includes('--browser');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const V = read('assets/js/engine/core.js').match(/PT\.VERSION = '([^']+)'/)[1], MM = V.split('.').slice(0, 2).join('.');
const localSw = read('sw.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(u) {
  const res = await fetch(u + (u.includes('?') ? '&' : '?') + 'smoke=' + Date.now(), { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
  return { status: res.status, text: res.status === 200 ? await res.text() : '' };
}
async function once() {
  const checks = [], ok = (name, c, detail) => checks.push({ name, ok: !!c, detail: detail || '' });
  const idx = await get(BASE + 'index.html');
  ok('index.html erreichbar', idx.status === 200, 'HTTP ' + idx.status);
  const vs = [...new Set([...idx.text.matchAll(/\?v=([^"']+)["']/g)].map(m => m[1]))], foot = (idx.text.match(/<span id="verText">([^<]+)</) || [])[1];
  ok('Version im HTML = ' + V, vs.length === 1 && vs[0] === V && foot === V, '?v=' + vs.join(',') + ', Fußzeile ' + foot);
  const sw = await get(BASE + 'sw.js');
  ok('sw.js identisch mit lokalem Build', sw.status === 200 && sw.text === localSw, 'HTTP ' + sw.status + ', live ' + ((sw.text.match(/CACHE = '[^']*' \+ VERSION \+ '([^']+)'/) || [])[1] || '–') + ', lokal ' + ((localSw.match(/CACHE = '[^']*' \+ VERSION \+ '([^']+)'/) || [])[1]));
  const dist = await get(BASE + 'dist/PokerTrainer_' + MM + '.html');
  ok('Offline-Datei mit Version ' + V, dist.status === 200 && dist.text.includes("PT.VERSION = '" + V + "'"), 'HTTP ' + dist.status);
  const man = await get(BASE + 'manifest.webmanifest');
  ok('Manifest erreichbar', man.status === 200 && /"start_url"/.test(man.text), 'HTTP ' + man.status);
  const core = await get(BASE + 'assets/js/engine/core.js?v=' + V);
  ok('core.js mit Version ' + V, core.status === 200 && core.text.includes("PT.VERSION = '" + V + "'"), 'HTTP ' + core.status);
  return checks;
}
async function browserCheck() {
  const { chromium } = require(process.env.PLAYWRIGHT || (fs.existsSync(path.join(__dirname, 'node_modules', 'playwright')) ? path.join(__dirname, 'node_modules', 'playwright') : '/opt/npm-tools/node_modules/playwright'));
  const exe = process.env.CHROME !== undefined ? (process.env.CHROME || undefined) : (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const p = await (await b.newContext()).newPage(), errors = [], foreign = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('request', r => { const u = r.url(); if (!u.startsWith(BASE) && !/^(data|blob):/.test(u)) foreign.push(u); });
  await p.goto(BASE + 'index.html?smoke=' + Date.now() + '#tisch');
  await p.waitForFunction(() => window.PTUI && window.PTUI.S && window.PTUI.S.ready, null, { timeout: 30000 });
  const v = await p.evaluate(() => window.PT.VERSION);
  await p.click('#bNext'); await p.waitForTimeout(1500);
  await b.close();
  return [{ name: 'Browser: App startet, PT.VERSION = ' + V, ok: v === V, detail: v }, { name: 'Browser: keine Skriptfehler', ok: !errors.length, detail: errors.join(' | ') },
    { name: 'Browser: keine Verbindungen zu fremden Adressen', ok: !foreign.length, detail: foreign.slice(0, 5).join(' ') }];
}
(async () => {
  let checks = [], n = 0;
  for (n = 1; n <= TRIES; n++) {
    try { checks = await once(); } catch (e) { checks = [{ name: 'Abruf', ok: false, detail: String(e && e.message || e) }]; }
    if (checks.every(c => c.ok)) break;
    console.log('Versuch ' + n + '/' + TRIES + ': noch nicht aktuell (' + checks.filter(c => !c.ok).map(c => c.name + ': ' + c.detail).join('; ') + ')');
    if (n < TRIES) await sleep(WAIT);
  }
  if (BROWSER && checks.every(c => c.ok)) { try { checks = checks.concat(await browserCheck()); } catch (e) { checks.push({ name: 'Browser', ok: false, detail: String(e && e.message || e).split('\n')[0] }); } }
  checks.forEach(c => console.log((c.ok ? 'OK     ' : 'FEHLER ') + c.name + (c.ok ? '' : ' – ' + c.detail)));
  const out = { base: BASE, version: V, date: new Date().toISOString(), attempts: Math.min(n, TRIES), ok: checks.every(c => c.ok), checks };
  fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'results', 'smoke-live.json'), JSON.stringify(out, null, 1));
  console.log(out.ok ? 'Live-Seite entspricht Version ' + V : 'Live-Seite entspricht NICHT dem lokalen Stand ' + V);
  process.exit(out.ok ? 0 : 1);
})();
