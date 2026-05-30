import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";

const empty = { name: "", slug: "", logo: "", website: "", description: "", sort_order: 0, is_active: true };

export default function AdminBrands() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.Brand.list("sort_order"),
  });

  const save = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.Brand.update(editing, data)
      : base44.entities.Brand.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["brands"] }); setOpen(false); },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.Brand.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brands"] }),
  });

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (b) => { setEditing(b.id); setForm({ name: b.name, slug: b.slug || "", logo: b.logo || "", website: b.website || "", description: b.description || "", sort_order: b.sort_order ?? 0, is_active: b.is_active ?? true }); setOpen(true); };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, logo: file_url }));
    setUploading(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Brands</h1>
          <p className="text-muted-foreground text-sm">Manage the brands showcased in your store.</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Add Brand</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Logo</th>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Website</th>
                <th className="text-left px-4 py-3 font-semibold">Order</th>
                <th className="text-left px-4 py-3 font-semibold">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {brands.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No brands yet. Add one!</td></tr>
              )}
              {brands.map(b => (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    {b.logo ? <img src={b.logo} alt={b.name} className="h-10 w-auto object-contain" /> : <div className="h-10 w-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">No logo</div>}
                  </td>
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.website || "—"}</td>
                  <td className="px-4 py-3">{b.sort_order ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${b.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{b.is_active ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove.mutate(b.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Brand" : "Add Brand"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Renshaw" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="renshaw" />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={e => set("description", e.target.value)} />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={form.sort_order} onChange={e => set("sort_order", Number(e.target.value))} />
            </div>
            <div>
              <Label>Logo</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.logo && <img src={form.logo} alt="logo" className="h-12 w-auto object-contain border rounded p-1" />}
                <label className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
                    <span><Upload className="w-4 h-4" />{uploading ? "Uploading…" : "Upload Logo"}</span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => set("is_active", v)} />
              <Label>Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => save.mutate(form)} disabled={!form.name || save.isPending}>
                {save.isPending ? "Saving…" : "Save Brand"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}