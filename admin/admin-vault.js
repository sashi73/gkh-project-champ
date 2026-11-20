/* 🔒 The Finance vault: Program → Project → 📜 Contracts · 💵 Billing · 🧾 Invoices · 🗂 Documents, like a directory tree.
     Opens for: the super user, the CEO, the CFO, and the program director named on the program. No one else.
     Files: the CFO (and the super user) into any folder; project managers and directors into Contracts and Documents only,
     and their team gets a redacted copy in the project's documents. Data: vaultTree / vaultList / vaultUrl / vaultAdd / vaultFile / vaultDelete / vaultMoveIn. */
(function () {
  'use strict';
  var M = window.MBS; if (!M) return;
  var api = M.api, esc = M.esc, toast = M.toast, fail = M.fail;
  var T = null, open = {}, sel = null;   // sel: { core, folder }
  var FN = { contracts: '📜 Contracts', billing: '💵 Billing', invoices: '🧾 Invoices', documents: '🗂 Documents' };
  var when = function (t) { return t ? new Date(t).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: '2-digit', hour: 'numeric', minute: '2-digit' }) : ''; };
  var money = function (n) { return '$' + Math.round(Number(n) || 0).toLocaleString('en-AU'); };
  var size = function (b) { return !b ? '' : b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; };
  function projOf(core) { var r = null; (T.programs || []).forEach(function (g) { g.projects.forEach(function (p) { if (p.core === core) r = { g: g, p: p }; }); }); return r; }

  function treeHtml() {
    if (!T.programs.length) return '<p class="muted" style="padding:10px">No programs or projects you can file into.</p>';
    return '<ul class="vt"><li class="vt-root">🏢 <b>Finance vault</b><ul>' + T.programs.map(function (g) {
      var go = open['g' + g.id] !== false;
      return '<li><button type="button" class="vt-n" data-tg="g' + esc(g.id) + '">' + (go ? '▾' : '▸') + ' <i class="vt-dot" style="background:' + esc(g.color || '#9CA3AF') + '"></i>' + esc(g.name) + (g.key ? ' <small>' + esc(g.key) + '</small>' : '') + (g.view ? '' : ' <small class="vt-lock" title="You can file here but not open">🔒 file only</small>') + '</button>' +
        (go ? '<ul>' + g.projects.map(function (p) {
          var po = !!open['p' + p.core], tot = Object.keys(p.counts).reduce(function (a, k) { return a + p.counts[k]; }, 0);
          return '<li><button type="button" class="vt-n" data-tg="p' + esc(p.core) + '">' + (po ? '▾' : '▸') + ' 📁 ' + esc(p.name) + (p.view && tot ? ' <small>' + tot + '</small>' : '') + '</button>' +
            (po ? '<ul>' + T.folders.map(function (f) { var k = f[0], can = p.view || p.file.indexOf(k) >= 0; if (!can) return '';
              return '<li><button type="button" class="vt-f' + (sel && sel.core === p.core && sel.folder === k ? ' on' : '') + '" data-f="' + esc(p.core) + '|' + k + '">' + esc(f[1]) + (p.view && p.counts[k] ? ' <small>' + p.counts[k] + '</small>' : '') + '</button></li>'; }).join('') + '</ul>' : '') + '</li>';
        }).join('') + '</ul>' : '') + '</li>';
    }).join('') + '</ul></li></ul>';
  }
  function paneHtml(L) {
    if (!sel) return '<div class="vp-empty"><b>🔒</b><p>Pick a folder on the left: Program → Project → Contracts, Billing, Invoices or Documents.</p><p class="muted">' +
      (T.finance ? 'You can open everything here.' : 'You can open the programs where you are the program director; elsewhere you can file contracts and documents, and your team gets a redacted copy.') + '</p></div>';
    var x = projOf(sel.core); if (!x) return '';
    var canFile = x.p.file.indexOf(sel.folder) >= 0, del = T.canMove;
    var up = canFile ? '<label class="btn btn-gold vp-up">⬆ Upload to ' + esc(FN[sel.folder]) + '<input type="file" id="vpFile" multiple hidden accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv,.png,.jpg,.jpeg"></label>' : '';
    var head = '<div class="vp-h"><div><small class="muted">' + esc(x.g.name) + ' › ' + esc(x.p.name) + '</small><h3>' + esc(FN[sel.folder]) + '</h3></div>' + up + '</div>';
    if (!x.p.view) return head + '<div class="ceo-none">🔒 Only the CEO, the CFO, this program\'s director and the super user can open what is filed here. What you upload goes in the vault; Champ puts a <b>redacted copy</b> (amounts, rates, bank and tax numbers and contact details blacked out) in this project\'s documents for the team.</div><div id="vpMsg"></div>';
    var F = (L || []).filter(function (f) { return f.folder === sel.folder; });
    return head + '<div id="vpMsg"></div>' + (F.length ? '<div class="table-wrap"><table class="ceo-tab vp-t"><thead><tr><th>File</th><th>Filed by</th><th>When</th><th></th></tr></thead><tbody>' + F.map(function (f) {
      var nm = f.champ ? (f.champ === 'invoice' ? '🧾 ' : '📄 ') + esc(f.name) + '<small>' + money(f.inc) + ' incl. tax · ' + esc(f.status) + (f.balance > 0.005 ? ' · owed ' + money(f.balance) : '') + '</small>' : '📄 ' + esc(f.name) + '<small>' + esc(size(f.size)) + (f.copy ? ' · team has a redacted copy' : '') + (f.note ? ' · ' + esc(f.note) : '') + '</small>';
      return '<tr><td>' + nm + '</td><td>' + esc(f.champ ? 'Champ (raised in Finance)' : (f.byName || f.by || '') + (f.role ? ' · ' + f.role : '')) + '</td><td class="nowrap">' + esc(when(f.at)) + '</td><td class="num nowrap">' +
        (f.champ ? '<a class="btn btn-sm" target="_blank" rel="noopener" href="' + M.API + '?action=pdf&id=' + encodeURIComponent(f.id) + '">Open</a>' : '<button class="btn btn-sm" type="button" data-open="' + esc(f.id) + '">Open</button>' + (del ? ' <button class="btn btn-sm" type="button" data-del="' + esc(f.id) + '" title="Delete">🗑</button>' : '')) + '</td></tr>'; }).join('') + '</tbody></table></div>'
      : '<p class="muted" style="padding:14px 4px">Nothing in ' + esc(FN[sel.folder]) + ' yet.</p>');
  }
  function draw(L) {
    M.view().innerHTML = '<div class="vault"><div class="row ceo-head"><p class="muted">Contracts, billing, invoices and commercial documents by program and project. Opens for the CEO, the CFO, each program\'s director and the super user only.</p>' +
      (T.canMove ? '<button class="btn btn-sm" id="vMove" type="button">📦 Move contracts from the project documents</button>' : '') + '</div>' +
      '<div class="vault-g"><aside class="card vt-w">' + treeHtml() + '</aside><section class="card vp">' + paneHtml(L) + '</section></div></div>';
    var v = M.view();
    v.querySelectorAll('[data-tg]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-tg'); open[k] = k[0] === 'g' ? open[k] === false : !open[k]; draw(L); }; });
    v.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { var x = b.getAttribute('data-f').split('|'); location.hash = '#vault/' + encodeURIComponent(x[0]) + '/' + x[1]; }; });
    v.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { api('vaultFile', { core: sel.core, id: b.getAttribute('data-open') }).then(function (r) {
      if (r.url) { window.open(r.url, '_blank', 'noopener'); return; } var a = document.createElement('a'); a.href = 'data:' + (r.type || 'application/octet-stream') + ';base64,' + r.file; a.download = r.name; document.body.appendChild(a); a.click(); a.remove(); }).catch(fail); }; });
    v.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { M.confirmBox('Delete this file from the vault?', 'It cannot be brought back.', 'Delete', true).then(function (ok) { if (ok) api('vaultDelete', { core: sel.core, id: b.getAttribute('data-del') }).then(function () { toast('Deleted'); return show(); }).catch(fail); }); }; });
    var fi = v.querySelector('#vpFile'); if (fi) fi.onchange = function () { upload(Array.prototype.slice.call(fi.files)); };
    var mv = v.querySelector('#vMove'); if (mv) mv.onclick = function () { M.confirmBox('Move contracts into the vault?', 'Every document in the projects\' “Contracts and commercial” folders moves here. The project team keeps a redacted copy.', 'Move them', false).then(function (ok) { if (!ok) return; mv.disabled = true;
      api('vaultMoveIn', {}).then(function (r) { toast('📦 ' + r.moved + ' document' + (r.moved === 1 ? '' : 's') + ' moved into the vault'); return show(); }).catch(function (e) { mv.disabled = false; fail(e); }); }); };
  }
  // ⬆ the file goes straight to private storage (or here, up to 3.5 MB); its text is read in the browser for the redacted copy
  function upload(list) {
    var msg = document.getElementById('vpMsg'), core = sel.core, folder = sel.folder, done = 0;
    var one = function (f) {
      if (msg) msg.innerHTML = '<p class="ask-think">Filing “' + esc(f.name) + '”…</p>';
      var text = (M.piExtract && /\.(pdf|docx|txt|csv)$/i.test(f.name) ? M.piExtract(f).then(function (x) { return x.text || ''; }).catch(function () { return ''; }) : Promise.resolve(''));
      return text.then(function (tx) {
        var b64 = function () { return new Promise(function (res) { var rd = new FileReader(); rd.onload = function () { res(String(rd.result).replace(/^data:[^,]*,/, '')); }; rd.readAsDataURL(f); }); };
        return api('vaultUrl', { core: core, folder: folder, name: f.name, type: f.type, size: f.size }).then(function (u) {
          if (u && u.r2) return fetch(u.url, { method: 'PUT', headers: { 'Content-Type': f.type || 'application/octet-stream' }, body: f }).then(function (r) { if (!r.ok) throw new Error('R2'); return { r2Key: u.key }; })
            .catch(function () { if (f.size > 3.5 * 1048576) throw new Error('“' + f.name + '” could not reach the file storage, and it is too big to keep here (3.5 MB).'); return b64().then(function (x) { return { file: x }; }); });
          if (f.size > 3.5 * 1048576) throw new Error('“' + f.name + '” is over 3.5 MB: set up R2 file storage to keep bigger files.'); return b64().then(function (x) { return { file: x }; });
        }).then(function (st) { return api('vaultAdd', { core: core, folder: folder, name: f.name, type: f.type, size: f.size, r2Key: st.r2Key || '', file: st.file || '', text: tx }); });
      }).then(function (r) {
        done++;
        if (r.copy && r.copy.id) fetch('/.netlify/functions/planai-background', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1' }, body: JSON.stringify({ id: ('vr' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12)).replace(/[^a-z0-9]/g, ''), mode: 'vaultRedact', core: core, file: r.file.id }) }).catch(function () {});
        toast('🔒 ' + f.name + ' filed' + (r.copy && r.copy.id ? '; your team gets a redacted copy in the project documents' : ''));
      });
    };
    list.reduce(function (p, f) { return p.then(function () { return one(f); }); }, Promise.resolve()).then(function () { return show(); }).catch(function (e) { fail(e); show(); });
  }
  function show() {
    return api('vaultTree', {}).then(function (t) { T = t; if (sel) { open['p' + sel.core] = true; var x = projOf(sel.core); if (x) open['g' + x.g.id] = true; else sel = null; }
      if (sel && projOf(sel.core) && projOf(sel.core).p.view) return api('vaultList', { core: sel.core }).then(function (r) { draw(r.files); }); draw([]); });
  }
  M.addView('vault', 'Finance vault', function (args) { sel = args && args[0] ? { core: args[0], folder: FN[args[1]] ? args[1] : 'contracts' } : null; M.view().innerHTML = '<div class="empty">Opening the vault…</div>'; return show(); }, 'vault');
})();
