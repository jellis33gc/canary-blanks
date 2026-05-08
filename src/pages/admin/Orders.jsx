import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

const STATUS_OPTIONS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];
const STATUS_COLORS = { pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-blue-100 text-blue-800", processing: "bg-purple-100 text-purple-800", shipped: "bg-cyan-100 text-cyan-800", delivered: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800", refunded: "bg-gray-100 text-gray-700" };

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    base44.entities.Order.list("-created_date", 500).then(o => { setOrders(o); setLoading(false); });
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    await base44.entities.Order.update(orderId, { status: newStatus });
    setOrders(o => o.map(x => x.id === orderId ? { ...x, status: newStatus } : x));
  };

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.order_number?.includes(search) || o.customer_name?.toLowerCase().includes(search.toLowerCase()) || o.customer_email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalRevenue = filtered.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-brand text-3xl text-primary">Orders</h1>
        <p className="text-muted-foreground">{filtered.length} orders · £{totalRevenue.toFixed(2)} revenue</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." className="pl-9 rounded-full" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-semibold">Order</th>
                <th className="text-left p-4 font-semibold">Customer</th>
                <th className="text-left p-4 font-semibold">Date</th>
                <th className="text-left p-4 font-semibold">Total</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Payment</th>
                <th className="text-left p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={7} className="p-4"><div className="h-10 bg-muted rounded animate-pulse" /></td></tr>)
              ) : filtered.map(order => (
                <>
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                    <td className="p-4 font-bold">{order.order_number}</td>
                    <td className="p-4">
                      <p>{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                    </td>
                    <td className="p-4 text-muted-foreground">{order.created_date ? format(new Date(order.created_date), "dd MMM yyyy") : "—"}</td>
                    <td className="p-4 font-bold">£{order.total?.toFixed(2)}</td>
                    <td className="p-4">
                      <Select value={order.status} onValueChange={val => { handleStatusChange(order.id, val); }}>
                        <SelectTrigger className="h-8 w-32 rounded-full text-xs border-0 p-0" onClick={e => e.stopPropagation()}>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                        </SelectTrigger>
                        <SelectContent onClick={e => e.stopPropagation()}>
                          {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <Badge className={order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{order.payment_status}</Badge>
                    </td>
                    <td className="p-4">
                      {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </td>
                  </tr>
                  {expandedOrder === order.id && (
                    <tr key={`${order.id}-detail`} className="bg-muted/20">
                      <td colSpan={7} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="font-semibold mb-2">Items</p>
                            {order.items?.map((item, i) => (
                              <p key={i} className="text-sm">• {item.product_name} × {item.quantity} — £{(item.price * item.quantity).toFixed(2)}</p>
                            ))}
                          </div>
                          <div>
                            <p className="font-semibold mb-2">Shipping Address</p>
                            {order.shipping_address && <div className="text-sm text-muted-foreground">
                              <p>{order.shipping_address.name}</p>
                              <p>{order.shipping_address.line1}</p>
                              {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
                              <p>{order.shipping_address.city} {order.shipping_address.postcode}</p>
                            </div>}
                            {order.notes && <p className="text-sm mt-2 italic text-muted-foreground">Note: {order.notes}</p>}
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