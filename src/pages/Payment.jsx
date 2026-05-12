import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function Payment() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const checkoutId = searchParams.get("checkoutId");
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!checkoutId || !orderId) return;
    if (mountedRef.current) return;
    mountedRef.current = true;

    // Block ALL navigation and form submissions
    const preventAll = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    document.addEventListener('submit', preventAll, true);

    // Listen for postMessage from SumUp iframe
    const messageHandler = (event) => {
      if (event.origin !== 'https://gateway.sumup.com') return;
      
      const data = event.data;
      console.log("SumUp postMessage:", JSON.stringify(data));

      // Check for success response
      if (data && data.type === 'SumUpCard' && data.action === 'message') {
        const msg = data.message;
        console.log("SumUp message:", msg);
        
        if (msg === 'card-form--response' || msg === 'submit--response') {
          console.log("SumUp response value:", JSON.stringify(data.value));
          if (data.value && (data.value.status === 'success' || data.value.status === 'PAID' || data.value.type === 'success')) {
            console.log("Payment successful! Redirecting...");
            window.location.replace(`/order-confirmation/${orderId}?checkoutId=${checkoutId}`);
          } else if (data.value && (data.value.status === 'error' || data.value.status === 'failed' || data.value.status === 'FAILED')) {
            console.log("Payment failed! Redirecting...");
            window.location.replace(`/order-confirmation/${orderId}?status=failed`);
          }
        }

        // Also catch the 'sent' action which SumUp fires on success
        if (msg === 'submit--success' || msg === 'card-form--success') {
          console.log("Payment success message received!");
          window.location.replace(`/order-confirmation/${orderId}?checkoutId=${checkoutId}`);
        }
      }
    };

    window.addEventListener('message', messageHandler, true);

    const script = document.createElement("script");
    script.src = "https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js";
    script.async = true;
    script.onload = () => {
      console.log("SumUp SDK loaded");
      try {
        window.SumUpCard.mount({
          checkoutId: checkoutId,
          mountId: "sumup-card",
          showSubmitButton: true,
          onResponse: (type, body) => {
            console.log("onResponse fired! type:", type, "body:", JSON.stringify(body));
            if (type === "success" || type === "sent") {
              window.location.replace(`/order-confirmation/${orderId}?checkoutId=${checkoutId}`);
            } else if (type === "error" || type === "failure") {
              window.location.replace(`/order-confirmation/${orderId}?status=failed`);
            }
          },
        });
        console.log("SumUp card mounted");
      } catch(e) {
        console.error("Mount error:", e);
      }
    };

    document.body.appendChild(script);

    return () => {
      document.removeEventListener('submit', preventAll, true);
      window.removeEventListener('message', messageHandler, true);
      mountedRef.current = false;
      if (window.SumUpCard && window.SumUpCard.unmount) {
        try { window.SumUpCard.unmount(); } catch(e) {}
      }
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [checkoutId, orderId]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h1 className="font-brand text-2xl text-center mb-6">Complete Your Payment 💳</h1>
          <div id="sumup-card"></div>
        </div>
      </div>
      <Footer />
    </div>
  );
}