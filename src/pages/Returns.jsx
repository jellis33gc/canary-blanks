import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Package, Truck, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const STATUS_META = {
  pending:          { label: "Request Submitted",  color: "bg-yellow-100 text-yellow-800",  icon: Clock },
  approved:         { label: "Approved — Awaiting Return", color: "bg-blue-100 text-blue-800",  icon: Truck },
  awaiting_return:  { label: "Awaiting Your Return", color: "bg-blue-100 text-blue-800",  icon: Truck },
  received:         { label: "Return Received",    color: "bg-purple-100 text-purple-800",  icon: Package },
  completed:        { label: "Completed",          color: "bg-green-100 text-green-800",    icon: CheckCircle },
  rejected:         { label: "Rejected",           color: "bg-red-100 text-red-800",        icon: XCircle },
  cancelled:       { label: "Cancelled",           color: "bg-gray-100 text-gray-700",      icon: XCircle },
};

export default function Returns() {
  const [user, setUser] = useState(null);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingInputs, setTrackingInputs] = useState({});

  useEffect(() => {
    const init = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        const byId = await base44.entities.ReturnRequest.filter({ customer_id: u.id }, "-created_date", 50);
        const byEmail = await base44.entities.ReturnRequest.filter({ customer_email: u.email }, "-created_date", 50);
        const seen = new Set(byId.map(r => r.id));
        const merged = [...byId, ...byEmail.filter(r => !seen.has(r.id))];
        merged.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        setReturns(merged);
        const inputs = {};
        merged.forEach(r => { inputs[r.id] = r.return_tracking_number || ""; });
        setTrackingInputs(inputs);
      } catch (e) {
        base44.auth.redirectToLogin('/returns');
      }
      setLoading(false);
    };
    init();
  }, []);

  const saveTracking = async (returnId) => {
    await base44.entities.ReturnRequest.update(returnId, {
      return_tracking_number: trackingInputs[returnId] || "",
    });
    setReturns(prev => prev.map(r => r.id === returnId ? { ...r, return_tracking_number: trackingInputs[returnId] } : r));
    alert("Tracking number saved. Thank you!");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Account
        </Link>
        <h1 className="font-brand text-3xl mb-2">Returns & Withdrawals</h1>
        <p className="text-muted-foreground text-sm mb-8">Track and manage your return requests. Under EU law, you have 14 days from delivery to withdraw from a purchase.</p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Return Shipping Costs</p>
            <p>You are responsible for the cost of returning goods. Return shipping charges are not refunded. Please package items securely and use a tracked delivery service.</p>
          </div>
        </div>

        {returns.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="font-semibold text-lg mb-1">No return requests</p>
            <p className="text-sm mb-4">You haven't submitted any withdrawal requests yet.</p>
            <Link to="/account"><Button variant="outline" className="rounded-full">View Orders</Button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {returns.map(ret => {
              const meta = STATUS_META[ret.status] || STATUS_META.pending;
              const Icon = meta.icon;
              const canAddTracking = ["approved", "awaiting_return"].includes(ret.status);
              return (
                <div key={ret.id} className="bg-card border border-border rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm">{ret.order_number}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(ret.created_date), "dd MMM yyyy, HH:mm")}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${meta.color}`}>
                      <Icon className="w-3.5 h-3.5" /> {meta.label}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Reason</p>
                    <p className="text-sm">{ret.reason}</p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Items</p>
                    <div className="space-y-1">
                      {ret.items?.map((item, i) => (
                        <p key={i} className="text-sm text-muted-foreground">• {item.product_name} x{item.quantity} — €{(item.price * item.quantity).toFixed(2)}</p>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-muted/50 rounded-xl p-3">
                    <span className="text-sm font-medium">Refund Amount</span>
                    <span className="font-bold text-primary">€{(ret.refund_amount || 0).toFixed(2)}</span>
                  </div>

                  {ret.admin_notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-800 mb-1">Message from Store</p>
                      <p className="text-sm text-blue-800">{ret.admin_notes}</p>
                    </div>
                  )}

                  {ret.return_tracking_number && !canAddTracking && (
                    <div className="text-sm flex items-center gap-2 text-muted-foreground">
                      <Truck className="w-4 h-4" /> Your tracking: <strong>{ret.return_tracking_number}</strong>
                    </div>
                  )}

                  {canAddTracking && (
                    <div className="border-t border-border pt-3 space-y-2">
                      <Label>Return Tracking Number</Label>
                      <div className="flex gap-2">
                        <Input
                          value={trackingInputs[ret.id] || ""}
                          onChange={e => setTrackingInputs({ ...trackingInputs, [ret.id]: e.target.value })}
                          placeholder="Enter your return tracking number"
                          className="rounded-xl"
                        />
                        <Button onClick={() => saveTracking(ret.id)} className="bg-primary text-white rounded-xl shrink-0">Save</Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Please ship your items back and enter the tracking number above.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}