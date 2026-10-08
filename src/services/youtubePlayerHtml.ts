// Hidden YouTube IFrame Player API host.
//
// Playback runs inside a real WebView JS engine (not Hermes), so YouTube's
// signature/throttling deciphering works natively — exactly like the web app.
//
// The host WebView supplies the document's base URL as https://<applicationId>.
// That origin is what YouTube sees as the embedder identity: no origin at all
// yields Error 153, and an origin of https://www.youtube.com yields Error 152
// because YouTube rejects a page claiming to be YouTube embedding YouTube.
// The origin player var is read from window.location.origin so it always
// matches the base URL the WebView was actually loaded with.
export const YOUTUBE_PLAYER_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="referrer" content="strict-origin-when-cross-origin" />
<style>
  html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
  #yt-host { width: 1px; height: 1px; }
  #yt-host iframe { width: 1px; height: 1px; }
</style>
</head>
<body>
<div id="yt-host"></div>
<script>
(function () {
  var player = null;
  var created = false;
  var ready = false;
  var pollId = null;
  var pending = null;
  var userPaused = false;
  var resumeId = null;

  function post(msg) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch (e) {}
  }

  function stateName(s) {
    return { '-1': 'unstarted', '0': 'ended', '1': 'playing', '2': 'paused', '3': 'buffering', '5': 'cued' }[String(s)] || 'unknown';
  }

  var apiLoading = false;
  var apiCbs = [];

  function loadApi(cb) {
    if (window.YT && window.YT.Player) { cb(window.YT); return; }
    apiCbs.push(cb);
    if (apiLoading) return;
    apiLoading = true;
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (prev) prev();
      var waiting = apiCbs;
      apiCbs = [];
      for (var i = 0; i < waiting.length; i++) {
        try { waiting[i](window.YT); } catch (e) {}
      }
    };
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = function () { post({ type: 'error', code: -1, detail: 'iframe_api_load_failed' }); };
    document.head.appendChild(tag);
  }

  function stopPoll() {
    if (pollId) { clearInterval(pollId); pollId = null; }
  }

  function startPoll() {
    if (pollId) return;
    pollId = setInterval(function () {
      if (!player || !ready) return;
      try {
        var duration = player.getDuration() || 0;
        var position = player.getCurrentTime() || 0;
        var playing = player.getPlayerState() === 1;
        post({ type: 'time', position: position, duration: duration, playing: playing });
      } catch (e) {}
    }, 500);
  }

  // YouTube/Chromium pause the iframe as soon as the document is hidden
  // (Home button, app switch, screen off). While hidden — and only while the
  // user did not pause on purpose — keep nudging the player back to playing.
  function stopResume() {
    if (resumeId) { clearInterval(resumeId); resumeId = null; }
  }

  function startResume() {
    if (resumeId) return;
    resumeId = setInterval(function () {
      if (userPaused || !ready || !player) { stopResume(); return; }
      if (!document.hidden && !document.webkitHidden) { stopResume(); return; }
      try {
        var state = player.getPlayerState();
        // Only nudge 2 (paused) / 3 (buffering). State 0 is "ended": replaying
        // it here would loop the same track forever while in background.
        if (state === 2 || state === 3) player.playVideo();
      } catch (e) {}
    }, 2000);
  }

  function syncResume() {
    if (document.hidden || document.webkitHidden) startResume();
    else stopResume();
  }

  document.addEventListener('visibilitychange', syncResume);
  window.addEventListener('pagehide', syncResume);
  window.addEventListener('focus', syncResume);

  // Queue a video for an existing, ready player. If the player is still being
  // constructed the request is stored and applied once onReady fires.
  function apply(videoId, autoplay) {
    pending = { videoId: videoId, autoplay: autoplay };
    if (!ready || !player) return;
    var p = pending;
    pending = null;
    try {
      player.loadVideoById(p.videoId, 0);
      if (p.autoplay) { try { player.playVideo(); } catch (e) {} }
      else { try { player.pauseVideo(); } catch (e) {} }
    } catch (e) { post({ type: 'error', code: -2, detail: String(e) }); }
  }

  function construct(videoId, autoplay) {
    player = new window.YT.Player('yt-host', {
      width: '1',
      height: '1',
      videoId: videoId,
      playerVars: {
        autoplay: autoplay ? 1 : 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        origin: window.location.origin
      },
      events: {
        onReady: function () {
          ready = true;
          post({ type: 'ready' });
          startPoll();
          if (pending) apply(pending.videoId, pending.autoplay);
          else if (autoplay) { try { player.playVideo(); } catch (e) {} }
        },
        onStateChange: function (e) {
          var name = stateName(e.data);
          post({ type: 'state', state: e.data, name: name });
          if (name === 'playing') startPoll();
        },
        onError: function (e) {
          post({ type: 'error', code: e.data });
        }
      }
    });
  }

  function load(videoId, autoplay) {
    userPaused = false;
    if (!created) {
      created = true;
      pending = { videoId: videoId, autoplay: autoplay };
      loadApi(function () {
        var p = pending;
        pending = null;
        if (p) construct(p.videoId, p.autoplay);
      });
      return;
    }
    if (!ready) { pending = { videoId: videoId, autoplay: autoplay }; return; }
    apply(videoId, autoplay);
  }

  window.__yt = {
    load: load,
    play: function () {
      userPaused = false;
      syncResume();
      if (player) { try { player.playVideo(); } catch (e) {} }
    },
    pause: function () {
      userPaused = true;
      stopResume();
      if (player) { try { player.pauseVideo(); } catch (e) {} }
    },
    seek: function (t) { if (player) { try { player.seekTo(t, true); } catch (e) {} } },
    stop: function () {
      userPaused = true;
      stopResume();
      stopPoll();
      if (player) { try { player.stopVideo(); } catch (e) {} }
    },
    // Called from React Native when the app state changes (background/active).
    resume: function () {
      userPaused = false;
      syncResume();
      if (ready && player) { try { player.playVideo(); } catch (e) {} }
    }
  };

  post({ type: 'booted' });
  // Warm the IFrame API so the first tap does not pay the script download cost.
  loadApi(function () { post({ type: 'apiReady' }); });
})();
</script>
</body>
</html>`;
