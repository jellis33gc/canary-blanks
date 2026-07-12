// base44/functions/processFlows/entry.ts
//
// SCHEDULED function - set up as an automation that runs every 10-15 minutes
// (Dashboard -> Automations -> New Automation -> Scheduled -> "run the processFlows
// function every 15 minutes").
//
// Engine behind every multi-step EmailFlow (welcome series, abandoned cart, or any
// custom flow added later): finds enrollments whose next step is due, sends that step
// via Resend, and advances the enrollment. One automation run = one Base44 credit, no
// matter how many emails it sends in that run.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendViaResend(opts: { to: string; subject: string; html: string; from: string; reply_to?: string }) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY secret is not set.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
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

function cartItemsHtml(cartEvent: any) {
  if (!cartEvent || !Array.isArray(cartEvent.cart_items)) return "";
  return `<table style="width:100%;border-collapse:collapse">${cartEvent.cart_items
    .map(
      (item: any) => `
    <tr>
      <td style="padding:8px 0"><img src="${item.image_url || ""}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:4px" /></td>
      <td style="padding:8px 12px">${item.name || ""} ${item.quantity ? `&times; ${item.quantity}` : ""}</td>
      <td style="padding:8px 0;text-align:right">${item.price ? "$" + Number(item.price).toFixed(2) : ""}</td>
    </tr>`,
    )
    .join("")}</table>`;
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
      <a href="${vars.unsubscribe_url}" style="color:#888">Unsubscribe</a>
    </p>`;
  return out.includes("{{footer}}") ? out.replace("{{footer}}", footer) : out + footer;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const settingsList = await db.MarketingSettings.list();
    const settings = settingsList[0];
    if (!settings) {
      return Response.json({ ok: false, error: "MarketingSettings not configured." });
    }

    const nowIso = new Date().toISOString();
    const due = await db.FlowEnrollment.filter({ status: "active" }, "next_send_at", 150);
    const dueNow = due.filter((e: any) => e.next_send_at <= nowIso);

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const enrollment of dueNow) {
      const subs = await db.Subscriber.filter({ email: enrollment.subscriber_email });
      const subscriber = subs[0];

      if (!subscriber || subscriber.status !== "active") {
        await db.FlowEnrollment.update(enrollment.id, { status: "exited", exit_reason: "not_active_subscriber" });
        skipped++;
        continue;
      }

      const flow = await db.EmailFlow.get(enrollment.flow_id).catch(() => null);
      if (!flow || flow.is_active === false) {
        await db.FlowEnrollment.update(enrollment.id, { status: "exited", exit_reason: "flow_inactive" });
        skipped++;
        continue;
      }

      let cartEvent: any = null;
      if (flow.key === "abandoned_cart" && enrollment.trigger_ref_id) {
        cartEvent = await db.CartEvent.get(enrollment.trigger_ref_id).catch(() => null);
        if (cartEvent && cartEvent.status === "recovered") {
          await db.FlowEnrollment.update(enrollment.id, { status: "exited", exit_reason: "recovered" });
          skipped++;
          continue;
        }
      }

      const steps = await db.FlowStep.filter({ flow_id: flow.id }, "step_order");
      const activeSteps = steps.filter((s: any) => s.is_active !== false);
      const currentStep = activeSteps.find((s: any) => s.step_order === enrollment.current_step);

      if (!currentStep) {
        await db.FlowEnrollment.update(enrollment.id, { status: "completed" });
        skipped++;
        continue;
      }

      const unsubscribeUrl = buildUnsubscribeUrl(settings, subscriber.unsubscribe_token);
      const mergeVars: Record<string, string> = {
        first_name: subscriber.first_name || "",
        email: subscriber.email,
        discount_code: subscriber.discount_code || settings.discount_code || "",
        unsubscribe_url: unsubscribeUrl,
        checkout_url: cartEvent?.checkout_url || "",
        cart_items_html: cartItemsHtml(cartEvent),
      };

      const html = renderEmail(currentStep.html_body, mergeVars, settings);

      try {
        const result = await sendViaResend({
          to: subscriber.email,
          subject: currentStep.subject,
          html,
          from: `${settings.from_name} <${settings.from_email}>`,
          reply_to: settings.reply_to_email,
        });
        await db.EmailLog.create({
          recipient_email: subscriber.email,
          source_type: "flow_step",
          source_id: currentStep.id,
          subject: currentStep.subject,
          status: "sent",
          provider_message_id: result.id,
        });
        sent++;
      } catch (err) {
        await db.EmailLog.create({
          recipient_email: subscriber.email,
          source_type: "flow_step",
          source_id: currentStep.id,
          subject: currentStep.subject,
          status: "failed",
          error: err.message,
        });
        failed++;
      }

      const nextStep = activeSteps.find((s: any) => s.step_order === currentStep.step_order + 1);
      if (nextStep) {
        await db.FlowEnrollment.update(enrollment.id, {
          current_step: nextStep.step_order,
          next_send_at: new Date(Date.now() + (nextStep.delay_hours || 0) * 3600 * 1000).toISOString(),
        });
      } else {
        await db.FlowEnrollment.update(enrollment.id, { status: "completed" });
      }
    }

    return Response.json({ ok: true, sent, failed, skipped, checked: dueNow.length });
  } catch (error) {
    console.error("processFlows error", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
