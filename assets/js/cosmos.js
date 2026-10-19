/* Live overlay for the opening artwork — two families of Schwarzschild geodesics.
 *
 * Units: horizon radius r_s = 1 (so M = 1/2), equatorial plane, u = 1/r.
 *
 * 1. Light (null geodesics):      u'' + u = (3/2) u^2
 *    Cartesian form:              a = -(3/2) h^2 x / r^5,          h = |x × v|
 *    Rays enter the black hole's neighbourhood; impact parameters below
 *    b_c = 3√3/2 are captured, those near b_c wind around the photon sphere r = 3/2.
 * 2. Dust (timelike geodesics):   u'' + u = 1/(2L^2) + (3/2) u^2
 *    Cartesian form:              a = -(1/(2 r^2) + (3/2) L^2 / r^4) x̂
 *    Slightly eccentric orbits outside the ISCO (r = 3) precess into rosettes;
 *    orbits that lose too much angular momentum plunge.
 * Both are integrated with a 4th-order Runge–Kutta–Nyström scheme.
 *
 * 3. Gauge fibres: phase markers turning on the U(1) circles painted in the
 *    artwork, and pulses transported between their base points.
 *
 * Artwork coordinates are pixels of the 1774×887 source image, mapped to the
 * screen with the same object-fit/object-position the CSS uses. */
