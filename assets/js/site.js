/* Page behaviour: math, theme, navigation, reveals, publication filters,
   the DANO parameter widget, and a figure lightbox. Everything degrades to
   plain readable HTML without JavaScript. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Opening: split the name into letters, then reveal ---------- */
  const name = document.querySelector('.hero-name');
  if (name && !reduceMotion.matches) {
    let index = 0;
    name.querySelectorAll('.line').forEach(line => {
      const text = line.textContent;
      line.textContent = '';
      for (const ch of text) {
        const span = document.createElement('span');
        span.className = 'ch';
        span.style.setProperty('--i', index++);
        span.textContent = ch;
        span.setAttribute('aria-hidden', 'true');
        line.appendChild(span);
      }
    });
  }
  const markLoaded = () => requestAnimationFrame(() => root.classList.add('is-loaded'));
  const art = document.querySelector('.hero-art');
  if (art && !art.complete) {
    art.addEventListener('load', markLoaded, { once: true });
    art.addEventListener('error', markLoaded, { once: true });
    setTimeout(markLoaded, 1800);
  } else {
    markLoaded();
  }

  /* ---------- Mathematics (KaTeX auto-render) ---------- */
  function renderMath() {
    if (!window.renderMathInElement) return false;
    window.renderMathInElement(document.body, {
      delimiters: [
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'template', 'svg'],
      throwOnError: false
    });
    return true;
  }
  // On narrow screens, shrink any display equation that is wider than its box.
  function fitMath() {
    document.querySelectorAll('.katex-display > .katex').forEach(k => {
      k.style.fontSize = '';
      // Formal diagrams retain readable labels and scroll inside their own box.
      if (k.closest('.note-diagram, .eq-single-line')) return;
      const box = k.parentElement;
      const ratio = box.clientWidth / box.scrollWidth;
      if (ratio < 1) {
        const size = parseFloat(getComputedStyle(k).fontSize);
        k.style.fontSize = `${(size * Math.max(0.6, ratio * 0.98)).toFixed(2)}px`;
      }
    });
  }
  const mathReady = () => { if (renderMath()) { fitMath(); return true; } return false; };
  if (!mathReady()) window.addEventListener('load', mathReady, { once: true });
  let fitTimer = 0;
  addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitMath, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMath);

  /* ---------- Theme toggle ---------- */
  const toggle = document.querySelector('.theme-toggle');
  const syncToggle = () => {
    const light = root.getAttribute('data-theme') === 'light';
    toggle.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', light ? '#f6f2ea' : '#0e0d1f');
  };
  if (toggle) {
    syncToggle();
    toggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
      syncToggle();
    });
  }

  /* ---------- Navigation: active section and reading progress ---------- */
  const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const sections = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const progress = document.querySelector('.nav-progress');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      const probe = scrollY + innerHeight * 0.32;
      let current = null;
      for (const section of sections) if (section.offsetTop <= probe) current = section;
      navLinks.forEach(a => a.classList.toggle('active', current && a.getAttribute('href') === '#' + current.id));
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  /* ---------- Publication filters ---------- */
  const filterButtons = [...document.querySelectorAll('.filters button')];
  const pubs = [...document.querySelectorAll('.pub')];
  const years = [...document.querySelectorAll('.pub-year')];
  const count = document.querySelector('.pub-count');
  function applyFilter(filter) {
    let shown = 0;
    for (const pub of pubs) {
      const cats = pub.dataset.cats.split(' ');
      const visible = filter === 'all' || cats.includes(filter);
      pub.classList.toggle('is-hidden', !visible);
      if (visible) shown++;
    }
    for (const year of years) year.classList.toggle('is-empty', !year.querySelector('.pub:not(.is-hidden)'));
    filterButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
    if (count) count.textContent = `${shown} of ${pubs.length} shown`;
  }
  filterButtons.forEach(b => b.addEventListener('click', () => applyFilter(b.dataset.filter)));
  if (pubs.length) applyFilter('all');

  /* ---------- DANO parameter-count widget ---------- */
  const range = document.getElementById('k-range');
  if (range) {
    const out = document.getElementById('k-out');
    const barFull = document.getElementById('bar-full');
    const barDiag = document.getElementById('bar-diag');
    const numFull = document.getElementById('num-full');
    const numDiag = document.getElementById('num-diag');
    const maxLog = Math.log10(Math.pow(4, 10));
    const fmt = n => n.toLocaleString('en-US');
    const update = () => {
      const k = Number(range.value);
      const full = Math.pow(4, k);
      const diag = Math.pow(2, k);
      out.textContent = k;
      numFull.textContent = fmt(full);
      numDiag.textContent = fmt(diag);
      barFull.style.width = `${Math.max(3, 100 * Math.log10(full + 1) / maxLog)}%`;
      barDiag.style.width = `${Math.max(3, 100 * Math.log10(diag + 1) / maxLog)}%`;
    };
    range.addEventListener('input', update);
    update();
  }

  /* ---------- Figure lightbox ---------- */
  const box = document.querySelector('.lightbox');
  if (box) {
    const boxImg = box.querySelector('img');
    const boxCap = box.querySelector('p');
    const original = box.querySelector('.lightbox-original');
    let opener = null;
    const close = () => {
      box.classList.remove('open');
      setTimeout(() => { box.hidden = true; }, 300);
      if (opener) opener.focus();
    };
    document.querySelectorAll('img.zoom').forEach(img => {
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Enlarge figure: ' + (img.alt || ''));
      const open = () => {
        opener = img;
        boxImg.src = img.currentSrc || img.src;
        boxImg.alt = img.alt;
        original.href = boxImg.src;
        const cap = img.closest('figure')?.querySelector('figcaption');
        const label = cap?.querySelector('.fl');
        boxCap.replaceChildren();
        if (cap) {
          const copy = cap.cloneNode(true);
          copy.querySelector('.fl')?.remove();
          if (label) boxCap.append(document.createTextNode(label.textContent + ' — '));
          // Preserve the rendered mathematics and source links in the caption.
          boxCap.append(...copy.childNodes);
        }
        box.hidden = false;
        requestAnimationFrame(() => box.classList.add('open'));
        box.querySelector('button').focus();
      };
      img.addEventListener('click', open);
      img.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    box.addEventListener('click', e => { if (e.target === box || e.target.closest('button')) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('open')) close(); });
  }
})();
