/* Ulipsu Digital Project runtime: fixed 1920x1080 shell, state + resume, 3-attempt scoring, narration, LMS submit, certificate view.
   Classic script, offline, no eval. A project calls DP.run(cfg): {C, guide(), scenes[], data(S), dataKey(S), chain(S,D), reviewHtml, certPages[], pdf(pdf,S,D), reportHtml(S,D)}. */
'use strict';
(function () {
var C, CFG, LMS = window.LmsAdapter, S, D = null, DK = '', T = { k: 1, busy: false, cT: [] }, SC = [], ALL = [], KEY, mem = null;
var FR = [1, 0.7, 0.1];
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function uid() { try { var a = new Uint8Array(8); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); } catch (e) { return Math.random().toString(16).slice(2, 10) + Date.now().toString(16); } }
function lsGet() { try { return localStorage.getItem(KEY); } catch (e) { return mem; } }
function lsSet(v) { try { localStorage.setItem(KEY, v); } catch (e) { mem = v; } } // DP-405: a storage failure never blocks progress // DP-405: a storage failure never blocks progress
function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

/* ---------- state, scoring ---------- */
function fresh() { return { v: 1, attemptId: uid(), learnerId: null, name: '', seed: '', startedAt: new Date().toISOString(), step: 0, sound: false, voice: true, items: {}, x: {}, submitted: false, final: null, rp: 0 }; }
function save() { if (T.wipe) return; lsSet(JSON.stringify(S)); LMS.saveState(S); try { LMS.setProgress(progressPct()); } catch (e) {} }
function def(id) { return C.items.filter(function (x) { return x.id === id; })[0]; }
function it(id) { return S.items[id] || (S.items[id] = { a: 0, done: false, ok: false, rev: false, frac: null, resp: null }); }
function maxA(id) { return Math.min(3, (def(id).opts || 99) - 1); } // DP-802
function left(id) { return maxA(id) - it(id).a; }
function done(id) { return !!(S.items[id] && S.items[id].done); }
function started() { return Object.keys(S.items).some(function (k) { return S.items[k].a > 0; }); }
function allDone() { return C.items.every(function (d) { return done(d.id); }); }
function attempt(id, ok, resp) {
  var s = it(id); if (s.done) return s; s.a++; s.resp = resp;
  if (ok) { s.done = true; s.ok = true; s.frac = FR[s.a - 1]; } else if (s.a >= maxA(id)) { s.done = true; s.ok = false; s.rev = true; s.frac = 0.1; }
  save(); return s;
}
function score() { var pct = 0; C.items.forEach(function (d) { var s = S.items[d.id]; pct += d.w * (s && s.done ? s.frac : 0); }); pct = Math.round(pct * 10) / 10; var pts = Math.floor(pct * 10 + 0.5); return { percent: pct, points: pts, rank: Math.floor(pts / 10 + 0.5) }; }
function firstTry() { return C.items.filter(function (d) { var s = S.items[d.id]; return s && s.ok && s.a === 1; }).length; }
function progressPct() { return Math.round(C.items.filter(function (d) { return done(d.id); }).length / C.items.length * 100); }
function how(id) { var s = it(id); return s.rev ? 'Answer shown' : s.a === 1 ? 'Right on the 1st try' : 'Right on try ' + s.a; }

/* ---------- sound effects (muted by default, DP-508) and narration (DP-516) ---------- */
var AC = null;
function beep(f, d, type, when, vol) { if (!S.sound) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); var o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'sine'; o.frequency.value = f; o.connect(g); g.connect(AC.destination); var t = AC.currentTime + (when || 0); g.gain.setValueAtTime(vol || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.start(t); o.stop(t + d + 0.02); } catch (e) {} }
var SFX = { tap: function () { beep(520, 0.06); },
  ok: function () { [[784, 0], [988, 0.09], [1175, 0.18], [1568, 0.3]].forEach(function (n) { beep(n[0], 0.34, 'sine', n[1], 0.11); beep(n[0] * 2, 0.2, 'triangle', n[1], 0.03); }); }, // bright rising chime for a correct answer
  bad: function () { beep(196, 0.18, 'triangle', 0, 0.07); beep(165, 0.3, 'triangle', 0.14, 0.07); },
  done: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { beep(f, 0.22, 'sine', i * 0.12, 0.1); }); } };

