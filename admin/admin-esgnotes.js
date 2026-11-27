/* 🗒 Sticky notes on an ESG report: the same notes as on a project's tasks (red urgent, amber semi-urgent, green fine, ✓ when done),
   one set per section (Scope 1 & 2, Human rights, Carbon credits…). A note that @mentions someone is pushed to their 🎯 Today and the phone app.
   Uses the project note styles (champ.css .stkpop). Called by admin-esg.js: M.esgNotes.attach(id, tab) after each draw. */
(function () {
  'use strict';
  var M = window.MBS || (window.MBS = {});
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var api = function (a, b) { return M.api(a, b); };
  var toast = function (m, bad) { if (M.toast) M.toast(m, bad); };
  var STK = { R: ['Urgent', '#DC2626'], A: ['Semi-urgent', '#D97706'], G: ['Fine', '#16A34A'] };
  var NAME = { overview: 'Overview', org: 'Organisation', standards: 'Standards', material: 'Material topics', achieve: 'Achievements', carbon: 'Scope 1 & 2', scope3: 'Scope 3', resources: 'Energy, water & waste', climate: 'Climate risk',
    workforce: 'Workforce & safety', rights: 'Human rights', community: 'Community', board: 'Board', ethics: 'Ethics & risk', certs: 'Certifications', avoid: 'Avoided emissions', credits: 'Carbon credits', pricing: 'Pricing & CBAM', statement: 'Statement', report: 'ESG report', records: 'Records' };
  var N = {}, PEOPLE = null, cur = { id: '', tab: '' }, ST = { col: 'G', edit: '', all: false };
  var me = function () { return (M.me && (M.me.name || M.me.user)) || 'Admin'; };
  var isOwner = function () { return !!(M.me && M.me.owner); };
  var openOf = function (L) { return L.filter(function (n) { return !n.done; }); };
  var top = function (L) { var o = openOf(L); return o.some(function (n) { return n.c === 'R'; }) ? 'R' : o.some(function (n) { return n.c === 'A'; }) ? 'A' : o.length ? 'G' : L.length ? 'B' : ''; };
  var bySec = function (id, sec) { return (N[id] || []).filter(function (n) { return sec === 'overview' && ST.all ? true : n.sec === sec; }); };
  var when = function (ms) { return new Date(ms).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); };
  var pretty = function (d) { var x = new Date(d + 'T00:00:00'); return isNaN(x) ? d : x.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }); };
  var TG = function () { return window.CHAMP_TAGS || null; };
  function tagify(h) { var g = TG(); if (!g) return h; return h.replace(/(^|[^\p{L}\p{N}_&])#([\p{L}_]+)/gu, function (m, a, w) { var t = g.tagOf(w); return t ? a + '<span class="ntag" style="--tc:' + t.c + '" title="' + esc(t.m) + '">' + t.i + ' #' + t.id + '</span>' : m; }); }
  function mention(h) { return h.replace(/(^|\s)@([\p{L}][\p{L}\p{M}.'-]*(?: [\p{L}][\p{L}\p{M}.'-]*){0,2})/gu, function (m, a, w) { return a + '<b class="esn-at">@' + w + '</b>'; }); }

  /* ---------- the badges: a coloured count on each section tile and on the 🗒 Notes button ---------- */
  function badges() {
    var id = cur.id, L = N[id] || [], nav = document.getElementById('planTabs'); if (!nav) return;
    nav.querySelectorAll('.tab').forEach(function (a) {
      var sec = (a.getAttribute('href') || '').split('/')[2] || '', S = L.filter(function (n) { return n.sec === sec; }), o = openOf(S), c = top(S), b = a.querySelector('.esn-dot');
      if (!o.length) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement('b'); b.className = 'esn-dot'; a.appendChild(b); }
      b.className = 'esn-dot stk-' + c; b.textContent = o.length; b.title = o.length + ' open note' + (o.length > 1 ? 's' : '') + ': ' + o[o.length - 1].text.slice(0, 80);
    });
    var btn = document.getElementById('esnBtn'); if (!btn) return;
    var S = cur.tab === 'overview' ? L : L.filter(function (n) { return n.sec === cur.tab; }), o = openOf(S), c = top(S);
    btn.className = 'btn btn-sm esn-btn stk-' + (c || 'X');
    btn.innerHTML = '🗒 Notes' + (o.length ? ' <b>' + o.length + '</b>' : c === 'B' ? ' ✓' : '');
    btn.title = cur.tab === 'overview' ? 'Every note on this report' : 'Notes on ' + (NAME[cur.tab] || 'this section') + ': leave a remark for the team; @ someone to send it to their Today';
  }
  function load(id) { return api('esgNotes', { id: id }).then(function (d) { N[id] = d.notes || []; if (cur.id === id) { badges(); var p = document.getElementById('esnPop'); if (p) p._draw(); } }).catch(function () {}); }

  // after each draw of the report: the 🗒 Notes button beside 📥 Import, and the dots on the tiles
  function attach(id, tab) {
    var changed = cur.id !== id; cur = { id: id, tab: tab };
    var head = document.querySelector('.plan-head'), imp = document.getElementById('esgImp');
    if (head && imp && !document.getElementById('esnBtn')) { var b = document.createElement('button'); b.type = 'button'; b.id = 'esnBtn'; b.className = 'btn btn-sm esn-btn'; b.innerHTML = '🗒 Notes'; head.insertBefore(b, imp); b.onclick = function () { panel(b); }; }
    var p = document.getElementById('esnPop'); if (p) { if (changed) p.remove(); else p._draw(); }
    badges(); load(id);
    var fc = M.focus; if (fc && fc.esg === id && fc.note && Date.now() - (fc.at || 0) < 20000) { M.focus = null; setTimeout(function () { var bt = document.getElementById('esnBtn'); if (bt) panel(bt, fc.note); }, 400); }   // 🎯 from Today: open the note
  }

  /* ---------- the panel ---------- */
  function panel(anchor, hl) {
    var old = document.getElementById('esnPop'); if (old) { old.remove(); if (!hl) return; }
    if (!PEOPLE) api('esgNotePeople', {}).then(function (d) { PEOPLE = d.people || []; }).catch(function () { PEOPLE = []; });
    var pop = document.createElement('div'); pop.id = 'esnPop'; pop.className = 'stkpop esn-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Notes'); document.body.appendChild(pop);
    var id = cur.id, first = true;
    var save = function (p, ok) { return p.then(function (d) { N[id] = d.notes || N[id]; badges(); draw(); if (ok) toast(ok); }).catch(function (e) { toast(e.message, true); }); };
    var draw = function () {
      var sec = cur.tab, all = sec === 'overview' || ST.all, L = (N[id] || []).filter(function (n) { return all || n.sec === sec; }).slice().sort(function (a, b) { return (a.done - b.done) || (b.at - a.at); }), col = ST.col;
      pop.innerHTML = '<div class="stk-h"><b>🗒 Notes</b><span class="stk-t">' + esc(all ? 'Every section of this report' : NAME[sec] || '') + '</span><span class="sp"></span>' +
        (sec !== 'overview' ? '<label class="esn-all" title="Show the notes on every section"><input type="checkbox" data-eall' + (ST.all ? ' checked' : '') + '> All sections</label>' : '') +
        '<button type="button" class="stk-x" data-eclose title="Close (Esc)">✕</button></div>' +
        '<div class="stk-list">' + (L.length ? L.map(function (x) {
          var ed = ST.edit === x.id, mine = x.by === me() || isOwner();
          return '<div class="stk-n stk-' + x.c + (x.done ? ' done' : '') + (hl === x.id ? ' esn-hl' : '') + '" data-nid="' + esc(x.id) + '"><div class="stk-m">' +
            '<label class="stk-ck" title="' + (x.done ? 'Done: untick to open it again' : 'Tick when it is done') + '"><input type="checkbox" data-edone' + (x.done ? ' checked' : '') + '></label>' +
            (x.done ? '<span class="stk-tag stk-alldone">✓ Done</span>' : '<span class="stk-tag">' + STK[x.c][0] + '</span>') +
            (all ? '<a class="esn-sec" href="#esg/' + esc(id) + '/' + esc(x.sec) + '">' + esc(NAME[x.sec] || x.sec) + '</a>' : '') +
            '<small>' + esc(x.by || '') + ' · ' + esc(when(x.at)) + (x.due ? ' · due ' + esc(pretty(x.due)) : '') + (x.editedAt ? ' · edited' : '') + (x.done && x.doneBy ? ' · done by ' + esc(x.doneBy) : '') + '</small><span class="sp"></span>' +
            (ed || x.done ? '' : '<button type="button" data-eed title="Edit">✎</button>') + (mine && !ed ? '<button type="button" data-edel title="Delete">🗑</button>' : '') + '</div>' +
            (ed ? '<div class="stk-ed"><textarea data-etx rows="3" maxlength="1500">' + esc(x.text) + '</textarea><div class="stk-row">' + ['R', 'A', 'G'].map(function (k) { return '<button type="button" class="stk-c stk-' + k + (x.c === k ? ' on' : '') + '" data-ecol2="' + k + '"><i></i>' + STK[k][0] + '</button>'; }).join('') +
              '<span class="sp"></span><button type="button" class="btn btn-sm" data-ecancel>Cancel</button><button type="button" class="btn btn-sm btn-gold" data-esave>💾 Save</button></div></div>'
              : '<div class="stk-tx" data-eedit title="Double-click to edit">' + mention(tagify(esc(x.text))).replace(/\n/g, '<br>') + '</div>') + '</div>'; }).join('')
          : '<p class="muted" style="margin:6px 2px">No notes yet. Leave a remark for the team: a figure to check, a document still missing, what to fix before the report goes out. Type @ to send it to someone\'s Today.</p>') + '</div>' +
        (sec === 'overview' && !all ? '' : '<div class="stk-add"><textarea id="esnTx" rows="2" maxlength="1500" placeholder="' + esc('Note on ' + (NAME[sec === 'overview' ? 'overview' : sec] || 'this section') + ': Enter saves, Shift+Enter for a new line, @ to send it to someone') + '"></textarea><div class="stk-row">' +
          ['R', 'A', 'G'].map(function (k) { return '<button type="button" class="stk-c stk-' + k + (col === k ? ' on' : '') + '" data-ecol="' + k + '"><i></i>' + STK[k][0] + '</button>'; }).join('') +
          '<label class="stk-due" title="Optional: when it must be sorted by">Due by <input type="date" id="esnDue"></label><span class="sp"></span><button type="button" class="btn btn-sm btn-gold" data-eadd>💾 Save note</button></div></div>');
      place();
      pop.querySelector('[data-eclose]').onclick = function () { pop.remove(); };
      var ea = pop.querySelector('[data-eall]'); if (ea) ea.onchange = function () { ST.all = ea.checked; draw(); };
      pop.querySelectorAll('[data-ecol]').forEach(function (b) { b.onclick = function () { ST.col = b.getAttribute('data-ecol'); pop.querySelectorAll('[data-ecol]').forEach(function (q) { q.classList.toggle('on', q === b); }); }; });
      var nidOf = function (el) { return el.closest('[data-nid]').getAttribute('data-nid'); };
      var add = pop.querySelector('[data-eadd]'); if (add) add.onclick = function () { var ta = document.getElementById('esnTx'), tx = ta.value.trim(); if (!tx) { ta.focus(); return; }
        add.disabled = true; save(api('esgNoteAdd', { id: id, sec: sec === 'overview' ? 'overview' : sec, c: ST.col, text: tx, due: (document.getElementById('esnDue') || {}).value || '' }), /@\S/.test(tx) ? '🗒 Saved: it is in the Today of the people you @mentioned' : '🗒 Note saved'); };
      pop.querySelectorAll('[data-edone]').forEach(function (b) { b.onchange = function () { save(api('esgNoteSet', { id: id, nid: nidOf(b), done: b.checked })); }; });
      pop.querySelectorAll('[data-edel]').forEach(function (b) { b.onclick = function () { save(api('esgNoteSet', { id: id, nid: nidOf(b), del: true }), 'Note deleted'); }; });
      var edit = function (el) { ST.edit = nidOf(el); var n = (N[id] || []).filter(function (q) { return q.id === ST.edit; })[0]; ST.ecol = n ? n.c : 'G'; draw(); var t = pop.querySelector('[data-etx]'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } };
      pop.querySelectorAll('[data-eed]').forEach(function (b) { b.onclick = function () { edit(b); }; });
      pop.querySelectorAll('[data-eedit]').forEach(function (d) { d.ondblclick = function () { if (!d.closest('.done')) edit(d); }; });
      pop.querySelectorAll('[data-ecol2]').forEach(function (b) { b.onclick = function () { ST.ecol = b.getAttribute('data-ecol2'); pop.querySelectorAll('[data-ecol2]').forEach(function (q) { q.classList.toggle('on', q === b); }); }; });
      var ec = pop.querySelector('[data-ecancel]'); if (ec) ec.onclick = function () { ST.edit = ''; draw(); };
      var es = pop.querySelector('[data-esave]'); if (es) { var doSave = function () { var t = pop.querySelector('[data-etx]').value.trim(), nid = ST.edit; if (!t) return; ST.edit = ''; save(api('esgNoteSet', { id: id, nid: nid, text: t, c: ST.ecol })); };
        es.onclick = doSave; pop.querySelector('[data-etx]').onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); doSave(); } if (e.key === 'Escape') { e.stopPropagation(); ST.edit = ''; draw(); } }; atPick(pop.querySelector('[data-etx]')); }
      var ta = document.getElementById('esnTx'); if (ta) { ta.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); add.onclick(); } }; atPick(ta); if (first && !hl) setTimeout(function () { ta.focus(); }, 30); }
      if (hl) { var h = pop.querySelector('.esn-hl'); if (h && h.scrollIntoView) h.scrollIntoView({ block: 'nearest' }); }
      first = false;
    };
    var place = function () { var r = anchor && document.body.contains(anchor) ? anchor.getBoundingClientRect() : null, w = pop.offsetWidth, h = pop.offsetHeight;
      if (!r) { pop.style.left = Math.max(10, (innerWidth - w) / 2) + 'px'; pop.style.top = Math.max(10, (innerHeight - h) / 2) + 'px'; return; }
      var x = Math.min(innerWidth - w - 10, Math.max(10, r.right - w)), y = r.bottom + 6; if (y + h > innerHeight - 10) y = Math.max(10, innerHeight - h - 10); pop.style.left = x + 'px'; pop.style.top = y + 'px'; };
    pop._draw = draw; draw();
    if (hl && !(N[id] || []).some(function (n) { return n.id === hl && (n.sec === cur.tab || cur.tab === 'overview'); })) { ST.all = true; draw(); }
  }

  /* ---------- @ someone: the staff logins; the note then shows in their 🎯 Today and on the phone app ---------- */
  function atPick(ta) {
    if (!ta || ta._at) return; ta._at = 1; var box = null, hits = [], sel = 0;
    var close = function () { if (box) { box.remove(); box = null; } };
    var token = function () { var v = ta.value.slice(0, ta.selectionStart), m = v.match(/(^|\s)@([^\s@]*)$/); return m ? { q: m[2].toLowerCase(), at: v.length - m[2].length - 1 } : null; };
    var pick = function (n) { var tk = token(); if (!tk) return close(); var end = ta.selectionStart, after = ta.value.slice(end), ins = '@' + n + ' '; ta.value = ta.value.slice(0, tk.at) + ins + after.replace(/^\S*/, ''); var c = tk.at + ins.length; ta.setSelectionRange(c, c); close(); ta.focus(); };
    var draw = function () { var tk = token(); if (!tk) return close();
      hits = (PEOPLE || []).filter(function (p) { return !tk.q || (p.name + ' ' + p.role).toLowerCase().indexOf(tk.q) >= 0; }).slice(0, 12); sel = Math.min(sel, Math.max(0, hits.length - 1));
      if (!box) { box = document.createElement('div'); box.className = 'stk-at'; box.onmousedown = function (e) { e.preventDefault(); }; document.body.appendChild(box); }
      var pr = (ta.closest('.stkpop') || ta).getBoundingClientRect(), bw = 240, x = pr.left - 8 - bw >= 8 ? pr.left - 8 - bw : Math.min(innerWidth - bw - 8, pr.right + 8), rc = ta.getBoundingClientRect();
      box.style.position = 'fixed'; box.style.left = x + 'px'; box.style.top = Math.max(8, Math.min(rc.top, innerHeight - 320)) + 'px'; box.style.width = bw + 'px';
      box.innerHTML = PEOPLE == null ? '<p>Loading the people…</p>' : !hits.length ? '<p>No one by that name. People with a Champ login can be @mentioned.</p>'
        : '<p class="stk-at-n">Send it to their Today</p>' + hits.map(function (p, i) { return '<button type="button" class="' + (i === sel ? 'on' : '') + '" data-at="' + esc(p.name) + '"><b>' + esc(p.name) + '</b>' + (p.role ? '<small>' + esc(p.role) + '</small>' : '') + '</button>'; }).join('');
      box.querySelectorAll('[data-at]').forEach(function (b) { b.onclick = function () { pick(b.getAttribute('data-at')); }; });
    };
    ta.addEventListener('input', function () { sel = 0; draw(); }); ta.addEventListener('blur', function () { setTimeout(close, 150); });
    var old = ta.onkeydown;
    ta.onkeydown = function (e) {
      if (box && hits.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length; draw(); return; }
      if (box && hits.length && (e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); pick(hits[sel].name); return; }
      if (box && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      return old ? old.call(ta, e) : undefined;
    };
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var p = document.getElementById('esnPop'); if (p && !document.querySelector('.stk-at')) p.remove(); } });
  window.addEventListener('hashchange', function () { if (!/^#esg\//.test(location.hash)) { var p = document.getElementById('esnPop'); if (p) p.remove(); } });
  M.esgNotes = { attach: attach, reload: load };
})();
