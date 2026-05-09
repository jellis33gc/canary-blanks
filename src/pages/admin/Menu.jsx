import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, ChevronUp, ChevronDown, Trash2 } from "lucide-react";

export default function Menu() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ label: "", type: "category", category_id: "", custom_url: "", is_active: true });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [menuItems, cats] = await Promise.all([
      base44.entities.NavMenu.list("sort_order", 100).catch(() => []),
      base44.entities.Category.filter({ is_active: true }, "sort_order").catch(() => [])
    ]);
    setItems(menuItems);
    setCategories(cats);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.label.trim()) return;
    const data = { label: form.label, type: form.type, is_active: form.is_active };
    if (form.type === "category") data.category_id = form.category_id;
    if (form.type === "custom_url") data.custom_url = form.custom_url;
    
    if (editingId) {
      await base44.entities.NavMenu.update(editingId, data);
      setEditingId(null);
    } else {
      await base44.entities.NavMenu.create(data);
    }
    setForm({ label: "", type: "category", category_id: "", custom_url: "", is_active: true });
    setShowForm(false);
    loadData();
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      label: item.label,
      type: item.type,
      category_id: item.category_id || "",
      custom_url: item.custom_url || "",
      is_active: item.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.NavMenu.delete(id);
    loadData();
  };

  const handleReorder = async (items) => {
    await Promise.all(items.map((item, idx) => base44.entities.NavMenu.update(item.id, { sort_order: idx })));
  };

  const moveUp = async (idx) => {
    if (idx === 0) return;
    const newItems = [...items];
    [newItems[idx], newItems[idx - 1]] = [newItems[idx - 1], newItems[idx]];
    await handleReorder(newItems);
    setItems(newItems);
  };

  const moveDown = async (idx) => {
    if (idx === items.length - 1) return;
    const newItems = [...items];
    [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
    await handleReorder(newItems);
    setItems(newItems);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Navigation Menu</h1>
          <p className="text-muted-foreground mt-1">Manage which categories appear in your navbar</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-primary text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Menu Item
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4">
          <div>
            <Label>Menu Label *</Label>
            <Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. All Products, Cake Toppers" className="mt-1" />
          </div>
          <div>
            <Label>Type *</Label>
            <Select value={form.type} onValueChange={type => setForm({ ...form, type, category_id: "", custom_url: "" })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_products">All Products</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="custom_url">Custom URL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.type === "category" && (
            <div>
              <Label>Select Category *</Label>
              <Select value={form.category_id} onValueChange={cat_id => setForm({ ...form, category_id: cat_id })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {form.type === "custom_url" && (
            <div>
              <Label>URL *</Label>
              <Input value={form.custom_url} onChange={e => setForm({ ...form, custom_url: e.target.value })} placeholder="https://example.com" className="mt-1" />
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            <span className="text-sm font-medium">Active</span>
          </label>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary text-white">{editingId ? "Update" : "Add"} Item</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-2xl">
          <p className="text-muted-foreground">No menu items yet. Add one to get started!</p>
        </div>
      ) : (
        <div className="space-y-2 bg-card border border-border rounded-2xl divide-y">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group">
              <div className="flex flex-col gap-1">
                <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => moveDown(idx)} disabled={idx === items.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {item.type === "all_products" && "All Products"}
                  {item.type === "category" && `Category: ${categories.find(c => c.id === item.category_id)?.name || "Unknown"}`}
                  {item.type === "custom_url" && `URL: ${item.custom_url}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {item.is_active ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Active</span> : <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">Inactive</span>}
                <Button variant="outline" size="sm" onClick={() => handleEdit(item)} className="opacity-0 group-hover:opacity-100 transition-opacity">Edit</Button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}