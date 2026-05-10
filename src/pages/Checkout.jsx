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
import { CreditCard, Lock, Gift, ExternalLink, Truck, MapPin } from "lucide-react";

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items, getSubtotal, clearCart } = useCartStore();
  const summaryState = location.state || {};
  const [shippingCost, setShippingCost] = useState(5.99);

  useEffect(() => {
    base44.entities.SiteSettings.filter({ key: "shipping_cost" }).then(settings => {
      if (settings[0]) setShippingCost(parseFloat(settings[0].value));
    }).catch(() => {});
  }, []);

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [shippingMethod, setShippingMethod] = useState('local_pickup');
  const [shippingOptions, setShippingOptions] = useState([]);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [hasCakes, setHasCakes] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    line1: "", line2: "", city: "", postcode: "", country: "United Kingdom",
    notes: ""
  });

  useEffect(() => {
    // Check if cart has cakes
    const cakesInCart = items.some(item => {
      const itemName = item.product_name?.toLowerCase() || '';
      return itemName.includes('cake');
    });
    setHasCakes(cakesInCart);
    
    // If cakes in cart, lock to local pickup
    if (cakesInCart) {
      setShippingMethod('local_pickup');
    }

    base44.auth.me().then(u => {
      setUser(u);
      setForm(f => ({ ...f, name: u.full_name || "", email: u.email || "" }));
      base44.entities.CustomerProfile.filter({ user_id: u.id }).then(p => {
        if (p[0]) { setProfile(p[0]); }
      });
    }).catch(() => {});
  }, [items]);

  const subtotal = summaryState.subtotal || getSubtotal();
  const discountAmount = summaryState.discountAmount || 0;
  const amountAfterDiscount = subtotal - discountAmount;
  const isFreeShippingCode = summaryState.discountCode?.type === 'free_shipping';
  
  // Calculate shipping based on method
  let shipping = 0;
  if (shippingMethod === 'local_pickup') {
    shipping = 0;
  } else if (shippingMethod && shippingMethod.startsWith('sendcloud_')) {
    const selectedOption = shippingOptions.find(opt => `sendcloud_${opt.id}` === shippingMethod);
    shipping = selectedOption ? parseFloat(selectedOption.price) : 0;
  } else {
    shipping = summaryState.shipping ?? (isFreeShippingCode || amountAfterDiscount >= 50 ? 0 : (amountAfterDiscount > 0 ? shippingCost : 0));
  }
  
  const maxPointsDiscount = profile ? Math.min(Math.floor(profile.loyalty_points / 100), amountAfterDiscount * 0.2) : 0;
  const pointsDiscount = usePoints ? pointsToUse : 0;
  const total = amountAfterDiscount - pointsDiscount + shipping;
  const pointsEarnable = Math.floor(total);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

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
      total,
      shipping_address: { name: form.name, line1: form.line1, line2: form.line2, city: form.city, postcode: form.postcode, country: form.country },
      notes: form.notes,
      points_earned: pointsEarnable,
    });

    if (summaryState.discountCode) {
      await base44.entities.DiscountCode.update(summaryState.discountCode.id, { used_count: (summaryState.discountCode.used_count || 0) + 1 });
    }

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

    // Add shipping method to order
    const shippingMethodLabel = shippingMethod === 'local_pickup' ? 'Local Pickup' : shippingOptions.find(opt => `sendcloud_${opt.id}` === shippingMethod)?.name || 'Standard Shipping';
    await base44.entities.Order.update(order.id, { 
      shipping_method: shippingMethodLabel 
    });

    // Create SumUp checkout and redirect
    const returnUrl = `${window.location.origin}/order-confirmation/${order.id}`;
    const sumupRes = await base44.functions.invoke('sumupCheckout', {
      amount: total,
      currency: 'GBP',
      description: `Love the Cake — ${orderNum}`,
      orderId: order.id,
      returnUrl,
    });

    clearCart();
    setLoading(false);

    if (sumupRes.data?.checkoutUrl) {
      await base44.entities.Order.update(order.id, { sumup_checkout_id: sumupRes.data.checkoutId });
      window.location.href = sumupRes.data.checkoutUrl;
    } else {
      // Fallback: go to confirmation if SumUp fails
      navigate(`/order-confirmation/${order.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-brand text-3xl mb-8">Checkout 🎂</h1>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact */}
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

              {/* Shipping Method */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="font-bold text-lg flex items-center gap-2"><Truck className="w-5 h-5" /> Shipping Method</h2>
                {hasCakes && <p className="text-sm text-orange-600 bg-orange-50 rounded-lg p-2">⚠️ Your order contains cakes. Only local pickup is available.</p>}

                <div className="space-y-3">
                  {/* Local Pickup Option */}
                  <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${shippingMethod === 'local_pickup' ? 'bg-primary/5 border-primary' : 'border-border hover:border-muted-foreground'}`}>
                    <input type="radio" name="shipping" value="local_pickup" checked={shippingMethod === 'local_pickup'} onChange={e => setShippingMethod(e.target.value)} className="w-4 h-4" />
                    <div className="flex-1">
                      <p className="font-medium flex items-center gap-2"><MapPin className="w-4 h-4" /> Local Pickup</p>
                      <p className="text-sm text-muted-foreground">Pick up from our store</p>
                    </div>
                    <p className="font-bold text-green-600">FREE</p>
                  </label>

                  {/* Sendcloud Shipping Options */}
                  {!hasCakes && shippingOptions.length > 0 && (
                    <div className="space-y-2">
                      {shippingOptions.map(option => (
                        <label key={option.id} className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${shippingMethod === `sendcloud_${option.id}` ? 'bg-primary/5 border-primary' : 'border-border hover:border-muted-foreground'}`}>
                          <input type="radio" name="shipping" value={`sendcloud_${option.id}`} checked={shippingMethod === `sendcloud_${option.id}`} onChange={e => setShippingMethod(e.target.value)} className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="font-medium">{option.name}</p>
                            <p className="text-sm text-muted-foreground">{option.delivery_days ? `${option.delivery_days} days` : 'Delivery time varies'}</p>
                          </div>
                          <p className="font-bold">£{parseFloat(option.price).toFixed(2)}</p>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              {shippingMethod !== 'local_pickup' && (
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <h2 className="font-bold text-lg">Shipping Address</h2>
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
                      <Label>Postcode *</Label>
                      <Input required value={form.postcode} onChange={e => setForm({...form, postcode: e.target.value})} className="rounded-xl" />
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
                      <p className="text-sm text-muted-foreground">You have {profile.loyalty_points} points (worth £{(profile.loyalty_points / 100).toFixed(2)})</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={usePoints} onCheckedChange={setUsePoints} />
                    <span className="text-sm font-medium">Redeem points for discount (max £{maxPointsDiscount.toFixed(2)})</span>
                  </label>
                  {usePoints && (
                    <div className="space-y-2">
                      <Slider value={[pointsToUse]} onValueChange={v => setPointsToUse(v[0])} max={maxPointsDiscount} step={0.01} />
                      <p className="text-sm font-semibold text-primary">Using £{pointsToUse.toFixed(2)} from points</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4">Order Notes</h2>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Special instructions, delivery notes, cake personalisation details..." className="w-full rounded-xl border border-border p-3 text-sm bg-background resize-none h-24" />
              </div>
            </div>

            {/* Right: Summary */}
            <div className="bg-card border border-border rounded-2xl p-6 h-fit sticky top-24 space-y-4">
              <h2 className="font-bold text-lg">Order Summary</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0">
                      {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-xl">🎂</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold shrink-0">£{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>£{subtotal.toFixed(2)}</span></div>
                {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-£{discountAmount.toFixed(2)}</span></div>}
                {pointsDiscount > 0 && <div className="flex justify-between text-primary"><span>Points Discount</span><span>-£{pointsDiscount.toFixed(2)}</span></div>}
                <div className="flex justify-between"><span>Shipping ({shippingMethod === 'local_pickup' ? 'Local Pickup' : 'Courier'})</span><span>{shipping === 0 ? <span className="text-green-600">FREE</span> : `£${shipping.toFixed(2)}`}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span className="text-primary">£{total.toFixed(2)}</span></div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-xs text-center text-muted-foreground">
                🏆 You'll earn <strong>{pointsEarnable} points</strong> from this order!
              </div>
              <Button type="submit" size="lg" disabled={loading || items.length === 0} className="w-full bg-primary text-white rounded-full font-bold">
                {loading ? "Redirecting to payment..." : <><CreditCard className="w-4 h-4 mr-2" />Pay £{total.toFixed(2)} with SumUp</>}
              </Button>
              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> Secure payment via SumUp
              </p>
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}