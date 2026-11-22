/* MBS Console: SQL wizard. Data is copied into the browser and queried there (read-only: nothing in the database can change).
   Templates, a drag-and-drop builder, an auto-completing editor, table / record / chart views, and AI reports as PDF. */
(function () {
  'use strict';
  var M = window.MBS; if (!M) return;
  var api = M.api, esc = M.esc, toast = M.toast, fail = M.fail, $ = M.$;
  var V = function () { return M.view(); };
  var LIBS = ['vendor/alasql.min.js', 'vendor/chart.umd.min.js', 'vendor/codemirror.js', 'vendor/cm-sql.js', 'vendor/show-hint.js', 'vendor/sql-hint.js'];
  var CSS = ['vendor/codemirror.css', 'vendor/show-hint.css'];
  var OPEN = { jobs: true };
  var loaded = null, DB = null, SCHEMA = null, DESCRIBE = {}, KEYS = {}, loadedAt = 0;
  var S = { askLog: [], period: null, tab: 'ask', view: 'table', sql: '', cols: [], rows: [], chart: { type: 'bar', x: '', y: [] }, title: 'Data report', wiz: { table: '', cols: [], filters: [], order: '', dir: 'DESC', limit: 100 } };
  var chartObj = null, cm = null;
  var COLORS = ['#C9A227', '#1F2937', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#14B8A6', '#EC4899', '#6B7280', '#84CC16', '#0EA5E9'];

  function loadLibs() {
    if (loaded) return loaded;
    CSS.forEach(function (h) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h + '?v=23'; document.head.appendChild(l); });
    loaded = LIBS.reduce(function (p, src) { return p.then(function () { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src + '?v=23'; s.onload = res; s.onerror = function () { rej(new Error('Could not load ' + src)); }; document.head.appendChild(s); }); }); }, Promise.resolve())
      .catch(function (e) { loaded = null; throw e; });
    return loaded;
  }
  function loadData(force) {
    if (DB && !force && Date.now() - loadedAt < 5 * 60000) return Promise.resolve();
    return api('sqlData').then(function (d) {
      SCHEMA = d.schema; DESCRIBE = d.describe || {}; KEYS = d.keys || {};
      DB = new window.alasql.Database();
      Object.keys(d.schema).forEach(function (t) { DB.exec('CREATE TABLE ' + t); DB.tables[t].data = d.data[t] || []; });
      loadedAt = Date.now();
    });
  }

  /* ---------- safety: only reading queries ---------- */
  function check(sql) {
    var s = String(sql || '').replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').trim().replace(/;\s*$/, '');
    if (!s) throw new Error('Write a query first');
    if (!/^(select|with)\b/i.test(s)) throw new Error('Only SELECT queries are allowed here (reports read data, they never change it)');
    if (/;/.test(s)) throw new Error('Run one query at a time');
    if (/\b(into|insert|update|delete|drop|create|alter|attach|detach|require|source|declare)\b/i.test(s)) throw new Error('That kind of statement is not allowed here');
    if (/\b(json|csv|xlsx|xls|txt|tab|tsv|html|ods|file)\s*\(/i.test(s)) throw new Error('Reading files is not allowed here');
    return s;
  }
  function run(sql) {
    var s = check(sql);
    var t0 = performance.now();
    var res;
    try { res = DB.exec(s); }
    catch (e) {
      var m = String(e.message || e);
      if (/Parse error/.test(m)) {
        var got = (m.match(/got '([A-Z_]+)'/) || [])[1];
        throw new Error('The SQL has a mistake' + (got ? ' near ' + got.toLowerCase() : '') + '. Tip: total, value, count, sum, rows and index are reserved words, so use other names (e.g. AS total_inc).');
      }
      throw new Error(m.split('\n')[0]);
    }
    if (!Array.isArray(res)) res = [{ value: res }];
    var cols = [];
    res.slice(0, 200).forEach(function (r) { Object.keys(r || {}).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
    S.sql = s; S.cols = cols; S.rows = res; S.ms = Math.round(performance.now() - t0);
    return res;
  }
  var isNum = function (c) { var n = S.rows.slice(0, 50).filter(function (r) { return r[c] != null && r[c] !== ''; }); return n.length > 0 && n.every(function (r) { return typeof r[c] === 'number'; }); };

  /* ---------- templates ---------- */
  // GKH Project Champ's common reports: projects, programs, schedule, money, risks, issues, change control and people
  // (the same figures as the CEO view and Finance: forecast_profit, cost_vs_budget, delayed_days come from there)
  var PJ = "LEFT JOIN projects p ON p.job = t.job";
  var T = [
    { g: 'Quick numbers', n: 'Portfolio scorecard', q: 'What are the key numbers across all my projects?', d: 'The key numbers across every project', sql: "SELECT 'Projects' AS measure, COUNT(*) AS figure FROM projects WHERE has_plan = true\nUNION ALL SELECT 'At risk' AS measure, COUNT(*) AS figure FROM projects WHERE health = 'At risk'\nUNION ALL SELECT 'Delayed more than 10 days' AS measure, COUNT(*) AS figure FROM projects WHERE delayed_days > 10\nUNION ALL SELECT 'Over budget (forecast)' AS measure, COUNT(*) AS figure FROM projects WHERE cost_vs_budget < 0\nUNION ALL SELECT 'Billed (invoices raised)' AS measure, COUNT(*) AS figure FROM projects WHERE billed = true\nUNION ALL SELECT 'Past their billing dates' AS measure, COUNT(*) AS figure FROM projects WHERE billing_overdue_days > 0\nUNION ALL SELECT 'Forecast profit ($)' AS measure, ROUND(SUM(IFNULL(forecast_profit, 0))) AS figure FROM projects\nUNION ALL SELECT 'Late tasks' AS measure, SUM(late_tasks) AS figure FROM projects\nUNION ALL SELECT 'High risks' AS measure, SUM(high_risks) AS figure FROM projects\nUNION ALL SELECT 'Open issues' AS measure, SUM(open_issues) AS figure FROM projects", c: null },
    { g: 'Quick numbers', n: 'Tasks due this period', q: 'Which tasks finish in this period?', d: 'Tasks finishing in the chosen period, by project', sql: "SELECT p.project_name, t.task, t.lead, t.finish, t.pct_complete, t.status\nFROM plan_tasks t " + PJ + "\nWHERE t.finish BETWEEN '{FROM}' AND '{TO}'\nORDER BY t.finish", c: null, p: true },
    { g: 'Quick numbers', n: 'Milestones due this period', q: 'Which milestones fall in this period?', d: 'Milestones falling in the chosen period', sql: "SELECT p.project_name, t.task AS milestone, t.finish, t.done\nFROM plan_tasks t " + PJ + "\nWHERE t.days = 0 AND t.finish BETWEEN '{FROM}' AND '{TO}'\nORDER BY t.finish", c: null, p: true },
    { g: 'Quick numbers', n: 'Change decisions this period', q: 'Which change requests were decided in this period?', d: 'Change requests approved, rejected or deferred', sql: "SELECT project, cr, title, decision, approved_by, decided, days, cost\nFROM change_records\nWHERE decided BETWEEN '{FROM}' AND '{TO}'\nORDER BY decided DESC", c: null, p: true },
    { g: 'Quick numbers', n: 'Issues raised this period', q: 'Which issues were raised in this period?', d: 'New issues logged in the chosen period', sql: "SELECT p.project_name, t.issue, t.priority, t.owner, t.raised, t.due, t.status\nFROM plan_issues t " + PJ + "\nWHERE t.raised BETWEEN '{FROM}' AND '{TO}'\nORDER BY t.raised DESC", c: null, p: true },
    { g: 'Portfolio', n: 'Portfolio health', q: 'How healthy is each project (phase, progress, SPI and CPI)?', d: 'Every project: phase, health, progress, SPI and CPI', sql: "SELECT project_name, program, phase, health, pct_complete, spi, cpi, finish, delayed_days\nFROM projects\nWHERE has_plan = true\nORDER BY health, delayed_days DESC" },
    { g: 'Portfolio', n: 'Programs at a glance', q: 'How is each program doing on budget, progress and health?', d: 'Projects, budget, progress and health per program', sql: "SELECT program, projects, at_risk, watch, on_track, pct_complete, budget, spi, cpi, forecast_finish, target_finish\nFROM programs\nORDER BY at_risk DESC, budget DESC" },
    { g: 'Portfolio', n: 'Projects by country', q: 'How many projects do I have in each country and state?', d: 'Where the projects are: by country, then state', sql: "SELECT IFNULL(NULLIF(country, ''), 'Not set') AS country, IFNULL(NULLIF(state, ''), '-') AS state, COUNT(*) AS projects\nFROM projects\nWHERE has_plan = true\nGROUP BY country, state\nORDER BY projects DESC", c: ['bar', 'country', ['projects']] },
    { g: 'Portfolio', n: 'Projects by city', q: 'How many projects are in each city?', d: 'The cities and towns the projects are in', sql: "SELECT IFNULL(NULLIF(city, ''), 'Not set') AS city, country, COUNT(*) AS projects\nFROM projects\nWHERE has_plan = true\nGROUP BY city, country\nORDER BY projects DESC", c: ['hbar', 'city', ['projects']] },
    { g: 'Portfolio', n: 'Projects by PMBOK phase', q: 'How many projects are in each PMBOK phase?', d: 'How many projects are in each phase', sql: "SELECT phase, COUNT(*) AS projects_count, SUM(approved_budget) AS budget_total\nFROM projects\nGROUP BY phase\nORDER BY projects_count DESC", c: ['doughnut', 'phase', ['projects_count']] },
    { g: 'Portfolio', n: 'Projects by health', q: 'How many projects are on track, on watch and at risk?', d: 'On track, watch and at risk', sql: "SELECT health, COUNT(*) AS projects_count\nFROM projects\nWHERE has_plan = true\nGROUP BY health", c: ['doughnut', 'health', ['projects_count']] },
    { g: 'Schedule', n: 'Delayed projects', q: 'Which projects are delayed, and by how many days?', d: 'Days past the baseline (or the forecast past the planned finish), worst first', sql: "SELECT project_name, program, finish, baseline_finish, forecast_finish, delayed_days, spi\nFROM projects\nWHERE delayed_days > 0\nORDER BY delayed_days DESC", c: ['hbar', 'project_name', ['delayed_days']] },
    { g: 'Schedule', n: 'Behind schedule (SPI under 0.9)', q: 'Which projects are behind schedule (SPI under 0.9)?', d: 'Less work done than planned by today', sql: "SELECT project_name, program, pct_complete, spi, delayed_days\nFROM projects\nWHERE spi < 0.9\nORDER BY spi", c: ['hbar', 'project_name', ['spi']] },
    { g: 'Schedule', n: 'Late tasks', q: 'Which tasks are late, and who leads them?', d: 'Past their finish date and not done, with who leads them', sql: "SELECT p.project_name, t.task, t.lead, t.finish, t.pct_complete\nFROM plan_tasks t " + PJ + "\nWHERE t.late = true\nORDER BY t.finish", c: null },
    { g: 'Schedule', n: 'Dependencies clashing or at risk', q: 'Which dependencies are clashing or at risk?', d: 'Projects waiting on other projects', sql: "SELECT from_project, to_project, type, status, buffer_days, explanation\nFROM dependencies\nWHERE status IN ('Clash', 'At risk')\nORDER BY buffer_days", c: null },
    { g: 'Money', n: 'Forecast profit by project', q: 'What is the forecast profit or loss on each project?', d: 'Contract value − forecast cost, by contract type (as the CEO view)', sql: "SELECT project_name, program, contract_type, contract_value, contract_from, forecast_cost, forecast_profit, profit_margin_pct\nFROM projects\nWHERE forecast_profit IS NOT NULL\nORDER BY forecast_profit DESC", c: ['hbar', 'project_name', ['forecast_profit']] },
    { g: 'Money', n: 'Cost vs budget', q: 'Which projects will cost more than their approved budget?', d: 'Forecast cost against the approved budget, most over first', sql: "SELECT project_name, program, approved_budget, forecast_cost, cost_vs_budget, cpi\nFROM projects\nWHERE approved_budget IS NOT NULL\nORDER BY cost_vs_budget", c: ['hbar', 'project_name', ['cost_vs_budget']] },
    { g: 'Money', n: 'Over budget (CPI under 1)', q: 'Which projects are over budget (CPI under 1), and who manages them?', d: 'Spending more than the work done is worth', sql: "SELECT project_name, program, project_manager, earned_value, actual_cost, cpi, cost_vs_budget\nFROM projects\nWHERE cpi < 1\nORDER BY cpi", c: null },
    { g: 'Money', n: 'Planned vs actual cost by project', q: 'What is the budget, earned value and money spent on each project?', d: 'Budget, earned value and money spent', sql: "SELECT project_name, budget, earned_value, actual_cost, forecast_cost\nFROM projects\nWHERE has_plan = true\nORDER BY budget DESC", c: ['bar', 'project_name', ['budget', 'actual_cost', 'forecast_cost']] },
    { g: 'Money', n: 'Contract value by program', q: 'What is the contract value and forecast profit of each program?', d: 'Contract value and forecast profit per program', sql: "SELECT program, COUNT(*) AS projects_count, SUM(IFNULL(contract_value, 0)) AS contract_total, SUM(IFNULL(forecast_profit, 0)) AS profit_total\nFROM projects\nWHERE program <> ''\nGROUP BY program\nORDER BY contract_total DESC", c: ['bar', 'program', ['contract_total', 'profit_total']] },
    { g: 'Money', n: 'Billed projects', q: 'Which projects have been billed, and how much is invoiced, received and owed?', d: 'Projects with invoices raised: invoiced, received and owed', sql: "SELECT project_name, program, contract_value, invoices_count, invoiced, billed_pct, received, owed\nFROM projects\nWHERE billed = true\nORDER BY invoiced DESC", c: ['bar', 'project_name', ['invoiced', 'received']] },
    { g: 'Money', n: 'Past their billing dates', q: 'Which projects are past their billing dates?', d: 'Milestones not invoiced after their billing date, and invoices not paid on time', sql: "SELECT project_name, program, milestones_past_billing_date, billing_overdue_days, unbilled_past_due_value, invoices_overdue_count, invoices_overdue_amount, oldest_invoice_overdue_days\nFROM projects\nWHERE billing_overdue_days > 0 OR invoices_overdue_count > 0\nORDER BY billing_overdue_days DESC, oldest_invoice_overdue_days DESC", c: ['hbar', 'project_name', ['billing_overdue_days']] },
    { g: 'Risks and issues', n: 'Open risks by score', q: 'What are the open risks, highest score first?', d: 'Highest first (probability × impact)', sql: "SELECT p.project_name, t.risk, t.probability, t.impact, t.score, t.response, t.owner\nFROM plan_risks t " + PJ + "\nWHERE t.status <> 'Closed'\nORDER BY t.score DESC", c: null },
    { g: 'Risks and issues', n: 'High risks across all projects', q: 'What are the high risks across all projects, and who owns them?', d: 'Score 15 or more, and who owns them', sql: "SELECT p.project_name, t.risk, t.score, t.response, t.owner\nFROM plan_risks t " + PJ + "\nWHERE t.status <> 'Closed' AND t.score >= 15\nORDER BY t.score DESC", c: null },
    { g: 'Risks and issues', n: 'Open issues', q: 'Which issues are still open, by priority?', d: 'Not resolved yet, by priority', sql: "SELECT p.project_name, t.issue, t.priority, t.owner, t.due, t.status\nFROM plan_issues t " + PJ + "\nWHERE t.status <> 'Resolved'\nORDER BY CASE t.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END, t.due", c: null },
    { g: 'Risks and issues', n: 'Risks and issues by project', q: 'How many open risks and issues does each project have?', d: 'Open risks, high risks and open issues per project', sql: "SELECT project_name, open_risks, high_risks, open_issues\nFROM projects\nWHERE has_plan = true\nORDER BY high_risks DESC, open_issues DESC", c: ['bar', 'project_name', ['open_risks', 'high_risks', 'open_issues']] },
    { g: 'Change control', n: 'Change decisions', q: 'What change decisions are on record?', d: 'Every decision on record, newest first', sql: "SELECT project, cr, title, decision, approved_by, role, decided, days, cost\nFROM change_records\nORDER BY decided DESC", c: null },
    { g: 'Change control', n: 'Change effect by project', q: 'What have approved changes added in time and cost on each project?', d: 'What approved changes added in time and cost', sql: "SELECT project, COUNT(*) AS approved_changes, SUM(days) AS days_added, SUM(cost) AS cost_added\nFROM change_records\nWHERE decision = 'Approved'\nGROUP BY project\nORDER BY cost_added DESC", c: ['bar', 'project', ['cost_added']] },
    { g: 'People', n: 'Open tasks by lead', q: 'Who leads how much open work?', d: 'Who leads how much work that is not done', sql: "SELECT t.lead, COUNT(*) AS open_tasks, SUM(CASE WHEN t.late = true THEN 1 ELSE 0 END) AS late_tasks\nFROM plan_tasks t\nWHERE t.done = false AND t.lead <> ''\nGROUP BY t.lead\nORDER BY late_tasks DESC, open_tasks DESC", c: ['hbar', 'lead', ['open_tasks', 'late_tasks']] },
    { g: 'People', n: 'Who is accountable (RACI)', q: 'Who is accountable on each project (RACI)?', d: 'The A in RACI on each project', sql: "SELECT p.project_name, t.person, t.role\nFROM plan_stakeholders t " + PJ + "\nWHERE t.raci LIKE '%A%'\nORDER BY p.project_name", c: null }
  ];


  /* ---------- periods for the quick numbers (Sydney dates) ---------- */
  function syd() { var o = {}; new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; }); return { y: +o.year, m: +o.month, d: +o.day, wd: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(o.weekday) }; }
  function ymd(y, m, d) { return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10); }
  function periods() {
    var t = syd(), fy = t.m >= 7 ? t.y : t.y - 1, lm = t.m === 1 ? [t.y - 1, 12] : [t.y, t.m - 1];
    return {
      today: { from: ymd(t.y, t.m, t.d), to: ymd(t.y, t.m, t.d), name: 'today' },
      week: { from: ymd(t.y, t.m, t.d - t.wd), to: ymd(t.y, t.m, t.d - t.wd + 6), name: 'this week' },
      month: { from: ymd(t.y, t.m, 1), to: ymd(t.y, t.m + 1, 0), name: 'this month' },
      lastmonth: { from: ymd(lm[0], lm[1], 1), to: ymd(lm[0], lm[1] + 1, 0), name: 'last month' },
      year: { from: ymd(t.y, 1, 1), to: ymd(t.y, 12, 31), name: 'this year' },
      fy: { from: ymd(fy, 7, 1), to: ymd(fy + 1, 6, 30), name: 'FY ' + fy + '-' + String(fy + 1).slice(2) },
      all: { from: '2000-01-01', to: '2999-12-31', name: 'all time' }
    };
  }
  function period() { if (!S.period) S.period = Object.assign({ key: 'month' }, periods().month); return S.period; }
  function prettyRange(p) { var f = function (s) { var a = s.split('-').map(Number); return a[2] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][a[1] - 1] + ' ' + a[0]; }; return p.key === 'all' ? 'all time' : p.from === p.to ? f(p.from) : f(p.from) + ' to ' + f(p.to); }

  /* ---------- page ---------- */
  function page() {
    V().innerHTML = '<div class="empty">Loading your project data…</div>';
    return loadLibs().then(function () { return loadData(); }).then(draw);
  }
  function draw() {
    var tables = Object.keys(SCHEMA);
    V().innerHTML =
      '<div class="sqlw">' +
        '<aside class="card sql-side"><div class="card-h"><h2>Tables</h2><button class="btn btn-sm" id="sqlRefresh" title="Load the latest data">↻</button></div>' +
          '<p class="muted" style="margin:0 0 10px;font-size:12.5px">Drag a table or column into the builder or the editor (or tap it).</p>' +
          tables.map(function (t) {
            return '<details class="tbl" data-t="' + esc(t) + '"' + (OPEN[t] ? ' open' : '') + '><summary><span class="chipd tchip" draggable="true" data-drag="' + esc(t) + '" data-table="' + esc(t) + '">' + esc(t) + '</span><small class="muted"> ' + DB.tables[t].data.length + (DB.tables[t].data.length === 1 ? ' row' : ' rows') + '</small></summary>' +
              '<p class="muted" style="margin:4px 0 6px;font-size:12px">' + esc(DESCRIBE[t] || '') + '</p><div class="cols">' +
              SCHEMA[t].map(function (c) { var K = KEYS[t] || {}, pk = K.pk === c, fk = (K.fk || {})[c]; return '<span class="chipd' + (pk ? ' kpk' : fk ? ' kfk' : '') + '" draggable="true" data-drag="' + esc(c) + '" data-col="' + esc(c) + '" data-of="' + esc(t) + '"' + (pk ? ' title="Key of ' + esc(t) + ': one per row"' : fk ? ' title="Links to ' + esc(fk) + '.' + esc((KEYS[fk] || {}).pk || c) + '"' : '') + '>' + (pk ? '🔑 ' : fk ? '🔗 ' : '') + esc(c) + '</span>'; }).join('') + '</div></details>';
          }).join('') + '</aside>' +
        '<section class="sql-main">' +
          '<div class="tabs" id="sqlTabs">' + [['ask', '✨ AI query'], ['templates', '★ Templates'], ['wizard', '🧩 Wizard'], ['editor', '⌨ SQL editor'], ['saved', '💾 Saved']].map(function (x) { return '<button class="tab' + (S.tab === x[0] ? ' on' : '') + '" data-tab="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
          '<div class="card" id="sqlPanel"></div>' +
          '<div class="card" id="sqlResults" style="margin-top:16px"><div class="empty">Pick a template, build a query with the wizard, or write SQL, then press Run.</div></div>' +
        '</section>' +
      '</div>';
    $('#sqlRefresh').onclick = function () { loadData(true).then(function () { toast('Latest data loaded'); draw(); }).catch(fail); };
    V().querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { S.tab = b.getAttribute('data-tab'); draw(); }; });
    // drag + tap on the table/column chips
    V().querySelectorAll('.chipd').forEach(function (c) {
      c.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', c.getAttribute('data-drag')); e.dataTransfer.setData('application/x-mbs', JSON.stringify({ table: c.getAttribute('data-table'), col: c.getAttribute('data-col'), of: c.getAttribute('data-of') })); });
      c.addEventListener('click', function (e) { e.preventDefault(); pick({ table: c.getAttribute('data-table'), col: c.getAttribute('data-col'), of: c.getAttribute('data-of') }); });
    });
    V().querySelectorAll('details.tbl').forEach(function (d) { d.addEventListener('toggle', function () { OPEN[d.getAttribute('data-t')] = d.open; }); });
    panel();
    if (S.rows.length) results();
  }
  function pick(it) {
    if (S.tab === 'editor' && cm) { cm.replaceSelection(it.table || it.col); cm.focus(); return; }
    if (S.tab !== 'wizard') { S.tab = 'wizard'; }
    if (it.table) { setTable(it.table); OPEN[it.table] = true; }
    else if (it.col) { if (S.wiz.table !== it.of) setTable(it.of); if (!S.wiz.cols.some(function (x) { return x.c === it.col; })) S.wiz.cols.push({ c: it.col, agg: '' }); }
    draw();
  }
  function setTable(t) { if (S.wiz.table !== t) { S.wiz = { table: t, cols: [], filters: [], order: '', dir: 'DESC', limit: 100 }; } }

  function panel() {
    var P = $('#sqlPanel');
    if (S.tab === 'templates') {
      // GKH Project Champ: only templates whose tables exist here (the MBS money and customer tables don't)
      var have = function (t) { var used = (t.sql.match(/\b(?:FROM|JOIN)\s+([a-z_]+)/gi) || []).map(function (x) { return x.split(/\s+/).pop().toLowerCase(); }); return used.every(function (u) { return !!SCHEMA[u]; }); };
      var groups = {}; T.forEach(function (t, i) { if (have(t)) (groups[t.g] = groups[t.g] || []).push([t, i]); });
      var pr = period();
      P.innerHTML = '<h2>Common reports</h2><p class="muted" style="margin:-6px 0 12px">One click runs it. You can then change it in the editor.</p>' +
        '<div class="period"><b>Period for quick numbers:</b><div class="tabs" style="margin:0">' + [['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['lastmonth', 'Last month'], ['year', 'This year'], ['fy', 'Financial year'], ['all', 'All time'], ['custom', 'Date range']].map(function (x) {
          return '<button class="tab' + (pr.key === x[0] ? ' on' : '') + '" data-per="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<div class="row" id="perRange"' + (pr.key === 'custom' ? '' : ' hidden') + '><label style="display:flex;gap:6px;align-items:center;font-weight:600">From<input type="date" id="perFrom" value="' + esc(pr.from) + '" style="width:auto"></label><label style="display:flex;gap:6px;align-items:center;font-weight:600">to<input type="date" id="perTo" value="' + esc(pr.to) + '" style="width:auto"></label></div>' +
        '<span class="muted" id="perShow">' + esc(prettyRange(pr)) + '</span></div>' + ['Quick numbers', 'Portfolio', 'Schedule', 'Money', 'Risks and issues', 'Change control', 'People'].filter(function (g) { return groups[g]; }).concat(Object.keys(groups).filter(function (g) { return ['Quick numbers', 'Portfolio', 'Schedule', 'Money', 'Risks and issues', 'Change control', 'People'].indexOf(g) < 0; })).map(function (g) {
        return '<p class="side-h" style="color:var(--muted);margin:14px 0 8px">' + esc(g) + (g === 'Quick numbers' ? ' <span style="text-transform:none;letter-spacing:0">(' + esc(prettyRange(pr)) + ')</span>' : '') + '</p><div class="tpl-grid">' + groups[g].map(function (x) { return '<button class="tpl' + (x[0].p ? ' tpl-p' : '') + '" data-tpl="' + x[1] + '"><b>' + esc(x[0].n) + '</b><small>' + esc(x[0].d) + '</small></button>'; }).join('') + '</div>';
      }).join('');
      P.querySelectorAll('[data-tpl]').forEach(function (b) { b.onclick = function () { useTemplate(T[+b.getAttribute('data-tpl')]); }; });
      P.querySelectorAll('[data-per]').forEach(function (b) { b.onclick = function () {
        var k = b.getAttribute('data-per');
        S.period = k === 'custom' ? { key: 'custom', from: period().from, to: period().to, name: 'custom' } : Object.assign({ key: k }, periods()[k]);
        panel(); }; });
      var setRange = function () { var f = $('#perFrom').value, t = $('#perTo').value; if (f && t) { S.period = { key: 'custom', from: f <= t ? f : t, to: f <= t ? t : f, name: 'custom' }; $('#perShow').textContent = prettyRange(S.period); } };
      if ($('#perFrom')) { $('#perFrom').onchange = setRange; $('#perTo').onchange = setRange; }
    } else if (S.tab === 'ask') askPanel(P);
    else if (S.tab === 'wizard') wizard(P);
    else if (S.tab === 'editor') editor(P);
    else saved(P);
  }
  function useTemplate(t) {
    var pr = period(), sql = t.p ? t.sql.replace(/\{FROM\}/g, pr.from).replace(/\{TO\}/g, pr.to) : t.sql;
    S.title = t.p ? t.n + ' (' + (pr.key === 'custom' ? prettyRange(pr) : pr.name) + ')' : t.n;
    try { run(sql); } catch (e) { return fail(e); }
    if (t.c && S.rows.length > 1) { S.chart = { type: t.c[0], x: isIdCol(t.c[1]) && nameCol(S.cols) ? nameCol(S.cols) : t.c[1], y: t.c[2].slice() }; S.view = 'chart'; } else { S.view = 'table'; autoChart(); }
    // ✨ shown the AI query way: the answer in words on top, the table or chart below, the query folded away (no AI tokens used)
    var a = { q: t.q || tplQ(t), at: Date.now(), tokens: 0, sql: S.sql, title: S.title, note: t.d || '', view: S.view, chart: JSON.parse(JSON.stringify(S.chart)), tpl: true };
    if (S.rows.length === 1 && S.cols.length === 1) { var v = S.rows[0][S.cols[0]]; a.single = typeof v === 'number' ? v.toLocaleString('en-AU', { maximumFractionDigits: 2 }) : String(v == null ? '' : v); }
    a.answer = tplAnswer(t);
    S.askLog.push(a); if (S.askLog.length > 20) S.askLog.shift();
    S.tab = 'ask'; draw(); results(); showAnswer(a);
    var qi = $('#askQ'); if (qi) qi.value = a.q;   // the report's question in the box, so it is clear what was asked (and it can be reworded and asked)
  }
  // a report's question in plain English: "Past their billing dates" → "Show me: past their billing dates"
  function tplQ(t) { return String(t.n || 'Report'); }
  // the answer in words for a report: a count and the first names, or a measure / figure list read out
  function tplAnswer(t) {
    var n = S.rows.length, fmt = function (v) { return typeof v === 'number' ? v.toLocaleString('en-AU', { maximumFractionDigits: 2 }) : String(v == null ? '' : v); };
    if (!n) return 'Nothing to show: no project matches this report right now.';
    if (n === 1 && S.cols.length === 1) return S.title + ': ' + fmt(S.rows[0][S.cols[0]]) + '.';
    if (S.cols[0] === 'measure' && S.cols[1] === 'figure') return S.rows.map(function (r) { var v = Object.keys(r).map(function (k) { return r[k]; }); return v[0] + ': ' + fmt(v[1]); }).join(' · ') + '.';
    var nm = nameCol(S.cols) || S.cols[0], names = S.rows.slice(0, 5).map(function (r) { return fmt(r[nm]); }).filter(Boolean);
    return n + ' row' + (n === 1 ? '' : 's') + (names.length ? ': ' + names.join(', ') + (n > 5 ? ' and ' + (n - 5) + ' more' : '') : '') + '. See the ' + (S.view === 'chart' ? 'chart' : 'table') + ' below.';
  }


  /* ---------- ✨ AI query: ask in plain English ---------- */
  var EXAMPLES = ['How healthy is my portfolio?', 'Status of each program: budget, SPI, CPI and forecast finish', 'Which dependencies are clashing or at risk?', 'Which projects are at risk, and why?',
    'Which programs will finish after their target?', 'Which tasks are late, and who is the lead?', 'Projects over budget (CPI under 1)', 'High risks across all projects and their owners'];
  // v49: licence / insurance states stand out (expired in red, due soon in amber, missing in grey)
  function flagCell(c, v) {
    if (/(_state|^compliance)$/.test(c) && typeof v === 'string') { var k = { expired: ['⚠ EXPIRED', 'bad'], due: ['due soon', 'due'], missing: ['missing', 'miss'], ok: ['✓ ok', 'ok'] }[v]; if (k) return '<span class="sq-st sq-' + k[1] + '">' + k[0] + '</span>'; }
    if (c === 'any_expired' && v === true) return '<span class="sq-st sq-bad">⚠ EXPIRED</span>';
    if (/_expiry$/.test(c) && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) { var td = new Date(Date.now() + 10 * 3600e3).toISOString().slice(0, 10); return '<span' + (v < td ? ' class="sq-st sq-bad"' : '') + '>' + v.slice(8, 10) + '/' + v.slice(5, 7) + '/' + v.slice(0, 4) + '</span>'; }
    return esc(fmt(v));
  }
  function hints() {
    var q = function (sql, k) { try { return DB.exec(sql).map(function (r) { return r[k]; }).filter(function (v) { return v != null && v !== ''; }); } catch (e) { return []; } };
    var counts = {}; Object.keys(SCHEMA).forEach(function (t) { counts[t] = DB.tables[t].data.length; });
    var plans = []; try { plans = DB.exec('SELECT DISTINCT plan_name AS pn, job AS jb FROM plan_tasks').map(function (r) { return r.pn + ' (job ' + r.jb + ')'; }); } catch (e) {}
    return {
      row_counts: counts, stages: q('SELECT DISTINCT stage AS v FROM jobs', 'v'), quote_status: q('SELECT DISTINCT status AS v FROM quotes', 'v'), invoice_status: q('SELECT DISTINCT status AS v FROM invoices', 'v'),
      expense_categories: q('SELECT DISTINCT category AS v FROM expenses', 'v'), trades: q('SELECT DISTINCT trade AS v FROM jobs', 'v'), sub_trades: q('SELECT DISTINCT trade AS v FROM subcontractors', 'v'), sources: q('SELECT DISTINCT source AS v FROM jobs', 'v'),
      suburbs: q('SELECT suburb AS v, COUNT(*) AS n FROM jobs GROUP BY suburb ORDER BY n DESC LIMIT 40', 'v'), services: q('SELECT service AS v, COUNT(*) AS n FROM jobs GROUP BY service ORDER BY n DESC LIMIT 30', 'v'),
      programs: q('SELECT DISTINCT program AS v FROM projects', 'v'), phases: ['Initiation', 'Planning', 'Execution', 'Monitoring & Evaluation', 'Closing'], health: ['On track', 'Watch', 'At risk', 'Not planned'],
      plans: plans.slice(0, 40), plan_status: q('SELECT DISTINCT status AS v FROM plan_tasks', 'v'), risk_status: q('SELECT DISTINCT status AS v FROM plan_risks', 'v'), issue_status: q('SELECT DISTINCT status AS v FROM plan_issues', 'v')
    };
  }
  function askPanel(P) {
    P.innerHTML = '<div class="card-h"><h2>✨ AI query</h2><span class="muted" style="font-size:12.5px">Ask in plain English. The AI writes the query; it runs here on your own data.</span></div>' +
      '<form class="askbar" id="askForm"><input id="askQ" autocomplete="off" maxlength="400" placeholder="e.g. Which projects in the ERP program are behind schedule?" aria-label="Your question"><button class="btn btn-gold" id="askGo" type="submit">Ask</button></form>' +
      '<div class="ask-ex">' + EXAMPLES.map(function (e) { return '<button type="button" class="chipq" data-ex="' + esc(e) + '">' + esc(e) + '</button>'; }).join('') + '</div>' +
      '<div id="askOut"></div><div class="muted" id="askUse" style="font-size:12px;margin-top:8px"></div>' +
      (S.askLog.length ? '<details class="ask-log"><summary>Earlier questions (' + S.askLog.length + ')</summary>' + S.askLog.slice().reverse().map(function (a, i) { return '<button type="button" class="ask-old" data-old="' + (S.askLog.length - 1 - i) + '"><b>' + esc(a.q) + '</b><small>' + esc(a.answer || '') + '</small></button>'; }).join('') + '</details>' : '') +
      '<p style="margin:12px 0 0"><button type="button" class="btn btn-sm" id="aiPing">🔌 Test AI connection</button> <span class="muted" id="aiPingOut" style="font-size:12.5px"></span></p>' +
      '<p class="muted" style="font-size:12px;margin:12px 0 0">To write the query the AI only sees table and column names, today\'s dates and short lists like stages and plan names. To word the answer it sees the results with names, phone numbers and emails removed. Don\'t type phone numbers into the question.</p>';
    var last = S.askLog[S.askLog.length - 1];
    if (S.pendingQ) { var pq = S.pendingQ; S.pendingQ = ''; $('#askQ').value = pq; setTimeout(function () { ask(pq); }, 0); }
    else if (last) showAnswer(last);
    api('sqlUsage').then(showUse).catch(function () {});
    $('#aiPing').onclick = function () {
      var o = $('#aiPingOut'); o.textContent = 'Checking…';
      api('aiPing').then(function (r) {
        o.textContent = r.ok ? '✅ DeepSeek answered in ' + (r.ms / 1000).toFixed(1) + ' s (model ' + r.model + ', time allowed ' + r.timeoutSec + ' s).'
          : '❌ ' + (r.reason || 'No answer') + (r.ms ? ' (after ' + (r.ms / 1000).toFixed(1) + ' s)' : '');
      }).catch(function (e) { o.textContent = '❌ ' + e.message; });
    };
    $('#askForm').onsubmit = function (e) { e.preventDefault(); ask($('#askQ').value); };
    P.querySelectorAll('[data-ex]').forEach(function (b) { b.onclick = function () { $('#askQ').value = b.getAttribute('data-ex'); ask(b.getAttribute('data-ex')); }; });
    P.querySelectorAll('[data-old]').forEach(function (b) { b.onclick = function () { var a = S.askLog[+b.getAttribute('data-old')]; try { run(a.sql); S.title = a.title; S.view = a.view || 'table'; if (a.chart) S.chart = JSON.parse(JSON.stringify(a.chart)); else autoChart(); results(); showAnswer(a); $('#askQ').value = a.q; } catch (e) { fail(e); } }; });
    setTimeout(function () { var i = $('#askQ'); if (i && !S.askBusy) i.focus(); }, 30);
  }
  function showUse(t) {
    var el = $('#askUse'); if (!el || !t) return;
    el.textContent = 'Today: ' + t.questions + ' of ' + t.limit + ' AI questions used · ' + Number(t.tokens || 0).toLocaleString('en-AU') + ' tokens.';
  }
  function showAnswer(a) {
    var O = $('#askOut'); if (!O) return;
    var big = '';
    if (a.single != null) big = '<div class="ask-big">' + esc(a.single) + '</div>';
    O.innerHTML = '<div class="ask-ans' + (a.error ? ' err' : '') + '"><div class="ask-q">“' + esc(a.q) + '”</div>' + big +
      '<div class="ask-a">' + (a.answer ? esc(a.answer) : '<span class="ask-think">Working out the answer…</span>') + '</div>' +
      (a.note ? '<div class="muted" style="font-size:12.5px;margin-top:6px">' + (a.tpl ? 'About this report: ' : 'How I read it: ') + esc(a.note) + '</div>' : '') +
      (a.tokens ? '<div class="muted" style="font-size:12px;margin-top:4px">This question used about ' + a.tokens.toLocaleString('en-AU') + ' tokens.</div>' : '') +
      (a.sql ? '<details class="ask-sql"><summary>Show the query</summary><pre class="json" style="max-height:220px">' + esc(a.sql) + '</pre><button class="btn btn-sm" type="button" id="askEdit">Open in SQL editor</button></details>' : '') + '</div>';
    var ed = $('#askEdit'); if (ed) ed.onclick = function () { S.sql = a.sql; S.title = a.title || 'Query results'; S.tab = 'editor'; draw(); };
  }
  function ask(question) {
    question = String(question || '').trim();
    if (!question) return toast('Type a question first', true);
    if (S.askBusy) return;
    S.askBusy = true;
    var btn = $('#askGo'); if (btn) { btn.disabled = true; btn.textContent = 'Thinking…'; }
    var O = $('#askOut'); if (O) O.innerHTML = '<div class="ask-ans"><div class="ask-q">“' + esc(question) + '”</div><div class="ask-a"><span class="ask-think">Writing the query…</span></div></div>';
    var H = hints(), hist = S.askLog.slice(-1).map(function (a) { return { q: a.q, sql: a.sql }; });
    var a = { q: question, at: Date.now(), tokens: 0 };
    var count = function (r) { a.tokens += Number(r && r.tokens) || 0; if (r && r.today) showUse(r.today); return r; };
    var tryRun = function (r, n) {
      if (!r.sql) return Promise.reject(new Error(r.note || 'I could not turn that into a query. Try asking in a different way.'));
      try {
        run(r.sql);
        // v51: it ran, but a column is empty in every row (usually a JOIN on the wrong key): ask the AI to fix it, once
        var empty = S.rows.length ? S.cols.filter(function (c) { return S.rows.every(function (x) { return x[c] == null || x[c] === ''; }); }) : [];
        if (empty.length && n < 1 && !r.checked && /\bjoin\b/i.test(r.sql)) {
          var t0 = $('#askOut .ask-think'); if (t0) t0.textContent = 'Checking the query…';
          var keep = { sql: S.sql, cols: S.cols, rows: S.rows };
          return api('sqlAsk', { question: question, hints: H, history: hist, previous: { sql: r.sql, error: 'It ran, but these columns are empty in every row: ' + empty.join(', ') + '. The JOIN probably uses the wrong key (join on the id columns listed in rule 6), or take the value from a column the table already has.' } })
            .then(count).then(function (r2) {
              r2.checked = true;
              return tryRun(r2, n + 1).then(function (r3) {   // keep the better of the two
                var still = S.cols.filter(function (c) { return S.rows.every(function (x) { return x[c] == null || x[c] === ''; }); }).length;
                if (!S.rows.length || still >= empty.length) { S.sql = keep.sql; S.cols = keep.cols; S.rows = keep.rows; return r; }
                return r3;
              }, function () { S.sql = keep.sql; S.cols = keep.cols; S.rows = keep.rows; return r; });
            }, function () { return r; });
        }
        return Promise.resolve(r);
      }
      catch (e) {
        if (n >= 1) return Promise.reject(new Error('The AI\'s query did not work (' + e.message + '). Try asking in a different way.'));
        var t = $('#askOut .ask-think'); if (t) t.textContent = 'Fixing the query…';
        return api('sqlAsk', { question: question, hints: H, history: hist, previous: { sql: r.sql, error: e.message } }).then(count).then(function (r2) { return tryRun(r2, n + 1); });
      }
    };
    var slow = function (e) { return /took too long|slow right now|Error 50[234]|Failed to fetch|NetworkError/i.test(String(e && e.message)); };
    var first = function () {
      return api('sqlAsk', { question: question, hints: H, history: hist }).catch(function (e) {
        if (!slow(e)) throw e;
        var t = $('#askOut .ask-think'); if (t) t.textContent = 'The AI is slow right now, trying once more…';
        return api('sqlAsk', { question: question, hints: H, history: hist }).catch(function (e2) {
          if (slow(e2)) throw new Error('The AI did not answer in time (twice). DeepSeek may be busy: try again in a minute. If this keeps happening, press "Test AI connection" below.');
          throw e2;
        });
      });
    };
    first().then(count).then(function (r) { return tryRun(r, 0); }).then(function (r) {
      a.sql = S.sql; a.title = r.title || 'AI query'; a.note = r.note || '';
      S.title = a.title;
      var ok = r.chart && S.cols.indexOf(r.chart.x) >= 0 && r.chart.y.every(function (y) { return S.cols.indexOf(y) >= 0; });
      if (ok && S.rows.length > 1) { S.chart = { type: r.chart.type, x: isIdCol(r.chart.x) && nameCol(S.cols) ? nameCol(S.cols) : r.chart.x, y: r.chart.y.slice() }; S.view = 'chart'; } else { S.view = 'table'; autoChart(); }
      a.view = S.view; a.chart = JSON.parse(JSON.stringify(S.chart));
      if (S.rows.length === 1 && S.cols.length === 1) { var v = S.rows[0][S.cols[0]]; a.single = typeof v === 'number' ? v.toLocaleString('en-AU', { maximumFractionDigits: 2 }) : String(v == null ? '' : v); }
      results(); showAnswer(a);
      // a single number or nothing found: no need to spend tokens on wording the answer
      if (!S.rows.length) { a.answer = 'Nothing matched that question.'; return; }
      if (a.single != null) { a.answer = a.title + ': ' + a.single + '.'; return; }
      return api('sqlAnswer', { question: question, title: a.title, sql: S.sql, columns: S.cols, rows: S.rows.slice(0, 20), row_count: S.rows.length }).then(function (x) { a.answer = x.answer; count(x); }).catch(function () { a.answer = S.rows.length + ' row' + (S.rows.length === 1 ? '' : 's') + ' found (see the table).'; });
    }).then(function () {
      S.askLog.push(a); if (S.askLog.length > 20) S.askLog.shift();
      showAnswer(a);
    }).catch(function (e) {
      a.answer = e.message; a.error = true; showAnswer(a);
    }).then(function () { S.askBusy = false; var b = $('#askGo'); if (b) { b.disabled = false; b.textContent = 'Ask'; } });
  }

  /* ---------- wizard ---------- */
  var OPS = [['=', 'is'], ['<>', 'is not'], ['>', 'more than'], ['>=', 'at least'], ['<', 'less than'], ['<=', 'at most'], ['contains', 'contains'], ['starts', 'starts with'], ['empty', 'is empty'], ['notempty', 'is not empty']];
  function lit(v) { var s = String(v == null ? '' : v).trim(); return /^-?\d+(\.\d+)?$/.test(s) ? s : "'" + s.replace(/'/g, "''") + "'"; }
  function buildSql() {
    var w = S.wiz; if (!w.table) return '';
    var aggd = w.cols.some(function (x) { return x.agg; });
    var sel = w.cols.length ? w.cols.map(function (x) { return x.agg ? (x.agg === 'COUNT' ? 'COUNT(' + x.c + ')' : x.agg + '(' + x.c + ')') + ' AS ' + x.agg.toLowerCase() + '_' + x.c : x.c; }) : ['*'];
    if (w.count) sel.push('COUNT(*) AS rows_count');
    var where = w.filters.filter(function (f) { return f.c; }).map(function (f) {
      if (f.op === 'contains') return f.c + " LIKE " + lit('%' + f.v + '%');
      if (f.op === 'starts') return f.c + " LIKE " + lit(f.v + '%');
      if (f.op === 'empty') return '(' + f.c + " IS NULL OR " + f.c + " = '')";
      if (f.op === 'notempty') return '(' + f.c + " IS NOT NULL AND " + f.c + " <> '')";
      return f.c + ' ' + f.op + ' ' + lit(f.v);
    });
    var plain = w.cols.filter(function (x) { return !x.agg; }).map(function (x) { return x.c; });
    var group = (aggd || w.count) && plain.length ? plain : [];
    var sql = 'SELECT ' + sel.join(', ') + '\nFROM ' + w.table;
    if (where.length) sql += '\nWHERE ' + where.join('\n  AND ');
    if (group.length) sql += '\nGROUP BY ' + group.join(', ');
    if (w.order) sql += '\nORDER BY ' + w.order + ' ' + (w.dir === 'ASC' ? 'ASC' : 'DESC');
    if (w.limit) sql += '\nLIMIT ' + Math.max(1, Math.min(10000, +w.limit || 100));
    return sql;
  }
  function wizard(P) {
    var w = S.wiz, cols = w.table ? SCHEMA[w.table] : [];
    var opt = function (list, val, blank) { return (blank ? '<option value="">' + blank + '</option>' : '') + list.map(function (c) { var v = Array.isArray(c) ? c[0] : c, l = Array.isArray(c) ? c[1] : c; return '<option value="' + esc(v) + '"' + (v === val ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join(''); };
    var outCols = w.cols.map(function (x) { return x.agg ? x.agg.toLowerCase() + '_' + x.c : x.c; }).concat(w.count ? ['rows_count'] : []);
    P.innerHTML = '<h2>Build a query, step by step</h2>' +
      '<div class="wz"><div class="wz-step"><b>1</b> Table</div><div class="drop" data-drop="table">' + (w.table ? '<span class="chipd tchip">' + esc(w.table) + '</span> <select id="wzTable" style="width:auto">' + opt(Object.keys(SCHEMA), w.table) + '</select>' : '<span class="muted">Drag a table here or </span><select id="wzTable" style="width:auto">' + opt(Object.keys(SCHEMA), '', 'choose…') + '</select>') + '</div></div>' +
      (w.table ? '<div class="wz"><div class="wz-step"><b>2</b> Columns</div><div class="drop" data-drop="cols">' + (w.cols.length ? w.cols.map(function (x, i) {
          return '<span class="pill"><select data-agg="' + i + '" title="Add up, count, average…">' + opt([['', '—'], ['COUNT', 'count'], ['SUM', 'sum'], ['AVG', 'average'], ['MIN', 'min'], ['MAX', 'max']], x.agg) + '</select><b>' + esc(x.c) + '</b><button data-rmcol="' + i + '" type="button" aria-label="Remove">✕</button></span>'; }).join('') : '<span class="muted">Drag columns here (or tap them on the left). Leave empty for all columns.</span>') + '</div>' +
        '<label class="wz-opt"><input type="checkbox" id="wzCount" style="width:auto"' + (w.count ? ' checked' : '') + '> Also count the rows in each group</label></div>' +
        '<div class="wz"><div class="wz-step"><b>3</b> Filters</div><div class="drop" data-drop="filter">' + w.filters.map(function (f, i) {
          return '<div class="frow"><select data-fc="' + i + '">' + opt(cols, f.c, 'column…') + '</select><select data-fo="' + i + '">' + opt(OPS, f.op) + '</select>' + (/empty/.test(f.op) ? '' : '<input data-fv="' + i + '" value="' + esc(f.v) + '" placeholder="value">') + '<button class="btn btn-sm" data-rmf="' + i + '" type="button">✕</button></div>'; }).join('') +
          '<button class="btn btn-sm" id="wzAddF" type="button">＋ Add filter</button> <span class="muted" style="font-size:12.5px">or drop a column here</span></div></div>' +
        '<div class="wz"><div class="wz-step"><b>4</b> Sort and limit</div><div class="row"><select id="wzOrder" style="width:auto">' + opt(outCols.concat(cols.filter(function (c) { return outCols.indexOf(c) < 0; })), w.order, 'no sorting') + '</select>' +
          '<select id="wzDir" style="width:auto">' + opt([['DESC', 'biggest / newest first'], ['ASC', 'smallest / oldest first']], w.dir) + '</select><label style="display:flex;gap:6px;align-items:center;font-weight:600">Max rows <input id="wzLimit" type="number" min="1" max="10000" value="' + esc(w.limit) + '" style="width:90px"></label></div></div>' +
        '<pre class="json" id="wzSql" style="margin-top:12px;max-height:180px">' + esc(buildSql()) + '</pre>' +
        '<div class="actions" style="margin-top:12px"><button class="btn btn-gold" id="wzRun">▶ Run</button><button class="btn" id="wzEdit">Open in the SQL editor</button><button class="btn" id="wzReset">Start again</button></div>' : '');
    var re = function () { panel(); };
    var tSel = $('#wzTable'); if (tSel) tSel.onchange = function () { setTable(this.value); re(); };
    P.querySelectorAll('[data-agg]').forEach(function (s) { s.onchange = function () { w.cols[+s.getAttribute('data-agg')].agg = s.value; re(); }; });
    P.querySelectorAll('[data-rmcol]').forEach(function (b) { b.onclick = function () { w.cols.splice(+b.getAttribute('data-rmcol'), 1); re(); }; });
    P.querySelectorAll('[data-fc]').forEach(function (s) { s.onchange = function () { w.filters[+s.getAttribute('data-fc')].c = s.value; re(); }; });
    P.querySelectorAll('[data-fo]').forEach(function (s) { s.onchange = function () { w.filters[+s.getAttribute('data-fo')].op = s.value; re(); }; });
    P.querySelectorAll('[data-fv]').forEach(function (s) { s.oninput = function () { w.filters[+s.getAttribute('data-fv')].v = s.value; $('#wzSql').textContent = buildSql(); }; });
    P.querySelectorAll('[data-rmf]').forEach(function (b) { b.onclick = function () { w.filters.splice(+b.getAttribute('data-rmf'), 1); re(); }; });
    if ($('#wzAddF')) $('#wzAddF').onclick = function () { w.filters.push({ c: '', op: '=', v: '' }); re(); };
    if ($('#wzCount')) $('#wzCount').onchange = function () { w.count = this.checked; re(); };
    if ($('#wzOrder')) $('#wzOrder').onchange = function () { w.order = this.value; re(); };
    if ($('#wzDir')) $('#wzDir').onchange = function () { w.dir = this.value; re(); };
    if ($('#wzLimit')) $('#wzLimit').oninput = function () { w.limit = this.value; $('#wzSql').textContent = buildSql(); };
    if ($('#wzRun')) $('#wzRun').onclick = function () { try { run(buildSql()); S.title = 'Report: ' + w.table; S.view = 'table'; autoChart(); results(); } catch (e) { fail(e); } };
    if ($('#wzEdit')) $('#wzEdit').onclick = function () { S.sql = buildSql(); S.tab = 'editor'; draw(); };
    if ($('#wzReset')) $('#wzReset').onclick = function () { S.wiz = { table: '', cols: [], filters: [], order: '', dir: 'DESC', limit: 100 }; re(); };
    // drop targets
    P.querySelectorAll('[data-drop]').forEach(function (z) {
      z.addEventListener('dragover', function (e) { e.preventDefault(); z.classList.add('over'); });
      z.addEventListener('dragleave', function () { z.classList.remove('over'); });
      z.addEventListener('drop', function (e) {
        e.preventDefault(); z.classList.remove('over');
        var it = {}; try { it = JSON.parse(e.dataTransfer.getData('application/x-mbs') || '{}'); } catch (x) {}
        var kind = z.getAttribute('data-drop');
        if (it.table) { setTable(it.table); re(); return; }
        if (!it.col) return;
        if (w.table !== it.of) setTable(it.of);
        if (kind === 'filter') w.filters.push({ c: it.col, op: '=', v: '' });
        else if (!w.cols.some(function (x) { return x.c === it.col; })) w.cols.push({ c: it.col, agg: '' });
        re();
      });
    });
  }

  /* ---------- editor ---------- */
  // suggestions: SQL words and tables (built-in), plus the columns of the tables already in the query
  function smartHint(ed, opts) {
    var cur = ed.getCursor(), line = ed.getLine(cur.line), start = cur.ch;
    while (start > 0 && /[\w$]/.test(line.charAt(start - 1))) start--;
    var word = line.slice(start, cur.ch).toLowerCase();
    var base = window.CodeMirror.hint.sql(ed, opts) || { list: [], from: window.CodeMirror.Pos(cur.line, start), to: cur };
    if (line.charAt(start - 1) === '.' || !word) return base;
    var used = [], re = /\b(?:from|join)\s+(\w+)/gi, m, txt = ed.getValue();
    while ((m = re.exec(txt))) if (SCHEMA[m[1]] && used.indexOf(m[1]) < 0) used.push(m[1]);
    var have = base.list.map(function (x) { return typeof x === 'string' ? x : x.text; });
    var extra = [];
    (used.length ? used : Object.keys(SCHEMA)).forEach(function (t) { SCHEMA[t].forEach(function (c) { if (c.indexOf(word) === 0 && have.indexOf(c) < 0 && extra.indexOf(c) < 0) extra.push(c); }); });
    if (!extra.length) return base;
    return { list: extra.concat(base.list), from: window.CodeMirror.Pos(cur.line, start), to: cur };
  }
  function editor(P) {
    P.innerHTML = '<div class="card-h"><h2>SQL editor</h2><span class="muted" style="font-size:12.5px">Tables: ' + Object.keys(SCHEMA).map(esc).join(', ') + ' · Ctrl+Space for suggestions · Ctrl+Enter to run</span></div>' +
      '<textarea id="sqlText"></textarea>' +
      '<div class="actions" style="margin-top:12px"><button class="btn btn-gold" id="sqlRun">▶ Run</button><button class="btn" id="sqlSave">💾 Save query</button><button class="btn" id="sqlClear">Clear</button></div>';
    var hintTables = {}; Object.keys(SCHEMA).forEach(function (t) { hintTables[t] = SCHEMA[t]; });
    cm = window.CodeMirror.fromTextArea($('#sqlText'), { mode: 'text/x-sql', lineNumbers: true, lineWrapping: true, viewportMargin: Infinity,
      extraKeys: { 'Ctrl-Space': 'autocomplete', 'Ctrl-Enter': function () { $('#sqlRun').click(); }, 'Cmd-Enter': function () { $('#sqlRun').click(); } },
      hintOptions: { tables: hintTables, completeSingle: false, hint: smartHint } });
    cm.setValue(S.sql || 'SELECT *\nFROM jobs\nLIMIT 50');
    cm.on('inputRead', function (ed, ch) { if (/^[A-Za-z_.]$/.test(ch.text[0] || '') && !ed.state.completionActive) ed.showHint({ completeSingle: false }); });
    $('#sqlRun').onclick = function () { try { if (cm.getValue().trim().replace(/;\s*$/, '') !== String(S.sql).trim()) S.title = 'Query results'; run(cm.getValue()); if (!S.chart.x || S.cols.indexOf(S.chart.x) < 0) autoChart(); results(); } catch (e) { fail(e); } };
    $('#sqlClear').onclick = function () { cm.setValue(''); cm.focus(); };
    $('#sqlSave').onclick = function () {
      M.modal('<h2>Save this query</h2><label style="margin-top:12px">Name<input id="svName" value="' + esc(S.title) + '"></label><p class="muted">Saved in this browser.</p><div class="actions" style="justify-content:flex-end"><button class="btn" data-close>Cancel</button><button class="btn btn-gold" id="svGo">Save</button></div>');
      $('#svGo').onclick = function () { var l = savedList(); l.unshift({ name: $('#svName').value || 'Query', sql: cm.getValue(), at: Date.now() }); store(l.slice(0, 50)); M.closeModal(); toast('Query saved'); };
    };
  }
  function savedList() { try { return JSON.parse(localStorage.getItem('mbs-sql-saved') || '[]'); } catch (e) { return []; } }
  function store(l) { try { localStorage.setItem('mbs-sql-saved', JSON.stringify(l)); } catch (e) {} }
  function saved(P) {
    var l = savedList();
    P.innerHTML = '<h2>Saved queries</h2>' + (l.length ? '<div class="list">' + l.map(function (q, i) { return '<div class="item"><div><b>' + esc(q.name) + '</b><br><small class="ref">' + esc(q.sql.replace(/\s+/g, ' ').slice(0, 110)) + '</small></div><div class="actions"><button class="btn btn-sm btn-gold" data-load="' + i + '">Open</button><button class="btn btn-sm" data-del="' + i + '">✕</button></div></div>'; }).join('') + '</div>'
      : '<div class="empty">Nothing saved yet. Use “Save query” in the SQL editor.</div>');
    P.querySelectorAll('[data-load]').forEach(function (b) { b.onclick = function () { var q = l[+b.getAttribute('data-load')]; S.sql = q.sql; S.title = q.name; S.tab = 'editor'; draw(); }; });
    P.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { l.splice(+b.getAttribute('data-del'), 1); store(l); panel(); }; });
  }

  /* ---------- results ---------- */
  // 🏷 people read names, not IDs: a column that is only a key (project_id, job, core …) is hidden when the rows also have a name, and charts label by the name
  function isIdCol(c) { return /(^|_)id$|^(job|core|job_id|project_ref|ref)$/i.test(c); }
  function nameCol(cols) { var pref = ['project_name', 'program', 'name', 'task', 'title', 'item', 'business', 'customer', 'client', 'person', 'supplier'];
    for (var i = 0; i < pref.length; i++) if (cols.indexOf(pref[i]) >= 0) return pref[i];
    return cols.filter(function (c) { return /name|title/i.test(c) && !isIdCol(c); })[0] || cols.filter(function (c) { return !isNum(c) && !isIdCol(c); })[0] || ''; }
  function shownCols() { var nm = nameCol(S.cols); return nm ? S.cols.filter(function (c) { return !isIdCol(c) || c === nm; }) : S.cols; }
  function autoChart() {
    var x = nameCol(S.cols) || S.cols.filter(function (c) { return !isNum(c); })[0] || S.cols[0] || '';
    var y = S.cols.filter(function (c) { return isNum(c) && c !== x; }).slice(0, 3);
    S.chart = { type: S.chart.type || 'bar', x: x, y: y };
  }
  function fmt(v) { return typeof v === 'number' ? v.toLocaleString('en-AU', { maximumFractionDigits: 2 }) : v === true ? 'yes' : v === false ? 'no' : v == null ? '' : String(v); }
  function results() {
    var R = $('#sqlResults'); if (!R) return;
    var n = S.rows.length;
    R.innerHTML = '<div class="card-h"><h2>Results <span class="muted">(' + n + ' row' + (n === 1 ? '' : 's') + (S.ms != null ? ' · ' + S.ms + ' ms' : '') + ')</span></h2>' +
      '<div class="actions"><div class="tabs" style="margin:0">' + [['table', 'Table'], ['records', 'Records'], ['chart', 'Chart']].map(function (x) { return '<button class="tab' + (S.view === x[0] ? ' on' : '') + '" data-view="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<button class="btn btn-sm" id="csvBtn">⬇ CSV</button><button class="btn btn-sm btn-gold" id="pubBtn">📄 Publish as report</button></div></div><div id="resBody"></div>';
    R.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { S.view = b.getAttribute('data-view'); results(); }; });
    $('#csvBtn').onclick = downloadCsv;
    $('#pubBtn').onclick = publish;
    var B = $('#resBody');
    if (!n) { B.innerHTML = '<div class="empty">No rows match.</div>'; return; }
    if (S.view === 'table') {
      var SC = shownCols(), hid = S.cols.length - SC.length;
      B.innerHTML = (hid ? '<p class="muted" style="margin:0 0 6px;font-size:12px">' + hid + ' ID column' + (hid === 1 ? '' : 's') + ' hidden (the names show instead); the CSV keeps ' + (hid === 1 ? 'it' : 'them') + '.</p>' : '') + '<div class="table-wrap"><table><thead><tr>' + SC.map(function (c) { return '<th' + (isNum(c) ? ' style="text-align:right"' : '') + '>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        S.rows.slice(0, 500).map(function (r) { return '<tr' + (r.any_expired === true || r.compliance === 'expired' ? ' class="sq-exp"' : '') + '>' + SC.map(function (c) { return '<td' + (typeof r[c] === 'number' ? ' style="text-align:right"' : '') + '>' + flagCell(c, r[c]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
        (n > 500 ? '<p class="muted">Showing the first 500 rows. Download the CSV for all of them.</p>' : '');
    } else if (S.view === 'records') {
      B.innerHTML = '<div class="recs">' + S.rows.slice(0, 100).map(function (r, i) { return '<div class="rec"><div class="muted" style="font-size:11.5px;font-weight:800">#' + (i + 1) + '</div><dl class="kv">' + shownCols().map(function (c) { return '<dt>' + esc(c) + '</dt><dd>' + flagCell(c, r[c]) + '</dd>'; }).join('') + '</dl></div>'; }).join('') + '</div>' +
        (n > 100 ? '<p class="muted">Showing the first 100 records.</p>' : '');
    } else chartView(B);
  }
  var TYPES = [['bar', 'Bar'], ['hbar', 'Horizontal bar'], ['stacked', 'Stacked bar'], ['line', 'Line'], ['area', 'Area'], ['pie', 'Pie'], ['doughnut', 'Doughnut'], ['polarArea', 'Polar area'], ['radar', 'Radar']];
  function chartView(B) {
    var c = S.chart;
    B.innerHTML = '<div class="row" style="margin-bottom:12px"><label style="display:flex;gap:6px;align-items:center;font-weight:700">Chart<select id="chType" style="width:auto">' + TYPES.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === c.type ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></label>' +
      '<label style="display:flex;gap:6px;align-items:center;font-weight:700">Labels (X)<select id="chX" style="width:auto">' + S.cols.map(function (x) { return '<option' + (x === c.x ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></label>' +
      '<span style="font-weight:700">Values (Y):</span>' + S.cols.filter(isNum).map(function (y) { return '<label style="display:flex;gap:4px;align-items:center;font-weight:600"><input type="checkbox" data-y="' + esc(y) + '" style="width:auto"' + (c.y.indexOf(y) >= 0 ? ' checked' : '') + '>' + esc(y) + '</label>'; }).join('') + '</div>' +
      '<div class="chart-box"><canvas id="chCanvas"></canvas></div>';
    $('#chType').onchange = function () { c.type = this.value; drawChart(); };
    $('#chX').onchange = function () { c.x = this.value; drawChart(); };
    B.querySelectorAll('[data-y]').forEach(function (b) { b.onchange = function () { var y = b.getAttribute('data-y'); c.y = b.checked ? c.y.concat([y]) : c.y.filter(function (v) { return v !== y; }); drawChart(); }; });
    drawChart();
  }
  function chartConfig(still) {
    var c = S.chart;
    var ys = c.y.filter(function (y) { return S.cols.indexOf(y) >= 0; });
    if (!ys.length) { var n0 = S.cols.filter(isNum)[0]; if (n0) ys = [n0]; }
    var rows = S.rows.slice(0, 300), labels = rows.map(function (r) { return fmt(r[c.x]) || '(blank)'; });
    var round = ['pie', 'doughnut', 'polarArea'].indexOf(c.type) >= 0;
    var type = c.type === 'hbar' || c.type === 'stacked' ? 'bar' : c.type === 'area' ? 'line' : c.type;
    var sets = (round ? ys.slice(0, 1) : ys).map(function (y, i) {
      var col = COLORS[i % COLORS.length];
      return { label: y, data: rows.map(function (r) { return Number(r[y]) || 0; }),
        backgroundColor: round ? rows.map(function (_, k) { return COLORS[k % COLORS.length]; }) : (c.type === 'area' || c.type === 'radar' ? col + '55' : col),
        borderColor: round ? '#fff' : col, borderWidth: round ? 2 : 2, fill: c.type === 'area' || c.type === 'radar', tension: 0.25, pointRadius: 3 };
    });
    // 🔢 every chart says what it shows: the value on each slice or bar, its % of the total, and what 100% is
    var y0 = ys[0] || '', nice = function (y) { return String(y || '').replace(/_/g, ' '); };
    var sumOk = function (y) { return /count|(^|_)n$|total|value|cost|budget|amount|profit|invoic|received|owed|spent|earned|planned|contract|qty|quantity|hours|tasks|risks|issues|projects|milestones|people|jobs|sum|revenue|loss/i.test(y) && !/pct|percent|cpi|spi|ratio|rate|avg|average|mean|margin|score|index|days|elevation/i.test(y); };
    var vals = sets.length ? sets[0].data : [], total = vals.reduce(function (a, v) { return a + (v > 0 ? v : 0); }, 0);
    var pctOn = sets.length === 1 && total > 0 && vals.every(function (v) { return v >= 0; }) && (round || sumOk(y0));
    var pctOf = function (v) { var p = v / total * 100; return p >= 10 || p === 0 ? Math.round(p) + '%' : (Math.round(p * 10) / 10) + '%'; };
    var lab = function (v) { return fmt(v) + (pctOn ? ' (' + pctOf(v) + ')' : ''); };
    var sub = pctOn ? 'Total ' + nice(y0) + ': ' + fmt(total) + ' = 100%' : '';
    var many = rows.length > (round ? 16 : 40);
    var valuePlugin = { id: 'champVals', afterDatasetsDraw: function (ch) {
      if (many || type === 'line' || type === 'radar') return;
      var x = ch.ctx; x.save(); x.font = '600 11.5px Poppins, system-ui, sans-serif'; x.textBaseline = 'middle';
      ch.data.datasets.forEach(function (ds, di) { var meta = ch.getDatasetMeta(di); if (meta.hidden) return;
        meta.data.forEach(function (el, k) { var v = ds.data[k]; if (v == null || (round && !(v > 0))) return;
          if (round) { if (total && v / total < 0.04) return; var p = el.tooltipPosition(); x.textAlign = 'center'; x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 3;
            x.fillText(fmt(v), p.x, p.y - (pctOn ? 7 : 0)); if (pctOn) x.fillText(pctOf(v), p.x, p.y + 8); x.shadowBlur = 0; return; }
          if (c.type === 'stacked') return;
          var hz = c.type === 'hbar', t = sets.length === 1 ? lab(v) : fmt(v); x.fillStyle = '#1F2937';
          if (hz) { x.textAlign = v < 0 ? 'right' : 'left'; x.fillText(t, el.x + (v < 0 ? -5 : 5), el.y); } else { x.textAlign = 'center'; x.textBaseline = v < 0 ? 'top' : 'bottom'; x.fillText(t, el.x, el.y + (v < 0 ? 4 : -4)); x.textBaseline = 'middle'; }
        }); });
      if (c.type === 'doughnut' && pctOn) { var m0 = ch.getDatasetMeta(0), a0 = m0.data[0]; if (a0) { x.textAlign = 'center'; x.fillStyle = '#6B7280'; x.font = '600 11px Poppins, system-ui, sans-serif'; x.fillText('Total (100%)', a0.x, a0.y - 10); x.fillStyle = '#111827'; x.font = '800 18px Poppins, system-ui, sans-serif'; x.fillText(fmt(total), a0.x, a0.y + 10); } }
      x.restore(); } };
    var legendLabels = round ? { generateLabels: function (ch) { var L = window.Chart.overrides.doughnut.plugins.legend.labels.generateLabels(ch); L.forEach(function (it, k) { var v = ch.data.datasets[0].data[k]; it.text = it.text + ': ' + lab(v); }); return L; } } : {};
    return { type: type, data: { labels: labels, datasets: sets },
      options: { responsive: !still, maintainAspectRatio: false, animation: still ? false : { duration: 300 }, devicePixelRatio: still ? 2 : undefined, indexAxis: c.type === 'hbar' ? 'y' : 'x',
        layout: { padding: { right: c.type === 'hbar' ? 90 : 10, top: round ? 6 : 20 } },
        plugins: { legend: { display: round || sets.length > 1, position: 'bottom', labels: legendLabels }, title: { display: !!S.title, text: S.title, font: { size: 15, weight: '700' } },
          subtitle: { display: !!sub, text: sub, color: '#6B7280', font: { size: 12, weight: '600' }, padding: { bottom: 8 } },
          tooltip: { callbacks: { label: function (ctx) { var v = ctx.raw; return ' ' + (ctx.dataset.label ? nice(ctx.dataset.label) + ': ' : '') + (sets.length === 1 ? lab(v) : fmt(v)); } } } },
        scales: round || c.type === 'radar' ? {} : { x: { stacked: c.type === 'stacked', title: { display: c.type === 'hbar' && sets.length === 1, text: nice(y0) } }, y: { stacked: c.type === 'stacked', beginAtZero: true, ticks: { autoSkip: !(c.type === 'hbar' && rows.length <= 40) }, title: { display: c.type !== 'hbar' && sets.length === 1, text: nice(y0) } } } },
      plugins: [valuePlugin, { id: 'white', beforeDraw: function (ch) { var x = ch.ctx; x.save(); x.globalCompositeOperation = 'destination-over'; x.fillStyle = '#fff'; x.fillRect(0, 0, ch.width, ch.height); x.restore(); } }] };
  }
  function hasNumbers() { return S.cols.some(isNum); }
  function drawChart() {
    var cv = $('#chCanvas'); if (!cv) return;
    if (chartObj) { chartObj.destroy(); chartObj = null; }
    if (!hasNumbers()) { cv.parentNode.innerHTML = '<div class="empty">These results have no number columns to chart. Try a query with COUNT(*) or SUM(…).</div>'; return; }
    chartObj = new window.Chart(cv, chartConfig(false));
  }
  function downloadCsv() {
    var cell = function (v) { var s = fmt(v).replace(/,(?=\d{3})/g, ''); if (typeof v === 'number') s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var csv = '﻿' + [S.cols.join(',')].concat(S.rows.map(function (r) { return S.cols.map(function (c) { return cell(r[c]); }).join(','); })).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = (S.title || 'query').replace(/[^\w-]+/g, '-') + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- publish as a report (DeepSeek + PDF) ---------- */
  function chartImage() {
    if (!hasNumbers()) return '';
    var cv = document.createElement('canvas'); cv.width = 1000; cv.height = 460; cv.style.cssText = 'position:fixed;left:-9999px;top:0;width:1000px;height:460px';
    document.body.appendChild(cv);
    var ch = new window.Chart(cv, chartConfig(true));
    var img = ch.toBase64Image('image/png', 1);
    ch.destroy(); cv.remove();
    return img;
  }
  function publish() {
    if (!S.rows.length) return fail(new Error('Run a query with some results first'));
    M.modal('<h2>Publish as a report</h2><div class="form" style="grid-template-columns:1fr;margin-top:12px">' +
      '<label>Report title<input id="rpTitle" value="' + esc(S.title) + '"></label>' +
      '<label>What should the report focus on? (optional)<textarea id="rpFocus" rows="2" placeholder="e.g. which months were best, and what to do about unpaid invoices"></textarea></label>' +
      (hasNumbers() ? '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="rpChart" checked style="width:auto">Include the chart (' + esc((TYPES.filter(function (t) { return t[0] === S.chart.type; })[0] || ['', 'Bar'])[1]) + ')</label>' : '<input type="checkbox" id="rpChart" hidden><p class="muted" style="margin:0">No chart: these results have no number columns.</p>') +
      '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="rpTable" checked style="width:auto">Include the data table (first 40 rows)</label>' +
      '<p class="note" style="margin:0">DeepSeek writes the summary from the results. Phone numbers, emails, addresses and customer names are removed before anything is sent to it.</p></div>' +
      '<div id="rpOut"></div><div class="actions" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-close>Close</button><button class="btn btn-gold" id="rpGo">✨ Write report with AI</button></div>');
    $('#rpGo').onclick = function () {
      var b = this; b.disabled = true; b.textContent = 'Writing…';
      api('sqlNarrative', { title: $('#rpTitle').value, focus: $('#rpFocus').value, sql: S.sql, columns: S.cols, rows: S.rows.slice(0, 200) }).then(function (n) {
        $('#rpOut').innerHTML = '<div class="card" style="margin-top:14px;box-shadow:none">' + (n.note ? '<p class="warn" style="margin:0 0 10px">' + esc(n.note) + '</p>' : '') +
          '<label>Title<input id="rpT2" value="' + esc(n.title || $('#rpTitle').value) + '"></label><label style="margin-top:10px">Summary<textarea id="rpSum" rows="3">' + esc(n.summary) + '</textarea></label>' +
          '<label style="margin-top:10px">Key findings (one per line)<textarea id="rpIns" rows="4">' + esc((n.insights || []).join('\n')) + '</textarea></label>' +
          '<label style="margin-top:10px">Suggested actions (one per line)<textarea id="rpRec" rows="2">' + esc((n.recommendations || []).join('\n')) + '</textarea></label>' +
          '<p class="muted" style="margin:8px 0 0;font-size:12.5px">Edit anything before downloading.</p></div>';
        b.disabled = false; b.textContent = '⬇ Download PDF';
        b.onclick = function () {
          b.disabled = true; b.textContent = 'Making the PDF…';
          var lines = function (id) { return $(id).value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); };
          fetch(M.API, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1', 'X-Champ-Lang': (window.ChampI18n && window.ChampI18n.get()) || 'en' },
            body: JSON.stringify({ action: 'sqlPdf', title: $('#rpT2').value, summary: $('#rpSum').value, insights: lines('#rpIns'), recommendations: lines('#rpRec'), ai: !!n.ai,
              sql: S.sql, columns: $('#rpTable').checked ? S.cols : [], rows: $('#rpTable').checked ? S.rows.slice(0, 200) : [], chart: $('#rpChart').checked ? chartImage() : '' }) })
            .then(function (r) { if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'PDF failed'); }); return r.blob(); })
            .then(function (blob) {
              var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ($('#rpT2').value || 'MBS report').replace(/[^\w-]+/g, '-') + '.pdf'; document.body.appendChild(a); a.click(); a.remove();
              toast('Report downloaded'); b.disabled = false; b.textContent = '⬇ Download PDF';
            }).catch(function (e) { b.disabled = false; b.textContent = '⬇ Download PDF'; fail(e); });
        };
      }).catch(function (e) { b.disabled = false; b.textContent = '✨ Write report with AI'; fail(e); });
    };
  }

  M.addView('sql', 'Ask AI & reports', function (args) { if (args && ['ask', 'templates', 'wizard', 'editor', 'saved'].indexOf(args[0]) >= 0) S.tab = args[0]; return page(); });
  window.MBS.sqlState = S;   // for tests
  // other pages (e.g. Customers) can send a question straight to the AI query
  M.askAI = function (q) { S.pendingQ = String(q || ''); S.tab = 'ask'; if (location.hash === '#sql/ask') page(); else location.hash = '#sql/ask'; };
})();
