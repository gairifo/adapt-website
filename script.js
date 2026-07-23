// Adapt Systems — script.js
// Mobile menu toggle, scrolled-header state, fade-up reveals, dynamic year.

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

// ─── UTM/GCLID attribution capture ──────────────────────────────
// First-touch-preserving: a param present in the URL updates storage;
// a param absent from the URL keeps whatever was captured on an earlier
// visit, so attribution survives internal navigation with no query string.
const ATTRIBUTION_KEY = 'adapt_attribution';
const ATTRIBUTION_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];

function readAttribution() {
  try {
    return JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function captureAttribution() {
  const params = new URLSearchParams(window.location.search);
  const stored = readAttribution();
  let changed = false;
  ATTRIBUTION_FIELDS.forEach((key) => {
    const value = params.get(key);
    if (value) {
      stored[key] = value;
      changed = true;
    }
  });
  if (changed) {
    try {
      localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(stored));
    } catch (e) {
      // localStorage unavailable (private mode, etc.) — attribution is best-effort.
    }
  }
}

captureAttribution();

// ─── Lead-capture form binding ──────────────────────────────────
/**
 * Fire the GA4 `generate_lead` conversion.
 *
 * Safe to call unconditionally: if gtag hasn't loaded (blocker, offline) this
 * is a no-op and never breaks the submit flow — the lead is already saved to
 * the CRM by the time this runs.
 *
 * Mark `generate_lead` as a key event in GA4 so it can be imported as a
 * Google Ads conversion later. The wedge is sent so leads can be compared
 * per source stack, and the attribution fields let paid traffic be credited.
 */
function trackLead(payload) {
  try {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', 'generate_lead', {
      // GA4 recommended params
      currency: 'EUR',
      value: 0, // real value is unknown at capture; stage value lives in the CRM
      // Adapt dimensions
      source_page: payload.sourcePage || window.location.pathname,
      source_platform: payload.sourcePlatform || 'unspecified',
      forcing_event: payload.forcingEvent || 'unspecified',
      timing: payload.timing || 'unspecified',
      utm_source: payload.utmSource || '(direct)',
      utm_medium: payload.utmMedium || '(none)',
      utm_campaign: payload.utmCampaign || '(none)',
      has_gclid: payload.gclid ? 'yes' : 'no',
    });
  } catch {
    /* analytics must never break lead capture */
  }
}

// Shared by every form.lead-form on the site — no per-page JS needed.
document.querySelectorAll('form.lead-form').forEach((form) => {
  const statusEl = form.querySelector('.form-status');
  const submitBtn = form.querySelector('button[type="submit"]');
  const successEl = form.parentElement && form.parentElement.querySelector('.form-success');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = new FormData(form);

    // Honeypot: a hidden field real users never fill in. Silently drop
    // rather than error, so bots don't learn anything from the response.
    if ((data.get('website') || '').toString().trim()) return;

    // Every lead-form must carry a real consent checkbox — there is no
    // "field is absent so assume yes" path. If a form is ever added
    // without one, this correctly fails server-side validation instead
    // of silently fabricating consent.
    const hasConsentField = !!form.querySelector('[name="consent"]');
    const consentChecked = hasConsentField && data.get('consent') === 'on';
    if (hasConsentField && !consentChecked) {
      if (statusEl) statusEl.textContent = 'Please confirm you’re OK with us contacting you about this.';
      return;
    }

    const attribution = readAttribution();
    const field = (name) => (data.get(name) || '').toString().trim();

    const payload = {
      name: field('name'),
      email: field('email'),
      company: field('company'),
      role: field('role'),
      sourcePlatform: field('sourcePlatform'),
      sourceVersion: field('sourceVersion'),
      appCountOrScale: field('appCountOrScale'),
      forcingEvent: field('forcingEvent'),
      timing: field('timing'),
      targetPreference: field('targetPreference'),
      consent: consentChecked,
      utmSource: attribution.utm_source || '',
      utmMedium: attribution.utm_medium || '',
      utmCampaign: attribution.utm_campaign || '',
      utmTerm: attribution.utm_term || '',
      utmContent: attribution.utm_content || '',
      gclid: attribution.gclid || '',
      sourcePage: window.location.pathname,
    };

    if (!payload.email || !payload.company) {
      if (statusEl) statusEl.textContent = 'Add your business email and company so we know who to follow up with.';
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (statusEl) statusEl.textContent = 'Sending…';

    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (ok && body.ok) {
          // GA4 conversion. Without this the property only records page views,
          // so a lead can't be attributed and there's no key event to import
          // into Google Ads. Mark `generate_lead` as a key event in GA4.
          trackLead(payload);
          form.reset();
          form.hidden = true;
          if (successEl) {
            successEl.hidden = false;
          } else if (statusEl) {
            statusEl.textContent = 'Thanks — we’ll be in touch shortly.';
          }
        } else {
          if (statusEl) {
            statusEl.textContent =
              (body.errors && body.errors[0]) ||
              'Something went wrong — email hello@adapt-systems.com directly.';
          }
          if (submitBtn) submitBtn.disabled = false;
        }
      })
      .catch(() => {
        if (statusEl) {
          statusEl.textContent = 'Could not reach the server — email hello@adapt-systems.com directly.';
        }
        if (submitBtn) submitBtn.disabled = false;
      });
  });
});
