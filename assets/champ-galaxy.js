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
  var stars = [], dust = [], icons = [], shoot = null, nextShoot = 4;
  var GOLD = '232,192,74', CYAN = '120,200,255', VIOLET = '170,130,255';
  function size() {
    var r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); g.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function seed() {
    stars = []; for (var i = 0; i < 170; i++) stars.push({ x: rnd(), y: rnd(), r: rnd() < 0.08 ? 1.3 + rnd() * 0.9 : 0.35 + rnd() * 0.8, tw: rnd() * 6.28, sp: 0.6 + rnd() * 1.8, z: 0.2 + rnd() * 0.8, c: rnd() < 0.15 ? GOLD : rnd() < 0.3 ? CYAN : '255,255,255' });
    dust = []; for (var j = 0; j < 1100; j++) { var arm = j % 2, t = Math.pow(rnd(), 0.8); var dc = rnd() < 0.25 ? GOLD : rnd() < 0.55 ? VIOLET : CYAN; dust.push({ arm: arm, t: t, off: (rnd() - 0.5) * (0.25 + t * 0.35), s: 0.5 + rnd() * 1.2, f: 'rgba(' + dc + ',' + (0.75 * (1 - t * 0.65)).toFixed(3) + ')' }); }   // the colour is worked out once
    var kinds = ['ai', 'chip', 'gantt', 'nodes', 'rocket', 'bulb', 'check', 'target', 'atom', 'code'];
    icons = kinds.map(function (k, i) { return { k: k, x: (i + 0.2 + rnd() * 0.6) / kinds.length, y: rnd(), vx: (rnd() - 0.5) * 0.006, vy: -0.004 - rnd() * 0.006, rot: rnd() * 6.28, vr: (rnd() - 0.5) * 0.12, s: 19 + rnd() * 12, c: i % 3 === 0 ? CYAN : GOLD, a: 0.38 + rnd() * 0.25 }; });
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
  function draw(t) {
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
    // stars, twinkling and drifting a little (the nearer ones a little faster)
    for (var s = 0; s < stars.length; s++) { var st = stars[s], sx = ((st.x + t * 0.002 * st.z) % 1) * W, sy = st.y * H, a = 0.45 + 0.55 * Math.abs(Math.sin(t * st.sp * 0.6 + st.tw));
      g.fillStyle = 'rgba(' + st.c + ',' + a.toFixed(3) + ')'; g.beginPath(); g.arc(sx, sy, st.r, 0, 6.28); g.fill();
      if (st.r > 1.3) { g.strokeStyle = 'rgba(' + st.c + ',' + (a * 0.35).toFixed(3) + ')'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(sx - st.r * 4, sy); g.lineTo(sx + st.r * 4, sy); g.moveTo(sx, sy - st.r * 4); g.lineTo(sx, sy + st.r * 4); g.stroke(); } }
    // the symbols of the work: AI, technology and projects, drifting upwards and turning slowly
    g.globalCompositeOperation = 'source-over'; g.lineWidth = 1.3; g.lineCap = 'round'; g.lineJoin = 'round';
    for (var k = 0; k < icons.length; k++) { var o = icons[k], ox = (((o.x + t * o.vx) % 1) + 1) % 1, oy = (((o.y + t * o.vy) % 1) + 1) % 1, fade = Math.min(1, oy * 6, (1 - oy) * 6);
      g.save(); g.translate(ox * W, oy * H); g.rotate(o.rot + t * o.vr * 0.2); g.scale(o.s / 24, o.s / 24);
      g.strokeStyle = g.fillStyle = 'rgba(' + o.c + ',' + (o.a * fade).toFixed(3) + ')'; g.shadowColor = 'rgba(' + o.c + ',0.8)'; g.shadowBlur = 6; icon(o); g.restore(); }
    // now and then a shooting star
    if (!shoot && t > nextShoot) shoot = { t0: t, x: 0.1 + rnd() * 0.5, y: rnd() * 0.35 };
    if (shoot) { var p = (t - shoot.t0) / 1.1; if (p >= 1) { shoot = null; nextShoot = t + 5 + rnd() * 7; }
      else { var x0 = (shoot.x + p * 0.45) * W, y0 = (shoot.y + p * 0.25) * H, lg = g.createLinearGradient(x0, y0, x0 - 60, y0 - 33); lg.addColorStop(0, 'rgba(255,255,255,' + (0.9 * (1 - p)).toFixed(3) + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.strokeStyle = lg; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 - 60, y0 - 33); g.stroke(); } }
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
