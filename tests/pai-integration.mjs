/* Arbeitspaket 8 (2.2): gemeinsame Integrationstests PokerTrainer ↔ Adaptive Poker Intelligence (PAI).
   Voraussetzung: Arbeitsstand von https://github.com/milkiasasmarome-eng/Assist lokal (nur lesend), Pfad in PT_PAI_ROOT.
   Prüft: (1) Ereignisstrom des Trainers enthält nur Beobachtbares; (2) PAI liest die Hand-Datensätze des Trainers mit seinem eigenen
   Adapter und prüft sie mit seinem eigenen Validator; (3) Versionskompatibilität der Sicherungsdatei; (4) unabhängige Kennzahlen
   (VPIP/PFR) von PAI und Trainer auf denselben Händen; (5) unabhängige Equity-Rechnung beider Systeme auf denselben Spots;
   (6) die Empfehlungskanäle bleiben getrennt (der Trainer füllt nur seinen Kanal).
   Aufruf: PT_PAI_ROOT=/pfad/zu/Assist node tests/pai-integration.mjs  → tests/results/pai-integration.json */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAI = process.env.PT_PAI_ROOT || path.join(HERE, '..', '..', 'milkiasasmarome-eng', 'assist');
const PT = require('./load.js').load();
const sim = require('./app-sim.js');
const imp = (p) => import(pathToFileURL(path.join(PAI, p)).href);
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'BESTANDEN ' : 'FEHLER    ') + name + (detail ? ' – ' + detail : '')); }

if (!fs.existsSync(path.join(PAI, 'src', 'data', 'adapters', 'pokertrainer.js'))) { console.log('PAI nicht gefunden unter ' + PAI + ' – Test übersprungen'); process.exit(0); }
const paiVersion = (await imp('src/core/version.js')).VERSION;
const { fromPokerTrainerBackup } = await imp('src/data/adapters/pokertrainer.js');
const { validateHand } = await imp('src/data/hand.js');
const paiEq = (await imp('src/math/equity.js')).equity;

const hands = sim(PT, 60, 22022);
// (1) Ereignisstrom
const ev = PT.events.build(hands), err = PT.events.validate(ev);
check('Ereignisstrom: Schema, Prüfsumme, nur beobachtbare Informationen', err === null && ev.events > 20, (err || 'ok') + ', ' + ev.events + ' Ereignisse aus ' + ev.hands + ' Händen');
let leak = 0; ev.payload.forEach(h => h.events.forEach(e => { if (!e.complete) return; const k = e.observed; const own = k.holeCards.join('');
  (h.afterHand ? h.afterHand.shown : []).forEach(s => { if (s.seat !== k.heroSeat && JSON.stringify(k).indexOf(s.cards) >= 0) leak++; }); if (k.board.length > [0, 3, 4, 5][['preflop', 'flop', 'turn', 'river'].indexOf(k.street)]) leak++; void own; }));
