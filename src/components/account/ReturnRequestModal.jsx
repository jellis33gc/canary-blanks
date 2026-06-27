import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Truck } from "lucide-react";

export default function ReturnRequestModal({ order, user, onClose, onSubmitted }) {
  const [selectedItems, setSelectedItems] = useState(
    (order.items || []).map((_, i) => i)
  );
  const [reason, setReason] = useState("");
  const [resolution, setResolution] = useState("refund");
  const [loading, setLoading] = useState(false);

  const toggleItem = (idx) => {
    setSelectedItems(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const refundAmount = selectedItems.reduce((sum, idx) => {
    const item = order.items[idx];
    return sum + (item ? item.price * item.quantity : 0);
  }, 0);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert("Please provide a reason for your withdrawal request.");
      return;
    }
    if (selectedItems.length === 0) {
      alert("Please select at least one item to return.");
      return;
    }

    setLoading(true);
    try {
      await base44.entities.ReturnRequest.create({
        order_id: order.id,
        order_number: order.order_number,
        customer_id: user?.id,
        customer_email: order.customer_email || user?.email,
        customer_name: order.customer_name || user?.full_name,
        reason: reason.trim(),
        resolution_type: resolution,
        status: "pending",
        items: selectedItems.map(idx => {
          const item = order.items[idx];
          return {
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
          };
        }),
        refund_amount: refundAmount,
      });
      onSubmitted();
    } catch (e) {
      console.error("Return request error:", e);
      alert("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Right of Withdrawal (14 Days)</DialogTitle>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Under EU consumer law, you have the right to withdraw from this purchase within 14 days of delivery.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex gap-2">
          <Truck className="w-4 h-4 shrink-0 mt-0.5" />
          <p><strong>You are responsible for the cost of returning the goods.</strong> Return shipping charges are not refunded.</p>
        </div>

        {/* Items selection */}
        <div className="space-y-2">
          <Label>Select items to return</Label>
          {order.items?.map((item, idx) => (
            <label key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
              <Checkbox checked={selectedItems.includes(idx)} onCheckedChange={() => toggleItem(idx)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">x{item.quantity} — €{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Refund amount */}
        <div className="bg-muted/50 rounded-xl p-3 flex justify-between items-center">
          <span className="text-sm font-medium">Estimated refund (excl. return shipping)</span>
          <span className="font-bold text-primary">€{refundAmount.toFixed(2)}</span>
        </div>

        {/* Resolution type */}
        <div className="space-y-2">
          <Label>Resolution</Label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="resolution" value="refund" checked={resolution === "refund"} onChange={() => setResolution("refund")} className="accent-primary" />
              <span className="text-sm">Refund</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="resolution" value="exchange" checked={resolution === "exchange"} onChange={() => setResolution("exchange")} className="accent-primary" />
              <span className="text-sm">Exchange</span>
            </label>
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label>Reason for withdrawal *</Label>
          <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Please tell us why you're returning these items..." className="resize-none" rows={3} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-primary text-white">
            {loading ? "Submitting..." : "Submit Withdrawal Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}