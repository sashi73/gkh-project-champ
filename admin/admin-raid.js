/* GKH Project Champ: 🧩 RAID log (Risks, Assumptions, Issues, Dependencies).
   - a project tab (Control group): the four quadrants, one register with filters, the risk heat map and what is due soon
   - Portfolio › RAID log: every project this login can see, worst first (data: planRaidList, netlify/lib/raid.mjs)
   Risks and issues are the same records as the Risks and Issues tabs; assumptions and outside dependencies live in the plan
   (plan.assumptions, plan.extDeps); project-to-project links come from the Dependency board.
   ✨ Find with AI reads the charter, plan, documents and meetings and suggests items; the project manager picks which go in. */
(function () {
  'use strict';
  var M = window.MBS; if (!M) return;
  var api = M.api, esc = M.esc, toast = M.toast, fail = M.fail, $ = M.$;
  var TYPES = { R: ['Risk', 'Risks', '⚠'], A: ['Assumption', 'Assumptions', '🧩'], I: ['Issue', 'Issues', '❗'], D: ['Dependency', 'Dependencies', '🔗'] };
  var ABOUT = { R: 'might happen', A: 'taken as true, to check', I: 'has happened', D: 'needed from outside' };
  var KINDS = ['Supplier', 'Approval', 'Another team', 'Client', 'Other'];
  var RAGW = { red: 'Act now', amber: 'Watch', green: 'In hand', grey: 'Closed' }, ORDER = { red: 0, amber: 1, green: 2, grey: 3 };
  var C = null, V = { core: '', type: '', open: true, q: '', links: null, linksFor: '' }, P2 = { type: '', open: true, q: '', prog: '', d: null };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  var day = function (s) { return s ? new Date(s + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' }) : ''; };
  var addDays = function (s, n) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  var dd = function (a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); };
  var uid = function (p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); };
  var canEdit = function () { return !!(M.allowed && M.allowed('projects', 'edit')); };

  // 🚦 the same rules as the server (netlify/lib/raid.mjs)
  function rag(t, x, td) {
    if (t === 'R') { if (x.status === 'Closed') return 'grey'; var s = (x.p || 3) * (x.i || 3); return s >= 15 ? 'red' : s >= 8 || (x.review && x.review < td) ? 'amber' : 'green'; }
    if (t === 'A') { if (x.status === 'Does not hold') return 'red'; if (x.status === 'Holds') return 'green'; return x.check && x.check < td ? (x.impact === 'High' ? 'red' : 'amber') : x.impact === 'High' ? 'amber' : 'green'; }
    if (t === 'I') { if (x.status === 'Resolved') return 'grey'; if (x.due && x.due < td) return 'red'; return x.priority === 'Critical' || x.priority === 'High' ? 'red' : x.priority === 'Medium' ? 'amber' : 'green'; }
    if (x.link) return { conflict: 'red', risk: 'amber', ok: 'green', done: 'grey' }[x.link] || 'grey';
    if (x.status === 'Delivered') return 'grey'; if (x.status === 'At risk') return 'red';
    if (x.need && x.need < td) return 'red'; return x.need && dd(td, x.need) <= 14 ? 'amber' : 'green';
  }
  function items(p, td) {
    var out = [], n = { R: 0, A: 0, I: 0, D: 0 };
    (p.risks || []).forEach(function (r) { out.push({ type: 'R', id: r.id, ref: 'R' + ++n.R, title: r.title, detail: r.cause, owner: r.owner, date: r.review, dl: 'Review', status: r.status, open: r.status !== 'Closed', score: (r.p || 3) * (r.i || 3), p: r.p, i: r.i, rag: rag('R', r, td) }); });
    (p.assumptions || []).forEach(function (a) { out.push({ type: 'A', id: a.id, ref: 'A' + ++n.A, title: a.title, detail: a.detail, owner: a.owner, date: a.check, dl: 'Check by', status: a.status, open: a.status === 'Unchecked' || (a.status === 'Does not hold' && !a.risk), impact: a.impact, risk: a.risk, rag: rag('A', a, td) }); });
    (p.issues || []).forEach(function (x) { out.push({ type: 'I', id: x.id, ref: 'I' + ++n.I, title: x.title, detail: x.detail, owner: x.owner, date: x.due, dl: 'Due', status: x.status, open: x.status !== 'Resolved', priority: x.priority, rag: rag('I', x, td) }); });
    (p.extDeps || []).forEach(function (d) { out.push({ type: 'D', id: d.id, ref: 'D' + ++n.D, title: d.title, detail: d.note, owner: d.owner, date: d.need, dl: 'Needed by', status: d.status, open: d.status !== 'Delivered', kind: d.kind, party: d.party, rag: rag('D', d, td) }); });
    return out;
  }
  var sortW = function (L) { return L.sort(function (a, b) { return ORDER[a.rag] - ORDER[b.rag] || (b.score || 0) - (a.score || 0) || String(a.date || '9').localeCompare(String(b.date || '9')); }); };
  var dot = function (r) { return '<i class="rd-dot rd-' + r + '" title="' + esc(RAGW[r]) + '"></i>'; };
  var tchip = function (t) { return '<span class="rd-t rd-t' + t + '">' + TYPES[t][2] + ' ' + esc(TYPES[t][0]) + '</span>'; };
  function measure(x) {
    if (x.type === 'R') return '<span class="rd-sc rd-' + x.rag + '">' + x.score + '</span><small> P' + (x.p || 3) + '×I' + (x.i || 3) + '</small>';
    if (x.type === 'I') return esc(x.priority || '');
    if (x.type === 'A') return esc(x.impact || '') + ' impact';
    return x.link ? 'Project link' : esc(x.kind || '') + (x.party ? '<small> · ' + esc(x.party) + '</small>' : '');
  }
  function filt(L, F) { var q = (F.q || '').toLowerCase(); return L.filter(function (x) { return (!F.type || x.type === F.type) && (!F.open || x.open) && (!F.prog || x.program === F.prog) && (!q || (x.title + ' ' + (x.detail || '') + ' ' + (x.owner || '') + ' ' + (x.project || '') + ' ' + (x.party || '')).toLowerCase().indexOf(q) >= 0); }); }
  function quads(L, F, attr, port) {
    return '<div class="rd-q">' + ['R', 'A', 'I', 'D'].map(function (t) {
      var M_ = L.filter(function (x) { return x.type === t; }), open = M_.filter(function (x) { return x.open; }), red = M_.filter(function (x) { return x.rag === 'red'; }).length, amb = M_.filter(function (x) { return x.rag === 'amber'; }).length;
      var top = sortW(open.slice()).slice(0, 2);
      return '<button type="button" class="rd-qb rd-q' + t + (F.type === t ? ' on' : '') + '" ' + attr + '="' + t + '" aria-pressed="' + (F.type === t) + '"><span class="rd-qh"><i>' + TYPES[t][2] + '</i><b>' + esc(TYPES[t][1]) + '</b><small>' + esc(ABOUT[t]) + '</small></span>' +
        '<span class="rd-qn"><b>' + open.length + '</b> open' + (red ? ' · <em class="rd-r">' + red + ' red</em>' : '') + (amb ? ' · <em class="rd-a">' + amb + ' amber</em>' : '') + '</span>' +
        '<span class="rd-qt">' + (top.length ? top.map(function (x) { return '<span>' + dot(x.rag) + esc(x.title || '(untitled)') + (port && x.project ? ' <small>' + esc(x.project) + '</small>' : '') + '</span>'; }).join('') : '<span class="muted">Nothing open</span>') + '</span></button>';
    }).join('') + '</div>';
  }
  function heat(L) {
    var open = L.filter(function (x) { return x.type === 'R' && x.open; }), h = '<div class="rd-heat" role="img" aria-label="Open risks by probability and impact"><span class="rd-hy">Probability</span><div class="rd-hg">';
    for (var p = 5; p >= 1; p--) for (var i = 1; i <= 5; i++) { var n = open.filter(function (x) { return (x.p || 3) === p && (x.i || 3) === i; }).length, s = p * i; h += '<span class="rd-h ' + (s >= 15 ? 'rd-red' : s >= 8 ? 'rd-amber' : 'rd-green') + '" title="P' + p + ' × I' + i + ': ' + n + ' risk' + (n === 1 ? '' : 's') + '">' + (n || '') + '</span>'; }
    return h + '</div><span class="rd-hx">Impact →</span></div>';
  }
  function soon(L, td, port) {
    var end = addDays(td, 14), S = L.filter(function (x) { return x.open && x.date && x.date <= end; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(0, 8);
    return S.length ? '<ul class="rd-soon">' + S.map(function (x) { var late = x.date < td; return '<li>' + dot(x.rag) + '<span><b>' + esc(x.ref) + '</b> ' + esc(x.title) + (port && x.project ? ' <small>· ' + esc(x.project) + '</small>' : '') + '<small class="' + (late ? 'rd-late' : 'muted') + '">' + esc(x.dl) + ' ' + esc(day(x.date)) + (late ? ' · ' + dd(x.date, td) + ' days late' : '') + '</small></span></li>'; }).join('') + '</ul>' : '<p class="muted">Nothing due in the next 14 days.</p>';
  }

  /* ---------------- the project tab ---------------- */
  function tab(ctx) {
    C = ctx; var core = C.S.core, p = C.S.plan; p.assumptions = p.assumptions || []; p.extDeps = p.extDeps || [];
    if (V.core !== core) { V = { core: core, type: '', open: true, q: '', links: null, linksFor: '' }; }
    if (V.linksFor !== core) { V.linksFor = core; api('planRaidList', { core: core, today: today() }).then(function (d) { if (V.core !== core) return; V.links = (d.items || []).filter(function (x) { return x.link; }); if (C.S.tab === 'raid' && C.S.core === core) draw(); }).catch(function (e) { if (V.core !== core) return; V.links = []; V.linksFor = ''; fail(e); }); }   // tried again when the tab opens again
    draw();
  }
  function all() { var td = today(); return items(C.S.plan, td).concat((V.links || []).map(function (x) { return Object.assign({}, x, { dl: '' }); })); }
  function draw() {
    var B = $('#planBody'); if (!B || !C) return;
    var td = today(), L = all(), F = filt(L, V), ed = canEdit();
    B.innerHTML = '<div class="raid" id="raidTab">' +
      '<div class="rd-head"><div><h2>🧩 RAID log</h2><p class="muted">Risks, assumptions, issues and dependencies in one place, worst first. Risks and issues are the same records as their own tabs.</p></div>' +
      '<div class="rd-acts">' + (ed ? ['R', 'A', 'I', 'D'].map(function (t) { return '<button type="button" class="btn btn-sm" data-rd-add="' + t + '">＋ ' + esc(TYPES[t][0]) + '</button>'; }).join('') + '<button type="button" class="btn btn-sm btn-ai" id="rdAi">✨ Find with AI</button>' : '') +
        '<button type="button" class="btn btn-sm" id="rdXls">⬇ Excel</button><button type="button" class="btn btn-sm" id="rdPdf">🖨 PDF</button></div></div>' +
      quads(L, V, 'data-rd-q') +
      '<div class="rd-main"><section class="card rd-reg">' + bar(V, 'rd') + table(F, ed, false) + '</section>' +
      '<aside class="rd-side"><section class="card"><h3>Risk heat map</h3>' + heat(L) + '<p class="muted rd-note">Open risks by probability and impact. Red: act now.</p></section>' +
      '<section class="card"><h3>Due in the next 14 days</h3>' + soon(L, td) + '</section></aside></div></div>';
    wire(B, V, draw);
    B.querySelectorAll('[data-rd-add]').forEach(function (b) { b.onclick = function () { edit(b.getAttribute('data-rd-add'), null); }; });
    B.querySelectorAll('[data-rd-ed]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-rd-ed').split('|'); edit(k[0], k[1]); }; });
    B.querySelectorAll('[data-rd-risk]').forEach(function (b) { b.onclick = function () { toRisk(b.getAttribute('data-rd-risk')); }; });
    if ($('#rdAi')) $('#rdAi').onclick = findAi;
    $('#rdXls').onclick = function () { excel(L, C.S.plan.name || 'Project'); };
    $('#rdPdf').onclick = function () { pdf(L, C.S.plan.name || 'Project', false); };
  }
  function bar(F, k) {
    return '<div class="rd-bar"><div class="rd-chips" role="group" aria-label="Type">' + [['', 'All']].concat(['R', 'A', 'I', 'D'].map(function (t) { return [t, TYPES[t][1]]; })).map(function (c) { return '<button type="button" class="rd-chip' + (F.type === c[0] ? ' on' : '') + '" aria-pressed="' + (F.type === c[0]) + '" data-' + k + '-t="' + c[0] + '">' + esc(c[1]) + '</button>'; }).join('') + '</div>' +
      '<label class="rd-tog"><input type="checkbox" data-' + k + '-open' + (F.open ? ' checked' : '') + '> Open only</label><input type="search" class="rd-find" data-' + k + '-q placeholder="Search…" aria-label="Search the RAID log" value="' + esc(F.q) + '"></div>';
  }
  function table(F, ed, port) {
    if (!F.length) return '<div class="empty rd-empty">' + (port ? 'Nothing matches.' : 'Nothing here yet. Add an assumption or a dependency, or press ✨ Find with AI to read the project for you.') + '</div>';
    return '<div class="table-wrap"><table class="rt rd-tab"><thead><tr><th></th><th>Ref</th><th>Type</th><th>' + (port ? 'Project · ' : '') + 'Item</th><th>Measure</th><th>Owner</th><th>Date</th><th>Status</th>' + (port ? '' : '<th></th>') + '</tr></thead><tbody>' +
      sortW(F.slice()).map(function (x) {
        var late = x.open && x.date && x.date < today();
        return '<tr class="' + (x.open ? '' : 'tdone') + '">' + '<td>' + dot(x.rag) + '</td><td class="nowrap"><b>' + esc(x.ref) + '</b></td><td>' + tchip(x.type) + '</td>' +
          '<td>' + (port ? '<a class="rd-proj" href="#plan/' + esc(x.core) + '/raid">' + esc(x.project) + '</a>' : '') + '<b class="rd-ti">' + esc(x.title || '(untitled)') + '</b>' + (x.detail ? '<small class="rd-de">' + esc(x.detail) + '</small>' : '') + '</td>' +
          '<td class="nowrap">' + measure(x) + '</td><td>' + esc(x.owner || '') + '</td><td class="nowrap' + (late ? ' rd-late' : '') + '">' + (x.date ? (x.dl ? '<small>' + esc(x.dl) + '</small><br>' : '') + esc(day(x.date)) : '') + '</td><td>' + esc(x.status || '') + '</td>' +
          (port ? '' : '<td class="nowrap">' + (x.link ? '<a class="btn btn-sm" href="#deps">Board</a>' : ed ? '<button type="button" class="btn btn-sm" data-rd-ed="' + x.type + '|' + esc(x.id) + '" aria-label="Edit ' + esc(x.ref) + '">✎</button>' + (x.type === 'A' && x.status === 'Does not hold' && !x.risk ? ' <button type="button" class="btn btn-sm btn-gold" data-rd-risk="' + esc(x.id) + '">→ Risk</button>' : '') : '') + '</td>') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function wire(B, F, redraw) {
    B.querySelectorAll('[data-rd-q],[data-pr-q]').forEach(function (b) { b.onclick = function () { var t = b.getAttribute('data-rd-q') || b.getAttribute('data-pr-q'); F.type = F.type === t ? '' : t; redraw(); }; });
    B.querySelectorAll('[data-rd-t],[data-pr-t]').forEach(function (b) { b.onclick = function () { F.type = b.getAttribute('data-rd-t') != null ? b.getAttribute('data-rd-t') : b.getAttribute('data-pr-t'); redraw(); }; });
    B.querySelectorAll('[data-rd-open],[data-pr-open]').forEach(function (c) { c.onchange = function () { F.open = c.checked; redraw(); }; });
    var q = B.querySelector('.rd-find'); if (q) q.oninput = function () { F.q = q.value; var pos = q.selectionStart; redraw(); var n = B.querySelector('.rd-find'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } };
  }

  // ✎ one item: the fields of its type (risks and issues keep the fields of their own tabs)
  var LISTK = { R: 'risks', A: 'assumptions', I: 'issues', D: 'extDeps' };
  function edit(t, id) {
    var p = C.S.plan, arr = p[LISTK[t]] = p[LISTK[t]] || [], x = id ? arr.filter(function (y) { return y.id === id; })[0] : null, mgr = (p.charter || {}).manager || '', td = today();
    if (id && !x) return;
    var v = x || ({ R: { title: '', cause: '', p: 3, i: 3, response: 'Mitigate', action: '', owner: mgr, review: '', status: 'Open' }, A: { title: '', detail: '', owner: mgr, check: addDays(td, 14), impact: 'Medium', status: 'Unchecked' },
      I: { title: '', detail: '', priority: 'Medium', owner: mgr, due: '', status: 'Open', resolution: '' }, D: { title: '', kind: 'Supplier', party: '', need: '', owner: mgr, status: 'Waiting', task: '', note: '' } })[t];
    var inp = function (k, lab, type, ph) { return '<label>' + esc(lab) + '<input name="' + k + '" type="' + (type || 'text') + '" value="' + esc(v[k] == null ? '' : v[k]) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + (k === 'title' ? ' required maxlength="200"' : ' maxlength="800"') + '></label>'; };
    var sel = function (k, lab, L) { return '<label>' + esc(lab) + '<select name="' + k + '">' + L.map(function (o) { return '<option' + (String(o) === String(v[k]) ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></label>'; };
    var area = function (k, lab, ph) { return '<label>' + esc(lab) + '<textarea name="' + k + '" rows="3" maxlength="800" placeholder="' + esc(ph || '') + '">' + esc(v[k] || '') + '</textarea></label>'; };
    var tasks = (p.tasks || []).filter(function (k) { return k.name; }).slice(0, 300);
    var F = { R: inp('title', 'Risk', '', 'What could go wrong?') + inp('cause', 'Cause or trigger') + '<div class="champ-2">' + sel('p', 'Probability (1 to 5)', [1, 2, 3, 4, 5]) + sel('i', 'Impact (1 to 5)', [1, 2, 3, 4, 5]) + '</div>' + '<div class="champ-2">' + sel('response', 'Response', ['Avoid', 'Mitigate', 'Transfer', 'Accept', 'Exploit']) + sel('status', 'Status', ['Open', 'Closed']) + '</div>' + inp('action', 'What we will do') + '<div class="champ-2">' + inp('owner', 'Owner') + inp('review', 'Review by', 'date') + '</div>',
      A: inp('title', 'Assumption', '', 'What the plan takes as true, e.g. Council approval within 6 weeks') + area('detail', 'How we will check it', 'Who confirms it, and how') + '<div class="champ-2">' + sel('impact', 'Impact if it does not hold', ['Low', 'Medium', 'High']) + sel('status', 'Status', ['Unchecked', 'Holds', 'Does not hold']) + '</div><div class="champ-2">' + inp('owner', 'Owner') + inp('check', 'Check by', 'date') + '</div>',
      I: inp('title', 'Issue', '', 'What happened?') + inp('detail', 'Details') + '<div class="champ-2">' + sel('priority', 'Priority', ['Low', 'Medium', 'High', 'Critical']) + sel('status', 'Status', ['Open', 'In progress', 'Resolved']) + '</div><div class="champ-2">' + inp('owner', 'Owner') + inp('due', 'Due', 'date') + '</div>' + inp('resolution', 'Resolution'),
      D: inp('title', 'Dependency', '', 'What we need, e.g. Switchboard delivered by the supplier') + '<div class="champ-2">' + sel('kind', 'From', KINDS) + inp('party', 'Who (supplier, team, authority)') + '</div><div class="champ-2">' + inp('need', 'Needed by', 'date') + sel('status', 'Status', ['Waiting', 'On track', 'At risk', 'Delivered']) + '</div>' +
        '<div class="champ-2">' + inp('owner', 'Owner (chases it)') + '<label>Task that waits for it<select name="task"><option value="">None</option>' + tasks.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === v.task ? ' selected' : '') + '>' + esc(k.name) + '</option>'; }).join('') + '</select></label></div>' + area('note', 'Notes') };
    M.modal('<h2>' + TYPES[t][2] + ' ' + (x ? 'Edit ' : 'New ') + esc(TYPES[t][0].toLowerCase()) + '</h2><form id="rdF" class="champ-form">' + F[t] +
      '<div class="actions" style="justify-content:space-between">' + (x ? '<button type="button" class="btn btn-danger" id="rdDel">Delete</button>' : '<span></span>') + '<span><button type="button" class="btn" data-close>Cancel</button> <button class="btn btn-gold" type="submit">' + (x ? 'Save' : 'Add') + '</button></span></div></form>');
    var f = $('#rdF'); setTimeout(function () { f.title.focus(); }, 30);
    f.onsubmit = function (e) {
      e.preventDefault(); var o = x || { id: uid(t.toLowerCase()), raised: td };
      Array.prototype.forEach.call(f.elements, function (el) { if (el.name) o[el.name] = el.name === 'p' || el.name === 'i' ? +el.value : el.value.trim(); });
      if (!x) arr.push(o); C.dirty(TYPES[t][0] + (x ? ' changed' : ' added') + ' (RAID log)'); M.closeModal(); draw();
    };
    if ($('#rdDel')) $('#rdDel').onclick = function () { M.confirmBox('Delete this ' + TYPES[t][0].toLowerCase() + '?', '“' + esc(x.title || '') + '” is removed from the project' + (t === 'R' || t === 'I' ? ' (and from its ' + TYPES[t][1] + ' tab)' : '') + '.', 'Delete', true).then(function (ok) { if (!ok) return; p[LISTK[t]] = arr.filter(function (y) { return y.id !== x.id; }); C.dirty(TYPES[t][0] + ' deleted (RAID log)'); M.closeModal(); draw(); }); };
  }
  // an assumption that does not hold becomes a risk (linked both ways)
  function toRisk(id) {
    var p = C.S.plan, a = (p.assumptions || []).filter(function (x) { return x.id === id; })[0]; if (!a) return;
    var r = { id: uid('r'), title: 'Assumption does not hold: ' + a.title, cause: a.detail || '', p: 4, i: a.impact === 'High' ? 5 : a.impact === 'Low' ? 2 : 3, response: 'Mitigate', action: '', owner: a.owner || '', review: addDays(today(), 7), status: 'Open', raised: today() };
    (p.risks = p.risks || []).push(r); a.risk = r.id; C.dirty('Assumption turned into a risk (RAID log)'); toast('⚠ Added to the risk register'); draw();
  }

  // ✨ the AI reads the project and suggests items; tick the ones to add
  function bg(body) {
    var id = 'rd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    return fetch('/.netlify/functions/planai-background', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1', 'X-Champ-Lang': (window.ChampI18n && window.ChampI18n.get()) || 'en' }, body: JSON.stringify(Object.assign({ id: id }, body)) })
      .then(function (r) { if (r.status === 401 || r.status === 403) throw new Error('Your session has ended, or you can view this project only.'); return id; });
  }
  function poll(id, max) { return new Promise(function (res, rej) { var n = 0; (function go() { setTimeout(function () { api('planAiStatus', { id: id }).then(function (st) { if (st.status === 'done') return res(st.result); if (st.status === 'error' || ++n > max) return rej(new Error(st.error || 'The AI took too long. Try again.')); go(); }).catch(rej); }, 2500); })(); }); }
  function findAi() {
    var core = C.S.core;
    M.modal('<h2>✨ Find RAID items with AI</h2><p class="muted">Champ is reading the charter, the plan, the documents and the meetings for risks, assumptions, issues and dependencies that are not logged yet. This takes up to a minute.</p><div class="rd-wait"><span class="spin"></span> Reading the project…</div>');
    (C.saveNow ? C.saveNow() : Promise.resolve()).then(function () { return bg({ mode: 'raidFind', core: core }); }).then(function (id) { return poll(id, 80); }).then(function (r) {
      if (C.S.core !== core) return; var L = (r && r.items) || [];
      M.modal('<h2>✨ Suggested RAID items</h2><p class="muted">Tick the ones to add. You can change any of them afterwards.</p><div class="rd-sugs">' + L.map(function (x, i) {
        return '<label class="rd-sug"><input type="checkbox" value="' + i + '" checked><span>' + tchip(x.type) + ' <b>' + esc(x.title) + '</b>' + (x.detail ? '<small>' + esc(x.detail) + '</small>' : '') + (x.why ? '<small class="rd-why">Why: ' + esc(x.why) + '</small>' : '') + '</span></label>'; }).join('') + '</div>' +
        '<div class="actions"><button type="button" class="btn" data-close>Cancel</button> <button type="button" class="btn btn-gold" id="rdSugGo">Add the ticked items</button></div>');
      $('#rdSugGo').onclick = function () {
        if (!C || C.S.core !== core) { M.closeModal(); toast('You moved to another project: nothing was added.'); return; }
        var p = C.S.plan, mgr = (p.charter || {}).manager || '', td = today(), n = 0;
        document.querySelectorAll('.rd-sug input:checked').forEach(function (c) {
          var x = L[+c.value]; if (!x) return; n++;
          if (x.type === 'R') (p.risks = p.risks || []).push({ id: uid('r'), title: x.title, cause: x.detail, p: x.p, i: x.i, response: 'Mitigate', action: '', owner: mgr, review: x.date || addDays(td, 14), status: 'Open', raised: td });
          else if (x.type === 'A') (p.assumptions = p.assumptions || []).push({ id: uid('a'), title: x.title, detail: x.detail, owner: mgr, check: x.date || addDays(td, 14), impact: x.impact, status: 'Unchecked', raised: td });
          else if (x.type === 'I') (p.issues = p.issues || []).push({ id: uid('i'), title: x.title, detail: x.detail, priority: x.priority, owner: mgr, raised: td, due: x.date, status: 'Open', resolution: '' });
          else (p.extDeps = p.extDeps || []).push({ id: uid('d'), title: x.title, kind: x.kind, party: x.party, need: x.date, owner: mgr, status: 'Waiting', task: '', note: x.detail, raised: td });
        });
        M.closeModal(); if (n) { C.dirty(n + ' RAID item' + (n === 1 ? '' : 's') + ' added with AI'); toast('🧩 ' + n + ' added to the RAID log'); } draw();
      };
    }).catch(function (e) { M.closeModal(); fail(e); });
  }

  // ⬇ Excel: the register as a formatted sheet (and one sheet per type)
  var xls = null;
  function loadXls() { if (window.ExcelJS) return Promise.resolve(window.ExcelJS); if (!xls) xls = new Promise(function (res, rej) { var sc = document.createElement('script'); sc.src = 'vendor/exceljs.min.js?v=440'; sc.onload = function () { res(window.ExcelJS); }; sc.onerror = function () { xls = null; rej(new Error('Could not load the Excel library.')); }; document.head.appendChild(sc); }); return xls; }
  function excel(L, name, port) {
    loadXls().then(function (X) {
      var wb = new X.Workbook(), FILL = { red: 'FFF8D7D5', amber: 'FFFDEFC8', green: 'FFDDF2E3', grey: 'FFEDEDED' };
      var sheet = function (title, rows) {
        var ws = wb.addWorksheet(title), cols = [['RAG', 9], ['Ref', 8], ['Type', 13]].concat(port ? [['Project', 28]] : []).concat([['Item', 46], ['Detail', 46], ['Measure', 16], ['Owner', 18], ['Date', 13], ['Status', 14]]);
        ws.columns = cols.map(function (c) { return { header: c[0], width: c[1] }; });
        ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F1C17' } }; ws.views = [{ state: 'frozen', ySplit: 1 }];
        sortW(rows.slice()).forEach(function (x) {
          var m = x.type === 'R' ? 'Score ' + x.score : x.type === 'I' ? x.priority : x.type === 'A' ? (x.impact || '') + ' impact' : (x.link ? 'Project link' : (x.kind || '') + (x.party ? ': ' + x.party : ''));
          var r = ws.addRow([RAGW[x.rag], x.ref, TYPES[x.type][0]].concat(port ? [x.project] : []).concat([x.title, x.detail || '', m, x.owner || '', x.date ? new Date(x.date + 'T00:00:00Z') : '', x.status || '']));
          r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL[x.rag] } }; if (x.date) r.getCell(port ? 9 : 8).numFmt = 'dd/mm/yyyy'; r.alignment = { vertical: 'top', wrapText: true };
        });
      };
      sheet('RAID log', L); ['R', 'A', 'I', 'D'].forEach(function (t) { sheet(TYPES[t][1], L.filter(function (x) { return x.type === t; })); });
      return wb.xlsx.writeBuffer();
    }).then(function (buf) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = 'RAID log - ' + String(name).replace(/[\\/:*?"<>|]/g, '').slice(0, 60) + '.xlsx'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('⬇ RAID log saved as Excel'); }).catch(fail);
  }
  // 🖨 PDF: a printable page (the browser saves it as PDF)
  function pdf(L, name, port) {
    var w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print the RAID log'); return; }
    var td = today(), S = ['R', 'A', 'I', 'D'].map(function (t) { var M_ = L.filter(function (x) { return x.type === t; }); return '<div class="q q' + t + '"><b>' + TYPES[t][2] + ' ' + TYPES[t][1] + '</b><span>' + M_.filter(function (x) { return x.open; }).length + ' open · ' + M_.filter(function (x) { return x.rag === 'red'; }).length + ' red</span></div>'; }).join('');
    var rows = sortW(L.slice()).map(function (x) { return '<tr><td><i class="d ' + x.rag + '"></i>' + RAGW[x.rag] + '</td><td><b>' + esc(x.ref) + '</b></td><td>' + TYPES[x.type][0] + '</td>' + (port ? '<td>' + esc(x.project) + '</td>' : '') + '<td><b>' + esc(x.title) + '</b>' + (x.detail ? '<br><small>' + esc(x.detail) + '</small>' : '') + '</td><td>' + esc(x.owner || '') + '</td><td>' + esc(day(x.date)) + '</td><td>' + esc(x.status || '') + '</td></tr>'; }).join('');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>RAID log · ' + esc(name) + '</title><style>@page{size:A4 landscape;margin:12mm}body{font:12px/1.4 system-ui,sans-serif;color:#1f1c17}h1{font-size:20px;margin:0}p.m{color:#6b665a;margin:2px 0 12px}.qs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}.q{border:1px solid #ddd6c6;border-radius:8px;padding:8px}.q b{display:block}.q span{color:#6b665a}table{width:100%;border-collapse:collapse}th{background:#1f1c17;color:#fff;text-align:left;padding:5px}td{border-bottom:1px solid #e6e0d2;padding:5px;vertical-align:top}small{color:#6b665a}.d{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px}.red{background:#c62828}.amber{background:#e0a100}.green{background:#2e7d32}.grey{background:#9e9e9e}tr{break-inside:avoid}</style></head><body>' +
      '<h1>🧩 RAID log · ' + esc(name) + '</h1><p class="m">Risks, assumptions, issues and dependencies, worst first · ' + esc(day(td)) + ' · GKH Project Champ</p><div class="qs">' + S + '</div><table><thead><tr><th>RAG</th><th>Ref</th><th>Type</th>' + (port ? '<th>Project</th>' : '') + '<th>Item</th><th>Owner</th><th>Date</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table><script>setTimeout(function(){print()},300)<\/script></body></html>');
    w.document.close();
  }

  /* ---------------- Portfolio › RAID log ---------------- */
  var REQ = 0;
  function portView() {
    M.view().innerHTML = '<div class="empty" data-raid-wait>Gathering the RAID logs…</div>'; var me = ++REQ;
    return api('planRaidList', { today: today() }).then(function (d) { if (me !== REQ || !M.view().querySelector('[data-raid-wait],.raid[data-port]')) return; P2.d = d; portDraw(); });
  }
  function portDraw() {
    var d = P2.d, L = d.items || [], F = filt(L, P2), progs = [];
    L.forEach(function (x) { if (x.program && progs.indexOf(x.program) < 0) progs.push(x.program); }); progs.sort();
    var pr = {}; (P2.prog ? L.filter(function (x) { return x.program === P2.prog; }) : L).forEach(function (x) { var k = x.core; pr[k] = pr[k] || { core: k, name: x.project, program: x.program, red: 0, amber: 0, open: 0 }; if (x.open) pr[k].open++; if (x.rag === 'red') pr[k].red++; else if (x.rag === 'amber') pr[k].amber++; });
    var PR = Object.keys(pr).map(function (k) { return pr[k]; }).sort(function (a, b) { return b.red - a.red || b.amber - a.amber || b.open - a.open; }).slice(0, 8);
    var v = M.view();
    v.innerHTML = '<div class="raid" data-port="1"><div class="rd-head"><div><p class="muted">Risks, assumptions, issues and dependencies across ' + (d.projects || []).length + ' project' + ((d.projects || []).length === 1 ? '' : 's') + ', worst first. Open a project to change its items.</p></div>' +
      '<div class="rd-acts"><select class="rd-prog" aria-label="Program"><option value="">All programs</option>' + progs.map(function (g) { return '<option' + (P2.prog === g ? ' selected' : '') + '>' + esc(g) + '</option>'; }).join('') + '</select><button type="button" class="btn btn-sm" id="prRe">⟳ Refresh</button><button type="button" class="btn btn-sm" id="prXls">⬇ Excel</button><button type="button" class="btn btn-sm" id="prPdf">🖨 PDF</button></div></div>' +
      quads(P2.prog ? L.filter(function (x) { return x.program === P2.prog; }) : L, P2, 'data-pr-q', true) +
      '<div class="rd-main"><section class="card rd-reg">' + bar(P2, 'pr') + table(F, false, true) + '</section>' +
      '<aside class="rd-side"><section class="card"><h3>Projects to look at</h3>' + (PR.length ? '<ul class="rd-pl">' + PR.map(function (x) { return '<li><a href="#plan/' + esc(x.core) + '/raid"><b>' + esc(x.name) + '</b>' + (x.program ? '<small>' + esc(x.program) + '</small>' : '') + '</a><span>' + (x.red ? '<em class="rd-r">' + x.red + ' red</em> ' : '') + (x.amber ? '<em class="rd-a">' + x.amber + ' amber</em> ' : '') + '<small>' + x.open + ' open</small></span></li>'; }).join('') + '</ul>' : '<p class="muted">No RAID items yet.</p>') + '</section>' +
      '<section class="card"><h3>Risk heat map</h3>' + heat(P2.prog ? L.filter(function (x) { return x.program === P2.prog; }) : L) + '</section><section class="card"><h3>Due in the next 14 days</h3>' + soon(P2.prog ? L.filter(function (x) { return x.program === P2.prog; }) : L, d.today || today(), true) + '</section></aside></div></div>';
    wire(v, P2, portDraw);
    v.querySelector('.rd-prog').onchange = function () { P2.prog = this.value; portDraw(); };
    $('#prRe').onclick = function () { portView().catch(fail); };
    $('#prXls').onclick = function () { excel(F, 'Portfolio', true); };
    $('#prPdf').onclick = function () { pdf(F, 'Portfolio', true); };
  }

  M.raidTab = tab;
  M.addView('raid', 'RAID log', function () { return portView(); }, 'raid');
})();
