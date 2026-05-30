import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');

  if (!secretKey || !webhookSecret) {
    return Response.json({ error: 'Stripe secrets not configured' }, { status: 500 });
  }

  const stripe = new Stripe(secretKey);
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  const paymentIntent = event.data.object;
  const orderId = paymentIntent.metadata?.orderId;

  console.log(`Stripe webhook event: ${event.type}, orderId: ${orderId}`);

  if (!orderId) {
    return Response.json({ received: true });
  }

  if (event.type === 'payment_intent.succeeded') {
    await base44.asServiceRole.entities.Order.update(orderId, {
      payment_status: 'paid',
      status: 'confirmed',
      sumup_transaction_id: paymentIntent.id,
    });
    console.log(`Order ${orderId} marked as paid and confirmed.`);

    // Trigger Slack notification if available
    try {
      await base44.asServiceRole.functions.invoke('slackOrderNotification', { orderId });
    } catch (e) {
      console.warn('Slack notification failed:', e.message);
    }

  } else if (event.type === 'payment_intent.payment_failed') {
    await base44.asServiceRole.entities.Order.update(orderId, {
      payment_status: 'failed',
      status: 'cancelled',
    });
    console.log(`Order ${orderId} marked as failed/cancelled.`);
  }

  return Response.json({ received: true });
});