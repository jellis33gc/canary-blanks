import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const returnReq = body.data;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("slackbot");

    const CHANNEL_ID = "C0BGR28QL6A"; // #returns

    const items = (returnReq.items || []).map(i => `• ${i.product_name} x${i.quantity} — £${(i.price * i.quantity).toFixed(2)}`).join("\n");

    const message = {
      channel: CHANNEL_ID,
      text: `↩️ New Return Request!`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "↩️ New Return Request!" }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Order #:*\n${returnReq.order_number || returnReq.order_id?.slice(-6).toUpperCase()}` },
            { type: "mrkdwn", text: `*Customer:*\n${returnReq.customer_name || returnReq.customer_email}` },
            { type: "mrkdwn", text: `*Resolution:*\n${returnReq.resolution_type || "refund"}` },
            { type: "mrkdwn", text: `*Status:*\n${returnReq.status || "pending"}` }
          ]
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*Reason:*\n${returnReq.reason || "N/A"}` }
        },
        ...(items ? [{
          type: "section",
          text: { type: "mrkdwn", text: `*Items:*\n${items}` }
        }] : []),
        {
          type: "section",
          text: { type: "mrkdwn", text: `*Refund Amount:*\n£${returnReq.refund_amount?.toFixed(2) || "0.00"}` }
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
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});