/* GKH Project Champ: ❓ Help in the console. The help articles (assets/help/articles.js):
   #help (search and areas), #help/<article>/<section> (one article, opened at that section).
   The ? next to each screen's title opens the article for that screen in Champ's panel. */
(function () {
  'use strict';
  var M = window.MBS; if (!M) return;
  var esc = M.esc, $ = function (s) { return document.querySelector(s); };
  var H = null, load = function () { if (!H) H = import('../assets/help/articles.js?v=2'); return H; };

  // 🌳 the Champ circuit tree: the whole app on one screen, opened full screen (admin-tree.js)
  var TREE = '<div class="card hc-tree"><span class="hc-ti" aria-hidden="true">🌳</span><div><h3>The Champ circuit tree</h3><p>See all of Project Champ on one screen: foundations, the core, every area and feature. Tap a branch to send current through it.</p></div><button class="btn btn-gold" type="button" data-tree>Open full screen</button></div>';
  // 📋 the feature inventory: every Help article is a key feature and each of its sections a sub-feature, plus the features built since
  var NEWF = {
    'Getting started': [['Champ circuit tree', ['On the Features page', 'Full screen from Help', '"Open tree" in Champ']]],
    'Leadership views': [['CEO view', ['Portfolio health at a glance', 'Money across every project', 'AI briefing', 'Ask the CEO adviser']], ['PMO view', ['Decisions waiting', 'Programs and their health', 'Watch list', 'Milestones due', 'Escalations', 'Team gaps']], ['Program view (program managers)', ['Their programs only', 'Their projects', 'Their people']]],
    'Projects': [['New project set-up', ['Choose or create a program first', 'Site or location look-up (town, state, postcode, country)']], ['BIM model viewer', ['3D model in the project']], ['Archived projects', ['Archive', 'Restore']]],
    'Governance & control': [['RAID log (in each project)', ['Four quadrants', 'One register with filters', 'Log order or worst first', 'Risk heat map', 'Due in the next 14 days', 'Assumptions register', 'Outside dependencies', 'Links from the Dependency board', 'Assumption turns into a risk', 'Find RAID items with AI', 'Excel export', 'PDF export']], ['RAID log across the portfolio', ['Every project you can see', 'Program filter', 'Projects to look at']], ['Ask AI: 3 possible solutions', ['Risks', 'Issues', 'Assumptions', 'Dependencies', 'The recommended solution']]],
    'People & teams': [['Leave', ['Leave', 'My leave']]],
    'Customers & reports': [['Customers', ['Customer list', 'Customer page']]],
    'Admin & access': [['Personas', ['CEO', 'CFO', 'PMO Director', 'Program manager', 'Project manager', 'Scrum Master', 'Product Owner', 'Finance personnel', 'Site administrator', 'Contractor', 'Project personnel', 'Custom']], ['Access by program and project', ['Programs picker', 'Projects picker', 'Job title', 'Role follows the login', 'Money only for those who need it']]],
    'Finance & billing': [['Finance and billing', ['Milestone billing', 'Invoices and PDFs', 'Aging', 'Raised by delivery leads', 'Internal projects have no billing']], ['Finance vault', ['Private document store', 'AI redaction', 'Access for delivery leads']], ['Milestone billing on the Gantt', ['Billing shown on the milestone']], ['Accounting & BAS', ['BAS figures']], ['Expenses', ['Expense records']], ['Payroll', ['Pay runs']], ['Inventory & suppliers', ['Inventory', 'Suppliers']], ['Sub-contractors', ['Sub-contractor register']]]
  };
  function inventory(m) {
    var names = m.AREAS.map(function (a) { return a.n; }), order = ['Getting started', 'Leadership views'].concat(names.filter(function (n) { return n !== 'Getting started' && n !== 'The website'; }), ['Finance & billing', 'The website']);
    var K = 0, S = 0, D = [0, 0], body = order.map(function (n) {
      var ar = m.AREAS.filter(function (a) { return a.n === n; })[0];
      var rows = (ar ? m.ARTICLES.filter(function (a) { return a.a === ar.id; }).map(function (a) { return { t: a.t, id: a.id, subs: (a.subs || []).map(function (x) { return x.h; }) }; }) : [])
        .concat((NEWF[n] || []).map(function (x) { return { t: x[0], subs: x[1], nw: 1 }; }));
      if (!rows.length) return '';
      var k = rows.length, sb = rows.reduce(function (t, r) { return t + r.subs.length; }, 0); K += k; S += sb;
      rows.forEach(function (r) { if (!r.nw) { D[0]++; D[1] += r.subs.length; } });
      return '<div class="card hc-inv"><h3>' + (ar ? ar.i + ' ' : '') + esc(n) + ' <small class="muted">' + k + ' key · ' + sb + ' sub</small></h3><div class="table-wrap"><table class="rt"><thead><tr><th>Key feature</th><th>Sub-features</th><th class="num">Count</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><td>' + (r.id ? '<a href="#help/' + esc(r.id) + '">' + esc(r.t) + '</a>' : esc(r.t) + ' <span class="hc-new">new</span>') + '</td><td>' + r.subs.map(esc).join('; ') + '</td><td class="num">' + r.subs.length + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    }).join('');
    return { K: K, S: S, html: '<div class="card hc-art"><p><a href="#help">← All help</a></p><h2>Project Champ feature inventory</h2>' +
      '<p class="hc-big"><b>' + K + '</b> key features · <b>' + S + '</b> sub-features · <b>' + (K + S) + '</b> in all</p>' +
      '<p class="muted">Each Help article is a key feature and each of its sections a sub-feature (' + D[0] + ' and ' + D[1] + '). Features built since Help was written are marked <span class="hc-new">new</span> (' + (K - D[0]) + ' and ' + (S - D[1]) + '). Click a feature to read how it works.</p></div>' + body };
  }
  function view(parts) {
    var mine = location.hash;   // a later screen owns the view if the user moved on while the articles loaded
    return load().then(function (m) {
      if (location.hash !== mine) return;
      var V = M.view(), id = parts[0] || '', sub = parts[1] || '';
      var areaOf = function (a) { return m.AREAS.filter(function (x) { return x.id === a; })[0] || { n: '', i: '' }; };
      var top = '<form class="hc-find" id="hcF" role="search"><input id="hcQ" type="search" placeholder="Search the help: bold a task, sticky note, approve the budget…" aria-label="Search the help"><button class="btn btn-gold" type="submit">Search</button><button class="btn" type="button" id="hcChamp">🎙 Ask Champ</button></form>';
      if (/^q=/.test(id)) {
        var q = id.slice(2), r = m.search(q, 12);   // the router has decoded it already
        V.innerHTML = top + '<div class="card hc-list"><p class="muted">' + (r.length ? r.length + ' results for “' + esc(q) + '”' : 'Nothing found for “' + esc(q) + '”. Try other words, or ask Champ.') + '</p>' +
          r.map(function (x) { var a = m.byId(x.id); return '<a href="#help/' + esc(x.id) + '/' + esc(x.sub) + '"><b>' + esc(x.h) + '</b><small>' + areaOf(a.a).i + ' ' + esc(a.t) + '</small></a>'; }).join('') + '</div>';
        if (/tree|circuit|pokok|overview of champ|whole app/i.test(q)) V.querySelector('.hc-list').insertAdjacentHTML('beforebegin', TREE);
        $('#hcQ').value = q;
      } else if (id === 'features') {
        V.innerHTML = top + inventory(m).html;
      } else if (id && m.byId(id)) {
        var a = m.byId(id), ar = areaOf(a.a), go = a.w && /^#/.test(a.w) && a.w.indexOf('<project>') < 0 ? a.w : '';
        var tour = a.g && M.guide && M.guide.tours.filter(function (t) { return t.id === a.g; })[0];
        V.innerHTML = top + '<div class="card hc-art"><p><a href="#help">← All help</a> <span class="muted">· ' + ar.i + ' ' + esc(ar.n) + '</span></p>' +
          '<h2>' + esc(a.t) + '</h2><p class="muted">' + esc(a.s) + '</p>' +
          '<p class="hc-acts">' + (tour ? '<button class="btn btn-gold btn-sm" type="button" id="hcShow">▶ Show me on screen</button>' : '') + (go ? '<a class="btn btn-sm" href="' + esc(go) + '">Go there →</a>' : '') + '</p>' +
          ((a.subs || []).length > 1 ? '<nav class="hc-toc">' + a.subs.map(function (s) { return '<a href="#help/' + esc(a.id) + '/' + esc(s.id) + '">' + esc(s.h) + '</a>'; }).join('') + '</nav>' : '') +
          (a.subs || []).map(function (s) { return '<section class="hc-sub' + (s.id === sub ? ' hit' : '') + '" id="hcs-' + esc(s.id) + '"><h3>' + esc(s.h) + '</h3><ol>' + s.st.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' + (s.tip ? '<p class="hc-tip">💡 ' + esc(s.tip) + '</p>' : '') + '</section>'; }).join('') +
          '</div>';
        if ($('#hcShow')) $('#hcShow').onclick = function () { M.guide.start(a.g); };
        var el = sub && document.getElementById('hcs-' + sub); if (el) setTimeout(function () { if (location.hash === mine) el.scrollIntoView({ block: 'start' }); }, 30);
      } else {
        var inv = inventory(m);
        V.innerHTML = top + TREE + '<div class="card hc-tree hc-inv-card"><span class="hc-ti" aria-hidden="true">📋</span><div><h3>Project Champ feature inventory</h3><p>' + inv.K + ' key features and ' + inv.S + ' sub-features (' + (inv.K + inv.S) + ' in all), area by area.</p></div><a class="btn btn-gold" href="#help/features">Open the inventory</a></div>' + '<div class="hc-areas">' + m.AREAS.map(function (ar) {
          return '<div class="card hc-area"><h3>' + ar.i + ' ' + esc(ar.n) + '</h3>' + m.ARTICLES.filter(function (a) { return a.a === ar.id; }).map(function (a) { return '<a href="#help/' + esc(a.id) + '">' + esc(a.t) + '</a>'; }).join('') + '</div>';
        }).join('') + '</div>';
      }
      var tb = V.querySelector('[data-tree]'); if (tb) tb.onclick = function () { if (M.openTree) M.openTree(); };
      $('#hcF').onsubmit = function (e) { e.preventDefault(); var v = $('#hcQ').value.trim(); location.hash = v ? '#help/q=' + encodeURIComponent(v) : '#help'; };
      $('#hcChamp').onclick = function () { var v = $('#hcQ').value.trim(); if (M.guide) { if (v) M.guide.ask(v); else M.guide.ask('help'); } };
    });
  }
  M.addView('help', 'Help', view, 'help');

  // ? next to the title: the article for the screen you are on, in Champ's panel
  function qBtn() {
    if ($('#helpQ')) return; var t = $('#title'); if (!t) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'helpQ'; b.className = 'help-q'; b.textContent = '?';
    b.title = 'Help for this screen'; b.setAttribute('aria-label', 'Help for this screen');
    b.onclick = function () {
      if (/^#help/.test(location.hash)) { location.hash = '#help'; return; }
      load().then(function (m) { var id = m.forRoute(location.hash); if (M.guide && M.guide.help) return M.guide.help(id); location.hash = '#help/' + id; }).catch(M.fail);
    };
    t.insertAdjacentElement('afterend', b);
  }
  qBtn(); document.addEventListener('DOMContentLoaded', qBtn);
})();
