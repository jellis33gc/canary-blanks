// src/components/marketing/useCartTracking.js
//
// Generic cart-tracking hook that powers abandoned-cart recovery. Canary Blanks' real
// cart lives in localStorage (see src/lib/cartStore.jsx), not in the Cart entity, so this
// hook mirrors it server-side into CartEvent whenever it changes.

import { useCallback, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

const SESSION_KEY = "marketing_cart_session_id";
const DEBOUNCE_MS = 1500;

function getSessionId() {
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function useCartTracking() {
  const timerRef = useRef(null);
  const emailRef = useRef("");

  useEffect(() => () => timerRef.current && clearTimeout(timerRef.current), []);

  const trackCart = useCallback(({ items, total, checkoutUrl, email }) => {
    if (email) emailRef.current = email;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      base44.functions
        .invoke("trackCartEvent", {
          session_id: getSessionId(),
          email: emailRef.current || undefined,
          cart_items: items || [],
          cart_total: total || 0,
          checkout_url: checkoutUrl,
        })
        .catch(() => {
          /* best-effort - never block the shopping experience on tracking failures */
        });
    }, DEBOUNCE_MS);
  }, []);

  const setEmail = useCallback((email) => {
    if (!email || email === emailRef.current) return;
    emailRef.current = email;
    base44.functions
      .invoke("trackCartEvent", { session_id: getSessionId(), email, cart_items: [] })
      .catch(() => {});
  }, []);

  return { trackCart, setEmail, sessionId: getSessionId() };
}

export async function markCartRecovered() {
  try {
    await base44.functions.invoke("markCartRecovered", { session_id: getSessionId() });
  } catch {
    /* best-effort */
  }
  window.localStorage.removeItem(SESSION_KEY);
}
