/* GKH Project Champ: is the microphone switched off on this computer? A computer can hand the browser a microphone that
   is muted (the mute key, Windows input settings or privacy settings, another app holding it): voice input then just
   "hears nothing". ChampMicCheck(cb) watches the microphone for under a second and calls cb(message) only when the
   computer reports it muted the whole time. A quiet room is never flagged: the sound level is not used. */
(function () {
  'use strict';
  var MSG = 'Your microphone is switched off on this computer, so I cannot hear you. Check the microphone mute key on your keyboard, then your sound settings (Windows: Settings › System › Sound › Input, and Privacy & security › Microphone; Mac: System Settings › Sound › Input). Or type your question.';
  window.ChampMicCheck = function (cb) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
      var tr = st.getAudioTracks()[0], off = true, n = 0;
      var iv = setInterval(function () { n++; if (!tr || !tr.muted) off = false; }, 100);
      setTimeout(function () {
        clearInterval(iv); var dead = !!tr && (tr.readyState !== 'live' || (off && n >= 5 && tr.muted));
        st.getTracks().forEach(function (t) { t.stop(); });
        if (dead) cb(MSG);
      }, 900);
    }).catch(function () {});
  };
})();
