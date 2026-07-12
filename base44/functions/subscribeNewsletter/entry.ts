import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const ADMIN_EMAIL = 'hello@canaryblanks.es';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const email = body?.email?.trim()?.toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: ADMIN_EMAIL,
      subject: 'New Newsletter Signup',
      body: `A new customer has subscribed to the newsletter!\n\nEmail: ${email}\n\nDate: ${new Date().toISOString()}`,
    });

    return Response.json({ success: true, message: 'Subscribed successfully!' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});