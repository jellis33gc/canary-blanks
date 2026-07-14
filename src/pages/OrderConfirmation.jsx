import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { base44 } from "@/api/base44Client";
import { markCartRecovered } from "@/components/marketing/useCartTracking";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Package, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function OrderConfirmation() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const paymentIntentId = searchParams.get('paymentIntentId') || searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');
  const [order, setOrder] = useState(null);
  const [user, setUser] = useState(null);

  const isPaid = redirectStatus === 'succeeded';
  const isFailed = redirectStatus === 'failed';

  useEffect(() => {
    // Check if user is logged in
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;

    // Fetch order for display purposes
    base44.entities.Order.filter({}).then(orders => {
      const found = orders.find(o => o.id === id);
      setOrder(found);
      if (found) markCartRecovered();
    }).catch(e => console.error('Fetch error:', e));

    // Verify payment status with Stripe as a fallback (webhook is primary)
    if (paymentIntentId) {
      base44.functions.invoke('sumupCheckout', {
        action: 'checkStatus',
        orderId: id,
        paymentIntentId,
      }).catch(e => console.error('Status check error:', e));
    }

  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">

        {isFailed && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-14 h-14 text-red-500" />
            </div>
            <h1 className="font-brand text-4xl text-red-500 mb-3">Payment Failed 😕</h1>
            <p className="text-muted-foreground mb-8">Don't worry — please try again.</p>
            <Button asChild className="bg-primary text-white rounded-full px-8 font-bold">
              <Link to="/checkout">Try Again</Link>
            </Button>
          </motion.div>
        )}

        {isPaid && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }}>
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-14 h-14 text-green-500" />
              </div>
            </motion.div>
            <h1 className="font-brand text-4xl text-primary mb-3">Order Confirmed! 🎉</h1>
            {order && (
              <div className="bg-card border border-border rounded-2xl p-6 mb-8 text-left space-y-3">
                <p className="font-semibold text-lg text-center mb-4">{order.order_number}</p>
                <p><strong>Confirmation sent to:</strong> {order.customer_email}</p>
                <p><strong>Total:</strong> €{order.total?.toFixed(2)}</p>
                {order.points_earned > 0 && (
                  <div className="bg-primary/10 rounded-xl p-3 text-center">
                    <p className="text-primary font-bold">🏆 You earned {order.points_earned} loyalty points!</p>
                  </div>
                )}
                <div>
                  <p className="font-semibold mb-2">Items:</p>
                  {order.items?.map((item, i) => (
                    <div key={i}>
                      <p className="text-sm text-muted-foreground">• {item.product_name} x{item.quantity} — €{(item.price * item.quantity).toFixed(2)}</p>
                      {item.is_backorder && item.backorder_date && (
                        <p className="text-xs text-amber-600 ml-3">📦 Back in stock {format(new Date(item.backorder_date), "dd MMM yyyy")} (pre-order)</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {user ? (
                <Button asChild className="bg-primary text-white rounded-full px-8 font-bold">
                  <Link to="/account/orders">View My Orders <Package className="ml-2 w-4 h-4" /></Link>
                </Button>
              ) : (
                <Button asChild className="bg-primary text-white rounded-full px-8 font-bold">
                  <Link to="/account">Create Account to Track Orders <Package className="ml-2 w-4 h-4" /></Link>
                </Button>
              )}
              <Button asChild variant="outline" className="rounded-full px-8">
                <Link to="/shop">Continue Shopping <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
            </div>
          </motion.div>
        )}

        {!isPaid && !isFailed && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-14 h-14 text-yellow-400" />
            </div>
            <h1 className="font-brand text-4xl text-primary mb-3">Order Received! 🎂</h1>
            <p className="text-muted-foreground mb-4">We've received your order and are processing your payment.</p>
            {order && (
              <div className="bg-card border border-border rounded-2xl p-6 mb-8 text-left space-y-3">
                <p className="font-semibold text-lg text-center mb-4">{order.order_number}</p>
                <p><strong>Email:</strong> {order.customer_email}</p>
                <p><strong>Total:</strong> €{order.total?.toFixed(2)}</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {user ? (
                <Button asChild className="bg-primary text-white rounded-full px-8 font-bold">
                  <Link to="/account/orders">View My Orders <Package className="ml-2 w-4 h-4" /></Link>
                </Button>
              ) : (
                <Button asChild className="bg-primary text-white rounded-full px-8 font-bold">
                  <Link to="/register">Create Account to Track Orders <Package className="ml-2 w-4 h-4" /></Link>
                </Button>
              )}
              <Button asChild variant="outline" className="rounded-full px-8">
                <Link to="/shop">Continue Shopping <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
            </div>
          </motion.div>
        )}

      </div>
      <Footer />
    </div>
  );
}