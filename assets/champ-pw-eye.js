/* GKH Project Champ: an eye button inside every password box (sign-in, new user, change password) to show or hide what
   you typed. Works for boxes added later (dialogs) too. */
(function () {
  'use strict';
  var EYE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var SHUT = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';
  var css = document.createElement('style');
  css.textContent = '.pw-wrap{position:relative;display:block;width:100%}.pw-wrap>input{width:100%;padding-right:44px!important;box-sizing:border-box}' +
    '.pw-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:8px;background:transparent;color:inherit;opacity:.7;cursor:pointer;padding:0}' +
    '.pw-eye:hover,.pw-eye:focus-visible{opacity:1;background:rgba(127,127,127,.15)}.pw-eye[aria-pressed="true"]{opacity:1;color:#E8C04A}';
  document.head.appendChild(css);
  function add(inp) {
    if (inp._eye || inp.type !== 'password') return; inp._eye = true;
    var w = document.createElement('span'); w.className = 'pw-wrap'; inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
    var b = document.createElement('button'); b.type = 'button'; b.className = 'pw-eye'; b.innerHTML = EYE; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', 'Show password'); b.title = 'Show password';
    b.onclick = function () { var show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; b.innerHTML = show ? SHUT : EYE; b.setAttribute('aria-pressed', show ? 'true' : 'false'); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); b.title = b.getAttribute('aria-label'); inp.focus(); };
    w.appendChild(b);
    if (inp.form) inp.form.addEventListener('submit', function () { if (inp.type === 'text') b.click(); });   // never left showing after signing in
  }
  function scan(root) { (root.querySelectorAll ? root : document).querySelectorAll('input[type="password"]').forEach(add); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(document); }); else scan(document);
  new MutationObserver(function (list) { list.forEach(function (r) { r.addedNodes.forEach(function (n) { if (n.nodeType !== 1) return; if (n.matches && n.matches('input[type="password"]')) add(n); else scan(n); }); }); }).observe(document.documentElement, { childList: true, subtree: true });
})();
