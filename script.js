// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
if (navToggle) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// Shrink/solidify nav on scroll
const nav = document.getElementById('siteNav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    nav.style.background = 'rgba(7,15,33,0.92)';
  } else {
    nav.style.background = 'rgba(7,15,33,0.72)';
  }
}, { passive: true });

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Reveal-on-scroll for sections below the fold
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.service-card, .work-item, .why-item, .spec-row, .about-figure').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
  observer.observe(el);
});

// Project filter (projects.html)
const filterBar = document.getElementById('filterBar');
if (filterBar) {
  const items = document.querySelectorAll('#projGrid .gal-item');
  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-on'));
    btn.classList.add('is-on');
    const f = btn.dataset.f;
    items.forEach(it => {
      const show = (f === 'all') || (it.dataset.cat === f);
      it.classList.toggle('is-hidden', !show);
    });
  });
}

// Services dropdown — the label always navigates; the arrow opens the sub-menu
document.querySelectorAll('.nav-drop').forEach(function (drop) {
  var arrow = drop.querySelector('.nav-drop-toggle');
  if (arrow) {
    arrow.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var open = drop.classList.toggle('open');
      arrow.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  document.addEventListener('click', function (e) {
    if (!drop.contains(e.target)) {
      drop.classList.remove('open');
      if (arrow) arrow.setAttribute('aria-expanded', 'false');
    }
  });
});
