/* 👔 The CEO view (Persona): manage by exception, in under a minute.
     1. How are the projects doing?  red / amber / green counts, every project worst first with why, % done, SPI, CPI, finish vs baseline, trend
     2. Where's the money?           cost (budget, spent, earned, forecast, over / under), revenue (contract, invoiced, received, owed),
                                     profit and margin, by program, the biggest overspends, and cash flow by month
   Every row opens its project, read-only for the CEO. Data: planCeoGet (netlify/lib/ceo.mjs). */
(function () {
  'use strict';
  var M = window.MBS; if (!M) return;
  var api = M.api, esc = M.esc, toast = M.toast, fail = M.fail;
  var D = null;
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  var money = function (n, full) { n = Number(n) || 0; var a = Math.abs(n), s = n < 0 ? '−$' : '$';
    if (!full && a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M'; if (!full && a >= 1e4) return s + Math.round(a / 1e3) + 'k';
    return s + Math.round(a).toLocaleString('en-AU'); };
  var idx = function (v) { return v == null ? '<span class="muted">–</span>' : '<b class="ceo-i ' + (v < 0.9 ? 'r' : v < 1 ? 'a' : 'g') + '">' + Number(v).toFixed(2) + '</b>'; };
  var day = function (s) { return s ? new Date(s + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' }) : ''; };
  var HW = { red: 'In trouble', amber: 'At risk', green: 'On track', grey: 'No plan yet' };
  var TR = { up: '<span class="ceo-tr up" title="Better than a week ago">▲</span>', down: '<span class="ceo-tr down" title="Worse than a week ago">▼</span>', flat: '<span class="ceo-tr flat" title="About the same as a week ago">▬</span>', '': '' };
  function tile(label, value, sub, cls) { return '<div class="ceo-t ' + (cls || '') + '"><small>' + esc(label) + '</small><b>' + value + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>'; }

  function health(A) {
    return '<div class="ceo-hs">' +
      '<button type="button" class="ceo-h red" data-hf="red"><b>' + A.red + '</b><span>🔴 In trouble</span></button>' +
      '<button type="button" class="ceo-h amber" data-hf="amber"><b>' + A.amber + '</b><span>🟠 At risk</span></button>' +
      '<button type="button" class="ceo-h green" data-hf="green"><b>' + A.green + '</b><span>🟢 On track</span></button>' +
      (A.grey ? '<button type="button" class="ceo-h grey" data-hf="grey"><b>' + A.grey + '</b><span>⚪ No plan yet</span></button>' : '') +
      '<div class="ceo-h idx"><span>Schedule (SPI)</span>' + idx(A.SPI) + '<span>Cost (CPI)</span>' + idx(A.CPI) + '</div></div>';
  }
  function finish(r) {
    if (!r.forecast) return '<span class="muted">–</span>';
    var late = r.slip > 0 ? '<small class="ceo-late">' + r.slip + ' day' + (r.slip === 1 ? '' : 's') + ' late</small>' : r.baseline && r.forecast > r.baseline ? '<small class="ceo-late">after baseline ' + esc(day(r.baseline)) + '</small>' : r.baseline ? '<small class="muted">on baseline</small>' : '';
    return esc(day(r.forecast)) + late;
  }
  function rowsHtml(L) {
    if (!L.length) return '<tr><td colspan="9" class="muted" style="text-align:center;padding:18px">No projects here.</td></tr>';
    return L.map(function (r) {
      var over = r.vac < -0.5 ? '<b class="ceo-neg">' + money(r.vac) + '</b><small>' + (r.over ? Math.round(r.over) + '% over' : 'over') + '</small>' : r.budget ? '<span class="ceo-pos">' + (r.vac > 0.5 ? money(r.vac) + ' under' : 'on budget') + '</span>' : '<span class="muted">–</span>';
      var prof = r.profit == null ? '<span class="muted" title="No quote yet">no price</span>' : '<b class="' + (r.profit < 0 ? 'ceo-neg' : 'ceo-pos') + '">' + money(r.profit) + '</b><small>' + r.margin + '%' + (r.quoted ? ' · quoted' : '') + '</small>';
      return '<tr data-core="' + esc(r.core) + '" class="h-' + r.health + '"><td class="ceo-dot"><i class="' + r.health + '"></i>' + TR[r.trend || ''] + '</td>' +
        '<td><b>' + esc(r.name) + '</b><small>' + esc([r.program, r.client].filter(Boolean).join(' · ')) + '</small>' + (r.why && r.health !== 'green' ? '<small class="ceo-why">' + esc(r.why) + '</small>' : '') + '</td>' +
        '<td class="hide-sm"><small>' + esc(r.phase || '') + '</small></td>' +
        '<td><span class="ceo-bar"><i style="width:' + Math.min(100, r.pct) + '%"></i></span><small>' + r.pct + '%</small></td>' +
        '<td>' + idx(r.SPI) + '</td><td>' + idx(r.CPI) + '</td><td class="nowrap">' + finish(r) + '</td>' +
        '<td class="num">' + over + '</td><td class="num">' + prof + '</td></tr>';
    }).join('');
  }
  function flowChart(F) {
    var max = Math.max(1, Math.max.apply(null, F.map(function (f) { return Math.max(f.planned, f.invoiced, f.received); }))), now = today().slice(0, 7), W = 720, H = 190, bw = W / F.length;
    var bars = F.map(function (f, i) {
      var x = i * bw, h = function (v) { return Math.round(v / max * (H - 30)); }, m = new Date(f.month + '-01T00:00:00Z').toLocaleDateString('en-AU', { month: 'short', timeZone: 'UTC' });
      return (f.month === now ? '<rect x="' + (x + 2) + '" y="0" width="' + (bw - 4) + '" height="' + (H - 18) + '" class="ceo-now"/>' : '') +
        '<rect x="' + (x + bw * 0.14) + '" y="' + (H - 18 - h(f.planned)) + '" width="' + bw * 0.22 + '" height="' + h(f.planned) + '" class="ceo-b1"><title>' + m + ' planned cost ' + money(f.planned, 1) + '</title></rect>' +
        '<rect x="' + (x + bw * 0.39) + '" y="' + (H - 18 - h(f.invoiced)) + '" width="' + bw * 0.22 + '" height="' + h(f.invoiced) + '" class="ceo-b2"><title>' + m + ' invoiced ' + money(f.invoiced, 1) + '</title></rect>' +
        '<rect x="' + (x + bw * 0.64) + '" y="' + (H - 18 - h(f.received)) + '" width="' + bw * 0.22 + '" height="' + h(f.received) + '" class="ceo-b3"><title>' + m + ' received ' + money(f.received, 1) + '</title></rect>' +
        '<text x="' + (x + bw / 2) + '" y="' + (H - 4) + '" text-anchor="middle">' + m + '</text>';
    }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ceo-flow" role="img" aria-label="Cash flow by month">' + bars + '</svg>' +
      '<div class="ceo-leg"><span><i class="ceo-b1"></i>Planned cost</span><span><i class="ceo-b2"></i>Invoiced</span><span><i class="ceo-b3"></i>Received</span><span class="muted">Shaded: this month</span></div>';
  }
  function money2(A) {
    var c = '<div class="ceo-ts">' + tile('Budget', money(A.budget), A.n + ' live project' + (A.n === 1 ? '' : 's')) + tile('Spent to date', money(A.spent), A.budget ? Math.round(A.spent / A.budget * 100) + '% of budget' : '') +
      tile('Value earned', money(A.earned), 'work done, at budget rates') + tile('Forecast at completion', money(A.eac), 'at today\'s cost rate') +
      tile(A.vac < -0.5 ? 'Forecast overspend' : 'Forecast under budget', money(Math.abs(A.vac)), A.budget ? Math.round(Math.abs(A.vac) / A.budget * 100) + '% of budget' : '', A.vac < -0.5 ? 'neg' : 'pos') + '</div>';
    var r = '<div class="ceo-ts">' + tile('Contract value', money(A.contract), A.quoted ? '+ ' + money(A.quoted) + ' quoted, not yet accepted' : 'accepted quotes') +
      tile('Invoiced', money(A.invoiced), A.price ? Math.round(A.invoiced / A.price * 100) + '% of the price' : '') + tile('Received', money(A.received), A.invoiced ? Math.round(A.received / A.invoiced * 100) + '% of invoiced' : '') +
      tile('Still owed', money(A.owed), A.overdue ? '<b class="ceo-neg">' + money(A.overdue) + ' overdue</b>' : 'none overdue', A.overdue ? 'neg' : '') +
      tile('Forecast profit', A.profit == null ? '–' : money(A.profit), A.margin == null ? 'no prices yet' : A.margin + '% margin' + (A.unpriced ? ' · ' + A.unpriced + ' project' + (A.unpriced === 1 ? '' : 's') + ' not priced' : ''), A.profit != null && A.profit < 0 ? 'neg' : 'pos') + '</div>';
    return '<h4 class="ceo-sub">Cost</h4>' + c + '<h4 class="ceo-sub">Revenue and profit</h4>' + r;
  }
  function programs(P) {
    return '<div class="table-wrap"><table class="ceo-tab"><thead><tr><th>Program</th><th>Health</th><th class="num">Budget</th><th class="num">Spent</th><th class="num">Forecast</th><th class="num">Over / under</th><th class="num">Contract</th><th class="num">Invoiced</th><th class="num">Received</th><th class="num">Profit</th></tr></thead><tbody>' +
      P.map(function (p) { return '<tr><td><b>' + esc(p.name) + '</b><small>' + p.n + ' project' + (p.n === 1 ? '' : 's') + '</small></td><td class="nowrap">' + (p.red ? '<span class="ceo-pill red">' + p.red + '</span>' : '') + (p.amber ? '<span class="ceo-pill amber">' + p.amber + '</span>' : '') + (p.green ? '<span class="ceo-pill green">' + p.green + '</span>' : '') + '</td>' +
        '<td class="num">' + money(p.budget) + '</td><td class="num">' + money(p.spent) + '</td><td class="num">' + money(p.eac) + '</td><td class="num">' + (p.vac < -0.5 ? '<b class="ceo-neg">' + money(p.vac) + '</b>' : '<span class="ceo-pos">' + money(p.vac) + '</span>') + '</td>' +
        '<td class="num">' + money(p.contract || p.quoted) + '</td><td class="num">' + money(p.invoiced) + '</td><td class="num">' + money(p.received) + '</td><td class="num">' + (p.profit == null ? '<span class="muted">–</span>' : '<b class="' + (p.profit < 0 ? 'ceo-neg' : 'ceo-pos') + '">' + money(p.profit) + '</b><small>' + p.margin + '%</small>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function draw(filter) {
    var A = D.all, L = D.rows.filter(function (r) { return !r.closed && (!filter || r.health === filter); });
    var ov = D.overspends.length ? '<ol class="ceo-ov">' + D.overspends.map(function (o) { return '<li data-core="' + esc(o.core) + '"><b>' + esc(o.name) + '</b> <span class="muted">' + esc(o.program) + '</span><b class="ceo-neg">' + money(o.vac) + (o.over ? ' (' + Math.round(o.over) + '% over)' : '') + '</b></li>'; }).join('') + '</ol>' : '<p class="muted">No project is forecast to go over its budget.</p>';
    M.view().innerHTML = '<div class="ceo">' +
      '<div class="row ceo-head"><div><p class="muted">' + esc(new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) + ' · ' + A.n + ' live project' + (A.n === 1 ? '' : 's') + (D.closed ? ', ' + D.closed + ' closed' : '') + (D.since ? ' · ▲▼ compared with ' + esc(day(D.since)) : ' · the ▲▼ arrows start after a week') + '</p></div>' +
      '<div class="row" style="gap:6px"><button class="btn btn-sm" id="ceoRe" type="button">⟳ Refresh</button><button class="btn btn-sm" id="ceoPr" type="button">🖨 Print / PDF</button></div></div>' +
      '<section class="card ceo-s"><h3>1 · How are the projects doing?</h3>' + health(A) +
      '<p class="ceo-f">' + (filter ? 'Showing <b>' + esc(HW[filter]) + '</b> only · <a href="#" id="ceoAll">show all</a>' : 'Worst first. Tap a count to show only those, or a project to open it.') + '</p>' +
      '<div class="table-wrap"><table class="ceo-tab ceo-rows"><thead><tr><th></th><th>Project</th><th class="hide-sm">Phase</th><th>Done</th><th>SPI</th><th>CPI</th><th>Finish</th><th class="num">Cost vs budget</th><th class="num">Profit</th></tr></thead><tbody>' + rowsHtml(L) + '</tbody></table></div></section>' +
      '<section class="card ceo-s"><h3>2 · Where\'s the money?</h3>' + money2(A) +
      '<div class="ceo-2"><div><h4 class="ceo-sub">Cash flow by month</h4>' + flowChart(D.flow) + '</div><div><h4 class="ceo-sub">Biggest forecast overspends</h4>' + ov + '</div></div>' +
      '<h4 class="ceo-sub">By program</h4>' + programs(D.byProgram) + '</section>' +
      '<p class="muted ceo-note">Red: SPI or CPI under 0.90, or serious slippage, overspend, late work or risks (the same rules as Champ\'s watch). Amber: slipping. Forecast at completion = budget ÷ CPI. Profit = contract value (or the open quote) − forecast cost. Amounts exclude tax.</p></div>';
    var v = M.view();
    v.querySelectorAll('[data-hf]').forEach(function (b) { b.onclick = function () { draw(filter === b.getAttribute('data-hf') ? '' : b.getAttribute('data-hf')); }; });
    var a = v.querySelector('#ceoAll'); if (a) a.onclick = function (e) { e.preventDefault(); draw(''); };
    v.querySelectorAll('[data-core]').forEach(function (r) { r.onclick = function () { location.hash = '#plan/' + encodeURIComponent(r.getAttribute('data-core')) + '/schedule'; }; });
    v.querySelector('#ceoRe').onclick = function () { load().then(function () { draw(filter); toast('Up to date'); }).catch(fail); };
    v.querySelector('#ceoPr').onclick = function () { window.print(); };
  }
  function load() { return api('planCeoGet', { today: today() }).then(function (d) { D = d; }); }
  M.addView('ceo', 'CEO view', function () { M.view().innerHTML = '<div class="empty">Gathering every project…</div>'; return load().then(function () { draw(''); }); }, 'ceo');
})();
