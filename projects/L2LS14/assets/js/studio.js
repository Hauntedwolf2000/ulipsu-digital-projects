/* Studio: the project framework and the interaction library shared by every Ulipsu digital project.
   A project (project.js) is only data: Studio.project({ ... tasks:[{id,name,type,build(D,variant)}] }).
   Every task type below returns { ready, evaluate, value, lock, reveal, solve, afterWrong? } and the wrapper does the rest
   (3 tries 100/70/10%, hints, reveal, locking, Check/Next, sound effects) through the shared runtime. No typing in scored steps (DP-307). */
'use strict';
(function () {
var K = window.DP, Kit = window.Kit, $ = K.$, $$ = K.$$, esc = K.esc, X = window.Studio = {}, UI = X.ui = {};
var TICK = Kit.tick(), CROSS = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 13 L35 35 M35 13 L13 35" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>';
var UP = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 32 L24 16 L38 32" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>', DN = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 16 L24 32 L38 16" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var PLUS = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 10v28M10 24h28" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>', MINUS = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 24h28" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>';
X.inr = function (n) { var s = String(Math.round(n)); if (s.length <= 3) return s; return s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3); }; // Indian digit grouping
X.mix = function (arr, D, salt) { return Kit.shuffle(arr, Kit.rng(String(D.seed) + (salt || ''))); }; X.rng = Kit.rng; X.shuffle = Kit.shuffle;
function seeded(arr, key) { return Kit.shuffle(arr, Kit.rng(String(key))); }
function keys(o) { return Object.keys(o); }
function flash(api, host, bad, paint, clear, ms) { paint(bad); setTimeout(function () { clear(); paint(); api.change(); }, ms || 1400); } // wrong choices show a cross, then are cleared (the right ones stay)

/* ---------- the task wrapper ---------- */
X.task = function (o) {
  return { id: o.id, step: 1, name: o.name, items: [o.id], cue: function () { return K.done(o.id) ? { tap: '#b-main' } : { tap: '#b-main' }; }, render: function (el) {
    var D = K.D(), vid = K.S().x.variant, v = (o.variants || []).filter(function (q) { return q.id === vid; })[0] || (o.variants || [])[0] || vid, fin = K.done(o.id), cfg = o.build(D, v, K.S().x), make = UI[o.type];
    el.innerHTML = '<div class="toprow">' + K.guide(o.instr) + '<div class="fb" id="fb" hidden></div></div>' + (cfg.note ? '<div class="st-note">' + cfg.note + '</div>' : '') + '<div class="st-host st-' + o.type + '" id="sth"></div>';
    var ui = make($('#sth', el), cfg, { change: refresh });
    function refresh() { if (ui && !K.done(o.id)) K.setFoot({ main: 'Check', en: ui.ready(), item: o.id, go: check }); }
    function next() { K.setFoot({ main: 'Next', en: true, go: function () { K.next(); } }); }
    function check() {
      var r = ui.evaluate(), s = K.attempt(o.id, r.ok, ui.value());
      function record() { var x = K.S().x; x.res = x.res || {}; x.res[o.id] = Object.assign({ first: !!(s && s.ok && s.a === 1), rev: !!(s && s.rev) }, ui.summary ? ui.summary() : {}); K.save(); K.rebuild(); } // later screens are built from what the kid made here
      if (r.ok) { K.SFX.ok(); K.fb('ok', 'Done.', o.good || ''); record(); ui.lock(); next(); return; } K.SFX.bad();
      if (s.rev) { ui.reveal(); record(); ui.lock(); K.fb('rev', 'Answer shown.', o.revealMsg || ''); next(); return; }
      K.fb(s.a === 1 ? 'no' : 'hint', s.a === 1 ? 'Not yet.' : 'Hint.', (s.a === 1 ? (r.msg || o.bad1 || 'Look again. ') : (r.hint || o.hint || 'Check the clues. ')) + K.lostHtml(o.id));
      if (ui.afterWrong) ui.afterWrong(r); refresh();
    }
    K.solve = function () { ui.solve(); refresh(); };
    if (fin) { ui.reveal(true); ui.lock(); next(); } else refresh();
  } };
};

/* ---------- MCQ: big option cards, one or several answers ---------- */
UI.mcq = function (host, c, api) {
  var sel = {}, locked = false, ans = [].concat(c.ans), multi = ans.length > 1, cols = c.cols || (c.options.length > 4 ? 3 : 2);
  host.innerHTML = '<div class="st-opts c' + cols + '">' + c.options.map(function (o) { return '<button type="button" class="st-opt" data-id="' + o.id + '" role="' + (multi ? 'checkbox' : 'radio') + '" aria-checked="false"><span class="st-mark"></span><span class="st-ot">' + o.html + '</span></button>'; }).join('') + '</div>';
  function paint(m) { $$('.st-opt', host).forEach(function (b) { var id = b.dataset.id, on = !!sel[id], st = m && m[id]; b.classList.toggle('sel', on); b.classList.toggle('ok', st === 'ok'); b.classList.toggle('bad', st === 'no'); b.setAttribute('aria-checked', on); $('.st-mark', b).innerHTML = st === 'no' ? CROSS : (on || st === 'ok') ? TICK : ''; }); }
  host.addEventListener('click', function (e) { var b = e.target.closest('.st-opt'); if (!b || locked) return; K.SFX.tap(); var id = b.dataset.id; if (multi) { if (sel[id]) delete sel[id]; else sel[id] = 1; } else { sel = {}; sel[id] = 1; } paint(); api.change(); });
  function setAns() { sel = {}; ans.forEach(function (a) { sel[a] = 1; }); }
  return { ready: function () { return keys(sel).length > 0; }, value: function () { return keys(sel).join('+'); },
    evaluate: function () { var ok = keys(sel).length === ans.length && ans.every(function (a) { return sel[a]; }); return { ok: ok, wrong: keys(sel).filter(function (k) { return ans.indexOf(k) < 0; }) }; },
    afterWrong: function (r) { var m = {}; r.wrong.forEach(function (k) { m[k] = 'no'; }); if (!r.wrong.length) { m = {}; keys(sel).forEach(function (k) { m[k] = 'no'; }); r.wrong = keys(sel); } flash(api, host, m, paint, function () { r.wrong.forEach(function (k) { delete sel[k]; }); }); },
    lock: function () { locked = true; var m = {}; ans.forEach(function (a) { m[a] = 'ok'; }); paint(m); $$('.st-opt', host).forEach(function (b) { b.disabled = true; }); },
    reveal: function () { setAns(); }, solve: function () { setAns(); paint(); } };
};

/* ---------- True / False: a few statements, one answer each ---------- */
UI.tf = function (host, c, api) {
  var val = c.stmts.map(function () { return null; }), locked = false;
  host.innerHTML = c.stmts.map(function (s, i) { return '<div class="st-row" data-i="' + i + '"><p>' + s.t + '</p><div class="st-tfb"><button type="button" data-v="1" aria-pressed="false">True</button><button type="button" data-v="0" aria-pressed="false">False</button></div><span class="st-mark"></span></div>'; }).join('');
  function paint(m) { $$('.st-row', host).forEach(function (r, i) { $$('[data-v]', r).forEach(function (b) { var on = val[i] !== null && String(val[i]) === b.dataset.v; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on); }); var st = m && m[i]; r.classList.toggle('bad', st === 'no'); r.classList.toggle('ok', st === 'ok'); $('.st-mark', r).innerHTML = st === 'no' ? CROSS : st === 'ok' ? TICK : ''; }); }
  host.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (!b || locked) return; K.SFX.tap(); val[+b.closest('.st-row').dataset.i] = +b.dataset.v; paint(); api.change(); });
  function truth() { return c.stmts.map(function (s) { return s.ans ? 1 : 0; }); }
  return { ready: function () { return val.every(function (v) { return v !== null; }); }, value: function () { return val.join(''); },
    evaluate: function () { var t = truth(), bad = []; val.forEach(function (v, i) { if (v !== t[i]) bad.push(i); }); return { ok: !bad.length, bad: bad }; },
    afterWrong: function (r) { var m = {}; r.bad.forEach(function (i) { m[i] = 'no'; }); flash(api, host, m, paint, function () { r.bad.forEach(function (i) { val[i] = null; }); }); },
    lock: function () { locked = true; var m = {}; truth().forEach(function (t, i) { m[i] = 'ok'; }); paint(m); $$('button', host).forEach(function (b) { b.disabled = true; }); },
    reveal: function () { val = truth(); }, solve: function () { val = truth(); paint(); } };
};

