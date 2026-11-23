/* GKH Project Champ: 🌳 the Champ circuit tree, full screen in the dashboard (champ-tree.html, the same page as on the Features page).
   Opened from Help (the card at the top) or by asking Champ ("open tree", "circuit tree", "Champ tree"). Close: the ✕ button or Esc. */
(function () {
  'use strict';
  var M = window.MBS; if (!M) return;
  var back = null;
  function close() {
    var o = document.getElementById('treeFS'); if (!o) return;
    o.remove(); document.documentElement.classList.remove('tree-open');
    Array.prototype.forEach.call(document.body.children, function (c) { if (c.__treeInert) { c.inert = false; c.__treeInert = false; } });
    removeEventListener('keydown', onKey); removeEventListener('message', onMsg);
    if (back && back.focus) try { back.focus(); } catch (e) {}
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function onMsg(e) { if (e.origin === location.origin && e.data && e.data.champTree === 'close') close(); }
  function open() {
    if (document.getElementById('treeFS')) return;
    back = document.activeElement;
    var o = document.createElement('div'); o.id = 'treeFS'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'The Champ circuit tree');
    o.innerHTML = '<iframe src="../champ-tree.html?app=1" title="Project Champ as a circuit tree"></iframe><button type="button" class="tree-x" aria-label="Close the circuit tree">✕ <span>Close</span></button>';
    // everything behind the full screen is out of reach (keyboard and screen readers) until it closes
    Array.prototype.forEach.call(document.body.children, function (c) { if (c !== o && !c.inert) { c.inert = true; c.__treeInert = true; } });
    document.body.appendChild(o); document.documentElement.classList.add('tree-open');
    o.querySelector('.tree-x').onclick = close;
    addEventListener('keydown', onKey); addEventListener('message', onMsg);
    setTimeout(function () { var b = o.querySelector('.tree-x'); if (b) b.focus(); }, 30);
  }
  M.openTree = open; M.closeTree = close;
  // #tree opens it too (a link anyone can send), then goes back to where you were
  // from inside the dashboard: back to that screen; a link from elsewhere (or a new tab): Help stays underneath
  var prev = '';
  addEventListener('hashchange', function (e) { prev = (e.oldURL || '').indexOf(location.origin + location.pathname) === 0 && !/#tree$/.test(e.oldURL) ? e.oldURL : ''; });
  M.addView('tree', 'Circuit tree', function () { open(); setTimeout(function () { if (prev) history.back(); else location.replace('#help'); }, 0); }, 'help');
})();
