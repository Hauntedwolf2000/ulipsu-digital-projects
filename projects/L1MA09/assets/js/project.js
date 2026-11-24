/* L1MA09 Garden Builders: Pip the hedgehog.
   The kid DESIGNS a garden plot (a sandbox builder with live meters). Every later screen is built from that garden:
   the facts to check, the count of corners and the sign all come from the shapes the kid actually placed. Two different branches follow the build. */
(function () {
'use strict';
var K = window.DP, Kit = window.Kit, X = window.Studio, esc = K.esc;
var ST = 'stroke="#2A3B22" stroke-width="3" stroke-linejoin="round"';
function P(p) { return p.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '); }
function face(p, c, ov) { return '<polygon points="' + P(p) + '" fill="' + c + '" ' + ST + '/>' + (ov ? '<polygon points="' + P(p) + '" fill="' + ov + '"/>' : ''); }
var SH = {
  cuboid: function (x, y, c) { var w = 96, h = 54, d = 32, a = x - (w + d) / 2, b = y - (h + d) / 2; return face([[a, b + d], [a + d, b], [a + w + d, b], [a + w, b + d]], c, 'rgba(255,255,255,.4)') + face([[a, b + d], [a + w, b + d], [a + w, b + d + h], [a, b + d + h]], c) + face([[a + w, b + d], [a + w + d, b], [a + w + d, b + h], [a + w, b + d + h]], c, 'rgba(0,0,0,.22)'); },
  cylinder: function (x, y, c) { return '<path d="M' + (x - 42) + ' ' + (y - 36) + ' L' + (x - 42) + ' ' + (y + 36) + ' A42 14 0 0 0 ' + (x + 42) + ' ' + (y + 36) + ' L' + (x + 42) + ' ' + (y - 36) + ' Z" fill="' + c + '" ' + ST + '/><ellipse cx="' + x + '" cy="' + (y - 36) + '" rx="42" ry="14" fill="' + c + '" ' + ST + '/><ellipse cx="' + x + '" cy="' + (y - 36) + '" rx="42" ry="14" fill="rgba(255,255,255,.4)"/>'; },
  cone: function (x, y, c) { return '<path d="M' + x + ' ' + (y - 46) + ' L' + (x - 42) + ' ' + (y + 34) + ' A42 12 0 0 0 ' + (x + 42) + ' ' + (y + 34) + ' Z" fill="' + c + '" ' + ST + '/>'; },
  pyramid: function (x, y, c) { var t = [x, y - 46], fl = [x - 48, y + 30], fr = [x + 12, y + 42], br = [x + 50, y + 18]; return face([t, fl, fr], c) + face([t, fr, br], c, 'rgba(0,0,0,.25)'); },
  sphere: function (x, y, c) { return '<circle cx="' + x + '" cy="' + y + '" r="40" fill="' + c + '" ' + ST + '/><circle cx="' + (x - 14) + '" cy="' + (y - 16) + '" r="10" fill="rgba(255,255,255,.55)"/>'; },
  rect: function (x, y, c) { return '<rect x="' + (x - 56) + '" y="' + (y - 26) + '" width="112" height="52" rx="4" fill="' + c + '" ' + ST + '/>'; },
  square: function (x, y, c) { return '<rect x="' + (x - 36) + '" y="' + (y - 36) + '" width="72" height="72" rx="4" fill="' + c + '" ' + ST + '/>'; },
  circle: function (x, y, c) { return '<circle cx="' + x + '" cy="' + y + '" r="42" fill="' + c + '" ' + ST + '/>'; }
};
/* what each shape is (the facts the kid will use) and how big it is on the plot */
var KIND = { cuboid: { n: 'cuboid', solid: 1, f: 6, e: 12, c: 8, w: 2, h: 1 }, cylinder: { n: 'cylinder', solid: 1, f: 3, e: 2, c: 0, w: 1, h: 1 }, cone: { n: 'cone', solid: 1, f: 2, e: 1, c: 1, w: 1, h: 1 }, pyramid: { n: 'triangular pyramid', solid: 1, f: 4, e: 6, c: 4, w: 1, h: 1 }, sphere: { n: 'sphere', solid: 1, f: 1, e: 0, c: 0, w: 1, h: 1 }, rect: { n: 'rectangle', solid: 0, s: 4, c: 4, w: 2, h: 1 }, square: { n: 'square', solid: 0, s: 4, c: 4, w: 1, h: 1 }, circle: { n: 'circle', solid: 0, s: 0, c: 0, w: 2, h: 2 } };
var COLS = 8, ROWS = 4, CELL = 100;
var VARS = [
  { id: 'read', name: 'Reading Garden', problem: 'A calm corner with benches and a fountain.', learn: ['3D shapes', 'Faces and corners', 'Moving shapes'], role: 'Designer of the Reading Garden', sign: 'Welcome to the Reading Garden', pal: '#2F7D32',
    parts: [['cuboid', 'Bench', '#B77945', 3], ['cylinder', 'Basin', '#8FB8D8', 4], ['cone', 'Tree', '#2F7D32', 2], ['pyramid', 'Statue', '#E0B040', 3], ['rect', 'Bed', '#E9A8B8', 1], ['square', 'Tile', '#C9B79C', 1], ['circle', 'Pond', '#6EC1E4', 3]] },
  { id: 'bug', name: 'Bug Garden', problem: 'Flower beds and a pond for bees and butterflies.', learn: ['2D and 3D shapes', 'Counting edges', 'Sliding shapes'], role: 'Designer of the Bug Garden', sign: 'Welcome to the Bug Garden', pal: '#D9A441',
    parts: [['cuboid', 'Hive', '#D9A441', 3], ['cylinder', 'Pot', '#D2765B', 3], ['cone', 'Pine', '#3C8D40', 2], ['sphere', 'Stone', '#9AA5B1', 1], ['rect', 'Bed', '#F29BB5', 1], ['square', 'Herbs', '#7BC67E', 1], ['circle', 'Pond', '#6EC1E4', 3]] },
  { id: 'play', name: 'Play Garden', problem: 'A sandbox and a big tree for little ones.', learn: ['Naming solids', 'Faces and edges', 'Flipping shapes'], role: 'Designer of the Play Garden', sign: 'Welcome to the Play Garden', pal: '#E4572E',
    parts: [['cuboid', 'Sand', '#E8B04B', 3], ['cylinder', 'Trunk', '#A66A3F', 3], ['cone', 'Tent', '#E4572E', 2], ['sphere', 'Ball', '#4F9DDE', 1], ['rect', 'Track', '#9AD0EC', 1], ['square', 'Mat', '#F7B267', 1], ['circle', 'Rug', '#7BC67E', 3]] }
];
function icon(kind, c, w) { return '<svg viewBox="0 0 150 120" width="' + (w || 64) + '" height="' + Math.round((w || 64) * .8) + '" aria-hidden="true" style="vertical-align:middle;margin-right:10px">' + SH[kind](75, 62, c) + '</svg>'; }
function partsOf(v) { return v.parts.map(function (p) { var k = KIND[p[0]]; return { id: p[0], kind: p[0], label: p[1], fill: p[2], cost: p[3], w: k.w, h: k.h, max: p[0] === 'circle' ? 1 : 3, svg: SH[p[0]](0, 0, p[2]) }; }); }
function makeData(seed, v) { var r = Kit.rng(seed + 'rock'); return { rock: [2 + Math.floor(r() * 4), 1 + Math.floor(r() * 2)] }; }
function partOf(v, z) { return v.parts.filter(function (q) { return q[0] === z; })[0]; }
function lbl(v, z) { var p = partOf(v, z); return p ? p[1].toLowerCase() : KIND[z].n; }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ---------- 1. design the plot (a builder with live meters) ---------- */
var BUDGET = 26;
function g1(D, v) {
  var parts = partsOf(v), byId = {}; parts.forEach(function (p) { byId[p.id] = p; });
  var rock = D.rock, free = COLS * ROWS - 1;
  function metrics(pl) { var kinds = {}, solids = 0, cells = 0, coins = 0; pl.forEach(function (q) { var p = byId[q.p]; kinds[p.kind] = 1; if (KIND[p.kind].solid) solids++; cells += q.w * q.h; coins += p.cost; });
    var vals = { variety: Object.keys(kinds).length, solids: solids, used: Math.round(cells / free * 100), coins: coins }, iss = [];
    if (vals.variety < 5) iss.push('Try more kinds of shapes. You have ' + vals.variety + '.'); else if (solids < 3) iss.push('Add more solid shapes.'); else if (vals.used < 35) iss.push('The plot looks empty. Add more.'); else if (vals.used > 75) iss.push('It is too crowded to walk through.'); else if (coins > BUDGET) iss.push('You spent too many coins.');
    return { values: vals, issues: iss }; }
  function demo() { var want = [], solids = parts.filter(function (p) { return KIND[p.kind].solid; }), cnt = [2, 1, 2, 1];
    solids.forEach(function (p, i) { for (var k = 0; k < (cnt[i] || 1); k++) want.push(p); });
    ['circle', 'rect', 'square'].forEach(function (kk) { var p = byId[kk]; if (p) for (var k = 0; k < (kk === 'circle' ? 1 : 2); k++) want.push(p); });
    want.sort(function (a, b) { return b.w * b.h - a.w * a.h; }); var occ = {}, out = []; occ[rock[0] + ',' + rock[1]] = 1;
    want.forEach(function (p) { for (var y = 0; y + p.h <= ROWS; y++) for (var x = 0; x + p.w <= COLS; x++) { var okk = true; for (var a = 0; a < p.w && okk; a++) for (var b = 0; b < p.h; b++) if (occ[(x + a) + ',' + (y + b)]) { okk = false; break; } if (okk) { for (var a2 = 0; a2 < p.w; a2++) for (var b2 = 0; b2 < p.h; b2++) occ[(x + a2) + ',' + (y + b2)] = 1; out.push({ p: p.id, x: x, y: y }); return; } } }); return out; }
  return { cols: COLS, rows: ROWS, cell: CELL, parts: parts, fixed: [{ x: rock[0], y: rock[1], w: 1, h: 1, cls: 'rock', html: '<span>Rock</span>' }], bg: '', floor: '#DDEFC9',
    meters: [{ id: 'variety', label: 'Different shapes', goal: [5, 8], max: 8, start: 0 }, { id: 'solids', label: 'Solid (3D) shapes', goal: [3, 7], max: 10, start: 0 }, { id: 'used', label: 'Plot filled', goal: [35, 75], max: 100, unit: '%', start: 0 }, { id: 'coins', label: 'Coins spent', goal: [0, BUDGET], max: 40, start: 0 }],
    metrics: metrics, demo: demo, minParts: 3, metersTitle: 'Your plot', hint: 'Aim for five kinds of shapes, three or more solids, and a plot about half full. ' };
}
/* ---------- 2. move a piece (slide, turn, flip) ---------- */
var F5 = [[0, 0], [1, 0], [1, 1], [1, 2], [2, 1]], TC = 8, TR = 5;
function tcells(p) { return F5.map(function (q) { var x = p.f ? -q[0] : q[0], y = q[1], k = ((p.r % 4) + 4) % 4; for (var i = 0; i < k; i++) { var t = x; x = -y; y = t; } return [x + p.x, y + p.y]; }); }
function tin(p) { return tcells(p).every(function (q) { return q[0] >= 0 && q[0] < TC && q[1] >= 0 && q[1] < TR; }); }
function tkey(p) { return p.x + ',' + p.y + ',' + p.r + ',' + (p.f ? 1 : 0); }
function par(a, b) { var seen = {}, q = [[a, 0]]; seen[tkey(a)] = 1; while (q.length) { var cur = q.shift(), p = cur[0], d = cur[1]; if (tkey(p) === tkey(b)) return d; [{ x: p.x - 1, y: p.y, r: p.r, f: p.f }, { x: p.x + 1, y: p.y, r: p.r, f: p.f }, { x: p.x, y: p.y - 1, r: p.r, f: p.f }, { x: p.x, y: p.y + 1, r: p.r, f: p.f }, { x: p.x, y: p.y, r: (p.r + 1) % 4, f: p.f }, { x: p.x, y: p.y, r: p.r, f: !p.f }].forEach(function (n) { if (tin(n) && !seen[tkey(n)]) { seen[tkey(n)] = 1; q.push([n, d + 1]); } }); } return 99; }
function g2(D, v) { var r = Kit.rng(D.seed + 'trf'), a, b, pr = 0, tries = 0;
  do { a = { x: 1 + Math.floor(r() * 5), y: Math.floor(r() * 3), r: Math.floor(r() * 4), f: r() < .5 }; b = { x: 1 + Math.floor(r() * 5), y: Math.floor(r() * 3), r: Math.floor(r() * 4), f: r() < .5 }; tries++; pr = tin(a) && tin(b) ? par(a, b) : 99; } while ((pr < 3 || pr > 6) && tries < 4000);
  if (pr > 6) { a = { x: 1, y: 1, r: 0, f: false }; b = { x: 4, y: 1, r: 1, f: true }; pr = par(a, b); }
  return { cols: TC, rows: TR, cell: 70, shape: F5, start: a, target: b, par: pr, limit: pr + 2, fill: v.pal, note: 'This piece is part of your ' + v.name + ' plan. Move it onto the dotted outline in ' + (pr + 2) + ' moves or fewer.', hint: 'Look at which way the long arm points. A turn spins it, a flip mirrors it, a slide moves it. ' }; }
/* ---------- 3. check the facts of what the kid built (two branches) ---------- */
function usedKinds(res, solid) { var k = (res.g1 && res.g1.kinds) || {}; return Object.keys(k).filter(function (z) { return !!KIND[z].solid === solid; }); }
function pad(list, pool, n) { var out = list.slice(); pool.forEach(function (z) { if (out.length < n && out.indexOf(z) < 0) out.push(z); }); return out; }
function rowLabel(v, k) { var p = partOf(v, k); return icon(k, p ? p[2] : '#E0B040', 56) + cap(KIND[k].n); }
function g3a(D, v, x) { var res = x.res || {}, rows = pad(usedKinds(res, true), ['cuboid', 'cylinder', 'cone', 'pyramid', 'sphere'], 3), r = Kit.rng(D.seed + 'g3a');
  return { head: ['Faces', 'Edges', 'Corners'], note: 'A curved surface counts as 1 face. These are the solids you used.', choices: [0, 1, 2, 3, 4, 5, 6, 8, 12], rows: rows.map(function (k) { var f = [KIND[k].f, KIND[k].e, KIND[k].c], fc = Math.floor(r() * 3); return { label: rowLabel(v, k), cells: f.map(function (n, j) { return j === fc ? { t: String(n) } : { ans: n }; }) }; }) }; }
function g3b(D, v, x) { var res = x.res || {}, rows = pad(usedKinds(res, false), ['rect', 'square', 'circle'], 3), r = Kit.rng(D.seed + 'g3b');
  return { head: ['Straight sides', 'Corners'], note: 'A circle has no straight sides. These are the flat shapes you used.', choices: [0, 1, 2, 3, 4, 5, 6], rows: rows.map(function (k, i) { var f = [KIND[k].s, KIND[k].c], fc = i === 0 ? Math.floor(r() * 2) : -1; return { label: rowLabel(v, k), cells: f.map(function (n, j) { return j === fc ? { t: String(n) } : { ans: n }; }) }; }) }; }
/* ---------- 4. a week in the garden (a simulation: choices move the meters; events depend on the meters) ---------- */
function g4(D, v, x) { var res = x.res || {}, kinds = (res.g1 && res.g1.kinds) || {}, round = !!(kinds.cylinder || kinds.sphere), solids = (res.g1 && res.g1.values && res.g1.values.solids) || 0, pointy = !!(kinds.cone || kinds.pyramid);
  return { seed: D.seed, rounds: 4, metersTitle: 'Your garden this week', meters: [{ id: 's', label: 'Safety', min: 0, max: 100, start: 50, goal: [60, 100] }, { id: 'f', label: 'Fun', min: 0, max: 100, start: 50, goal: [60, 100] }, { id: 'm', label: 'Savings', min: 0, max: 100, start: 50, goal: [25, 100] }],
    hint: 'Safety and fun both matter, and so do savings. A cheap fix now can save money later. ',
    endText: function (m, w) { return w ? 'A safe, happy garden with money left.' : 'One of the goals is missed.'; },
    events: function (m, i, seed, picks) { var rr = Kit.rng(seed), flip = rr() < .5;
      if (i === 0) return { title: flip ? 'Heavy rain' : 'Strong wind', text: (flip ? 'Rain makes the ground slippery. ' : 'Wind tips light things over. ') + (round ? 'Your round shapes could roll away.' : 'Your shapes sit flat and steady.'), options: [{ t: round ? 'Wedge the round shapes with flat blocks' : 'Check every shape is steady', fx: { s: 15, m: -10 }, say: 'Flat bases do not roll. Safer, but it cost a little.' }, { t: 'Move everything to the flat corner', fx: { s: 10, f: -5 }, say: 'Safer, but the garden feels cramped.' }, { t: 'Leave it as it is', fx: { s: -15, f: 5 }, say: 'Risky. Something could roll or tip.' }] };
      if (i === 1) return { title: 'Children visit', text: 'Children want to climb. ' + (solids ? 'You have ' + solids + ' solid shapes. ' : '') + (pointy ? 'The pointed shapes are not safe to climb.' : 'The flat tops are good to sit on.'), options: [{ t: 'Add flat-topped seats to sit on', fx: { f: 10, s: 5, m: -10 }, say: 'Flat tops are good seats.' }, { t: 'Let them climb the shapes', fx: { f: 15, s: -15 }, say: 'Fun, but someone could fall.' }, { t: 'Rope off the risky shapes', fx: { s: 10, f: -10 }, say: 'Safe, but less fun.' }] };
      if (i === 2) return m.s < 50 ? { title: 'A child slipped', text: 'A child slipped on the wet path. Safety needs help.', options: [{ t: 'Fix the slope and add soft tiles', fx: { s: 20, m: -15 }, say: 'Better. Safety goes up.' }, { t: 'Put up a warning sign', fx: { s: 5 }, say: 'A small help.' }, { t: 'Ignore it', fx: { s: -10, f: -5 }, say: 'This makes things worse.' }] } : { title: 'Garden fair', text: 'Everyone wants to visit the garden. ' + (flip ? 'It is a sunny day.' : 'The sky is bright.'), options: [{ t: 'Open a game corner on the flat shapes', fx: { f: 15, m: -10 }, say: 'Lots of fun, and it costs a little.' }, { t: 'Sell lemonade on the bench', fx: { m: 15, f: 5 }, say: 'Money comes in and people smile.' }, { t: 'Do nothing special', fx: { f: -5 }, say: 'A quiet day.' }] };
      return m.m < 30 ? { title: 'Money is low', text: 'The savings are running low.', options: [{ t: 'Hold a plant sale', fx: { m: 15, f: 5 }, say: 'Savings grow.' }, { t: 'Ask parents to help', fx: { m: 10, s: 5 }, say: 'A little help arrives.' }, { t: 'Cut the fun stuff', fx: { m: 5, f: -10 }, say: 'Saves a little, but no one is happy.' }] } : { title: 'Final touches', text: 'The week is nearly over. One last choice.', options: [{ t: 'Put up a rules board', fx: { s: 10, m: -5 }, say: 'Visitors know what is safe.' }, { t: 'Paint the shapes in bright colours', fx: { f: 10, m: -5 }, say: 'It looks cheerful.' }, { t: 'Keep the money safe', fx: { m: 5 }, say: 'A tidy bank balance.' }] }; } }; }
/* ---------- 5. count what is in the garden (the answer is different for every kid) ---------- */
function totals(res) { var k = (res.g1 && res.g1.kinds) || {}, c = 0, f = 0; Object.keys(k).forEach(function (z) { if (KIND[z].solid) { c += KIND[z].c * k[z]; f += KIND[z].f * k[z]; } }); return { c: c, f: f, k: k }; }
function g5(D, v, x) { var res = x.res || {}, t = totals(res), list = Object.keys(t.k).filter(function (z) { return KIND[z].solid; }).map(function (z) { return t.k[z] + ' ' + KIND[z].n + (t.k[z] > 1 ? 's' : ''); }).join(', ');
  return { top: '<div class="mygarden">' + ((res.g1 && res.g1.svg) || '') + '</div><p class="st-q">Your solids: ' + (list || 'none') + '.</p>', fields: [{ lbl: 'All corners', ans: t.c, unit: 'corners' }, { lbl: 'All faces', ans: t.f, unit: 'faces' }], hint: 'Count one shape, then multiply by how many you used. ' }; }
/* ---------- 6. write the garden sign (compose from true and false facts about the kid's own shapes) ---------- */
function g6(D, v, x) { var res = x.res || {}, k = (res.g1 && res.g1.kinds) || {}, so = Object.keys(k).filter(function (z) { return KIND[z].solid; }); if (!so.length) so = ['cuboid'];
  var a = so[0], b = so[so.length > 1 ? 1 : 0], A = KIND[a], B = KIND[b];
  function bump(n, d) { return n + d; }
  return { title: 'Your garden sign', seed: D.seed, meters: [{ id: 'facts', label: 'True facts', min: -3, max: 3, start: 0, goal: [2, 3] }, { id: 'kind', label: 'Friendly tone', min: -2, max: 3, start: 0, goal: [1, 3] }], hint: 'Pick the facts that are true for your own shapes and keep the tone friendly. ',
    sections: [{ id: 'w', label: 'Welcome', tiles: X.mix([{ id: 'w1', t: v.sign + '.', fx: { kind: 2 } }, { id: 'w2', t: 'Come in, friends.', fx: { kind: 1 } }, { id: 'w3', t: 'Keep out.', fx: { kind: -2 } }], D, 'w') },
      { id: 's', label: 'A fact about your ' + lbl(v, a), tiles: X.mix([{ id: 's1', t: 'The ' + lbl(v, a) + ' is a ' + A.n + ', with ' + A.f + ' face' + (A.f > 1 ? 's' : '') + '.', fx: { facts: 1 } }, { id: 's2', t: 'The ' + lbl(v, a) + ' is a ' + A.n + ', with ' + bump(A.f, 2) + ' faces.', fx: { facts: -1 } }, { id: 's3', t: 'The ' + lbl(v, a) + ' is a flat shape.', fx: { facts: -1 } }], D, 's') },
      { id: 't', label: 'A fact about your ' + lbl(v, b), tiles: X.mix([{ id: 't1', t: 'The ' + lbl(v, b) + ' has ' + B.c + ' corner' + (B.c === 1 ? '' : 's') + '.', fx: { facts: 1 } }, { id: 't2', t: 'The ' + lbl(v, b) + ' has ' + bump(B.c, 3) + ' corners.', fx: { facts: -1 } }, { id: 't3', t: 'The ' + lbl(v, b) + ' has ' + bump(B.e, 5) + ' edges.', fx: { facts: -1 } }], D, 't') },
      { id: 'c', label: 'A kind closing line', tiles: X.mix([{ id: 'c1', t: 'Please enjoy every shape.', fx: { kind: 1 } }, { id: 'c2', t: 'Look and learn.', fx: { kind: 1 } }, { id: 'c3', t: 'Do not touch anything.', fx: { kind: -1 } }], D, 'c') }] }; }

function nm(res) { var k = (res.g1 && res.g1.kinds) || {}, n = 0; Object.keys(k).forEach(function (z) { n += k[z]; }); return n; }
function pdfGarden(pdf, x, y, w, h, t, Sx, D, v, res) { var g = res.g1; pdf.rect(x, y, w, h, '#FFFFFF', t.ink, 1.5); pdf.text(x + w / 2, y + 22, v.name, 14, 'bold', t.ink, 'c'); if (!g) return; var sc = (w - 40) / (COLS * CELL), ox = x + 20, oy = y + 40; pdf.rect(ox, oy, COLS * CELL * sc, ROWS * CELL * sc, '#E8F5D7', t.ink, 1);
  g.pl.forEach(function (q) { var p = partOf(v, q.p), k = KIND[q.p]; pdf.rect(ox + q.x * CELL * sc + 1, oy + q.y * CELL * sc + 1, k.w * CELL * sc - 2, k.h * CELL * sc - 2, p ? p[2] : '#CCCCCC', t.ink, 0.8); pdf.text(ox + (q.x + k.w / 2) * CELL * sc, oy + (q.y + k.h / 2) * CELL * sc + 3, p ? p[1] : '', 9, 'bold', '#222222', 'c'); });
  var s = res.g6 && res.g6.text ? res.g6.text : ''; pdf.para(x + 20, oy + ROWS * CELL * sc + 24, 'My sign: ' + s, 10, w - 40, 13, 'sans', '#2D3748'); }

X.project({ title: 'Garden Builders', short: 'Garden', goal: 'Design a school garden where every shape fits.', makes: 'a garden of your own design', guideName: 'Pip', reportLabel: 'My garden report', artTitle: 'Your garden',
  variants: VARS, data: makeData, themes: [{ id: 'moss', n: 'Moss', ink: '#2A3B22', acc: '#3E8E41', hi: '#F2994A', paper: '#F6FCEF' }, { id: 'bloom', n: 'Bloom', ink: '#5A2A4B', acc: '#C2477F', hi: '#F2B705', paper: '#FFF5FA' }, { id: 'pond', n: 'Pond', ink: '#1B4F6A', acc: '#2E8BC0', hi: '#7BD88F', paper: '#F2FAFF' }],
  slots: [
    { alts: [{ id: 'g1', name: 'Design the plot', type: 'build2', build: g1, good: 'A garden that fits its plot.', answer: function () { return 'Five kinds of shapes, three or more solids, the plot about half full, and the coins within ' + BUDGET + '.'; } }] },
    { alts: [{ id: 'g2', name: 'Move the piece', type: 'transform', build: g2, good: 'The piece fits.', answer: function () { return 'Slide, turn and flip it onto the outline.'; } }] },
    { pick: function (res) { return res.g1 && res.g1.values && res.g1.values.solids >= 5 ? 'g3a' : 'g3b'; }, alts: [
      { id: 'g3a', name: 'Check your solids', type: 'tablefill', build: g3a, good: 'The solid facts are right.', answer: function () { return 'Faces, edges and corners of the solids you used.'; } },
      { id: 'g3b', name: 'Check your flat shapes', type: 'tablefill', build: g3b, good: 'The flat facts are right.', answer: function () { return 'Straight sides and corners of the flat shapes you used.'; } }] },
    { alts: [{ id: 'g4', name: 'A week in the garden', type: 'sim', build: g4, good: 'A safe, happy week.', answer: function () { return 'Fix the risks early, keep it fun, and keep some savings.'; } }] },
    { alts: [{ id: 'g5', name: 'Count your shapes', type: 'keypad', build: g5, good: 'The counts are right.', answer: function (D, v, x) { var t = totals((x && x.res) || {}); return t.c + ' corners and ' + t.f + ' faces.'; } }] },
    { alts: [{ id: 'g6', name: 'Write the sign', type: 'compose', build: g6, good: 'A true, friendly sign.', answer: function () { return 'True shape facts and a friendly tone.'; } }] }],
  findings: function (D, v, res) { var g = res.g1; return 'I designed the ' + v.name + ' with ' + nm(res) + ' parts' + (g ? ' (' + g.values.solids + ' solid shapes and ' + g.values.variety + ' kinds of shapes)' : '') + '. I moved a piece, checked shape facts, ran my garden through a week and wrote its sign.'; },
  result: function () { return 'You designed the plot, checked your own shape facts and ran the garden through a week.'; },
  chain: function (Sx, D, v, res) { var g = res.g1, w = res.g4, sg = res.g6; return [{ choice: 'Your choice', consequence: v.name + '. ' + v.problem }, { choice: 'Your plot', consequence: g ? nm(res) + ' parts, ' + g.values.solids + ' solid shapes, ' + g.values.variety + ' kinds of shapes, ' + g.values.used + '% of the plot used, ' + g.values.coins + ' coins.' : 'Designed.' }, { choice: 'Your solution', consequence: (w ? 'Your week ended with Safety ' + Math.round(w.m.s) + ', Fun ' + Math.round(w.m.f) + ' and Savings ' + Math.round(w.m.m) + '. ' : '') + (sg && sg.text ? 'Sign: ' + sg.text : '') }, { choice: 'Outcome', consequence: v.role + '.' }]; },
  art: function (Sx, D, v, res) { var g = res.g1; return '<div class="heroart">' + (g ? '<div class="mygarden">' + g.svg + '</div>' : '<img src="assets/img/v_' + v.id + '.webp" alt="">') + '<b>' + esc(v.role) + '</b></div>'; },
  summary: function (D, v, res) { var g = res.g1; return [v.name, g ? 'Parts: ' + nm(res) + ', solids: ' + g.values.solids : '', res.g4 ? 'Week: safety ' + Math.round(res.g4.m.s) + ', fun ' + Math.round(res.g4.m.f) : '', res.g6 ? 'Sign: ' + res.g6.text : ''].filter(Boolean); },
  pdfArt: pdfGarden,
  outro: 'You designed a garden, tested it, and used shape facts to make it work.' });
})();
