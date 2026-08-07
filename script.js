// Mobile nav toggle
const topbar = document.getElementById('topbar');
const navToggle = document.getElementById('navToggle');

navToggle.addEventListener('click', () => {
  const isOpen = topbar.classList.toggle('nav-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.nav a').forEach(link => {
  link.addEventListener('click', () => {
    topbar.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Quote form: no backend wired up yet, so just acknowledge the request.
const form = document.getElementById('quoteForm');
const status = document.getElementById('formStatus');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  status.textContent = name
    ? `Thanks, ${name.split(' ')[0]}. We'll be in touch shortly.`
    : `Thanks. We'll be in touch shortly.`;
  form.reset();
});

// Scroll-reveal for sections
const revealTargets = document.querySelectorAll('.service-card, .serve-card, .value');
if ('IntersectionObserver' in window) {
  revealTargets.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(16px)'; });
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.transition = 'opacity .5s ease, transform .5s ease';
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealTargets.forEach(el => io.observe(el));
}

// "Four Oceans" generative wave backdrop behind the Who We Serve section.
// Pure Canvas 2D, no dependencies. Pauses off-screen, on a hidden tab, and
// under prefers-reduced-motion (draws one static frame instead).
(() => {
  const canvas = document.getElementById('serveCanvas');
  if (!canvas || !canvas.getContext) return;
  const section = canvas.closest('.serve');
  if (!section) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const WAVES = [
    { color: 'rgba(28,140,134,0.35)', amplitude: 26, wavelength: 420, speed: 0.9,  baseline: 0.30 },
    { color: 'rgba(204,154,60,0.20)', amplitude: 34, wavelength: 620, speed: -0.6, baseline: 0.50 },
    { color: 'rgba(20,102,97,0.30)',  amplitude: 20, wavelength: 340, speed: 1.3,  baseline: 0.68 },
    { color: 'rgba(227,178,78,0.15)', amplitude: 40, wavelength: 760, speed: -0.5, baseline: 0.86 },
  ];
  const particles = Array.from({ length: 26 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 1 + Math.random() * 1.8,
    drift: 6 + Math.random() * 14,
    twinkleOffset: Math.random() * Math.PI * 2,
  }));

  let width = 0, height = 0, dpr = 1;
  let pointerX = 0.5;
  let running = false;
  let inView = false;
  let rafId = null;
  let startTime = null;

  function resize() {
    const rect = section.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawWave(w, t) {
    const parallax = (pointerX - 0.5) * 18;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 14) {
      const y = w.baseline * height
        + Math.sin((x / w.wavelength) + t * w.speed) * w.amplitude
        + parallax * Math.sin(x / 900 + w.baseline * 4);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = w.color;
    ctx.fill();
  }

  function drawParticles(t) {
    particles.forEach(p => {
      const px = p.x * width;
      const raw = (p.y * height) - t * p.drift;
      const py = ((raw % height) + height) % height;
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.6 + p.twinkleOffset));
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(244,239,228,${(0.35 * twinkle).toFixed(3)})`;
      ctx.fill();
    });
  }

  function render(t) {
    ctx.clearRect(0, 0, width, height);
    WAVES.forEach(w => drawWave(w, t));
    drawParticles(t);
  }

  function frame(now) {
    if (!running) return;
    if (startTime === null) startTime = now;
    render((now - startTime) / 1000);
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    startTime = null;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  resize();
  render(0);

  window.addEventListener('resize', () => { resize(); if (!running) render(0); });
  section.addEventListener('mousemove', (e) => {
    const rect = section.getBoundingClientRect();
    pointerX = (e.clientX - rect.left) / rect.width;
  });
  section.addEventListener('mouseleave', () => { pointerX = 0.5; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else if (inView) start();
  });

  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        inView = entry.isIntersecting;
        if (inView && !document.hidden) start(); else stop();
      });
    }, { threshold: 0.05 });
    io.observe(section);
  }
})();
