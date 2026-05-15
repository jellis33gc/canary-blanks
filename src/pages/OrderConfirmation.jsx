import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Package, ArrowRight, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function OrderConfirmation() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const paymentIntentId = searchParams.get('paymentIntentId') || searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');
  const [order, setOrder] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) return;

    const run = async () => {
      try {
        // Update order FIRST based on Stripe redirect status
        if (redirectStatus === 'succeeded' && paymentIntentId) {
          setUpdating(true);
          await base44.entities.Order.update(id, {
            payment_status: 'paid',
            status: 'confirmed',
            sumup_transaction_id: paymentIntentId,
          });
          setUpdating(false);
        }

        if (redirectStatus === 'failed') {
          await base44.entities.Order.update(id, {
            payment_status: 'failed',
            status: 'cancelled',
          });
        }

        // Then fetch the updated order
        const orders = await base44.entities.Order.filter({});
        const found = orders.find(o => o.id === id);
        setOrder(found);

      } catch(e) {
        console.error('Error:', e);
      }
      setDone(true);
    };

    run();
  }, [id, redirectStatus, paymentIntentId]);

  const isPaid = order?.payment_status === 'paid' || redirectStatus === 'succeeded';
  const isFailed = order?.payment_status === 'failed' || redirectStatus === 'failed';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">

        {!done && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-14 h-14 text-yellow-500 animate-pulse" />
            </div>
            <h1 className="font-brand text-4xl text-primary mb-3">Confirming Payment... ⏳</h1>
            <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
          </motion.div>
        )}

        {done && isFailed && (
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

        {done && isPaid && (
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
                    <p key={i} className="text-sm text-muted-foreground">• {item.product_name} x{item.quantity} — €{(item.price * item.quantity).toFixed(2)}</p>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="bg-primary text-white rounded-full px-8 font-bold">
                <Link to="/account/orders">View My Orders <Package className="ml-2 w-4 h-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-8">
                <Link to="/shop">Continue Shopping <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
            </div>
          </motion.div>
        )}

        {done && !isPaid && !isFailed && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-14 h-14 text-yellow-500" />
            </div>
            <h1 className="font-brand text-4xl text-primary mb-3">Order Received! 🎂</h1>
            <p className="text-muted-foreground mb-4">We've received your order and are awaiting payment confirmation.</p>
            {order && (
              <div className="bg-card border border-border rounded-2xl p-6 mb-8 text-left space-y-3">
                <p className="font-semibold text-lg text-center mb-4">{order.order_number}</p>
                <p><strong>Email:</strong> {order.customer_email}</p>
                <p><strong>Total:</strong> €{order.total?.toFixed(2)}</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="bg-primary text-white rounded-full px-8 font-bold">
                <Link to="/account/orders">View My Orders <Package className="ml-2 w-4 h-4" /></Link>
              </Button>
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