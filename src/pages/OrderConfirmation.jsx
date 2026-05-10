import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    base44.entities.Order.filter({}).then(all => {
      const found = all.find(o => o.id === id);
      setOrder(found);
    });
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }}>
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-14 h-14 text-green-500" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h1 className="font-brand text-4xl text-primary mb-3">Order Placed! 🎉</h1>
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
      </div>
      <Footer />
    </div>
  );
}