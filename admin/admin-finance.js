/* 💵 Finance (the CFO's screen): milestone billing across every project.
     #finance          totals, ready to invoice, every invoice (record a payment, PDF), what is owed by age, cash in by month, billing by project
     #finance/<core>   one project's billing: its contract value and each milestone's share; raise an invoice when a milestone is done
   Data: acctFinanceGet / acctBillGet / acctBillSave / acctBillRaise (netlify/lib/billing.mjs), payAdd for payments. */
(function () {
  'use strict';
  var M = window.MBS; if (!M) return;
  var api = M.api, esc = M.esc, toast = M.toast, fail = M.fail;
  var F = null, filt = 'open';
  var money = function (n) { n = Number(n) || 0; return (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); };
  var day = function (s) { return s ? new Date(s + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' }) : ''; };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  var canEdit = function () { var me = M.me || {}; return !!(me.owner || ((me.mods || {}).accounts === 'edit')); };
  function tile(l, v, s, c) { return '<div class="ceo-t ' + (c || '') + '"><small>' + esc(l) + '</small><b>' + v + '</b>' + (s ? '<span>' + s + '</span>' : '') + '</div>'; }
  function st(i) {
    if (i.status === 'draft') return '<span class="fin-st draft">Draft</span>';
    if (i.balance <= 0.005) return '<span class="fin-st paid">Paid</span>';
    if (i.late > 0) return '<span class="fin-st late">' + i.late + ' day' + (i.late === 1 ? '' : 's') + ' overdue</span>';
    return '<span class="fin-st open">' + (i.paid > 0 ? 'Part paid' : 'Sent') + ' · due ' + esc(day(i.due)) + '</span>';
  }
  function bars(C) {
    var max = Math.max(1, Math.max.apply(null, C.map(function (c) { return Math.max(c.invoiced, c.received); }))), W = 720, H = 170, bw = W / C.length;
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ceo-flow">' + C.map(function (c, i) { var x = i * bw, h = function (v) { return Math.round(v / max * (H - 28)); }, m = new Date(c.month + '-01T00:00:00Z').toLocaleDateString('en-AU', { month: 'short', timeZone: 'UTC' });
      return '<rect x="' + (x + bw * .2) + '" y="' + (H - 18 - h(c.invoiced)) + '" width="' + bw * .28 + '" height="' + h(c.invoiced) + '" class="ceo-b2"><title>' + m + ' invoiced ' + money(c.invoiced) + '</title></rect>' +
        '<rect x="' + (x + bw * .52) + '" y="' + (H - 18 - h(c.received)) + '" width="' + bw * .28 + '" height="' + h(c.received) + '" class="ceo-b3"><title>' + m + ' received ' + money(c.received) + '</title></rect><text x="' + (x + bw / 2) + '" y="' + (H - 4) + '" text-anchor="middle">' + m + '</text>'; }).join('') +
      '</svg><div class="ceo-leg"><span><i class="ceo-b2"></i>Invoiced (incl. tax)</span><span><i class="ceo-b3"></i>Received</span></div>';
  }
  function draw() {
    var T = F.totals, A = F.aging, ed = canEdit();
    var L = F.invoices.filter(function (i) { return filt === 'all' ? true : filt === 'open' ? i.status !== 'draft' && i.balance > 0.005 : filt === 'late' ? i.late > 0 && i.balance > 0.005 : filt === 'paid' ? i.balance <= 0.005 && i.status !== 'draft' : i.status === 'draft'; });
    var tab = function (k, w, n) { return '<button type="button" class="fin-tab' + (filt === k ? ' on' : '') + '" data-f="' + k + '">' + esc(w) + (n != null ? ' <b>' + n + '</b>' : '') + '</button>'; };
    M.view().innerHTML = '<div class="ceo fin">' +
      '<div class="row ceo-head"><div><p class="muted">Milestone billing across every project · amounts include tax unless marked · ' + esc(new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })) + '</p></div><div class="row" style="gap:6px"><button class="btn btn-sm" id="finRe" type="button">⟳ Refresh</button><button class="btn btn-sm" id="finPr" type="button">🖨 Print / PDF</button></div></div>' +
      '<div class="ceo-ts">' + tile('Contract value', money(T.contract), 'before tax, all projects') + tile('Invoiced', money(T.invoicedInc), F.invoices.filter(function (i) { return i.status !== 'draft'; }).length + ' invoices') + tile('Received', money(T.received), T.invoicedInc ? Math.round(T.received / T.invoicedInc * 100) + '% of invoiced' : '') +
        tile('Still owed', money(T.owed), T.overdue ? '<b class="ceo-neg">' + money(T.overdue) + ' overdue (' + T.overdueN + ')</b>' : 'none overdue', T.overdue ? 'neg' : '') + tile('Ready to invoice', money(T.ready), T.readyN ? T.readyN + ' milestone' + (T.readyN === 1 ? '' : 's') + ' done, not billed' : 'nothing waiting', T.readyN ? 'warn' : '') + '</div>' +
      '<section class="card ceo-s"><h3>🔔 Ready to invoice</h3>' + (F.ready.length ? '<div class="table-wrap"><table class="ceo-tab"><thead><tr><th>Project</th><th>Milestone</th><th>Done by</th><th class="num">Share</th><th class="num">Amount (before tax)</th><th></th></tr></thead><tbody>' +
        F.ready.map(function (r) { return '<tr><td><b>' + esc(r.project) + '</b></td><td>◆ ' + esc(r.name) + '</td><td>' + esc(day(r.due)) + '</td><td class="num">' + r.pct + '%</td><td class="num"><b>' + money(r.amount) + '</b></td><td class="num">' + (ed ? '<button class="btn btn-sm btn-gold" data-raise="' + esc(r.core) + '|' + esc(r.tid) + '" type="button">🧾 Raise invoice</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : '<p class="muted">No milestone is waiting to be billed. A milestone shows here once it reaches 100% and has a share of the contract.</p>') + '</section>' +
      '<section class="card ceo-s"><h3>🧾 Invoices</h3><div class="fin-tabs">' + tab('open', 'Unpaid', F.invoices.filter(function (i) { return i.status !== 'draft' && i.balance > 0.005; }).length) + tab('late', 'Overdue', T.overdueN) + tab('paid', 'Paid') + tab('draft', 'Drafts', T.drafts) + tab('all', 'All') + '</div>' +
        '<div class="table-wrap"><table class="ceo-tab"><thead><tr><th>Invoice</th><th>Project</th><th>Issued</th><th class="num">Amount</th><th class="num">Paid</th><th class="num">Owed</th><th>Status</th><th></th></tr></thead><tbody>' +
        (L.length ? L.map(function (i) { return '<tr><td><b>' + esc(i.id) + '</b>' + (i.milestone ? '<small>' + esc(i.milestone.replace(/^Milestone: /, '◆ ').replace(/ \(.*$/, '')) + '</small>' : '') + '</td><td>' + esc(i.project) + '</td><td>' + esc(day(i.issued)) + '</td><td class="num">' + money(i.inc) + '</td><td class="num">' + money(i.paid) + '</td><td class="num">' + (i.balance > 0.005 ? '<b>' + money(i.balance) + '</b>' : '–') + '</td><td>' + st(i) + '</td>' +
          '<td class="num nowrap">' + (ed && i.balance > 0.005 && i.status !== 'draft' ? '<button class="btn btn-sm" data-pay="' + esc(i.id) + '" type="button">💰 Record payment</button> ' : '') + '<a class="btn btn-sm" target="_blank" rel="noopener" href="' + M.API + '?action=pdf&id=' + encodeURIComponent(i.id) + '">PDF</a></td></tr>'; }).join('') : '<tr><td colspan="8" class="muted" style="text-align:center;padding:16px">No invoices here.</td></tr>') + '</tbody></table></div></section>' +
      '<div class="ceo-2"><section class="card ceo-s"><h3>💳 Cash in by month</h3>' + bars(F.cash) + '</section>' +
        '<section class="card ceo-s"><h3>⏳ What is owed, by age</h3><div class="fin-age">' + [['Not yet due', A.current, ''], ['1–30 days late', A.d1_30, 'a'], ['31–60 days', A.d31_60, 'r'], ['61–90 days', A.d61_90, 'r'], ['Over 90 days', A.d90, 'r']].map(function (x) { return '<div class="' + (x[1] > 0 ? x[2] : '') + '"><span>' + x[0] + '</span><b>' + money(x[1]) + '</b></div>'; }).join('') + '</div></section></div>' +
      '<section class="card ceo-s"><h3>📁 Billing by project</h3><p class="ceo-f">Set each project\'s contract value and how much of it each milestone bills. An accepted quote sets the contract value by itself.</p><div class="table-wrap"><table class="ceo-tab ceo-rows"><thead><tr><th>Project</th><th class="num">Contract</th><th class="num">Billing set</th><th class="num">Invoiced</th><th class="num">Received</th><th class="num">Owed</th><th>Next to bill</th></tr></thead><tbody>' +
        F.projects.map(function (p) { return '<tr data-bill="' + esc(p.core) + '"><td><b>' + esc(p.name) + '</b><small>' + p.ms + ' milestone' + (p.ms === 1 ? '' : 's') + (p.readyN ? ' · <b class="ceo-neg">' + p.readyN + ' ready to invoice</b>' : '') + '</small></td><td class="num">' + (p.contract ? money(p.contract) + '<small>' + (p.contractFrom === 'quote' ? 'accepted quote' : 'typed in') + '</small>' : '<span class="muted">not set</span>') + '</td>' +
          '<td class="num">' + (p.planned ? p.planned + '%' : '<span class="muted">–</span>') + '</td><td class="num">' + money(p.invoiced) + '</td><td class="num">' + money(p.received) + '</td><td class="num">' + money(p.owed) + '</td><td>' + esc(p.next || '') + '</td></tr>'; }).join('') + '</tbody></table></div></section>' +
      '<p class="muted ceo-note">Invoices are raised from milestones: when a milestone reaches 100%, it waits under Ready to invoice. Invoiced, received and owed include tax; contract value and milestone amounts are before tax.</p></div>';
    var v = M.view();
    v.querySelector('#finRe').onclick = function () { load().then(draw).then(function () { toast('Up to date'); }).catch(fail); };
    v.querySelector('#finPr').onclick = function () { window.print(); };
    v.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { filt = b.getAttribute('data-f'); draw(); }; });
    v.querySelectorAll('[data-bill]').forEach(function (r) { r.onclick = function () { location.hash = '#finance/' + encodeURIComponent(r.getAttribute('data-bill')); }; });
    v.querySelectorAll('[data-raise]').forEach(function (b) { b.onclick = function () { var x = b.getAttribute('data-raise').split('|'); raise(x[0], x[1], b).then(function () { return load(); }).then(draw).catch(fail); }; });
    v.querySelectorAll('[data-pay]').forEach(function (b) { b.onclick = function () { pay(F.invoices.filter(function (i) { return i.id === b.getAttribute('data-pay'); })[0]); }; });
  }
  function raise(core, tid, b) {
    if (b) b.disabled = true;
    return api('acctBillRaise', { core: core, tid: tid }).then(function (r) { toast('🧾 ' + r.id + ' raised for ' + money(r.amount) + ' (before tax) and marked sent'); return r; }).catch(function (e) { if (b) b.disabled = false; throw e; });
  }
  function pay(i) {
    if (!i) return;
    M.modal('<h2>💰 Record a payment</h2><p class="muted" style="margin:-4px 0 10px">' + esc(i.id) + ' · ' + esc(i.project) + ' · owed ' + money(i.balance) + '</p>' +
      '<div class="fin-form"><label>Amount received<input type="number" step="0.01" min="0" id="pyAmt" value="' + i.balance.toFixed(2) + '"></label><label>Date<input type="date" id="pyDate" value="' + today() + '"></label>' +
      '<label>How<select id="pyHow">' + (F.methods || ['Bank transfer']).map(function (m) { return '<option>' + esc(m) + '</option>'; }).join('') + '</select></label><label>Reference<input id="pyRef" placeholder="optional"></label></div>' +
      '<div class="actions"><button class="btn" data-close type="button">Cancel</button><button class="btn btn-gold" id="pyGo" type="button">Save payment</button></div>');
    document.getElementById('pyGo').onclick = function () {
      api('payAdd', { id: i.id, amount: document.getElementById('pyAmt').value, date: document.getElementById('pyDate').value, method: document.getElementById('pyHow').value, ref: document.getElementById('pyRef').value })
        .then(function () { M.closeModal(); toast('💰 Payment recorded on ' + i.id); return load(); }).then(draw).catch(fail);
    };
  }
  // one project's billing: contract value and each milestone's share
  function project(core) {
    return api('acctBillGet', { core: core }).then(function (d) {
      var B = d.bill, ed = canEdit();
      var rows = B.milestones.map(function (m) { return '<tr><td>◆ <b>' + esc(m.name) + '</b><small>' + (m.due ? 'due ' + esc(day(m.due)) : '') + (m.done ? ' · ✓ done' : '') + '</small></td><td class="num">' + (ed && !m.invoice ? '<input type="number" class="fin-pc" min="0" max="100" step="0.5" data-ms="' + esc(m.tid) + '" value="' + (m.pct || '') + '">%' : m.pct + '%') + '</td>' +
        '<td class="num" data-amt="' + esc(m.tid) + '">' + money(m.amount) + '</td><td>' + (m.invoice ? '<b>' + esc(m.invoice.id) + '</b> · ' + (m.invoice.paid >= m.invoice.inc - 0.005 ? 'paid' : 'owed ' + money(m.invoice.inc - m.invoice.paid)) : m.ready ? (ed ? '<button class="btn btn-sm btn-gold" data-raise="' + esc(m.tid) + '" type="button">🧾 Raise invoice</button>' : 'ready to invoice') : m.done ? '<span class="muted">set a share to bill it</span>' : '<span class="muted">not done yet</span>') + '</td></tr>'; }).join('');
      M.view().innerHTML = '<div class="ceo fin"><div class="row ceo-head"><div><a href="#finance" class="btn btn-sm">← Finance</a></div><a class="btn btn-sm" href="#plan/' + encodeURIComponent(core) + '/schedule">📅 Open the plan</a></div>' +
        '<section class="card ceo-s"><h3>💵 Billing: ' + esc(B.name) + '</h3>' +
        '<div class="fin-form"><label>Contract value (before tax)<input type="number" min="0" step="1" id="bContract" value="' + (B.contractFrom === 'quote' ? B.contract : B.typed || '') + '"' + (B.contractFrom === 'quote' || !ed ? ' disabled' : '') + '></label>' + (B.contractFrom === 'quote' ? '<p class="muted" style="align-self:end">Set by the accepted quote.</p>' : '') + '</div>' +
        (B.milestones.length ? '<div class="table-wrap"><table class="ceo-tab"><thead><tr><th>Milestone</th><th class="num">Share of contract</th><th class="num">Amount</th><th>Invoice</th></tr></thead><tbody>' + rows + '</tbody><tfoot><tr><td><b>Total</b></td><td class="num"><b id="bTot">' + B.planned + '%</b></td><td class="num" id="bTotAmt"></td><td></td></tr></tfoot></table></div>'
          : '<p class="ceo-none">This plan has no milestones yet. Add milestones (tasks with 0 days) on the Gantt chart, then give each one a share of the contract here.</p>') +
        (ed ? '<div class="actions"><button class="btn btn-gold" id="bSave" type="button">💾 Save billing</button></div>' : '') + '</section></div>';
      var v = M.view(), cv = function () { return B.contractFrom === 'quote' ? B.contract : +(document.getElementById('bContract').value || 0); };
      var sync = function () { var t = 0; v.querySelectorAll('[data-ms]').forEach(function (i) { var p = +i.value || 0; t += p; var a = v.querySelector('[data-amt="' + i.getAttribute('data-ms') + '"]'); if (a) a.textContent = money(cv() * p / 100); });
        B.milestones.forEach(function (m) { if (m.invoice) t += m.pct; }); var e = document.getElementById('bTot'); if (e) { e.textContent = Math.round(t * 10) / 10 + '%'; e.className = t > 100.05 ? 'ceo-neg' : ''; } var ta = document.getElementById('bTotAmt'); if (ta) ta.textContent = money(cv() * Math.min(t, 100) / 100); };
      v.querySelectorAll('[data-ms],#bContract').forEach(function (i) { i.oninput = sync; }); sync();
      var sv = document.getElementById('bSave'); if (sv) sv.onclick = function () { var m = {}; B.milestones.forEach(function (x) { if (x.invoice) m[x.tid] = x.pct; }); v.querySelectorAll('[data-ms]').forEach(function (i) { m[i.getAttribute('data-ms')] = +i.value || 0; });
        api('acctBillSave', { core: core, contract: B.contractFrom === 'quote' ? B.typed : cv(), ms: m }).then(function () { toast('💾 Billing saved'); return project(core); }).catch(fail); };
      v.querySelectorAll('[data-raise]').forEach(function (b) { b.onclick = function () { raise(core, b.getAttribute('data-raise'), b).then(function () { return project(core); }).catch(fail); }; });
    });
  }
  function load() { return api('acctFinanceGet', {}).then(function (d) { F = d; }); }
  M.addView('finance', 'Finance', function (args) { M.view().innerHTML = '<div class="empty">Gathering the invoices…</div>'; if (args && args[0]) return project(args[0]); return load().then(draw); }, 'finance');
})();
