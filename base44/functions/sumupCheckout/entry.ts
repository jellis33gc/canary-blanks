import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { amount, currency, description, orderId, returnUrl } = await req.json();

    if (!amount || !orderId) {
      return Response.json({ error: 'Missing required fields: amount, orderId' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SUMUP_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'SUMUP_API_KEY not configured' }, { status: 500 });
    }

    const checkoutRef = `LTC-${orderId}-${Date.now()}`;

    const payload = {
      checkout_reference: checkoutRef,
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      currency: currency || 'GBP',
      description: description || `Order ${orderId}`,
      return_url: returnUrl,
      merchant_code: 'MDF7FZCR',
    };

    console.log('SumUp payload:', JSON.stringify(payload));

    const response = await fetch('https://api.sumup.com/v0.1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('SumUp response status:', response.status);
    console.log('SumUp response body:', JSON.stringify(data));

    if (!response.ok) {
      console.error('SumUp error:', JSON.stringify(data));
      return Response.json({ error: data.message || 'SumUp API error', details: data }, { status: response.status });
    }

    const checkoutUrl = data.hosted_checkout_url || `https://pay.sumup.com/b2c/${data.id}` || `https://checkout.sumup.com/pay/${data.id}`;
    console.log('Checkout URL:', checkoutUrl);

    return Response.json({
      checkoutId: data.id,
      checkoutUrl,
      checkoutReference: checkoutRef,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});