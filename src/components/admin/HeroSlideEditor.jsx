import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, GripVertical, Upload, X } from "lucide-react";
import { uploadImageFile } from "@/utils/uploadImage";

const BG_OPTIONS = [
  { value: "from-pink-400 via-rose-400 to-fuchsia-500", label: "🌸 Pink / Rose" },
  { value: "from-amber-400 via-orange-400 to-yellow-400", label: "☀️ Amber / Yellow" },
  { value: "from-violet-500 via-purple-500 to-fuchsia-400", label: "💜 Violet / Purple" },
  { value: "from-teal-400 via-emerald-400 to-cyan-400", label: "🌊 Teal / Emerald" },
  { value: "from-blue-400 via-sky-400 to-cyan-400", label: "💙 Blue / Sky" },
  { value: "from-red-400 via-rose-500 to-pink-500", label: "❤️ Red / Rose" },
];

const empty = () => ({
  badge: "",
  title: "",
  subtitle: "",
  cta_label: "Shop Now",
  cta_url: "/shop",
  cta2_label: "View All",
  cta2_url: "/shop",
  bg: "from-pink-400 via-rose-400 to-fuchsia-500",
  emoji: "🎂 🧁 🎀 🍰",
  is_active: true,
  sort_order: 0,
});

export default function HeroSlideEditor() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    base44.entities.HeroSlide.list("sort_order").then(s => { setSlides(s); setLoading(false); });
  }, []);

  const update = (id, key, value) => {
    setSlides(s => s.map(x => x.id === id ? { ...x, [key]: value } : x));
  };

  const addSlide = async () => {
    const s = await base44.entities.HeroSlide.create({ ...empty(), sort_order: slides.length + 1 });
    setSlides(prev => [...prev, s]);
    setExpanded(s.id);
  };

  const deleteSlide = async (id) => {
    if (!confirm("Delete this slide?")) return;
    await base44.entities.HeroSlide.delete(id);
    setSlides(s => s.filter(x => x.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const saveAll = async () => {
    setSaving(true);
    await Promise.all(slides.map((s, i) => base44.entities.HeroSlide.update(s.id, { ...s, sort_order: i + 1 })));
    setSaving(false);
    alert("Slides saved!");
  };

  if (loading) return <div className="h-32 bg-muted rounded-2xl animate-pulse mt-4" />;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-muted-foreground">Hero Slides</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="rounded-full" onClick={addSlide}><Plus className="w-4 h-4 mr-1" /> Add Slide</Button>
          <Button size="sm" className="rounded-full bg-primary text-white" onClick={saveAll} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? "Saving…" : "Save Slides"}</Button>
        </div>
      </div>

      {slides.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No slides yet. Add one above.</p>
      )}

      {slides.map((slide, i) => (
        <div key={slide.id} className="bg-muted/50 border border-border rounded-2xl overflow-hidden">
          <div
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/80 transition-colors"
            onClick={() => setExpanded(expanded === slide.id ? null : slide.id)}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${slide.bg} shrink-0`} />
            <span className="flex-1 text-sm font-medium truncate">{slide.badge || slide.title || `Slide ${i + 1}`}</span>
            <Switch checked={slide.is_active} onCheckedChange={v => update(slide.id, "is_active", v)} onClick={e => e.stopPropagation()} />
            <span className="text-xs text-muted-foreground w-14">{slide.is_active ? "Visible" : "Hidden"}</span>
            <button onClick={e => { e.stopPropagation(); deleteSlide(slide.id); }} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {expanded === slide.id && (
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
              <div className="space-y-1">
                <Label className="text-xs">Badge Text</Label>
                <Input value={slide.badge || ""} onChange={e => update(slide.id, "badge", e.target.value)} placeholder="e.g. 🌸 Spring Collection" className="rounded-xl h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Background Colour</Label>
                <Select value={slide.bg} onValueChange={v => update(slide.id, "bg", v)}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{BG_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Title (use \n for line breaks)</Label>
                <Input value={slide.title || ""} onChange={e => update(slide.id, "title", e.target.value)} placeholder="e.g. Bake Magic\nHappen!" className="rounded-xl h-9" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Subtitle</Label>
                <Input value={slide.subtitle || ""} onChange={e => update(slide.id, "subtitle", e.target.value)} placeholder="Short description..." className="rounded-xl h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Primary Button Label</Label>
                <Input value={slide.cta_label || ""} onChange={e => update(slide.id, "cta_label", e.target.value)} placeholder="Shop Now" className="rounded-xl h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Primary Button URL</Label>
                <Input value={slide.cta_url || ""} onChange={e => update(slide.id, "cta_url", e.target.value)} placeholder="/shop" className="rounded-xl h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Secondary Button Label</Label>
                <Input value={slide.cta2_label || ""} onChange={e => update(slide.id, "cta2_label", e.target.value)} placeholder="View All" className="rounded-xl h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Secondary Button URL</Label>
                <Input value={slide.cta2_url || ""} onChange={e => update(slide.id, "cta2_url", e.target.value)} placeholder="/shop" className="rounded-xl h-9" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Emojis (space-separated, up to 4 — ignored when a background image is set)</Label>
                <Input value={slide.emoji || ""} onChange={e => update(slide.id, "emoji", e.target.value)} placeholder="🎂 🧁 🎀 🍰" className="rounded-xl h-9" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs">Background Image (optional — overrides gradient)</Label>
                {slide.bg_image ? (
                  <div className="relative rounded-xl overflow-hidden h-32 border border-border">
                    <img src={slide.bg_image} alt="bg" className="w-full h-full object-cover" />
                    <button
                      onClick={() => update(slide.id, "bg_image", "")}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-xl px-4 py-3 hover:bg-muted/50 transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        update(slide.id, "_uploading", true);
                        try {
                          const fileUrl = await uploadImageFile(file);
                          update(slide.id, "bg_image", fileUrl);
                        } catch (err) {
                          console.error("Hero image upload error:", err);
                          alert(err?.message || "Failed to upload image. Please try again.");
                        } finally {
                          update(slide.id, "_uploading", false);
                          e.target.value = "";
                        }
                      }}
                    />
                    {slide._uploading && <span className="text-xs text-primary ml-2">Uploading…</span>}
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}