/* ---------- Sequence: put the cards in order with the up and down buttons ---------- */
UI.sequence = function (host, c, api) {
  var ans = c.order, order, locked = false;
  order = seeded(ans, c.seed || ans.join('|')); if (order.join() === ans.join()) order = order.slice(1).concat(order[0]);
  var byId = {}; c.items.forEach(function (i) { byId[i.id] = i; });
  function paint(m) { host.innerHTML = order.map(function (id, i) { var st = m && m[i]; return '<div class="st-seq' + (st === 'no' ? ' bad' : st === 'ok' ? ' ok' : '') + '" data-i="' + i + '"><b class="n">' + (i + 1) + '</b><span class="t">' + byId[id].html + '</span><span class="st-mark">' + (st === 'no' ? CROSS : st === 'ok' ? TICK : '') + '</span><button type="button" class="mv" data-d="-1" aria-label="Move up"' + (i === 0 || locked ? ' disabled' : '') + '>' + UP + '</button><button type="button" class="mv" data-d="1" aria-label="Move down"' + (i === order.length - 1 || locked ? ' disabled' : '') + '>' + DN + '</button></div>'; }).join(''); }
  host.addEventListener('click', function (e) { var b = e.target.closest('.mv'); if (!b || locked || b.disabled) return; var i = +b.closest('.st-seq').dataset.i, j = i + (+b.dataset.d), t = order[i]; order[i] = order[j]; order[j] = t; K.SFX.tap(); paint(); var nb = $('.st-seq[data-i="' + j + '"] .mv[data-d="' + b.dataset.d + '"]', host); if (nb && !nb.disabled) nb.focus(); api.change(); });
  paint();
  return { ready: function () { return true; }, value: function () { return order.join('>'); },
    evaluate: function () { var bad = []; order.forEach(function (id, i) { if (id !== ans[i]) bad.push(i); }); return { ok: !bad.length, bad: bad }; },
    afterWrong: function (r) { var m = {}; r.bad.forEach(function (i) { m[i] = 'no'; }); flash(api, host, m, paint, function () {}); },
    lock: function () { locked = true; var m = {}; order.forEach(function (x, i) { m[i] = 'ok'; }); paint(m); },
    reveal: function () { order = ans.slice(); }, solve: function () { order = ans.slice(); paint(); } };
};

/* ---------- Highlight: tap the sentences in a document that fit the job ---------- */
UI.highlight = function (host, c, api) {
  var sel = {}, locked = false, good = c.parts.filter(function (p) { return p.good; }).map(function (p) { return p.id; });
  host.innerHTML = '<div class="st-doc">' + (c.head ? '<h3>' + c.head + '</h3>' : '') + '<p>' + c.parts.map(function (p) { return '<button type="button" class="st-hl" data-id="' + p.id + '" aria-pressed="false">' + p.t + '</button>'; }).join(' ') + '</p></div>';
  function paint(m) { $$('.st-hl', host).forEach(function (b) { var id = b.dataset.id, on = !!sel[id], st = m && m[id]; b.classList.toggle('sel', on); b.classList.toggle('bad', st === 'no'); b.classList.toggle('ok', st === 'ok'); b.setAttribute('aria-pressed', on); }); }
  host.addEventListener('click', function (e) { var b = e.target.closest('.st-hl'); if (!b || locked) return; K.SFX.tap(); var id = b.dataset.id; if (sel[id]) delete sel[id]; else sel[id] = 1; paint(); api.change(); });
  function setGood() { sel = {}; good.forEach(function (g) { sel[g] = 1; }); }
  return { ready: function () { return keys(sel).length > 0; }, value: function () { return keys(sel).join('+'); },
    evaluate: function () { var wrong = keys(sel).filter(function (k) { return good.indexOf(k) < 0; }), missed = good.filter(function (g) { return !sel[g]; }); return { ok: !wrong.length && !missed.length, wrong: wrong, msg: wrong.length ? wrong.length + ' of your picks do not fit. ' : 'You missed some. Read the document again. ' }; },
    afterWrong: function (r) { var m = {}; r.wrong.forEach(function (k) { m[k] = 'no'; }); flash(api, host, m, paint, function () { r.wrong.forEach(function (k) { delete sel[k]; }); }); },
    lock: function () { locked = true; var m = {}; good.forEach(function (g) { m[g] = 'ok'; }); paint(m); $$('button', host).forEach(function (b) { b.disabled = true; }); },
    reveal: function () { setGood(); }, solve: function () { setGood(); paint(); } };
};

