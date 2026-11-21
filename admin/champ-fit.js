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
    var w = window.innerWidth, h = window.innerHeight, mode = get('champFitMode') === 'compact' ? 'compact' : 'auto', s = w > 700 && (mode === 'compact' || (mode === 'auto' && (h < 800 || w < 1400)));
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
    if (full) { g.style.removeProperty('--gH'); g.classList.remove('gh-on'); opts(g); rail(g); colsBtn(); hideCols(); follow(g); return; }
    var row = g.previousElementSibling, rowH = row && row.offsetHeight < 70 ? row.offsetHeight : 0;
    var auto = Math.max(300, window.innerHeight - topH() - rowH - 30);
    var h = mine > 0 ? Math.max(220, Math.min(mine, 4000)) : short ? auto : 0;
    if (h) { g.style.setProperty('--gH', h + 'px'); g.classList.add('gh-on'); } else { g.style.removeProperty('--gH'); g.classList.remove('gh-on'); }
    handle(g); opts(g); rail(g); colsBtn(); hideCols(); follow(g);
  }
  // ▦ hide the grid columns you do not need (remembered on this computer; the #, ✓ and Task columns always stay)
  var HK = 'champGanttHide', hidden = function () { try { return JSON.parse(get(HK) || '[]'); } catch (e) { return []; } };
  var colKey = function (th) { return (th.textContent || '').replace(/[❄(].*$/, '').replace(/[^\w$ %×★]/g, '').trim().toLowerCase(); };
  function heads() { var L = document.getElementById('gLeft'), tr = L && L.querySelector('thead tr'); return tr ? Array.prototype.slice.call(tr.children) : []; }
  function hideCols() {
    var H = hidden(), css = heads().map(function (th, i) { return i > 2 && H.indexOf(colKey(th)) >= 0 ? '#gLeft .gt tr>:nth-child(' + (i + 1) + '){display:none!important}' : ''; }).join('');
    var st = document.getElementById('champColHide'); if (!st) { st = document.createElement('style'); st.id = 'champColHide'; document.head.appendChild(st); }
    if (st.textContent !== css) st.textContent = css;
  }
  function colLab() { var n = hidden().length; return '👁 Hide columns' + (n ? ' <span class="gcol-n">' + n + ' hidden</span>' : ''); }
  function colsBtn() {
    var row = document.querySelector('#gCard .pviews'); if (!row || row.querySelector('.gcol-btn')) return;
    var w = document.createElement('div'); w.className = 'tabs'; w.style.margin = '0';
    w.innerHTML = '<button type="button" class="tab gcol-btn" title="Choose which grid columns to hide or show">' + colLab() + '</button>';
    var wb = row.querySelector('.pv-wbs'); if (wb) row.insertBefore(w, wb); else row.appendChild(w);   // 🌳 WBS stays at the far right
    w.firstChild.onclick = function (e) { e.stopPropagation(); colsPanel(w.firstChild); };
  }
  function colsPanel(bt) {
    var old = document.getElementById('gColPop'); if (old) { old.remove(); return; }
    var H = hidden(), list = heads().map(function (th, i) { return { i: i, k: colKey(th), lab: (th.textContent || '').replace(/❄.*$/, '').trim(), shown: getComputedStyle(th).display !== 'none' }; })
      .filter(function (c) { return c.i > 2 && c.k && (c.shown || H.indexOf(c.k) >= 0); });
    var p = document.createElement('div'); p.id = 'gColPop'; p.className = 'fit-pop gcol-pop';
    p.innerHTML = '<button type="button" class="fit-x" aria-label="Close">✕</button><b>👁 Hide columns</b><small class="muted">Untick a column to hide it. #, ✓ and Task always stay.</small>' +
      '<div class="gcol-list">' + list.map(function (c) { var nm = c.lab.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim(); nm = nm.charAt(0).toUpperCase() + nm.slice(1).toLowerCase(); if (nm === '%') nm = '% done'; return '<label class="gcol-it"><input type="checkbox" data-ck="' + c.k.replace(/"/g, '') + '"' + (H.indexOf(c.k) < 0 ? ' checked' : '') + '><span>' + nm.replace(/</g, '&lt;') + '</span></label>'; }).join('') + '</div>' +
      '<div class="fit-seg"><button type="button" data-all>Show all</button><button type="button" data-done class="on">Done</button></div>';
    document.body.appendChild(p);
    var r = bt.getBoundingClientRect(); p.style.top = Math.min(r.bottom + 6, window.innerHeight - p.offsetHeight - 8) + 'px'; p.style.left = Math.max(8, Math.min(window.innerWidth - p.offsetWidth - 8, r.left)) + 'px';
    var save = function () { var hs = []; p.querySelectorAll('[data-ck]').forEach(function (x) { if (!x.checked) hs.push(x.getAttribute('data-ck')); }); var keep = hidden().filter(function (k) { return !p.querySelector('[data-ck="' + k + '"]'); }); put(HK, JSON.stringify(keep.concat(hs))); hideCols();
      var b2 = document.querySelector('.gcol-btn'); if (b2) b2.innerHTML = colLab(); };
    p.querySelectorAll('[data-ck]').forEach(function (x) { x.onchange = save; });
    p.querySelector('[data-all]').onclick = function () { put(HK, null); p.querySelectorAll('[data-ck]').forEach(function (x) { x.checked = true; }); save(); };
    p.querySelector('[data-done]').onclick = p.querySelector('.fit-x').onclick = function () { p.remove(); };
  }
  // ↔ as you scroll down, the chart follows the bars: if none of the rows in view has its bar on screen, it slides across to them
  //    (it leaves you alone for a few seconds after you scroll sideways yourself)
  function follow(g) {
    var Rt = document.getElementById('gRight'), L = document.getElementById('gLeft'); if (!Rt || Rt.gFollow) return; Rt.gFollow = 1;
    var mine = false, userX = 0, lastX = Rt.scrollLeft, lastY = Rt.scrollTop, tm = 0;
    var check = function () {
      if (Date.now() - userX < 4000 || document.body.classList.contains('gh-dragging')) return;
      var R = Rt.getBoundingClientRect(), head = Rt.querySelector('thead'), top = R.top + (head ? head.offsetHeight : 0), lo = Infinity, hi = -Infinity, any = false;
      Rt.querySelectorAll('tbody tr').forEach(function (tr) { var b = tr.getBoundingClientRect(); if (b.bottom < top + 4 || b.top > R.bottom - 4) return;
        tr.querySelectorAll('.gbar,.gmile').forEach(function (el) { var e = el.getBoundingClientRect(); if (!e.width && !e.height) return; any = true; var x0 = e.left - R.left + Rt.scrollLeft, x1 = e.right - R.left + Rt.scrollLeft; if (x0 < lo) lo = x0; if (x1 > hi) hi = x1; }); });
      if (!any) return; var v0 = Rt.scrollLeft, v1 = v0 + Rt.clientWidth;
      if (hi > v0 + 20 && lo < v1 - 20) return;   // a bar in view already
      mine = true; Rt.scrollTo({ left: Math.max(0, lo - 80), behavior: 'smooth' }); setTimeout(function () { mine = false; lastX = Rt.scrollLeft; }, 700);
    };
    Rt.addEventListener('scroll', function () {
      if (Rt.scrollLeft !== lastX) { if (!mine) userX = Date.now(); lastX = Rt.scrollLeft; }
      if (Rt.scrollTop !== lastY) { lastY = Rt.scrollTop; clearTimeout(tm); tm = setTimeout(check, 160); }
    }, { passive: true });
  }
  // ⇅ the rail beside the Gantt chart: ⤒ top, ▲ up a page, a slider for the rows, ▼ down a page, ⤓ end (for touch screens and touch pads)
  function rail(g) {
    if (g.querySelector('.g-rail')) return; var L = document.getElementById('gLeft'); if (!L) return;
    var r = document.createElement('div'); r.className = 'g-rail';
    r.innerHTML = '<button type="button" data-r="top" title="First row">⤒</button><button type="button" data-r="up" title="Up a page (Page Up)">▲</button>' +
      '<input type="range" min="0" max="1000" value="0" aria-label="Scroll the rows" title="Drag to scroll the rows"><button type="button" data-r="dn" title="Down a page (Page Down)">▼</button><button type="button" data-r="end" title="Last row">⤓</button>';
    g.appendChild(r);
    var rg = r.querySelector('input'), max = function () { return Math.max(0, L.scrollHeight - L.clientHeight); };
    var go = function (y) { y = Math.max(0, Math.min(max(), y)); if (g.gScrollTo) g.gScrollTo(y); else L.scrollTop = y; show(); };
    var show = function () { var m = max(); rg.disabled = !m; rg.value = m ? Math.round(L.scrollTop / m * 1000) : 0; r.classList.toggle('none', !m); };
    rg.addEventListener('input', function () { go(rg.value / 1000 * max()); });
    r.querySelectorAll('[data-r]').forEach(function (bt) { bt.onclick = function () { var k = bt.getAttribute('data-r'), pg = L.clientHeight * 0.85; go(k === 'top' ? 0 : k === 'end' ? max() : L.scrollTop + (k === 'dn' ? pg : -pg)); }; });
    L.addEventListener('scroll', show, { passive: true }); setTimeout(show, 50);
  }
  // ⌨ like Excel: ↑ ↓ (and Enter) move to the cell above or below in the grid; the text is selected so you can type over it
  document.addEventListener('keydown', function (e) {
    if ((e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
    var t = e.target, L = document.getElementById('gLeft'); if (!L || !L.contains(t) || !/^(INPUT|SELECT)$/.test(t.tagName)) return;
    if (!t.hasAttribute('data-k') || t.type === 'date' || t.type === 'checkbox' || (t.tagName === 'SELECT' && e.key !== 'Enter')) return;   // only the grid's own cells (not the people picker or the # box)
    var td = t.closest('td'), tr = td && td.closest('tr'); if (!tr || !tr.parentNode || tr.parentNode.tagName !== 'TBODY') return;
    var rows = Array.prototype.slice.call(tr.parentNode.children), ci = td.cellIndex, i = rows.indexOf(tr), dir = e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey) ? -1 : 1;
    var pick = function (row) { var c = row && row.cells[ci]; if (!c) return null; var x = c.querySelector('input:not([type=checkbox]):not([disabled]),select:not([disabled])'); return x && x.offsetParent ? x : null; };
    for (var j = i + dir; j >= 0 && j < rows.length; j += dir) {
      var nx = pick(rows[j]); if (!nx) continue;
      e.preventDefault(); var idx = j;
      var land = function (el) { el.focus({ preventScroll: false }); try { if (el.select && el.type !== 'number') el.select(); else if (el.select) el.select(); } catch (x) {} el.scrollIntoView({ block: 'nearest' }); };
      land(nx);
      [40, 160].forEach(function (ms) { setTimeout(function () {   // the cell you left may redraw the grid: find the same cell again
        var a = document.activeElement, L2 = document.getElementById('gLeft'); if (!L2 || (a && L2.contains(a) && a !== document.body && a.isConnected)) return;
        var tb = L2.querySelector('tbody'), row = tb && tb.children[idx], el = pick(row); if (el) land(el); }, ms); });
      return;
    }
  }, true);
  
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
  // 💻 the layout switch in the header: a small panel with Auto or Compact, the screen scale it found (Windows display scaling
  //    × the browser's zoom) and the window size, and how to make everything smaller with the browser's zoom (a web page cannot
  //    change Windows scaling or the browser's zoom itself; the browser keeps the zoom you pick for Champ)
  var scale = function () { return Math.round((window.devicePixelRatio || 1) * 100); };
  var mode = function () { return get('champFitMode') === 'compact' ? 'compact' : 'auto'; };
  var suggest = function () { var w = window.innerWidth, h = window.innerHeight, z = Math.min(1, w / 1440, h / 800); return z >= 0.97 ? 100 : z >= 0.86 ? 90 : z >= 0.76 ? 80 : z >= 0.7 ? 75 : 67; };
  function panel(bt) {
    var old = document.getElementById('champFitPop'); if (old) { old.remove(); return; }
    var sg = suggest(), steps = { 90: 'once', 80: 'twice', 75: '3 times', 67: '4 times' }[sg];
    var p = document.createElement('div'); p.id = 'champFitPop'; p.className = 'fit-pop';
    p.innerHTML = '<button type="button" class="fit-x" aria-label="Close">✕</button><b>💻 Screen fit</b>' +
      '<div class="fit-seg"><button type="button" data-m="auto" class="' + (mode() === 'auto' ? 'on' : '') + '">🖥 Auto</button><button type="button" data-m="compact" class="' + (mode() === 'compact' ? 'on' : '') + '">💻 Compact</button></div>' +
      '<small>' + (mode() === 'auto' ? 'Auto: compact on a small window, full on a big monitor. Now: <b>' + (short ? 'compact' : 'full') + '</b>.' : 'Compact: the slim layout on every screen.') + '</small>' +
      '<div class="fit-info">Screen scale found: <b>' + scale() + '%</b> · window <b>' + window.innerWidth + ' × ' + window.innerHeight + '</b></div>' +
      '<div class="fit-tip"><b>Make everything smaller (like your monitor):</b> hold <kbd>Ctrl</kbd> and press <kbd>−</kbd>' + (sg < 100 ? ' <b>' + steps + '</b> (about ' + sg + '% for this screen)' : '') + '. <kbd>Ctrl</kbd> <kbd>0</kbd> goes back to 100%. The browser remembers it for Champ, and Champ fits itself to the new size.' +
      '<br><span class="muted">Or in Windows: Settings → Display → Scale: 125% or 110%.</span></div>';
    document.body.appendChild(p);
    var r = bt.getBoundingClientRect(); p.style.top = (r.bottom + 6) + 'px'; p.style.left = Math.max(8, Math.min(window.innerWidth - p.offsetWidth - 8, r.right - p.offsetWidth)) + 'px';
    p.querySelector('.fit-x').onclick = function () { p.remove(); };
    p.querySelectorAll('[data-m]').forEach(function (x) { x.onclick = function () { put('champFitMode', x.getAttribute('data-m') === 'compact' ? 'compact' : null); detect(); lab(bt); p.remove(); panel(bt); }; });
  }
  function lab(bt) { bt.textContent = (short ? '💻 ' : '🖥 ') + (mode() === 'compact' ? 'Compact' : 'Auto'); bt.title = 'Screen fit: ' + (mode() === 'compact' ? 'always compact' : 'Auto (now ' + (short ? 'compact' : 'full') + ')') + ' · scale ' + scale() + '% · window ' + window.innerWidth + ' × ' + window.innerHeight; }
  function switcher() {
    var ctl = window.ChampCtl && window.ChampCtl(); if (!ctl) return false; if (document.getElementById('champFitBtn')) return true;
    var bt = document.createElement('button'); bt.type = 'button'; bt.id = 'champFitBtn'; bt.className = 'ct-lang ct-fit';
    bt.onclick = function () { panel(bt); }; bt.onmouseenter = function () { lab(bt); }; lab(bt); ctl.insertBefore(bt, ctl.firstChild);
    window.addEventListener('resize', function () { lab(bt); });
    // once per scale: on a small, scaled-up screen, say how to fit more on it
    setTimeout(function () { var key = 'champFitHint' + scale() + 'x' + Math.round(window.innerHeight / 50);
      if (short && scale() >= 115 && suggest() < 100 && !get(key) && !document.getElementById('tdy')) { put(key, '1'); lab(bt); panel(bt); } }, 1500);
    return true;
  }
  (function tries(k) { if (!switcher() && k < 40) setTimeout(function () { tries(k + 1); }, 250); })(0);
  window.addEventListener('resize', detect);
  detect();
  window.ChampFit = { detect: detect, fit: fit };   // for tests
})();
