/* Coach (v3 story mode): a small guide peeks in, says her own line(s) (situation, why it matters), then READS ALOUD the screen's instruction while that
   instruction is highlighted. The instruction text is never repeated in her bubble (DP-515). Then she leaves.
   v3: no Next button and no Skip. Each line moves on by itself once spoken; the guidance cannot be cut short.
   While she talks the page underneath is inert; only Skip (top-right) is live.
   API: Coach.play(lines, {done()}) | Coach.hear(lines) (audio only, no character) | Coach.stop() | Coach.skip() | Coach.active() | Coach.setVoice(bool)
   lines: [{id, t}]  guide lines          [{ins:true, sid}]  read the screen instruction aloud (clip i_<sid>, else the device voice) */
'use strict';
window.Coach = (function () {
  var ART = (window.CONTENT && window.CONTENT.guideImg) || 'assets/img/guide.webp'; // the project's own character
  var root = null, st = null, tok = 0, tfb = 0, tmt = 0, tty = 0, tyc = null, AUD = null, voiceOn = true;

  function stage() { return document.getElementById('stage'); }
  function inertSet(on) { ['.hdr', '#content', '.ftr', '#layer'].forEach(function (s) { var e = document.querySelector(s); if (e) { if (on) e.setAttribute('inert', ''); else e.removeAttribute('inert'); } }); stage().classList.toggle('coaching', !!on); }
  function spotClear() { Array.prototype.forEach.call(document.querySelectorAll('.cspot'), function (e) { e.classList.remove('cspot'); }); var o = document.getElementById('spotsvg'); if (o && o.parentNode) o.parentNode.removeChild(o); if (root) root.classList.remove('spot'); }
  function spotOn(nodes, dim) { // a true spotlight: the page is dimmed everywhere EXCEPT a bright window with a ring around the highlighted element(s)
    spotClear(); nodes = [].concat(nodes).filter(function (n) { return n && n.getBoundingClientRect; }); if (!nodes.length) return;
    var stg = stage().getBoundingClientRect(), k = stg.width / 1920, pad = 14;
    var rects = nodes.map(function (n) { var r = n.getBoundingClientRect(); return { x: (r.left - stg.left) / k - pad, y: (r.top - stg.top) / k - pad, w: r.width / k + 2 * pad, h: r.height / k + 2 * pad }; });
    function box(r, extra) { return '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="26" ' + extra + '/>'; }
    var el = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); el.setAttribute('id', 'spotsvg'); el.setAttribute('viewBox', '0 0 1920 1080'); el.setAttribute('aria-hidden', 'true');
    el.innerHTML = (dim ? '<defs><mask id="spotmask"><rect width="1920" height="1080" fill="#fff"/>' + rects.map(function (r) { return box(r, 'fill="#000"'); }).join('') + '</mask></defs><rect width="1920" height="1080" fill="rgba(18,24,34,.55)" mask="url(#spotmask)"/>' : '')
      + rects.map(function (r) { return box(r, 'class="ring" fill="none" stroke="#FFC93C" stroke-width="8"'); }).join('');
    if (root && dim) { root.insertBefore(el, root.querySelector('.who')); root.classList.add('spot'); } else stage().appendChild(el);
  }
  function clearTimers() { clearTimeout(tfb); clearInterval(tmt); clearInterval(tty); }
  var BLOB = {}, FLY = {}, WAITED = {}, PQ = [], PB = 0; // voice clips: downloaded ahead of time, so a slow connection never delays the voice
  function pump() { while (PB < 3 && PQ.length) { (function (id) { PB++; FLY[id] = 1; fetch('assets/audio/' + id + '.mp3').then(function (r) { return r.ok ? r.blob() : Promise.reject(); }).then(function (b) { BLOB[id] = URL.createObjectURL(b); }).catch(function () {}).then(function () { FLY[id] = 0; PB--; pump(); }); })(PQ.shift()); } }
  function preload(ids, first) { ids.forEach(function (id) { if (BLOB[id] || FLY[id]) return; var k = PQ.indexOf(id); if (k >= 0) PQ.splice(k, 1); if (first) PQ.unshift(id); else PQ.push(id); }); pump(); }
  function whenReady(id, cb) { var n = 0; (function w() { if (BLOB[id] || (!FLY[id] && PQ.indexOf(id) < 0) || n++ > 50) return cb(); setTimeout(w, 60); })(); } // waits up to 3 s for a clip that is still on its way
  function boot() { var N = window.NARRATION || {}, I = window.INSTR || {}, a = [], b = []; Object.keys(N).forEach(function (k) { a.push(k); }); Object.keys(I).forEach(function (k) { b.push('i_' + k); }); var ord = ['i_pick'].concat(a, b); preload(ord); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  function audStop() { if (AUD) { try { AUD.onended = AUD.onerror = AUD.onplay = AUD.onplaying = null; AUD.pause(); } catch (e) {} AUD = null; } }
  function pickVoice() { // DP-517: Indian English first, then any English voice
    try { var v = speechSynthesis.getVoices() || [], en = v.filter(function (x) { return /^en/i.test(x.lang); });
      return en.filter(function (x) { return /en[-_]IN/i.test(x.lang); })[0] || en.filter(function (x) { return /Zira|Aria|Jenny|Samantha|Female/i.test(x.name); })[0] || en[0] || null; } catch (e) { return null; }
  }
  function say(text, ended, id, sync) { // recorded clip when there is one, else the device voice, else silent timing; with Voice off it is silent
    var my = tok, done = false, est = Math.max(2200, text.length * 62 + 1200);
    function fin() { if (done || my !== tok) return; done = true; clearTimeout(tfb); audStop(); ended(); }
    if (!voiceOn) { if (sync) sync(est); tfb = setTimeout(fin, est); return; } // silent: give enough reading time, since lines now move on by themselves
    if (id) {
      if (!BLOB[id] && !WAITED[id] && (FLY[id] || PQ.indexOf(id) >= 0)) { WAITED[id] = 1; preload([id], true); whenReady(id, function () { if (my === tok) say(text, ended, id, sync); }); return; } // the text waits for its voice, so they start together
      try { var a = new Audio(BLOB[id] || 'assets/audio/' + id + '.mp3'); AUD = a; a.onplay = function () { if (my === tok && root) root.classList.add('talk'); };
        a.onplaying = function () { if (my === tok && sync && !a._synced) { a._synced = 1; sync(isFinite(a.duration) && a.duration > 0 ? a.duration * 1000 : est); } }; // the text starts the moment the voice does
        a.onended = function () { if (my !== tok) return; if (root) root.classList.remove('talk'); fin(); };
        a.onerror = function () { if (my === tok && AUD === a) { AUD = null; say(text, ended, null, sync); } }; tfb = setTimeout(fin, 30000);
        var pr = a.play(); if (pr && pr.catch) pr.catch(function () { if (my === tok && AUD === a) { AUD = null; clearTimeout(tfb); say(text, ended, null, sync); } }); return; } catch (e) {} }
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { if (sync) sync(est); tfb = setTimeout(fin, est); return; }
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text), v = pickVoice(); if (v) u.voice = v; u.lang = (v && v.lang) || 'en-IN'; u.rate = 0.95; u.pitch = 1.1;
      u.onstart = function () { if (my === tok && root) root.classList.add('talk'); if (my === tok && sync) sync(est); };
      u.onend = u.onerror = function () { if (my !== tok) return; if (root) root.classList.remove('talk'); fin(); };
      speechSynthesis.speak(u); tfb = setTimeout(fin, est * 1.8 + 2500); // some browsers never fire onend
    } catch (e) { if (sync) sync(est); tfb = setTimeout(fin, est); }
  }
  function typeText(el, text, my) { // words appear in step with the voice; the full text is laid out invisibly first so the bubble never grows or jumps
    var vis = document.createElement('span'), hid = document.createElement('span'); hid.style.visibility = 'hidden'; hid.textContent = text; el.textContent = ''; el.appendChild(vis); el.appendChild(hid);
    var starts = []; text.replace(/\S+\s*/g, function (m, off) { starts.push(off); return m; });
    tyc = { t0: null, total: Math.max(1200, text.length * 55) }; // t0 stays empty (no text yet) until the voice starts
    setTimeout(function () { if (my === tok && tyc && tyc.t0 === null) typeSync(tyc.total / 0.93); }, 3000); // safety: never leave the bubble blank if audio is slow
    clearInterval(tty); tty = setInterval(function () { if (my !== tok || !tyc) { clearInterval(tty); return; } if (tyc.t0 === null) return;
      var f = Math.min(1, (Date.now() - tyc.t0) / tyc.total), lim = text.length * f, n = 0; while (n < starts.length && starts[n] <= lim) n++;
      var i = f >= 1 || n >= starts.length ? text.length : starts[n]; vis.textContent = text.slice(0, i); hid.textContent = text.slice(i); if (f >= 1) clearInterval(tty); }, 30);
  }
  function typeSync(ms) { if (tyc) { tyc.t0 = Date.now(); tyc.total = Math.max(800, ms * 0.93); } } // finish typing just before the voice finishes

  // the screen's own instruction: found on the page, highlighted, and read aloud (clip if it is fixed text, device voice if it holds learner data)
  function insInfo(sid) {
    var node = document.querySelector('#content .toprow .guide') || document.querySelector('#content .ask') || document.querySelector('#content .solve .eyebrow'), I = window.INSTR && window.INSTR[sid];
    return { node: node, text: I ? I.join(' ') : '', id: I ? 'i_' + sid : null }; // v3: guidance that holds learner data (no INSTR entry) is not read aloud
  }
  function revealBubbles() { Array.prototype.forEach.call(document.querySelectorAll('#content .gbub'), function (b) { b.classList.remove('wait', 'typing'); b.classList.add('in'); }); }

  function showLine(i) {
    if (!st || !root) return; var my = ++tok, L = st.lines[i], bub = root.querySelector('.say');
    clearTimers(); audStop(); root.classList.remove('talk'); try { speechSynthesis.cancel(); } catch (e) {} spotClear();
    st.i = i; bub.classList.remove('show');
    setTimeout(function () {
      if (my !== tok || !st || !root) return;
      if (L.ins) { // read the on-screen instruction aloud while it is highlighted; the guide's bubble stays away so nothing is shown twice
        var r = insInfo(L.sid); revealBubbles(); if (!r.text) { leave(); return; }
        spotOn(r.node, true);
        say(r.text, function () { if (my === tok && st) leave(); }, r.id); return;
      }
      if (L.spot) { // v3: light up what this line is about and say it; no bubble, because those words are already on screen
        spotOn([].slice.call(document.querySelectorAll(L.spot)), true);
        say(L.say || L.t, function () { if (my !== tok || !st) return; tfb = setTimeout(function () { if (my === tok && st) advance(); }, 500); }, L.id); return;
      }
      bub.innerHTML = '<div class="tx"></div>'; bub.classList.add('show');
      typeText(bub.querySelector('.tx'), L.t, my);
      say(L.say || L.t, function () { if (my !== tok || !st) return; tfb = setTimeout(function () { if (my === tok && st) advance(); }, 700); }, L.id, typeSync); // v3: moves on by itself once the line is spoken

    }, i === 0 ? 0 : 260);
  }
  function advance() { if (!st || st.leaving) return; if (st.i < st.lines.length - 1) showLine(st.i + 1); else leave(); }
  function leave() {
    if (!st || st.leaving) return; st.leaving = true; tok++; clearTimers(); audStop(); try { speechSynthesis.cancel(); } catch (e) {}
    spotClear(); var r = root, o = st.o; r.querySelector('.say').classList.remove('show'); r.classList.remove('talk', 'idle'); r.classList.add('off');
    setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); if (root === r) { root = null; st = null; inertSet(false); } if (o.done) o.done(); }, 420);
  }

  function play(lines, o) {
    stop(); o = o || {}; if (!lines || !lines.length) { if (o.done) o.done(); return; }
    if (o.voice != null) voiceOn = !!o.voice;
    root = document.createElement('div'); root.id = 'coach'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Your guide is talking');
    root.innerHTML = '<div class="shade"></div><div class="who" aria-hidden="true"><img alt="" src="' + ART + '"></div><div class="say" aria-live="polite"></div>'; // v3: no Skip; the guidance always plays to the end
    stage().appendChild(root); st = { lines: lines, o: o, i: 0 }; inertSet(true);
    function begin() { var im = root.querySelector('.who img'), go = function () { if (!root) return; root.classList.add('on', 'in'); setTimeout(function () { if (root) root.classList.add('idle'); }, 650); setTimeout(function () { if (st) showLine(0); }, 550); }; if (im && im.decode) im.decode().then(go, go); else go(); }
    var active = true; try { active = navigator.userActivation ? navigator.userActivation.hasBeenActive : true; } catch (e) {}
    if (!active) { // first screen of a fresh page: audio needs a tap, so ask for one (the grey shade fades in first)
      root.classList.add('on'); var g = document.createElement('div'); g.className = 'gate'; g.innerHTML = '<button type="button">Tap to meet your guide</button>'; root.appendChild(g);
      g.querySelector('button').addEventListener('click', function () { g.parentNode.removeChild(g); begin(); }); g.querySelector('button').focus();
    } else begin();
  }
  function hear(lines) { // "Hear again" (DP-516): the same lines as audio only, no character, with the instruction highlighted
    stop(); if (!voiceOn || !lines || !lines.length) return; audStop(); try { speechSynthesis.cancel(); } catch (e) {} var my = ++tok, i = 0;
    (function nxt() { if (my !== tok) return; spotClear(); if (i >= lines.length) return; var L = lines[i++], t = L.t, id = L.id;
      if (L.ins) { var r = insInfo(L.sid); revealBubbles(); spotOn(r.node, false); t = r.text; id = r.id; }
      if (!t) { nxt(); return; } say(t, function () { if (my !== tok) return; setTimeout(function () { if (my === tok) { nxt(); } }, 250); }, id); })();
  }
  function stop() { var had = st || root; tok++; audStop(); try { speechSynthesis.cancel(); } catch (e) {} clearTimers(); spotClear(); if (root && root.parentNode) root.parentNode.removeChild(root); root = null; st = null; if (had) inertSet(false); }
  return { preload: preload, play: play, hear: hear, stop: stop, active: function () { return !!st; }, skip: function () { if (st) leave(); }, setVoice: function (v) { voiceOn = !!v; if (!voiceOn) { audStop(); try { speechSynthesis.cancel(); } catch (e) {} } } };
})();