/* ---------- Match lines: tap one card on the left, then its partner on the right ---------- */
UI.matchlines = function (host, c, api) {
  var pair = {}, selL = null, locked = false;
  host.innerHTML = '<div class="st-ml"><svg class="st-lines" aria-hidden="true"></svg><div class="col l">' + c.left.map(function (o) { return '<button type="button" class="st-mc" data-side="l" data-id="' + o.id + '"><span class="st-ot">' + o.html + '</span><span class="st-mark"></span></button>'; }).join('') + '</div><div class="col r">' + seeded(c.right, c.seed || 'r').map(function (o) { return '<button type="button" class="st-mc" data-side="r" data-id="' + o.id + '"><span class="st-ot">' + o.html + '</span></button>'; }).join('') + '</div></div>';
  var box = $('.st-ml', host), svg = $('.st-lines', host);
  function pos(el) { var r = el.getBoundingClientRect(), b = box.getBoundingClientRect(), k = b.width / box.offsetWidth; return { x: (r.left - b.left) / k, y: (r.top - b.top) / k, w: r.width / k, h: r.height / k }; }
  function draw(m) { svg.setAttribute('viewBox', '0 0 ' + box.offsetWidth + ' ' + box.offsetHeight); svg.innerHTML = keys(pair).map(function (l) { var a = $('[data-side="l"][data-id="' + l + '"]', host), b = $('[data-side="r"][data-id="' + pair[l] + '"]', host), pa = pos(a), pb = pos(b), st = m && m[l]; return '<line x1="' + (pa.x + pa.w) + '" y1="' + (pa.y + pa.h / 2) + '" x2="' + pb.x + '" y2="' + (pb.y + pb.h / 2) + '" class="' + (st === 'no' ? 'bad' : st === 'ok' ? 'ok' : '') + '"/>'; }).join(''); }
  function paint(m) { $$('.st-mc', host).forEach(function (b) { var id = b.dataset.id, l = b.dataset.side === 'l', linked = l ? !!pair[id] : keys(pair).some(function (k) { return pair[k] === id; }); b.classList.toggle('sel', l && selL === id); b.classList.toggle('linked', linked); var st = l && m && m[id]; b.classList.toggle('bad', st === 'no'); b.classList.toggle('ok', st === 'ok'); if (l) $('.st-mark', b).innerHTML = st === 'no' ? CROSS : st === 'ok' ? TICK : ''; }); draw(m); }
  host.addEventListener('click', function (e) { var b = e.target.closest('.st-mc'); if (!b || locked) return; K.SFX.tap(); var id = b.dataset.id;
    if (b.dataset.side === 'l') { if (pair[id]) { delete pair[id]; selL = null; } else selL = selL === id ? null : id; }
    else { var owner = keys(pair).filter(function (k) { return pair[k] === id; })[0]; if (selL) { if (owner) delete pair[owner]; pair[selL] = id; selL = null; } else if (owner) delete pair[owner]; }
    paint(); api.change(); });
  setTimeout(function () { draw(); }, 0);
  return { ready: function () { return keys(pair).length === c.left.length; }, value: function () { return keys(pair).map(function (k) { return k + ':' + pair[k]; }).join(','); },
    evaluate: function () { var bad = c.left.filter(function (o) { return pair[o.id] !== c.pairs[o.id]; }).map(function (o) { return o.id; }); return { ok: !bad.length, bad: bad }; },
    afterWrong: function (r) { var m = {}; r.bad.forEach(function (k) { m[k] = 'no'; }); flash(api, host, m, paint, function () { r.bad.forEach(function (k) { delete pair[k]; }); }); },
    lock: function () { locked = true; var m = {}; keys(pair).forEach(function (k) { m[k] = 'ok'; }); paint(m); $$('button', host).forEach(function (b) { b.disabled = true; }); },
    reveal: function () { pair = {}; keys(c.pairs).forEach(function (k) { pair[k] = c.pairs[k]; }); }, solve: function () { pair = {}; keys(c.pairs).forEach(function (k) { pair[k] = c.pairs[k]; }); paint(); } };
};

/* ---------- Table fill: tap a cell, then pick its value from the choices below ---------- */
UI.tablefill = function (host, c, api) {
  var val = {}, at = null, locked = false;
  host.innerHTML = '<table class="st-tab"><tr><th></th>' + c.head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr>' + c.rows.map(function (r, i) { return '<tr><th class="rh">' + r.label + '</th>' + r.cells.map(function (cell, j) { return cell.ans !== undefined ? '<td><button type="button" class="st-cell" data-k="' + i + '_' + j + '">?</button></td>' : '<td class="fixed">' + cell.t + '</td>'; }).join('') + '</tr>'; }).join('') + '</table><div class="st-picker" role="group" aria-label="Choices">' + c.choices.map(function (ch) { return '<button type="button" class="st-chip" data-v="' + esc(String(ch)) + '">' + esc(String(ch)) + '</button>'; }).join('') + '</div>';
  function ansOf(k) { var p = k.split('_'); return String(c.rows[+p[0]].cells[+p[1]].ans); }
  function allKeys() { var o = []; c.rows.forEach(function (r, i) { r.cells.forEach(function (cell, j) { if (cell.ans !== undefined) o.push(i + '_' + j); }); }); return o; }
  function paint(m) { $$('.st-cell', host).forEach(function (b) { var k = b.dataset.k, st = m && m[k]; b.textContent = val[k] === undefined ? '?' : val[k]; b.classList.toggle('on', at === k); b.classList.toggle('bad', st === 'no'); b.classList.toggle('ok', st === 'ok'); }); }
  host.addEventListener('click', function (e) { if (locked) return; var b = e.target.closest('.st-cell'), ch = e.target.closest('.st-chip'); if (b) { at = b.dataset.k; K.SFX.tap(); paint(); return; } if (ch) { if (at === null) { var first = allKeys().filter(function (k) { return val[k] === undefined; })[0]; at = first || allKeys()[0]; } val[at] = ch.dataset.v; K.SFX.tap(); var nxt = allKeys().filter(function (k) { return val[k] === undefined; })[0]; at = nxt || at; paint(); api.change(); } });
  at = allKeys()[0]; paint();
  return { ready: function () { return allKeys().every(function (k) { return val[k] !== undefined; }); }, value: function () { return allKeys().map(function (k) { return val[k]; }).join('|'); },
    evaluate: function () { var bad = allKeys().filter(function (k) { return val[k] !== ansOf(k); }); return { ok: !bad.length, bad: bad, msg: bad.length + ' cells are not right. ' }; },
    afterWrong: function (r) { var m = {}; r.bad.forEach(function (k) { m[k] = 'no'; }); flash(api, host, m, paint, function () { r.bad.forEach(function (k) { delete val[k]; }); at = r.bad[0]; }); },
    lock: function () { locked = true; var m = {}; allKeys().forEach(function (k) { m[k] = 'ok'; }); paint(m); $$('button', host).forEach(function (b) { b.disabled = true; }); },
    reveal: function () { allKeys().forEach(function (k) { val[k] = ansOf(k); }); }, solve: function () { allKeys().forEach(function (k) { val[k] = ansOf(k); }); paint(); } };
};

