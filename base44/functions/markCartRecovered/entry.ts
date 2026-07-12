// base44/functions/markCartRecovered/entry.ts
//
// Public endpoint. Called from OrderConfirmation.jsx once an order is found, so no
// abandoned-cart email goes out to someone who already completed checkout.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body.session_id || "").trim();
    if (!sessionId) {
      return Response.json({ error: "session_id is required." }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const matches = await db.CartEvent.filter({ session_id: sessionId });
    const cartEvent = matches[0];
    if (!cartEvent) {
      return Response.json({ ok: true, found: false });
    }

    await db.CartEvent.update(cartEvent.id, { status: "recovered" });

    const enrollments = await db.FlowEnrollment.filter({
      trigger_ref_id: cartEvent.id,
      status: "active",
    });
    for (const enrollment of enrollments) {
      await db.FlowEnrollment.update(enrollment.id, {
        status: "exited",
        exit_reason: "recovered",
      });
    }

    return Response.json({ ok: true, found: true });
  } catch (error) {
    console.error("markCartRecovered error", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
