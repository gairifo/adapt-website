// POST /api/lead — the site's single lead-capture endpoint.
//
// Live, and the only path a lead takes: every form on the site posts here via
// the shared handler in script.js. Creates an Organization (stage Suspect,
// tag `website-lead`), a Contact, and a Deal in XScience.
//
// The `website-lead` tag matters downstream — it excludes the record from cold
// Waalaxy outbound (crm/src/lib/gtm-export.ts). Someone who filled in a form
// must never be cold-DM'd, so don't drop that tag.

const { validateLead } = require("./_lib/validate");
const { submitLead } = require("./_lib/crm-client");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { valid, errors, data } = validateLead(req.body);

  if (!valid) {
    // Spam caught by the honeypot gets a generic 200 so bots don't learn
    // anything from the response; genuine validation errors get a 400.
    if (errors[0] === "spam") {
      res.status(200).json({ ok: true });
      return;
    }
    res.status(400).json({ ok: false, errors });
    return;
  }

  try {
    const { organizationId, organizationSlug, contactId, dealId } = await submitLead(data);
    res.status(200).json({ ok: true, organizationId, organizationSlug, contactId, dealId });
  } catch (err) {
    console.error("Lead submission failed:", err);
    res.status(502).json({ ok: false, error: "Could not reach the CRM. Please try again or email hello@adapt-systems.com directly." });
  }
};
