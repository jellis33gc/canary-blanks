import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import useCartStore from "@/lib/cartStore.jsx";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { CreditCard, Lock, Gift, MapPin, Store } from "lucide-react";

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items, getSubtotal, clearCart, setCartEmail } = useCartStore();
  const summaryState = location.state || {};

  const GRAN_CANARIA_RATE = 4.95;
  const OTHER_CANARIES_RATE = 9.95;

  const getShippingZone = (postcode) => {
    if (!postcode) return null;
    const pc = postcode.trim().replace(/\s/g, '');
    const pcNum = parseInt(pc, 10);
    if (isNaN(pcNum)) return null;
    if (pcNum >= 35000 && pcNum <= 35499) return 'gran_canaria';
    if ((pcNum >= 35500 && pcNum <= 35699) || (pcNum >= 38000 && pcNum <= 38999)) return 'other_canaries';
    return 'outside';
  };

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState('delivery');

  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    line1: "", line2: "", city: "", postcode: "", country: "Spain",
    notes: ""
  });

  // Feed the checkout email into abandoned-cart tracking once it looks valid, debounced
  // so we're not firing on every keystroke.
  useEffect(() => {
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return;
    const t = setTimeout(() => setCartEmail(form.email), 800);
    return () => clearTimeout(t);
  }, [form.email, setCartEmail]);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setForm(f => ({ ...f, name: u.full_name || "", email: u.email || "" }));
      base44.entities.CustomerProfile.filter({ user_id: u.id }).then(p => {
        if (p[0]) {
          setProfile(p[0]);
          // Auto-populate from default address if exists
          if (p[0].default_address) {
            setForm(f => ({
              ...f,
              name: p[0].default_address.name || f.name,
              line1: p[0].default_address.line1 || "",
              line2: p[0].default_address.line2 || "",
              city: p[0].default_address.city || "",
              postcode: p[0].default_address.postcode || "",
              country: p[0].default_address.country || "Spain",
              phone: p[0].default_address.phone || ""
            }));
          }
        }
      });
    }).catch(() => {});
  }, [items]);

  const subtotal = summaryState.subtotal || getSubtotal();
  const discountAmount = summaryState.discountAmount || 0;
  const amountAfterDiscount = subtotal - discountAmount;
  const isFreeShippingCode = summaryState.discountCode?.type === 'free_shipping';
  const isLocalCollection = deliveryMethod === 'local_collection';
  const shippingZone = !isLocalCollection ? getShippingZone(form.postcode) : null;
  const zoneRate = shippingZone === 'gran_canaria' ? GRAN_CANARIA_RATE : shippingZone === 'other_canaries' ? OTHER_CANARIES_RATE : 0;
  const hasValidZone = shippingZone === 'gran_canaria' || shippingZone === 'other_canaries';
  const isFreeShipping = isFreeShippingCode || amountAfterDiscount >= 50;
  const shipping = isLocalCollection ? 0 : (isFreeShipping || amountAfterDiscount <= 0 ? 0 : (hasValidZone ? zoneRate : 0));
  const maxPointsDiscount = profile ? Math.min(Math.floor(profile.loyalty_points / 100), amountAfterDiscount * 0.2) : 0;
  const pointsDiscount = usePoints ? pointsToUse : 0;
  const total = amountAfterDiscount - pointsDiscount + shipping;
  const pointsEarnable = Math.floor(total);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate Canary Islands postcode for delivery orders
    if (deliveryMethod === 'delivery') {
      const zone = getShippingZone(form.postcode);
      if (zone === 'outside' || !zone) {
        alert('We only deliver within the Canary Islands. Please enter a valid Canary Islands postcode (35xxx or 38xxx) or select Local Collection.');
        return;
      }
    }

    setLoading(true);
    try {
      const orderNum = `LTC-${Date.now()}`;
      const order = await base44.entities.Order.create({
        order_number: orderNum,
        customer_email: form.email,
        customer_name: form.name,
        customer_id: user?.id,
        status: "pending",
        payment_status: "pending",
        items,
        subtotal,
        discount_amount: discountAmount,
        discount_code: summaryState.discountCode?.code || "",
        points_redeemed: usePoints ? pointsToUse * 100 : 0,
        points_discount: pointsDiscount,
        shipping_cost: shipping,
        shipping_method: isLocalCollection ? 'Local Collection' : (shippingZone === 'gran_canaria' ? 'Delivery (Gran Canaria)' : 'Delivery (Canary Islands)'),
        total,
        shipping_address: isLocalCollection
          ? { name: form.name }
          : { name: form.name, line1: form.line1, line2: form.line2, city: form.city, postcode: form.postcode, country: form.country },
        notes: form.notes,
        points_earned: pointsEarnable,
      });



      if (user && profile) {
        const newPoints = Math.max(0, (profile.loyalty_points || 0) - (usePoints ? pointsToUse * 100 : 0)) + pointsEarnable;
        await base44.entities.CustomerProfile.update(profile.id, {
          loyalty_points: newPoints,
          total_spent: (profile.total_spent || 0) + total,
          total_orders: (profile.total_orders || 0) + 1
        });
        await base44.entities.LoyaltyTransaction.create({
          customer_id: user.id, customer_email: form.email,
          type: "earn", points: pointsEarnable,
          order_id: order.id, description: `Earned for order ${orderNum}`
        });
        if (usePoints && pointsToUse > 0) {
          await base44.entities.LoyaltyTransaction.create({
            customer_id: user.id, customer_email: form.email,
            type: "redeem", points: -pointsToUse * 100,
            order_id: order.id, description: `Redeemed for order ${orderNum}`
          });
        }
      }

      // If total is 0, skip payment and confirm order directly
      if (total <= 0) {
        await base44.entities.Order.update(order.id, { payment_status: 'paid', status: 'confirmed' });
        clearCart();
        navigate(`/order-confirmation/${order.id}`);
        setLoading(false);
        return;
      }

      // Create Stripe Payment Intent
      const stripeRes = await base44.functions.invoke('sumupCheckout', {
        amount: total,
        currency: 'eur',
        orderId: order.id,
        orderNumber: orderNum,
        discountCodeId: summaryState.discountCode?.id,
        discountCodeUsedCount: summaryState.discountCode?.used_count,
      });

      if (stripeRes.data?.clientSecret) {
        clearCart();
        navigate(`/payment?orderId=${order.id}&clientSecret=${stripeRes.data.clientSecret}&paymentIntentId=${stripeRes.data.paymentIntentId}`);
      } else {
        throw new Error('Failed to create payment intent');
      }
      setLoading(false);
    } catch (error) {
      console.error('Checkout error:', error);
      setLoading(false);
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-brand text-3xl mb-8">Checkout 🎂</h1>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">

              {/* Contact Details */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="font-bold text-lg">Contact Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Full Name *</Label>
                    <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label>Email *</Label>
                    <Input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="rounded-xl" />
                  </div>
                </div>
              </div>

              {/* Delivery Method */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="font-bold text-lg">Delivery Method</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('delivery')}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      deliveryMethod === 'delivery' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <MapPin className={`w-5 h-5 mt-0.5 shrink-0 ${deliveryMethod === 'delivery' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-semibold text-sm">Home Delivery</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Canary Islands only<br />Gran Canaria €4.95 · Other islands €9.95</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('local_collection')}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      deliveryMethod === 'local_collection' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <Store className={`w-5 h-5 mt-0.5 shrink-0 ${deliveryMethod === 'local_collection' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-semibold text-sm">Local Collection</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Collect from our store<br />Free of charge</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Delivery Address (only for delivery) */}
              {deliveryMethod === 'delivery' && (
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <h2 className="font-bold text-lg">Delivery Address</h2>
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <MapPin className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700">We deliver within the Canary Islands only. Gran Canaria (35xxx): <strong>€4.95</strong>. Other islands (38xxx): <strong>€9.95</strong>.</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Address Line 1 *</Label>
                    <Input required value={form.line1} onChange={e => setForm({...form, line1: e.target.value})} className="rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label>Address Line 2</Label>
                    <Input value={form.line2} onChange={e => setForm({...form, line2: e.target.value})} className="rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>City *</Label>
                      <Input required value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <Label>Postcode * <span className="text-muted-foreground font-normal text-xs">(Canary Islands: 35xxx or 38xxx)</span></Label>
                      <Input required value={form.postcode} onChange={e => setForm({...form, postcode: e.target.value})} className="rounded-xl" placeholder="35001" />
                    </div>
                  </div>
                </div>
              )}

              {/* Loyalty Points */}
              {profile && profile.loyalty_points > 100 && (
                <div className="bg-gradient-to-r from-secondary/30 to-primary/10 border border-border rounded-2xl p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <Gift className="w-6 h-6 text-primary" />
                    <div>
                      <h2 className="font-bold">Loyalty Points</h2>
                      <p className="text-sm text-muted-foreground">You have {profile.loyalty_points} points (worth €{(profile.loyalty_points / 100).toFixed(2)})</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={usePoints} onCheckedChange={setUsePoints} />
                    <span className="text-sm font-medium">Redeem points for discount (max €{maxPointsDiscount.toFixed(2)})</span>
                  </label>
                  {usePoints && (
                    <div className="space-y-2">
                      <Slider value={[pointsToUse]} onValueChange={v => setPointsToUse(v[0])} max={maxPointsDiscount} step={0.01} />
                      <p className="text-sm font-semibold text-primary">Using €{pointsToUse.toFixed(2)} from points</p>
                    </div>
                  )}
                </div>
              )}

              {/* Order Notes */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4">Order Notes</h2>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Special instructions, delivery notes, cake personalisation details..." className="w-full rounded-xl border border-border p-3 text-sm bg-background resize-none h-24" />
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-card border border-border rounded-2xl p-6 h-fit sticky top-24 space-y-4">
              <h2 className="font-bold text-lg">Order Summary</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0">
                      {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-muted"><img src="https://media.base44.com/images/public/6a3fafd9aa6b3dbb7c575d28/662e2144c_CanaryBlankslogo.png" alt="Canary Blanks" className="w-full h-full object-contain opacity-40" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold shrink-0">€{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>€{subtotal.toFixed(2)}</span></div>
                {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-€{discountAmount.toFixed(2)}</span></div>}
                {pointsDiscount > 0 && <div className="flex justify-between text-primary"><span>Points Discount</span><span>-€{pointsDiscount.toFixed(2)}</span></div>}
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>{isLocalCollection ? <span className="text-green-600">Collection</span> : isFreeShipping ? <span className="text-green-600">FREE</span> : hasValidZone ? `€${zoneRate.toFixed(2)}` : <span className="text-muted-foreground">Enter postcode</span>}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span className="text-primary">€{total.toFixed(2)}</span></div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-xs text-center text-muted-foreground">
                🏆 You'll earn <strong>{pointsEarnable} points</strong> from this order!
              </div>
              <Button type="submit" size="lg" disabled={loading || items.length === 0} className="w-full bg-primary text-white rounded-full font-bold">
                {loading ? "Setting up payment..." : <><CreditCard className="w-4 h-4 mr-2" />Pay €{total.toFixed(2)} securely</>}
              </Button>
              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> Secure payment via Stripe
              </p>
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}