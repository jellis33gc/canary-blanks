import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch by customer_id and customer_email using service role to avoid RLS quirks
  const [byId, byEmail] = await Promise.all([
    base44.asServiceRole.entities.Order.filter({ customer_id: user.id }, '-created_date', 100),
    base44.asServiceRole.entities.Order.filter({ customer_email: user.email }, '-created_date', 100),
  ]);

  const seen = new Set(byId.map(o => o.id));
  const merged = [...byId, ...byEmail.filter(o => !seen.has(o.id))];
  merged.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return Response.json({ orders: merged });
});