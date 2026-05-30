import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import PromoBanners from "@/components/home/PromoBanners";
import HeroSlider from "@/components/home/HeroSlider";
import BrandSlider from "@/components/home/BrandSlider";

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

  const activeBlocks = blocks.filter(b => b.is_active).sort((a, b) => a.sort_order - b.sort_order);
  const hasBlock = (type) => activeBlocks.some(b => b.type === type);

  const pastelBgs = ["bg-blue-50", "bg-green-50", "bg-purple-50/60", "bg-orange-50"];
  const emojis = ["🎂", "🎀", "✨", "🧁", "🎉"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PromoBanners />
      <HeroSlider />

      {activeBlocks.map(block => {
        if (block.type === 'brand_slider') {
          return <BrandSlider key={block.id} />;
        }
        if (block.type === 'category_grid' && categories.length > 0) {
          return (
            <section key={block.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <h2 className="text-3xl font-extrabold text-center mb-10">
                <span className="text-secondary">Shop by </span><span className="text-primary">Category</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map((item, i) => {
                  let href = "/shop";
                  if (item.type === "category" && item.category_id) href = `/shop?category=${item.category_id}`;
                  else if (item.type === "custom_url" && item.custom_url) href = item.custom_url;
                  return (
                    <Link key={item.id} to={href}>
                      <motion.div whileHover={{ scale: 1.03 }} className={`rounded-2xl ${pastelBgs[i % 4]} flex flex-col items-center justify-center gap-3 py-8 px-4 border border-gray-100 hover:border-primary/30 transition-all shadow-sm`}>
                        <span className="text-4xl">{emojis[i % 5]}</span>
                        <span className="font-semibold text-sm text-gray-700">{item.label}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        }
        if (block.type === 'featured_products' && featured.length > 0) {
          return (
            <section key={block.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-extrabold">
                  <span className="text-secondary">{block.title ? block.title.split(' ')[0] : 'Featured'} </span><span className="text-primary">{block.title ? block.title.split(' ').slice(1).join(' ') || 'Products' : 'Products'}</span>
                </h2>
                <Link to="/shop?featured=true" className="text-primary font-semibold hover:underline text-sm">View All &rarr;</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {featured.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          );
        }
        if (block.type === 'sale_products' && onSale.length > 0) {
          return (
            <section key={block.id} className="bg-gray-50 py-16 my-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-extrabold">
                    <span className="text-secondary">On </span><span className="text-primary">Sale Now!</span>
                  </h2>
                  <Link to="/shop?sale=true" className="text-primary font-semibold hover:underline text-sm">Shop Sale &rarr;</Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {onSale.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            </section>
          );
        }
        if (block.type === 'newsletter') {
          return (
            <section key={block.id} className="bg-muted py-16 my-8">
              <div className="max-w-xl mx-auto px-4 text-center">
                <h2 className="text-3xl font-extrabold mb-3">
                  <span className="text-secondary">{block.title || 'Stay in the'} </span><span className="text-primary">Loop!</span>
                </h2>
                <p className="text-muted-foreground mb-6">{block.subtitle || 'Subscribe for exclusive deals and new product alerts!'}</p>
                <div className="flex gap-2 max-w-sm mx-auto">
                  <input type="email" placeholder="Your email address" className="flex-1 border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <Button className="rounded-full">Subscribe</Button>
                </div>
              </div>
            </section>
          );
        }
        return null;
      })}

      {/* CTA section */}
      <section className="gradient-cta py-20 my-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Can't Find What You're Looking For?</h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">We're always adding new products. Let us know what you'd like to see!</p>
          <Button asChild size="lg" className="bg-white text-secondary hover:bg-white/90 font-bold rounded-full px-10">
            <Link to="/contact">Request a Product</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}