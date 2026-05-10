import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, Save } from "lucide-react";

export default function BulkTabManager({ products, onClose, onSaved }) {
  const [tabs, setTabs] = useState([]);
  const [newTabTitle, setNewTabTitle] = useState("");
  const [newTabContent, setNewTabContent] = useState("");
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("add"); // "add" or "replace"
  const [selectedCategories, setSelectedCategories] = useState(new Set());

  // Get unique categories
  const categories = Array.from(new Set(products.map(p => p.category_name).filter(Boolean))).sort();

  const addTab = () => {
    if (!newTabTitle.trim()) return;
    setTabs([...tabs, { title: newTabTitle, content: newTabContent }]);
    setNewTabTitle("");
    setNewTabContent("");
  };

  const removeTab = (idx) => {
    setTabs(tabs.filter((_, i) => i !== idx));
  };

  const toggleProduct = (productId) => {
    const newSet = new Set(selectedProducts);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setSelectedProducts(newSet);
  };

  const handleSave = async () => {
    if (tabs.length === 0 || selectedProducts.size === 0) {
      alert("Add at least one tab and select at least one product");
      return;
    }

    setSaving(true);
    let updated = 0;

    for (const productId of selectedProducts) {
      const product = products.find(p => p.id === productId);
      if (!product) continue;

      const newTabs = mode === "replace" ? tabs : [...(product.tabs || []), ...tabs];

      try {
        const response = await base44.functions.invoke("saveProduct", {
          productId,
          data: { tabs: newTabs }
        });
        if (response.data?.success) updated++;
      } catch (err) {
        console.error(`Failed to update product ${productId}:`, err);
      }
    }

    setSaving(false);
    alert(`Updated ${updated} products`);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="sticky top-0 bg-white border-b border-border p-6 flex items-center justify-between">
          <h2 className="font-brand text-2xl">Bulk Add Product Tabs</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Mode selector */}
          <div className="space-y-2">
            <p className="font-semibold text-sm">Mode</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={mode === "add"} onCheckedChange={() => setMode("add")} />
                <span className="text-sm">Add to existing tabs</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={mode === "replace"} onCheckedChange={() => setMode("replace")} />
                <span className="text-sm">Replace all tabs</span>
              </label>
            </div>
          </div>

          {/* Tab editor */}
          <div className="space-y-3 bg-muted/30 rounded-xl p-4">
            <p className="font-semibold text-sm">Define Tabs</p>
            <Input
              placeholder="Tab title (e.g., Care Instructions)"
              value={newTabTitle}
              onChange={e => setNewTabTitle(e.target.value)}
              className="rounded-lg"
            />
            <Textarea
              placeholder="Tab content (HTML supported)"
              value={newTabContent}
              onChange={e => setNewTabContent(e.target.value)}
              rows={4}
              className="rounded-lg"
            />
            <Button onClick={addTab} className="w-full rounded-lg" variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Add Tab
            </Button>
          </div>

          {/* Display added tabs */}
          {tabs.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold text-sm">Added Tabs ({tabs.length})</p>
              <div className="space-y-2">
                {tabs.map((tab, idx) => (
                  <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-blue-900">{tab.title}</p>
                      <p className="text-xs text-blue-700 line-clamp-2">{tab.content || "(no content)"}</p>
                    </div>
                    <button onClick={() => removeTab(idx)} className="ml-2 p-1 hover:bg-blue-100 rounded"><X className="w-4 h-4 text-blue-600" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product selector */}
          <div className="space-y-2">
            <p className="font-semibold text-sm">Select Products ({selectedProducts.size}/{(() => {
              const filteredProds = selectedCategories.size > 0
                ? products.filter(p => selectedCategories.has(p.category_name))
                : products;
              return filteredProds.length;
            })()})</p>

            {/* Category filter - checkboxes for multiple selection */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Filter by categories:</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer p-2 bg-white border border-border rounded-lg hover:border-primary transition-colors">
                      <Checkbox
                        checked={selectedCategories.has(cat)}
                        onCheckedChange={() => {
                          const newSet = new Set(selectedCategories);
                          if (newSet.has(cat)) {
                            newSet.delete(cat);
                          } else {
                            newSet.add(cat);
                          }
                          setSelectedCategories(newSet);
                        }}
                      />
                      <span className="text-sm">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              {(() => {
                const filteredProds = selectedCategories.size > 0
                  ? products.filter(p => selectedCategories.has(p.category_name))
                  : products;

                return (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-muted rounded border border-border">
                      <Checkbox
                        checked={filteredProds.length > 0 && filteredProds.every(p => selectedProducts.has(p.id))}
                        onCheckedChange={() => {
                          const newSet = new Set(selectedProducts);
                          if (filteredProds.every(p => selectedProducts.has(p.id))) {
                            filteredProds.forEach(p => newSet.delete(p.id));
                          } else {
                            filteredProds.forEach(p => newSet.add(p.id));
                          }
                          setSelectedProducts(newSet);
                        }}
                      />
                      <span className="text-sm font-semibold flex-1">{filteredProds.every(p => selectedProducts.has(p.id)) ? 'Deselect All' : 'Select All'}</span>
                    </label>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {filteredProds.map(p => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-muted rounded">
                  <Checkbox
                    checked={selectedProducts.has(p.id)}
                    onCheckedChange={() => toggleProduct(p.id)}
                  />
                  <span className="text-sm flex-1">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.sku || p.id.slice(0, 6)}</span>
                </label>
                ))}
                </div>
                </>
                );
                })()}
                </div>
                </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button onClick={onClose} variant="outline" className="flex-1 rounded-lg">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-primary text-white">
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Apply to Products"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}