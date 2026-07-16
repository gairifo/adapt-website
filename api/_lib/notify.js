// Email notification for new leads via Resend (https://resend.com) —
// picked because it's a single REST call with no SDK required, matching
// this repo's zero-dependency approach. Swap the fetch call below if a
// different provider is chosen; the rest of api/lead.js doesn't care.

async function sendLeadNotification(data) {
  const apiKey = process.env.EMAIL_API_KEY;
  const to = process.env.LEAD_NOTIFICATION_TO;
  const from = process.env.LEAD_NOTIFICATION_FROM;

  if (!apiKey || !to || !from) {
    console.warn("Email notification skipped: EMAIL_API_KEY/LEAD_NOTIFICATION_TO/FROM not configured");
    return;
  }

  const subject = `New website lead: ${data.company} (${data.email})`;
  const text = [
    `Company: ${data.company}`,
    `Email: ${data.email}${data.isBusinessEmail ? "" : "  (personal domain)"}`,
    `Name: ${data.name || "(not given)"}`,
    `Role: ${data.role || "(not given)"}`,
    `Source platform / version: ${data.sourcePlatform || "(not given)"} ${data.sourceVersion || ""}`.trim(),
    `App count / scale: ${data.appCountOrScale || "(not given)"}`,
    `Forcing event: ${data.forcingEvent || "(not given)"}`,
    `Timing: ${data.timing || "(not given)"}`,
    `Target preference: ${data.targetPreference || "(not given)"}`,
    `Page: ${data.sourcePage || "(unknown)"}`,
    `UTM: source=${data.utmSource || "-"} medium=${data.utmMedium || "-"} campaign=${data.utmCampaign || "-"}`,
    `GCLID: ${data.gclid || "-"}`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Lead notification email failed:", res.status, body);
    }
  } catch (err) {
    // Never let a notification failure fail the lead submission itself.
    console.error("Lead notification email threw:", err);
  }
}

module.exports = { sendLeadNotification };
