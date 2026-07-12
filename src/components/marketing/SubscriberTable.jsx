// src/components/marketing/SubscriberTable.jsx
//
// Admin-only table of subscribers. Subscriber's RLS only allows admin reads/writes.

import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-800",
  unsubscribed: "bg-neutral-100 text-neutral-500",
  bounced: "bg-red-100 text-red-700",
};

export default function SubscriberTable() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await base44.entities.Subscriber.list("-subscribed_at", 1000);
      setSubscribers(data || []);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return subscribers.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (search && !`${s.email} ${s.first_name || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [subscribers, search, statusFilter]);

  const counts = useMemo(() => {
    return subscribers.reduce(
      (acc, s) => {
        acc.total++;
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      },
      { total: 0 },
    );
  }, [subscribers]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{counts.total}</span> total &middot;{" "}
          <span className="font-semibold text-green-700">{counts.active || 0}</span> active &middot;{" "}
          <span className="font-semibold text-neutral-500">{counts.unsubscribed || 0}</span> unsubscribed
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Bounced</option>
        </select>
        <button onClick={load} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Source</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tags</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Subscribed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No subscribers found.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2">{s.email}</td>
                  <td className="px-4 py-2">{s.first_name || "-"}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[s.status] || ""}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{s.source}</td>
                  <td className="px-4 py-2 text-muted-foreground">{(s.tags || []).join(", ") || "-"}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {s.subscribed_at ? new Date(s.subscribed_at).toLocaleDateString() : "-"}
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
