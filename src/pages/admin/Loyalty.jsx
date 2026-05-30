import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DEFAULT_TIERS = [
  { name: "Bronze", min_points: 0, color: "#cd7f32", icon: "🥉", benefits: "Earn 1 point per €1 spent" },
  { name: "Silver", min_points: 500, color: "#c0c0c0", icon: "🥈", benefits: "5% bonus points on orders" },
  { name: "Gold", min_points: 1500, color: "#ffd700", icon: "🥇", benefits: "10% bonus points + priority support" },
];

export default function AdminLoyalty() {
  const [settingsId, setSettingsId] = useState(null);
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [rules, setRules] = useState({
    points_per_euro: 1,
    redemption_rate: 100,
    max_redemption_percent: 20,
    min_points_to_redeem: 100,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.LoyaltySettings.list().then(list => {
      if (list[0]) {
        const s = list[0];
        setSettingsId(s.id);
        if (s.tiers?.length) setTiers(s.tiers);
        setRules({
          points_per_euro: s.points_per_euro ?? 1,
          redemption_rate: s.redemption_rate ?? 100,
          max_redemption_percent: s.max_redemption_percent ?? 20,
          min_points_to_redeem: s.min_points_to_redeem ?? 100,
        });
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const data = { tiers, ...rules };
    if (settingsId) {
      await base44.entities.LoyaltySettings.update(settingsId, data);
    } else {
      const created = await base44.entities.LoyaltySettings.create(data);
      setSettingsId(created.id);
    }
    setSaving(false);
    toast({ title: "Loyalty settings saved!" });
  };

  const updateTier = (i, field, value) => {
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Loyalty Programme</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure tiers, earning rules and redemption settings.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="rounded-full">
          <Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Earning and Redemption Rules */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-lg">Earning and Redemption Rules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Points earned per €1 spent</Label>
            <Input type="number" min="0" step="0.1" value={rules.points_per_euro}
              onChange={e => setRules(r => ({ ...r, points_per_euro: parseFloat(e.target.value) || 0 }))} className="rounded-xl" />
            <p className="text-xs text-muted-foreground">e.g. 1 = 1 point per €1</p>
          </div>
          <div className="space-y-1">
            <Label>Points needed to redeem €1</Label>
            <Input type="number" min="1" value={rules.redemption_rate}
              onChange={e => setRules(r => ({ ...r, redemption_rate: parseInt(e.target.value) || 100 }))} className="rounded-xl" />
            <p className="text-xs text-muted-foreground">e.g. 100 = 100 points = €1</p>
          </div>
          <div className="space-y-1">
            <Label>Max redemption (% of order value)</Label>
            <Input type="number" min="1" max="100" value={rules.max_redemption_percent}
              onChange={e => setRules(r => ({ ...r, max_redemption_percent: parseInt(e.target.value) || 20 }))} className="rounded-xl" />
            <p className="text-xs text-muted-foreground">e.g. 20 = points cover up to 20% of order</p>
          </div>
          <div className="space-y-1">
            <Label>Minimum points before redemption allowed</Label>
            <Input type="number" min="0" value={rules.min_points_to_redeem}
              onChange={e => setRules(r => ({ ...r, min_points_to_redeem: parseInt(e.target.value) || 0 }))} className="rounded-xl" />
            <p className="text-xs text-muted-foreground">e.g. 100 = must have at least 100 points</p>
          </div>
        </div>
      </div>

      {/* Tiers */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Loyalty Tiers</h2>
          <Button variant="outline" size="sm" onClick={() => setTiers(prev => [...prev, { name: "New Tier", min_points: 0, color: "#888888", icon: "⭐", benefits: "" }])} className="rounded-full">
            <Plus className="w-4 h-4 mr-1" /> Add Tier
          </Button>
        </div>
        <div className="space-y-4">
          {tiers.map((tier, i) => (
            <div key={i} className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{tier.icon} {tier.name}</span>
                <Button variant="ghost" size="icon" onClick={() => setTiers(prev => prev.filter((_, idx) => idx !== i))} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tier Name</Label>
                  <Input value={tier.name} onChange={e => updateTier(i, 'name', e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label>Minimum Points Required</Label>
                  <Input type="number" min="0" value={tier.min_points} onChange={e => updateTier(i, 'min_points', parseInt(e.target.value) || 0)} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label>Icon (emoji)</Label>
                  <Input value={tier.icon} onChange={e => updateTier(i, 'icon', e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label>Colour (hex)</Label>
                  <div className="flex gap-2">
                    <Input value={tier.color} onChange={e => updateTier(i, 'color', e.target.value)} className="rounded-xl flex-1" />
                    <input type="color" value={tier.color} onChange={e => updateTier(i, 'color', e.target.value)} className="w-10 h-9 rounded-lg border border-border cursor-pointer" />
                  </div>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Benefits Description</Label>
                  <Input value={tier.benefits} onChange={e => updateTier(i, 'benefits', e.target.value)} className="rounded-xl" placeholder="e.g. 5% bonus points on all orders" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}