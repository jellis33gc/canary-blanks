import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

export default function Payment() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const checkoutId = searchParams.get("checkoutId");
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!checkoutId || !orderId) return;
    if (mountedRef.current) return;
    mountedRef.current = true;

    const messageHandler = (event) => {
      if (event.origin !== 'https://gateway.sumup.com') return;
      const data = event.data;
      console.log("SumUp postMessage:", JSON.stringify(data));

      if (data && data.type === 'SumUpCard' && data.action === 'message') {
        const msg = data.message;
        console.log("SumUp message:", msg, "value:", JSON.stringify(data.value));

        if (msg === 'submit--success' || msg === 'card-form--success') {
          window.location.replace(`/order-confirmation/${orderId}?checkoutId=${checkoutId}`);
        }

        if (msg === 'card-form--response' || msg === 'submit--response') {
          const val = data.value;
          if (val && (val.status === 'success' || val.status === 'PAID')) {
            window.location.replace(`/order-confirmation/${orderId}?checkoutId=${checkoutId}`);
          } else if (val && (val.status === 'error' || val.status === 'failed' || val.status === 'FAILED')) {
            window.location.replace(`/order-confirmation/${orderId}?status=failed`);
          }
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
    <div style={{
      minHeight: '100vh',
      background: '#fdf8f4',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        width: '100%',
        maxWidth: '480px',
        margin: '0 20px'
      }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: '24px',
          fontSize: '22px',
          fontWeight: 'bold',
          color: '#333'
        }}>
          Complete Your Payment 💳
        </h1>
        <div id="sumup-card"></div>
      </div>
    </div>
  );
}