/* ---------- stage ---------- */
function fitStage() { var w = window.innerWidth, h = window.innerHeight, k = Math.min(w / 1920, h / 1080); T.k = k; $('#stage').style.transform = 'translate(' + (w - 1920 * k) / 2 + 'px,' + (h - 1080 * k) / 2 + 'px) scale(' + k + ')'; $('#rot').hidden = !(h > w); }
function stagePt(ev) { var r = $('#stage').getBoundingClientRect(); return { x: (ev.clientX - r.left) / T.k, y: (ev.clientY - r.top) / T.k }; }
function showLayer(html, cls) { $$('.cspot').forEach(function (e) { e.classList.remove('cspot'); }); hideHand(); var l = $('#layer'); l.innerHTML = '<div class="box ' + (cls || '') + '" role="dialog">' + html + '</div>'; l.hidden = false; var b = $('button, textarea', l); if (b) b.focus(); }
function hideLayer() { $('#layer').hidden = true; $('#layer').innerHTML = ''; }

/* ---------- scenes and navigation ---------- */
function rebuild() { SC = ALL.filter(function (sc) { return !CFG.filter || CFG.filter(S, sc); }); if (CFG.sync) CFG.sync(S); } // the scene list and scored items follow the chosen mission
function cur() { return SC[S.step]; }
function go(i) { S.step = Math.max(0, Math.min(i, SC.length - 1)); save(); render(); try { if (window.UlipsuBridge) UlipsuBridge.saveProgress(); } catch (e) {} }
function ensureData() { var k = CFG.dataKey(S); if (k && k !== DK) { DK = k; D = CFG.data(S); } else if (!k) { D = null; DK = ''; } return D; }
function journey() { return SC.filter(function (x) { return x.step; }); }
function header() {
  var J = journey(), idx = J.indexOf(cur()), fin = S.submitted, bar = '';
  J.forEach(function (sc, i) { var cls = fin || i < idx ? 'd' : i === idx ? 'o' : ''; bar += '<i class="' + cls + '" title="' + esc(sc.name) + '"></i>'; });
  $('#pbar').innerHTML = bar; $('#plabel').textContent = fin ? 'Completed' : cur().mis ? cur().mis.name + (cur().mis.solve ? ' · Solution' : cur().mis.task ? ' · Task ' + cur().mis.task + ' of ' + cur().mis.tasks : '') : idx >= 0 ? 'Step ' + (idx + 1) + ' of ' + J.length + ': ' + cur().name : cur().id === 'start' ? 'Welcome' : cur().name;
  $('#b-snd').classList.toggle('off', !S.sound);
  $('#b-snd').setAttribute('aria-pressed', S.sound);
  // v3: no Voice or Hear buttons; the guide always speaks
}
function render() {
  window.Coach.stop(); hideHand(); idleArm(); T.cT.forEach(clearTimeout); T.cT = []; (T.off || []).forEach(function (o) { o[0].removeEventListener(o[1], o[2]); }); T.off = []; clearTimeout(T.tm);
  var old = $('#content'), el = old.cloneNode(false); old.parentNode.replaceChild(el, old); ensureData(); header();
  K.solve = null; cur().render(el, K); chat(el); coachRun(false);
}
/* ---------- coach: character intro + a spoken "what to do" for every slide (plays once per slide; Help replays it) ---------- */
function coachLines(sc) {
  var cc = CFG.coach; if (!cc) return null;
  var J = journey(), idx = J.indexOf(sc), tot = J.length, ctx = { total: tot, names: J.map(function (x) { return x.name; }), C: C };
  var own = cc.scenes && cc.scenes[sc.id], L = own ? own.slice() : [], pre = 0;
  if (SC.indexOf(sc) === 0 && cc.intro) { var I = typeof cc.intro === 'function' ? cc.intro(ctx) : cc.intro; pre = I.length; L = I.concat(L); }
  if (!L.length) return null;
  L = L.map(function (l) { return typeof l === 'string' ? { t: l } : Object.assign({}, l); });
  if (sc.mis && L.length) { var lt = L[L.length - 1], m = sc.mis; lt.eb = m.name + ' \u00B7 ' + (m.solve ? 'Solution' : m.task ? 'Task ' + m.task + ' of ' + m.tasks : 'Set up') + (lt.skill ? ' \u00B7 ' + lt.skill : ''); }
  if (L.length) L.push({ ins: true, sid: sc.id }); // then the instruction that is already on the screen is read aloud (DP-516), not shown again
  return L;
}
function coachRun(force, after) {
  var sc = cur(), L = coachLines(sc);
  if (!L) { if (after) after(); return; }
  if (!force && S.cs && S.cs[sc.id]) return;
  window.Coach.play(L, { voice: true, 
    done: function () { S.cs = S.cs || {}; S.cs[sc.id] = 1; save(); idleArm(); if (after) after(); } });
}
function idleArm(ms) { // a child who pauses sees the hand by itself (no voice)
  clearTimeout(T.idleT); T.idleT = setTimeout(function () { if (!$('#layer').hidden || T.busy || window.Coach.active()) { idleArm(8000); return; } var m = $('#b-main'), c = cur().cue ? cur().cue() : null; cueRun(c || (!m.hidden && !m.disabled ? { tap: '#b-main' } : null)); idleArm(14000); }, ms || 4500);
}
function hideHand() { try { if (T.hA) T.hA.cancel(); } catch (e) {} T.hA = null; var h = $('#hand'); if (h) h.hidden = true; }
function cueRun(spec) { // same pointing hand as StoryDice: tap, tap-then-tap (seq), or drag
  hideHand(); if (!spec || K.reduced()) return; var st = $('#stage').getBoundingClientRect(), k = T.k;
  function pt(x) { if (x && x.x != null) return x; var e = typeof x === 'string' ? $(x) : x; if (!e) return null; var r = e.getBoundingClientRect(); return { x: (r.left + r.width / 2 - st.left) / k, y: (r.top + r.height / 2 - st.top) / k }; }
  var pts = [], fr = [], dur, low = false, tf;
  var seq = spec.seq || (spec.tap ? [spec.tap] : null), a, b;
  if (spec.drag) { a = pt(spec.drag.from); b = pt(spec.drag.to); if (!a || !b) return; pts = [a, b]; } else if (seq) { seq.forEach(function (s) { var q = pt(s); if (q) pts.push(q); }); if (!pts.length) return; } else return;
  pts.forEach(function (q) { if (q.y > 860) low = true; });
  tf = function (q, s) { return 'translate(' + (q.x - (low ? 27 : 63)) + 'px,' + (q.y - (low ? 96 : 8)) + 'px) scale(' + s + ')'; };  // v3: right hand; the fingertip is 63px from the left (27px when turned to point down)
  if (spec.drag) { dur = 2600; fr = [{ transform: tf(a, 1), opacity: 0, offset: 0 }, { transform: tf(a, 1), opacity: 1, offset: 0.12 }, { transform: tf(a, 0.82), opacity: 1, offset: 0.22 }, { transform: tf(b, 0.82), opacity: 1, offset: 0.7 }, { transform: tf(b, 1), opacity: 1, offset: 0.8 }, { transform: tf(b, 1), opacity: 0, offset: 1 }]; }
  else { dur = 1100 * pts.length + 500; fr.push({ transform: tf(pts[0], 1), opacity: 0, offset: 0 }); pts.forEach(function (q, i) { var s = i * 1100; fr.push({ transform: tf(q, 1), opacity: 0, offset: (s + 150) / dur }, { transform: tf(q, 1), opacity: 1, offset: (s + 350) / dur }, { transform: tf(q, 0.8), opacity: 1, offset: (s + 650) / dur }, { transform: tf(q, 1), opacity: 1, offset: (s + 900) / dur }, { transform: tf(q, 1), opacity: 0, offset: (s + 1050) / dur }); }); fr.push({ transform: fr[fr.length - 1].transform, opacity: 0, offset: 1 }); }
  var h = $('#hand'); h.hidden = false; if (!h.firstChild) h.innerHTML = '<img src="assets/img/hand.webp" alt="">'; h.className = low ? 'down' : ''; T.hA = h.animate(fr, { duration: dur, iterations: 2, easing: 'ease-in-out' }); T.hA.onfinish = hideHand;
}
function winOn(type, fn) { window.addEventListener(type, fn); (T.off = T.off || []).push([window, type, fn]); }
function setFoot(o) {
  var b = $('#b-back'), m = $('#b-main'); b.hidden = !!o.noBack || S.step === 0; m.hidden = !!o.noMain;
  m.className = 'btn ' + (o.cls || 'pri') + (o.en ? ' ready' : ''); m.textContent = o.main || 'Next'; m.disabled = !o.en;
  T.main = o.go; T.back = o.back || function () { go(S.step - 1); };
  var tr = $('#tries'); tr.innerHTML = o.tries != null ? o.tries : o.item && !done(o.item) ? triesHtml(o.item) : (o.st ? '<span class="line">' + esc(o.st) + '</span>' : '');
}
function pips(id) { var l = left(id), n = maxA(id), h = ''; for (var i = 0; i < n; i++) h += '<span class="pip ' + (i < l ? 'f' : 'e') + '" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></span>'; return h; }
function triesHtml(id) { var l = left(id); return '<span class="pips" aria-hidden="true">' + pips(id) + '</span><span class="line">' + l + (l === 1 ? ' try left. A wrong answer shows the answer.' : ' tries left. A wrong answer costs a star.') + '</span>'; }
function hintNow(id) { var s = it(id); return !s.done && (s.a > 1 || left(id) === 1); } // v3: before the last try the hint is shown as an action
function lostHtml(id) { return ''; } // v3: tries left are shown once, in the footer
function fb(kind, title, body) { // right/wrong is never colour alone (DP-504): icon + word; arrives like a chat message
  var e = $('#fb'); if (!e) return; var ic = { ok: 'M10 25 L21 36 L40 14', no: 'M13 13 L35 35 M35 13 L13 35', hint: 'M24 8 a10 10 0 0 1 6 18 v6 h-12 v-6 a10 10 0 0 1 6 -18 M19 38 h10', rev: 'M10 24 h28 M28 14 l10 10 -10 10' }[kind];
  var html = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="' + ic + '" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg><div><b>' + esc(title) + '</b> ' + body + '</div>';
  clearTimeout(T.fbT); e.hidden = false; e.className = 'fb ' + kind;
  if (K.reduced()) { e.innerHTML = html; return; }
  e.className = 'fb typing'; e.innerHTML = '<i></i><i></i><i></i>'; T.fbT = setTimeout(function () { e.className = 'fb in ' + kind; e.innerHTML = html; }, 650);
}

