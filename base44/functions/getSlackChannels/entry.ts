import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("slack");

  const response = await fetch("https://slack.com/api/conversations.list?limit=200&types=public_channel,private_channel", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json();
  return Response.json({ channels: data.channels?.map(c => ({ id: c.id, name: c.name })) || [] });
});