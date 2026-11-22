/* ▶ The Features page stage: ten scenes that play by themselves (7 s each), like the phone hero.
   Click a step, use the arrow keys, or swipe; hovering or focusing the stage pauses it; reduced motion = no auto-play. */
(function () {
  'use strict';
  function start() {
    var root = document.querySelector('.fx'); if (!root) return;
    var sc = root.querySelectorAll('.fx-sc'), nav = root.querySelectorAll('[data-go]'), pp = root.querySelector('.fx-pp');
    var HOLD = 7000, cur = 0, timer = null, paused = false, hover = false;
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function show(k) {
      cur = (k + sc.length) % sc.length;
      for (var i = 0; i < sc.length; i++) { var on = i === cur; sc[i].classList.toggle('on', on); sc[i].setAttribute('aria-hidden', on ? 'false' : 'true'); if ('inert' in sc[i]) sc[i].inert = !on; }
      for (var j = 0; j < nav.length; j++) { nav[j].classList.toggle('on', j === cur); if (j === cur) nav[j].setAttribute('aria-current', 'true'); else nav[j].removeAttribute('aria-current'); }
      root.style.setProperty('--hold', HOLD + 'ms');
      arm();
    }
    function arm() {
      clearTimeout(timer); root.classList.toggle('fx-run', !(paused || hover || still));
      // restart the step's progress bar
      var b = root.querySelector('[data-go].on i'); if (b) { b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; }
      if (!(paused || hover || still)) timer = setTimeout(function () { show(cur + 1); }, HOLD);
    }
    for (var n = 0; n < nav.length; n++) (function (b) { b.addEventListener('click', function () { show(+b.getAttribute('data-go')); }); })(nav[n]);
    if (pp) pp.addEventListener('click', function () { paused = !paused; pp.textContent = paused ? '▶' : '❚❚'; pp.setAttribute('aria-label', paused ? 'Play' : 'Pause'); arm(); });
    if (still && pp) { paused = true; pp.textContent = '▶'; pp.setAttribute('aria-label', 'Play'); }
    var stage = root.querySelector('.fx-stage');
    stage.addEventListener('mouseenter', function () { hover = true; arm(); });
    stage.addEventListener('mouseleave', function () { hover = false; arm(); });
    root.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { show(cur + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { show(cur - 1); e.preventDefault(); } });
    var x0 = null; stage.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 45) show(cur + (dx < 0 ? 1 : -1)); x0 = null; });
    document.addEventListener('visibilitychange', function () { if (document.hidden) clearTimeout(timer); else arm(); });
    show(0);
  }
  // ✨ the AI day: each step lights up as it scrolls into view, and the line fills to the last one seen
  function day() {
    var ol = document.querySelector('.fai-day'); if (!ol) return;
    var S = ol.querySelectorAll('.fai-s'), still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fill = function () { var last = -1; for (var i = 0; i < S.length; i++) if (S[i].classList.contains('in')) last = i; ol.style.setProperty('--fill', S.length ? String((last + 1) / S.length) : '0'); };
    if (still || !('IntersectionObserver' in window)) { for (var i = 0; i < S.length; i++) S[i].classList.add('in'); fill(); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); fill(); }, { rootMargin: '0px 0px -25% 0px' });
    for (var k = 0; k < S.length; k++) io.observe(S[k]);
  }
  function boot() { start(); day(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
