import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProductPreview({ product, onClose }) {
  if (!product) return null;

  // Calculate price range for variable products
  const getPriceDisplay = () => {
    const hasVariants = product.variants?.some(v => v.attributes);
    if (!hasVariants) {
      return product.price ? `£${product.price.toFixed(2)}` : "Price not set";
    }
    const variantPrices = product.variants
      .filter(v => v.attributes && v.price)
      .map(v => parseFloat(v.price));
    if (variantPrices.length === 0) return "Prices not set";
    const min = Math.min(...variantPrices);
    const max = Math.max(...variantPrices);
    return min === max ? `£${min.toFixed(2)}` : `£${min.toFixed(2)} – £${max.toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-white z-10">
          <h2 className="font-bold text-xl">Product Preview</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Image */}
          {product.images?.[0] && (
            <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border">
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            {product.category_name && <p className="text-muted-foreground">{product.category_name}</p>}
            {product.short_description && <p className="text-sm">{product.short_description}</p>}
          </div>

          {/* Price */}
          <div className="text-3xl font-bold text-primary">{getPriceDisplay()}</div>

          {/* Description */}
          {product.description && (
            <div className="bg-muted/50 rounded-xl p-4 prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          )}

          {/* Variants */}
          {product.variants?.some(v => v.attributes) && (
            <div className="space-y-3">
              <h3 className="font-semibold">Available Combinations</h3>
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="grid grid-cols-3 bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground">
                  <span>Combination</span>
                  <span>Price</span>
                  <span>SKU</span>
                </div>
                {product.variants.filter(v => v.attributes).map((v, i) => (
                  <div key={i} className="grid grid-cols-3 items-center px-4 py-3 border-t border-border text-sm">
                    <span>{v.combo}</span>
                    <span className="font-medium">£{(v.price || 0).toFixed(2)}</span>
                    <span className="text-muted-foreground">{v.sku || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {product.sku && (
              <div>
                <p className="text-muted-foreground">SKU</p>
                <p className="font-semibold">{product.sku}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Stock</p>
              <p className="font-semibold">{product.stock_quantity ?? "Unlimited"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-semibold">{product.is_active ? "Active" : "Draft"}</p>
            </div>
            {product.is_featured && (
              <div>
                <p className="text-muted-foreground">Featured</p>
                <p className="font-semibold">⭐ Yes</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end">
          <Button onClick={onClose} className="rounded-full">Close</Button>
        </div>
      </div>
    </div>
  );
}