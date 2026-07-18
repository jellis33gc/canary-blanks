// base44/functions/sendCampaign/entry.ts
//
// Two ways to call this function:
//
// 1) Manual "Send now" - invoke from the admin Marketing page with a campaignId:
//      base44.functions.invoke("sendCampaign", { campaignId: "..." })
//
// 2) Scheduled campaigns - set up as a SCHEDULED automation that runs every 10-15
//    minutes with { mode: "scheduled_scan" }. Finds any Campaign with status "scheduled"
//    whose scheduled_at has passed and sends it.
//
// Sends go through Resend's batch API (up to 100 recipients per request), so a campaign
// to thousands of subscribers still costs exactly 1 Base44 credit when sent on a
// schedule - never one credit per email.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const BATCH_SIZE = 100;

function buildUnsubscribeUrl(settings: any, token: string) {
  const base = (settings.app_base_url || "").replace(/\/$/, "");
  const path = settings.unsubscribe_page_path || "/unsubscribe";
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

function toParagraphs(text: string) {
  if (/<[a-z][\s\S]*>/i.test(text)) return text; // already HTML - leave as authored
  return text
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 16px;">${para.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function linkify(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return `<a href="${value}" style="color:#DC2828;font-weight:600;">${value}</a>`;
  }
  return value;
}

// Branded shell matching canaryblanks.es: logo header, red (#DC2828) accent, navy
// (#142048) body text, Inter font - so any content dropped in (plain text or HTML)
// looks like it belongs on the site instead of a bare unstyled email.
function wrapInBrandShell(innerHtml: string, settings: any, unsubscribeUrl: string) {
  const primary = "#DC2828";
  const dark = "#142048";
  const logo = settings.logo_url || "";
  const brand = settings.brand_name || settings.from_name || "";
  return `
  <div style="background:#f4f5f7;padding:32px 16px;font-family:'Inter',Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eceef1;">
      <div style="padding:28px 32px;text-align:center;border-bottom:3px solid ${primary};">
        ${logo ? `<img src="${logo}" alt="${brand}" style="height:48px;width:auto;" />` : `<span style="font-size:20px;font-weight:800;color:${dark};">${brand}</span>`}
      </div>
      <div style="padding:32px;color:${dark};font-size:15px;line-height:1.65;">
        ${innerHtml}
      </div>
      <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #eceef1;">
        <p style="font-size:12px;color:#8b8f99;line-height:1.6;margin:0;">
          ${brand}${settings.company_postal_address ? " &middot; " + settings.company_postal_address : ""}<br/>
          <a href="${unsubscribeUrl}" style="color:#8b8f99;">Unsubscribe</a>
        </p>
      </div>
    </div>
  </div>`;
}

function renderEmail(html: string, vars: Record<string, string>, settings: any) {
  let body = toParagraphs(html);
  for (const [key, value] of Object.entries(vars)) {
    const rendered = /url$/i.test(key) ? linkify(value || "") : value ?? "";
    body = body.replaceAll(`{{${key}}}`, rendered);
  }
  return wrapInBrandShell(body, settings, vars.unsubscribe_url);
}

async function sendBatchViaResend(emails: Array<{ to: string; subject: string; html: string; from: string; reply_to?: string }>) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY secret is not set.");
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(
      emails.map((e) => ({
        from: e.from,
        to: [e.to],
        subject: e.subject,
        html: e.html,
        reply_to: e.reply_to || undefined,
      })),
    ),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend batch error (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

async function sendOneCampaign(db: any, settings: any, campaign: any) {
  await db.Campaign.update(campaign.id, { status: "sending" });

  let recipients = await db.Subscriber.filter({ status: "active" }, undefined, 5000);
  if (campaign.tag_filter && campaign.tag_filter.length > 0) {
    recipients = recipients.filter((s: any) =>
      (s.tags || []).some((t: string) => campaign.tag_filter.includes(t)),
    );
  }

  const from = `${campaign.from_name || settings.from_name} <${campaign.from_email || settings.from_email}>`;
  const replyTo = campaign.reply_to_email || settings.reply_to_email;

  let sentCount = 0;
  let failedCount = 0;
  let lastError = "";

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const prepared = chunk.map((sub: any) => {
      const unsubscribeUrl = buildUnsubscribeUrl(settings, sub.unsubscribe_token);
      const mergeVars = {
        first_name: sub.first_name || "",
        email: sub.email,
        discount_code: sub.discount_code || settings.discount_code || "",
        unsubscribe_url: unsubscribeUrl,
      };
      return {
        to: sub.email,
        subject: campaign.subject,
        html: renderEmail(campaign.html_body, mergeVars, settings),
        from,
        reply_to: replyTo,
      };
    });

    try {
      const result = await sendBatchViaResend(prepared);
      const ids: string[] = (result.data || []).map((d: any) => d.id);
      for (let j = 0; j < prepared.length; j++) {
        await db.EmailLog.create({
          recipient_email: prepared[j].to,
          source_type: "campaign",
          source_id: campaign.id,
          subject: campaign.subject,
          status: "sent",
          provider_message_id: ids[j],
        });
      }
      sentCount += prepared.length;
    } catch (err) {
      lastError = err.message;
      for (const p of prepared) {
        await db.EmailLog.create({
          recipient_email: p.to,
          source_type: "campaign",
          source_id: campaign.id,
          subject: campaign.subject,
          status: "failed",
          error: err.message,
        });
      }
      failedCount += prepared.length;
    }
  }

  await db.Campaign.update(campaign.id, {
    status: failedCount > 0 && sentCount === 0 ? "failed" : "sent",
    sent_at: new Date().toISOString(),
    recipient_count: recipients.length,
    sent_count: sentCount,
    failed_count: failedCount,
    last_error: lastError || undefined,
  });

  return { sentCount, failedCount, recipientCount: recipients.length };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const settingsList = await db.MarketingSettings.list();
    const settings = settingsList[0];
    if (!settings) {
      return Response.json({ error: "MarketingSettings not configured." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));

    if (body.campaignId) {
      const campaign = await db.Campaign.get(body.campaignId);
      if (!campaign) return Response.json({ error: "Campaign not found." }, { status: 404 });
      if (campaign.status === "sent" || campaign.status === "sending") {
        return Response.json({ error: `Campaign already ${campaign.status}.` }, { status: 409 });
      }
      const result = await sendOneCampaign(db, settings, campaign);
      return Response.json({ ok: true, ...result });
    }

    const nowIso = new Date().toISOString();
    const scheduled = await db.Campaign.filter({ status: "scheduled" });
    const due = scheduled.filter((c: any) => c.scheduled_at && c.scheduled_at <= nowIso);

    const results = [];
    for (const campaign of due) {
      results.push({ campaignId: campaign.id, ...(await sendOneCampaign(db, settings, campaign)) });
    }

    return Response.json({ ok: true, campaignsSent: results.length, results });
  } catch (error) {
    console.error("sendCampaign error", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