/* ---------- Slider (and a dial): set a value by dragging, or with the arrow keys ---------- */
UI.slider = function (host, c, api) {
  var min = c.min, max = c.max, step = c.step || 1, v = c.startAt !== undefined ? c.startAt : min, touched = false, locked = false, fmt = c.fmt || function (x) { return x + (c.unit ? ' ' + c.unit : ''); };
  function snap(x) { x = Math.max(min, Math.min(max, Math.round((x - min) / step) * step + min)); return Math.round(x * 1000) / 1000; }
  if (c.dial) {
    host.innerHTML = '<div class="st-dial"><svg viewBox="0 0 800 470" role="slider" tabindex="0" aria-valuemin="' + min + '" aria-valuemax="' + max + '"><g class="zones"></g><line class="needle" x1="400" y1="400" x2="400" y2="90"/><circle cx="400" cy="400" r="26" class="hub"/></svg><div class="st-slval"></div></div>';
    var svg = $('svg', host), CX = 400, CY = 400, R = 330;
    (c.zones || []).forEach(function (z) { var a1 = Math.PI * (1 - (z.from - min) / (max - min)), a2 = Math.PI * (1 - (z.to - min) / (max - min)); var p = function (a, r) { return (CX + r * Math.cos(a)).toFixed(1) + ' ' + (CY - r * Math.sin(a)).toFixed(1); }; $('.zones', svg).insertAdjacentHTML('beforeend', '<path d="M' + p(a1, R) + ' A' + R + ' ' + R + ' 0 0 1 ' + p(a2, R) + ' L' + p(a2, R - 90) + ' A' + (R - 90) + ' ' + (R - 90) + ' 0 0 0 ' + p(a1, R - 90) + ' Z" class="z ' + (z.cls || '') + '"/><text x="' + (CX + (R - 45) * Math.cos((a1 + a2) / 2)).toFixed(1) + '" y="' + (CY - (R - 45) * Math.sin((a1 + a2) / 2) + 10).toFixed(1) + '" text-anchor="middle" class="zt">' + (z.label || '') + '</text>'); });
    var paintDial = function () { var a = Math.PI * (1 - (v - min) / (max - min)); var n = $('.needle', svg); n.setAttribute('x2', (CX + (R - 30) * Math.cos(a)).toFixed(1)); n.setAttribute('y2', (CY - (R - 30) * Math.sin(a)).toFixed(1)); $('.st-slval', host).textContent = fmt(v); svg.setAttribute('aria-valuenow', v); };
    var setFromPt = function (e) { var r = svg.getBoundingClientRect(), k = r.width / 800, x = (e.clientX - r.left) / k - CX, y = CY - (e.clientY - r.top) / k, a = Math.atan2(y, x); a = Math.max(0, Math.min(Math.PI, a)); v = snap(min + (1 - a / Math.PI) * (max - min)); touched = true; paintDial(); api.change(); };
    var dragging = false; svg.addEventListener('pointerdown', function (e) { if (locked) return; dragging = true; e.preventDefault(); setFromPt(e); K.SFX.tap(); }); K.winOn('pointermove', function (e) { if (dragging && !locked) setFromPt(e); }); K.winOn('pointerup', function () { dragging = false; });
    svg.addEventListener('keydown', function (e) { if (locked) return; var d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0; if (d) { e.preventDefault(); v = snap(v + d * step); touched = true; paintDial(); api.change(); } });
    paintDial(); var setV = function (x) { v = x; paintDial(); };
  } else {
    host.innerHTML = '<div class="st-sl"><div class="st-slval"></div><div class="st-track" tabindex="0" role="slider" aria-valuemin="' + min + '" aria-valuemax="' + max + '"><div class="zn"></div><div class="fill"></div><div class="thumb"></div></div><div class="st-marks"></div></div>';
    var tr = $('.st-track', host), zn = $('.zn', host);
    (c.zones || []).forEach(function (z) { zn.insertAdjacentHTML('beforeend', '<i class="' + (z.cls || '') + '" style="left:' + ((z.from - min) / (max - min) * 100) + '%;width:' + ((z.to - z.from) / (max - min) * 100) + '%"></i>'); });
    $('.st-marks', host).innerHTML = (c.marks || [{ v: min }, { v: max }]).map(function (m) { return '<span style="left:' + ((m.v - min) / (max - min) * 100) + '%">' + (m.t !== undefined ? m.t : m.v) + '</span>'; }).join('');
    var paintTr = function () { var p = (v - min) / (max - min) * 100; $('.thumb', host).style.left = p + '%'; $('.fill', host).style.width = p + '%'; $('.st-slval', host).textContent = fmt(v); tr.setAttribute('aria-valuenow', v); };
    var setFrom = function (e) { var r = tr.getBoundingClientRect(); v = snap(min + Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (max - min)); touched = true; paintTr(); api.change(); };
    var drag = false; tr.addEventListener('pointerdown', function (e) { if (locked) return; drag = true; e.preventDefault(); setFrom(e); K.SFX.tap(); }); K.winOn('pointermove', function (e) { if (drag && !locked) setFrom(e); }); K.winOn('pointerup', function () { drag = false; });
    tr.addEventListener('keydown', function (e) { if (locked) return; var d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0; if (d) { e.preventDefault(); v = snap(v + d * step); touched = true; paintTr(); api.change(); } });
    paintTr(); var setV = function (x) { v = x; paintTr(); };
  }
  function paintAny() { setV(v); }
  return { ready: function () { return touched; }, value: function () { return String(v); },
    evaluate: function () { var ok = Math.abs(v - c.target) <= (c.tol || 0) + 1e-9; return { ok: ok, hint: v < c.target ? 'Try a higher value.' : 'Try a lower value.', msg: c.badMsg }; },
    lock: function () { locked = true; }, reveal: function () { v = c.target; paintAny(); }, solve: function () { v = c.target; touched = true; paintAny(); } };
};

UI.dial = function (host, c, api) { c.dial = true; return UI.slider(host, c, api); };

/* ---------- Hotspot / body map: tap every spot on a picture that fits ---------- */
UI.hotspot = function (host, c, api) {
  var sel = {}, locked = false, W = c.w || 1200, Hh = c.h || 600, good = c.spots.filter(function (s) { return s.good; }).map(function (s) { return s.id; });
  host.innerHTML = '<div class="st-scene" style="width:' + W + 'px;height:' + Hh + 'px"><div class="art">' + c.svg + '</div>' + c.spots.map(function (s) { return '<button type="button" class="st-spot" data-id="' + s.id + '" aria-pressed="false" aria-label="' + esc(s.label || 'spot') + '" style="left:' + (s.x - 66) + 'px;top:' + (s.y - 66) + 'px"><span class="ring"></span><span class="st-mark"></span>' + (s.label ? '<em>' + s.label + '</em>' : '') + '</button>'; }).join('') + '</div>';
  function paint(m) { $$('.st-spot', host).forEach(function (b) { var id = b.dataset.id, on = !!sel[id], st = m && m[id]; b.classList.toggle('sel', on); b.classList.toggle('bad', st === 'no'); b.classList.toggle('ok', st === 'ok'); b.setAttribute('aria-pressed', on); $('.st-mark', b).innerHTML = st === 'no' ? CROSS : (on || st === 'ok') ? TICK : ''; }); }
  host.addEventListener('click', function (e) { var b = e.target.closest('.st-spot'); if (!b || locked) return; K.SFX.tap(); var id = b.dataset.id; if (sel[id]) delete sel[id]; else sel[id] = 1; paint(); api.change(); });
  function setGood() { sel = {}; good.forEach(function (g) { sel[g] = 1; }); }
  return { ready: function () { return keys(sel).length > 0; }, value: function () { return keys(sel).join('+'); },
    evaluate: function () { var wrong = keys(sel).filter(function (k) { return good.indexOf(k) < 0; }), missed = good.filter(function (g) { return !sel[g]; }); return { ok: !wrong.length && !missed.length, wrong: wrong, msg: wrong.length ? wrong.length + ' of your taps do not fit. ' : 'You missed some. Look at the whole picture. ' }; },
    afterWrong: function (r) { var m = {}; r.wrong.forEach(function (k) { m[k] = 'no'; }); flash(api, host, m, paint, function () { r.wrong.forEach(function (k) { delete sel[k]; }); }); },
    lock: function () { locked = true; var m = {}; good.forEach(function (g) { m[g] = 'ok'; }); paint(m); $$('button', host).forEach(function (b) { b.disabled = true; }); },
    reveal: function () { setGood(); }, solve: function () { setGood(); paint(); } };
};

