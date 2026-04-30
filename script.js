const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#primary-menu');
const header = document.querySelector('#site-header');

if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const updateHeaderState = () => {
  if (!header) return;
  header.classList.toggle('scrolled', window.scrollY > 10);
};

updateHeaderState();
window.addEventListener('scroll', updateHeaderState, { passive: true });

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduceMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.14 }
  );

  document.querySelectorAll('.fade-up').forEach((node) => observer.observe(node));
} else {
  document.querySelectorAll('.fade-up').forEach((node) => node.classList.add('in-view'));
}

const yearNode = document.querySelector('#year');
if (yearNode) yearNode.textContent = String(new Date().getFullYear());
