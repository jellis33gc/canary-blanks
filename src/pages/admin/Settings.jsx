import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, UserPlus, Trash2 } from "lucide-react";

const DEFAULT_SETTINGS = [
  { key: "site_name", label: "Site Name", group: "general", value: "Canary Blanks" },
  { key: "site_tagline", label: "Tagline", group: "general", value: "Cakes, Decorations & Party Supplies" },
  { key: "contact_email", label: "Contact Email", group: "general", value: "" },
  { key: "contact_phone", label: "Contact Phone", group: "general", value: "" },
  { key: "free_shipping_threshold", label: "Free Shipping Over (€)", group: "shipping", value: "50" },
  { key: "standard_shipping_cost", label: "Standard Shipping Cost (€)", group: "shipping", value: "4.99" },
  { key: "shipping_tab_content", label: "Shipping Tab Content", group: "shipping", value: "🚚 Standard Delivery: 3-5 working days — FREE over €50\n⚡ Express Delivery: 1-2 working days — €5.99\n🎂 Custom Cakes: Please allow 7-14 days for custom orders" },
  { key: "loyalty_points_per_pound", label: "Points Earned Per €1 Spent", group: "loyalty", value: "10" },
  { key: "loyalty_points_per_discount", label: "Points Needed for €1 Discount", group: "loyalty", value: "100" },
  { key: "announcement_bar", label: "Announcement Bar Text", group: "display", value: "🎂 Free shipping on orders over €50!" },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);

  useEffect(() => {
    base44.entities.SiteSettings.list().then(saved => {
      const map = {};
      DEFAULT_SETTINGS.forEach(s => { map[s.key] = s.value; });
      saved.forEach(s => { map[s.key] = s.value; });
      setSettings(map);
      setLoading(false);
    });
    base44.entities.User.filter({ role: "admin" }).then(setAdmins).catch(() => {});
  }, []);

  const handleInviteAdmin = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    await base44.users.inviteUser(inviteEmail.trim(), "admin");
    setInviteMsg({ type: "success", text: `Invite sent to ${inviteEmail.trim()}` });
    setInviteEmail("");
    setInviting(false);
    base44.entities.User.filter({ role: "admin" }).then(setAdmins).catch(() => {});
  };

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

      {/* Admin Accounts */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-lg">Admin Accounts</h2>
        <div className="space-y-2">
          {admins.map(a => (
            <div key={a.id} className="flex items-center gap-3 py-2 px-3 bg-muted/40 rounded-xl">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-sm">{a.email?.charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{a.full_name || a.email}</p>
                <p className="text-xs text-muted-foreground truncate">{a.email}</p>
              </div>
              <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">Admin</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Input
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleInviteAdmin()}
            placeholder="new-admin@email.com"
            className="rounded-xl flex-1"
            type="email"
          />
          <Button onClick={handleInviteAdmin} disabled={inviting || !inviteEmail.trim()} className="bg-primary text-white rounded-xl shrink-0">
            <UserPlus className="w-4 h-4 mr-1.5" />{inviting ? "Inviting…" : "Invite Admin"}
          </Button>
        </div>
        {inviteMsg && (
          <p className={`text-sm font-medium ${inviteMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>{inviteMsg.text}</p>
        )}
      </div>

      {loading ? <div className="h-64 bg-muted rounded-2xl animate-pulse" /> :
        groups.map(group => (
          <div key={group} className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-lg">{groupLabels[group]}</h2>
            {DEFAULT_SETTINGS.filter(s => s.group === group).map(s => (
              <div key={s.key} className="space-y-1">
                <Label>{s.label}</Label>
                {s.key === "shipping_tab_content" ? (
                  <textarea
                    value={settings[s.key] ?? ""}
                    onChange={e => setSettings(prev => ({ ...prev, [s.key]: e.target.value }))}
                    className="w-full rounded-xl border border-input p-3 text-sm h-24 resize-none"
                  />
                ) : (
                  <Input
                    value={settings[s.key] ?? ""}
                    onChange={e => setSettings(prev => ({ ...prev, [s.key]: e.target.value }))}
                    className="rounded-xl"
                  />
                )}
              </div>
            ))}
          </div>
        ))
      }
    </div>
  );
}