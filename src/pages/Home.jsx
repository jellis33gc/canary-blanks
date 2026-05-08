import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Star, Truck, Shield, RefreshCw, Gift } from "lucide-react";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Product.filter({ is_active: true }, "-created_date", 50),
      base44.entities.Category.filter({ is_active: true }, "sort_order", 20),
      base44.entities.HomepageBlock.list("sort_order", 20),
    ]).then(([prods, cats, blks]) => {
      setProducts(prods);
      setCategories(cats);
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

      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-fun text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-8xl">🎂</div>
          <div className="absolute top-20 right-20 text-6xl">🧁</div>
          <div className="absolute bottom-10 left-1/4 text-5xl">🎀</div>
          <div className="absolute bottom-20 right-1/3 text-7xl">🍰</div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <h1 className="font-brand text-5xl md:text-7xl mb-4 leading-tight drop-shadow-lg">
              {heroBlock?.title || "Bake Magic Happen!"}
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90 font-medium">
              {heroBlock?.subtitle || "Custom cakes, cake toppers, decorations & everything you need to create your perfect celebration"}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 font-bold rounded-full px-8 shadow-lg">
                <Link to="/shop">Shop Now <ArrowRight className="ml-2 w-5 h-5" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/20 font-bold rounded-full px-8">
                <Link to="/shop?category=custom-cakes">Custom Cakes</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

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
            {categories.slice(0, 5).map((cat, i) => (
              <Link key={cat.id} to={`/shop?category=${cat.id}`}>
                <motion.div whileHover={{ scale: 1.05 }} className="relative rounded-2xl overflow-hidden aspect-square bg-gradient-to-br from-primary/20 to-secondary/30 flex items-center justify-center text-center p-4 border-2 border-transparent hover:border-primary transition-all group shadow-sm">
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" />
                  ) : (
                    <span className="text-5xl">
                      {["🎂", "🎀", "✨", "🧁", "🎉"][i % 5]}
                    </span>
                  )}
                  <span className="relative z-10 font-bold text-sm leading-tight">{cat.name}</span>
                </motion.div>
              </Link>
            ))}
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