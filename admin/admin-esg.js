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
    ['Carbon avoidance', 'eavoid', [['avoid', 'Avoided emissions'], ['credits', 'Carbon credits']]],
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
    avoid: '<path d="M12 21c-4-3-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-3 8-7 11z"/><path d="M9 11.5c1.5-1 4.5-1 6 0M12 7v8"/>', credits: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>',
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
  function load(id) { return api('esgGet', { id: id }).then(function (d) { V.id = d.entity.id; V.e = d.entity; V.calc = d.calc; V.cover = d.cover; V.docs = d.docs || {}; }); }
  function entityPage(id, tab) {
    var known = {}; GROUPS.forEach(function (g) { g[2].forEach(function (t) { known[t[0]] = 1; }); });
    V.tab = known[tab] ? tab : 'overview';
    var go = function () { draw(); };
    if (V.e && V.id === id) { go(); return Promise.resolve(); }
    view().innerHTML = '<div class="empty">Loading the report…</div>';
    return schema().then(function () { return load(id); }).then(go);
  }
  function draw() {
    var e = V.e, o = e.org || {};
    document.title = (o.name || 'ESG report') + ' · ESG · GKH Project Champ';
    view().innerHTML = '<div class="row plan-head" style="margin-bottom:12px"><a class="btn btn-sm" href="#esg">← ESG reports</a><h2 style="font-size:21px">' + esc(o.name || 'Untitled') + '</h2><span class="muted">' + esc([o.year, o.industry, o.country].filter(Boolean).join(' · ')) + '</span><span class="sp"></span>' +
      '<span class="esg-saved muted" id="esgSaved" aria-live="polite"></span><button class="btn btn-sm" id="esgDel" type="button" title="Delete this ESG report">🗑</button></div>' +
      '<div class="grid pkpis" id="esgTiles">' + tilesHtml() + '</div>' + tabsHtml() + '<div id="esgBody"></div>';
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
    else if (t === 'statement' || t === 'report') b.innerHTML = docTab(t);
    else if (t === 'records') b.innerHTML = recordsTab();
    else b.innerHTML = formTab(t);
    wire(b);
  }
  // after a save: the tiles and the live results change, the fields being typed in stay as they are
  function refresh() { var T = $('#esgTiles'); if (T) T.innerHTML = tilesHtml(); var r = $('#esgRes'); if (r) r.innerHTML = results(V.tab); var x = $('#esgLive'); if (x) x.innerHTML = live(V.tab); }

  /* ---------- 💾 saving: a short pause after typing, then the whole section ---------- */
  var pend = {};
  function touch(part) { pend[part] = 1; var s = $('#esgSaved'); if (s) s.textContent = 'Editing…'; clearTimeout(V.timer); V.timer = setTimeout(saveNow, 800); }
  function saveNow() {
    if (V.saving) { V.again = true; return; }
    var keys = Object.keys(pend); if (!keys.length) return; pend = {};
    var patch = {}; keys.forEach(function (k) { patch[k] = V.e[k]; });
    V.saving = true; var s = $('#esgSaved'); if (s) s.textContent = 'Saving…';
    api('esgSave', { id: V.id, rev: V.e.rev, patch: patch }).then(function (d) {
      keys.forEach(function (k) { if (!pend[k]) V.e[k] = d.entity[k]; });   // keep anything typed while it saved
      V.e.rev = d.entity.rev; V.e.log = d.entity.log; V.e.updated = d.entity.updated; V.calc = d.calc;
      if (s) s.textContent = '✓ Saved'; refresh();
    }).catch(function (e) { if (s) s.textContent = ''; if (/changed this report/i.test(e.message || '')) { toast(e.message); load(V.id).then(draw); return; } fail(e); })
      .then(function () { V.saving = false; if (V.again || Object.keys(pend).length) { V.again = false; saveNow(); } });
  }

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
    return '<label class="esg-f' + (t === 'l' ? ' full' : '') + '" for="' + id + '"><span>' + esc(label) + '</span>' + ctl + (hint ? '<small class="muted">' + esc(hint) + '</small>' : '') + '</label>';
  }
  var INTRO = { org: 'Who is reporting, for what period, and how. This becomes the basis of preparation in the statement and the report.',
    carbon: 'Scope 1 (fuels you burn and refrigerant leaks) and Scope 2 (electricity you buy). The factor set fills the emission factors; leave a factor blank to use the set\'s value, or type your own.',
    scope3: 'Scope 3: the value chain. Enter the categories you can measure now; blank factors use the indicative defaults shown. Add more categories each year.',
    resources: 'Energy, water and waste, and the environmental management system.', climate: 'Climate-related risks, opportunities and targets: the heart of IFRS S2, AASB S2 and TCFD.',
    workforce: 'Who works here, and how safe they are. Women in management is measured against everyone in management.', rights: 'Human rights, labour standards, child labour, modern slavery and Indigenous peoples.',
    community: 'Community, suppliers and customers.', board: 'The board: its make-up, independence and oversight of sustainability.', ethics: 'Ethics, anti-corruption, risk, cyber security and tax.', certs: 'Management systems and certifications.' };
  function formTab(sec) {
    var s = SC.sec[sec]; if (!s) return '<div class="empty">Not found</div>';
    var acts = s.fields.filter(function (f) { return !isF(f[0]); }), facs = s.fields.filter(function (f) { return isF(f[0]); }), p = pillarOf(sec);
    return '<div class="esg-split"><div class="card"><div class="row" style="margin-bottom:6px"><h3 style="margin:0">' + esc(s.title) + '</h3></div><p class="muted" style="margin:0 0 12px;font-size:13px">' + esc(INTRO[sec] || '') + '</p>' +
      '<div class="esg-form">' + acts.map(function (f) { return field(sec, f); }).join('') + '</div>' +
      (facs.length ? '<details class="esg-facs"' + (sec === 'carbon' ? ' open' : '') + '><summary>Emission factors <small class="muted">(indicative defaults shown in grey: check them against the current official set before you report)</small></summary><div class="esg-form">' + facs.map(function (f) { return field(sec, f); }).join('') + '</div></details>' : '') +
      '</div><div><div class="card esg-res" id="esgRes">' + results(sec) + '</div>' + (p ? insightCard(p) : '') + '</div></div>';
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
    var I = (V.e.insights || {})[p], busy = V.ai[p];
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
    flush(); V.ai[p] = true; var box = $('#esgAi-' + p); if (box) box.outerHTML = insightCard(p);
    bg({ mode: 'esgInsight', esg: V.id, pillar: p }, function (r) { V.ai[p] = false; V.e.insights = Object.assign({}, V.e.insights, (function () { var o = {}; o[p] = r.insight; return o; })()); var b = $('#esgAi-' + p); if (b) { b.outerHTML = insightCard(p); wire($('#esgBody')); } toast('Recommendations ready'); },
      function (e) { V.ai[p] = false; var b = $('#esgAi-' + p); if (b) { b.outerHTML = insightCard(p); wire($('#esgBody')); } fail(e); });
  }
  function flush() { if (Object.keys(pend).length) { clearTimeout(V.timer); saveNow(); } }

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
  function live(t) { if (t === 'material') return '<h3>Matrix</h3>' + matrix() + '<p class="muted" style="font-size:12.5px">Topics in the shaded corner are material on both counts and lead the report.</p>'; if (t === 'avoid') return avoidSummary(); if (t === 'credits') return creditsSummary(); return ''; }

  /* ---------- 🌱 carbon avoidance ---------- */
  function avoidSummary() {
    var a = V.calc.avoid, cats = Object.keys(a.byCat);
    return '<h3>Avoided emissions</h3><div class="esg-big"><b>' + nf(a.total) + '</b><span>tCO2e avoided in the year</span></div>' + meter([['Delivered', Math.round(a.delivered), Math.max(1, Math.round(a.total))], ['Third-party verified', Math.round(a.verified), Math.max(1, Math.round(a.total))]]) +
      (cats.length ? '<h4 style="margin:12px 0 6px">By kind of solution</h4>' + bars(cats.map(function (k) { return [k, a.byCat[k]]; }), 't') : '') +
      '<div class="esg-gaps esg-rule"><b>How it is reported</b><ul><li>Avoided emissions sit <b>beside</b> the Scope 1, 2 and 3 inventory and are never subtracted from it (WBCSD Guidance on Avoided Emissions, GHG Protocol).</li><li>Each result = quantity × (baseline factor − solution factor) × the share attributed to you.</li><li>Your footprint this year: <b>' + tco(V.calc.em.total) + '</b>.</li></ul></div>';
  }
  function avoidTab() {
    var L = V.e.avoid || [], o = function (A, v) { return A.map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join(''); }, calcs = {}; (V.calc.avoid.items || []).forEach(function (x) { calcs[x.id] = x.t; });
    var row = function (x, i) { return '<div class="card esg-av" data-avi="' + i + '"><div class="row" style="gap:8px"><input class="esg-av-n" data-av="name" value="' + esc(x.name || '') + '" placeholder="Project or solution" maxlength="120"><span class="esg-av-t" title="Avoided in the year">' + (calcs[x.id] != null ? nf(calcs[x.id], 1) + ' tCO2e' : '–') + '</span><button class="btn btn-sm" type="button" data-avdel="' + i + '" title="Remove">✕</button></div>' +
      '<div class="esg-form esg-form-4"><label>Kind<select data-av="cat">' + o(SC.avoidCats, x.cat) + '</select></label><label>Status<select data-av="status">' + o(SC.avoidStatus, x.status) + '</select></label><label>Verification<select data-av="verify">' + o(SC.avoidVerify, x.verify) + '</select></label><label>SDG<input data-av="sdg" value="' + esc(x.sdg || '') + '" maxlength="60" placeholder="e.g. SDG 7"></label>' +
      '<label class="full">Baseline: what would have happened without it<input data-av="baseline" value="' + esc(x.baseline || '') + '" maxlength="240"></label>' +
      '<label>Quantity<input type="number" step="any" data-av="qty" value="' + esc(x.qty == null ? '' : x.qty) + '"></label><label>Unit<input data-av="unit" value="' + esc(x.unit || '') + '" maxlength="30" placeholder="MWh, km, t…"></label><label>Baseline factor<span class="esg-in"><input type="number" step="any" data-av="base" value="' + esc(x.base == null ? '' : x.base) + '"><i>kgCO2e/unit</i></span></label><label>Solution factor<span class="esg-in"><input type="number" step="any" data-av="sol" value="' + esc(x.sol == null ? '' : x.sol) + '"><i>kgCO2e/unit</i></span></label>' +
      '<label>Attributed to you<span class="esg-in"><input type="number" step="any" min="0" max="100" data-av="attr" value="' + esc(x.attr == null ? 100 : x.attr) + '"><i>%</i></span></label><label style="grid-column:span 3">Notes<input data-av="note" value="' + esc(x.note || '') + '" maxlength="400"></label></div></div>'; };
    return '<div class="esg-split"><div><div class="card"><div class="row"><h3 style="margin:0">Avoided emissions</h3><span class="sp"></span><select id="avTpl" aria-label="Add from a template"><option value="">＋ Add from a template…</option>' + SC.avoidTemplates.map(function (t, i) { return '<option value="' + i + '">' + esc(t.name) + '</option>'; }).join('') + '</select><button class="btn btn-sm btn-gold" type="button" id="avAdd">＋ Add</button></div>' +
      '<p class="muted" style="font-size:13px;margin:8px 0 0">Emissions your projects, products and services avoid compared with what would have happened otherwise: solar instead of grid power, electric vehicles instead of diesel, recycling instead of landfill, or a service that cuts your customers\' emissions. Claim only the share that is yours.</p></div>' +
      (L.length ? L.map(row).join('') : '<div class="card empty" style="padding:24px">No avoided emissions recorded yet. Add one, or start from a template.</div>') + '</div><div><div class="card" id="esgLive">' + avoidSummary() + '</div></div></div>';
  }
  function creditsSummary() { var a = V.calc.avoid; return '<h3>Carbon credits</h3><div class="esg-big"><b>' + nf(a.credits) + '</b><span>tCO2e of credits retired</span></div>' + kvHtml([['Of which removals', tco(a.removals)], ['Avoidance credits', tco(a.credits - a.removals)], ['Your gross footprint', tco(V.calc.em.total)]]) +
    '<div class="esg-gaps esg-rule"><b>How it is reported</b><ul><li>Gross emissions are reported before any credits. Credits are shown separately, with the registry and vintage (IFRS S2 §36, ESRS E1-7).</li><li>Removal credits take carbon out of the air; avoidance credits pay for emissions avoided elsewhere. Only removals count towards neutralising residual emissions at net zero.</li></ul></div>'; }
  function creditsTab() {
    var L = V.e.credits || [], o = function (v) { return SC.creditTypes.map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join(''); };
    return '<div class="esg-split"><div class="card"><div class="row"><h3 style="margin:0">Carbon credits retired</h3><span class="sp"></span><button class="btn btn-sm btn-gold" type="button" id="crAdd">＋ Add credits</button></div><p class="muted" style="font-size:13px;margin:8px 0 12px">The credits retired for this reporting year, kept apart from the emissions inventory.</p>' +
      (L.length ? '<div class="tbl-wrap"><table class="tbl esg-tbl"><thead><tr><th>Project</th><th>Type</th><th>Registry</th><th>Vintage</th><th>tCO2e</th><th>Cost</th><th>Purpose</th><th></th></tr></thead><tbody>' + L.map(function (x, i) {
        return '<tr data-cri="' + i + '"><td><input data-cr="project" value="' + esc(x.project || '') + '" maxlength="140"></td><td><select data-cr="type">' + o(x.type) + '</select></td><td><input data-cr="registry" value="' + esc(x.registry || '') + '" placeholder="Verra, Gold Standard, ACCU…" maxlength="60"></td><td><input data-cr="vintage" value="' + esc(x.vintage || '') + '" maxlength="10" style="width:80px"></td><td><input type="number" step="any" data-cr="t" value="' + esc(x.t == null ? '' : x.t) + '" style="width:100px"></td><td><input type="number" step="any" data-cr="cost" value="' + esc(x.cost == null ? '' : x.cost) + '" style="width:100px"></td><td><input data-cr="purpose" value="' + esc(x.purpose || '') + '" maxlength="200"></td><td><button class="btn btn-sm" type="button" data-crdel="' + i + '">✕</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted">No credits recorded for this year.</p>') +
      '</div><div><div class="card" id="esgLive">' + creditsSummary() + '</div></div></div>';
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
    var N = V.docs[kind], rep = kind === 'report', l = (window.ChampI18n && window.ChampI18n.get && window.ChampI18n.get()) || 'en', L = (window.ChampI18n && window.ChampI18n.langs) || [['en', 'English']], busy = V.ai[kind];
    var T = (M.studio && M.studio.themes && M.studio.themes()) || [];
    return '<div class="esg-split"><div class="card"><h3 style="margin-top:0">' + (rep ? '📘 ESG Report' : '📄 Sustainability Statement') + '</h3><p class="muted" style="font-size:13px">' +
      (rep ? 'A full report of about 60 pages in seven parts: introduction and strategy, governance, climate (IFRS S2 / AASB S2 / TCFD), environment, social, performance and roadmap, and reporting standards, with the data tables, charts, the avoided emissions, a content index for each standard you chose, a glossary and an approval page. ✨ Champ writes the narrative in seven parts at once (up to 100,000 tokens, about 3 to 6 minutes).'
        : 'A concise statement of under 10 pages: the leadership message, basis of preparation, governance, material topics, environment and climate, social, governance performance, avoided emissions, targets and outlook, and a short content index. ✨ Champ writes it in two parts (about 1 to 2 minutes).') + '</p>' +
      '<div class="form" style="margin-top:10px"><label>Language<select id="dLang" data-noi18n>' + L.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === l ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select></label>' +
      '<label>Colour scheme<select id="dTheme">' + T.map(function (t) { return '<option value="' + t.id + '"' + (t.id === THEME ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="row" style="gap:6px;margin-top:14px;flex-wrap:wrap"><button class="btn btn-gold" id="dAi" type="button"' + (busy ? ' disabled' : '') + '>' + (busy ? '✨ Writing…' : N ? '✨ Write it again' : '✨ Write with AI') + '</button><button class="btn" id="dPdf" type="button">⬇ PDF</button><button class="btn" id="dDocx" type="button">⬇ Word</button><span class="muted" id="dMsg" style="font-size:12.5px">' + (busy ? '<span class="ask-think">✨ Champ is writing…</span>' : '') + '</span></div>' +
      '<div class="esg-dstate">' + (N ? '✓ Narrative v' + N.ver + ' written ' + esc(when(N.at)) + ' by ' + esc(N.by || '') + ' · ' + nf(N.tokens) + ' tokens' + (N.partial ? ' · <span class="t-amber">' + esc(N.partial) + '</span>' : '') + '. Write it again after you change the data.' : 'No narrative yet: the PDF and Word still work, with the data, charts and tables, and a note where the narrative goes.') + '</div></div>' +
      '<div class="card"><h3 style="margin-top:0">Inside</h3><ol class="esg-toc">' + (rep ? REPORT_TOC : STATEMENT_TOC).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div></div>';
  }
  var STATEMENT_TOC = ['Message from leadership', 'About this statement', 'Governance and strategy', 'Material topics', 'Environment and climate', 'Social', 'Governance performance', 'Avoided emissions', 'Targets and outlook', 'Content index'];
  var REPORT_TOC = ['Part 1 Introduction and strategy: message from the CEO, about this report, our organisation, strategy, stakeholders, materiality, SDGs', 'Part 2 Governance: structure and oversight, ethics and integrity, risk management, cyber, privacy and tax',
    'Part 3 Climate: governance and strategy, risks and opportunities, scenarios and resilience, metrics, targets and transition plan', 'Part 4 Environment: GHG emissions, energy, water and waste, biodiversity and compliance, avoided emissions and carbon credits',
    'Part 5 Social: our people, health and safety, diversity and inclusion, human rights and Indigenous peoples, communities, suppliers and customers', 'Part 6 Performance and roadmap: governance performance, ESG scorecard, targets and roadmap, reporting standards, data quality and assurance',
    'Appendices: performance data, content index, glossary, forward-looking statements, approval'];
  function writeDoc(kind) {
    flush(); V.ai[kind] = true; var lang = $('#dLang').value; body();
    bg({ mode: 'esgDoc', esg: V.id, kind: kind, lang: lang }, function (r) { V.ai[kind] = false; V.docs[kind] = r; load(V.id).then(function () { V.docs[kind] = r; if (V.tab === kind) draw(); toast((kind === 'report' ? 'ESG report' : 'Statement') + ' narrative written (' + nf(r.tokens) + ' tokens). Download the PDF or Word.'); }); },
      function (e) { V.ai[kind] = false; if (V.tab === kind) body(); fail(e); });
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
  var dt = function (s) { try { return s ? new Date(s + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : ''; } catch (x) { return s; } };
  var RT = ['–', 'Low', 'Medium', 'High', 'Very high'];
  function list(L) { return (L || []).map(function (x) { return '- ' + (typeof x === 'string' ? x : Object.values(x).join(': ')); }).join('\n'); }
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
      headRight: [(X.o.year || '') + (N ? ' · narrative v' + N.ver : ''), 'Issued ' + dt(today)], footer: 'Sustainability statement · ' + (X.o.name || '').slice(0, 70),
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
      headRight: [(X.o.year || '') + (N ? ' · narrative v' + N.ver : ''), X.o.reg || ''], footer: 'ESG report ' + (X.o.year || '') + ' · ' + (X.o.name || '').slice(0, 70),
      meta: [['Organisation', X.o.name || ''], ['Reporting period', X.o.from && X.o.to ? dt(X.o.from) + ' to ' + dt(X.o.to) : X.o.year || ''], ['Industry', X.o.industry || ''], ['Boundary', X.o.boundary || ''], ['Assurance', X.o.assurance || 'None yet'], ['Standards', (X.e.std || []).map(stdShort).join(', ')]],
      stats: [{ v: String(c.esg), l: 'ESG score out of 100' }, { v: nf(em.total), l: 'tCO2e footprint' }, { v: nf(c.avoid.total), l: 'tCO2e avoided' }, { v: c.readiness + '%', l: 'Report readiness' }], chapters: [],
      fileBase: ((X.o.name || 'Organisation') + '-ESG-Report-' + (X.o.year || '') + (lang && lang !== 'en' ? '-' + lang : '')).replace(/[^\w.-]+/g, '-') };
    var C = D.chapters;
    C.push(part(1, 'Introduction and strategy', 'Who we are, how this report is prepared, what matters most and where we are heading.', [['01', 'Message from the CEO'], ['02', 'About this report'], ['03', 'Our organisation'], ['04', 'Sustainability strategy'], ['05', 'Stakeholder engagement'], ['06', 'Materiality']]));
    C.push(ch('Message from the CEO', 'Leadership', [{ t: 'stats', items: D.stats }, T(S.ceo_message, miss)], 'Our year in sustainability'));
    C.push(ch('About this report', 'Basis of preparation', [T(S.about_report, miss), { t: 'kv', title: 'Reporting basis', rows: D.meta.concat([['Factor set', em.setLabel], ['Scoring method', c.method], ['Contact', X.o.contact || '']]) }], 'Period, boundary, standards and assurance'));
    C.push(ch('Our organisation', 'Profile', [T(S.organisation_profile, X.o.about || miss)], 'What we do and where'));
    C.push(ch('Sustainability strategy', 'Strategy', [T(S.strategy, miss), (S.sdgs || []).length ? { t: 'cards', cols: 2, items: S.sdgs.map(function (x) { return { title: x.sdg, text: x.contribution }; }), noTr: nl } : null], 'Our pillars and the goals we contribute to'));
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
      (X.e.credits || []).length ? { t: 'table', title: 'Carbon credits retired', head: ['Project', 'Type', 'Registry', 'Vintage', 'tCO2e'], rows: X.e.credits.map(function (x) { return [{ t: x.project, b: true }, x.type, x.registry, x.vintage, { t: nf(x.t), right: true }]; }), widths: [2.4, 1.6, 1.2, 0.7, 0.8] } : null,
      { t: 'callout', title: 'How avoided emissions are reported', text: 'Avoided emissions are reported beside the Scope 1, 2 and 3 inventory and are **never subtracted from it**. Each result is the quantity times the difference between the baseline and the solution emission factors, times the share attributed to us (WBCSD Guidance on Avoided Emissions, 2023). Carbon credits are reported separately from gross emissions.' }], 'What our solutions avoid, reported separately'));
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
    C.push(ch('Data quality and assurance', 'Assurance', [T(S.data_quality, miss), T(S.assurance_readiness), { t: 'callout', title: 'Emission factors', text: 'Emissions are calculated with the ' + em.setLabel + ' factor set and any factors we entered ourselves. Default factors are indicative and are checked against the current official set before publication.' }], 'Data sources, controls and assurance'));
    C.push(ch('Appendix: content index', 'Appendix', [X.idx.length ? { t: 'table', head: ['Standard', 'Reference', 'Disclosure', 'Status'], rows: X.idx, widths: [0.9, 1.1, 3.4, 0.9], size: 7.2 } : T('Choose the standards in the Standards tab to build the content index.')], 'Where each disclosure is answered'));
    C.push(ch('Appendix: glossary and forward-looking statements', 'Appendix', [tbl('glossary', ['Term', 'Meaning'], ['term', 'meaning'], [1.3, 4]), T(S.forward_looking),
      { t: 'sign', title: 'Approval', intro: 'This ESG report was approved by the board on the date below.', rows: [{ role: 'Chair of the board', name: '' }, { role: 'Chief executive officer', name: '' }] }], 'Terms used, and approval'));
    return D;
  }

  /* ---------- events ---------- */
  function wire(b) {
    b.querySelectorAll('[data-s][data-k]').forEach(function (el) {
      var h = function () { var s = el.getAttribute('data-s'), k = el.getAttribute('data-k'); V.e[s] = V.e[s] || {}; var v = el.value; if (v === '') delete V.e[s][k]; else V.e[s][k] = v;
        if (k === 'fset' && SC.factorSets[v]) { var set = SC.factorSets[v], m = { fDiesel: 'diesel', fPetrol: 'petrol', fJet: 'jet', fLpg: 'lpg', fGas: 'gas', fElec: 'elec' }; Object.keys(m).forEach(function (fk) { V.e.carbon[fk] = set[m[fk]]; var i = $('#ef-carbon-' + fk); if (i) { i.value = set[m[fk]]; i.placeholder = set[m[fk]]; } }); }
        touch(s); };
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', h);
    });
    b.querySelectorAll('[data-std]').forEach(function (cb) { cb.onchange = function () { var s = cb.getAttribute('data-std'), L = (V.e.std || []).filter(function (x) { return x !== s; }); if (cb.checked) L.push(s); V.e.std = L; cb.closest('.esg-stdc').classList.toggle('on', cb.checked); touch('std');
      clearTimeout(V.sTimer); V.sTimer = setTimeout(function () { load(V.id).then(function () { if (V.tab === 'standards') body(); refresh(); }); }, 1600); }; });
    b.querySelectorAll('[data-mat]').forEach(function (el) { el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function () { var k = el.getAttribute('data-mat'), f = el.getAttribute('data-mf'); V.e.mat = V.e.mat || {}; var m = V.e.mat[k] = V.e.mat[k] || { imp: 0, fin: 0 }; m[f] = f === 'note' ? el.value : Number(el.value); touch('mat'); var lv = $('#esgLive'); if (lv) lv.innerHTML = live('material'); }); });
    b.querySelectorAll('[data-ins]').forEach(function (x) { x.onclick = function () { askInsight(x.getAttribute('data-ins')); }; });
    // 🌱 avoided emissions and credits
    var avSet = function (i, k, v) { var it = V.e.avoid[i]; if (!it) return; it[k] = v; touch('avoid'); };
    b.querySelectorAll('[data-avi]').forEach(function (card) { var i = +card.getAttribute('data-avi'); card.querySelectorAll('[data-av]').forEach(function (el) { el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function () { avSet(i, el.getAttribute('data-av'), el.value); }); }); });
    b.querySelectorAll('[data-avdel]').forEach(function (x) { x.onclick = function () { V.e.avoid.splice(+x.getAttribute('data-avdel'), 1); touch('avoid'); body(); }; });
    var add = function (t) { V.e.avoid = V.e.avoid || []; V.e.avoid.push(t ? { name: t.name, cat: t.cat, unit: t.unit, base: t.base, sol: t.sol, baseline: t.baseline, attr: 100, status: 'Planned', verify: 'Estimate' } : { name: 'New project or solution', cat: 'Other', attr: 100, status: 'Planned', verify: 'Estimate' }); touch('avoid'); body(); };
    if ($('#avAdd')) $('#avAdd').onclick = function () { add(null); };
    if ($('#avTpl')) $('#avTpl').onchange = function () { if (this.value !== '') add(SC.avoidTemplates[+this.value]); };
    b.querySelectorAll('[data-cri]').forEach(function (tr) { var i = +tr.getAttribute('data-cri'); tr.querySelectorAll('[data-cr]').forEach(function (el) { el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function () { V.e.credits[i][el.getAttribute('data-cr')] = el.value; touch('credits'); }); }); });
    b.querySelectorAll('[data-crdel]').forEach(function (x) { x.onclick = function () { V.e.credits.splice(+x.getAttribute('data-crdel'), 1); touch('credits'); body(); }; });
    if ($('#crAdd')) $('#crAdd').onclick = function () { V.e.credits = V.e.credits || []; V.e.credits.push({ project: 'New credit retirement', type: 'Removal credit (nature-based)' }); touch('credits'); body(); };
    // 📄 documents
    if ($('#dAi')) $('#dAi').onclick = function () { writeDoc(V.tab); };
    if ($('#dPdf')) $('#dPdf').onclick = function () { flush(); makeDoc(V.tab, 'pdf'); };
    if ($('#dDocx')) $('#dDocx').onclick = function () { flush(); makeDoc(V.tab, 'docx'); };
    if ($('#dTheme')) $('#dTheme').onchange = function () { THEME = this.value; };
  }
  // leaving with changes not yet saved: save them now
  window.addEventListener('hashchange', function () { if (!/^#esg\//.test(location.hash) || location.hash.split('/')[1] !== V.id) flush(); });
  window.addEventListener('beforeunload', function () { flush(); });

  /* ---------- 🌱 the CSO view (Management & leadership): every ESG report at a glance, for the Chief Sustainability Officer ---------- */
  function csoPage() {
    view().innerHTML = '<div class="empty">Gathering every ESG report…</div>';
    return Promise.all([schema(), api('esgCso', {})]).then(function (r) {
      var d = r[1], T = d.totals, R = d.rows, v = view();
      document.title = 'CSO view · GKH Project Champ';
      var head = '<div class="row plan-head" style="margin-bottom:12px"><h2 style="font-size:21px">🌱 CSO view</h2><span class="muted">Every ESG report at a glance: the footprint, the scores, how ready each report is and what is due</span><span class="sp"></span>' +
        (R.length ? '<button class="btn" type="button" id="csoAsk">✨ Brief me</button>' : '') + '<a class="btn btn-gold" href="#esg">🌿 ESG reports</a></div>';
      if (!R.length) { v.innerHTML = head + '<div class="card empty" style="padding:36px">No ESG reports yet. Open <a href="#esg">🌿 ESG &amp; Sustainability</a> and start one (or a sample) to see them here.</div>'; return; }
      var flags = [];
      R.forEach(function (x) { var L = function (t, c) { flags.push('<li><span class="dot dot-' + c + '"></span> <a href="#esg/' + esc(x.id) + '/overview"><b>' + esc(x.name) + '</b></a> ' + t + '</li>'); };
        if (x.deaths) L('reported ' + pl(x.deaths, 'fatality') + ': the board needs the investigation and the actions', 'red');
        if (!x.tgt) L('has no emissions reduction target (IFRS S2 §33)', 'amber');
        if (x.readiness < 50) L('is ' + x.readiness + '% ready against its chosen standards', x.readiness < 30 ? 'red' : 'amber');
        if (!x.statement && !x.report) L('has no statement or report written yet', 'grey');
        if (!/limited|reasonable/i.test(x.assurance || '')) L('has no external assurance planned', 'grey');
        if (x.bench && x.intensity != null && x.intensity > x.bench) L('runs ' + nf((x.intensity / x.bench - 1) * 100) + '% above the sector intensity', 'amber'); });
      var mx = Math.max.apply(null, R.map(function (x) { return x.total || 0; }).concat([1]));
      var stack = R.slice(0, 12).map(function (x) { var w = function (n) { return Math.max(0, (n || 0) / mx * 100); };
        return '<div class="cso-st"><a href="#esg/' + esc(x.id) + '/carbon">' + esc(x.name) + '</a><i><b class="s1" style="width:' + w(x.s1) + '%" title="Scope 1: ' + nf(x.s1) + ' t"></b><b class="s2" style="width:' + w(x.s2) + '%" title="Scope 2: ' + nf(x.s2) + ' t"></b><b class="s3" style="width:' + w(x.s3) + '%" title="Scope 3: ' + nf(x.s3) + ' t"></b></i><em>' + nf(x.total) + ' t</em></div>'; }).join('');
      var docOf = function (x) { var f = function (D, n) { return D ? '<span class="pill t-green" title="v' + D.ver + ', ' + esc(when(D.at)) + '">' + n + ' v' + D.ver + '</span>' : '<span class="pill">' + n + ' –</span>'; }; return f(x.statement, 'Statement') + ' ' + f(x.report, 'Report'); };
      v.innerHTML = head + '<div class="grid pkpis">' +
          tile('Group footprint', nf(T.total) + ' tCO2e', 'Scope 1 ' + nf(T.s1) + ' · Scope 2 ' + nf(T.s2) + ' · Scope 3 ' + nf(T.s3), 'grey') +
          tile('Average ESG score', (T.esg == null ? '–' : T.esg) + ' / 100', 'E ' + T.env + ' · S ' + T.soc + ' · G ' + T.gov + ' across ' + pl(T.n, 'report'), rag(T.esg)) +
          tile('Report readiness', (T.readiness == null ? '–' : T.readiness) + '%', T.docs + ' of ' + T.n + ' with a document · ' + T.assured + ' assured', rag(T.readiness)) +
          tile('Avoided emissions', nf(T.avoided) + ' tCO2e', 'beside the footprint, not netted · ' + nf(T.credits) + ' t of credits retired', T.avoided ? 'green' : 'grey') + '</div>' +
        '<div class="esg-ov">' +
          '<div class="card"><h3>Emissions by organisation</h3><div class="cso-leg"><span class="s1">Scope 1</span><span class="s2">Scope 2</span><span class="s3">Scope 3</span></div>' + stack + '</div>' +
          '<div class="card"><h3>Readiness by standard</h3>' + (d.byStd.length ? bars(d.byStd.map(function (x) { return [stdShort(x.std) + ' (' + x.n + ')', x.cov]; }), '%') : '<p class="muted">No standards chosen yet.</p>') + '<p class="muted" style="font-size:12px;margin:0">The average share of each standard\'s disclosures covered by the data, across the reports that use it.</p></div>' +
          '<div class="card"><h3>Needs attention</h3>' + (flags.length ? '<ul class="cso-flags">' + flags.slice(0, 14).join('') + '</ul>' : '<p class="muted">Nothing flagged.</p>') + '</div>' +
          '<div class="card"><h3>Reporting calendar</h3>' + (d.calendar.length ? '<ul class="cso-cal">' + d.calendar.map(function (c) { var past = c.when < new Date().toISOString().slice(0, 10); return '<li class="' + (past ? 'past' : '') + '"><b>' + esc(dt(c.when)) + '</b><span class="pill">' + esc(stdShort(c.std)) + '</span><div>' + esc(c.what) + '</div></li>'; }).join('') + '</ul><p class="muted" style="font-size:12px;margin:8px 0 0">For the standards your reports use; status as checked November 2026. Confirm which group each organisation falls in.</p>' : '<p class="muted">Choose standards in the reports to see the dates that apply.</p>') + '</div>' +
          '<div class="card esg-wide"><h3>Every report</h3><div class="tbl-wrap"><table class="tbl esg-tbl cso-tbl"><thead><tr><th>Organisation</th><th>Year</th><th>ESG</th><th>E · S · G</th><th>tCO2e</th><th>Intensity vs sector</th><th>Target</th><th>Avoided</th><th>Readiness</th><th>Documents</th><th>Assurance</th></tr></thead><tbody>' +
            R.map(function (x) { return '<tr><td><a href="#esg/' + esc(x.id) + '/overview"><b>' + esc(x.name) + '</b></a><div class="muted" style="font-size:11.5px">' + esc([x.industry, x.country].filter(Boolean).join(' · ')) + '</div></td><td>' + esc(x.year) + '</td><td><b class="t-' + rag(x.esg) + '">' + x.esg + '</b></td><td>' + x.env + ' · ' + x.soc + ' · ' + x.gov + '</td><td>' + nf(x.total) + '</td>' +
              '<td>' + (x.intensity != null ? nf(x.intensity, 1) + (x.bench ? ' <small class="' + (x.intensity <= x.bench ? 't-green' : 't-amber') + '">(' + (x.intensity <= x.bench ? '▼ ' : '▲ ') + nf(Math.abs(x.intensity / x.bench - 1) * 100) + '%)</small>' : '') : '–') + '</td><td>' + esc(x.tgt || '–') + (x.netZero ? '<div class="muted" style="font-size:11.5px">Net zero ' + esc(x.netZero) + '</div>' : '') + '</td><td>' + (x.avoided ? nf(x.avoided) + ' t' : '–') + '</td>' +
              '<td><b class="t-' + rag(x.readiness) + '">' + x.readiness + '%</b><div class="esg-std">' + x.std.slice(0, 4).map(function (z) { return '<span>' + esc(stdShort(z)) + '</span>'; }).join('') + '</div></td><td>' + docOf(x) + '</td><td>' + esc(x.assurance || 'None') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
            '<p class="muted" style="font-size:12px;margin:8px 0 0">' + esc(d.method) + '. Scores are a management guide, not a rating agency score.</p></div></div>';
      var ask = $('#csoAsk'); if (ask) ask.onclick = function () { if (M.guide && M.guide.ask) M.guide.ask('As my sustainability adviser, give me a CSO briefing across all our ESG reports: the footprint, the biggest risks and gaps, the reporting deadlines coming up, and the three things to do first.'); else toast('Open 🎙 Ask Champ, bottom right'); };
    });
  }
  M.addView('cso', 'CSO view', function () { return csoPage(); }, 'cso');

  M.addView('esg', 'ESG & Sustainability', function (parts) { return parts[0] ? entityPage(parts[0], parts[1]) : listPage(); }, 'esg');
  M.esg = { reportDoc: reportDoc, statementDoc: statementDoc, state: function () { return V; } };   // for tests
})();
