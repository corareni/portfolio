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

// Selected work: a starfield you fly through, with each project arriving from deep space like a planet
(() => {
  const work = document.querySelector('.work');
  const canvas = work && work.querySelector('.space');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cards = [...work.querySelectorAll('.project')];
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Planets: one per project, added here because they are pure decoration
  const planets = cards.map((card) => {
    const el = document.createElement('span');
    el.className = 'planet';
    el.setAttribute('aria-hidden', 'true');
    card.appendChild(el);
    return el;
  });

  let stars = [];
  let dpr = 1;
  let ticking = false;

  function buildStars() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const count = Math.round((w * h) / 5200);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random(),                // depth: near stars are bigger, brighter and move faster
      tw: Math.random() * Math.PI * 2, // twinkle phase
    }));
  }

  function drawStars(time) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const rect = work.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) return; // off screen: skip
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const travel = still ? 0 : -rect.top; // how far we've flown into the section
    for (const s of stars) {
      // Near stars drift past faster than far ones (parallax), wrapping around
      let y = (s.y - travel * (0.15 + s.z * 0.55)) % h;
      if (y < 0) y += h;
      const r = 0.4 + s.z * 1.4;
      const a = (0.35 + s.z * 0.65) * (still ? 1 : 0.75 + 0.25 * Math.sin(time / 900 + s.tw));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const clamp = (v) => Math.min(Math.max(v, 0), 1);
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  function placeCards() {
    if (still) return;
    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      // 0 when the card's top is at the bottom of the screen, 1 once it reaches the upper third
      const e = ease(clamp((innerHeight - r.top) / (innerHeight * 0.7)));
      const scale = 0.45 + 0.55 * e;
      const lift = (1 - e) * 160;
      const tilt = (1 - e) * 14;
      card.style.transform = e >= 1 ? '' : `perspective(1400px) translateY(${lift}px) rotateX(${tilt}deg) scale(${scale})`;
      card.style.opacity = e >= 1 ? '' : String(0.15 + 0.85 * e);
      // The planet arrives a little ahead of its card and keeps slowly orbiting with the scroll
      const orbit = (r.top / innerHeight) * 40;
      planets[i].style.transform = `translate(${(1 - e) * 80}px, ${(1 - e) * -120 + orbit}px) scale(${0.6 + 0.4 * e})`;
    });
  }

  function frame(time) {
    ticking = false;
    placeCards();
    drawStars(time || performance.now());
  }

  // Gentle twinkle even when not scrolling, only while the section is on screen
  function twinkle(time) {
    const rect = work.getBoundingClientRect();
    if (!still && rect.bottom > 0 && rect.top < innerHeight) drawStars(time);
    requestAnimationFrame(twinkle);
  }

  buildStars();
  frame();
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  let lastW = innerWidth;
  addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; buildStars(); } frame(); });
  // Late-loading images change the section height
  addEventListener('load', () => { buildStars(); frame(); });
  requestAnimationFrame(twinkle);
})();

// Grade tiles count up from 0.0 to the real grade when they scroll into view
(() => {
  const nums = [...document.querySelectorAll('.grades strong')];
  if (!nums.length || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const targets = nums.map((el) => {
    const value = parseFloat(el.textContent);
    const decimals = (el.textContent.split('.')[1] || '').length;
    el.textContent = (0).toFixed(decimals);
    return { el, value, decimals };
  });

  const run = ({ el, value, decimals }, delay) => {
    const duration = 1400;
    let start;
    const tick = (now) => {
      if (start === undefined) start = now + delay;
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (value * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    targets.forEach((t, i) => run(t, i * 120));
    io.disconnect();
  }, { threshold: 0.4 });
  io.observe(document.querySelector('.grades'));
})();
