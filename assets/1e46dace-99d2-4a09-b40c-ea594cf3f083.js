/* Principle 2 — Self-Cultivation
   A serpentine golden line threads the four stages (Humility → Realise
   limitation → Drives learning → Sharing & teaching), drawing as the section
   enters view with a stream of light flowing along it. Fully self-healing:
   every frame it re-queries the LIVE DOM (the DC template re-renders/replaces
   nodes) and drives reveal + path geometry directly, so it never binds to
   stale nodes and never leaves the content hidden. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealed = 0;     // 0..1 eased reveal progress
  var entered = false;  // latches true once the section scrolls into view
  var flowOff = 0;
  var startTime = performance.now();

  function lerpReveal(step, p) {
    if (!step) return;
    p = Math.max(0, Math.min(1, p));
    step.style.opacity = p.toFixed(3);
    step.style.transform = 'translateY(' + ((1 - p) * 28).toFixed(1) + 'px)';
    var wrap = step.querySelector('.p2-img-wrap');
    if (wrap) {
      var s = 0.6 + 0.4 * p;
      wrap.style.transform = 'scale(' + s.toFixed(3) + ')';
      wrap.style.transformOrigin = '50% 50%';
    }
  }

  function center(step, svgRect) {
    var img = step.querySelector('[data-p2img]') || step;
    var r = img.getBoundingClientRect();
    return { x: (r.left + r.right) / 2 - svgRect.left, y: (r.top + r.bottom) / 2 - svgRect.top };
  }

  function buildPath(e) {
    if (!e.svg || !e.base || !e.draw) return 0;
    var sr = e.svg.getBoundingClientRect();
    var pts = e.steps.map(function (s) { return center(s, sr); });
    if (!pts.length) return 0;
    var d = 'M ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      d += ' C ' + a.x.toFixed(1) + ' ' + (a.y + (b.y - a.y) * 0.66).toFixed(1) + ', ' +
                   b.x.toFixed(1) + ' ' + (a.y + (b.y - a.y) * 0.34).toFixed(1) + ', ' +
                   b.x.toFixed(1) + ' ' + b.y.toFixed(1);
    }
    e.base.setAttribute('d', d);
    e.draw.setAttribute('d', d);
    if (e.flow) e.flow.setAttribute('d', d);
    return e.draw.getTotalLength() || 0;
  }

  function tick() {
    var wrap = document.getElementById('p2-wrap');
    var steps = Array.prototype.slice.call(document.querySelectorAll('[data-p2step]'));
    if (!wrap || steps.length < 1) { requestAnimationFrame(tick); return; }

    var e = {
      wrap: wrap, steps: steps,
      svg: document.getElementById('p2-thread-svg'),
      base: document.getElementById('p2-path-base'),
      draw: document.getElementById('p2-path-draw'),
      flow: document.getElementById('p2-path-flow')
    };

    try {
      var vh = window.innerHeight || 800;
      var wr = wrap.getBoundingClientRect();
      if (wr.top < vh * 0.82 && wr.bottom > 0) entered = true;
      if (!entered && performance.now() - startTime > 8000) entered = true;

      var target = entered ? 1 : 0;
      if (reduce) revealed = 1;
      else { revealed += (target - revealed) * 0.08; if (target === 1 && revealed > 0.995) revealed = 1; }

      var len = buildPath(e);
      if (e.draw && len > 1) {
        var drawP = Math.max(0, Math.min(1, revealed));
        e.draw.style.strokeDasharray = len;
        e.draw.style.strokeDashoffset = (len * (1 - drawP)).toFixed(1);
        if (e.flow) {
          flowOff -= 0.85;
          e.flow.style.strokeDashoffset = flowOff.toFixed(1);
          e.flow.style.opacity = Math.max(0, Math.min(0.95, (drawP - 0.4) * 2)).toFixed(3);
        }
      }

      for (var i = 0; i < steps.length; i++) {
        lerpReveal(steps[i], (revealed - i * 0.16) / 0.34);
      }
    } catch (err) {
      steps.forEach(function (s) { s.style.opacity = '1'; });
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
