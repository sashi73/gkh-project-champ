/* GKH Project Champ: is the microphone switched off on this computer? A computer can hand the browser a microphone that
   is muted (the mute key, Windows input settings or privacy settings, another app holding it): voice input then just
   "hears nothing". ChampMicCheck(cb) watches the microphone for under a second and calls cb(message) only when the
   computer reports it muted the whole time. A quiet room is never flagged: the sound level is not used. */
(function () {
  'use strict';
  var MSG = 'Your microphone is switched off on this computer, so I cannot hear you. Check the microphone mute key on your keyboard, then your sound settings (Windows: Settings › System › Sound › Input, and Privacy & security › Microphone; Mac: System Settings › Sound › Input). Or type your question.';
  var GONE = 'Your microphone was disconnected. Plug it back in, or choose another input in your sound settings, then tap the microphone again. Or type your question.';
  window.ChampMicCheck = function (cb) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
      var tr = st.getAudioTracks()[0]; if (!tr) { st.getTracks().forEach(function (t) { t.stop(); }); return; }
      var heard = !tr.muted, gone = false;   // heard: it was unmuted at some moment during the check
      tr.addEventListener('unmute', function () { heard = true; });
      tr.addEventListener('ended', function () { gone = true; });
      setTimeout(function () {
        var msg = gone || tr.readyState !== 'live' ? GONE : !heard && tr.muted ? MSG : '';
        st.getTracks().forEach(function (t) { t.stop(); });
        if (msg) cb(msg);
      }, 900);
    }).catch(function () {});
  };
})();
