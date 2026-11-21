/* GKH Project Champ on a phone, after sign-in: only 🎯 Today, like a messenger. Nothing else.
   - Needs you: sticky notes that @mention you or sit on your work (from the person who raised them)
   - To do this week: your tasks, sub-tasks and steps
   Each message: 👁 Mark as viewed (the computer then shows "Viewed on phone"), and 📞 Call the person who raised it
   (a note: whoever wrote it; a task: the project manager), when their number is on the project's stakeholders
   and it is not you. Items leave when they are ticked done or reach 100% on the computer. */
(function () {
  'use strict';
  var M = window.MBS, P = window.ChampPhone; if (!M || !P || !P.is) return;
  var esc = M.esc, api = M.api, toast = M.toast, D = null, busy = false, root = null, timer = null;
  var LANGS = [['en', 'English'], ['ms', 'Melayu'], ['id', 'Indonesia'], ['ta', 'தமிழ்'], ['zh', '中文'], ['hi', 'हिन्दी'], ['ar', 'العربية'], ['fa', 'فارسی'], ['vi', 'Tiếng Việt'], ['th', 'ไทย'], ['tl', 'Filipino'],
    ['ja', '日本語'], ['ko', '한국어'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['pt', 'Português'], ['sw', 'Kiswahili'], ['rw', 'Kinyarwanda'], ['km', 'ខ្មែរ']];
  var cur = function () { try { return localStorage.getItem('champLang') || 'en'; } catch (e) { return 'en'; } };
  var day = function (s) { return s ? new Date(s + 'T00:00:00Z').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) : ''; };
  var clock = function (ms) { return new Date(ms).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); };
  var ago = function (ms) { if (!ms) return ''; var m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : clock(ms); };
  var initials = function (n) { var w = String(n || '?').replace(/\(.*?\)/g, '').trim().split(/\s+/); return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); };
  var hue = function (n) { var h = 0; String(n || '').split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 360; }); return 'hsl(' + h + ',45%,42%)'; };
  function due(x) {
    if (!x.due) return '';
    var w = x.when, t = w === 'overdue' ? 'Overdue · was due ' + day(x.due) : w === 'today' ? 'Due today' : w === 'tomorrow' ? 'Due tomorrow' : 'Due ' + day(x.due);
    return '<span class="pa-due ' + (w || '') + '">' + esc(t) + '</span>';
  }
  function tags(x) {
    var g = window.CHAMP_TAGS; if (!g || !(x.tags || []).length) return '';
    return '<div class="pa-tags">' + x.tags.map(function (id) { var t = g.tagOf(id); return t ? '<span style="--tc:' + t.c + '">' + t.i + ' #' + esc(t.id) + '</span>' : ''; }).join('') + '</div>';
  }
  function acts(x, k) {
    var v = x.viewed ? '<button type="button" class="pa-seen" disabled>✓ Viewed ' + esc(clock(x.viewed)) + '</button>' : '<button type="button" class="pa-view" data-view="' + k + '">👁 Mark as viewed</button>';
    var c = x.call && x.call.tel ? '<a class="pa-call" href="tel:' + esc(x.call.tel) + '" data-noi18n>📞 Call ' + esc(String(x.call.name).split(' ')[0]) + '</a>' : '';
    return '<div class="pa-acts">' + v + '<button type="button" class="pa-rem" data-rem="' + k + '">⏰ Remind me</button>' + c + '</div>';
  }
  function note(x, i) {
    var k = 'a' + i;
    return '<div class="pa-m ' + x.rag + '" id="pm-' + k + '"><div class="pa-w"><span class="pa-av" style="background:' + hue(x.by) + '" data-noi18n>' + esc(initials(x.by)) + '</span><div><b data-noi18n>' + esc(x.by || 'Someone') + '</b><small>' + esc(x.project) + ' · ' + esc(x.task) + '</small></div></div>' +
      '<div class="pa-x">' + esc(String(x.text || '').replace(/^- \[( |x|X)\] /gm, '• ')) + '</div>' + tags(x) + due(x) + acts(x, k) + '<span class="pa-ts">' + esc(ago(x.at)) + '</span></div>';
  }
  function short(x) {   // the due chip on a task card: 3 days late / Today / Tomorrow / Mon 23 Nov
    if (!x.due) return '';
    var late = D && D.today && x.due < D.today ? Math.round((Date.parse(D.today) - Date.parse(x.due)) / 864e5) : 0;
    var t = x.when === 'overdue' ? (late ? late + (late === 1 ? ' day' : ' days') + ' late' : 'Late') : x.when === 'today' ? 'Due today' : x.when === 'tomorrow' ? 'Tomorrow' : day(x.due).replace(',', '');
    return '<span class="pa-due ' + (x.when || '') + '">' + esc(t) + '</span>';
  }
  function task(x, i) {
    var k = 't' + i, ic = { Task: '📋', Milestone: '◆', 'Sub-task': '↳', Step: '•' }[x.kind] || '📋', pc = Math.max(0, Math.min(100, +x.pct || 0));
    var where = [x.kind, x.project].concat(x.parent ? [x.parent] : []).join(' · ');
    return '<div class="pa-m task ' + x.rag + '" id="pm-' + k + '"><div class="pa-tr"><span class="pa-ic">' + ic + '</span><div class="pa-tt"><b>' + esc(x.name) + '</b><small>' + esc(where) + '</small></div>' + short(x) + '</div>' +
      (x.kind !== 'Step' && x.kind !== 'Milestone' ? '<div class="pa-pg"><span class="pa-bar"><i style="width:' + pc + '%"></i></span><small>' + pc + '%</small></div>' : '') + acts(x, k) + '</div>';
  }
  function draw() {
    if (!root) return;
    var feed = root.querySelector('.pa-feed'), sum = root.querySelector('.pa-sum');
    if (!D) { feed.innerHTML = '<p class="pa-empty">Loading…</p>'; return; }
    var c = D.counts || {}, A = D.attention || [], T = D.todo || [];
    sum.innerHTML = (c.overdue ? '<span class="r">' + c.overdue + ' overdue</span>' : '') + (c.dueToday ? '<span class="r">' + c.dueToday + ' due today</span>' : '') + (c.blockers ? '<span class="r">⛔ ' + c.blockers + ' blocker' + (c.blockers > 1 ? 's' : '') + '</span>' : '') +
      (c.dueSoon - (c.dueToday || 0) > 0 ? '<span class="a">' + (c.dueSoon - c.dueToday) + ' due tomorrow</span>' : '') + '<span>' + A.length + ' note' + (A.length === 1 ? '' : 's') + '</span><span>' + T.length + ' to do</span>';
    if (!A.length && !T.length) { feed.innerHTML = '<div class="pa-empty"><b>🎉</b>Nothing for you this work week.<br><small>New notes and tasks will show here.</small></div>' + later(); return; }
    feed.innerHTML = (A.length ? '<span class="pa-day">Needs you · ' + A.length + '</span>' + A.map(note).join('') : '') +
      (T.length ? '<span class="pa-day">To do this week · ' + T.length + '</span>' + T.map(task).join('') : '') + later();
    wire(feed);
  }
  function later() { var n = (D.later || 0) + (D.laterNotes || 0); return n ? '<p class="pa-later">+ ' + n + ' more due after ' + esc(day(D.weekEnd)) + '</p>' : ''; }
  function wire(el) { el.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { view(b); }; }); el.querySelectorAll('[data-rem]').forEach(function (b) { b.onclick = function () { remind(b.getAttribute('data-rem')); }; }); }
  // ⏰ Remind me: an event with an alert in Google Calendar, or in the phone's own calendar (Apple Calendar on an iPhone) from a calendar file
  var two = function (n) { return (n < 10 ? '0' : '') + n; };
  var utc = function (d) { return d.getUTCFullYear() + two(d.getUTCMonth() + 1) + two(d.getUTCDate()) + 'T' + two(d.getUTCHours()) + two(d.getUTCMinutes()) + '00Z'; };
  var at = function (ymd, h, m) { var d = ymd ? new Date(ymd + 'T00:00:00') : new Date(); d.setHours(h, m || 0, 0, 0); return d; };
  var localIn = function (d) { return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) + 'T' + two(d.getHours()) + ':' + two(d.getMinutes()); };
  var nice = function (d) { return d.toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); };
  function remind(k) {
    var x = k[0] === 'a' ? D.attention[+k.slice(1)] : D.todo[+k.slice(1)]; if (!x) return;
    var now = new Date(), tom = new Date(now.getTime() + 864e5), ymd = function (d) { return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()); };
    var opts = [['In 1 hour', new Date(Math.ceil((now.getTime() + 3600000) / 300000) * 300000)]];
    if (at(null, 16, 0) - opts[0][1] >= 3600000) opts.push(['Today 4:00 pm', at(null, 16, 0)]);
    opts.push(['Tomorrow 9:00 am', at(ymd(tom), 9, 0)]);
    if (x.due && x.due > ymd(tom)) opts.push(['9:00 am on the due day (' + day(x.due) + ')', at(x.due, 9, 0)]);
    var pick = x.due && x.due > ymd(tom) ? opts.length - 1 : 0;
    var title = x.nid ? 'Note from ' + (x.by || 'the team') + ': ' + String(x.text || '').replace(/\s+/g, ' ').slice(0, 90) : x.kind + ': ' + x.name;
    var desc = (x.project || '') + (x.nid ? ' · on ' + x.task : x.parent ? ' · ' + x.parent : '') + (x.due ? ' · due ' + day(x.due) : '') + (x.call && x.call.tel ? ' · call ' + x.call.name + ' ' + x.call.show : '');
    var ios = P.os === 'iOS', mine = ios ? '🍎 Apple Calendar' : '📅 Phone calendar';
    var o = document.createElement('div'); o.className = 'pa-sheet';
    o.innerHTML = '<div class="pa-sh"><div class="pa-grab"></div><b>⏰ Remind me</b><p class="pa-sht">' + esc(title) + '</p><div class="pa-when">' +
      opts.map(function (q, i) { return '<label><input type="radio" name="paw" value="' + i + '"' + (i === pick ? ' checked' : '') + '><span>' + esc(q[0]) + '<small>' + esc(nice(q[1])) + '</small></span></label>'; }).join('') +
      '<label><input type="radio" name="paw" value="c"><span>Pick a time<input type="datetime-local" id="paWhen" value="' + localIn(opts[pick][1]) + '"></span></label></div>' +
      '<div class="pa-apps">' + (ios ? '<button type="button" data-app="ics">' + mine + '</button><button type="button" data-app="g">Google Calendar</button>' : '<button type="button" data-app="g">Google Calendar</button><button type="button" data-app="ics">' + mine + '</button>') + '</div>' +
      '<p class="pa-shn">It goes into your calendar with an alert at that time. Your phone asks you to confirm.</p><button type="button" class="pa-shx">Cancel</button></div>';
    document.body.appendChild(o); requestAnimationFrame(function () { o.classList.add('on'); });
    var close = function () { o.classList.remove('on'); setTimeout(function () { o.remove(); }, 250); };
    o.querySelector('.pa-shx').onclick = close;
    o.querySelector('#paWhen').onfocus = function () { o.querySelector('input[value=c]').checked = true; };
    o.querySelectorAll('[data-app]').forEach(function (b) { b.onclick = function () {
      var v = (o.querySelector('input[name=paw]:checked') || {}).value, when = v === 'c' ? new Date(o.querySelector('#paWhen').value) : opts[+v][1];
      if (!when || isNaN(when)) { toast('Pick a time first', true); return; }
      if (when < new Date(Date.now() - 60000)) { toast('That time has passed: pick a later one', true); return; }
      var link = '/admin/' + (x.link || ''), end = new Date(when.getTime() + 15 * 60000);
      if (b.getAttribute('data-app') === 'g') {
        window.open('https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('⏰ ' + title) + '&dates=' + utc(when) + '/' + utc(end) + '&details=' + encodeURIComponent(desc + '\n' + location.origin + link), '_blank');
      } else {
        location.href = '/.netlify/functions/admin?action=ics&start=' + utc(when) + '&title=' + encodeURIComponent('⏰ ' + title) + '&desc=' + encodeURIComponent(desc) + '&link=' + encodeURIComponent(link);
      }
      close(); toast('⏰ Reminder for ' + nice(when) + ': confirm it in your calendar');
    }; });
  }
  function view(b) {
    var k = b.getAttribute('data-view'), x = k[0] === 'a' ? D.attention[+k.slice(1)] : D.todo[+k.slice(1)]; if (!x) return;
    b.disabled = true; b.textContent = '…';
    api('planMyDaySeen', { core: x.core, t: x.t, s: x.s || '', q: x.q || '', nid: x.nid || '', via: 'phone' }).then(function (r) {
      x.viewed = r.at || Date.now(); var m = document.getElementById('pm-' + k); if (m) { var h = (k[0] === 'a' ? note : task)(x, +k.slice(1)), t = document.createElement('div'); t.innerHTML = h; var nm = t.firstChild; m.replaceWith(nm); wire(nm); }
      if (navigator.vibrate) navigator.vibrate(15);
    }).catch(function (e) { b.disabled = false; b.textContent = '👁 Mark as viewed'; toast(e.message, true); });
  }
  function load() {
    if (busy) return; busy = true; var r = root && root.querySelector('#paRe'); if (r) r.classList.add('spin');
    api('planMyDayGet').then(function (d) { D = d; draw(); var s = root.querySelector('.pa-t small'); if (s) s.textContent = (M.me && M.me.name ? M.me.name + ' · ' : '') + 'week to ' + day(d.weekEnd); })
      .catch(function (e) { toast(e.message, true); if (!D) { root.querySelector('.pa-feed').innerHTML = '<p class="pa-empty">Could not load Today. Pull ⟳ to try again.</p>'; } })
      .then(function () { busy = false; if (r) r.classList.remove('spin'); });
  }
  function start(me) {
    if (root) { load(); return; }
    root = document.createElement('div'); root.id = 'phApp';
    root.innerHTML = '<header class="pa-h"><img src="../assets/gkh-globe.webp" alt=""><div class="pa-t"><b>🎯 Today</b><small></small></div>' +
      '<select class="pa-lang" id="paLang" data-noi18n aria-label="Language">' + LANGS.map(function (l) { return '<option value="' + l[0] + '"' + (l[0] === cur() ? ' selected' : '') + '>' + esc(l[1]) + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="pa-ib" id="paRe" aria-label="Refresh">⟳</button><button type="button" class="pa-ib pa-out" id="paOut">Sign out</button></header>' +
      '<div class="pa-sum"></div><main class="pa-feed"></main>' +
      '<p class="pa-foot">Plans are updated on a computer: ticked notes and finished tasks leave this list.<br><span data-noi18n>📱 ' + esc(P.label) + '</span> · <a href="index.html?phone=0">Full console</a></p>';
    document.body.appendChild(root);
    root.querySelector('#paRe').onclick = load;
    root.querySelector('#paOut').onclick = function () { api('logout').then(function () { location.href = '../login.html'; }).catch(function () { location.href = '../login.html'; }); };
    root.querySelector('#paLang').onchange = function () { var v = this.value; try { localStorage.setItem('champLang', v); } catch (e) {} if (window.ChampI18n) window.ChampI18n.set(v); };
    document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
    clearInterval(timer); timer = setInterval(function () { if (!document.hidden) load(); }, 120000);
    draw(); load();
  }
  M.phoneApp = { start: start, reload: load };
})();
