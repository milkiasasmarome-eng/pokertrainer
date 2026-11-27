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

  await test('Prüfung C12: beschädigte lokale Einträge – Rohsicherung vor dem ersten Überschreiben (Start, einmal je Befund) und vor dem Import', async () => {
    const { c, p } = await fresh();
    await p.goto(BASE + 'index.html#tisch'); await ready(p); for (let i = 0; i < 3; i++) await playOne(p); await p.waitForTimeout(600);
    const dbText = await p.evaluate(() => window.PT.stats.dbExport(window.PTUI.S.db, 'x'));
    const meta = (await p.evaluate(IDB.all, 'meta'))[0], opps = await p.evaluate(IDB.all, 'opps');
    const victim = JSON.parse(JSON.stringify(opps[0])); victim.lastSeen = null; meta.heroRec.extra = 1;
    const heroHands = meta.heroRec.hands;
    await p.close();  // erst schließen: beim Schließen speichert der Trainer (pagehide) und würde die Beschädigung überschreiben
    const hp = await c.newPage(); await hp.goto(BASE + 'manifest.webmanifest');
    await hp.evaluate(IDB.put, ['opps', [victim]]); await hp.evaluate(IDB.put, ['meta', [meta]]); await hp.close();
    const dls = []; c.on('page', pg => pg.on('download', d => dls.push(d)));
    let q = await c.newPage(); await q.goto(BASE + 'index.html#tisch'); await ready(q, 30000); await q.waitForTimeout(800);
    const raw = dls.find(d => /Rohdaten/.test(d.suggestedFilename()));
    ok(!!raw, 'Rohsicherung beim Start: ' + dls.map(d => d.suggestedFilename()).join(', '));
    if (raw) { const f = path.join(OUT, 'c12-roh.json'); await raw.saveAs(f); const t = fs.readFileSync(f, 'utf8'); fs.unlinkSync(f);
      ok(/"extra":1/.test(t) && t.includes('"id":"' + victim.id + '"'), 'Rohsicherung enthält die beschädigten eigenen Werte (' + heroHands + ' Hände) und den beschädigten Gegner'); }
    ok(/Rohsicherung/.test(await q.textContent('#notice')), 'Hinweis nennt die Rohsicherung');
    await q.close();
    const n0 = dls.length; q = await c.newPage(); await q.goto(BASE + 'index.html#tisch'); await ready(q); await q.waitForTimeout(800);
    ok(dls.length === n0 && /bereits/.test(await q.textContent('#notice')), 'zweiter Start: keine erneute Rohsicherung für denselben Befund');
    // Import einer gültigen Datenbank ersetzt den beschädigten Gegner: vorher reguläre Sicherung und Rohsicherung
    const f2 = path.join(OUT, 'c12-db.json'); fs.writeFileSync(f2, dbText);
    await q.evaluate(() => { location.hash = '#gegner'; }); await q.waitForTimeout(300);
    await q.click('[data-g="import"]'); await q.setInputFiles('#fileIn', f2); await q.waitForSelector('#impOk', { timeout: 20000 });
    const n1 = dls.length; await q.click('#impOk');
    await q.waitForFunction(() => document.getElementById('modal').hidden, null, { timeout: 20000 }); fs.unlinkSync(f2);
    const names = dls.slice(n1).map(d => d.suggestedFilename());
    ok(names.some(x => /vor-Import/.test(x)) && names.some(x => /Rohdaten/.test(x)), 'Import: Sicherung und Rohsicherung vorher: ' + names.join(', '));
    await c.close();
  });

  await test('Prüfung C15: ohne Web Locks – neuer Tab gibt das Schreiben ab, wenn der beschäftigte schreibende Tab verspätet antwortet', async () => {
    const noLocks = () => { try { Object.defineProperty(navigator, 'locks', { get() { return undefined; }, configurable: true }); } catch (e) { /* */ } };
    const c = await browser.newContext({ serviceWorkers: 'block' });
    const a = await c.newPage(); await a.addInitScript(noLocks); await a.goto(BASE + 'index.html#tisch'); await ready(a);
    const b = await c.newPage(); await b.addInitScript(noLocks);
    a.evaluate(() => setTimeout(() => { const t = performance.now(); while (performance.now() - t < 1500) { /* belegt */ } }, 0));
    await a.waitForTimeout(50);
    await b.goto(BASE + 'index.html#tisch'); await ready(b); await b.waitForTimeout(2500);
    const w = [await a.evaluate(() => !window.PTUI.S.readonly), await b.evaluate(() => !window.PTUI.S.readonly)];
    ok(w[0] === true && w[1] === false, 'genau ein schreibender Tab (der zuerst geöffnete): ' + JSON.stringify(w));
    ok(/schreibgeschützt/.test(await b.textContent('#notice')) && await b.locator('#bNext').isDisabled(), 'zweiter Tab mit Hinweis, „Nächste Hand“ gesperrt');
    await c.close();
  });

  await test('Prüfung C16: Neu geladener schreibender Tab (Update) übernimmt die Sperre vom wartenden Tab; alter Programmstand startet keinen neuen Worker', async () => {
    const c = await browser.newContext({ serviceWorkers: 'block' });
    const a = await c.newPage(); await a.goto(BASE + 'index.html#tisch'); await ready(a);
    const b = await c.newPage(); await b.goto(BASE + 'index.html#tisch'); await ready(b);
    ok(!(await a.evaluate(() => window.PTUI.S.readonly)) && await b.evaluate(() => window.PTUI.S.readonly), 'vorher: A schreibt, B schreibgeschützt');
    await a.reload(); await ready(a); await a.waitForTimeout(600);
    ok(!(await a.evaluate(() => window.PTUI.S.readonly)), 'A schreibt nach dem Neuladen weiter');
    ok(await b.evaluate(() => window.PTUI.S.readonly && !window.PTUI.S.lockPassive) && !(await b.locator('#notice [data-act="takeover"]').count()), 'B wieder schreibgeschützt und wartend (kein veraltetes „Hier weiterspielen“)');
    await a.close(); await b.waitForSelector('#notice [data-act="takeover"]', { timeout: 8000 });
    ok(true, 'B bietet die Übernahme an, sobald A geschlossen ist');
    // gemischte Programmstände: Nach Aktivierung eines neuen Stands in einem anderen Tab keine neuen Worker im alten Tab
    await b.evaluate(() => { window.__w = 0; const W = window.Worker; window.Worker = function (u) { window.__w++; return new W(u); }; window.PTUI.S.hadController = true; navigator.serviceWorker.dispatchEvent(new Event('controllerchange')); });
    const r = await b.evaluate(() => window.PTUI.offThread('import', { text: '{}' }, 5000).then(x => x && x.ok === false, e => 'Fehler ' + e.message));
    ok(r === true && await b.evaluate(() => window.__w) === 0 && /neue Version aktiviert/.test(await b.textContent('#notice')), 'Importprüfung im Hauptthread, kein Worker aus dem neuen Stand (' + r + ')');
    await c.close();
  });

  // ---------------- Prüfer D ----------------
  async function heroTurn(p) { for (let k = 0; k < 10; k++) { if (await p.locator('#bNext').isEnabled()) await p.click('#bNext'); const st = await waitTurnOrNext(p); if (st.my) return true; } return false; }
  const active = p => p.evaluate(() => { const a = document.activeElement; return !a || a === document.body ? 'BODY' : (a.id || a.getAttribute('data-opp') || a.getAttribute('data-step') || a.getAttribute('data-gtab') || a.className || a.tagName); });

  await test('Prüfung D (t1/t1b): Fokus bleibt beim Neuzeichnen erhalten – Gegnerplatz, Hinweisleiste, eigene Aktion, Replayer, Gegnerliste', async () => {
    const { c, p } = await fresh({ viewport: { width: 1366, height: 900 } });
    await p.goto(BASE + 'index.html?start=sicher#tisch'); await ready(p);
    await p.evaluate(() => window.PTUI.setSetting('speed', 'langsam'));
    // a) Gegnerplatz, während Gegner handeln
    let botTurn = false;
    for (let k = 0; k < 10 && !botTurn; k++) {
      if (await p.locator('#bNext').isEnabled()) await p.click('#bNext');
      for (let i = 0; i < 80; i++) { const s = await p.evaluate(() => { const h = window.PTUI.S.hand; return h && !h.done ? h.toAct : -1; }); if (s > 0) { botTurn = true; break; } if (s === 0) await p.click('#bCall'); if (s === -1) break; await p.waitForTimeout(50); }
    }
    await p.focus('.seat.s3 .plate'); const before = await active(p), samples = [];
    for (let i = 0; i < 10; i++) { await p.waitForTimeout(300); samples.push(await active(p)); }
    ok(botTurn && samples.every(x => x === before), 'Fokus auf Gegnerplatz ' + before + ': ' + samples.join(','));
    // b) Knopf in der Hinweisleiste übersteht render()
    await p.evaluate(() => { const S = window.PTUI.S; S.notes.update = { html: '<span>Test</span><button class="btn" type="button" data-act="dismiss" data-note="update">Jetzt aktualisieren</button>' }; window.PTUI.render(); });
    await p.focus('#notice [data-act="dismiss"]');
    await p.evaluate(() => { for (let i = 0; i < 3; i++) window.PTUI.render(); });
    ok(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-act')) === 'dismiss', 'Fokus auf Hinweis-Knopf nach render()');
    await p.evaluate(() => { window.PTUI.S.notes.update = ''; window.PTUI.render(); });
    // c) eigene Aktion per Tastatur: Fokus bleibt in der Aktionsleiste und kehrt zu Check/Call bzw. „Nächste Hand“ zurück
    await p.evaluate(() => window.PTUI.setSetting('speed', 'sehrschnell'));
    for (let i = 0; i < 40; i++) { const s = await waitTurnOrNext(p); if (s.next) break; await p.click('#bCall'); }
    const trail = [];
    ok(await heroTurn(p), 'Held am Zug');
    for (let i = 0; i < 12; i++) {
      await p.focus('#bCall'); await p.keyboard.press('Enter'); await p.waitForTimeout(60); trail.push(await active(p));
      const s = await waitTurnOrNext(p); await p.waitForTimeout(100); trail.push(await active(p)); if (s.next) break;
    }
    ok(!trail.includes('BODY') && ['bCall', 'bNext'].includes(trail[trail.length - 1]), 'Fokus nach eigener Aktion nie auf <body>: ' + trail.join(' → '));
    // d) Replayer: „Schritt vor“ mit Enter
    await p.evaluate(() => { location.hash = '#analyse'; }); await p.waitForSelector('#hlist .linkbtn');
    await p.click('#hlist .linkbtn >> nth=0'); await p.waitForSelector('.replay');
    await p.focus('[data-step="next"]'); await p.keyboard.press('Enter'); await p.keyboard.press('Enter');
    ok(await active(p) === 'next' && /Schritt 3 von/.test(await p.textContent('.rcontrols [role=status]')), 'Replayer: Fokus bleibt auf „Schritt vor“');
    // e) Gegnerliste: Umschalten Am Tisch/Archiv/Alle
    await p.evaluate(() => { location.hash = '#gegner'; }); await p.waitForSelector('[data-gtab="archiv"]');
    await p.focus('[data-gtab="archiv"]'); await p.keyboard.press('Enter');
    ok(await active(p) === 'archiv' && await p.getAttribute('[data-gtab="archiv"]', 'aria-pressed') === 'true', 'Gegner: Fokus bleibt auf „Archiv“');
    await c.close();
  });

  await test('Prüfung D (t6, t10, t2, t5): Quiz-Fokus und -Ansage, Sprunglink, Kürzel auf Knöpfen, einmalige Zug-Ansage, Statusmeldungen, Handverlauf per Tastatur, noscript', async () => {
    const { c, p } = await fresh({ viewport: { width: 1366, height: 900 } });
    await p.addInitScript(() => { window.__ann = []; document.addEventListener('DOMContentLoaded', () => { const el = document.getElementById('announce'); new MutationObserver(() => { if (el.textContent) window.__ann.push(el.textContent); }).observe(el, { childList: true, characterData: true, subtree: true }); }); });
    await p.goto(BASE + 'index.html?start=sicher#training'); await ready(p); await p.waitForSelector('#quizBox [data-qa]');
    await p.focus('#quizBox [data-qa="1"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => !!document.activeElement.closest('#quizBox') && document.activeElement.hasAttribute('data-qnext')), 'Quiz: Fokus auf „Nächste Frage“');
    ok(await p.evaluate(() => window.__ann.some(t => /^(Richtig|Nicht ganz)/.test(t))), 'Quiz: Ergebnis angesagt');
    await p.keyboard.press('Enter'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => document.activeElement.hasAttribute('data-qa')), 'Quiz: nach „Nächste Frage“ Fokus auf der ersten Antwort');
    // Sprunglink bleibt im aktuellen Bereich
    await p.evaluate(() => { location.hash = '#einstellungen'; }); await p.waitForTimeout(300);
    await p.focus('.skip'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => window.PTUI.S.view === 'einstellungen' && location.hash === '#einstellungen' && document.activeElement.id === 'main'), 'Sprunglink: Fokus im Hauptbereich, Bereich bleibt „Einstellungen“');
    // Kürzel: Buchstabe auf fokussiertem Gegnerplatz löst nichts aus, in der Aktionsleiste schon
    await p.evaluate(() => { location.hash = '#tisch'; window.__ann.length = 0; }); await p.evaluate(() => window.PTUI.setSetting('speed', 'sehrschnell'));
    ok(await heroTurn(p), 'Held am Zug');
    await p.waitForTimeout(1600);
    const turnAnn = await p.evaluate(() => window.__ann.filter(t => /Du bist am Zug/.test(t)).length);
    ok(turnAnn === 1, 'Ansage „Du bist am Zug“ genau einmal (' + turnAnn + '): ' + (await p.evaluate(() => window.__ann.join(' | '))).slice(0, 200));
    await p.focus('.seat.s1 .plate'); await p.keyboard.press('f'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => !window.PTUI.S.hand.p[0].folded && window.PTUI.S.hand.toAct === 0), 'Taste F auf Gegnerplatz: kein Fold');
    await p.focus('#bCall'); await p.keyboard.press('f'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => window.PTUI.S.hand.p[0].folded || window.PTUI.S.hand.done), 'Taste F in der Aktionsleiste: Fold');
    // Statusmeldungen: Info nicht als alert, wichtige Hinweise angesagt, Handverlauf fokussierbar
    ok(await p.getAttribute('#msg', 'role') === 'status' && await p.getAttribute('#log', 'tabindex') === '0', '#msg als Status, Handverlauf per Tastatur scrollbar');
    await p.evaluate(() => { window.__ann.length = 0; window.PTUI.persist([]); });
    await p.evaluate(() => { const s = window.PTUI.Store, o = s.put; s.put = () => Promise.reject(new DOMException('voll', 'QuotaExceededError')); window.PTUI.persist([]); setTimeout(() => { s.put = o; }, 200); });
    await p.waitForTimeout(300);
    ok(await p.evaluate(() => window.__ann.some(t => /Speichern fehlgeschlagen/.test(t))), '„Speichern fehlgeschlagen“ wird angesagt');
    await c.close();
    const c2 = await browser.newContext({ javaScriptEnabled: false }), p2 = await c2.newPage();
    await p2.goto(BASE + 'index.html'); ok(/braucht JavaScript/.test(await p2.textContent('body')), 'ohne JavaScript: Erklärung statt nur „Lade …“');
    await c2.close();
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
