import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import useCartStore from "@/lib/cartStore.jsx";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, ShoppingBag, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Cart() {
  const { items, removeItem, updateQuantity, getSubtotal, clearCart } = useCartStore();
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountError, setDiscountError] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const navigate = useNavigate();

  const subtotal = getSubtotal();
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === 'percentage'
      ? (subtotal * appliedDiscount.value) / 100
      : Math.min(appliedDiscount.value, subtotal)
    : 0;
  const shipping = subtotal - discountAmount >= 50 ? 0 : 3.99;
  const total = subtotal - discountAmount + shipping;

  const handleApplyDiscount = async () => {
    setApplyingCode(true);
    setDiscountError("");
    const codes = await base44.entities.DiscountCode.filter({ code: discountCode.toUpperCase(), is_active: true });
    if (codes.length === 0) {
      setDiscountError("Invalid or expired discount code");
    } else {
      const code = codes[0];
      if (code.min_order_value && subtotal < code.min_order_value) {
        setDiscountError(`Minimum order value £${code.min_order_value} required`);
      } else if (code.usage_limit && code.used_count >= code.usage_limit) {
        setDiscountError("This code has reached its usage limit");
      } else {
        setAppliedDiscount(code);
      }
    }
    setApplyingCode(false);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="text-8xl mb-6">🛒</div>
          <h2 className="font-brand text-3xl mb-3">Your cart is empty!</h2>
          <p className="text-muted-foreground mb-8">Looks like you haven't added anything yet. Let's fix that!</p>
          <Button asChild size="lg" className="bg-primary text-white rounded-full px-10 font-bold">
            <Link to="/shop">Start Shopping</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-brand text-3xl mb-8">Your Cart 🛒</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {items.map((item, i) => (
                <motion.div key={`${item.product_id}-${item.variant}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="bg-card border border-border rounded-2xl p-4 flex gap-4 items-center">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                    {item.image ? <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🎂</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{item.product_name}</h3>
                    {item.variant && <p className="text-sm text-muted-foreground">{item.variant}</p>}
                    {item.custom_options && Object.entries(item.custom_options).map(([k, v]) => (
                      <p key={k} className="text-xs text-muted-foreground">{k}: {v}</p>
                    ))}
                    <p className="font-bold text-primary mt-1">£{item.price?.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-full">
                      <button onClick={() => updateQuantity(item.product_id, item.variant, item.quantity - 1)} className="p-1.5 hover:text-primary"><Minus className="w-3 h-3" /></button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product_id, item.variant, item.quantity + 1)} className="p-1.5 hover:text-primary"><Plus className="w-3 h-3" /></button>
                    </div>
                    <button onClick={() => removeItem(item.product_id, item.variant)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">£{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="bg-card border border-border rounded-2xl p-6 h-fit sticky top-24 space-y-4">
            <h2 className="font-bold text-xl">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>£{subtotal.toFixed(2)}</span></div>
              {appliedDiscount && <div className="flex justify-between text-green-600 font-medium"><span>Discount ({appliedDiscount.code})</span><span>-£{discountAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? <span className="text-green-600 font-medium">FREE</span> : `£${shipping.toFixed(2)}`}</span></div>
              {shipping > 0 && <p className="text-xs text-muted-foreground">Add £{(50 - (subtotal - discountAmount)).toFixed(2)} more for free shipping</p>}
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span><span className="text-primary">£{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Discount code */}
            {!appliedDiscount ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input value={discountCode} onChange={e => setDiscountCode(e.target.value)} placeholder="Discount code" className="rounded-full" />
                  <Button variant="outline" onClick={handleApplyDiscount} disabled={applyingCode} className="rounded-full whitespace-nowrap">
                    <Tag className="w-4 h-4" />
                  </Button>
                </div>
                {discountError && <p className="text-xs text-destructive">{discountError}</p>}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-green-50 rounded-xl p-3 border border-green-200">
                <span className="text-sm font-medium text-green-700">✓ {appliedDiscount.code} applied!</span>
                <button onClick={() => setAppliedDiscount(null)} className="text-xs text-green-600 underline">Remove</button>
              </div>
            )}

            <Button asChild size="lg" className="w-full bg-primary text-white rounded-full font-bold" onClick={() => navigate('/checkout', { state: { discountCode: appliedDiscount, discountAmount, shipping, total, subtotal } })}>
              <Link to="/checkout" state={{ discountCode: appliedDiscount, discountAmount, shipping, total, subtotal }}>
                Checkout <ShoppingBag className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="w-full rounded-full">
              <Link to="/shop">← Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}