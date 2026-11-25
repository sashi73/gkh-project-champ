/* GKH Project Champ: 🌿 ESG & Sustainability (one menu item). A reporting entity (an organisation for one reporting year) has the same
   kind of section menu as a project: Setup (Overview, Organisation, Standards, Materiality) · Environment · Social · Governance ·
   Carbon avoidance · Reporting (Sustainability Statement, ESG Report, Records).
   The data is scored on the server (netlify/lib/esg.mjs); the AI (DeepSeek) writes the narrative; the documents are laid out here with
   the document studio (admin-studio.js), in the same designed format as the project charter and plan, as PDF and Word.
   Brought up to date from the GKH Carbon, Social and Governance Intelligence tools (no API keys in the browser; the console's own AI).
   The design and the iteration log: docs/ESG-REGISTRY.md */
(function () {
  'use strict';
  var M = window.MBS; if (!M) return;
  var api = M.api, esc = M.esc, toast = M.toast, fail = M.fail, $ = M.$;
  var view = function () { return document.getElementById('view'); };
  var SC = null, V = { id: '', tab: 'overview', e: null, calc: null, cover: null, docs: {}, timer: 0, saving: false, again: false, ai: {} };
  var nf = function (v, d) { return v == null || v === '' || isNaN(v) ? '–' : Number(v).toLocaleString('en-AU', { maximumFractionDigits: d == null ? 0 : d }); };
  var tco = function (v) { return v == null ? 'Not measured' : nf(v, v < 100 ? 1 : 0) + ' tCO2e'; };
  var pl = function (n, w) { return nf(n) + ' ' + w + (Number(n) === 1 ? '' : 's'); };
  var rag = function (s) { return s == null ? 'grey' : s >= 70 ? 'green' : s >= 45 ? 'amber' : 'red'; };
  var rid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); };
  var when = function (t) { return t ? new Date(t).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; };
  var schema = function () { return SC ? Promise.resolve(SC) : api('esgSchema', {}).then(function (d) { SC = d; SC.sec = {}; d.sections.forEach(function (s) { SC.sec[s.id] = s; }); SC.std = {}; d.standards.forEach(function (s) { SC.std[s.id] = s; }); return SC; }); };

  /* ---------- the section menu: the same grouped, icon tab bar as a project ---------- */
  var GROUPS = [
    ['Setup', 'esetup', [['overview', 'Overview'], ['org', 'Organisation'], ['standards', 'Standards'], ['material', 'Material topics']]],
    ['Environment', 'eenv', [['carbon', 'Scope 1 & 2'], ['scope3', 'Scope 3'], ['resources', 'Energy, water & waste'], ['climate', 'Climate risk']]],
    ['Social', 'esoc', [['workforce', 'Workforce & safety'], ['rights', 'Human rights'], ['community', 'Community']]],
    ['Governance', 'egov', [['board', 'Board'], ['ethics', 'Ethics & risk'], ['certs', 'Certifications']]],
    ['Carbon avoidance & credits', 'eavoid', [['avoid', 'Avoided emissions'], ['credits', 'Carbon credits'], ['pricing', 'Pricing & CBAM']]],
    ['Reporting', 'erep', [['statement', 'Statement'], ['report', 'ESG report'], ['records', 'Records']]]];
  var ICO = {
    overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    org: '<path d="M4 21V5l8-3 8 3v16"/><path d="M9 21v-5h6v5M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01"/>', standards: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12l2 2 4-4M10 17h6"/>',
    material: '<path d="M4 20V4M4 20h16"/><circle cx="9" cy="14" r="1.6"/><circle cx="14" cy="9" r="2.2"/><circle cx="17" cy="15" r="1.3"/>',
    carbon: '<path d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1 .5 9z"/><path d="M9.5 14.5h1.5M13 14.5h2"/>', scope3: '<circle cx="5" cy="12" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="M7 11l10-4M7 13l10 4"/>',
    resources: '<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>', climate: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    workforce: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.8.3 5 2.6 5 5.8"/>', rights: '<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/>',
    community: '<path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M10 21v-6h4v6"/>', board: '<rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M6 15v5M18 15v5M8 9V6M12 9V5M16 9V6"/>',
    ethics: '<path d="M12 3 4 6v6c0 4.5 3.3 8 8 9 4.7-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>', certs: '<circle cx="12" cy="9" r="6"/><path d="m9 14.5-2 6.5 5-3 5 3-2-6.5"/>',
    avoid: '<path d="M12 21c-4-3-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-3 8-7 11z"/><path d="M9 11.5c1.5-1 4.5-1 6 0M12 7v8"/>', pricing: '<path d="M4 7h16M4 12h10M4 17h7"/><circle cx="18" cy="16" r="3"/><path d="M18 14.5v3M16.8 16h2.4"/>', credits: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>',
    statement: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 10h7M9 14h7M9 18h4"/>', report: '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h12M9 7h6M9 11h6"/>', records: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M8 13h8"/>' };
  var PIL = { env: ['carbon', 'scope3', 'resources', 'climate'], soc: ['workforce', 'rights', 'community'], gov: ['board', 'ethics', 'certs'] };
  var pillarOf = function (t) { return PIL.env.indexOf(t) >= 0 ? 'env' : PIL.soc.indexOf(t) >= 0 ? 'soc' : PIL.gov.indexOf(t) >= 0 ? 'gov' : ''; };
  function tabsHtml() {
    return '<nav class="tabs ptabs esg-tabs" id="planTabs" aria-label="ESG report sections">' + GROUPS.map(function (g) {
      return '<div class="ptg ptg-' + g[1] + '" style="--n:' + g[2].length + '" role="group" aria-label="' + esc(g[0]) + '"><span class="ptg-h">' + esc(g[0]) + '</span><div class="ptg-row">' + g[2].map(function (t) {
        return '<a class="tab' + (V.tab === t[0] ? ' on' : '') + '" href="#esg/' + esc(V.id) + '/' + t[0] + '"' + (V.tab === t[0] ? ' aria-current="page"' : '') + ' title="' + esc(t[1]) + '"><i class="pt-ic"><svg viewBox="0 0 24 24" aria-hidden="true">' + (ICO[t[0]] || ICO.overview) + '</svg></i><span>' + esc(t[1]) + '</span></a>'; }).join('') + '</div></div>'; }).join('') + '</nav>';
  }
  function tile(k, v, s, c) { return '<div class="card kpi rag-card rag-b-' + (c || 'grey') + '"><div class="k">' + esc(k) + ' <span class="dot dot-' + (c || 'grey') + '"></span></div><div class="v" style="font-size:20px">' + esc(v) + '</div><div class="s">' + esc(s) + '</div></div>'; }
  function tilesHtml() {
    var c = V.calc, e = V.e, std = (e.std || []).map(function (s) { return (SC.std[s] || {}).id; }).filter(Boolean);
    return tile('Environment', c.env.score + ' / 100', tco(c.em.total) + (c.em.intensity != null ? ' · ' + nf(c.em.intensity, 1) + ' t per $M' : ''), rag(c.env.score)) +
      tile('Social', c.soc.score + ' / 100', (c.soc.womenPct != null ? c.soc.womenPct + '% women' : 'workforce not entered') + ((e.workforce || {}).ltifr != null ? ' · LTIFR ' + e.workforce.ltifr : ''), rag(c.soc.score)) +
      tile('Governance', c.gov.score + ' / 100', 'GRI 2 alignment ' + c.gov.gri + '%' + ((e.board || {}).indepPct != null ? ' · ' + e.board.indepPct + '% independent' : ''), rag(c.gov.score)) +
      tile('Report readiness', c.readiness + '%', (std.length ? std.length + ' standard' + (std.length === 1 ? '' : 's') + ' chosen' : 'choose your standards') + (c.avoid.total ? ' · ' + tco(c.avoid.total) + ' avoided' : ''), rag(c.readiness));
  }

  /* ---------- 📋 the list of reporting entities ---------- */
  function listPage() {
    view().innerHTML = '<div class="empty">Loading ESG reports…</div>';
    return Promise.all([schema(), api('esgList', {})]).then(function (r) {
      var L = r[1].ents || [];
      view().innerHTML = '<div class="row plan-head" style="margin-bottom:12px"><h2 style="font-size:21px">🌿 ESG &amp; Sustainability reporting</h2><span class="muted">Measure, score and report environment, social and governance performance against the standards you report to</span><span class="sp"></span>' +
          '<button class="btn" id="esgSample" type="button">🧪 Start with a sample</button><button class="btn btn-gold" id="esgNew" type="button">＋ New report</button></div>' +
        '<div class="card esg-intro"><div class="esg-steps">' + [['1', 'Set up', 'The organisation, the reporting year and the standards: AASB S1 and S2, IFRS S1 and S2, ESRS / CSRD, GRI, TCFD, SASB, CDP, Bursa Malaysia and more.'],
          ['2', 'Measure', 'Environment, Social and Governance data, with Scope 1, 2 and 3 emissions worked out from your factor set, and the emissions your solutions avoid.'],
          ['3', 'Report', '✨ Champ writes a Sustainability Statement (under 10 pages) or a full ESG Report (about 60 pages), as PDF or Word, with a content index for each standard.']].map(function (s) {
          return '<div class="esg-step"><b>' + s[0] + '</b><div><h4>' + s[1] + '</h4><p class="muted">' + s[2] + '</p></div></div>'; }).join('') + '</div></div>' +
        (L.length ? '<div class="esg-cards">' + L.map(function (x) {
          return '<a class="card esg-ent" href="#esg/' + esc(x.id) + '/overview"><div class="row" style="gap:8px"><b class="esg-ent-n">' + esc(x.name) + '</b><span class="sp"></span><span class="pill">' + esc(x.year || 'Year not set') + '</span></div>' +
            '<div class="muted" style="font-size:13px;margin:2px 0 10px">' + esc(x.industry || 'Industry not set') + '</div><div class="esg-ent-k"><span><small>ESG score</small><b class="t-' + rag(x.esg) + '">' + (x.esg == null ? '–' : x.esg) + '</b></span><span><small>Emissions</small><b>' + (x.total ? nf(x.total) : '–') + '</b><small>tCO2e</small></span></div>' +
            '<div class="esg-std">' + (x.std || []).map(function (s) { return '<span>' + esc(stdShort(s)) + '</span>'; }).join('') + '</div><small class="muted">Updated ' + esc(when(x.updated)) + '</small></a>'; }).join('') + '</div>'
          : '<div class="card empty" style="padding:36px">No ESG reports yet. <b>＋ New report</b> to start one, or <b>🧪 Start with a sample</b> to see a finished example.</div>');
      $('#esgNew').onclick = newEntity;
      $('#esgSample').onclick = function () { var b = this; b.disabled = true; api('esgSample', {}).then(function (d) { toast('Sample report ready'); location.hash = '#esg/' + d.entity.id + '/overview'; }).catch(function (e) { b.disabled = false; fail(e); }); };
    });
  }
  function stdShort(s) { return { AASB_S2: 'AASB S2', AASB_S1: 'AASB S1', IFRS_S1: 'IFRS S1', IFRS_S2: 'IFRS S2', ESRS: 'ESRS', GRI: 'GRI', TCFD: 'TCFD', SASB: 'SASB', CDP: 'CDP', BURSA: 'Bursa', GHGP: 'GHG Protocol', ISO14064: 'ISO 14064', NGER: 'NGER', SGX: 'SGX', NZCS: 'NZ CS', TNFD: 'TNFD', SDG: 'SDGs' }[s] || s; }
  function newEntity() {
    M.modal('<h2>🌿 New ESG report</h2><p class="muted" style="margin:4px 0 12px">One report is one organisation for one reporting year. You can change everything later.</p><div class="form">' +
      '<label class="full">Organisation name<input id="enName" maxlength="120" placeholder="e.g. GKH Consultancy Sdn Bhd"></label><label>Reporting year<input id="enYear" maxlength="20" placeholder="e.g. FY2026"></label>' +
      '<label>Industry sector<select id="enInd"><option value="">Choose…</option>' + SC.sections[0].fields.filter(function (f) { return f[0] === 'industry'; })[0][3].map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select></label>' +
      '<label>Main country<select id="enCty">' + ['Australia', 'Malaysia', 'Singapore', 'New Zealand', 'Thailand', 'Indonesia', 'United Kingdom', 'United States', 'European Union', 'Other'].map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select></label>' +
      '<label>Currency<select id="enCur">' + ['AUD', 'MYR', 'SGD', 'NZD', 'USD', 'EUR', 'GBP', 'THB', 'IDR'].map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="actions" style="justify-content:flex-end"><button class="btn" data-close type="button">Cancel</button><button class="btn btn-gold" id="enGo" type="button">Create</button></div>');
    $('#enCty').onchange = function () { $('#enCur').value = { Australia: 'AUD', Malaysia: 'MYR', Singapore: 'SGD', 'New Zealand': 'NZD', Thailand: 'THB', Indonesia: 'IDR', 'United Kingdom': 'GBP', 'United States': 'USD', 'European Union': 'EUR' }[this.value] || 'USD'; };
    $('#enName').focus();
    $('#enGo').onclick = function () { var b = this; b.disabled = true; api('esgCreate', { name: $('#enName').value, year: $('#enYear').value, industry: $('#enInd').value, country: $('#enCty').value, currency: $('#enCur').value })
      .then(function (d) { M.closeModal && M.closeModal(); var m = document.getElementById('modal'); if (m && m.open) m.close && m.close(); location.hash = '#esg/' + d.entity.id + '/org'; }).catch(function (e) { b.disabled = false; fail(e); }); };
  }

  /* ---------- the reporting entity ---------- */
  var DOCS = {};   // report id → its last narratives
  function load(id) { return api('esgGet', { id: id }).then(function (d) { V.id = d.entity.id; V.e = d.entity; V.calc = d.calc; V.cover = d.cover; V.docs = DOCS[d.entity.id] = d.docs || {}; }); }
  // after an AI job: copy the server's document history, log and insights onto the report object the form uses (never replace it)
  function mergeMeta(ent) { return api('esgGet', { id: ent.id }).then(function (d) { ent.docs = d.entity.docs; ent.log = d.entity.log; ent.insights = d.entity.insights; DOCS[ent.id] = Object.assign(DOCS[ent.id] || {}, d.docs || {}); }); }
  function entityPage(id, tab) {
    var known = {}; GROUPS.forEach(function (g) { g[2].forEach(function (t) { known[t[0]] = 1; }); });
    V.tab = known[tab] ? tab : 'overview';
    var go = function () { draw(); };
    if (V.e && V.id === id) { go(); return Promise.resolve(); }
    view().innerHTML = '<div class="empty">Loading the report…</div>';
    // a save still running for this report finishes first, so the form is loaded with the saved revision
    return schema().then(function () { return Q[id] ? saveNow(id).catch(function () {}) : null; }).then(function () { return load(id); }).then(go);
  }
  function draw() {
    var e = V.e, o = e.org || {};
    document.title = (o.name || 'ESG report') + ' · ESG · GKH Project Champ';
    view().innerHTML = '<div class="row plan-head" style="margin-bottom:12px"><a class="btn btn-sm" href="#esg">← ESG reports</a><h2 style="font-size:21px">' + esc(o.name || 'Untitled') + '</h2><span class="muted">' + esc([o.year, o.industry, o.country].filter(Boolean).join(' · ')) + '</span><span class="sp"></span>' +
      '<span class="esg-saved muted" id="esgSaved" aria-live="polite"></span><button class="btn btn-sm" id="esgImp" type="button">📥 Import</button><button class="btn btn-sm" id="esgDel" type="button" title="Delete this ESG report">🗑</button></div>' +
      '<div class="grid pkpis" id="esgTiles">' + tilesHtml() + '</div>' + tabsHtml() + '<div id="esgBody"></div>';
    $('#esgImp').onclick = function () { flush().catch(function () {}); importModal(); };
    $('#esgDel').onclick = function () { M.confirmBox('Delete this ESG report?', 'This deletes <b>' + esc(o.name || 'this report') + '</b>, its data, its AI narratives and its history. It cannot be undone.', 'Delete', true).then(function (ok) { if (!ok) return; api('esgDelete', { id: V.id }).then(function () { V.e = null; toast('Deleted'); location.hash = '#esg'; }).catch(fail); }); };
    var on = view().querySelector('#planTabs .tab.on'); if (on && on.scrollIntoView) try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (x) {}
    body();
  }
  function body() {
    var t = V.tab, b = $('#esgBody');
    if (t === 'overview') b.innerHTML = overview();
    else if (t === 'standards') b.innerHTML = standardsTab();
    else if (t === 'material') b.innerHTML = materialTab();
    else if (t === 'avoid') b.innerHTML = avoidTab();
    else if (t === 'credits') b.innerHTML = creditsTab();
    else if (t === 'pricing') b.innerHTML = pricingTab();
    else if (t === 'statement' || t === 'report') b.innerHTML = docTab(t);
    else if (t === 'records') b.innerHTML = recordsTab();
    else b.innerHTML = formTab(t);
    wire(b);
  }
  // after a save: the tiles and the live results change, the fields being typed in stay as they are
  function refresh() { var bs = $('#esgBillSum'); if (bs) { bs.innerHTML = billSum(); wireUse(); } if (V.tab === 'standards' && !document.activeElement.matches('input:not([type=checkbox]),select,textarea')) { var y = scrollY; body(); scrollTo(0, y); } var T = $('#esgTiles'); if (T) T.innerHTML = tilesHtml(); var r = $('#esgRes'); if (r) r.innerHTML = results(V.tab); var x = $('#esgLive'); if (x) x.innerHTML = live(V.tab); }

  /* ---------- 💾 saving: a short pause after typing, then the changed sections; each report keeps its own queue ---------- */
  var Q = {};   // report id → { ent, parts, saving, timer, failed }
  var q = function (id) { return (Q[id] = Q[id] || { parts: {}, saving: null }); };
  function say(t, retry) { var s = $('#esgSaved'); if (!s) return; s.innerHTML = esc(t) + (retry ? ' <button type="button" class="btn btn-sm" id="esgRetry">Retry</button>' : ''); var r = $('#esgRetry'); if (r) r.onclick = function () { saveNow(V.id).catch(fail); }; }
  function touch(part) { var id = V.id, S = q(id); S.ent = V.e; S.parts[part] = 1; say('Editing…'); clearTimeout(S.timer); S.timer = setTimeout(function () { saveNow(id).catch(function (e) { if (!e.shown) fail(e); }); }, 800); }
  // resolves once every edit queued for this report (including those typed while it saved) is on the server
  function saveNow(id) {
    var S = Q[id]; if (!S) return Promise.resolve();
    clearTimeout(S.timer);
    if (S.saving) return S.saving.then(function () { return saveNow(id); });
    var keys = Object.keys(S.parts); if (!keys.length) return Promise.resolve();
    S.parts = {}; var ent = S.ent, patch = {}; keys.forEach(function (k) { patch[k] = ent[k]; });
    if (V.e === ent) say('Saving…');
    var src = S.source; S.source = '';
    S.saving = api('esgSave', { id: id, rev: ent.rev, patch: patch, source: src || undefined }).then(function (d) {
      keys.forEach(function (k) { if (!S.parts[k]) ent[k] = d.entity[k]; });   // keep anything typed while it saved
      ent.rev = d.entity.rev; ent.log = d.entity.log; if (!S.parts.bills) ent.bills = d.entity.bills; ent.updated = d.entity.updated; ent.docs = d.entity.docs; ent.insights = d.entity.insights;
      if (V.e === ent) { V.calc = d.calc; if (d.cover) V.cover = d.cover; say('✓ Saved'); refresh(); }
      S.saving = null; return Object.keys(S.parts).length ? saveNow(id) : null;
    }, function (e) {
      S.saving = null; keys.forEach(function (k) { S.parts[k] = 1; });   // keep the failed edits so they can be saved again
      if (/changed this report/i.test(e.message || '') && V.e === ent) { S.parts = {}; toast(e.message); e.shown = true; load(id).then(draw); throw e; }
      if (V.e === ent) say('⚠ Not saved', true); throw e;
    });
    return S.saving;
  }
  function flush() { return V.id ? saveNow(V.id) : Promise.resolve(); }

  /* ---------- 🧾 the data tabs (made from the schema the server checks against) ---------- */
  var isF = function (k) { return /^f[A-Z]/.test(k); };
  function defOf(sec, k) {
    if (sec === 'scope3') return SC.s3[k];
    var set = SC.factorSets[(V.e.carbon || {}).fset] || SC.factorSets.IPCC, m = { fDiesel: 'diesel', fPetrol: 'petrol', fJet: 'jet', fLpg: 'lpg', fGas: 'gas', fElec: 'elec' };
    return m[k] ? set[m[k]] : k === 'refGwp' ? 1924 : '';
  }
  function field(sec, f) {
    var k = f[0], label = f[1], t = f[2], opts = f[3], hint = f[4], v = (V.e[sec] || {})[k], unit = typeof opts === 'string' ? opts : t === 'p' ? '%' : '', id = 'ef-' + sec + '-' + k, ctl;
    var val = v == null ? '' : String(v);
    if (k === 'fset') ctl = '<select id="' + id + '" data-s="' + sec + '" data-k="' + k + '"><option value="">Choose a factor set…</option>' + Object.keys(SC.factorSets).map(function (x) { return '<option value="' + x + '"' + (x === v ? ' selected' : '') + '>' + esc(SC.factorSets[x].label) + '</option>'; }).join('') + '</select>';
    else if (t === 's' || t === 'y') ctl = '<select id="' + id + '" data-s="' + sec + '" data-k="' + k + '"><option value="">–</option>' + opts.map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>';
    else if (t === 'l') ctl = '<textarea id="' + id + '" rows="4" data-s="' + sec + '" data-k="' + k + '">' + esc(val) + '</textarea>';
    else ctl = '<span class="esg-in"><input id="' + id + '" data-s="' + sec + '" data-k="' + k + '" ' + (t === 'n' || t === 'p' ? 'type="number" step="any" inputmode="decimal"' + (t === 'p' ? ' min="0" max="100"' : '') : t === 'd' ? 'type="date"' : 'type="text" maxlength="200"') +
      ' value="' + esc(val) + '"' + (isF(k) || k === 'refGwp' ? ' placeholder="' + esc(nf(defOf(sec, k), 4).replace(/,/g, '')) + '"' : '') + '>' + (unit ? '<i>' + esc(unit) + '</i>' : '') + '</span>';
    var fk = sec + '.' + k, isEf = isF(k) || k === 'refGwp', src = isEf && (V.e.efsrc || {})[fk];
    if (isEf) ctl = '<span class="esg-efrow">' + ctl + '<button type="button" class="btn btn-sm esg-find" data-find="' + fk + '" title="Find a factor in the library" aria-label="Find ' + esc(label) + ' in the emission factor library">🔎</button></span>';
    return '<label class="esg-f' + (t === 'l' ? ' full' : '') + '" for="' + id + '"><span>' + esc(label) + '</span>' + ctl + (src ? '<small class="esg-efsrc">📚 ' + esc(src.label) + '</small>' : hint ? '<small class="muted">' + esc(hint) + '</small>' : '') + '</label>';
  }
  var INTRO = { org: 'Who is reporting, for what period, and how. This becomes the basis of preparation in the statement and the report.',
    carbon: 'Scope 1 (fuels you burn and refrigerant leaks) and Scope 2 (electricity you buy). The factor set fills the emission factors; leave a factor blank to use the set\'s value, or type your own.',
    scope3: 'Scope 3: the value chain. Enter the categories you can measure now; blank factors use the indicative defaults shown. Add more categories each year.',
    resources: 'Energy, water and waste, and the environmental management system.', climate: 'Climate-related risks, opportunities and targets: the heart of IFRS S2, AASB S2 and TCFD.',
    workforce: 'Who works here, and how safe they are. Women in management is measured against everyone in management.', rights: 'Human rights, labour standards, child labour, modern slavery and Indigenous peoples.',
    community: 'Community, suppliers and customers.', board: 'The board: its make-up, independence and oversight of sustainability.', ethics: 'Ethics, anti-corruption, risk, cyber security and tax.', certs: 'Management systems and certifications.' };
  // a data tab: the activity data, and (for emissions) the factors and the electricity bills on their own sub-tabs, so no tab runs on for screens
  function formTab(sec) {
    var s = SC.sec[sec]; if (!s) return '<div class="empty">Not found</div>';
    var acts = s.fields.filter(function (f) { return !isF(f[0]); }), facs = s.fields.filter(function (f) { return isF(f[0]); }), p = pillarOf(sec);
    var SUB = [['data', sec === 'carbon' ? 'Fuels & electricity' : sec === 'scope3' ? 'Activity data' : 'Data']];
    if (sec === 'carbon') SUB.push(['bills', 'Electricity bills' + ((V.e.bills || []).length ? ' (' + V.e.bills.length + ')' : '')]);
    if (facs.length) SUB.push(['factors', 'Emission factors']);
    if (facs.length) SUB.push(['library', 'Factor library']);
    var sub = (V.subs || {})[sec] || 'data'; if (!SUB.some(function (x) { return x[0] === sub; })) sub = 'data';
    if (sub === 'library') return subBar(SUB, sub, s.title) + libraryCard(sec);
    var left = sub === 'bills' ? billsCard() : sub === 'factors' ? '<div class="card"><h3 style="margin:0 0 4px">Emission factors</h3><p class="muted" style="margin:0 0 12px;font-size:13px">Indicative defaults are shown in grey: leave a factor blank to use the set\'s value, or type your own. Check them against the current official set before you report.</p><div class="esg-form">' + facs.map(function (f) { return field(sec, f); }).join('') + '</div></div>'
      : '<div class="card"><div class="row" style="margin-bottom:6px"><h3 style="margin:0">' + esc(s.title) + '</h3><span class="sp"></span><button class="btn btn-sm" type="button" data-import="1">📥 Import from a spreadsheet</button></div><p class="muted" style="margin:0 0 12px;font-size:13px">' + esc(INTRO[sec] || '') + '</p><div class="esg-form">' + acts.map(function (f) { return field(sec, f); }).join('') + '</div></div>';
    return (SUB.length > 1 ? subBar(SUB, sub, s.title) : '') + '<div class="esg-split"><div>' + left + '</div><div><div class="card esg-res" id="esgRes">' + results(sec) + '</div>' + (p ? insightCard(p) : '') + '</div></div>';
  }
  /* ---------- 📚 the emission factor library: every published factor, searchable by country, kind and source; one press fills the field ---------- */
  var EF = null, LF = { q: '', country: '', cat: '', std: '', field: '', n: 40 };
  var efLoad = function () { return EF ? Promise.resolve(EF) : api('esgFactors', {}).then(function (d) { EF = d.factors; return EF; }); };
  var FIELDN = { 'carbon.fElec': 'Grid electricity', 'carbon.fDiesel': 'Diesel', 'carbon.fPetrol': 'Petrol', 'carbon.fJet': 'Jet fuel', 'carbon.fLpg': 'LPG', 'carbon.fGas': 'Natural gas', 'carbon.refGwp': 'Refrigerant GWP' };
  function efLabel(x) { return x.std + ' ' + x.year + ' · ' + [x.name, x.region, x.country === 'Global' ? '' : x.country].filter(Boolean).join(', '); }
  function libraryCard(sec) {
    if (!EF) { efLoad().then(function () { if (V.tab === sec) body(); }).catch(fail); return '<div class="card empty">Loading the emission factor library…</div>'; }
    var uniq = function (k) { return EF.map(function (x) { return x[k]; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort(); };
    var sel = function (id, k, all, L) { return '<label>' + all + '<select id="' + id + '"><option value="">All</option>' + L.map(function (v) { return '<option' + (v === LF[k] ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select></label>'; };
    var fields = EF.map(function (x) { return x.field; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    return '<div class="card"><div class="row"><h3 style="margin:0">Emission factor library</h3><span class="muted" style="font-size:13px">' + EF.length + ' factors from ' + uniq('std').length + ' sources, ' + uniq('country').length + ' countries and regions</span></div>' +
      '<p class="muted" style="font-size:13px;margin:6px 0 12px">Search by country, state, fuel, gas or source, then press <b>Use</b> to put the factor in your report. The report records which factor and edition you used. Values are copied from the published sources: check them against the current release before you report.</p>' +
      '<div class="esg-form esg-form-4 esg-lf"><label style="grid-column:span 2">Search<input id="lfQ" type="search" value="' + esc(LF.q) + '" placeholder="e.g. New South Wales, Sabah, diesel, R-410A, DESNZ, IEA"></label>' + sel('lfCountry', 'country', 'Country', uniq('country')) + sel('lfCat', 'cat', 'Kind', uniq('cat')) +
        sel('lfStd', 'std', 'Source or standard', uniq('std')) + '<label>For the field<select id="lfField"><option value="">Any</option>' + fields.map(function (f) { var nm = FIELDN[f] || ((SC.fields.filter(function (y) { return y.id === f; })[0] || {}).label || f).replace(/^Factor: /, ''); return '<option value="' + f + '"' + (f === LF.field ? ' selected' : '') + '>' + esc(nm) + '</option>'; }).join('') + '</select></label>' +
        '<label style="grid-column:span 2;align-self:end"><button class="btn btn-sm" type="button" id="lfClear">Clear the filters</button></label></div><div id="lfRes">' + libRows() + '</div></div>';
  }
  function libRows() {
    var q = LF.q.toLowerCase().split(/\s+/).filter(Boolean), used = {}; Object.keys(V.e.efsrc || {}).forEach(function (k) { used[V.e.efsrc[k].id] = k; });
    var L = EF.filter(function (x) { if (LF.country && x.country !== LF.country) return false; if (LF.cat && x.cat !== LF.cat) return false; if (LF.std && x.std !== LF.std) return false; if (LF.field && x.field !== LF.field) return false;
      var hay = [x.cat, x.name, x.region, x.country, x.std, x.source, x.year, x.unit, FIELDN[x.field] || ''].join(' ').toLowerCase(); return q.every(function (w) { return hay.indexOf(w) >= 0; }); });
    var home = ((V.e.org || {}).country || '').toLowerCase(); L.sort(function (a, b) { return (b.country.toLowerCase() === home) - (a.country.toLowerCase() === home); });
    if (!L.length) return '<p class="muted" style="margin:12px 0">No factor matches. Try fewer words, or clear the filters. For a country not listed, the IEA national average or the IPCC defaults apply.</p>';
    return '<p class="muted" style="font-size:12.5px;margin:10px 0 6px">' + pl(L.length, 'factor') + (L.length > LF.n ? ', showing the first ' + LF.n : '') + '</p><div class="tbl-wrap"><table class="tbl esg-tbl esg-eflib"><thead><tr><th>Kind</th><th>Factor</th><th>Country · region</th><th class="r">Value</th><th>Source</th><th></th></tr></thead><tbody>' +
      L.slice(0, LF.n).map(function (x) { var u = used[x.id]; return '<tr' + (u ? ' class="on"' : '') + '><td>' + esc(x.cat) + '</td><td><b>' + esc(x.name || FIELDN[x.field] || '') + '</b></td><td>' + esc(x.country) + (x.region ? '<div class="muted" style="font-size:11.5px">' + esc(x.region) + '</div>' : '') + '</td>' +
        '<td class="r"><b>' + esc(String(x.value)) + '</b><div class="muted" style="font-size:11.5px">' + esc(x.unit) + '</div></td><td>' + esc(x.std) + ' · ' + esc(x.year) + '<div class="muted" style="font-size:11.5px" title="' + esc(x.source + (x.note ? '. ' + x.note : '')) + '">' + esc(x.source) + (x.note ? ' · ' + esc(x.note) : '') + '</div></td>' +
        '<td>' + (u ? '<span class="pill t-green">✓ In use</span>' : '<button class="btn btn-sm btn-gold" type="button" data-efuse="' + x.id + '">Use</button>') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      (L.length > LF.n ? '<div class="row" style="justify-content:center;margin-top:10px"><button class="btn btn-sm" type="button" id="lfMore">Show ' + Math.min(40, L.length - LF.n) + ' more</button></div>' : '');
  }
  function useFactor(id) {
    var x = EF.filter(function (y) { return y.id === id; })[0]; if (!x) return;
    var sec = x.field.split('.')[0], k = x.field.split('.')[1], prev = (V.e[sec] || {})[k];
    V.e[sec] = V.e[sec] || {}; V.e[sec][k] = x.value; V.e.efsrc = Object.assign({}, V.e.efsrc); V.e.efsrc[x.field] = { id: x.id, label: efLabel(x), value: x.value };
    touch(sec); touch('efsrc');
    toast((FIELDN[x.field] || 'Factor') + ' set to ' + x.value + ' ' + x.unit + ' (' + x.std + ' ' + x.year + ')' + (prev != null && String(prev) !== String(x.value) ? ', was ' + prev : ''));
    var r = $('#lfRes'); if (r) { r.innerHTML = libRows(); wireLib(); }
  }
  function wireLib() {
    var r = $('#lfRes'); if (!r) return;
    r.querySelectorAll('[data-efuse]').forEach(function (b) { b.onclick = function () { useFactor(b.getAttribute('data-efuse')); }; });
    var m = $('#lfMore'); if (m) m.onclick = function () { LF.n += 40; r.innerHTML = libRows(); wireLib(); };
  }

  /* ---------- 🧾 electricity bills: upload them, Champ reads the kWh, you check, Scope 2 uses the total ---------- */
  function billSum() {
    var B = V.calc.bills || {}, c = V.e.carbon || {}, differs = B.n && (Math.abs((c.elec || 0) - B.mwh) > 0.001 || Math.abs((c.green || 0) - B.greenMwh) > 0.001);
    return (B.n ? '<div class="esg-billsum"><span><b>' + nf(B.mwh, 1) + '</b> MWh</span><span><b>' + nf(B.greenMwh, 1) + '</b> MWh renewable</span><span><b>' + B.n + '</b> bill' + (B.n === 1 ? '' : 's') + ' · ' + B.sites + ' site' + (B.sites === 1 ? '' : 's') + '</span><span><b>' + nf(B.days) + '</b> meter-days</span>' + Object.keys(B.cost || {}).map(function (k) { return '<span><b>' + nf(B.cost[k], 0) + '</b> ' + esc(k) + '</span>'; }).join('') +
        (differs ? '<button class="btn btn-sm btn-gold" type="button" id="blUse">Use the bills\' total for Scope 2</button>' : '<span class="t-green">✓ Scope 2 uses the bills\' total</span>') + '</div>' : '');
  }
  function billsCard() {
    var L = V.e.bills || [], B = V.calc.bills || {}, c = V.e.carbon || {}, busy = V.ai[V.id + ':bills'];
    var head = '<span>Bill</span><span>Site · meter</span><span>Period</span><span class="r">kWh</span><span></span>';
    var line = function (x) { return '<span class="n">' + esc(x.supplier || 'Bill') + '<small class="muted">' + esc(x.file || '') + '</small></span><span>' + esc(x.site || '') + '<small class="muted">' + esc(x.meter || '') + '</small></span><span>' + esc(x.from && x.to ? dt(x.from) + ' to ' + dt(x.to) : '–') + '<small class="muted">' + (x.cost != null ? esc((x.cur || '') + ' ' + nf(x.cost, 2)) : '') + '</small></span><span class="r"><b>' + nf(x.kwh) + '</b>' + (x.green ? '<small class="t-green">' + nf(x.green) + ' green</small>' : '') + '</span>'; };
    var ed = function (x, i) { return '<div class="esg-form esg-form-4" data-bli="' + i + '"><label>Supplier' + inp('data-bl', 'supplier', x.supplier, ' maxlength="80"') + '</label><label>Site' + inp('data-bl', 'site', x.site, ' maxlength="120"') + '</label><label>Meter or NMI' + inp('data-bl', 'meter', x.meter, ' maxlength="40"') + '</label><label>File' + inp('data-bl', 'file', x.file, ' maxlength="120"') + '</label>' +
      '<label>From<input type="date" data-bl="from" value="' + esc(x.from || '') + '"></label><label>To<input type="date" data-bl="to" value="' + esc(x.to || '') + '"></label><label>Electricity used' + numIn('data-bl', 'kwh', x.kwh, 'kWh') + '</label><label>Of which renewable' + numIn('data-bl', 'green', x.green, 'kWh') + '</label>' +
      '<label>Amount' + numIn('data-bl', 'cost', x.cost, '') + '</label><label>Currency' + inp('data-bl', 'cur', x.cur, ' maxlength="6"') + '</label><label class="full">Notes' + inp('data-bl', 'note', x.note, ' maxlength="200"') + '</label></div><div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn btn-sm" type="button" data-bldel="' + i + '">🗑 Remove</button></div>'; };
    var differs = B.n && (Math.abs((c.elec || 0) - B.mwh) > 0.001 || Math.abs((c.green || 0) - B.greenMwh) > 0.001);
    return '<div class="card"><div class="row"><h3 style="margin:0">Electricity bills</h3><span class="sp"></span><button class="btn btn-sm btn-gold" type="button" id="blPick"' + (busy ? ' disabled' : '') + '>' + (busy ? '✨ Reading…' : '📄 Upload bills') + '</button><input type="file" id="blFile" accept=".pdf,application/pdf" multiple hidden><button class="btn btn-sm" type="button" id="blAdd">＋ Type one in</button></div>' +
      '<p class="muted" style="font-size:13px;margin:8px 0 0">Upload your electricity bills (PDF, several at once). ✨ Champ reads the supplier, site, meter, billing period, kWh used, GreenPower or renewable kWh and the amount. Check each line, then use the total for Scope 2. The figures stay with the report; keep the original bills for assurance. For interval or portal data in a spreadsheet, use 📥 Import.</p>' +
      '<div id="esgBillSum">' + billSum() + '</div>' + '</div>' +
      rowList('bills', L, head, line, ed, 'No bills yet. Upload the year\'s electricity bills, or type one in.');
  }
  function wireUse() { var u = $('#blUse'); if (u) u.onclick = function () { var B = V.calc.bills; V.e.carbon = V.e.carbon || {}; V.e.carbon.elec = B.mwh; V.e.carbon.green = B.greenMwh; touch('carbon'); toast('Scope 2 now uses ' + nf(B.mwh, 1) + ' MWh from the bills'); }; }
  function readBills(files) {
    var id = V.id, ent = V.e, key = id + ':bills', list = Array.prototype.slice.call(files || []), added = 0, warn = [];
    if (!list.length) return;
    if (!M.readDoc) return fail(new Error('The document reader did not load. Reload the page.'));
    V.ai[key] = true; body();
    var one = function (f) {
      if (!/\.pdf$/i.test(f.name)) { warn.push(f.name + ': only PDF bills can be read'); return Promise.resolve(); }
      return M.readDoc(f).then(function (x) { return new Promise(function (res) { bg({ mode: 'esgBill', text: x.text, file: f.name }, function (r) {
        ent.bills = ent.bills || []; r.bills.forEach(function (b) { b.id = 'N' + rid().slice(0, 10).toUpperCase(); ent.bills.push(b); added++; }); if (r.bills.length) { var S0 = q(id); S0.ent = ent; S0.parts.bills = 1; } (r.warnings || []).forEach(function (w) { warn.push(f.name + ': ' + w); }); res(); },
        function (e) { warn.push(f.name + ': ' + e.message); res(); }); }); }, function (e) { warn.push(f.name + ': ' + e.message); });
    };
    list.reduce(function (p, f) { return p.then(function () { return one(f); }); }, Promise.resolve()).then(function () {
      V.ai[key] = false; if (added) { var S = q(id); S.ent = ent; S.parts.bills = 1; saveNow(id).catch(function (e) { if (!e.shown) fail(e); }); }
      if (V.e === ent) body();
      toast(added ? 'Read ' + pl(added, 'bill') + ': check each line' + (warn.length ? ' (' + warn.length + ' note' + (warn.length === 1 ? '' : 's') + ')' : '') : 'No bills could be read');
      if (warn.length) M.modal('<h2>Notes from reading the bills</h2><ul class="esg-ul" style="margin:10px 0">' + warn.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul><div class="actions" style="justify-content:flex-end"><button class="btn" data-close type="button">OK</button></div>');
    });
  }

  function results(sec) {
    var c = V.calc, em = c.em, e = V.e;
    if (sec === 'org') return '<h3>What this report covers</h3>' + kvHtml([['Organisation', (e.org || {}).name], ['Reporting year', (e.org || {}).year], ['Period', [(e.org || {}).from, (e.org || {}).to].filter(Boolean).join(' to ')], ['Boundary', (e.org || {}).boundary], ['Assurance', (e.org || {}).assurance], ['Standards', (e.std || []).map(stdShort).join(', ')]]) +
      '<p class="muted" style="font-size:12.5px;margin-top:10px">Revenue and headcount give the emissions intensity and the per-employee figures.</p>';
    if (sec === 'carbon') {
      var S = [['Diesel', em.s1.diesel], ['Petrol', em.s1.petrol], ['Jet fuel', em.s1.jet], ['LPG', em.s1.lpg], ['Natural gas', em.s1.gas], ['Refrigerants', em.s1.refrig]].filter(function (x) { return x[1] != null; });
      return '<h3>Scope 1 and 2</h3><div class="esg-big"><b>' + nf((em.s1t || 0) + (em.s2loc || 0)) + '</b><span>tCO2e, Scope 1 and 2 (location based)</span></div>' +
        bars(S.map(function (x) { return [x[0], x[1]]; }).concat(em.s2loc != null ? [['Electricity (Scope 2)', em.s2loc]] : []), 't') +
        kvHtml([['Scope 1', tco(em.s1t)], ['Scope 2 location based', tco(em.s2loc)], ['Scope 2 market based', tco(em.s2mkt)], ['Grid factor used', nf(em.elecFactor, 4) + ' kgCO2e/kWh'], ['Intensity', em.intensity != null ? nf(em.intensity, 1) + ' tCO2e per $M revenue' : 'Add revenue (Organisation)'],
          ['Sector (indicative)', em.bench ? nf(em.bench) + ' t per $M · you are ' + (em.vsBench <= 0 ? Math.abs(em.vsBench) + '% below' : em.vsBench + '% above') : '–'], ['Against the base year', em.vsBase != null ? (em.vsBase <= 0 ? '▼ ' + Math.abs(em.vsBase) : '▲ ' + em.vsBase) + '%' : 'Add the base year']]);
    }
    if (sec === 'scope3') { var L3 = [['Purchased goods', 'purch'], ['Freight', 'freight'], ['Landfill', 'landfill'], ['Recycling', 'recycled'], ['Flights', 'air'], ['Car travel', 'car'], ['Hotel nights', 'hotel'], ['Commuting', 'commute'], ['Water', 'water']].filter(function (x) { return em.s3[x[1]] != null; });
      return '<h3>Scope 3</h3><div class="esg-big"><b>' + nf(em.s3t) + '</b><span>tCO2e across ' + pl(L3.length, 'category') + '</span></div>' + bars(L3.map(function (x) { return [x[0], em.s3[x[1]]]; }), 't') +
        '<p class="muted" style="font-size:12.5px">Total footprint: <b>' + tco(em.total) + '</b>' + (em.perFte != null ? ' · ' + nf(em.perFte, 1) + ' t per employee' : '') + ' (about ' + nf(em.cars) + ' cars driven for a year).</p>'; }
    if (sec === 'resources') { var r = e.resources || {}; return '<h3>Resources</h3>' + kvHtml([['Energy used', em.energy != null ? nf(em.energy) + ' MWh' : '–'], ['Renewable share', r.renewPct != null ? r.renewPct + '%' : '–'], ['Water withdrawn', r.waterWd != null ? nf(r.waterWd) + ' m3' : '–'], ['Waste', r.wasteT != null ? nf(r.wasteT) + ' t' + (r.divertPct != null ? ' · ' + r.divertPct + '% diverted' : '') : '–'], ['ISO 14001', r.iso14001 || '–']]) + gapsHtml(c.env.why); }
    if (sec === 'climate') { var k = e.climate || {}, risks = (k.risks || '').split('\n').filter(Boolean); return '<h3>Climate</h3>' + kvHtml([['Target', k.tgtPct != null ? k.tgtPct + '% cut by ' + (k.tgtYear || '?') + ' from ' + ((e.carbon || {}).baseYear || 'the base year') : 'Not set'], ['Net zero', k.netZero || 'Not set'], ['Science-based', k.sbti || '–'], ['Scenario analysis', k.scenario || '–'], ['Transition plan', k.transition || '–']]) +
      (risks.length ? '<h4 style="margin:12px 0 6px">Climate risks</h4><ul class="esg-ul">' + risks.map(function (x) { var p0 = x.split('·').map(function (y) { return y.trim(); }); return '<li><b>' + esc(p0[0]) + '</b>' + (p0[1] ? ' <span class="pill">' + esc(p0[1]) + '</span>' : '') + (p0[2] ? ' <span class="pill t-' + (/high/i.test(p0[2]) ? 'red' : /med/i.test(p0[2]) ? 'amber' : 'green') + '">' + esc(p0[2]) + '</span>' : '') + '</li>'; }).join('') + '</ul>' : ''); }
    if (pillarOf(sec) === 'soc') { var w = e.workforce || {}, ages = [['Under 18', w.under18], ['18 to 40', w.a18], ['41 to 55', w.a41], ['Over 55', w.a55]].filter(function (x) { return x[1] != null; });
      return '<h3>Social score <b class="t-' + rag(c.soc.score) + '">' + c.soc.score + '</b><small class="muted"> / 100</small></h3>' + meter([['Core', c.soc.core, 75], ['Enhancement', c.soc.opt, 25]]) +
        kvHtml([['Women in the workforce', c.soc.womenPct != null ? c.soc.womenPct + '%' : '–'], ['Women in management', c.soc.womenMgmtPct != null ? c.soc.womenMgmtPct + '%' : '–'], ['Turnover', w.fte && w.leavers != null ? nf(w.leavers / w.fte * 100, 1) + '%' : '–'], ['Injuries · fatalities', (w.injuries != null ? w.injuries : '–') + ' · ' + (w.deaths != null ? w.deaths : '–')], ['LTIFR', w.ltifr != null ? w.ltifr : '–']]) +
        (ages.length ? '<h4 style="margin:12px 0 6px">Age profile</h4>' + bars(ages, '') : '') + gapsHtml(c.soc.why); }
    if (pillarOf(sec) === 'gov') return '<h3>Governance score <b class="t-' + rag(c.gov.score) + '">' + c.gov.score + '</b><small class="muted"> / 100</small></h3>' + meter([['Core', c.gov.core, 75], ['Enhancement', c.gov.opt, 25], ['GRI 2 alignment', c.gov.gri, 100]]) + radar(c.gov.radar) +
      kvHtml([['Women on the board', c.gov.boardWomenPct != null ? c.gov.boardWomenPct + '%' : '–'], ['Independent directors', (e.board || {}).indepPct != null ? e.board.indepPct + '%' : '–']]) + gapsHtml(c.gov.why);
    return '';
  }
  function kvHtml(L) { return '<table class="esg-kv">' + L.filter(function (x) { return x[1] != null && x[1] !== ''; }).map(function (x) { return '<tr><th>' + esc(x[0]) + '</th><td>' + esc(String(x[1])) + '</td></tr>'; }).join('') + '</table>'; }
  function gapsHtml(L) { return L && L.length ? '<div class="esg-gaps"><b>To strengthen</b><ul>' + L.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : ''; }
  function bars(L, unit) { var mx = Math.max.apply(null, L.map(function (x) { return x[1] || 0; }).concat([1])); return L.length ? '<div class="esg-bars">' + L.map(function (x) { return '<div class="esg-bar"><span>' + esc(x[0]) + '</span><i><b style="width:' + Math.max(1.5, (x[1] || 0) / mx * 100) + '%"></b></i><em>' + nf(x[1], x[1] < 10 ? 1 : 0) + (unit ? ' ' + unit : '') + '</em></div>'; }).join('') + '</div>' : '<p class="muted" style="font-size:13px">Nothing entered yet.</p>'; }
  function meter(L) { return '<div class="esg-meters">' + L.map(function (x) { return '<div><span>' + esc(x[0]) + '</span><i><b style="width:' + Math.min(100, x[1] / x[2] * 100) + '%"></b></i><em>' + x[1] + ' / ' + x[2] + '</em></div>'; }).join('') + '</div>'; }
  function radar(R) {   // the governance radar (six axes)
    var cx = 120, cy = 104, r = 78, n = R.length, pt = function (i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r * v / 100, cy + Math.sin(a) * r * v / 100]; };
    var ring = function (v) { return R.map(function (x, i) { return pt(i, v).join(','); }).join(' '); };
    return '<svg class="esg-radar" viewBox="0 0 240 210" role="img" aria-label="Governance maturity radar">' + [25, 50, 75, 100].map(function (v) { return '<polygon points="' + ring(v) + '" class="rg"/>'; }).join('') +
      R.map(function (x, i) { var p = pt(i, 100), q = pt(i, 122); return '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" class="rg"/><text x="' + q[0] + '" y="' + q[1] + '" text-anchor="' + (Math.abs(q[0] - cx) < 8 ? 'middle' : q[0] > cx ? 'start' : 'end') + '" dominant-baseline="middle">' + esc(x[0]) + '</text>'; }).join('') +
      '<polygon points="' + R.map(function (x, i) { return pt(i, x[1]).join(','); }).join(' ') + '" class="rv"/>' + R.map(function (x, i) { var p = pt(i, x[1]); return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" class="rp"><title>' + esc(x[0] + ': ' + x[1]) + '</title></circle>'; }).join('') + '</svg>';
  }

  /* ---------- ✨ Champ's recommendations for a pillar ---------- */
  var PNAME = { env: 'Environment', soc: 'Social', gov: 'Governance' };
  function insightCard(p) {
    var I = (V.e.insights || {})[p], busy = V.ai[V.id + ':' + p];
    return '<div class="card esg-ai" id="esgAi-' + p + '"><div class="row"><h3 style="margin:0">✨ Champ on ' + PNAME[p] + '</h3><span class="sp"></span><button class="btn btn-sm btn-gold" type="button" data-ins="' + p + '"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Thinking…' : I ? 'Ask again' : 'Get recommendations') + '</button></div>' +
      (I ? '<p style="margin:10px 0 6px"><b>' + esc(I.headline) + '</b></p>' + (I.strengths.length ? '<p class="muted" style="font-size:12.5px;margin:0 0 6px">Strengths: ' + esc(I.strengths.join(' · ')) + '</p>' : '') +
        '<ol class="esg-recs">' + I.recs.map(function (r) { return '<li><b>' + esc(r.title) + '</b>' + (r.standard ? ' <span class="pill">' + esc(r.standard) + '</span>' : '') + '<div class="muted">' + esc(r.why) + '</div><div>' + esc(r.how) + '</div></li>'; }).join('') + '</ol><small class="muted">' + esc(when(I.at)) + '</small>'
        : '<p class="muted" style="font-size:13px;margin:8px 0 0">Five practical recommendations from your ' + PNAME[p].toLowerCase() + ' data, each tied to the disclosure it improves. They are also used when Champ writes the report.</p>') + '</div>';
  }
  function bg(payload, onDone, onErr) {   // a background AI job, then ask how it is going until it is done
    var id = rid(), t0 = Date.now();
    fetch('/.netlify/functions/planai-background', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1', 'X-Champ-Lang': (window.ChampI18n && window.ChampI18n.get()) || 'en' }, body: JSON.stringify(Object.assign({ id: id }, payload)) })
      .then(function (r) { if (r.status === 401 || r.status === 403) throw new Error('Your session has ended. Sign in again.'); if (r.status !== 202 && !r.ok) throw new Error('Could not start the AI (' + r.status + ')'); })
      .then(function poll() { return new Promise(function (res) { setTimeout(res, 3000); }).then(function () { return api('esgAiStatus', { id: id }); }).then(function (d) {
        if (d.status === 'done' && d.esg) return onDone(d.esg);
        if (d.status === 'error') throw new Error(d.error || 'The AI could not finish');
        if (Date.now() - t0 > 900000) throw new Error('The AI is taking too long. Try again.');
        return poll(); }); }).catch(onErr);
  }
  function askInsight(p) {
    var id = V.id, ent = V.e, key = id + ':' + p, show = function () { if (V.e !== ent) return; var b = $('#esgAi-' + p); if (b) { b.outerHTML = insightCard(p); wire($('#esgBody')); } };
    V.ai[key] = true; show();
    var stop = function (e) { V.ai[key] = false; show(); if (!e.shown) fail(e); };
    flush().then(function () { bg({ mode: 'esgInsight', esg: id, pillar: p }, function (r) { V.ai[key] = false; var o = {}; o[p] = r.insight; ent.insights = Object.assign({}, ent.insights, o); show(); toast('Recommendations ready'); }, stop); }, stop);
  }

  /* ---------- 📥 import: a CSV or Excel sheet from another system (energy portal, HR, payroll, safety, finance), matched to the ESG fields ---------- */
  var norm = function (t) { return String(t == null ? '' : t).toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); };
  function parseCsv(t) {
    var rows = [], row = [], cur = '', qd = false, sep = (t.split('\n')[0].match(/;/g) || []).length > (t.split('\n')[0].match(/,/g) || []).length ? ';' : t.indexOf('\t') >= 0 && t.indexOf(',') < 0 ? '\t' : ',';
    for (var i = 0; i < t.length; i++) { var ch = t[i];
      if (qd) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else qd = false; } else cur += ch; }
      else if (ch === '"') qd = true; else if (ch === sep) { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch; }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim(); }); });
  }
  function readSheet(f) {
    if (/\.(csv|txt|tsv)$/i.test(f.name)) return f.text().then(function (t) { return parseCsv(t.replace(/^﻿/, '')); });
    if (/\.xlsx$/i.test(f.name)) return new Promise(function (res, rej) { if (window.ExcelJS) return res(); var sc = document.createElement('script'); sc.src = 'vendor/exceljs.min.js'; sc.onload = res; sc.onerror = function () { rej(new Error('Could not load the Excel reader')); }; document.head.appendChild(sc); })
      .then(function () { return f.arrayBuffer(); }).then(function (buf) { var wb = new window.ExcelJS.Workbook(); return wb.xlsx.load(buf).then(function () {
        var best = null; wb.eachSheet(function (ws) { var rows = []; ws.eachRow({ includeEmpty: false }, function (r) { var v = []; r.eachCell({ includeEmpty: true }, function (c, n) { var x = c.value; if (x && typeof x === 'object') x = x.result != null ? x.result : x.text != null ? x.text : x.richText ? x.richText.map(function (t) { return t.text; }).join('') : x instanceof Date ? x.toISOString().slice(0, 10) : ''; v[n - 1] = x == null ? '' : x; }); rows.push(v); }); if (!best || rows.length > best.length) best = rows; });
        return best || []; }); });
    return Promise.reject(new Error('Choose a CSV or Excel (.xlsx) file. Old .xls files: open in Excel and save as .xlsx.'));
  }
  function toVal(f, v) {
    if (v == null || String(v).trim() === '') return null;
    if (f.type === 'n' || f.type === 'p') { var n = Number(String(v).replace(/[^0-9.\-eE]/g, '')); return isFinite(n) && String(v).replace(/[^0-9]/g, '') !== '' ? n : null; }
    if (f.options) { var o = f.options.filter(function (x) { return norm(x) === norm(v); })[0] || (/^(y|yes|true|1)$/i.test(String(v).trim()) && f.options.indexOf('Yes') >= 0 ? 'Yes' : /^(n|no|false|0)$/i.test(String(v).trim()) && f.options.indexOf('No') >= 0 ? 'No' : null); return o; }
    if (f.type === 'd') { var d = new Date(v); return isNaN(d) ? null : d.toISOString().slice(0, 10); }
    return String(v).slice(0, f.type === 'l' ? 3000 : 200);
  }
  // match without AI: the template's field ids, or a field label in the first column (long sheets) or the header row (wide sheets)
  function autoMap(rows) {
    var F = SC.fields, byId = {}, byLabel = {}; F.forEach(function (f) { byId[f.id] = f; [f.label, (f.label.match(/\(([^)]+)\)/) || [])[1], f.id.split('.')[1]].forEach(function (n) { n = norm(n); if (n && !byLabel[n]) byLabel[n] = f; }); });
    var head = rows[0] || [], out = [], hi = head.map(norm), idCol = hi.indexOf('field id'), vCol = hi.indexOf('value');
    if (idCol < 0) for (var r = 0; r < Math.min(rows.length, 20) && idCol < 0; r++) rows[r].forEach(function (x, c) { if (byId[String(x).trim()] && idCol < 0) idCol = c; });
    if (idCol >= 0) { rows.forEach(function (r0, i) { var f = byId[String(r0[idCol] || '').trim()]; if (!f) return; var vc = vCol >= 0 ? vCol : r0.length - 1; out.push({ f: f, raw: r0[vc], src: 'row ' + (i + 1) }); }); return out; }
    rows.forEach(function (r0, i) { var f = byLabel[norm(r0[0])]; if (f && r0.length > 1) { var raw = null; for (var c = r0.length - 1; c >= 1; c--) if (String(r0[c]).trim() !== '') { raw = r0[c]; break; } out.push({ f: f, raw: raw, src: 'row ' + (i + 1) }); } });
    if (!out.length) head.forEach(function (h, c) { var f = byLabel[norm(h)]; if (!f) return; var raw = null; for (var r = 1; r < rows.length; r++) if (String(rows[r][c]).trim() !== '') { raw = rows[r][c]; break; } out.push({ f: f, raw: raw, src: 'column ' + h }); });
    return out;
  }
  var numOf = function (v) { var t = String(v == null ? '' : v).replace(/[^0-9.\-eE]/g, ''); var n = Number(t); return t !== '' && isFinite(n) ? n : null; };
  function aiMap(rows, map) {
    var byId = {}; SC.fields.forEach(function (f) { byId[f.id] = f; }); var out = [], head = rows[0] || [];
    if (map.layout === 'long') rows.forEach(function (r0, i) { var m = map.map.filter(function (x) { return norm(x.source) === norm(r0[map.nameCol]); })[0]; if (!m) return; var n = numOf(r0[map.valueCol]); out.push({ f: byId[m.field], raw: n != null && m.factor !== 1 ? n * m.factor : r0[map.valueCol], src: 'row ' + (i + 1), why: m.why }); });
    else map.map.forEach(function (m) { var c = head.map(norm).indexOf(norm(m.source)); if (c < 0) return; var vals = rows.slice(1).map(function (r0) { return r0[c]; }).filter(function (v) { return String(v).trim() !== ''; });
      if (!vals.length) return; var raw = m.sum ? vals.reduce(function (a, v) { return a + (numOf(v) || 0); }, 0) : vals[0]; if (m.factor !== 1 && numOf(raw) != null) raw = numOf(raw) * m.factor; out.push({ f: byId[m.field], raw: raw, src: 'column ' + m.source + (m.sum ? ' (sum of ' + vals.length + ')' : ''), why: m.why }); });
    return out.filter(function (x) { return x.f; });
  }
  function importModal() {
    M.modal('<h2>📥 Import data from a spreadsheet</h2><p class="muted" style="margin:4px 0 12px">Bring in metrics from another system: an energy or fleet portal, HR or payroll, safety, finance or your own workbook, as CSV or Excel. You check every value before it is saved, and the change log records the file.</p>' +
      '<div class="esg-imp-drop"><button class="btn btn-gold" type="button" id="impPick">Choose a CSV or Excel file</button><input type="file" id="impFile" accept=".csv,.tsv,.txt,.xlsx" hidden><span class="muted" id="impName">or start from the template</span><button class="btn btn-sm" type="button" id="impTpl">⬇ Template (CSV, with your current values)</button></div>' +
      '<div id="impBody"></div><div class="actions" style="justify-content:flex-end"><button class="btn" data-close type="button">Close</button><button class="btn btn-gold" id="impGo" type="button" hidden>Import the ticked values</button></div>');
    var rows = null, found = [], fname = '';
    var show = function (note) {
      var B = $('#impBody'); if (!B) return;
      if (!found.length) { B.innerHTML = '<div class="esg-gaps" style="margin:12px 0">' + esc(note || 'No field matched by name.') + ' <button class="btn btn-sm btn-gold" type="button" id="impAi">✨ Let Champ match the columns</button></div>'; var b0 = $('#impAi'); if (b0) b0.onclick = askAi; $('#impGo').hidden = true; return; }
      B.innerHTML = '<p style="margin:12px 0 6px"><b>' + pl(found.length, 'value') + '</b> found in ' + esc(fname) + (note ? ' · ' + esc(note) : '') + ' <button class="btn btn-sm" type="button" id="impAi">✨ Match again with Champ</button></p><div class="tbl-wrap" style="max-height:46vh;overflow:auto"><table class="tbl esg-tbl"><thead><tr><th><input type="checkbox" id="impAll" checked aria-label="Tick all"></th><th>Field</th><th>Now</th><th>From the file</th><th>Where</th></tr></thead><tbody>' +
        found.map(function (x, i) { var sec = x.f.id.split('.')[0], k = x.f.id.split('.')[1], now = (V.e[sec] || {})[k], v = toVal(x.f, x.raw), ok = v != null; x.v = v;
          return '<tr><td><input type="checkbox" data-imp="' + i + '"' + (ok && String(v) !== String(now) ? ' checked' : '') + (ok ? '' : ' disabled') + '></td><td><b>' + esc(x.f.label) + '</b><div class="muted" style="font-size:11.5px">' + esc(x.f.section) + '</div></td><td>' + esc(now == null ? '–' : String(now)) + '</td><td>' + (ok ? '<b>' + esc(String(v)) + '</b> ' + esc(x.f.unit || '') : '<span class="t-amber">Not readable: ' + esc(String(x.raw == null ? '' : x.raw).slice(0, 40)) + '</span>') + '</td><td class="muted" style="font-size:11.5px">' + esc(x.src) + (x.why ? '<div>' + esc(x.why) + '</div>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
      $('#impGo').hidden = false; $('#impAi').onclick = askAi; $('#impAll').onchange = function () { var c = this.checked; document.querySelectorAll('[data-imp]:not(:disabled)').forEach(function (x) { x.checked = c; }); };
    };
    var askAi = function () { var B = $('#impBody'); B.innerHTML = '<p class="ask-think" style="margin:12px 0">✨ Champ is matching the columns to the ESG fields…</p>'; $('#impGo').hidden = true;
      bg({ mode: 'esgMap', head: rows[0], rows: rows.slice(1, 41) }, function (m) { found = aiMap(rows, m); show(found.length ? 'matched by Champ: check them' : 'Champ found nothing it could match'); }, function (e) { show(e.message); }); };
    $('#impPick').onclick = function () { $('#impFile').click(); };
    $('#impTpl').onclick = function () { var L = [['Field id', 'Section', 'Field', 'Unit', 'Value']].concat(SC.fields.filter(function (f) { return f.type !== 'l'; }).map(function (f) { var sec = f.id.split('.')[0], k = f.id.split('.')[1], v = (V.e[sec] || {})[k]; return [f.id, f.section, f.label, f.unit || (f.options ? f.options.join(' / ') : ''), v == null ? '' : v]; }));
      var csv = '﻿' + L.map(function (r0) { return r0.map(function (x) { x = String(x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(','); }).join('\r\n');
      M.report.save(new Blob([csv], { type: 'text/csv' }), ((V.e.org || {}).name || 'ESG').replace(/[^\w-]+/g, '-') + '-ESG-data-template.csv'); };
    $('#impFile').onchange = function () { var f = this.files[0]; if (!f) return; fname = f.name; $('#impName').textContent = f.name; $('#impBody').innerHTML = '<p class="muted" style="margin:12px 0">Reading…</p>';
      readSheet(f).then(function (r) { rows = r; if (!rows.length) throw new Error('The file is empty.'); found = autoMap(rows); show(found.length ? 'matched by name' : ''); }).catch(function (e) { $('#impBody').innerHTML = '<div class="esg-gaps" style="margin:12px 0">' + esc(e.message) + '</div>'; }); };
    $('#impGo').onclick = function () { var n = 0, parts = {}; document.querySelectorAll('[data-imp]:checked').forEach(function (cb) { var x = found[+cb.getAttribute('data-imp')]; if (!x || x.v == null) return; var sec = x.f.id.split('.')[0], k = x.f.id.split('.')[1]; V.e[sec] = V.e[sec] || {}; V.e[sec][k] = x.v; parts[sec] = 1; n++; });
      if (!n) return toast('Tick at least one value');
      var S = q(V.id); S.ent = V.e; Object.keys(parts).forEach(function (k) { S.parts[k] = 1; }); S.source = fname;
      saveNow(V.id).then(function () { toast('Imported ' + pl(n, 'value') + ' from ' + fname); }, function (e) { if (!e.shown) fail(e); });
      var m = document.getElementById('modal'); if (M.closeModal) M.closeModal(); else if (m && m.close) m.close(); draw(); };
  }

  /* ---------- 📊 overview ---------- */
  function overview() {
    var c = V.calc, e = V.e, em = c.em, std = e.std || [];
    var miss = c.filled.filter(function (f) { return f.n === 0; });
    return '<div class="esg-ov">' +
      '<div class="card"><h3>ESG scorecard</h3><div class="esg-score"><div class="esg-ring" style="--p:' + c.esg + ';--c:var(--rag-' + rag(c.esg) + ', #2E9E6A)"><b>' + c.esg + '</b><small>ESG score</small></div><div style="flex:1">' + meter([['Environment', c.env.score, 100], ['Social', c.soc.score, 100], ['Governance', c.gov.score, 100]]) +
        '<p class="muted" style="font-size:12px;margin:6px 0 0">' + esc(c.method) + ': transparent points for what is measured, managed and achieved (see Records).</p></div></div></div>' +
      '<div class="card"><h3>Emissions</h3><div class="esg-big"><b>' + nf(em.total) + '</b><span>tCO2e total footprint</span></div>' + bars([['Scope 1', em.s1t], ['Scope 2', em.s2loc], ['Scope 3', em.s3t]].filter(function (x) { return x[1] != null; }), 't') +
        (c.avoid.total ? '<div class="esg-avoid-note">🌱 <b>' + tco(c.avoid.total) + '</b> avoided by your solutions (' + tco(c.avoid.delivered) + ' delivered), reported separately, not netted</div>' : '') + '</div>' +
      '<div class="card"><h3>Report readiness</h3>' + (std.length ? bars(std.map(function (s) { return [stdShort(s), c.coverage[s] || 0]; }), '%') : '<p class="muted">Choose the standards you report to.</p>') + '<a class="btn btn-sm" href="#esg/' + esc(V.id) + '/standards">Standards and the disclosure index →</a></div>' +
      '<div class="card"><h3>Double materiality</h3>' + matrix() + '<a class="btn btn-sm" href="#esg/' + esc(V.id) + '/material">Rate the topics →</a></div>' +
      '<div class="card esg-wide"><h3>What to do next</h3><ul class="esg-next">' + c.env.why.concat(c.soc.why, c.gov.why).slice(0, 8).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
        miss.slice(0, 6).map(function (f) { var s = SC.sec[f.id]; return '<li>No data yet in <a href="#esg/' + esc(V.id) + '/' + f.id + '">' + esc(s.title) + '</a></li>'; }).join('') +
        (!(V.docs.statement || V.docs.report) ? '<li>When the data is in, let Champ write the <a href="#esg/' + esc(V.id) + '/statement">Sustainability Statement</a> or the <a href="#esg/' + esc(V.id) + '/report">ESG Report</a>.</li>' : '') + '</ul>' +
        '<h4 style="margin:14px 0 8px">Data completeness</h4><div class="esg-fill">' + c.filled.map(function (f) { var s = SC.sec[f.id]; return '<a href="#esg/' + esc(V.id) + '/' + f.id + '" class="esg-fill-' + f.pillar + '"><span>' + esc(s.title) + '</span><i><b style="width:' + Math.round(f.n / f.of * 100) + '%"></b></i><em>' + f.n + '/' + f.of + '</em></a>'; }).join('') + '</div></div></div>';
  }
  function matrix() {   // impact (up) against financial (across), each topic a dot in its pillar's colour
    var mat = V.e.mat || {}, pts = SC.topics.filter(function (t) { return mat[t[0]]; }), pos = {};
    var dots = pts.map(function (t) { var m = mat[t[0]], key = m.fin + 'x' + m.imp, k = pos[key] = (pos[key] || 0) + 1, x = 30 + m.fin / 4 * 200 + (k - 1) * 9, y = 210 - m.imp / 4 * 190 + (k - 1) * 5;
      return '<circle cx="' + x + '" cy="' + y + '" r="6" class="md md-' + t[2] + '"><title>' + esc(t[1] + ': impact ' + ['–', 'low', 'medium', 'high', 'very high'][m.imp] + ', financial ' + ['–', 'low', 'medium', 'high', 'very high'][m.fin]) + '</title></circle>'; }).join('');
    return '<svg class="esg-mx" viewBox="0 0 250 240" role="img" aria-label="Double materiality matrix"><rect x="130" y="20" width="100" height="95" class="mx-hot"/><path d="M30 20v190h200" class="mx-ax"/><text x="130" y="232" text-anchor="middle">Financial materiality →</text><text x="12" y="115" transform="rotate(-90 12 115)" text-anchor="middle">Impact materiality →</text>' + dots + '</svg>' +
      '<div class="esg-leg"><span class="md-E">Environment</span><span class="md-S">Social</span><span class="md-G">Governance</span></div>' + (pts.length ? '' : '<p class="muted" style="font-size:12.5px">No topics rated yet.</p>');
  }

  /* ---------- 📚 standards and the disclosure index ---------- */
  var WHERE = function (f) { if (f === 'mat') return 'material'; return f.split('.')[0]; };
  function standardsTab() {
    var e = V.e, std = e.std || [], c = V.calc;
    var cards = SC.standards.map(function (s) { var on = std.indexOf(s.id) >= 0; return '<label class="esg-stdc' + (on ? ' on' : '') + '"><input type="checkbox" data-std="' + s.id + '"' + (on ? ' checked' : '') + '><div><b>' + esc(s.name) + '</b><div class="esg-std-m"><span class="pill">' + esc(s.region) + '</span><span class="pill">' + esc(s.kind) + '</span>' + (c.coverage[s.id] != null ? '<span class="pill t-' + rag(c.coverage[s.id]) + '">' + c.coverage[s.id] + '% covered</span>' : '') + '</div><small class="muted">' + esc(s.note) + '</small></div></label>'; }).join('');
    var rows = []; std.forEach(function (s) { (V.cover[s] || []).forEach(function (d) { rows.push('<tr><td><b>' + esc(stdShort(s)) + '</b></td><td>' + esc(d.ref) + '</td><td>' + esc(d.title) + '</td><td><span class="pill t-' + (d.status === 'Reported' ? 'green' : d.status === 'Partly' ? 'amber' : 'red') + '">' + esc(d.status) + '</span></td><td>' + (d.status === 'Reported' ? '' : '<a href="#esg/' + esc(V.id) + '/' + WHERE(d.fields[0]) + '">Add data →</a>') + '</td></tr>'); }); });
    return '<div class="card"><h3 style="margin-top:0">The standards you report to</h3><p class="muted" style="font-size:13px;margin:0 0 12px">Pick every framework your organisation reports to or wants to align with. The statement, the report and the content index follow your choice. Status as checked in November 2026.</p><div class="esg-stds">' + cards + '</div></div>' +
      '<div class="card"><h3 style="margin-top:0">Disclosure index</h3><p class="muted" style="font-size:13px;margin:0 0 10px">Each disclosure, and whether your data covers it. This becomes the content index at the back of the report.</p>' +
      (rows.length ? '<div class="tbl-wrap"><table class="tbl esg-tbl"><thead><tr><th>Standard</th><th>Reference</th><th>Disclosure</th><th>Status</th><th></th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' : '<p class="muted">Choose a standard above.</p>') + '</div>';
  }
  function materialTab() {
    var mat = V.e.mat || {}, R = ['–', 'Low', 'Medium', 'High', 'Very high'], sel = function (k, f, v) { return '<select data-mat="' + k + '" data-mf="' + f + '">' + R.map(function (x, i) { return '<option value="' + i + '"' + (i === (v || 0) ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>'; };
    return '<div class="esg-split"><div class="card"><h3 style="margin-top:0">Material topics</h3><p class="muted" style="font-size:13px;margin:0 0 10px"><b>Impact</b>: how much the organisation affects people and the planet on this topic (GRI). <b>Financial</b>: how much the topic can affect the organisation\'s cash flows, cost of capital or value (IFRS S1). Rating both is double materiality (ESRS).</p>' +
      '<div class="tbl-wrap"><table class="tbl esg-tbl esg-mat"><thead><tr><th>Topic</th><th>Pillar</th><th>Impact</th><th>Financial</th><th>Why (optional)</th></tr></thead><tbody>' + SC.topics.map(function (t) { var m = mat[t[0]] || {};
        return '<tr><td><b>' + esc(t[1]) + '</b></td><td><span class="pill md-' + t[2] + '">' + t[2] + '</span></td><td>' + sel(t[0], 'imp', m.imp) + '</td><td>' + sel(t[0], 'fin', m.fin) + '</td><td><input data-mat="' + t[0] + '" data-mf="note" maxlength="300" value="' + esc(m.note || '') + '"></td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div><div class="card" id="esgLive">' + live('material') + '</div></div></div>';
  }
  function live(t) { if (t === 'material') return '<h3>Matrix</h3>' + matrix() + '<p class="muted" style="font-size:12.5px">Topics in the shaded corner are material on both counts and lead the report.</p>'; if (t === 'avoid') return avoidSummary(); if (t === 'credits') return creditsSummary(); if (t === 'pricing') return pricingSummary() + (((V.subs || {}).pricing || 'cbam') === 'cbam' ? CBAM_DATES : ''); return ''; }
  var CBAM_DATES = '<div class="esg-gaps esg-rule"><b>Key dates</b><ul><li><b>EU</b>: definitive regime from 1 Jan 2026; importers over 50 t a year need authorisation; certificate sales open 1 Feb 2027; first declaration and surrender for 2026 imports by 30 Sep 2027.</li><li>Default values carry a mark-up (10% in 2026, rising); verified actual data from the producer usually costs less.</li><li><b>UK</b>: starts 1 Jan 2027; return and payment for 2027 due 31 May 2028, then quarterly.</li></ul>';

  /* ---------- 🌱 carbon avoidance ---------- */
  function avoidSummary() {
    var a = V.calc.avoid, cats = Object.keys(a.byCat);
    return '<h3>Avoided emissions</h3><div class="esg-big"><b>' + nf(a.total) + '</b><span>tCO2e avoided in the year</span></div>' + meter([['Delivered', Math.round(a.delivered), Math.max(1, Math.round(a.total))], ['Third-party verified', Math.round(a.verified), Math.max(1, Math.round(a.total))]]) +
      (cats.length ? '<h4 style="margin:12px 0 6px">By kind of solution</h4>' + bars(cats.map(function (k) { return [k, a.byCat[k]]; }), 't') : '') +
      '<div class="esg-gaps esg-rule"><b>How it is reported</b><ul><li>Avoided emissions sit <b>beside</b> the Scope 1, 2 and 3 inventory and are never subtracted from it (WBCSD Guidance on Avoided Emissions, GHG Protocol).</li><li>Each result = quantity × (baseline factor − solution factor) × the share attributed to you.</li><li>Your footprint this year: <b>' + tco(V.calc.em.total) + '</b>.</li></ul></div>';
  }
  // a compact list: one line per item, and only the item being edited opens (so a long register never runs on for screens)
  V.open = V.open || {};
  function rowList(key, L, head, line, editor, empty) {
    if (!L.length) return '<div class="card empty" style="padding:24px">' + empty + '</div>';
    return '<div class="card esg-list"><div class="esg-lh">' + head + '</div>' + L.map(function (x, i) { var on = V.open[key] === x.id || (!V.open[key] && false);
      return '<div class="esg-li' + (on ? ' on' : '') + '" data-li="' + key + '" data-i="' + i + '"><button type="button" class="esg-lr" data-open="' + key + '" data-id="' + esc(x.id || '') + '" aria-expanded="' + on + '">' + line(x, i) + '<i class="esg-chev" aria-hidden="true">›</i></button>' +
        (on ? '<div class="esg-ed">' + editor(x, i) + '</div>' : '') + '</div>'; }).join('') + '</div>';
  }
  var opts = function (A, v) { return A.map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join(''); };
  var inp = function (attr, k, v, extra) { return '<input ' + attr + '="' + k + '" value="' + esc(v == null ? '' : v) + '"' + (extra || '') + '>'; };
  var numIn = function (attr, k, v, unit) { return '<span class="esg-in"><input type="number" step="any" ' + attr + '="' + k + '" value="' + esc(v == null ? '' : v) + '">' + (unit ? '<i>' + esc(unit) + '</i>' : '') + '</span>'; };
  function avoidTab() {
    var L = V.e.avoid || [], calcs = {}; (V.calc.avoid.items || []).forEach(function (x) { calcs[x.id] = x.t; });
    var head = '<span>Project or solution</span><span>Kind</span><span>Status</span><span class="r">tCO2e</span><span></span>';
    var line = function (x) { return '<span class="n">' + esc(x.name || 'Untitled') + '</span><span class="muted">' + esc(x.cat || '') + '</span><span><span class="pill' + (x.status === 'Delivered' ? ' t-green' : '') + '">' + esc(x.status || '') + '</span>' + (x.verify === 'Third-party verified' ? ' <span class="pill t-green">Verified</span>' : '') + '</span><span class="r"><b>' + (calcs[x.id] != null ? nf(calcs[x.id], 1) : '–') + '</b></span>'; };
    var ed = function (x, i) { return '<div class="esg-form esg-form-4" data-avi="' + i + '"><label class="full">Name' + inp('data-av', 'name', x.name, ' maxlength="120"') + '</label><label>Kind<select data-av="cat">' + opts(SC.avoidCats, x.cat) + '</select></label><label>Status<select data-av="status">' + opts(SC.avoidStatus, x.status) + '</select></label><label>Verification<select data-av="verify">' + opts(SC.avoidVerify, x.verify) + '</select></label><label>SDG' + inp('data-av', 'sdg', x.sdg, ' maxlength="60" placeholder="e.g. SDG 7"') + '</label>' +
      '<label class="full">Baseline: what would have happened without it' + inp('data-av', 'baseline', x.baseline, ' maxlength="240"') + '</label>' +
      '<label>Quantity' + numIn('data-av', 'qty', x.qty) + '</label><label>Unit' + inp('data-av', 'unit', x.unit, ' maxlength="30" placeholder="MWh, km, t…"') + '</label><label>Baseline factor' + numIn('data-av', 'base', x.base, 'kgCO2e/unit') + '</label><label>Solution factor' + numIn('data-av', 'sol', x.sol, 'kgCO2e/unit') + '</label>' +
      '<label>Attributed to you' + numIn('data-av', 'attr', x.attr == null ? 100 : x.attr, '%') + '</label><label class="full">Notes' + inp('data-av', 'note', x.note, ' maxlength="400"') + '</label></div><div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn btn-sm" type="button" data-avdel="' + i + '">🗑 Remove</button></div>'; };
    return '<div class="esg-split"><div><div class="card"><div class="row"><h3 style="margin:0">Avoided emissions</h3><span class="sp"></span><select id="avTpl" aria-label="Add from a template"><option value="">＋ Add from a template…</option>' + SC.avoidTemplates.map(function (t, i) { return '<option value="' + i + '">' + esc(t.name) + '</option>'; }).join('') + '</select><button class="btn btn-sm btn-gold" type="button" id="avAdd">＋ Add</button></div>' +
      '<p class="muted" style="font-size:13px;margin:8px 0 0">Emissions your projects, products and services avoid compared with what would have happened otherwise. Claim only the share that is yours. Press a line to edit it.</p></div>' +
      rowList('avoid', L, head, line, ed, 'No avoided emissions recorded yet. Add one, or start from a template.') + '</div><div><div class="card" id="esgLive">' + avoidSummary() + '</div></div></div>';
  }
  /* ---------- 🎫 carbon credits: the register, with integrity checks (ICVCM CCP, corresponding adjustments) and how each is used ---------- */
  function creditsSummary() {
    var a = V.calc.avoid, P = V.calc.price, uses = Object.keys(P.byUse || {});
    return '<h3>Carbon credits</h3><div class="esg-big"><b>' + nf(a.credits) + '</b><span>tCO2e of credits retired</span></div>' + meter([['High quality', P.highQualityPct || 0, 100]]) + kvHtml([['Of which removals', tco(a.removals)], ['Avoidance credits', tco(a.credits - a.removals)], ['Your gross footprint', tco(V.calc.em.total)]]) +
      (uses.length ? '<h4 style="margin:12px 0 6px">How they are used</h4>' + bars(uses.map(function (k) { return [k, P.byUse[k]]; }), 't') : '') +
      '<div class="esg-gaps esg-rule"><b>Claiming credits</b><ul><li>Report gross emissions first; credits sit beside them (GHG Protocol, IFRS S2 §36(e), ESRS E1-7).</li><li><b>Quality</b>: prefer credits with the ICVCM CCP label; for compliance or a national claim, a corresponding adjustment.</li><li><b>Claims</b>: SBTi V2 treats credits as an ongoing emissions responsibility, never a substitute for cuts; only <b>removals</b> neutralise residual emissions at net zero. VCMI sets the claim tiers; ISO 14068-1 sets carbon-neutral claims.</li><li>Compliance use: Singapore up to 5% of taxable emissions (eligible ICCs); Japan GX-ETS up to 10% (J-Credits, JCM); Australia Safeguard (ACCUs, SMCs).</li></ul></div>';
  }
  function creditsTab() {
    var L = V.e.credits || [], Q = {}; (V.calc.price.credits || []).forEach(function (x) { Q[x.id] = x; });
    var head = '<span>Project</span><span>Type · standard</span><span>Use</span><span class="r">tCO2e</span><span></span>';
    var line = function (x) { var q = Q[x.id] || { flags: [] }; return '<span class="n">' + esc(x.project || 'Untitled') + '<small class="muted">' + esc([x.registry, x.vintage].filter(Boolean).join(' · ')) + '</small></span><span class="muted">' + esc(x.type || '') + (x.std ? '<small>' + esc(x.std) + '</small>' : '') + '</span><span>' + esc(x.use || '') + '<small>' + (q.flags.length ? '<span class="t-amber">⚠ ' + esc(q.flags[0]) + (q.flags.length > 1 ? ' +' + (q.flags.length - 1) : '') + '</span>' : '<span class="t-green">✓ Checks passed</span>') + '</small></span><span class="r"><b>' + nf(x.t) + '</b></span>'; };
    var ed = function (x, i) { var q = Q[x.id] || { flags: [] }; return '<div class="esg-form esg-form-4" data-cri="' + i + '"><label class="full">Project' + inp('data-cr', 'project', x.project, ' maxlength="140"') + '</label>' +
      '<label>Type<select data-cr="type">' + opts(SC.creditTypes, x.type) + '</select></label><label>Standard<select data-cr="std"><option value="">–</option>' + opts(SC.creditStds, x.std) + '</select></label><label>Registry' + inp('data-cr', 'registry', x.registry, ' maxlength="60" placeholder="Verra, ACCU register…"') + '</label><label>Vintage' + inp('data-cr', 'vintage', x.vintage, ' maxlength="10"') + '</label>' +
      '<label>Retired' + numIn('data-cr', 't', x.t, 'tCO2e') + '</label><label>Cost' + numIn('data-cr', 'cost', x.cost, (V.e.org || {}).currency || '') + '</label><label>ICVCM CCP label<select data-cr="ccp">' + opts(['Unknown', 'Yes', 'No'], x.ccp) + '</select></label><label>Corresponding adjustment<select data-cr="ca">' + opts(['Unknown', 'Yes', 'No', 'Not needed'], x.ca) + '</select></label>' +
      '<label class="full">Use and claim<select data-cr="use">' + opts(SC.creditUses, x.use) + '</select></label><label class="full">Purpose' + inp('data-cr', 'purpose', x.purpose, ' maxlength="200"') + '</label></div>' +
      (q.flags.length ? '<div class="esg-gaps"><b>Integrity checks</b><ul>' + q.flags.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul></div>' : '<div class="esg-gaps esg-rule"><b>✓ Integrity checks passed</b></div>') +
      '<div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn btn-sm" type="button" data-crdel="' + i + '">🗑 Remove</button></div>'; };
    return '<div class="esg-split"><div><div class="card"><div class="row"><h3 style="margin:0">Carbon credits retired</h3><span class="sp"></span><button class="btn btn-sm btn-gold" type="button" id="crAdd">＋ Add credits</button></div><p class="muted" style="font-size:13px;margin:8px 0 0">The credits retired for this reporting year, kept apart from the emissions inventory, each checked for quality and for how it may be claimed. Press a line to edit it.</p></div>' +
      rowList('credits', L, head, line, ed, 'No credits recorded for this year.') + '</div><div><div class="card" id="esgLive">' + creditsSummary() + '</div></div></div>';
  }
  /* ---------- 💱 pricing and CBAM: sub-tabs for border adjustments, carbon prices and the frameworks ---------- */
  var SUBS = [['cbam', 'Border adjustments (CBAM)'], ['prices', 'Carbon prices & taxes'], ['frame', 'Frameworks']];
  function pricingTab() {
    var sub = (V.subs || {}).pricing || 'cbam';
    return subBar(SUBS, sub, 'Carbon pricing') +
      (sub === 'prices' ? pricesSub() : sub === 'frame' ? frameSub() : cbamSub());
  }
  function subBar(SUBS, sub, label) {
    return '<div class="esg-sub" role="tablist" aria-label="' + esc(label) + '">' + SUBS.map(function (x) { return '<button type="button" role="tab" class="' + (sub === x[0] ? 'on' : '') + '" aria-selected="' + (sub === x[0]) + '" data-sub="' + x[0] + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>';
  }
  function pricingSummary() {
    var P = V.calc.price, f = function (n, c) { return n == null ? '–' : (c === 'EUR' ? '€' : c === 'GBP' ? '£' : '') + nf(n) + (c && c !== 'EUR' && c !== 'GBP' ? ' ' + c : ''); };
    return '<h3>Carbon cost exposure</h3>' + kvHtml([['EU CBAM (' + P.cbamYear + ', CBAM factor ' + P.cbamFactor + '%)', f(P.cbamEU, 'EUR')], ['UK CBAM', f(P.cbamUK, 'GBP')], ['Embedded emissions in CBAM goods', nf(P.cbamEmb) + ' tCO2e'],
      ['Carbon taxes and ETS', P.exp.length ? P.exp.map(function (x) { return f(x.cost, x.cur); }).join(' + ') : '–'], ['Internal carbon price', P.icp != null ? nf(P.icp) + ' per tCO2e · shadow cost ' + f(P.shadow) : 'Not set (Climate risk tab)']]);
  }
  function cbamSub() {
    var P = V.calc.price, pr = V.e.pricing || {}, C = {}; (P.cbam || []).forEach(function (x) { C[x.id] = x; });
    var head = '<span>Goods</span><span>Market · CN code</span><span>Tonnes</span><span class="r">Est. cost</span><span></span>';
    var line = function (x) { var c = C[x.id] || {}; return '<span class="n">' + esc(x.good) + '<small class="muted">' + esc(x.dest || '') + '</small></span><span>' + esc(x.market) + ' CBAM' + (x.cn ? ' · ' + esc(x.cn) : '') + '<small class="muted">' + esc(x.sv || '') + '</small></span><span>' + nf(x.tonnes) + ' t<small class="muted">' + (c.emb != null ? nf(c.emb) + ' tCO2e embedded' : '') + '</small></span><span class="r"><b>' + (c.cost != null ? (c.cur === 'GBP' ? '£' : '€') + nf(c.cost) : '–') + '</b></span>'; };
    var ed = function (x, i) { var c = C[x.id] || {}; return '<div class="esg-form esg-form-4" data-cbi="' + i + '"><label>Market<select data-cb="market">' + opts(['EU', 'UK'], x.market) + '</select></label><label>Goods<select data-cb="good">' + opts(SC.cbamGoods, x.good) + '</select></label><label>CN code' + inp('data-cb', 'cn', x.cn, ' maxlength="20" placeholder="e.g. 7308"') + '</label><label>Emissions data<select data-cb="sv">' + opts(['Default values', 'Actual (verified)'], x.sv) + '</select></label>' +
      '<label class="full">What and where' + inp('data-cb', 'dest', x.dest, ' maxlength="80" placeholder="e.g. steel racking to Rotterdam"') + '</label>' +
      '<label>Quantity' + numIn('data-cb', 'tonnes', x.tonnes, 't') + '</label><label>Specific embedded emissions' + numIn('data-cb', 'see', x.see, 'tCO2e/t') + '</label><label>CBAM benchmark' + numIn('data-cb', 'bench', x.bench, 'tCO2e/t') + '</label><label>Carbon price paid at origin' + numIn('data-cb', 'paid', x.paid, x.market === 'UK' ? '£/t' : '€/t') + '</label></div>' +
      '<p class="muted" style="font-size:12px;margin:6px 0 0">' + (x.market === 'EU' ? 'Certificates = embedded emissions − benchmark × tonnes × the free allocation still given (' + (100 - P.cbamFactor) + '% in ' + P.cbamYear + '). Leave the benchmark blank to see the gross figure.' : 'UK CBAM taxes the embodied direct emissions at the published UK CBAM rate.') + (c.cost != null ? ' Estimate: <b>' + (c.cur === 'GBP' ? '£' : '€') + nf(c.cost) + '</b> on ' + nf(c.liable) + ' tCO2e.' : '') + '</p>' +
      '<div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn btn-sm" type="button" data-cbdel="' + i + '">🗑 Remove</button></div>'; };
    return '<div class="esg-split"><div><div class="card"><div class="row"><h3 style="margin:0">Goods covered by a border adjustment</h3><span class="sp"></span><button class="btn btn-sm btn-gold" type="button" id="cbAdd">＋ Add goods</button></div>' +
      '<p class="muted" style="font-size:13px;margin:8px 0 10px">Iron and steel, aluminium, cement, fertilisers, hydrogen (and electricity, EU only) that you export to or import into the EU or the UK, or handle as a customs representative. The price is your assumption: the EU price follows EU ETS auctions, the UK rate is published quarterly.</p>' +
      '<div class="esg-form esg-form-4"><label>EU certificate price' + numIn('data-pv', 'euaPrice', pr.euaPrice, '€/tCO2e') + '</label><label>UK CBAM rate' + numIn('data-pv', 'ukRate', pr.ukRate, '£/tCO2e') + '</label><label style="grid-column:span 2">EU CBAM factor<span class="esg-fixed">' + P.cbamFactor + '% in ' + P.cbamYear + ' (2.5% 2026 → 100% 2034)</span></label></div></div>' +
      rowList('cbam', pr.cbam || [], head, line, ed, 'No CBAM goods recorded. Add the goods you ship to or bring into the EU or the UK.') + '</div>' +
      '<div><div class="card" id="esgLive">' + live('pricing') + '</div></div></div>';
  }
  function pricesSub() {
    var P = V.calc.price, pr = V.e.pricing || {}, prices = SC.schemes.filter(function (x) { return x.kind === 'Carbon price'; }), E2 = {}; (P.exp || []).forEach(function (x) { E2[x.id] = x; });
    var head = '<span>Facility or entity</span><span>Scheme</span><span>Liable tCO2e</span><span class="r">Est. cost</span><span></span>';
    var nm = function (id) { return ((SC.schemes.filter(function (s) { return s.id === id; })[0]) || {}).name || 'Choose a scheme'; };
    var line = function (x) { var c = E2[x.id] || {}; return '<span class="n">' + esc(x.site || 'Untitled') + '</span><span class="muted">' + esc(nm(x.scheme)) + '</span><span>' + nf(c.liable) + '</span><span class="r"><b>' + (c.cost != null ? nf(c.cost) + ' ' + esc(x.cur) : '–') + '</b></span>'; };
    var ed = function (x, i) { return '<div class="esg-form esg-form-4" data-exi="' + i + '"><label class="full">Facility or entity' + inp('data-ex', 'site', x.site, ' maxlength="120"') + '</label><label style="grid-column:span 2">Scheme<select data-ex="scheme"><option value="">Choose…</option>' + prices.map(function (s) { return '<option value="' + s.id + '"' + (s.id === x.scheme ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></label>' +
      '<label>Covered emissions' + numIn('data-ex', 'covered', x.covered, 'tCO2e') + '</label><label>Baseline or free allowance' + numIn('data-ex', 'baseline', x.baseline, 'tCO2e') + '</label><label>Price' + numIn('data-ex', 'price', x.price, 'per tCO2e') + '</label><label>Currency' + inp('data-ex', 'cur', x.cur, ' maxlength="6"') + '</label><label>Met with credits' + numIn('data-ex', 'offsetPct', x.offsetPct, '%') + '</label>' +
      '<label class="full">Notes' + inp('data-ex', 'note', x.note, ' maxlength="300"') + '</label></div><div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn btn-sm" type="button" data-exdel="' + i + '">🗑 Remove</button></div>'; };
    return '<div class="esg-split"><div><div class="card"><div class="row"><h3 style="margin:0">Carbon taxes and emissions trading</h3><span class="sp"></span><button class="btn btn-sm btn-gold" type="button" id="exAdd">＋ Add</button></div>' +
      '<p class="muted" style="font-size:13px;margin:8px 0 0">Facilities covered by a carbon tax or an ETS, for example a Safeguard facility above its baseline, a Singapore facility over 25,000 t, or a GX-ETS company. The cost is the emissions above the baseline × the price, less the share met with eligible credits.</p></div>' +
      rowList('exp', pr.exp || [], head, line, ed, 'No facility is covered by a carbon tax or ETS yet.') + '</div><div><div class="card" id="esgLive">' + live('pricing') + '</div></div></div>';
  }
  function frameSub() {
    var on = (V.e.pricing || {}).schemes || [], kinds = ['Border adjustment', 'Carbon price', 'Crediting', 'Integrity'];
    return '<div class="card"><h3 style="margin-top:0">Carbon pricing and credit frameworks</h3><p class="muted" style="font-size:13px;margin:0 0 6px">Tick the ones that apply to you; they shape the report\'s carbon pricing section and Champ\'s advice. Status as checked in November 2026: confirm the details before you report.</p>' +
      kinds.map(function (k) { return '<h4 class="esg-kh">' + esc(k === 'Border adjustment' ? 'Border adjustments' : k === 'Carbon price' ? 'Carbon taxes and emissions trading' : k === 'Crediting' ? 'Where credits come from' : 'Credit quality and claims') + '</h4><div class="esg-stds">' + SC.schemes.filter(function (x) { return x.kind === k; }).map(function (x) { var c = on.indexOf(x.id) >= 0;
        return '<label class="esg-stdc' + (c ? ' on' : '') + '"><input type="checkbox" data-sch="' + x.id + '"' + (c ? ' checked' : '') + '><div><b>' + esc(x.name) + '</b><div class="esg-std-m"><span class="pill">' + esc(x.region) + '</span><span class="pill t-green">' + esc(x.status) + '</span></div><small class="muted">' + esc(x.note) + '</small><small><b>Credits:</b> ' + esc(x.credits) + '</small></div></label>'; }).join('') + '</div>'; }).join('') + '</div>';
  }
  /* ---------- 📁 records: the registry, the documents written, every change ---------- */
  function recordsTab() {
    var e = V.e, c = V.calc;
    return '<div class="esg-split"><div class="card"><h3 style="margin-top:0">Registry</h3>' + kvHtml([['Scoring method', c.method], ['Factor set', c.em.setLabel + ' (indicative defaults; overrides kept with the data)'], ['Standards', (e.std || []).map(function (s) { return (SC.std[s] || {}).name || s; }).join('; ')], ['Created', when(e.created) + ' by ' + (e.by || '')], ['Last change', when(e.updated)], ['Version of the data', 'rev ' + e.rev]]) +
      '<p class="muted" style="font-size:12.5px">The design, the scoring rules, the standards list and the plan for the next versions are kept in the code base, in <b>docs/ESG-REGISTRY.md</b>.</p>' +
      '<h4>Documents written</h4>' + ((e.docs || []).length ? '<table class="tbl esg-tbl"><thead><tr><th>Document</th><th>Version</th><th>Written</th><th>By</th><th>Tokens</th></tr></thead><tbody>' + e.docs.map(function (d) { return '<tr><td>' + (d.kind === 'report' ? 'ESG report' : 'Sustainability statement') + (d.partial ? ' <span class="pill t-amber">' + esc(d.partial) + '</span>' : '') + '</td><td>v' + d.ver + '</td><td>' + esc(when(d.at)) + '</td><td>' + esc(d.by || '') + '</td><td>' + nf(d.tokens) + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">None yet.</p>') +
      '</div><div class="card"><h3 style="margin-top:0">Change log</h3>' + ((e.log || []).length ? '<ul class="esg-log">' + e.log.slice(0, 80).map(function (l) { return '<li><small class="muted">' + esc(when(l.at)) + ' · ' + esc(l.by || '') + '</small><div>' + esc(l.what) + '</div></li>'; }).join('') + '</ul>' : '<p class="muted">No changes yet.</p>') + '</div></div>';
  }

  /* ---------- 📄 the Sustainability Statement and the ESG Report ---------- */
  var THEME = 'forest';
  function docTab(kind) {
    var N = V.docs[kind], rep = kind === 'report', l = (window.ChampI18n && window.ChampI18n.get && window.ChampI18n.get()) || 'en', L = (window.ChampI18n && window.ChampI18n.langs) || [['en', 'English']], busy = V.ai[V.id + ':' + kind];
    var T = (M.studio && M.studio.themes && M.studio.themes()) || [];
    return '<div class="esg-split"><div class="card"><h3 style="margin-top:0">' + (rep ? '📘 ESG Report' : '📄 Sustainability Statement') + '</h3><p class="muted" style="font-size:13px">' +
      (rep ? 'A full report of about 60 pages in seven parts: introduction and strategy, governance, climate (IFRS S2 / AASB S2 / TCFD), environment, social, performance and roadmap, and reporting standards, with the data tables, charts, the avoided emissions, a content index for each standard you chose, a glossary and an approval page. ✨ Champ writes the narrative in seven parts at once (up to 100,000 tokens, about 3 to 6 minutes).'
        : 'A concise statement of under 10 pages: the leadership message, basis of preparation, governance, material topics, environment and climate, social, governance performance, avoided emissions, targets and outlook, and a short content index. ✨ Champ writes it in two parts (about 1 to 2 minutes).') + '</p>' +
      '<div class="form" style="margin-top:10px"><label>Language<select id="dLang" data-noi18n>' + L.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === l ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select></label>' +
      '<label>Colour scheme<select id="dTheme">' + T.map(function (t) { return '<option value="' + t.id + '"' + (t.id === THEME ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="row" style="gap:6px;margin-top:14px;flex-wrap:wrap"><button class="btn btn-gold" id="dAi" type="button"' + (busy ? ' disabled' : '') + '>' + (busy ? '✨ Writing…' : N ? '✨ Write it again' : '✨ Write with AI') + '</button><button class="btn" id="dPdf" type="button">⬇ PDF</button><button class="btn" id="dDocx" type="button">⬇ Word</button><span class="muted" id="dMsg" style="font-size:12.5px">' + (busy ? '<span class="ask-think">✨ Champ is writing…</span>' : '') + '</span></div>' +
      (N && N.rev != null && N.rev < V.e.rev ? '<div class="esg-stale" role="status">⚠ The data has changed since this narrative was written (data version ' + N.rev + ', now ' + V.e.rev + '). The figures, tables and charts use today\'s data, so the text may quote older numbers: <b>write it again</b> before you publish. The documents are marked until you do.</div>' : '') + '<div class="esg-dstate">' + (N ? '✓ Narrative v' + N.ver + ' written ' + esc(when(N.at)) + ' by ' + esc(N.by || '') + ' · ' + nf(N.tokens) + ' tokens' + (N.partial ? ' · <span class="t-amber">' + esc(N.partial) + '</span>' : '') + '. Write it again after you change the data.' : 'No narrative yet: the PDF and Word still work, with the data, charts and tables, and a note where the narrative goes.') + '</div></div>' +
      '<div class="card"><h3 style="margin-top:0">Inside</h3><ol class="esg-toc">' + (rep ? REPORT_TOC : STATEMENT_TOC).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div></div>';
  }
  var STATEMENT_TOC = ['Message from leadership', 'About this statement', 'Governance and strategy', 'Material topics', 'Contribution to the UN SDGs', 'Environment and climate', 'Social', 'Governance performance', 'Avoided emissions', 'Targets and outlook', 'Content index'];
  var REPORT_TOC = ['Part 1 Introduction and strategy: message from the CEO, about this report, our organisation, strategy, the 17 UN SDGs, stakeholders, materiality', 'Part 2 Governance: structure and oversight, ethics and integrity, risk management, cyber, privacy and tax',
    'Part 3 Climate: governance and strategy, risks and opportunities, scenarios and resilience, metrics, targets and transition plan', 'Part 4 Environment: GHG emissions, energy, water and waste, biodiversity and compliance, avoided emissions, carbon pricing, CBAM and carbon credits',
    'Part 5 Social: our people, health and safety, diversity and inclusion, human rights and Indigenous peoples, communities, suppliers and customers', 'Part 6 Performance and roadmap: governance performance, ESG scorecard, targets and roadmap, reporting standards, data quality and assurance',
    'Appendices: performance data, content index, glossary, forward-looking statements, approval'];
  function writeDoc(kind) {
    var id = V.id, ent = V.e, key = id + ':' + kind, lang = $('#dLang').value;
    V.ai[key] = true; body();
    var stop = function (e) { V.ai[key] = false; if (V.e === ent && V.tab === kind) body(); if (!e.shown) fail(e); };
    flush().then(function () { bg({ mode: 'esgDoc', esg: id, kind: kind, lang: lang }, function (r) { V.ai[key] = false; DOCS[id] = DOCS[id] || {}; DOCS[id][kind] = r;
      mergeMeta(ent).catch(function () {}).then(function () { DOCS[id][kind] = r; if (V.e === ent) { V.docs = DOCS[id]; if (V.tab === kind) body(); } toast((kind === 'report' ? 'ESG report' : 'Statement') + ' narrative written (' + nf(r.tokens) + ' tokens). Download the PDF or Word.'); }); }, stop); }, stop);
  }
  function makeDoc(kind, fmt) {
    var lang = $('#dLang').value, msg = $('#dMsg'), say = function (t) { if (msg) msg.innerHTML = t ? '<span class="ask-think">' + esc(t) + '</span>' : ''; };
    if (!M.studio) return fail(new Error('The document designer did not load. Reload the page.'));
    THEME = $('#dTheme').value || 'forest';
    var D = (kind === 'report' ? reportDoc : statementDoc)(V.docs[kind], lang, 0); D.theme = THEME;
    if (fmt === 'pdf' && M.studio.needsPrint(D)) { var win = window.open('', '_blank'); say('Laying out…'); return M.studio.print(D, win).then(function () { say(''); toast('Print view open: choose “Save as PDF”'); }).catch(function (e) { say(''); fail(e); }); }
    say(fmt === 'pdf' ? 'Designing the PDF…' : 'Designing the Word file…');
    var run = function (lim, D1) { return M.studio[fmt](D1).then(function (r) { if (fmt === 'pdf' && kind === 'statement' && r.pages > 10 && lim < 2) { var D2 = statementDoc(V.docs[kind], lang, lim + 1); D2.theme = THEME; return run(lim + 1, D2); } return r; }); };   // the statement stays under 10 pages
    run(0, D).then(function (r) { M.report.save(r.blob, r.name); say(''); toast((fmt === 'pdf' ? 'PDF' : 'Word') + ' ready' + (r.pages ? ': ' + r.pages + ' pages' : '')); }).catch(function (e) { say(''); fail(e); });
  }
  // shared pieces for both documents
  function F() {
    var e = V.e, c = V.calc, o = e.org || {}, em = c.em, w = e.workforce || {}, b = e.board || {}, t = e.ethics || {};
    var fac = function (k, setK) { var v = (e.carbon || {})[k]; return v != null ? v : (SC.factorSets[(e.carbon || {}).fset] || SC.factorSets.IPCC)[setK]; };
    var ghg = [['Scope 1', 'Diesel', (e.carbon || {}).diesel, 'L', fac('fDiesel', 'diesel'), em.s1.diesel], ['Scope 1', 'Petrol', (e.carbon || {}).petrol, 'L', fac('fPetrol', 'petrol'), em.s1.petrol], ['Scope 1', 'Jet fuel', (e.carbon || {}).jet, 'L', fac('fJet', 'jet'), em.s1.jet], ['Scope 1', 'LPG', (e.carbon || {}).lpg, 'L', fac('fLpg', 'lpg'), em.s1.lpg],
      ['Scope 1', 'Natural gas', (e.carbon || {}).gas, 'GJ', fac('fGas', 'gas'), em.s1.gas], ['Scope 1', 'Refrigerants', (e.carbon || {}).refrig, 'kg', (e.carbon || {}).refGwp || 1924, em.s1.refrig], ['Scope 2', 'Electricity (location based)', (e.carbon || {}).elec, 'MWh', fac('fElec', 'elec') * 1000, em.s2loc]].filter(function (r) { return r[5] != null; })
      .map(function (r) { return [r[0], { t: r[1], b: true }, { t: nf(r[2], 1), right: true }, r[3], { t: nf(r[4], 4), right: true }, { t: nf(r[5], 1), right: true }]; });
    if (ghg.length) ghg.push([{ t: 'Total Scope 1 and 2', total: true }, '', '', '', '', { t: nf((em.s1t || 0) + (em.s2loc || 0), 1), total: true, right: true }]);
    var S3N = { purch: 'Cat 1 Purchased goods and services', freight: 'Cat 4 Freight', landfill: 'Cat 5 Waste to landfill', recycled: 'Cat 5 Waste recycled', air: 'Cat 6 Flights', car: 'Cat 6 Car travel', hotel: 'Cat 6 Hotel nights', commute: 'Cat 7 Employee commuting', water: 'Water supply and treatment' };
    var s3 = Object.keys(S3N).filter(function (k) { return em.s3[k] != null; }).map(function (k) { return [S3N[k], { t: nf(em.s3[k], 1), right: true }]; });
    var people = [['Total workforce (FTE)', nf(w.fte)], ['Women in the workforce', c.soc.womenPct != null ? c.soc.womenPct + '%' : '–'], ['Women in management', c.soc.womenMgmtPct != null ? c.soc.womenMgmtPct + '%' : '–'], ['Under 18 / 18-40 / 41-55 / over 55', [w.under18, w.a18, w.a41, w.a55].map(function (x) { return x == null ? '–' : nf(x); }).join(' / ')],
      ['New hires / leavers', nf(w.hires) + ' / ' + nf(w.leavers)], ['Turnover', w.fte && w.leavers != null ? nf(w.leavers / w.fte * 100, 1) + '%' : '–'], ['Recordable injuries / fatalities', nf(w.injuries) + ' / ' + nf(w.deaths)], ['LTIFR', w.ltifr != null ? String(w.ltifr) : '–'], ['Safety training', w.safetyTrain != null ? w.safetyTrain + '%' : '–'], ['Training hours per employee', w.trainHrs != null ? String(w.trainHrs) : '–'], ['Gender pay gap', w.payGap != null ? w.payGap + '%' : '–'], ['Collective agreements', w.bargain != null ? w.bargain + '%' : '–']];
    var gov = [['Board size', nf(b.boardSize)], ['Women on the board', c.gov.boardWomenPct != null ? c.gov.boardWomenPct + '%' : '–'], ['Independent directors', b.indepPct != null ? b.indepPct + '%' : '–'], ['Sustainability committee', b.susCommittee || '–'], ['Independent director on it', b.indepSus || '–'], ['Code of conduct', t.code || '–'], ['Whistleblower policy', t.gWhistle || '–'], ['Anti-corruption policy', t.antiCorrupt || '–'], ['Confirmed corruption incidents', nf(t.corruptCases)], ['ESG in enterprise risk management', t.erm || '–'], ['Data breaches', nf(t.breaches)], ['GRI 2 alignment index', c.gov.gri + '%']];
    var idx = []; (e.std || []).forEach(function (s) { (V.cover[s] || []).forEach(function (d) { idx.push([stdShort(s), d.ref, d.title, { t: d.status, rag: d.status === 'Reported' ? 'G' : d.status === 'Partly' ? 'A' : 'R', center: true }]); }); });
    var av = c.avoid, avRows = (av.items || []).map(function (x) { return [{ t: x.name, b: true }, x.cat, x.baseline || '', x.attr + '%', x.status, x.verify, { t: x.t == null ? '–' : nf(x.t, 1), right: true }]; });
    var mat = SC.topics.filter(function (tp) { return (e.mat || {})[tp[0]]; }).map(function (tp) { var m = e.mat[tp[0]], R = ['–', 'Low', 'Medium', 'High', 'Very high']; return { tp: tp, m: m, s: m.imp + m.fin }; }).sort(function (a, z) { return z.s - a.s; });
    return { e: e, c: c, o: o, em: em, ghg: ghg, s3: s3, people: people, gov: gov, idx: idx, av: av, avRows: avRows, mat: mat, std: (e.std || []).map(function (s) { return (SC.std[s] || {}).name || s; }) };
  }
  var stale = function (N) { return N && N.rev != null && V.e && N.rev < V.e.rev ? ' · DRAFT: narrative older than the data' : ''; };
  var dt = function (s) { try { return s ? new Date(s + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : ''; } catch (x) { return s; } };
  var RT = ['–', 'Low', 'Medium', 'High', 'Very high'];
  function list(L) { return (L || []).map(function (x) { return '- ' + (typeof x === 'string' ? x : Object.values(x).join(': ')); }).join('\n'); }
  // 🇺🇳 the 17 SDGs: the AI's view where it wrote one, and always the reported figure that tracks each goal
  function sdgRows(X, S) {
    var e = X.e, c = X.c, em = X.em, w = e.workforce || {}, r = e.resources || {}, t = e.ethics || {}, cm = e.community || {}, f = function (v, u) { return v == null || v === '' ? '' : nf(v, v < 100 ? 1 : 0) + (u || ''); };
    var M = { 3: [f(w.ltifr) && 'LTIFR ' + f(w.ltifr), w.deaths != null && (nf(w.deaths) + (Number(w.deaths) === 1 ? ' fatality' : ' fatalities'))], 4: [f(w.trainHrs) && f(w.trainHrs) + ' training hours per employee'], 5: [c.soc.womenPct != null && c.soc.womenPct + '% women', c.soc.womenMgmtPct != null && c.soc.womenMgmtPct + '% women in management', w.payGap != null && w.payGap + '% gender pay gap'],
      6: [f(r.waterWd) && f(r.waterWd) + ' m3 water withdrawn'], 7: [r.renewPct != null && r.renewPct + '% renewable energy', em.energy != null && nf(em.energy) + ' MWh energy'], 8: [f(w.fte) && f(w.fte) + ' FTE', w.fte && w.leavers != null && nf(w.leavers / w.fte * 100, 1) + '% turnover'],
      10: [w.payGap != null && w.payGap + '% pay gap'], 11: [f(cm.invest) && 'community investment ' + f(cm.invest)], 12: [r.divertPct != null && r.divertPct + '% waste diverted', f(r.wasteT) && f(r.wasteT) + ' t waste'],
      13: [em.total != null && nf(em.total) + ' tCO2e footprint', c.avoid.total && nf(c.avoid.total) + ' tCO2e avoided'], 16: [t.corruptCases != null && pl(t.corruptCases, 'corruption incident'), t.code && 'code of conduct: ' + t.code], 17: [c.price.creditT && nf(c.price.creditT) + ' tCO2e of credits retired'] };
    var ai = {}; (S.sdgs || []).forEach(function (x) { var n = Number(String(x.sdg || '').replace(/^\D*(\d+).*$/, '$1')); if (n >= 1 && n <= 17) ai[n] = x; });
    (e.avoid || []).forEach(function (x) { var n = Number(String(x.sdg || '').replace(/^\D*(\d+).*$/, '$1')); if (n >= 1 && n <= 17) (M[n] = M[n] || []).push(x.name); });
    return (SC.sdgs || []).map(function (g, i) { var n = i + 1, a = ai[n] || {}, met = a.metric || (M[n] || []).filter(Boolean).join('; ');
      return { n: n, goal: 'SDG ' + n + ' ' + g, rel: a.relevance || '', text: a.contribution || '', metric: met }; });
  }
  function sdgTable(rows, nl, small) {
    var rg = function (v) { return /high/i.test(v) ? 'G' : /med/i.test(v) ? 'A' : undefined; };
    return { t: 'table', title: small ? null : 'The 17 Sustainable Development Goals', head: small ? ['Goal', 'Our contribution', 'Measure'] : ['Goal', 'Relevance', 'Our contribution', 'Measure'],
      rows: rows.map(function (x) { return small ? [{ t: x.goal, b: true }, x.text || '', x.metric || ''] : [{ t: x.goal, b: true }, { t: x.rel || '–', center: true, rag: rg(x.rel) }, x.text || '', x.metric || '']; }), widths: small ? [1.6, 3.2, 1.6] : [1.6, 0.8, 3.2, 1.5], size: 7.2, noTr: nl,
      note: 'The UN Sustainable Development Goals (2030 Agenda). Relevance and contribution are the organisation\'s own assessment; measures are the figures reported in this document.' };
  }
  function statementDoc(N, lang, lim) {
    var X = F(), S = (N && N.sections) || {}, nl = N && N.lang === lang, n = 0, today = new Date().toISOString().slice(0, 10);
    var T = function (text, fb) { var v = text || fb; return v ? { t: 'p', text: v, noTr: !!text && nl } : null; };
    var ch = function (title, kicker, blocks) { return { no: ++n, title: title, kicker: kicker, blocks: blocks.filter(Boolean) }; };
    var miss = 'Write the narrative with ✨ AI in the Statement tab, or type it in the Word file.';
    var C = [
      ch('Message from leadership', 'Our commitment', [T(S.leadership_message, miss)]),
      ch('About this statement', 'Basis of preparation', [T(S.basis_of_preparation), { t: 'kv', rows: [['Organisation', X.o.name || ''], ['Reporting period', X.o.from && X.o.to ? dt(X.o.from) + ' to ' + dt(X.o.to) : X.o.year || ''], ['Boundary', (X.o.boundary || '') + (X.o.entities ? ': ' + X.o.entities : '')], ['Standards', X.std.join('; ') || 'Not chosen yet'], ['Assurance', X.o.assurance || 'None yet']] }]),
      ch('Governance and strategy', 'How we manage sustainability', [T(S.governance), T(S.strategy)]),
      ch('Material topics', 'What matters most', [T(S.materiality), (S.material_topics || []).length ? { t: 'table', head: ['Topic', 'Pillar', 'Why it matters'], rows: S.material_topics.map(function (x) { return [{ t: x.topic, b: true }, { t: x.pillar, center: true }, x.why]; }), widths: [2, 0.6, 4], noTr: nl }
        : X.mat.length ? { t: 'table', head: ['Topic', 'Impact', 'Financial'], rows: X.mat.slice(0, 10).map(function (m) { return [{ t: m.tp[1], b: true }, RT[m.m.imp], RT[m.m.fin]]; }), widths: [3, 1, 1] } : null]),
      (function () { var R0 = sdgRows(X, S), top = (S.sdgs || []).length ? R0.filter(function (x) { return x.text; }) : R0.filter(function (x) { return x.metric; }).slice(0, 6);
        return ch('Contribution to the UN Sustainable Development Goals', 'SDGs', [top.length ? sdgTable(top, nl, true) : T(null, 'No goal is linked to the data yet: write the narrative with ✨ AI, or add data.')]); })(),
      ch('Environment and climate', 'Planet', [{ t: 'stats', items: [{ v: nf(X.em.total), l: 'tCO2e total footprint' }, { v: nf(X.em.s1t), l: 'Scope 1' }, { v: nf(X.em.s2loc), l: 'Scope 2 (location)' }, { v: nf(X.em.s3t), l: 'Scope 3' }] }, T(S.environment),
        lim < 1 ? { t: 'chart', kind: 'bar', title: 'Emissions by scope (tCO2e)', data: { items: [['Scope 1', X.em.s1t], ['Scope 2', X.em.s2loc], ['Scope 3', X.em.s3t]].filter(function (x) { return x[1] != null; }).map(function (x) { return { l: x[0], v: x[1], t: nf(x[1]) }; }) }, maxH: 42 } : null, T(S.climate)]),
      ch('Social', 'People', [T(S.social), { t: 'table', head: ['Measure', 'This year'], rows: X.people.slice(0, lim < 2 ? 12 : 7), widths: [3, 2] }]),
      ch('Governance performance', 'Integrity', [T(S.governance_performance), lim < 2 ? { t: 'table', head: ['Measure', 'This year'], rows: X.gov, widths: [3, 2] } : null]),
      ch('Avoided emissions', 'Beyond our footprint', [T(S.avoided, X.av.total ? null : 'No avoided emissions recorded for this year.'), X.av.total ? { t: 'stats', items: [{ v: nf(X.av.total), l: 'tCO2e avoided' }, { v: nf(X.av.delivered), l: 'from delivered projects' }, { v: nf(X.av.credits), l: 'tCO2e of credits retired' }] } : null,
        { t: 'callout', title: 'Reported separately', text: 'Avoided emissions are reported beside the Scope 1, 2 and 3 inventory and are not subtracted from it, in line with the WBCSD Guidance on Avoided Emissions and the GHG Protocol.' }]),
      ch('Targets and outlook', 'Next', [(S.targets || []).length ? { t: 'table', head: ['Target', 'Baseline', 'Status'], rows: S.targets.map(function (x) { return [{ t: x.target, b: true }, x.baseline, { t: x.status, center: true, rag: /track|achieved/i.test(x.status) ? 'G' : /watch/i.test(x.status) ? 'A' : undefined }]; }), widths: [3, 2, 1], noTr: nl } : null, T(S.outlook)]),
      ch('Content index', 'Standards', [lim < 2 && X.idx.length ? { t: 'table', head: ['Standard', 'Reference', 'Disclosure', 'Status'], rows: X.idx, widths: [0.9, 1.1, 3.4, 0.9], size: 7 } : { t: 'table', head: ['Standard', 'Coverage'], rows: (X.e.std || []).map(function (s) { return [(SC.std[s] || {}).name || s, { t: (X.c.coverage[s] || 0) + '%', right: true }]; }), widths: [4, 1] }])
    ];
    return { lang: lang, flow: true, cover: 'band', kicker: 'Sustainability statement', title: X.o.name || 'Sustainability statement', subtitle: [X.o.year, X.o.industry].filter(Boolean).join(' · '), short: 'Sustainability statement',
      headRight: [(X.o.year || '') + (N ? ' · narrative v' + N.ver : '') + stale(N), 'Issued ' + dt(today)], footer: 'Sustainability statement · ' + (X.o.name || '').slice(0, 70),
      stats: [{ v: String(X.c.esg), l: 'ESG score' }, { v: nf(X.em.total), l: 'tCO2e footprint' }, { v: X.c.soc.womenPct != null ? X.c.soc.womenPct + '%' : '–', l: 'Women in workforce' }, { v: X.c.readiness + '%', l: 'Report readiness' }],
      chapters: C, fileBase: ((X.o.name || 'Organisation') + '-Sustainability-Statement-' + (X.o.year || '') + (lang && lang !== 'en' ? '-' + lang : '')).replace(/[^\w.-]+/g, '-') };
  }
  function reportDoc(N, lang) {
    var X = F(), S = (N && N.sections) || {}, nl = N && N.lang === lang, n = 0, today = new Date().toISOString().slice(0, 10), em = X.em, c = X.c;
    var T = function (text, fb) { var v = text || fb; return v ? { t: 'p', text: v, noTr: !!text && nl } : null; };
    var miss = 'This section is written by ✨ AI in the ESG report tab.';
    var ch = function (title, kicker, blocks, blurb) { return { no: ++n, title: title, kicker: kicker, blurb: blurb, blocks: blocks.filter(Boolean) }; };
    var part = function (no, title, blurb, list2) { return { divider: true, part: 'Part ' + no, partNo: no, title: title, blurb: blurb, list: list2 }; };
    var tbl = function (k, head, cols, widths, title) { var L = S[k] || []; return L.length ? { t: 'table', title: title, head: head, rows: L.map(function (x) { return cols.map(function (col, i) { var v = x[col] || ''; return i === 0 ? { t: v, b: true } : v; }); }), widths: widths, noTr: nl } : null; };
    var nn = function () { return ('0' + (n + 1)).slice(-2); };
    var D = { lang: lang, toc: true, kicker: 'ESG report', title: X.o.name || 'ESG report', short: 'ESG report', subtitle: (X.o.year ? X.o.year + ' · ' : '') + 'Environmental, social and governance report', coverNote: 'Prepared with GKH Project Champ · ' + dt(today),
      headRight: [(X.o.year || '') + (N ? ' · narrative v' + N.ver : '') + stale(N), X.o.reg || ''], footer: 'ESG report ' + (X.o.year || '') + ' · ' + (X.o.name || '').slice(0, 70),
      meta: [['Organisation', X.o.name || ''], ['Reporting period', X.o.from && X.o.to ? dt(X.o.from) + ' to ' + dt(X.o.to) : X.o.year || ''], ['Industry', X.o.industry || ''], ['Boundary', X.o.boundary || ''], ['Assurance', X.o.assurance || 'None yet'], ['Standards', (X.e.std || []).map(stdShort).join(', ')]],
      stats: [{ v: String(c.esg), l: 'ESG score out of 100' }, { v: nf(em.total), l: 'tCO2e footprint' }, { v: nf(c.avoid.total), l: 'tCO2e avoided' }, { v: c.readiness + '%', l: 'Report readiness' }], chapters: [],
      fileBase: ((X.o.name || 'Organisation') + '-ESG-Report-' + (X.o.year || '') + (lang && lang !== 'en' ? '-' + lang : '')).replace(/[^\w.-]+/g, '-') };
    var C = D.chapters;
    C.push(part(1, 'Introduction and strategy', 'Who we are, how this report is prepared, what matters most and where we are heading.', [['01', 'Message from the CEO'], ['02', 'About this report'], ['03', 'Our organisation'], ['04', 'Sustainability strategy'], ['05', 'Stakeholder engagement'], ['06', 'Materiality']]));
    C.push(ch('Message from the CEO', 'Leadership', [{ t: 'stats', items: D.stats }, T(S.ceo_message, miss)], 'Our year in sustainability'));
    C.push(ch('About this report', 'Basis of preparation', [T(S.about_report, miss), { t: 'kv', title: 'Reporting basis', rows: D.meta.concat([['Factor set', em.setLabel], ['Scoring method', c.method], ['Contact', X.o.contact || '']]) }], 'Period, boundary, standards and assurance'));
    C.push(ch('Our organisation', 'Profile', [T(S.organisation_profile, X.o.about || miss)], 'What we do and where'));
    C.push(ch('Sustainability strategy', 'Strategy', [T(S.strategy, miss)], 'Our pillars and priorities'));
    var SR = sdgRows(X, S), hi = SR.filter(function (x) { return /high/i.test(x.rel); });
    C.push(ch('UN Sustainable Development Goals', 'SDGs', [T(S.sdg_overview, miss), hi.length ? { t: 'cards', cols: 3, items: hi.slice(0, 6).map(function (x) { return { title: x.goal, text: x.text, tag: 'High relevance' }; }), noTr: nl } : null, sdgTable(SR, nl, false)], 'How we contribute to the 17 goals of the 2030 Agenda'));
    C.push(ch('Stakeholder engagement', 'Stakeholders', [T(S.stakeholder_engagement, miss), tbl('stakeholders', ['Stakeholder group', 'What they care about', 'How we engage', 'How often'], ['group', 'concerns', 'how_engaged', 'frequency'], [1.4, 2.4, 2.2, 1])], 'Who we listen to'));
    C.push(ch('Materiality', 'What matters', [T(S.materiality, miss), tbl('material_topics', ['Topic', 'Pillar', 'Impact', 'Financial', 'Why it matters'], ['topic', 'pillar', 'impact', 'financial', 'why'], [2, 0.6, 0.8, 0.8, 3.4]) || (X.mat.length ? { t: 'table', head: ['Topic', 'Pillar', 'Impact', 'Financial'], rows: X.mat.map(function (m) { return [{ t: m.tp[1], b: true }, m.tp[2], RT[m.m.imp], RT[m.m.fin]]; }), widths: [3, 0.6, 1, 1] } : null)], 'Double materiality: impact and financial'));
    C.push(part(2, 'Governance', 'How the organisation is directed and controlled, and how sustainability is overseen.', [['07', 'Governance of sustainability'], ['08', 'Ethics and integrity'], ['09', 'Risk management'], ['10', 'Cyber, privacy, tax and remuneration']]));
    C.push(ch('Governance of sustainability', 'Oversight', [T(S.governance_structure, miss), T(S.board_oversight), T(S.sustainability_committee), tbl('roles', ['Role', 'Responsibilities'], ['role', 'responsibilities'], [1.4, 4], 'Roles and responsibilities'), { t: 'table', title: 'Board and governance measures', head: ['Measure', 'This year'], rows: X.gov.slice(0, 5), widths: [3, 2] }], 'Board, committees and roles'));
    C.push(ch('Ethics and integrity', 'Conduct', [T(S.ethics_conduct, miss), T(S.anti_corruption), T(S.whistleblowing), tbl('policies', ['Policy', 'What it covers', 'Status'], ['policy', 'covers', 'status'], [1.8, 3.6, 1], 'Policies')], 'Code of conduct, anti-corruption and speaking up'));
    C.push(ch('Risk management', 'Risk', [T(S.risk_management, miss)], 'How sustainability and climate risks are managed'));
    C.push(ch('Cyber, privacy, tax and remuneration', 'Responsible business', [T(S.cyber_privacy, miss), T(S.tax_transparency), T(S.remuneration)], 'Protecting data, paying fair tax, rewarding performance'));
    C.push(part(3, 'Climate', 'Climate-related disclosures under IFRS S2, AASB S2 and the TCFD recommendations.', [['11', 'Climate governance and strategy'], ['12', 'Risks and opportunities'], ['13', 'Scenario analysis and resilience'], ['14', 'Metrics, targets and transition plan']]));
    C.push(ch('Climate governance and strategy', 'Climate', [T(S.climate_governance, miss), T(S.climate_strategy)], 'Who oversees climate, and how it shapes the strategy'));
    var cr = S.climate_risks || [], hv = { High: 4, Medium: 3, Low: 2 }, cells = {}; cr.forEach(function (x) { var k = (hv[x.likelihood] || 3) + 'x' + (hv[x.impact] || 3); cells[k] = (cells[k] || 0) + 1; });
    C.push(ch('Risks and opportunities', 'Climate', [cr.length ? { t: 'chart', kind: 'heat', title: 'Climate risk heat map (likelihood × impact)', data: { cells: cells }, maxH: 66 } : null,
      tbl('climate_risks', ['Risk', 'Type', 'Horizon', 'Likelihood', 'Impact', 'Response'], ['risk', 'type', 'horizon', 'likelihood', 'impact', 'response'], [2.4, 1.3, 0.8, 0.8, 0.8, 2.6], 'Climate-related risks'),
      tbl('opportunities', ['Opportunity', 'Horizon', 'Financial effect', 'Action'], ['opportunity', 'horizon', 'financial_effect', 'action'], [2.2, 0.8, 2, 2.4], 'Climate-related opportunities')], 'Physical and transition risks, and the opportunities'));
    C.push(ch('Scenario analysis and resilience', 'Climate', [T(S.scenario_analysis, miss), T(S.resilience), T(S.climate_risk_management)], 'How the business fares under different warming pathways'));
    C.push(ch('Metrics, targets and transition plan', 'Climate', [{ t: 'stats', items: [{ v: nf(em.s1t), l: 'Scope 1 tCO2e' }, { v: nf(em.s2loc), l: 'Scope 2 tCO2e' }, { v: nf(em.s3t), l: 'Scope 3 tCO2e' }, { v: em.intensity != null ? nf(em.intensity, 1) : '–', l: 'tCO2e per $M revenue' }] }, T(S.metrics_targets, miss), T(S.transition_plan),
      tbl('transition_actions', ['Action', 'Timing', 'Emissions effect', 'Status'], ['action', 'timing', 'emissions_effect', 'status'], [2.6, 1, 1.8, 0.9], 'Transition actions')], 'What we measure, what we aim for and how we get there'));
    C.push(part(4, 'Environment', 'Our environmental footprint and what we do about it.', [['15', 'Greenhouse gas emissions'], ['16', 'Energy'], ['17', 'Water and waste'], ['18', 'Biodiversity and compliance'], ['19', 'Avoided emissions and carbon credits']]));
    C.push(ch('Greenhouse gas emissions', 'Emissions', [T(S.ghg_methodology, miss), { t: 'chart', kind: 'bar', title: 'Emissions by scope (tCO2e)', data: { items: [['Scope 1', em.s1t], ['Scope 2 (location)', em.s2loc], ['Scope 2 (market)', em.s2mkt], ['Scope 3', em.s3t]].filter(function (x) { return x[1] != null; }).map(function (x) { return { l: x[0], v: x[1], t: nf(x[1]) }; }) }, maxH: 52 },
      X.ghg.length ? { t: 'table', title: 'Scope 1 and 2 inventory', head: ['Scope', 'Source', 'Activity', 'Unit', 'Factor (kgCO2e/unit)', 'tCO2e'], rows: X.ghg, widths: [0.8, 2, 1.2, 0.6, 1.3, 1] } : null, T(S.emissions_performance),
      X.s3.length ? { t: 'chart', kind: 'donut', title: 'Scope 3 by category', data: { items: Object.keys(em.s3).filter(function (k) { return em.s3[k]; }).map(function (k) { return { l: ({ purch: 'Purchased goods', freight: 'Freight', landfill: 'Landfill', recycled: 'Recycling', air: 'Flights', car: 'Car travel', hotel: 'Hotels', commute: 'Commuting', water: 'Water' })[k] || k, v: em.s3[k], t: nf(em.s3[k]) }; }), center: nf(em.s3t), centerLabel: 'tCO2e' }, maxH: 64 } : null,
      X.s3.length ? { t: 'table', title: 'Scope 3 by category', head: ['Category', 'tCO2e'], rows: X.s3, widths: [4, 1] } : null, T(S.scope3)], 'Scope 1, 2 and 3, the method and the trend'));
    var rs = X.e.resources || {};
    C.push(ch('Energy', 'Energy', [{ t: 'stats', items: [{ v: em.energy != null ? nf(em.energy) : '–', l: 'MWh of energy used' }, { v: rs.renewPct != null ? rs.renewPct + '%' : '–', l: 'Renewable share' }, { v: nf((X.e.carbon || {}).elec), l: 'MWh of electricity' }] }, T(S.energy, miss)], 'How much energy we use, and how clean it is'));
    C.push(ch('Water and waste', 'Resources', [{ t: 'stats', items: [{ v: rs.waterWd != null ? nf(rs.waterWd) : '–', l: 'm3 of water withdrawn' }, { v: rs.wasteT != null ? nf(rs.wasteT) : '–', l: 'tonnes of waste' }, { v: rs.divertPct != null ? rs.divertPct + '%' : '–', l: 'Diverted from landfill' }] }, T(S.water, miss), T(S.waste)], 'Water use and circularity'));
    C.push(ch('Biodiversity and compliance', 'Nature', [T(S.biodiversity, miss), T(S.environmental_compliance), tbl('env_initiatives', ['Initiative', 'Outcome', 'Next'], ['initiative', 'outcome', 'next'], [2, 2.6, 2], 'Environmental initiatives')], 'Nature, compliance and initiatives'));
    C.push(ch('Avoided emissions and carbon credits', 'Beyond our footprint', [{ t: 'stats', items: [{ v: nf(c.avoid.total), l: 'tCO2e avoided' }, { v: nf(c.avoid.delivered), l: 'from delivered projects' }, { v: nf(c.avoid.verified), l: 'third-party verified' }, { v: nf(c.avoid.credits), l: 'tCO2e of credits retired' }] }, T(S.avoided_emissions, c.avoid.total ? miss : 'No avoided emissions were recorded for this year.'),
      X.avRows.length ? { t: 'table', title: 'Avoided emissions register', head: ['Project or solution', 'Kind', 'Baseline', 'Share', 'Status', 'Verification', 'tCO2e'], rows: X.avRows, widths: [2, 1.6, 1.8, 0.6, 0.9, 1, 0.8], size: 7.4 } : null,
      { t: 'callout', title: 'How avoided emissions are reported', text: 'Avoided emissions are reported beside the Scope 1, 2 and 3 inventory and are **never subtracted from it**. Each result is the quantity times the difference between the baseline and the solution emission factors, times the share attributed to us (WBCSD Guidance on Avoided Emissions, 2023). Carbon credits are reported separately from gross emissions.' }], 'What our solutions avoid, reported separately'));
    var P = c.price, eur = function (n) { return n == null ? '–' : '€' + nf(n); }, gbp = function (n) { return n == null ? '–' : '£' + nf(n); }, sch = (P.schemes || []).map(function (id) { return SC.schemes.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
    C.push(ch('Carbon pricing, CBAM and carbon credits', 'Carbon markets', [{ t: 'stats', items: [{ v: eur(P.cbamEU), l: 'EU CBAM estimate (' + P.cbamYear + ')' }, { v: nf(P.cbamEmb), l: 'tCO2e embedded in CBAM goods' }, { v: P.icp != null ? nf(P.icp) : '–', l: 'internal carbon price per tCO2e' }, { v: nf(P.creditT), l: 'tCO2e of credits retired' }] },
      T(S.carbon_pricing, miss),
      sch.length ? { t: 'table', title: 'Carbon pricing and credit frameworks that apply', head: ['Framework', 'Kind', 'Status'], rows: sch.map(function (x) { return [{ t: x.name, b: true }, x.kind, x.status]; }), widths: [3, 1.2, 2.2] } : null,
      P.cbam.length ? { t: 'table', title: 'Goods under a carbon border adjustment', head: ['Market', 'Goods', 'CN', 'Tonnes', 'tCO2e/t', 'Embedded tCO2e', 'Data', 'Estimate'], rows: P.cbam.map(function (x) { return [x.market, { t: x.good, b: true }, x.cn || '', { t: nf(x.tonnes), right: true }, { t: nf(x.see, 2), right: true }, { t: nf(x.emb), right: true }, x.sv, { t: x.cur === 'GBP' ? gbp(x.cost) : eur(x.cost), right: true }]; }), widths: [0.6, 1.3, 0.6, 0.8, 0.7, 1, 1.1, 0.9], size: 7.4, note: 'EU estimate uses a certificate price of ' + eur(P.eua) + ' per tCO2e and the ' + P.cbamYear + ' CBAM factor of ' + P.cbamFactor + '%; UK at ' + gbp(P.uk) + '. Assumptions, not quotes.' } : null,
      P.exp.length ? { t: 'table', title: 'Carbon taxes and emissions trading', head: ['Facility', 'Scheme', 'Liable tCO2e', 'Price', 'Met with credits', 'Estimate'], rows: P.exp.map(function (x) { return [{ t: x.site, b: true }, ((SC.schemes.filter(function (s0) { return s0.id === x.scheme; })[0]) || {}).name || '', { t: nf(x.liable), right: true }, nf(x.price) + ' ' + x.cur, (x.offsetPct || 0) + '%', { t: nf(x.cost) + ' ' + x.cur, right: true }]; }), widths: [1.6, 2.2, 0.9, 0.9, 0.8, 1] } : null,
      P.credits.length ? { t: 'table', title: 'Carbon credits retired', head: ['Project', 'Type', 'Standard', 'Vintage', 'tCO2e', 'Use', 'Integrity'], rows: P.credits.map(function (x) { return [{ t: x.project, b: true }, x.type, x.std || x.registry || '', x.vintage, { t: nf(x.t), right: true }, x.use, { t: x.flags.length ? x.flags.length + ' to check' : 'Passed', rag: x.flags.length ? 'A' : 'G', center: true }]; }), widths: [1.8, 1.3, 1.1, 0.6, 0.6, 1.6, 0.8], size: 7.2 } : null,
      { t: 'callout', title: 'How credits are reported and claimed', text: 'Gross emissions are reported before any credits. Credits are kept in a separate register with their type, standard, vintage and use. Quality is checked against the ICVCM Core Carbon Principles and, for compliance or national claims, corresponding adjustments. Only removal credits can neutralise residual emissions at net zero (SBTi Corporate Net-Zero Standard V2.0).' }], 'Carbon taxes, border adjustments and the credits we hold'));
    C.push(part(5, 'Social', 'Our people, the communities we work in, and the people across our value chain.', [['20', 'Our people'], ['21', 'Health and safety'], ['22', 'Diversity, equity and inclusion'], ['23', 'Human rights and Indigenous peoples'], ['24', 'Communities, suppliers and customers']]));
    var w = X.e.workforce || {};
    C.push(ch('Our people', 'People', [T(S.people_strategy, miss), T(S.workforce_profile), [w.under18, w.a18, w.a41, w.a55].some(function (x) { return x != null; }) ? { t: 'chart', kind: 'donut', title: 'Age profile', data: { items: [['Under 18', w.under18], ['18 to 40', w.a18], ['41 to 55', w.a41], ['Over 55', w.a55]].filter(function (x) { return x[1]; }).map(function (x) { return { l: x[0], v: x[1], t: nf(x[1]) }; }), center: nf(w.fte), centerLabel: 'FTE' }, maxH: 60 } : null,
      { t: 'table', title: 'Workforce', head: ['Measure', 'This year'], rows: X.people, widths: [3, 2] }, T(S.training_development)], 'Who we are and how we grow'));
    C.push(ch('Health and safety', 'Safety', [{ t: 'stats', items: [{ v: nf(w.injuries), l: 'Recordable injuries' }, { v: nf(w.deaths), l: 'Fatalities' }, { v: w.ltifr != null ? String(w.ltifr) : '–', l: 'LTIFR' }, { v: w.safetyTrain != null ? w.safetyTrain + '%' : '–', l: 'Safety training' }] }, T(S.health_safety, miss)], 'Keeping everyone safe'));
    C.push(ch('Diversity, equity and inclusion', 'Inclusion', [{ t: 'stats', items: [{ v: c.soc.womenPct != null ? c.soc.womenPct + '%' : '–', l: 'Women in the workforce' }, { v: c.soc.womenMgmtPct != null ? c.soc.womenMgmtPct + '%' : '–', l: 'Women in management' }, { v: c.gov.boardWomenPct != null ? c.gov.boardWomenPct + '%' : '–', l: 'Women on the board' }, { v: w.payGap != null ? w.payGap + '%' : '–', l: 'Gender pay gap' }] }, T(S.dei, miss)], 'A workplace for everyone'));
    C.push(ch('Human rights and Indigenous peoples', 'Rights', [T(S.human_rights, miss), T(S.indigenous)], 'Labour standards, child labour, modern slavery and Indigenous peoples'));
    C.push(ch('Communities, suppliers and customers', 'Value chain', [T(S.community, miss), T(S.supply_chain), T(S.customers_data), tbl('social_initiatives', ['Initiative', 'Outcome', 'Next'], ['initiative', 'outcome', 'next'], [2, 2.6, 2], 'Social initiatives')], 'Beyond our walls'));
    C.push(part(6, 'Performance and roadmap', 'How we performed, where we are going and how this report is put together.', [['25', 'Governance performance'], ['26', 'ESG scorecard'], ['27', 'Targets and roadmap'], ['28', 'Reporting standards'], ['29', 'Data quality and assurance']]));
    C.push(ch('Governance performance', 'Governance', [T(S.governance_performance, miss), T(S.certifications), { t: 'table', head: ['Measure', 'This year'], rows: X.gov, widths: [3, 2] }], 'Board, ethics and systems in numbers'));
    C.push(ch('ESG scorecard', 'Scorecard', [{ t: 'chart', kind: 'bar', title: 'Scores out of 100', data: { items: [['Environment', c.env.score], ['Social', c.soc.score], ['Governance', c.gov.score], ['GRI 2 alignment', c.gov.gri], ['Report readiness', c.readiness]].map(function (x) { return { l: x[0], v: x[1], t: String(x[1]) }; }) }, maxH: 52 }, T(S.scorecard_commentary, miss),
      { t: 'table', title: 'What would raise the scores', head: ['Pillar', 'Next step'], rows: [['Environment', c.env.why], ['Social', c.soc.why], ['Governance', c.gov.why]].reduce(function (a, p) { return a.concat((p[1] || []).map(function (x) { return [{ t: p[0], b: true }, x]; })); }, []), widths: [1, 4], empty: 'No gaps flagged.' }], 'Environment, social and governance scores'));
    C.push(ch('Targets and roadmap', 'Roadmap', [tbl('targets', ['Pillar', 'Target', 'Baseline', 'Year', 'Status'], ['pillar', 'target', 'baseline', 'target_year', 'status'], [0.6, 3, 1.6, 0.7, 1]) || T(null, miss), tbl('roadmap', ['Year', 'Focus', 'Actions'], ['year', 'focus', 'actions'], [0.8, 1.6, 4], 'Three-year roadmap')], 'Where we are heading'));
    C.push(ch('Reporting standards', 'Standards', [T(S.standards_overview, miss), tbl('alignment', ['Standard', 'How we apply it', 'Gaps', 'Next steps'], ['standard', 'how_applied', 'gaps', 'next_steps'], [1.2, 3.4, 1.6, 1.6]), tbl('sasb_metrics', ['Industry metric', 'Value', 'Unit', 'Note'], ['metric', 'value', 'unit', 'note'], [2.4, 1, 0.8, 2.4], 'Industry (SASB) metrics')], 'How this report meets each framework'));
    C.push(ch('Data quality and assurance', 'Assurance', [T(S.data_quality, miss), T(S.assurance_readiness), { t: 'callout', title: 'Emission factors', text: 'Emissions are calculated with the ' + em.setLabel + ' factor set and any factors we entered ourselves. Default factors are indicative and are checked against the current official set before publication.' }, (function () { var src = X.e.efsrc || {}, rows = SC.fields.filter(function (f) { return /^(carbon\.f[A-Z]|carbon\.refGwp|scope3\.f[A-Z])/.test(f.id); }).map(function (f) { var sec = f.id.split('.')[0], k = f.id.split('.')[1], v = (X.e[sec] || {})[k], d = src[f.id];
      if (v == null && !d) return null; return [{ t: f.label.replace(/^Factor: /, ''), b: true }, { t: v == null ? '–' : String(v), right: true }, f.unit, d ? d.label : 'Default of the factor set']; }).filter(Boolean);
      return rows.length ? { t: 'table', title: 'Emission factors used', head: ['Factor', 'Value', 'Unit', 'Source'], rows: rows, widths: [1.4, 0.8, 1, 3], size: 7.4 } : null; })()], 'Data sources, controls and assurance'));
    C.push(ch('Appendix: content index', 'Appendix', [X.idx.length ? { t: 'table', head: ['Standard', 'Reference', 'Disclosure', 'Status'], rows: X.idx, widths: [0.9, 1.1, 3.4, 0.9], size: 7.2 } : T('Choose the standards in the Standards tab to build the content index.')], 'Where each disclosure is answered'));
    C.push(ch('Appendix: glossary and forward-looking statements', 'Appendix', [tbl('glossary', ['Term', 'Meaning'], ['term', 'meaning'], [1.3, 4]), T(S.forward_looking),
      { t: 'sign', title: 'Approval', intro: 'This ESG report was approved by the board on the date below.', rows: [{ role: 'Chair of the board', name: '' }, { role: 'Chief executive officer', name: '' }] }], 'Terms used, and approval'));
    var cur = null; C.forEach(function (x) { if (x.divider) { cur = x; x.list = []; } else if (cur) cur.list.push([('0' + x.no).slice(-2), x.title]); });   // the part pages list their chapters with the real numbers
    return D;
  }

  /* ---------- events ---------- */
  function wire(b) {
    b.querySelectorAll('[data-s][data-k]').forEach(function (el) {
      var h = function () { var s = el.getAttribute('data-s'), k = el.getAttribute('data-k'); V.e[s] = V.e[s] || {}; var v = el.value; if (v === '') delete V.e[s][k]; else V.e[s][k] = v;
        if (k === 'fset' && SC.factorSets[v]) { var set = SC.factorSets[v], m = { fDiesel: 'diesel', fPetrol: 'petrol', fJet: 'jet', fLpg: 'lpg', fGas: 'gas', fElec: 'elec' }; V.e.efsrc = Object.assign({}, V.e.efsrc); Object.keys(m).forEach(function (fk) { V.e.carbon[fk] = set[m[fk]]; V.e.efsrc['carbon.' + fk] = { id: '', label: 'Factor set: ' + set.label, value: set[m[fk]] }; var i = $('#ef-carbon-' + fk); if (i) { i.value = set[m[fk]]; i.placeholder = set[m[fk]]; } }); touch('efsrc'); }
        var fk = s + '.' + k; if (V.e.efsrc && V.e.efsrc[fk] && String(V.e.efsrc[fk].value) !== String(v)) { V.e.efsrc = Object.assign({}, V.e.efsrc); V.e.efsrc[fk] = { id: '', label: 'Entered by you', value: v === '' ? null : Number(v) }; touch('efsrc'); var sm = el.closest('label') && el.closest('label').querySelector('.esg-efsrc'); if (sm) sm.textContent = '📚 Entered by you'; }
        touch(s); };
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', h);
    });
    b.querySelectorAll('[data-std]').forEach(function (cb) { cb.onchange = function () { var s = cb.getAttribute('data-std'), L = (V.e.std || []).filter(function (x) { return x !== s; }); if (cb.checked) L.push(s); V.e.std = L; cb.closest('.esg-stdc').classList.toggle('on', cb.checked); touch('std'); }; });
    b.querySelectorAll('[data-mat]').forEach(function (el) { el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function () { var k = el.getAttribute('data-mat'), f = el.getAttribute('data-mf'); V.e.mat = V.e.mat || {}; var m = V.e.mat[k] = V.e.mat[k] || { imp: 0, fin: 0 }; m[f] = f === 'note' ? el.value : Number(el.value); touch('mat'); var lv = $('#esgLive'); if (lv) lv.innerHTML = live('material'); }); });
    b.querySelectorAll('[data-ins]').forEach(function (x) { x.onclick = function () { askInsight(x.getAttribute('data-ins')); }; });
    // 🌱 avoided emissions, 🎫 credits, 💱 pricing: lists that open one line at a time
    b.querySelectorAll('[data-open]').forEach(function (x) { x.onclick = function () { var k = x.getAttribute('data-open'), id = x.getAttribute('data-id'); V.open[k] = V.open[k] === id ? '' : id; body(); }; });
    var bind = function (sel, attr, getL, part) { b.querySelectorAll('[' + sel + ']').forEach(function (box) { var i = +box.getAttribute(sel); box.querySelectorAll('[' + attr + ']').forEach(function (el) { el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function () { var L = getL(), it = L && L[i]; if (!it) return; it[el.getAttribute(attr)] = el.value; touch(part); }); }); }); };
    var P0 = function () { V.e.pricing = V.e.pricing || {}; return V.e.pricing; };
    bind('data-avi', 'data-av', function () { return V.e.avoid; }, 'avoid');
    bind('data-cri', 'data-cr', function () { return V.e.credits; }, 'credits');
    bind('data-cbi', 'data-cb', function () { return P0().cbam; }, 'pricing');
    bind('data-exi', 'data-ex', function () { return P0().exp; }, 'pricing');
    var del = function (attr, getL, part) { b.querySelectorAll('[' + attr + ']').forEach(function (x) { x.onclick = function () { getL().splice(+x.getAttribute(attr), 1); touch(part); body(); }; }); };
    del('data-avdel', function () { return V.e.avoid; }, 'avoid'); del('data-crdel', function () { return V.e.credits; }, 'credits'); del('data-cbdel', function () { return P0().cbam; }, 'pricing'); del('data-exdel', function () { return P0().exp; }, 'pricing');
    var nid = function () { return 'N' + rid().slice(0, 10).toUpperCase(); };
    var add = function (key, L, item) { item.id = nid(); L.push(item); V.open[key] = item.id; touch(key === 'cbam' || key === 'exp' ? 'pricing' : key); body(); };
    if ($('#avAdd')) $('#avAdd').onclick = function () { V.e.avoid = V.e.avoid || []; add('avoid', V.e.avoid, { name: 'New project or solution', cat: 'Other', attr: 100, status: 'Planned', verify: 'Estimate' }); };
    if ($('#avTpl')) $('#avTpl').onchange = function () { var t = SC.avoidTemplates[+this.value]; if (!t) return; V.e.avoid = V.e.avoid || []; add('avoid', V.e.avoid, { name: t.name, cat: t.cat, unit: t.unit, base: t.base, sol: t.sol, baseline: t.baseline, attr: 100, status: 'Planned', verify: 'Estimate' }); };
    if ($('#crAdd')) $('#crAdd').onclick = function () { V.e.credits = V.e.credits || []; add('credits', V.e.credits, { project: 'New credit retirement', type: 'Removal credit (nature-based)', ccp: 'Unknown', ca: 'Unknown', use: 'Not decided' }); };
    if ($('#cbAdd')) $('#cbAdd').onclick = function () { P0().cbam = P0().cbam || []; add('cbam', P0().cbam, { market: 'EU', good: 'Iron and steel', sv: 'Default values', dest: 'New goods' }); };
    if ($('#exAdd')) $('#exAdd').onclick = function () { P0().exp = P0().exp || []; add('exp', P0().exp, { site: 'New facility', cur: (V.e.org || {}).currency || 'AUD' }); };
    b.querySelectorAll('[data-pv]').forEach(function (el) { el.addEventListener('input', function () { P0()[el.getAttribute('data-pv')] = el.value; touch('pricing'); }); });
    b.querySelectorAll('[data-sch]').forEach(function (cb) { cb.onchange = function () { var id = cb.getAttribute('data-sch'), L = (P0().schemes || []).filter(function (x) { return x !== id; }); if (cb.checked) L.push(id); P0().schemes = L; cb.closest('.esg-stdc').classList.toggle('on', cb.checked); touch('pricing'); }; });
    bind('data-bli', 'data-bl', function () { return V.e.bills; }, 'bills'); del('data-bldel', function () { return V.e.bills; }, 'bills');
    if ($('#blPick')) $('#blPick').onclick = function () { $('#blFile').click(); };
    if ($('#blFile')) $('#blFile').onchange = function () { readBills(this.files); };
    if ($('#blAdd')) $('#blAdd').onclick = function () { V.e.bills = V.e.bills || []; add('bills', V.e.bills, { supplier: 'New bill', cur: (V.e.org || {}).currency || '' }); };
    wireUse();
    b.querySelectorAll('[data-import]').forEach(function (x) { x.onclick = function () { flush().catch(function () {}); importModal(); }; });
    if ($('#lfQ')) { var rerun = function () { LF.n = 40; var r = $('#lfRes'); if (r) { r.innerHTML = libRows(); wireLib(); } };
      $('#lfQ').oninput = function () { LF.q = this.value; rerun(); };
      [['#lfCountry', 'country'], ['#lfCat', 'cat'], ['#lfStd', 'std'], ['#lfField', 'field']].forEach(function (p0) { $(p0[0]).onchange = function () { LF[p0[1]] = this.value; rerun(); }; });
      $('#lfClear').onclick = function () { LF = { q: '', country: '', cat: '', std: '', field: '', n: 40 }; body(); };
      wireLib(); }
    b.querySelectorAll('[data-find]').forEach(function (x) { x.onclick = function (ev) { ev.preventDefault(); var f = x.getAttribute('data-find'), cty = (V.e.org || {}).country || '';
      LF = { q: '', country: '', cat: '', std: '', field: f, n: 40 }; efLoad().then(function () { if (EF.some(function (y) { return y.field === f && y.country === cty; })) LF.country = cty; V.subs = V.subs || {}; V.subs[V.tab] = 'library'; body(); var y = $('#esgBody'); if (y && y.scrollIntoView) y.scrollIntoView({ block: 'start' }); }).catch(fail); }; });
    b.querySelectorAll('[data-sub]').forEach(function (x) { x.onclick = function () { V.subs = V.subs || {}; V.subs[V.tab] = x.getAttribute('data-sub'); body(); }; });
    // 📄 documents
    if ($('#dAi')) $('#dAi').onclick = function () { writeDoc(V.tab); };
    if ($('#dPdf')) $('#dPdf').onclick = function () { flush().then(function () { makeDoc(V.tab, 'pdf'); }, function (e) { if (!e.shown) fail(e); }); };
    if ($('#dDocx')) $('#dDocx').onclick = function () { flush().then(function () { makeDoc(V.tab, 'docx'); }, function (e) { if (!e.shown) fail(e); }); };
    if ($('#dTheme')) $('#dTheme').onchange = function () { THEME = this.value; };
  }
  // leaving with changes not yet saved: save them now
  window.addEventListener('hashchange', function () { Object.keys(Q).forEach(function (id) { if (Object.keys(Q[id].parts).length) saveNow(id).catch(function () {}); }); });
  window.addEventListener('beforeunload', function (ev) { var busy = Object.keys(Q).some(function (id) { return Object.keys(Q[id].parts).length || Q[id].saving; }); Object.keys(Q).forEach(function (id) { saveNow(id).catch(function () {}); }); if (busy) { ev.preventDefault(); ev.returnValue = ''; } });

  /* ---------- 🌱 the CSO view (Management & leadership): every ESG report at a glance, for the Chief Sustainability Officer ---------- */
  function csoPage() {
    view().innerHTML = '<div class="empty">Gathering every ESG report…</div>';
    return Promise.all([schema(), api('esgCso', { year: V.csoYear || '' })]).then(function (r) {
      var d = r[1], T = d.totals, R = d.rows, v = view();
      document.title = 'CSO view · GKH Project Champ';
      var head = '<div class="row plan-head" style="margin-bottom:12px"><h2 style="font-size:21px">🌱 CSO view</h2><span class="muted">Every ESG report at a glance: the footprint, the scores, how ready each report is and what is due</span><span class="sp"></span>' +
        (d.years.length > 1 ? '<label class="cso-yr">Reporting year <select id="csoYr">' + d.years.map(function (y) { return '<option' + (y === d.year ? ' selected' : '') + '>' + esc(y) + '</option>'; }).join('') + '</select></label>' : '') + (R.length ? '<button class="btn" type="button" id="csoAsk">✨ Brief me</button>' : '') + '<a class="btn btn-gold" href="#esg">🌿 ESG reports</a></div>';
      if (!R.length) { v.innerHTML = head + '<div class="card empty" style="padding:36px">No ESG reports yet. Open <a href="#esg">🌿 ESG &amp; Sustainability</a> and start one (or a sample) to see them here.</div>'; return; }
      var flags = [], RY = R.filter(function (x) { return !d.year || x.year === d.year; });
      RY.forEach(function (x) { var L = function (t, c) { flags.push('<li><span class="dot dot-' + c + '"></span> <a href="#esg/' + esc(x.id) + '/overview"><b>' + esc(x.name) + '</b></a> ' + t + '</li>'); };
        if (x.deaths) L('reported ' + nf(x.deaths) + (Number(x.deaths) === 1 ? ' fatality' : ' fatalities') + ': the board needs the investigation and the actions', 'red');
        if (!x.tgt) L('has no emissions reduction target (IFRS S2 §33)', 'amber');
        if (x.readiness < 50) L('is ' + x.readiness + '% ready against its chosen standards', x.readiness < 30 ? 'red' : 'amber');
        if (!x.statement && !x.report) L('has no statement or report written yet', 'grey');
        if (!/limited|reasonable/i.test(x.assurance || '')) L('has no external assurance planned', 'grey');
        if (x.creditQ != null && x.creditQ < 50) L('holds carbon credits where only ' + x.creditQ + '% pass the integrity checks', 'amber');
        if (x.cbamEU) L('faces an estimated €' + nf(x.cbamEU) + ' of EU CBAM: first surrender due 30 September 2027', 'amber');
        if (x.bench && x.intensity != null && x.intensity > x.bench) L('runs ' + nf((x.intensity / x.bench - 1) * 100) + '% above the sector intensity', 'amber'); });
      var mx = Math.max.apply(null, RY.map(function (x) { return x.total || 0; }).concat([1]));
      var stack = RY.slice(0, 12).map(function (x) { var w = function (n) { return Math.max(0, (n || 0) / mx * 100); };
        return '<div class="cso-st"><a href="#esg/' + esc(x.id) + '/carbon">' + esc(x.name) + '</a><i><b class="s1" style="width:' + w(x.s1) + '%" title="Scope 1: ' + nf(x.s1) + ' t"></b><b class="s2" style="width:' + w(x.s2) + '%" title="Scope 2: ' + nf(x.s2) + ' t"></b><b class="s3" style="width:' + w(x.s3) + '%" title="Scope 3: ' + nf(x.s3) + ' t"></b></i><em>' + nf(x.total) + ' t</em></div>'; }).join('');
      var docOf = function (x) { var f = function (D, n) { return D ? '<span class="pill t-green" title="v' + D.ver + ', ' + esc(when(D.at)) + '">' + n + ' v' + D.ver + '</span>' : '<span class="pill">' + n + ' –</span>'; }; return f(x.statement, 'Statement') + ' ' + f(x.report, 'Report'); };
      v.innerHTML = head + '<div class="grid pkpis">' +
          tile('Group footprint' + (d.year ? ' ' + d.year : ''), nf(T.total) + ' tCO2e', 'Scope 1 ' + nf(T.s1) + ' · Scope 2 ' + nf(T.s2) + ' · Scope 3 ' + nf(T.s3), 'grey') +
          tile('Average ESG score', (T.esg == null ? '–' : T.esg) + ' / 100', 'E ' + T.env + ' · S ' + T.soc + ' · G ' + T.gov + ' across ' + pl(T.n, 'report') + (d.year ? ' for ' + d.year : ''), rag(T.esg)) +
          tile('Report readiness', (T.readiness == null ? '–' : T.readiness) + '%', T.docs + ' of ' + T.n + ' with a document · ' + T.assured + ' assured', rag(T.readiness)) +
          tile('Avoided emissions', nf(T.avoided) + ' tCO2e', 'beside the footprint, not netted · ' + nf(T.credits) + ' t of credits retired', T.avoided ? 'green' : 'grey') + '</div>' +
        ((T.cbamEU || T.cbamUK) ? '<div class="card cso-cbam">💱 <b>Carbon border adjustment exposure</b>: ' + (T.cbamEU ? '€' + nf(T.cbamEU) + ' EU CBAM' : '') + (T.cbamEU && T.cbamUK ? ' · ' : '') + (T.cbamUK ? '£' + nf(T.cbamUK) + ' UK CBAM' : '') + ' <span class="muted">(estimates from each report\'s Pricing &amp; CBAM tab)</span></div>' : '') +
        '<div class="esg-ov">' +
          '<div class="card"><h3>Emissions by organisation</h3><div class="cso-leg"><span class="s1">Scope 1</span><span class="s2">Scope 2</span><span class="s3">Scope 3</span></div>' + stack + '</div>' +
          '<div class="card"><h3>Readiness by standard</h3>' + (d.byStd.length ? bars(d.byStd.map(function (x) { return [stdShort(x.std) + ' (' + x.n + ')', x.cov]; }), '%') : '<p class="muted">No standards chosen yet.</p>') + '<p class="muted" style="font-size:12px;margin:0">The average share of each standard\'s disclosures covered by the data, across the reports that use it.</p></div>' +
          '<div class="card"><h3>Needs attention</h3>' + (flags.length ? '<ul class="cso-flags">' + flags.slice(0, 14).join('') + '</ul>' : '<p class="muted">Nothing flagged.</p>') + '</div>' +
          '<div class="card"><h3>Reporting calendar</h3>' + (d.calendar.length ? '<ul class="cso-cal">' + d.calendar.map(function (c) { var past = c.when < new Date().toISOString().slice(0, 10); return '<li class="' + (past ? 'past' : '') + '"><b>' + esc(dt(c.when)) + '</b><span class="pill">' + esc(stdShort(c.std)) + '</span><div>' + esc(c.what) + '</div></li>'; }).join('') + '</ul><p class="muted" style="font-size:12px;margin:8px 0 0">For the standards your reports use; status as checked November 2026. Confirm which group each organisation falls in.</p>' : '<p class="muted">Choose standards in the reports to see the dates that apply.</p>') + '</div>' +
          '<div class="card esg-wide"><h3>Every report <small class="muted" style="font-weight:500;font-size:12.5px">(all years; the figures above are for ' + esc(d.year || 'every year') + ')</small></h3><div class="tbl-wrap"><table class="tbl esg-tbl cso-tbl"><thead><tr><th>Organisation</th><th>Year</th><th>ESG</th><th>E · S · G</th><th>tCO2e</th><th>Intensity vs sector</th><th>Target</th><th>Avoided</th><th>Readiness</th><th>Documents</th><th>Assurance</th></tr></thead><tbody>' +
            R.map(function (x) { return '<tr><td><a href="#esg/' + esc(x.id) + '/overview"><b>' + esc(x.name) + '</b></a><div class="muted" style="font-size:11.5px">' + esc([x.industry, x.country].filter(Boolean).join(' · ')) + '</div></td><td>' + esc(x.year) + '</td><td><b class="t-' + rag(x.esg) + '">' + x.esg + '</b></td><td>' + x.env + ' · ' + x.soc + ' · ' + x.gov + '</td><td>' + nf(x.total) + '</td>' +
              '<td>' + (x.intensity != null ? nf(x.intensity, 1) + (x.bench ? ' <small class="' + (x.intensity <= x.bench ? 't-green' : 't-amber') + '">(' + (x.intensity <= x.bench ? '▼ ' : '▲ ') + nf(Math.abs(x.intensity / x.bench - 1) * 100) + '%)</small>' : '') : '–') + '</td><td>' + esc(x.tgt || '–') + (x.netZero ? '<div class="muted" style="font-size:11.5px">Net zero ' + esc(x.netZero) + '</div>' : '') + '</td><td>' + (x.avoided ? nf(x.avoided) + ' t' : '–') + '</td>' +
              '<td><b class="t-' + rag(x.readiness) + '">' + x.readiness + '%</b><div class="esg-std">' + x.std.slice(0, 4).map(function (z) { return '<span>' + esc(stdShort(z)) + '</span>'; }).join('') + '</div></td><td>' + docOf(x) + '</td><td>' + esc(x.assurance || 'None') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
            '<p class="muted" style="font-size:12px;margin:8px 0 0">' + esc(d.method) + '. Scores are a management guide, not a rating agency score.</p></div></div>';
      var ys = $('#csoYr'); if (ys) ys.onchange = function () { V.csoYear = this.value; csoPage().catch(fail); };
      var ask = $('#csoAsk'); if (ask) ask.onclick = function () { if (M.guide && M.guide.ask) M.guide.ask('As my sustainability adviser, give me a CSO briefing across all our ESG reports: the footprint, the biggest risks and gaps, the reporting deadlines coming up, and the three things to do first.'); else toast('Open 🎙 Ask Champ, bottom right'); };
    });
  }
  M.addView('cso', 'CSO view', function () { return csoPage(); }, 'cso');

  M.addView('esg', 'ESG & Sustainability', function (parts) { return parts[0] ? entityPage(parts[0], parts[1]) : listPage(); }, 'esg');
  M.esg = { reportDoc: reportDoc, statementDoc: statementDoc, state: function () { return V; } };   // for tests
})();
