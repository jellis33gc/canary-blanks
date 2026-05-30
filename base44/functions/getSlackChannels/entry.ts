import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("slack");

  const response = await fetch("https://slack.com/api/conversations.list?limit=200&types=public_channel,private_channel", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json();
  return Response.json({ channels: data.channels?.map(c => ({ id: c.id, name: c.name })) || [] });
});