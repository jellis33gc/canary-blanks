import { X } from "lucide-react";

export default function VariantDebugModal({ product, onClose }) {
  const variants = product?.variants || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-lg">Saved Variants — {product.name}</h2>
            <p className="text-sm text-muted-foreground">{variants.length} variant(s) in database</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-3">
          {variants.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No variants saved for this product.</p>
          )}
          {variants.map((v, i) => (
            <div key={i} className="border border-border rounded-xl p-4 font-mono text-xs bg-muted/30">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div><span className="text-muted-foreground">combo:</span> <span className="font-semibold text-foreground">{String(v.combo ?? "null")}</span></div>
                  <div><span className="text-muted-foreground">price:</span> <span className="font-semibold text-foreground">{v.price !== undefined ? `£${v.price}` : "null"}</span></div>
                  <div><span className="text-muted-foreground">sku:</span> <span className="font-semibold text-foreground">{String(v.sku ?? "null")}</span></div>
                  <div>
                    <span className="text-muted-foreground">attributes:</span>{" "}
                    {v.attributes && Object.keys(v.attributes).length > 0
                      ? <span className="font-semibold text-green-700">{JSON.stringify(v.attributes)}</span>
                      : <span className="text-red-500 font-semibold">none / corrupted</span>
                    }
                  </div>
                  {/* Show any unexpected keys that shouldn't be there */}
                  {Object.keys(v).filter(k => !["combo","price","sku","attributes"].includes(k)).map(k => (
                    <div key={k}><span className="text-orange-500">{k}:</span> <span className="text-orange-700">{String(v[k])}</span></div>
                  ))}
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-sans font-semibold ${
                  v.attributes && Object.keys(v.attributes).length > 0
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                }`}>
                  {v.attributes && Object.keys(v.attributes).length > 0 ? "✓ valid" : "✗ corrupt"}
                </span>
              </div>
            </div>
          ))}

          {/* Raw JSON for full inspection */}
          <details className="mt-4">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Show raw JSON</summary>
            <pre className="mt-2 p-3 bg-muted rounded-xl text-xs overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(variants, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}