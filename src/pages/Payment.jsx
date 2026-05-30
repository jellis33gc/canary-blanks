import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";

const STRIPE_PUBLISHABLE_KEY = "pk_live_51Tb3cvL0X9FEn7ZJh5TDAMjfUp4KTKF1q40PNWBrcOhR7QB8p7v8d7mNtcaGg3XKnX9crOlJHRcsPAI0bMVoZsps00UFKqcfuz";

export default function Payment() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const clientSecret = searchParams.get("clientSecret");
  const paymentIntentId = searchParams.get("paymentIntentId");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!clientSecret || !orderId) return;
    if (mountedRef.current) return;
    mountedRef.current = true;

    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = () => {
      console.log("Stripe JS loaded");
      const stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);
      stripeRef.current = stripe;

      const elements = stripe.elements({
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#e91e8c',
            colorBackground: '#ffffff',
            colorText: '#333333',
            borderRadius: '12px',
            fontFamily: 'sans-serif',
          }
        }
      });
      elementsRef.current = elements;

      const paymentElement = elements.create('payment');
      paymentElement.mount('#stripe-payment-element');
      paymentElement.on('ready', () => {
        console.log("Stripe payment element ready");
        setStripeReady(true);
      });
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [clientSecret, orderId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripeRef.current || !elementsRef.current) return;
    setLoading(true);
    setError(null);

    const { error: stripeError } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: {
        return_url: `${window.location.origin}/order-confirmation/${orderId}?paymentIntentId=${paymentIntentId}`,
      },
    });

    if (stripeError) {
      console.error("Stripe error:", stripeError);
      setError(stripeError.message);
      setLoading(false);
    }
    // If no error, Stripe redirects automatically
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fdf8f4',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        width: '100%',
        maxWidth: '480px',
      }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: '8px',
          fontSize: '22px',
          fontWeight: 'bold',
          color: '#333'
        }}>
          Complete Your Payment 💳
        </h1>
        <p style={{
          textAlign: 'center',
          color: '#888',
          fontSize: '14px',
          marginBottom: '28px'
        }}>
          Secured by Stripe
        </p>

        <form onSubmit={handleSubmit}>
          <div id="stripe-payment-element" style={{ marginBottom: '24px' }}></div>

          {error && (
            <div style={{
              background: '#fff0f0',
              border: '1px solid #ffcccc',
              borderRadius: '8px',
              padding: '12px',
              color: '#cc0000',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!stripeReady || loading}
            style={{
              width: '100%',
              padding: '14px',
              background: stripeReady && !loading ? '#e91e8c' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: stripeReady && !loading ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s'
            }}
          >
            {loading ? 'Processing...' : !stripeReady ? 'Loading...' : 'Pay Now'}
          </button>
        </form>
      </div>
    </div>
  );
}