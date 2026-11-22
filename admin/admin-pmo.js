/* 🧭 The PMO view (Persona: the PMO Director, third in charge after the CEO and the CFO).
   Runs delivery across every program and project; the project directors, managers, consultants and contractors report in.
   One screen, worst first: what needs a decision, how each program is doing, the projects to watch, milestones, escalations,
   the team's load and the governance gaps. Every line opens the right place. Data: planPmoGet (netlify/lib/pmo.mjs). */
(function () {
  'use strict';
  var M = window.MBS; if (!M) return;
  var api = M.api, esc = M.esc, fail = M.fail;
  var D = null, TAB = 'all';
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  var day = function (s) { return s ? new Date(s + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : ''; };
  var idx = function (v) { return v == null ? '<span class="muted">–</span>' : '<b class="ceo-i ' + (v < 0.9 ? 'r' : v < 1 ? 'a' : 'g') + '">' + Number(v).toFixed(2) + '</b>'; };
  var pl = function (n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); };
  var go = function (core, tab) { return 'data-go="#plan/' + esc(core) + '/' + (tab || 'overview') + '"'; };
  var ICO = { decide: '⚖', prog: '🗂', watch: '🚦', ms: '◆', esc: '🚨', team: '👥', gaps: '🧾' };

  function load() { return api('planPmoGet', { today: today() }).then(function (d) { D = d; }); }

  function tile(k, icon, label, value, sub, tone) {
    return '<button type="button" class="pmo-k t-' + (tone || 'ok') + (TAB === k ? ' on' : '') + '" data-tab="' + k + '"><i>' + icon + '</i><span><small>' + esc(label) + '</small><b>' + value + '</b><em>' + sub + '</em></span></button>';
  }
  function tiles() {
    var A = D.all, T = D.team, ms = D.milestones;
    return '<div class="pmo-ks">' +
      tile('prog', ICO.prog, 'Programs and projects', D.programs.length + ' · ' + A.n, '<span class="pmo-rag"><i class="r" style="flex:' + A.red + '"></i><i class="a" style="flex:' + A.amber + '"></i><i class="g" style="flex:' + A.green + '"></i><i class="n" style="flex:' + A.grey + '"></i></span>' + A.red + ' in trouble · ' + A.amber + ' at risk', A.red ? 'bad' : A.amber ? 'warn' : 'ok') +
      tile('decide', ICO.decide, 'Waiting for a decision', D.decisionsN, D.decisionsN ? 'change requests and variations' : 'nothing waiting', D.decisionsN ? 'warn' : 'ok') +
      tile('ms', ICO.ms, 'Milestones', ms.overdueN + ' late', ms.soonN + ' due in the next 30 days', ms.overdueN ? 'bad' : 'ok') +
      tile('esc', ICO.esc, 'Escalations', D.escalN, 'high risks and serious issues', D.escalN ? 'warn' : 'ok') +
      tile('team', ICO.team, 'Team', (T.consultants.length + T.contractors.length), T.consultants.length + ' consultants · ' + T.contractors.length + ' contractors' + (T.over ? ' · <b>' + T.over + ' overloaded</b>' : ''), T.over || T.lateWork ? 'warn' : 'ok') +
      tile('gaps', ICO.gaps, 'Governance gaps', D.gapsN, D.gapsN ? 'baselines, charters, owners' : 'all in order', D.gapsN ? 'warn' : 'ok') +
      '</div>';
  }
  function sec(k, title, sub, body, n) {
    if (TAB !== 'all' && TAB !== k) return '';
    return '<section class="card pmo-s" id="pmo-' + k + '"><div class="pmo-sh"><h3><i>' + ICO[k] + '</i>' + esc(title) + (n != null ? ' <span class="pmo-n">' + n + '</span>' : '') + '</h3>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + body + '</section>';
  }
  var none = function (t) { return '<p class="pmo-none">✓ ' + esc(t) + '</p>'; };

  function decisions() {
    if (!D.decisions.length) return none('No change requests or variations are waiting.');
    return '<div class="table-wrap"><table class="ceo-tab ceo-rows pmo-tab"><thead><tr><th>Request</th><th>Project</th><th>Stage</th><th class="num">Waiting</th></tr></thead><tbody>' + D.decisions.map(function (c) {
      return '<tr ' + go(c.core, 'change') + '><td><b>' + esc(c.num) + '</b> ' + esc(c.title) + '<small>' + esc(c.kind) + (c.vo ? ' · ' + (c.vo > 0 ? '+' : '') + '$' + Math.round(c.vo).toLocaleString('en-AU') : '') + (c.by ? ' · raised by ' + esc(c.by) : '') + '</small></td><td>' + esc(c.project) + '<small>' + esc(c.program) + '</small></td><td><span class="pmo-st">' + esc(c.status) + '</span></td><td class="num' + (c.age > 7 ? ' ceo-late' : '') + '">' + (c.age == null ? '–' : pl(c.age, 'day')) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function programs() {
    if (!D.programs.length) return none('No programs yet.');
    return '<div class="pmo-pgs">' + D.programs.map(function (g) {
      var n = Math.max(1, g.n), tone = g.red ? 'red' : g.amber ? 'amber' : g.n ? 'green' : 'grey';
      return '<a class="pmo-pg ' + tone + '" href="#programs"' + (g.color ? ' style="--pc:' + esc(g.color) + '"' : '') + '><div class="pmo-pgt"><b>' + esc(g.name) + '</b><span>' + pl(g.n, 'project') + (g.pct ? ' · ' + g.pct + '% done' : '') + '</span></div>' +
        '<span class="pmo-rag lg"><i class="r" style="flex:' + g.red + '"></i><i class="a" style="flex:' + g.amber + '"></i><i class="g" style="flex:' + g.green + '"></i><i class="n" style="flex:' + (g.grey + (g.n ? 0 : 1)) + '"></i></span>' +
        '<dl><div><dt>SPI</dt><dd>' + idx(g.SPI) + '</dd></div><div><dt>CPI</dt><dd>' + idx(g.CPI) + '</dd></div><div><dt>High risks</dt><dd>' + g.highRisks + '</dd></div><div><dt>Open issues</dt><dd>' + g.openIssues + '</dd></div></dl>' +
        '<p class="pmo-dir">' + (g.director ? '🎯 ' + esc(g.director) : g.name === 'Not in a program' ? '<span class="muted">Projects outside a program</span>' : '<span class="ceo-late">⚠ No program director</span>') + (g.slip ? ' · <span class="ceo-late">up to ' + pl(g.slip, 'day') + ' late</span>' : '') + (g.finish ? ' · finishes ' + esc(day(g.finish)) : '') + '</p></a>'; }).join('') + '</div>';
  }
  function watch() {
    if (!D.watch.length) return none('Every project is on track.');
    return '<div class="table-wrap"><table class="ceo-tab ceo-rows pmo-tab"><thead><tr><th></th><th>Project</th><th>Project manager</th><th>Done</th><th>SPI</th><th>CPI</th><th class="num">Late</th></tr></thead><tbody>' + D.watch.map(function (r) {
      return '<tr class="h-' + r.health + '" ' + go(r.core) + '><td class="ceo-dot"><i class="' + r.health + '"></i></td><td><b>' + esc(r.name) + '</b><small>' + esc(r.program) + '</small>' + (r.why ? '<small class="ceo-why">' + esc(r.why) + '</small>' : '') + '</td><td>' + (r.pm ? esc(r.pm) : '<span class="ceo-late">none</span>') + '</td><td>' + r.pct + '%<span class="ceo-bar"><i style="width:' + r.pct + '%"></i></span></td><td>' + idx(r.SPI) + '</td><td>' + idx(r.CPI) + '</td><td class="num' + (r.slip ? ' ceo-late' : '') + '">' + (r.slip ? pl(r.slip, 'day') : '–') + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function msList(L, late) {
    return L.map(function (m) { return '<li ' + go(m.core, 'schedule') + ' class="' + (late ? 'late' : m.days <= 7 ? 'near' : '') + '"><span class="pmo-when"><b>' + esc(day(m.due)) + '</b><small>' + (late ? pl(-m.days, 'day') + ' late' : m.days === 0 ? 'today' : 'in ' + pl(m.days, 'day')) + '</small></span><span><b>' + esc(m.name) + '</b><small>' + esc(m.project) + (m.pm ? ' · ' + esc(m.pm) : '') + '</small></span></li>'; }).join('');
  }
  function milestones() {
    var ms = D.milestones;
    if (!ms.overdue.length && !ms.soon.length) return none('No milestones are late or due in the next 30 days.');
    return '<div class="pmo-ms2">' + (ms.overdue.length ? '<div><h4 class="ceo-sub">Late (' + ms.overdueN + ')</h4><ul class="pmo-ms">' + msList(ms.overdue, true) + '</ul></div>' : '') + (ms.soon.length ? '<div><h4 class="ceo-sub">Next 30 days (' + ms.soonN + ')</h4><ul class="pmo-ms">' + msList(ms.soon, false) + '</ul></div>' : '') + '</div>';
  }
  function escalations() {
    if (!D.escalations.length) return none('No high risks or serious issues are open.');
    return '<ul class="pmo-es">' + D.escalations.map(function (x) {
      var risk = x.kind === 'risk';
      return '<li ' + go(x.core, risk ? 'risks' : 'issues') + ' class="' + (x.late ? 'late' : '') + '"><span class="pmo-sc ' + (risk ? (x.score >= 20 ? 'r' : 'a') : x.priority === 'Critical' ? 'r' : 'a') + '">' + (risk ? x.score : x.priority === 'Critical' ? '!!' : '!') + '</span><span><b>' + esc(x.title) + '</b><small>' + (risk ? 'Risk' : x.priority + ' issue') + ' · ' + esc(x.project) + ' · ' + (x.owner ? 'owner ' + esc(x.owner) : '<span class="ceo-late">no owner</span>') + (x.late ? ' · <span class="ceo-late">' + (risk ? 'review overdue' : 'past due') + '</span>' : '') + '</small></span></li>'; }).join('') + '</ul>';
  }
  function person(p) {
    var lab = { over: 'Overloaded', busy: 'Busy', ok: 'Working', free: 'Free' }[p.load];
    return '<li><span class="pmo-av">' + esc((p.name || '?').split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase()) + '</span><span><b>' + esc(p.name) + '</b><small>' + esc(p.role || p.type) + ' · ' + pl(p.projects, 'project') + (p.late ? ' · <span class="ceo-late">' + pl(p.late, 'late task') + '</span>' : '') + (p.comp ? ' · <span class="ceo-late">papers missing</span>' : '') + '</small></span><span class="pmo-ld ' + p.load + '" title="' + p.now + ' tasks on now, ' + p.next + ' starting within 2 weeks">' + lab + ' · ' + p.now + '</span></li>';
  }
  function team() {
    var T = D.team;
    var pms = T.pms.length ? '<div class="table-wrap"><table class="ceo-tab pmo-tab"><thead><tr><th>Project manager</th><th class="num">Projects</th><th class="num">In trouble</th><th class="num">At risk</th><th class="num">Late tasks</th></tr></thead><tbody>' + T.pms.map(function (p) {
      return '<tr><td><b>' + esc(p.name) + '</b></td><td class="num">' + p.projects + '</td><td class="num' + (p.red ? ' ceo-late' : '') + '">' + p.red + '</td><td class="num">' + p.amber + '</td><td class="num">' + p.late + '</td></tr>'; }).join('') + '</tbody></table></div>' : none('No project managers are named on the plans yet.');
    var col = function (title, L) { return '<div><h4 class="ceo-sub">' + esc(title) + ' (' + L.length + ')</h4>' + (L.length ? '<ul class="pmo-pp">' + L.slice(0, 12).map(person).join('') + '</ul>' + (L.length > 12 ? '<p class="muted pmo-more"><a href="#people/workload">' + (L.length - 12) + ' more in Workload</a></p>' : '') : '<p class="muted">None in the People register.</p>') + '</div>'; };
    return '<p class="pmo-lg">Logins: ' + pl(T.logins.directors, 'project director') + ', ' + pl(T.logins.managers, 'project manager') + ', ' + pl(T.logins.contractors, 'contractor') + ', ' + T.logins.personnel + ' project personnel · <a href="#users">Users &amp; access</a> · <a href="#people/workload">Workload</a></p>' +
      '<h4 class="ceo-sub">Project managers</h4>' + pms + '<div class="pmo-ms2">' + col('Consultants', T.consultants) + col('Contractors', T.contractors) + '</div>';
  }
  function gaps() {
    if (!D.gaps.length) return none('Every program has a director, and every project has a manager, a baseline and an approved charter.');
    return '<ul class="pmo-gp">' + D.gaps.map(function (g) {
      return '<li ' + (g.core ? go(g.core, 'overview') : 'data-go="#programs"') + '><b>' + esc(g.project || g.program) + '</b>' + (g.core && g.pm ? '<small>' + esc(g.pm) + '</small>' : '') + '<span>' + g.why.map(function (w) { return '<em>' + esc(w) + '</em>'; }).join('') + '</span></li>'; }).join('') + '</ul>';
  }

  function draw() {
    var A = D.all;
    M.view().innerHTML = '<div class="ceo pmo">' +
      '<div class="row ceo-head"><div><p class="muted">' + esc(new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) + ' · delivery across ' + pl(D.programs.length, 'program') + ' and ' + pl(A.n, 'live project') + '</p></div>' +
      '<div class="row" style="gap:6px;align-items:center"><span class="pmo-ix">Portfolio SPI ' + idx(A.SPI) + ' · CPI ' + idx(A.CPI) + '</span><button class="btn btn-sm" id="pmoRe" type="button">⟳ Refresh</button><button class="btn btn-sm" id="pmoPr" type="button">🖨 Print / PDF</button></div></div>' +
      tiles() + (TAB !== 'all' ? '<p class="ceo-f">Showing one section · <a href="#" id="pmoAll">show everything</a></p>' : '') +
      '<div class="pmo-g">' +
      '<div class="pmo-c">' + sec('decide', 'Needs your decision', 'Change requests and variation orders waiting for the change board, oldest first.', decisions(), D.decisionsN) +
        sec('watch', 'Projects to watch', 'In trouble or at risk, worst first, with the reason and who runs it.', watch(), D.watch.length) +
        sec('ms', 'Milestones', 'Late, and due in the next 30 days.', milestones(), D.milestones.overdueN + D.milestones.soonN) +
        sec('team', 'Team and load', 'Who reports in, and who has too much on.', team()) + '</div>' +
      '<div class="pmo-c">' + sec('prog', 'Programs', 'Health and who directs each program.', programs(), D.programs.length) +
        sec('esc', 'Escalations', 'Risks scoring 12 or more, and high or critical issues.', escalations(), D.escalN) +
        sec('gaps', 'Governance gaps', 'What the PMO standard expects and is missing.', gaps(), D.gapsN) + '</div>' +
      '</div></div>';
    var V = M.view();
    V.querySelector('#pmoRe').onclick = function () { this.disabled = true; load().then(draw).catch(fail); };
    V.querySelector('#pmoPr').onclick = function () { window.print(); };
    var all = V.querySelector('#pmoAll'); if (all) all.onclick = function (e) { e.preventDefault(); TAB = 'all'; draw(); };
    Array.prototype.forEach.call(V.querySelectorAll('[data-tab]'), function (b) { b.onclick = function () { TAB = TAB === b.getAttribute('data-tab') ? 'all' : b.getAttribute('data-tab'); draw(); }; });
    V.querySelector('.pmo').addEventListener('click', function (e) { var r = e.target.closest('[data-go]'); if (r && !e.target.closest('a')) location.hash = r.getAttribute('data-go'); });
  }
  M.addView('pmo', 'PMO view', function () { M.view().innerHTML = '<div class="empty">Gathering every program and project…</div>'; return load().then(draw); }, 'pmo');
})();
