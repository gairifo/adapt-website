// Thin wrapper around Twenty CRM's REST API.
//
// Field-mapping note: Twenty's exact required fields for Person/Company
// creation (and whether extra lead attributes live on custom fields or a
// dedicated custom object) depend on how this Twenty workspace is
// configured — confirm via Settings → API & Webhooks → API playground
// once TWENTY_API_KEY exists. Until that's settled, this client takes the
// safe path: create the minimum viable Person/Company records, then attach
// every other field as a Note on the Person so no lead data is lost even
// if custom fields aren't ready yet.

const TWENTY_API_BASE_URL = process.env.TWENTY_API_BASE_URL || "https://api.twenty.com";

async function twentyRequest(path, { method = "GET", body } = {}) {
  const apiKey = process.env.TWENTY_API_KEY;
  if (!apiKey) {
    throw new Error("TWENTY_API_KEY is not configured");
  }

  const res = await fetch(`${TWENTY_API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Twenty API ${method} ${path} failed: ${res.status} ${text}`);
  }

  return res.json();
}

function companyDomainFromEmail(email) {
  return email.split("@")[1] || "";
}

// Finds a Company by domain, creating it if it doesn't exist.
// Returns the Twenty company record id, or null if the company step fails
// (a failure here should not block creating the Person).
async function findOrCreateCompany(domainName, name) {
  if (!domainName) return null;

  try {
    const search = await twentyRequest(
      `/rest/companies?filter=domainName.primaryLinkUrl[eq]:${encodeURIComponent(domainName)}`
    );
    const existing = search?.data?.companies?.[0];
    if (existing) return existing.id;

    const created = await twentyRequest("/rest/companies", {
      method: "POST",
      body: {
        name: name || domainName,
        domainName: { primaryLinkUrl: `https://${domainName}`, primaryLinkLabel: "" },
      },
    });
    return created?.data?.createCompany?.id || null;
  } catch (err) {
    console.error("Twenty: findOrCreateCompany failed", err);
    return null;
  }
}

async function createPerson({ firstName, lastName, email, companyId }) {
  const created = await twentyRequest("/rest/people", {
    method: "POST",
    body: {
      name: { firstName: firstName || "", lastName: lastName || "" },
      emails: { primaryEmail: email },
      ...(companyId ? { companyId } : {}),
    },
  });
  return created?.data?.createPerson?.id || null;
}

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function formatNoteBody(data) {
  const lines = [
    `Source page: ${data.sourcePage || "(unknown)"}`,
    `Role: ${data.role || "(not given)"}`,
    `Source platform / version: ${data.sourcePlatform || "(not given)"} ${data.sourceVersion || ""}`.trim(),
    `App count / scale: ${data.appCountOrScale || "(not given)"}`,
    `Forcing event: ${data.forcingEvent || "(not given)"}`,
    `Timing: ${data.timing || "(not given)"}`,
    `Target preference: ${data.targetPreference || "(not given)"}`,
    `Business email: ${data.isBusinessEmail ? "yes" : "no (personal domain)"}`,
    `UTM: source=${data.utmSource || "-"} medium=${data.utmMedium || "-"} campaign=${data.utmCampaign || "-"} term=${data.utmTerm || "-"} content=${data.utmContent || "-"}`,
    `GCLID: ${data.gclid || "-"}`,
    `Submitted at: ${data.submittedAt}`,
  ];
  return lines.join("\n");
}

async function createNoteOnPerson(personId, data) {
  try {
    const note = await twentyRequest("/rest/notes", {
      method: "POST",
      body: { title: "Website lead submission", body: formatNoteBody(data) },
    });
    const noteId = note?.data?.createNote?.id;
    if (!noteId) return;

    await twentyRequest("/rest/noteTargets", {
      method: "POST",
      body: { noteId, personId },
    });
  } catch (err) {
    // A failed note attachment shouldn't fail the whole submission — the
    // Person record still exists and the notification email still fires.
    console.error("Twenty: createNoteOnPerson failed", err);
  }
}

// Orchestrates: find/create Company -> create Person -> attach a Note with
// every field not yet mapped to a Twenty custom field.
async function submitLead(data) {
  const domain = companyDomainFromEmail(data.email);
  const companyId = await findOrCreateCompany(domain, data.company);
  const { firstName, lastName } = splitName(data.name);

  const personId = await createPerson({
    firstName,
    lastName,
    email: data.email,
    companyId,
  });

  if (personId) {
    await createNoteOnPerson(personId, data);
  }

  return { personId, companyId };
}

module.exports = { submitLead };
