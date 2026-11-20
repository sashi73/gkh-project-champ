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
    if (!A.contract && !A.quoted && !A.invoiced && !A.received) return '<h4 class="ceo-sub">Cost</h4>' + c + '<h4 class="ceo-sub">Revenue and profit</h4><div class="ceo-none">💡 <b>Not tracked yet.</b> No project has an accepted quote or an invoice in Champ, so contract value, invoiced, received and profit cannot be worked out. They fill in as soon as quotes and invoices are recorded against projects.</div>';
    var r = '<div class="ceo-ts">' + tile('Contract value', money(A.contract), A.quoted ? '+ ' + money(A.quoted) + ' quoted, not yet accepted' : 'accepted quotes') +
      tile('Invoiced', money(A.invoiced), A.price ? Math.round(A.invoiced / A.price * 100) + '% of the price' : '') + tile('Received', money(A.received), A.invoiced ? Math.round(A.received / A.invoiced * 100) + '% of invoiced' : '') +
      tile('Still owed', money(A.owed), A.overdue ? '<b class="ceo-neg">' + money(A.overdue) + ' overdue</b>' : 'none overdue', A.overdue ? 'neg' : '') +
      tile('Forecast profit', A.profit == null ? '–' : money(A.profit), A.margin == null ? 'no prices yet' : A.margin + '% margin' + (A.unpriced ? ' · ' + A.unpriced + ' project' + (A.unpriced === 1 ? '' : 's') + ' not priced' : ''), A.profit != null && A.profit < 0 ? 'neg' : 'pos') + '</div>';
    return '<h4 class="ceo-sub">Cost</h4>' + c + '<h4 class="ceo-sub">Revenue and profit</h4>' + r;
  }
  function pill(c, n, w) { return n ? '<span class="ceo-pill ' + c + '" title="' + n + ' project' + (n === 1 ? '' : 's') + ' ' + w + '">' + n + '</span>' : ''; }
  function programs(P) {
    return '<div class="table-wrap"><table class="ceo-tab"><thead><tr><th>Program</th><th>Health</th><th class="num">Budget</th><th class="num">Spent</th><th class="num">Forecast</th><th class="num">Over / under</th><th class="num">Contract</th><th class="num">Invoiced</th><th class="num">Received</th><th class="num">Profit</th></tr></thead><tbody>' +
      P.map(function (p) { return '<tr><td><b>' + esc(p.name) + '</b><small>' + p.n + ' project' + (p.n === 1 ? '' : 's') + '</small></td><td class="nowrap">' + pill('red', p.red, 'in trouble') + pill('amber', p.amber, 'at risk') + pill('green', p.green, 'on track') + '</td>' +
        '<td class="num">' + money(p.budget) + '</td><td class="num">' + money(p.spent) + '</td><td class="num">' + money(p.eac) + '</td><td class="num">' + (p.vac < -0.5 ? '<b class="ceo-neg">' + money(p.vac) + '</b>' : '<span class="ceo-pos">' + money(p.vac) + '</span>') + '</td>' +
        '<td class="num">' + money(p.contract || p.quoted) + '</td><td class="num">' + money(p.invoiced) + '</td><td class="num">' + money(p.received) + '</td><td class="num">' + (p.profit == null ? '<span class="muted">–</span>' : '<b class="' + (p.profit < 0 ? 'ceo-neg' : 'ceo-pos') + '">' + money(p.profit) + '</b><small>' + p.margin + '%</small>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  // ---------- 🎙 Champ's CEO briefing ----------
  var VERD = { turnaround: ['red', '🚨'], steady: ['amber', '⚖'], keep: ['green', '🏆'] };
  function list(L) { return L && L.length ? '<ol class="ceo-bl">' + L.map(function (x) { return '<li><b>' + esc(x.title) + '</b><span>' + esc(x.detail) + '</span></li>'; }).join('') + '</ol>' : ''; }
  function briefHtml() {
    var B = D.brief;
    if (!B) return '<section class="card ceo-s ceo-brief"><div class="ceo-bh"><div><h3>🎙 Champ\'s CEO briefing</h3><p class="muted">Champ reads everything on this page and tells you how it stands: the overview, what to be concerned about, quick wins, the cash flow, and the strategy and way forward, with a turnaround plan if it is needed. It can read it out.</p></div><button class="btn btn-gold" id="ceoBrief" type="button">🎙 Get Champ\'s briefing</button></div></section>';
    var v = VERD[B.verdict] || VERD.steady, when = new Date(B.at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    return '<section class="card ceo-s ceo-brief ' + v[0] + '"><div class="ceo-bh"><div><span class="ceo-verd ' + v[0] + '">' + v[1] + ' ' + esc(B.plan_name) + '</span><h3>' + esc(B.headline) + '</h3><p class="muted">Champ\'s briefing · written ' + esc(when) + '</p></div>' +
      '<div class="row" style="gap:6px"><button class="btn btn-gold" id="ceoRead" type="button">' + (TT.on ? '⏹ Stop' : '▶ Read it out') + '</button><button class="btn btn-sm" id="ceoBrief" type="button">↻ Fresh briefing</button></div></div>' +
      '<div class="ceo-bg"><div><h4 class="ceo-sub">Overview</h4><p>' + esc(B.overview) + '</p>' + (B.cash_view ? '<h4 class="ceo-sub">🔮 Cash flow: Champ\'s crystal ball</h4><p>' + esc(B.cash_view) + '</p>' : '') + '</div>' +
      '<div><h4 class="ceo-sub">⚠ Things to be concerned about</h4>' + list(B.concerns) + '</div><div><h4 class="ceo-sub">⚡ Quick wins (next 2 weeks)</h4>' + list(B.quick_wins) + '</div>' +
      '<div><h4 class="ceo-sub">🧭 Strategy and way forward</h4>' + list(B.strategy) + (B.road_ahead ? '<p class="ceo-road"><b>The road ahead.</b> ' + esc(B.road_ahead) + '</p>' : '') + '</div></div>' +
      (B.plan && B.plan.length ? '<h4 class="ceo-sub">🗓 ' + esc(B.plan_name) + '</h4><div class="ceo-plan">' + B.plan.map(function (x) { return '<div><b>' + esc(x.when) + '</b><span>' + esc(x.what) + '</span></div>'; }).join('') + '</div>' : '') + '</section>';
  }
  // a long job (the AI takes up to a couple of minutes): the background function, then ask for the result until it is ready
  function bgJob(body) {
    var id = (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g, '').slice(0, 24); body.id = id;
    return fetch('/.netlify/functions/planai-background', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-MBS-Admin': '1', 'X-Champ-Lang': (window.ChampI18n && window.ChampI18n.get()) || 'en' }, body: JSON.stringify(body) })
      .then(function (r) { if (r.status === 401 || r.status === 403) throw new Error('Your session has ended. Sign in again.'); if (r.status !== 202 && !r.ok) throw new Error('Champ could not start (' + r.status + '). Try again.'); })
      .then(function () { var t0 = Date.now(); return new Promise(function (ok, no) { (function tick() { api('planAiStatus', { id: id }).then(function (x) { if (x.status === 'done') return ok(x); if (x.status === 'error') return no(new Error(x.error || 'Champ could not finish.')); if (Date.now() - t0 > 170000) return no(new Error('Champ is taking too long. Try again.')); setTimeout(tick, 2500); }).catch(function () { setTimeout(tick, 4000); }); })(); }); });
  }
  function makeBrief(b, filter) {
    b.disabled = true; b.textContent = '🎙 Champ is reading the portfolio…';
    bgJob({ mode: 'ceoBrief' }).then(function (x) { D.brief = x.brief; draw(filter); toast('🎙 Champ\'s briefing is ready'); var rd = document.getElementById('ceoRead'); if (rd) readOut(D.brief.say || D.brief.overview, rd); })
      .catch(function (e) { b.disabled = false; b.textContent = '🎙 Get Champ\'s briefing'; fail(e); });
  }
  var HIST = [];
  M.ceoAsk = function (q) { return bgJob({ mode: 'ceoAsk', q: q, history: HIST.slice(-4) }).then(function (x) { var a = x.answer || {}; HIST.push({ q: q, a: (a.answer || '') + ' Decision: ' + (a.decision || '') }); return a; }); };
  // ▶ read it out: Champ's voice (Azure), part by part; the browser's own voice if Azure is not there
  var TT = { on: false, n: 0, a: null };
  function stopRead() { TT.n++; TT.on = false; if (TT.a) { try { TT.a.pause(); } catch (e) {} TT.a = null; } if (window.ChampVoice) window.ChampVoice.stop(); var b = document.getElementById('ceoRead'); if (b) b.textContent = '▶ Read it out'; }
  function readOut(text, btn) {
    if (M.champHush) M.champHush(); stopRead(); if (!text) return; var n = TT.n, lang = (window.ChampI18n && window.ChampI18n.get()) || 'en';
    var parts = (String(text).match(/[^.!?]+[.!?]+["')]?\s*|[^.!?]+$/g) || [text]).reduce(function (a, x) { if (a.length && (a[a.length - 1] + x).length < 320) a[a.length - 1] += x; else a.push(x); return a; }, []);
    TT.on = true; if (btn) btn.textContent = '⏹ Stop';
    var done = function () { if (n === TT.n) stopRead(); };
    var browser = function (i) { if (window.ChampVoice && window.ChampVoice.say(parts.slice(i).join(' '), lang, done)) return; done(); };
    var get = function (i) { return fetch('/.netlify/functions/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: parts[i], lang: lang }) }).then(function (r) { if (!r.ok) throw new Error('no voice'); return r.blob(); }); };
    var next = null;
    (function play(i, pre) {
      if (n !== TT.n) return; if (i >= parts.length) return done();
      (pre || get(i)).then(function (bl) { if (n !== TT.n) return; var nx = i + 1 < parts.length ? get(i + 1) : null; if (nx) nx.catch(function () {}); var a = new Audio(URL.createObjectURL(bl)); TT.a = a; a.onended = function () { play(i + 1, nx); }; return a.play(); })
        .catch(function (e) { if (n !== TT.n) return; if (e && e.name === 'NotAllowedError') { done(); toast('Tap ▶ Read it out to hear Champ'); return; } browser(i); });
    })(0, next);
  }
  window.addEventListener('hashchange', function () { if (!/^#ceo/.test(location.hash)) stopRead(); });   // leaving the CEO view: Champ stops talking

  // ---------- 💧 cash flow: the crystal ball ----------
  function cashChart(C) {
    var L = C.months, W = 760, H = 230, top = 16, bot = 26, bw = W / L.length;
    var hi = Math.max(1, Math.max.apply(null, L.map(function (m) { return Math.max(m.in, m.out, m.position, 0); }))), lo = Math.min(0, Math.min.apply(null, L.map(function (m) { return m.position; })));
    var y = function (v) { return top + (hi - v) / (hi - lo) * (H - top - bot); }, z = y(0), fx = L.findIndex(function (m) { return !m.actual; });
    var out = (fx > 0 ? '<rect x="' + fx * bw + '" y="' + top + '" width="' + (W - fx * bw) + '" height="' + (H - top - bot) + '" class="cf-fc"/><text x="' + (fx * bw + 4) + '" y="' + (top + 10) + '" class="cf-lab">Forecast →</text>' : '') +
      '<line x1="0" x2="' + W + '" y1="' + z + '" y2="' + z + '" class="cf-zero"/>';
    L.forEach(function (m, i) { var x = i * bw, nm = new Date(m.month + '-01T00:00:00Z').toLocaleDateString('en-AU', { month: 'short', timeZone: 'UTC' }) + (m.month.slice(5) === '01' ? ' ' + m.month.slice(2, 4) : '');
      out += '<rect x="' + (x + bw * .16) + '" y="' + y(m.in) + '" width="' + bw * .32 + '" height="' + Math.max(0, z - y(m.in)) + '" class="cf-in"><title>' + nm + ': in ' + money(m.in, 1) + '</title></rect>' +
        '<rect x="' + (x + bw * .52) + '" y="' + y(m.out) + '" width="' + bw * .32 + '" height="' + Math.max(0, z - y(m.out)) + '" class="cf-out"><title>' + nm + ': out ' + money(m.out, 1) + '</title></rect>' +
        '<text x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" class="cf-m' + (m.now ? ' now' : '') + '">' + nm + '</text>'; });
    out += '<polyline class="cf-pos" points="' + L.map(function (m, i) { return (i * bw + bw / 2) + ',' + y(m.position); }).join(' ') + '"/>' + L.map(function (m, i) { return '<circle cx="' + (i * bw + bw / 2) + '" cy="' + y(m.position) + '" r="3" class="cf-dot' + (m.position < 0 ? ' neg' : '') + '"><title>' + m.month + ': running position ' + money(m.position, 1) + '</title></circle>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ceo-flow">' + out + '</svg><div class="ceo-leg"><span><i class="cf-in"></i>Money in</span><span><i class="cf-out"></i>Cost out</span><span><i class="cf-posk"></i>Running position</span><span class="muted">Shaded: forecast</span></div>';
  }
  function cashHtml() {
    var C = D.cash; if (!C) return '';
    var mon = function (k) { return new Date(k + '-01T00:00:00Z').toLocaleDateString('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' }); };
    var cls = { red: 'neg', amber: 'warn', green: 'pos' }[C.health];
    return '<section class="card ceo-s"><h3>3 · 💧 Cash flow: the crystal ball <span class="ceo-verd ' + C.health + '">' + esc(C.word) + '</span></h3>' +
      '<div class="ceo-ts">' + tile('Money in, next 6 months', money(C.in6), 'payments, invoices due, milestones to bill') + tile('Cost out, next 6 months', money(C.out6), 'the plans\' costs by month') +
      tile('Cover', C.cover6 == null ? '–' : C.cover6.toFixed(2) + '×', 'money in ÷ cost out', C.cover6 != null && C.cover6 < 1 ? 'neg' : 'pos') + tile('Lowest point', money(C.low.position), mon(C.low.month), C.low.position < 0 ? 'neg' : '') +
      tile('Where we end up', money(C.end.position), 'by ' + mon(C.end.month), C.end.position < 0 ? 'neg' : 'pos') + '</div>' +
      ((D.brief && D.brief.cash_view) ? '<p class="ceo-cv">🔮 <b>Champ\'s view:</b> ' + esc(D.brief.cash_view) + '</p>' : '<p class="ceo-f">🔮 Get Champ\'s briefing (top of the page) for its view of the cash flow.</p>') +
      cashChart(C) +
      '<h4 class="ceo-sub">By quarter</h4><div class="table-wrap"><table class="ceo-tab"><thead><tr><th>Quarter</th><th class="num">Money in</th><th class="num">Cost out</th><th class="num">Net</th><th class="num">Position at the end</th><th></th></tr></thead><tbody>' +
      C.quarters.map(function (q) { return '<tr><td><b>' + esc(q.quarter) + '</b></td><td class="num">' + money(q.in) + '</td><td class="num">' + money(q.out) + '</td><td class="num"><b class="' + (q.net < 0 ? 'ceo-neg' : 'ceo-pos') + '">' + money(q.net) + '</b></td><td class="num">' + money(q.position) + '</td><td><small class="muted">' + (q.actual ? 'actual' : 'forecast') + '</small></td></tr>'; }).join('') + '</tbody></table></div>' +
      '<details class="ceo-det"><summary>Month by month</summary><div class="table-wrap"><table class="ceo-tab"><thead><tr><th>Month</th><th class="num">Money in</th><th class="num">Cost out</th><th class="num">Net</th><th class="num">Running position</th><th></th></tr></thead><tbody>' +
      C.months.map(function (m) { return '<tr' + (m.now ? ' class="ceo-nowr"' : '') + '><td>' + esc(mon(m.month)) + '</td><td class="num">' + money(m.in) + '</td><td class="num">' + money(m.out) + '</td><td class="num ' + (m.net < 0 ? 'ceo-neg' : 'ceo-pos') + '">' + money(m.net) + '</td><td class="num' + (m.position < 0 ? ' ceo-neg' : '') + '">' + money(m.position) + '</td><td><small class="muted">' + (m.now ? 'this month' : m.actual ? 'actual' : 'forecast') + '</small></td></tr>'; }).join('') + '</tbody></table></div></details>' +
      '<p class="muted ceo-note">Before tax. Money in: payments received (actual), then unpaid invoices on their due date (late ones next month) and milestones still to bill, 30 days after they fall due. Cost out: each plan\'s cost spread over its tasks\' dates. ' +
      (C.lateIn ? money(C.lateIn) + ' of it is already overdue. ' : '') + (C.unscheduled ? money(C.unscheduled) + ' of contract value is not on a milestone yet, so it is not in the forecast. ' : '') + '</p></section>';
  }
  function draw(filter) {
    var A = D.all, L = D.rows.filter(function (r) { return !r.closed && (!filter || r.health === filter); });
    var ov = D.overspends.length ? '<ol class="ceo-ov">' + D.overspends.map(function (o) { return '<li data-core="' + esc(o.core) + '"><b>' + esc(o.name) + '</b> <span class="muted">' + esc(o.program) + '</span><b class="ceo-neg">' + money(o.vac) + (o.over ? ' (' + Math.round(o.over) + '% over)' : '') + '</b></li>'; }).join('') + '</ol>' : '<p class="muted">No project is forecast to go over its budget.</p>';
    M.view().innerHTML = '<div class="ceo">' +
      '<div class="row ceo-head"><div><p class="muted">' + esc(new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) + ' · ' + A.n + ' live project' + (A.n === 1 ? '' : 's') + (D.closed ? ', ' + D.closed + ' closed' : '') + (D.since ? ' · ▲▼ compared with ' + esc(day(D.since)) : ' · the ▲▼ arrows start after a week') + '</p></div>' +
      '<div class="row" style="gap:6px"><button class="btn btn-sm" id="ceoRe" type="button">⟳ Refresh</button><button class="btn btn-sm" id="ceoPr" type="button">🖨 Print / PDF</button></div></div>' +
      briefHtml() + '<section class="card ceo-s"><h3>1 · How are the projects doing?</h3>' + health(A) +
      '<p class="ceo-f">' + (filter ? 'Showing <b>' + esc(HW[filter]) + '</b> only · <a href="#" id="ceoAll">show all</a>' : 'Worst first. Tap a count to show only those, or a project to open it.') + '</p>' +
      '<div class="table-wrap"><table class="ceo-tab ceo-rows"><thead><tr><th></th><th>Project</th><th class="hide-sm">Phase</th><th>Done</th><th>SPI</th><th>CPI</th><th>Finish</th><th class="num">Cost vs budget</th><th class="num">Profit</th></tr></thead><tbody>' + rowsHtml(L) + '</tbody></table></div></section>' +
      '<section class="card ceo-s"><h3>2 · Where\'s the money?</h3>' + money2(A) +
      '<h4 class="ceo-sub">Biggest forecast overspends</h4>' + ov +
      '<h4 class="ceo-sub">By program</h4><p class="ceo-legend">Health: how many of the program\'s projects are <span class="ceo-pill red">n</span> in trouble, <span class="ceo-pill amber">n</span> at risk and <span class="ceo-pill green">n</span> on track. Over / under: forecast cost against budget.</p>' + programs(D.byProgram) + '</section>' + cashHtml() +
      '<p class="muted ceo-note">Red: SPI or CPI under 0.90, or serious slippage, overspend, late work or risks (the same rules as Champ\'s watch). Amber: slipping. Forecast at completion = budget ÷ CPI. Profit = contract value (or the open quote) − forecast cost. Amounts exclude tax.</p></div>';
    var v = M.view();
    v.querySelectorAll('[data-hf]').forEach(function (b) { b.onclick = function () { draw(filter === b.getAttribute('data-hf') ? '' : b.getAttribute('data-hf')); }; });
    var a = v.querySelector('#ceoAll'); if (a) a.onclick = function (e) { e.preventDefault(); draw(''); };
    v.querySelectorAll('[data-core]').forEach(function (r) { r.onclick = function () { location.hash = '#plan/' + encodeURIComponent(r.getAttribute('data-core')) + '/schedule'; }; });
    v.querySelector('#ceoRe').onclick = function () { load().then(function () { draw(filter); toast('Up to date'); }).catch(fail); };
    v.querySelector('#ceoPr').onclick = function () { window.print(); };
    var bg = v.querySelector('#ceoBrief'); if (bg) bg.onclick = function () { makeBrief(bg, filter); };
    var rd = v.querySelector('#ceoRead'); if (rd) rd.onclick = function () { if (TT.on) { stopRead(); return; } readOut(D.brief.say || D.brief.overview, rd); };
  }
  function load() { return api('planCeoGet', { today: today() }).then(function (d) { D = d; }); }
  M.addView('ceo', 'CEO view', function () { M.view().innerHTML = '<div class="empty">Gathering every project…</div>'; return load().then(function () { draw(''); }); }, 'ceo');
})();
