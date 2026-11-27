/* Abschnitt 11: Gegnergedächtnis (Kurzzeit, Veränderungserkennung, Kartenkenntnis), Datenformat 3 mit Migration,
   Rückkehrer, Fairness, Anpassung der Gegner-KI an synthetische Heldenstrategien, Gegner mit Stilwechsel. */
'use strict';
module.exports = function (T) {
  const { PT, test, ok, eq, QUICK } = T;
  const S = PT.stats, M = S.MEMORY, L = require('../gedaechtnis-lib.js');
  const clone = o => JSON.parse(JSON.stringify(o));
  /** Synthetischer Datensatz: je Hand eine VPIP-Gelegenheit mit Trefferwahrscheinlichkeit p(h) */
  function feed(r, n, p, rng, keys) {
    for (let i = 0; i < n; i++) {
      const I = { stats: S.emptyStats(), agg: S.emptyAgg(), pos: 'BTN' };
      (keys || ['vpip']).forEach(k => { I.stats[k] = [rng() < (typeof p === 'function' ? p(i) : p) ? 1 : 0, 1]; });
      S.applyToRecord(r, I, r.hands + 1);
    }
    return r;
  }

  test('Gegnergedächtnis: Abklingen mit Halbwertszeit in Händen, gewichtete Zähler und Testvarianz exakt', () => {
    const lam = M.LAMBDA, H = M.HALF_LIFE;
    ok(Math.abs(Math.pow(lam, H) - 0.5) < 1e-12, 'λ^H = 0,5');
    // Eine Beobachtung, danach H Hände ohne Gelegenheit: Gewicht 0,5
    const r0 = S.newRecord('t0', 'Test'); r0.stats.vpip = [0, 0];
    const I1 = { stats: S.emptyStats(), agg: S.emptyAgg(), pos: 'BTN' }; I1.stats.vpip = [1, 1]; S.applyToRecord(r0, I1, 1);
    const I0 = { stats: S.emptyStats(), agg: S.emptyAgg(), pos: 'BTN' }; for (let i = 0; i < H; i++) S.applyToRecord(r0, I0, 2 + i);
    ok(Math.abs(r0.recent.stats.vpip[1] - 0.5) < 2e-3 && Math.abs(r0.recent.stats.vpip[0] - 0.5) < 2e-3, 'nach ' + H + ' Händen Gewicht 0,5: ' + r0.recent.stats.vpip[1]);
    // Geschlossene Summen gegen explizite Gewichte
    const rng = PT.makeRng('decay'), r = S.newRecord('t1', 'Test'), xs = [];
    for (let i = 0; i < 400; i++) { const x = rng() < (i < 250 ? 0.2 : 0.45) ? 1 : 0; xs.push(x); const I = { stats: S.emptyStats(), agg: S.emptyAgg(), pos: 'BTN' }; I.stats.vpip = [x, 1]; S.applyToRecord(r, I, i + 1); }
    let a = 0, s1 = 0, s2 = 0; const w = xs.map((_, i) => Math.pow(lam, xs.length - 1 - i));
    w.forEach((wi, i) => { a += wi * xs[i]; s1 += wi; s2 += wi * wi; });
    const rc = r.recent.stats.vpip;
    ok(Math.abs(rc[0] - a) < 5e-3 && Math.abs(rc[1] - s1) < 5e-3 && Math.abs(rc[2] - s2) < 5e-3, 'Σw·x, Σw, Σw² (' + rc.join('/') + ' vs ' + [a, s1, s2].map(x => x.toFixed(4)).join('/') + ')');
    ok(Math.abs(r.recent.h - s1) < 5e-3, 'Kurzzeit-Handgewicht = Σw bei einer Gelegenheit je Hand');
    // z-Wert gegen Berechnung mit expliziten Gewichten
    const n = xs.reduce((p, x) => p + x, 0), d = xs.length, w2 = d - s1, pr = a / s1, po = (n - a) / w2, pb = (n + 0.5) / (d + 1), neff = s1 * s1 / s2;
    let V = 0; w.forEach(wi => { V += Math.pow(wi / s1 - (1 - wi) / w2, 2); });
    const zbf = Math.sign(pr - po) * Math.max(0, Math.abs(pr - po) - M.CHANGE.cc / neff) / Math.sqrt(pb * (1 - pb) * V);
    const t = S.changeTest(r.stats.vpip, rc);
    ok(t && Math.abs(t.z - zbf) < 0.02, 'z = ' + (t && t.z.toFixed(3)) + ' (explizit ' + zbf.toFixed(3) + ')');
    // Nullverteilung: stationärer Strom, z ungefähr standardnormal
    const zs = [], rng2 = PT.makeRng('null-z');
    for (let o = 0; o < (QUICK ? 30 : 120); o++) { const q = S.newRecord('n' + o, 'Null'); for (let i = 0; i < 600; i++) { feed(q, 1, 0.3, rng2); if (i >= 200 && i % 40 === 0) { const tt = S.changeTest(q.stats.vpip, q.recent.stats.vpip); if (tt) zs.push(tt.z); } } }
    const m = zs.reduce((p, x) => p + x, 0) / zs.length, sd = Math.sqrt(zs.reduce((p, x) => p + (x - m) * (x - m), 0) / (zs.length - 1));
    ok(zs.length > 100 && Math.abs(m) < 0.25 && sd > 0.75 && sd < 1.2, 'Nullverteilung: Mittel ' + m.toFixed(3) + ', Streuung ' + sd.toFixed(3) + ' (n = ' + zs.length + ')');
  });

  test('Gegnergedächtnis: Erkennung veränderter Spielweise (Mindestzahl, Richtung, Hysterese, beste Schätzung, Coach-Schnittstelle)', () => {
    const rng = PT.makeRng('chg');
    const few = feed(S.newRecord('f1', 'Wenig'), 30, i => i < 15 ? 0 : 1, rng);
    eq(S.changeTest(few.stats.vpip, few.recent.stats.vpip), null, 'zu wenige ältere Gelegenheiten: kein Test');
    eq(Object.keys(few.chg).length, 0, 'kein Alarm bei 30 Händen');
    const r = feed(S.newRecord('c1', 'Wechsler'), 400, 0.2, rng);
    eq(Object.keys(r.chg).length, 0, 'stationär 400 Hände: kein Alarm');
    let at = null; for (let i = 0; i < 250 && at == null; i++) { feed(r, 1, 0.5, rng); if (r.chg.vpip) at = i + 1; }
    ok(at != null && at <= 150, 'Anstieg 20 % → 50 % erkannt nach ' + at + ' Händen');
    ok(r.chg.vpip && r.chg.vpip[1] === 1 && r.chg.vpip[0] > 400, 'Richtung ↑ und Beginn nach dem Wechsel');
    const p = S.profile(r);
    ok(p.change.detected && p.change.keys[0].key === 'vpip' && p.estSrc.vpip === 'kurzzeit', 'Profil meldet Veränderung, Schätzung aus Kurzzeit');
    ok(p.est.vpip > PT.ranges.smooth(r.stats).vpip + 0.05, 'beste Schätzung näher am neuen Verhalten (' + p.est.vpip.toFixed(3) + ' gegen Langzeit ' + PT.ranges.smooth(r.stats).vpip.toFixed(3) + ')');
    const eff = S.effectiveStats(r);
    ok(eff.changed.indexOf('vpip') >= 0 && eff.stats.vpip[1] === r.recent.stats.vpip[1] && eff.stats.pfr[1] === r.stats.pfr[1], 'effectiveStats: Kurzzeit nur für veränderte Werte');
    ok(Math.abs(PT.ranges.smooth(eff.stats).vpip - p.est.vpip) < 1e-12, 'effectiveStats direkt mit ranges.smooth nutzbar');
    // Rückkehr zum alten Verhalten: Alarm erlischt (Hysterese bis |z| < zOff)
    let off = null; for (let i = 0; i < 700 && off == null; i++) { feed(r, 1, 0.2, rng); if (!r.chg.vpip) off = i + 1; }
    ok(off != null, 'Alarm endet nach Rückkehr zum alten Verhalten (' + off + ' Hände)');
    // Abnahme
    const r2 = feed(S.newRecord('c2', 'Abnahme'), 400, 0.45, rng); let at2 = null;
    for (let i = 0; i < 250 && at2 == null; i++) { feed(r2, 1, 0.12, rng); if (r2.chg.vpip) at2 = i + 1; }
    ok(at2 != null && r2.chg.vpip[1] === -1, 'Abnahme 45 % → 12 % erkannt (Richtung ↓) nach ' + at2 + ' Händen');
    // Kartenkenntnis und Kennzeichnung
    const nr = S.profile(S.newRecord('x', 'X'));
    ok(nr.quality.vpip === 'unbekannt' && nr.recent.stats.vpip.quality === 'unbekannt' && nr.cards.observed === 0 && nr.cards.unknown === 0, 'ohne Daten: unbekannt');
    ok(p.quality.vpip === 'geschätzt' && Array.isArray(p.recent.stats.vpip.ci), 'Werte mit Gelegenheiten: geschätzt mit Intervall');
  });

  test('Datenformat 3: Export → Import identisch, 5.000 Gegner, strenge Prüfung, Migration aus Format 2 und 1', () => {
    const sim = require('../sim-lib.js'), r = sim.run({ hands: QUICK ? 1200 : 4000, seed: 31 });
    const syn = feed(S.newRecord('zz9', 'Wechsler'), 400, 0.2, PT.makeRng('fmt')); feed(syn, 200, 0.55, PT.makeRng('fmt2'));
    ok(Object.keys(syn.chg).length > 0, 'Datensatz mit erkannter Veränderung vorhanden'); r.db.opps[syn.id] = syn;
    const all = S.dbList(r.db);
    ok(all.every(x => S.recordVersion(x) === 3), 'alle Datensätze im Format 3');
    ok(all.some(x => x.cards.sd > 0) && all.every(x => x.cards.sd === x.shown.length || x.shown.length === S.SHOWN_MAX), 'Showdowns gezählt (= aufgedeckte Blätter bis 10)');
    const txt = S.dbExport(r.db, 'x'), imp = S.dbImport(txt);
    ok(imp.ok && imp.version === 3 && !imp.migrated, 'Import Format 3: ' + imp.error);
    eq(S.dbCanon(imp.db), S.dbCanon(r.db), 'Export → Import ergibt dieselbe Datenbank');
    eq(S.dbCanon(S.dbImport(S.dbExport(imp.db, 'y')).db), S.dbCanon(r.db), 'zweite Runde identisch');
    ok(/"version":3,/.test(txt) && /"halfLife":/.test(txt), 'Kopf mit Version 3 und Halbwertszeit');
    // 5.000 Gegner mit Gedächtnis
    const tpl = all.reduce((b, x) => x.hands > b.hands ? x : b, all[0]), big = S.newDb();
    for (let i = 0; i < 5000; i++) { const x = S.cloneRecord(tpl); x.id = 'x' + i; x.name = 'Gegner ' + i; big.opps[x.id] = x; }
    const bt = S.dbExport(big, 'b'), bi = S.dbImport(bt);
    ok(bi.ok && bi.count === 5000 && S.dbCanon(bi.db) === S.dbCanon(big), '5.000 Gegner mit Gedächtnis: Export = Import (' + Math.round(bt.length / 1048576) + ' MB)');
    // Format 2: Datei und gespeicherte Liste
    const v2 = all.map(x => { const o = clone(x); delete o.recent; delete o.cards; delete o.chg; return o; });
    ok(v2.every(x => S.recordVersion(x) === 2), 'Format-2-Datensätze erkannt');
    eq(S.needsMigration(v2), v2.length, 'Anlass für Sicherung vor Umwandlung'); eq(S.needsMigration(all), 0, 'Format 3 braucht keine Umwandlung');
    const i2 = S.dbImport(S.rawExport(v2, 2, 'alt'));
    ok(i2.ok && i2.migrated && i2.version === 2, 'Datei Format 2 importierbar und umgewandelt: ' + i2.error);
    const m = i2.db.opps[tpl.id];
    ok(JSON.stringify(m.stats) === JSON.stringify(tpl.stats) && JSON.stringify(m.pos) === JSON.stringify(tpl.pos) && m.hands === tpl.hands, 'Langzeitwerte exakt übernommen');
    ok(m.recent.h === 0 && m.recent.stats.vpip.join() === '0,0,0' && m.cards.from === tpl.hands && Object.keys(m.chg).length === 0, 'Kurzzeit leer, Kartenzählung ab aktueller Handzahl');
    eq(S.dbCanon(S.dbImport(S.dbExport(i2.db, 'z')).db), S.dbCanon(i2.db), 'umgewandelte Datenbank: Export = Import');
    const fl = S.dbFromList(v2.concat([{ id: 'kaputt', name: 'X' }]));
    ok(fl.migrated === v2.length && fl.skipped === 1 && S.dbCanon(fl) === S.dbCanon(i2.db), 'gespeicherte Liste Format 2 umgewandelt, Ungültiges übersprungen');
    ok(S.validRecord(v2[0], false) === null && S.validRecord(all[0], false) === null && S.validRecord(v2[0], 3) !== null && S.validRecord(all[0], 2) !== null, 'Momentaufnahmen (Lerndaten): Format 2 und 3 gültig, Formate getrennt geprüft');
    const hero2 = clone(r.heroRec); delete hero2.recent; delete hero2.cards; delete hero2.chg;
    ok(S.loadRecord(hero2) && S.loadRecord(hero2).recent && S.loadRecord(r.heroRec).hands === r.heroRec.hands, 'eigene Werte: Format 2 und 3 ladbar');
    // Sicherung Format 2 (PokerTrainer 2.0.1)
    const body = { opponents: v2.slice(0, 5), hero: hero2, hands: [], learning: PT.training.newLearning(), settings: {}, table: null };
    const bk2 = JSON.stringify({ format: 'PokerTrainer-Backup', version: 2, app: '2.0.1', exported: 'x', checksum: PT.util.fnv1a(JSON.stringify(body)), payload: body });
    const rb2 = S.dbImport(bk2); ok(rb2.ok && rb2.migrated && rb2.hero && rb2.hero.recent && rb2.count === 5, 'Sicherung Format 2 importierbar: ' + rb2.error);
    const bk3 = S.backupExport({ opponents: all.slice(0, 5), hero: r.heroRec, hands: [], learning: PT.training.newLearning(), settings: {}, table: null }, 'y'), rb3 = S.dbImport(bk3);
    ok(rb3.ok && !rb3.migrated && JSON.stringify(rb3.hero) === JSON.stringify(S.cloneRecord(r.heroRec)), 'Sicherung Format 3 importierbar: ' + rb3.error);
    // Format 1 weiterhin
    const v1rec = { id: 'g007', name: 'Gustav', status: 'archiv', hands: 120, stats: { vpip: [30, 110], pfr: [20, 110], threeBet: [3, 40], foldTo3Bet: [4, 6], cbet: [10, 15], foldToCbet: [5, 12], wtsd: [9, 30] }, shown: [], lastSeen: 1 };
    const i1 = S.dbImport(S.rawExport([v1rec], 1, 'v1')); ok(i1.ok && S.recordVersion(i1.db.opps.g007) === 3 && i1.db.opps.g007.cards.from === 120, 'Format 1 weiterhin importierbar');
    // abweichende Halbwertszeit: Kurzzeit wird verworfen statt falsch gedeutet
    const hl = S.dbImport(txt.replace('"halfLife":' + M.HALF_LIFE + ',', '"halfLife":50,'));
    ok(hl.ok && hl.recentReset && hl.db.opps[syn.id].recent.h === 0 && hl.db.opps[syn.id].stats.vpip.join() === syn.stats.vpip.join(), 'andere Halbwertszeit: Kurzzeit neu, Langzeit erhalten');
    // Manipulationen
    const before = S.dbCanon(r.db), idx = all.findIndex(x => x.id === syn.id);
    function variant(fn, raw) { const o = JSON.parse(txt); fn(o.opponents[idx], o); let s2 = JSON.stringify(o); if (raw) s2 = raw(s2); const o2 = JSON.parse(s2); o2.checksum = PT.util.fnv1a(JSON.stringify(o2.opponents)); return JSON.stringify(o2); }
    const bad = [
      ['Kurzzeit fehlt', variant(x => { delete x.recent; })], ['Kartenzähler fehlen', variant(x => { delete x.cards; })],
      ['Kurzzeit-Handgewicht negativ', variant(x => { x.recent.h = -1; })], ['Kurzzeit-Handgewicht zu groß', variant(x => { x.recent.h = M.H_MAX + 5; })],
      ['Kurzzeit Treffer > Gelegenheiten', variant(x => { x.recent.stats.vpip = [5, 3, 1]; })], ['Kurzzeit > Langzeit', variant(x => { x.recent.stats.vpip[1] = x.stats.vpip[1] + 5; })],
      ['Σw² > Σw', variant(x => { x.recent.stats.pfr[2] = x.recent.stats.pfr[1] + 1; })], ['Text statt Zahl', variant(x => { x.recent.stats.vpip[0] = '1'; })],
      ['zwei statt drei Kurzzeitwerte', variant(x => { x.recent.stats.vpip = [1, 2]; })], ['unbekannter Kurzzeitwert', variant(x => { x.recent.stats.evil = [0, 0, 0]; })],
      ['fehlender Kurzzeitwert', variant(x => { delete x.recent.stats.wtsd; })], ['Zusatzfeld in Kurzzeit', variant(x => { x.recent.x = 1; })],
      ['Showdowns > Hände', variant(x => { x.cards.sd = x.hands + 1; })], ['Kartenzähler negativ', variant(x => { x.cards.hid = -1; })], ['Zusatzfeld in Kartenzählern', variant(x => { x.cards.evil = 0; })],
      ['unbekannter Wert in Veränderung', variant(x => { x.chg.evil = [1, 1]; })], ['Beginn 0', variant(x => { x.chg.vpip = [0, 1]; })], ['Richtung 2', variant(x => { x.chg.vpip = [5, 2]; })],
      ['Beginn nach letzter Hand', variant(x => { x.chg.vpip = [x.hands + 1, 1]; })], ['Veränderung als Liste', variant(x => { x.chg = [1]; })],
      ['Prototyp in Veränderung', variant(x => { x.chg = {}; }, s2 => s2.replace('"chg":{}', '"chg":{"__proto__":[1,1]}'))],
      ['Prototyp in Kurzzeit', variant(() => {}, s2 => s2.replace('"recent":{"h"', '"recent":{"__proto__":{"x":1},"h"'))],
      ['ungültige Halbwertszeit', variant((x, o) => { o.halfLife = 'abc'; })],
      ['Format 2 in Datei Version 3', variant(x => { delete x.recent; delete x.cards; delete x.chg; })],
      ['Format 3 in Datei Version 2', variant((x, o) => { o.version = 2; })],
      ['zu groß', 'x'.repeat(S.MAX_IMPORT + 10)]
    ];
    bad.forEach(([n, t2]) => { const res = S.dbImport(t2); ok(!res.ok && typeof res.error === 'string', n + ' abgelehnt' + (res.ok ? '' : ' (' + res.error + ')')); });
    eq(S.dbCanon(r.db), before, 'bestehende Datenbank unverändert');
  });

  test('Rückkehrer: Langzeitwerte und Kurzzeitgedächtnis bleiben über Archiv und Rückkehr erhalten und laufen weiter', () => {
    const sim = require('../sim-lib.js'), snaps = {}, pending = {};
    let returns = 0, unchanged = 0, continued = 0, decayOk = 0, withMemory = 0;
    const r = sim.run({ hands: QUICK ? 2500 : 8000, seed: 77, cfg: { swapEvery: 10 }, onHand: (h, res, t, db) => {
      // Fortschreibung nach der ersten Hand nach der Rückkehr
      h.p.forEach(q => { const p0 = pending[q.id]; if (!p0) return; const x = db.opps[q.id]; delete pending[q.id];
        if (x.hands === p0.hands + 1 && x.stats.vpip[1] >= p0.stats.vpip[1] && x.firstSeen === p0.firstSeen) continued++;
        if (Math.abs(x.recent.h - Math.round((p0.recent.h * M.LAMBDA + 1) * 1e4) / 1e4) < 1e-9) decayOk++; });
      if (!res.ev.swap) return;
      const { left, joined } = res.ev.swap;
      if (snaps[joined]) {
        returns++;
        const now = clone(db.opps[joined]); now.status = 'archiv';
        if (JSON.stringify(now) === JSON.stringify(snaps[joined])) unchanged++;
        if (snaps[joined].recent.h > 1) withMemory++;
        pending[joined] = snaps[joined];
      }
      snaps[left] = clone(db.opps[left]);
    } });
    ok(returns >= 5, 'Rückkehrer: ' + returns);
    eq(unchanged, returns, 'Datensatz im Archiv unverändert (Langzeit, Kurzzeit, Karten, Veränderung)');
    ok(withMemory > 0, 'Rückkehrer mit Kurzzeitgedächtnis: ' + withMemory);
    ok(continued > 0 && continued === decayOk, 'nach der Rückkehr fortgeschrieben (' + continued + '), Kurzzeit altert ab dem gespeicherten Stand (' + decayOk + ')');
    const ids = Object.keys(r.db.opps); eq(new Set(ids).size, ids.length, 'kein Doppeleintrag');
    const imp = S.dbImport(S.dbExport(r.db, 'x'));
    ok(imp.ok && S.dbCanon(imp.db) === S.dbCanon(r.db), 'Archiv samt Gedächtnis übersteht Export und Import');
  });

  test('Fairness: Gedächtnis, Profil und Coach-Schnittstelle nutzen nur Beobachtetes, nie den internen Stil', () => {
    const rng = PT.makeRng('fair'), a = feed(S.newRecord('g008', 'Nit-Bot'), 500, 0.3, rng, ['vpip', 'pfr', 'threeBet']);
    const b = S.cloneRecord(a); b.id = 'g019'; b.name = 'Vl-Bot';
    ok(PT.bots.styleOf('g008') !== PT.bots.styleOf('g019'), 'unterschiedliche interne Stile');
    eq(JSON.stringify(S.profile(a)), JSON.stringify(S.profile(b)), 'gleiche Beobachtungen → gleiches Profil');
    eq(JSON.stringify(S.effectiveStats(a)), JSON.stringify(S.effectiveStats(b)), 'gleiche Beobachtungen → gleiche Coach-Werte');
    const fs = require('fs'), path = require('path'), src = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'js', 'engine', 'stats.js'), 'utf8');
    ok(!/styleOf|paramsOf|BASE|BOT\[/.test(src), 'stats.js greift nicht auf den internen Stil zu');
    const ui = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'js', 'ui', 'views.js'), 'utf8') + fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'js', 'ui', 'app.js'), 'utf8');
    ok(!/styleOf|paramsOf/.test(ui), 'Oberfläche greift nicht auf den internen Stil zu');
  });

  test('Gegner-KI: Anpassung an synthetische Heldenstrategien nur über beobachtbare Heldenwerte', () => {
    const n = QUICK ? 3500 : 12000, from = QUICK ? 700 : 1500;
    const f = L.runAdapt(['f3b45', 'f3b90'], n, 4242, from), e1 = L.wald(f.f3b90.tb[0], f.f3b90.tb[1], f.f3b45.tb[0], f.f3b45.tb[1]);
    ok(e1.ci[0] > 0, 'Held foldet 90 % gegen 3-Bets: Bots 3-betten häufiger (' + (100 * e1.p0).toFixed(1) + ' % → ' + (100 * e1.p1).toFixed(1) + ' %, Differenz ' + (100 * e1.diff).toFixed(1) + ' Pp, 95-%-KI ' + e1.ci.map(x => (100 * x).toFixed(1)).join('…') + ')');
    const s = L.runAdapt(['base', 'station'], n, 4243, from), e2 = L.wald(s.station.bluff[0], s.station.bluff[1], s.base.bluff[0], s.base.bluff[1]);
    ok(e2.ci[1] < 0, 'Calling Station: Bots bluffen seltener (' + (100 * e2.p0).toFixed(1) + ' % → ' + (100 * e2.p1).toFixed(1) + ' %, 95-%-KI ' + e2.ci.map(x => (100 * x).toFixed(1)).join('…') + ')');
    const e3 = L.wald(s.station.thinRiver[0], s.station.thinRiver[1], s.base.thinRiver[0], s.base.thinRiver[1]);
    ok(QUICK ? e3.diff > 0 : e3.ci[0] > 0, 'Calling Station: dünnere Value-Bets am River (' + (100 * e3.p0).toFixed(1) + ' % → ' + (100 * e3.p1).toFixed(1) + ' %)');
    ok(s.station.heroStats.wtsd >= 90 && f.f3b90.heroStats.foldTo3Bet >= 80, 'synthetische Heldenwerte wie vorgegeben (WTSD ' + s.station.heroStats.wtsd + ' %, Fold gegen 3-Bet ' + f.f3b90.heroStats.foldTo3Bet + ' %)');
  });

  test('Gegnergedächtnis: synthetische Gegner wechseln mitten in der Session die Spielweise', () => {
    const reps = QUICK ? 3 : 8;
    const res = L.runSwitch([{ name: 'Nit → sehr loose', from: 'nit', to: 'vl' }, { name: 'TAG → loose-passiv', from: 'tag', to: 'lp' }, { name: 'Kontrolle', from: 'tag', to: 'tag' }], reps, 300, 250, 515);
    const big = res[0].runs, mid = res[1].runs, ctl = res[2].runs;
    ok(big.every(x => x.delay != null && x.delay <= 120), 'Nit → sehr loose: alle erkannt, Verzögerungen ' + big.map(x => x.delay).join(', '));
    ok(mid.filter(x => x.delay != null && x.delay <= 250).length >= Math.ceil(reps / 2), 'TAG → loose-passiv: mindestens die Hälfte erkannt (' + mid.map(x => x.delay).join(', ') + ')');
    const fa = res.reduce((p, R) => p + R.runs.reduce((q, x) => q + x.falsePre, 0), 0) + ctl.filter(x => x.delay != null).length;
    ok(fa <= 1, 'Fehlalarme vor dem Wechsel und in der Kontrolle: ' + fa);
  });
};
