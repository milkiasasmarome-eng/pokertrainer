/* Erzeugt App-Icons und das Vorschaubild für Messenger (Open Graph) aus SVG/HTML. */
'use strict';
const path = require('path'), fs = require('fs');
const sharp = require('/opt/npm-tools/node_modules/sharp');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const root = path.join(__dirname, '..'), icons = path.join(root, 'assets', 'icons'), images = path.join(root, 'assets', 'images');
(async () => {
  const svg = fs.readFileSync(path.join(icons, 'favicon.svg'));
  for (const [name, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
    await sharp(svg, { density: 600 }).resize(size, size).png().toFile(path.join(icons, name));
  }
  // maskierbares Icon: Motiv mit Sicherheitsrand auf vollflächigem Grün
  const mask = Buffer.from(svg.toString().replace('viewBox="0 0 64 64"', 'viewBox="-12 -12 88 88"').replace('<rect x="2" y="2"', '<rect x="-12" y="-12" width="88" height="88" fill="#11604f"/><rect x="2" y="2"'));
  await sharp(mask, { density: 600 }).resize(512, 512).png().toFile(path.join(icons, 'icon-maskable-512.png'));
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;width:1200px;height:630px;background:#0e1113;font-family:"DejaVu Sans",sans-serif;color:#ebe9e4;overflow:hidden}
  .felt{position:absolute;left:590px;top:80px;width:570px;height:420px;border-radius:999px;background:radial-gradient(ellipse at 50% 35%,#1b7d67,#11604f 55%,#0a4438);box-shadow:0 0 0 18px #3b2d24,0 30px 60px rgba(0,0,0,.5)}
  .cards{position:absolute;left:650px;top:225px;display:flex;gap:10px}
  .c{width:80px;height:100px;border-radius:9px;background:#fbf8f0;color:#16181b;display:grid;place-items:center;font-size:32px;font-weight:800;box-shadow:0 4px 10px rgba(0,0,0,.4)}
  .r{color:#c3332b}
  .t{position:absolute;left:60px;top:140px;width:480px}
  h1{font-size:56px;line-height:1.05;margin:0 0 18px}
  h1 span{color:#cf3f2c}
  p{font-size:27px;line-height:1.35;margin:0;color:#c8cdd2}
  .tip{position:absolute;left:700px;top:375px;background:#fbfaf7;color:#15181b;border-radius:16px;padding:14px 20px;font-size:24px;font-weight:700;box-shadow:0 8px 20px rgba(0,0,0,.4)}
  .tip small{display:block;font-size:17px;font-weight:500;color:#565c63}
  .chip{position:absolute;left:600px;top:95px;width:70px;height:70px;border-radius:50%;background:#cf3f2c;border:6px dashed #fbf8f0}
  .foot{position:absolute;left:70px;bottom:50px;font-size:22px;color:#8b939b}
  </style></head><body><div class="felt"></div><div class="chip"></div>
  <div class="cards"><div class="c">A♠</div><div class="c r">K♥</div><div class="c r">Q♦</div><div class="c">J♣</div><div class="c">10♠</div></div>
  <div class="tip">Coach: Bet ¾ Pot<small>Equity 64 % · benötigt 30 % · Modellschätzung</small></div>
  <div class="t"><h1>Poker<span>Trainer</span> 2.0</h1><p>No-Limit Hold'em trainieren: 100 Computergegner, Echtzeit-Coach mit Equity und EV, Replayer und Lernfortschritt.</p></div>
  <div class="foot">Kostenlos · ohne Konto · läuft offline · nur Spielgeld</div></body></html>`;
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html);
  await page.screenshot({ path: path.join(images, 'og-image.png') });
  await browser.close();
  console.log('ok');
})();
