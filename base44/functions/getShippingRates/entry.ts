import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { destination_country, to_country, to_postcode, weight, width, height, length } = await req.json();
    const country = destination_country || to_country;

    if (!country || !weight) {
      return Response.json({ error: 'Missing required fields: destination_country/to_country, weight' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SENDCLOUD_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Sendcloud API key not configured' }, { status: 500 });
    }

    // Build request body for Sendcloud API
    const body = {
      from_country: 'GB',
      to_country: country.toUpperCase(),
      to_postcode: to_postcode || '',
      weight: weight,
    };

    if (width && height && length) {
      body.width = width;
      body.height = height;
      body.length = length;
    }

    // Fetch shipping rates from Sendcloud
    const response = await fetch('https://api.sendcloud.dev/v2/shipping-prices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return Response.json({ error: 'Failed to fetch shipping rates from Sendcloud', details: error }, { status: response.status });
    }

    const data = await response.json();

    // Format the response to include only relevant shipping options
    const shippingOptions = (data.shipping_methods || []).map(method => ({
      id: method.id,
      name: method.name,
      carrier: method.carrier,
      price: method.price,
      currency: method.currency || 'GBP',
      min_weight: method.min_weight,
      max_weight: method.max_weight,
      delivery_days: method.delivery_days,
    }));

    return Response.json({
      success: true,
      rates: shippingOptions,
      request_details: {
        from_country: 'GB',
        to_country: country.toUpperCase(),
        weight: weight,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});