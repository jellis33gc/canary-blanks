import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Save, ChevronDown, ChevronUp } from "lucide-react";
import HeroSlideEditor from "@/components/admin/HeroSlideEditor";

const BLOCK_TYPES = [
  { value: "hero", label: "🦸 Hero Banner" },
  { value: "featured_products", label: "⭐ Featured Products" },
  { value: "sale_products", label: "🏷️ Sale Products" },
  { value: "category_grid", label: "📁 Category Grid" },
  { value: "brand_slider", label: "🏢 Brand Slider" },
  { value: "banner", label: "🎨 Promo Banner" },
  { value: "testimonials", label: "💬 Testimonials" },
  { value: "newsletter", label: "📧 Newsletter" },
];

export default function HomepageBuilder() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedHero, setExpandedHero] = useState(null);

  useEffect(() => {
    base44.entities.HomepageBlock.list("sort_order").then(b => { setBlocks(b); setLoading(false); });
  }, []);

  const addBlock = async () => {
    const newBlock = await base44.entities.HomepageBlock.create({ type: "banner", title: "New Block", is_active: true, sort_order: blocks.length + 1 });
    setBlocks(b => [...b, newBlock]);
  };

  const updateBlock = (id, key, value) => {
    setBlocks(b => b.map(x => x.id === id ? { ...x, [key]: value } : x));
  };

  const deleteBlock = async (id) => {
    if (!confirm("Remove this block?")) return;
    await base44.entities.HomepageBlock.delete(id);
    setBlocks(b => b.filter(x => x.id !== id));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(blocks);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setBlocks(reordered);
  };

  const saveAll = async () => {
    setSaving(true);
    await Promise.all(blocks.map((b, i) => base44.entities.HomepageBlock.update(b.id, { type: b.type, title: b.title, subtitle: b.subtitle, is_active: b.is_active, sort_order: i + 1 })));
    setSaving(false);
    alert("Homepage saved!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-brand text-3xl text-primary">Homepage Builder</h1>
          <p className="text-muted-foreground">Manage homepage sections</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full" onClick={addBlock}><Plus className="w-4 h-4 mr-2" /> Add Block</Button>
          <Button className="bg-primary text-white rounded-full" onClick={saveAll} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save Order"}</Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="homepage-blocks">
            {(provided) => (
              <div className="space-y-3" ref={provided.innerRef} {...provided.droppableProps}>
                {blocks.map((block, i) => (
                  <Draggable key={block.id} draggableId={block.id} index={i}>
                    {(p) => (
                      <div ref={p.innerRef} {...p.draggableProps} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden select-none">
                        {/* Main row */}
                        <div className="p-5 flex items-center gap-4">
                          <div {...p.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                            <GripVertical className="w-5 h-5 shrink-0" />
                          </div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Block Type</Label>
                              <Select value={block.type} onValueChange={v => updateBlock(block.id, "type", v)}>
                                <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>{BLOCK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Title</Label>
                              <Input value={block.title || ""} onChange={e => updateBlock(block.id, "title", e.target.value)} className="rounded-xl h-9" placeholder="Block title" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Subtitle</Label>
                              <Input value={block.subtitle || ""} onChange={e => updateBlock(block.id, "subtitle", e.target.value)} className="rounded-xl h-9" placeholder="Optional subtitle" />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2">
                              <Switch checked={block.is_active} onCheckedChange={v => updateBlock(block.id, "is_active", v)} />
                              <span className="text-xs text-muted-foreground">{block.is_active ? "Visible" : "Hidden"}</span>
                            </div>
                            {block.type === "hero" && (
                              <button
                                onClick={() => setExpandedHero(expandedHero === block.id ? null : block.id)}
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                title="Edit slides"
                              >
                                {expandedHero === block.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                            <button onClick={() => deleteBlock(block.id)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        {/* Hero slide editor */}
                        {block.type === "hero" && expandedHero === block.id && (
                          <div className="border-t border-border px-5 pb-5 bg-muted/30">
                            <HeroSlideEditor />
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
      {blocks.length === 0 && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="mb-4">No homepage blocks yet.</p>
          <Button variant="outline" className="rounded-full" onClick={addBlock}><Plus className="w-4 h-4 mr-2" /> Add your first block</Button>
        </div>
      )}
    </div>
  );
}