import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Wishlist() {
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me().catch(() => null);
      if (!user) { setLoading(false); return; }
      const profiles = await base44.entities.CustomerProfile.filter({ email: user.email });
      const prof = profiles[0];
      setProfile(prof);
      if (prof?.wishlist?.length) {
        const products = await base44.entities.Product.filter({ is_active: true });
        setWishlistProducts(products.filter(p => prof.wishlist.includes(p.id)));
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleWishlistToggle = async (productId) => {
    if (!profile) return;
    const newWishlist = profile.wishlist?.includes(productId)
      ? profile.wishlist.filter(id => id !== productId)
      : [...(profile.wishlist || []), productId];
    await base44.entities.CustomerProfile.update(profile.id, { wishlist: newWishlist });
    setProfile(p => ({ ...p, wishlist: newWishlist }));
    setWishlistProducts(prev => prev.filter(p => newWishlist.includes(p.id)));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-brand text-3xl text-primary mb-2">My Wishlist</h1>
        <p className="text-muted-foreground mb-8">{wishlistProducts.length} saved items</p>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : wishlistProducts.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-bold mb-2">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-6">Save items you love to find them here later.</p>
            <Button asChild className="bg-primary text-white rounded-full px-8">
              <Link to="/shop">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {wishlistProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                wishlist={profile?.wishlist || []}
                onWishlistToggle={handleWishlistToggle}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}