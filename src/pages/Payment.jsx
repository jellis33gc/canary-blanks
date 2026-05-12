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

    const script = document.createElement("script");
    script.src = "https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js";
    script.async = true;
    script.onload = () => {
      window.SumUpCard.mount({
        checkoutId: checkoutId,
        mountId: "sumup-card",
        onResponse: function (type, body) {
          console.log("SumUp response type:", type, "body:", body);
          if (type === "success") {
            window.location.href = `/order-confirmation/${orderId}?checkoutId=${checkoutId}`;
          } else if (type === "error" || type === "failure") {
            window.location.href = `/order-confirmation/${orderId}?status=failed`;
          }
        },
      });
    };
    document.body.appendChild(script);

    return () => {
      // Clean up mounted widget if possible
      if (window.SumUpCard && window.SumUpCard.unmount) {
        window.SumUpCard.unmount();
      }
      document.body.removeChild(script);
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