// base44/functions/detectAbandonedCarts/entry.ts
//
// SCHEDULED function - set up as an automation that runs every 15-30 minutes
// (Dashboard -> Automations -> New Automation -> Scheduled -> "run the
// detectAbandonedCarts function every 20 minutes").
//
// Finds carts that have gone quiet for longer than MarketingSettings.abandoned_cart_inactivity_hours,
// have a known email, and haven't already been queued - then enrolls them into the
// "abandoned_cart" EmailFlow. Sending itself happens later via processFlows.ts.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const settingsList = await db.MarketingSettings.list();
    const settings = settingsList[0];
    if (!settings) {
      return Response.json({ ok: false, error: "MarketingSettings not configured." });
    }

    const inactivityHours = settings.abandoned_cart_inactivity_hours ?? 1;
    const cutoff = new Date(Date.now() - inactivityHours * 3600 * 1000);

    const flows = await db.EmailFlow.filter({ key: "abandoned_cart", is_active: true });
    const flow = flows[0];
    let firstStep: any = null;
    if (flow) {
      const steps = await db.FlowStep.filter({ flow_id: flow.id }, "step_order");
      firstStep = steps.find((s: any) => s.is_active !== false);
    }

    if (!flow || !firstStep) {
      console.log("detectAbandonedCarts: no active 'abandoned_cart' EmailFlow with steps configured yet - skipping.");
      return Response.json({ ok: true, processed: 0, reason: "no_flow_configured" });
    }

    const candidates = await db.CartEvent.filter({ status: "active" }, "last_activity_at", 200);

    let enrolled = 0;
    let skipped = 0;

    for (const cart of candidates) {
      if (!cart.email) {
        skipped++;
        continue;
      }
      if (new Date(cart.last_activity_at) > cutoff) {
        continue;
      }

      const subs = await db.Subscriber.filter({ email: cart.email });
      if (subs[0] && subs[0].status === "unsubscribed") {
        await db.CartEvent.update(cart.id, { status: "abandoned" });
        skipped++;
        continue;
      }

      await db.CartEvent.update(cart.id, { status: "emailed" });

      const nextSendAt = new Date(Date.now() + (firstStep.delay_hours || 0) * 3600 * 1000).toISOString();
      await db.FlowEnrollment.create({
        flow_id: flow.id,
        subscriber_email: cart.email,
        current_step: firstStep.step_order,
        next_send_at: nextSendAt,
        status: "active",
        trigger_ref_id: cart.id,
      });
      enrolled++;
    }

    return Response.json({ ok: true, enrolled, skipped });
  } catch (error) {
    console.error("detectAbandonedCarts error", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
