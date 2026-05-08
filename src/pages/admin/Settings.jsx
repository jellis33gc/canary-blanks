import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

const DEFAULT_SETTINGS = [
  { key: "site_name", label: "Site Name", group: "general", value: "Love the Cake" },
  { key: "site_tagline", label: "Tagline", group: "general", value: "Cakes, Decorations & Party Supplies" },
  { key: "contact_email", label: "Contact Email", group: "general", value: "" },
  { key: "contact_phone", label: "Contact Phone", group: "general", value: "" },
  { key: "free_shipping_threshold", label: "Free Shipping Over (£)", group: "shipping", value: "50" },
  { key: "standard_shipping_cost", label: "Standard Shipping Cost (£)", group: "shipping", value: "4.99" },
  { key: "loyalty_points_per_pound", label: "Points Earned Per £1 Spent", group: "loyalty", value: "10" },
  { key: "loyalty_points_per_discount", label: "Points Needed for £1 Discount", group: "loyalty", value: "100" },
  { key: "announcement_bar", label: "Announcement Bar Text", group: "display", value: "🎂 Free shipping on orders over £50!" },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.SiteSettings.list().then(saved => {
      const map = {};
      DEFAULT_SETTINGS.forEach(s => { map[s.key] = s.value; });
      saved.forEach(s => { map[s.key] = s.value; });
      setSettings(map);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const existing = await base44.entities.SiteSettings.list();
    for (const def of DEFAULT_SETTINGS) {
      const current = existing.find(e => e.key === def.key);
      if (current) {
        await base44.entities.SiteSettings.update(current.id, { value: settings[def.key] || "" });
      } else {
        await base44.entities.SiteSettings.create({ key: def.key, label: def.label, group: def.group, value: settings[def.key] || "" });
      }
    }
    setSaving(false);
    alert("Settings saved!");
  };

  const groups = [...new Set(DEFAULT_SETTINGS.map(s => s.group))];
  const groupLabels = { general: "General", shipping: "Shipping", loyalty: "Loyalty Program", display: "Display" };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-brand text-3xl text-primary">Settings</h1>
          <p className="text-muted-foreground">Configure your store</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary text-white rounded-full">
          <Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save All"}
        </Button>
      </div>

      {loading ? <div className="h-64 bg-muted rounded-2xl animate-pulse" /> :
        groups.map(group => (
          <div key={group} className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-lg">{groupLabels[group]}</h2>
            {DEFAULT_SETTINGS.filter(s => s.group === group).map(s => (
              <div key={s.key} className="space-y-1">
                <Label>{s.label}</Label>
                <Input
                  value={settings[s.key] ?? ""}
                  onChange={e => setSettings(prev => ({ ...prev, [s.key]: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            ))}
          </div>
        ))
      }
    </div>
  );
}