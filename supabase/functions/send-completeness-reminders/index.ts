// Sends a single timesheet completeness reminder email to the whole group via Gmail connector gateway.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

interface Recipient {
  name: string;
  email: string;
  completeness: number;
  actualHours: number;
  expectedHours: number;
}

function b64url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function encodeSubject(s: string): string {
  // RFC 2047 encoded-word for UTF-8 subjects with non-ASCII chars
  return /[^\x00-\x7F]/.test(s) ? `=?UTF-8?B?${b64(s)}?=` : s;
}

function buildRaw(to: string, subject: string, html: string): string {
  const msg = [
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
  ].join("\r\n");
  return b64url(msg);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function emailHtml(recipients: Recipient[], periodLabel: string): string {
  const rows = recipients
    .slice()
    .sort((a, b) => a.completeness - b.completeness)
    .map((r) => {
      const pct = Math.round(r.completeness);
      const actual = Math.round(r.actualHours);
      const expected = Math.round(r.expectedHours);
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(r.name)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${pct}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;color:#555;">${actual}h / ${expected}h</td>
      </tr>`;
    })
    .join("");

  const greeting = recipients.length === 1
    ? `Hi ${escapeHtml((recipients[0].name || "").trim().split(/\s+/)[0] || "there")},`
    : "Hi team,";
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.5;">
  <p>${greeting}</p>
  <p>Just a friendly nudge — the following timesheets are currently below 95% complete for <strong>${escapeHtml(periodLabel)}</strong>. Please top yours up when you have a moment so we have a clean view of where time is going.</p>
  <table style="border-collapse:collapse;width:100%;max-width:520px;margin:16px 0;font-size:14px;">
    <thead>
      <tr style="background:#ff7daa;">
        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #ddd;color:#ffffff;">Name</th>
        <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #ddd;color:#ffffff;">Completeness</th>
        <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #ddd;color:#ffffff;">Logged</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p>Thanks!</p>
  <p>James</p>
  </body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
    if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) {
      return new Response(JSON.stringify({ error: "Gmail connector not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const recipients: Recipient[] = Array.isArray(body?.recipients) ? body.recipients : [];
    const periodLabel: string = String(body?.periodLabel || "the selected period");

    if (!recipients.length) {
      return new Response(JSON.stringify({ error: "No recipients provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validRecipients = recipients.filter((r) => r.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email));
    const invalid = recipients.filter((r) => !validRecipients.includes(r));
    if (!validRecipients.length) {
      return new Response(JSON.stringify({ error: "No valid recipient emails", invalid }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toHeader = validRecipients.map((r) => `${r.name.replace(/[<>"]/g, "")} <${r.email}>`).join(", ");
    const subject = `Timesheet reminder — ${periodLabel}`;
    const raw = buildRaw(toHeader, subject, emailHtml(validRecipients, periodLabel));

    const resp = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
      },
      body: JSON.stringify({ raw }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ ok: false, error: `HTTP ${resp.status}: ${txt.slice(0, 400)}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, sentTo: validRecipients.length, invalid: invalid.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
