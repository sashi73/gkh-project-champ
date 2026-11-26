/* GKH Project Champ: 🗄 the Sustainability vault (menu: ESG & Sustainability).
   One vault per organisation, across every year: the data as it is gathered month by month, the evidence filed by year and month,
   and the analysis: the GKH ESG Progress Index (base year = 100, like a share index) and emissions against the target path.
   Server: netlify/lib/esg-vault.mjs. Method and log: docs/ESG-REGISTRY.md §7c. */
(function () {
  'use strict';
  var M = window.MBS; if (!M) return;
  var api = M.api, esc = M.esc, toast = M.toast, fail = M.fail, $ = M.$;
  var view = function () { return document.getElementById('view'); };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var V = { key: '', tab: 'performance', A: null, fy: null, cat: 'Energy', q: '', folder: '' };
  var nf = function (v, d) { return v == null || v === '' || isNaN(v) ? '–' : Number(v).toLocaleString('en-AU', { maximumFractionDigits: d == null ? 0 : d }); };
  var when = function (t) { return t ? new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; };
  var size = function (b) { return !b ? '' : b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; };
  var rag = function (s) { return s === 'On track' ? 'green' : s === 'Close' ? 'amber' : s === 'Off track' ? 'red' : 'grey'; };
  function tile(k, v, s, c) { return '<div class="card kpi rag-card rag-b-' + (c || 'grey') + '"><div class="k">' + esc(k) + ' <span class="dot dot-' + (c || 'grey') + '"></span></div><div class="v" style="font-size:20px">' + esc(v) + '</div><div class="s">' + esc(s) + '</div></div>'; }
  // the months of a financial year, in order: [{ p: 'YYYY-MM', l: 'Jul 25' }]
  function fyMonths(fy, start) { var L = []; for (var i = 0; i < 12; i++) { var m0 = (start - 1 + i) % 12, y = start <= 1 ? fy : m0 >= start - 1 ? fy - 1 : fy; L.push({ p: y + '-' + ('0' + (m0 + 1)).slice(-2), l: MON[m0] + ' ' + String(y).slice(2) }); } return L; }
  var curFy = function (start) { var d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1; return start <= 1 ? y : m >= start ? y + 1 : y; };
  var fyLabel = function (fy) { return ((V.A && V.A.fyStart > 1) ? 'FY' : '') + fy; };

  /* ---------- the vaults ---------- */
  function listPage() {
    view().innerHTML = '<div class="empty">Opening the vaults…</div>';
    return api('esgVaultOrgs', {}).then(function (d) {
      var L = d.orgs || [];
      view().innerHTML = '<div class="row plan-head" style="margin-bottom:12px"><h2 style="font-size:21px">🗄 Sustainability vault</h2><span class="muted">The data month by month, the evidence behind it, and the year-on-year progress towards the targets</span><span class="sp"></span><button class="btn btn-gold" id="svNew" type="button">＋ Open a vault</button></div>' +
        '<div class="card esg-intro"><div class="esg-steps">' + [['1', 'Gather', 'Record electricity, fuels, water, waste, safety and people each month, from bills, meters and systems, and file the evidence by year and month.'],
          ['2', 'Compare', 'The GKH ESG Progress Index starts at 100 in the base year and moves as the organisation improves, like a share index, so every year is comparable.'],
          ['3', 'Track the target', 'Emissions are set against the straight-line path to your reduction target and net zero, with the yearly cut still needed.']].map(function (s) { return '<div class="esg-step"><b>' + s[0] + '</b><div><h4>' + s[1] + '</h4><p class="muted">' + s[2] + '</p></div></div>'; }).join('') + '</div></div>' +
        (L.length ? '<div class="esg-cards">' + L.map(function (o) { return '<a class="card esg-ent" href="#svault/' + esc(o.key) + '/performance"><div class="row" style="gap:8px"><b class="esg-ent-n">' + esc(o.name) + '</b><span class="sp"></span>' + (o.vault ? '<span class="pill t-green">Vault open</span>' : '<span class="pill">No vault yet</span>') + '</div>' +
          '<div class="esg-ent-k" style="margin-top:10px"><span><small>ESG reports</small><b>' + o.reports.length + '</b></span><span><small>Monthly values</small><b>' + nf(o.records || 0) + '</b></span><span><small>Evidence files</small><b>' + nf(o.docs || 0) + '</b></span></div>' +
          '<div class="esg-std">' + o.reports.map(function (r) { return '<span>' + esc(r.year || 'Report') + '</span>'; }).join('') + '</div></a>'; }).join('') + '</div>' : '<div class="card empty" style="padding:36px">No organisations yet. Start an ESG report in 🌿 ESG &amp; Sustainability, or open a vault for an organisation.</div>');
      $('#svNew').onclick = function () {
        M.modal('<h2>🗄 Open a vault</h2><p class="muted" style="margin:4px 0 12px">One vault per organisation, kept across every year. Pick an organisation that has ESG reports, or name a new one.</p><div class="form"><label class="full">Organisation<input id="svName" list="svOrgs" maxlength="120" placeholder="e.g. GKH EcoVista Holdings"><datalist id="svOrgs">' + L.map(function (o) { return '<option value="' + esc(o.name) + '">'; }).join('') + '</datalist></label></div>' +
          '<div class="actions" style="justify-content:flex-end"><button class="btn" data-close type="button">Cancel</button><button class="btn btn-gold" id="svGo" type="button">Open</button></div>');
        $('#svGo').onclick = function () { var n = $('#svName').value.trim(); if (!n) return toast('Name the organisation'); var o = L.filter(function (x) { return x.name.toLowerCase() === n.toLowerCase(); })[0];
          api('esgVaultOpen', { key: o ? o.key : '', name: o ? o.name : n }).then(function (r) { var m = document.getElementById('modal'); if (M.closeModal) M.closeModal(); else if (m && m.close) m.close(); location.hash = '#svault/' + r.vault.key + '/performance'; }).catch(fail); };
      };
    });
  }

  /* ---------- one vault ---------- */
  var TABS = [['performance', '📈 Performance'], ['data', '📅 Data by month'], ['evidence', '📎 Evidence'], ['target', '🎯 Target and settings']];
  function vaultPage(key, tab) {
    V.tab = TABS.some(function (t) { return t[0] === tab; }) ? tab : 'performance';
    var go = function () { draw(); };
    if (V.A && V.key === key) { go(); return Promise.resolve(); }
    view().innerHTML = '<div class="empty">Opening the vault…</div>';
    return api('esgVaultOpen', { key: key }).then(function () { return load(key); }).then(go);
  }
  function load(key) { return api('esgVaultGet', { key: key || V.key }).then(function (a) { V.A = a; V.key = a.key; if (!V.fy) V.fy = curFy(a.fyStart); }); }
  function draw() {
    var A = V.A; document.title = A.name + ' · Sustainability vault · GKH Project Champ';
    view().innerHTML = '<div class="row plan-head" style="margin-bottom:12px"><a class="btn btn-sm" href="#svault">← Vaults</a><h2 style="font-size:21px">🗄 ' + esc(A.name) + '</h2><span class="muted">' + A.reports.length + ' ESG report' + (A.reports.length === 1 ? '' : 's') + ' · ' + nf((A.vault && A.vault.records || []).length) + ' monthly values · ' + nf((A.vault && A.vault.docs || []).length) + ' evidence files</span><span class="sp"></span><span class="muted" id="svSaved" aria-live="polite"></span></div>' +
      '<div class="grid pkpis">' + tiles() + '</div>' +
      '<div class="esg-sub" role="tablist" aria-label="Sustainability vault">' + TABS.map(function (t) { return '<a role="tab" href="#svault/' + esc(A.key) + '/' + t[0] + '" class="' + (V.tab === t[0] ? 'on' : '') + '" aria-selected="' + (V.tab === t[0]) + '">' + esc(t[1]) + '</a>'; }).join('') + '</div><div id="svBody"></div>';
    body();
  }
  function tiles() {
    var A = V.A, I = A.index.filter(function (x) { return x.value != null && !x.partial; }), li = I[I.length - 1], T = A.target, tr = T.track.filter(function (t) { return t.actual != null && !t.partial; }), lt = tr[tr.length - 1];
    var R = (A.vault && A.vault.records) || [], fyNow = curFy(A.fyStart), mNow = fyMonths(fyNow, A.fyStart).map(function (m) { return m.p; }), got = mNow.filter(function (p) { return R.some(function (r) { return r.period === p; }); }).length;
    return tile('ESG Progress Index', li ? nf(li.value, 1) : '–', li ? (li.yoy != null ? (li.yoy >= 0 ? '▲ ' : '▼ ') + Math.abs(li.yoy) + '% on the year before · ' : '') + 'base ' + fyLabel(A.base) + ' = 100' : 'Needs two years of data', li ? (li.value >= 100 ? 'green' : li.value >= 95 ? 'amber' : 'red') : 'grey') +
      tile('Emissions (Scope ' + T.scope + ')', lt ? nf(lt.actual) + ' tCO2e' : '–', lt && T.baseT ? (lt.actual <= T.baseT ? '▼ ' : '▲ ') + nf(Math.abs((lt.actual / T.baseT - 1) * 100), 1) + '% against ' + fyLabel(T.baseYear) : 'Set the base year', lt && T.baseT ? (lt.actual <= T.baseT ? 'green' : 'red') : 'grey') +
      tile('Target', lt && lt.status ? lt.status : T.tgtPct != null ? 'Set' : 'Not set', T.tgtPct != null ? '−' + T.tgtPct + '% by ' + (T.tgtYear || '?') + (T.needPct != null ? ' · needs −' + T.needPct + '% a year' : '') : 'Set it in Target and settings', lt ? rag(lt.status) : 'grey') +
      tile('Data gathered ' + fyLabel(fyNow), got + ' of 12 months', nf(R.filter(function (r) { return mNow.indexOf(r.period) >= 0; }).length) + ' values · ' + nf(((A.vault && A.vault.docs) || []).filter(function (d) { return mNow.indexOf(d.period) >= 0; }).length) + ' files', got >= 9 ? 'green' : got >= 4 ? 'amber' : 'grey');
  }
  function body() { var b = $('#svBody'); b.innerHTML = V.tab === 'data' ? dataTab() : V.tab === 'evidence' ? evidenceTab() : V.tab === 'target' ? targetTab() : perfTab(); wire(b); }
  function say(t) { var s = $('#svSaved'); if (s) s.textContent = t; }

  /* ---------- 📈 performance ---------- */
  function perfTab() {
    var A = V.A, I = A.index, T = A.target;
    if (!A.rows.length) return '<div class="card empty" style="padding:30px">No data yet. Add monthly data in <a href="#svault/' + esc(A.key) + '/data">Data by month</a>, or write an ESG report for this organisation.</div>';
    var last = I.filter(function (x) { return x.value != null && !x.partial; }).pop() || I[I.length - 1];
    return '<div class="esg-ov">' +
      '<div class="card"><h3>GKH ESG Progress Index</h3><p class="muted" style="font-size:12.5px;margin:-4px 0 8px">Base ' + esc(fyLabel(A.base)) + ' = 100. Above 100: better than the base year. A year still being gathered joins once its 12 months are in.</p>' + lineChart(I.filter(function (x) { return !x.partial; }).map(function (x) { return { l: x.label, v: x.value }; }), 100, 'index') + '</div>' +
      '<div class="card"><h3>Emissions against the target path</h3><p class="muted" style="font-size:12.5px;margin:-4px 0 8px">Scope ' + esc(T.scope) + ', tCO2e. Bars: actual. Line: the straight path from ' + esc(fyLabel(T.baseYear || '')) + ' to ' + (T.tgtPct != null ? '−' + T.tgtPct + '% by ' + T.tgtYear : 'the target') + (T.nzYear ? ' and net zero by ' + T.nzYear : '') + '.</p>' + barPath(T.track) +
        (T.needPct != null ? '<div class="esg-avoid-note">To reach the target from ' + fyLabel(T.latest) + ', emissions must fall by <b>' + T.needPct + '% a year</b>' + (T.ratePct != null ? ' (so far: ' + (T.ratePct >= 0 ? '−' : '+') + Math.abs(T.ratePct) + '% a year)' : '') + (T.achievedPct != null ? '. ' + Math.max(0, T.achievedPct) + '% of the planned cut is done.' : '.') + '</div>' : '') + '</div>' +
      '<div class="card esg-wide"><h3>What moved the index in ' + esc(last ? last.label : '') + '</h3>' + (last ? '<div class="tbl-wrap"><table class="tbl esg-tbl"><thead><tr><th>Measure</th><th>Better when</th><th class="r">' + esc(fyLabel(A.base)) + '</th><th class="r">' + esc(last.label) + '</th><th class="r">Change</th><th class="r">Weight</th></tr></thead><tbody>' +
        last.parts.map(function (p) { var ch = p.base != null && p.now != null && p.base !== 0 ? (p.now / p.base - 1) * 100 : null, good = p.ratio != null && p.ratio > 1, bad = p.ratio != null && p.ratio < 1;
          return '<tr><td><b>' + esc(p.label) + '</b></td><td>' + (p.dir === 'lower' ? 'lower' : 'higher') + '</td><td class="r">' + nf(p.base, 2) + '</td><td class="r">' + nf(p.now, 2) + '</td><td class="r ' + (good ? 't-green' : bad ? 't-red' : '') + '">' + (ch == null ? (p.ratio == null ? 'not in both years' : '–') : (ch >= 0 ? '▲ ' : '▼ ') + nf(Math.abs(ch), 1) + '%') + '</td><td class="r">' + p.w + '%</td></tr>'; }).join('') +
        '</tbody></table></div><p class="muted" style="font-size:12px;margin:8px 0 0">' + esc(A.method) + '. Intensities are per $M of revenue when revenue is known in both years. Each part counts from 0.25× to 4× of the base year, weighted as shown, over the parts measured in both years.</p>' : '') + '</div>' +
      '<div class="card esg-wide"><h3>Year by year</h3><div class="tbl-wrap"><table class="tbl esg-tbl"><thead><tr><th>Year</th><th>From</th><th class="r">Scope 1</th><th class="r">Scope 2</th><th class="r">Scope 3</th><th class="r">Total tCO2e</th><th class="r">Renewable</th><th class="r">LTIFR</th><th class="r">ESG score</th><th class="r">Index</th><th>Target</th></tr></thead><tbody>' +
        A.rows.map(function (r, i) { var x = I[i], t = T.track[i] || {}; return '<tr><td><b>' + esc(r.label) + '</b></td><td>' + (r.from === 'report' ? '<a href="#esg/' + esc(r.reportId) + '/overview">ESG report</a>' + (r.months ? ' + ' + r.months + ' months' : '') : r.months + ' of 12 months' + (r.partial ? ' <span class="pill t-amber">so far</span>' : '')) + '</td>' +
          '<td class="r">' + nf(r.m.s1) + '</td><td class="r">' + nf(r.m.s2) + '</td><td class="r">' + nf(r.m.s3) + '</td><td class="r"><b>' + nf(r.m.total) + '</b></td><td class="r">' + (r.m.renew != null ? nf(r.m.renew, 1) + '%' : '–') + '</td><td class="r">' + nf(r.m.ltifr, 2) + '</td><td class="r">' + nf(r.m.esg) + '</td><td class="r"><b>' + nf(x && x.value, 1) + '</b></td><td>' + (t.status ? '<span class="pill t-' + rag(t.status) + '">' + esc(t.status) + (t.gap != null ? ' ' + (t.gap > 0 ? '+' : '') + t.gap + '%' : '') + (t.annualised ? ' (rate so far)' : '') + '</span>' : '–') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<p class="muted" style="font-size:12px;margin:8px 0 0">A year with an ESG report uses the report. A year without one is worked out from the months in this vault with the factors of the latest report; until all 12 months are in, it is marked “so far” and left out of the index base.</p></div></div>';
  }
  // a line with points (index)
  function lineChart(P, ref) {
    var pts = P.filter(function (p) { return p.v != null; }); if (!pts.length) return '<p class="muted">Two years of data are needed for an index.</p>';
    var W = 540, H = 220, l = 44, r = 34, t = 14, b = 30, vals = pts.map(function (p) { return p.v; }).concat([ref]), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = Math.max(5, (hi - lo) * 0.15); lo = Math.floor((lo - pad) / 5) * 5; hi = Math.ceil((hi + pad) / 5) * 5;
    var x = function (i) { return l + (P.length === 1 ? (W - l - r) / 2 : i * (W - l - r) / (P.length - 1)); }, y = function (v) { return t + (hi - v) / (hi - lo) * (H - t - b); };
    var ticks = []; for (var v = lo; v <= hi; v += Math.max(5, Math.round((hi - lo) / 5 / 5) * 5)) ticks.push(v);
    var path = P.map(function (p, i) { return p.v == null ? null : [x(i), y(p.v)]; }).filter(Boolean);
    return '<svg class="sv-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="ESG Progress Index by year">' + ticks.map(function (v) { return '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="g"/><text x="' + (l - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '</text>'; }).join('') +
      '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + y(ref) + '" y2="' + y(ref) + '" class="ref"/>' + '<polyline points="' + path.map(function (q) { return q.join(','); }).join(' ') + '" class="ln"/>' +
      P.map(function (p, i) { return (p.v == null ? '' : '<circle cx="' + x(i) + '" cy="' + y(p.v) + '" r="5" class="' + (p.open ? 'pt open' : 'pt') + '"><title>' + esc(p.l + ': ' + p.v) + '</title></circle><text x="' + x(i) + '" y="' + (y(p.v) - 10) + '" text-anchor="middle" class="vl">' + nf(p.v, 1) + '</text>') + '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(p.l) + '</text>'; }).join('') + '</svg>';
  }
  function barPath(T) {
    var L = T.filter(function (t) { return t.actual != null || t.path != null; }); if (!L.length) return '<p class="muted">No emissions yet.</p>';
    var W = 540, H = 220, l = 52, r = 14, t0 = 14, b = 30, hi = Math.max.apply(null, L.map(function (t) { return Math.max(t.actual || 0, t.path || 0); }).concat([1])) * 1.1, bw = Math.min(46, (W - l - r) / L.length * 0.6);
    var x = function (i) { return l + (i + 0.5) * (W - l - r) / L.length; }, y = function (v) { return t0 + (1 - v / hi) * (H - t0 - b); };
    var pp = L.map(function (t, i) { return t.path == null ? null : [x(i), y(t.path)]; }).filter(Boolean);
    return '<svg class="sv-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Emissions against the target path">' + [0, 0.25, 0.5, 0.75, 1].map(function (f) { var v = hi * f; return '<line x1="' + l + '" x2="' + (W - r) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="g"/><text x="' + (l - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + nf(v) + '</text>'; }).join('') +
      L.map(function (t, i) { return (t.actual != null ? '<rect x="' + (x(i) - bw / 2) + '" y="' + y(t.actual) + '" width="' + bw + '" height="' + (y(0) - y(t.actual)) + '" rx="4" class="bar ' + (t.partial ? 'part ' : '') + 's-' + rag(t.status) + '"><title>' + esc(t.label + ': ' + nf(t.actual) + ' tCO2e' + (t.annualised ? ' a year at the rate so far (' + nf(t.toDate) + ' in ' + t.months + ' months)' : '') + (t.path != null ? ', path ' + nf(t.path) : '')) + '</title></rect>' : '') + '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(t.label) + '</text>'; }).join('') +
      (pp.length > 1 ? '<polyline points="' + pp.map(function (q) { return q.join(','); }).join(' ') + '" class="path"/>' : '') + pp.map(function (q) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="3.5" class="pp"/>'; }).join('') + '</svg>' +
      '<div class="esg-leg" style="justify-content:flex-start"><span class="sv-l on">On track</span><span class="sv-l cl">Close</span><span class="sv-l off">Off track</span><span class="sv-l pa">Target path</span>' + (L.some(function (t) { return t.annualised; }) ? '<span class="muted" style="font-weight:500">Pale bar: a year still being gathered, at its rate so far</span>' : '') + '</div>';
  }

  /* ---------- 📅 data by month ---------- */
  function dataTab() {
    var A = V.A, R = (A.vault && A.vault.records) || [], fy = V.fy, months = fyMonths(fy, A.fyStart), cats = [], byKey = {};
    A.metrics.forEach(function (m) { if (cats.indexOf(m[4]) < 0) cats.push(m[4]); });
    R.forEach(function (r) { byKey[r.metric + '|' + r.period] = r; });
    var years = {}; R.forEach(function (r) { var y = Number(r.period.slice(0, 4)), mm = Number(r.period.slice(5)); years[A.fyStart <= 1 ? y : mm >= A.fyStart ? y + 1 : y] = 1; }); years[curFy(A.fyStart)] = 1; A.rows.forEach(function (r) { years[r.fy] = 1; }); years[fy] = 1;
    var rows = A.metrics.filter(function (m) { return m[4] === V.cat; });
    return '<div class="card"><div class="row" style="gap:8px;flex-wrap:wrap"><label class="sv-fy">Year <select id="svFy">' + Object.keys(years).sort().reverse().map(function (y) { return '<option value="' + y + '"' + (Number(y) === fy ? ' selected' : '') + '>' + esc(fyLabel(y)) + '</option>'; }).join('') + '</select></label>' +
      '<div class="esg-sub" style="margin:0" role="tablist">' + cats.map(function (c) { return '<button type="button" data-cat="' + esc(c) + '" class="' + (c === V.cat ? 'on' : '') + '">' + esc(c) + '</button>'; }).join('') + '</div><span class="sp"></span>' +
      '<button class="btn btn-sm" type="button" id="svBills" title="Spread the electricity bills from the ESG reports over the months they cover">⚡ Months from the bills</button><button class="btn btn-sm" type="button" id="svImp">📥 Import CSV or Excel</button></div>' +
      '<p class="muted" style="font-size:12.5px;margin:8px 0 10px">Type a value in a month as it comes in (it saves by itself). A blank month means no data yet: the dot shows what has been gathered. The year column adds the months up (workforce is averaged).</p>' +
      '<div class="tbl-wrap"><table class="tbl sv-grid"><thead><tr><th>Measure</th>' + months.map(function (m) { return '<th class="r">' + esc(m.l) + '</th>'; }).join('') + '<th class="r">' + esc(fyLabel(fy)) + '</th></tr></thead><tbody>' +
      rows.map(function (m) { var tot = 0, n = 0; var cells = months.map(function (mo) { var r = byKey[m[0] + '|' + mo.p]; if (r) { tot += r.value; n++; } return '<td><input class="sv-c' + (r ? ' has src-' + r.source.toLowerCase() : '') + '" inputmode="decimal" data-m="' + m[0] + '" data-p="' + mo.p + '" value="' + (r ? esc(String(r.value)) : '') + '" title="' + esc(r ? r.source + ' · ' + r.by + ' · ' + when(r.at) + (r.note ? ' · ' + r.note : '') : 'No data for ' + mo.l) + '" aria-label="' + esc(m[1] + ', ' + mo.l) + '"></td>'; }).join('');
        return '<tr><th scope="row"><b>' + esc(m[1]) + '</b><small class="muted">' + esc(m[2]) + ' · ' + n + '/12</small></th>' + cells + '<td class="r"><b>' + (n ? nf(m[3] === 'avg' ? tot / n : tot, 1) : '–') + '</b></td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="esg-leg" style="justify-content:flex-start;margin-top:8px"><span class="sv-src manual">Typed in</span><span class="sv-src bill">From a bill</span><span class="sv-src import">Imported</span></div></div>';
  }
  // edits wait a moment, then save: each edit carries its own vault, so nothing typed in one organisation can be saved into another
  var pend = {}, timer = 0, seq = 0, chain = Promise.resolve();   // saves go one after another, so the newest edit is always the one stored
  function queue(m, p, v) { var k = V.key + '|' + m + '|' + p; pend[k] = { key: V.key, metric: m, period: p, value: v === '' ? null : v, source: 'Manual', n: ++seq }; say('Editing…'); clearTimeout(timer); timer = setTimeout(flush, 700); }
  function flush() {
    clearTimeout(timer); var keys = Object.keys(pend); if (!keys.length) return Promise.resolve();
    var by = {}; keys.forEach(function (k) { var x = pend[k]; (by[x.key] = by[x.key] || []).push(x); }); pend = {}; say('Saving…');
    var job = chain.then(function () { return Promise.all(Object.keys(by).map(function (vk) { var set = by[vk];
      return api('esgVaultSave', { key: vk, set: set.map(function (x) { return { metric: x.metric, period: x.period, value: x.value, source: x.source }; }) }).catch(function (e) {
        set.forEach(function (x) { var k = vk + '|' + x.metric + '|' + x.period; if (!pend[k]) pend[k] = x; });   // keep a failed edit only if nothing newer was typed in that cell
        throw e; }); })); }); chain = job.catch(function () {});
    return job
      .then(function () { say('✓ Saved'); return load(); }).then(function () { var y = scrollY; if (V.tab === 'data') { var a0 = document.activeElement, f = a0 && a0.getAttribute && [a0.getAttribute('data-m'), a0.getAttribute('data-p')]; var T0 = $('.pkpis'); if (T0) T0.innerHTML = tiles(); var grid = $('#svBody'); grid.innerHTML = dataTab(); wire(grid); scrollTo(0, y); if (f && f[0]) { var el = document.querySelector('[data-m="' + f[0] + '"][data-p="' + f[1] + '"]'); if (el) el.focus(); } } })
      .catch(function (e) { say('⚠ Not saved'); fail(e); });
  }
  window.addEventListener('hashchange', function () { if (Object.keys(pend).length) flush(); });

  // a number from a cell, or null for a blank, N/A, - or any text without a number (never a false zero)
  var numOf = function (v) { var t = String(v == null ? '' : v).trim().replace(/[,\s$€£%]/g, ''); return /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(t) && isFinite(Number(t)) ? Number(t) : null; };
  // 📥 a long sheet: Month · Measure · Value (the month as 2026-03, Mar 2026 or a date)
  function importSheet() {
    M.modal('<h2>📥 Import monthly data</h2><p class="muted" style="margin:4px 0 12px">A CSV or Excel sheet with one row per value: <b>Month</b> (2026-03, Mar 2026 or a date), <b>Measure</b> (the name or id shown in the grid) and <b>Value</b>. Or a wide sheet: a Month column and one column per measure.</p>' +
      '<div class="esg-imp-drop"><button class="btn btn-gold" type="button" id="siPick">Choose a file</button><input type="file" id="siFile" accept=".csv,.tsv,.txt,.xlsx" hidden><span class="muted" id="siName"></span></div><div id="siBody"></div>' +
      '<div class="actions" style="justify-content:flex-end"><button class="btn" data-close type="button">Close</button><button class="btn btn-gold" id="siGo" type="button" hidden>Import</button></div>');
    var found = [], fname = '';
    $('#siPick').onclick = function () { $('#siFile').click(); };
    $('#siFile').onchange = function () { var f = this.files[0]; if (!f) return; fname = f.name; $('#siName').textContent = f.name;
      (M.esgReadSheet ? M.esgReadSheet(f) : Promise.reject(new Error('Open an ESG report once to load the sheet reader, then try again.'))).then(function (rows) {
        var norm = function (t) { return String(t == null ? '' : t).toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }, byN = {}; V.A.metrics.forEach(function (m) { byN[norm(m[0])] = m; byN[norm(m[1])] = m; byN[norm(m[0].split('.')[1])] = m; });
        var per = function (v) { var s0 = String(v == null ? '' : v).trim(), m1 = s0.match(/^(\d{4})-(\d{1,2})/); if (m1) return m1[1] + '-' + ('0' + m1[2]).slice(-2); var d = new Date(/^\w{3,9}\s+\d{4}$/.test(s0) ? '1 ' + s0 : s0); return isNaN(d) ? null : d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); };
        var head = (rows[0] || []).map(norm), mc = head.findIndex(function (h) { return /^(month|period|date)/.test(h); }), nc = head.findIndex(function (h) { return /^(measure|metric|item|name)/.test(h); }), vc = head.findIndex(function (h) { return /^(value|amount|quantity)/.test(h); });
        found = []; if (mc < 0) throw new Error('No Month column found.');
        rows.slice(1).forEach(function (r) { var p = per(r[mc]); if (!p) return; if (nc >= 0 && vc >= 0) { var m = byN[norm(r[nc])], n = numOf(r[vc]); if (m && n != null) found.push({ period: p, metric: m[0], value: n, label: m[1] }); }
          else head.forEach(function (h, c) { var m = byN[h]; if (!m || c === mc) return; var n = numOf(r[c]); if (n != null) found.push({ period: p, metric: m[0], value: n, label: m[1] }); }); });
        $('#siBody').innerHTML = found.length ? '<p style="margin:12px 0 6px"><b>' + found.length + ' values</b> found, ' + found.map(function (x) { return x.period; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).length + ' months. Values already in the vault for the same month are replaced.</p><div class="tbl-wrap" style="max-height:40vh;overflow:auto"><table class="tbl esg-tbl"><thead><tr><th>Month</th><th>Measure</th><th class="r">Value</th></tr></thead><tbody>' + found.slice(0, 300).map(function (x) { return '<tr><td>' + esc(x.period) + '</td><td>' + esc(x.label) + '</td><td class="r">' + nf(x.value, 3) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="esg-gaps" style="margin:12px 0">No measure matched. Use the names shown in the grid.</div>';
        $('#siGo').hidden = !found.length; }).catch(function (e) { $('#siBody').innerHTML = '<div class="esg-gaps" style="margin:12px 0">' + esc(e.message) + '</div>'; }); };
    $('#siGo').onclick = function () { var b = this, vk = V.key, L = found.map(function (x) { return { period: x.period, metric: x.metric, value: x.value, source: 'Import', file: fname }; }), parts = []; for (var i = 0; i < L.length; i += 500) parts.push(L.slice(i, i + 500)); b.disabled = true;
      parts.reduce(function (pr, set) { return pr.then(function () { return api('esgVaultSave', { key: vk, set: set }); }); }, Promise.resolve()).then(function () { var m = document.getElementById('modal'); if (M.closeModal) M.closeModal(); else if (m && m.close) m.close(); toast('Imported ' + found.length + ' values from ' + fname); return load(); }).then(draw).catch(function (e) { b.disabled = false; fail(e); }); };
  }

  /* ---------- 📎 evidence by year and month ---------- */
  function evidenceTab() {
    var A = V.A, D = ((A.vault && A.vault.docs) || []).slice(), F = {}; A.folders.forEach(function (f) { F[f[0]] = f[1]; });
    var q = V.q.toLowerCase(), L = D.filter(function (d) { return (!V.folder || d.folder === V.folder) && (!q || (d.name + ' ' + d.note + ' ' + d.period + ' ' + (F[d.folder] || '') + ' ' + (d.tags || []).join(' ')).toLowerCase().indexOf(q) >= 0); }).sort(function (a, b) { return b.period.localeCompare(a.period) || b.at - a.at; });
    var groups = {}; L.forEach(function (d) { var y = Number(d.period.slice(0, 4)), mm = Number(d.period.slice(5)), fy = A.fyStart <= 1 ? y : mm >= A.fyStart ? y + 1 : y; ((groups[fy] = groups[fy] || {})[d.period] = groups[fy][d.period] || []).push(d); });
    var ic = function (n) { n = (n || '').toLowerCase(); return /\.pdf$/.test(n) ? '📕' : /\.docx?$/.test(n) ? '📘' : /\.(xlsx?|csv)$/.test(n) ? '📗' : /\.(png|jpe?g|gif|webp|heic)$/.test(n) ? '🖼' : '📄'; };
    return '<div class="card"><div class="row" style="gap:8px;flex-wrap:wrap"><div class="vl-search" style="flex:1;min-width:220px"><span>🔎</span><input id="svQ" type="search" placeholder="Search: a file name, a month, a tag such as the company or FY2026…" value="' + esc(V.q) + '"></div><button class="btn btn-gold" type="button" id="svUp">⬆ File evidence</button></div>' +
      '<div class="vl-f" style="margin-top:10px"><button type="button" class="vl-chip' + (!V.folder ? ' on' : '') + '" data-fo="">All <b>' + D.length + '</b></button>' + A.folders.map(function (f) { var n = D.filter(function (d) { return d.folder === f[0]; }).length; return '<button type="button" class="vl-chip' + (V.folder === f[0] ? ' on' : '') + '" data-fo="' + f[0] + '">' + esc(f[1]) + ' <b>' + n + '</b></button>'; }).join('') + '</div></div>' +
      (L.length ? Object.keys(groups).sort().reverse().map(function (fy) { return '<details class="card sv-year" open><summary><b>' + esc(fyLabel(fy)) + '</b> <span class="muted">' + Object.keys(groups[fy]).reduce(function (a, p) { return a + groups[fy][p].length; }, 0) + ' files</span></summary>' +
          Object.keys(groups[fy]).sort().reverse().map(function (p) { var dd = new Date(p + '-01T00:00:00'); return '<div class="sv-month"><h4>' + esc(MON[dd.getMonth()] + ' ' + dd.getFullYear()) + '</h4>' + groups[fy][p].map(function (d) { return '<div class="vl-r"><span class="vl-ic">' + ic(d.name) + '</span><div class="vl-m"><div class="vl-n"><b>' + esc(d.name) + '</b><span class="vl-tag">' + esc(F[d.folder] || d.folder) + '</span>' + (d.tags || []).map(function (t) { return '<span class="vl-tag sv-tag">' + esc(t) + '</span>'; }).join('') + (d.auto ? '<span class="vl-tag ch">Champ</span>' : '') + '</div><div class="vl-s">' + esc(d.by || '') + ' · filed ' + esc(when(d.at)) + (d.size ? ' · ' + size(d.size) : '') + (d.note ? ' · ' + esc(d.note) : '') + '</div></div><div class="vl-a"><button class="btn btn-sm btn-gold" type="button" data-open="' + esc(d.id) + '">Open</button><button class="btn btn-sm" type="button" data-del="' + esc(d.id) + '" title="Delete">🗑</button></div></div>'; }).join('') + '</div>'; }).join('') + '</details>'; }).join('')
        : '<div class="card vl-empty"><b>📂</b><h3>' + (q || V.folder ? 'Nothing matches' : 'No evidence filed yet') + '</h3><p class="muted">File the bills, invoices, meter reads, safety reports and certificates behind the numbers, each under the month it belongs to. Assurance providers ask for them.</p></div>');
  }
  /* ---------- 📄 reading a bill: the PDF's own text, or OCR for scans and photos (Tesseract, in the browser), then the AI picks out the quantities ---------- */
  var load1 = function (src, test) { return test() ? Promise.resolve() : new Promise(function (res, rej) { var sc = document.createElement('script'); sc.src = src; sc.onload = res; sc.onerror = function () { rej(new Error('Could not load ' + src)); }; document.head.appendChild(sc); }); };
  var OCR = null;
  function ocrWorker(say) {
    if (OCR) return OCR; var base = new URL('vendor/ocr/', location.href).href;
    OCR = load1('vendor/ocr/tesseract.min.js?v=511', function () { return !!window.Tesseract; }).then(function () { say('Starting the text reader (first time: about 6 MB)…');
      return window.Tesseract.createWorker('eng', 1, { workerPath: base + 'worker.min.js', corePath: base, langPath: base.replace(/\/$/, ''), gzip: true, workerBlobURL: false }); });
    OCR.catch(function () { OCR = null; }); return OCR;
  }
  function ocr(src, say) { return ocrWorker(say).then(function (w) { return w.recognize(src); }).then(function (r) { return (r && r.data && r.data.text) || ''; }); }
  function pdfPages(f) { return load1('vendor/pdf.min.js?v=3111', function () { return !!window.pdfjsLib; }).then(function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js?v=3111'; return f.arrayBuffer(); }).then(function (buf) { return window.pdfjsLib.getDocument({ data: buf }).promise; }); }
  function billText(f, say) {
    var isPdf = /\.pdf$/i.test(f.name) || f.type === 'application/pdf', isImg = /^image\//.test(f.type) || /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(f.name);
    if (isImg) { say('Reading the photo with OCR…'); return ocr(f, say).then(function (t) { return { text: t, ocr: true }; }); }
    if (!isPdf) return Promise.reject(new Error(f.name + ': only PDF bills and photos of bills can be read.'));
    say('Reading the PDF…');
    return pdfPages(f).then(function (doc) {
      var n = Math.min(doc.numPages, 6), out = [], chain = Promise.resolve();
      for (var k = 1; k <= n; k++) (function (k) { chain = chain.then(function () { return doc.getPage(k).then(function (pg) { return pg.getTextContent(); }).then(function (c) { out.push(c.items.map(function (i) { return i.str; }).join(' ')); }); }); })(k);
      return chain.then(function () { var t = out.join('\n'); if (t.replace(/\s/g, '').length >= 80) return { text: t, ocr: false };
        // a scanned bill: draw each page and read it with OCR
        var txt = [], c2 = Promise.resolve();
        for (var j = 1; j <= Math.min(n, 4); j++) (function (j) { c2 = c2.then(function () { say('Scanned bill: reading page ' + j + ' of ' + Math.min(n, 4) + ' with OCR…'); return doc.getPage(j).then(function (pg) { var vp = pg.getViewport({ scale: 2 }), cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height; return pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise.then(function () { return ocr(cv, say); }).then(function (t1) { txt.push(t1); }); }); }); })(j);
        return c2.then(function () { return { text: txt.join('\n'), ocr: true }; }); });
    });
  }
  function aiBill(text, file) {
    var id = 'sb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), t0 = Date.now();
    return fetch('/.netlify/functions/planai-background', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1' }, body: JSON.stringify({ id: id, mode: 'svBill', text: text, file: file }) })
      .then(function (r) { if (r.status === 401 || r.status === 403) throw new Error('Your session has ended. Sign in again.'); if (r.status !== 202 && !r.ok) throw new Error('Could not start the AI (' + r.status + ')'); })
      .then(function poll() { return new Promise(function (res) { setTimeout(res, 2500); }).then(function () { return api('esgAiStatus', { id: id }); }).then(function (d) { if (d.status === 'done' && d.esg) return d.esg; if (d.status === 'error') throw new Error(d.error || 'The AI could not read the bill'); if (Date.now() - t0 > 240000) throw new Error('Reading the bill is taking too long. Try again.'); return poll(); }); });
  }
  // the bill as read: what goes into which month, for the user to check before it is added
  function billReview(f, r) {
    return new Promise(function (res) {
      var lines = r.lines || [], mm = {}; (r.months || []).forEach(function (m) { (mm[m.period] = mm[m.period] || {})[m.metric] = m.value; });
      var mets = lines.map(function (l) { return l.metric; }).filter(function (x, i, a) { return a.indexOf(x) === i; }), lab = function (k) { var l = lines.filter(function (x) { return x.metric === k; })[0]; return l ? l.label + ' (' + l.unit + ')' : k; };
      M.modal('<h2>📄 ' + esc(f.name) + '</h2><p class="muted" style="margin:4px 0 10px">' + esc([r.supplier, r.kind].filter(Boolean).join(' · ') || 'Bill') + (r.ocr ? ' · read with OCR, so check the figures' : '') + '</p>' +
        (lines.length ? '<table class="tbl"><thead><tr><th>What</th><th class="r">On the bill</th><th class="r">Into the vault</th><th>Period</th><th>Site or account</th></tr></thead><tbody>' + lines.map(function (l) { return '<tr><td><b>' + esc(l.label) + '</b></td><td class="r">' + nf(l.qty) + ' ' + esc(l.qtyUnit) + '</td><td class="r">' + nf(l.value) + ' ' + esc(l.unit) + '</td><td>' + esc(l.from) + ' to ' + esc(l.to) + '</td><td>' + esc([l.site, l.account].filter(Boolean).join(' · ')) + '</td></tr>'; }).join('') + '</tbody></table>' +
          '<h4 style="margin:14px 0 6px">Spread over the months (by days)</h4><table class="tbl"><thead><tr><th>Month</th>' + mets.map(function (k) { return '<th class="r">' + esc(lab(k)) + '</th>'; }).join('') + '</tr></thead><tbody>' + Object.keys(mm).sort().map(function (p) { return '<tr><td>' + p + '</td>' + mets.map(function (k) { return '<td class="r">' + (mm[p][k] == null ? '' : nf(mm[p][k])) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>' : '<p>No quantities could be read from this bill.</p>') +
        ((r.warnings || []).length ? '<p class="muted" style="font-size:12.5px;margin:10px 0 0">⚠ ' + r.warnings.map(esc).join('<br>⚠ ') + '</p>' : '') +
        '<p class="muted" style="font-size:12.5px;margin:10px 0 0">The figures are added to what is already in those months (another meter or site), and the same bill is never added twice.</p>' +
        '<div class="actions" style="justify-content:flex-end"><button class="btn" type="button" id="brFile">File only</button>' + (lines.length ? '<button class="btn btn-gold" type="button" id="brAdd">Add the figures and file it</button>' : '') + '</div>');
      var close = function (v) { var m = document.getElementById('modal'); if (M.closeModal) M.closeModal(); else if (m && m.close) m.close(); res(v); };
      $('#brFile').onclick = function () { close(false); }; if ($('#brAdd')) $('#brAdd').onclick = function () { close(true); };
    });
  }
  function uploadBox() {
    var A = V.A, now = new Date().toISOString().slice(0, 7);
    M.modal('<h2>⬆ File evidence</h2><p class="muted" style="margin:4px 0 12px">Each file is kept under the month it relates to (for a bill, the month the billing period ends).</p><div class="form"><label>Month<input type="month" id="suP" value="' + now + '"></label><label>Folder<select id="suF">' + A.folders.map(function (f) { return '<option value="' + f[0] + '">' + esc(f[1]) + '</option>'; }).join('') + '</select></label>' +
      '<label class="full">Note (optional)<input id="suN" maxlength="300" placeholder="e.g. Warehouse 1, Q3 bill"></label><label class="full">Files<input type="file" id="suFiles" multiple accept=".pdf,image/*,.xlsx,.xls,.csv,.docx,.doc,.txt"></label><label class="full ck" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="suRead" checked><span>📄 <b>Read bills and add their figures</b> to Data by month (electricity, gas, water, fuel, waste). Scans and photos are read with OCR. You check the figures before anything is added; the month comes from the bill.</span></label><p class="muted" id="suSay" style="font-size:12.5px;margin:6px 0 0"></p></div><div class="actions" style="justify-content:flex-end"><button class="btn" data-close type="button">Cancel</button><button class="btn btn-gold" id="suGo" type="button">File</button></div>');
    $('#suGo').onclick = function () { var b = this, files = Array.prototype.slice.call($('#suFiles').files || []), period = $('#suP').value, folder = $('#suF').value, note = $('#suN').value; if (!files.length) return toast('Choose a file'); if (!/^\d{4}-\d{2}$/.test(period)) return toast('Choose the month'); b.disabled = true; b.textContent = 'Filing…';
      var readOn = $('#suRead').checked, say = function (t) { var e = $('#suSay'); if (e) e.textContent = t || ''; }, added = 0;
      files.reduce(function (p, f) { return p.then(function () {
        var per = period, canRead = readOn && (/\.pdf$/i.test(f.name) || /^image\//.test(f.type) || /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(f.name));
        var read = !canRead ? Promise.resolve(null) : billText(f, say).then(function (x) { say('Champ is picking out the quantities…'); return aiBill(x.text, f.name).then(function (r) { r.ocr = x.ocr; return r; }); })
          .then(function (r) { say(''); return billReview(f, r).then(function (add) { if (r.period) per = r.period; if (!add) return null;
            return api('esgVaultAddBill', { key: V.key, file: f.name, lines: r.lines }).then(function (z) { added += z.added || 0; if (z.skipped) toast(f.name + ': ' + z.skipped + ' line(s) were already in the vault, so not added again'); }); }); })
          .catch(function (e) { say(''); toast(f.name + ': ' + (e.message || 'could not be read') + ' (filed without figures)'); return null; });
        return read.then(function () {
        var b64 = function () { return new Promise(function (res, rej) { var rd = new FileReader(); rd.onload = function () { res(String(rd.result).replace(/^data:[^,]*,/, '')); }; rd.onerror = rd.onabort = function () { rej(new Error('Could not read ' + f.name)); }; rd.readAsDataURL(f); }); };
        return api('esgVaultUrl', { key: V.key, name: f.name }).then(function (u) {
          if (u && u.r2) return fetch(u.url, { method: 'PUT', headers: { 'Content-Type': f.type || 'application/octet-stream' }, body: f }).then(function (r) { if (!r.ok) throw new Error('Upload failed (' + r.status + ')'); return { r2Key: u.key }; });
          if (f.size > 3.5 * 1024 * 1024) throw new Error(f.name + ' is over 3.5 MB: file storage (R2) is needed for large files.'); return b64().then(function (x) { return { file: x }; });
        }).then(function (st) { return api('esgVaultAdd', { key: V.key, period: per, folder: folder, name: f.name, type: f.type, size: f.size, r2Key: st.r2Key || '', file: st.file || '', note: note }); }); }); }); }, Promise.resolve())
        .then(function () { var m = document.getElementById('modal'); if (m && m.open) { if (M.closeModal) M.closeModal(); else if (m.close) m.close(); } toast('Filed ' + files.length + ' file' + (files.length === 1 ? '' : 's') + (added ? ' · ' + added + ' bill line' + (added === 1 ? '' : 's') + ' added to Data by month' : '')); return load(); }).then(draw).catch(function (e) { b.disabled = false; b.textContent = 'File'; fail(e); }); };
  }

  /* ---------- 🎯 target and settings ---------- */
  function targetTab() {
    var T = (V.A.vault && V.A.vault.target) || {}, A = V.A, inp = function (id, lab, v, unit, ph) { return '<label>' + lab + '<span class="esg-in"><input type="number" step="any" id="' + id + '" value="' + esc(v == null ? '' : v) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>' + (unit ? '<i>' + unit + '</i>' : '') + '</span></label>'; };
    return '<div class="esg-split"><div class="card"><h3 style="margin-top:0">Emissions target</h3><p class="muted" style="font-size:13px;margin:0 0 12px">The path runs in a straight line from the base year to the target, then to net zero. Leave the base emissions blank to take them from the base year\'s data.</p><div class="esg-form">' +
      inp('stBy', 'Base year', T.baseYear, '', A.base || '') + inp('stBt', 'Base-year emissions', T.baseT, 'tCO2e', A.target.baseT != null ? String(A.target.baseT) : '') + inp('stPct', 'Reduction target', T.tgtPct, '%') + inp('stTy', 'Target year', T.tgtYear) + inp('stNz', 'Net zero year', T.nzYear) +
      '<label>Scopes covered<select id="stSc"><option value="1+2"' + (T.scope !== '1+2+3' ? ' selected' : '') + '>Scope 1 and 2</option><option value="1+2+3"' + (T.scope === '1+2+3' ? ' selected' : '') + '>Scope 1, 2 and 3</option></select></label>' +
      '<label>The financial year starts in<select id="stFy">' + MON.map(function (m, i) { return '<option value="' + (i + 1) + '"' + (A.fyStart === i + 1 ? ' selected' : '') + '>' + m + (i === 0 ? ' (calendar year)' : '') + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn btn-gold" type="button" id="stSave">Save</button></div></div>' +
      '<div class="card"><h3 style="margin-top:0">How the vault measures progress</h3><ul class="esg-ul"><li><b>GKH ESG Progress Index</b>: the base year is 100. Ten measures (emissions intensity, Scope 3, renewables, energy, water, waste, safety, women in management, training and governance) are each compared with the base year and weighted; above 100 means better than the base year.</li><li><b>Target path</b>: actual emissions against the straight line to your target. On track: at or below the line; Close: up to 5% above; Off track: more.</li><li><b>Cut still needed</b>: the yearly reduction from the latest full year that reaches the target on time.</li><li>Years come from the ESG reports, or from the months gathered here when there is no report.</li></ul></div></div>';
  }

  /* ---------- events ---------- */
  function wire(b) {
    b.querySelectorAll('.sv-c').forEach(function (el) { el.addEventListener('input', function () { var v = el.value.replace(/,/g, '').trim(); if (v !== '' && !isFinite(Number(v))) { el.classList.add('bad'); return; } el.classList.remove('bad'); queue(el.getAttribute('data-m'), el.getAttribute('data-p'), v); }); });
    var fy = $('#svFy'); if (fy) fy.onchange = function () { flush(); V.fy = Number(this.value); body(); };
    b.querySelectorAll('[data-cat]').forEach(function (x) { x.onclick = function () { V.cat = x.getAttribute('data-cat'); body(); }; });
    var bl = $('#svBills'); if (bl) bl.onclick = function () { bl.disabled = true; api('esgVaultBills', { key: V.key }).then(function (r) { toast(r.bills + ' bill' + (r.bills === 1 ? '' : 's') + ' spread over ' + r.months + ' months'); V.cat = 'Energy'; return load(); }).then(draw).catch(function (e) { bl.disabled = false; fail(e); }); };
    var im = $('#svImp'); if (im) im.onclick = importSheet;
    var q = $('#svQ'); if (q) q.oninput = function () { V.q = q.value; var p0 = q.selectionStart; body(); var q2 = $('#svQ'); q2.focus(); try { q2.setSelectionRange(p0, p0); } catch (x) {} };
    b.querySelectorAll('[data-fo]').forEach(function (x) { x.onclick = function () { V.folder = x.getAttribute('data-fo'); body(); }; });
    var up = $('#svUp'); if (up) up.onclick = uploadBox;
    b.querySelectorAll('[data-open]').forEach(function (x) { x.onclick = function () { api('esgVaultFile', { key: V.key, id: x.getAttribute('data-open') }).then(function (f) { if (f.url) { window.open(f.url, '_blank', 'noopener'); return; } var a = document.createElement('a'); a.href = 'data:' + (f.type || 'application/octet-stream') + ';base64,' + f.file; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); }).catch(fail); }; });
    b.querySelectorAll('[data-del]').forEach(function (x) { x.onclick = function () { M.confirmBox('Delete this file?', 'It is removed from the vault and cannot be brought back.', 'Delete', true).then(function (ok) { if (!ok) return; api('esgVaultDelete', { key: V.key, id: x.getAttribute('data-del') }).then(function () { toast('Deleted'); return load(); }).then(draw).catch(fail); }); }; });
    var sv = $('#stSave'); if (sv) sv.onclick = function () { var g = function (id) { return $('#' + id).value; }; sv.disabled = true;
      api('esgVaultSave', { key: V.key, target: { baseYear: g('stBy'), baseT: g('stBt'), tgtPct: g('stPct'), tgtYear: g('stTy'), nzYear: g('stNz'), scope: g('stSc') }, fyStart: g('stFy') }).then(function () { toast('Saved'); V.fy = null; return load(); }).then(function () { V.tab = 'performance'; location.hash = '#svault/' + V.key + '/performance'; draw(); }).catch(function (e) { sv.disabled = false; fail(e); }); };
  }

  M.addView('svault', 'Sustainability vault', function (parts) { if (parts[0] && parts[0] !== V.key) { V.A = null; V.fy = null; } return parts[0] ? vaultPage(parts[0], parts[1]) : listPage(); }, 'svault');
  M.svault = { state: function () { return V; } };   // for tests
})();
