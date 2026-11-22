/* GKH Project Champ on a phone. Detects the phone and its OS (iPhone / Android), then:
   - home page: the intro plays as usual, then a phone landing page (what Champ is, ▶ the 2-minute film, your language, a big Login)
   - login page: just the sign-in card
   - console (/admin/): only 🎯 Today, like a messenger (admin/champ-phone-app.js)
   No AI chat and no voice on phones. Tablets and computers keep the full site.
   ?phone=1 / ?phone=0 forces it (kept on this device); "Full website" at the foot switches it off. */
(function () {
  'use strict';
  var ua = navigator.userAgent || '', q = location.search, ls = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
  if (/[?&]phone=1/.test(q)) ls('champPhone', '1'); else if (/[?&]phone=0/.test(q)) ls('champPhone', '0');
  var ver = function (re) { var m = ua.match(re); return m ? m[1].replace(/_/g, '.') : ''; };
  var os = /iPhone|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows Phone/.test(ua) ? 'Windows Phone' : '';
  var osVer = os === 'iOS' ? ver(/OS (\d+[_.]\d+(?:[_.]\d+)?)/) : os === 'Android' ? ver(/Android (\d+(?:\.\d+)*)/) : '';
  var model = os === 'iOS' ? 'iPhone' : os === 'Android' ? ((ua.match(/Android [^;)]*;\s*([^;)]+?)(?:\s+Build\/[^;)]*)?\)/) || [])[1] || 'Android phone').replace(/^wv$|^K$/, 'Android phone') : '';
  var uaPhone = /iPhone|iPod|Windows Phone/.test(ua) || (/Android/.test(ua) && /Mobile/.test(ua)) || !!(navigator.userAgentData && navigator.userAgentData.mobile);
  var small = window.matchMedia && matchMedia('(max-width: 600px) and (pointer: coarse)').matches;   // a phone that hides its name
  var force = ls('champPhone'), is = force === '1' ? true : force === '0' ? false : (uaPhone || small);
  if (!os && is) os = /Mac/.test(ua) ? 'iOS' : 'Phone';
  window.ChampPhone = { is: is, os: os, osVer: osVer, model: model, label: (model || 'Phone') + (os && os !== model ? ' · ' + os + (osVer ? ' ' + osVer : '') : '') };
  if (!is) return;
  var root = document.documentElement; root.classList.add('ph'); root.classList.add('ph-' + (os === 'iOS' ? 'ios' : os === 'Android' ? 'android' : 'other'));
  var path = location.pathname, page = /\/admin\//.test(path) ? 'admin' : /login(\.html)?$/.test(path) ? 'login' : /(^\/$|index(\.html)?$)/.test(path) ? 'home' : 'other';
  root.classList.add('ph-' + page);
  if (page === 'admin' || page === 'other') return;   // the console builds its own screen; other pages stay as they are

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var LANGS = [['en', 'English'], ['ms', 'Bahasa Melayu'], ['id', 'Bahasa Indonesia'], ['ta', 'தமிழ்'], ['zh', '简体中文'], ['hi', 'हिन्दी'], ['ar', 'العربية'], ['fa', 'فارسی'], ['vi', 'Tiếng Việt'],
    ['th', 'ไทย'], ['tl', 'Filipino'], ['ja', '日本語'], ['ko', '한국어'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['pt', 'Português'], ['sw', 'Kiswahili'], ['rw', 'Kinyarwanda'], ['km', 'ខ្មែរ (Khmer)']];
  function langSel(id, compact) {
    var cur = ls('champLang') || 'en';
    return '<label class="ph-lang' + (compact ? ' ph-lang-s' : '') + '"><span>🌐' + (compact ? '' : ' Language') + '</span><select id="' + id + '" data-noi18n aria-label="Language">' + LANGS.map(function (l) { return '<option value="' + l[0] + '"' + (l[0] === cur ? ' selected' : '') + '>' + esc(l[1]) + '</option>'; }).join('') + '</select></label>';
  }
  function wireLang(id) { var s = document.getElementById(id); if (!s) return; s.onchange = function () { var v = s.value; ls('champLang', v); if (window.ChampI18n) window.ChampI18n.set(v); else location.reload(); }; }
  var HOME = os === 'iOS' ? 'In Safari tap <b>Share ⇧</b>, then <b>Add to Home Screen</b>.' : os === 'Android' ? 'In Chrome tap <b>⋮</b>, then <b>Add to Home screen</b>.' : 'Use your browser menu: <b>Add to Home screen</b>.';
  var foot = '<p class="ph-dev" data-noi18n>📱 ' + esc(window.ChampPhone.label) + '</p><p class="ph-home">Keep Champ one tap away: ' + HOME + '</p><a class="ph-full" href="?phone=0">Full website</a>';

  function film() {
    var o = document.createElement('div'); o.className = 'ph-film'; o.innerHTML = '<button type="button" class="ph-x" aria-label="Close">✕</button><iframe src="promo.html" title="GKH Project Champ in two minutes" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    document.body.appendChild(o); var f = o.querySelector('iframe');
    var send = function () { try { f.contentWindow.postMessage({ champLang: ls('champLang') || 'en' }, location.origin); } catch (e) {} };
    var onMsg = function (e) { if (e.origin === location.origin && e.source === f.contentWindow && e.data && e.data.champReady) send(); };
    addEventListener('message', onMsg);
    o.querySelector('.ph-x').onclick = function () { removeEventListener('message', onMsg); o.remove(); };
  }
  // 📱 the phone website: one short page with a menu (Home, About, Who it's for, Contact), every language, and a note that Champ itself is made for a computer
  function home() {
    var d = document.createElement('div'); d.id = 'phLand'; d.className = 'ph-land';
    var who = [['🏗', 'Construction and facilities', 'Gantt with trades, Bill of Materials and quantities, SWMS, site budgets.'], ['💻', 'IT and digital', 'Backlogs, boards and sprints, with milestones and cost for the steering committee.'],
      ['🌏', 'ESG and sustainability', 'Decarbonisation and reporting programs, with clear status for boards.'], ['🏛', 'Government and public sector', 'Charters, change control and audit-ready reports.'],
      ['📈', 'Consulting and services', 'Client engagements with scope, budget, RACI and AI status reports.'], ['🤝', 'Development programs', 'Many projects, donors and partners: one view of time, cost and risk.']];
    d.innerHTML = '<nav class="ph-nav" aria-label="Menu"><div class="ph-menu"><a href="#ph-home" class="on">Home</a><a href="#ph-about">About</a><a href="#ph-who">Who it’s for</a><a href="#ph-contact">Contact</a></div>' + langSel('phLangSel', true) + '</nav>' +
      '<section id="ph-home" class="ph-sec">' +
      '<p class="ph-desk">💻 <b>Best on a desktop or laptop.</b> Project Champ is a full project workspace made for a big screen. On a phone you can read about it, sign in and see your Today list.</p>' +
      '<div class="ph-top"><img src="assets/gkh-globe.webp" alt="" width="84" height="84" class="gkh-globe"><h1 data-noi18n>Project Champ</h1><p class="ph-by">by Global Knowledge House</p></div>' +
      '<p class="ph-lead">Every project. <span class="grad-text">One champion.</span></p>' +
      '<p class="ph-desc">Plan and run projects in one place: Gantt charts, boards, costs, risks, people and reports. The AI builds the plan from your documents and warns you before things slip.</p>' +
      '<ul class="ph-pts"><li>📊 Agile, waterfall or hybrid</li><li>✨ AI plans, status reports and answers</li><li>🌐 19 languages</li></ul>' +
      '<button type="button" class="ph-watch" id="phWatch"><span class="ph-play">▶</span><span>Watch the 2-minute film</span></button></section>' +
      '<section id="ph-about" class="ph-sec"><h2>About us</h2>' +
      '<p class="ph-desc">Project Champ is built by <b>Global Knowledge House (GKH)</b>, a boutique consultancy in Sydney and Kuala Lumpur. Since 2010 we have run national programs, strategy and ESG work for governments and businesses in Asia, the Middle East and Africa. Champ is that discipline, made simple for any team.</p>' +
      '<div class="ph-person"><img src="assets/team/sashi-cut.webp" alt="Sashi Kumar Sivam" width="72" height="72" loading="lazy"><div><b data-noi18n>Sashi Kumar Sivam</b><small>CEO and Co-Founder, GKH · Architect of Project Champ</small></div></div>' +
      '<p class="ph-desc">25 years leading national programs and delivery teams on five continents, including as Chief Strategic Advisor to the Rwanda Development Board. PMP, PMI-ACP, CSM, CSPO, ESGP. A pioneer in bringing AI into program and project management.</p></section>' +
      '<section id="ph-who" class="ph-sec"><h2>Who it’s for</h2><p class="ph-desc">Any team with a scope, a deadline and a budget.</p><ul class="ph-who">' +
      who.map(function (w) { return '<li><span>' + w[0] + '</span><div><b>' + w[1] + '</b><small>' + w[2] + '</small></div></li>'; }).join('') + '</ul></section>' +
      '<section id="ph-contact" class="ph-sec"><h2>Contact</h2><p class="ph-desc">A 30-minute demo on your own project, a pilot, or training. We reply within one business day.</p>' +
      '<div class="ph-cta"><a class="ph-btn" href="mailto:ceo@gkhconsultancy.com?subject=Project%20Champ%20demo">✉️ Email us</a><a class="ph-btn" href="tel:+61493431202">📞 Call</a><a class="ph-btn" href="https://wa.me/61493431202">💬 WhatsApp</a></div>' +
      '<p class="ph-desc ph-small" data-noi18n>ceo@gkhconsultancy.com · +61 493 431 202</p><p class="ph-desc ph-small">Offices: Sydney, Australia · Kuala Lumpur, Malaysia</p>' +
      '<a class="ph-full2" href="contact.html">Send an enquiry form</a></section>' +
      '<a class="ph-login" href="login.html">🔐 Login</a>' +
      '<p class="ph-free">Free to explore: sign in with Google. No payment, no credit card.</p>' + foot;
    document.body.appendChild(d);
    document.getElementById('phWatch').onclick = film; wireLang('phLangSel');
    // the menu: smooth scroll, and the section on screen lit up
    var links = [].slice.call(d.querySelectorAll('.ph-nav a'));
    links.forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var t = document.querySelector(a.getAttribute('href')); if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 74, behavior: 'smooth' }); }; });
    var light = function () { var cur = links[0]; links.forEach(function (a) { var t = document.querySelector(a.getAttribute('href')); if (t && t.getBoundingClientRect().top < 140) cur = a; }); links.forEach(function (a) { a.classList.toggle('on', a === cur); }); };
    addEventListener('scroll', light, { passive: true });
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
