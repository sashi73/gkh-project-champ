/* 🔒 The Finance vault, as a document library: search first.
     One search box (file name, project, program and the words inside the documents), quick filters (Contracts, Billing, Invoices,
     Documents, a program, a project), one list newest first, Open in one click, one Upload button (pick the project and folder).
     Opens for: the super user, the CEO, the CFO, and each program's named director. Project managers and directors file
     contracts and documents only, and their team gets a redacted copy. Data: vaultSearch / vaultUrl / vaultAdd / vaultFile / vaultDelete / vaultMoveIn. */
(function () {
  'use strict';
  var M = window.MBS; if (!M) return;
  var api = M.api, esc = M.esc, toast = M.toast, fail = M.fail;
  var S = { q: '', folder: '', program: '', core: '' }, R = null, timer = null, seq = 0;
  var FN = { contracts: ['📜', 'Contracts'], billing: ['💵', 'Billing'], invoices: ['🧾', 'Invoices'], documents: ['🗂', 'Documents'] };
  var when = function (t) { return t ? new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; };
  var money = function (n) { return '$' + Math.round(Number(n) || 0).toLocaleString('en-AU'); };
  var size = function (b) { return !b ? '' : b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; };
  var icon = function (r) { if (r.champ === 'invoice') return '🧾'; if (r.champ === 'quote') return '📝'; var n = (r.name || '').toLowerCase();
    return /\.pdf$/.test(n) ? '📕' : /\.docx?$/.test(n) ? '📘' : /\.(xlsx?|csv)$/.test(n) ? '📗' : /\.(png|jpe?g|gif|webp)$/.test(n) ? '🖼' : '📄'; };
  function mark(text) { var t = esc(text || ''), w = (S.q.toLowerCase().match(/[\p{L}\p{N}$.,-]{2,}/gu) || []).slice(0, 8);
    w.forEach(function (x) { t = t.replace(new RegExp('(' + x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); }); return t; }

  function shell() {
    var can = R && R.fileable && R.fileable.length;
    M.view().innerHTML = '<div class="vlib">' +
      '<div class="vl-top"><div class="vl-search"><span>🔎</span><input id="vlQ" type="search" placeholder="Search contracts, invoices and documents: a name, a project, a client, or words inside…" value="' + esc(S.q) + '" autocomplete="off"></div>' +
      (can ? '<button class="btn btn-gold" id="vlUp" type="button">⬆ Upload</button>' : '') + '</div>' +
      '<div class="vl-f" id="vlF"></div><div id="vlL" class="vl-l"><div class="empty">Opening the vault…</div></div>' +
      '<p class="muted vl-note">🔒 Only the CEO, the CFO, each program\'s director and the super user can open these documents.' + (R && R.canMove ? ' <a href="#" id="vlMove">Move contracts from the project documents into the vault</a>' : '') + '</p></div>';
    var q = document.getElementById('vlQ');
    q.oninput = function () { clearTimeout(timer); timer = setTimeout(function () { S.q = q.value; load(); }, 300); };
    q.onkeydown = function (e) { if (e.key === 'Enter') { clearTimeout(timer); S.q = q.value; load(); } };
    var up = document.getElementById('vlUp'); if (up) up.onclick = uploadBox;
    var mv = document.getElementById('vlMove'); if (mv) mv.onclick = function (e) { e.preventDefault(); M.confirmBox('Move contracts into the vault?', 'Every document in the projects’ “Contracts and commercial” folders moves here. The project team keeps a redacted copy.', 'Move them', false).then(function (ok) { if (ok) api('vaultMoveIn', {}).then(function (r) { toast('📦 ' + r.moved + ' document' + (r.moved === 1 ? '' : 's') + ' moved into the vault'); load(); }).catch(fail); }); };
  }
  function filters() {
    var c = R.counts || {}, all = Object.keys(c).reduce(function (a, k) { return a + c[k]; }, 0);
    var chip = function (k, label, n) { return '<button type="button" class="vl-chip' + (S.folder === k ? ' on' : '') + '" data-fo="' + k + '">' + label + ' <b>' + n + '</b></button>'; };
    var projs = (R.projects || []).filter(function (p) { return !S.program || String(p.programId) === S.program; });
    document.getElementById('vlF').innerHTML = chip('', 'All', all) + Object.keys(FN).map(function (k) { return chip(k, FN[k][0] + ' ' + FN[k][1], c[k] || 0); }).join('') +
      '<span class="vl-sp"></span><select id="vlP" aria-label="Program"><option value="">All programs</option>' + (R.programs || []).map(function (g) { return '<option value="' + esc(g.id) + '"' + (String(g.id) === S.program ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') + '</select>' +
      '<select id="vlC" aria-label="Project"><option value="">All projects</option>' + projs.map(function (p) { return '<option value="' + esc(p.core) + '"' + (p.core === S.core ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select>' +
      (S.q || S.folder || S.program || S.core ? '<button type="button" class="btn btn-sm" id="vlX">✕ Clear</button>' : '');
    document.querySelectorAll('[data-fo]').forEach(function (b) { b.onclick = function () { S.folder = b.getAttribute('data-fo'); load(); }; });
    document.getElementById('vlP').onchange = function () { S.program = this.value; S.core = ''; load(); };
    document.getElementById('vlC').onchange = function () { S.core = this.value; load(); };
    var x = document.getElementById('vlX'); if (x) x.onclick = function () { S = { q: '', folder: '', program: '', core: '' }; var q = document.getElementById('vlQ'); if (q) q.value = ''; load(); };
  }
  function list() {
    var L = document.getElementById('vlL');
    if (!R.programs.length && R.fileable.length) { var tp = document.querySelector('.vl-search'), ff = document.getElementById('vlF'); if (tp) tp.style.visibility = 'hidden'; if (ff) ff.hidden = true; L.innerHTML = '<div class="vl-empty"><b>🔒</b><h3>File contracts and documents for your projects</h3><p>What you upload is kept in the Finance vault, which only the CEO, the CFO, the program director and the super user can open. Champ puts a <b>redacted copy</b> (amounts, rates, bank and tax numbers and contact details blacked out) in the project’s documents for your team.</p><button class="btn btn-gold" type="button" id="vlUp2">⬆ Upload</button></div>'; document.getElementById('vlUp2').onclick = uploadBox; return; }
    if (!R.rows.length) { L.innerHTML = '<div class="vl-empty"><b>' + (S.q ? '🔎' : '📂') + '</b><h3>' + (S.q ? 'Nothing matches “' + esc(S.q) + '”' : 'Nothing filed here yet') + '</h3><p class="muted">' + (S.q ? 'Try another word, or clear the filters.' : 'Upload the first contract, billing schedule or invoice.') + '</p></div>'; return; }
    L.innerHTML = '<p class="vl-count">' + (S.q ? R.total + ' result' + (R.total === 1 ? '' : 's') + ' for “' + esc(S.q) + '”' : R.total + ' document' + (R.total === 1 ? '' : 's') + ', newest first') + '</p>' +
      R.rows.map(function (r, i) { var f = FN[r.folder] || ['📄', r.folder];
        return '<div class="vl-r"><span class="vl-ic">' + icon(r) + '</span><div class="vl-m"><div class="vl-n"><b>' + mark(r.name) + '</b><span class="vl-tag">' + f[0] + ' ' + f[1] + '</span>' + (r.champ ? '<span class="vl-tag ch">Champ</span>' : '') + '</div>' +
          '<div class="vl-s"><i style="background:' + esc(r.color || '#9CA3AF') + '"></i>' + mark(r.project) + ' · ' + mark(r.program) + ' · ' + esc(when(r.at)) + (r.champ ? ' · ' + money(r.inc) + ' incl. tax · ' + esc(r.status) + (r.balance > 0.005 ? ' · owed ' + money(r.balance) : '') : (r.by ? ' · ' + esc(r.by) : '') + (r.size ? ' · ' + size(r.size) : '') + (r.copy ? ' · team has a redacted copy' : '')) + '</div>' +
          (r.snippet ? '<div class="vl-snip">…' + mark(r.snippet) + '…</div>' : '') + '</div>' +
          '<div class="vl-a">' + (r.champ ? '<a class="btn btn-sm btn-gold" target="_blank" rel="noopener" href="' + M.API + '?action=pdf&id=' + encodeURIComponent(r.id) + '">Open</a>' : '<button class="btn btn-sm btn-gold" type="button" data-open="' + i + '">Open</button>' + (R.canDelete ? '<button class="btn btn-sm vl-del" type="button" data-del="' + i + '" title="Delete">🗑</button>' : '')) + '</div></div>'; }).join('') +
      (R.total > R.rows.length ? '<p class="muted">Showing the first ' + R.rows.length + '. Search or filter to narrow it down.</p>' : '');
    L.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { var r = R.rows[+b.getAttribute('data-open')]; api('vaultFile', { core: r.core, id: r.id }).then(function (x) {
      if (x.url) { window.open(x.url, '_blank', 'noopener'); return; } var a = document.createElement('a'); a.href = 'data:' + (x.type || 'application/octet-stream') + ';base64,' + x.file; a.download = x.name; document.body.appendChild(a); a.click(); a.remove(); }).catch(fail); }; });
    L.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { var r = R.rows[+b.getAttribute('data-del')]; M.confirmBox('Delete “' + r.name + '”?', 'It is removed from the vault and cannot be brought back.', 'Delete', true).then(function (ok) { if (ok) api('vaultDelete', { core: r.core, id: r.id }).then(function () { toast('Deleted'); load(); }).catch(fail); }); }; });
  }
  function load() {
    var n = ++seq;
    return api('vaultSearch', S).then(function (r) { if (n !== seq) return; var first = !R; R = r; if (first || !document.getElementById('vlF')) shell(); filters(); list(); }).catch(fail);
  }
  // ⬆ upload: pick the project and folder, then the files (or drop them)
  function uploadBox() {
    var F = R.fileable || [], groups = {}; F.forEach(function (p) { (groups[p.program] = groups[p.program] || []).push(p); });
    var pick = S.core && F.some(function (p) { return p.core === S.core; }) ? S.core : (F[0] || {}).core;
    M.modal('<h2>⬆ Upload to the Finance vault</h2><div class="vl-form"><label>Project<select id="vuP">' + Object.keys(groups).map(function (g) { return '<optgroup label="' + esc(g) + '">' + groups[g].map(function (p) { return '<option value="' + esc(p.core) + '"' + (p.core === pick ? ' selected' : '') + '>' + esc(p.project) + '</option>'; }).join('') + '</optgroup>'; }).join('') + '</select></label>' +
      '<label>Folder<select id="vuF"></select></label><label class="vl-wide">Note <small class="muted">(optional, e.g. “signed copy”, “variation 2”)</small><input id="vuN" maxlength="300"></label>' +
      '<label class="vl-drop vl-wide" id="vuD"><input type="file" id="vuI" multiple hidden accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv,.png,.jpg,.jpeg"><b>📎 Choose files</b> or drop them here<small id="vuS" class="muted"></small></label></div>' +
      '<p class="muted" id="vuW" style="font-size:12.5px"></p><div class="actions"><button class="btn" data-close type="button">Cancel</button><button class="btn btn-gold" id="vuGo" type="button" disabled>Upload</button></div>');
    var files = [], P = document.getElementById('vuP'), Fo = document.getElementById('vuF'), I = document.getElementById('vuI'), D = document.getElementById('vuD'), go = document.getElementById('vuGo');
    var setF = function () { var p = F.filter(function (x) { return x.core === P.value; })[0] || { folders: [] }; Fo.innerHTML = p.folders.map(function (k) { return '<option value="' + k + '"' + (k === S.folder ? ' selected' : '') + '>' + FN[k][0] + ' ' + FN[k][1] + '</option>'; }).join('');
      var viewer = (R.projects || []).some(function (x) { return x.core === P.value; }); document.getElementById('vuW').innerHTML = viewer ? '' : '🔒 You can file here but not open it afterwards. Your team gets a <b>redacted copy</b> in the project’s documents.'; };
    var setFiles = function (L) { files = Array.prototype.slice.call(L || []); document.getElementById('vuS').textContent = files.length ? ' · ' + files.map(function (f) { return f.name; }).join(', ') : ''; go.disabled = !files.length; };
    P.onchange = setF; setF(); I.onchange = function () { setFiles(I.files); };
    D.ondragover = function (e) { e.preventDefault(); D.classList.add('on'); }; D.ondragleave = function () { D.classList.remove('on'); }; D.ondrop = function (e) { e.preventDefault(); D.classList.remove('on'); setFiles(e.dataTransfer.files); };
    go.onclick = function () { go.disabled = true; go.textContent = 'Uploading…'; upload(files, P.value, Fo.value, document.getElementById('vuN').value).then(function () { M.closeModal(); S.core = S.core || ''; load(); }).catch(function (e) { go.disabled = false; go.textContent = 'Upload'; fail(e); }); };
  }
  // the file goes straight to private storage (or here, up to 3.5 MB); its text is read in the browser for searching and the redacted copy
  function upload(list, core, folder, note) {
    var one = function (f) {
      var text = (M.piExtract && /\.(pdf|docx|txt|csv)$/i.test(f.name) ? M.piExtract(f).then(function (x) { return x.text || ''; }).catch(function () { return ''; }) : Promise.resolve(''));
      return text.then(function (tx) {
        var b64 = function () { return new Promise(function (res) { var rd = new FileReader(); rd.onload = function () { res(String(rd.result).replace(/^data:[^,]*,/, '')); }; rd.readAsDataURL(f); }); };
        return api('vaultUrl', { core: core, folder: folder, name: f.name, type: f.type, size: f.size }).then(function (u) {
          if (u && u.r2) return fetch(u.url, { method: 'PUT', headers: { 'Content-Type': f.type || 'application/octet-stream' }, body: f }).then(function (r) { if (!r.ok) throw new Error('R2'); return { r2Key: u.key }; })
            .catch(function () { if (f.size > 3.5 * 1048576) throw new Error('“' + f.name + '” could not reach the file storage, and it is too big to keep here (3.5 MB).'); return b64().then(function (x) { return { file: x }; }); });
          if (f.size > 3.5 * 1048576) throw new Error('“' + f.name + '” is over 3.5 MB: set up R2 file storage to keep bigger files.'); return b64().then(function (x) { return { file: x }; });
        }).then(function (st) { return api('vaultAdd', { core: core, folder: folder, name: f.name, type: f.type, size: f.size, r2Key: st.r2Key || '', file: st.file || '', text: tx, note: note || '' }); });
      }).then(function (r) {
        if (r.copy && r.copy.id) fetch('/.netlify/functions/planai-background', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1' }, body: JSON.stringify({ id: ('vr' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12)).replace(/[^a-z0-9]/g, ''), mode: 'vaultRedact', core: core, file: r.file.id }) }).catch(function () {});
        toast('🔒 ' + f.name + ' filed' + (r.copy && r.copy.id ? '; the team gets a redacted copy in the project documents' : ''));
      });
    };
    return list.reduce(function (p, f) { return p.then(function () { return one(f); }); }, Promise.resolve());
  }
  M.addView('vault', 'Finance vault', function (args) { R = null; S = { q: '', folder: '', program: '', core: args && args[0] ? args[0] : '' }; M.view().innerHTML = '<div class="empty">Opening the vault…</div>'; return load(); }, 'vault');
})();
