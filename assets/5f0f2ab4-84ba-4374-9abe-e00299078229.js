/* Principle 1 — We Over Me
   Golden energy lines that draw from the "We Over Me" hero down to the three
   beneficiaries, with a stream of light flowing continuously outward.
   Mirrors the Principle 2 effect, but fully self-healing: every frame it
   re-queries the LIVE DOM nodes (the DC template re-renders/replaces them) and
   drives reveal + path geometry directly — so it never binds to stale nodes
   and never leaves the column hidden. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealed = 0;     // 0..1 eased reveal progress
  var entered = false;  // latches true once the section scrolls into view
  var flowOff = 0;
  var startTime = performance.now();

  function lerpReveal(el, p, dy, sc) {
    if (!el) return;
    p = Math.max(0, Math.min(1, p));
    el.style.opacity = p.toFixed(3);
    el.style.transform = 'translateY(' + ((1 - p) * dy).toFixed(1) + 'px) scale(' + (sc + (1 - sc) * p).toFixed(3) + ')';
  }

  function center(el, svgRect, edge) {
    var r = el.getBoundingClientRect();
    var x = (r.left + r.right) / 2 - svgRect.left;
    var y = (edge === 'bottom' ? r.bottom - 6 : r.top + 4) - svgRect.top;
    return { x: x, y: y };
  }

  function buildPath(e) {
    if (!e.svg || !e.base || !e.draw || !e.flow) return 0;
    var sr = e.svg.getBoundingClientRect();
    var a = center(e.hero, sr, 'bottom');
    var ds = [];
    for (var i = 0; i < e.sats.length; i++) {
      var img = e.sats[i].querySelector('[data-p1img]') || e.sats[i];
      var b = center(img, sr, 'top');
      var c1y = a.y + (b.y - a.y) * 0.58;
      var c2y = a.y + (b.y - a.y) * 0.42;
      ds.push('M ' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) +
              ' C ' + a.x.toFixed(1) + ' ' + c1y.toFixed(1) + ', ' +
                      b.x.toFixed(1) + ' ' + c2y.toFixed(1) + ', ' +
                      b.x.toFixed(1) + ' ' + b.y.toFixed(1));
    }
    var full = ds.join(' ');
    e.base.setAttribute('d', full);
    e.draw.setAttribute('d', full);
    e.flow.setAttribute('d', full);
    return e.draw.getTotalLength() || 0;
  }

  function tick() {
    var wrap = document.getElementById('p1-wrap');
    var hero = document.getElementById('p1-hero');
    var sats = Array.prototype.slice.call(document.querySelectorAll('[data-p1sat]'));

    if (!wrap || !hero || sats.length < 3) { requestAnimationFrame(tick); return; }

    var e = {
      wrap: wrap, hero: hero, sats: sats,
      svg: document.getElementById('p1-thread-svg'),
      base: document.getElementById('p1-path-base'),
      draw: document.getElementById('p1-path-draw'),
      flow: document.getElementById('p1-path-flow')
    };

    try {
      var vh = window.innerHeight || 800;
      var wr = wrap.getBoundingClientRect();
      if (wr.top < vh * 0.8 && wr.bottom > 0) entered = true;

      var target = entered ? 1 : 0;
      if (reduce) {
        revealed = 1;                       // always visible, no motion
      } else {
        revealed += (target - revealed) * 0.08;
        if (target === 1 && revealed > 0.995) revealed = 1;
      }

      // hard failsafe: never leave the column hidden
      if (!entered && performance.now() - startTime > 8000) { entered = true; }

      var len = buildPath(e);
      if (e.draw && len > 1) {
        var drawP = Math.max(0, Math.min(1, (revealed - 0.15) / 0.7));
        e.draw.style.strokeDasharray = len;
        e.draw.style.strokeDashoffset = (len * (1 - drawP)).toFixed(1);
        flowOff -= 0.85;
        e.flow.style.strokeDashoffset = flowOff.toFixed(1);
        e.flow.style.opacity = Math.max(0, Math.min(0.95, (drawP - 0.4) * 2)).toFixed(3);
      }

      lerpReveal(hero, revealed / 0.3, 22, 0.9);
      for (var i = 0; i < sats.length; i++) {
        lerpReveal(sats[i], (revealed - (0.25 + i * 0.13)) / 0.3, 22, 0.86);
      }
    } catch (err) {
      // on any failure, guarantee visibility
      hero.style.opacity = '1';
      sats.forEach(function (s) { s.style.opacity = '1'; });
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
