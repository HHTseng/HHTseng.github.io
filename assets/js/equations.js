/* The opening equation sequence: six equations of gauge theory and gravitation
   (after Bleecker), drawn glyph by glyph in light.
   The SVG glyph outlines live in <template data-eq> blocks (pre-typeset with
   MathJax by tools/render_equations.cjs), so no TeX engine runs here. */
(() => {
  'use strict';
  const stage = document.querySelector('.eq-stage');
  if (!stage) return;
  const templates = [...stage.querySelectorAll('template[data-eq]')];
  if (!templates.length) return;

  const canvas = stage.querySelector('.eq-canvas');
  const note = stage.querySelector('.eq-note');
  const counter = stage.querySelector('.eq-count');
  const pager = stage.querySelector('.eq-pager');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  const HOLD = 7600;           // ms an equation stays after it is drawn
  const DRAW = 2300;           // ms for the drawing sweep
  const GOLD = '#ecc98a';

  let index = -1;
  let timer = 0;
  let paused = reduce.matches;
  let progressAnim = null;
  let started = false;

  // pager
  const buttons = templates.map((tpl, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = ROMAN[i];
    b.setAttribute('aria-label', `Equation ${i + 1}: ${tpl.dataset.title}`);
    b.addEventListener('click', () => { show(i); });
    pager.appendChild(b);
    return b;
  });
  const bar = document.createElement('span');
  bar.className = 'eq-progress';
  bar.innerHTML = '<i></i>';
  pager.appendChild(bar);
  const barFill = bar.querySelector('i');

  function draw(svg, instant) {
    const paths = [...svg.querySelectorAll('path')];
    const rects = [...svg.querySelectorAll('rect')];
    if (instant || !paths.length || !paths[0].getTotalLength) return;
    const boxes = paths.map(p => p.getBoundingClientRect());
    const xs = boxes.map(b => b.left);
    const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1;
    const ys = boxes.map(b => b.top);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    paths.forEach((p, i) => {
      let len = 0;
      try { len = p.getTotalLength(); } catch (e) { len = 0; }
      if (!len) return;
      // left-to-right sweep, with a slight lag for lower lines of multi-line equations
      const along = (xs[i] - x0) / Math.max(1, x1 - x0);
      const down = y1 > y0 ? (ys[i] - y0) / (y1 - y0) : 0;
      const delay = (along * 0.82 + down * 0.18) * (DRAW - 900);
      p.style.fill = 'currentColor';
      p.style.stroke = GOLD;
      p.style.strokeLinejoin = 'round';
      p.animate([
        { strokeDasharray: `${len}`, strokeDashoffset: `${len}`, strokeWidth: '22px', fillOpacity: 0, strokeOpacity: 1 },
        { strokeDasharray: `${len}`, strokeDashoffset: '0', strokeWidth: '22px', fillOpacity: 0, strokeOpacity: 1, offset: 0.62 },
        { strokeDasharray: `${len}`, strokeDashoffset: '0', strokeWidth: '0px', fillOpacity: 1, strokeOpacity: 0 }
      ], { duration: 1500, delay, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'backwards' });
    });
    rects.forEach(r => {
      const b = r.getBoundingClientRect();
      const along = (b.left - x0) / Math.max(1, x1 - x0);
      r.animate([{ transform: 'scaleX(0)', opacity: 0.4 }, { transform: 'scaleX(1)', opacity: 1 }],
        { duration: 800, delay: along * (DRAW - 900), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards' });
    });
  }

  function show(i, opts = {}) {
    clearTimeout(timer);
    index = (i + templates.length) % templates.length;
    const tpl = templates[index];

    const old = canvas.querySelector('.eq-slide:not(.leaving)');
    if (old) {
      old.classList.add('leaving');
      setTimeout(() => old.remove(), 700);
    }
    const slide = document.createElement('div');
    slide.className = 'eq-slide';
    slide.style.position = old ? 'absolute' : 'relative';
    slide.style.left = '0';
    slide.appendChild(tpl.content.cloneNode(true));
    canvas.appendChild(slide);
    if (old) setTimeout(() => { slide.style.position = 'relative'; }, 700);
    canvas.setAttribute('aria-label', `${tpl.dataset.title}: ${tpl.dataset.tex}`);

    const svg = slide.querySelector('svg');
    if (svg) draw(svg, opts.instant || reduce.matches);
    if (note) note.textContent = tpl.dataset.note;

    buttons.forEach((b, j) => b.setAttribute('aria-current', String(j === index)));
    if (counter) counter.textContent = `${ROMAN[index]} / ${ROMAN[templates.length - 1]}`;
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (progressAnim) progressAnim.cancel();
    if (paused) { barFill.style.transform = 'scaleX(0)'; return; }
    const total = DRAW + HOLD;
    progressAnim = barFill.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: total, easing: 'linear', fill: 'forwards' });
    timer = setTimeout(() => show(index + 1), total);
  }

  document.addEventListener('motionchange', e => {
    const next = !!e.detail.paused;
    if (next === paused) return;
    paused = next;
    if (started) schedule();
  });

  // Start once the opening text has risen, and only while the hero is visible.
  const begin = () => {
    if (started) return;
    started = true;
    show(0, { instant: reduce.matches });
  };
  setTimeout(begin, reduce.matches ? 0 : 1650);

  if ('IntersectionObserver' in window) {
    let wasPaused = paused;
    new IntersectionObserver(entries => {
      const visible = entries[0].isIntersecting;
      if (!visible) { wasPaused = paused; paused = true; clearTimeout(timer); if (progressAnim) progressAnim.pause(); }
      else if (started) { paused = wasPaused; schedule(); }
    }).observe(stage);
  }
})();