check('Ereignisstrom: keine später aufgedeckten Gegnerkarten und keine künftigen Boardkarten im Entscheidungsabschnitt', leak === 0, leak + ' Funde');
const tampered = JSON.parse(JSON.stringify(ev)); const e0 = tampered.payload.find(h => h.events.some(e => e.complete)).events.find(e => e.complete);
e0.observed.publicView.players[1].cards = ['As', 'Ad']; tampered.contentHash = PT.util.fnv1a(JSON.stringify(tampered.payload));
check('Ereignisstrom: Prüfung lehnt verdeckte Karten im beobachteten Zustand ab', /verdeckte Karten/.test(PT.events.validate(tampered) || ''), PT.events.validate(tampered));
// (6) Kanäle
const chOk = ev.payload.every(h => h.events.every(e => e.recommendations.pai === null && (!e.complete || (e.recommendations['pokertrainer-coach'] && e.recommendations['pokertrainer-coach'].engine === 'pokertrainer-coach'))));
check('Empfehlungskanäle getrennt: Trainer füllt nur „pokertrainer-coach“, Kanal „pai“ bleibt leer', chOk);
// (3) Versionskompatibilität
const backupV3 = JSON.parse(PT.stats.backupExport({ opponents: [], hands }, 'test'));
let v3err = null; try { fromPokerTrainerBackup(backupV3); } catch (e) { v3err = e.message; }
check('Versionsprüfung: PAI ' + paiVersion + ' liest Sicherungen des Trainers (Format ' + backupV3.version + ')', v3err === null, v3err ? 'PAI lehnt ab: ' + v3err + ' (bekannte Inkompatibilität, Anpassung in docs/PAI_INTEGRATION.md)' : 'ok');
// (2) Hand-Datensätze über den PAI-Adapter (Hand-Format 1 ist seit 2.0 unverändert; nur die Kopfversion der Sicherung unterscheidet sich)
const wrapped = { format: 'PokerTrainer-Backup', version: 2, app: PT.VERSION, exported: 'test', payload: { hands } };
const conv = fromPokerTrainerBackup(wrapped);
const bad = conv.hands.map(h => validateHand(h)).filter(v => !v.ok);
check('PAI-Adapter und PAI-Validator akzeptieren die Hand-Datensätze des Trainers', conv.errors.length === 0 && bad.length === 0 && conv.hands.length === hands.length, conv.hands.length + ' von ' + hands.length + ' Händen, ' + conv.errors.length + ' Fehler' + (conv.errors[0] ? ': ' + conv.errors[0].error : ''));
const noCoach = conv.hands.every(h => JSON.stringify(h).indexOf('"decisions"') < 0 && JSON.stringify(h).indexOf('"grade"') < 0);
check('Unabhängigkeit: PAI übernimmt keine Coach-Bewertungen des Trainers', noCoach);
// (4) Kennzahlen: VPIP/PFR je Spieler unabhängig gezählt
const ptDb = PT.stats.newDb(), heroRec = PT.stats.newRecord('hero', 'Du'); hands.forEach(h => { PT.stats.dbApplyHand(ptDb, publicRec(h), heroRec); });
function publicRec(h) { // Handdatensatz → öffentlicher Datensatz wie PT.rules publicRecord (nur für die Zählung)
  return { no: h.no, ts: h.ts, seats: h.seats.map(s => ({ seat: s.seat, id: s.id, name: s.name, pos: s.pos, hero: s.seat === h.heroSeat })), actions: h.actions, board: h.board.map(c => typeof c === 'string' ? PT.parseCards(c)[0] : c), shown: (h.shown || []).map(s => ({ seat: s.seat, cards: PT.parseCards(s.cards) })), showdown: h.showdown, sawFlop: h.sawFlop || [], net: h.seats.map(() => 0), won: h.won || null };
}
let paiCounts = {};
try {
  const { extractHand } = await imp('src/memory/extract.js');
  conv.hands.forEach(h => { for (const o of extractHand(h).values()) { const k = o.key.split('/')[1]; const c = paiCounts[k] = paiCounts[k] || { vpip: [0, 0], pfr: [0, 0] }; ['vpip', 'pfr'].forEach(s => { if (o.stats[s]) { c[s][0] += o.stats[s][0]; c[s][1] += o.stats[s][1]; } }); } });
} catch (e) { paiCounts = null; check('PAI-Kennzahlen berechenbar', false, e.message); }
if (paiCounts) {
  let cmp = 0, diff = 0; const ex = []; Object.keys(ptDb.opps).forEach(id => { const a = ptDb.opps[id].stats, b = paiCounts[id]; if (!b) return; ['vpip', 'pfr'].forEach(s => { cmp++; if (a[s][0] !== b[s][0] || a[s][1] !== b[s][1]) { diff++; if (ex.length < 3) ex.push(id + ' ' + s + ' PT ' + a[s].join('/') + ' PAI ' + b[s].join('/')); } }); });
  check('Kennzahlen VPIP/PFR: PAI und Trainer zählen auf denselben Händen gleich (unabhängige Implementierungen)', cmp > 0 && diff === 0, cmp + ' Vergleiche, ' + diff + ' Abweichungen' + (ex.length ? ' (z. B. ' + ex.join('; ') + ')' : ''));
}
// (5) Equity: Trainer (exakte Aufzählung) gegen PAI (eigene Engine) auf Spots aus dem Ereignisstrom, Gegner = zufällige Hand
let n = 0, maxd = 0; const rng = PT.makeRng('pai-eq');
for (const h of ev.payload) for (const e of h.events) { if (!e.complete || e.observed.board.length < 3 || n >= 25) continue; const k = e.observed;
  const pt = PT.equity.equity({ hero: PT.parseCards(k.holeCards.join('')), board: PT.parseCards(k.board.join('')), ranges: [PT.ranges.full()], level: 'tief', rng, budget: { left: 60000, used: 0 }, cache: false });
  let pe = null; try { const r = paiEq({ players: [k.holeCards.join(''), 'random'], board: k.board.join('') }); pe = r && r.equity ? r.equity[0] : null; } catch (er) { pe = null; }
  if (pe == null || pt.eq == null) continue; n++; maxd = Math.max(maxd, Math.abs(pe - pt.eq)); }
