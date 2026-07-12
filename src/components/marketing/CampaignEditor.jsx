// src/components/marketing/CampaignEditor.jsx
//
// Admin-only. Create/edit a one-off Campaign, then Save as draft, Schedule for later,
// or Send now via the sendCampaign backend function (Resend, not Base44 SendEmail).

import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const emptyCampaign = {
  name: "",
  subject: "",
  preheader: "",
  html_body: "<p>Write your email here...</p>",
  tag_filter: [],
  status: "draft",
};

export default function CampaignEditor({ campaignId, onSaved }) {
  const [campaign, setCampaign] = useState(emptyCampaign);
  const [tagInput, setTagInput] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (campaignId) {
      base44.entities.Campaign.get(campaignId).then((c) => {
        setCampaign(c);
        setScheduledAt(c.scheduled_at ? c.scheduled_at.slice(0, 16) : "");
      });
    }
  }, [campaignId]);

  function update(field, value) {
    setCampaign((c) => ({ ...c, [field]: value }));
  }

  function addTag() {
    if (!tagInput.trim()) return;
    update("tag_filter", Array.from(new Set([...(campaign.tag_filter || []), tagInput.trim()])));
    setTagInput("");
  }

  async function save(status) {
    setSaving(true);
    setNotice("");
    try {
      const payload = {
        ...campaign,
        status: status || campaign.status,
        scheduled_at:
          status === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : campaign.scheduled_at,
      };

      let saved;
      if (campaign.id) {
        saved = await base44.entities.Campaign.update(campaign.id, payload);
      } else {
        saved = await base44.entities.Campaign.create(payload);
      }
      setCampaign(saved);
      setNotice(status === "scheduled" ? "Campaign scheduled." : "Saved.");
      onSaved && onSaved(saved);
      return saved;
    } finally {
      setSaving(false);
    }
  }

  async function sendNow() {
    if (!confirm("Send this campaign to all matching active subscribers right now?")) return;
    setSaving(true);
    setNotice("");
    try {
      const saved = campaign.id ? campaign : await save("draft");
      const response = await base44.functions.invoke("sendCampaign", { campaignId: saved.id });
      const data = response?.data ?? response;
      if (data?.error) {
        setNotice(`Error: ${data.error}`);
      } else {
        setNotice(`Sent to ${data.sentCount} of ${data.recipientCount} recipients.`);
        const refreshed = await base44.entities.Campaign.get(saved.id);
        setCampaign(refreshed);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="grid gap-3">
        <label className="block">
          <span className="text-sm font-medium text-foreground">Internal name</span>
          <input
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            value={campaign.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-foreground">Subject line</span>
          <input
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            value={campaign.subject}
            onChange={(e) => update("subject", e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-foreground">Preview text</span>
          <input
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            value={campaign.preheader || ""}
            onChange={(e) => update("preheader", e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-foreground">
            Email HTML (supports {"{{first_name}}"}, {"{{discount_code}}"}, {"{{unsubscribe_url}}"})
          </span>
          <textarea
            rows={12}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 font-mono text-xs"
            value={campaign.html_body}
            onChange={(e) => update("html_body", e.target.value)}
          />
        </label>

        <div>
          <span className="text-sm font-medium text-foreground">
            Audience (leave empty to send to all active subscribers)
          </span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {(campaign.tag_filter || []).map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
                {t}
                <button
                  onClick={() => update("tag_filter", campaign.tag_filter.filter((x) => x !== t))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  &times;
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="tag + Enter"
              className="rounded-md border border-border px-2 py-1 text-xs"
            />
          </div>
        </div>

        <label className="block max-w-xs">
          <span className="text-sm font-medium text-foreground">Schedule for (optional)</span>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          disabled={saving}
          onClick={() => save("draft")}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60"
        >
          Save draft
        </button>
        <button
          disabled={saving || !scheduledAt}
          onClick={() => save("scheduled")}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60"
        >
          Schedule
        </button>
        <button
          disabled={saving}
          onClick={sendNow}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
        >
          Send now
        </button>
        {notice ? <span className="text-sm text-muted-foreground">{notice}</span> : null}
      </div>

      {campaign.status === "sent" ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Sent {campaign.sent_at ? new Date(campaign.sent_at).toLocaleString() : ""} &middot;{" "}
          {campaign.sent_count}/{campaign.recipient_count} delivered
          {campaign.failed_count ? `, ${campaign.failed_count} failed` : ""}.
        </p>
      ) : null}
    </div>
  );
}
