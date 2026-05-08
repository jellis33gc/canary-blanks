import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, X, Save, Tag } from "lucide-react";

const emptyForm = { code: "", type: "percentage", value: 0, min_order_value: 0, usage_limit: "", is_active: true, expires_at: "", one_per_customer: false };

export default function AdminDiscounts() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    base44.entities.DiscountCode.list("-created_date").then(d => { setDiscounts(d); setLoading(false); });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const data = { ...form, value: parseFloat(form.value), min_order_value: parseFloat(form.min_order_value) || 0, usage_limit: form.usage_limit ? parseInt(form.usage_limit) : undefined };
    if (editingId) {
      await base44.entities.DiscountCode.update(editingId, data);
      setDiscounts(d => d.map(x => x.id === editingId ? { ...x, ...data } : x));
    } else {
      const created = await base44.entities.DiscountCode.create({ ...data, used_count: 0 });
      setDiscounts(d => [created, ...d]);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (disc) => {
    setForm({ code: disc.code, type: disc.type, value: disc.value, min_order_value: disc.min_order_value || 0, usage_limit: disc.usage_limit || "", is_active: disc.is_active ?? true, expires_at: disc.expires_at || "", one_per_customer: disc.one_per_customer ?? false });
    setEditingId(disc.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this discount code?")) return;
    await base44.entities.DiscountCode.delete(id);
    setDiscounts(d => d.filter(x => x.id !== id));
  };

  const handleToggle = async (disc) => {
    await base44.entities.DiscountCode.update(disc.id, { is_active: !disc.is_active });
    setDiscounts(d => d.map(x => x.id === disc.id ? { ...x, is_active: !x.is_active } : x));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-brand text-3xl text-primary">Discount Codes</h1>
          <p className="text-muted-foreground">{discounts.length} codes</p>
        </div>
        <Button className="bg-primary text-white rounded-full" onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Code
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-primary/30 p-6 shadow-sm space-y-4">
          <h2 className="font-bold">{editingId ? "Edit Discount Code" : "New Discount Code"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Code *</Label>
              <Input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())} className="rounded-xl font-mono" placeholder="e.g. SUMMER20" />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Value ({form.type === "percentage" ? "%" : "£"})</Label>
              <Input type="number" value={form.value} onChange={e => set("value", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label>Min Order Value (£)</Label>
              <Input type="number" value={form.min_order_value} onChange={e => set("min_order_value", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label>Usage Limit (leave blank for unlimited)</Label>
              <Input type="number" value={form.usage_limit} onChange={e => set("usage_limit", e.target.value)} className="rounded-xl" placeholder="Unlimited" />
            </div>
            <div className="space-y-1">
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expires_at} onChange={e => set("expires_at", e.target.value)} className="rounded-xl" />
            </div>
            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2"><Checkbox checked={form.is_active} onCheckedChange={v => set("is_active", v)} /><span className="text-sm">Active</span></label>
              <label className="flex items-center gap-2"><Checkbox checked={form.one_per_customer} onCheckedChange={v => set("one_per_customer", v)} /><span className="text-sm">One per customer</span></label>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} className="bg-primary text-white rounded-full"><Save className="w-4 h-4 mr-2" />{editingId ? "Update" : "Create"}</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }} className="rounded-full"><X className="w-4 h-4 mr-2" />Cancel</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 font-semibold">Code</th>
              <th className="text-left p-4 font-semibold">Discount</th>
              <th className="text-left p-4 font-semibold">Min Order</th>
              <th className="text-left p-4 font-semibold">Usage</th>
              <th className="text-left p-4 font-semibold">Expires</th>
              <th className="text-left p-4 font-semibold">Status</th>
              <th className="text-left p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? Array(3).fill(0).map((_, i) => <tr key={i}><td colSpan={7} className="p-4"><div className="h-8 bg-muted rounded animate-pulse" /></td></tr>) :
              discounts.map(d => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <td className="p-4 font-mono font-bold flex items-center gap-2"><Tag className="w-4 h-4 text-primary" />{d.code}</td>
                  <td className="p-4">{d.type === "percentage" ? `${d.value}% off` : `£${d.value} off`}</td>
                  <td className="p-4">{d.min_order_value ? `£${d.min_order_value}` : "—"}</td>
                  <td className="p-4">{d.used_count || 0}{d.usage_limit ? ` / ${d.usage_limit}` : ""}</td>
                  <td className="p-4 text-muted-foreground">{d.expires_at || "—"}</td>
                  <td className="p-4">
                    <Badge className={d.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}>{d.is_active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(d)} className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}