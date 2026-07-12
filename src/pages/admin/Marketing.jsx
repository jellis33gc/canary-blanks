// src/pages/admin/Marketing.jsx
//
// Admin marketing dashboard, registered at /admin/marketing in App.jsx and linked from
// AdminLayout's sidebar. Ties together subscribers, campaigns, automated flows, and settings.

import { useState } from "react";
import SubscriberTable from "@/components/marketing/SubscriberTable";
import CampaignList from "@/components/marketing/CampaignList";
import CampaignEditor from "@/components/marketing/CampaignEditor";
import FlowBuilder from "@/components/marketing/FlowBuilder";
import MarketingSettingsForm from "@/components/marketing/MarketingSettingsForm";

const TABS = [
  { key: "subscribers", label: "Subscribers" },
  { key: "campaigns", label: "Campaigns" },
  { key: "flows", label: "Automated Flows" },
  { key: "settings", label: "Settings" },
];

export default function Marketing() {
  const [tab, setTab] = useState("subscribers");
  const [campaignView, setCampaignView] = useState({ mode: "list", campaignId: null });

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Marketing</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Newsletter signups, automated flows, and campaigns - sent via Resend, not Base44 credits.
      </p>

      <div className="mt-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key === "campaigns") setCampaignView({ mode: "list", campaignId: null });
            }}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "subscribers" && <SubscriberTable />}

        {tab === "campaigns" &&
          (campaignView.mode === "list" ? (
            <CampaignList
              onSelect={(id) => setCampaignView({ mode: "edit", campaignId: id })}
              onCreateNew={() => setCampaignView({ mode: "edit", campaignId: null })}
            />
          ) : (
            <div>
              <button
                onClick={() => setCampaignView({ mode: "list", campaignId: null })}
                className="mb-4 text-sm text-muted-foreground hover:underline"
              >
                &larr; Back to campaigns
              </button>
              <CampaignEditor campaignId={campaignView.campaignId} />
            </div>
          ))}

        {tab === "flows" && <FlowBuilder />}
        {tab === "settings" && <MarketingSettingsForm />}
      </div>
    </div>
  );
}
