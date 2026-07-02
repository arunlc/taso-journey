/* Standalone-export video boot.
   In the bundled (super-inlined) file, plain inline <script> blocks in the body
   are restored via innerHTML and never execute — only external <script src>
   files (which the bundler re-injects as fresh script elements) run. So the
   original in-page play/pause loop is dead in the bundle. This external file
   takes over: it (1) assigns each video's blob URL from window.__resources, and
   (2) plays/pauses videos as they scroll in and out of view. */
(function () {
  var MAP = {
    'asp-agroforestry-video': 'vidAgro',
    'asp-energy-video': 'vidEnergy',
    'asp-impact-video': 'vidPlanet',
    'asp-poverty-video': 'vidInclusion'
  };
  var SKIP = 2;            /* seconds trimmed from the start of the impact video */
  var prevT = {};

  function ensureSrc(v) {
    if (!v) return;
    var key = v.getAttribute('data-vsrc');
    var R = window.__resources;
    if (key && R && R[key] && v.src !== R[key]) {
      v.src = R[key];
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      try { v.load(); } catch (e) {}
    }
  }

  function eachVideo(fn) {
    for (var id in MAP) { if (MAP.hasOwnProperty(id)) fn(document.getElementById(id), id); }
  }

  function pump() { eachVideo(ensureSrc); }

  function tick() {
    var vh = window.innerHeight || 800;
    eachVideo(function (v, id) {
      if (!v) return;
      ensureSrc(v);
      if (!v.muted) v.muted = true;
      if (!v.loop) v.loop = true;
      v.playsInline = true;

      if (id === 'asp-impact-video' && !v.seeking) {
        var t = v.currentTime;
        var wrapped = prevT[id] !== undefined && t + 0.2 < prevT[id];
        var firstStart = prevT[id] === undefined && t < SKIP - 0.05;
        if ((wrapped || firstStart) && (!v.duration || v.duration > SKIP)) {
          try { v.currentTime = SKIP; } catch (e) {}
        }
        prevT[id] = t;
      }

      var r = v.getBoundingClientRect();
      var inView = r.width > 0 && r.top < vh * 0.85 && r.bottom > vh * 0.15;
      if (inView) {
        if (v.paused && v.readyState >= 2) {
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else if (v.paused) {
          try { v.load(); } catch (e) {}
          var p2 = v.play(); if (p2 && p2.catch) p2.catch(function () {});
        }
      } else if (!v.paused) {
        v.pause();
      }
    });
  }

  /* Multiple independent triggers so the loop survives background-tab timer/rAF
     throttling: rAF (foreground), a coarse interval, and user-interaction +
     visibility events (which fire even while throttled). */
  (function raf() { tick(); requestAnimationFrame(raf); })();
  setInterval(tick, 250);
  ['scroll', 'pointerdown', 'pointermove', 'touchstart', 'keydown', 'click', 'focus', 'visibilitychange', 'resize'].forEach(function (ev) {
    window.addEventListener(ev, function () { pump(); tick(); }, { passive: true, capture: true });
  });
  document.addEventListener('DOMContentLoaded', function () { pump(); tick(); });
  window.addEventListener('load', function () { pump(); tick(); });
  pump();
})();
