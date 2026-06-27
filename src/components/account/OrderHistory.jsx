import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ChevronDown, ChevronUp, MapPin, Tag, Star, RotateCcw } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { base44 } from "@/api/base44Client";
import ReturnRequestModal from "@/components/account/ReturnRequestModal";

const STATUS_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"];

const STATUS_META = {
  pending:    { label: "Pending",    color: "bg-yellow-100 text-yellow-800",  dot: "bg-yellow-400" },
  confirmed:  { label: "Confirmed",  color: "bg-blue-100 text-blue-800",      dot: "bg-blue-400" },
  processing: { label: "Processing", color: "bg-purple-100 text-purple-800",  dot: "bg-purple-400" },
  shipped:    { label: "Shipped",    color: "bg-cyan-100 text-cyan-800",      dot: "bg-cyan-400" },
  delivered:  { label: "Delivered",  color: "bg-green-100 text-green-800",    dot: "bg-green-500" },
  cancelled:  { label: "Cancelled",  color: "bg-red-100 text-red-800",        dot: "bg-red-400" },
  refunded:   { label: "Refunded",   color: "bg-gray-100 text-gray-700",      dot: "bg-gray-400" },
};

function StatusTracker({ status }) {
  if (status === "cancelled" || status === "refunded") {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500 font-medium">
        <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
        Order {STATUS_META[status]?.label}
      </div>
    );
  }

  const currentIdx = STATUS_STEPS.indexOf(status);

  return (
    <div className="w-full mt-3">
      <div className="flex items-center justify-between relative">
        {/* connecting line */}
        <div className="absolute top-3 left-0 right-0 h-0.5 bg-border" />
        <div
          className="absolute top-3 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ width: currentIdx >= 0 ? `${(currentIdx / (STATUS_STEPS.length - 1)) * 100}%` : "0%" }}
        />
        {STATUS_STEPS.map((step, i) => {
          const done = i <= currentIdx;
          return (
            <div key={step} className="relative flex flex-col items-center z-10">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all ${done ? "bg-primary border-primary text-white" : "bg-background border-border text-muted-foreground"}`}>
                {done ? "✓" : i + 1}
              </div>
              <p className={`text-[10px] mt-1 hidden sm:block capitalize ${done ? "text-primary font-semibold" : "text-muted-foreground"}`}>{step}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({ order, user }) {
  const [expanded, setExpanded] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [hasReturn, setHasReturn] = useState(false);
  const meta = STATUS_META[order.status] || STATUS_META.pending;

  // Check for existing return request on this order
  useEffect(() => {
    if (order.id) {
      base44.entities.ReturnRequest.filter({ order_id: order.id }).then(reqs => {
        if (reqs.length > 0) setHasReturn(true);
      }).catch(() => {});
    }
  }, [order.id]);

  // Eligible for withdrawal: delivered and within 14 days
  const daysSinceUpdate = differenceInCalendarDays(new Date(), new Date(order.updated_date));
  const canWithdraw = order.status === "delivered" && daysSinceUpdate <= 14 && !hasReturn;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header row */}
      <button
        className="w-full text-left p-5 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-bold text-sm">{order.order_number}</p>
            <Badge className={`${meta.color} text-xs border-0`}>{meta.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{format(new Date(order.created_date), "dd MMM yyyy, HH:mm")}</p>
          {/* Item preview */}
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {order.items?.slice(0, 2).map(i => `${i.product_name} x${i.quantity}`).join(" · ")}
            {order.items?.length > 2 ? ` + ${order.items.length - 2} more` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <p className="font-bold text-primary text-lg">€{order.total?.toFixed(2)}</p>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Status tracker */}
      <div className="px-5 pb-4">
        <StatusTracker status={order.status} />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4 bg-muted/20">
          {/* Items list */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Items</p>
            <div className="space-y-2">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                    {item.image ? <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">🎂</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                    {item.variant && <p className="text-xs text-muted-foreground">{item.variant}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">€{(item.price * item.quantity).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="border-t border-border pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>€{order.subtotal?.toFixed(2) ?? order.total?.toFixed(2)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{order.discount_code}</span>
                <span>−€{order.discount_amount?.toFixed(2)}</span>
              </div>
            )}
            {order.points_discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1"><Star className="w-3 h-3" />Points redeemed</span>
                <span>−€{order.points_discount?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping</span><span>{order.shipping_cost > 0 ? `€${order.shipping_cost?.toFixed(2)}` : "FREE"}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
              <span>Total</span><span className="text-primary">€{order.total?.toFixed(2)}</span>
            </div>
          </div>

          {/* Shipping address */}
          {order.shipping_address && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Delivery Address
              </p>
              <p className="text-sm text-muted-foreground">
                {[order.shipping_address.name, order.shipping_address.line1, order.shipping_address.line2, order.shipping_address.city, order.shipping_address.postcode, order.shipping_address.country].filter(Boolean).join(", ")}
              </p>
            </div>
          )}

          {/* Points earned */}
          {order.points_earned > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-yellow-500 shrink-0" />
              <span className="text-yellow-800">You earned <strong>{order.points_earned} loyalty points</strong> on this order</span>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Order Notes</p>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}

          {/* Withdrawal button */}
          {canWithdraw && (
            <div className="border-t border-border pt-3">
              <Button onClick={() => setShowReturnModal(true)} variant="outline" className="w-full rounded-xl border-primary text-primary hover:bg-primary hover:text-white">
                <RotateCcw className="w-4 h-4 mr-2" /> Request Withdrawal (14-Day Right)
              </Button>
            </div>
          )}
          {hasReturn && (
            <div className="border-t border-border pt-3">
              <Link to="/returns">
                <Button variant="outline" className="w-full rounded-xl">
                  <RotateCcw className="w-4 h-4 mr-2" /> View Return Request Status
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {showReturnModal && (
        <ReturnRequestModal
          order={order}
          user={user}
          onClose={() => setShowReturnModal(false)}
          onSubmitted={() => { setHasReturn(true); setShowReturnModal(false); }}
        />
      )}
    </div>
  );
}

export default function OrderHistory({ orders, user }) {
  const [filter, setFilter] = useState("all");

  const filters = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "delivered", label: "Delivered" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const filtered = orders.filter(o => {
    if (filter === "all") return true;
    if (filter === "active") return !["delivered", "cancelled", "refunded"].includes(o.status);
    return o.status === filter;
  });

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p className="font-semibold text-lg mb-1">No orders yet</p>
        <p className="text-sm mb-4">Your order history will appear here after your first purchase.</p>
        <Link to="/shop" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary">{orders.length}</p>
          <p className="text-xs text-muted-foreground">Total Orders</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary">{orders.filter(o => o.status === "delivered").length}</p>
          <p className="text-xs text-muted-foreground">Delivered</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary">{orders.filter(o => !["delivered","cancelled","refunded"].includes(o.status)).length}</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f.key ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No {filter} orders found.</p>
        ) : (
          filtered.map(order => <OrderCard key={order.id} order={order} user={user} />)
        )}
      </div>
    </div>
  );
}