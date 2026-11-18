/* GKH Project Champ: the galaxy behind Sashi's photo on the About page.
   A black sky with a slowly turning spiral galaxy, nebula clouds, twinkling stars, a shooting star now and then, and
   line-art symbols of AI, technology and projects drifting past. The photo (a cut-out with a transparent background)
   sits on top. It pauses off screen, and shows one still frame for people who prefer less motion. */
(function () {
  'use strict';
  var cv = document.querySelector('canvas.c-galaxy'); if (!cv || !cv.getContext) return;
  var g = cv.getContext('2d'); if (!g) return;
  var W = 0, H = 0, DPR = Math.min(2, window.devicePixelRatio || 1), still = false;
  var mq = null; try { mq = window.matchMedia('(prefers-reduced-motion: reduce)'); still = mq.matches; } catch (e) {}
  var rnd = (function (s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })(20261118);
  var stars = [], dust = [], icons = [];
  var GOLD = '232,192,74', CYAN = '120,200,255', VIOLET = '170,130,255';
  function size() {
    var r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); g.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function seed() {
    stars = []; for (var i = 0; i < 260; i++) stars.push({ x: (rnd() - 0.5) * 2, y: (rnd() - 0.5) * 2, z0: rnd(), v: 0.035 + rnd() * 0.05, r: 0.5 + rnd() * 1.1, tw: rnd() * 6.28, sp: 0.6 + rnd() * 1.8, c: rnd() < 0.15 ? GOLD : rnd() < 0.3 ? CYAN : '255,255,255' });   // points in space flying towards us
    dust = []; for (var j = 0; j < 1100; j++) { var arm = j % 2, t = Math.pow(rnd(), 0.8); var dc = rnd() < 0.25 ? GOLD : rnd() < 0.55 ? VIOLET : CYAN; dust.push({ arm: arm, t: t, off: (rnd() - 0.5) * (0.25 + t * 0.35), s: 0.5 + rnd() * 1.2, f: 'rgba(' + dc + ',' + (0.75 * (1 - t * 0.65)).toFixed(3) + ')' }); }   // the colour is worked out once
    var kinds = ['ai', 'chip', 'gantt', 'nodes', 'rocket', 'bulb', 'check', 'target', 'atom', 'code'];
    icons = kinds.map(function (k, i) { var ang = (i / kinds.length) * 6.28 + rnd() * 0.5, rad = 0.35 + rnd() * 0.5; return { k: k, x: Math.cos(ang) * rad, y: Math.sin(ang) * rad * 0.9, z0: i / kinds.length, v: 0.045 + rnd() * 0.025, rot: rnd() * 6.28, vr: (rnd() - 0.5) * 0.25, s: 10 + rnd() * 5, c: i % 3 === 0 ? CYAN : GOLD, a: 0.55 + rnd() * 0.3 }; });   // the symbols come out of the deep towards us, each on its own line
  }
  function icon(o) {   // simple line art, centred on 0,0, about 24 units wide
    var k = o.k; g.beginPath();
    if (k === 'ai') { g.font = '800 12px Manrope, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeRect(-11, -11, 22, 22); g.fillText('AI', 0, 1); for (var i = -6; i <= 6; i += 6) { g.moveTo(i, -11); g.lineTo(i, -15); g.moveTo(i, 11); g.lineTo(i, 15); g.moveTo(-11, i); g.lineTo(-15, i); g.moveTo(11, i); g.lineTo(15, i); } }
    else if (k === 'chip') { g.strokeRect(-8, -8, 16, 16); g.strokeRect(-3, -3, 6, 6); for (var j = -5; j <= 5; j += 5) { g.moveTo(j, -8); g.lineTo(j, -12); g.moveTo(j, 8); g.lineTo(j, 12); g.moveTo(-8, j); g.lineTo(-12, j); g.moveTo(8, j); g.lineTo(12, j); } }
    else if (k === 'gantt') { g.moveTo(-12, -10); g.lineTo(-12, 11); g.lineTo(12, 11); g.rect(-9, -8, 10, 4); g.rect(-4, -2, 12, 4); g.rect(2, 4, 9, 4); }
    else if (k === 'nodes') { var P = [[-10, -6], [9, -9], [0, 2], [-8, 10], [11, 8]]; [[0, 2], [1, 2], [2, 3], [2, 4], [0, 3]].forEach(function (e) { g.moveTo(P[e[0]][0], P[e[0]][1]); g.lineTo(P[e[1]][0], P[e[1]][1]); }); g.stroke(); g.beginPath(); P.forEach(function (q) { g.moveTo(q[0] + 2.4, q[1]); g.arc(q[0], q[1], 2.4, 0, 6.28); }); }
    else if (k === 'rocket') { g.moveTo(0, -13); g.quadraticCurveTo(7, -5, 5, 6); g.lineTo(-5, 6); g.quadraticCurveTo(-7, -5, 0, -13); g.moveTo(-5, 2); g.lineTo(-9, 9); g.lineTo(-5, 6); g.moveTo(5, 2); g.lineTo(9, 9); g.lineTo(5, 6); g.moveTo(2.2, -4); g.arc(0, -4, 2.2, 0, 6.28); g.moveTo(-2, 9); g.lineTo(0, 13); g.lineTo(2, 9); }
    else if (k === 'bulb') { g.arc(0, -3, 8, 0.75 * Math.PI, 0.25 * Math.PI); g.lineTo(3.5, 7); g.lineTo(-3.5, 7); g.closePath(); g.moveTo(-3.5, 10); g.lineTo(3.5, 10); g.moveTo(-2, 13); g.lineTo(2, 13); }
    else if (k === 'check') { g.arc(0, 0, 11, 0, 6.28); g.moveTo(-5, 0); g.lineTo(-1.5, 4); g.lineTo(6, -4); }
    else if (k === 'target') { g.arc(0, 0, 11, 0, 6.28); g.moveTo(7, 0); g.arc(0, 0, 7, 0, 6.28); g.moveTo(3, 0); g.arc(0, 0, 3, 0, 6.28); g.moveTo(0, 0); g.lineTo(12, -12); }
    else if (k === 'atom') { g.ellipse(0, 0, 13, 5, 0, 0, 6.28); g.moveTo(13, 0); g.ellipse(0, 0, 13, 5, 1.05, 0, 6.28); g.moveTo(13, 0); g.ellipse(0, 0, 13, 5, -1.05, 0, 6.28); g.moveTo(2, 0); g.arc(0, 0, 2, 0, 6.28); }
    else if (k === 'code') { g.moveTo(-5, -7); g.lineTo(-12, 0); g.lineTo(-5, 7); g.moveTo(5, -7); g.lineTo(12, 0); g.lineTo(5, 7); g.moveTo(2, -10); g.lineTo(-2, 10); }
    g.stroke();
  }
  function draw(t, moving) {   // moving: draw the shooting stars even in a still frame (for a recording)
    // the black of deep space, with nebula clouds that breathe slowly
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#020207'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    var neb = [[0.15, 0.2, 0.6, VIOLET, 0.26], [0.88, 0.12, 0.55, CYAN, 0.16], [0.8, 0.82, 0.6, GOLD, 0.1], [0.08, 0.88, 0.5, '90,120,255', 0.14]];
    neb.forEach(function (n, i) { var x = (n[0] + Math.sin(t * 0.03 + i) * 0.03) * W, y = (n[1] + Math.cos(t * 0.025 + i) * 0.03) * H, r = n[2] * Math.max(W, H) * (1 + 0.05 * Math.sin(t * 0.07 + i));
      var rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(' + n[3] + ',' + n[4] + ')'); rg.addColorStop(1, 'rgba(' + n[3] + ',0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); });
    // a spiral galaxy turning slowly, up behind the head
    var gx = W * 0.5, gy = H * 0.3, R = Math.min(W, H) * 0.62, rot = t * 0.035;
    var core = g.createRadialGradient(gx, gy, 0, gx, gy, R * 0.32); core.addColorStop(0, 'rgba(255,236,190,0.55)'); core.addColorStop(0.35, 'rgba(232,192,74,0.18)'); core.addColorStop(1, 'rgba(232,192,74,0)'); g.fillStyle = core; g.fillRect(0, 0, W, H);
    g.save(); g.translate(gx, gy); g.scale(1, 0.42); g.rotate(rot * 0.3);   // the glowing band of the galaxy's disc
    var band = g.createRadialGradient(0, 0, R * 0.05, 0, 0, R); band.addColorStop(0, 'rgba(200,170,255,0.28)'); band.addColorStop(0.45, 'rgba(120,110,230,0.12)'); band.addColorStop(1, 'rgba(90,90,200,0)'); g.fillStyle = band; g.beginPath(); g.arc(0, 0, R, 0, 6.28); g.fill(); g.restore();
    for (var i = 0; i < dust.length; i++) { var d = dust[i], ang = d.t * 4.6 + d.arm * Math.PI + rot, rr = R * (0.06 + d.t * 0.94), x = gx + Math.cos(ang + d.off) * rr, y = gy + Math.sin(ang + d.off) * rr * 0.42;
      g.fillStyle = d.f; g.fillRect(x, y, d.s, d.s); }
    // travelling through space: stars stream out from a point behind his head, growing and leaving short trails as they pass
    var vx = W * 0.5, vy = H * 0.32, F = Math.max(W, H) * 0.42;
    for (var s2 = 0; s2 < stars.length; s2++) { var st = stars[s2], z = 1 - (((st.z0 + t * st.v) % 1) + 1) % 1; z = 0.04 + z * 0.96;
      var px = vx + st.x / z * F, py = vy + st.y / z * F; if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;
      var near = 1 - z, a = Math.min(1, near * 1.6) * (0.55 + 0.45 * Math.abs(Math.sin(t * st.sp * 0.6 + st.tw))), r = st.r * (0.4 + near * 1.8);
      var z2 = Math.min(1, z + 0.035), tx2 = vx + st.x / z2 * F, ty2 = vy + st.y / z2 * F;   // where it was a moment ago: the trail
      g.strokeStyle = 'rgba(' + st.c + ',' + (a * 0.45).toFixed(3) + ')'; g.lineWidth = Math.max(0.5, r * 0.8); g.beginPath(); g.moveTo(tx2, ty2); g.lineTo(px, py); g.stroke();
      g.fillStyle = 'rgba(' + st.c + ',' + a.toFixed(3) + ')'; g.beginPath(); g.arc(px, py, r, 0, 6.28); g.fill(); }
    // the symbols of the work (AI, technology, projects) fly out of the deep towards us, turning slowly, and fade as they pass
    g.globalCompositeOperation = 'source-over'; g.lineWidth = 1.3; g.lineCap = 'round'; g.lineJoin = 'round';
    for (var k = 0; k < icons.length; k++) { var o = icons[k], zz = 1 - (((o.z0 + t * o.v) % 1) + 1) % 1; zz = 0.08 + zz * 0.92;
      var ix = vx + o.x / zz * F * 0.55, iy = vy + o.y / zz * F * 0.55, sc = o.s / zz / 24, fade = Math.min(1, (1 - zz) * 2.5) * Math.min(1, (zz - 0.08) * 6);
      if (ix < -60 || ix > W + 60 || iy < -60 || iy > H + 60 || fade <= 0.01) continue;
      g.save(); g.translate(ix, iy); g.rotate(o.rot + t * o.vr * 0.3); g.scale(sc, sc); g.lineWidth = 1.3 / Math.max(0.6, sc);
      g.strokeStyle = g.fillStyle = 'rgba(' + o.c + ',' + (o.a * fade).toFixed(3) + ')'; g.shadowColor = 'rgba(' + o.c + ',0.8)'; g.shadowBlur = 6; icon(o); g.restore(); }
    // shooting stars, every few seconds (worked out from the clock, so a still frame never shows half of one)
    if (!still || moving) { var P = 3.2, k0 = Math.floor(t / P);
      for (var kk = k0 - 1; kk <= k0; kk++) { if (kk < 0) continue; var hsh = function (n) { var v = Math.sin(kk * 127.1 + n * 311.7) * 43758.5453; return v - Math.floor(v); };
        var ts = kk * P + hsh(1) * P * 0.6, p = (t - ts) / 0.9; if (p < 0 || p >= 1) continue;
        var sx0 = (0.05 + hsh(2) * 0.6) * W, sy0 = (hsh(3) * 0.35) * H, dx = (0.35 + hsh(4) * 0.25) * W, dy = (0.18 + hsh(5) * 0.18) * H, len = 0.18 * Math.hypot(dx, dy);
        var hx = sx0 + dx * p, hy = sy0 + dy * p, ux = dx / Math.hypot(dx, dy), uy = dy / Math.hypot(dx, dy), al = Math.sin(Math.PI * p);
        var lg = g.createLinearGradient(hx, hy, hx - ux * len, hy - uy * len); lg.addColorStop(0, 'rgba(255,255,255,' + (0.95 * al).toFixed(3) + ')'); lg.addColorStop(0.3, 'rgba(255,230,170,' + (0.5 * al).toFixed(3) + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.strokeStyle = lg; g.lineWidth = 2; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - ux * len, hy - uy * len); g.stroke();
        g.fillStyle = 'rgba(255,255,255,' + al.toFixed(3) + ')'; g.shadowColor = 'rgba(255,240,200,0.9)'; g.shadowBlur = 10; g.beginPath(); g.arc(hx, hy, 1.8, 0, 6.28); g.fill(); g.shadowBlur = 0; } }
    // a soft halo of light behind his head and shoulders, and a vignette to frame him
    var hl = g.createRadialGradient(W * 0.5, H * 0.36, 0, W * 0.5, H * 0.36, W * 0.55); hl.addColorStop(0, 'rgba(160,190,255,0.16)'); hl.addColorStop(1, 'rgba(160,190,255,0)'); g.fillStyle = hl; g.fillRect(0, 0, W, H);
    var vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  size(); seed();
  var t0 = performance.now(), seen = true, shown = !document.hidden, raf = 0, last = 0;   // it runs only while the canvas is on screen AND the tab is visible
  var go = function () { if (!still && seen && shown && !raf) raf = requestAnimationFrame(loop); };
  var loop = function (now) { raf = 0; if (still || !seen || !shown) return; if (now - last > 33) { last = now; draw((now - t0) / 1000); } raf = requestAnimationFrame(loop); };   // about 30 frames a second is plenty for slow motion
  if (still) draw(8); else go();
  window.addEventListener('resize', function () { size(); if (still) draw(8); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; go(); }).observe(cv);
  document.addEventListener('visibilitychange', function () { shown = !document.hidden; go(); });
  if (mq) { var ch = function () { still = mq.matches; if (still) { if (raf) { cancelAnimationFrame(raf); raf = 0; } draw(8); } else go(); }; if (mq.addEventListener) mq.addEventListener('change', ch); else if (mq.addListener) mq.addListener(ch); }   // reduced motion switched on or off while reading
  window.__champGalaxy = { draw: draw };   // for the still picture and the tests
})();
