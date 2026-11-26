/* Browser-Tests 2.1: Barrierefreiheit (Abschnitt 14) – axe-core gegen WCAG 2.2 AA (hell/dunkel, alle Bereiche, Dialoge,
   Smartphone), Tastaturbedienung, Fokusreihenfolge, sichtbarer und nicht verdeckter Fokus, Fokusfalle und Fokus-Rückgabe,
   Live-Regionen, Spielkarten, Coach-Texte, prefers-reduced-motion, Zielgrößen, Accessibility-Baum (Playwright ariaSnapshot).
   Wird von tests/e2e.js aufgerufen: require('./e2e/a11y.js')(H) */
'use strict';
const fs = require('fs'), path = require('path');
const AXE_PATH = (() => { for (const p of [path.join(__dirname, '..', 'node_modules', 'axe-core', 'axe.min.js'), '/opt/npm-tools/node_modules/axe-core/axe.min.js']) if (fs.existsSync(p)) return p; return null; })();
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

module.exports = async function (H) {
  const { browser, BASE, OUT, SHOTS, test, ok, note, waitTurnOrNext, playHand } = H;
  const A11Y = path.join(OUT, 'a11y'); fs.mkdirSync(A11Y, { recursive: true });
  const ready = p => p.waitForFunction(() => window.PTUI && window.PTUI.S && window.PTUI.S.ready, null, { timeout: 15000 });
  const AXE = AXE_PATH ? fs.readFileSync(AXE_PATH, 'utf8') : null;
  const axeLog = [];
  async function axe(p, label, opts) {
    if (!AXE) return { violations: [], skipped: true };
    if (!(await p.evaluate(() => !!window.axe))) await p.evaluate(AXE);   // evaluate umgeht die CSP der Seite (nur im Test)
    const r = await p.evaluate(o => window.axe.run(o.ctx || document, { runOnly: { type: 'tag', values: o.tags }, resultTypes: ['violations', 'incomplete'] }), { tags: (opts && opts.tags) || WCAG.concat(['best-practice']), ctx: opts && opts.ctx });
    const wcag = r.violations.filter(v => v.tags.some(t => WCAG.includes(t)));
    const bp = r.violations.filter(v => !v.tags.some(t => WCAG.includes(t)));
    axeLog.push({ label, wcag: wcag.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, targets: v.nodes.slice(0, 4).map(x => x.target.join(' ')), summary: v.nodes[0] && v.nodes[0].failureSummary })),
      bestPractice: bp.map(v => ({ id: v.id, n: v.nodes.length })), incomplete: r.incomplete.map(v => ({ id: v.id, n: v.nodes.length })) });
    ok(wcag.length === 0, label + ': ' + wcag.map(v => v.id + ' (' + v.nodes.length + '× ' + v.nodes.slice(0, 2).map(x => x.target.join(' ')).join(', ') + ')').join('; '));
    if (bp.length) note(label + ' – Best Practice: ' + bp.map(v => v.id).join(', '));
    return r;
  }
  async function heroTurn(p) {
    for (let k = 0; k < 8; k++) {
      if (await p.locator('#bNext').isEnabled()) await p.click('#bNext');
      const st = await waitTurnOrNext(p);
      if (st.my) { await p.waitForFunction(() => /badge c-|class="grade /.test(document.getElementById('tipBox').innerHTML) || document.getElementById('tipBox').textContent.length > 40, null, { timeout: 8000 }).catch(() => {}); return true; }
    }
    return false;
  }

  await test('Barrierefreiheit: axe-core (WCAG 2.2 AA) – Tisch, Coach, alle Bereiche, Dialoge, Replayer, hell und dunkel', async () => {
    ok(!!AXE, 'axe-core vorhanden (npm --prefix tests install)');
    for (const scheme of ['light', 'dark']) {
      const c = await browser.newContext({ viewport: { width: 1366, height: 900 }, colorScheme: scheme, serviceWorkers: 'block' }), p = await c.newPage(); H.watch(p, 'axe-' + scheme);
      await p.goto(BASE + 'index.html#tisch'); await ready(p);
      await p.evaluate(() => { window.PTUI.setSetting('speed', 'sehrschnell'); window.PTUI.setSetting('advanced', true); });
      for (let i = 0; i < 3; i++) await playHand(p);
      ok(await heroTurn(p), 'Held am Zug');
      await axe(p, scheme + ' Tisch mit Tipp');
      await p.click('#modes button[data-mode="nachher"]'); await p.click('#bCall').catch(() => {}); await p.waitForTimeout(800);
      await axe(p, scheme + ' Tisch, Modus nachher');
      await p.click('#modes button[data-mode="vorher"]');
      for (let i = 0; i < 40; i++) { const s = await waitTurnOrNext(p); if (s.next) break; await p.click('#bCall'); }
      await p.waitForTimeout(600);
      await p.click('.seat.s2 .plate'); await p.waitForSelector('#modal:not([hidden])');
      await axe(p, scheme + ' Gegnerdialog'); await p.keyboard.press('Escape');
      for (const v of ['training', 'analyse', 'ranges', 'gegner', 'fortschritt', 'einstellungen', 'hilfe']) {
        await p.evaluate(x => { location.hash = '#' + x; }, v); await p.waitForTimeout(600);
        if (v === 'analyse') { await p.click('#hlist tr.click >> nth=0'); await p.waitForSelector('.replay'); await p.click('[data-step="next"]'); }
        if (v === 'ranges') await p.click('.mcell[data-ci="120"]');
        await axe(p, scheme + ' ' + v);
      }
      await p.evaluate(() => window.PTRecovery.fail('timeout', 'Test'));
      await axe(p, scheme + ' Fehleranzeige (Startüberwachung)');
      await p.screenshot({ path: path.join(SHOTS, 'fehleranzeige-' + scheme + '.png') });
      await c.close();
    }
    // Smartphone: Zielgrößen (2.5.8) und Umbruch
    const c = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' }), p = await c.newPage(); H.watch(p, 'axe-phone');
    await p.goto(BASE + 'index.html?start=sicher#tisch'); await ready(p);
    await p.evaluate(() => window.PTUI.setSetting('speed', 'sehrschnell'));
    ok(await heroTurn(p), 'Held am Zug (Smartphone)');
    await axe(p, 'Smartphone Tisch mit Hinweis (abgesicherter Start)');
    await p.evaluate(() => { location.hash = '#ranges'; }); await p.waitForTimeout(500);
    await axe(p, 'Smartphone Range-Matrix');
    await c.close();
    fs.writeFileSync(path.join(A11Y, 'axe.json'), JSON.stringify({ axe: AXE_PATH ? require(path.join(path.dirname(AXE_PATH), 'package.json')).version : null, tags: WCAG, runs: axeLog }, null, 1));
  });

  await test('Barrierefreiheit: vollständige Tastaturbedienung, Fokusreihenfolge, sichtbarer und nicht verdeckter Fokus', async () => {
    for (const scheme of ['light', 'dark']) {
      const c = await browser.newContext({ viewport: { width: 1366, height: 900 }, colorScheme: scheme, serviceWorkers: 'block' }), p = await c.newPage(); H.watch(p, 'tastatur-' + scheme);
      await p.goto(BASE + 'index.html#tisch'); await ready(p);
      await p.evaluate(() => window.PTUI.setSetting('speed', 'sehrschnell'));
      if (scheme === 'light') {
        // Hand nur mit Tastatur: N, C/F, R + Betrag + Enter
        await p.evaluate(() => document.activeElement && document.activeElement.blur());
        let raised = false, hands = 0;
        for (let h = 0; h < 6; h++) {
          await p.keyboard.press('n'); hands++;
          for (let i = 0; i < 40; i++) {
            const st = await waitTurnOrNext(p); if (st.next) break;
            if (!raised && await p.locator('#bRaise').isEnabled()) {
              await p.keyboard.press('r');
              ok(await p.evaluate(() => document.activeElement.id) === 'amt', 'R setzt den Fokus in das Betragsfeld');
              const min = await p.evaluate(() => window.PTUI.S.hand.legal(0).minTo);
              await p.keyboard.type(String(min / 100).replace('.', ',')); await p.keyboard.press('Enter'); raised = true;
              await p.evaluate(() => document.activeElement.blur());
            } else await p.keyboard.press('c');
          }
        }
        ok(raised, 'Raise per Tastatur'); note(hands + ' Hände nur mit Tastatur gespielt');
        // 2.1.4: Kürzel aus einem Zeichen abschaltbar
        for (let i = 0; i < 40; i++) { const st = await waitTurnOrNext(p); if (st.next) break; await p.keyboard.press('c'); }
        await p.waitForFunction(() => !window.PTUI.S.reveal, null, { timeout: 10000 });
        await p.evaluate(() => { window.PTUI.setSetting('shortcuts', false); document.activeElement && document.activeElement.blur(); });
        const n0 = await p.evaluate(() => window.PTUI.S.table.handNo);
        await p.keyboard.press('n'); await p.waitForTimeout(500);
        ok(await p.evaluate(() => !window.PTUI.S.hand || window.PTUI.S.hand.done) && await p.locator('#bNext').isEnabled(), 'Kürzel abgeschaltet: N startet keine Hand');
        await p.evaluate(() => window.PTUI.setSetting('shortcuts', true));
        await p.keyboard.press('n'); await p.waitForTimeout(300);
        ok(await p.evaluate(n => window.PTUI.S.hand && window.PTUI.S.hand.no === n + 1, n0), 'Kürzel wieder an: N startet die Hand');
        for (let i = 0; i < 40; i++) { const st = await waitTurnOrNext(p); if (st.next) break; await p.keyboard.press('c'); }
      }
      await p.waitForTimeout(500);
      // Fokusreihenfolge und Sichtbarkeit beim Durchtabben
      await p.reload(); await ready(p); await p.waitForTimeout(300);   // Fokus-Startpunkt: Seitenanfang
      const seq = [], bad = [];
      await p.keyboard.press('Tab');
      for (let i = 0; i < 70; i++) {
        const r = await p.evaluate(() => {
          const el = document.activeElement; if (!el || el === document.body) return null;
          const cs = getComputedStyle(el), rc = el.getBoundingClientRect();
          const zone = el.closest('header') ? 'kopf' : el.closest('nav') ? 'navigation' : el.closest('#notice') ? 'hinweis' : el.closest('#seats') ? 'tisch' : el.closest('.actions') ? 'aktionen' : el.closest('.coach') ? 'coach' : el.closest('.log') ? 'verlauf' : el.closest('footer') ? 'fuss' : el.classList.contains('skip') ? 'sprunglink' : 'sonst';
          const visible = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || (cs.boxShadow && cs.boxShadow !== 'none');
          const pts = [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]].map(([fx, fy]) => document.elementFromPoint(rc.left + rc.width * fx, rc.top + rc.height * fy));
          const notHidden = rc.width > 0 && rc.height > 0 && rc.bottom > 0 && rc.top < innerHeight && pts.some(x => x && (x === el || el.contains(x) || x.contains(el)));
          return { id: (el.id || el.getAttribute('data-opp') || el.getAttribute('data-mode') || el.className || el.tagName) + (el.tagName === 'A' ? ' ' + el.getAttribute('href') : ''), zone, visible, notHidden, w: Math.round(rc.width), h: Math.round(rc.height), top: Math.round(rc.top), ih: innerHeight, hit: (pts[0] && (pts[0].id || pts[0].className || pts[0].tagName)) };
        });
        if (!r) break;
        seq.push(r.zone);
        if (!r.visible || !r.notHidden) bad.push(r.id + (r.visible ? '' : ' (kein sichtbarer Fokus)') + (r.notHidden ? '' : ' (verdeckt: oben ' + r.top + '/' + r.ih + ', getroffen ' + r.hit + ')'));
        await p.keyboard.press('Tab');
      }
      ok(bad.length === 0, scheme + ': Fokus nicht sichtbar/verdeckt: ' + bad.slice(0, 6).join(', '));
      const order = ['sprunglink', 'kopf', 'navigation', 'tisch', 'aktionen', 'coach', 'verlauf', 'fuss'];
      const firsts = order.map(z => seq.indexOf(z)).filter(i => i >= 0);
      ok(firsts.every((x, i) => i === 0 || x > firsts[i - 1]), scheme + ': Fokusreihenfolge folgt dem Aufbau: ' + [...new Set(seq)].join(' → '));
      ok(seq[0] === 'sprunglink', scheme + ': erster Tab-Stopp ist der Sprunglink');
      await c.close();
    }
  });

  await test('Barrierefreiheit: Dialog mit Fokusfalle, Esc, Hintergrund gesperrt (inert), Fokus-Rückgabe; Range-Matrix mit Pfeiltasten', async () => {
    const c = await browser.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' }), p = await c.newPage(); H.watch(p, 'dialog');
    await p.goto(BASE + 'index.html#tisch'); await ready(p);
    await p.focus('.seat.s3 .plate'); const opp = await p.evaluate(() => document.activeElement.getAttribute('data-opp'));
    await p.keyboard.press('Enter'); await p.waitForSelector('#modal:not([hidden])');
    ok(await p.evaluate(() => document.activeElement.id) === 'modalX', 'Fokus auf „Schließen“');
    ok(await p.evaluate(() => document.getElementById('app').inert === true), 'Hintergrund inert');
    let inside = true;
    for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); inside = inside && await p.evaluate(() => !!document.activeElement.closest('#modal')); }
    for (let i = 0; i < 5; i++) { await p.keyboard.press('Shift+Tab'); inside = inside && await p.evaluate(() => !!document.activeElement.closest('#modal')); }
    ok(inside, 'Tab und Umschalt+Tab bleiben im Dialog');
    await p.keyboard.press('Escape');
    ok(await p.locator('#modal').isHidden() && await p.evaluate(() => document.activeElement.getAttribute('data-opp')) === opp, 'Esc schließt, Fokus zurück auf den Gegnerplatz');
    ok(await p.evaluate(() => !document.getElementById('app').inert), 'Hintergrund wieder bedienbar');
    // Glossarbegriff per Tastatur
    await p.evaluate(() => { location.hash = '#gegner'; }); await p.waitForTimeout(400);
    await p.focus('#glist .linkbtn'); await p.keyboard.press('Enter'); await p.waitForSelector('#modal:not([hidden])');
    await p.focus('#modalBody button.term'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    ok(/Statistik|Prozent|Anteil|Hand|Händen/.test(await p.textContent('#modalBody')), 'Erklärung eines Werts im Dialog');
    await p.keyboard.press('Escape');
    // Range-Matrix: ein Tab-Stopp, Pfeiltasten
    await p.evaluate(() => { location.hash = '#ranges'; }); await p.waitForTimeout(400);
    ok(await p.locator('#mx [tabindex="0"]').count() === 1, 'Matrix: ein Tab-Stopp statt 169');
    await p.focus('#mx [tabindex="0"]');
    const start = await p.evaluate(() => document.activeElement.getAttribute('aria-label'));
    await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown');
    const moved = await p.evaluate(() => document.activeElement.getAttribute('aria-label'));
    ok(start !== moved && /^[2-9TJQKA]{2}[so]?: Raise/.test(moved), 'Pfeiltasten bewegen den Fokus: ' + start + ' → ' + moved);
    await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    ok(new RegExp(moved.split(':')[0]).test(await p.textContent('#mxinfo')), 'Enter zeigt Details');
    await c.close();
  });

  await test('Barrierefreiheit: Live-Regionen sparsam, Ansagen beim eigenen Zug, Karten, verständliche Coach-Texte, reduzierte Bewegung, Zielgrößen', async () => {
    const c = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' }), p = await c.newPage(); H.watch(p, 'live');
    await p.goto(BASE + 'index.html#tisch'); await ready(p);
    await p.evaluate(() => window.PTUI.setSetting('speed', 'sehrschnell'));
    const live = await p.evaluate(() => [...document.querySelectorAll('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"]')].map(e => e.id || e.className));
    ok(live.length <= 4 && ['tipBox', 'status', 'pots', 'result'].every(id => !live.includes(id)), 'Live-Regionen: ' + live.join(', '));
    ok(await heroTurn(p), 'Held am Zug');
    await p.waitForFunction(() => /Coach empfiehlt/.test(document.getElementById('announce').textContent), null, { timeout: 5000 }).catch(() => {});
    const ann = await p.textContent('#announce');
    ok(/Du bist am Zug/.test(ann) && /(Check möglich|Call )/.test(ann), 'Ansage beim eigenen Zug: ' + ann.slice(0, 160));
    ok(/Coach empfiehlt/.test(ann), 'Empfehlung wird angesagt');
    const cards = await p.evaluate(() => [...document.querySelectorAll('.card')].map(c2 => c2.getAttribute('role') + ':' + c2.getAttribute('aria-label')));
    ok(cards.length >= 2 && cards.every(x => /^img:((Zwei|Drei|Vier|Fünf|Sechs|Sieben|Acht|Neun|Zehn|Bube|Dame|König|Ass) (Kreuz|Karo|Herz|Pik)|verdeckte Karte)$/.test(x)), 'Karten mit Rang und Farbe: ' + cards.slice(0, 4).join(', '));
    // Verständlichkeit der Empfehlung: Aktion, Begründung als Satz, Zahlen, Kennzeichnung
    const tip = await p.evaluate(() => ({ action: document.querySelector('#tipBox .tipaction') && document.querySelector('#tipBox .tipaction').textContent, reason: (document.querySelector('#tipBox .tipreason') || {}).textContent || '', faust: document.getElementById('faust').textContent, facts: [...document.querySelectorAll('#tipBox .fact')].map(f => f.textContent) }));
    ok(/^Empfehlung: /.test(tip.action || ''), 'Empfehlung beginnt mit „Empfehlung:“ für Screenreader');
    ok(tip.reason.length >= 20 && tip.reason.length <= 700 && /[.!?)]$/.test(tip.reason.trim()), 'Begründung als vollständiger Satz (' + tip.reason.length + ' Zeichen)');
    ok(tip.facts.some(f => /^Equity/.test(f)) && tip.faust === 'Faustregel, kein Solver-Ergebnis', 'Kennzahlen beschriftet, Hinweis „Faustregel, kein Solver-Ergebnis“');
    // reduzierte Bewegung
    for (let i = 0; i < 40; i++) { const s = await waitTurnOrNext(p); if (s.next) break; await p.click('#bCall'); }
    await p.waitForTimeout(400);
    const anim = await p.evaluate(() => ({ next: getComputedStyle(document.getElementById('bNext')).animationName, card: [...document.querySelectorAll('.card')].map(x => getComputedStyle(x).animationName).filter(n => n !== 'none').length, smooth: getComputedStyle(document.documentElement).scrollBehavior }));
    ok(anim.next === 'none' && anim.card === 0 && anim.smooth === 'auto', 'prefers-reduced-motion: keine Animationen, kein weiches Scrollen ' + JSON.stringify(anim));
    // Zielgrößen 2.5.8 (24 × 24 CSS-Pixel), ausgenommen Begriffe im Fließtext
    const small = await p.evaluate(() => [...document.querySelectorAll('button, a[href], input, select, summary')].filter(e => e.offsetParent && !e.closest('p, li, dd, .tipreason') && !e.classList.contains('skip')).map(e => { const r = e.getBoundingClientRect(); return { n: e.id || e.className || e.tagName, w: r.width, h: r.height }; }).filter(x => x.w < 24 || x.h < 24));
    ok(small.length === 0, 'Bedienelemente kleiner als 24 px: ' + small.slice(0, 6).map(x => x.n + ' ' + Math.round(x.w) + '×' + Math.round(x.h)).join(', '));
    await c.close();
  });

  await test('Barrierefreiheit: Accessibility-Baum der zentralen Abläufe (Playwright ariaSnapshot, Ersatz für Screenreader-Test)', async () => {
    const c = await browser.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' }), p = await c.newPage(); H.watch(p, 'ariasnapshot');
    await p.goto(BASE + 'index.html#tisch'); await ready(p);
    await p.evaluate(() => window.PTUI.setSetting('speed', 'sehrschnell'));
    await playHand(p); ok(await heroTurn(p), 'Held am Zug');
    const snaps = {};
    snaps.tisch = await p.locator('body').ariaSnapshot();
    for (let i = 0; i < 40; i++) { const s = await waitTurnOrNext(p); if (s.next) break; await p.click('#bCall'); }
    await p.click('.seat.s1 .plate'); await p.waitForSelector('#modal:not([hidden])');
    snaps.gegnerdialog = await p.locator('#modal').ariaSnapshot(); await p.keyboard.press('Escape');
    await p.evaluate(() => { location.hash = '#analyse'; }); await p.waitForTimeout(600);
    await p.click('#hlist tr.click >> nth=0'); await p.waitForSelector('.replay');
    snaps.handhistorie = await p.locator('#view-analyse').ariaSnapshot();
    await p.evaluate(() => window.PTRecovery.fail('boot', 'Test', { canContinue: true }));
    snaps.fehleranzeige = await p.locator('#recovery').ariaSnapshot();
    Object.keys(snaps).forEach(k => fs.writeFileSync(path.join(A11Y, 'aria-' + k + '.yml'), snaps[k] + '\n'));
    const t = snaps.tisch;
    ok(/- banner/.test(t) && /- navigation "Bereiche"/.test(t) && /- main/.test(t) && /- contentinfo/.test(t), 'Landmarks: banner, navigation, main, contentinfo');
    ok(/heading "Coach"/.test(t) && /group "Tipp-Modus"/.test(t) && /button "vorher" \[pressed\]/.test(t), 'Coach mit Überschrift, Modusgruppe, gedrückter Zustand');
    ok(/button "Fold"/.test(t) && /button "(Check|Call[^"]*)"/.test(t), 'Aktionsknöpfe mit klaren Namen (ohne Tastenkürzel-Rauschen)');
    ok(/img "(Zwei|Drei|Vier|Fünf|Sechs|Sieben|Acht|Neun|Zehn|Bube|Dame|König|Ass) (Kreuz|Karo|Herz|Pik)"/.test(t), 'eigene Karten als Bild mit Rang und Farbe');
    ok(/group "Dein Platz"/.test(t) && /button "[^"]+alle Werte anzeigen"/.test(t), 'Plätze: eigener Platz als Gruppe, Gegner als Schaltfläche mit Werten');
    ok(/Empfehlung: /.test(t) && /Faustregel, kein Solver-Ergebnis/.test(t), 'Coach-Empfehlung im Baum');
    ok(/- dialog "/.test(snaps.gegnerdialog) && /button "Schließen"/.test(snaps.gegnerdialog) && /table/.test(snaps.gegnerdialog), 'Gegnerdialog: benannter Dialog mit Tabelle');
    ok(/heading "Replayer/.test(snaps.handhistorie) && /button "Schritt vor"/.test(snaps.handhistorie), 'Replayer mit beschrifteten Schritten');
    ok(/alertdialog "Gespeicherte Daten konnten nicht geladen werden"/.test(snaps.fehleranzeige) && /button "Neu laden"/.test(snaps.fehleranzeige), 'Fehleranzeige als benannter Warn-Dialog');
    await c.close();
  });
};
