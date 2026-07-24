// Shared input validation for the lead-capture endpoint.
// Kept dependency-free (no npm packages) — this is the whole repo's first
// server-side code, and the goal is the simplest thing that works.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Common free/personal email domains — not blocked, just not treated as a
// "business email" for lead-quality purposes downstream.
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
  "aol.com", "protonmail.com", "live.com", "msn.com",
]);

function isBusinessEmail(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  return Boolean(domain) && !PERSONAL_EMAIL_DOMAINS.has(domain);
}

// Validates and normalizes a lead submission. Returns { valid, errors, data }.
// `data` is only meaningful when `valid` is true.
function validateLead(body) {
  const errors = [];

  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Missing request body"], data: null };
  }

  // Honeypot: a hidden field real users never fill in. If it's non-empty,
  // silently treat as spam rather than erroring (don't tip off bots).
  if (body.website) {
    return { valid: false, errors: ["spam"], data: null };
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    errors.push("A valid business email is required.");
  }

  const company = String(body.company || "").trim();
  if (!company) {
    errors.push("Company is required.");
  }

  if (!body.consent) {
    errors.push("Consent to be contacted is required.");
  }

  if (errors.length) {
    return { valid: false, errors, data: null };
  }

  const data = {
    email,
    isBusinessEmail: isBusinessEmail(email),
    company,
    name: String(body.name || "").trim(),
    role: String(body.role || "").trim(),
    sourcePlatform: String(body.sourcePlatform || "").trim(),
    sourceVersion: String(body.sourceVersion || "").trim(),
    appCountOrScale: String(body.appCountOrScale || "").trim(),
    forcingEvent: String(body.forcingEvent || "").trim(),
    timing: String(body.timing || "").trim(),
    targetPreference: String(body.targetPreference || "").trim(),
    consent: true,
    // Attribution — preserved from hidden form fields, not re-derived here.
    utmSource: String(body.utmSource || "").trim(),
    utmMedium: String(body.utmMedium || "").trim(),
    utmCampaign: String(body.utmCampaign || "").trim(),
    utmTerm: String(body.utmTerm || "").trim(),
    utmContent: String(body.utmContent || "").trim(),
    gclid: String(body.gclid || "").trim(),
    msclkid: String(body.msclkid || "").trim(),
    fbclid: String(body.fbclid || "").trim(),
    liFatId: String(body.liFatId || "").trim(),
    // First touch (how they found us) vs sourcePage (where they converted).
    landingPage: String(body.landingPage || "").trim(),
    referrer: String(body.referrer || "").slice(0, 300).trim(),
    sourcePage: String(body.sourcePage || "").trim(),
    submittedAt: new Date().toISOString(),
  };

  return { valid: true, errors: [], data };
}

module.exports = { validateLead };
