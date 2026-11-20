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
  function langSel(id) {
    var cur = ls('champLang') || 'en';
    return '<label class="ph-lang"><span>🌐 Language</span><select id="' + id + '" data-noi18n>' + LANGS.map(function (l) { return '<option value="' + l[0] + '"' + (l[0] === cur ? ' selected' : '') + '>' + esc(l[1]) + '</option>'; }).join('') + '</select></label>';
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
  function home() {
    var d = document.createElement('div'); d.id = 'phLand'; d.className = 'ph-land';
    d.innerHTML = '<div class="ph-top"><img src="assets/gkh-globe.webp" alt="" width="84" height="84" class="gkh-globe"><h1 data-noi18n>Project Champ</h1><p class="ph-by">by Global Knowledge House</p></div>' +
      '<p class="ph-lead">Every project. <span class="grad-text">One champion.</span></p>' +
      '<p class="ph-desc">Project Champ plans and runs projects: Gantt charts, Kanban boards, costs, risks and people, in one place.</p>' +
      '<p class="ph-desc">On your phone it is your <b>Today</b> list: the work due this week and the notes that need you. Mark them viewed, and call the person who raised them.</p>' +
      '<button type="button" class="ph-watch" id="phWatch"><span class="ph-play">▶</span><span>Watch the 2-minute film</span></button>' +
      langSel('phLangSel') +
      '<a class="ph-login" href="login.html">🔐 Login</a>' +
      '<p class="ph-free">Free to explore: sign in with Google. No payment, no credit card.</p>' + foot;
    document.body.appendChild(d);
    document.getElementById('phWatch').onclick = film; wireLang('phLangSel');
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
