// base44/functions/trackCartEvent/entry.ts
//
// Public endpoint. Called from cartStore.jsx whenever the (localStorage) cart changes,
// and whenever the shopper's email becomes known during checkout. This is what makes
// abandoned-cart detection possible even though the real cart lives in localStorage,
// not in the (currently unused) Cart entity.

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

    const email = body.email ? String(body.email).trim().toLowerCase() : undefined;
    const cartItems = Array.isArray(body.cart_items) ? body.cart_items : [];
    const cartTotal = typeof body.cart_total === "number" ? body.cart_total : 0;
    const checkoutUrl = body.checkout_url ? String(body.checkout_url) : undefined;

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const existing = await db.CartEvent.filter({ session_id: sessionId });
    const now = new Date().toISOString();

    if (cartItems.length === 0) {
      if (existing[0]) {
        await db.CartEvent.update(existing[0].id, {
          cart_items: [],
          cart_total: 0,
          status: "active",
          last_activity_at: now,
        });
      }
      return Response.json({ ok: true, empty: true });
    }

    if (existing[0]) {
      await db.CartEvent.update(existing[0].id, {
        email: email || existing[0].email,
        cart_items: cartItems,
        cart_total: cartTotal,
        checkout_url: checkoutUrl || existing[0].checkout_url,
        status: "active",
        last_activity_at: now,
      });
    } else {
      await db.CartEvent.create({
        session_id: sessionId,
        email,
        cart_items: cartItems,
        cart_total: cartTotal,
        checkout_url: checkoutUrl,
        status: "active",
        last_activity_at: now,
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("trackCartEvent error", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
