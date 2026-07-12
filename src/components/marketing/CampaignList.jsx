// src/components/marketing/CampaignList.jsx
//
// Admin-only. Lists all campaigns with status and basic stats.

import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const STATUS_STYLES = {
  draft: "bg-neutral-100 text-neutral-600",
  scheduled: "bg-amber-100 text-amber-800",
  sending: "bg-blue-100 text-blue-800",
  sent: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-700",
};

export default function CampaignList({ onSelect, onCreateNew }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await base44.entities.Campaign.list("-created_date", 200);
      setCampaigns(data || []);
    } finally {
      setLoading(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    await base44.entities.Campaign.delete(id);
    load();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Campaigns</h2>
        <button
          onClick={onCreateNew}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          New campaign
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Subject</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Sent / Recipients</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">When</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No campaigns yet.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelect(c.id)}>
                  <td className="px-4 py-2 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.subject}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status] || ""}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {c.status === "sent" ? `${c.sent_count || 0}/${c.recipient_count || 0}` : "-"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {c.status === "scheduled" && c.scheduled_at
                      ? new Date(c.scheduled_at).toLocaleString()
                      : c.sent_at
                      ? new Date(c.sent_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(c.id);
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
