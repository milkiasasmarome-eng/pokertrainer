/* PokerTrainer 2.0 – Ansichten: Training, Handhistorie mit Replayer, Range-Matrix, Gegnerdatenbank,
   Lernfortschritt, Einstellungen, Hilfe. */
(function () {
'use strict';
var PT = window.PT, PTUI = window.PTUI, S = PTUI.S, U = PT.util, H = PTUI.h, Store = PTUI.Store;
var esc = U.esc, fmt = U.fmt, pct = U.pct, $ = H.$;
var views = PTUI.views = {};

function sectionHead(title, sub) { return '<div class="panel"><h2>' + esc(title) + '</h2>' + (sub ? '<p class="small">' + sub + '</p>' : '') + '</div>'; }
function scoreColor(s) { return s == null ? '' : s >= 75 ? 'good' : s < 55 ? 'bad' : ''; }
function meter(score) { if (score == null) return '<div class="meter"><i style="width:0"></i></div>'; var c = score >= 75 ? '' : score >= 55 ? ' warn' : ' bad'; return '<div class="meter' + c + '"><i style="width:' + Math.round(Math.max(0, Math.min(100, score))) + '%"></i></div>'; }
function n0(x) { return x == null ? '–' : Math.round(x); }
function num(x, d) { return x == null || !isFinite(x) ? '–' : x.toFixed(d == null ? 1 : d).replace('.', ','); }

// ---------- Training ----------
var quizState = null;
views.training = function (el) {
  var prof = S.prof || PT.training.profile(S.learning), due = PT.training.srsDue(S.learning, Date.now());
  var cats = Object.keys(PT.training.SCEN);
  var pri = prof.priorities.filter(function (p) { return !p.explore; }).slice(0, 3);
  var html = sectionHead('Situationstraining', 'Wähle eine Kategorie. Jede Situation entsteht aus echten Spielverläufen mit den Computergegnern; die markierte Entscheidung wird bewertet. Trainingshände fließen nicht in die Gegnerdatenbank ein.');
  html += '<div class="grid2">';
  html += '<div class="panel"><h3>Empfohlen für dich</h3>' + (pri.length ? '<ul>' + pri.map(function (p) { return '<li><b>' + esc(p.name) + '</b> – ' + esc(p.reason) + ' <button class="btn" type="button" data-train="' + p.tag + '">Trainieren</button></li>'; }).join('') + '</ul>' :
    '<p class="muted">Noch zu wenige bewertete Entscheidungen. Spiele einige Hände oder starte eine Kategorie.</p>') +
    '<h3>Wiederholung (Spaced Repetition)</h3><p>' + due.length + ' fällige Situationen aus früheren Fehlern' + (S.learning.srs.length ? ' · ' + S.learning.srs.length + ' insgesamt im Wiederholungsstapel' : '') + '.</p>' +
    (due.length ? '<button class="btn primary2" type="button" data-review="1">Jetzt wiederholen</button>' : '') + '</div>';
  html += '<div class="panel"><h3>Wissensquiz</h3><div id="quizBox"></div></div></div>';
  html += '<div class="panel"><h3>Alle Kategorien</h3><div class="grid3">' + cats.map(function (c) {
    var s = prof.spots[c] || { n: 0 };
    return '<div class="box"><h4>' + esc(PT.training.SCEN[c].name) + '</h4>' + meter(s.n ? s.smooth : null) + '<p class="small">' + (s.n ? 'Qualität ' + n0(s.smooth) + ' · ' + s.n + ' Entscheidungen · Ø EV-Verlust ' + num(s.loss, 2) + ' BB' : 'noch nicht trainiert') + '</p>' +
      '<button class="btn" type="button" data-train="' + c + '">Starten</button></div>';
  }).join('') + '</div></div>';
  el.innerHTML = html;
  el.onclick = function (e) {
    var b = e.target.closest('[data-train]'); if (b) { PTUI.startTraining(b.getAttribute('data-train')); return; }
    if (e.target.closest('[data-review]')) { var q = PT.training.srsDue(S.learning, Date.now()).slice(0, 20); if (q.length) PTUI.startTraining(q[0].cat, q.map(function (x) { return { key: x.key, cat: PT.training.SCEN[x.cat] ? x.cat : 'preflop-open', seed: x.seed }; })); return; }
    var qa = e.target.closest('[data-qa]'); if (qa && quizState && quizState.answered == null) {
      quizState.answered = +qa.getAttribute('data-qa');
      var right = quizState.answered === quizState.q.ok, Q = S.learning.quiz;
      Q.n++; if (right) Q.correct++; var bt = Q.byType[quizState.q.type] || (Q.byType[quizState.q.type] = { n: 0, c: 0 }); bt.n++; if (right) bt.c++;
      PTUI.persistLearning(); renderQuiz(); return;
    }
    if (e.target.closest('[data-qnext]')) { quizState = null; renderQuiz(); }
  };
  renderQuiz();
};
function renderQuiz() {
  var box = document.getElementById('quizBox'); if (!box) return;
  var Q = S.learning.quiz;
  if (!quizState) {
    var types = Object.keys(PT.training.QUIZ_TYPES), t = types[Math.floor(Math.random() * types.length)];
    quizState = { q: PT.training.quiz(t, PT.makeRng()), answered: null };
  }
  var q = quizState.q, a = quizState.answered;
  box.innerHTML = '<p class="small">' + esc(PT.training.QUIZ_TYPES[q.type]) + ' · bisher ' + esc(String(Q.correct | 0)) + ' von ' + esc(String(Q.n | 0)) + ' richtig</p><p><b>' + esc(q.q) + '</b></p><div class="btnrow">' +
    q.opts.map(function (o, i) { var cls = a == null ? '' : i === q.ok ? ' primary2' : i === a ? ' danger' : ''; return '<button class="btn' + cls + '" type="button" data-qa="' + i + '"' + (a != null ? ' disabled' : '') + '>' + esc(o) + '</button>'; }).join('') + '</div>' +
    (a != null ? '<p class="' + (a === q.ok ? 'good' : 'bad') + '"><b>' + (a === q.ok ? 'Richtig.' : 'Nicht ganz.') + '</b> ' + esc(q.expl) + '</p><button class="btn" type="button" data-qnext="1">Nächste Frage</button>' : '');
}

// ---------- Handhistorie und Replayer ----------
var hist = { list: null, filter: { q: '', kind: 'alle', pos: '' }, sel: null, step: 0, later: false, redo: null };
views.analyse = function (el, arg) {
  el.innerHTML = '<div class="panel"><h2>Handhistorie</h2><p class="small">Gespeichert werden bis zu 3.000 eigene Hände mit Entscheidungen, Empfehlungen und Bewertungen – lokal in diesem Browser.</p>' +
    '<div class="toolbar"><input type="search" id="hq" placeholder="Suche: Karten (z. B. AK), Gegner, Board" aria-label="Suche"><select id="hk" aria-label="Filter"><option value="alle">alle Hände</option><option value="fehler">mit Fehlern</option><option value="showdown">mit Showdown</option><option value="training">nur Training</option><option value="gewonnen">gewonnen</option><option value="verloren">verloren</option></select>' +
    '<select id="hp" aria-label="Position"><option value="">alle Positionen</option>' + PT.stats.POSITIONS.map(function (p) { return '<option>' + p + '</option>'; }).join('') + '</select>' +
    '<button class="btn" type="button" data-hx="json">Export JSON</button><button class="btn" type="button" data-hx="txt">Export Text</button></div><div id="hlist" class="scroll"><p class="muted">Lade …</p></div></div><div id="hreplay"></div>';
  $('hq').value = hist.filter.q; $('hk').value = hist.filter.kind; $('hp').value = hist.filter.pos;
  function load() { return Store.all('hands').then(function (l) { l.sort(function (a, b) { return b.ts - a.ts; }); hist.list = l; renderList(); if (arg) { var h = l.filter(function (x) { return x.id === arg; })[0]; if (h) openReplay(h); } }); }
  ['hq', 'hk', 'hp'].forEach(function (id) { $(id).addEventListener(id === 'hq' ? 'input' : 'change', function () { hist.filter = { q: $('hq').value, kind: $('hk').value, pos: $('hp').value }; renderList(); }); });
  el.onclick = function (e) {
    var r = e.target.closest('tr[data-hid]'); if (r) { var h = hist.list.filter(function (x) { return x.id === r.getAttribute('data-hid'); })[0]; if (h) openReplay(h); return; }
    var x = e.target.closest('[data-hx]'); if (x) { var f = filtered(), kind = x.getAttribute('data-hx');
      if (kind === 'json') H.download('PokerTrainer_Haende_' + H.today() + '.json', JSON.stringify({ format: 'PokerTrainer-Hands', version: 1, app: PT.VERSION, count: f.length, hands: f }));
      else H.download('PokerTrainer_Haende_' + H.today() + '.txt', f.map(PT.training.handText).join('\n\n'), 'text/plain');
      return; }
    var st = e.target.closest('[data-step]'); if (st) { stepTo(st.getAttribute('data-step')); return; }
    if (e.target.closest('[data-later]')) { hist.later = !hist.later; renderReplay(); return; }
    var rd = e.target.closest('[data-redo]'); if (rd) { redoDecision(+rd.getAttribute('data-redo')); return; }
    var rc = e.target.closest('[data-rchoice]'); if (rc) { chooseRedo(+rc.getAttribute('data-rchoice')); return; }
  };
  el.onkeydown = function (e) { var r = e.target.closest('tr[data-hid]'); if (r && e.key === 'Enter') r.click(); };
  load();
};
function filtered() {
  var f = hist.filter, q = f.q.trim().toLowerCase();
  return (hist.list || []).filter(function (h) {
    if (f.kind === 'fehler' && !h.decisions.some(function (d) { return d.score <= 45; })) return false;
    if (f.kind === 'showdown' && !h.showdown) return false;
    if (f.kind === 'training' && !h.training) return false;
    if (f.kind === 'gewonnen' && !(h.heroNet > 0)) return false;
    if (f.kind === 'verloren' && !(h.heroNet < 0)) return false;
    if (f.pos && h.seats[h.heroSeat].pos !== f.pos) return false;
    if (q) {
      var cls = PT.handClassName.apply(null, PT.parseCards(h.hero)).toLowerCase();
      var hay = (h.hero + ' ' + cls + ' ' + h.board.join('') + ' ' + h.seats.map(function (s) { return s.name; }).join(' ')).toLowerCase();
      if (hay.indexOf(q) < 0 && cls.indexOf(q) !== 0) return false;
    }
    return true;
  });
}
function renderList() {
  var l = filtered(), box = $('hlist'); if (!box) return;
  if (!l.length) { box.innerHTML = '<p class="muted">Keine Hände' + ((hist.list || []).length ? ' für diesen Filter.' : ' gespeichert. Spiele am Tisch oder im Training.') + '</p>'; return; }
  box.innerHTML = '<p class="small">' + l.length + ' Hände</p><div class="scroll"><table class="grid hlist"><thead><tr><th>Zeit</th><th>Hand</th><th>Pos.</th><th>Karten</th><th>Board</th><th class="n">Ergebnis</th><th>Bewertung</th></tr></thead><tbody>' +
    l.slice(0, 300).map(function (h) {
      var worst = h.decisions.reduce(function (m, d) { return !m || d.score < m.score ? d : m; }, null);
      return '<tr class="click" tabindex="0" data-hid="' + esc(h.id) + '"><td>' + esc(H.dateTxt(h.ts)) + '</td><td>#' + h.no + (h.training ? ' <span class="pill">' + esc((PT.training.SCEN[h.training] || {}).name || 'Training') + '</span>' : '') + '</td><td>' + esc(h.seats[h.heroSeat].pos) + '</td><td><span class="cards">' + H.cardsHtml(h.hero, 'sm') + '</span></td><td><span class="cards">' + H.cardsHtml(h.board.join(''), 'sm') + '</span></td><td class="n ' + (h.heroNet > 0 ? 'good' : h.heroNet < 0 ? 'bad' : '') + '">' + U.fmtSigned(h.heroNet) + '</td><td>' + (worst ? H.gradeHtml({ grade: worst.grade, simple: PT.coach.GRADE_SIMPLE[worst.grade], lossBB: null }) : '–') + '</td></tr>';
    }).join('') + '</tbody></table></div>' + (l.length > 300 ? '<p class="muted">Es werden die neuesten 300 angezeigt; nutze Filter oder Export.</p>' : '');
}
function openReplay(h) {
  var holes = {}; holes[h.heroSeat] = PT.parseCards(h.hero);
  var shownHoles = {}; (h.shown || []).forEach(function (x) { shownHoles[x.seat] = PT.parseCards(x.cards); });
  var all = Object.assign({}, shownHoles, holes);
  var rp = PT.rules.replay(h, all);
  hist.sel = { h: h, states: rp.states, shownHoles: shownHoles }; hist.step = 0; hist.redo = null; hist.later = false;
  renderReplay();
  var r = $('hreplay'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function stepTo(cmd) {
  var n = hist.sel.states.length - 1;
  if (cmd === 'first') hist.step = 0; else if (cmd === 'last') hist.step = n; else if (cmd === 'prev') hist.step = Math.max(0, hist.step - 1); else if (cmd === 'next') hist.step = Math.min(n, hist.step + 1);
  else if (cmd === 'play') { clearInterval(hist.timer); hist.timer = setInterval(function () { if (hist.step >= hist.sel.states.length - 1 || !$('hreplay')) { clearInterval(hist.timer); return; } hist.step++; renderReplay(); }, 900); return; }
  else if (cmd === 'pause') { clearInterval(hist.timer); return; }
  hist.redo = null; renderReplay();
}
function renderReplay() {
  var box = $('hreplay'); if (!box || !hist.sel) return;
  var h = hist.sel.h, st = hist.sel.states[hist.step], last = hist.step === hist.sel.states.length - 1;
  if (st.error) { box.innerHTML = '<div class="panel bad">' + esc(st.error) + '</div>'; return; }
  var acts = h.actions.filter(function (a) { return a.t !== 'sb' && a.t !== 'bb'; });
  var nextA = acts[st.idx + 1], nextIsHero = nextA && nextA.s === h.heroSeat;
  var dec = nextIsHero ? h.decisions.filter(function (d) { return d.i === h.actions.indexOf(nextA); })[0] : null;
  var showLater = hist.later || last;
  var seats = '';
  for (var i = 0; i < h.n; i++) {
    var p = st.p[i], s = h.seats[i], me = i === h.heroSeat, cards = me ? PT.parseCards(h.hero) : (showLater && hist.sel.shownHoles[i] ? hist.sel.shownHoles[i] : null);
    var hole = !p.folded ? (cards ? cards.map(function (c) { return H.cardHtml(c, me ? '' : 'sm'); }).join('') : H.backHtml() + H.backHtml()) : '';
    seats += '<div class="seat s' + i + (p.folded ? ' folded' : '') + (st.toAct === i ? ' act' : '') + (me ? ' me' : '') + '"><div class="plate"><span class="r1"><span class="nm">' + esc(s.name) + '</span><span class="pos">' + esc(s.pos) + '</span></span><span class="stk">' + fmt(p.stack) + (p.allIn ? ' · All-in' : '') + '</span>' +
      '<span class="hole">' + hole + '</span>' + (h.button === i ? '<span class="chipmark d">D</span>' : '') + '</div></div>' + (p.bet > 0 ? '<span class="bet b' + i + '">' + fmt(p.bet) + '</span>' : '');
  }
  var pots = st.pots.length > 1 ? st.pots.map(function (p2, k) { return '<span class="pot' + (k ? ' side' : '') + '">' + (k ? 'Side Pot ' + k + ' ' : 'Main Pot ') + fmt(p2.amount) + '</span>'; }).join('') : '<span class="pot">Pot ' + fmt(st.pot) + '</span>';
  var html = '<div class="panel replay"><h2>Replayer – Hand #' + h.no + ' (' + esc(H.dateTxt(h.ts)) + ')</h2>' +
    '<div class="table rtable"><div class="felt"></div><div class="center"><div class="pots">' + pots + '</div><div class="board">' + st.board.map(function (c) { return H.cardHtml(c); }).join('') + '</div></div>' + seats + '</div>' +
    '<div class="rcontrols"><button class="btn" type="button" data-step="first" aria-label="Zum Anfang">⏮</button><button class="btn" type="button" data-step="prev" aria-label="Schritt zurück">◀</button>' +
    '<button class="btn" type="button" data-step="play" aria-label="Abspielen">▶︎ Abspielen</button><button class="btn" type="button" data-step="pause" aria-label="Pause">⏸</button>' +
    '<button class="btn" type="button" data-step="next" aria-label="Schritt vor">▶</button><button class="btn" type="button" data-step="last" aria-label="Zum Ende">⏭</button>' +
    '<span class="small">Schritt ' + (hist.step + 1) + ' von ' + hist.sel.states.length + ': ' + esc(st.label) + '</span>' +
    '<button class="btn" type="button" data-later="1" aria-pressed="' + hist.later + '">' + (hist.later ? 'Später bekannte Infos ausblenden' : 'Später bekannte Infos einblenden') + '</button></div>';
  html += '<div class="split"><div class="box"><h4>Damals bekannt</h4><p class="small">Deine Karten, Board bis hier, alle Aktionen bis hier' + (dec && dec.snap ? ', Gegnerwerte zum Entscheidungszeitpunkt' : '') + '.</p>' +
    (dec ? '<p>Nächste Aktion: <b>deine Entscheidung</b> – gespielt: ' + esc(dec.chosen) + ', empfohlen: ' + esc(dec.rec) + '</p><p>' + H.gradeHtml({ grade: dec.grade, simple: PT.coach.GRADE_SIMPLE[dec.grade], loss: dec.loss, lossBB: dec.loss / h.bb }) + '</p>' +
      '<table class="evtable"><tbody>' + (dec.evs || []).map(function (x) { return '<tr><td>' + esc(x.l) + '</td><td>' + H.bbTxt(x.ev, 2) + '</td><td>± ' + H.bbTxt(x.u, 1) + '</td></tr>'; }).join('') + '</tbody></table>' +
      (dec.snap ? '<div class="btnrow"><button class="btn primary2" type="button" data-redo="' + hist.sel.h.decisions.indexOf(dec) + '">Entscheidung erneut treffen</button></div>' : '<p class="muted">Für diese Entscheidung liegt keine Momentaufnahme mehr vor.</p>')
      : (nextA ? '<p>Nächste Aktion: ' + esc(h.seats[nextA.s].name) + '</p>' : '<p>Hand beendet.</p>')) + '<div id="redoBox"></div></div>' +
    '<div class="box"><h4>Später bekannt</h4>' + (showLater ? ((h.shown || []).length ? '<p>' + h.shown.map(function (x) { return esc(h.seats[x.seat].name) + ': <span class="cards">' + H.cardsHtml(x.cards, 'sm') + '</span>'; }).join(' · ') + '</p>' : '<p class="muted">Keine Karten gezeigt.</p>') +
      '<p>Ergebnis: <b class="' + (h.heroNet > 0 ? 'good' : h.heroNet < 0 ? 'bad' : '') + '">' + U.fmtSigned(h.heroNet) + '</b> · ' + (h.pots || []).map(function (p3, k) { return (k ? 'Side Pot ' + k : 'Main Pot') + ' ' + fmt(p3.amount) + ' an ' + p3.winners.map(function (w) { return esc(h.seats[w].name); }).join(', '); }).join(' · ') + '</p>' +
      '<p class="small">Das Ergebnis beeinflusst die Bewertung der Entscheidungen nicht.</p>' : '<p class="muted">Ausgeblendet, damit du die Entscheidung ohne Kenntnis des Ausgangs prüfen kannst.</p>') + '</div></div>';
  html += '<details class="more"><summary>Handverlauf als Text</summary><pre class="small" style="white-space:pre-wrap">' + esc(PT.training.handText(h)) + '</pre></details></div>';
  box.innerHTML = html;
  if (hist.redo) renderRedo();
}
function redoDecision(k) {
  var d = hist.sel.h.decisions[k]; if (!d || !d.snap) return;
  hist.redo = { d: d, a: null, choice: null };
  renderRedo();
  PTUI.Analyzer.run('analyze', { view: d.snap.view, opps: d.snap.opps, settings: H.coachSettings(), seed: d.snap.seed, learner: null }).then(function (a) { if (hist.redo && hist.redo.d === d) { hist.redo.a = a; renderRedo(); } }, function () {});
}
function renderRedo() {
  var b = $('redoBox'); if (!b || !hist.redo) return;
  var r = hist.redo;
  if (!r.a) { b.innerHTML = '<p class="muted">Analyse der damaligen Situation läuft …</p>'; return; }
  if (r.choice == null) { b.innerHTML = '<p>Wie entscheidest du jetzt?</p><div class="btnrow">' + r.a.actions.slice().sort(function (x, y) { return (x.amount || 0) - (y.amount || 0); }).map(function (x) { return '<button class="btn" type="button" data-rchoice="' + r.a.actions.indexOf(x) + '">' + esc(x.label) + '</button>'; }).join('') + '</div>'; return; }
  var x = r.a.actions[r.choice], g = PT.coach.grade(r.a, { type: x.type, amount: x.amount });
  b.innerHTML = '<p>Neue Entscheidung: <b>' + esc(x.label) + '</b> ' + H.gradeHtml(g) + '</p><p>' + esc(g.text) + '</p>' + H.evTableHtml(r.a) + '<p class="small">Bewertet mit den Informationen zum damaligen Zeitpunkt (' + esc(r.a.levelName) + ', ' + esc(r.a.mode === 'gto' ? 'gleichgewichtsnah' : 'exploitativ') + ').</p>';
}
function chooseRedo(i) { if (!hist.redo) return; hist.redo.choice = i; renderRedo(); }

// ---------- Range-Matrix ----------
var rg = { type: 'rfi', pos: 'CO', opener: 'UTG', ip: true, bb: 15, sel: null };
var RANK_ORDER = 'AKQJT98765432';
function cellIdx(r, c) { return (12 - r) * 13 + (12 - c); }
views.ranges = function (el, arg) {
  var live = arg === 'aktuell' && PTUI.lastRange;
  var a = live ? PTUI.lastRange : null;
  var html = '<div class="panel"><h2>Range-Matrix</h2><p class="small">13 × 13 Starthandklassen: Paare auf der Diagonale, suited oberhalb, offsuit unterhalb. Charts sind Faustregeln für 6-max mit 100 BB, kein Solver-Ergebnis.</p>' +
    '<div class="toolbar"><select id="rt" aria-label="Range-Art">' +
    [['rfi', 'Opening Range (Raise First In)'], ['vsOpen', 'Gegen Open-Raise: Call und 3-Bet'], ['vs3bet', 'Gegen 3-Bet: Call und 4-Bet'], ['vs4bet', 'Gegen 4-Bet'], ['push', 'Push/Fold (kurzer Stack)'], ['aktuell', 'Geschätzte Gegner-Range (letzte Analyse)']]
      .map(function (o) { return '<option value="' + o[0] + '"' + ((live ? 'aktuell' : rg.type) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
    '<label class="mini">Position <select id="rp">' + ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].map(function (p) { return '<option' + (p === rg.pos ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></label>' +
    '<label class="mini">Opener <select id="ro">' + ['UTG', 'HJ', 'CO', 'BTN', 'SB'].map(function (p) { return '<option' + (p === rg.opener ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></label>' +
    '<label class="mini">Stack (BB) <input id="rb" type="number" min="3" max="30" value="' + rg.bb + '" style="width:80px"></label>' +
    '<label class="mini"><input id="rip" type="checkbox"' + (rg.ip ? ' checked' : '') + '> in Position</label></div>' +
    '<div class="legend"><span><i style="background:var(--raise)"></i>Raise</span><span><i style="background:var(--call)"></i>Call</span><span><i style="background:var(--fold)"></i>Fold</span><span><i style="background:linear-gradient(var(--raise) 50%,var(--call) 50%)"></i>gemischte Strategie</span></div>' +
    '<div class="grid2"><div><div class="matrix" id="mx" role="grid" aria-label="Range-Matrix"></div><p class="small" id="mxsum"></p></div><div class="box" id="mxinfo"><p class="muted">Wähle eine Hand für Details.</p></div></div></div>';
  el.innerHTML = html;
  function draw() {
    rg.type = $('rt').value; rg.pos = $('rp').value; rg.opener = $('ro').value; rg.bb = Math.max(3, Math.min(30, +$('rb').value || 15)); rg.ip = $('rip').checked;
    var data = rangeData(), cells = '';
    for (var r = 0; r < 13; r++) for (var c = 0; c < 13; c++) {
      var i = cellIdx(r, c), d = data.rows[i], name = PT.hands.className(i);
      var fill = '<span class="fill"><i style="height:' + (d.fold * 100) + '%;background:var(--fold)"></i><i style="height:' + (d.call * 100) + '%;background:var(--call)"></i><i style="height:' + (d.raise * 100) + '%;background:var(--raise)"></i></span>';
      cells += '<button class="mcell" type="button" role="gridcell" data-ci="' + i + '" aria-pressed="' + (rg.sel === i) + '" aria-label="' + name + ': Raise ' + Math.round(d.raise * 100) + ' %, Call ' + Math.round(d.call * 100) + ' %">' + fill + '<span class="lbl">' + name + '</span></button>';
    }
    $('mx').innerHTML = cells;
    $('mxsum').textContent = data.summary;
    if (rg.sel != null) info(rg.sel, data);
  }
  function info(i, data) {
    data = data || rangeData();
    var d = data.rows[i], name = PT.hands.className(i), dead = data.dead || [], live2 = PT.hands.liveCombos(i, dead.length ? PT.hands.deadMaskOf(dead) : null).length;
    var reason = [];
    var top = PT.hands.classTop(i);
    reason.push(name + ' gehört zu den besten ' + pct(top) + ' aller Starthände (Rangfolge ' + (PT.hands.CLS_RANK[i] + 1) + ' von 169).');
    if (PT.ranges.BLUFF3.indexOf(name) >= 0) reason.push('Typischer 3-Bet-Bluff-Kandidat: Blocker (Ass oder hohe Karte) und gute Spielbarkeit.');
    if (d.raise > 0.05 && d.raise < 0.95) reason.push('Grenzhand: gemischte Strategie – mehrere Aktionen sind ähnlich gut.');
    $('mxinfo').innerHTML = '<h4>' + esc(name) + '</h4><p>Kombinationen: <b>' + live2 + '</b> von ' + PT.hands.classCombos(i) + (dead.length ? ' (bekannte Karten berücksichtigt)' : '') + '</p>' +
      '<p>Raise ' + pct(d.raise) + ' · Call ' + pct(d.call) + ' · Fold ' + pct(d.fold) + '</p><p class="small">' + esc(reason.join(' ')) + '</p><p class="small">' + esc(data.note) + '</p>';
  }
  ['rt', 'rp', 'ro', 'rb', 'rip'].forEach(function (id) { $(id).addEventListener('change', draw); });
  $('mx').addEventListener('click', function (e) { var b = e.target.closest('[data-ci]'); if (!b) return; rg.sel = +b.getAttribute('data-ci'); draw(); });
  draw();
};
function rangeData() {
  var R = PT.ranges, t = rg.type, rows = new Array(169), note = 'Faustregel-Chart (6-max, 100 BB), kein Solver-Ergebnis.', summary = '', dead = [];
  var ch = null;
  if (t === 'rfi') { ch = R.chart('rfi', { pos: rg.pos }); note = 'Open-Raise aus ' + rg.pos + ', wenn alle davor gefoldet haben. ' + note; }
  else if (t === 'vsOpen') { ch = R.chart('vsOpen', { pos: rg.pos, opener: rg.opener }); note = rg.pos + ' gegen einen Open-Raise (2,5 BB) aus ' + rg.opener + '. ' + note; }
  else if (t === 'vs3bet') { ch = R.chart('vs3bet', { ip: rg.ip, openW: R.RFI_W[rg.pos] || 0.25 }); note = 'Opener aus ' + rg.pos + ' gegen eine 3-Bet, ' + (rg.ip ? 'in' : 'out of') + ' Position. ' + note; }
  else if (t === 'vs4bet') { ch = R.chart('vs4bet', {}); note = 'Gegen eine 4-Bet. ' + note; }
  else if (t === 'push') { ch = R.chart('push', { pos: rg.pos, bb: rg.bb }); note = 'All-in mit ' + rg.bb + ' BB aus ' + rg.pos + ' (Näherung an Push/Fold-Tabellen). ' + note; }
  if (ch) {
    for (var i = 0; i < 169; i++) rows[i] = ch[i];
    var w = R.rangeFromChart(ch, 'raise'), wc = R.rangeFromChart(ch, 'call');
    summary = 'Raise ' + pct(R.widthOf(w), 1) + ' · Call ' + pct(R.widthOf(wc), 1) + ' aller Kombinationen';
  } else {
    var a = PTUI.lastRange, mo = a && a.opponents.filter(function (o) { return o.matrix; })[0];
    if (!mo) { for (var k = 0; k < 169; k++) rows[k] = { raise: 0, call: 0, fold: 1 }; summary = 'Noch keine Analyse vorhanden – spiele eine Hand mit eingeschaltetem Coach.'; note = ''; }
    else {
      for (var j = 0; j < 169; j++) rows[j] = { raise: 0, call: mo.matrix[j], fold: 1 - mo.matrix[j] };
      summary = 'Geschätzte Range von ' + mo.name + ' (' + mo.line + '): ' + Math.round(mo.combos) + ' Kombinationen, ' + pct(mo.width, 1) + ' aller Kombinationen. Grün = Gewicht der Klasse.';
      note = 'Schätzung aus Gegnerwerten (' + mo.hands + ' Hände, ' + mo.bel + ') und Bayes-Aktualisierung nach jeder Aktion. Die tatsächlichen Karten kennt der Coach nicht.';
    }
  }
  return { rows: rows, note: note, summary: summary, dead: dead };
}

// ---------- Gegnerdatenbank ----------
var gstate = { tab: 'aktiv', q: '', typ: '', sort: 'last' };
views.gegner = function (el) {
  var list = PT.stats.dbList(S.db), act = list.filter(function (r) { return r.status === 'aktiv'; }), arc = list.filter(function (r) { return r.status === 'archiv'; });
  var mode = Store.mode(), where = mode === 'idb' ? 'im Browser (IndexedDB)' : mode === 'ls' ? 'im Browser (localStorage)' : 'nur bis zum Schließen';
  el.innerHTML = '<div class="panel"><h2>Gegnerdatenbank</h2><div class="kv"><span><b>' + list.length + '</b> Gegner gespeichert</span><span>am Tisch <b>' + act.length + '</b></span><span>im Archiv <b>' + arc.length + '</b></span><span>Speicher: ' + where + '</span></div>' +
    '<div class="toolbar"><div class="seg" role="group" aria-label="Liste"><button type="button" data-gtab="aktiv" aria-pressed="' + (gstate.tab === 'aktiv') + '">Am Tisch</button><button type="button" data-gtab="archiv" aria-pressed="' + (gstate.tab === 'archiv') + '">Archiv</button><button type="button" data-gtab="alle" aria-pressed="' + (gstate.tab === 'alle') + '">Alle</button></div>' +
    '<input type="search" id="gq" placeholder="Name filtern" aria-label="Name filtern"><select id="gt" aria-label="Spielertyp"><option value="">alle Typen</option>' + ['unbekannt', 'sehr loose', 'loose-passiv', 'Nit', 'LAG', 'TAG'].map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select>' +
    '<select id="gs" aria-label="Sortierung"><option value="last">zuletzt gesehen</option><option value="hands">meiste Hände</option><option value="name">Name</option></select></div>' +
    '<div class="toolbar"><button class="btn" type="button" data-g="export">Datenbank exportieren</button><button class="btn" type="button" data-g="import">Datenbank importieren</button><span class="small">Import akzeptiert Dateien aus Entwurf 2 (Version 1) und PokerTrainer 2.0 (Version 2).</span></div>' +
    '<div class="scroll" id="glist"></div></div>';
  $('gq').value = gstate.q; $('gt').value = gstate.typ; $('gs').value = gstate.sort;
  function draw() {
    var rows = (gstate.tab === 'aktiv' ? act : gstate.tab === 'archiv' ? arc : list).filter(function (r) { return (!gstate.q || r.name.toLowerCase().indexOf(gstate.q.toLowerCase()) >= 0) && (!gstate.typ || PT.stats.playerType(r) === gstate.typ); });
    rows.sort(function (a, b) { return gstate.sort === 'hands' ? b.hands - a.hands : gstate.sort === 'name' ? (a.name < b.name ? -1 : 1) : b.lastSeen - a.lastSeen; });
    var V = function (x) { return x == null ? 'unbekannt' : x + ' %'; };
    $('glist').innerHTML = rows.length ? '<table class="grid"><thead><tr><th>Name</th><th class="n">Hände</th><th class="n">VPIP</th><th class="n">PFR</th><th class="n">3-Bet</th><th class="n">AF</th><th class="n">C-Bet</th><th class="n">WTSD</th><th>Typ</th><th>Belastbarkeit</th><th>zuletzt</th></tr></thead><tbody>' +
      rows.slice(0, 400).map(function (r) {
        var p = PT.stats.profile(r), af = p.af;
        return '<tr class="click" tabindex="0" data-opp="' + esc(r.id) + '"><td>' + esc(r.name) + '</td><td class="n">' + r.hands + '</td><td class="n">' + V(p.vpip) + '</td><td class="n">' + V(p.pfr) + '</td><td class="n">' + V(p.threeBet) + '</td><td class="n">' + (af == null ? 'unbekannt' : af === Infinity ? '∞' : num(af)) +
          '</td><td class="n">' + V(p.cbetFlop) + '</td><td class="n">' + V(p.wtsd) + '</td><td>' + esc(p.typ) + '</td><td>' + esc(p.bel) + '</td><td>' + esc(H.dateTxt(r.lastSeen)) + '</td></tr>';
      }).join('') + '</tbody></table>' + (rows.length > 400 ? '<p class="muted">' + (rows.length - 400) + ' weitere Einträge, bitte filtern.</p>' : '') : '<p class="muted">Keine Einträge.</p>';
  }
  draw();
  $('gq').addEventListener('input', function () { gstate.q = $('gq').value; draw(); });
  $('gt').addEventListener('change', function () { gstate.typ = $('gt').value; draw(); });
  $('gs').addEventListener('change', function () { gstate.sort = $('gs').value; draw(); });
  el.onclick = function (e) {
    var t = e.target.closest('[data-gtab]'); if (t) { gstate.tab = t.getAttribute('data-gtab'); views.gegner(el); return; }
    var r = e.target.closest('[data-opp]'); if (r) { PTUI.showOpp(r.getAttribute('data-opp')); return; }
    var g = e.target.closest('[data-g]'); if (!g) return;
    if (g.getAttribute('data-g') === 'export') { var txt = PT.stats.dbExport(S.db, new Date().toISOString()); H.download('PokerTrainer_Datenbank_' + H.today() + '.json', txt); H.toast('Datenbank mit ' + list.length + ' Gegnern exportiert.'); }
    else pickFile(function (text, name) { importText(text, name, 'db'); });
  };
  el.onkeydown = function (e) { var r = e.target.closest('tr[data-opp]'); if (r && e.key === 'Enter') r.click(); };
};
function pickFile(cb) {
  if (S.hand && !S.hand.done) { H.toast('Import ist nur zwischen zwei Händen möglich.'); return; }
  var f = $('fileIn'); f.value = '';
  f.onchange = function () {
    var file = f.files && f.files[0]; if (!file) return;
    if (file.size > 60 * 1024 * 1024) { H.openModal('Import abgelehnt', '<p>Die Datei ist zu groß.</p>'); return; }
    var rd = new FileReader();
    rd.onload = function () { cb(String(rd.result || ''), file.name); };
    rd.onerror = function () { H.openModal('Import abgelehnt', '<p>Die Datei konnte nicht gelesen werden. Die bestehenden Daten bleiben unverändert.</p>'); };
    rd.readAsText(file);
  };
  f.click();
}
function importText(text, fname, expect) {
  var r = PT.stats.dbImport(text);
  if (!r.ok) { H.openModal('Import abgelehnt', '<p>' + esc(r.error) + '</p><p>Die bestehenden Daten bleiben unverändert.</p>'); return; }
  var what = r.kind === 'backup' ? 'eine vollständige Sicherung mit ' + r.count + ' Gegnern' + (r.hands ? ', ' + r.hands.length + ' Händen' : '') + (r.learning ? ' und Lerndaten' : '') : r.count + ' Gegner' + (r.migrated ? ' (Format aus Entwurf 2, wird umgewandelt)' : '');
  H.openModal('Import bestätigen', '<p>Die Datei <b>' + esc(fname) + '</b> ist unbeschädigt und enthält ' + esc(what) + '.</p><p>Die aktuellen Daten werden ersetzt. Vorher wird automatisch eine Sicherung der aktuellen Daten heruntergeladen.</p>' +
    '<div class="btnrow"><button class="btn primary2" type="button" id="impOk">Importieren</button><button class="btn" type="button" id="impNo">Abbrechen</button></div>');
  $('impNo').onclick = H.closeModal;
  $('impOk').onclick = function () {
    if (S.hand && !S.hand.done) { H.closeModal(); H.toast('Import ist nur zwischen zwei Händen möglich.'); return; }
    var btn = $('impOk'); btn.disabled = true; btn.textContent = 'Sichere aktuelle Daten …';
    var newProf = null;
    try { if (r.kind === 'backup' && r.learning) newProf = PT.training.profile(r.learning); }
    catch (e) { H.openModal('Import abgelehnt', '<p>Die Lerndaten der Datei lassen sich nicht auswerten.</p><p>Die bestehenden Daten bleiben unverändert.</p>'); return; }
    // Erst wenn die Sicherung der bisherigen Daten fertig erzeugt ist, werden die Daten ersetzt.
    backupNow('vor-Import').then(applyImport, function () { H.openModal('Import abgebrochen', '<p>Die Sicherung der aktuellen Daten ist fehlgeschlagen. Es wurde nichts geändert.</p>'); });
  };
  function applyImport() {
    S.db = r.db;
    var p = [];
    if (r.kind === 'backup') {
      if (r.hero) S.heroRec = r.hero;
      if (r.learning) { S.learning = r.learning; S.prof = newProf; p.push(PTUI.persistLearning()); }
      if (r.hands && r.hands.length) p.push(Store.clear('hands').then(function () { return Store.put('hands', r.hands.slice(-3000)); }));
    }
    PT.session.syncStatuses(S.table, S.db);
    p.push(PTUI.persistAllOpps(), PTUI.persist([]));
    Promise.all(p).then(function () { H.closeModal(); H.toast('Import abgeschlossen: ' + r.count + ' Gegner übernommen.'); PTUI.route(); });
  }
}
function backupNow(tag) {
  return Store.all('hands').then(function (hands) {
    var txt = PT.stats.backupExport({ opponents: PT.stats.dbList(S.db), hero: S.heroRec, hands: hands, learning: S.learning, settings: S.settings, table: S.table }, new Date().toISOString());
    H.download('Sicherung_PokerTrainer_' + H.today() + (tag ? '_' + tag : '') + '_Datenbank.json', txt);
  });
}
PTUI.backupNow = backupNow;

// ---------- Fortschritt ----------
views.fortschritt = function (el) {
  var prof = S.prof = PT.training.profile(S.learning), all = prof.all, L = S.learning;
  Store.all('hands').then(function (hands) {
    var normal = hands.filter(function (h) { return !h.training; }), bb = S.table.cfg.bb;
    var res = normal.map(function (h) { return h.heroNet / h.bb; }), n = res.length, m = n ? res.reduce(function (a, b) { return a + b; }, 0) / n : 0;
    var sd2 = n > 1 ? Math.sqrt(res.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (n - 1)) : 0, ci = n > 1 ? 1.96 * sd2 / Math.sqrt(n) * 100 : null;
    var goals = PT.training.goalStatus(L, prof);
    var catRows = Object.keys(prof.cats).sort(function (a, b) { return prof.cats[b] - prof.cats[a]; }).slice(0, 8);
    var html = '<div class="panel"><h2>Persönlicher Lernfortschritt</h2><p class="small">Bewertet wird die Qualität deiner Entscheidungen zum Entscheidungszeitpunkt, nicht das Spielgeld-Ergebnis. Kurzfristig positive Ergebnisse sind kein Beweis für gutes Spiel.</p>' +
      '<div class="grid3">' +
      tile(hands.length, 'gespeicherte Hände (' + normal.length + ' am Tisch, ' + (hands.length - normal.length) + ' Training)') +
      tile(all.n, 'bewertete Entscheidungen') +
      tile(n0(all.smooth), 'Entscheidungsqualität (0–100' + (all.ci != null ? ', ± ' + n0(all.ci) : '') + ')', scoreColor(all.smooth)) +
      tile(num(all.loss, 2) + ' BB', 'Ø geschätzter EV-Verlust je Entscheidung (gesamt ' + num(all.lossSum, 1) + ' BB)') +
      tile(prof.trend ? (prof.trend.diff >= 0 ? '+' : '') + num(prof.trend.diff, 1) : '–', prof.trend ? 'Veränderung: letzte ' + prof.trend.window + ' gegenüber den ' + prof.trend.window + ' davor' + (prof.trend.ci != null ? ' (± ' + num(prof.trend.ci, 1) + ')' : '') : 'Trend ab 40 Entscheidungen', prof.trend && prof.trend.ci != null && Math.abs(prof.trend.diff) > prof.trend.ci ? (prof.trend.diff > 0 ? 'good' : 'bad') : '') +
      tile(esc(levelName(prof.level)), 'eingeschätzter Erfahrungsstand (steuert die automatische Erklärtiefe)') + '</div></div>';
    html += '<div class="grid2"><div class="panel"><h3>Entwicklung der Entscheidungsqualität</h3>' + spark(prof.sessions) + '<p class="small">Mittelwerte je Block aus 25 Entscheidungen.</p></div>' +
      '<div class="panel"><h3>Häufigste Fehlerkategorien</h3>' + (catRows.length ? '<table class="grid" style="table-layout:fixed"><tbody>' + catRows.map(function (c) { return '<tr><td>' + esc(PT.coach.MISTAKES[c] || c) + '</td><td class="n">' + prof.cats[c] + '</td><td style="width:40%">' + meterRaw(prof.cats[c] / Math.max(1, prof.cats[catRows[0]])) + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">Noch keine Fehler erfasst.</p>') + '</div></div>';
    html += '<div class="grid2"><div class="panel"><h3>Nach Position</h3>' + table3(PT.stats.POSITIONS.map(function (p) { return [p, prof.positions[p]]; })) + '</div>' +
      '<div class="panel"><h3>Nach Straße</h3>' + table3([0, 1, 2, 3].map(function (s) { return [PT.rules.STREET_NAME[s], prof.streets[s]]; })) + '</div></div>';
    html += '<div class="grid2"><div class="panel"><h3>Nach Situation</h3>' + table3(Object.keys(PT.coach.SPOTS).map(function (t) { return [PT.coach.SPOTS[t], prof.spots[t], t]; }), true) + '</div>' +
      '<div class="panel"><h3>Gegen Gegnertypen</h3>' + table3(Object.keys(prof.opptyp).map(function (t) { return [t, prof.opptyp[t]]; })) +
      '<h3>Lernziele</h3><ul>' + goals.map(function (g) { return '<li class="' + (g.ok ? 'good' : '') + '">' + (g.ok ? '✓ ' : '○ ') + esc(g.text) + ' – aktuell ' + (g.current == null ? '–' : num(g.current, 1)) + ' (' + g.n + ')</li>'; }).join('') + '</ul>' +
      '<h3>Wissensquiz</h3><p>' + esc(String(L.quiz.correct | 0)) + ' von ' + esc(String(L.quiz.n | 0)) + ' richtig' + (L.quiz.n ? ' (' + pct(L.quiz.correct / L.quiz.n) + ')' : '') + '</p></div></div>';
    html += '<div class="panel"><h3>Spielgeld-Ergebnis (getrennt von der Entscheidungsqualität)</h3><p>' + n + ' Hände am Tisch · Ergebnis ' + num(m * n, 1) + ' BB · ' + num(m * 100, 1) + ' BB/100' + (ci != null ? ' (95-%-Intervall ± ' + num(ci, 0) + ' BB/100)' : '') + '</p>' +
      '<p class="small">Bei No-Limit Hold\'em liegt die Standardabweichung typischerweise bei 80–120 BB je 100 Hände. Erst nach vielen tausend Händen sagt das Ergebnis etwas über die Spielstärke aus.</p></div>';
    el.innerHTML = html;
    el.onclick = function (e) { var b = e.target.closest('[data-train]'); if (b) PTUI.startTraining(b.getAttribute('data-train')); };
  });
  el.innerHTML = '<p class="muted">Lade …</p>';
};
function levelName(l) { return { einsteiger: 'Einsteiger', fortgeschritten: 'Fortgeschritten', experte: 'Experte' }[l] || l; }
function tile(v, label, cls) { return '<div class="box stattile"><b class="' + (cls || '') + '">' + v + '</b><span>' + label + '</span></div>'; }
function meterRaw(f) { return '<div class="meter warn"><i style="width:' + Math.round(100 * Math.max(0, Math.min(1, f))) + '%"></i></div>'; }
function table3(rows, train) {
  return '<div class="scroll"><table class="grid"><thead><tr><th></th><th class="n">n</th><th class="n">Qualität</th><th class="n">Ø EV-Verlust</th>' + (train ? '<th></th>' : '') + '</tr></thead><tbody>' + rows.map(function (r) {
    var s = r[1] || { n: 0 };
    return '<tr><td>' + esc(r[0]) + '</td><td class="n">' + s.n + '</td><td class="n ' + scoreColor(s.n >= 5 ? s.smooth : null) + '">' + (s.n ? n0(s.smooth) : '–') + '</td><td class="n">' + (s.n ? num(s.loss, 2) + ' BB' : '–') + '</td>' + (train ? '<td><button class="btn" type="button" data-train="' + r[2] + '">Training</button></td>' : '') + '</tr>';
  }).join('') + '</tbody></table></div>';
}
function spark(blocks) {
  if (!blocks || blocks.length < 2) return '<p class="muted">Ab 50 bewerteten Entscheidungen erscheint hier der Verlauf.</p>';
  var W = 600, Hh = 80, xs = blocks.map(function (b, i) { return 10 + i * (W - 20) / (blocks.length - 1); });
  var ys = blocks.map(function (b) { return Hh - 6 - (Math.max(0, Math.min(100, b.score)) / 100) * (Hh - 12); });
  var d = xs.map(function (x, i) { return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + ys[i].toFixed(1); }).join(' ');
  return '<svg class="spark" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Verlauf der Entscheidungsqualität"><line x1="0" x2="' + W + '" y1="' + (Hh - 6 - 0.75 * (Hh - 12)) + '" y2="' + (Hh - 6 - 0.75 * (Hh - 12)) + '" stroke="currentColor" stroke-opacity=".2" stroke-dasharray="4 4"/><path d="' + d + '" fill="none" stroke="var(--call)" stroke-width="2.5"/>' +
    xs.map(function (x, i) { return '<circle cx="' + x.toFixed(1) + '" cy="' + ys[i].toFixed(1) + '" r="3" fill="var(--call)"><title>Entscheidungen ' + blocks[i].from + '–' + blocks[i].to + ': ' + Math.round(blocks[i].score) + '</title></circle>'; }).join('') + '</svg>';
}

// ---------- Einstellungen ----------
views.einstellungen = function (el) {
  var c = S.table.cfg, st = S.settings, D = PT.session.DIFFICULTY;
  function opt(v2, t, cur) { return '<option value="' + v2 + '"' + (String(cur) === String(v2) ? ' selected' : '') + '>' + t + '</option>'; }
  var blinds = [[25, 50], [50, 100], [100, 200], [200, 500]];
  el.innerHTML = '<div class="grid2"><div class="panel"><h2>Tisch und Spielbedingungen</h2><form class="form" id="fTable">' +
    '<div class="row"><label for="sBl">Blinds</label><select id="sBl">' + blinds.map(function (b) { return opt(b[0] + '/' + b[1], fmt(b[0]) + ' / ' + fmt(b[1]), c.sb + '/' + c.bb); }).join('') + '</select></div>' +
    '<div class="row"><label for="sSt">Startstack (BB)</label><input id="sSt" type="number" min="10" max="1000" value="' + c.startBB + '"></div>' +
    '<div class="row"><label for="sRb">Automatischer Nachkauf unter (BB)</label><input id="sRb" type="number" min="0" max="1000" step="1" value="' + c.rebuyBelowBB + '"><div class="hint">Unter diesem Stack wird vor der nächsten Hand auf den Startstack aufgefüllt (0 = nur bei 0).</div></div>' +
    '<div class="row"><label for="sTu">Immer auf Startstack auffüllen</label><input id="sTu" type="checkbox"' + (c.topUp ? ' checked' : '') + '></div>' +
    '<div class="row"><label for="sDf">Schwierigkeit / Teilnehmerfeld</label><select id="sDf">' + Object.keys(D).map(function (k) { return opt(k, D[k].name, c.difficulty); }).join('') + '</select><div class="hint">Die Schwierigkeit ändert nur, welche Gegnertypen am Tisch sitzen – nie die Kartenverteilung.</div></div>' +
    '<div class="row"><label for="sSw">Gegnerwechsel alle (Hände)</label><input id="sSw" type="number" min="0" max="10000" value="' + c.swapEvery + '"></div>' +
    '<div class="row"><label for="sRk">Simulierter Rake</label><input id="sRk" type="checkbox"' + (c.rake.on ? ' checked' : '') + '><div class="hint">Standardmäßig aus. Bei Aktivierung wird er vom Pot abgezogen.</div></div>' +
    '<div class="row"><label for="sRp">Rake-Anteil (%)</label><input id="sRp" type="number" min="0" max="10" step="0.5" value="' + (c.rake.pct * 100) + '"></div>' +
    '<div class="row"><label for="sRc">Rake-Obergrenze (BB)</label><input id="sRc" type="number" min="0" max="20" step="0.5" value="' + c.rake.capBB + '"></div>' +
    '<div class="row"><label for="sSeed">Startwert (Seed, optional)</label><input id="sSeed" type="text" inputmode="numeric" value="' + (st.seed != null ? st.seed : '') + '" placeholder="zufällig"><div class="hint">Gleicher Seed + gleiche Aktionen = gleicher Spielverlauf (auch mit Coach an oder aus).</div></div>' +
    '<div class="btnrow"><button class="btn primary2" type="button" id="sApply">Neue Session mit diesen Bedingungen</button></div><p class="small">Eine neue Session setzt Stacks und Tisch zurück. Gegnerdatenbank, Handhistorie und Lernfortschritt bleiben erhalten.</p></form></div>' +
    '<div class="panel"><h2>Coach, Ansicht und Sprache</h2><form class="form" id="fCoach">' +
    '<div class="row"><label for="cTm">Tipp-Modus</label><select id="cTm">' + opt('vorher', 'vorher', st.tipMode) + opt('nachher', 'nachher', st.tipMode) + opt('aus', 'aus', st.tipMode) + '</select></div>' +
    '<div class="row"><label for="cSm">Strategiemodus</label><select id="cSm">' + opt('exploit', 'Exploitativ (nutzt Gegnerwerte)', st.smode) + opt('gto', 'Gleichgewichtsnah (ausgewogenes Modell)', st.smode) + '</select></div>' +
    '<div class="row"><label for="cDp">Erklärtiefe</label><select id="cDp">' + opt('auto', 'automatisch (nach Lernstand)', st.depth) + opt('einsteiger', 'Einsteiger', st.depth) + opt('fortgeschritten', 'Fortgeschritten', st.depth) + opt('experte', 'Experte', st.depth) + '</select></div>' +
    '<div class="row"><label for="cLv">Analysegenauigkeit</label><select id="cLv">' + ['schnell', 'standard', 'praezise', 'tief'].map(function (k) { return opt(k, PT.equity.LEVELS[k].name, st.level); }).join('') + '</select><div class="hint">Der automatische Tipp am Tisch rechnet immer mit höchstens 5.000 Simulationen je Entscheidung (Schnell oder Standard). Präzise und Tiefenanalyse gelten für die Schaltfläche „Tiefenanalyse“ und die Nachanalyse im Replayer.</div></div>' +
    '<div class="row"><label for="cSp">Spielgeschwindigkeit</label><select id="cSp">' + opt('langsam', 'langsam', st.speed) + opt('normal', 'normal', st.speed) + opt('schnell', 'schnell', st.speed) + opt('sehrschnell', 'sehr schnell', st.speed) + '</select></div>' +
    '<div class="row"><label for="cAd">Erweiterte Analyseansicht</label><input id="cAd" type="checkbox"' + (st.advanced ? ' checked' : '') + '></div>' +
    '<div class="row"><label for="cTh">Darstellung</label><select id="cTh">' + opt('auto', 'automatisch', st.theme) + opt('light', 'hell', st.theme) + opt('dark', 'dunkel', st.theme) + '</select></div>' +
    '<div class="row"><label for="cFc">Vierfarbiges Deck</label><input id="cFc" type="checkbox"' + (st.fourColor ? ' checked' : '') + '></div>' +
    '<div class="row"><label for="cSo">Sprachausgabe</label><input id="cSo" type="checkbox"' + (st.speech ? ' checked' : '') + '></div>' +
    '<div class="row"><label for="cSr">Sprechtempo</label><input id="cSr" type="range" min="0.7" max="1.5" step="0.05" value="' + st.speechRate + '"></div>' +
    '<div class="row"><label for="cRh">Hände speichern</label><input id="cRh" type="checkbox"' + (st.recordHands ? ' checked' : '') + '></div></form></div></div>' +
    '<div class="panel"><h2>Daten</h2><p class="small">Alle Daten liegen nur in diesem Browser (' + (Store.mode() === 'idb' ? 'IndexedDB' : Store.mode() === 'ls' ? 'localStorage' : 'nur im Arbeitsspeicher') + '). Andere Browser oder Geräte haben eigene, getrennte Daten.</p>' +
    '<div class="btnrow"><button class="btn" type="button" id="dBk">Vollständige Sicherung exportieren</button><button class="btn" type="button" id="dIm">Sicherung importieren</button><button class="btn danger" type="button" id="dDel">Alle Daten löschen</button></div></div>';
  function onT(id, fn) { $(id).addEventListener('change', fn); }
  onT('cTm', function () { PTUI.setSetting('tipMode', $('cTm').value); });
  onT('cSm', function () { PTUI.setSetting('smode', $('cSm').value); });
  onT('cDp', function () { PTUI.setSetting('depth', $('cDp').value); });
  onT('cLv', function () { PTUI.setSetting('level', $('cLv').value); });
  onT('cSp', function () { PTUI.setSetting('speed', $('cSp').value); });
  onT('cAd', function () { PTUI.setSetting('advanced', $('cAd').checked); });
  onT('cTh', function () { PTUI.setSetting('theme', $('cTh').value); });
  onT('cFc', function () { PTUI.setSetting('fourColor', $('cFc').checked); });
  onT('cSo', function () { PTUI.setSetting('speech', $('cSo').checked); });
  onT('cSr', function () { PTUI.setSetting('speechRate', +$('cSr').value); });
  onT('cRh', function () { PTUI.setSetting('recordHands', $('cRh').checked); });
  $('sApply').addEventListener('click', function () {
    if (S.hand && !S.hand.done) { H.toast('Bitte erst die laufende Hand beenden.'); return; }
    var bl = $('sBl').value.split('/').map(Number), cfg = PT.session.defaultConfig();
    cfg.sb = bl[0]; cfg.bb = bl[1]; cfg.startBB = Math.max(10, Math.min(1000, Math.round(+$('sSt').value || 100)));
    cfg.rebuyBelowBB = Math.max(0, Math.min(1000, +$('sRb').value || 0)); cfg.topUp = $('sTu').checked;
    cfg.difficulty = $('sDf').value; cfg.swapEvery = Math.max(0, Math.min(10000, Math.round(+$('sSw').value || 0)));
    cfg.rake = { on: $('sRk').checked, pct: Math.max(0, Math.min(0.1, (+$('sRp').value || 0) / 100)), capBB: Math.max(0, Math.min(20, +$('sRc').value || 0)), nfnd: true };
    var seedTxt = $('sSeed').value.trim(), seed = /^\d{1,10}$/.test(seedTxt) ? (+seedTxt >>> 0) : null;
    if (!PT.session.validConfig(cfg)) { H.toast('Ungültige Einstellungen.'); return; }
    S.settings.seed = seed;
    S.table = PT.session.newTable(cfg, S.db, seed);
    S.hand = null; S.training = null;
    PTUI.persist([]).then(function () { H.toast('Neue Session gestartet.'); location.hash = '#tisch'; });
  });
  $('dBk').addEventListener('click', function () { backupNow('').then(function () { H.toast('Sicherung exportiert.'); }); });
  $('dIm').addEventListener('click', function () { pickFile(function (t, n) { importText(t, n, 'backup'); }); });
  $('dDel').addEventListener('click', function () {
    H.openModal('Alle Daten löschen?', '<p>Gegnerdatenbank, Handhistorie, Lernfortschritt und Einstellungen in diesem Browser werden <b>unwiderruflich gelöscht</b>. Vorher wird eine Sicherung heruntergeladen.</p><div class="btnrow"><button class="btn danger" type="button" id="delOk">Endgültig löschen</button><button class="btn" type="button" id="delNo">Abbrechen</button></div>');
    $('delNo').onclick = H.closeModal;
    $('delOk').onclick = function () {
      backupNow('vor-Loeschen').then(function () { return Store.clearAll(); }).then(function () { location.hash = '#tisch'; location.reload(); });
    };
  });
};

// ---------- Hilfe ----------
views.hilfe = function (el, arg) {
  var G = PT.glossary, keys = Object.keys(G).sort(function (a, b) { return a.localeCompare(b, 'de'); });
  el.innerHTML = '<div class="grid2"><div class="panel" id="h-start"><h2>Kurzanleitung</h2><ol><li>Am Tisch „Nächste Hand“ wählen. Du sitzt unten, fünf Computergegner um dich herum.</li><li>Bist du am Zug, zeigt der Coach im Modus „vorher“ seine Empfehlung mit Begründung, Equity, benötigter Equity (Pot Odds) und EV-Vergleich.</li>' +
    '<li>Im Modus „nachher“ siehst du erst nach deiner Aktion eine Bewertung von „Optimal“ bis „Schwerer Fehler“.</li><li>Ein Klick auf einen Gegner zeigt alle Werte aus der Datenbank. Nach jeweils 30 Händen wechselt ein Gegner; sein Datensatz bleibt im Archiv.</li>' +
    '<li>Unter „Training“ übst du gezielt Situationen, unter „Handhistorie“ spielst du Hände nach und triffst Entscheidungen erneut.</li></ol></div>' +
    '<div class="panel" id="h-tasten"><h2>Tastatur</h2><table class="grid"><tbody>' + [['F', 'Fold'], ['C oder K', 'Check / Call'], ['R oder B', 'Betrag eingeben (Enter bestätigt)'], ['1 – 9', 'Einsatz-Presets'], ['A', 'All-in-Preset'], ['N, Enter, Leertaste', 'Nächste Hand'], ['T', 'Tipp-Modus wechseln'], ['Esc', 'Dialog schließen'], ['?', 'Diese Hilfe']].map(function (r) { return '<tr><td><kbd>' + r[0] + '</kbd></td><td>' + r[1] + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
    '<div class="panel" id="h-regeln"><h2>Regeln (No-Limit Hold\'em, Cash Game)</h2><ul>' +
    '<li><b>Mindest-Bet</b> ist ein Big Blind. Ein <b>Raise</b> muss mindestens um den größten vollen Bet oder Raise der laufenden Setzrunde erhöhen. Beträge sind immer „Raise auf“ (Gesamteinsatz der Straße).</li>' +
    '<li><b>Unvollständiger All-in-Raise:</b> Ein All-in unter einem vollen Raise eröffnet die Setzrunde für Spieler, die schon gehandelt haben, nicht wieder – sie dürfen nur callen oder folden. Ergeben mehrere kurze All-ins zusammen mindestens einen vollen Raise gegenüber dem eigenen letzten Einsatz, ist die Runde wieder eröffnet (Cash-Game-Regel nach Robert\'s Rules of Poker). Der nächste Mindest-Raise bleibt der letzte volle Raise.</li>' +
    '<li><b>Nicht gecallte Einsätze</b> gehen am Ende der Setzrunde an den Spieler zurück.</li><li><b>Side Pots:</b> Ein All-in-Spieler kann nur den Teil gewinnen, zu dem er selbst beigetragen hat. Gefoldete Spieler gewinnen nie.</li>' +
    '<li><b>Split Pot und Odd Chip:</b> Gleich starke Hände teilen; ein nicht teilbarer Cent geht an den ersten Gewinner links vom Button.</li><li>Am Showdown werden alle verbliebenen Hände aufgedeckt (Trainingsregel, damit mehr Material für die Datenbank entsteht).</li>' +
    '<li>Fällt ein Stack unter die Nachkaufgrenze, wird vor der nächsten Hand automatisch auf den Startstack nachgekauft (nur Spielgeld).</li></ul></div>' +
    '<div class="panel" id="h-methoden"><h2>Wie der Coach rechnet</h2><ul>' +
    '<li><b>Ranges:</b> 1.326 Kombinationen je Gegner, aus Faustregel-Charts und den geglätteten Werten der Datenbank. Nach jeder Aktion werden die Gewichte nach Bayes aktualisiert. Der Coach kennt keine verdeckten Karten.</li>' +
    '<li><b>Equity:</b> exakt aufgezählt, wo es schnell genug geht (Heads-up auf Flop, Turn und River), sonst Monte-Carlo mit Standardfehler und 95-%-Intervall. Getrennt davon wird angezeigt, wie stark die Equity von der Range-Annahme abhängt.</li>' +
    '<li><b>EV:</b> je Aktion und Einsatzgröße, mit Fold-, Call- und Raise-Wahrscheinlichkeiten je Gegner, Multiway über alle Kombinationen von Callern, Side-Pot-Berechtigung und Equity Realization für spätere Straßen. Alle EV-Werte sind Modellschätzungen.</li>' +
    '<li><b>Gleichgewichtsnah</b> nutzt ein ausgewogenes Gegnermodell (MDF, Faustregel-Charts) und auf dem River zusätzlich ein vereinfachtes Modellspiel, das mit CFR+ gelöst wird. Das ist kein vollständiger GTO-Solver.</li>' +
    '<li><b>Bewertung</b> deiner Aktion: EV-Verlust gegenüber der besten Aktion, verglichen mit der Unsicherheit der Schätzung. Das spätere Ergebnis der Hand spielt keine Rolle.</li></ul></div>' +
    '<div class="panel" id="h-glossar"><h2>Glossar</h2><dl>' + keys.map(function (k) { return '<dt><b>' + esc(k) + '</b></dt><dd>' + esc(G[k]) + '</dd>'; }).join('') + '</dl></div>' +
    '<div class="panel" id="h-datenschutz"><h2>Datenschutz &amp; Rechtliches</h2>' +
    '<p>Der PokerTrainer ist ein privates, nicht-kommerzielles Trainingsprojekt ohne Werbung, ohne Konten und ohne Zahlungsfunktionen. Gespielt wird ausschließlich mit virtuellem Spielgeld ohne Geldwert – es ist kein Glücksspiel.</p>' +
    '<p><b>Lokale Daten:</b> Gegnerdatenbank, Handhistorie, Lernfortschritt und Einstellungen werden nur in deinem Browser gespeichert (IndexedDB). Sie werden nicht übertragen. Du kannst sie jederzeit exportieren, importieren und löschen (Einstellungen → Daten). Die Speicherung ist für die Funktion der App erforderlich.</p>' +
    '<p><b>Keine Tracker:</b> Keine Cookies, keine Analysewerkzeuge, keine externen Schriften oder Bibliotheken, keine Verbindungen zu Drittanbietern. Die gesamte Berechnung läuft lokal.</p>' +
    '<p><b>Hosting:</b> Die Website wird über GitHub Pages (GitHub, Inc., USA) ausgeliefert. Beim Abruf verarbeitet GitHub technisch bedingt Verbindungsdaten wie die IP-Adresse und protokolliert sie laut eigener Angabe zu Sicherheitszwecken. Details: <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener noreferrer">GitHub-Datenschutzerklärung</a>.</p>' +
    '<p>Ausführlich: Datei PRIVACY.md im Quellcode-Repository.</p></div>' +
    '<div class="panel" id="h-version"><h2>Version</h2><p>PokerTrainer ' + esc(PT.VERSION) + ' (' + esc(PT.BUILD) + ') · Analyse im ' + esc(PTUI.Analyzer.mode()) + ' · Speicher: ' + esc(Store.mode()) + '</p><p class="small">Quellcode und Änderungsprotokoll: <a href="https://github.com/milkiasasmarome-eng/pokertrainer" rel="noopener noreferrer">github.com/milkiasasmarome-eng/pokertrainer</a></p></div>';
  if (arg) { var t = document.getElementById('h-' + arg); if (t) setTimeout(function () { t.scrollIntoView({ block: 'start' }); }, 0); }
};
})();