/* ---------- Builder: choose one part for each slot; the document builds up beside you ---------- */
UI.builder = function (host, c, api) {
  var pick = {}, locked = false;
  host.innerHTML = '<div class="st-bl"><div class="slots">' + c.slots.map(function (s) { return '<div class="st-bs" data-s="' + s.id + '"><h4>' + s.label + '<span class="st-mark"></span></h4><div class="os">' + s.opts.map(function (o) { return '<button type="button" class="st-bo" data-o="' + o.id + '" aria-pressed="false">' + o.t + '</button>'; }).join('') + '</div></div>'; }).join('') + '</div><div class="paper st-prev"><div class="eyebrow">' + (c.title || 'Your draft') + '</div><div class="pv"></div></div></div>';
  function good(s) { return s.opts.filter(function (o) { return o.good; })[0].id; }
  function paint(m) { $$('.st-bs', host).forEach(function (r) { var sid = r.dataset.s, st = m && m[sid]; r.classList.toggle('bad', st === 'no'); r.classList.toggle('ok', st === 'ok'); $('.st-mark', r).innerHTML = st === 'no' ? CROSS : st === 'ok' ? TICK : ''; $$('.st-bo', r).forEach(function (b) { var on = pick[sid] === b.dataset.o; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on); }); });
    $('.pv', host).innerHTML = c.slots.map(function (s) { var o = s.opts.filter(function (x) { return x.id === pick[s.id]; })[0]; return o ? '<p>' + o.t + '</p>' : '<p class="empty">' + s.label + '</p>'; }).join(''); }
  host.addEventListener('click', function (e) { var b = e.target.closest('.st-bo'); if (!b || locked) return; K.SFX.tap(); pick[b.closest('.st-bs').dataset.s] = b.dataset.o; paint(); api.change(); });
  paint();
  return { ready: function () { return c.slots.every(function (s) { return pick[s.id]; }); }, value: function () { return c.slots.map(function (s) { return pick[s.id]; }).join('|'); },
    evaluate: function () { var bad = c.slots.filter(function (s) { return pick[s.id] !== good(s); }).map(function (s) { return s.id; }); return { ok: !bad.length, bad: bad, msg: bad.length + ' parts could be stronger. ' }; },
    afterWrong: function (r) { var m = {}; r.bad.forEach(function (k) { m[k] = 'no'; }); flash(api, host, m, paint, function () { r.bad.forEach(function (k) { delete pick[k]; }); }); },
    lock: function () { locked = true; var m = {}; c.slots.forEach(function (s) { m[s.id] = 'ok'; }); paint(m); $$('button', host).forEach(function (b) { b.disabled = true; }); },
    reveal: function () { c.slots.forEach(function (s) { pick[s.id] = good(s); }); }, solve: function () { c.slots.forEach(function (s) { pick[s.id] = good(s); }); paint(); } };
};

/* ---------- Branch: a short chat; choose the best reply to each message ---------- */
UI.branch = function (host, c, api) {
  var pick = c.turns.map(function () { return null; }), locked = false;
  host.innerHTML = '<div class="st-chat">' + c.turns.map(function (t, i) { return '<div class="st-turn" data-i="' + i + '"><div class="st-bub them"><span class="av" style="background:' + (c.them.color || '#2E8BC0') + '">' + c.them.init + '</span><p>' + t.say + '</p></div><div class="st-replies">' + t.replies.map(function (r) { return '<button type="button" class="st-reply" data-id="' + r.id + '" aria-pressed="false"><span class="st-mark"></span>' + r.t + '</button>'; }).join('') + '</div></div>'; }).join('') + '</div>';
  function paint(m) { $$('.st-turn', host).forEach(function (row, i) { var st = m && m[i]; row.classList.toggle('bad', st === 'no'); $$('.st-reply', row).forEach(function (b) { var on = pick[i] === b.dataset.id; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on); $('.st-mark', b).innerHTML = (on && st === 'no') ? CROSS : (on && (st === 'ok')) ? TICK : on ? TICK : ''; b.classList.toggle('bad', on && st === 'no'); b.classList.toggle('ok', on && st === 'ok'); }); }); }
  host.addEventListener('click', function (e) { var b = e.target.closest('.st-reply'); if (!b || locked) return; K.SFX.tap(); pick[+b.closest('.st-turn').dataset.i] = b.dataset.id; paint(); api.change(); });
  function goodOf(t) { return t.replies.filter(function (r) { return r.good; })[0].id; }
  return { ready: function () { return pick.every(function (p) { return p; }); }, value: function () { return pick.join('|'); },
    evaluate: function () { var bad = []; c.turns.forEach(function (t, i) { if (pick[i] !== goodOf(t)) bad.push(i); }); return { ok: !bad.length, bad: bad, msg: bad.length + ' replies could go better. ' }; },
    afterWrong: function (r) { var m = {}; r.bad.forEach(function (i) { m[i] = 'no'; }); flash(api, host, m, paint, function () { r.bad.forEach(function (i) { pick[i] = null; }); }); },
    lock: function () { locked = true; var m = {}; c.turns.forEach(function (t, i) { m[i] = 'ok'; }); paint(m); $$('button', host).forEach(function (b) { b.disabled = true; }); },
    reveal: function () { pick = c.turns.map(goodOf); }, solve: function () { pick = c.turns.map(goodOf); paint(); } };
};

