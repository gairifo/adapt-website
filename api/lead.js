// POST /api/lead — the site's single lead-capture endpoint.
// Not yet wired to any public form (see Phase 2 of the website plan) —
// this phase builds and tests it against an XScience CRM sandbox only.

const { validateLead } = require("./_lib/validate");
const { submitLead } = require("./_lib/crm-client");
const { sendLeadNotification } = require("./_lib/notify");

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

    // Don't let a notification failure fail the whole request — the CRM
    // write already succeeded, which is the part that matters most.
    await sendLeadNotification(data);

    res.status(200).json({ ok: true, organizationId, organizationSlug, contactId, dealId });
  } catch (err) {
    console.error("Lead submission failed:", err);
    res.status(502).json({ ok: false, error: "Could not reach the CRM. Please try again or email hello@adapt-systems.com directly." });
  }
};
