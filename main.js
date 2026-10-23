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

// Numbers count up from zero to their real value when they scroll into view (grades and quick facts)
(() => {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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

  ['.grades', '.stats'].forEach((selector) => {
    const group = document.querySelector(selector);
    if (!group) return;
    const targets = [...group.querySelectorAll('strong')].map((el) => {
      const value = parseFloat(el.textContent);
      const decimals = (el.textContent.split('.')[1] || '').length;
      el.textContent = (0).toFixed(decimals);
      return { el, value, decimals };
    });
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      targets.forEach((t, i) => run(t, i * 120));
      io.disconnect();
    }, { threshold: 0.4 });
    io.observe(group);
  });
})();


// Intro loader: "CA." grows into the full name, then the screen lifts to reveal the hero
(() => {
  const root = document.documentElement;
  const loader = document.querySelector('.loader');
  if (!loader || !root.classList.contains('intro')) { if (loader) loader.remove(); return; }
  try { sessionStorage.setItem('ca-intro', '1'); } catch (e) {}
  const finish = () => {
    root.classList.add('intro--done');
    setTimeout(() => { root.classList.remove('intro', 'intro--play', 'intro--done'); loader.remove(); }, 900);
  };
  // Name writes out at ~0.5s, the screen lifts at ~2s
  requestAnimationFrame(() => root.classList.add('intro--play'));
  setTimeout(finish, 2000);
})();

// Intro statement and About story fill in from grey to black word by word as you scroll through them
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const blocks = [...document.querySelectorAll('.intro__text, .about__story')].map((box) => {
    const words = [];
    box.querySelectorAll('p').forEach((para) => {
      const parts = para.textContent.split(/(\s+)/);
      para.textContent = '';
      parts.forEach((part) => {
        if (/^\s+$/.test(part) || part === '') { para.append(part); return; }
        const w = document.createElement('span');
        w.className = 'word';
        w.textContent = part;
        para.append(w);
        words.push(w);
      });
    });
    box.classList.add('fill');
    return { box, words };
  });
  let ticking = false;
  const update = () => {
    ticking = false;
    blocks.forEach(({ box, words }) => {
      const r = box.getBoundingClientRect();
      // Starts when the text's top is low on screen, done when its bottom reaches the middle
      const p = Math.min(Math.max((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35), 0), 1);
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < lit));
    });
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();

// Footer wordmark: size the name to fill the content width exactly
(() => {
  const mark = document.querySelector('.wordmark');
  const text = mark && mark.querySelector('span');
  if (!text) return;
  const fit = () => {
    mark.style.fontSize = '100px';
    const cs = getComputedStyle(mark);
    const room = mark.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    mark.style.fontSize = (100 * room / text.getBoundingClientRect().width) + 'px';
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fit);
  addEventListener('resize', fit);
})();

// Selected work journey: pin the row of full projects and slide it sideways as the page scrolls down.
// On phones, short screens or with reduced motion the projects simply stack.
(() => {
  const journey = document.querySelector('.journey');
  if (!journey) return;
  const pin = journey.querySelector('.journey__pin');
  const track = journey.querySelector('.journey__track');
  const bar = journey.querySelector('.journey__progress span');
  const panels = [...track.querySelectorAll('.jpanel')];
  const nav = document.querySelector('.nav');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let distance = 0;
  let active = false;
  let ticking = false;

  const layout = () => {
    const navH = nav ? nav.offsetHeight : 64;
    // Measure in sideways mode, then fall back to stacking if a project would not fit on screen
    journey.classList.remove('journey--static');
    pin.style.top = navH + 'px';
    pin.style.height = `calc(100vh - ${navH}px)`;
    // Reset any earlier scaling, then measure each project at the panel width
    panels.forEach((p) => { const a = p.firstElementChild; a.style.width = ''; a.style.transform = ''; a.style.position = ''; p.style.height = ''; });
    const room = innerHeight - navH - 80;
    const panelW = panels[0].clientWidth;
    const tallestAt = (w) => {
      panels.forEach((p) => { p.firstElementChild.style.width = w + 'px'; });
      return Math.max(...panels.map((p) => p.firstElementChild.offsetHeight));
    };
    // If a project is taller than the window, lay it out a bit wider and scale it down to fit
    // Wider layouts are shorter, so settle on a scale over a few rounds, then make the final fit exact
    let scale = 1;
    for (let i = 0; i < 5; i++) scale = Math.min(1, room / tallestAt(panelW / scale));
    const w = panelW / scale;
    scale = Math.min(1, room / tallestAt(w));
    active = !still && innerWidth >= 900 && scale >= 0.55;
    if (active) {
      panels.forEach((p) => {
        const a = p.firstElementChild;
        a.style.position = 'absolute';
        a.style.left = '0';
        a.style.top = '0';
        a.style.width = w + 'px';
        a.style.transform = scale < 1 ? `scale(${scale})` : '';
        a.style.transformOrigin = '0 0';
        p.style.height = (a.offsetHeight * scale) + 'px';
      });
    } else {
      panels.forEach((p) => { const a = p.firstElementChild; a.style.width = ''; a.style.position = ''; a.style.left = ''; a.style.top = ''; });
    }
    if (!active) {
      journey.classList.add('journey--static');
      journey.style.height = '';
      return;
    }
    distance = Math.max(track.scrollWidth - pin.clientWidth, 0);
    journey.style.height = (pin.offsetHeight + distance) + 'px';
    update();
  };
  const update = () => {
    ticking = false;
    if (!active) return;
    const top = journey.getBoundingClientRect().top - parseFloat(pin.style.top);
    const p = Math.min(Math.max(-top / Math.max(distance, 1), 0), 1);
    track.style.transform = `translate3d(${-p * distance}px, 0, 0)`;
    if (bar) bar.style.transform = `scaleX(${p})`;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', layout);
  addEventListener('load', layout);
  layout();
})();
