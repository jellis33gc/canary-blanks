import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, X, Pencil, Check } from "lucide-react";

export default function AdminAttributes() {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", values: [] });
  const [newAttr, setNewAttr] = useState({ name: "", values: [""] });
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.ProductAttribute.list("name", 200);
    setAttributes(data);
    setLoading(false);
  };

  const startEdit = (attr) => {
    setEditingId(attr.id);
    setEditForm({ name: attr.name, values: [...(attr.values || [])] });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", values: [] });
  };

  const saveEdit = async () => {
    setSaving(true);
    await base44.entities.ProductAttribute.update(editingId, {
      name: editForm.name.trim(),
      values: editForm.values.filter(v => v.trim()),
    });
    setEditingId(null);
    await load();
    setSaving(false);
  };

  const deleteAttr = async (id) => {
    await base44.entities.ProductAttribute.delete(id);
    setAttributes(prev => prev.filter(a => a.id !== id));
  };

  const createAttr = async () => {
    if (!newAttr.name.trim()) return;
    setSaving(true);
    await base44.entities.ProductAttribute.create({
      name: newAttr.name.trim(),
      values: newAttr.values.filter(v => v.trim()),
    });
    setNewAttr({ name: "", values: [""] });
    setShowNew(false);
    await load();
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Product Attributes</h1>
          <p className="text-sm text-muted-foreground">Manage reusable attributes for variable products</p>
        </div>
        <Button className="rounded-full bg-primary text-white" onClick={() => setShowNew(true)} disabled={showNew}>
          <Plus className="w-4 h-4 mr-1" /> New Attribute
        </Button>
      </div>

      {/* New attribute form */}
      {showNew && (
        <div className="border border-primary/30 bg-primary/5 rounded-2xl p-4 mb-4 space-y-3">
          <p className="font-semibold text-sm">New Attribute</p>
          <Input
            value={newAttr.name}
            onChange={e => setNewAttr(f => ({ ...f, name: e.target.value }))}
            placeholder="Attribute name (e.g. Colour, Size)"
            className="rounded-xl"
          />
          <div className="space-y-2">
            {newAttr.values.map((val, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={val}
                  onChange={e => {
                    const v = [...newAttr.values];
                    v[i] = e.target.value;
                    setNewAttr(f => ({ ...f, values: v }));
                  }}
                  placeholder="Value (e.g. Red, Blue)"
                  className="rounded-xl h-8 text-sm"
                />
                <button onClick={() => setNewAttr(f => ({ ...f, values: f.values.filter((_, idx) => idx !== i) }))} className="p-1 hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setNewAttr(f => ({ ...f, values: [...f.values, ""] }))}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add value
            </button>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button size="sm" className="rounded-full bg-primary text-white" onClick={createAttr} disabled={saving}>Save</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : attributes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
          No attributes yet. Create your first one above.
        </div>
      ) : (
        <div className="space-y-3">
          {attributes.map(attr => (
            <div key={attr.id} className="border border-border rounded-2xl p-4 bg-white">
              {editingId === attr.id ? (
                <div className="space-y-3">
                  <Input
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Attribute name"
                    className="rounded-xl font-semibold"
                  />
                  <div className="space-y-2 pl-2">
                    {editForm.values.map((val, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input
                          value={val}
                          onChange={e => {
                            const v = [...editForm.values];
                            v[i] = e.target.value;
                            setEditForm(f => ({ ...f, values: v }));
                          }}
                          placeholder="Value"
                          className="rounded-xl h-8 text-sm"
                        />
                        <button onClick={() => setEditForm(f => ({ ...f, values: f.values.filter((_, idx) => idx !== i) }))} className="p-1 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setEditForm(f => ({ ...f, values: [...f.values, ""] }))}
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      <Plus className="w-3 h-3" /> Add value
                    </button>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={cancelEdit}>Cancel</Button>
                    <Button size="sm" className="rounded-full bg-primary text-white" onClick={saveEdit} disabled={saving}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm mb-1.5">{attr.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(attr.values || []).map((v, i) => (
                        <span key={i} className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{v}</span>
                      ))}
                      {(!attr.values || attr.values.length === 0) && (
                        <span className="text-xs text-muted-foreground italic">No values</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(attr)} className="p-1.5 hover:text-primary rounded-lg hover:bg-muted transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteAttr(attr.id)} className="p-1.5 hover:text-red-500 rounded-lg hover:bg-muted transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}