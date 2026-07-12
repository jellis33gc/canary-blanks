import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const email = body?.email?.trim()?.toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('omnisend');

    const omnisendRes = await fetch('https://api.omnisend.com/api/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Omnisend-Version': '2026-03-15',
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        identifiers: [
          {
            type: 'email',
            id: email,
            channels: {
              email: { status: 'subscribed' },
            },
          },
        ],
        tags: ['newsletter_signup'],
      }),
    });

    const data = await omnisendRes.json().catch(() => null);

    if (!omnisendRes.ok && omnisendRes.status !== 409) {
      return Response.json({ error: data?.error?.description || data?.error?.title || 'Omnisend rejected the request.' }, { status: omnisendRes.status });
    }

    return Response.json({ success: true, message: 'Subscribed successfully!' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});