/* ---------- Allocate: split a sum of money between buckets with + and - ---------- */
UI.allocate = function (host, c, api) {
  var amt = {}, locked = false, step = c.step || 5000, total = c.total, COL = ['#1B6CA8', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00'];
  c.buckets.forEach(function (b) { amt[b.id] = 0; });
  host.innerHTML = '<div class="st-al"><div class="rows">' + c.buckets.map(function (b, i) { return '<div class="st-ar" data-id="' + b.id + '"><span class="sw" style="background:' + COL[i % 6] + '"></span><div class="lb"><b>' + b.label + '</b>' + (b.sub ? '<small>' + b.sub + '</small>' : '') + '</div><button type="button" class="pm" data-d="-1" aria-label="Less ' + esc(b.label) + '">' + MINUS + '</button><output></output><button type="button" class="pm" data-d="1" aria-label="More ' + esc(b.label) + '">' + PLUS + '</button></div>'; }).join('') + '</div><div class="pie"><svg viewBox="0 0 300 300" aria-hidden="true"></svg><div class="left"></div></div></div>';
  function used() { return keys(amt).reduce(function (a, k) { return a + amt[k]; }, 0); }
  function paint(m) { $$('.st-ar', host).forEach(function (r) { var id = r.dataset.id; $('output', r).textContent = (c.unit || '') + X.inr(amt[id]) + ' (' + Math.round(amt[id] / total * 100) + '%)'; r.classList.toggle('bad', !!(m && m[id] === 'no')); $$('.pm', r).forEach(function (b) { b.disabled = locked; }); });
    var lft = total - used(), svg = $('.pie svg', host), a0 = -Math.PI / 2, s = '<circle cx="150" cy="150" r="110" fill="none" stroke="#E5E9EE" stroke-width="56"/>';
    c.buckets.forEach(function (b, i) { var f = amt[b.id] / total; if (f <= 0) return; var a1 = a0 + f * 2 * Math.PI, large = f > .5 ? 1 : 0, x0 = 150 + 110 * Math.cos(a0), y0 = 150 + 110 * Math.sin(a0), x1 = 150 + 110 * Math.cos(a1 - (f >= 1 ? 0.0001 : 0)), y1 = 150 + 110 * Math.sin(a1 - (f >= 1 ? 0.0001 : 0)); s += '<path d="M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A110 110 0 ' + large + ' 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + '" fill="none" stroke="' + COL[i % 6] + '" stroke-width="56"/>'; a0 = a1; });
    svg.innerHTML = s; $('.left', host).innerHTML = lft === 0 ? 'All ' + (c.unit || '') + X.inr(total) + ' placed' : (c.unit || '') + X.inr(lft) + ' left to place'; }
  host.addEventListener('click', function (e) { var b = e.target.closest('.pm'); if (!b || locked) return; var id = b.closest('.st-ar').dataset.id, d = +b.dataset.d * step; if (d > 0 && used() + d > total) return; if (d < 0 && amt[id] + d < 0) return; amt[id] += d; K.SFX.tap(); paint(); api.change(); });
  paint();
  function setSol() { keys(amt).forEach(function (k) { amt[k] = c.solution[k] || 0; }); }
  return { ready: function () { return used() === total; }, value: function () { return keys(amt).map(function (k) { return k + '=' + amt[k]; }).join(','); },
    evaluate: function () { var r = c.rule(amt, total); return { ok: !!r.ok, msg: r.msg, hint: r.hint || r.msg }; },
    lock: function () { locked = true; paint(); }, reveal: function () { setSol(); }, solve: function () { setSol(); paint(); } };
};

/* ---------- Canvas: tap an item, then tap where it goes. Grid (a room, a plot) or zones (labels on a page) ---------- */
UI.canvas = function (host, c, api) {
  var pl = {}, sel = null, locked = false, zones = c.mode === 'zones', cell = c.cell || 120, W = zones ? (c.w || 1200) : c.cols * cell, Hh = zones ? (c.h || 520) : c.rows * cell;
  var byId = {}; c.items.forEach(function (i) { byId[i.id] = i; });
  host.innerHTML = '<div class="st-cv"><div class="board' + (zones ? ' zones' : '') + '" style="width:' + W + 'px;height:' + Hh + 'px;' + (zones ? '' : 'background-size:' + cell + 'px ' + cell + 'px;') + '"><div class="bg">' + (c.bg || '') + '</div>' + (zones ? c.zones.map(function (z) { return '<button type="button" class="st-zone" data-z="' + z.id + '" style="left:' + z.x + 'px;top:' + z.y + 'px;width:' + z.w + 'px;height:' + z.h + 'px"><span class="zl">' + (z.hint || '') + '</span></button>'; }).join('') : (c.fixed || []).map(function (f) { return '<div class="fx ' + (f.cls || '') + '" style="left:' + f.x * cell + 'px;top:' + f.y * cell + 'px;width:' + f.w * cell + 'px;height:' + f.h * cell + 'px">' + (f.html || '') + '</div>'; }).join('')) + '<div class="placed"></div></div><div class="st-pool"></div></div>';
  var board = $('.board', host), placed = $('.placed', host), pool = $('.st-pool', host);
  function cellAt(e) { var r = board.getBoundingClientRect(), k = r.width / W; return [Math.floor((e.clientX - r.left) / k / cell), Math.floor((e.clientY - r.top) / k / cell)]; }
  function fits(id, x, y) { var it = byId[id], w = it.w || 1, h = it.h || 1; if (x < 0 || y < 0 || x + w > c.cols || y + h > c.rows) return false; var rects = (c.fixed || []).filter(function (f) { return f.block !== false; }).map(function (f) { return [f.x, f.y, f.w, f.h]; }); keys(pl).forEach(function (o) { if (o !== id) rects.push([pl[o][0], pl[o][1], byId[o].w || 1, byId[o].h || 1]); }); return !rects.some(function (r) { return x < r[0] + r[2] && x + w > r[0] && y < r[1] + r[3] && y + h > r[1]; }); }
  function paint(m) {
    pool.innerHTML = c.items.filter(function (i) { return !pl[i.id]; }).map(function (i) { return '<button type="button" class="st-chip' + (sel === i.id ? ' sel' : '') + '" data-id="' + i.id + '">' + i.html + '</button>'; }).join('') || '<span class="done">All placed. Tap Check.</span>';
    if (zones) { $$('.st-zone', host).forEach(function (z) { var id = keys(pl).filter(function (k) { return pl[k] === z.dataset.z; })[0], st = id && m && m[id]; z.classList.toggle('filled', !!id); z.classList.toggle('bad', st === 'no'); z.classList.toggle('ok', st === 'ok'); $('.zl', z).innerHTML = id ? byId[id].html : (c.zones.filter(function (q) { return q.id === z.dataset.z; })[0].hint || ''); z.dataset.item = id || ''; }); }
    else { placed.innerHTML = keys(pl).map(function (id) { var it = byId[id], st = m && m[id]; return '<button type="button" class="st-it' + (st === 'no' ? ' bad' : st === 'ok' ? ' ok' : '') + (sel === id ? ' sel' : '') + '" data-id="' + id + '" style="left:' + pl[id][0] * cell + 'px;top:' + pl[id][1] * cell + 'px;width:' + (it.w || 1) * cell + 'px;height:' + (it.h || 1) * cell + 'px">' + it.html + '</button>'; }).join(''); } }
  host.addEventListener('click', function (e) { if (locked) return; var ch = e.target.closest('.st-chip'), it = e.target.closest('.st-it'), z = e.target.closest('.st-zone');
    if (ch) { sel = sel === ch.dataset.id ? null : ch.dataset.id; K.SFX.tap(); paint(); return; }
    if (z) { var cur = z.dataset.item; if (sel) { var old = pl[sel]; keys(pl).forEach(function (k) { if (pl[k] === z.dataset.z) delete pl[k]; }); pl[sel] = z.dataset.z; sel = null; K.SFX.tap(); } else if (cur) { delete pl[cur]; sel = cur; K.SFX.tap(); } paint(); api.change(); return; }
    if (it) { sel = it.dataset.id; var id = sel; delete pl[id]; K.SFX.tap(); paint(); api.change(); return; }
    if (!zones && sel && e.target.closest('.board')) { var p = cellAt(e); if (fits(sel, p[0], p[1])) { pl[sel] = [p[0], p[1]]; sel = null; K.SFX.tap(); paint(); api.change(); } else K.SFX.bad(); return; }
    if (e.target.closest('.st-pool') && sel) { delete pl[sel]; sel = null; paint(); api.change(); } });
  paint();
  function setSol() { pl = {}; keys(c.demo).forEach(function (k) { pl[k] = c.demo[k]; }); sel = null; }
  return { ready: function () { return c.items.every(function (i) { return pl[i.id]; }); }, value: function () { return keys(pl).map(function (k) { return k + '@' + pl[k]; }).join(','); },
    evaluate: function () { var r = zones ? (function () { var bad = c.items.filter(function (i) { return pl[i.id] !== c.ans[i.id]; }).map(function (i) { return i.id; }); return { ok: !bad.length, bad: bad, msg: bad.length + ' labels are in the wrong place. ' }; })() : c.rule(pl); return { ok: !!r.ok, bad: r.bad || [], msg: r.msg, hint: r.hint || r.msg }; },
    afterWrong: function (r) { var m = {}; (r.bad || []).forEach(function (k) { m[k] = 'no'; }); if (zones) flash(api, host, m, paint, function () { (r.bad || []).forEach(function (k) { delete pl[k]; }); }); else paint(m); },
    lock: function () { locked = true; var m = {}; keys(pl).forEach(function (k) { m[k] = 'ok'; }); paint(m); $$('button', host).forEach(function (b) { b.disabled = true; }); },
    reveal: function () { setSol(); }, solve: function () { setSol(); paint(); } };
};

/* ---------- Sort: every card goes into one of two to four bins (a row of bin buttons for each card) ---------- */
UI.sort = function (host, c, api) {
  var val = c.items.map(function () { return null; }), locked = false;
  host.innerHTML = c.items.map(function (s, i) { return '<div class="st-row" data-i="' + i + '"><p>' + s.t + '</p><div class="st-tfb">' + c.cats.map(function (k) { return '<button type="button" data-v="' + k.id + '" aria-pressed="false">' + k.label + '</button>'; }).join('') + '</div><span class="st-mark"></span></div>'; }).join('');
  function paint(m) { $$('.st-row', host).forEach(function (r, i) { $$('[data-v]', r).forEach(function (b) { var on = val[i] === b.dataset.v; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on); }); var st = m && m[i]; r.classList.toggle('bad', st === 'no'); r.classList.toggle('ok', st === 'ok'); $('.st-mark', r).innerHTML = st === 'no' ? CROSS : st === 'ok' ? TICK : ''; }); }
  host.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (!b || locked) return; K.SFX.tap(); val[+b.closest('.st-row').dataset.i] = b.dataset.v; paint(); api.change(); });
  function truth() { return c.items.map(function (s) { return s.ans; }); }
  return { ready: function () { return val.every(function (v) { return v !== null; }); }, value: function () { return val.join('|'); },
    evaluate: function () { var bad = []; val.forEach(function (v, i) { if (v !== c.items[i].ans) bad.push(i); }); return { ok: !bad.length, bad: bad, msg: bad.length + ' cards are in the wrong bin. ' }; },
    afterWrong: function (r) { var m = {}; r.bad.forEach(function (i) { m[i] = 'no'; }); flash(api, host, m, paint, function () { r.bad.forEach(function (i) { val[i] = null; }); }); },
    lock: function () { locked = true; var m = {}; truth().forEach(function (t, i) { m[i] = 'ok'; }); paint(m); $$('button', host).forEach(function (b) { b.disabled = true; }); },
    reveal: function () { val = truth(); }, solve: function () { val = truth(); paint(); } };
};

