/* ============================================================================
   tsao-ship.js — a 3D cargo steamer (three.js) rendered into a transparent
   canvas, built to match the attached reference: dark-maroon hull, cream
   multi-tier superstructure aft, a single raked funnel with a cream band and
   dark cap, a foremast flying a gold pennant, low deck cargo — plus a soft,
   flowing foam wake spreading behind the stern and a small bow wave.

   The canvas is positioned/flipped/tilted by the host page (it follows the
   sea-route just like the old flat SVG did). This module only draws + animates
   the ship and its wake. Exposes window.TsaoShip = { ready, resize }.
   ========================================================================== */
(function () {
  'use strict';

  var THREE, scene, camera, renderer, clock, raf, canvas, ship, started = false;
  var flag, wakeStreaks = [], sternChurn, bowWave;

  // ---- palette (tuned to the reference illustration) ----------------------
  var HULL   = 0x6a2a23;   // Tsao maroon hull
  var HULL_D = 0x481c17;   // dark boot-top near the waterline
  var DECK   = 0xb7a684;   // tan deck
  var CREAM  = 0xf1ebd9;   // superstructure (lit faces)
  var CREAM2 = 0xe2d7bd;   // superstructure (shaded faces)
  var DARK   = 0x2a221a;   // masts, window bands, funnel cap
  var GOLD   = 0xc09236;   // pennant
  var CARGO1 = 0xcbbd9a;
  var CARGO2 = 0xbfb088;
  var FOAM   = 0xfdfcf7;
  var WAKE   = 0x4a4133;   // faint dark-taupe ripple lines (reads on the parchment chart)

  function mat(color, rough, metal) {
    return new THREE.MeshStandardMaterial({ color: color, roughness: rough == null ? 0.85 : rough, metalness: metal || 0.0 });
  }
  function box(w, h, d, m) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); }
  function add(parent, mesh, x, y, z) { mesh.position.set(x, y, z); parent.add(mesh); return mesh; }

  /* ---- soft radial sprite for foam churn / contact shadow ---------------- */
  function radialTex(inner, outerAlpha0) {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, inner);
    grd.addColorStop(0.55, inner.replace(/[\d.]+\)$/, (outerAlpha0 != null ? outerAlpha0 : 0.35) + ')'));
    grd.addColorStop(1, inner.replace(/[\d.]+\)$/, '0)'));
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    var t = new THREE.CanvasTexture(c); return t;
  }

  /* ---- the ship ----------------------------------------------------------- */
  function buildShip() {
    var g = new THREE.Group();
    var hullMat = mat(HULL, 0.72), hullDarkMat = mat(HULL_D, 0.7);
    var deckMat = mat(DECK, 0.95), creamMat = mat(CREAM, 0.82), cream2Mat = mat(CREAM2, 0.85);
    var darkMat = mat(DARK, 0.6);

    // --- HULL: long body, dark boot-top, raised pointed bow (+x = bow) ------
    var hull = add(g, box(18, 2.6, 4.2, hullMat), -0.5, 0.45, 0);
    add(g, box(18.05, 0.7, 4.28, hullDarkMat), -0.5, -0.62, 0);          // boot-top stripe
    // sheer line (pale rubbing strake just under deck)
    add(g, box(18.1, 0.18, 4.34, creamMat), -0.5, 1.55, 0);
    // bulwark / deck edge
    add(g, box(17.2, 0.5, 4.0, hullMat), -0.5, 1.9, 0);
    // raised forecastle + pointed prow
    var prow = new THREE.Mesh(new THREE.ConeGeometry(2.1, 4.6, 4), hullMat);
    prow.rotation.z = -Math.PI / 2; prow.rotation.y = Math.PI / 4;
    prow.scale.set(0.5, 1, 1); add(g, prow, 10.4, 0.5, 0);
    var prowDark = new THREE.Mesh(new THREE.ConeGeometry(2.1, 2.0, 4), hullDarkMat);
    prowDark.rotation.z = -Math.PI / 2; prowDark.rotation.y = Math.PI / 4;
    prowDark.scale.set(0.5, 1, 1); add(g, prowDark, 10.4, -0.55, 0);
    add(g, box(2.4, 1.1, 4.0, hullMat), 8.0, 2.25, 0);                    // forecastle deck

    // --- DECK surface + low cargo on the foredeck --------------------------
    add(g, box(16.4, 0.3, 3.4, deckMat), -0.5, 2.16, 0);
    var cargoX = [6.4, 4.2, 2.0, -0.2], cargoCol = [CARGO1, CARGO2, CARGO1, CARGO2];
    for (var ci = 0; ci < cargoX.length; ci++) {
      add(g, box(1.7, 1.0, 2.9, mat(cargoCol[ci], 0.9)), cargoX[ci], 2.8, 0);
    }

    // --- SUPERSTRUCTURE: stacked cream tiers, aft (−x = stern) -------------
    function tier(w, h, d, x, y) {
      var t = add(g, box(w, h, d, creamMat), x, y, 0);
      // shaded long sides
      add(g, box(w + 0.02, h * 0.96, 0.06, cream2Mat), x, y, d / 2);
      add(g, box(w + 0.02, h * 0.96, 0.06, cream2Mat), x, y, -d / 2);
      return t;
    }
    tier(7.6, 2.1, 3.7, -4.6, 3.25);     // tier 1 — house base
    tier(6.0, 1.7, 3.2, -4.9, 5.15);     // tier 2
    tier(4.4, 1.5, 2.8, -5.3, 6.75);     // tier 3 — bridge
    tier(2.6, 1.0, 2.2, -5.6, 7.95);     // wheelhouse
    // window bands (thin dark strips on the forward + side faces)
    var winY = [3.4, 5.2, 6.85];
    var winW = [7.2, 5.6, 4.0];
    var winX = [-4.6, -4.9, -5.3];
    for (var wi = 0; wi < winY.length; wi++) {
      add(g, box(winW[wi], 0.34, 0.04, darkMat), winX[wi], winY[wi], 1.61 - wi * 0.2);
      add(g, box(winW[wi], 0.34, 0.04, darkMat), winX[wi], winY[wi], -(1.61 - wi * 0.2));
    }

    // --- FUNNEL: single, raked, dark-maroon w/ cream band + dark cap -------
    var funnel = new THREE.Group();
    var fbody = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 3.6, 22), hullMat);
    funnel.add(fbody);
    var band = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.62, 22), creamMat);
    band.position.y = 0.9; funnel.add(band);
    var cap = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.98, 0.34, 22), darkMat);
    cap.position.y = 1.86; funnel.add(cap);
    funnel.position.set(-1.5, 5.6, 0);
    funnel.rotation.z = 0.10;            // slight aft rake
    g.add(funnel);

    // --- MASTS: tall foremast w/ gold pennant + short mast by the funnel ----
    var foremast = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 8.4, 10), darkMat), 2.6, 6.4, 0);
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.2, 8), darkMat), 2.6, 8.6, 0).rotation.x = Math.PI / 2; // yard
    // rigging (thin lines fore & aft of the foremast)
    var rig = new THREE.LineBasicMaterial({ color: DARK, transparent: true, opacity: 0.5 });
    function line(ax, ay, az, bx, by, bz) {
      var gm = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz)]);
      g.add(new THREE.Line(gm, rig));
    }
    line(2.6, 10.5, 0, 7.6, 3.0, 0); line(2.6, 10.5, 0, -1.5, 7.3, 0);
    var aftmast = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.6, 8), darkMat), -3.4, 8.1, 0);

    // pennant at the masthead (waves in buildShip's animate loop)
    var flagGeo = new THREE.PlaneGeometry(2.4, 1.1, 14, 5);
    flagGeo.translate(1.2, 0, 0);                       // hoist edge at local x=0
    flagGeo.userData.base = flagGeo.attributes.position.array.slice();
    flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: GOLD, side: THREE.DoubleSide, roughness: 0.7 }));
    flag.position.set(2.6, 10.4, 0); g.add(flag);

    // soft contact shadow on the water (grounds the hull)
    var sh = new THREE.Mesh(new THREE.PlaneGeometry(24, 7),
      new THREE.MeshBasicMaterial({ map: radialTex('rgba(40,30,24,0.5)', 0.3), transparent: true, depthWrite: false, opacity: 0.5 }));
    sh.rotation.x = -Math.PI / 2; sh.position.set(-0.5, -0.95, 0); add(g, sh, -0.5, -0.95, 0);

    scene.add(g); ship = g; ship.userData.flag = flag;
  }

  /* ---- flowing foam wake (spreads behind the stern) + bow wave ----------- */
  function buildWake() {
    var streakMat = function (op) {
      return new THREE.MeshBasicMaterial({ color: WAKE, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
    };
    // a fanning V of faint ripple lines trailing aft (−x) of the stern — drawn
    // in the same muted ink as the sea-chart so they read on the parchment
    var defs = [
      { len: 17, z: 0.0, w: 0.7, op: 0.20 },
      { len: 14, z: 1.4, w: 0.5, op: 0.16 },
      { len: 14, z: -1.4, w: 0.5, op: 0.16 },
      { len: 11, z: 2.8, w: 0.42, op: 0.11 },
      { len: 11, z: -2.8, w: 0.42, op: 0.11 },
      { len: 8.5, z: 4.0, w: 0.34, op: 0.07 },
      { len: 8.5, z: -4.0, w: 0.34, op: 0.07 }
    ];
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      var geo = new THREE.PlaneGeometry(d.len, d.w, 28, 1);
      geo.userData.base = geo.attributes.position.array.slice();
      geo.userData.len = d.len;
      var m = new THREE.Mesh(geo, streakMat(d.op));
      m.rotation.x = -Math.PI / 2;
      // streaks fan outward: their far (aft) end sits wider in z than the near end
      m.position.set(-9.5 - d.len / 2, -0.58, d.z);
      m.userData = { z: d.z, phase: i * 0.9, op: d.op };
      scene.add(m); wakeStreaks.push(m);
    }
    // soft churn right at the stern (a pale foam smudge over the ripples)
    sternChurn = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.6),
      new THREE.MeshBasicMaterial({ map: radialTex('rgba(74,65,51,0.34)', 0.16), transparent: true, depthWrite: false, opacity: 0.6 }));
    sternChurn.rotation.x = -Math.PI / 2; sternChurn.position.set(-9.6, -0.56, 0); scene.add(sternChurn);
    // faint bow ripple at the prow
    bowWave = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6),
      new THREE.MeshBasicMaterial({ map: radialTex('rgba(74,65,51,0.28)', 0.12), transparent: true, depthWrite: false, opacity: 0.5 }));
    bowWave.rotation.x = -Math.PI / 2; bowWave.position.set(9.8, -0.56, 0.9); scene.add(bowWave);
  }

  function waveFlag(t) {
    if (!flag) return;
    var pos = flag.geometry.attributes.position, base = flag.geometry.userData.base;
    for (var i = 0; i < pos.count; i++) {
      var x = base[i * 3], y = base[i * 3 + 1];
      var amp = Math.min(1, Math.abs(x) / 2.4);
      pos.array[i * 3 + 2] = base[i * 3 + 2] + Math.sin(x * 1.9 - t * 6.5) * 0.45 * amp + Math.sin(y * 2.0 - t * 4.0) * 0.12 * amp;
      pos.array[i * 3 + 1] = y + Math.sin(x * 1.4 - t * 5.0) * 0.1 * amp;
    }
    pos.needsUpdate = true;
  }

  function animateWake(t) {
    for (var i = 0; i < wakeStreaks.length; i++) {
      var m = wakeStreaks[i], pos = m.geometry.attributes.position, base = m.geometry.userData.base;
      var len = m.geometry.userData.len;
      for (var v = 0; v < pos.count; v++) {
        var bx = base[v * 3];                         // along-streak (−len/2 .. +len/2)
        var u = (bx + len / 2) / len;                 // 0 near stern .. 1 far aft
        // ripple travels aft; amplitude grows toward the far, spreading end
        pos.array[v * 3 + 1] = base[v * 3 + 1] + Math.sin(u * 9 - t * 4 + m.userData.phase) * 0.32 * u;
      }
      pos.needsUpdate = true;
      m.material.opacity = m.userData.op * (0.7 + 0.3 * Math.sin(t * 2.2 + m.userData.phase));
    }
    if (sternChurn) sternChurn.material.opacity = 0.7 + 0.18 * Math.sin(t * 4.5);
    if (bowWave) bowWave.material.opacity = 0.5 + 0.18 * Math.sin(t * 3.7 + 1.0);
  }

  function frameCamera() {
    var w = canvas.clientWidth || 360, h = canvas.clientHeight || 240;
    var aspect = w / h;
    var halfH = 9.8;                       // vertical world half-extent in view
    var halfW = halfH * aspect;
    camera.left = -halfW; camera.right = halfW; camera.top = halfH; camera.bottom = -halfH;
    camera.updateProjectionMatrix();
  }

  function init() {
    THREE = window.THREE;
    if (!THREE) return false;
    canvas = document.getElementById('tsao-ship-canvas');
    if (!canvas) return false;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(canvas.clientWidth || 360, canvas.clientHeight || 240, false);

    scene = new THREE.Scene();
    // 3/4 bow view from slightly above (bow +x ends up on the RIGHT)
    camera = new THREE.OrthographicCamera(-16, 16, 11, -11, -100, 200);
    camera.position.set(5.5, 8.5, 22);
    camera.lookAt(-0.5, 2.4, 0);

    scene.add(new THREE.HemisphereLight(0xfefcf4, 0xb2a890, 1.05));
    var dir = new THREE.DirectionalLight(0xfff3df, 0.6);
    dir.position.set(10, 16, 14); scene.add(dir);
    var fill = new THREE.DirectionalLight(0xeaf0f4, 0.25);
    fill.position.set(-8, 6, 10); scene.add(fill);

    buildShip();
    buildWake();
    frameCamera();

    clock = new THREE.Clock();
    started = true;
    loop();
    return true;
  }

  function loop() {
    if (!started) return;
    raf = requestAnimationFrame(loop);
    var t = clock.getElapsedTime();
    if (ship) {
      ship.position.y = Math.sin(t * 1.1) * 0.18;        // gentle bob
      ship.rotation.z = Math.sin(t * 0.85) * 0.02;       // gentle roll
      ship.rotation.x = Math.sin(t * 0.7 + 1.0) * 0.015; // gentle pitch
    }
    waveFlag(t);
    animateWake(t);
    renderer.render(scene, camera);
  }

  window.TsaoShip = {
    ready: function () { return started; },
    resize: function () {
      if (!renderer || !canvas) return;
      renderer.setSize(canvas.clientWidth || 360, canvas.clientHeight || 240, false);
      frameCamera();
    }
  };

  var tries = 0;
  var poll = setInterval(function () {
    tries++;
    if (window.THREE && document.getElementById('tsao-ship-canvas')) {
      clearInterval(poll);
      try { init(); } catch (e) { console.warn('TsaoShip init failed', e); }
    } else if (tries > 150) clearInterval(poll);
  }, 70);
  window.addEventListener('resize', function () { if (window.TsaoShip) window.TsaoShip.resize(); });
})();
