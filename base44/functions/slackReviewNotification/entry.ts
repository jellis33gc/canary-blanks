import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CHANNEL_ID = "C0B29J86CRM"; // #new-review

Deno.serve(async (req) => {
  const body = await req.json();
  const base44 = createClientFromRequest(req);

  const review = body.data;
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("slack");

  const stars = "⭐".repeat(review.rating || 0);

  const message = {
    channel: CHANNEL_ID,
    text: `⭐ New product review received!`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "⭐ New Product Review!" }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Product:*\n${review.product_name || "Unknown"}` },
          { type: "mrkdwn", text: `*Rating:*\n${stars} (${review.rating}/5)` },
          { type: "mrkdwn", text: `*Reviewer:*\n${review.author_name || review.author_email || "Anonymous"}` }
        ]
      },
      ...(review.title ? [{
        type: "section",
        text: { type: "mrkdwn", text: `*"${review.title}"*\n${review.body || ""}` }
      }] : review.body ? [{
        type: "section",
        text: { type: "mrkdwn", text: review.body }
      }] : [])
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