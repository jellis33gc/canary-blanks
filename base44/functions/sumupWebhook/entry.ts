import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const { checkout_reference, status, transaction_code, transaction_id } = body.payload || {};

  // checkout_reference format: LTC-{orderId}-{timestamp}
  // Extract the orderId (middle part between first and second dash)
  const parts = checkout_reference ? checkout_reference.split('-') : [];
  const orderId = parts[1]; // e.g. "abc123"

  if (!orderId) {
    return Response.json({ received: true }, { status: 200 });
  }

  const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
  const order = orders[0];

  if (!order) {
    return Response.json({ received: true }, { status: 200 });
  }

  if (status === 'SUCCESSFUL') {
    await base44.asServiceRole.entities.Order.update(order.id, {
      payment_status: 'paid',
      status: 'confirmed',
      sumup_transaction_id: transaction_id,
    });
  } else if (status === 'FAILED') {
    await base44.asServiceRole.entities.Order.update(order.id, {
      payment_status: 'failed',
      status: 'cancelled',
    });
  }

  return Response.json({ received: true }, { status: 200 });
});