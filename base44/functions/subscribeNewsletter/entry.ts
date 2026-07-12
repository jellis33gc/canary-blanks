import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const email = body?.email?.trim()?.toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('mailchimp');

    // 1. Get the data center prefix from Mailchimp metadata
    const metaRes = await fetch('https://login.mailchimp.com/oauth2/metadata', {
      headers: { 'Authorization': `OAuth ${accessToken}` },
    });
    const meta = await metaRes.json();
    const dc = meta.dc;
    if (!dc) {
      return Response.json({ error: 'Could not determine Mailchimp data center.' }, { status: 500 });
    }

    const apiBase = `https://${dc}.api.mailchimp.com/3.0`;

    // 2. Fetch the first available audience list
    const listsRes = await fetch(`${apiBase}/lists?count=10`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const listsData = await listsRes.json();

    if (!listsRes.ok) {
      return Response.json({ error: listsData?.detail || 'Failed to fetch Mailchimp audiences.' }, { status: listsRes.status });
    }

    const listId = listsData?.lists?.[0]?.id;
    if (!listId) {
      return Response.json({ error: 'No Mailchimp audience found. Create an audience in Mailchimp first.' }, { status: 400 });
    }

    // 3. Add the subscriber to the audience
    const memberRes = await fetch(`${apiBase}/lists/${listId}/members`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed',
        tags: ['newsletter_signup'],
      }),
    });

    const memberData = await memberRes.json().catch(() => null);

    // Member already subscribed is not an error
    if (!memberRes.ok && memberData?.title !== 'Member Exists') {
      return Response.json({ error: memberData?.detail || memberData?.title || 'Mailchimp rejected the request.' }, { status: memberRes.status });
    }

    return Response.json({ success: true, message: 'Subscribed successfully!' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});