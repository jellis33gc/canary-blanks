import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Star, ChevronDown, ChevronUp, Plus, Minus } from "lucide-react";
import { format } from "date-fns";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [pointsInput, setPointsInput] = useState({});
  const [pointsNote, setPointsNote] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    base44.entities.CustomerProfile.list("-created_date", 500).then(c => {
      setCustomers(c);
      setLoading(false);
    });
  }, []);

  const filtered = customers.filter(c =>
    !search || c.email?.toLowerCase().includes(search.toLowerCase()) || c.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdjustPoints = async (customer, type) => {
    const amount = parseInt(pointsInput[customer.id] || 0);
    if (!amount || amount <= 0) return alert('Please enter a valid points amount.');
    const note = pointsNote[customer.id] || (type === 'add' ? 'Admin adjustment — added' : 'Admin adjustment — removed');
    setSaving(customer.id);
    try {
      const newPoints = type === 'add'
        ? (customer.loyalty_points || 0) + amount
        : Math.max(0, (customer.loyalty_points || 0) - amount);

      await base44.entities.CustomerProfile.update(customer.id, { loyalty_points: newPoints });
      await base44.entities.LoyaltyTransaction.create({
        customer_id: customer.user_id,
        customer_email: customer.email,
        type: type === 'add' ? 'earn' : 'redeem',
        points: type === 'add' ? amount : -amount,
        description: note,
      });

      setCustomers(cs => cs.map(c => c.id === customer.id ? { ...c, loyalty_points: newPoints } : c));
      setPointsInput(p => ({ ...p, [customer.id]: '' }));
      setPointsNote(p => ({ ...p, [customer.id]: '' }));
    } catch(e) {
      console.error('Points error:', e);
      alert('Failed to update points. Please try again.');
    }
    setSaving(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-brand text-3xl text-primary">Customers</h1>
        <p className="text-muted-foreground">{customers.length} registered customers</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="pl-9 rounded-full" />
      </div>
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-semibold">Customer</th>
                <th className="text-left p-4 font-semibold">Orders</th>
                <th className="text-left p-4 font-semibold">Total Spent</th>
                <th className="text-left p-4 font-semibold">Loyalty Points</th>
                <th className="text-left p-4 font-semibold">Joined</th>
                <th className="text-left p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="p-4"><div className="h-10 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No customers found</td></tr>
              ) : filtered.map(c => (
                <>
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-sm">
                          {c.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold">{c.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium">{c.total_orders || 0}</td>
                    <td className="p-4 font-bold">€{(c.total_spent || 0).toFixed(2)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="font-medium">{c.loyalty_points || 0}</span>
                        <span className="text-xs text-muted-foreground ml-1">(€{((c.loyalty_points || 0) / 100).toFixed(2)})</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {c.created_date ? format(new Date(c.created_date), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                      >
                        Manage Points
                        {expandedId === c.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </td>
                  </tr>
                  {expandedId === c.id && (
                    <tr key={`${c.id}-points`} className="bg-primary/5">
                      <td colSpan={6} className="p-4">
                        <div className="max-w-md space-y-3">
                          <p className="font-semibold text-sm">Adjust Loyalty Points for {c.full_name || c.email}</p>
                          <p className="text-xs text-muted-foreground">Current balance: <strong>{c.loyalty_points || 0} points</strong> (worth €{((c.loyalty_points || 0) / 100).toFixed(2)})</p>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min="1"
                              placeholder="Points amount"
                              value={pointsInput[c.id] || ''}
                              onChange={e => setPointsInput(p => ({ ...p, [c.id]: e.target.value }))}
                              className="rounded-xl w-36"
                            />
                            <Input
                              placeholder="Reason (optional)"
                              value={pointsNote[c.id] || ''}
                              onChange={e => setPointsNote(p => ({ ...p, [c.id]: e.target.value }))}
                              className="rounded-xl flex-1"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAdjustPoints(c, 'add')}
                              disabled={saving === c.id}
                              className="rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center gap-1"
                            >
                              <Plus className="w-4 h-4" /> Add Points
                            </Button>
                            <Button
                              onClick={() => handleAdjustPoints(c, 'remove')}
                              disabled={saving === c.id || !c.loyalty_points}
                              variant="outline"
                              className="rounded-full border-red-200 text-red-500 hover:bg-red-50 flex items-center gap-1"
                            >
                              <Minus className="w-4 h-4" /> Remove Points
                            </Button>
                            {saving === c.id && <span className="text-xs text-muted-foreground self-center">Saving...</span>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}