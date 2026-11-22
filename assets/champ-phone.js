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
    var rows = [['Design and approvals', 2, 26, 'done'], ['Procurement', 18, 22, 'done'], ['Structure, level by level', 30, 34, 'on'], ['Services rough-in', 52, 26, 'late'], ['Fit-out and handover', 70, 26, 'plan']];
    var gantt = '<div class="p2-plan" role="img" aria-label="A project plan with five work stages and today\'s position"><div class="p2-ph"><b>Riverbend clinic</b><span>Feb to Dec</span></div>' +
      '<div class="p2-rows">' + rows.map(function (r, i) { return '<div class="p2-row"><span>' + r[0] + '</span><i class="p2-bar ' + r[3] + '" style="--l:' + r[1] + '%;--w:' + r[2] + '%;--d:' + (0.25 + i * 0.12) + 's"></i></div>'; }).join('') +
      '<i class="p2-today" style="--t:44%"><em>Today</em></i></div>' +
      '<div class="p2-flag"><b>Services 4 days behind.</b> Champ found it this morning and has a recovery plan ready.</div>' +
      '<div class="p2-kpi"><span><b>0.97</b> schedule</span><span><b>1.04</b> cost</span><span><b>3</b> risks watched</span></div></div>';
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
      '<figure class="p2-founder"><div class="p2-photo"><img src="assets/team/sashi-studio.webp" alt="Sashi Kumar Sivam" loading="lazy"></div><figcaption><b data-noi18n>Sashi Kumar Sivam</b><span>CEO and Co-Founder of GKH, and architect of Project Champ</span></figcaption></figure>' +
      '<blockquote class="p2-quote">I build AI into how programs are planned, governed and rescued, so problems are seen early and dealt with before they cost a project.</blockquote>' +
      '<p class="p2-small">25 years leading national programs on five continents, including as Chief Strategic Advisor to the Rwanda Development Board. PMP, PMI-ACP, CSM, CSPO, ESGP.</p></section>' +
      '<section id="ph-who" class="p2-sec"><h2>For any team with a scope, a deadline and a budget.</h2><ul class="p2-who">' +
      who.map(function (w) { return '<li>' + ico(w[0]) + '<div><b>' + w[1] + '</b><span>' + w[2] + '</span></div></li>'; }).join('') + '</ul></section>' +
      '<section id="ph-contact" class="p2-sec"><h2>See it on your own project.</h2><p>A 30-minute demo, a pilot on one live project, or training for your team. We reply within one business day.</p>' +
      '<div class="p2-links"><a href="mailto:ceo@gkhconsultancy.com?subject=Project%20Champ%20demo">' + ico('mail') + '<span><b>Email</b><small data-noi18n>ceo@gkhconsultancy.com</small></span>' + ico('chev', 'p2-chev') + '</a>' +
      '<a href="tel:+61493431202">' + ico('phone') + '<span><b>Call</b><small data-noi18n>+61 493 431 202</small></span>' + ico('chev', 'p2-chev') + '</a>' +
      '<a href="https://wa.me/61493431202?text=' + encodeURIComponent('Hi, I would like to know more about Project Champ.') + '">' + ico('chat') + '<span><b>WhatsApp</b><small>Message us any time</small></span>' + ico('chev', 'p2-chev') + '</a></div>' +
      '<p class="p2-small">Offices in Sydney, Australia and Kuala Lumpur, Malaysia.</p></section>' +
      '<footer class="p2-foot"><p>Keep Champ one tap away. ' + HOME + '</p><p class="p2-legal"><a href="privacy.html">Privacy notice</a><span data-noi18n> · © Global Knowledge House</span></p></footer></main>' +
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
