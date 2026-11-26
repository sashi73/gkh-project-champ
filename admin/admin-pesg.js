/* GKH Project Champ: 🌿 ESG & Sustainability for projects and programs (netlify/lib/pesg.mjs).
   - a project tab, in its own group of the project menu: an overview, carbon (GHG, mostly CO2e, by scope, with embodied carbon
     in materials), the PMI® GPM® P5™ impact analysis, social and governance factors, and the frameworks the project feeds
     (IFRS S2 / AASB S2, TCFD, SBTi, GHG Protocol, ISO 14064-2, PAS 2080, P5, IS Rating, Green Star, IFC Performance Standards)
   - a portfolio card, by program, added to the CEO, CSO, Finance (CFO), PMO, Program and Programs views */
(function () {
  var M = window.MBS; if (!M) return;
  var api = M.api, esc = M.esc, fail = M.fail, $ = M.$;
  var C, X = { core: '', sub: 'overview', calc: null, schema: null, t: 0, seq: 0 };
  var nf = function (v, d) { return v == null ? '–' : Number(v).toLocaleString('en-AU', { maximumFractionDigits: d == null ? 1 : d }); };
  var plan = function () { return C.S.plan; };
  var data = function () { var p = plan(); p.esg = p.esg || {}; var e = p.esg; e.act = e.act || {}; e.ef = e.ef || {}; e.p5 = e.p5 || {}; e.soc = e.soc || {}; return e; };   // fw stays unset until someone chooses: unset means the usual three, [] means none
  var money = function () { return !(M.me && M.me.money === false); };
  var SUBS = [['overview', 'Overview'], ['carbon', 'Carbon (GHG)'], ['p5', 'P5 impact analysis'], ['social', 'Social and governance'], ['frameworks', 'Frameworks']];

  function tab(ctx) {
    C = ctx; var core = C.S.core; clearTimeout(X.t);   // a recalculation still waiting from another project is dropped
    if (X.core !== core) { X = { core: core, sub: 'overview', calc: null, schema: null, t: 0, seq: X.seq }; }   // the request counter carries on, so an old answer is never taken for a new one
    $('#planBody').innerHTML = '<div class="empty">Working out the project\'s ESG figures…</div>';
    recalc(true);
  }
  // the figures come from the server (one method for the project, its program and the portfolio)
  function recalc(full) {
    var core = X.core, n = ++X.seq, R = C.R || {};
    return api('planEsgAnalyse', { core: core, esg: plan().esg || null, BAC: R.BAC || 0, AC: R.AC || 0 }).then(function (r) {
      if (n !== X.seq || C.S.core !== core || C.S.tab !== 'esg') return;
      X.calc = r.esg; X.schema = r.schema;
      if (full) draw(); else { var s = $('#peStrip'); if (s) s.innerHTML = strip(); if (X.sub === 'overview' || X.sub === 'frameworks') { var b = $('#peSub'); if (b) b.innerHTML = body(); wire(b); } else { var o = $('#peOut'); if (o) o.innerHTML = outBox(); } }
    })  .catch(function (e) { if (n !== X.seq || C.S.core !== core || C.S.tab !== 'esg' || !$('#planBody')) return; if (full) $('#planBody').innerHTML = '<div class="empty">' + esc(e.message || 'Could not work out the ESG figures') + '</div>'; else fail(e); });
  }
  function changed(note) { C.dirty(note || 'ESG data'); clearTimeout(X.t); X.t = setTimeout(function () { recalc(false); }, 450); }

  function draw() {
    $('#planBody').innerHTML = '<div class="pe">' +
      '<div class="card pe-head"><div class="row" style="align-items:flex-start;gap:14px"><div style="flex:1;min-width:240px"><h3 style="margin:0">🌿 ESG &amp; Sustainability</h3><p class="muted" style="margin:4px 0 0;font-size:13px">This project\'s part in the organisation\'s ESG reporting: greenhouse gases (mostly CO2) for IFRS S2 / AASB S2, TCFD and SBTi, the PMI® GPM® P5™ impact analysis, and its social and governance factors. The figures roll up to the program, and to the CEO, CSO and CFO views.</p></div></div>' +
      '<div id="peStrip">' + strip() + '</div></div>' +
      '<nav class="tabs pe-subs" role="tablist">' + SUBS.map(function (s) { return '<button type="button" class="tab' + (X.sub === s[0] ? ' on' : '') + '" role="tab" aria-selected="' + (X.sub === s[0]) + '" data-pesub="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</nav>' +
      '<div id="peSub">' + body() + '</div></div>';
    var root = $('#planBody');
    root.querySelectorAll('[data-pesub]').forEach(function (b) { b.onclick = function () { X.sub = b.getAttribute('data-pesub'); draw(); }; });
    wire($('#peSub'));
  }
  function tile(label, value, sub, tone) { return '<div class="pe-tile' + (tone ? ' t-' + tone : '') + '"><span>' + esc(label) + '</span><b>' + value + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; }
  function strip() {
    var x = X.calc; if (!x) return '';
    var red = x.reductionPct, cap = x.capT;
    return '<div class="pe-tiles">' +
      tile('Total emissions', nf(x.total) + ' <i>tCO2e</i>', esc(x.method), x.measured ? '' : 'amber') +
      tile(x.s3Off ? 'Scope 1 · 2 (Scope 3 off)' : 'Scope 1 · 2 · 3', nf(x.s1t) + ' · ' + nf(x.s2loc) + (x.s3Off ? '' : ' · ' + nf(x.s3t)), x.measured ? 'tCO2e; Scope 1 and 2 are ' + nf(x.s12Share, 0) + '% of it' : 'Add activity data under Carbon') +
      tile('Carbon budget', cap ? nf(cap) + ' <i>tCO2e</i>' : 'Not set', cap ? (x.overBudget == null ? 'No measured emissions to compare yet' : x.overBudget ? 'Over budget by ' + nf(x.total - cap) + ' t' : 'Within budget') : 'Set it under Carbon', cap && x.overBudget != null ? (x.overBudget ? 'red' : 'green') : '') +
      tile('Against business as usual', red == null ? '–' : (red >= 0 ? '−' : '+') + nf(Math.abs(red)) + '%', x.baseT ? 'Baseline ' + nf(x.baseT) + ' tCO2e' : 'Set the baseline under Carbon', red == null ? '' : red >= 0 ? 'green' : 'red') +
      tile('P5 impact', x.p5avg == null ? '–' : nf(x.p5avg) + ' <i>/ 5</i>', x.p5scored + ' of ' + x.p5.length + ' elements scored' + (x.p5flags.length ? ' · ' + x.p5flags.length + ' to escalate' : ''), x.p5flags.length ? 'red' : x.p5avg >= 3.5 ? 'green' : '') +
      tile('Climate-related risks', String(x.climateRisks.length), 'From the risk register (TCFD / IFRS S2)') + '</div>';
  }
  function body() {
    if (!X.calc) return '';
    return { overview: overview, carbon: carbon, p5: p5, social: social, frameworks: frameworks }[X.sub]();
  }
  function bar(label, v, max, cls, unit) { var w = max > 0 ? Math.max(v > 0 ? 2 : 0, Math.round((v || 0) / max * 100)) : 0; return '<div class="pe-bar"><span>' + esc(label) + '</span><i><em class="' + (cls || '') + '" style="width:' + w + '%"></em></i><b>' + nf(v) + (unit ? ' ' + unit : '') + '</b></div>'; }
  function overview() {
    var x = X.calc, s3 = x.s3, max = Math.max(x.s1t || 0, x.s2loc || 0, s3.travel || 0, s3.freight || 0, s3.waste || 0, s3.water || 0, s3.materials || 0, (x.est || {}).whole || 0);
    var em = x.measured ? bar('Scope 1: fuel used', x.s1t, max, 's1', 't') + bar('Scope 2: electricity (location-based)', x.s2loc, max, 's2', 't') + bar('Scope 3: embodied carbon in materials', s3.materials, max, 's3', 't') + bar('Scope 3: travel', s3.travel, max, 's3', 't') + bar('Scope 3: freight', s3.freight, max, 's3', 't') + bar('Scope 3: waste', s3.waste, max, 's3', 't') + bar('Scope 3: water', s3.water, max, 's3', 't')
      : x.est ? '<p style="margin:0 0 8px">No activity data yet, so this is a <b>spend-based estimate</b> from the project\'s costs (' + nf(x.est.f || 0.35, 2) + ' kg CO2e per dollar): about <b>' + nf(x.est.whole) + ' tCO2e</b> for the whole project' + (x.est.toDate ? ', ' + nf(x.est.toDate) + ' t on the costs so far' : '') + '. Replace it with measured fuel, electricity and materials under Carbon.</p>' : '<p class="muted">Add the project\'s fuel, electricity, travel and materials under Carbon to see its emissions.</p>';
    var pil = X.schema.pillars.map(function (p) { var v = x.p5pillars[p]; return bar(p, v, 5, 'p5', '/ 5'); }).join('');
    var g = x.gov, so = x.soc;
    var facts = [['Charter approved', g.charter ? 'Yes' : 'Not yet'], ['Baseline set', g.baseline ? 'Yes' : 'Not yet'], ['Open risks with an owner', g.risksOwnedPct == null ? '–' : g.risksOwnedPct + '%'], ['Change requests raised', g.changes], ['Stakeholders listed', g.stakeholders], ['Lessons recorded', g.lessons],
      ['Peak workforce', so.workers != null ? nf(so.workers, 0) : '–'], ['Local workforce', so.localPct != null ? nf(so.localPct, 0) + '%' : '–'], ['Lost-time injury frequency', so.ltifr != null ? nf(so.ltifr, 2) + ' per million hours' : '–'], ['Safe work method statements', so.swms]];
    return '<div class="pe-grid"><div class="card"><h3>Greenhouse gas emissions</h3>' + em + '<p class="muted" style="font-size:12px;margin:10px 0 0">Factors: ' + esc(x.factorSet) + '. Counted under the GHG Protocol (operational control). Emissions are shown as CO2-equivalent; on most projects nearly all of it is CO2 from fuel, electricity and materials.</p></div>' +
      '<div class="card"><h3>PMI® GPM® P5™ impact by pillar</h3>' + pil + (x.p5flags.length ? '<p class="pe-flag">⚠ To escalate (scored 1 or 2): ' + esc(x.p5flags.join(', ')) + '</p>' : '') + '<p class="muted" style="font-size:12px;margin:10px 0 0">1 = high negative impact, 3 = neutral, 5 = high positive impact.</p></div>' +
      '<div class="card"><h3>Frameworks this project feeds</h3>' + fwRows() + '</div>' +
      '<div class="card"><h3>Social and governance</h3><table class="tbl pe-kv"><tbody>' + facts.map(function (f) { return '<tr><td>' + esc(f[0]) + '</td><td><b>' + esc(String(f[1])) + '</b></td></tr>'; }).join('') + '</tbody></table>' +
      (x.climateRisks.length ? '<h4 style="margin:14px 0 6px">Climate-related risks</h4><ul class="pe-list">' + x.climateRisks.slice(0, 6).map(function (k) { return '<li>' + esc(k.title) + ' <span class="muted">score ' + k.score + (k.owner ? ' · ' + esc(k.owner) : '') + '</span></li>'; }).join('') + '</ul>' : '<p class="muted" style="font-size:12.5px;margin:12px 0 0">No climate-related risks in the register yet (heat, flood, storm, fire, or carbon and transition risks). Add them under Risks so TCFD and IFRS S2 can use them.</p>') + '</div></div>';
  }
  var NEED = { ghg: 'fuel and electricity data', s3: 'Scope 3 data (materials, travel, freight or waste)', risk: 'a climate-related risk in the register', target: 'a baseline or carbon budget', p5: 'at least 8 P5 elements scored', mat: 'materials quantities', epd: 'at least one EPD factor for a material', soc: 'workforce or hours worked', gov: 'an approved charter and a baseline' };
  function fwRows() { return X.calc.fw.map(function (f) { return '<div class="pe-fw"><div class="row"><b>' + esc(f.name) + '</b><span class="sp"></span><span class="pill t-' + (f.pct >= 100 ? 'green' : f.pct >= 50 ? 'amber' : 'red') + '">' + f.pct + '% ready</span></div>' + (f.missing.length ? '<small class="muted">Still needs: ' + esc(f.missing.map(function (k) { return NEED[k] || k; }).join('; ')) + '</small>' : '') + '</div>'; }).join(''); }
  function num(path, v, unit, ph, attrs) { return '<span class="esg-in"><input type="number" step="any" min="0" inputmode="decimal" data-pe="' + path + '" value="' + (v == null ? '' : esc(String(v))) + '"' + (ph != null ? ' placeholder="' + esc(String(ph)) + '"' : '') + (attrs || '') + '>' + (unit ? '<i>' + esc(unit) + '</i>' : '') + '</span>'; }
  function outBox() { var x = X.calc; return 'Total <b>' + nf(x.total) + ' tCO2e</b> · Scope 1 <b>' + nf(x.s1t) + '</b> · Scope 2 <b>' + nf(x.s2loc) + '</b> (market-based ' + nf(x.s2mkt) + ')' + (x.s3Off ? ' · Scope 3 <b>switched off</b>' : ' · Scope 3 <b>' + nf(x.s3t) + '</b>, of which materials <b>' + nf(x.s3.materials) + '</b>'); }
  function carbon() {
    var e = data(), a = e.act, sc = X.schema, groups = {}; sc.act.forEach(function (f) { (groups[f[3]] = groups[f[3]] || []).push(f); });
    var sets = sc.factorSets || [];
    var sel = '<label>Emission factor set<select data-pe-set>' + sets.map(function (s) { return '<option value="' + esc(s[0]) + '"' + ((e.fset || 'NGA_AU') === s[0] ? ' selected' : '') + '>' + esc(s[1]) + '</option>'; }).join('') + '</select></label>';
    var grp = function (g) { return '<fieldset class="pe-fs"><legend>' + esc(g === 'Materials' ? 'Materials (Scope 3, embodied carbon)' : g) + '</legend><div class="esg-form">' + groups[g].map(function (f) {
      var k = f[0], mat = sc.matEf[k] != null;
      return '<label>' + esc(f[1]) + num('act.' + k, a[k], f[2], null, f[2] === '%' ? ' max="100"' : '') + (mat ? '<small class="muted">Factor ' + num('ef.' + k, e.ef[k], 'tCO2e/' + f[2], sc.matEf[k]) + '</small>' : '') + '</label>'; }).join('') + '</div></fieldset>'; };
    return '<div class="card"><h3>Carbon: what the project uses</h3><p class="muted" style="font-size:13px;margin:0 0 12px">Type the totals for the project so far (or the forecast for the whole project). Scope 1 is fuel burned on site, Scope 2 is grid electricity, Scope 3 is everything else, including the carbon embodied in materials.</p>' +
      '<div class="esg-form">' + sel + '<label>Business-as-usual baseline' + num('baseT', e.baseT, 'tCO2e') + '<small class="muted">What the project would emit without its carbon measures (the reference design).</small></label><label>Carbon budget' + num('capT', e.capT, 'tCO2e') + '<small class="muted">The most this project may emit, from the organisation\'s target.</small></label></div>' +
      Object.keys(groups).filter(function (g) { return !(X.calc.s3Off && (g === 'Scope 3' || g === 'Materials')); }).map(grp).join('') +
      (X.calc.s3Off ? '<p class="muted pe-s3off" style="font-size:13px">🌍 Scope 3 is switched off for this project (⚙ Modules on the project), so travel, freight, waste, water and materials are not asked for or counted. Anything entered before is kept: switch it back on and it is all still there.</p>' : '') + '<p class="muted" style="font-size:12px">' + esc(sc.matNote) + '</p><div class="pe-out" id="peOut">' + outBox() + '</div></div>';
  }
  function p5() {
    var e = data(), sc = X.schema, x = X.calc;
    return '<div class="card"><div class="row" style="align-items:center;gap:10px"><h3 style="margin:0">PMI® GPM® P5™ impact analysis</h3><span class="sp"></span>' + (M.allowed && !M.allowed('projects', 'edit') ? '' : '<button type="button" class="btn btn-sm btn-gold" id="p5Ai" title="Champ writes the blank reasons and actions from this project\'s data (and suggests a score where there is none). You can change every word.">✨ Fill the blanks with AI</button>') + '</div><p class="muted" style="font-size:13px;margin:8px 0 12px">Score the project\'s impact on each element from 1 (high negative) to 5 (high positive), say why, and what you will do. An element scored 1 or 2 is flagged to escalate. The P5 Standard looks at People, Planet and Prosperity, and at the project\'s Process and Product.</p>' +
      sc.pillars.map(function (pil) { return '<h4 class="pe-pil">' + esc(pil) + (x.p5pillars[pil] != null ? ' <span class="muted">' + nf(x.p5pillars[pil]) + ' / 5</span>' : '') + '</h4>' + sc.p5.filter(function (r) { return r[1] === pil; }).map(function (r) {
        var v = e.p5[r[0]] || {};
        return '<div class="pe-p5' + (v.s && v.s <= 2 ? ' bad' : '') + '"><div><b>' + esc(r[2]) + '</b><small class="muted">' + esc(r[3]) + '</small></div><select data-p5s="' + r[0] + '" aria-label="Impact score for ' + esc(r[2]) + '"><option value="">Not scored</option>' + [1, 2, 3, 4, 5].map(function (n) { return '<option value="' + n + '"' + (v.s === n ? ' selected' : '') + '>' + n + ': ' + esc(sc.scale[n]) + '</option>'; }).join('') + '</select>' +
          '<input type="text" maxlength="600" data-p5n="' + r[0] + '" value="' + esc(v.note || '') + '" placeholder="Why this score"><input type="text" maxlength="400" data-p5a="' + r[0] + '" value="' + esc(v.action || '') + '" placeholder="What we will do"></div>'; }).join(''); }).join('') + '</div>';
  }
  function social() {
    var e = data(), s = e.soc, x = X.calc, g = x.gov;
    var F = [['workers', 'Peak workforce on the project', 'people'], ['localPct', 'Workforce from the local area', '%'], ['apprentices', 'Apprentices and trainees', 'people'], ['hours', 'Hours worked', 'hours'], ['injuries', 'Recordable injuries', ''], ['lti', 'Lost-time injuries', ''], ['localSpendPct', 'Spend with local suppliers', '%']];
    if (money()) F.push(['invest', 'Community investment', '$']);
    return '<div class="pe-grid"><div class="card"><h3>Social</h3><div class="esg-form">' + F.map(function (f) { return '<label>' + esc(f[1]) + num('soc.' + f[0], s[f[0]], f[2], null, f[2] === '%' ? ' max="100"' : '') + '</label>'; }).join('') + '</div>' +
      '<p class="muted" style="font-size:12.5px">Lost-time injury frequency: <b>' + (x.soc.ltifr != null ? nf(x.soc.ltifr, 2) + ' per million hours' : 'add hours and lost-time injuries') + '</b>. Safe work method statements on this project: <b>' + x.soc.swms + '</b>.</p></div>' +
      '<div class="card"><h3>Governance (from the project)</h3><ul class="pe-list"><li>' + (g.charter ? '✓ Charter approved' : '○ Charter not approved yet') + '</li><li>' + (g.baseline ? '✓ Baseline set' : '○ No baseline yet') + '</li><li>' + (g.risksOwnedPct == null ? '○ No open risks' : (g.risksOwnedPct === 100 ? '✓ ' : '○ ') + g.risksOwnedPct + '% of open risks have an owner') + '</li><li>' + g.changes + ' change requests through change control</li><li>' + g.stakeholders + ' stakeholders in the register</li><li>' + g.lessons + ' lessons learned recorded</li></ul>' +
      '<label class="full" style="display:block;margin-top:12px">Notes for the ESG report<textarea rows="4" maxlength="1500" data-pe-note>' + esc(e.note || '') + '</textarea></label></div></div>';
  }
  function frameworks() {
    var e = data(), sc = X.schema, on = Array.isArray(e.fw) ? e.fw : ['IFRS_S2', 'GHGP', 'P5'];
    return '<div class="pe-grid"><div class="card"><h3>Which frameworks this project reports into</h3><p class="muted" style="font-size:13px;margin:0 0 10px">Most projects feed the organisation\'s climate disclosures (IFRS S2 / AASB S2, built on TCFD) and its SBTi target, and use the P5 Standard for the project itself. Buildings and infrastructure often add PAS 2080, IS Rating or Green Star; lender-funded projects add the IFC Performance Standards.</p>' +
      sc.fw.map(function (f) { var c = on.indexOf(f[0]) >= 0; return '<label class="esg-stdc' + (c ? ' on' : '') + '"><input type="checkbox" data-pefw="' + f[0] + '"' + (c ? ' checked' : '') + '><div><b>' + esc(f[1]) + '</b><small class="muted">' + esc(f[2]) + '</small></div></label>'; }).join('') + '</div>' +
      '<div class="card"><h3>How ready the data is</h3>' + fwRows() + '<p class="muted" style="font-size:12px;margin:10px 0 0">SBTi reference: the cross-sector 1.5°C pathway cuts Scope 1 and 2 by at least 4.2% a year in absolute terms. SBTi validates the organisation\'s target, not a project; the project shows its contribution through its reduction against business as usual.</p></div></div>';
  }
  function wire(b) {
    if (!b) return;
    b.querySelectorAll('[data-pe]').forEach(function (i) { i.oninput = function () { var e = data(), path = i.getAttribute('data-pe').split('.'), v = i.value === '' ? undefined : Number(i.value); if (path.length === 1) e[path[0]] = v; else { e[path[0]] = e[path[0]] || {}; if (v == null || isNaN(v)) delete e[path[0]][path[1]]; else e[path[0]][path[1]] = v; } changed('ESG data'); }; });
    var st = b.querySelector('[data-pe-set]'); if (st) st.onchange = function () { data().fset = st.value; changed('ESG emission factor set'); };
    b.querySelectorAll('[data-p5s],[data-p5n],[data-p5a]').forEach(function (i) { var evt = i.tagName === 'SELECT' ? 'onchange' : 'oninput'; i[evt] = function () {
      var k = i.getAttribute('data-p5s') || i.getAttribute('data-p5n') || i.getAttribute('data-p5a'), e = data(), o = e.p5[k] = e.p5[k] || {};
      if (i.hasAttribute('data-p5s')) { o.s = Number(i.value) || 0; i.closest('.pe-p5').classList.toggle('bad', o.s > 0 && o.s <= 2); } else if (i.hasAttribute('data-p5n')) o.note = i.value; else o.action = i.value;
      changed('P5 impact analysis'); }; });
    b.querySelectorAll('[data-pefw]').forEach(function (cb) { cb.onchange = function () { var e = data(), cur = Array.isArray(e.fw) ? e.fw.slice() : ['IFRS_S2', 'GHGP', 'P5'], id = cb.getAttribute('data-pefw'); cur = cur.filter(function (x) { return x !== id; }); if (cb.checked) cur.push(id); e.fw = cur; cb.closest('.esg-stdc').classList.toggle('on', cb.checked); changed('ESG frameworks'); }; });
    var ai = b.querySelector('#p5Ai'); if (ai) ai.onclick = function () {   // ✨ the AI fills only what is blank; the user's own words stay
      var core = X.core, id = 'p5' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); ai.disabled = true; ai.textContent = '✨ Champ is writing…';
      var done = function () { ai.disabled = false; ai.textContent = '✨ Fill the blanks with AI'; };
      fetch('/.netlify/functions/planai-background', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1', 'X-Champ-Lang': (window.ChampI18n && window.ChampI18n.get()) || 'en' }, body: JSON.stringify({ id: id, mode: 'p5Fill', core: core, esg: plan().esg || null }) })
        .then(function (r) { if (r.status === 401 || r.status === 403) throw new Error('Your session has ended, or you can view this project only.'); if (r.status !== 202 && !r.ok) throw new Error('Could not start the AI (' + r.status + ')'); })
        .then(function () { var t0 = Date.now(); return new Promise(function (res, rej) { (function go() { setTimeout(function () { api('planAiStatus', { id: id }).then(function (st) { if (st.status === 'done') return res(st.result || {}); if (st.status === 'error') return rej(new Error(st.error || 'The AI could not finish')); if (Date.now() - t0 > 300000) return rej(new Error('The AI is taking too long. Try again.')); go(); }, rej); }, 2500); })(); }); })
        .then(function (r) {
          if (C.S.core !== core) return; var e = data(), n = 0, f = r.fill || {};
          var moved = 0; Object.keys(f).forEach(function (k) { var o = e.p5[k] = e.p5[k] || {}, a = f[k];
            if (o.s && a.for && o.s !== a.for) { moved++; return; }   // the score was changed while Champ wrote: its reason would describe another score
            if (a.s && !o.s) { o.s = a.s; n++; } if (a.note && !o.note) { o.note = a.note; n++; } if (a.action && !o.action) { o.action = a.action; n++; } });
          if (moved) M.toast(moved + ' element(s) were re-scored while Champ wrote, so their reasons were left blank: press the button again for them.');
          if (n) { changed('P5 reasons and actions (AI)'); M.toast('✨ Champ filled ' + n + ' blanks. Read them through and change anything that is not right.'); } else M.toast(r.note || 'Nothing was left blank.');
          done(); if (C.S.tab === 'esg' && X.sub === 'p5') draw();
        }).catch(function (e) { done(); fail(e); });
    };
    var nt = b.querySelector('[data-pe-note]'); if (nt) nt.oninput = function () { data().note = nt.value; C.dirty('ESG notes'); };
  }
  M.pesgTab = tab;

  /* ---------- 🗂 the portfolio card: CEO, CSO, Finance (CFO), PMO, Program and Programs views ---------- */
  var PV = { at: 0, d: null, p: null, who: '' };
  var whoAmI = function () { var m = M.me || {}; return [m.user || m.username || m.name || '', m.role || '', m.money === false ? 0 : 1].join('|'); };
  var KIND = { ceo: 'ceo', cso: 'cso', finance: 'cfo', pmo: 'pmo', pgm: 'pgm', programs: 'programs' };
  function getPortfolio(force) { var me = whoAmI(); if (PV.who !== me) PV = { at: 0, d: null, p: null, who: me };   // kept per signed-in login, never shown to the next one
    if (!force && PV.d && Date.now() - PV.at < 60000) return Promise.resolve(PV.d); if (PV.p) return PV.p;
    var p = PV.p = api('planEsgPortfolioGet', {}).then(function (d) { if (whoAmI() !== me) throw new Error('Signed in as someone else: reload the page.'); if (PV.p === p) PV = { at: Date.now(), d: d, p: null, who: me }; return d; }, function (e) { if (PV.p === p) PV.p = null; throw e; }); return p; }
  function card(kind, d) {
    var T = d.totals, cfo = kind === 'cfo', cso = kind === 'cso', cur = d.cur || 'AUD', cost = T.carbonCost != null;
    var head = { ceo: 'How the projects are doing on ESG and carbon', cso: 'Projects and programs: emissions and P5 impact', cfo: 'Carbon in the projects: emissions and carbon cost', pmo: 'ESG across the programs', pgm: 'ESG in your programs', programs: 'ESG by program' }[kind] || 'ESG & Sustainability of the projects';
    var tiles = '<div class="pe-tiles">' + tile('Project emissions', nf(T.total) + ' <i>tCO2e</i>', T.measured + ' of ' + T.projects + ' projects measured; the rest estimated from costs', T.measured < T.projects ? 'amber' : '') +
      tile('Scope 1 · 2 · 3', nf(T.s1) + ' · ' + nf(T.s2) + ' · ' + nf(T.s3), 'of which ' + nf(T.materials) + ' t embodied in materials') +
      (cfo || kind === 'ceo' ? tile('Carbon cost', cost ? M.money(T.carbonCost).replace('$', cur === 'AUD' ? 'A$' : cur + ' ') : 'No carbon price', cost ? 'at ' + cur + ' ' + nf(d.price, 2) + ' a tonne (internal price)' : 'Set an internal carbon price below', cost ? '' : 'amber') : '') +
      (T.intensity != null ? tile('Intensity', nf(T.intensity) + ' <i>t per $1M</i>', 'tCO2e per million of project budget') : '') +
      tile('P5 impact', T.p5avg == null ? '–' : nf(T.p5avg) + ' <i>/ 5</i>', T.p5flags + ' element(s) to escalate', T.p5flags ? 'red' : '') +
      tile('Climate-related risks', String(T.climateRisks), T.overBudget ? T.overBudget + ' project(s) over their carbon budget' : 'in the project risk registers', T.overBudget ? 'red' : '') + '</div>';
    var progs = d.programs.length ? '<div class="tbl-wrap"><table class="tbl pe-tbl"><thead><tr><th>Program</th><th>Projects</th><th>tCO2e</th><th>Scope 1</th><th>Scope 2</th><th>Scope 3</th>' + (cost ? '<th>Carbon cost</th>' : '') + '<th>P5</th><th>Climate risks</th></tr></thead><tbody>' +
      d.programs.map(function (p) { return '<tr><td><b>' + esc(p.name) + '</b></td><td>' + p.projects + ' <small class="muted">(' + p.measured + ' measured)</small></td><td>' + nf(p.total) + '</td><td>' + nf(p.s1) + '</td><td>' + nf(p.s2) + '</td><td>' + nf(p.s3) + '</td>' + (cost ? '<td>' + M.money(p.carbonCost || 0) + '</td>' : '') + '<td>' + (p.p5avg == null ? '–' : nf(p.p5avg)) + '</td><td>' + p.climateRisks + '</td></tr>'; }).join('') + '</tbody></table></div>' : '';
    var top = d.projects.slice(0, cso ? 12 : 6);
    var projs = top.length ? '<h4 style="margin:14px 0 6px">' + (cso ? 'Projects' : 'Largest emitters') + '</h4><div class="tbl-wrap"><table class="tbl pe-tbl"><thead><tr><th>Project</th><th>Program</th><th>tCO2e</th><th>Method</th>' + (cost ? '<th>Carbon cost</th>' : '') + '<th>Carbon budget</th><th>P5</th></tr></thead><tbody>' +
      top.map(function (r) { return '<tr><td><a href="#plan/' + esc(r.core) + '/esg">' + esc(r.name) + '</a></td><td>' + esc(r.program) + '</td><td><b>' + nf(r.total) + '</b></td><td><small>' + esc(r.measured ? 'Measured' : r.total != null ? 'Estimated from costs' : 'No data') + '</small></td>' + (cost ? '<td>' + (r.carbonCost == null ? '–' : M.money(r.carbonCost)) + '</td>' : '') + '<td>' + (r.capT ? (r.overBudget ? '<span class="pill t-red">Over</span>' : '<span class="pill t-green">Within</span>') : '–') + '</td><td>' + (r.p5avg == null ? '–' : nf(r.p5avg)) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted">No projects yet.</p>';
    var canPrice = cfo || kind === 'ceo', who = M.me || {}, may = who.owner || who.role === 'CEO' || who.role === 'CFO';
    var price = canPrice && d.cur !== undefined && may ? '<details class="pe-price"><summary>Internal carbon price</summary><div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><label>Price per tCO2e<span class="esg-in"><input type="number" min="0" step="any" id="pePrice" value="' + (d.price == null ? '' : d.price) + '"><i>' + esc(cur) + '</i></span></label><label>Currency<input id="peCur" maxlength="3" value="' + esc(cur) + '" style="width:80px"></label><button class="btn btn-sm" id="pePriceGo">Save</button></div><small class="muted">The price the business puts on each tonne for decisions (a shadow price). It does not change the emissions.</small></details>' : '';
    return '<div class="card pe-card" id="peCard"><div class="row"><h3 style="margin:0">🌿 ' + esc(head) + '</h3><span class="sp"></span><span class="muted" style="font-size:12.5px">IFRS S2 · TCFD · SBTi · PMI GPM P5</span></div>' + tiles + progs + projs + price + '<p class="muted" style="font-size:12px;margin:10px 0 0">' + esc(d.note) + '</p></div>';
  }
  function mount() {
    var h = (location.hash || '').replace(/^#/, '').split('/'), kind = KIND[h[0]], v = M.view && M.view();
    if (!kind || !v || h[1] || document.getElementById('peCard') || v.querySelector('.empty:only-child')) return;
    var host = document.createElement('div'); host.id = 'peCard'; host.className = 'card pe-card'; host.innerHTML = '<p class="muted" style="margin:0">🌿 Gathering the projects\' ESG figures…</p>'; v.appendChild(host);
    getPortfolio().then(function (d) { if (!host.isConnected) return; host.outerHTML = card(kind, d); var go = document.getElementById('pePriceGo');
      if (go) go.onclick = function () { go.disabled = true; api('planEsgSettingsSave', { price: $('#pePrice').value, cur: $('#peCur').value.toUpperCase(), rev: (PV.d || {}).rev || 0 }).then(function () { M.toast('Carbon price saved'); var c = document.getElementById('peCard'); if (c) c.remove(); return getPortfolio(true).then(mount); }).catch(fail).then(function () { go.disabled = false; }); }; })
      .catch(function (e) { if (host.isConnected) host.innerHTML = '<p class="muted" style="margin:0">🌿 ' + esc(e.message || 'The projects\' ESG figures could not be loaded.') + '</p>'; });
  }
  var mt = 0; function soon() { clearTimeout(mt); mt = setTimeout(mount, 250); }
  function watch() { var v = document.getElementById('view'); if (!v) return setTimeout(watch, 500); new MutationObserver(soon).observe(v, { childList: true }); window.addEventListener('hashchange', soon); soon(); }
  watch();
  M.pesg = { portfolio: getPortfolio, mount: mount };
})();
