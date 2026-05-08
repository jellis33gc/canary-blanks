import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, Star } from "lucide-react";
import { format } from "date-fns";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    base44.entities.CustomerProfile.list("-created_date", 500).then(c => { setCustomers(c); setLoading(false); });
  }, []);

  const filtered = customers.filter(c =>
    !search || c.email?.toLowerCase().includes(search.toLowerCase()) || c.full_name?.toLowerCase().includes(search.toLowerCase())
  );

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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={5} className="p-4"><div className="h-10 bg-muted rounded animate-pulse" /></td></tr>)
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-sm">{c.email?.charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="font-semibold">{c.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-medium">{c.total_orders || 0}</td>
                  <td className="p-4 font-bold">£{(c.total_spent || 0).toFixed(2)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      <span className="font-medium">{c.loyalty_points || 0}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{c.created_date ? format(new Date(c.created_date), "dd MMM yyyy") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}