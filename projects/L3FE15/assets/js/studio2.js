/* Studio 2: open-ended creating and simulating. There is no single right answer here: the kid builds, composes, runs and adjusts,
   live meters respond, and the result is checked against goals. Every engine returns the same shape as the Studio engines
   ({ready, evaluate, value, lock, reveal, solve, afterWrong?, summary}) so the shared task wrapper does tries, scoring and hints.
   summary() hands what the kid made to later tasks, so the next screens are built from the kid's own work. */
'use strict';
(function () {
var K = window.DP, Kit = window.Kit, X = window.Studio, UI = X.ui, $ = K.$, $$ = K.$$, esc = K.esc, TICK = Kit.tick();
function cl(v, a, b) { return Math.max(a, Math.min(b, v)); }
function cp(o) { return JSON.parse(JSON.stringify(o)); }
function inGoal(m, v) { return !m.goal || (v >= m.goal[0] - 1e-9 && v <= m.goal[1] + 1e-9); }
function fmt(v, m) { return (m.fmt ? m.fmt(v) : (Math.round(v * 10) / 10) + (m.unit || '')); }
function mHi(m) { return m.max === undefined ? 100 : m.max; } function mLo(m) { return m.min || 0; }
function meters(ms, vals) {
  return '<div class="mtrs">' + ms.map(function (m) { var v = vals[m.id], lo = mLo(m), hi = mHi(m), p = function (x) { return (x - lo) / (hi - lo) * 100; }, g = m.goal, ok = g && inGoal(m, v);
    return '<div class="mt' + (ok ? ' ok' : '') + '" data-m="' + m.id + '"><div class="mh"><b>' + m.label + '</b><span class="mv">' + fmt(v, m) + '</span><span class="tk">' + (ok ? TICK : '') + '</span></div><div class="mb">' + (g ? '<i class="gz" style="left:' + p(g[0]) + '%;width:' + (p(g[1]) - p(g[0])) + '%"></i>' : '') + '<i class="fl" style="width:' + cl(p(v), 0, 100) + '%"></i></div>' + (g ? '<small>Goal: ' + fmt(g[0], m) + ' to ' + fmt(g[1], m) + '</small>' : '') + '</div>'; }).join('') + '</div>';
}
function outOf(ms, vals) { return ms.filter(function (m) { return m.goal && !inGoal(m, vals[m.id]); }); }
function whyNot(ms, vals) { var o = outOf(ms, vals); if (!o.length) return ''; var m = o[0], v = vals[m.id]; return m.label + ' is ' + fmt(v, m) + ', and the goal is ' + fmt(m.goal[0], m) + ' to ' + fmt(m.goal[1], m) + '. '; }
function shake(host) { host.classList.add('sad'); setTimeout(function () { host.classList.remove('sad'); }, 900); }

/* ================= SIM: rounds of events, choices move the meters, later events depend on the meters ================= */
UI.sim = function (host, c, api) {
  var salt = 0, S, locked = false, RN = c.rounds, start = {};
  c.meters.forEach(function (m) { start[m.id] = m.start; });
  function seedAt(i) { return c.seed + '|' + salt + '|' + i; }
  function apply(m, fx) { var o = Object.assign({}, m); Object.keys(fx || {}).forEach(function (k) { var d = c.meters.filter(function (q) { return q.id === k; })[0]; o[k] = cl(o[k] + fx[k], mLo(d), mHi(d)); }); return o; }
  function win(m) { return c.win ? c.win(m) : c.meters.every(function (q) { return inGoal(q, m[q.id]); }); }
  function evAt(m, i, picks) { return c.events(Object.assign({}, m), i, seedAt(i), picks.slice()); }
  function init() { S = { m: Object.assign({}, start), i: 0, picks: [], log: [], res: null }; S.ev = evAt(S.m, 0, []); }
  function paint() {
    var done = S.i >= RN, e = S.ev, h = '<div class="sim"><div class="side"><h3>' + (c.metersTitle || 'How it is going') + '</h3>' + meters(c.meters, S.m) + '</div><div class="main">';
    if (done) h += '<h3>' + (locked ? 'Finished' : 'All rounds done') + '</h3><p class="evt">' + (c.endText ? c.endText(S.m, win(S.m)) : (win(S.m) ? 'You reached the goals.' : 'Some goals are not reached yet.')) + '</p><p class="evt">' + (locked ? '' : 'Press Check.') + '</p>';
    else { h += '<h3>Round ' + (S.i + 1) + ' of ' + RN + (e.title ? ': ' + e.title : '') + '</h3><p class="evt">' + e.text + '</p>';
      if (!S.res) h += '<div class="evo">' + e.options.map(function (o, k) { return '<button type="button" class="st-opt" data-k="' + k + '"><span class="st-ot">' + o.t + '</span></button>'; }).join('') + '</div>';
      else h += '<p class="evr">' + S.res.say + '</p><button type="button" class="btn pri cont">' + (S.i + 1 >= RN ? 'See the result' : 'Next round') + '</button>'; }
    host.innerHTML = h + '</div></div>'; }
  host.addEventListener('click', function (e) { if (locked) return; var o = e.target.closest('.st-opt'), n = e.target.closest('.cont');
    if (o && !S.res) { var opt = S.ev.options[+o.dataset.k]; K.SFX.tap(); S.res = opt; S.m = apply(S.m, opt.fx); S.picks.push(opt.tag || +o.dataset.k); S.log.push(opt.t); paint(); }
    else if (n && S.res) { K.SFX.tap(); S.res = null; S.i++; if (S.i < RN) S.ev = evAt(S.m, S.i, S.picks); paint(); api.change(); } });
  function plan() { var found = null; (function rec(m, i, picks, seq) { if (found) return; if (i >= RN) { if (win(m)) found = seq; return; } var e = evAt(m, i, picks); for (var k = 0; k < e.options.length && !found; k++) { var o = e.options[k]; rec(apply(m, o.fx), i + 1, picks.concat([o.tag || k]), seq.concat([k])); } })(Object.assign({}, start), 0, [], []); return found; }
  function play(seq) { init(); seq.forEach(function (k) { var o = S.ev.options[k]; S.m = apply(S.m, o.fx); S.picks.push(o.tag || k); S.log.push(o.t); S.i++; if (S.i < RN) S.ev = evAt(S.m, S.i, S.picks); }); S.res = null; }
  init(); paint();
  return { ready: function () { return S.i >= RN && !locked; }, value: function () { return S.picks.join(','); },
    evaluate: function () { var ok = win(S.m); return { ok: ok, msg: (whyNot(c.meters, S.m) || 'Not all the goals are reached. ') + 'Try the rounds again. ', hint: c.hint || 'Watch the meters before you choose. ' }; },
    afterWrong: function () { shake(host); setTimeout(function () { salt++; init(); paint(); api.change(); }, 1500); },
    lock: function () { locked = true; paint(); }, reveal: function () { var p = plan(); if (p) play(p); S.i = RN; }, solve: function () { var p = plan(); if (p) play(p); S.i = RN; paint(); },
    summary: function () { return { m: Object.assign({}, S.m), log: S.log.slice(), tags: S.picks.slice(), win: win(S.m) }; } };
};

/* ================= BUILD: place parts on a board; live meters measure what the kid built ================= */
UI.build2 = function (host, c, api) {
  var cell = c.cell || 80, pl = [], sel = null, uid = 0, locked = false, byId = {}; c.parts.forEach(function (p) { byId[p.id] = p; });
  function used(pid) { return pl.filter(function (q) { return q.p === pid; }).length; }
  function rects(skip) { var r = (c.fixed || []).filter(function (f) { return f.block !== false; }).map(function (f) { return [f.x, f.y, f.w, f.h]; }); pl.forEach(function (q) { if (q !== skip) r.push([q.x, q.y, byId[q.p].w, byId[q.p].h]); }); return r; }
  function fits(pid, x, y) { var p = byId[pid]; if (x < 0 || y < 0 || x + p.w > c.cols || y + p.h > c.rows) return false; return !rects().some(function (r) { return x < r[0] + r[2] && x + p.w > r[0] && y < r[1] + r[3] && y + p.h > r[1]; }); }
  function calc() { return c.metrics(pl.map(function (q) { return { p: q.p, x: q.x, y: q.y, w: byId[q.p].w, h: byId[q.p].h }; }), c); }
  function win(v) { return (c.win ? c.win(v.values, pl) : c.meters.every(function (m) { return inGoal(m, v.values[m.id]); })); }
  function snapshot() { var W = c.cols * cell, H = c.rows * cell; return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="snap">' + '<rect width="' + W + '" height="' + H + '" fill="' + (c.floor || '#E8F5D7') + '"/>' + (c.snapBg || '') + pl.map(function (q) { var p = byId[q.p]; return '<g transform="translate(' + q.x * cell + ' ' + q.y * cell + ')"><rect width="' + p.w * cell + '" height="' + p.h * cell + '" rx="10" fill="' + (p.fill || '#fff') + '" stroke="#2A3B22" stroke-width="4"/>' + (p.svg ? '<g transform="translate(' + p.w * cell / 2 + ' ' + p.h * cell / 2 + ') scale(.8)">' + p.svg + '</g>' : '') + '</g>'; }).join('') + '</svg>'; }
  host.innerHTML = '<div class="bld"><div class="bl-l"><div class="board" style="width:' + c.cols * cell + 'px;height:' + c.rows * cell + 'px;background-size:' + cell + 'px ' + cell + 'px"><div class="bg">' + (c.bg || '') + '</div>' + (c.fixed || []).map(function (f) { return '<div class="fx ' + (f.cls || '') + '" style="left:' + f.x * cell + 'px;top:' + f.y * cell + 'px;width:' + f.w * cell + 'px;height:' + f.h * cell + 'px">' + (f.html || '') + '</div>'; }).join('') + '<div class="placed"></div></div></div><div class="bl-r"><div class="st-pool"></div><div class="mpan"></div><div class="issues"></div></div></div>';
  var board = $('.board', host), placed = $('.placed', host), pool = $('.st-pool', host);
  function paint() { var v = calc();
    pool.innerHTML = c.parts.map(function (p) { var left = (p.max || 99) - used(p.id); return '<button type="button" class="st-chip' + (sel === p.id ? ' sel' : '') + '" data-p="' + p.id + '"' + (left <= 0 ? ' disabled' : '') + '>' + (p.svg ? '<svg viewBox="-70 -56 140 112" width="60" height="48" aria-hidden="true">' + p.svg + '</svg>' : '') + p.label + (p.max ? ' <small>x' + left + '</small>' : '') + '</button>'; }).join('');
    placed.innerHTML = pl.map(function (q) { var p = byId[q.p]; return '<button type="button" class="st-it" data-u="' + q.u + '" aria-label="Remove ' + esc(p.label) + '" style="left:' + q.x * cell + 'px;top:' + q.y * cell + 'px;width:' + p.w * cell + 'px;height:' + p.h * cell + 'px;background:' + (p.fill || '#fff') + '">' + (p.svg ? '<svg viewBox="-70 -56 140 112" aria-hidden="true">' + p.svg + '</svg>' : '') + '<span>' + p.label + '</span></button>'; }).join('');
    $('.mpan', host).innerHTML = '<h3>' + (c.metersTitle || 'What you built') + '</h3>' + meters(c.meters, v.values); $('.issues', host).innerHTML = (v.issues || []).slice(0, 3).map(function (t) { return '<p>' + t + '</p>'; }).join(''); }
  host.addEventListener('click', function (e) { if (locked) return; var ch = e.target.closest('.st-chip'), it = e.target.closest('.st-it');
    if (ch) { sel = sel === ch.dataset.p ? null : ch.dataset.p; K.SFX.tap(); paint(); return; }
    if (it) { pl = pl.filter(function (q) { return String(q.u) !== it.dataset.u; }); K.SFX.tap(); paint(); api.change(); return; }
    if (sel && e.target.closest('.board')) { var r = board.getBoundingClientRect(), k = r.width / (c.cols * cell), x = Math.floor((e.clientX - r.left) / k / cell), y = Math.floor((e.clientY - r.top) / k / cell), p = byId[sel];
      x = Math.min(x, c.cols - p.w); y = Math.min(y, c.rows - p.h); if (used(sel) < (p.max || 99) && fits(sel, x, y)) { pl.push({ p: sel, x: x, y: y, u: ++uid }); K.SFX.tap(); if (used(sel) >= (p.max || 99)) sel = null; paint(); api.change(); } else K.SFX.bad(); } });
  function setDemo() { pl = (typeof c.demo === 'function' ? c.demo() : c.demo).map(function (q) { return { p: q.p, x: q.x, y: q.y, u: ++uid }; }); sel = null; }
  paint();
  return { ready: function () { return pl.length >= (c.minParts || 1); }, value: function () { return pl.map(function (q) { return q.p + '@' + q.x + ',' + q.y; }).join(';'); },
    evaluate: function () { var v = calc(), ok = win(v); return { ok: ok, msg: (whyNot(c.meters, v.values) || (v.issues && v.issues[0]) || 'It is not ready yet. ') + ' ', hint: c.hint || 'Watch the meters as you place each part. ' }; },
    afterWrong: function () { shake(host); }, lock: function () { locked = true; paint(); $$('button', host).forEach(function (b) { b.disabled = true; }); }, reveal: function () { setDemo(); }, solve: function () { setDemo(); paint(); },
    summary: function () { var v = calc(), kinds = {}; pl.forEach(function (q) { kinds[q.p] = (kinds[q.p] || 0) + 1; }); return { values: v.values, kinds: kinds, pl: pl.map(function (q) { return { p: q.p, x: q.x, y: q.y }; }), svg: snapshot(), count: pl.length }; } };
};

/* ================= COMPOSE: pick tiles for each part; tiles carry quality points; the text builds up and meters respond ================= */
UI.compose = function (host, c, api) {
  var pick = {}, locked = false;
  c.sections.forEach(function (s) { pick[s.id] = []; });
  function vals() { var v = {}; c.meters.forEach(function (m) { v[m.id] = m.start || 0; }); c.sections.forEach(function (s) { pick[s.id].forEach(function (id) { var t = s.tiles.filter(function (q) { return q.id === id; })[0]; Object.keys(t.fx || {}).forEach(function (k) { v[k] += t.fx[k]; }); }); }); return v; }
  function full() { return c.sections.every(function (s) { return pick[s.id].length >= (s.pick || 1); }); }
  function win(v) { return c.meters.every(function (m) { return inGoal(m, v[m.id]); }); }
  host.innerHTML = '<div class="cmp"><div class="cm-l">' + c.sections.map(function (s) { return '<div class="st-bs" data-s="' + s.id + '"><h4>' + s.label + (s.pick > 1 ? ' <small>(pick ' + s.pick + ')</small>' : '') + '</h4><div class="os">' + s.tiles.map(function (t) { return '<button type="button" class="st-bo" data-t="' + t.id + '" aria-pressed="false">' + t.t + '</button>'; }).join('') + '</div></div>'; }).join('') + '</div><div class="cm-r">' + (c.preview === false ? '' : '<div class="paper st-prev"><div class="eyebrow">' + (c.title || 'Your draft') + '</div><div class="pv"></div></div>') + '<div class="mpan"></div></div></div>';
  function paint() { $$('.st-bs', host).forEach(function (r) { var s = c.sections.filter(function (q) { return q.id === r.dataset.s; })[0]; $$('.st-bo', r).forEach(function (b) { var on = pick[s.id].indexOf(b.dataset.t) >= 0; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on); }); });
    if ($('.pv', host)) $('.pv', host).innerHTML = c.sections.map(function (s) { var t = pick[s.id].map(function (id) { return s.tiles.filter(function (q) { return q.id === id; })[0].t; }).join(' '); return t ? '<p>' + t + '</p>' : '<p class="empty">' + s.label + '</p>'; }).join(''); $('.mpan', host).innerHTML = meters(c.meters, vals()); }
  host.addEventListener('click', function (e) { var b = e.target.closest('.st-bo'); if (!b || locked) return; K.SFX.tap(); var s = c.sections.filter(function (q) { return q.id === b.closest('.st-bs').dataset.s; })[0], a = pick[s.id], i = a.indexOf(b.dataset.t), n = s.pick || 1;
    if (i >= 0) a.splice(i, 1); else { if (n === 1) a.length = 0; else if (a.length >= n) a.shift(); a.push(b.dataset.t); } paint(); api.change(); });
  function search() { var best = null; (function rec(i, cur) { if (best) return; if (i >= c.sections.length) { var save = {}; Object.keys(pick).forEach(function (k) { save[k] = pick[k]; }); pick = cur; var ok = win(vals()); pick = save; if (ok) best = cp(cur); return; } var s = c.sections[i], n = s.pick || 1, T = s.tiles.map(function (t) { return t.id; });
    (function combos(start, chosen) { if (best) return; if (chosen.length === n) { var nx = cp(cur); nx[s.id] = chosen.slice(); rec(i + 1, nx); return; } for (var k = start; k < T.length; k++) combos(k + 1, chosen.concat([T[k]])); })(0, []); })(0, {}); return best; }
  paint();
  return { ready: function () { return full(); }, value: function () { return c.sections.map(function (s) { return pick[s.id].join('+'); }).join('|'); },
    evaluate: function () { var v = vals(), ok = win(v); return { ok: ok, msg: whyNot(c.meters, v) || 'Not all the goals are reached. ', hint: c.hint || 'Swap one part and watch the meters. ' }; },
    afterWrong: function () { shake(host); }, lock: function () { locked = true; $$('button', host).forEach(function (b) { b.disabled = true; }); },
    reveal: function () { var b = search(); if (b) pick = b; }, solve: function () { var b = search(); if (b) pick = b; paint(); },
    summary: function () { return { values: vals(), text: c.sections.map(function (s) { return pick[s.id].map(function (id) { return s.tiles.filter(function (q) { return q.id === id; })[0].t; }).join(' '); }).join(' '), pick: cp(pick) }; } };
};

/* ================= STREAM: facts fly past in real time; tap to capture what matters into a notebook with limited room ================= */
UI.stream = function (host, c, api) {
  var salt = 0, cap = [], ended = false, started = false, speed = 1, timers = [], locked = false, tick = null;
  function order() { return Kit.shuffle(c.items, Kit.rng(c.seed + '|' + salt)); }
  function counts() { var key = cap.filter(function (q) { return q.good; }).length, junk = cap.length - key; return { key: key, junk: junk }; }
  function vals() { var n = counts(); return { key: n.key, junk: n.junk, room: c.cap - cap.length }; }
  var LB = c.lbl || {}, ms = [{ id: 'key', label: LB.key || 'Key facts captured', min: 0, max: c.items.filter(function (i) { return i.good; }).length, goal: [c.need, c.items.filter(function (i) { return i.good; }).length], start: 0 }, { id: 'junk', label: LB.junk || 'Small stuff captured', min: 0, max: c.cap, goal: [0, c.maxJunk], start: 0 }, { id: 'room', label: LB.room || 'Notebook room left', min: 0, max: c.cap, start: 0 }];
  host.innerHTML = '<div class="strm"><div class="lane"><div class="stage0"><button type="button" class="btn pri go">Start the talk</button><div class="sp"><span>Speed:</span><button type="button" class="st-chip" data-sp="1.7">Slow</button><button type="button" class="st-chip sel" data-sp="1">Normal</button></div></div></div><div class="nb"><div class="mpan"></div><ol class="caps"></ol></div></div>';
  var lane = $('.lane', host);
  function paint() { $('.mpan', host).innerHTML = meters(ms, vals()); $('.caps', host).innerHTML = cap.map(function (q) { return '<li>' + q.t + '</li>'; }).join(''); }
  function clear() { timers.forEach(clearTimeout); timers = []; $$('.fly', lane).forEach(function (e) { e.remove(); }); }
  function run() { started = true; ended = false; clear(); $('.stage0', host).style.display = 'none'; var it = order(), gap = c.gap * speed, life = c.life * speed;
    it.forEach(function (q, i) { timers.push(setTimeout(function () { if (!host.isConnected) return; var b = document.createElement('button'); b.type = 'button'; b.className = 'fly'; b.textContent = q.t; b.dataset.id = q.id; b.style.top = (8 + (i % 3) * 31) + '%'; b.style.transition = 'transform ' + life + 'ms linear'; lane.appendChild(b); b.getBoundingClientRect(); b.style.transform = 'translateX(-' + (lane.clientWidth + b.offsetWidth + 40) + 'px)'; timers.push(setTimeout(function () { b.remove(); }, life + 80)); }, 600 + i * gap)); });
    timers.push(setTimeout(function () { ended = true; $('.stage0', host).style.display = ''; $('.go', host).textContent = 'Play the talk again'; api.change(); }, 600 + it.length * gap + life + 200)); }
  host.addEventListener('click', function (e) { if (locked) return; var f = e.target.closest('.fly'), g = e.target.closest('.go'), sp = e.target.closest('[data-sp]');
    if (sp) { speed = +sp.dataset.sp; $$('[data-sp]', host).forEach(function (b) { b.classList.toggle('sel', b === sp); }); return; }
    if (g) { cap = []; salt++; paint(); run(); return; }
    if (f) { if (cap.length >= c.cap) { K.SFX.bad(); return; } var q = c.items.filter(function (i) { return i.id === f.dataset.id; })[0]; if (cap.some(function (z) { return z.id === q.id; })) return; K.SFX.tap(); cap.push(q); f.remove(); paint(); } });
  paint();
  return { ready: function () { return ended; }, value: function () { return cap.map(function (q) { return q.id; }).join(','); },
    evaluate: function () { var n = counts(), ok = n.key >= c.need && n.junk <= c.maxJunk; return { ok: ok, msg: (n.key < c.need ? 'You caught ' + n.key + ' key facts and need ' + c.need + '. ' : 'You caught too much small stuff. ') + 'Play the talk again. ', hint: c.hint || 'Key facts explain the topic. ' }; },
    afterWrong: function () { shake(host); ended = false; started = false; cap = []; salt++; clear(); $('.stage0', host).style.display = ''; paint(); }, lock: function () { locked = true; clear(); $$('button', host).forEach(function (b) { b.disabled = true; }); },
    reveal: function () { clear(); cap = c.items.filter(function (i) { return i.good; }).slice(0, c.cap); ended = true; paint(); }, solve: function () { clear(); cap = c.items.filter(function (i) { return i.good; }).slice(0, c.cap); ended = true; $('.stage0', host).style.display = 'none'; paint(); },
    summary: function () { return { got: cap.map(function (q) { return q.t; }), goodGot: cap.filter(function (q) { return q.good; }).map(function (q) { return q.t; }), junk: counts().junk, key: counts().key }; } };
};

/* ================= TRANSFORM: slide, turn and flip a piece onto its outline ================= */
UI.transform = function (host, c, api) {
  var cell = c.cell || 70, P = { x: c.start.x, y: c.start.y, r: c.start.r, f: c.start.f }, moves = 0, locked = false;
  function cells(p) { return c.shape.map(function (q) { var x = p.f ? -q[0] : q[0], y = q[1], k = ((p.r % 4) + 4) % 4; for (var i = 0; i < k; i++) { var t = x; x = -y; y = t; } return [x + p.x, y + p.y]; }); }
  function key(a) { return a.map(function (q) { return q.join(','); }).sort().join(';'); }
  function matched() { return key(cells(P)) === key(cells(c.target)); }
  host.innerHTML = '<div class="trf"><div class="tb"><svg class="grid" viewBox="0 0 ' + c.cols * cell + ' ' + c.rows * cell + '" width="' + c.cols * cell + '" height="' + c.rows * cell + '"></svg></div><div class="tc"><div class="pad4"><button type="button" class="btn up" data-a="up" aria-label="Slide up">Up</button><button type="button" class="btn lf" data-a="left" aria-label="Slide left">Left</button><button type="button" class="btn rt" data-a="right" aria-label="Slide right">Right</button><button type="button" class="btn dn" data-a="down" aria-label="Slide down">Down</button></div><div class="row2"><button type="button" class="btn" data-a="turn">Turn</button><button type="button" class="btn" data-a="flip">Flip</button><button type="button" class="btn" data-a="reset">Start over</button></div><div class="mpan"></div></div></div>';
  function draw() { var g = $('.grid', host), s = '<rect width="100%" height="100%" fill="#F4FAEA"/>';
    for (var i = 0; i <= c.cols; i++) s += '<line x1="' + i * cell + '" y1="0" x2="' + i * cell + '" y2="' + c.rows * cell + '" stroke="#CFE7BD" stroke-width="2"/>'; for (var j = 0; j <= c.rows; j++) s += '<line x1="0" y1="' + j * cell + '" x2="' + c.cols * cell + '" y2="' + j * cell + '" stroke="#CFE7BD" stroke-width="2"/>';
    cells(c.target).forEach(function (q) { s += '<rect x="' + q[0] * cell + '" y="' + q[1] * cell + '" width="' + cell + '" height="' + cell + '" fill="none" stroke="#C46A17" stroke-width="5" stroke-dasharray="10 8"/>'; });
    cells(P).forEach(function (q) { s += '<rect x="' + (q[0] * cell + 4) + '" y="' + (q[1] * cell + 4) + '" width="' + (cell - 8) + '" height="' + (cell - 8) + '" rx="10" fill="' + (c.fill || '#3E8E41') + '" opacity="' + (matched() ? '1' : '.88') + '"/>'; }); g.innerHTML = s;
    $('.mpan', host).innerHTML = meters([{ id: 'mv', label: 'Moves used', min: 0, max: c.limit + 4, goal: [0, c.limit], start: 0 }], { mv: moves }) + (matched() ? '<p class="evr">The piece fits the outline.</p>' : ''); }
  host.addEventListener('click', function (e) { var b = e.target.closest('[data-a]'); if (!b || locked) return; var a = b.dataset.a; K.SFX.tap();
    if (a === 'reset') { P = { x: c.start.x, y: c.start.y, r: c.start.r, f: c.start.f }; moves = 0; } else { moves++; if (a === 'left') P.x--; else if (a === 'right') P.x++; else if (a === 'up') P.y--; else if (a === 'down') P.y++; else if (a === 'turn') P.r = (P.r + 1) % 4; else if (a === 'flip') P.f = !P.f; }
    draw(); api.change(); });
  draw();
  return { ready: function () { return moves > 0; }, value: function () { return [P.x, P.y, P.r, P.f ? 1 : 0, moves].join(','); },
    evaluate: function () { var m = matched(), ok = m && moves <= c.limit; return { ok: ok, msg: m ? 'It fits, but it took ' + moves + ' moves. Try with ' + c.limit + ' or fewer. ' : 'The piece is not on the outline yet. ', hint: c.hint || 'A slide moves the piece, a turn spins it, a flip mirrors it. ' }; },
    afterWrong: function () { shake(host); P = { x: c.start.x, y: c.start.y, r: c.start.r, f: c.start.f }; moves = 0; draw(); }, lock: function () { locked = true; $$('button', host).forEach(function (b) { b.disabled = true; }); },
    reveal: function () { P = { x: c.target.x, y: c.target.y, r: c.target.r, f: c.target.f }; moves = c.par || 3; }, solve: function () { P = { x: c.target.x, y: c.target.y, r: c.target.r, f: c.target.f }; moves = c.par || 3; draw(); },
    summary: function () { return { moves: moves, turned: P.r !== c.start.r, flipped: P.f !== c.start.f }; } };
};

/* ================= INVEST: set a split, run it through years of a market that is different for every learner ================= */
UI.invest = function (host, c, api) {
  var amt = {}, ran = null, locked = false, COL = ['#1B6CA8', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00'], unit = c.unit || '';
  c.assets.forEach(function (a) { amt[a.id] = 0; });
  var rnd = Kit.rng(c.seed + '|mkt'), G = [], N = {}; function gauss() { var u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  for (var y = 0; y < c.years; y++) G.push(gauss()); c.assets.forEach(function (a) { N[a.id] = []; for (var y2 = 0; y2 < c.years; y2++) N[a.id].push(gauss()); });
  function ret(a, y) { var b = a.beta || 0; return cl((a.mu + a.sd * (b * G[y] + Math.sqrt(1 - b * b) * N[a.id][y])) / 100, -0.45, 0.6); }
  function sim(al) { var v = c.total, vals = [v], peak = v, dd = 0; for (var y = 0; y < c.years; y++) { var nv = 0; c.assets.forEach(function (a) { nv += (al[a.id] || 0) * (1 + ret(a, y)); }); v = nv; vals.push(v); peak = Math.max(peak, v); dd = Math.max(dd, (peak - v) / peak * 100); } return { vals: vals, final: v, dd: dd }; }
  function used() { return c.assets.reduce(function (s, a) { return s + amt[a.id]; }, 0); }
  function sig() { return c.assets.map(function (a) { return amt[a.id]; }).join('|'); }
  var best = null, units = Math.round(c.total / c.step); (function rec(i, left, cur) { if (i === c.assets.length - 1) { cur[c.assets[i].id] = left * c.step; var r = sim(cur); if (r.dd <= c.maxDD && (!best || r.final > best.r.final)) best = { al: Object.assign({}, cur), r: r }; return; } for (var k = 0; k <= left; k += Math.max(1, Math.round(units / 10))) { cur[c.assets[i].id] = k * c.step; rec(i + 1, left - k, cur); } })(0, units, {});
  var fdOnly = {}; fdOnly[c.assets[0].id] = c.total; var base = sim(fdOnly).final, goal = best ? Math.max(Math.round((base + 0.55 * (best.r.final - base)) / 1000) * 1000, Math.round(base / 1000) * 1000) : Math.round(base / 1000) * 1000;
  if (best && best.r.final < goal) goal = Math.floor(best.r.final / 1000) * 1000;
  host.innerHTML = '<div class="inv"><div class="rows">' + c.assets.map(function (a, i) { return '<div class="st-ar" data-id="' + a.id + '"><span class="sw" style="background:' + COL[i % 6] + '"></span><div class="lb"><b>' + a.label + '</b><small>' + a.sub + '</small></div><button type="button" class="pm" data-d="-1" aria-label="Less ' + esc(a.label) + '"><svg viewBox="0 0 48 48"><path d="M10 24h28" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg></button><output></output><button type="button" class="pm" data-d="1" aria-label="More ' + esc(a.label) + '"><svg viewBox="0 0 48 48"><path d="M24 10v28M10 24h28" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg></button></div>'; }).join('') + '<button type="button" class="btn pri runbtn">Run ' + c.years + ' years</button></div><div class="res"></div></div>';
  function paint() { $$('.st-ar', host).forEach(function (r) { var id = r.dataset.id; $('output', r).textContent = unit + X.inr(amt[id]) + ' (' + Math.round(amt[id] / c.total * 100) + '%)'; $$('.pm', r).forEach(function (b) { b.disabled = locked; }); });
    var left = c.total - used(), rb = $('.runbtn', host); rb.disabled = locked || left !== 0; rb.textContent = left === 0 ? 'Run ' + c.years + ' years' : unit + X.inr(left) + ' left to place';
    var R = ran, h = '<div class="goalbox"><b>Goal</b><span>Reach ' + unit + X.inr(goal) + ' and never fall more than ' + c.maxDD + '% from a peak.</span></div>';
    if (R) { var W = 560, H = 250, mx = Math.max(goal, Math.max.apply(null, R.vals)) * 1.08, mn = Math.min(c.total, Math.min.apply(null, R.vals)) * 0.9, px = function (i) { return 40 + i * (W - 60) / c.years; }, py = function (v) { return H - 24 - (v - mn) / (mx - mn) * (H - 44); };
      h += '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart"><line x1="40" x2="' + (W - 20) + '" y1="' + py(goal) + '" y2="' + py(goal) + '" stroke="#C46A17" stroke-width="4" stroke-dasharray="10 8"/><polyline fill="none" stroke="#1B6CA8" stroke-width="6" points="' + R.vals.map(function (v, i) { return px(i) + ',' + py(v); }).join(' ') + '"/>' + R.vals.map(function (v, i) { return '<circle cx="' + px(i) + '" cy="' + py(v) + '" r="6" fill="#1B6CA8"/>'; }).join('') + '</svg>';
      var okG = R.final >= goal, okD = R.dd <= c.maxDD; h += '<div class="stat"><span class="' + (okG ? 'good' : 'warn') + '">Ended at ' + unit + X.inr(R.final) + (okG ? ' (goal met)' : ' (below the goal)') + '</span><span class="' + (okD ? 'good' : 'warn') + '">Biggest fall ' + Math.round(R.dd) + '%' + (okD ? ' (safe enough)' : ' (too bumpy)') + '</span></div>'; }
    else h += '<p class="evr">Place all the money, then run the years to see how your split does in this market.</p>'; $('.res', host).innerHTML = h; }
  host.addEventListener('click', function (e) { if (locked) return; var b = e.target.closest('.pm'), r = e.target.closest('.runbtn'); if (b) { var id = b.closest('.st-ar').dataset.id, d = +b.dataset.d * c.step; if (d > 0 && used() + d > c.total) return; if (d < 0 && amt[id] + d < 0) return; amt[id] += d; K.SFX.tap(); ran = null; paint(); api.change(); } else if (r && !r.disabled) { K.SFX.tap(); var s = sim(amt); ran = { vals: s.vals, final: s.final, dd: s.dd, sig: sig() }; paint(); api.change(); } });
  paint();
  return { ready: function () { return !!ran && ran.sig === sig(); }, value: function () { return sig(); },
    evaluate: function () { var ok = ran.final >= goal && ran.dd <= c.maxDD; return { ok: ok, msg: ran.final < goal ? 'It ended below the goal. Add more growth. ' : 'The ride was too bumpy. Add steadier choices. ', hint: ran.final < goal ? 'Stocks and index funds grow more over years. ' : 'Fixed deposits, bonds and gold move less. ' }; },
    afterWrong: function () { shake(host); }, lock: function () { locked = true; paint(); }, reveal: function () { if (best) { amt = Object.assign({}, best.al); var s = sim(amt); ran = { vals: s.vals, final: s.final, dd: s.dd, sig: sig() }; } }, solve: function () { if (best) { amt = Object.assign({}, best.al); var s = sim(amt); ran = { vals: s.vals, final: s.final, dd: s.dd, sig: sig() }; } paint(); },
    summary: function () { return { alloc: Object.assign({}, amt), final: ran ? ran.final : 0, dd: ran ? ran.dd : 0, goal: goal, vals: ran ? ran.vals : [] }; } };
};
})();
