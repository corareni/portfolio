// Fade sections in as they scroll into view
const items = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach((el) => io.observe(el));
} else {
  items.forEach((el) => el.classList.add('is-visible'));
}

// Hairline under the nav once the page scrolls
const nav = document.querySelector('.nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();


// Hero heading dissolves into pixels on scroll and reassembles on the way back up
(() => {
  const title = document.querySelector('.hero .display');
  if (!title || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-particles';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let particles = [];
  let dpr = 1;
  let range = 1;
  let ink = '#0d0d0d';
  let ticking = false;

  // Draw the heading lines onto an offscreen canvas at their exact page positions, then sample pixels
  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ink = getComputedStyle(title).color;
    range = Math.max(innerHeight * 0.75, 400);

    const box = title.getBoundingClientRect();
    const pad = 4;
    const w = Math.ceil(box.width + pad * 2);
    const h = Math.ceil(box.height + pad * 2);
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const o = off.getContext('2d');
    o.fillStyle = '#000';

    title.querySelectorAll('span').forEach((line) => {
      const cs = getComputedStyle(line);
      const r = line.getBoundingClientRect();
      // A zero-size inline-block marks the exact text baseline
      const mark = document.createElement('span');
      mark.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      line.appendChild(mark);
      const baseline = mark.getBoundingClientRect().top;
      mark.remove();
      o.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      if ('letterSpacing' in o) o.letterSpacing = cs.letterSpacing;
      o.textBaseline = 'alphabetic';
      o.fillText(line.textContent.trim().toUpperCase(), r.left - box.left + pad, baseline - box.top + pad);
    });

    const step = innerWidth < 640 ? 3 : 4;
    const data = o.getImageData(0, 0, w, h).data;
    const originX = box.left - pad;
    const originY = box.top + scrollY - pad;
    particles = [];
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (data[(y * w + x) * 4 + 3] > 120) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 60 + Math.random() * 320;
          particles.push({
            x: originX + x,
            y: originY + y,
            dx: Math.cos(angle) * dist,
            dy: Math.sin(angle) * dist - 120 - Math.random() * 160,
            // Dissolve sweeps left to right with some randomness
            delay: (x / w) * 0.45 + Math.random() * 0.25,
          });
        }
      }
    }
    canvas.dataset.step = step;
    render();
  }

  const ease = (t) => t * t * (3 - 2 * t);

  function render() {
    ticking = false;
    const p = Math.min(Math.max(scrollY / range, 0), 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    if (p <= 0.001) { title.style.opacity = ''; canvas.style.visibility = 'hidden'; return; }
    title.style.opacity = '0';
    if (p >= 1) { canvas.style.visibility = 'hidden'; return; }
    canvas.style.visibility = 'visible';

    const step = +canvas.dataset.step;
    ctx.fillStyle = ink;
    for (const pt of particles) {
      const t = ease(Math.min(Math.max((p - pt.delay * 0.6) / 0.4, 0), 1));
      if (t >= 1) continue;
      const size = step * (1 - t * 0.6);
      ctx.globalAlpha = 1 - t;
      ctx.fillRect(pt.x + pt.dx * t, pt.y - scrollY + pt.dy * t, size, size);
    }
    ctx.globalAlpha = 1;
  }

  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(render); } };
  let resizeTimer;
  let lastWidth = innerWidth;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Mobile address bars change only the height while scrolling: just resize the canvas
      if (innerWidth === lastWidth) {
        canvas.width = innerWidth * dpr;
        canvas.height = innerHeight * dpr;
        render();
        return;
      }
      lastWidth = innerWidth;
      title.style.opacity = '';
      build();
    }, 150);
  };

  // Wait for Poppins so the sampled pixels match the real heading
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    // Measure with the heading visible, at the top of the page layout
    title.style.opacity = '';
    build();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize);
  });
})();

// Selected work: cards pin as you scroll and stack like a deck, the covered card easing back
(() => {
  const cards = [...document.querySelectorAll('.stack .project')];
  if (!cards.length) return;
  const nav = document.querySelector('.nav');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ticking = false;

  // Each card pins a little lower than the one before. Cards taller than the screen pin by
  // their bottom edge instead, so all of their content scrolls into view before the next one covers it.
  function layout() {
    const navH = nav ? nav.offsetHeight : 64;
    cards.forEach((card, i) => {
      const offset = navH + 16 + Math.min(i, 6) * 10;
      const fit = innerHeight - card.offsetHeight - 16;
      card.style.top = Math.min(offset, fit) + 'px';
    });
    update();
  }

  function update() {
    ticking = false;
    if (still) return;
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) { card.style.transform = ''; return; }
      const pin = parseFloat(card.style.top) || 0;
      const nextTop = next.getBoundingClientRect().top;
      const cardBottom = pin + card.offsetHeight;
      // 0 while the next card is still below this one, 1 once it has fully slid over
      const p = Math.min(Math.max((Math.min(cardBottom, innerHeight) - nextTop) / (Math.min(cardBottom, innerHeight) - pin), 0), 1);
      card.style.transform = p > 0 ? `scale(${1 - 0.06 * p})` : '';
      card.style.setProperty('--cover', (0.45 * p).toFixed(3));
    });
  }

  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', layout);
  addEventListener('load', layout);
  layout();
})();
