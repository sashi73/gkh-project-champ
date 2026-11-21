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
  var money2 = function (n) { n = Number(n) || 0; return (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };   // as it is, to the cent
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
  function dueChip(m) {
    if (!m.due) return ''; if (m.invoice) return '<small class="muted">due ' + esc(day(m.due)) + '</small>';
    var d = m.days, t = d == null ? '' : d < 0 ? Math.abs(d) + ' day' + (d === -1 ? '' : 's') + ' overdue' : d === 0 ? 'due today' : d === 1 ? 'due tomorrow' : 'due in ' + d + ' days';
    return '<span class="fin-due ' + (m.alert || 'green') + '" title="Due ' + esc(day(m.due)) + '">📅 ' + esc(day(m.due)) + (t ? ' · ' + t : '') + '</span>';
  }
  // 💹 profit in green, loss in red, always with the word
  function pl(n, small) { var p = n >= 0; return '<b class="' + (p ? 'fin-pos' : 'ceo-neg') + (small ? ' fin-plsm' : '') + '">' + (p ? 'Profit ' : 'Loss ') + money2(Math.abs(n)) + '</b>'; }
  function pct(n, of) { return of ? (Math.round(n / of * 1000) / 10) + '%' : ''; }
  // 📜 who keeps the unused contingency and reserve, in words, with this project's figures
  // 🧾 the argument behind the profit or loss, in plain words with this project's figures
  function plWhy(K) {
    var t = K.ctype || 'fixed', cost = K.eac, word = K.complete ? 'final cost' : 'forecast cost', R = K.contingency + K.reserve, mg = K.contract - K.budget, overB = cost - K.base;
    if (t === 'cost') return 'cost-plus: the client pays the ' + word + ' ' + money2(cost) + ' + the ' + (K.marginCfg || 0) + '% fee, so the fee ' + money2(K.profit) + ' is the profit. Overruns are paid by the client; unused reserves are never billed.';
    if (t === 'target' || t === 'gmp') { var tgt = K.contract / (1 + (K.marginCfg || 0) / 100), fee = K.contract - tgt, d = tgt - cost;
      return 'target cost ' + money2(tgt) + ', fee ' + money2(fee) + '. The ' + word + ' ' + money2(cost) + ' is ' + money2(Math.abs(d)) + (d >= 0 ? ' under the target: your ' + K.gain + '% share of that saving is ' + money2(K.yourSaving) + ', so profit = fee + ' + money2(K.yourSaving) + '.' :
        ' over the target: ' + (t === 'gmp' ? 'the client never pays above ' + money2(K.contract) + ', so the whole overrun comes off the fee: ' : 'your ' + K.pain + '% share of it is ' + money2(K.yourOverrun) + ': ') + 'profit = fee − ' + money2(t === 'gmp' ? -d : K.yourOverrun) + '.'); }
    var s = 'fixed price: the client pays ' + money2(K.contract) + ' whatever it costs; the ' + word + ' is ' + money2(cost) + '. ';
    if (cost <= K.budget) return s + 'That is within the project budget, so the profit is the margin ' + money2(mg) + ' + the contingency and reserve not needed ' + money2(K.budget - cost) + ' = ' + money2(K.profit) + '.';
    return s + 'It ran ' + money2(overB) + ' over the base cost (BAC ' + money2(K.base) + '): the contingency and reserve (' + money2(R) + ') absorbed ' + money2(Math.min(R, overB)) +
      (mg > 0.5 ? ', the margin (' + money2(mg) + ') absorbed ' + money2(Math.min(mg, Math.max(0, overB - R))) : ', and there was no margin to absorb more') +
      (K.profit < 0 ? '; the ' + money2(-K.profit) + ' left over is the loss.' : '; ' + money2(K.profit) + ' of the margin is left as profit.');
  }
  function plHow(K) { var c = K.complete ? 'final cost' : 'forecast cost', t = K.ctype || 'fixed';
    if (t === 'cost') return 'the ' + (K.marginCfg || 0) + '% fee on the ' + c;
    if (t === 'target' || t === 'gmp') return 'the fee' + (K.yourSaving ? ' + your share of the saving' : K.yourOverrun ? ' − ' + (t === 'gmp' ? 'the overrun above the guaranteed maximum' : 'your share of the overrun') : '') + ' (' + c + ' against the target)';
    return 'contract − ' + c; }
  function ctWho(K) {
    var u = K.unused || 0, t = K.ctype || 'fixed';
    if (t === 'cost') return 'The client pays the actual cost + ' + (K.marginCfg || 0) + '% fee. Unused contingency and reserve are never billed' + (K.revenue > K.contract + 0.5 ? '. On today\'s forecast the client pays <b class="fin-amb fin-sb">' + money2(K.revenue) + '</b>, ' + money2(K.revenue - K.contract) + ' above the contract value (it follows the actual cost).' : ': the client keeps ' + money2(K.clientSaves || 0) + ' on today\'s forecast.');
    if (t === 'target') return 'Saving below the target shared ' + K.gain + '% you / ' + (100 - K.gain) + '% the client; overrun shared ' + K.pain + '% you / ' + (100 - K.pain) + '% the client.' + (K.yourSaving ? ' On today\'s forecast: you ' + money2(K.yourSaving) + ', the client ' + money2(K.clientSaves) + '.' : K.yourOverrun ? ' Your share of the overrun: ' + money2(K.yourOverrun) + '.' : '');
    if (t === 'gmp') return 'The client never pays above ' + money2(K.contract) + '. A saving is shared ' + K.gain + '% you / ' + (100 - K.gain) + '% the client' + (K.yourSaving ? ' (today: you ' + money2(K.yourSaving) + ', the client ' + money2(K.clientSaves) + ')' : '') + '; an overrun is yours.';
    return 'The client pays the agreed price. Unused contingency and reserve are your profit' + (u ? ': ' + money2(u) + ' unused on today\'s forecast' : '') + '; an overrun is your loss.';
  }
  // 🏢 an internal project: the budget result, no contract, GST or profit. Positive = within budget by that much
  function bres(n) { return '<b class="' + (n >= 0 ? 'fin-pos' : 'ceo-neg') + '">' + (n >= 0 ? 'Within budget by ' : 'Over budget by ') + money2(Math.abs(n)) + '</b>'; }
  function internalPanel(B, K, t) {
    return '<div class="fin-panel"><div class="ceo-ts">' +
      t('Contract type', '<span class="fin-ct">🏢 Internal (no billing)</span>', 'A department\'s own project: no client, invoices, GST or profit.<br><a class="fin-lnk" href="#plan/' + encodeURIComponent(B.core) + '/budget">Set it on the Costing tab →</a>') +
      t('Project budget', money2(K.budget), 'Base cost (BAC) ' + money2(K.base) + ' + contingency ' + money2(K.contingency) + ' + reserve ' + money2(K.reserve) + (K.approved ? '<br>Charter approved budget ' + money2(K.approved) : '')) +
      t('Forecast cost', money2(K.eac), 'spent so far ' + money2(K.spent) + (K.CPI ? ' · <b class="' + (K.CPI < 1 ? 'ceo-neg' : 'fin-pos') + '">CPI ' + K.CPI.toFixed(2) + '</b>' : '') + (K.SPI ? ' · <b class="' + (K.SPI < 1 ? 'ceo-neg' : 'fin-pos') + '">SPI ' + K.SPI.toFixed(2) + '</b>' : '') +
        '<br>' + (K.complete ? 'The work is all done: this is the final cost.' : K.CPI ? 'Spent ' + money2(K.spent) + ' + work still to do ' + money2(K.toDo) + ' ÷ CPI ' + K.CPI.toFixed(2) + (K.loose ? ' + BOM lines not linked to a task ' + money2(K.loose) : '') + '.' : 'No actual costs entered yet, so the forecast is the base cost.'), K.vsBudget < 0 ? 'neg' : '') +
      t(K.complete ? 'Budget result (final)' : 'Budget result', bres(K.vsApproved != null ? K.vsApproved : K.vsBudget), K.vsApproved != null ? 'against the charter approved budget ' + money2(K.approved) : 'against the project budget ' + money2(K.budget), (K.vsApproved != null ? K.vsApproved : K.vsBudget) < 0 ? 'neg' : 'pos') +
      t('Budget scenarios', '<span class="fin-scn" style="display:flex;flex-direction:row;flex-wrap:wrap;gap:12px 48px">' +
          '<span><small>1 · contingency and management reserve both available (project budget ' + money2(K.budget) + ')</small>' + bres(K.vsBudget) + '</span>' +
          '<span><small>2 · management reserve held back (base + contingency ' + money2(K.base + K.contingency) + ')</small>' + bres(K.vsNoReserve) + '</span>' +
          '<span><small>3 · against the base cost alone (' + money2(K.base) + ')</small>' + bres(K.vsBase) + '</span></span>',
        'Contingency used so far: ' + money2(K.usedCont) + ' of ' + money2(K.contingency) + ' · management reserve used: ' + money2(K.usedRes) + ' of ' + money2(K.reserve) + '.', 'fin-wide') + '</div></div>';
  }
  function moneyPanel(B) {
    var K = B.money; if (!K) return '';
    if (K.internal) return internalPanel(B, K, function (l, v, s2, c) { return '<div class="ceo-t ' + (c || '') + '"><small>' + l + '</small><b>' + v + '</b>' + (s2 ? '<span>' + s2 + '</span>' : '') + '</div>'; });
    var t = function (l, v, s2, c) { return '<div class="ceo-t ' + (c || '') + '"><small>' + l + '</small><b>' + v + '</b>' + (s2 ? '<span>' + s2 + '</span>' : '') + '</div>'; };
    // 🧮 how the contract value is built, line by line (as the Costing tab): BAC + contingency + reserve = project budget, + margin = contract value, + GST
    var row = function (l, v, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + l + '</td><td class="num">' + v + '</td></tr>'; };
    var mg = K.contractFrom === 'quote' || K.contractFrom === 'typed' ? null : K.suggested - K.budget;
    var build = '<table class="fin-build">' + row('Base cost (BAC)', money2(K.base)) + row('+ Contingency ' + K.contPct + '%', money2(K.contingency)) + row('+ Management reserve ' + K.resPct + '%', money2(K.reserve)) +
      row('= Project budget', money2(K.budget), 'tot') +
      (K.ctype === 'cost' ? row('+ Fee ' + (K.marginCfg || 0) + '% (on the actual cost)', money2(K.budget * (K.marginCfg || 0) / 100)) : row('+ Margin ' + (K.marginCfg || 0) + '%', money2(K.contractBase - K.budget))) +
      (K.variations ? row('= Original contract value', money2(K.contractBase)) + row('+ Approved variations', money2(K.variations)) : '') +
      row('= Contract value', '<b>' + money2(K.contract) + '</b>', 'tot big') + row('+ GST ' + K.gstPct + '%', money2(K.gst)) + row('= Contract value with GST', money2(K.withGst), 'tot') + '</table>' +
      '<span>' + (K.contractFrom === 'quote' ? 'From the accepted quote.' : K.contractFrom === 'estimate' ? '<span class="fin-amb fin-sb">The client price from Costing, not confirmed yet.</span>' : 'Confirmed.') +
      (K.approved ? ' Charter approved budget ' + money2(K.approved) + ' · <b class="' + (K.approved - K.budget >= 0 ? 'fin-pos' : 'ceo-neg') + '">' + (K.approved - K.budget >= 0 ? money2(K.approved - K.budget) + ' to spare' : money2(K.budget - K.approved) + ' over') + '</b>.' : '') +
      (K.variationsWaiting ? ' <span class="fin-amb fin-sb">' + money2(K.variationsWaiting) + ' in variations waiting.</span>' : '') + ' <a class="fin-lnk" href="#plan/' + encodeURIComponent(B.core) + '/budget">Costing →</a></span>';
    return '<div class="fin-panel"><div class="ceo-ts">' +
      '<div class="ceo-t fin-w2"><small>How the contract value is built</small>' + build + '</div>' +
      t('Contract type', '<span class="fin-ct">📜 ' + esc(K.ctypeName || 'Fixed price (lump sum)') + '</span>', ctWho(K) + '<br><a class="fin-lnk" href="#plan/' + encodeURIComponent(B.core) + '/budget">Set it on the Costing tab →</a>') +
      t(K.complete ? 'Profit or loss (final)' : 'Forecast profit or loss', K.profit == null ? '–' : pl(K.profit), K.profit == null ? 'set the contract value' : pct(K.profit, K.contract) + ' of the contract · ' + plHow(K) + '<br><b class="fin-why">Why:</b> ' + esc(K.why || plWhy(K)), K.profit != null && K.profit < 0 ? 'neg' : 'pos') +
      '<div class="ceo-t fin-w2' + (K.CPI && K.CPI < 0.9 ? ' neg' : '') + '"><small>Forecast cost</small><b>' + money2(K.eac) + '</b><span>spent so far ' + money2(K.spent) +
        (K.CPI ? ' · <b class="' + (K.CPI < 1 ? 'ceo-neg' : 'fin-pos') + '">CPI ' + K.CPI.toFixed(2) + '</b>' : '') + (K.complete && K.timeIdx ? ' · <b class="' + (K.timeIdx.index < 1 ? 'ceo-neg' : 'fin-pos') + '">time index ' + K.timeIdx.index.toFixed(2) + '</b>' : K.SPI ? ' · <b class="' + (K.SPI < 1 ? 'ceo-neg' : 'fin-pos') + '">SPI ' + K.SPI.toFixed(2) + '</b>' : '') + '</span>' +
        (K.complete && K.timeIdx ? '<span>🏁 Finished: using the <b>time index</b> (planned ÷ actual duration) rather than SPI, which is always 1.00 once all the work is done. ' + K.timeIdx.actual + ' working days against ' + K.timeIdx.planned + ' planned' + (K.timeIdx.lateDays ? ', ' + K.timeIdx.lateDays + ' days late' : ', on time') + '.</span>' : '') + cpiBasis(K, B.core) + '</div>' +
      t('Profit scenarios', K.profit == null ? '–' : '<span class="fin-scn" style="display:flex;flex-direction:column;gap:8px">' +
          '<span><small>1 · contingency and management reserve both used</small>' + pl(K.profit1, true) + '</span><span><small>2 · management reserve not used</small>' + pl(K.profit2, true) + '</span></span>',
        K.profit == null ? 'set the contract value' : K.complete ? 'The project is complete: the cost is final, so these match the profit above.' : 'The reserves pay for overruns, so each scenario costs the forecast cost or what that scenario allows, whichever is higher, and the profit follows the contract type.', 'fin-w2') +
      '</div></div>';
  }
  // 🔎 on what basis CPI is what it is: labour and services vs materials (BOM), and the forecast built from each
  function cpiBasis(K, core) {
    var S = K.split; if (!S || K.CPI == null) return '<span>' + (K.complete ? 'The work is all done: this is the final cost.' : '<b class="fin-amb">No actual costs recorded yet, so CPI cannot be measured (Champ does not guess it): the forecast is the base cost.</b> Record what the work has cost at each milestone (the plan asks when a milestone is ticked done).') + '</span>';
    var L = S.lab, ev = L.cover != null ? '<span class="' + (L.cover < 60 ? 'fin-amb' : '') + '">📏 <b>Evidence:</b> CPI is measured from the actual costs recorded on ' + L.nAct + ' of ' + L.nProg + ' task' + (L.nProg === 1 ? '' : 's') + ' with labour work done (' + L.cover + '% of the labour work done)' + (L.cover < 100 ? '; the rest is assumed on budget until recorded' : '') + '.' + (L.cover < 60 ? ' Too little to rely on.' : '') + '</span>' : '';
    var c = function (x) { return x == null ? '<span class="muted">no actual yet</span>' : '<b class="' + (x < 1 ? 'ceo-neg' : 'fin-pos') + '">' + x.toFixed(2) + '</b>'; };
    return ev + '<table class="fin-cpi"><thead><tr><th>Where</th><th class="num">Budget</th><th class="num">Earned</th><th class="num">Spent</th><th class="num">CPI</th><th></th></tr></thead><tbody>' +
      '<tr><td>👷 Labour and services</td><td class="num">' + money2(S.lab.bac) + '</td><td class="num">' + money2(S.lab.evIn) + '</td><td class="num">' + money2(S.lab.acIn) + '</td><td class="num">' + c(S.lab.CPI) + '</td><td>CPI and SPI measure this</td></tr>' +
      '<tr><td>🧱 Materials (BOM)</td><td class="num">' + money2(S.mat.bac) + '</td><td class="num">' + money2(S.mat.ev) + '</td><td class="num">' + money2(S.mat.ev) + '</td><td class="num"><span class="muted">—</span></td><td>held at the baselined BOM price</td></tr></tbody></table>' +
      '<span>🧱 The BOM is priced and baselined, so materials count at the BOM price and never move CPI. A material price change is a <b>BOM change</b>: record it in the BOM, sign it off and re-baseline; it changes the budget, not CPI.' +
      (S.bomDiff && Math.abs(S.bomDiff) >= 0.5 ? ' <b class="fin-amb">⚠ ' + money2(S.bomDiff) + ' spent on ' + S.bomDiffTasks + ' materials task' + (S.bomDiffTasks === 1 ? '' : 's') + ' ' + (S.bomDiff > 0 ? 'above' : 'below') + ' the BOM price, not yet recorded as a BOM change: record it in the BOM and re-baseline.</b>' : '') +
      (K.baseChange != null && Math.abs(K.baseChange) >= 0.5 ? ' 📌 Since the baseline' + (K.baselineAt ? ' (' + new Date(K.baselineAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) + ')' : '') + ' the base cost has changed by ' + (K.baseChange > 0 ? '+' : '') + money2(K.baseChange) + ': recorded BOM and scope changes (a budget change, not an overrun).' : '') + '</span>' +
      '<span>' + (K.complete ? 'All the work is done, so the forecast is the final cost: what was spent.' : 'Forecast = spent ' + money2(K.spent) + ' + the labour and services still to do ÷ CPI ' + (S.lab.CPI != null ? S.lab.CPI.toFixed(2) : '1.00') + ' + the materials still to buy at the BOM price' + (K.loose ? ' + BOM lines not linked to a task ' + money2(K.loose) : '') + '.') +
      (K.timeIdx && K.timeIdx.index < 0.95 && S.lab.CPI != null && S.lab.CPI < 1 ? ' ⏱ The work took ' + Math.round((1 / K.timeIdx.index - 1) * 100) + '% longer than planned (time index ' + K.timeIdx.index.toFixed(2) + '): labour, supervision and hire are paid by time, so a late finish raises them; that is the likely cause of the labour overrun.' : '') +
      ' <a class="fin-lnk" href="#plan/' + encodeURIComponent(core) + '/overview">Which tasks: the Overview tab →</a></span>';
  }

  function wb(S) { return '<span class="fin-wbw" title="Work done ' + S.workPct + '% · billed ' + S.billedPct + '%"><span class="fin-wb"><i style="width:' + S.workPct + '%"></i><em style="width:' + S.billedPct + '%"></em></span><small>' + S.workPct + '% done · ' + S.billedPct + '% billed</small></span>'; }
  // 📍 every project: where it stands on billing, worst first
  // 🔎 search and filter the projects: by name, client, reference or program, by program, and by status
  var FQ = { q: '', prog: '', tone: '' };
  function bindStand(T) {
    var w = document.getElementById('fsWrap'); if (!w) return;
    var redo = function (keep) { var pos = keep ? document.getElementById('fsQ').selectionStart : null; w.innerHTML = standHtml(F.projects, T); bindStand(T); if (keep) { var q = document.getElementById('fsQ'); q.focus(); q.setSelectionRange(pos, pos); } };
    var q = document.getElementById('fsQ'); q.oninput = function () { FQ.q = q.value.trim().toLowerCase(); redo(true); };
    document.getElementById('fsP').onchange = function () { FQ.prog = this.value; redo(false); };
    var x = document.getElementById('fsX'); if (x) x.onclick = function () { FQ = { q: '', prog: '', tone: '' }; redo(false); };
    w.querySelectorAll('[data-tone]').forEach(function (b) { b.onclick = function () { var t = b.getAttribute('data-tone'); FQ.tone = FQ.tone === t ? '' : t; redo(false); }; });
    w.querySelectorAll('[data-bill]').forEach(function (r) { r.onclick = function () { location.hash = '#finance/' + encodeURIComponent(r.getAttribute('data-bill')); }; });
  }
  function standHtml(P0, T) {
    var n = { red: 0, amber: 0, green: 0, grey: 0 }; P0.forEach(function (p) { n[p.stand.status.tone]++; });
    var progs = P0.map(function (p) { return p.program || ''; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).sort();
    var P = P0.filter(function (p) { return (!FQ.prog || (p.program || '') === FQ.prog) && (!FQ.tone || p.stand.status.tone === FQ.tone) &&
      (!FQ.q || [p.name, p.client, p.ref, p.program, p.stand.status.text].join(' ').toLowerCase().indexOf(FQ.q) >= 0); });
    return '<section class="card ceo-s"><h3>📍 Where each project stands on billing</h3>' +
      '<div class="fin-find"><input type="search" id="fsQ" placeholder="🔎 Search project, client, reference or program…" value="' + esc(FQ.q) + '">' +
        '<select id="fsP"><option value="">All programs</option>' + progs.map(function (g) { return '<option' + (g === FQ.prog ? ' selected' : '') + '>' + esc(g) + '</option>'; }).join('') + '</select>' +
        (FQ.q || FQ.prog || FQ.tone ? '<button class="btn btn-sm" id="fsX" type="button">✕ Clear</button><span class="muted">' + P.length + ' of ' + P0.length + '</span>' : '') + '</div>' +
      '<p class="fin-counts"><button type="button" class="fin-pill red' + (FQ.tone === 'red' ? ' on' : '') + '" data-tone="red">' + n.red + ' need billing action</button><button type="button" class="fin-pill amber' + (FQ.tone === 'amber' ? ' on' : '') + '" data-tone="amber">' + n.amber + ' need setting up</button><button type="button" class="fin-pill green' + (FQ.tone === 'green' ? ' on' : '') + '" data-tone="green">' + n.green + ' up to date</button>' + (n.grey ? '<button type="button" class="fin-pill grey' + (FQ.tone === 'grey' ? ' on' : '') + '" data-tone="grey">🏢 ' + n.grey + ' internal (no billing)</button>' : '') + '</p>' +
      (T.estimatedN ? '<div class="fin-est">📐 <b>' + T.estimatedN + ' of ' + (T.projectsN - (T.internalN || 0)) + ' client projects have no confirmed contract value.</b> Until the CFO confirms one, Champ estimates it from the project\'s Costing (budget, reserves and margin) and splits it evenly across the milestones, so you can see what is due. Estimates are marked <b class="fin-amb">estimate</b>; open a project to confirm its figures.</div>' : '') +
      '<div class="table-wrap"><table class="ceo-tab ceo-rows"><thead><tr><th>Project</th><th>Status</th><th class="num">Contract</th><th>Work done vs billed</th><th class="num">Work done, not billed</th><th class="num">Received</th><th class="num">Owed</th></tr></thead><tbody>' +
      (P.length ? P.map(function (p) { var S = p.stand;
        return '<tr data-bill="' + esc(p.core) + '" class="click"><td><b>' + esc(p.name) + '</b><small>' + (p.program ? '🗂 ' + esc(p.program) + ' · ' : '') + p.ms + ' milestone' + (p.ms === 1 ? '' : 's') + (p.next ? ' · next: ' + esc(p.next) : '') + '</small></td><td><span class="fin-pill ' + S.status.tone + '">' + esc(S.status.text) + '</span></td>' +
          '<td class="num">' + (S.internal ? '<span class="muted">internal</span>' : p.contract ? money(p.contract) + '<small' + (S.estimate ? ' class="fin-amb">estimate' : '>' + (p.contractFrom === 'quote' ? 'accepted quote' : 'confirmed')) + '</small>' : '<span class="muted">not set</span>') + '</td>' +
          '<td>' + (S.internal ? '<small class="muted">' + S.workPct + '% done · no billing</small>' : wb(S)) + '</td><td class="num">' + (S.unbilled > 0 ? '<b>' + money(S.unbilled) + '</b>' : money(0)) + '</td><td class="num">' + money(p.received) + '</td><td class="num">' + (S.overdueN ? '<b class="ceo-neg">' + money(p.owed) + '</b>' : money(p.owed)) + '</td></tr>'; }).join('')
        : '<tr><td colspan="7" class="muted" style="text-align:center">' + (P0.length ? 'No project matches. Try another word, or ✕ Clear.' : 'No projects yet.') + '</td></tr>') + '</tbody></table></div></section>';
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
      '<div class="ceo-ts">' + tile('Contract value', money(T.contract), T.estimatedN ? money(T.signed) + ' confirmed · <span class="fin-amb fin-sb">' + money(T.estimated) + ' estimated (' + T.estimatedN + ' project' + (T.estimatedN === 1 ? '' : 's') + ')</span>' : 'before tax, all confirmed', T.estimatedN ? 'warn' : '') + tile('Invoiced', money(T.invoicedInc), F.invoices.filter(function (i) { return i.status !== 'draft'; }).length + ' invoices') + tile('Received', money(T.received), T.invoicedInc ? Math.round(T.received / T.invoicedInc * 100) + '% of invoiced' : '') +
        tile('Still owed', money(T.owed), T.overdue ? '<b class="ceo-neg">' + money(T.overdue) + ' overdue (' + T.overdueN + ')</b>' : 'none overdue', T.overdue ? 'neg' : '') + tile('Ready to invoice', money(T.ready), T.readyN ? T.readyN + ' milestone' + (T.readyN === 1 ? '' : 's') + ' done, not billed' : 'nothing waiting', T.readyN ? 'warn' : '') +
        tile('Work done, not yet billed', money(T.unbilled), 'earned on the plan, not invoiced', T.unbilled > 0 ? 'warn' : '') + '</div><div id="fsWrap">' + standHtml(F.projects, T) + '</div>' +
      (F.coming && F.coming.length ? '<section class="card ceo-s"><h3>📅 Billing coming due</h3><div class="table-wrap"><table class="ceo-tab"><thead><tr><th>Project</th><th>Milestone</th><th>Due</th><th class="num">Amount (before GST)</th></tr></thead><tbody>' +
        F.coming.slice(0, 30).map(function (x) { return '<tr data-bill="' + esc(x.core) + '" class="click"><td><b>' + esc(x.project) + '</b></td><td>◆ ' + esc(x.name) + (x.ready ? ' <small class="ceo-pos">✓ done, ready to invoice</small>' : '') + '</td><td>' + dueChip(x) + '</td><td class="num">' + money(x.amount) + '</td></tr>'; }).join('') + '</tbody></table></div><p class="ceo-legend fin-leg">🔴 flashing: due within a week (less for short projects such as events) · 🟠 within a month · 🟢 later</p></section>' : '') +
      '<section class="card ceo-s"><h3>🔔 Ready to invoice</h3>' + (F.ready.length ? '<div class="table-wrap"><table class="ceo-tab"><thead><tr><th>Project</th><th>Milestone</th><th>Done by</th><th class="num">Share</th><th class="num">Amount (before tax)</th><th></th></tr></thead><tbody>' +
        F.ready.map(function (r) { return '<tr><td><b>' + esc(r.project) + '</b></td><td>◆ ' + esc(r.name) + '</td><td>' + esc(day(r.due)) + '</td><td class="num">' + r.pct + '%</td><td class="num"><b>' + money(r.amount) + '</b>' + (r.confirm ? '<small class="fin-amb">estimate</small>' : '') + '</td><td class="num">' + (r.confirm ? '<button class="btn btn-sm" data-bill="' + esc(r.core) + '" type="button" title="The contract value or the shares are still an estimate">✓ Confirm billing first</button>' : ed ? '<button class="btn btn-sm btn-gold" data-raise="' + esc(r.core) + '|' + esc(r.tid) + '" type="button">🧾 Raise invoice</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : '<p class="muted">No milestone is waiting to be billed. A milestone shows here once it reaches 100% and has a share of the contract.</p>') + '</section>' +
      '<section class="card ceo-s"><h3>🧾 Invoices</h3><div class="fin-tabs">' + tab('open', 'Unpaid', F.invoices.filter(function (i) { return i.status !== 'draft' && i.balance > 0.005; }).length) + tab('late', 'Overdue', T.overdueN) + tab('paid', 'Paid') + tab('draft', 'Drafts', T.drafts) + tab('all', 'All') + '</div>' +
        '<div class="table-wrap"><table class="ceo-tab"><thead><tr><th>Invoice</th><th>Project</th><th>Issued</th><th class="num">Amount</th><th class="num">Paid</th><th class="num">Owed</th><th>Status</th><th></th></tr></thead><tbody>' +
        (L.length ? L.map(function (i) { return '<tr><td><b>' + esc(i.id) + '</b>' + (i.milestone ? '<small>' + esc(i.milestone.replace(/^Milestone: /, '◆ ').replace(/ \(.*$/, '')) + '</small>' : '') + '</td><td>' + esc(i.project) + '</td><td>' + esc(day(i.issued)) + '</td><td class="num">' + money(i.inc) + '</td><td class="num">' + money(i.paid) + '</td><td class="num">' + (i.balance > 0.005 ? '<b>' + money(i.balance) + '</b>' : '–') + '</td><td>' + st(i) + '</td>' +
          '<td class="num nowrap">' + (ed && i.balance > 0.005 && i.status !== 'draft' ? '<button class="btn btn-sm" data-pay="' + esc(i.id) + '" type="button">💰 Record payment</button> ' : '') + '<a class="btn btn-sm" target="_blank" rel="noopener" href="' + M.API + '?action=pdf&id=' + encodeURIComponent(i.id) + '">PDF</a></td></tr>'; }).join('') : '<tr><td colspan="8" class="muted" style="text-align:center;padding:16px">No invoices here.</td></tr>') + '</tbody></table></div></section>' +
      '<div class="ceo-2"><section class="card ceo-s"><h3>💳 Cash in by month</h3>' + bars(F.cash) + '</section>' +
        '<section class="card ceo-s"><h3>⏳ What is owed, by age</h3><div class="fin-age">' + [['Not yet due', A.current, ''], ['1–30 days late', A.d1_30, 'a'], ['31–60 days', A.d31_60, 'r'], ['61–90 days', A.d61_90, 'r'], ['Over 90 days', A.d90, 'r']].map(function (x) { return '<div class="' + (x[1] > 0 ? x[2] : '') + '"><span>' + x[0] + '</span><b>' + money(x[1]) + '</b></div>'; }).join('') + '</div></section></div>' +
      '<p class="muted ceo-note">Invoices are raised from milestones: when a milestone reaches 100%, it waits under Ready to invoice. Invoiced, received and owed include tax; contract value and milestone amounts are before tax.</p></div>';
    var v = M.view();
    v.querySelector('#finRe').onclick = function () { load().then(draw).then(function () { toast('Up to date'); }).catch(fail); };
    v.querySelector('#finPr').onclick = function () { window.print(); };
    v.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { filt = b.getAttribute('data-f'); draw(); }; });
    v.querySelectorAll('[data-bill]').forEach(function (r) { r.onclick = function () { location.hash = '#finance/' + encodeURIComponent(r.getAttribute('data-bill')); }; });
    bindStand(T);
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
      var B = d.bill, ed = canEdit(), K = B.money || {}, g = B.gstPct != null ? B.gstPct : 10, est = B.stand && B.stand.estimate, auto = B.stand && B.stand.auto;
      var rows = B.milestones.map(function (m) { return '<tr><td>◆ <b>' + esc(m.name) + '</b><div>' + dueChip(m) + (m.done ? ' <small class="muted">✓ done</small>' : '') + '</div></td><td class="num">' + (ed && !m.invoice ? '<input type="number" class="fin-pc" min="0" max="100" step="0.5" data-ms="' + esc(m.tid) + '" value="' + (m.pct || '') + '">%' : m.pct + '%') + '</td>' +
        '<td class="num" data-amt="' + esc(m.tid) + '">' + money2(m.amount) + '</td><td class="num" data-gst="' + esc(m.tid) + '">' + money2(m.gst) + '</td><td class="num"><b data-inc="' + esc(m.tid) + '">' + money2(m.inc) + '</b></td><td>' + (m.invoice ? '<b>' + esc(m.invoice.id) + '</b> · ' + (m.invoice.paid >= m.invoice.inc - 0.005 ? 'paid' : 'owed ' + money2(m.invoice.inc - m.invoice.paid)) : m.ready && m.confirm ? '<b class="fin-amb">✓ done: confirm the billing to invoice it</b>' : m.ready ? (ed ? '<button class="btn btn-sm btn-gold" data-raise="' + esc(m.tid) + '" type="button">🧾 Raise invoice</button>' : 'ready to invoice') : m.done ? '<b class="fin-amb">✓ done: set a share to bill it</b>' : '<span class="muted">not done yet</span>') + '</td></tr>'; }).join('');
      var isInt = !!(B.stand && B.stand.internal), VS = B.vos || [], wait = function (s) { return ['Proposed', 'Under review', 'CCB meeting'].indexOf(s) >= 0; };
      var voHtml = '<section class="card ceo-s"><div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">📝 Variation orders</h3>' + (d.canRaiseVO ? '<button class="btn btn-sm btn-gold" id="voNew" type="button">📝 Raise a variation order</button>' : '') + '</div>' +
        '<p class="ceo-f">The contract value is not changed on this screen. A change to it is raised as a variation order: it goes to the project manager and the program director, it is recorded in the project\'s Change control register, and once the program director approves it, it is added to the contract value.</p>' +
        (VS.length ? '<div class="table-wrap"><table class="ceo-tab"><thead><tr><th>VO</th><th>What for</th><th class="num">Change (before GST)</th><th>Raised</th><th>Status</th><th></th></tr></thead><tbody>' + VS.map(function (x) {
          return '<tr><td><b>' + esc(x.num) + '</b></td><td>' + esc(x.title) + (x.reason ? '<small>' + esc(x.reason) + '</small>' : '') + '</td><td class="num"><b>' + (x.amount > 0 ? '+' : '') + money2(x.amount) + '</b></td><td>' + esc(x.by || '') + '<small>' + (x.at ? new Date(x.at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' }) : '') + '</small></td>' +
            '<td><span class="fin-pill ' + (wait(x.status) ? 'amber' : x.status === 'Rejected' ? 'red' : 'green') + '">' + esc(wait(x.status) ? 'Waiting for approval' : x.status) + '</span>' + (x.decision ? '<small>' + esc(x.decision.by) + (x.decision.note ? ': ' + esc(x.decision.note) : '') + '</small>' : '') + '</td>' +
            '<td class="num nowrap">' + (wait(x.status) && d.canDecideVO ? '<button class="btn btn-sm btn-gold" data-vo="' + esc(x.id) + '|Approved" type="button">✓ Approve</button> <button class="btn btn-sm" data-vo="' + esc(x.id) + '|Rejected" type="button">✕ Reject</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>'
          : '<p class="muted">No variation orders yet.</p>') + '</section>';
      M.view().innerHTML = '<div class="ceo fin"><div class="row ceo-head"><div><a href="#finance" class="btn btn-sm">← Finance</a></div><a class="btn btn-sm" href="#plan/' + encodeURIComponent(core) + '/schedule">📅 Open the plan</a></div>' +
        '<section class="card ceo-s"><h3>💵 Billing: ' + esc(B.name) + '</h3>' + (B.stand ? '<div class="fin-standline"><span class="fin-pill ' + B.stand.status.tone + '">' + esc(B.stand.status.text) + '</span>' + (isInt ? '<span class="muted">' + B.stand.workPct + '% done</span>' : wb(B.stand) + '<span>Work done, not billed: <b>' + money2(B.stand.unbilled) + '</b></span>') + '</div>' : '') + moneyPanel(B) +
        (est || auto ? '<div class="fin-est">📐 <b>' + (est && auto ? 'The contract value and the milestone shares are not confirmed yet' : est ? 'The contract value is not confirmed yet' : 'The milestone shares are a suggestion') + '.</b> ' +
          (est ? 'The contract value is the client price from this project\'s Costing (' + money2(K.contractBase) + '), as there is no accepted quote. ' : '') + (auto ? 'The contract is split evenly across the milestones. ' : '') +
          (ed ? 'Check the shares and press <b>✓ Confirm the contract value and shares</b>. After that, the contract value only changes through a variation order. Invoices can be raised once it is confirmed.' : 'The CFO confirms them before any invoice is raised.') + '</div>' : '') +
        (isInt ? '<div class="fin-est">🏢 <b>An internal project: there is no client to invoice.</b> No contract value, milestone invoices, GST or profit. It is judged on its budget: the forecast cost against the project budget, shown above. Change the budget on the plan\'s Costing tab.</div>'
          : B.milestones.length ? '<div class="table-wrap"><table class="ceo-tab"><thead><tr><th>Milestone</th><th class="num">Share of contract</th><th class="num">Amount (before GST)</th><th class="num">GST ' + g + '%</th><th class="num">To bill (incl. GST)</th><th>Invoice</th></tr></thead><tbody>' + rows +
            '</tbody><tfoot><tr><td><b>Total</b></td><td class="num"><b id="bTot">' + B.planned + '%</b></td><td class="num" id="bTotAmt"></td><td class="num" id="bTotGst"></td><td class="num"><b id="bTotInc"></b></td><td></td></tr></tfoot></table></div>'
          + (B.spread ? '<p class="muted" style="font-size:12.5px;margin:14px 0 0">Invoiced milestones keep the amount they were billed. What is left of the contract value, approved variations included, is spread over the milestones not yet invoiced, by their shares.</p>' : '')
          : '<p class="ceo-none">This plan has no milestones yet. Add milestones (tasks with 0 days) on the Gantt chart, then give each one a share of the contract here.</p>') +
        (ed && !isInt ? '<div class="actions"><button class="btn btn-gold" id="bSave" type="button">' + (est || auto ? '✓ Confirm the contract value and shares' : '💾 Save the milestone shares') + '</button></div>' : '') + '</section>' + (isInt ? '' : voHtml) + '</div>';
      var v = M.view(), cv = function () { return B.contract || 0; }, r2 = function (n) { return Math.round(n * 100) / 100; };
      var sync = function () { var t = 0, rest = 0, inv = { a: 0, g: 0, i: 0 }; v.querySelectorAll('[data-ms]').forEach(function (i) { rest += +i.value || 0; });
        B.milestones.forEach(function (m) { if (m.invoice) { t += m.pct; inv.a += m.amount; inv.g += m.gst; inv.i += m.inc; } });
        var pool = B.billedEx > 0 && rest > 0 ? Math.max(0, cv() * Math.min(100, t + rest) / 100 - B.billedEx) : null, sa = 0;
        v.querySelectorAll('[data-ms]').forEach(function (i) { var p = +i.value || 0, id = i.getAttribute('data-ms'), a = pool != null ? r2(pool * p / rest) : r2(cv() * p / 100); t += p; sa += a;
          var set = function (k, x) { var e = v.querySelector('[data-' + k + '="' + id + '"]'); if (e) e.textContent = money2(x); }; set('amt', a); set('gst', r2(a * g / 100)); set('inc', r2(a * (1 + g / 100))); });
        var e = document.getElementById('bTot'); if (e) { e.textContent = Math.round(t * 10) / 10 + '%'; e.className = t > 100.05 ? 'ceo-neg' : ''; }
        var S = function (id, x) { var el = document.getElementById(id); if (el) el.textContent = money2(x); }; S('bTotAmt', r2(inv.a + sa)); S('bTotGst', r2(inv.g + sa * g / 100)); S('bTotInc', r2(inv.i + sa * (1 + g / 100))); };
      v.querySelectorAll('[data-ms]').forEach(function (i) { i.oninput = sync; }); sync();
      var sv = document.getElementById('bSave'); if (sv) sv.onclick = function () { var m = {}; B.milestones.forEach(function (x) { if (x.invoice) m[x.tid] = x.pct; }); v.querySelectorAll('[data-ms]').forEach(function (i) { m[i.getAttribute('data-ms')] = +i.value || 0; });
        api('acctBillSave', { core: core, contract: B.contractFrom === 'quote' ? B.typed : (K.contractBase || 0), ms: m }).then(function () { toast(est || auto ? '✓ Contract value and shares confirmed' : '💾 Shares saved'); return project(core); }).catch(fail); };
      v.querySelectorAll('[data-raise]').forEach(function (b) { b.onclick = function () { raise(core, b.getAttribute('data-raise'), b).then(function () { return project(core); }).catch(fail); }; });
      var vn = document.getElementById('voNew'); if (vn) vn.onclick = function () { voModal(core, B); };
      v.querySelectorAll('[data-vo]').forEach(function (b) { b.onclick = function () { var x = b.getAttribute('data-vo').split('|'), ok = x[1] === 'Approved', vo = VS.filter(function (y) { return y.id === x[0]; })[0] || {};
        M.modal('<h2>' + (ok ? '✓ Approve ' : '✕ Reject ') + esc(vo.num) + '</h2><p>' + esc(vo.title) + ': <b>' + (vo.amount > 0 ? '+' : '') + money2(vo.amount) + '</b> to the contract value (before GST).' + (ok ? ' The contract value becomes <b>' + money2((B.contract || 0) + vo.amount) + '</b>.' : '') + '</p>' +
          '<div class="fin-form"><label style="grid-column:1/-1">Note (optional)<input id="voNote" placeholder="' + (ok ? 'e.g. agreed with the client on 21 Nov' : 'why it is rejected') + '"></label></div><div class="actions"><button class="btn" data-close type="button">Cancel</button><button class="btn btn-gold" id="voGo" type="button">' + (ok ? '✓ Approve' : '✕ Reject') + '</button></div>');
        document.getElementById('voGo').onclick = function () { api('acctVoDecide', { core: core, id: x[0], outcome: x[1], note: document.getElementById('voNote').value }).then(function () { M.closeModal(); toast(vo.num + (ok ? ' approved: the contract value is updated' : ' rejected')); return project(core); }).catch(fail); }; }; });
    });
  }
  function voModal(core, B) {
    M.modal('<h2>📝 Raise a variation order</h2><p class="muted" style="margin:-4px 0 10px">' + esc(B.name) + ' · contract value now ' + money2(B.contract) + ' (before GST)</p>' +
      '<div class="fin-form"><label>Change to the contract value (before GST)<input type="number" step="0.01" id="voAmt" placeholder="e.g. 1500, or -500 for a reduction"></label><label>What it is for<input id="voTitle" maxlength="160" placeholder="e.g. 10 extra guests and a second cake"></label>' +
      '<label style="grid-column:1/-1">Reason and what the client agreed<textarea id="voWhy" rows="3" maxlength="2000"></textarea></label></div>' +
      '<p class="muted" style="font-size:12.5px">It goes to the project manager and the program director (a note in their Today) and into the project\'s Change control register. The contract value changes once the program director approves it.</p>' +
      '<div class="actions"><button class="btn" data-close type="button">Cancel</button><button class="btn btn-gold" id="voSend" type="button">📝 Raise it</button></div>');
    document.getElementById('voSend').onclick = function () { var b = this; b.disabled = true;
      api('acctVoRaise', { core: core, amount: document.getElementById('voAmt').value, title: document.getElementById('voTitle').value, reason: document.getElementById('voWhy').value })
        .then(function (r) { M.closeModal(); toast('📝 ' + r.voNum + ' raised' + (r.told && r.told.length ? ' and sent to ' + r.told.join(' and ') : '') + ' for approval'); return project(core); }).catch(function (e) { b.disabled = false; fail(e); }); };
  }
  function load() { return api('acctFinanceGet', {}).then(function (d) { F = d; }); }
  // 🔴 the red count on the Finance menu: milestones due soon and not billed, milestones ready to invoice, overdue invoices
  var lastB = 0;
  M.finBadge = function (force) {
    if (!force && Date.now() - lastB < 60000) return; lastB = Date.now();
    api('acctBillAlerts', {}).then(function (c) { var a = document.querySelector('.side-nav [data-nav="finance"]'); if (!a) return;
      if (c.projects > 0) a.hidden = false;
      var el = a.querySelector('.tdy-badge'); if (!c.count) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('span'); el.className = 'tdy-badge fin-badge'; a.appendChild(el); } el.textContent = c.count > 99 ? '99+' : String(c.count);
      el.title = c.red + ' milestone' + (c.red === 1 ? '' : 's') + ' due within a week, not billed · ' + c.ready + ' ready to invoice · ' + c.overdue + ' overdue invoice' + (c.overdue === 1 ? '' : 's'); }).catch(function () {});
  };
  window.addEventListener('hashchange', function () { M.finBadge(); });
  M.addView('finance', 'Finance', function (args) { setTimeout(function () { M.finBadge(true); }, 800); M.view().innerHTML = '<div class="empty">Gathering the invoices…</div>'; if (args && args[0]) return project(args[0]); return load().then(draw); }, 'finance');
})();
