/* 🗄 The project archive: projects taken out of the portfolio (signed, with a reason), kept whole, and able to come back.
     Opens for the super user, the CEO and the site administrator. Only the super user can delete an archived project for good.
     Data: planArchiveList / planProjectArchive / planProjectRestore / planProjectDelete. */
(function () {
  'use strict';
  var M = window.MBS; if (!M) return;
  var api = M.api, esc = M.esc, toast = M.toast, fail = M.fail, Q = '', TAB = 'now';
  var stamp = function (t) { return t ? new Date(t).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; };
  var when = function (t) { return t ? new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; };
  var money = function (n) { return '$' + (Math.round(Number(n) || 0)).toLocaleString('en-AU'); };
  M.canArchive = function () { var me = M.me || {}; return !me.scope && (!!me.owner || me.role === 'CEO' || me.role === 'Site administrator'); };

  // ✍ archive a project: who, why (required) and a typed signature
  M.archiveProject = function (core, name, ref) {
    var me = M.me || {};
    M.modal('<h2>🗄 Archive this project</h2><p class="muted" style="margin:-4px 0 10px"><b>' + esc(name) + '</b> ' + esc(ref || '') + '</p>' +
      '<p style="font-size:13.5px;line-height:1.5">It leaves every list: the projects, programs, the CEO view, Finance, reports and Today. Nothing is deleted: the plan, documents, costs and history are kept in the <b>Archived projects vault</b>, and the super user, the CEO or the site administrator can bring it back.</p>' +
      '<form class="form" id="arF"><label>Name<input name="by" required maxlength="80" value="' + esc(me.name || me.user || '') + '"></label><label>Role<input value="' + esc(me.owner ? 'Super user' : me.role || '') + '" disabled></label>' +
      '<label class="full">Why is it being archived?<textarea name="reason" rows="3" required minlength="5" maxlength="600" placeholder="e.g. cancelled by the client on 18 Nov; or finished and closed out"></textarea></label>' +
      '<label class="full">Signature <small class="muted">(type your full name)</small><input name="sig" required maxlength="80" class="cr-sigin" autocomplete="off"></label>' +
      '<div class="actions full"><button class="btn" data-close type="button">Cancel</button><button class="btn btn-gold" type="submit">🗄 Archive and sign</button></div></form>');
    return new Promise(function (res) {
      document.getElementById('arF').onsubmit = function (e) { e.preventDefault(); var f = this, b = f.querySelector('[type=submit]');
        if (f.reason.value.trim().length < 5) { toast('Say why the project is being archived'); f.reason.focus(); return; }
        b.disabled = true;
        api('planProjectArchive', { core: core, by: f.by.value.trim(), reason: f.reason.value.trim(), sig: f.sig.value.trim() }).then(function () { M.closeModal(); toast('🗄 ' + name + ' is archived'); res(true); })
          .catch(function (er) { b.disabled = false; fail(er); }); };
    });
  };

  function regHtml(d) {
    var R = (d.register || []).filter(function (e) { return !Q || [e.project, e.client, e.ref, e.program, e.reason, e.by, e.what].join(' ').toLowerCase().indexOf(Q) >= 0; });
    return R.length ? '<div class="table-wrap"><table class="ceo-tab"><thead><tr><th>When</th><th>What</th><th>Project</th><th>Who</th><th>Reason</th><th>Signed</th></tr></thead><tbody>' + R.map(function (e) {
      return '<tr><td class="nowrap">' + stamp(e.at) + '</td><td><span class="fin-pill ' + (e.what === 'Archived' ? 'amber' : e.what === 'Brought back' ? 'green' : 'red') + '">' + esc(e.what) + '</span></td><td><b>' + esc(e.project || '') + '</b><small>' + esc(e.ref || '') + (e.client ? ' · ' + esc(e.client) : '') + '</small></td>' +
        '<td>' + esc(e.by || '') + '<small>' + esc(e.role || '') + '</small></td><td>' + esc(e.reason || '') + '</td><td>' + (e.sig ? '<span class="ar-sig">' + esc(e.sig) + '</span>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>'
      : '<p class="ceo-none">' + ((d.register || []).length ? 'Nothing in the register matches.' : 'Nothing recorded yet.') + '</p>';
  }
  function csv(d) {
    var q = function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var rows = [['When', 'What', 'Project', 'Reference', 'Client', 'Program', 'By', 'Role', 'Reason', 'Signature', 'Login']].concat((d.register || []).map(function (e) { return [new Date(e.at).toISOString(), e.what, e.project, e.ref, e.client, e.program, e.by, e.role, e.reason, e.sig, e.user]; }));
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + rows.map(function (r) { return r.map(q).join(','); }).join('\r\n')], { type: 'text/csv' }));
    a.download = 'archived-projects-audit-register-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  function draw(d) {
    var L = d.list.filter(function (x) { return !Q || [x.name, x.client, x.ref, x.program, x.archived.reason, x.archived.by].join(' ').toLowerCase().indexOf(Q) >= 0; });
    M.view().innerHTML = '<div class="ar"><section class="card ceo-s"><div class="row" style="justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h3 style="margin:0">🗄 Archived projects</h3>' +
      '<div style="display:flex;flex-direction:row;gap:8px;flex-wrap:wrap;align-items:center"><input class="ar-q" id="arQ" placeholder="🔎 Search project, client, reason, who…" value="' + esc(Q) + '"><button class="btn btn-sm" id="arCsv" type="button" title="Every archive, bring-back and permanent delete, for audit">⬇ Audit register (CSV)</button></div></div>' +
      '<p class="ceo-f">A vault for audit: projects taken out of the portfolio, each signed off with a reason, with everything in them kept. The <b>audit register</b> keeps every archive, bring-back and permanent delete for good, even after a project comes back or is deleted.' + (d.canDelete ? ' Only you (the super user) can delete an archived project for good.' : '') + '</p>' +
      '<div class="pl-chips"><button type="button" class="vl-chip' + (TAB === 'now' ? ' on' : '') + '" data-artab="now">In the vault <b>' + d.list.length + '</b></button><button type="button" class="vl-chip' + (TAB === 'reg' ? ' on' : '') + '" data-artab="reg">🧾 Audit register <b>' + (d.register || []).length + '</b></button></div>' +
      (TAB === 'reg' ? regHtml(d) : L.length ? '<div class="table-wrap"><table class="ceo-tab"><thead><tr><th>Project</th><th>Archived</th><th>Why</th><th>Signed</th><th class="num">At archive</th><th></th></tr></thead><tbody>' + L.map(function (x) { var a = x.archived;
        return '<tr><td><b>' + esc(x.name) + '</b><small>' + esc(x.ref) + (x.client ? ' · ' + esc(x.client) : '') + (x.program ? ' · ' + esc(x.program) : '') + '</small></td><td class="nowrap">' + when(a.at) + '<small>' + esc(a.by || '') + (a.role ? ', ' + esc(a.role) : '') + '</small></td>' +
          '<td>' + esc(a.reason || '') + '</td><td><span class="ar-sig">' + esc(a.sig || '') + '</span></td><td class="num">' + (x.planned ? x.pct + '% done<small>' + x.tasks + ' tasks' + (x.budget ? ' · ' + money(x.budget) : '') + '</small>' : '<span class="muted">not planned</span>') + '</td>' +
          '<td class="num nowrap"><button class="btn btn-sm" data-back="' + esc(x.core) + '" type="button">↩ Bring back</button>' + (d.canDelete ? ' <button class="btn btn-sm btn-danger" data-gone="' + esc(x.core) + '" type="button">🗑 Delete for good</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : '<p class="ceo-none">' + (d.list.length ? 'No archived project matches.' : 'Nothing archived yet. Archive a project from the button at the top of its plan.') + '</p>') + '</section></div>';
    M.view().querySelectorAll('[data-artab]').forEach(function (b) { b.onclick = function () { TAB = b.getAttribute('data-artab'); draw(d); }; });
    document.getElementById('arCsv').onclick = function () { csv(d); };
    var q = document.getElementById('arQ'); q.oninput = function () { Q = q.value.trim().toLowerCase(); var pos = q.selectionStart; draw(d); var n = document.getElementById('arQ'); n.focus(); n.setSelectionRange(pos, pos); };
    M.view().querySelectorAll('[data-back]').forEach(function (b) { b.onclick = function () { var x = d.list.filter(function (y) { return y.core === b.getAttribute('data-back'); })[0];
      var me = M.me || {};
      M.modal('<h2>↩ Bring back this project</h2><p class="muted" style="margin:-4px 0 10px"><b>' + esc(x.name) + '</b> ' + esc(x.ref) + '</p><p style="font-size:13.5px">It returns to the projects list as it was archived. This is recorded in the audit register.</p>' +
        '<form class="form" id="abF"><label>Name<input name="by" required maxlength="80" value="' + esc(me.name || me.user || '') + '"></label><label>Role<input value="' + esc(me.owner ? 'Super user' : me.role || '') + '" disabled></label>' +
        '<label class="full">Why is it being brought back?<textarea name="reason" rows="3" required minlength="5" maxlength="600" placeholder="e.g. the client has restarted the work"></textarea></label>' +
        '<label class="full">Signature <small class="muted">(type your full name)</small><input name="sig" required maxlength="80" class="cr-sigin" autocomplete="off"></label>' +
        '<div class="actions full"><button class="btn" data-close type="button">Cancel</button><button class="btn btn-gold" type="submit">↩ Bring back and sign</button></div></form>');
      document.getElementById('abF').onsubmit = function (e) { e.preventDefault(); var f = this, sb = f.querySelector('[type=submit]'); sb.disabled = true;
        api('planProjectRestore', { core: x.core, by: f.by.value.trim(), reason: f.reason.value.trim(), sig: f.sig.value.trim() }).then(function () { M.closeModal(); toast('↩ ' + x.name + ' is back in the projects list'); load(); }).catch(function (er) { sb.disabled = false; fail(er); }); }; }; });
    M.view().querySelectorAll('[data-gone]').forEach(function (b) { b.onclick = function () { var x = d.list.filter(function (y) { return y.core === b.getAttribute('data-gone'); })[0];
      (M.champDelete ? M.champDelete([{ core: x.core, name: x.name, ref: x.ref }]) : Promise.resolve(false)).then(function (ok) { if (ok) load(); }); }; });
  }
  function load() { return api('planArchiveList', {}).then(draw).catch(function (e) { M.view().innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; }); }
  M.addView('archive', 'Archived projects', function () { M.view().innerHTML = '<div class="empty">Opening the archive…</div>'; return load(); }, 'archive');
})();
