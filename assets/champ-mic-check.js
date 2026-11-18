/* GKH Project Champ: is the microphone sending any sound at all? A computer can hand the browser a microphone that is
   switched off (the mute key, Windows input volume or privacy settings, another app holding it): the browser then gets
   pure silence and voice input just "hears nothing". ChampMicCheck(cb) listens for under a second and calls cb(message)
   only when the microphone is muted or perfectly silent (a working one always has some background noise). */
(function () {
  'use strict';
  var MSG = 'Your microphone is not sending any sound to the browser, so I cannot hear you. Check the microphone mute key on your keyboard, then your computer’s sound settings (Windows: Settings › System › Sound › Input, and Privacy & security › Microphone; Mac: System Settings › Sound › Input). Or type your question.';
  window.ChampMicCheck = function (cb) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
      var tr = st.getAudioTracks()[0], ctx = null, an = null, peak = 0, buf = new Uint8Array(1024), n = 0;
      try { var AC = window.AudioContext || window.webkitAudioContext; ctx = new AC(); an = ctx.createAnalyser(); an.fftSize = 1024; ctx.createMediaStreamSource(st).connect(an); } catch (e) {}
      var iv = setInterval(function () { if (!an) return; an.getByteTimeDomainData(buf); for (var i = 0; i < buf.length; i++) { var a = Math.abs(buf[i] - 128); if (a > peak) peak = a; } n++; }, 60);
      setTimeout(function () {
        clearInterval(iv); var dead = !tr || tr.muted || tr.readyState !== 'live' || (an && n > 3 && peak === 0);
        st.getTracks().forEach(function (t) { t.stop(); }); try { if (ctx) ctx.close(); } catch (e) {}
        if (dead) cb(MSG);
      }, 900);
    }).catch(function () {});
  };
})();
