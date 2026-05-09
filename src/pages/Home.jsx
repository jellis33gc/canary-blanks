import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Star, Truck, Shield, Gift } from "lucide-react";
import PromoBanners from "@/components/home/PromoBanners";
import HeroSlider from "@/components/home/HeroSlider";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Product.filter({ is_active: true }, "-created_date", 50),
      base44.entities.NavMenu.filter({ is_active: true }, "sort_order", 20),
      base44.entities.HomepageBlock.list("sort_order", 20),
    ]).then(([prods, navItems, blks]) => {
      setProducts(prods);
      setCategories(navItems);
      setBlocks(blks.filter(b => b.is_active));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const featured = products.filter(p => p.is_featured).slice(0, 8);
  const onSale = products.filter(p => p.is_on_sale).slice(0, 8);

  const heroBlock = blocks.find(b => b.type === 'hero');
  const showFeatured = blocks.find(b => b.type === 'featured_products') || true;
  const showSale = blocks.find(b => b.type === 'sale_products');
  const showCategories = blocks.find(b => b.type === 'category_grid') || true;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <PromoBanners />
      <HeroSlider />

      {/* Trust badges */}
      <section className="border-b border-border bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Truck, text: "Free shipping over £50" },
              { icon: Star, text: "500+ 5-star reviews" },
              { icon: Shield, text: "Secure checkout" },
              { icon: Gift, text: "Earn loyalty points" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 justify-center">
                <div className="p-2 bg-primary/10 rounded-full">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-semibold">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {showCategories && categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="font-brand text-3xl text-center mb-10 text-gradient">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((item, i) => {
              let href = "/shop";
              if (item.type === "category" && item.category_id) {
                href = `/shop?category=${item.category_id}`;
              } else if (item.type === "custom_url" && item.custom_url) {
                href = item.custom_url;
              }
              return (
                <Link key={item.id} to={href}>
                  <motion.div whileHover={{ scale: 1.05 }} className="relative rounded-2xl overflow-hidden aspect-square bg-gradient-to-br from-primary/20 to-secondary/30 flex items-center justify-center text-center p-4 border-2 border-transparent hover:border-primary transition-all group shadow-sm">
                    <span className="text-5xl">
                      {["🎂", "🎀", "✨", "🧁", "🎉"][i % 5]}
                    </span>
                    <span className="relative z-10 font-bold text-sm leading-tight">{item.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {showFeatured && featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-brand text-3xl text-gradient">✨ Featured Picks</h2>
            <Button asChild variant="outline" className="rounded-full border-primary text-primary hover:bg-primary hover:text-white">
              <Link to="/shop?featured=true">View All</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {featured.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Sale banner */}
      {onSale.length > 0 && (
        <section className="bg-gradient-to-r from-secondary/40 to-primary/20 py-16 my-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-brand text-3xl">🔥 On Sale Now!</h2>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/shop?sale=true">Shop Sale</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {onSale.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Loyalty CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="gradient-fun rounded-3xl p-8 md:p-12 text-white text-center shadow-xl">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="font-brand text-4xl mb-3">Join Our Sweet Rewards!</h2>
          <p className="text-lg mb-6 opacity-90 max-w-lg mx-auto">Earn 1 point for every £1 spent. Redeem 100 points for £1 off your next order!</p>
          <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 font-bold rounded-full px-10">
            <Link to="/account">Create Account & Start Earning</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}