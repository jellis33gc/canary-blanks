import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, X } from "lucide-react";

const STYLES = ["pink", "yellow", "purple", "mint", "dark"];

const stylePreview = {
  pink:   "bg-gradient-to-r from-pink-400 to-rose-500 text-white",
  yellow: "bg-gradient-to-r from-yellow-300 to-amber-400 text-yellow-900",
  purple: "bg-gradient-to-r from-purple-400 to-violet-600 text-white",
  mint:   "bg-gradient-to-r from-emerald-300 to-teal-500 text-white",
  dark:   "bg-gradient-to-r from-slate-700 to-slate-900 text-white",
};

const empty = { title: "", subtitle: "", badge_text: "", cta_label: "", cta_url: "/shop", emoji: "🎉", style: "pink", is_active: true, starts_at: "", ends_at: "", sort_order: 0 };

export default function AdminPromoBanners() {
  const [banners, setBanners] = useState([]);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, banner = edit
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = () => base44.entities.PromoBanner.list("sort_order", 50).then(setBanners);

  const openNew = () => { setForm(empty); setEditing({}); };
  const openEdit = (b) => { setForm({ ...b }); setEditing(b); };
  const close = () => setEditing(null);

  const save = async () => {
    setSaving(true);
    const data = { ...form, sort_order: Number(form.sort_order) || 0 };
    if (editing?.id) {
      await base44.entities.PromoBanner.update(editing.id, data);
    } else {
      await base44.entities.PromoBanner.create(data);
    }
    setSaving(false);
    close();
    load();
  };

  const del = async (id) => {
    await base44.entities.PromoBanner.delete(id);
    load();
  };

  const toggle = async (b) => {
    await base44.entities.PromoBanner.update(b.id, { is_active: !b.is_active });
    load();
  };

  const today = new Date().toISOString().split("T")[0];
  const isLive = (b) => b.is_active && (!b.starts_at || b.starts_at <= today) && (!b.ends_at || b.ends_at >= today);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Promo Banners</h1>
          <p className="text-muted-foreground text-sm mt-1">Announce seasonal sales and special offers on the homepage</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> New Banner</Button>
      </div>

      {/* Preview strip */}
      {banners.length > 0 && (
        <div className="space-y-3 mb-6">
          {banners.map(b => (
            <div key={b.id} className={`rounded-xl overflow-hidden border ${isLive(b) ? 'border-primary/30' : 'border-border opacity-60'}`}>
              <div className={`${stylePreview[b.style || 'pink']} px-4 py-3 flex items-center gap-3`}>
                {b.emoji && <span className="text-xl">{b.emoji}</span>}
                <div className="flex-1 min-w-0">
                  {b.badge_text && <span className="text-xs font-bold uppercase bg-white/20 rounded-full px-2 py-0.5 mr-2">{b.badge_text}</span>}
                  <span className="font-bold text-sm">{b.title}</span>
                  {b.subtitle && <span className="text-xs opacity-80 ml-2 hidden sm:inline">{b.subtitle}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isLive(b) ? <Badge className="bg-green-500 text-white text-xs">Live</Badge> : <Badge variant="outline" className="text-xs">Inactive</Badge>}
                  <Switch checked={b.is_active} onCheckedChange={() => toggle(b)} />
                  <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(b.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              {(b.starts_at || b.ends_at) && (
                <div className="bg-muted px-4 py-1.5 text-xs text-muted-foreground flex gap-4">
                  {b.starts_at && <span>From: {b.starts_at}</span>}
                  {b.ends_at && <span>Until: {b.ends_at}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {banners.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
          <div className="text-5xl mb-3">📢</div>
          <p className="font-semibold">No banners yet</p>
          <p className="text-sm mt-1">Create your first promotional banner to announce sales and offers</p>
        </div>
      )}

      {/* Edit / Create Modal */}
      {editing !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-lg">{editing?.id ? "Edit Banner" : "New Banner"}</h2>
              <button onClick={close}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            {/* Live Preview */}
            <div className={`${stylePreview[form.style || 'pink']} px-5 py-3 flex items-center gap-3`}>
              {form.emoji && <span className="text-xl">{form.emoji}</span>}
              <div className="flex-1">
                {form.badge_text && <span className="text-xs font-bold uppercase bg-white/20 rounded-full px-2 py-0.5 mr-2">{form.badge_text}</span>}
                <span className="font-bold text-sm">{form.title || "Your title here"}</span>
                {form.subtitle && <span className="text-xs opacity-80 ml-2">{form.subtitle}</span>}
              </div>
              {form.cta_label && <span className="text-xs bg-white/20 rounded-full px-3 py-1 font-bold shrink-0">{form.cta_label}</span>}
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Summer Sale — 20% off all sublimation blanks!" />
                </div>
                <div className="col-span-2">
                  <Label>Subtitle</Label>
                  <Input value={form.subtitle} onChange={e => setForm({...form, subtitle: e.target.value})} placeholder="e.g. Use code SUMMER20 at checkout" />
                </div>
                <div>
                  <Label>Badge Text</Label>
                  <Input value={form.badge_text} onChange={e => setForm({...form, badge_text: e.target.value})} placeholder="e.g. LIMITED TIME" />
                </div>
                <div>
                  <Label>Emoji</Label>
                  <Input value={form.emoji} onChange={e => setForm({...form, emoji: e.target.value})} placeholder="🎉" />
                </div>
                <div>
                  <Label>Button Label</Label>
                  <Input value={form.cta_label} onChange={e => setForm({...form, cta_label: e.target.value})} placeholder="Shop Now" />
                </div>
                <div>
                  <Label>Button URL</Label>
                  <Input value={form.cta_url} onChange={e => setForm({...form, cta_url: e.target.value})} placeholder="/shop" />
                </div>
                <div>
                  <Label>Style</Label>
                  <Select value={form.style} onValueChange={v => setForm({...form, style: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STYLES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: e.target.value})} placeholder="0" />
                </div>
                <div>
                  <Label>Start Date (optional)</Label>
                  <Input type="date" value={form.starts_at} onChange={e => setForm({...form, starts_at: e.target.value})} />
                </div>
                <div>
                  <Label>End Date (optional)</Label>
                  <Input type="date" value={form.ends_at} onChange={e => setForm({...form, ends_at: e.target.value})} />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} />
                  <Label>Active</Label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={save} disabled={saving || !form.title} className="flex-1">{saving ? "Saving..." : "Save Banner"}</Button>
                <Button variant="outline" onClick={close}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}