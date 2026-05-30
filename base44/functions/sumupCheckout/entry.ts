import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secretKey) {
      return Response.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });
    }

    // ---- CHECK PAYMENT STATUS mode ----
    if (body.action === 'checkStatus') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const { orderId, paymentIntentId } = body;

      // Verify the order belongs to the requesting user (unless admin)
      if (user.role !== 'admin') {
        const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
        const order = orders[0];
        if (!order || order.customer_id !== user.id) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
        }
      });
      const data = await response.json();
      console.log('Stripe payment intent status:', data.status);

      if (data.status === 'succeeded') {
        await base44.asServiceRole.entities.Order.update(orderId, {
          payment_status: 'paid',
          status: 'confirmed',
          sumup_transaction_id: paymentIntentId,
        });
      } else if (data.status === 'payment_failed') {
        await base44.asServiceRole.entities.Order.update(orderId, {
          payment_status: 'failed',
          status: 'cancelled'
        });
      }
      return Response.json({ status: data.status });
    }

    // ---- CREATE PAYMENT INTENT mode ----
    const { amount, currency, orderId, orderNumber } = body;

    if (!amount || !orderId) {
      return Response.json({ error: 'Missing required fields: amount, orderId' }, { status: 400 });
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);

    const params = new URLSearchParams({
      amount: amountInCents.toString(),
      currency: currency || 'eur',
      'metadata[orderId]': orderId,
      'metadata[orderNumber]': orderNumber || '',
      'automatic_payment_methods[enabled]': 'true',
    });

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    console.log('Stripe response:', JSON.stringify(data));

    if (!response.ok) {
      return Response.json({ error: data.error?.message || 'Stripe API error' }, { status: response.status });
    }

    return Response.json({
      clientSecret: data.client_secret,
      paymentIntentId: data.id,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});