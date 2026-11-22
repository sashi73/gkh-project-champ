/* GKH Project Champ on a phone. Detects the phone and its OS (iPhone / Android), then:
   - home page: the intro plays as usual, then a phone landing page (what Champ is, ▶ the 2-minute film, your language, a big Login)
   - login page: just the sign-in card
   - console (/admin/): only 🎯 Today, like a messenger (admin/champ-phone-app.js)
   No AI chat and no voice on phones. Tablets and computers keep the full site.
   ?phone=1 shows it on a computer (for testing). A phone always gets the phone version: there is no switch to the full website. */
(function () {
  'use strict';
  var ua = navigator.userAgent || '', q = location.search, ls = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
  if (/[?&]phone=1/.test(q)) ls('champPhone', '1'); else if (/[?&]phone=0/.test(q)) ls('champPhone', null);
  var ver = function (re) { var m = ua.match(re); return m ? m[1].replace(/_/g, '.') : ''; };
  var os = /iPhone|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows Phone/.test(ua) ? 'Windows Phone' : '';
  var osVer = os === 'iOS' ? ver(/OS (\d+[_.]\d+(?:[_.]\d+)?)/) : os === 'Android' ? ver(/Android (\d+(?:\.\d+)*)/) : '';
  var model = os === 'iOS' ? 'iPhone' : os === 'Android' ? ((ua.match(/Android [^;)]*;\s*([^;)]+?)(?:\s+Build\/[^;)]*)?\)/) || [])[1] || 'Android phone').replace(/^wv$|^K$/, 'Android phone') : '';
  var uaPhone = /iPhone|iPod|Windows Phone/.test(ua) || (/Android/.test(ua) && /Mobile/.test(ua)) || !!(navigator.userAgentData && navigator.userAgentData.mobile);
  var small = window.matchMedia && matchMedia('(max-width: 600px) and (pointer: coarse)').matches;   // a phone that hides its name
  // a phone always gets the phone website (never the full one); ?phone=1 shows it on a computer for testing
  var force = ls('champPhone'); if (force === '0') { ls('champPhone', null); force = null; }
  var is = uaPhone || small || force === '1';
  if (!os && is) os = /Mac/.test(ua) ? 'iOS' : 'Phone';
  window.ChampPhone = { is: is, os: os, osVer: osVer, model: model, label: (model || 'Phone') + (os && os !== model ? ' · ' + os + (osVer ? ' ' + osVer : '') : '') };
  if (!is) return;
  var root = document.documentElement; root.classList.add('ph'); root.classList.add('ph-' + (os === 'iOS' ? 'ios' : os === 'Android' ? 'android' : 'other'));
  var path = location.pathname, page = /\/admin\//.test(path) ? 'admin' : /login(\.html)?$/.test(path) ? 'login' : /(^\/$|index(\.html)?$)/.test(path) ? 'home' : 'other';
  root.classList.add('ph-' + page);
  if (page === 'admin') return;   // the console builds its own screen
  if (page === 'other') {   // 📱 the other website pages are not for phones: their short version on the phone page instead (the privacy notice and the film stay)
    if (window.top !== window || /privacy|promo|404/.test(path)) return;
    var to = /about/.test(path) ? '#ph-about' : /industries/.test(path) ? '#ph-who' : /contact/.test(path) ? '#ph-contact' : '';
    location.replace('/' + to); return;
  }

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var LANGS = [['en', 'English'], ['ms', 'Bahasa Melayu'], ['id', 'Bahasa Indonesia'], ['ta', 'தமிழ்'], ['zh', '简体中文'], ['hi', 'हिन्दी'], ['ar', 'العربية'], ['fa', 'فارسی'], ['vi', 'Tiếng Việt'],
    ['th', 'ไทย'], ['tl', 'Filipino'], ['ja', '日本語'], ['ko', '한국어'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['pt', 'Português'], ['sw', 'Kiswahili'], ['rw', 'Kinyarwanda'], ['km', 'ខ្មែរ (Khmer)']];
  function langSel(id, compact) {
    var cur = ls('champLang') || 'en';
    return '<label class="ph-lang' + (compact ? ' ph-lang-s' : '') + '"><span>🌐' + (compact ? '' : ' Language') + '</span><select id="' + id + '" data-noi18n aria-label="Language">' + LANGS.map(function (l) { return '<option value="' + l[0] + '"' + (l[0] === cur ? ' selected' : '') + '>' + esc(l[1]) + '</option>'; }).join('') + '</select></label>';
  }
  function wireLang(id) { var s = document.getElementById(id); if (!s) return; s.onchange = function () { var v = s.value; ls('champLang', v); if (window.ChampI18n) window.ChampI18n.set(v); else location.reload(); }; }
  var HOME = os === 'iOS' ? 'In Safari tap <b>Share ⇧</b>, then <b>Add to Home Screen</b>.' : os === 'Android' ? 'In Chrome tap <b>⋮</b>, then <b>Add to Home screen</b>.' : 'Use your browser menu: <b>Add to Home screen</b>.';
  var foot = '<p class="ph-dev" data-noi18n>📱 ' + esc(window.ChampPhone.label) + '</p><p class="ph-home">Keep Champ one tap away: ' + HOME + '</p>';

  function film() {
    var o = document.createElement('div'); o.className = 'ph-film'; o.innerHTML = '<button type="button" class="ph-x" aria-label="Close">✕</button><iframe src="promo.html" title="GKH Project Champ in two minutes" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    document.body.appendChild(o); var f = o.querySelector('iframe');
    var send = function () { try { f.contentWindow.postMessage({ champLang: ls('champLang') || 'en' }, location.origin); } catch (e) {} };
    var onMsg = function (e) { if (e.origin === location.origin && e.source === f.contentWindow && e.data && e.data.champReady) send(); };
    addEventListener('message', onMsg);
    o.querySelector('.ph-x').onclick = function () { removeEventListener('message', onMsg); o.remove(); };
  }
  // 📱 the phone website: a short, polished page (Home, About, Who it's for, Contact), every language, and a note that Champ itself is made for a computer
  var I = {   // small monoline icons, in the page's gold
    build: '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/>', it: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', leaf: '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19 13 11"/>',
    gov: '<path d="M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18M12 3l9 5H3z"/>', brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>', chat: '<path d="M4 20l1.5-4A8 8 0 1 1 9 19.5z"/>',
    laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>', play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>', chev: '<path d="m9 6 6 6-6 6"/>' };
  var ico = function (k, c) { return '<svg class="' + (c || 'p2-i') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[k] + '</svg>'; };
  function home() {
    var cur = ls('champLang') || 'en', curL = LANGS.filter(function (l) { return l[0] === cur; })[0] || LANGS[0];
    // the plan in the hero: a few weeks of a real-looking schedule, drawn once when the page opens
    var rows = [['Discovery and design', 2, 24, 'done'], ['Build and configure', 18, 30, 'done'], ['Data migration', 36, 28, 'on'], ['Testing and training', 52, 26, 'late'], ['Go-live and support', 72, 24, 'plan']];
    // 🎞 the hero: five short scenes of what Champ does, each for a few seconds, fading into the next
    var g1 = '<div class="p2-ph"><b>ERP rollout: finance and HR</b><span>Technology</span></div>' +
      '<div class="p2-rows">' + rows.map(function (r, i) { return '<div class="p2-row"><span>' + r[0] + '</span><i class="p2-bar ' + r[3] + '" style="--l:' + r[1] + '%;--w:' + r[2] + '%;--d:' + (0.25 + i * 0.12) + 's"></i></div>'; }).join('') +
      '<i class="p2-today" style="--t:44%"><em>Today</em></i></div><div class="p2-axis" data-noi18n><span>Feb</span><span>Apr</span><span>Jun</span><span>Aug</span><span>Oct</span><span>Dec</span></div>' +
      '<div class="p2-flag"><b>Testing 4 days behind.</b> Champ found it this morning and has a recovery plan ready.</div>' +
      '<div class="p2-kpi"><span class="w"><b>0.97</b>Schedule</span><span class="g"><b>1.04</b>Cost</span><span><b>3</b>Risks watched</span></div>';
    var col = function (h, L, cls) { return '<div class="sb-col ' + cls + '"><span class="sb-h">' + h + '</span>' + L.map(function (c) { return '<i class="sb-card' + (c[1] ? ' ' + c[1] : '') + '">' + c[0] + '</i>'; }).join('') + '</div>'; };
    var g2 = '<div class="p2-ph"><b>Mobile banking app</b><span>Sprint 6</span></div><div class="sb">' + col('To do', [['Card freeze'], ['Push alerts']], 'todo') + col('Doing', [['Face ID sign-in', 'mv'], ['Pay a friend']], 'doing') + col('Done', [['Face ID sign-in', 'nw'], ['New home screen'], ['Bill pay']], 'done') + '</div>' +
      '<div class="p2-flag ok"><b>Face ID sign-in shipped.</b> The card moved to Done and the burn-down updated itself.</div>' +
      '<div class="p2-kpi"><span><b>12</b>Points done</span><span><b>2 of 3</b>Work in progress</span><span><b>2</b>Days to go</span></div>';
    var g3 = '<div class="p2-ph"><b>Clean water, 40 villages</b><span>Social</span></div><div class="sd-doc"><i>PDF</i><div><b data-noi18n>Donor_proposal.pdf</b><small>96 pages read in full</small><span class="sd-bar"><i></i></span></div></div>' +
      '<ul class="sd-out">' + [['38 tasks', 'across 6 phases'], ['9 risks', 'each with an owner'], ['Budget', 'from the donor proposal'], ['Partners', 'with their RACI']].map(function (x, k) { return '<li style="--d:' + (1.2 + k * 0.45) + 's"><b>' + x[0] + '</b> ' + x[1] + '</li>'; }).join('') + '</ul>' +
      '<div class="p2-kpi"><span><b>3 min</b>Proposal to plan</span><span><b>40</b>Villages</span><span><b>6</b>Partners</span></div>';
    var g4 = '<div class="p2-ph"><b>Hospital wing fit-out</b><span>Construction</span></div><svg class="se" viewBox="0 0 300 120" aria-hidden="true"><path class="se-g" d="M0 30H300M0 60H300M0 90H300"/><path class="se-pv" pathLength="1" d="M0 112C60 108 110 84 150 62S240 18 300 10"/><path class="se-ac" pathLength="1" d="M0 112C60 110 108 92 138 76"/><path class="se-ev" pathLength="1" d="M0 112C60 109 108 88 138 70"/><circle class="se-dot" cx="138" cy="70" r="4"/></svg>' +
      '<div class="se-leg"><span class="pv">Planned</span><span class="ev">Earned</span><span class="ac">Spent</span></div>' +
      '<div class="p2-kpi"><span class="g"><b>1.04</b>Cost (CPI)</span><span class="w"><b>0.97</b>Schedule (SPI)</span><span><b>$16.8M</b>Forecast</span></div>';
    var g5 = '<div class="p2-ph"><b>ESG strategy, national airline</b><span>Consulting</span></div><ul class="sm">' + [['Baseline assessment', 'Collected', 'pd'], ['Materiality report', 'Invoiced, due 12 Jun', 'iv'], ['Decarbonisation roadmap', 'Ready to invoice', 'rd'], ['Board briefing', 'Yet to invoice', 'td']].map(function (m, k) { return '<li class="' + m[2] + '" style="--d:' + (0.3 + k * 0.3) + 's"><i></i><b>' + m[0] + '</b><span>' + m[1] + '</span></li>'; }).join('') + '</ul>' +
      '<div class="p2-flag ok"><b>One milestone is ready to bill.</b> Finance sees it the moment the work is done.</div>';
    // 6: risks on a heat map (a development project)
    var cells = ''; for (var r0 = 5; r0 >= 1; r0--) for (var c0 = 1; c0 <= 5; c0++) { var sc0 = r0 * c0; cells += '<i class="' + (sc0 >= 15 ? 'hi' : sc0 >= 8 ? 'md' : 'lo') + '"></i>'; }
    var dots0 = [[2, 4, 'Supplier', 0.4], [3, 3, 'Permits', 0.7], [4, 2, 'Funding', 1.0], [1, 3, 'Theft', 1.3]];
    var g6 = '<div class="p2-ph"><b>Solar mini-grids, Rwanda</b><span>Development</span></div><div class="sr"><div class="sr-grid">' + cells +
      dots0.map(function (x) { return '<b class="sr-dot" style="--x:' + x[0] + ';--y:' + x[1] + ';--d:' + x[3] + 's">' + x[2] + '</b>'; }).join('') + '<b class="sr-dot up" style="--x:4;--y:4;--d:1.9s">Rainy season</b></div><div class="sr-ax"><span>Impact</span><span>Likelihood</span></div></div>' +
      '<div class="p2-flag p2-ai"><b>✨ Champ raised this.</b> The 3-week rain forecast overlaps panel delivery, so likelihood went up to high. <em>Suggested: deliver by 3 Mar · owner Grace</em></div>';
    // 7: a program with its dependencies (government)
    var g7 = '<div class="p2-ph"><b>National digital ID program</b><span>Government</span></div><div class="sp">' +
      [['Registration system', 0, 46, 'ok'], ['ID card printing', 30, 46, 'late'], ['Online services', 58, 40, 'ok']].map(function (x, k) { return '<div class="sp-row"><span>' + x[0] + '</span><i class="sp-bar ' + x[3] + '" style="--l:' + x[1] + '%;--w:' + x[2] + '%;--d:' + (0.3 + k * 0.25) + 's"></i></div>'; }).join('') +
      '<svg class="sp-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M46 18 C52 18 26 50 31 50"/><path class="bad" d="M76 50 C82 50 54 84 59 84"/></svg></div>' +
      '<div class="p2-flag"><b>Card printing ends after online services start.</b> A 3-week clash between two projects, flagged on the dependency board.</div>';
    // 8: ask in any language
    var g8 = '<div class="p2-ph"><b>Ask Champ, in your language</b><span>19 languages</span></div><div class="sa">' +
      '<p class="sa-q" data-noi18n>Projek mana yang lewat minggu ini?</p><p class="sa-a" data-noi18n>Dua projek lewat: Mekong Water dan ERP Kewangan. Pelan pemulihan sudah sedia untuk kedua-duanya.</p>' +
      '<p class="sa-q two" data-noi18n>这个月哪些里程碑需要开票？</p><p class="sa-a two" data-noi18n>三个：设计签字、结构完工、服务安装。</p></div>' +
      '<div class="sa-lang" data-noi18n><span>English</span><span>Bahasa Melayu</span><span>தமிழ்</span><span>中文</span><span>العربية</span><span>Español</span><span>हिन्दी</span><span>+12</span></div>';
    var SC = [g1, g2, g3, g4, g5, g6, g7, g8], NM = ['Plan', 'Board', 'From a document', 'Cost', 'Billing', 'Risks', 'Program', 'Any language'];
    var gantt = '<div class="p2-plan p2-stage" role="region" aria-roledescription="carousel" aria-label="What Project Champ does">' + SC.map(function (h, k) { return '<div class="p2-scene' + (k === 0 ? ' on' : '') + '" data-sc="' + k + '" aria-hidden="' + (k ? 'true' : 'false') + '">' + h + '</div>'; }).join('') +
      '<div class="p2-dots">' + NM.map(function (n, k) { return '<button type="button" data-go="' + k + '"' + (k === 0 ? ' class="on" aria-current="true"' : '') + ' aria-label="' + n + '"><i></i></button>'; }).join('') + '</div></div>';
    var who = [['build', 'Construction and facilities', 'Trades, materials and quantities, safety plans and site budgets.'], ['it', 'IT and digital', 'Backlogs and sprints, with milestones and cost for the steering committee.'],
      ['leaf', 'ESG and sustainability', 'Decarbonisation and reporting programs that boards can follow.'], ['gov', 'Government', 'Charters, change control and reports ready for audit.'],
      ['brief', 'Consulting', 'Client engagements with scope, budget and status reports written for you.'], ['globe', 'Development programs', 'Many projects, donors and partners in one view of time, cost and risk.']];
    var d = document.createElement('div'); d.id = 'phLand'; d.className = 'p2';
    d.innerHTML =
      '<header class="p2-top"><a class="p2-brand" href="#ph-home"><img src="assets/gkh-globe.webp" alt="" width="28" height="28"><span data-noi18n>Project Champ</span></a>' +
      '<button type="button" class="p2-langbtn" id="p2Lang" aria-haspopup="dialog">' + ico('globe') + '<span data-noi18n>' + esc(curL[1]) + '</span></button>' +
      '<nav class="p2-nav" aria-label="Sections"><a href="#ph-home" class="on">Home</a><a href="#ph-about">About</a><a href="#ph-who">Who it’s for</a><a href="#ph-contact">Contact</a></nav></header>' +
      '<main class="p2-main">' +
      '<section id="ph-home" class="p2-sec p2-hero"><h1>Every project. One champion.</h1>' +
      '<p class="p2-lede">Plan, run and rescue projects in one place. The AI builds the plan from your documents and tells you before work slips.</p>' + gantt +
      '<div class="p2-actions"><button type="button" class="p2-btn p2-gold" id="phWatch">' + ico('play') + 'Watch the 2-minute film</button></div>' +
      '<p class="p2-desk">' + ico('laptop') + '<span>Project Champ is made for a desktop or laptop. This is the short version for your phone: read about it, sign in, and see your Today list.</span></p>' +
      '<h2 class="p2-h3">From a document to a plan you can run.</h2><ol class="p2-steps">' +
      '<li><b>Drop in what you have</b><span>A brief, a tender, a feasibility study or a building model. Champ reads all of it.</span></li>' +
      '<li><b>The AI drafts the plan</b><span>Schedule, budget, materials, risks and stakeholders, ready for you to check and approve.</span></li>' +
      '<li><b>Champ keeps watch</b><span>Every morning it checks time, cost and risk, and tells you what needs you before it becomes a problem.</span></li></ol>' +
      '<ul class="p2-facts"><li><b>Agile, waterfall or hybrid</b>Gantt, boards and sprints in one plan</li><li><b>19 languages</b>The whole app, and Champ the assistant</li><li><b>AI that does the paperwork</b>Plans, status reports and answers</li></ul></section>' +
      '<section id="ph-about" class="p2-sec"><h2>Built by people who run national programs.</h2>' +
      '<p>Project Champ comes from <b>Global Knowledge House</b>, a consultancy in Sydney and Kuala Lumpur. Since 2010 we have delivered programs in 8 countries, and reach 14 with our partners, for governments and businesses across Asia, the Middle East and Africa. Champ is that discipline, made simple for any team.</p>' +
      '<a class="p2-ext" href="https://gkhconsultancy.com/" target="_blank" rel="noopener">' + ico('globe') + '<span><b>Visit the GKH website</b><small data-noi18n>gkhconsultancy.com</small></span>' + ico('chev', 'p2-chev') + '</a>' +
      '<div class="p2-work" aria-label="Selected work">' + [['Rwanda', 'National ID rollout'], ['Rwanda', 'Kigali ICT Park plan'], ['Rwanda', 'Pension fund modernisation'], ['Malta', 'National ID program'], ['Malaysia', 'E-commerce strategy'], ['Middle East', 'National airline ESG report']].map(function (w) { return '<div><small>' + w[0] + '</small><b>' + w[1] + '</b></div>'; }).join('') + '</div>' +
      '<figure class="p2-founder"><div class="p2-photo"><img src="assets/team/sashi-office.webp" alt="Sashi Kumar Sivam" loading="lazy"></div><figcaption><b data-noi18n>Sashi Kumar Sivam</b><span>CEO and Co-Founder of GKH, and architect of Project Champ</span></figcaption></figure>' +
      '<blockquote class="p2-quote">I build AI into how programs are planned, governed and rescued, so problems are seen early and dealt with before they cost a project.</blockquote>' +
      '<p class="p2-small">25 years leading national programs on five continents, including as Chief Strategic Advisor to the Rwanda Development Board. PMP, PMI-ACP, CSM, CSPO, ESGP.</p></section>' +
      '<section id="ph-who" class="p2-sec"><h2>For any team with a scope, a deadline and a budget.</h2><ul class="p2-who">' +
      who.map(function (w) { return '<li>' + ico(w[0]) + '<div><b>' + w[1] + '</b><span>' + w[2] + '</span></div></li>'; }).join('') + '</ul></section>' +
      '<section id="ph-contact" class="p2-sec"><h2>See it on your own project.</h2><p>A 30-minute demo, a pilot on one live project, or training for your team. We reply within one business day.</p>' +
      '<div class="p2-links"><a href="mailto:ceo@gkhconsultancy.com?subject=Project%20Champ%20demo">' + ico('mail') + '<span><b>Email</b><small data-noi18n>ceo@gkhconsultancy.com</small></span>' + ico('chev', 'p2-chev') + '</a>' +
      '<a href="tel:+61493431202">' + ico('phone') + '<span><b>Call</b><small data-noi18n>+61 493 431 202</small></span>' + ico('chev', 'p2-chev') + '</a>' +
      '<a href="https://wa.me/61493431202?text=' + encodeURIComponent('Hi, I would like to know more about Project Champ.') + '">' + ico('chat') + '<span><b>WhatsApp</b><small>Message us any time</small></span>' + ico('chev', 'p2-chev') + '</a></div>' +
      '<p class="p2-small">Offices in Sydney, Australia and Kuala Lumpur, Malaysia.</p></section>' +
      '<footer class="p2-foot"><div class="p2-sign"><img src="assets/gkh-globe.webp" alt="" width="34" height="34"><div><b data-noi18n>Project Champ</b><span>by Global Knowledge House, Sydney and Kuala Lumpur</span></div></div><p>Keep Champ one tap away. ' + HOME + '</p><p class="p2-legal"><a href="privacy.html">Privacy notice</a><span data-noi18n> · © Global Knowledge House</span></p></footer></main>' +
      '<div class="p2-dock"><a class="p2-btn p2-gold p2-signin" href="login.html">Sign in</a><span>Free to explore with Google. No card needed.</span></div>' +
      '<div class="p2-sheet" id="p2Sheet" role="dialog" aria-modal="true" aria-label="Language" hidden><div class="p2-sheet-in"><div class="p2-sheet-h"><b>Language</b><button type="button" id="p2SheetX" aria-label="Close">✕</button></div><div class="p2-langs" data-noi18n>' +
      LANGS.map(function (l) { return '<button type="button" data-l="' + l[0] + '"' + (l[0] === cur ? ' class="on" aria-current="true"' : '') + '>' + esc(l[1]) + '</button>'; }).join('') + '</div></div></div>';
    document.body.appendChild(d);
    document.getElementById('phWatch').onclick = film;
    // 🌐 the language: a sheet from the bottom with every language
    var sh = document.getElementById('p2Sheet'), open = function (v) { sh.hidden = !v; document.documentElement.classList.toggle('p2-noscroll', !!v); };
    document.getElementById('p2Lang').onclick = function () { open(true); }; document.getElementById('p2SheetX').onclick = function () { open(false); };
    sh.onclick = function (e) { if (e.target === sh) open(false); };
    sh.querySelectorAll('[data-l]').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-l'); ls('champLang', v); open(false); if (window.ChampI18n) { window.ChampI18n.set(v); var L0 = LANGS.filter(function (l) { return l[0] === v; })[0]; document.querySelector('#p2Lang span').textContent = L0 ? L0[1] : v; sh.querySelectorAll('[data-l]').forEach(function (x) { x.classList.toggle('on', x === b); }); } else location.reload(); }; });
    // the sections: smooth scroll, and the one on screen underlined
    var links = [].slice.call(d.querySelectorAll('.p2-nav a, .p2-brand'));
    links.forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var t = document.querySelector(a.getAttribute('href')); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - (a.classList.contains('p2-brand') ? 999 : 96), behavior: 'smooth' }); }; });
    var nav = [].slice.call(d.querySelectorAll('.p2-nav a')), light = function () { var c = nav[0]; nav.forEach(function (a) { var t = document.querySelector(a.getAttribute('href')); if (t && t.getBoundingClientRect().top < 160) c = a; }); nav.forEach(function (a) { a.classList.toggle('on', a === c); }); d.classList.toggle('p2-scrolled', window.scrollY > 8); };
    addEventListener('scroll', light, { passive: true });
    requestAnimationFrame(function () { d.classList.add('p2-go'); });
    // 🎞 the scenes: each for 6.5 seconds, then the next fades in; a dot or a swipe jumps; paused when the page is hidden; still on reduced motion
    (function () {
      var st = d.querySelector('.p2-stage'); if (!st) return; var sc = [].slice.call(st.querySelectorAll('.p2-scene')), dots = [].slice.call(st.querySelectorAll('[data-go]')), k = 0, tm = null;
      var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, HOLD = 6500;
      var show = function (n) { k = (n + sc.length) % sc.length; sc.forEach(function (x, i) { x.classList.toggle('on', i === k); x.setAttribute('aria-hidden', i === k ? 'false' : 'true'); }); dots.forEach(function (b, i) { b.classList.toggle('on', i === k); if (i === k) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }); };
      var run = function () { clearTimeout(tm); if (still || document.hidden) return; tm = setTimeout(function () { show(k + 1); run(); }, HOLD); };
      dots.forEach(function (b) { b.onclick = function () { show(+b.getAttribute('data-go')); run(); }; });
      var x0 = null; st.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      st.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) { show(k + (dx < 0 ? 1 : -1)); run(); } });
      document.addEventListener('visibilitychange', run); run();
    })();
    var tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.setAttribute('content', '#141210');   // the phone's own bar matches the page   // the plan draws itself once
    if (/^#ph-/.test(location.hash)) setTimeout(function () { var a = d.querySelector('.p2-nav a[href="' + location.hash + '"]'); if (a) a.click(); }, 300);
  }
  function login() {
    var card = document.getElementById('loginForm'); if (!card) return;
    var w = document.createElement('div'); w.className = 'ph-loginx'; w.innerHTML = langSel('phLangSel2') + foot; card.appendChild(w); wireLang('phLangSel2');
    var back = card.querySelector('.back'); if (back) back.textContent = '← Back';
    var u = card.querySelector('input[name=username]'); if (u) u.removeAttribute('autofocus');
  }
  var go = function () { if (page === 'home') home(); else login(); document.body.style.visibility = 'visible'; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
