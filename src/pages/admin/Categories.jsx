import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, X, Save, Upload } from "lucide-react";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", is_active: true, sort_order: 0, image: "" });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    base44.entities.Category.list("sort_order").then(c => { setCategories(c); setLoading(false); });
  }, []);

  const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const handleSave = async () => {
    const slug = form.slug || autoSlug(form.name);
    if (editingId) {
      await base44.entities.Category.update(editingId, { ...form, slug });
      setCategories(c => c.map(x => x.id === editingId ? { ...x, ...form, slug } : x));
    } else {
      const created = await base44.entities.Category.create({ ...form, slug });
      setCategories(c => [...c, created]);
    }
    setEditingId(null);
    setAddingNew(false);
    setForm({ name: "", slug: "", description: "", is_active: true, sort_order: 0, image: "" });
  };

  const handleEdit = (cat) => {
    setForm({ name: cat.name, slug: cat.slug || "", description: cat.description || "", is_active: cat.is_active ?? true, sort_order: cat.sort_order || 0, image: cat.image || "" });
    setEditingId(cat.id);
    setAddingNew(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this category?")) return;
    await base44.entities.Category.delete(id);
    setCategories(c => c.filter(x => x.id !== id));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, image: file_url }));
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-brand text-3xl text-primary">Categories</h1>
          <p className="text-muted-foreground">{categories.length} categories</p>
        </div>
        <Button className="bg-primary text-white rounded-full" onClick={() => { setForm({ name: "", slug: "", description: "", is_active: true, sort_order: 0, image: "" }); setEditingId(null); setAddingNew(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>

      {addingNew && (
        <div className="bg-white rounded-2xl border border-primary/30 p-6 shadow-sm space-y-4">
          <h2 className="font-bold">{editingId ? "Edit Category" : "New Category"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: !editingId ? autoSlug(e.target.value) : f.slug }))} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label>Image</Label>
              <label className="flex items-center gap-2 border border-border rounded-xl p-2.5 cursor-pointer hover:border-primary transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : form.image ? "Change image" : "Upload image"}</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
              </label>
              {form.image && <img src={form.image} alt="" className="w-16 h-16 rounded-lg object-cover mt-1" />}
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} className="bg-primary text-white rounded-full"><Save className="w-4 h-4 mr-2" />{editingId ? "Update" : "Create"}</Button>
            <Button variant="outline" onClick={() => { setAddingNew(false); setEditingId(null); }} className="rounded-full"><X className="w-4 h-4 mr-2" />Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />) :
          categories.map(cat => (
            <div key={cat.id} className="bg-white rounded-2xl border border-border p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                {cat.image ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl">📁</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{cat.name}</p>
                <p className="text-xs text-muted-foreground">{cat.slug}</p>
                <span className={`text-xs font-medium ${cat.is_active ? 'text-green-600' : 'text-muted-foreground'}`}>{cat.is_active ? "Active" : "Hidden"}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(cat)} className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}