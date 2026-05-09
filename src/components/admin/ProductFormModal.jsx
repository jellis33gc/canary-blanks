import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus, Upload, Trash2 } from "lucide-react";

export default function ProductFormModal({ product, categories, onSave, onClose }) {
  const [form, setForm] = useState({
    name: product?.name || "",
    slug: product?.slug || "",
    description: product?.description || "",
    short_description: product?.short_description || "",
    price: product?.price || 0,
    compare_at_price: product?.compare_at_price || 0,
    category_id: product?.category_id || "",
    category_name: product?.category_name || "",
    images: product?.images || [],
    sku: product?.sku || "",
    stock_quantity: product?.stock_quantity ?? "",
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
    is_on_sale: product?.is_on_sale ?? false,
    tabs: product?.tabs || [],
    variants: product?.variants || [],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleCategoryChange = (catId) => {
    const cat = categories.find(c => c.id === catId);
    set("category_id", catId);
    set("category_name", cat?.name || "");
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("images", [...form.images, file_url]);
    setUploading(false);
  };

  const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSubmit = async () => {
    setSaving(true);
    const slug = form.slug || autoSlug(form.name);
    await onSave({ ...form, slug, price: parseFloat(form.price), compare_at_price: parseFloat(form.compare_at_price) || 0, stock_quantity: form.stock_quantity !== "" ? parseInt(form.stock_quantity) : undefined });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-white z-10">
          <h2 className="font-bold text-xl">{product ? "Edit Product" : "Add New Product"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          <Tabs defaultValue="basic">
            <TabsList className="rounded-full bg-muted mb-6">
              <TabsTrigger value="basic" className="rounded-full">Basic Info</TabsTrigger>
              <TabsTrigger value="media" className="rounded-full">Images</TabsTrigger>
              <TabsTrigger value="pricing" className="rounded-full">Pricing & Stock</TabsTrigger>
              <TabsTrigger value="content" className="rounded-full">Content</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-1">
                <Label>Product Name *</Label>
                <Input value={form.name} onChange={e => { set("name", e.target.value); if (!product) set("slug", autoSlug(e.target.value)); }} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label>URL Slug</Label>
                <Input value={form.slug} onChange={e => set("slug", e.target.value)} className="rounded-xl" placeholder="auto-generated" />
              </div>
              <div className="space-y-1">
                <Label>Short Description</Label>
                <Input value={form.short_description} onChange={e => set("short_description", e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const items = [];
                      const topLevel = categories.filter(c => !c.parent_id);
                      const renderedIds = new Set();
                      topLevel.forEach(parent => {
                        items.push(<SelectItem key={parent.id} value={parent.id}>{parent.name}</SelectItem>);
                        renderedIds.add(parent.id);
                        const children = categories.filter(c => c.parent_id === parent.id);
                        children.forEach(child => {
                          items.push(<SelectItem key={child.id} value={child.id}>↳ {child.name}</SelectItem>);
                          renderedIds.add(child.id);
                          const grandchildren = categories.filter(c => c.parent_id === child.id);
                          grandchildren.forEach(gc => {
                            items.push(<SelectItem key={gc.id} value={gc.id}>　↳ {gc.name}</SelectItem>);
                            renderedIds.add(gc.id);
                          });
                        });
                      });
                      // Fallback: show any categories not already rendered
                      categories.filter(c => !renderedIds.has(c.id)).forEach(c => {
                        items.push(<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>);
                      });
                      return items;
                    })()}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2"><Checkbox checked={form.is_active} onCheckedChange={v => set("is_active", v)} /><span className="text-sm">Active</span></label>
                <label className="flex items-center gap-2"><Checkbox checked={form.is_featured} onCheckedChange={v => set("is_featured", v)} /><span className="text-sm">Featured</span></label>
                <label className="flex items-center gap-2"><Checkbox checked={form.is_on_sale} onCheckedChange={v => set("is_on_sale", v)} /><span className="text-sm">On Sale</span></label>
              </div>
            </TabsContent>

            <TabsContent value="media" className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {form.images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => set("images", form.images.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors text-muted-foreground hover:text-primary">
                  {uploading ? <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <><Upload className="w-6 h-6 mb-1" /><span className="text-xs">Upload</span></>}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                </label>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Price (£) *</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={e => set("price", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label>Compare At Price (£)</Label>
                  <Input type="number" step="0.01" value={form.compare_at_price} onChange={e => set("compare_at_price", e.target.value)} className="rounded-xl" placeholder="Optional" />
                </div>
                <div className="space-y-1">
                  <Label>SKU</Label>
                  <Input value={form.sku} onChange={e => set("sku", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label>Stock Quantity</Label>
                  <Input type="number" value={form.stock_quantity} onChange={e => set("stock_quantity", e.target.value)} className="rounded-xl" placeholder="Leave empty for unlimited" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <div className="space-y-1">
                <Label>Full Description (HTML supported)</Label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)} className="w-full rounded-xl border border-border p-3 text-sm h-32 resize-none bg-background" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Product Tabs</Label>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => set("tabs", [...form.tabs, { title: "", content: "" }])}>
                    <Plus className="w-3 h-3 mr-1" /> Add Tab
                  </Button>
                </div>
                {form.tabs.map((tab, i) => (
                  <div key={i} className="border border-border rounded-xl p-3 mb-2 space-y-2">
                    <div className="flex gap-2 items-center">
                      <Input value={tab.title} onChange={e => { const t = [...form.tabs]; t[i].title = e.target.value; set("tabs", t); }} placeholder="Tab title" className="rounded-lg" />
                      <button onClick={() => set("tabs", form.tabs.filter((_, idx) => idx !== i))} className="p-1.5 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <textarea value={tab.content} onChange={e => { const t = [...form.tabs]; t[i].content = e.target.value; set("tabs", t); }} placeholder="Tab content" className="w-full rounded-lg border border-border p-2 text-sm h-20 resize-none bg-background" />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-full">Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-primary text-white rounded-full">
            {saving ? "Saving..." : product ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </div>
    </div>
  );
}