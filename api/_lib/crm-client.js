// Thin wrapper around the XScience CRM v1 API (Adapt's own instance,
// crm.adapt-systems.com) — the same API used by
// agent-loops/target-scanner/push-to-crm.mjs and
// agent-loops/linkedin-enrichment/lib/crm.mjs. This client follows those
// same conventions (Organization + Contact, dedup by name/domain, context
// packed into description + tags) so a website lead lands in the same
// "prospect layer" shape as scanner-sourced suspects — plus a Deal, which
// those loops don't create, since a form-fill is inquiry-shaped in a way a
// scanner-sourced suspect isn't.
//
// A website form-fill is a stronger signal than a scanner guess, but it
// still enters as a Suspect with a "New"-stage Deal — promoting further
// stays a human decision, same as every other source.

const CRM_BASE_URL = () => {
  const base = process.env.CRM_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("CRM_BASE_URL is not configured");
  return base;
};

const CRM_API_KEY = () => {
  const key = process.env.CRM_API_KEY;
  if (!key) throw new Error("CRM_API_KEY is not configured");
  return key;
};

const headers = () => ({
  Authorization: `Bearer ${CRM_API_KEY()}`,
  "Content-Type": "application/json",
});

async function crmRequest(path, { method = "GET", body } = {}) {
  const res = await fetch(`${CRM_BASE_URL()}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CRM ${method} ${path} -> ${res.status} ${text}`);
  }
  return res.json();
}

// Same normalization as push-to-crm.mjs: strip legal-entity suffixes and
// punctuation so name-based dedup isn't fooled by "Acme" vs "Acme Inc".
const LEGAL_SUFFIXES = /\b(inc|incorporated|ltd|limited|llc|llp|plc|corp|corporation|bv|nv|gmbh|ag|sa|srl|spa|oy|ab|kk|co|company|group|holding|holdings)\b/g;
const normalizeName = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[.,'’]/g, "")
    .replace(LEGAL_SUFFIXES, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const domainOf = (s) =>
  String(s || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

async function searchOrgs(q) {
  const { data = [] } = await crmRequest(`/api/v1/organization?q=${encodeURIComponent(q)}&limit=100`);
  return data;
}

// Finds an existing Organization by normalized name, falling back to the
// email's domain — matches the convention in push-to-crm.mjs's findExisting.
async function findExistingOrg(companyName, emailDomain) {
  const target = normalizeName(companyName);
  const byName = await searchOrgs(companyName);
  let match = byName.find((o) => normalizeName(o.name || "") === target);
  if (match) return match;

  if (emailDomain) {
    const byDomain = await searchOrgs(emailDomain);
    match = byDomain.find((o) => o.website && domainOf(o.website) === emailDomain);
    if (match) return match;
  }
  return null;
}

// Cached per stage-list endpoint (organization-stages, deal-stages each
// have their own id space and names, e.g. deal stage 1 = "New" but
// organization stage 1 = "Suspect").
const stageCaches = new Map();
async function resolveStageId(endpoint, stageName) {
  if (!stageCaches.has(endpoint)) {
    const { data = [] } = await crmRequest(`/api/v1/${endpoint}`);
    stageCaches.set(endpoint, new Map(data.map((s) => [s.name, s.id])));
  }
  return stageCaches.get(endpoint).get(stageName);
}

async function createOrg({ name, website, description, tags }) {
  const stageId = await resolveStageId("organization-stages", "Suspect").catch(() => undefined);
  const created = await crmRequest("/api/v1/organization", {
    method: "POST",
    body: {
      name,
      website: website || undefined,
      stageId,
      description,
      tags,
    },
  });
  return created;
}

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function formatContext(data) {
  return [
    `[WEBSITE LEAD | ${data.sourcePage || "(unknown page)"}]`,
    data.role && `Role: ${data.role}`,
    (data.sourcePlatform || data.sourceVersion) &&
      `Source platform / version: ${data.sourcePlatform || "(not given)"} ${data.sourceVersion || ""}`.trim(),
    data.appCountOrScale && `App count / scale: ${data.appCountOrScale}`,
    data.forcingEvent && `Forcing event: ${data.forcingEvent}`,
    data.timing && `Timing: ${data.timing}`,
    data.targetPreference && `Target preference: ${data.targetPreference}`,
    `Business email: ${data.isBusinessEmail ? "yes" : "no (personal domain)"}`,
    `UTM: source=${data.utmSource || "-"} medium=${data.utmMedium || "-"} campaign=${data.utmCampaign || "-"} term=${data.utmTerm || "-"} content=${data.utmContent || "-"}`,
    data.gclid && `GCLID: ${data.gclid}`,
    `Submitted at: ${data.submittedAt}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function findExistingContact(orgSlug, fullName, email) {
  const { data = [] } = await crmRequest(
    `/api/v1/contact?organization_slug=${encodeURIComponent(orgSlug)}&limit=100`
  );
  return data.find(
    (c) =>
      (email && c.email && c.email.toLowerCase() === email.toLowerCase()) ||
      `${c.first_name} ${c.last_name ?? ""}`.trim().toLowerCase() === fullName.toLowerCase()
  );
}

async function createContact({ firstName, lastName, email, organizationId, description, tags }) {
  return crmRequest("/api/v1/contact", {
    method: "POST",
    body: {
      first_name: firstName,
      last_name: lastName || undefined,
      email: email || undefined,
      organization_id: organizationId,
      stage_id: 1, // "New" — same default push-contacts-to-crm.mjs uses for a fresh contact
      tags,
      description,
    },
  });
}

function dealNameFor(data) {
  return `${data.company} — ${data.sourcePlatform || "General"} replatforming inquiry`;
}

// One Deal per submission — no dedup here. Unlike Organization/Contact
// (where re-finding the same company/person avoids duplicate records), a
// second form-fill from the same person is itself a signal worth a human
// look (renewed interest, different stack, etc.), so it gets its own Deal.
async function createDeal({ name, organizationId, contactId }) {
  const stageId = await resolveStageId("deal-stages", "New").catch(() => undefined);
  return crmRequest("/api/v1/deal", {
    method: "POST",
    body: {
      name,
      organization_id: organizationId,
      contact_id: contactId,
      stage_id: stageId,
    },
  });
}

// Orchestrates: find/create Organization -> find/create Contact.
// Returns the Organization slug/id and Contact id/whether it was newly created.
async function submitLead(data) {
  const emailDomain = domainOf(data.email.split("@")[1] || "");
  let org = await findExistingOrg(data.company, emailDomain);

  const context = formatContext(data);
  const tags = ["website-lead", data.sourcePlatform && `stack:${normalizeName(data.sourcePlatform)}`].filter(Boolean);

  if (!org) {
    org = await createOrg({
      name: data.company,
      website: emailDomain ? `https://${emailDomain}` : undefined,
      description: context,
      tags,
    });
  }

  const { firstName, lastName } = splitName(data.name);
  const fullName = `${firstName} ${lastName}`.trim() || data.email;

  const existingContact = org.slug
    ? await findExistingContact(org.slug, fullName, data.email).catch(() => null)
    : null;

  let contact = existingContact;
  if (!contact) {
    contact = await createContact({
      firstName: firstName || data.email,
      lastName,
      email: data.email,
      organizationId: org.id,
      description: context,
      tags,
    });
  }

  const deal = await createDeal({
    name: dealNameFor(data),
    organizationId: org.id,
    contactId: contact?.id,
  });

  return {
    organizationId: org.id,
    organizationSlug: org.slug,
    contactId: contact?.id,
    dealId: deal?.id,
  };
}

module.exports = { submitLead };
