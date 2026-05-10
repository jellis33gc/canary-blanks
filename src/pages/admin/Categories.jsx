import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, X, Save, Upload, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", is_active: true, sort_order: 0, image: "", parent_id: "" });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = () => {
    base44.entities.Category.list("sort_order").then(c => { setCategories(c); setLoading(false); });
  };

  const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const handleSave = async () => {
    const slug = form.slug || autoSlug(form.name);
    const data = { ...form, slug, parent_id: form.parent_id || null };
    if (editingId) {
      await base44.entities.Category.update(editingId, data);
    } else {
      await base44.entities.Category.create(data);
    }
    await loadCategories();
    setEditingId(null);
    setAddingNew(false);
    setForm({ name: "", slug: "", description: "", is_active: true, sort_order: 0, image: "", parent_id: "" });
  };

  const handleEdit = (cat) => {
    setForm({ name: cat.name, slug: cat.slug || "", description: cat.description || "", is_active: cat.is_active ?? true, sort_order: cat.sort_order || 0, image: cat.image || "", parent_id: cat.parent_id || "" });
    setEditingId(cat.id);
    setAddingNew(true);
  };

  const handleDelete = async (id) => {
    const hasChildren = categories.some(c => c.parent_id === id);
    if (hasChildren && !confirm("This category has subcategories. Delete anyway?")) return;
    if (!hasChildren && !confirm("Delete this category?")) return;
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

  const topLevel = categories.filter(c => !c.parent_id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const getChildren = (parentId) => categories.filter(c => c.parent_id === parentId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const handleReorder = async (siblings, index, direction) => {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;
    const a = siblings[index];
    const b = siblings[swapIndex];
    const aOrder = a.sort_order ?? index;
    const bOrder = b.sort_order ?? swapIndex;
    await Promise.all([
      base44.entities.Category.update(a.id, { sort_order: bOrder }),
      base44.entities.Category.update(b.id, { sort_order: aOrder }),
    ]);
    setCategories(prev => prev.map(c => {
      if (c.id === a.id) return { ...c, sort_order: bOrder };
      if (c.id === b.id) return { ...c, sort_order: aOrder };
      return c;
    }));
  };

  const renderCategory = (cat, depth = 0, siblings = [], index = 0) => {
    const children = getChildren(cat.id);
    return (
      <div key={cat.id}>
        <div className={`bg-white rounded-2xl border border-border p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow ${depth === 1 ? 'ml-6 border-l-4 border-l-primary/20' : depth === 2 ? 'ml-12 border-l-4 border-l-primary/40' : ''}`}>
          {depth > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0">
            {cat.image ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl">{depth === 0 ? '📁' : '📂'}</div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{cat.name}</p>
            <p className="text-xs text-muted-foreground">{cat.slug}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-medium ${cat.is_active ? 'text-green-600' : 'text-muted-foreground'}`}>{cat.is_active ? "Active" : "Hidden"}</span>
              {children.length > 0 && <span className="text-xs text-muted-foreground">· {children.length} subcategories</span>}
            </div>
          </div>
          <div className="flex gap-1">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => handleReorder(siblings, index, -1)} disabled={index === 0} className="p-1 rounded hover:bg-muted disabled:opacity-20 transition-colors" title="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleReorder(siblings, index, 1)} disabled={index === siblings.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-20 transition-colors" title="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
            </div>
            <button onClick={() => { setForm({ name: "", slug: "", description: "", is_active: true, sort_order: 0, image: "", parent_id: cat.id }); setEditingId(null); setAddingNew(true); }} className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors" title="Add subcategory">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => handleEdit(cat)} className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
            <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
        {children.length > 0 && (
          <div className="mt-2 space-y-2">
            {children.map((child, i) => renderCategory(child, depth + 1, children, i))}
          </div>
        )}
      </div>
    );
  };

  const parentOptions = (() => {
    const items = [];
    const topLevel = categories.filter(c => !c.parent_id && c.id !== editingId);
    topLevel.forEach(parent => {
      items.push({ id: parent.id, label: parent.name });
      categories.filter(c => c.parent_id === parent.id && c.id !== editingId).forEach(child => {
        items.push({ id: child.id, label: `↳ ${child.name}` });
      });
    });
    return items;
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-brand text-3xl text-primary">Categories</h1>
          <p className="text-muted-foreground">{categories.length} categories ({topLevel.length} top-level)</p>
        </div>
        <Button className="bg-primary text-white rounded-full" onClick={() => { setForm({ name: "", slug: "", description: "", is_active: true, sort_order: 0, image: "", parent_id: "" }); setEditingId(null); setAddingNew(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>

      {addingNew && (
        <div className="bg-white rounded-2xl border border-primary/30 p-6 shadow-sm space-y-4">
          <h2 className="font-bold">{editingId ? "Edit Category" : form.parent_id ? `New Subcategory under "${categories.find(c => c.id === form.parent_id)?.name}"` : "New Top-Level Category"}</h2>
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
              <Label>Parent Category (optional)</Label>
              <Select value={form.parent_id || "none"} onValueChange={v => setForm(f => ({ ...f, parent_id: v === "none" ? "" : v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {parentOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl" />
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

      <div className="space-y-3">
        {loading ? Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />) :
          topLevel.map((cat, i) => renderCategory(cat, 0, topLevel, i))}
      </div>
    </div>
  );
}