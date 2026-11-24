/* GKH Project Champ: 🌿 Tree view and 📈 PERT chart for a project (the Gantt toolbar: PERT · Tree view · WBS).
   Tree view: the core chip in the middle powers every level 1 task (a limb), its 1.1 sub-tasks (branches) and 1.1.1 steps (leaves), like a banyan.
   Hover or tap a task: current runs through it, then water fills to its % done, then its status shows (Not started, Under way, Done).
   PERT: the level 1 tasks as a network with early and late dates, float and three-point estimates, the critical path in red, and the odds of the planned finish.
   admin-plan.js builds the data (M.treeView / M.pertView) from the plan; this file only draws. */
(function () {
  'use strict';
  var M = window.MBS; if (!M) return;
  var NS = 'http://www.w3.org/2000/svg', UID = 0;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var RMq = function () { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); };
  var hx = function (c) { return [1, 3, 5].map(function (k) { return parseInt(c.slice(k, k + 2), 16); }); };
  var mix = function (a, b, t) { var A = hx(a), B = hx(b); return '#' + A.map(function (v, k) { return ('0' + Math.round(v + (B[k] - v) * t).toString(16)).slice(-2); }).join(''); };
  var C = [['#ffd65c', '#ff8a3d'], ['#a9c8ff', '#5b7dff'], ['#3ff5d2', '#1ea0ff'], ['#b49bff', '#f06bff'], ['#8dff7a', '#14c98b'], ['#ff8fa3', '#ff3fa4'], ['#5fe1ff', '#c46bff'], ['#ffe9a3', '#e8b43a'], ['#c8f56b', '#5fcf3b'], ['#ffb88a', '#ff7a45']];
  M.tvHue = function (i) { return C[i % C.length]; };
  // ⛶ full screen for the view's card, fitted to the screen
  function fsBtn(btn, card) {
    if (!btn) return;
    if (!card.requestFullscreen) { btn.hidden = true; return; }
    btn.onclick = function () { (document.fullscreenElement ? document.exitFullscreen() : card.requestFullscreen()).catch(M.fail); };
    var sync = function () { var on = document.fullscreenElement === card; card.classList.toggle('tvfs', on); btn.textContent = on ? '✕ Exit full screen' : '⛶ Full screen'; if (!document.contains(card)) document.removeEventListener('fullscreenchange', sync); };
    document.addEventListener('fullscreenchange', sync);
  }

  // ---------- 🌿 Tree view ----------
  // D: { name, r, pm, pct, facts: [..], tasks: [{ n, name, owner, r, d, pct, crit, subs: [{ n, name, owner, r, d, pct, crit, steps: [{ n, name, owner, r, d, done, crit }] }] }] }
  M.treeView = function (host, D, opts) {
    opts = opts || {}; var id = 'tv' + (++UID), RM = RMq(), T = D.tasks || [];
    host.innerHTML = '<div class="tvx">' +
      '<div class="tvx-tools"><button class="btn btn-sm tvx-cpb" type="button" aria-pressed="false"' + (T.some(function (t) { return t.crit; }) ? '' : ' disabled title="No critical path yet: add dates and links on the Gantt"') + '>⚡ Critical path</button>' +
      '<span class="tvx-wl"><i></i>Water: done, or filled as far as it has got</span><span class="sp"></span>' +
      '<div class="tabs" style="margin:0"><button class="tab" type="button" data-fit="1">Fit to screen</button><button class="tab" type="button" data-fit="0">Actual size</button></div><button class="btn btn-sm tvx-fs" type="button">⛶ Full screen</button></div>' +
      '<div class="tvx-key" role="group" aria-label="Level 1 tasks"></div>' +
      '<div class="tvx-board"><svg class="tvx-svg" role="img" aria-label="' + esc(D.name) + ' as a circuit tree"></svg></div>' +
      '<aside class="tvx-panel" aria-label="Task details"><button class="tvx-x" type="button" aria-label="Close">×</button><div class="tvx-pb"></div></aside></div>';
    var root = host.firstChild, svg = root.querySelector('svg'), key = root.querySelector('.tvx-key'), board = root.querySelector('.tvx-board');
    var el = function (n, a, p) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); (p || svg).appendChild(e); return e; };
    var N = T.length, ROW = 36;
    // about 60% of the tasks grow above the main branch, the rest hang below it (banyan style); left half outer to inner, right half inner to outer
    var U = N <= 3 ? N : Math.ceil(N * .6), L = N - U, UL = Math.ceil(U / 2), UR = U - UL, LL = Math.ceil(L / 2), LR = L - LL;
    var bh = function (s) { var n = (s.steps || []).length; return 52 + (n ? 26 + (n - 1) * ROW + 24 : 14) + 14; };
    var ch = function (t) { return (t.subs || []).reduce(function (a, s) { return a + bh(s); }, 0); };
    var mx0 = function (L0) { return L0.length ? Math.max.apply(0, L0) : 0; };
    var UP = mx0(T.slice(0, U).map(ch)), DN = mx0(T.slice(U).map(ch)), CH2 = 48;
    var LIMB = 40 + UP + 170, BOT = L ? LIMB + 130 + DN + 40 : LIMB + CH2 + 300, H = BOT + 30;
    var CW = Math.max(680, U * 100 + 140, 2 * (150 + (Math.max(LL, LR, 1) - 1) * 100) + 140), mU = Math.max(UL, UR, 1), mL = Math.max(LL, LR);
    // ↔ use the whole screen: on a wide screen the limbs spread out until the drawing is as wide as the space it has
    var bw = board.clientWidth, bhh = board.clientHeight, SP = 360;
    if (opts.fill !== false && bw > 200 && bhh > 200) { var tHalf = bw / bhh * H / 2, fit = Math.min((tHalf - 100) / mU, mL ? (tHalf - 230) / mL : 1e9); SP = Math.max(360, Math.min(900, fit)); }
    var half = Math.max(70 + mU * SP, 200 + mL * SP, CW / 2 + 60) + 30, W = Math.round(half * 2), TX = Math.round(half);
    var POS = T.map(function (t, i) {
      if (i < U) { var left = i < UL, k = left ? i : i - UL;
        return { s: left ? -1 : 1, up: true, X: left ? TX - 70 - (UL - 1 - k) * SP : TX + 70 + k * SP, pin: TX + (i - (U - 1) / 2) * 100, lv: 66 + 14 * (left ? k : UR - 1 - k) }; }
      var j = i - U, lf = j < LL, q = lf ? j : j - LL;
      return { s: lf ? -1 : 1, up: false, X: lf ? TX - 200 - (LL - 1 - q) * SP : TX + 200 + q * SP, pin: lf ? TX - 150 - (LL - 1 - q) * 100 : TX + 150 + q * 100, lv: 66 + 14 * (lf ? q : LR - 1 - q) };
    });
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var defs = el('defs', {});
    var glow = el('filter', { id: id + 'gl', filterUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, defs);   // a straight line has no height: the glow is measured on the whole drawing
    el('feGaussianBlur', { stdDeviation: '2', result: 'b' }, glow); var mg = el('feMerge', {}, glow); el('feMergeNode', { in: 'b' }, mg); el('feMergeNode', { in: 'b' }, mg); el('feMergeNode', { in: 'SourceGraphic' }, mg);
    var soft = el('filter', { id: id + 'sf', filterUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, defs); el('feGaussianBlur', { stdDeviation: '7' }, soft);
    var gi = 0, grad = function (a, b, x1, y1, x2, y2) { var gid = id + 'g' + (gi++), g = el('linearGradient', { id: gid, gradientUnits: 'userSpaceOnUse', x1: x1, y1: y1, x2: x2, y2: y2 }, defs); el('stop', { offset: '0', 'stop-color': a }, g); el('stop', { offset: '1', 'stop-color': b }, g); return 'url(#' + gid + ')'; };
    var pat = el('pattern', { id: id + 'pcb', width: 40, height: 40, patternUnits: 'userSpaceOnUse' }, defs);
    el('path', { d: 'M40 0H0V40', fill: 'none', stroke: 'rgba(120,150,230,.07)', 'stroke-width': 1 }, pat); el('circle', { cx: 0, cy: 0, r: 1.6, fill: 'rgba(140,170,255,.16)' }, pat);
    el('rect', { x: 0, y: 0, width: W, height: H, fill: '#0a1124' }); el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#' + id + 'pcb)' });
    var GLOW = 'url(#' + id + 'gl)', SOFT = 'url(#' + id + 'sf)';
    // layers: lines, water, critical path, charge, pads, labels
    var LY = [0, 1, 2, 3, 4, 5].map(function () { return el('g', {}); }), groups = {};
    var grp = function (k) { if (!groups[k]) groups[k] = LY.map(function (l) { return el('g', { class: 'grp', 'data-g': k }, l); }); return groups[k]; };
    var poly = function (P) { var r = 10, d = 'M' + P[0]; for (var i = 1; i < P.length - 1; i++) { var a = P[i - 1], b = P[i], c = P[i + 1], l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]); if (!l1 || !l2) continue; var k1 = Math.min(r, l1 / 2), k2 = Math.min(r, l2 / 2); d += 'L' + [b[0] - (b[0] - a[0]) / l1 * k1, b[1] - (b[1] - a[1]) / l1 * k1] + 'L' + [b[0] + (c[0] - b[0]) / l2 * k2, b[1] + (c[1] - b[1]) / l2 * k2]; } return d + 'L' + P[P.length - 1]; };
    var CH = [], WT = [], BD = [];
    function trace(d, stroke, w, g, depth, crit, wf) {
      var G = grp(g);
      el('path', { d: d, fill: 'none', stroke: 'rgba(4,8,20,.9)', 'stroke-width': w + 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'base' }, G[0]);
      el('path', { d: d, fill: 'none', stroke: stroke, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .8, class: 'base' }, G[0]);
      if (wf > 0) WT.push({ p: el('path', { d: d, class: 'wat' + (wf >= 1 ? ' flow' : ''), 'stroke-width': Math.max(1.6, w - .6) }, G[1]), f: Math.min(1, wf), g: g });
      if (crit) el('path', { d: d, class: 'cpl', 'stroke-width': w + 2.4, filter: GLOW }, G[2]);
      var halo = el('path', { d: d, fill: 'none', stroke: stroke, 'stroke-width': w + 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: SOFT, class: 'hl' }, G[3]);
      var fill = el('path', { d: d, fill: 'none', stroke: stroke, 'stroke-width': w + 1.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: GLOW, class: 'hl vivid' }, G[3]);
      var spark = el('path', { d: d, fill: 'none', stroke: '#fff', 'stroke-width': w + 1.6, 'stroke-linecap': 'round', filter: GLOW, class: 'hl' }, G[3]);
      CH.push({ g: g, halo: halo, fill: fill, spark: spark, depth: depth });
    }
    function pad(x, y, r, c, g, crit, big) { var G = grp(g); if (big) el('circle', { cx: x, cy: y, r: r + 11, fill: c, opacity: .3, filter: SOFT }, G[4]); el('circle', { cx: x, cy: y, r: r, fill: '#0b1226', stroke: c, 'stroke-width': big ? 3 : 2.2, class: 'pad node' + (crit ? ' cr' : '') }, G[4]); el('circle', { cx: x, cy: y, r: Math.max(1.8, r * .4), fill: c }, G[4]); }
    function text(x, y, s, cls, anchor, g, fill, crit) { var t = el('text', { x: x, y: y, class: 'lbl ' + cls + (crit ? ' cr' : ''), 'text-anchor': anchor, 'dominant-baseline': 'middle' }, grp(g)[5]); if (fill) t.style.fill = fill; t.textContent = s; return t; }
    function badge(ref, pct, g) { var b = el('g', { class: 'badge' }, grp(g)[5]), st = pct >= 100 ? 'done' : pct > 0 ? 'doing' : 'todo';
      var r = el('rect', { rx: 10, height: 22, class: 'bd-' + st }, b), t = el('text', { class: 'lbl notag bt bt-' + st, 'dominant-baseline': 'middle' }, b);
      t.textContent = st === 'done' ? '💧 Done · 100%' : st === 'doing' ? 'Under way · ' + pct + '%' : 'Not started · 0%'; BD.push({ b: b, r: r, t: t, ref: ref, g: g }); }
    var cut = function (s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
    var meta = function (o, extra) { return [o.owner, o.r, o.d + (o.d === 1 ? ' day' : ' days')].filter(Boolean).concat(extra || []).join(' · '); };

    T.forEach(function (t, i) {
      var p = POS[i], s = p.s, up = p.up, X = p.X, g = 't' + i, c = C[i % C.length], anc = s > 0 ? 'start' : 'end';
      var HY = up ? LIMB - 130 : LIMB + 130, dir = up ? -1 : 1;
      // ⚡ each task draws its power from a pin on the core chip: the top pins feed the limbs above, the bottom pins the ones hanging below
      trace(poly([[p.pin, LIMB + dir * (CH2 + 2)], [p.pin, LIMB + dir * p.lv], [X, LIMB + dir * p.lv], [X, HY]]), grad(c[0], c[1], p.pin, LIMB, X, HY), 2.8, g, 0, t.crit, t.pct / 100);
      var y = up ? HY - 40 - ch(t) : HY + 40;
      (t.subs || []).forEach(function (u, j) {
        var ny = y + 52, nx = X + s * 44, tone = mix(c[0], c[1], t.subs.length > 1 ? j / (t.subs.length - 1) : 0);
        trace(poly([[X, HY], [X, ny], [nx, ny]]), grad(c[1], tone, X, HY, nx, ny), 2.2, g, 1, u.crit, u.pct / 100);
        pad(nx, ny, 8, tone, g, u.crit);
        var un = text(nx - s * 6, ny - 34, u.n + ' ' + cut(u.name, 30), 'sb', anc, g, tone, u.crit); badge(un, u.pct, g);
        text(nx - s * 6, ny - 16, cut(meta(u, u.pct + '%'), 46), 'sm', anc, g, null, u.crit);
        (u.steps || []).forEach(function (st, q) {
          var ly = ny + 26 + q * ROW, lx = nx + s * 86, lt = mix(tone, '#ffffff', .18);
          trace(poly([[nx, ny], [nx + s * 26, ny], [nx + s * 26, ly], [lx, ly]]), lt, 1.6, g, 2, st.crit, st.done ? 1 : 0);
          pad(lx, ly, 5.5, lt, g, st.crit);
          text(lx + s * 12, ly - 8, st.n + ' ' + cut(st.name, 26) + (st.done ? ' ✓' : ''), 'leaf', anc, g, null, st.crit);
          text(lx + s * 12, ly + 9, cut(meta(st), 40), 'lm', anc, g, null, st.crit);
        });
        y += bh(u);
      });
      pad(X, HY, 15, c[0], g, t.crit, true);
      var tn = text(X + s * 26, HY - 10, t.n + ' ' + cut(t.name, 28), 'hb', anc, g, c[0], t.crit); badge(tn, t.pct, g);
      text(X + s * 26, HY + 13, cut(meta(t, t.pct + '%'), 48), 'hm', anc, g, null, t.crit);
    });
    // 🪵 the trunk: from the core down to the ground, carrying the project's key facts
    (function () {
      var G = grp('Core'), top = LIMB + CH2 + 12, F = D.facts || [];
      [['#ffd65c', '#ff8a3d'], ['#ffe9a3', '#e8b43a'], ['#fff0b3', '#ffcf4a'], ['#ffe9a3', '#e8b43a'], ['#ffd65c', '#ff8a3d']].forEach(function (b, k) { trace('M' + (TX + (k - 2) * 9) + ' ' + top + 'V' + BOT, grad(b[0], b[1], 0, top, 0, BOT), k === 2 ? 3.2 : 2.2, 'Core', 0, false, (D.pct || 0) / 100); });
      F.forEach(function (f, k) { var yy = top + 46 + k * ((BOT - top - 80) / Math.max(1, F.length - 1)), Lf = k % 2 === 0, x = TX + (Lf ? -22 : 22), ex = TX + (Lf ? -48 : 48);
        el('path', { d: 'M' + x + ' ' + yy + 'H' + ex, stroke: '#ffcf4a', 'stroke-width': 1.4, opacity: .8 }, G[0]);
        el('rect', { x: ex + (Lf ? -8 : 0), y: yy - 4, width: 8, height: 8, rx: 1.5, fill: '#e8c35a' }, G[4]);
        text(ex + (Lf ? -14 : 14), yy, cut(f, 34), 'tf', Lf ? 'end' : 'start', 'Core', '#f2dc9c'); });
      el('path', { d: 'M' + (TX - 420) + ' ' + BOT + 'H' + (TX + 420), stroke: grad('#0a1124', '#ffcf4a', TX - 420, 0, TX, 0), 'stroke-width': 1.6 }, G[0]);
    })();
    // 🔲 the core chip, in the middle: every task draws power from it; its gauge fills with water as the project gets done
    (function () {
      var G = grp('Core'), w = CW, h = CH2 * 2, x = TX - w / 2, y = LIMB - h / 2;
      var gold = grad('#fff0b3', '#b8860b', 0, y, 0, y + h), face = grad('#1f2b52', '#0b1124', 0, y, 0, y + h), edge = grad('#a07a1e', '#5c4310', 0, y + h, 0, y + h + 8);
      el('rect', { x: x - 6, y: y + 4, width: w + 12, height: h + 14, rx: 16, fill: '#000', opacity: .55, filter: SOFT }, G[4]);
      var nP = Math.round(w / 30); for (var k = 0; k < nP; k++) { var px = x + 20 + k * ((w - 40) / (nP - 1)); el('rect', { x: px - 3, y: y - 11, width: 6, height: 13, rx: 1.5, fill: gold }, G[4]); el('rect', { x: px - 3, y: y + h + 4, width: 6, height: 13, rx: 1.5, fill: gold }, G[4]); }
      for (var q = 0; q < 3; q++) { var py = y + 24 + q * ((h - 48) / 2); el('rect', { x: x - 12, y: py - 3, width: 14, height: 6, rx: 1.5, fill: gold }, G[4]); el('rect', { x: x + w - 2, y: py - 3, width: 14, height: 6, rx: 1.5, fill: gold }, G[4]); }
      el('rect', { x: x, y: y + 6, width: w, height: h, rx: 12, fill: edge }, G[4]);
      el('rect', { x: x, y: y, width: w, height: h, rx: 12, fill: face, stroke: gold, 'stroke-width': 3.2 }, G[4]);
      el('rect', { x: x + 9, y: y + 9, width: w - 18, height: h - 18, rx: 7, fill: 'none', stroke: 'rgba(255,255,255,.14)', 'stroke-width': 1.2 }, G[4]);
      el('rect', { x: x + 10, y: y + 10, width: w - 20, height: (h - 20) * .45, rx: 6, fill: 'rgba(255,255,255,.05)' }, G[4]);
      var t1 = text(TX, y + 26, cut(String(D.name || 'Project').toUpperCase(), 40), 'hb', 'middle', 'Core', '#ffe08a'); t1.style.letterSpacing = '.1em'; t1.classList.add('notag');
      text(TX, y + 50, cut([D.r, D.pm ? 'PM ' + D.pm : ''].filter(Boolean).join(' · '), 70), 'hm', 'middle', 'Core', '#d9c58e').classList.add('notag');
      var gx = x + 120, gw = w - 240, gy = y + 70;
      el('rect', { x: gx, y: gy - 5, width: gw, height: 10, rx: 5, fill: 'rgba(103,232,249,.12)', stroke: 'rgba(103,232,249,.35)' }, G[4]);
      el('rect', { x: gx, y: gy - 5, width: gw * Math.min(100, D.pct || 0) / 100, height: 10, rx: 5, fill: '#67e8f9', class: 'gauge' }, G[4]);
      text(gx + gw + 12, gy, (D.pct || 0) + '% done', 'gl', 'start', 'Core', '#a5f3fc').classList.add('notag');
    })();
    [0, 2, 3, 1, 4, 5].forEach(function (k) { svg.appendChild(LY[k]); });   // the water runs on top of the current, so it shows once the branch is lit
    CH.forEach(function (c) { c.L = c.fill.getTotalLength(); c.s = Math.max(14, Math.min(40, c.L * .2)); [c.halo, c.fill].forEach(function (q) { q.setAttribute('stroke-dasharray', c.L + ' ' + c.L); q.style.strokeDashoffset = c.L; }); c.spark.setAttribute('stroke-dasharray', c.s + ' ' + (c.L + c.s * 2)); c.spark.style.strokeDashoffset = c.s; });
    WT.forEach(function (w) { w.L = w.p.getTotalLength(); if (w.f < 1) w.p.setAttribute('stroke-dasharray', (w.f * w.L) + ' ' + (w.L + 1)); });

    key.innerHTML = T.map(function (t, i) { var c = C[i % C.length]; return '<button type="button" data-k="t' + i + '" style="--lc:' + c[0] + '" aria-pressed="false"><i style="background:linear-gradient(90deg,' + c[0] + ',' + c[1] + ',' + c[0] + ')"></i><b>' + esc(t.n) + '</b> ' + esc(cut(t.name, 34)) + ' <em>' + t.pct + '%</em></button>'; }).join('');
    // ⚡ the current first (the limb, then its branches, then its leaves), then 💧 the water fills up to its % done, then the status shows
    var CUR = '', T0 = 0, RAF = 0, pinned = '';
    function place(b) { var bb = b.ref.getBBox(), tw = b.t.getComputedTextLength(), right = b.ref.getAttribute('text-anchor') !== 'end', x = right ? bb.x + bb.width + 14 : bb.x - 14 - tw - 20, y = bb.y + bb.height / 2;
      b.r.setAttribute('x', x); b.r.setAttribute('y', y - 11); b.r.setAttribute('width', tw + 20); b.t.setAttribute('x', x + 10); b.t.setAttribute('y', y + 1); }
    function calm() { WT.forEach(function (w) { w.p.style.strokeDasharray = ''; }); BD.forEach(function (b) { b.on = false; b.b.classList.remove('show'); }); }
    function reset() { CH.forEach(function (c) { c.halo.style.strokeDashoffset = c.L; c.fill.style.strokeDashoffset = c.L; c.spark.style.strokeDashoffset = c.s; }); }
    function charge(now) {
      if (!document.contains(svg)) { RAF = 0; return; }
      var t = (now - T0) / 1000, START = [0, .5, .95], DUR = [.55, .45, .45];
      CH.forEach(function (c) {
        if (c.g !== CUR) { c.fill.style.strokeDashoffset = c.L; c.halo.style.strokeDashoffset = c.L; c.spark.style.strokeDashoffset = c.s; return; }
        var u = RM ? 1 : (t - START[c.depth]) / DUR[c.depth], f = Math.max(0, Math.min(1, u));
        c.fill.style.strokeDashoffset = c.L * (1 - f); c.halo.style.strokeDashoffset = c.L * (1 - f);
        var w = u <= 1 ? u : ((t - 1.8 - START[c.depth]) % 3) / DUR[c.depth];
        c.spark.style.strokeDashoffset = !RM && w >= 0 && w <= 1 ? c.s - w * (c.L + c.s * 2) : c.s;
      });
      var wv = RM ? 1 : Math.max(0, Math.min(1, (t - 1.5) / 1));
      WT.forEach(function (w) { if (w.g === CUR) w.p.style.strokeDasharray = wv >= 1 && w.f >= 1 ? '' : (wv * w.f * w.L) + ' ' + (w.L + 1); });
      if (RM || t > 2.4) BD.forEach(function (b) { if (b.g === CUR && !b.on) { b.on = true; place(b); b.b.classList.add('show'); } });
      RAF = CUR && !RM ? requestAnimationFrame(charge) : 0;
    }
    var setFocus = function (k) {
      svg.classList.toggle('focus', !!k); key.classList.toggle('has', !!k);
      key.querySelectorAll('[data-k]').forEach(function (b) { var on = !!k && b.getAttribute('data-k') === k; b.classList.toggle('live', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      Object.keys(groups).forEach(function (g) { groups[g].forEach(function (e) { e.classList.toggle('on', g === k || (!!k && g === 'Core')); }); });
      retag();
      if (k !== CUR) { calm(); CUR = k; T0 = performance.now(); if (!k) reset(); else if (!RAF) RAF = requestAnimationFrame(charge); }
    };
    // a task's details in the side panel
    var panel = root.querySelector('.tvx-panel'), pbody = root.querySelector('.tvx-pb'), opener = null; panel.inert = true;
    var open = function (k) {
      var i = +k.slice(1), t = T[i]; if (!t) return; var c = C[i % C.length];
      if (!panel.classList.contains('open')) opener = document.activeElement; pinned = k; setFocus(k);
      pbody.innerHTML = '<div class="tvx-bar" style="background:linear-gradient(90deg,' + c[0] + ',' + c[1] + ')"></div><h3 style="color:' + c[0] + '">' + esc(t.n + ' ' + t.name) + '</h3><p class="muted">' + esc(meta(t, t.pct + '% done')) + (t.crit ? ' · <span class="cr">⚡ on the critical path</span>' : '') + '</p>' +
        ((t.subs || []).length ? t.subs.map(function (u) { return '<h4>' + esc(u.n + ' ' + u.name) + (u.crit ? ' <span class="cr">⚡</span>' : '') + '<small>' + esc(meta(u, u.pct + '%')) + '</small></h4>' + ((u.steps || []).length ? '<ul>' + u.steps.map(function (st) { return '<li class="' + (st.done ? 'd' : '') + '">' + esc(st.n + ' ' + st.name) + (st.done ? ' 💧' : '') + (st.crit ? ' <span class="cr">⚡</span>' : '') + '<br><small>' + esc(meta(st)) + '</small></li>'; }).join('') + '</ul>' : ''); }).join('') : '<p class="muted">No sub-tasks yet.</p>');
      panel.inert = false; panel.classList.add('open'); root.querySelector('.tvx-x').focus();
    };
    var shut = function () { panel.classList.remove('open'); panel.inert = true; pinned = ''; setFocus(''); if (opener && opener.focus && document.contains(opener)) try { opener.focus({ preventScroll: true }); } catch (e) {} opener = null; };
    root.querySelector('.tvx-x').onclick = shut;
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('open')) { e.stopPropagation(); shut(); } });
    Object.keys(groups).forEach(function (g) { if (g === 'Core') return; groups[g].forEach(function (e) { e.addEventListener('mouseenter', function () { setFocus(g); }); e.addEventListener('mouseleave', function () { setFocus(pinned); }); e.addEventListener('click', function () { open(g); }); }); });
    key.querySelectorAll('[data-k]').forEach(function (b) { b.onmouseenter = function () { setFocus(b.getAttribute('data-k')); }; b.onmouseleave = function () { setFocus(pinned); }; b.onfocus = b.onmouseenter; b.onblur = b.onmouseleave; b.onclick = function () { open(b.getAttribute('data-k')); }; });
    // ⚡ critical path: hover to see it, click to keep it on; its words light up too
    var cpb = root.querySelector('.tvx-cpb'), cpPin = false, cpOn = function (on) { svg.classList.toggle('cp', on); cpb.classList.toggle('on', on); };
    cpb.onmouseenter = function () { cpOn(true); }; cpb.onmouseleave = function () { cpOn(cpPin); }; cpb.onfocus = cpb.onmouseenter; cpb.onblur = cpb.onmouseleave;
    cpb.onclick = function () { cpPin = !cpPin; cpb.setAttribute('aria-pressed', cpPin ? 'true' : 'false'); cpOn(cpPin); };
    var fitSet = function (f) { board.classList.toggle('actual', !f); svg.style.width = f ? '' : W + 'px'; root.querySelectorAll('[data-fit]').forEach(function (b) { b.disabled = (b.getAttribute('data-fit') === '1') === f; }); if (!f) board.scrollLeft = (board.scrollWidth - board.clientWidth) / 2; if (opts.onFit) opts.onFit(f); };
    root.querySelectorAll('[data-fit]').forEach(function (b) { b.onclick = function () { fitSet(b.getAttribute('data-fit') === '1'); }; });
    fitSet(opts.fit !== false);
    fsBtn(root.querySelector('.tvx-fs'), root);
    // a dark tag behind every label, so each word reads over the traces
    var tagged = false;
    function retag() { if (!tagged) return; svg.querySelectorAll('text.lbl:not(.notag)').forEach(function (t) { var r = t.previousSibling, b = t.getBBox(); if (!r || !/tag/.test(r.getAttribute('class'))) return; r.setAttribute('x', b.x - 5); r.setAttribute('y', b.y - 2); r.setAttribute('width', b.width + 10); r.setAttribute('height', b.height + 4); }); }
    function tags() { if (tagged || !document.contains(svg)) return; tagged = true; svg.querySelectorAll('text.lbl:not(.notag)').forEach(function (t) { var b = t.getBBox(), r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', b.x - 5); r.setAttribute('y', b.y - 2); r.setAttribute('width', b.width + 10); r.setAttribute('height', b.height + 4); r.setAttribute('rx', 5); r.setAttribute('class', 'tag' + (t.classList.contains('cr') ? ' cr' : '')); t.parentNode.insertBefore(r, t); }); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(tags); setTimeout(tags, 400);
    return { svg: svg };
  };

  // ---------- 📈 PERT chart ----------
  // D: { name, nodes: [{ id, n, name, owner, d, pred: [index], es, ef, ls, lf, fl, pct, o, m, p, te, sd, crit, est }], stats: [[cls, big, small]], note, canEdit }
  M.pertView = function (host, D, opts) {
    opts = opts || {}; var id = 'pt' + (++UID), N = D.nodes || [];
    host.innerHTML = '<div class="ptx"><div class="ptx-stats">' + (D.stats || []).map(function (s) { return '<div class="ptx-st ' + s[0] + '"><b>' + esc(s[1]) + '</b><span>' + esc(s[2]) + '</span></div>'; }).join('') + '</div>' +
      (D.note ? '<p class="ptx-note">' + esc(D.note) + '</p>' : '') +
      '<div class="tvx-tools"><button class="btn btn-sm tvx-cpb on" type="button" aria-pressed="true">⚡ Critical path</button><span class="ptx-k"><i></i>Critical: no float</span><span class="ptx-k"><i class="n"></i>Has float</span><span class="ptx-k"><i class="w"></i>Water: % done</span><span class="sp"></span><button class="btn btn-sm tvx-fs" type="button">⛶ Full screen</button></div>' +
      '<div class="ptx-board"><svg class="ptx-svg cpon" role="img" aria-label="PERT chart of ' + esc(D.name) + '"></svg></div><div class="ptx-ed" hidden></div>' +
      '<div class="ptx-how"><b>How to read a box:</b> early start · duration · early finish on top, late start · float · late finish below, and the three-point estimate: optimistic · most likely · pessimistic → expected ± σ. Expected = (O + 4M + P) ÷ 6 and σ = (P − O) ÷ 6.' + (D.canEdit ? ' Click a box to set its optimistic and pessimistic estimates.' : '') + '</div></div>';
    var root = host.firstChild, svg = root.querySelector('svg'), ed = root.querySelector('.ptx-ed');
    var el = function (n, a, p) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); (p || svg).appendChild(e); return e; };
    var txt = function (x, y, s, c, p, a) { var t = el('text', { x: x, y: y, class: 't ' + c, 'text-anchor': a || 'middle', 'dominant-baseline': 'middle' }, p); t.textContent = s; return t; };
    var BW = 214, BH = 168, PX = 262, X0 = 130, SLOT = 196, GAP = 120;
    // columns: how many links deep each task is; read left to right in bands of up to four columns, like lines of text
    var col = N.map(function () { return 0; }), seen = 0;
    for (var pass = 0; pass < N.length && seen !== -1; pass++) { seen = -1; N.forEach(function (n, i) { n.pred.forEach(function (p) { if (col[p] + 1 > col[i]) { col[i] = col[p] + 1; seen = 1; } }); }); }
    var MAXC = N.length ? Math.max.apply(0, col) : 0, COLS = MAXC + 1;
    // in each column: the critical tasks on the bottom line, the ones with float stacked above
    var slots = {}; N.forEach(function (n, i) { var k = col[i]; (slots[k] = slots[k] || []).push(i); });
    Object.keys(slots).forEach(function (k) { slots[k].sort(function (a, b) { return (N[b].crit ? 1 : 0) - (N[a].crit ? 1 : 0) || a - b; }); });
    var lay = function (nb, px, gap) { var per = Math.ceil(COLS / nb), rows = [], tops = [], y = 30;
      for (var b = 0; b < nb; b++) { var m = 1; for (var c = b * per; c < Math.min(COLS, (b + 1) * per); c++) m = Math.max(m, (slots[c] || []).length); rows.push(m); }
      rows.forEach(function (r) { tops.push(y); y += r * SLOT + gap; }); return { NB: nb, PER: per, rows: rows, top: tops, PX: px, GAP: gap, W: X0 + per * px + 70, H: y - gap + 50 }; };
    // ↔ use the whole screen: pick the number of bands that draws the boxes biggest in the space there is, then spread the columns (or the bands) to fill it
    var box = root.querySelector('.ptx-board'), bw = box.clientWidth, bhh = box.clientHeight, A = opts.fill !== false && bw > 200 && bhh > 150 ? bw / bhh : 0;
    var Lo = lay(COLS <= 5 ? 1 : Math.ceil(COLS / 4), PX, GAP);
    if (A) { var best = 0; for (var nb = 1; nb <= Math.min(COLS, 8); nb++) { var Lc = lay(nb, PX, GAP), sc = Math.min(bw / Lc.W, bhh / Lc.H); if (sc > best + 1e-6) { best = sc; Lo = Lc; } }
      if (A > Lo.W / Lo.H) Lo = lay(Lo.NB, Math.max(PX, Math.min(560, (A * Lo.H - X0 - 70) / Lo.PER)), GAP);
      else if (Lo.NB > 1) Lo = lay(Lo.NB, PX, Math.min(420, GAP + (Lo.W / A - Lo.H) / (Lo.NB - 1))); }
    var NB = Lo.NB, PER = Lo.PER, rowsIn = Lo.rows, top = Lo.top; PX = Lo.PX; GAP = Lo.GAP;
    N.forEach(function (n, i) { var b = Math.floor(col[i] / PER), s = slots[col[i]].indexOf(i); n.b = b; n.x = X0 + (col[i] - b * PER) * PX; n.y = top[b] + (rowsIn[b] - 1 - s) * SLOT + BH / 2; });
    var W = Lo.W, H = Lo.H, lineY = function (b) { return top[b] + (rowsIn[b] - 1) * SLOT + BH / 2; };
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var defs = el('defs', {}), gl = el('filter', { id: id + 'gl', filterUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, defs);
    el('feGaussianBlur', { stdDeviation: '2.2', result: 'b' }, gl); var mg = el('feMerge', {}, gl); el('feMergeNode', { in: 'b' }, mg); el('feMergeNode', { in: 'SourceGraphic' }, mg);
    var pat = el('pattern', { id: id + 'pcb', width: 40, height: 40, patternUnits: 'userSpaceOnUse' }, defs);
    el('path', { d: 'M40 0H0V40', fill: 'none', stroke: 'rgba(120,150,230,.07)' }, pat);
    el('rect', { width: W, height: H, fill: '#0a1124' }); el('rect', { width: W, height: H, fill: 'url(#' + id + 'pcb)' });
    var EG = el('g', {}), NG = el('g', {}), GLOW = 'url(#' + id + 'gl)';
    var edge = function (x1, y1, b1, x2, y2, b2, crit, ids, label) {
      var mx = (x1 + x2) / 2, d, lx = mx, ly = Math.min(y1, y2) + Math.abs(y2 - y1) / 2 - 10;
      if (b2 > b1) {   // on to the next band: out to the right, down below this band, back to the left, down into the task
        var off = crit ? 0 : 12, r = 14, a = x1 + 22 + off, bx = X0 - 46 - off, MID = top[b1 + 1] - GAP / 2 - off;
        d = 'M' + x1 + ' ' + y1 + 'H' + (a - r) + 'Q' + a + ' ' + y1 + ' ' + a + ' ' + (y1 + r) + 'V' + (MID - r) + 'Q' + a + ' ' + MID + ' ' + (a - r) + ' ' + MID + 'H' + (bx + r) + 'Q' + bx + ' ' + MID + ' ' + bx + ' ' + (MID + r) + 'V' + (y2 - r) + 'Q' + bx + ' ' + y2 + ' ' + (bx + r) + ' ' + y2 + 'H' + x2;
        lx = (a + bx) / 2; ly = MID - 10;
      } else d = 'M' + x1 + ' ' + y1 + 'C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2;
      var cls = 'e' + (crit ? ' crit' : '');
      el('path', { d: d, class: cls, 'data-ids': ids, filter: crit ? GLOW : '' }, EG);
      el('path', { d: 'M' + (x2 - 9) + ' ' + (y2 - 6) + 'L' + x2 + ' ' + y2 + 'L' + (x2 - 9) + ' ' + (y2 + 6), fill: 'none', class: cls, 'data-ids': ids, 'stroke-linejoin': 'round' }, EG);
      if (label) txt(lx, ly, label, 'efl', EG).setAttribute('data-ids', ids);
    };
    var ms = function (x, y, a, b) { var g = el('g', { class: 'ms' }, NG); el('circle', { cx: x, cy: y, r: 26 }, g); txt(x, y - 44, a, 'mt', g); txt(x, y + 46, b, 's', g); };
    var SY = lineY(0), FB = NB - 1, FY = lineY(FB), FX = W - 40;
    ms(48, SY, 'Start', D.start || ''); ms(FX, FY, 'Finish', D.finish || '');
    var flo = function (n) { return n.fl ? 'float ' + n.fl + 'd' : ''; };
    N.forEach(function (n, i) {
      if (!n.pred.length) edge(74, SY, 0, n.x, n.y, n.b, n.crit, 's,' + i, '');
      n.pred.forEach(function (p) { var a = N[p], cr = (n.cpred || []).indexOf(p) >= 0; edge(a.x + BW, a.y, a.b, n.x, n.y, n.b, cr, p + ',' + i, cr ? '' : flo(n) || flo(a)); });   // red only where the link sets the next start
      if (!N.some(function (q) { return q.pred.indexOf(i) >= 0; })) edge(n.x + BW, n.y, n.b, FX - 28, FY, FB, n.crit, i + ',f', '');
    });
    var cut = function (s, k) { s = String(s || ''); return s.length > k ? s.slice(0, k - 1) + '…' : s; };
    N.forEach(function (n, i) {
      var g = el('g', { class: 'node' + (n.crit ? ' crit' : ''), 'data-i': i, tabindex: 0, role: 'button', 'aria-label': n.n + ' ' + n.name + (D.canEdit ? ': set its estimates' : '') }, NG), x = n.x, y = n.y - BH / 2, cw = (BW - 24) / 3;
      el('rect', { x: x, y: y, width: BW, height: BH, rx: 12, class: 'bx' }, g);
      [[n.es, 0], [n.d + 'd', 1], [n.ef, 2]].forEach(function (c) { el('rect', { x: x + 8 + c[1] * (cw + 4), y: y + 8, width: cw, height: 28, rx: 5, class: 'cell' }, g); txt(x + 8 + c[1] * (cw + 4) + cw / 2, y + 22, c[0], 'v', g); });
      var nm = cut(n.n + ' ' + n.name, 48), cu = nm.length > 24 ? nm.lastIndexOf(' ', 24) : -1;
      if (cu > 0) { txt(x + BW / 2, y + 52, nm.slice(0, cu), 'nm', g); txt(x + BW / 2, y + 69, cut(nm.slice(cu + 1), 26), 'nm', g); } else txt(x + BW / 2, y + 60, nm, 'nm', g);
      txt(x + BW / 2, y + 86, cut(n.owner, 30), 'ow', g);
      [[n.ls, 0], [n.fl ? n.fl + 'd float' : 'no float', 1], [n.lf, 2]].forEach(function (c) { el('rect', { x: x + 8 + c[1] * (cw + 4), y: y + 98, width: cw, height: 28, rx: 5, class: 'cell' }, g); var t = txt(x + 8 + c[1] * (cw + 4) + cw / 2, y + 112, c[0], 'v', g); if (c[1] === 1 && !n.fl) t.classList.add('fl0'); });
      txt(x + BW / 2, y + 140, 'O ' + n.o + ' · M ' + n.m + ' · P ' + n.p + ' → ' + n.te + ' ± ' + n.sd + 'd' + (n.est ? '' : ' *'), 'pe', g);
      el('rect', { x: x + 12, y: y + BH - 14, width: BW - 24, height: 6, rx: 3, fill: 'rgba(103,232,249,.12)' }, g);
      if (n.pct) el('rect', { x: x + 12, y: y + BH - 14, width: (BW - 24) * Math.min(100, n.pct) / 100, height: 6, rx: 3, class: 'wat' + (n.pct >= 100 ? ' flow' : '') }, g);
    });
    // follow a task: what it waits for and what waits for it
    var hi = function (i) { svg.classList.toggle('dimmed', i !== null); svg.querySelectorAll('.hi').forEach(function (e) { e.classList.remove('hi'); }); if (i === null) return;
      svg.querySelector('.node[data-i="' + i + '"]').classList.add('hi');
      svg.querySelectorAll('[data-ids]').forEach(function (e) { var ids = e.getAttribute('data-ids').split(','); if (ids.indexOf(String(i)) >= 0) { e.classList.add('hi'); ids.forEach(function (k) { var nd = svg.querySelector('.node[data-i="' + k + '"]'); if (nd) nd.classList.add('hi'); }); } }); };
    // ✎ three-point estimates: optimistic and pessimistic, in working days (most likely is the task's duration on the Gantt)
    var edit = function (i) {
      if (!D.canEdit || !opts.onEst) return; var n = N[i];
      ed.innerHTML = '<b>' + esc(n.n + ' ' + n.name) + '</b><span class="muted">Most likely: ' + n.m + ' days (its duration on the Gantt)</span>' +
        '<label>Optimistic <input type="number" min="0" max="730" step="1" value="' + n.o + '" data-o></label><label>Pessimistic <input type="number" min="0" max="730" step="1" value="' + n.p + '" data-p></label>' +
        '<button class="btn btn-sm btn-gold" type="button" data-sv>Save</button><button class="btn btn-sm" type="button" data-cx>Cancel</button><small class="ptx-err" aria-live="polite"></small>';
      ed.hidden = false; ed.querySelector('[data-o]').focus();
      ed.querySelector('[data-cx]').onclick = function () { ed.hidden = true; };
      ed.querySelector('[data-sv]').onclick = function () {
        var o = Math.round(+ed.querySelector('[data-o]').value), p = Math.round(+ed.querySelector('[data-p]').value), er = ed.querySelector('.ptx-err');
        if (!isFinite(o) || !isFinite(p) || o < 0 || p < 0) { er.textContent = 'Enter whole days, 0 or more'; return; }
        if (o > n.m || p < n.m) { er.textContent = 'Optimistic must be no more than ' + n.m + ' days, pessimistic at least ' + n.m; return; }
        if (p > 730) { er.textContent = 'Pessimistic must be no more than 730 days'; return; }
        ed.hidden = true; opts.onEst(n.id, o, p);
      };
    };
    svg.querySelectorAll('.node').forEach(function (g) { var i = +g.getAttribute('data-i'); g.addEventListener('mouseenter', function () { hi(i); }); g.addEventListener('mouseleave', function () { hi(null); }); g.addEventListener('focus', function () { hi(i); }); g.addEventListener('blur', function () { hi(null); });
      g.addEventListener('click', function () { edit(i); }); g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); edit(i); } }); });
    var cp = root.querySelector('.tvx-cpb'); cp.onclick = function () { var on = svg.classList.toggle('cpon'); cp.classList.toggle('on', on); cp.setAttribute('aria-pressed', on ? 'true' : 'false'); };
    fsBtn(root.querySelector('.tvx-fs'), root);
    return { svg: svg };
  };
  // the standard normal distribution, for the chance of finishing by the planned date
  M.normCdf = function (z) { var t = 1 / (1 + .2316419 * Math.abs(z)), d = .3989423 * Math.exp(-z * z / 2), p = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
})();
