// base44/functions/unsubscribe/entry.ts
//
// Public endpoint. Called from the /unsubscribe page using the token in the email link
// (?token=...). Marks the subscriber unsubscribed and exits any in-progress flow.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (req) => {
  try {
    let token = "";
    if (req.method === "GET") {
      token = new URL(req.url).searchParams.get("token") || "";
    } else {
      const body = await req.json().catch(() => ({}));
      token = body.token || "";
    }

    if (!token) {
      return Response.json({ error: "Missing unsubscribe token." }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const matches = await db.Subscriber.filter({ unsubscribe_token: token });
    const subscriber = matches[0];

    if (!subscriber) {
      return Response.json({ error: "Unsubscribe link is invalid or expired." }, { status: 404 });
    }

    if (subscriber.status !== "unsubscribed") {
      await db.Subscriber.update(subscriber.id, {
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
      });
    }

    const activeEnrollments = await db.FlowEnrollment.filter({
      subscriber_email: subscriber.email,
      status: "active",
    });
    for (const enrollment of activeEnrollments) {
      await db.FlowEnrollment.update(enrollment.id, {
        status: "exited",
        exit_reason: "unsubscribed",
      });
    }

    return Response.json({ ok: true, email: subscriber.email });
  } catch (error) {
    console.error("unsubscribe error", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