/* ---------- Keypad: one or more numeric answers, entered on the on-screen keypad (no typing) ---------- */
UI.keypad = function (host, c, api) {
  var F = c.fields;
  host.innerHTML = '<div class="paper calc" id="khost"><div class="left">' + (c.top || '') + '<div class="fields ' + (c.fcls || '') + '">' + F.map(function (f, i) { return '<div class="frow"><span>' + (f.lbl || '') + '</span><button class="field" data-i="' + i + '">?</button><span class="unit">' + (f.unit || '') + '</span></div>'; }).join('') + '</div></div>' + K.padHtml() + '</div>';
  var h = $('#khost', host), kp = K.keypad(h, F.length, function () { api.change(); });
  function nums() { return kp.vals().map(parseFloat); }
  function fill() { var fs = $$('.field', h); F.forEach(function (f, i) { fs[i].textContent = f.ans; fs[i].classList.remove('on'); }); }
  return { ready: function () { return kp.vals().every(function (a) { return a !== '' && a !== '.'; }); }, value: function () { return nums().join('x'); },
    evaluate: function () { var v = nums(), r = F.map(function (f, i) { return Math.abs(v[i] - f.ans) <= (f.tol || 0) + 1e-9; }); r.forEach(function (g, i) { kp.mark(i, g ? 'ok' : 'no'); }); return { ok: r.every(Boolean), msg: 'The crossed boxes are wrong. Enter them again. ', hint: 'Count again, slowly, one by one. ', bad: r }; },
    afterWrong: function (r) { r.bad.forEach(function (g, i) { if (!g) { kp.clear(i); kp.mark(i, 'no'); } }); var first = r.bad.indexOf(false); if (first >= 0) kp.focus(first); },
    lock: function () { fill(); F.forEach(function (f, i) { kp.mark(i, 'ok'); }); kp.lock(); }, reveal: function () { fill(); },
    solve: function () { var fs = $$('.field', h); F.forEach(function (f, i) { fs[i].click(); String(f.ans).split('').forEach(function (ch) { $('.key[data-k="' + ch + '"]', h).click(); }); }); } };
};

