/* GKH Project Champ: ❓ Help in the console. The help articles (assets/help/articles.js):
   #help (search and areas), #help/<article>/<section> (one article, opened at that section).
   The ? next to each screen's title opens the article for that screen in Champ's panel. */
(function () {
  'use strict';
  var M = window.MBS; if (!M) return;
  var esc = M.esc, $ = function (s) { return document.querySelector(s); };
  var H = null, load = function () { if (!H) H = import('../assets/help/articles.js?v=2'); return H; };

  function view(parts) {
    var mine = location.hash;   // a later screen owns the view if the user moved on while the articles loaded
    return load().then(function (m) {
      if (location.hash !== mine) return;
      var V = M.view(), id = parts[0] || '', sub = parts[1] || '';
      var areaOf = function (a) { return m.AREAS.filter(function (x) { return x.id === a; })[0] || { n: '', i: '' }; };
      var top = '<form class="hc-find" id="hcF" role="search"><input id="hcQ" type="search" placeholder="Search the help: bold a task, sticky note, approve the budget…" aria-label="Search the help"><button class="btn btn-gold" type="submit">Search</button><button class="btn" type="button" id="hcChamp">🎙 Ask Champ</button></form>';
      if (/^q=/.test(id)) {
        var q = id.slice(2), r = m.search(q, 12);   // the router has decoded it already
        V.innerHTML = top + '<div class="card hc-list"><p class="muted">' + (r.length ? r.length + ' results for “' + esc(q) + '”' : 'Nothing found for “' + esc(q) + '”. Try other words, or ask Champ.') + '</p>' +
          r.map(function (x) { var a = m.byId(x.id); return '<a href="#help/' + esc(x.id) + '/' + esc(x.sub) + '"><b>' + esc(x.h) + '</b><small>' + areaOf(a.a).i + ' ' + esc(a.t) + '</small></a>'; }).join('') + '</div>';
        $('#hcQ').value = q;
      } else if (id && m.byId(id)) {
        var a = m.byId(id), ar = areaOf(a.a), go = a.w && /^#/.test(a.w) && a.w.indexOf('<project>') < 0 ? a.w : '';
        var tour = a.g && M.guide && M.guide.tours.filter(function (t) { return t.id === a.g; })[0];
        V.innerHTML = top + '<div class="card hc-art"><p><a href="#help">← All help</a> <span class="muted">· ' + ar.i + ' ' + esc(ar.n) + '</span></p>' +
          '<h2>' + esc(a.t) + '</h2><p class="muted">' + esc(a.s) + '</p>' +
          '<p class="hc-acts">' + (tour ? '<button class="btn btn-gold btn-sm" type="button" id="hcShow">▶ Show me on screen</button>' : '') + (go ? '<a class="btn btn-sm" href="' + esc(go) + '">Go there →</a>' : '') + '</p>' +
          ((a.subs || []).length > 1 ? '<nav class="hc-toc">' + a.subs.map(function (s) { return '<a href="#help/' + esc(a.id) + '/' + esc(s.id) + '">' + esc(s.h) + '</a>'; }).join('') + '</nav>' : '') +
          (a.subs || []).map(function (s) { return '<section class="hc-sub' + (s.id === sub ? ' hit' : '') + '" id="hcs-' + esc(s.id) + '"><h3>' + esc(s.h) + '</h3><ol>' + s.st.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' + (s.tip ? '<p class="hc-tip">💡 ' + esc(s.tip) + '</p>' : '') + '</section>'; }).join('') +
          '</div>';
        if ($('#hcShow')) $('#hcShow').onclick = function () { M.guide.start(a.g); };
        var el = sub && document.getElementById('hcs-' + sub); if (el) setTimeout(function () { if (location.hash === mine) el.scrollIntoView({ block: 'start' }); }, 30);
      } else {
        V.innerHTML = top + '<div class="hc-areas">' + m.AREAS.map(function (ar) {
          return '<div class="card hc-area"><h3>' + ar.i + ' ' + esc(ar.n) + '</h3>' + m.ARTICLES.filter(function (a) { return a.a === ar.id; }).map(function (a) { return '<a href="#help/' + esc(a.id) + '">' + esc(a.t) + '</a>'; }).join('') + '</div>';
        }).join('') + '</div>';
      }
      $('#hcF').onsubmit = function (e) { e.preventDefault(); var v = $('#hcQ').value.trim(); location.hash = v ? '#help/q=' + encodeURIComponent(v) : '#help'; };
      $('#hcChamp').onclick = function () { var v = $('#hcQ').value.trim(); if (M.guide) { if (v) M.guide.ask(v); else M.guide.ask('help'); } };
    });
  }
  M.addView('help', 'Help', view, 'help');

  // ? next to the title: the article for the screen you are on, in Champ's panel
  function qBtn() {
    if ($('#helpQ')) return; var t = $('#title'); if (!t) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'helpQ'; b.className = 'help-q'; b.textContent = '?';
    b.title = 'Help for this screen'; b.setAttribute('aria-label', 'Help for this screen');
    b.onclick = function () {
      if (/^#help/.test(location.hash)) { location.hash = '#help'; return; }
      load().then(function (m) { var id = m.forRoute(location.hash); if (M.guide && M.guide.help) return M.guide.help(id); location.hash = '#help/' + id; }).catch(M.fail);
    };
    t.insertAdjacentElement('afterend', b);
  }
  qBtn(); document.addEventListener('DOMContentLoaded', qBtn);
})();
