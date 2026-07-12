// base44/functions/subscribeNewsletter/entry.ts
//
// Public endpoint. Called from the newsletter signup form (Footer -> NewsletterForm.jsx).
// - Creates or reactivates a Subscriber
// - Sends the welcome / discount email immediately via Resend (NOT Base44's SendEmail,
//   so this costs $0 in Base44 credits no matter how many people sign up)
// - Enrolls the subscriber into the rest of the "welcome_series" EmailFlow, if configured
//
// Replaces the previous minimal version of this function, which only notified the admin
// inbox and didn't create a real subscriber record or send anything to the customer.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendViaResend(opts: { to: string; subject: string; html: string; from: string; reply_to?: string }) {
  if (!RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY secret is not set. Add it under Dashboard -> Secrets.",
    );
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.reply_to || undefined,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend error (${res.status}): ${JSON.stringify(data)}`);
  return data as { id: string };
}

function buildUnsubscribeUrl(settings: any, token: string) {
  const base = (settings.app_base_url || "").replace(/\/$/, "");
  const path = settings.unsubscribe_page_path || "/unsubscribe";
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

function renderEmail(html: string, vars: Record<string, string>, settings: any) {
  let out = html;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value ?? "");
  }
  const footer = `
    <hr style="margin-top:32px;border:none;border-top:1px solid #e5e5e5" />
    <p style="font-size:12px;color:#888;line-height:1.6;font-family:sans-serif">
      ${settings.brand_name || settings.from_name || ""}${
    settings.company_postal_address ? " &middot; " + settings.company_postal_address : ""
  }<br/>
      You're receiving this because you signed up at our store.
      <a href="${vars.unsubscribe_url}" style="color:#888">Unsubscribe</a>
    </p>`;
  return out.includes("{{footer}}") ? out.replace("{{footer}}", footer) : out + footer;
}

function defaultWelcomeHtml(firstName: string, discountCode: string, discountDescription: string) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
      <h1 style="font-size:22px">Welcome${firstName ? ", " + firstName : ""}!</h1>
      <p>Thanks for signing up. Here's ${discountDescription || "a discount"} on us:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:2px;background:#f5f5f5;padding:12px 16px;display:inline-block;border-radius:6px">${discountCode}</p>
      <p>Use it at checkout on your next order.</p>
    </div>`;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const firstName = String(body.first_name || body.firstName || "").trim();
    const tags: string[] = Array.isArray(body.tags) ? body.tags : [];

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const settingsList = await db.MarketingSettings.list();
    const settings = settingsList[0];
    if (!settings) {
      return Response.json(
        { error: "Marketing is not configured yet. Create a MarketingSettings record first." },
        { status: 500 },
      );
    }

    const existing = await db.Subscriber.filter({ email });
    let subscriber = existing[0];

    if (subscriber && subscriber.status === "active") {
      return Response.json({
        success: true,
        ok: true,
        already_subscribed: true,
        discount_code: subscriber.discount_code || settings.discount_code,
        message: "You're already on the list!",
      });
    }

    const unsubscribeToken = crypto.randomUUID();
    const discountCode = settings.discount_code || "";

    if (subscriber) {
      subscriber = await db.Subscriber.update(subscriber.id, {
        status: "active",
        first_name: firstName || subscriber.first_name,
        tags: Array.from(new Set([...(subscriber.tags || []), ...tags])),
        unsubscribe_token: unsubscribeToken,
        discount_code: discountCode,
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      });
    } else {
      subscriber = await db.Subscriber.create({
        email,
        first_name: firstName,
        status: "active",
        source: "newsletter_form",
        tags,
        unsubscribe_token: unsubscribeToken,
        discount_code: discountCode,
        discount_used: false,
        welcome_flow_sent: false,
        subscribed_at: new Date().toISOString(),
      });
    }

    const unsubscribeUrl = buildUnsubscribeUrl(settings, unsubscribeToken);

    const flows = await db.EmailFlow.filter({ key: "welcome_series", is_active: true });
    const flow = flows[0];
    let step1 = null;
    let allSteps: any[] = [];
    if (flow) {
      allSteps = await db.FlowStep.filter({ flow_id: flow.id }, "step_order");
      allSteps = allSteps.filter((s: any) => s.is_active !== false);
      step1 = allSteps.find((s: any) => s.step_order === 1) || allSteps[0];
    }

    const mergeVars = {
      first_name: firstName,
      email,
      discount_code: discountCode,
      unsubscribe_url: unsubscribeUrl,
    };

    const subject = step1 ? step1.subject : `Welcome${firstName ? ", " + firstName : ""} - here's your discount`;
    const rawHtml = step1
      ? step1.html_body
      : defaultWelcomeHtml(firstName, discountCode, settings.discount_description);
    const html = renderEmail(rawHtml, mergeVars, settings);

    let sendError: string | null = null;
    try {
      const result = await sendViaResend({
        to: email,
        subject,
        html,
        from: `${settings.from_name} <${settings.from_email}>`,
        reply_to: settings.reply_to_email,
      });
      await db.EmailLog.create({
        recipient_email: email,
        source_type: "welcome",
        source_id: step1 ? step1.id : undefined,
        subject,
        status: "sent",
        provider_message_id: result.id,
      });
    } catch (err) {
      sendError = err.message;
      await db.EmailLog.create({
        recipient_email: email,
        source_type: "welcome",
        source_id: step1 ? step1.id : undefined,
        subject,
        status: "failed",
        error: err.message,
      });
    }

    await db.Subscriber.update(subscriber.id, { welcome_flow_sent: true });

    if (flow && allSteps.length > 1) {
      const nextStep = allSteps.find((s: any) => s.step_order === (step1 ? step1.step_order + 1 : 2)) || allSteps[1];
      if (nextStep) {
        const nextSendAt = new Date(Date.now() + (nextStep.delay_hours || 0) * 3600 * 1000).toISOString();
        await db.FlowEnrollment.create({
          flow_id: flow.id,
          subscriber_email: email,
          current_step: nextStep.step_order,
          next_send_at: nextSendAt,
          status: "active",
        });
      }
    }

    return Response.json({
      success: true,
      ok: true,
      already_subscribed: false,
      discount_code: discountCode,
      welcome_email_sent: !sendError,
      message: sendError
        ? `Signed up, but the welcome email failed to send: ${sendError}`
        : "You're subscribed! Check your inbox for your discount code.",
      warning: sendError || undefined,
    });
  } catch (error) {
    console.error("subscribeNewsletter error", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
