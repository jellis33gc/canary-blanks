import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Upload, Download, Edit, Trash2, Eye, EyeOff, Star, Package } from "lucide-react";
import ProductFormModal from "@/components/admin/ProductFormModal";
import { format } from "date-fns";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [prods, cats] = await Promise.all([
      base44.entities.Product.list("-created_date", 500),
      base44.entities.Category.filter({ is_active: true }, "sort_order", 200),
    ]);
    setProducts(prods);
    setCategories(cats);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    await base44.entities.Product.delete(id);
    setProducts(p => p.filter(x => x.id !== id));
  };

  const handleToggleActive = async (product) => {
    const updated = await base44.entities.Product.update(product.id, { is_active: !product.is_active });
    setProducts(p => p.map(x => x.id === product.id ? { ...x, is_active: !x.is_active } : x));
  };

  const handleToggleFeatured = async (product) => {
    await base44.entities.Product.update(product.id, { is_featured: !product.is_featured });
    setProducts(p => p.map(x => x.id === product.id ? { ...x, is_featured: !x.is_featured } : x));
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Extract all rows from the spreadsheet as flat objects
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          rows: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sku: { type: "string" },
                name: { type: "string" },
                price: { type: "number" },
                compare_at_price: { type: "number" },
                description: { type: "string" },
                short_description: { type: "string" },
                category_name: { type: "string" },
                stock_quantity: { type: "number" },
                is_active: { type: "boolean" },
                is_featured: { type: "boolean" },
                is_on_sale: { type: "boolean" },
                tags: { type: "string" },
                images: { type: "string" },
                variant_type_1: { type: "string" },
                variant_option_1: { type: "string" },
                variant_modifier_1: { type: "number" },
                variant_type_2: { type: "string" },
                variant_option_2: { type: "string" },
                variant_modifier_2: { type: "number" },
                variant_type_3: { type: "string" },
                variant_option_3: { type: "string" },
                variant_modifier_3: { type: "number" },
                variant_type_4: { type: "string" },
                variant_option_4: { type: "string" },
                variant_modifier_4: { type: "number" },
                variant_type_5: { type: "string" },
                variant_option_5: { type: "string" },
                variant_modifier_5: { type: "number" }
              }
            }
          }
        }
      }
    });

    if (result.status === "success") {
      const rows = Array.isArray(result.output) ? result.output : result.output?.rows || [];
      const response = await base44.functions.invoke("importProducts", { rows, categories });
      if (response.data?.success) {
        await loadData();
        alert(`Import complete! Created: ${response.data.created}, Updated: ${response.data.updated}${response.data.errors?.length ? `, Errors: ${response.data.errors.length}` : ''}`);
      } else {
        alert("Import failed: " + (response.data?.error || "Unknown error"));
      }
    } else {
      alert("Could not read file: " + result.details);
    }
    setImporting(false);
    e.target.value = "";
  };

  const handleDownloadSample = () => {
    const headers = [
      "sku", "name", "price", "compare_at_price", "description", "short_description",
      "category_name", "stock_quantity", "is_active", "is_featured", "is_on_sale",
      "tags", "images",
      "variant_type_1", "variant_option_1", "variant_modifier_1",
      "variant_type_2", "variant_option_2", "variant_modifier_2",
      "variant_type_3", "variant_option_3", "variant_modifier_3"
    ];
    const rows = [
      ["CAKE001", "Vanilla Dream Cake", "45.00", "", "Delicious vanilla sponge with buttercream", "Classic vanilla cake", "Cakes", "10", "true", "true", "false", "bestseller,vanilla", "https://example.com/img.jpg", "Size", "6 inch", "0", "Size", "8 inch", "10", "Size", "10 inch", "20"],
      ["CAKE001", "", "", "", "", "", "", "", "", "", "", "", "", "Flavour", "Vanilla", "0", "Flavour", "Chocolate", "0", "Flavour", "Lemon", "2", "", "", ""],
      ["CAKE002", "Chocolate Fudge Cake", "50.00", "60.00", "Rich chocolate sponge", "Indulgent choc cake", "Cakes", "8", "true", "false", "true", "chocolate,sale", "", "Size", "6 inch", "0", "Size", "8 inch", "12", "", "", "", "", "", ""],
      ["TOPPER001", "Happy Birthday Topper", "4.99", "", "Acrylic happy birthday topper", "Gold glitter topper", "Toppers", "50", "true", "false", "false", "topper,birthday", "", "Colour", "Gold", "0", "Colour", "Silver", "0", "Colour", "Rose Gold", "0.50", "", "", ""],
    ];
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async (data) => {
    if (editProduct) {
      await base44.entities.Product.update(editProduct.id, data);
    } else {
      await base44.entities.Product.create(data);
    }
    setShowModal(false);
    setEditProduct(null);
    await loadData();
  };

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || p.category_id === filterCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-brand text-3xl text-primary">Products</h1>
          <p className="text-muted-foreground">{products.length} total products</p>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={fileRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
          <Button variant="outline" className="rounded-full" onClick={handleDownloadSample}>
            <Download className="w-4 h-4 mr-2" />Sample CSV
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" />{importing ? "Importing..." : "Import CSV/Excel"}
          </Button>
          <Button className="bg-primary text-white rounded-full" onClick={() => { setEditProduct(null); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="pl-9 rounded-full" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44 rounded-full"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-semibold">Product</th>
                <th className="text-left p-4 font-semibold">Category</th>
                <th className="text-left p-4 font-semibold">Price</th>
                <th className="text-left p-4 font-semibold">Stock</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="p-4"><div className="h-10 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                        {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center text-lg">🎂</div>}
                      </div>
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{p.category_name || "—"}</td>
                  <td className="p-4 font-bold">£{p.price?.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`font-medium ${p.stock_quantity === 0 ? 'text-red-500' : p.stock_quantity < 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {p.stock_quantity ?? "∞"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Badge variant={p.is_active ? "default" : "secondary"} className={p.is_active ? "bg-green-100 text-green-700" : ""}>{p.is_active ? "Active" : "Draft"}</Badge>
                      {p.is_featured && <Badge className="bg-yellow-100 text-yellow-700">⭐</Badge>}
                      {p.is_on_sale && <Badge className="bg-red-100 text-red-700">Sale</Badge>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditProduct(p); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleToggleFeatured(p)} className={`p-1.5 rounded-lg transition-colors ${p.is_featured ? 'text-yellow-500' : 'hover:text-yellow-500'}`}><Star className="w-4 h-4" /></button>
                      <button onClick={() => handleToggleActive(p)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">{p.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No products found</p>
          </div>
        )}
      </div>

      {showModal && (
        <ProductFormModal
          product={editProduct}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditProduct(null); }}
        />
      )}
    </div>
  );
}