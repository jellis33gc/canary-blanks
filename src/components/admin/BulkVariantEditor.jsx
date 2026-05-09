import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Check, AlertCircle, CheckCircle } from "lucide-react";

export default function BulkVariantEditor({ products, onClose, onSaved }) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Only show variable products (those with attribute-based combinations)
  const variableProducts = products.filter(p =>
    (p.variants || []).some(v => v.attributes)
  );

  useEffect(() => {
    if (!selectedProductId) { setRows([]); return; }
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    const combos = (product.variants || []).filter(v => v.attributes);
    setRows(combos.map(v => ({
      combo: v.combo || Object.values(v.attributes || {}).join(" / "),
      attributes: v.attributes,
      price: v.price ?? "",
      sku: v.sku || "",
      out_of_stock: v.out_of_stock || false,
    })));
    setSaved(false);
  }, [selectedProductId]);

  const update = (i, field, val) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };

  const toggleAllOOS = (val) => {
    setRows(prev => prev.map(r => ({ ...r, out_of_stock: val })));
  };

  const handleSave = async () => {
    if (!selectedProductId) return;
    setSaving(true);
    const product = products.find(p => p.id === selectedProductId);
    // Merge updated combos back into full variants array (preserve non-combo variants)
    const nonCombos = (product.variants || []).filter(v => !v.attributes);
    const updatedCombos = rows.map(r => ({
      combo: r.combo,
      attributes: r.attributes,
      price: r.price !== "" ? parseFloat(r.price) : undefined,
      sku: r.sku,
      out_of_stock: r.out_of_stock,
    }));
    await base44.entities.Product.update(selectedProductId, {
      variants: [...nonCombos, ...updatedCombos],
    });
    setSaving(false);
    setSaved(true);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-bold text-xl">Bulk Edit Variations</h2>
            <p className="text-sm text-muted-foreground">Update price and stock status for multiple variants at once</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Product picker */}
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Select Product</label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Choose a variable product..." />
              </SelectTrigger>
              <SelectContent>
                {variableProducts.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} <span className="text-muted-foreground">({(p.variants || []).filter(v => v.attributes).length} variants)</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {variableProducts.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No variable products found. Add variants to a product first.</p>
            )}
          </div>

          {/* Bulk actions row */}
          {rows.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-xl text-sm">
              <span className="font-semibold text-muted-foreground">{rows.length} variants</span>
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" className="rounded-full h-7 text-xs" onClick={() => toggleAllOOS(true)}>
                  <AlertCircle className="w-3 h-3 mr-1 text-red-500" /> Mark all OOS
                </Button>
                <Button variant="outline" size="sm" className="rounded-full h-7 text-xs" onClick={() => toggleAllOOS(false)}>
                  <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> Mark all In Stock
                </Button>
              </div>
            </div>
          )}

          {/* Variants table */}
          {rows.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 bg-muted px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                <span className="col-span-4">Combination</span>
                <span className="col-span-3">Price (£)</span>
                <span className="col-span-3">SKU</span>
                <span className="col-span-2 text-center">In Stock</span>
              </div>
              {rows.map((row, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-12 items-center px-4 py-2.5 border-t border-border gap-2 transition-colors ${row.out_of_stock ? 'bg-red-50/50' : ''}`}
                >
                  <div className="col-span-4">
                    <p className="text-sm font-medium leading-tight">{row.combo}</p>
                    {row.out_of_stock && (
                      <span className="text-[10px] text-red-500 font-semibold">OUT OF STOCK</span>
                    )}
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={row.price}
                      onChange={e => update(i, "price", e.target.value)}
                      placeholder="Base price"
                      className="rounded-lg h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      value={row.sku}
                      onChange={e => update(i, "sku", e.target.value)}
                      placeholder="SKU"
                      className="rounded-lg h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => update(i, "out_of_stock", !row.out_of_stock)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        row.out_of_stock
                          ? 'bg-red-100 border-red-400 text-red-500'
                          : 'bg-green-100 border-green-400 text-green-600'
                      }`}
                      title={row.out_of_stock ? "Click to mark In Stock" : "Click to mark Out of Stock"}
                    >
                      {row.out_of_stock
                        ? <X className="w-4 h-4" />
                        : <Check className="w-4 h-4" />
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!selectedProductId && (
            <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
              Select a product above to edit its variants
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-full">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!selectedProductId || rows.length === 0 || saving}
            className={`rounded-full ${saved ? 'bg-green-500 hover:bg-green-500 text-white' : 'bg-primary text-white'}`}
          >
            {saving ? "Saving..." : saved ? "✓ Saved!" : `Save ${rows.length > 0 ? rows.length : ''} Variants`}
          </Button>
        </div>
      </div>
    </div>
  );
}