(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const stage = hero.querySelector('.hero-stage');
  const stages = [...hero.querySelectorAll('.hero-stage')];
  const img = hero.querySelector('.hero-art');
  const rayCanvas = hero.querySelector('.hero-canvas.trails');
  const dustCanvas = hero.querySelector('.hero-canvas.dust');
  const fxCanvas = hero.querySelector('.hero-canvas.fx');
  const button = document.getElementById('motion-toggle');
  const rctx = rayCanvas && rayCanvas.getContext('2d');
  const dctx = dustCanvas && dustCanvas.getContext('2d');
  const fctx = fxCanvas && fxCanvas.getContext('2d');
  if (!stage || !img || !rctx || !dctx || !fctx) { if (button) button.hidden = true; return; }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reducedAtStart = reduce.matches;
  const TAU = Math.PI * 2;
  const B_CRIT = 1.5 * Math.sqrt(3);

  const ART = {
    w: 1774, h: 887,
    hole: { x: 1296, y: 236, shadow: 150 },
    fibres: [
      { x: 1093, y: 522, rx: 58, ry: 16, w: 0.55 },
      { x: 1380, y: 482, rx: 33, ry: 9.5, w: -0.8 },
      { x: 1562, y: 333, rx: 23, ry: 7, w: 1.05 },
      { x: 1688, y: 395, rx: 38, ry: 9.5, w: -0.65 },
      { x: 1433, y: 663, rx: 84, ry: 24, w: 0.42 }
    ],
    paths: [
      [[1066, 620], [1220, 520], [1372, 546]],
      [[1372, 546], [1530, 470], [1690, 452]],
      [[1066, 620], [1240, 700], [1430, 790]],
      [[1430, 790], [1600, 700], [1690, 452]]
    ]
  };

  const RAY_COLORS = [[240, 204, 138], [255, 226, 176], [204, 184, 255], [236, 230, 250]];
  const RAY_WEIGHTS = [0.4, 0.22, 0.24, 0.14];
  const DUST_COLORS = [[176, 160, 246], [150, 196, 232], [226, 200, 150], [210, 206, 238]];
  const DUST_WEIGHTS = [0.38, 0.26, 0.2, 0.16];

  const state = {
    W: 0, H: 0, dpr: 1, mobile: false,
    s: 1, ox: 0, oy: 0,
    bx: 0, by: 0, unit: 1,
    R0: 6, rays: [], dust: [], stars: [],
    t: 0, last: 0, raf: 0,
    reduced: reducedAtStart, paused: reducedAtStart, userPaused: false,
    visible: !document.hidden, inView: true,
    px: 0, py: 0, tx: 0, ty: 0
  };

  let seed = 20260717;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pick = weights => {
    let r = rand(), i = 0;
    while (r > weights[i] && i < weights.length - 1) r -= weights[i++];
    return i;
  };
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const toScreen = (x, y) => [state.bx + x * state.unit, state.by + y * state.unit];
  const artToScreen = (x, y) => [state.ox + x * state.s, state.oy + y * state.s];

  // Faint behind the text column, full strength over the artwork.
  function readingMask(sx, sy) {
    if (state.mobile) return 1 - 0.8 * smooth(state.H * 0.42, state.H * 0.66, sy);
    return 0.22 + 0.78 * smooth(state.W * 0.3, state.W * 0.6, sx);
  }

  /* ---------------- layout ---------------- */
  function layout() {
    const rect = stage.getBoundingClientRect();
    const W = Math.max(1, rect.width), H = Math.max(1, rect.height);
    state.W = W; state.H = H;
    state.mobile = window.matchMedia('(max-width: 900px)').matches;   // stacked layout: art above text
    state.dpr = Math.min(window.devicePixelRatio || 1, state.mobile ? 2 : 1.5);
    for (const [c, ctx] of [[rayCanvas, rctx], [dustCanvas, dctx], [fxCanvas, fctx]]) {
      c.width = Math.round(W * state.dpr);
      c.height = Math.round(H * state.dpr);
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    }
    const s = Math.max(W / ART.w, H / ART.h);
    const pos = getComputedStyle(img).objectPosition.split(/\s+/).map(v => parseFloat(v) / 100);
    const px = Number.isFinite(pos[0]) ? pos[0] : 0.5;
    const py = Number.isFinite(pos[1]) ? pos[1] : 0.5;
    state.s = s;
    state.ox = (W - ART.w * s) * px;
    state.oy = (H - ART.h * s) * py;
    state.bx = state.ox + ART.hole.x * s;
    state.by = state.oy + ART.hole.y * s;
    // Horizon just inside the painted silhouette; the photon sphere then sits on its bright ring.
    state.unit = (ART.hole.shadow * s) / 1.12;
    state.R0 = Math.min(8, Math.max(4.6, (Math.min(W, H) * 0.7) / state.unit));

    seed = 20260717;
    const nRays = state.mobile ? 110 : 260;
    const nDust = state.mobile ? 150 : 340;
    state.rays = Array.from({ length: nRays }, () => spawnRay({}, true));
    state.dust = Array.from({ length: nDust }, () => spawnDust({}, true));
    state.stars = Array.from({ length: state.mobile ? 40 : 90 }, () => ({
      x: rand() * W, y: rand() * H * 0.92, r: 0.35 + rand() * 0.85,
      a: 0.16 + rand() * 0.45, f: 0.25 + rand() * 1.1, p: rand() * TAU
    }));
    rctx.clearRect(0, 0, W, H);
    dctx.clearRect(0, 0, W, H);
    if (state.paused) renderStill(); else drawFx(state.t);
  }

  /* ---------------- integration ---------------- */
  function nullAccel(x, y, p) {
    const r2 = x * x + y * y, r = Math.sqrt(r2);
    const k = -1.5 * p / (r2 * r2 * r);
    return [k * x, k * y];
  }
  function dustAccel(x, y, L2) {
    const r2 = x * x + y * y, r = Math.sqrt(r2);
    const k = -(0.5 / (r2 * r) + 1.5 * L2 / (r2 * r2 * r));
    return [k * x, k * y];
  }
  // One RKN4 step of size h in the affine parameter / proper time.
  function rkn(b, h, f, p) {
    const h2 = h * h;
    const { x, y, vx, vy } = b;
    const k1 = f(x, y, p);
    const k2 = f(x + 0.5 * h * vx + 0.125 * h2 * k1[0], y + 0.5 * h * vy + 0.125 * h2 * k1[1], p);
    const k3 = f(x + 0.5 * h * vx + 0.125 * h2 * k2[0], y + 0.5 * h * vy + 0.125 * h2 * k2[1], p);
    const k4 = f(x + h * vx + 0.5 * h2 * k3[0], y + h * vy + 0.5 * h2 * k3[1], p);
    b.x = x + h * vx + h2 / 6 * (k1[0] + k2[0] + k3[0]);
    b.y = y + h * vy + h2 / 6 * (k1[1] + k2[1] + k3[1]);
    b.vx = vx + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    b.vy = vy + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  }

  /* ---------------- light rays ---------------- */
  function spawnRay(ray, warm) {
    const R0 = state.R0;
    // Impact parameters chosen where bending is strong: escaping rays just above b_c
    // (large deflection, some winding) and captured rays spiralling in below it.
    const sign = rand() < 0.5 ? -1 : 1;
    const u = rand();
    const b = sign * (u < 0.62 ? B_CRIT + Math.pow(rand(), 1.8) * 1.9 : B_CRIT * (0.45 + 0.55 * Math.sqrt(rand())));
    const th = rand() * TAU;
    const cx = Math.cos(th), cy = Math.sin(th);
    const sa = Math.max(-0.98, Math.min(0.98, b / R0)), ca = Math.sqrt(1 - sa * sa);
    ray.x = R0 * cx; ray.y = R0 * cy;
    // inward direction rotated by the impact angle
    ray.vx = -cx * ca - cy * sa;
    ray.vy = -cy * ca + cx * sa;
    ray.p = Math.pow(ray.x * ray.vy - ray.y * ray.vx, 2);
    ray.c = pick(RAY_WEIGHTS);
    ray.speed = 0.8 + rand() * 0.55;
    ray.age = 0;
    ray.out = false;
    ray.alive = true;
    if (warm) {
      // pre-advance so the scene starts populated
      const n = Math.floor(rand() * 60);
      for (let i = 0; i < n && ray.alive; i++) advanceRay(ray, 0.12);
      ray.age = 2;
      if (!ray.alive) return spawnRay(ray, false);
    }
    [ray.sx, ray.sy] = toScreen(ray.x, ray.y);
    return ray;
  }

  function advanceRay(ray, ds) {
    let left = ds, guard = 0;
    while (left > 1e-6 && guard++ < 80) {
      const r = Math.hypot(ray.x, ray.y);
      if (r < 1) { ray.alive = false; return; }
      const step = Math.min(left, Math.max(0.015, 0.05 * (r - 0.9)), 0.3);
      rkn(ray, step / (Math.hypot(ray.vx, ray.vy) || 1), nullAccel, ray.p);
      left -= step;
    }
    const r = Math.hypot(ray.x, ray.y);
    if (ray.x * ray.vx + ray.y * ray.vy > 0) ray.out = true;
    if (ray.out && r > state.R0 * 1.02) ray.alive = false;
  }

  /* ---------------- dust ---------------- */
  function spawnDust(d, warm) {
    // orbit radius: outside the ISCO, spread across the visible scene
    const rMax = Math.max(6, Math.hypot(Math.max(state.bx, state.W - state.bx), Math.max(state.by, state.H - state.by)) / state.unit);
    const r0 = 3.3 + Math.pow(rand(), 0.8) * (Math.min(rMax, 16) - 3.3);
    const th = rand() * TAU;
    const vc = 1 / Math.sqrt(2 * r0 - 3);                // circular-orbit speed
    const v = vc * (0.88 + rand() * 0.16);               // mild eccentricity → precessing rosettes
    const dir = -1;                                      // clockwise on screen
    d.x = r0 * Math.cos(th); d.y = r0 * Math.sin(th);
    d.vx = dir * -Math.sin(th) * v; d.vy = dir * Math.cos(th) * v;
    // small radial component
    const rad = (rand() - 0.5) * 0.08 * v;
    d.vx += Math.cos(th) * rad; d.vy += Math.sin(th) * rad;
    d.L2 = Math.pow(d.x * d.vy - d.y * d.vx, 2);
    d.c = pick(DUST_WEIGHTS);
    d.a = 0.25 + rand() * 0.55;
    d.age = warm ? 3 : 0;
    d.alive = true;
    [d.sx, d.sy] = toScreen(d.x, d.y);
    return d;
  }

  function advanceDust(d, dtau) {
    let left = dtau, guard = 0;
    while (left > 1e-6 && guard++ < 40) {
      const r = Math.hypot(d.x, d.y);
      if (r < 1.02) { d.alive = false; return; }
      const h = Math.min(left, 0.08 * r * Math.sqrt(r));
      rkn(d, h, dustAccel, d.L2);
      left -= h;
    }
    if (Math.hypot(d.x, d.y) > 40) d.alive = false;
  }

  /* ---------------- drawing ---------------- */
  function fadeCanvas(ctx, amount) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${amount})`;
    ctx.fillRect(0, 0, state.W, state.H);
    ctx.globalCompositeOperation = 'lighter';
  }

  function flush(ctx, buckets, colors, width) {
    for (const [key, list] of buckets) {
      const c = colors[key >> 3];
      const level = key & 7;
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${((level + 0.7) / 7).toFixed(3)})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let i = 0; i < list.length; i += 4) {
        ctx.moveTo(list[i], list[i + 1]);
        ctx.lineTo(list[i + 2], list[i + 3]);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function bucketPush(buckets, color, alpha, x0, y0, x1, y1) {
    const level = Math.max(0, Math.min(6, Math.floor(alpha * 7)));
    const key = (color << 3) | level;
    let list = buckets.get(key);
    if (!list) buckets.set(key, (list = []));
    list.push(x0, y0, x1, y1);
  }

  function drawRays(dt) {
    fadeCanvas(rctx, 1 - Math.pow(1 - 0.06, dt * 60));
    rctx.lineCap = 'round';
    const pxPerSec = Math.min(150, Math.max(70, state.W * 0.075));
    const buckets = new Map();
    const R0 = state.R0;
    for (const ray of state.rays) {
      const r = Math.hypot(ray.x, ray.y);
      const boost = Math.min(2.4, 1 + 1.2 / Math.max(0.5, r - 0.8));
      advanceRay(ray, (pxPerSec * ray.speed * boost * dt) / state.unit);
      ray.age += dt;
      if (!ray.alive) { spawnRay(ray, false); continue; }
      const [sx, sy] = toScreen(ray.x, ray.y);
      const rr = Math.hypot(ray.x, ray.y);
      const edge = smooth(R0, R0 * 0.62, rr);           // fade in/out at the outer circle
      const core = 0.28 + 0.72 / (1 + 0.55 * Math.max(0, rr - 1.5));
      const alpha = Math.min(1, ray.age / 0.6) * edge * core * readingMask(sx, sy);
      if (alpha > 0.02) bucketPush(buckets, ray.c, alpha, ray.sx, ray.sy, sx, sy);
      ray.sx = sx; ray.sy = sy;
    }
    flush(rctx, buckets, RAY_COLORS, state.mobile ? 1.1 : 1.25);
  }

  function drawDust(dt) {
    fadeCanvas(dctx, 1 - Math.pow(1 - 0.028, dt * 60));
    dctx.lineCap = 'round';
    // proper-time rate chosen so mid-scene orbits move ~40 px/s
    const tauRate = 40 / (0.27 * state.unit);
    const buckets = new Map();
    for (const d of state.dust) {
      advanceDust(d, tauRate * dt);
      d.age += dt;
      if (!d.alive) { spawnDust(d, false); continue; }
      const [sx, sy] = toScreen(d.x, d.y);
      const r = Math.hypot(d.x, d.y);
      const glow = 0.55 + 0.45 / (1 + 0.25 * Math.max(0, r - 3));
      const alpha = Math.min(1, d.age / 1.5) * d.a * glow * readingMask(sx, sy);
      if (alpha > 0.02 && sx > -30 && sx < state.W + 30 && sy > -30 && sy < state.H + 30) {
        bucketPush(buckets, d.c, alpha, d.sx, d.sy, sx, sy);
      }
      d.sx = sx; d.sy = sy;
    }
    flush(dctx, buckets, DUST_COLORS, state.mobile ? 1 : 1.15);
  }

  function localPhase(x, y, t) {
    return 0.6 * Math.sin(0.0042 * x - 0.0031 * y + 0.35 * t);
  }

  function drawFx(t) {
    const W = state.W, H = state.H, s = state.s;
    fctx.clearRect(0, 0, W, H);
    for (const st of state.stars) {
      const tw = 0.55 + 0.45 * Math.sin(st.p + t * st.f * TAU * 0.35);
      fctx.fillStyle = `rgba(236,230,250,${(st.a * tw).toFixed(3)})`;
      fctx.beginPath();
      fctx.arc(st.x, st.y, st.r, 0, TAU);
      fctx.fill();
    }
    ART.paths.forEach((path, i) => {
      const [p0, c, p1] = path.map(p => artToScreen(p[0], p[1]));
      const u = ((t * (0.07 + 0.015 * i) + i * 0.27) % 1 + 1) % 1;
      for (let k = 0; k < 14; k++) {
        const uu = u - k * 0.012;
        if (uu < 0) break;
        const x = (1 - uu) * (1 - uu) * p0[0] + 2 * (1 - uu) * uu * c[0] + uu * uu * p1[0];
        const y = (1 - uu) * (1 - uu) * p0[1] + 2 * (1 - uu) * uu * c[1] + uu * uu * p1[1];
        const a = (1 - k / 14) * 0.7 * Math.sin(Math.PI * Math.min(1, u * 1.15));
        fctx.fillStyle = `rgba(246,226,178,${a.toFixed(3)})`;
        fctx.beginPath();
        fctx.arc(x, y, Math.max(0.7, (1.9 - k * 0.1) * Math.min(1.2, s * 1.4)), 0, TAU);
        fctx.fill();
      }
    });
    for (const f of ART.fibres) {
      const [cx, cy] = artToScreen(f.x, f.y);
      const rx = f.rx * s, ry = f.ry * s;
      const phase = f.w * t + localPhase(f.x, f.y, t);
      const dir = f.w > 0 ? 1 : -1;
      fctx.lineWidth = Math.max(0.8, 1.6 * Math.min(1, s * 1.2));
      for (let k = 0; k < 16; k++) {
        const a0 = phase - dir * k * 0.07, a1 = phase - dir * (k + 1) * 0.07;
        fctx.strokeStyle = `rgba(250,226,170,${(0.55 * (1 - k / 16)).toFixed(3)})`;
        fctx.beginPath();
        fctx.ellipse(cx, cy, rx, ry, 0, Math.min(a0, a1), Math.max(a0, a1));
        fctx.stroke();
      }
      const mx = cx + rx * Math.cos(phase), my = cy + ry * Math.sin(phase);
      const R = 9 * Math.max(0.7, s);
      const glow = fctx.createRadialGradient(mx, my, 0, mx, my, R);
      glow.addColorStop(0, 'rgba(255,240,205,.95)');
      glow.addColorStop(0.35, 'rgba(246,214,150,.45)');
      glow.addColorStop(1, 'rgba(246,214,150,0)');
      fctx.fillStyle = glow;
      fctx.beginPath();
      fctx.arc(mx, my, R, 0, TAU);
      fctx.fill();
    }
  }

  // Reduced motion / paused at start: a still "long exposure" of whole geodesics.
  function renderStill() {
    const saved = seed;
    seed = 777;
    rctx.clearRect(0, 0, state.W, state.H);
    dctx.clearRect(0, 0, state.W, state.H);
    const rb = new Map(), db = new Map();
    for (let i = 0; i < (state.mobile ? 50 : 110); i++) {
      const ray = spawnRay({}, false);
      for (let k = 0; k < 500 && ray.alive; k++) {
        advanceRay(ray, 0.08);
        const [sx, sy] = toScreen(ray.x, ray.y);
        const rr = Math.hypot(ray.x, ray.y);
        const a = 0.32 * smooth(state.R0, state.R0 * 0.62, rr) * readingMask(sx, sy);
        if (a > 0.02) bucketPush(rb, ray.c, a, ray.sx, ray.sy, sx, sy);
        ray.sx = sx; ray.sy = sy;
      }
    }
    for (let i = 0; i < (state.mobile ? 40 : 90); i++) {
      const d = spawnDust({}, false);
      for (let k = 0; k < 160 && d.alive; k++) {
        advanceDust(d, 0.6);
        const [sx, sy] = toScreen(d.x, d.y);
        const a = 0.2 * d.a * readingMask(sx, sy);
        if (a > 0.02) bucketPush(db, d.c, a, d.sx, d.sy, sx, sy);
        d.sx = sx; d.sy = sy;
      }
    }
    rctx.globalCompositeOperation = 'lighter';
    dctx.globalCompositeOperation = 'lighter';
    flush(rctx, rb, RAY_COLORS, 0.9);
    flush(dctx, db, DUST_COLORS, 0.8);
    seed = saved;
    drawFx(state.t);
  }

  /* ---------------- loop & controls ---------------- */
  function frame(now) {
    state.raf = requestAnimationFrame(frame);
    if (!state.last) state.last = now;
    const dt = Math.min(0.05, (now - state.last) / 1000);
    state.last = now;
    state.t += dt;
    drawDust(dt);
    drawRays(dt);
    drawFx(state.t);
    applyParallax(0.06);
  }

  function applyParallax(ease) {
    state.px += (state.tx - state.px) * ease;
    state.py += (state.ty - state.py) * ease;
    const scroll = state.reduced ? 0 : Math.min(window.scrollY, state.H);
    const t = `translate3d(${state.px.toFixed(2)}px, ${(state.py + scroll * 0.22).toFixed(2)}px, 0)`;
    for (const st of stages) st.style.transform = t;
  }

  const running = () => !state.paused && state.visible && state.inView;
  let lastPaused = null;
  function sync() {
    if (running() && !state.raf) {
      state.last = 0;
      state.raf = requestAnimationFrame(frame);
    } else if (!running() && state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }
    if (button) {
      button.setAttribute('aria-pressed', String(state.paused));
      const label = button.querySelector('.lbl');
      if (label) label.textContent = state.paused ? 'Resume motion' : 'Pause motion';
    }
    if (lastPaused !== state.paused) {
      lastPaused = state.paused;
      document.dispatchEvent(new CustomEvent('motionchange', { detail: { paused: state.paused } }));
    }
  }

  if (button) {
    button.addEventListener('click', () => {
      state.paused = !state.paused;
      state.userPaused = state.paused;
      sync();
    });
  }
  if (reduce.addEventListener) {
    reduce.addEventListener('change', event => {
      state.reduced = event.matches;
      state.paused = state.reduced || state.userPaused;
      if (state.reduced) {
        state.px = 0; state.py = 0; state.tx = 0; state.ty = 0;
        applyParallax(1);
      }
      if (state.paused) renderStill();
      sync();
    });
  }
  document.addEventListener('visibilitychange', () => { state.visible = !document.hidden; sync(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { state.inView = entries[0].isIntersecting; sync(); }, { threshold: 0 }).observe(hero);
  }
  hero.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || state.reduced || state.paused) return;
    state.tx = (e.clientX / innerWidth - 0.5) * -16;
    state.ty = (e.clientY / innerHeight - 0.5) * -10;
  });
  hero.addEventListener('pointerleave', () => { state.tx = 0; state.ty = 0; });
  addEventListener('scroll', () => { if (!state.raf) applyParallax(1); }, { passive: true });

  let resizeTimer = 0;
  let lastSize = '';
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const r = stage.getBoundingClientRect();
      const key = Math.round(r.width) + 'x' + Math.round(r.height);
      if (key !== lastSize) { lastSize = key; layout(); }
    }, 120);
  };
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(stage);
  else addEventListener('resize', onResize);

  const start = () => {
    const r = stage.getBoundingClientRect();
    lastSize = Math.round(r.width) + 'x' + Math.round(r.height);
    layout();
    sync();
  };
  if (img.complete) start();
  else {
    img.addEventListener('load', start, { once: true });
    img.addEventListener('error', start, { once: true });
  }
})();
