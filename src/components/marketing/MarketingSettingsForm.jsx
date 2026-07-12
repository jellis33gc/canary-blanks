// src/components/marketing/MarketingSettingsForm.jsx
//
// Admin-only. Edits the single MarketingSettings record - brand, sender, discount, timing.

import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const defaults = {
  brand_name: "",
  from_name: "",
  from_email: "",
  reply_to_email: "",
  logo_url: "",
  primary_color: "#111111",
  company_postal_address: "",
  discount_code: "WELCOME10",
  discount_description: "10% off your first order",
  welcome_email_delay_hours: 0,
  abandoned_cart_inactivity_hours: 1,
  unsubscribe_page_path: "/unsubscribe",
  app_base_url: "",
};

export default function MarketingSettingsForm() {
  const [settings, setSettings] = useState(defaults);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    base44.entities.MarketingSettings.list().then((rows) => {
      if (rows && rows[0]) {
        setSettings({ ...defaults, ...rows[0] });
        setRecordId(rows[0].id);
      } else {
        setSettings((s) => ({ ...s, app_base_url: window.location.origin }));
      }
      setLoading(false);
    });
  }, []);

  function update(field, value) {
    setSettings((s) => ({ ...s, [field]: value }));
  }

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      if (recordId) {
        await base44.entities.MarketingSettings.update(recordId, settings);
      } else {
        const created = await base44.entities.MarketingSettings.create(settings);
        setRecordId(created.id);
      }
      setNotice("Saved.");
    } catch (err) {
      setNotice(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading settings...</p>;

  return (
    <div className="max-w-xl">
      <div className="grid gap-3">
        <Field label="Brand name" value={settings.brand_name} onChange={(v) => update("brand_name", v)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="From name" value={settings.from_name} onChange={(v) => update("from_name", v)} />
          <Field
            label="From email"
            value={settings.from_email}
            onChange={(v) => update("from_email", v)}
            hint="Must be on a domain verified in Resend"
          />
        </div>
        <Field label="Reply-to email" value={settings.reply_to_email} onChange={(v) => update("reply_to_email", v)} />
        <Field label="Logo URL" value={settings.logo_url} onChange={(v) => update("logo_url", v)} />
        <Field
          label="Company postal address"
          value={settings.company_postal_address}
          onChange={(v) => update("company_postal_address", v)}
          hint="Required by CAN-SPAM/GDPR - shown in every email footer"
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Signup discount code" value={settings.discount_code} onChange={(v) => update("discount_code", v)} />
          <Field
            label="Discount description"
            value={settings.discount_description}
            onChange={(v) => update("discount_description", v)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Welcome email delay (hours)"
            type="number"
            value={settings.welcome_email_delay_hours}
            onChange={(v) => update("welcome_email_delay_hours", Number(v))}
          />
          <Field
            label="Abandoned cart inactivity threshold (hours)"
            type="number"
            value={settings.abandoned_cart_inactivity_hours}
            onChange={(v) => update("abandoned_cart_inactivity_hours", Number(v))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Unsubscribe page path"
            value={settings.unsubscribe_page_path}
            onChange={(v) => update("unsubscribe_page_path", v)}
          />
          <Field
            label="App base URL"
            value={settings.app_base_url}
            onChange={(v) => update("app_base_url", v)}
            hint="e.g. https://canaryblanks.es"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
        {notice ? <span className="text-sm text-muted-foreground">{notice}</span> : null}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", hint }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
