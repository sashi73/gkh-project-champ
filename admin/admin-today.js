/* GKH Project Champ: 🎯 Today, the start screen after sign-in (Lean flow, like TPS).
   Only what is linked to you: 1. Things to do (your tasks, sub-tasks and steps), 2. Needs my attention (the andon: sticky notes
   that @mention you or sit on your work). Due date, urgency, a link; red when overdue. ✓ ticks it done and it leaves the list.
   ✕ (or Esc) closes it and you are back in the console. 🎯 Today in the menu opens it again. */
(function () {
  'use strict';
  var M = window.MBS; if (!M) return;
  var esc = M.esc, api = M.api, $ = function (s, r) { return (r || document).querySelector(s); };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var dmy = function (s) { if (!s) return '—'; var p = String(s).split('-'); return +p[2] + ' ' + MON[+p[1] - 1]; };
  var DOT = { red: '🔴', amber: '🟠', green: '🟢' };
  var DAYN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function dueCell(x) {
    var tag = x.when === 'today' ? '<span class="tdy-now">DUE TODAY</span>' : x.when === 'overdue' ? '<small class="tdy-late">overdue</small>'
      : x.when === 'tomorrow' ? '<span class="tdy-soon">' + (function () { var d = new Date(x.due + 'T00:00:00Z'), t = new Date(Date.now() + 864e5); return d.getUTCDate() === t.getDate() ? 'DUE TOMORROW' : 'DUE ' + DAYN[d.getUTCDay()].toUpperCase(); })() + '</span>' : '';
    return '<td class="tdy-due">' + DOT[x.when === 'today' || x.when === 'overdue' ? 'red' : x.when === 'tomorrow' ? 'amber' : x.rag] + ' ' + esc(dmy(x.due)) + tag + '</td>';
  }
  var canEdit = function () { var me = M.me || {}; return !!me.owner || (me.mods || {}).projects === 'edit'; };

  var still = function () { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  function close(now) {
    var o = $('#tdy'); document.removeEventListener('keydown', onKey, true); document.body.classList.remove('tdy-open'); if (!o) return;
    if (now === true || still() || o.classList.contains('tdy-out')) { o.remove(); return; }
    var nav = $('.side-nav [data-today]'), st = $('.tdy-stage', o), r = nav && nav.getBoundingClientRect();
    if (st && r && r.width && r.right > 0 && st.animate) {   // it flies back into 🎯 Today in the menu, where it stays
      var b = st.getBoundingClientRect(), dx = r.left + r.width / 2 - (b.left + b.width / 2), dy = r.top + r.height / 2 - (b.top + b.height / 2), k = Math.max(.04, r.height / b.height);
      o.classList.add('tdy-out', 'tdy-fly');
      st.animate([{ transform: 'none', opacity: 1, borderRadius: '0' }, { transform: 'translate(' + dx * .35 + 'px,' + (dy * .35 - 30) + 'px) scale(.55) rotate(-4deg)', opacity: .95, offset: .45 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + k + ') rotate(-12deg)', opacity: .2, borderRadius: '40px' }], { duration: 650, easing: 'cubic-bezier(.5,0,.7,.4)', fill: 'forwards' });
      setTimeout(function () { o.remove(); nav.classList.remove('tdy-land'); void nav.offsetWidth; nav.classList.add('tdy-land'); }, 640);
      return;
    }
    o.classList.add('tdy-out'); setTimeout(function () { o.remove(); }, 520);   // no menu on screen (phone, menu folded): the page rolls back up
  }
  // the red count on 🎯 Today in the menu: overdue work and open blockers
  function badge(c) { var a = $('.side-nav [data-today]'); if (!a) return; var n = c ? (c.now != null ? c.now : (c.overdue || 0) + (c.blockers || 0)) : 0, el = $('.tdy-badge', a);
    if (!n) { if (el) el.remove(); return; } if (!el) { el = document.createElement('span'); el.className = 'tdy-badge'; a.appendChild(el); } el.textContent = n > 99 ? '99+' : String(n); el.title = (c.overdue || 0) + ' overdue · ' + (c.dueToday || 0) + ' due today · ' + (c.blockers || 0) + ' #blockers'; }
  function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
  function go(x, note) { close(true); M.focus = { core: x.core, t: x.t, s: x.s || '', q: x.q || '', note: note ? x.nid : '', at: Date.now() }; if (location.hash === x.link) { location.hash = '#portfolio'; setTimeout(function () { location.hash = x.link; }, 0); } else location.hash = x.link; }

  function rowTodo(x, i) {
    var what = '<b>' + esc(x.name) + '</b>' + (x.parent ? '<small>' + esc(x.parent) + '</small>' : '');
    return '<tr class="tdy-' + x.rag + (x.when === 'today' ? ' tdy-today' : '') + '" data-i="' + i + '" style="--d:' + i + '">' + dueCell(x) +
      '<td><span class="tdy-u tdy-u' + x.lv + '">' + esc(x.urgency) + '</span></td><td class="tdy-what"><span class="tdy-k">' + esc(x.kind) + '</span>' + what + '</td>' +
      '<td class="tdy-proj">' + esc(x.project) + '</td><td class="tdy-act">' + (canEdit() ? '<button type="button" class="btn btn-sm" data-done title="Tick it done: it leaves the list">✓ Done</button>' : '') +
      '<button type="button" class="btn btn-sm btn-gold" data-open>Open →</button></td></tr>';
  }
  // #tags as coloured chips (assets/note-tags.js)
  var TG = function () { return window.CHAMP_TAGS || null; };
  function tagged(h) { var g = TG(); if (!g) return h; return h.replace(/(^|[^\p{L}\p{N}_&])#([\p{L}_]+)/gu, function (m, a, w) { var t = g.tagOf(w); return t ? a + '<span class="ntag" style="--tc:' + t.c + '" title="' + esc(t.m) + '">' + t.i + ' #' + t.id + '</span>' : m; }); }
  function rowNote(x, i) {
    return '<tr class="tdy-' + x.rag + (x.when === 'today' ? ' tdy-today' : '') + '" data-n="' + i + '" data-tags="' + esc((x.tags || []).join(' ')) + '" style="--d:' + (i + 3) + '">' + dueCell(x) +
      '<td><span class="tdy-u tdy-n' + x.c + '">' + esc(x.urgency) + '</span></td><td class="tdy-what">' + (x.mention ? '<span class="tdy-k">@ you</span>' : '') + '<b>' + tagged(esc(String(x.text).slice(0, 220))) + '</b><small>on ' + esc(x.task) + '</small></td>' +
      '<td>' + esc(x.by || '—') + '</td><td class="tdy-proj">' + esc(x.project) + '</td><td class="tdy-act">' + (canEdit() ? '<button type="button" class="btn btn-sm" data-done title="Mark the note done: it leaves the list">✓ Resolved</button>' : '') +
      '<button type="button" class="btn btn-sm btn-gold" data-open>Open →</button></td></tr>';
  }
  function tagBar(c) { var g = TG(), t = (c && c.tags) || {}; if (!g || !Object.keys(t).length) return '';
    return '<div class="tdy-tags"><button type="button" class="tdy-tf on" data-tf="">All <b>' + (c.notes || 0) + '</b></button>' + g.TAGS.filter(function (x) { return t[x.id]; }).map(function (x) {
      return '<button type="button" class="tdy-tf" data-tf="' + x.id + '" style="--tc:' + x.c + '" title="' + esc(x.m) + '">' + x.i + ' #' + x.id + ' <b>' + t[x.id] + '</b></button>'; }).join('') + '</div>'; }
  function table(head, rows, none) {
    return rows ? '<div class="tdy-tw"><table class="tdy-t"><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>'
      : '<p class="tdy-none">✓ None. ' + none + '</p>';
  }

  function open(auto) {
    close(true);
    var o = document.createElement('div'); o.id = 'tdy'; o.className = 'tdy'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Today');
    o._gen = 0;
    o.innerHTML = '<div class="tdy-stage"><div class="tdy-rod" aria-hidden="true"></div><div class="tdy-box"><div class="tdy-load"><span class="tdy-spark">✦</span> Unrolling your day…</div></div><div class="tdy-rod tdy-rod-b" aria-hidden="true"></div></div>';
    document.body.appendChild(o); document.body.classList.add('tdy-open'); document.addEventListener('keydown', onKey, true);
    o.addEventListener('mousedown', function (e) { if (e.target === o) close(); });
    return api('planMyDayGet', {}).then(function (d) { if (!document.body.contains(o)) return; draw(o, d); }).catch(function (e) {
      if (!document.body.contains(o) || o.classList.contains('tdy-out')) return;   // that screen is closed already
      if (auto) return close(true);   // no access to projects: no start screen
      $('.tdy-box', o).innerHTML = '<p class="bad">' + esc(e.message) + '</p><p><button class="btn" type="button" id="tdyX2">Close</button></p>'; $('#tdyX2').onclick = close; });
  }

  function draw(o, d) {
    var now = new Date(), day = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }), hr = now.getHours();
    var hi = (hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening') + (d.name ? ', ' + String(d.name).split(' ')[0] : '');
    var c = d.counts || {}; badge(c);
    $('.tdy-box', o).innerHTML =
      '<div class="tdy-h"><div><h2>🎯 Today</h2><p class="muted">' + esc(hi) + ' · ' + esc(day) + '</p></div><span class="sp"></span><button type="button" class="tdy-x" id="tdyX" title="Close (Esc)" aria-label="Close">✕</button></div>' +
      '<div class="tdy-flow"><span class="' + (c.overdue ? 'on-red' : '') + '"><b>' + (c.overdue || 0) + '</b> overdue</span>' +
        '<span class="' + (c.dueToday ? 'on-red tdy-blink' : c.dueSoon ? 'on-amber' : '') + '"><b>' + (c.dueSoon || 0) + '</b> due today or tomorrow' + (c.dueToday ? ' (' + c.dueToday + ' today)' : '') + '</span>' +
        '<span class="' + (c.blockers ? 'on-red' : '') + '"><b>' + (c.blockers || 0) + '</b> 🚧 blocker' + (c.blockers === 1 ? '' : 's') + '</span>' + '<span><b>' + (c.notes || 0) + '</b> note' + (c.notes === 1 ? '' : 's') + ' for me</span></div>' +
      '<section><h3>1 · Things to do</h3>' + table(['Due', 'Urgency', 'What', 'Project', ''], d.todo.map(rowTodo).join(''), 'Nothing is linked to you that is due in the next week.') +
        (d.later ? '<p class="muted tdy-later">+ ' + d.later + ' more starting later (not shown, so today stays focused).</p>' : '') + '</section>' +
      '<section><h3>2 · Needs my attention <small>blockers and notes for you, #blocker first</small></h3>' + tagBar(c) + table(['Due', 'Urgency', 'Note', 'Reported by', 'Project', ''], d.attention.map(rowNote).join(''), 'No open notes or blockers for you.') + '</section>' +
      '<div class="tdy-f"><span class="muted">Flashing red: due today. Red: overdue (or an urgent note). Amber: due tomorrow (or a semi-urgent note). Tick ✓ when it is done and it leaves the list.</span><span class="sp"></span><button type="button" class="btn btn-gold" id="tdyGo">Start working →</button></div>';
    $('#tdyX').onclick = close; $('#tdyGo').onclick = close;
    o.querySelectorAll('tr[data-i],tr[data-n]').forEach(function (tr) {
      var isN = tr.hasAttribute('data-n'), x = isN ? d.attention[+tr.getAttribute('data-n')] : d.todo[+tr.getAttribute('data-i')];
      $('[data-open]', tr).onclick = function () { go(x, isN); };
      var b = $('[data-done]', tr); if (b) b.onclick = function () {
        b.disabled = true;
        api('planMyDayDone', { core: x.core, t: x.t, s: x.s || '', q: x.q || '', nid: isN ? x.nid : '' }).then(function () {
          tr.classList.add('tdy-gone');
          var live = function () { return document.body.contains(o) && !o.classList.contains('tdy-out'); };
          var gen = ++o._gen; api('planMyDayGet', {}).then(function (d2) { setTimeout(function () { if (!live() || gen !== o._gen) return;   /* a later tick's lists win */ o.classList.add('tdy-calm'); draw(o, d2); }, 350); }).catch(function () { if (live()) tr.remove(); });   // fresh lists: its sub-tasks and the counts go too
        }).catch(function (e) { b.disabled = false; M.toast(e.message); });
      };
    });
    o.querySelectorAll('[data-tf]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-tf');
      o.querySelectorAll('[data-tf]').forEach(function (x) { x.classList.toggle('on', x === b); });
      o.querySelectorAll('tr[data-n]').forEach(function (tr) { tr.hidden = !!k && (' ' + tr.getAttribute('data-tags') + ' ').indexOf(' ' + k + ' ') < 0; }); }; });
    var f = $('#tdyGo'); if (f) f.focus({ preventScroll: true });
    // the numbers count up as the page opens
    o.querySelectorAll('.tdy-flow b').forEach(function (b) { var n = +b.textContent || 0; if (!n || still()) return; var k = 0, steps = Math.min(n, 18); b.textContent = '0';
      var tick = function () { k++; b.textContent = String(Math.round(n * k / steps)); if (k < steps) setTimeout(tick, 420 / steps); }; setTimeout(tick, 450); });
    o.classList.add('tdy-ready');
  }

  function refresh() { api('planMyDayGet', {}).then(function (d) { badge(d.counts); }).catch(function () {}); }   // the count only, without the splash
  M.today = { open: open, close: close, badge: badge, refresh: refresh };
  // the menu item
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-today]'); if (a) { e.preventDefault(); open(false); } });
})();