/* ---------- guide character with spoken line ---------- */
function guide(lines) { lines = [].concat(lines); return '<div class="guide"><div class="gface" aria-hidden="true">' + CFG.guide() + '</div><div class="gmsgs">' + lines.map(function (l) { return '<div class="gbub"><p>' + l + '</p></div>'; }).join('') + '</div></div>'; }
// messages arrive one after another with a typing pause (first visit to a screen only)
function chat(el) {
  var bs = $$('.gbub', el); T.seen = T.seen || {}; if (!bs.length || K.reduced() || T.seen[cur().id]) { T.seen[cur().id] = 1; return; } T.seen[cur().id] = 1;
  bs.forEach(function (b) { b.classList.add('wait'); }); var tt = 250;
  bs.forEach(function (b) { T.cT.push(setTimeout(function () { b.classList.remove('wait'); b.classList.add('typing'); }, tt)); tt += 750; T.cT.push(setTimeout(function () { b.classList.remove('typing'); b.classList.add('in'); SFX.tap(); }, tt)); tt += 350; });
}

/* ---------- numeric keypad (no typing in scored steps, DP-307) ---------- */
function padHtml() { var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', 'b', 'c']; return '<div class="pad">' + keys.map(function (k) { return '<button class="key" data-k="' + k + '" aria-label="' + ({ b: 'Delete', c: 'Clear' }[k] || k) + '">' + ({ b: '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M16 10h26a2 2 0 0 1 2 2v24a2 2 0 0 1-2 2H16L4 24 16 10Z" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/><path d="M24 18l10 12M34 18 24 30" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>', c: 'C' }[k] || k) + '</button>'; }).join('') + '</div>'; }
function keypad(host, n, onChange) {
  var at = 0, vals = []; for (var i = 0; i < n; i++) vals.push('');
  function paint() { $$('.field', host).forEach(function (fe, i) { fe.textContent = vals[i] === '' ? '?' : vals[i]; fe.classList.toggle('on', i === at); }); if (onChange) onChange(vals); }
  host.addEventListener('click', function (e) {
    var f = e.target.closest('.field'); if (f) { at = +f.dataset.i; SFX.tap(); paint(); return; }
    var k = e.target.closest('.key'); if (!k || k.disabled) return; var v = k.dataset.k; SFX.tap(); $$('.field', host)[at].classList.remove('ok', 'no'); // a changed answer loses its old tick or cross
    if (v === 'c') vals[at] = ''; else if (v === 'b') vals[at] = vals[at].slice(0, -1); else if (v === '.') { if (vals[at].indexOf('.') < 0 && vals[at] !== '') vals[at] += '.'; } else if (vals[at].length < 6) vals[at] += v;
    paint();
  });
  paint(); return { vals: function () { return vals; }, mark: function (i, c) { var fe = $$('.field', host)[i]; fe.classList.remove('ok', 'no'); if (c) fe.classList.add(c); }, lock: function () { $$('.key', host).forEach(function (k) { k.disabled = true; }); },
    clear: function (i) { vals[i] = ''; $$('.field', host)[i].classList.remove('ok', 'no'); }, focus: function (i) { at = i; paint(); } };
}

/* ---------- submit, report, certificate ---------- */
function chain() { return CFG.chain(S, ensureData()); }
function buildPDF() { var pdf = new window.MiniPDF(842, 595); CFG.pdf(pdf, S, ensureData(), { score: S.final || fin(), name: S.name, date: new Date((S.final && S.final.at) || Date.now()) }); return pdf; }
function fin() { var sc = score(); return { points: sc.points, rank: sc.rank, first: firstTry(), at: new Date().toISOString() }; }
function buildResult() {
  var sc = score(), t1 = new Date().toISOString(), pdf = buildPDF();
  return { schema: 'ulipsu.project-result.v1', projectId: C.id, version: C.version, attemptId: S.attemptId, startedAt: S.startedAt, submittedAt: t1, durationSec: Math.max(1, Math.round((Date.parse(t1) - Date.parse(S.startedAt)) / 1000)),
    score: { points: sc.points, maxPoints: 1000, percent: sc.percent }, completion: 'completed',
    items: C.items.map(function (d) { var s = it(d.id); return { id: d.id, lo: d.lo, type: d.type, response: s.resp, attempts: s.a, correct: !!s.ok, revealed: !!s.rev, points: Math.round(d.w * 10 * (s.frac || 0)), maxPoints: d.w * 10 }; }),
    report: { variant: S.x.variant, findings: S.x.findings || '', firstTryCorrect: firstTry(), itemsTotal: C.items.length, rankPoints: sc.rank, chain: chain(), html: CFG.reportHtml(S, ensureData(), sc), pdfBase64: pdf.base64() } };
}
function doSubmit() {
  if (T.busy) return; T.busy = true; showLayer('<h2>Saving your project</h2><p>Please wait a moment.</p>');
  var res = buildResult(); S.final = { points: res.score.points, rank: res.report.rankPoints, first: res.report.firstTryCorrect, at: res.submittedAt };
  LMS.submit(res).then(function () { T.busy = false; S.submitted = true; S.rp = 0; SFX.done(); hideLayer(); go(SC.length - 1); }).catch(function () { // never "Submitted" before the acknowledgement (DP-1006)
    T.busy = false; showLayer('<h2>Couldn’t save</h2><p>Check your connection and try again. Your work is kept.</p><p class="ra"><button class="btn pri" id="tr">Try again</button></p>'); $('#tr').addEventListener('click', function () { hideLayer(); doSubmit(); });
  });
}
function reviewScene() { return { id: 'review', name: 'Review and submit', help: { goal: 'Check your project, then send it.', how: 'Press Submit. You will be asked once to confirm.', score: 'Your score and certificate appear after you submit.' }, say: function () { return 'Your project is ready. Look it over, then submit it to get your certificate.'; }, render: function (el) {
  el.innerHTML = CFG.reviewHtml(S, ensureData(), K); var ok = allDone();
  setFoot({ main: 'Submit', en: ok, cls: 'gold', st: ok ? '' : 'Finish every step first.', go: function () {
    showLayer('<h2>Submit your project?</h2><p>You can’t change answers after this.</p><p class="ra"><button class="btn" data-close="1">Not yet</button><button class="btn gold" id="yes">Submit now</button></p>'); $('#yes').addEventListener('click', function () { hideLayer(); doSubmit(); });
  } });
} }; }
function downloadPDF() { var b = buildPDF().blob(), name = C.id + '_' + C.short + '_Certificate.pdf'; if (window.UlipsuBridge && UlipsuBridge.downloadBlob) { UlipsuBridge.downloadBlob(b, name, 'application/pdf'); return; } try { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (e) {} }
function submittedScene() { return { id: 'submitted', name: 'Certificate', help: { goal: 'This is your finished certificate. Nothing here can be changed.', how: 'Use Back and Next to browse the pages. On the last page you can download the PDF.', score: 'Your score and Rank Points are on the certificate.' }, say: function () { return S.rp === 0 ? 'Congratulations! You designed your room and earned your certificate.' : ''; }, render: function (el) {
  var pg = S.rp || 0, n = CFG.certPages.length, last = pg === n - 1, canDl = typeof URL !== 'undefined' && !!URL.createObjectURL;
  el.innerHTML = CFG.certPages[pg](S, ensureData(), S.final || fin(), K);
  setFoot({ noBack: pg === 0, back: function () { S.rp = pg - 1; save(); render(); }, main: last ? (canDl ? 'Download PDF' : 'Finish') : 'Next page', cls: last ? 'gold' : 'pri', en: true, st: 'Page ' + (pg + 1) + ' of ' + n, go: function () { if (!last) { S.rp = pg + 1; save(); render(); } else if (canDl) downloadPDF(); else LMS.exit(); } });
} }; }

/* ---------- bridge, boot ---------- */
function bridgeInit() {
  if (!window.UlipsuBridge) return;
  UlipsuBridge.init({ activityId: C.id, version: 1, getState: function () { return S; }, getSteps: function () { return SC.map(function (s) { return s.id; }); },
    setState: function (saved, student) { if (saved && saved.v === 1 && !started()) { S = Object.assign(fresh(), saved); rebuild(); } if (student && !started()) { if (student.id) S.learnerId = String(student.id); if (student.name) S.name = String(student.name); } DK = ''; save(); render(); },
    jumpToStep: function (i) { go(+i); },
    getMetrics: function () { var sc = score(); return { userId: S.learnerId, stepIndex: S.step, stepId: cur().id, totalSteps: SC.length, progressPercent: progressPct(), pts: sc.points, maxPts: 1000, completed: !!S.submitted }; },
    getActivityData: function () { return { selections: S.x, responses: C.items.map(function (d) { var s = S.items[d.id] || {}; return { question: d.id, selected_option: s.resp, is_correct: !!s.ok, attempt: s.a || 0 }; }) }; } });
}
function checkWeights() { var sets = C.missions ? Object.keys(C.missions).map(function (k) { return C.missions[k]; }) : [C.items]; sets.forEach(function (it_) { var t = it_.reduce(function (a, d) { return a + d.w; }, 0); if (Math.abs(t - 100) > 1e-9) throw new Error('Item weights must sum to 100, got ' + t); }); } // DP-804: the build fails otherwise
function run(cfg) {
  CFG = cfg; C = cfg.C; KEY = 'ulipsu_' + C.id.toLowerCase() + '_' + C.version.replace(/\./g, '_'); checkWeights();
  ALL = cfg.scenes.concat([reviewScene(), submittedScene()]); S = fresh(); rebuild();
  $('.ttl-text').textContent = C.title; document.title = C.title;
  $('#b-back').addEventListener('click', function () { if (T.back) T.back(); });
  $('#b-main').addEventListener('click', function () { if (T.main && !$('#b-main').disabled) T.main(); });
  function helpFor(sc) { var its = (sc.items || []).map(def).filter(Boolean), t = its[0] && its[0].type, m = sc.mis, hp = sc.help || {};
    return { goal: hp.goal || (m ? (m.solve ? 'See the answer your work built for ' + m.name + '.' : 'Finish this task to help you decide ' + m.name + '.') : sc.name),
      how: hp.how || (t === 'numeric' ? 'Tap the number keys, then press Check. Keyboard: Tab to a key, press Enter.' : t === 'chart' ? 'Drag each dot up or down, or tap a column. Keyboard: Tab to a dot, then use the Up and Down arrows.' : t === 'match' ? 'Drag a card onto its place, or tap the card and then the place. Keyboard: Enter picks, Tab moves, Enter drops.' : 'Tap a choice, then press the main button.'),
      score: hp.score || (its.length ? 'You get up to 3 tries. Right first time earns full marks, the second try less, the third least.' : 'Nothing on this screen is scored.') + ' Opening Help never costs a try.' }; }
  function pointer() { var m = $('#b-main'), c = cur().cue ? cur().cue() : null; cueRun(c || (!m.hidden && !m.disabled ? { tap: '#b-main' } : null)); }
  $('#b-help').addEventListener('click', function () { var hp = helpFor(cur()); showLayer('<h2>Help</h2><p><b>Goal.</b> ' + esc(hp.goal) + '</p><p><b>How.</b> ' + esc(hp.how) + '</p><p><b>Scoring.</b> ' + esc(hp.score) + '</p><p class="ra"><button class="btn" id="h-show">Show me</button><button class="btn pri" data-close="1">Close</button></p>', 'help'); $('#h-show').addEventListener('click', function () { hideLayer(); pointer(); }); }); // opening Help never costs a try
  window.Coach.setVoice(true);
  $('#b-snd').addEventListener('click', function () { S.sound = !S.sound; save(); header(); SFX.tap(); });
  $('#b-restart').addEventListener('click', function () { // v3: start completely fresh (new attempt, new numbers); asks once because it deletes all progress
    showLayer('<h2>Start again?</h2><p>All your answers and progress will be deleted. You will start from the beginning.</p><p class="ra"><button class="btn" data-close="1">Not now</button><button class="btn gold" id="rs-yes">Start again</button></p>');
    $('#rs-yes').addEventListener('click', function () { window.Coach.stop(); try { LMS.saveState(fresh()); } catch (e) {} T.wipe = true; // no save may write the old state back while the page unloads
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(KEY) === 0) localStorage.removeItem(k); }); } catch (e) {} mem = null; try { sessionStorage.clear(); } catch (e) {}
      location.reload(); }); });
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-close]')) hideLayer(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideLayer(); hideHand(); idleArm(); });
  document.addEventListener('pointerdown', function (e) { if (!e.target.closest('#b-help')) { hideHand(); idleArm(); } }, true);
  document.addEventListener('selectstart', function (e) { if (!(e.target.closest && e.target.closest('textarea'))) e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { e.preventDefault(); });
  window.addEventListener('resize', fitStage); window.addEventListener('orientationchange', fitStage);
  document.addEventListener('visibilitychange', function () { if (document.hidden) save(); }); window.addEventListener('pagehide', save);
  fitStage();
  LMS.init().then(function (r) {
    var saved = r.savedState; if (!saved) { try { var j = lsGet(); saved = j ? JSON.parse(j) : null; } catch (e) { saved = null; } }
    if (saved && saved.v === 1) S = Object.assign(fresh(), saved); rebuild();
    S.learnerId = r.learnerId || S.learnerId || null; if (!S.seed) S.seed = (S.learnerId || uid()) + '|' + C.id; // DP-611: same data on reopening
    if (r.status === 'submitted') S.submitted = true; if (S.submitted) S.step = SC.length - 1;
    if (LMS.banner) { var b = $('#banner'); b.hidden = false; }
    save(); render(); bridgeInit();
  });
}

var K = { $: $, $$: $$, esc: esc, S: function () { return S; }, D: ensureData, C: function () { return C; }, save: save, go: go, rebuild: rebuild, score: score, firstTry: firstTry, buildPDF: buildPDF, next: function () { go(S.step + 1); }, setFoot: setFoot, it: it, left: left, done: done, attempt: attempt, maxA: maxA, how: how, pips: pips, triesHtml: triesHtml, lostHtml: lostHtml, fb: fb, guide: guide,
  keypad: keypad, padHtml: padHtml, SFX: SFX, showLayer: showLayer, hideLayer: hideLayer, stagePt: stagePt, winOn: winOn, started: started, reduced: reduced, firstTry: firstTry, score: score, allDone: allDone, tm: function (fn, ms) { T.tm = setTimeout(fn, ms); }, cue: cueRun, idle: idleArm, hintNow: hintNow, run: run };
window.DP = K;
})();
