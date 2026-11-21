/* 💻 GKH Project Champ fits the screen it is on. A small laptop (an 11 or 13 inch screen: under 800 px high or 1400 px wide)
   gets the compact layout: a slim brand bar and header, the documents bar as one row of buttons, small number tiles, the menu
   folded to icons (until you unfold it), and the Gantt chart sized to the screen with its scroll bars in view. On any screen the
   Gantt chart can be made taller or shorter by dragging the ⇕ bar under it (double-click it to fit the screen again). */
(function () {
  var KEY = 'champGanttH', b = document.body, short = null;
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var put = function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  var topH = function () { var t = document.querySelector('header.top'); return t && getComputedStyle(t).position === 'sticky' ? t.offsetHeight : 0; };
  function detect() {
    var w = window.innerWidth, h = window.innerHeight, s = w > 700 && (h < 800 || w < 1400);
    if (s !== short) {
      short = s; b.classList.toggle('is-short', s);
      // fold the menu to icons on a small laptop, unless you have chosen yourself
      if (s && !get('champFitMini') && window.MBS_sideMini) { put('champFitMini', '1'); if (!b.classList.contains('side-mini')) window.MBS_sideMini(true); }   // once: after that, your own choice stays
    }
    fit();
  }
  // the Gantt chart's height: the one you dragged to, or (on a small laptop) the screen below the header and the Dates row
  function fit() {
    var g = document.getElementById('gSplit'); if (!g) return;
    var mine = parseInt(get(KEY), 10), full = document.querySelector('.gfull');
    if (full) { g.style.removeProperty('--gH'); g.classList.remove('gh-on'); opts(g); return; }
    var row = g.previousElementSibling, rowH = row && row.offsetHeight < 70 ? row.offsetHeight : 0;
    var auto = Math.max(300, window.innerHeight - topH() - rowH - 30);
    var h = mine > 0 ? Math.max(220, Math.min(mine, 4000)) : short ? auto : 0;
    if (h) { g.style.setProperty('--gH', h + 'px'); g.classList.add('gh-on'); } else { g.style.removeProperty('--gH'); g.classList.remove('gh-on'); }
    handle(g); opts(g);
  }
  // on a small laptop the project dates, the weekends and the location fold behind one button, so the chart gets the room
  function opts(g) {
    var row = document.querySelector('#gCard .pviews') || g.parentNode.querySelector('.pviews'); if (!row || row.querySelector('.gopt-btn')) return;
    var t = document.createElement('button'); t.type = 'button'; t.className = 'tab gopt-btn'; t.title = 'Project start, work start, finish by, weekends and the location';
    var lab = function () { t.textContent = b.classList.contains('gopts') ? '▴ Hide dates & calendar' : '📆 Dates & calendar'; t.classList.toggle('on', b.classList.contains('gopts')); };
    t.onclick = function () { b.classList.toggle('gopts'); lab(); fit(); }; lab();
    var w = document.createElement('div'); w.className = 'tabs gopt-wrap'; w.style.margin = '0'; w.appendChild(t); row.insertBefore(w, row.firstChild);
  }
  // the ⇕ bar under the Gantt chart: drag it up or down
  function handle(g) {
    var n = g.nextElementSibling; if (n && n.classList.contains('gh-drag')) return;
    var d = document.createElement('div'); d.className = 'gh-drag'; d.setAttribute('role', 'separator'); d.setAttribute('aria-orientation', 'horizontal'); d.tabIndex = 0;
    d.title = 'Drag up or down to make the Gantt chart shorter or taller. Double-click to fit the screen.';
    d.innerHTML = '<span></span><small>⇕ drag to resize · double-click to fit the screen</small>';
    g.parentNode.insertBefore(d, g.nextSibling);
    var st = null;
    d.addEventListener('pointerdown', function (e) { st = { y: e.clientY, h: g.getBoundingClientRect().height }; try { d.setPointerCapture(e.pointerId); } catch (x) {} b.classList.add('gh-dragging'); e.preventDefault(); });
    d.addEventListener('pointermove', function (e) { if (!st) return; var h = Math.max(220, st.h + e.clientY - st.y); g.style.setProperty('--gH', h + 'px'); g.classList.add('gh-on'); });
    var end = function () { if (!st) return; st = null; b.classList.remove('gh-dragging'); put(KEY, Math.round(g.getBoundingClientRect().height)); };
    d.addEventListener('pointerup', end); d.addEventListener('pointercancel', end);
    d.addEventListener('dblclick', function () { put(KEY, null); fit(); bring(true); });
    d.addEventListener('keydown', function (e) { if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return; e.preventDefault(); var h = Math.max(220, g.getBoundingClientRect().height + (e.key === 'ArrowDown' ? 40 : -40)); g.style.setProperty('--gH', h + 'px'); g.classList.add('gh-on'); put(KEY, Math.round(h)); });
  }
  // on a small laptop, opening the Gantt chart scrolls it into view: the Dates row just under the header, the chart filling the rest
  function bring(force) {
    var g = document.getElementById('gSplit'); if (!g || (!short && !force) || document.querySelector('.gfull')) return;
    var row = g.previousElementSibling, el = row && row.offsetHeight < 70 ? row : g, y = el.getBoundingClientRect().top + window.pageYOffset - topH() - 6;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }
  var lastHash = '', pend = 0;
  new MutationObserver(function () {
    if (pend) return; pend = requestAnimationFrame(function () {
      pend = 0; var g = document.getElementById('gSplit'); if (!g) { lastHash = ''; return; }
      fit();
      var h = location.hash; if (h !== lastHash) { lastHash = h; setTimeout(function () { bring(false); }, 120); }
    });
  }).observe(document.getElementById('view') || document.body, { childList: true, subtree: true });
  window.addEventListener('resize', detect);
  detect();
  window.ChampFit = { detect: detect, fit: fit };   // for tests
})();
