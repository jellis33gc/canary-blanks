import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RotateCcw, Search, Check, X, Package, Truck, CheckCircle, DollarSign, Clock } from "lucide-react";
import { format } from "date-fns";

const STATUS_META = {
  pending:         { label: "Pending",          color: "bg-yellow-100 text-yellow-800",  icon: Clock },
  approved:        { label: "Approved",         color: "bg-blue-100 text-blue-800",      icon: Truck },
  awaiting_return: { label: "Awaiting Return",  color: "bg-blue-100 text-blue-800",      icon: Truck },
  received:        { label: "Received",         color: "bg-purple-100 text-purple-800",  icon: Package },
  completed:       { label: "Completed",        color: "bg-green-100 text-green-800",    icon: CheckCircle },
  rejected:        { label: "Rejected",         color: "bg-red-100 text-red-800",        icon: X },
  cancelled:       { label: "Cancelled",        color: "bg-gray-100 text-gray-700",       icon: X },
};

function ReturnDetail({ ret, onClose, onUpdate }) {
  const [notes, setNotes] = useState(ret.admin_notes || "");
  const [loading, setLoading] = useState(false);

  const updateStatus = async (status) => {
    setLoading(true);
    try {
      const updates = { status, admin_notes: notes, processed_date: ["completed", "rejected", "cancelled"].includes(status) ? new Date().toISOString().split('T')[0] : ret.processed_date };
      await base44.entities.ReturnRequest.update(ret.id, updates);
      onUpdate();
    } catch (e) {
      alert("Error updating return. Please try again.");
    }
    setLoading(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Return Request — {ret.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Customer:</span><br /><span className="font-medium">{ret.customer_name}</span></div>
            <div><span className="text-muted-foreground">Email:</span><br /><span className="font-medium">{ret.customer_email}</span></div>
            <div><span className="text-muted-foreground">Requested:</span><br /><span className="font-medium">{format(new Date(ret.created_date), "dd MMM yyyy")}</span></div>
            <div><span className="text-muted-foreground">Resolution:</span><br /><span className="font-medium capitalize">{ret.resolution_type}</span></div>
          </div>

          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Reason</p>
            <p className="text-sm">{ret.reason}</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Items</p>
            <div className="space-y-1">
              {ret.items?.map((item, i) => (
                <p key={i} className="text-sm">• {item.product_name} x{item.quantity} — €{(item.price * item.quantity).toFixed(2)}</p>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center bg-primary/5 rounded-xl p-3">
            <span className="text-sm font-medium">Refund Amount</span>
            <span className="font-bold text-primary text-lg">€{(ret.refund_amount || 0).toFixed(2)}</span>
          </div>

          {ret.return_tracking_number && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2 text-sm text-blue-800">
              <Truck className="w-4 h-4" /> Return tracking: <strong>{ret.return_tracking_number}</strong>
            </div>
          )}

          <div className="space-y-2">
            <Label>Admin Notes (visible to customer)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add a message for the customer..." className="resize-none" rows={3} />
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            {ret.status === "pending" && (
              <>
                <Button size="sm" onClick={() => updateStatus("approved")} disabled={loading} className="bg-blue-600 text-white"><Check className="w-4 h-4 mr-1" />Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => updateStatus("rejected")} disabled={loading}><X className="w-4 h-4 mr-1" />Reject</Button>
              </>
            )}
            {["approved", "awaiting_return"].includes(ret.status) && (
              <Button size="sm" onClick={() => updateStatus("received")} disabled={loading} className="bg-purple-600 text-white"><Package className="w-4 h-4 mr-1" />Mark Received</Button>
            )}
            {ret.status === "received" && (
              <Button size="sm" onClick={() => updateStatus("completed")} disabled={loading} className="bg-green-600 text-white"><DollarSign className="w-4 h-4 mr-1" />Complete & Refund</Button>
            )}
            {!["completed", "rejected", "cancelled"].includes(ret.status) && (
              <Button size="sm" variant="outline" onClick={() => updateStatus("cancelled")} disabled={loading}>Cancel</Button>
            )}
          </div>

          {["completed"].includes(ret.status) && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
              <p className="font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4" /> Refund of €{(ret.refund_amount || 0).toFixed(2)} should be processed in your Stripe dashboard for order {ret.order_number}.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const loadReturns = async () => {
    try {
      const data = await base44.entities.ReturnRequest.filter({}, "-created_date", 100);
      setReturns(data);
    } catch (e) {
      console.error("Returns fetch error:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadReturns(); }, []);

  const filtered = returns.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.order_number?.toLowerCase().includes(q) || r.customer_email?.toLowerCase().includes(q) || r.customer_name?.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === "pending").length,
    active: returns.filter(r => ["approved", "awaiting_return", "received"].includes(r.status)).length,
    completed: returns.filter(r => r.status === "completed").length,
  };

  const filters = ["all", "pending", "approved", "awaiting_return", "received", "completed", "rejected", "cancelled"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <RotateCcw className="w-7 h-7 text-primary" />
        <div>
          <h1 className="font-brand text-2xl">Returns & Withdrawals</h1>
          <p className="text-sm text-muted-foreground">Manage customer withdrawal requests (EU 14-day right)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-primary">{stats.total}</p><p className="text-xs text-muted-foreground">Total Requests</p></div>
        <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-yellow-500">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending Review</p></div>
        <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-blue-500">{stats.active}</p><p className="text-xs text-muted-foreground">In Progress</p></div>
        <div className="bg-card border border-border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-green-500">{stats.completed}</p><p className="text-xs text-muted-foreground">Completed</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order number, customer name or email..." className="pl-9 rounded-xl" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setStatusFilter(f)} className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${statusFilter === f ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {f.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No return requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ret => {
            const meta = STATUS_META[ret.status] || STATUS_META.pending;
            return (
              <button key={ret.id} onClick={() => setSelected(ret)} className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-sm">{ret.order_number}</p>
                      <Badge className={`${meta.color} text-xs border-0`}>{meta.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{ret.customer_name} · {ret.customer_email}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(ret.created_date), "dd MMM yyyy, HH:mm")} · {ret.items?.length || 0} item(s)</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary">€{(ret.refund_amount || 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{ret.resolution_type}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && <ReturnDetail ret={selected} onClose={() => setSelected(null)} onUpdate={() => { loadReturns(); setSelected(null); }} />}
    </div>
  );
}