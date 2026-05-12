import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function Payment() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const checkoutId = searchParams.get("checkoutId");

  useEffect(() => {
    if (!checkoutId || !orderId) return;

    // Prevent any form submissions from reloading the page
    const preventSubmit = (e) => e.preventDefault();
    document.addEventListener('submit', preventSubmit);

    // Set up the callback BEFORE loading the script
    window.sumupCardResponseHandler = function(type, body) {
      console.log("SumUp response type:", type);
      console.log("SumUp response body:", JSON.stringify(body));
      if (type === "success" || type === "sent") {
        window.location.href = `/order-confirmation/${orderId}?checkoutId=${checkoutId}`;
      } else if (type === "error" || type === "failure") {
        window.location.href = `/order-confirmation/${orderId}?status=failed`;
      }
    };

    const script = document.createElement("script");
    script.src = "https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js";
    script.async = true;
    script.onload = () => {
      console.log("SumUp SDK loaded, mounting card...");
      try {
        window.SumUpCard.mount({
          checkoutId: checkoutId,
          mountId: "sumup-card",
          showSubmitButton: true,
          onResponse: window.sumupCardResponseHandler,
        });
        console.log("SumUp card mounted successfully");
      } catch(e) {
        console.error("SumUp mount error:", e);
      }
    };

    script.onerror = (e) => {
      console.error("Failed to load SumUp SDK:", e);
    };

    document.body.appendChild(script);

    // Also listen for postMessage events from SumUp iframe
    const messageHandler = (event) => {
      console.log("postMessage received:", event.origin, JSON.stringify(event.data));
      if (event.data && (event.data.type === "success" || event.data.status === "success")) {
        window.location.href = `/order-confirmation/${orderId}?checkoutId=${checkoutId}`;
      }
    };
    window.addEventListener("message", messageHandler);

    return () => {
      document.removeEventListener('submit', preventSubmit);
      window.removeEventListener("message", messageHandler);
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
        <div
          className="bg-card border border-border rounded-2xl p-8 shadow-sm"
          onSubmit={(e) => e.preventDefault()}
          onClick={(e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
              e.stopPropagation();
            }
          }}
        >
          <h1 className="font-brand text-2xl text-center mb-6">Complete Your Payment 💳</h1>
          <div
            id="sumup-card"
            onSubmit={(e) => e.preventDefault()}
          ></div>
        </div>
      </div>
      <Footer />
    </div>
  );
}