/* ---------- the whole project: pick screen, six tasks, report ---------- */
X.project = function (spec) {
  var N = window.NARRATION, I = window.INSTR, C = window.CONTENT, scenes = [];
  function T(id, extra) { return Object.assign({ id: id, t: N[id] }, extra || {}); }
  function V(Sx) { return spec.variants.filter(function (v) { return v.id === Sx.x.variant; })[0] || spec.variants[0]; }
  // first screen: the ASK's Start and Choose in one
  scenes.push({ id: 'pick', name: 'Welcome', cue: function () { return { tap: '.pick' }; }, render: function (el) {
    var x = K.S().x, lock = K.started();
    el.innerHTML = '<div class="sthead"><p class="goal">' + esc(spec.goal) + '</p><p class="meta"><b>About 10 minutes.</b> You will make ' + esc(spec.makes) + '.</p></div><h2 class="ask">' + esc(I.pick[0]) + '</h2><div class="cards3 missions">' + spec.variants.map(function (v) { return '<button class="card pick" data-k="' + v.id + '"' + (lock ? ' disabled' : '') + '><div class="cimg"><img class="vimg" src="assets/img/v_' + v.id + '.webp" alt=""></div><b>' + esc(v.name) + '</b><span>' + esc(v.problem) + '</span><div class="learn">' + v.learn.map(function (t) { return '<i>' + esc(t) + '</i>'; }).join('') + '</div><i class="tick">' + TICK + ' Chosen</i></button>'; }).join('') + '</div>';
    function paint() { $$('.pick', el).forEach(function (b) { b.classList.toggle('sel', b.dataset.k === x.variant); }); K.setFoot({ main: 'Start', en: !!x.variant, st: '', go: function () { K.next(); } }); }
    el.addEventListener('click', function (e) { var b = e.target.closest('.pick'); if (!b || b.disabled) return; x.variant = b.dataset.k; K.save(); K.SFX.tap(); paint(); });
    paint(); } });
  var slots = spec.slots || spec.tasks.map(function (t) { return { w: 0, alts: [t] }; }), ALLI = C.items.slice(), allAlts = [];
  slots.forEach(function (sl, i) { sl.alts.forEach(function (t) { allAlts.push(t); var sc = X.task(Object.assign({}, t, { instr: I[t.id], variants: spec.variants })); sc.slotIdx = i; sc.mis = { n: 1, name: spec.short, task: i + 1, tasks: slots.length, solve: false }; scenes.push(sc); }); });
  window.STUDIO_SLOTS = slots.map(function (sl) { return sl.alts.map(function (t) { return t.id; }); });
  function chosen(Sx, i) { var sl = slots[i], id = (window.__force && window.__force[i]) || (sl.pick ? sl.pick(Sx.x.res || {}, Sx.x, V(Sx)) : sl.alts[0].id); return sl.alts.filter(function (t) { return t.id === id; })[0] || sl.alts[0]; }
  scenes.push(Kit.personal({ instr: I.personalise, themes: spec.themes, label: spec.reportLabel || 'My report', findings: function (Sx, D) { return spec.findings(D, V(Sx), Sx.x.res || {}); } }));
  var coachScenes = {}; slots.forEach(function (sl, i) { sl.alts.forEach(function (t) { coachScenes[t.id] = i === 0 ? function (Sx) { return [T('s_' + V(Sx).id), T('n_' + t.id)]; } : [T('n_' + t.id)]; }); });
  function ans(id, D, v) { var t = allAlts.filter(function (q) { return q.id === id; })[0]; return t && t.answer ? t.answer(D, v, K.S().x) : ''; }
  window.DATA_CHECK = function (n) { var host = document.createElement('div'); document.body.appendChild(host);
    function chain(seed, v, forced) { var x = { variant: v.id, res: {} }, D = { seed: seed + '|' + v.id }; if (spec.data) Object.assign(D, spec.data(D.seed, v)); D.seed = seed + '|' + v.id;
      slots.forEach(function (sl, i) { var id = forced && forced.i === i ? forced.id : (sl.pick ? sl.pick(x.res, x, v) : sl.alts[0].id), t = sl.alts.filter(function (q) { return q.id === id; })[0] || sl.alts[0]; host.innerHTML = '<div id="sth"></div>'; var cfg = t.build(D, v, x), ui = UI[t.type]($('#sth', host), cfg, { change: function () {} }); ui.solve(); var r = ui.evaluate(); if (!r.ok) throw new Error('not solvable: ' + t.id + ' (' + v.id + ', seed ' + seed + ') ' + (r.msg || '')); x.res[t.id] = Object.assign({ first: true }, ui.summary ? ui.summary() : {}); }); }
    try { for (var k = 0; k < n; k++) spec.variants.forEach(function (v) { chain('s' + k, v, null); slots.forEach(function (sl, i) { if (sl.alts.length > 1 && k < Math.max(8, n / 20)) sl.alts.forEach(function (t) { chain('s' + k, v, { i: i, id: t.id }); }); }); }); } catch (e) { host.remove(); return { fail: String(e.message || e) }; } host.remove(); return { n: n }; };
  C.items = slots.map(function (sl) { return ALLI.filter(function (q) { return q.id === sl.alts[0].id; })[0]; }).filter(Boolean); // start with the default branch; the kid's own results choose the rest
  Kit.run({ coach: { intro: function () { return [T('intro1'), T('intro2', { spot: '.sthead' })].concat(spec.variants.map(function (v) { return T('v_' + v.id, { spot: '.pick[data-k="' + v.id + '"]' }); })).concat([T('intro3', { spot: '.missions .learn' })]); }, scenes: coachScenes },
    guideSvg: function () { return '<img src="assets/img/guide.webp" alt="">'; }, scenes: scenes,
    filter: function (Sx, sc) { return sc.slotIdx === undefined || chosen(Sx, sc.slotIdx).id === sc.id; },
    sync: function (Sx) { C.items = slots.map(function (sl, i) { var t = chosen(Sx, i); return ALLI.filter(function (q) { return q.id === t.id; })[0]; }).filter(Boolean); }, themes: spec.themes, guideName: spec.guideName, defaultName: 'Learner', artTitle: spec.artTitle || 'Your finished work',
    dataKey: function (Sx) { return Sx.x.variant ? Sx.seed + '|' + Sx.x.variant : ''; }, data: function (Sx) { var sd = Sx.seed + '|' + Sx.x.variant, d = spec.data ? spec.data(sd, V(Sx)) : {}; d.seed = sd; return d; },
    itemNames: (function () { var o = {}; allAlts.forEach(function (t) { o[t.id] = t.name; }); return o; })(),
    headline: function (Sx) { return V(Sx).role; }, line: function (Sx) { return 'for completing ' + spec.title + ' (' + C.id + '): ' + V(Sx).name + ', as'; }, outro: spec.outro,
    badges: function (Sx) { return [{ b: V(Sx).name, s: 'chosen' }, { b: slots.length + ' tasks', s: 'done' }]; },
    art: function (Sx, D) { var v = V(Sx); if (spec.art) return spec.art(Sx, D, v, Sx.x.res || {}); return '<div class="heroart"><img src="assets/img/v_' + v.id + '.webp" alt=""><b>' + esc(v.role) + '</b></div>'; },
    chain: function (Sx, D) { var v = V(Sx); if (spec.chain) return spec.chain(Sx, D, v, Sx.x.res || {}); return [{ choice: 'Your choice', consequence: v.name + '. ' + v.problem }, { choice: 'Skills you used', consequence: v.learn.join(', ') + '.' }, { choice: 'Your result', consequence: spec.result(D, v) }, { choice: 'Outcome', consequence: v.role + '.' }]; },
    answers: function (id, D) { return ans(id, D, V(K.S())); }, reviewInstr: I.review,
    pdfArt: function (pdf, x, y, w, h, t, Sx, D) { if (spec.pdfArt) return spec.pdfArt(pdf, x, y, w, h, t, Sx, D, V(Sx), Sx.x.res || {}); var v = V(Sx), lines = spec.summary(D, v, Sx.x.res || {}); pdf.rect(x, y, w, h, '#FFFFFF', t.ink, 1.5); pdf.text(x + w / 2, y + 28, v.name, 15, 'bold', t.ink, 'c'); lines.slice(0, 8).forEach(function (l, i) { pdf.para(x + 22, y + 64 + i * 38, l, 11, w - 44, 14, 'sans', '#2D3748'); }); } });
};
})();
