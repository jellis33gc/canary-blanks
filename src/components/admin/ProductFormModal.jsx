import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus, Upload, Trash2, RefreshCw, BookmarkPlus, Library } from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function cartesian(arrays) {
  return arrays.reduce(
    (acc, arr) => acc.flatMap(x => arr.map(y => [...x, y])),
    [[]]
  );
}

function autoSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─── component ──────────────────────────────────────────────────────────────

export default function ProductFormModal({ product, categories, onSave, onClose }) {
  // ── basic form fields (never stores variants) ──────────────────────────
  const [brands, setBrands] = useState([]);

  const [form, setForm] = useState({
    name:              product?.name || "",
    slug:              product?.slug || "",
    description:       product?.description || "",
    short_description: product?.short_description || "",
    price:             product?.price ?? "",
    compare_at_price:  product?.compare_at_price ?? "",
    category_id:       product?.category_id || "",
    category_name:     product?.category_name || "",
    brand_id:          product?.brand_id || "",
    brand_name:        product?.brand_name || "",
    images:            product?.images || [],
    sku:               product?.sku || "",
    stock_quantity:    product?.stock_quantity ?? "",
    is_active:         product?.is_active ?? true,
    is_featured:       product?.is_featured ?? false,
    is_on_sale:        product?.is_on_sale ?? false,
    tabs:              product?.tabs || [],
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // ── variable product toggle ─────────────────────────────────────────────
  const existingCombos = (product?.variants || []).filter(
    v => v && v.attributes && Object.keys(v.attributes).length > 0
  );
  const [isVariable, setIsVariable] = useState(existingCombos.length > 0);

  // ── attributes: [{ name, values: [string] }] ───────────────────────────
  const [attributes, setAttributes] = useState(() => {
    if (existingCombos.length === 0) return [];
    const map = {};
    existingCombos.forEach(v => {
      Object.entries(v.attributes).forEach(([k, val]) => {
        if (!map[k]) map[k] = new Set();
        map[k].add(String(val));
      });
    });
    return Object.entries(map).map(([name, vals]) => ({ name, values: [...vals] }));
  });

  // ── combinations: [{ combo, attributes, price, sku }] ──────────────────
  const [combinations, setCombinations] = useState(() =>
    existingCombos.map(v => ({
      combo:      v.combo || Object.values(v.attributes).join(" / "),
      attributes: v.attributes,
      price:      v.price ?? "",
      sku:        v.sku || "",
    }))
  );

  // ── saved attribute library ─────────────────────────────────────────────
  const [tagInput, setTagInput] = useState("");
  const [savedAttrs, setSavedAttrs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const addTag = (val) => {
    const tag = val.trim().toLowerCase();
    if (!tag) return;
    if (!form.tags?.includes(tag)) set("tags", [...(form.tags || []), tag]);
    setTagInput("");
  };

  const removeTag = (tag) => set("tags", (form.tags || []).filter(t => t !== tag));

  useEffect(() => {
    base44.entities.ProductAttribute.list("name", 100).then(setSavedAttrs).catch(() => {});
    base44.entities.Brand.filter({ is_active: true }, "sort_order", 100).then(setBrands).catch(() => {});
  }, []);

  // ── generate combinations from attributes ──────────────────────────────
  const generateCombinations = () => {
    const filled = attributes.filter(
      a => a.name.trim() && a.values.filter(v => v.trim()).length > 0
    );
    if (filled.length === 0) return;

    const valueArrays = filled.map(a => a.values.filter(v => v.trim()));
    const combos = cartesian(valueArrays);

    // Build a lookup of existing combos by key so we preserve prices/SKUs
    const existing = {};
    combinations.forEach(c => { existing[c.combo] = c; });

    const baseSku = form.sku.trim();
    const newCombinations = combos.map(vals => {
      const attrMap = {};
      filled.forEach((a, i) => { attrMap[a.name] = vals[i]; });
      const key = vals.join(" / ");
      if (existing[key]) return existing[key];
      const suffix = vals.map(v => v.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || "").join("")).join("");
      return { combo: key, attributes: attrMap, price: "", sku: baseSku ? `${baseSku}-${suffix}` : suffix };
    });

    setCombinations(newCombinations);
  };

  const updateCombo = (i, field, val) => {
    setCombinations(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  };

  // ── attribute library helpers ───────────────────────────────────────────
  const handleSaveAttribute = async (attr) => {
    if (!attr.name.trim()) return;
    const exists = savedAttrs.find(a => a.name.toLowerCase() === attr.name.toLowerCase());
    if (exists) {
      await base44.entities.ProductAttribute.update(exists.id, { values: attr.values.filter(v => v.trim()) });
      setSavedAttrs(prev => prev.map(a => a.id === exists.id ? { ...a, values: attr.values.filter(v => v.trim()) } : a));
    } else {
      const created = await base44.entities.ProductAttribute.create({ name: attr.name.trim(), values: attr.values.filter(v => v.trim()) });
      setSavedAttrs(prev => [...prev, created]);
    }
  };

  const handleLoadAttribute = (saved) => {
    if (attributes.find(a => a.name.toLowerCase() === saved.name.toLowerCase())) return;
    const vals = (saved.values || []).map(v => typeof v === "string" ? v : (v.label || String(v)));
    setAttributes(prev => [...prev, { name: saved.name, values: vals }]);
  };

  // ── category change ─────────────────────────────────────────────────────
  const handleBrandChange = (brandId) => {
    const brand = brands.find(b => b.id === brandId);
    set("brand_id", brandId === "none" ? "" : brandId);
    set("brand_name", brandId === "none" ? "" : (brand?.name || ""));
  };

  const handleCategoryChange = (catId) => {
    const cat = categories.find(c => c.id === catId);
    set("category_id", catId);
    set("category_name", cat?.name || "");
  };

  // ── image upload ────────────────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("images", [...form.images, file_url]);
    setUploading(false);
  };

  // ── SAVE ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) { alert("Product name is required"); return; }
    setSaving(true);

    const slug = form.slug || autoSlug(form.name);
    const price = form.price !== "" ? parseFloat(form.price) : undefined;
    const compare_at_price = form.compare_at_price !== "" ? parseFloat(form.compare_at_price) : 0;
    const stock_quantity = form.stock_quantity !== "" ? parseInt(form.stock_quantity) : undefined;

    // variants = only valid attribute combos from combinations state
    const variants = isVariable
      ? combinations.filter(c => c.attributes && Object.keys(c.attributes).length > 0)
      : [];

    await onSave({
      ...form,
      slug,
      price,
      compare_at_price,
      stock_quantity,
      variants,
    });

    setSaving(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2500);
  };

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-white z-10">
          <h2 className="font-bold text-xl">{product ? "Edit Product" : "Add New Product"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          <Tabs defaultValue="basic">
            <TabsList className="rounded-full bg-muted mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="basic"    className="rounded-full">Basic Info</TabsTrigger>
              <TabsTrigger value="media"    className="rounded-full">Images</TabsTrigger>
              <TabsTrigger value="pricing"  className="rounded-full">Pricing & Stock</TabsTrigger>
              <TabsTrigger value="variants" className="rounded-full">Variants</TabsTrigger>
              <TabsTrigger value="content"  className="rounded-full">Content</TabsTrigger>
            </TabsList>

            {/* ── BASIC ── */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-1">
                <Label>Product Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => { set("name", e.target.value); if (!product) set("slug", autoSlug(e.target.value)); }}
                  className="rounded-xl"
                />
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
                      const rendered = new Set();
                      const topLevel = categories.filter(c => !c.parent_id);
                      topLevel.forEach(parent => {
                        items.push(<SelectItem key={parent.id} value={parent.id}>{parent.name}</SelectItem>);
                        rendered.add(parent.id);
                        categories.filter(c => c.parent_id === parent.id).forEach(child => {
                          items.push(<SelectItem key={child.id} value={child.id}>↳ {child.name}</SelectItem>);
                          rendered.add(child.id);
                          categories.filter(c => c.parent_id === child.id).forEach(gc => {
                            items.push(<SelectItem key={gc.id} value={gc.id}>　↳ {gc.name}</SelectItem>);
                            rendered.add(gc.id);
                          });
                        });
                      });
                      categories.filter(c => !rendered.has(c.id)).forEach(c =>
                        items.push(<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                      );
                      return items;
                    })()}
                  </SelectContent>
                </Select>
              </div>
              {brands.length > 0 && (
                <div className="space-y-1">
                  <Label>Brand</Label>
                  <Select value={form.brand_id || "none"} onValueChange={handleBrandChange}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select brand (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Brand</SelectItem>
                      {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-4">
                <label className="flex items-center gap-2"><Checkbox checked={form.is_active}   onCheckedChange={v => set("is_active",   v)} /><span className="text-sm">Active</span></label>
                <label className="flex items-center gap-2"><Checkbox checked={form.is_featured} onCheckedChange={v => set("is_featured", v)} /><span className="text-sm">Featured</span></label>
                <label className="flex items-center gap-2"><Checkbox checked={form.is_on_sale}  onCheckedChange={v => set("is_on_sale",  v)} /><span className="text-sm">On Sale</span></label>
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
                  {(form.tags || []).map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
                    placeholder="Type a tag and press Enter"
                    className="rounded-xl"
                  />
                  <Button type="button" variant="outline" className="rounded-xl shrink-0" onClick={() => addTag(tagInput)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Press Enter or comma to add a tag</p>
              </div>
            </TabsContent>

            {/* ── MEDIA ── */}
            <TabsContent value="media" className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {form.images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => set("images", form.images.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors text-muted-foreground hover:text-primary">
                  {uploading
                    ? <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    : <><Upload className="w-6 h-6 mb-1" /><span className="text-xs">Upload</span></>
                  }
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                </label>
              </div>
            </TabsContent>

            {/* ── PRICING ── */}
            <TabsContent value="pricing" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Price (£)</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={e => set("price", e.target.value)} className="rounded-xl" placeholder={combinations.length > 0 ? "Optional if variants set prices" : "Required"} />
                  {combinations.length > 0 && <p className="text-xs text-muted-foreground">Optional — variants use their individual prices</p>}
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

            {/* ── VARIANTS ── */}
            <TabsContent value="variants" className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <Checkbox
                  checked={isVariable}
                  onCheckedChange={v => {
                    setIsVariable(v);
                    if (!v) { setAttributes([]); setCombinations([]); }
                  }}
                />
                <div>
                  <p className="font-semibold text-sm">Variable Product</p>
                  <p className="text-xs text-muted-foreground">Define attributes then generate all combinations to price individually</p>
                </div>
              </div>

              {isVariable && (
                <div className="space-y-5">
                  {/* Step 1: attributes */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-sm">Step 1 — Attributes &amp; Values</p>
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => setAttributes(prev => [...prev, { name: "", values: [""] }])}>
                        <Plus className="w-3 h-3 mr-1" /> Add Attribute
                      </Button>
                    </div>

                    {/* saved library */}
                    {savedAttrs.length > 0 && (
                      <div className="mb-3 p-3 bg-muted/50 rounded-xl">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Library className="w-3 h-3" /> Saved Attributes — click to add</p>
                        <div className="flex flex-wrap gap-1.5">
                          {savedAttrs.map(sa => (
                            <button
                              key={sa.id}
                              onClick={() => handleLoadAttribute(sa)}
                              disabled={!!attributes.find(a => a.name.toLowerCase() === sa.name.toLowerCase())}
                              className="text-xs px-2.5 py-1 rounded-full border border-border bg-white hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {sa.name} <span className="text-muted-foreground">({sa.values?.length})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {attributes.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-xl">
                        Add at least one attribute to get started
                      </p>
                    )}

                    {attributes.map((attr, ai) => (
                      <div key={ai} className="border border-border rounded-xl p-3 mb-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={attr.name}
                            onChange={e => setAttributes(prev => prev.map((a, i) => i === ai ? { ...a, name: e.target.value } : a))}
                            placeholder="Attribute name (e.g. Colour, Size)"
                            className="rounded-lg font-medium"
                          />
                          <button onClick={() => handleSaveAttribute(attr)} title="Save to library" className="p-1.5 hover:text-primary shrink-0">
                            <BookmarkPlus className="w-4 h-4" />
                          </button>
                          <button onClick={() => setAttributes(prev => prev.filter((_, i) => i !== ai))} className="p-1.5 hover:text-red-500 shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="pl-2 space-y-1.5">
                          {attr.values.map((val, vi) => (
                            <div key={vi} className="flex items-center gap-2">
                              <Input
                                value={val}
                                onChange={e => setAttributes(prev => prev.map((a, i) =>
                                  i === ai ? { ...a, values: a.values.map((v, j) => j === vi ? e.target.value : v) } : a
                                ))}
                                placeholder={`Value (e.g. ${ai === 0 ? "Red, Blue" : "S, M, L"})`}
                                className="rounded-lg h-8 text-sm"
                              />
                              <button onClick={() => setAttributes(prev => prev.map((a, i) =>
                                i === ai ? { ...a, values: a.values.filter((_, j) => j !== vi) } : a
                              ))} className="p-1 hover:text-red-500 shrink-0">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => setAttributes(prev => prev.map((a, i) => i === ai ? { ...a, values: [...a.values, ""] } : a))}
                            className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                          >
                            <Plus className="w-3 h-3" /> Add value
                          </button>
                        </div>
                      </div>
                    ))}

                    {attributes.length > 0 && (
                      <Button className="w-full rounded-full bg-primary text-white" onClick={generateCombinations}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {combinations.length > 0 ? "Update Combinations" : "Generate Combinations"}
                      </Button>
                    )}
                    {combinations.length > 0 && (
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        ✅ Updating preserves existing prices for unchanged combinations.
                      </p>
                    )}
                  </div>

                  {/* Step 2: price combos */}
                  {combinations.length > 0 && (
                    <div>
                      <p className="font-semibold text-sm mb-3">Step 2 — Price Each Combination</p>
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="grid grid-cols-12 bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
                          <span className="col-span-5">Combination</span>
                          <span className="col-span-4">Price (£)</span>
                          <span className="col-span-3">SKU</span>
                        </div>
                        {combinations.map((combo, i) => (
                          <div key={i} className="grid grid-cols-12 items-center px-3 py-2 border-t border-border gap-2">
                            <span className="col-span-5 text-sm font-medium">{combo.combo}</span>
                            <div className="col-span-4">
                              <Input type="number" step="0.01" value={combo.price} onChange={e => updateCombo(i, "price", e.target.value)} placeholder="0.00" className="rounded-lg h-8 text-sm" />
                            </div>
                            <div className="col-span-3">
                              <Input value={combo.sku} onChange={e => updateCombo(i, "sku", e.target.value)} placeholder="SKU" className="rounded-lg h-8 text-sm" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">💡 Leave price blank to fall back to the base product price.</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ── CONTENT ── */}
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

        <div className="p-6 border-t border-border flex items-center justify-between gap-3">
          {savedOk && <span className="text-green-600 text-sm font-medium">✓ Saved successfully</span>}
          <div className="flex gap-3 ml-auto">
            <Button variant="outline" onClick={onClose} className="rounded-full">Close</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-primary text-white rounded-full">
              {saving ? "Saving..." : savedOk ? "Saved ✓" : product ? "Update Product" : "Create Product"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}