check('Equity: PAI und Trainer stimmen auf denselben Spots überein (Abweichung ≤ 0,01)', n >= 5 && maxd <= 0.01, n + ' Spots, größte Abweichung ' + maxd.toFixed(4));
// 2.3 (Arbeitspaket 8): zusätzliche Regressionstests
// (7) Reproduzierbarkeit: gleiche Seeds → identischer Ereignisstrom (Prüfsumme)
const ev2 = PT.events.build(sim(PT, 60, 22022));
check('Reproduzierbarkeit: gleiche Seeds ergeben denselben Ereignisstrom', ev2.contentHash === ev.contentHash && ev2.events === ev.events, ev.contentHash + ' / ' + ev2.contentHash);
// (8) Fehlerbehandlung: beschädigter Ereignisstrom (Prüfsumme) und unbekannte Sicherungsversion werden abgelehnt, ohne Ausnahme im Trainer
const broken = JSON.parse(JSON.stringify(ev)); broken.payload[0].events.length = 0;
let bErr = null; try { bErr = PT.events.validate(broken); } catch (e) { bErr = 'Ausnahme: ' + e.message; }
check('Fehlerbehandlung: veränderter Ereignisstrom wird mit Meldung abgelehnt', typeof bErr === 'string' && !/^Ausnahme/.test(bErr), bErr);
let v4err = null; try { fromPokerTrainerBackup(Object.assign({}, backupV3, { version: 4 })); } catch (e) { v4err = e.message; }
check('Fehlerbehandlung: PAI lehnt unbekannte Sicherungsversion 4 mit Meldung ab', !!v4err, v4err);
// (9) Datenintegrität und Leckage (Prüfbefund E23-2: gegen den tatsächlichen Handverlauf, mit Negativtest)
const showdownSeats = h => { const folded = new Set(h.actions.filter(a => a.t === 'fold').map(a => a.s)); return new Set(h.seats.map(s => s.seat).filter(s => !folded.has(s))); };
const leakIn = list => { let n = 0; list.forEach((h, i) => { const src = hands[i], ok = showdownSeats(src); (h.shown || []).forEach(x => { if (!ok.has(x.seat)) n++; }); }); return n; };
let integ = 0; conv.hands.forEach((h, i) => { const src = hands[i]; if (h.actions.length !== src.actions.length || h.board.join('') !== (src.board || []).join('')) integ++; });
check('Datenintegrität: Aktionen und Board je Hand vollständig übernommen', integ === 0, integ + ' Abweichungen in ' + conv.hands.length + ' Händen');
const leak0 = hands.reduce((n, src) => { const ok = showdownSeats(src); (src.shown || []).forEach(x => { if (!ok.has(x.seat)) n++; }); return n; }, 0);
check('Keine Datenleckage im Trainer: aufgedeckte Blätter nur von Plätzen am Showdown', leak0 === 0 && leakIn(conv.hands) === 0, leak0 + ' im Trainer, ' + leakIn(conv.hands) + ' nach PAI');
const FORBID = ['seed', 'no', 'tseed', 'session', 'decisions', 'training'];
const keysDeep = (o, out = new Set()) => { if (o && typeof o === 'object') Object.keys(o).forEach(k => { out.add(k); keysDeep(o[k], out); }); return out; };
const bad2 = conv.hands.filter(h => { const ks = keysDeep(h); return FORBID.some(k => ks.has(k)); });
check('Keine Datenleckage nach PAI: umgewandelte Hände ohne Seed, Handnummer, Sitzung, Bewertungen', bad2.length === 0, bad2.length + ' Hände mit verbotenen Feldern');
// Negativtest: eingeschleustes Blatt eines gefoldeten Spielers muss die Prüfung rot machen
const inj = JSON.parse(JSON.stringify(conv.hands)); let injected = 0; inj.forEach((h, i) => { const src = hands[i], ok = showdownSeats(src); const f = src.seats.map(s => s.seat).find(s => !ok.has(s)); if (f != null && injected < 5) { h.shown = (h.shown || []).concat([{ seat: f, cards: 'AsAd' }]); injected++; } });
check('Negativtest Leckageprüfung: eingeschleuste Karten gefoldeter Spieler werden erkannt', injected > 0 && leakIn(inj) === injected, injected + ' eingeschleust, ' + leakIn(inj) + ' erkannt');
let paiTakes = 0; inj.forEach(h => { const v = validateHand(h); if (v.ok && (h.shown || []).some(x => x.cards === 'AsAd')) paiTakes++; });
check('Hinweis PAI 0.1.0: validateHand lehnt Karten gefoldeter Spieler ab (Änderungsauftrag Punkt 4)', paiTakes === 0, paiTakes + ' von ' + injected + ' angenommen (bekannt, Auftrag an PAI)');
// (10) Kompatibilität nach dem Änderungsauftrag (docs/PAI_AENDERUNGSAUFTRAG.md): Kopie von PAI mit der beschriebenen Änderung, das PAI-Repository bleibt unverändert
let patchedOk = null, patchedDetail = '';
try {
  const os = await import('os'); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pai-auftrag-'));
  fs.cpSync(path.join(PAI, 'src'), path.join(tmp, 'src'), { recursive: true }); fs.copyFileSync(path.join(PAI, 'package.json'), path.join(tmp, 'package.json'));
  const f = path.join(tmp, 'src', 'data', 'adapters', 'pokertrainer.js'); const src0 = fs.readFileSync(f, 'utf8');
  const src1 = src0.replace("if (json.version !== 2) throw new Error(`Nicht unterstützte Version ${json.version} (unterstützt: 2)`);",
    "if (![2, 3].includes(json.version)) throw new Error(`Nicht unterstützte Version ${json.version} (unterstützt: 2, 3)`);");
  if (src1 === src0) { patchedOk = false; patchedDetail = 'Stelle für den Änderungsauftrag nicht gefunden (PAI geändert?)'; }
  else { fs.writeFileSync(f, src1); const P2 = await import(pathToFileURL(f).href); const r3 = P2.fromPokerTrainerBackup(backupV3); let r4 = null; try { P2.fromPokerTrainerBackup(Object.assign({}, backupV3, { version: 4 })); } catch (e) { r4 = e.message; }
    patchedOk = r3.errors.length === 0 && r3.hands.length === hands.length && !!r4; patchedDetail = r3.hands.length + ' von ' + hands.length + ' Händen aus Format 3, Version 4 abgelehnt: ' + !!r4; }
  fs.rmSync(tmp, { recursive: true, force: true });
} catch (e) { patchedOk = false; patchedDetail = e.message; }
check('Nach Änderungsauftrag (Kopie von PAI): Format 3 wird gelesen, unbekannte Versionen weiter abgelehnt', patchedOk, patchedDetail);
const out = { date: new Date().toISOString(), pokertrainer: PT.VERSION, pai: paiVersion, paiRoot: path.basename(PAI), results };
fs.writeFileSync(path.join(HERE, 'results', 'pai-integration.json'), JSON.stringify(out, null, 1));
console.log(results.filter(r => r.ok).length + ' von ' + results.length + ' bestanden');
