import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CHANNEL_ID = "C0BGWPJ1HKN"; // #new-sales

Deno.serve(async (req) => {
  const body = await req.json();
  const base44 = createClientFromRequest(req);

  const order = body.data;

  const { accessToken } = await base44.asServiceRole.connectors.getConnection("slackbot");

  const items = (order.items || []).map(i => `• ${i.product_name} x${i.quantity} — £${(i.price * i.quantity).toFixed(2)}`).join("\n");

  const message = {
    channel: CHANNEL_ID,
    text: `🎂 *New Order Received!*`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "🎂 New Order Received!" }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Order #:*\n${order.order_number || order.id?.slice(-6).toUpperCase()}` },
          { type: "mrkdwn", text: `*Customer:*\n${order.customer_name || order.customer_email}` },
          { type: "mrkdwn", text: `*Total:*\n£${order.total?.toFixed(2)}` },
          { type: "mrkdwn", text: `*Status:*\n${order.status || "pending"}` }
        ]
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Items:*\n${items}` }
      }
    ]
  };

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(message)
  });

  const result = await response.json();
  return Response.json({ ok: result.ok, error: result.error });
});