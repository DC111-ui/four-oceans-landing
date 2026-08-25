// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navToggleIcon = document.getElementById('navToggleIcon');
const mobileNavPanel = document.getElementById('mobileNavPanel');
const HAMBURGER_PATH = 'M4 7H20M4 12H20M4 17H20';
const CLOSE_PATH = 'M6 6L18 18M6 18L18 6';

function setMobileNavOpen(open) {
  mobileNavPanel.hidden = !open;
  navToggle.setAttribute('aria-expanded', String(open));
  navToggleIcon.setAttribute('d', open ? CLOSE_PATH : HAMBURGER_PATH);
}

navToggle.addEventListener('click', () => {
  setMobileNavOpen(mobileNavPanel.hidden);
});

mobileNavPanel.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMobileNavOpen(false));
});

// Campaign poster carousel: auto-scrolls, pauses on hover/touch/drag and
// while scrolled off-screen, with prev/next buttons for manual control.
(() => {
  const track = document.getElementById('posterTrack');
  const prevBtn = document.getElementById('posterPrev');
  const nextBtn = document.getElementById('posterNext');
  if (!track) return;

  let paused = false;
  let resumeAt = 0;
  let offscreen = false;
  let raf = null;

  function step() {
    raf = requestAnimationFrame(step);
    if (paused || offscreen || Date.now() < resumeAt) return;
    const half = track.scrollWidth / 2;
    if (half < 10) return;
    track.scrollLeft = track.scrollLeft >= half ? track.scrollLeft - half : track.scrollLeft + 0.6;
  }
  raf = requestAnimationFrame(step);

  function nudge(dir) {
    resumeAt = Date.now() + 3000;
    track.scrollBy({ left: dir * 318, behavior: 'smooth' });
  }

  track.addEventListener('mouseenter', () => { paused = true; });
  track.addEventListener('mouseleave', () => { paused = false; resumeAt = Date.now() + 1200; });
  track.addEventListener('pointerdown', () => { paused = true; });
  track.addEventListener('pointerup', () => { paused = false; resumeAt = Date.now() + 1200; });
  track.addEventListener('wheel', () => { resumeAt = Date.now() + 3000; }, { passive: true });
  track.addEventListener('touchmove', () => { resumeAt = Date.now() + 3000; }, { passive: true });
  prevBtn.addEventListener('click', () => nudge(-1));
  nextBtn.addEventListener('click', () => nudge(1));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => { offscreen = !entries[0].isIntersecting; },
      { rootMargin: '200px 0px' }
    );
    io.observe(track);
  }
})();

// Contact form: posts to the same WordPress backend that runs the quote
// wizard, which emails the business via Brevo (see includes/notify.php's
// foq_notify_business_new_contact on the server).
const FOQ_API_BASE = 'https://fouroceansgroup.co.za/wp/wp-json/four-oceans/v1';
const contactForm = document.getElementById('contactForm');

if (contactForm) {
  const contactStatus = document.getElementById('contactFormStatus');
  const contactSubmitBtn = contactForm.querySelector('button[type="submit"]');

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('cf-name').value.trim();
    const email = document.getElementById('cf-email').value.trim();
    const phone = document.getElementById('cf-phone').value.trim();
    const service = document.getElementById('cf-service').value;
    const message = document.getElementById('cf-message').value.trim();

    const originalLabel = contactSubmitBtn.textContent;
    contactSubmitBtn.disabled = true;
    contactSubmitBtn.textContent = 'Sending…';
    contactStatus.textContent = '';

    try {
      const res = await fetch(`${FOQ_API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, service, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Couldn't send your request — please WhatsApp or call us instead.");
      }
      contactStatus.textContent = name
        ? `Thanks, ${name.split(' ')[0]}. We'll be in touch shortly.`
        : `Thanks. We'll be in touch shortly.`;
      contactForm.reset();
    } catch (err) {
      contactStatus.textContent = err.message || "Couldn't send your request — please WhatsApp or call us instead.";
    } finally {
      contactSubmitBtn.disabled = false;
      contactSubmitBtn.textContent = originalLabel;
    }
  });
}
