import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import useCartStore from "@/lib/cartStore.jsx";
import { motion } from "framer-motion";

export default function ProductCard({ product, wishlist = [], onWishlistToggle }) {
  const { addItem } = useCartStore();
  const [added, setAdded] = useState(false);
  const isWishlisted = wishlist.includes(product.id);
  
  // Check if product has variants with attributes
  const hasVariants = product.variants?.some(v => v && v.attributes && Object.keys(v.attributes).length > 0);
  
  // Calculate lowest variant price if product has variants
  let displayPrice = product.price;
  let priceLabel = "";
  if (hasVariants) {
    const variantPrices = product.variants
      .filter(v => v && v.attributes && v.price)
      .map(v => parseFloat(v.price));
    if (variantPrices.length > 0) {
      displayPrice = Math.min(...variantPrices);
      priceLabel = "From ";
    }
  }
  
  const discount = product.compare_at_price && product.compare_at_price > displayPrice
    ? Math.round((1 - displayPrice / product.compare_at_price) * 100) : 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-shadow"
    >
      <Link to={`/product/${product.slug || product.id}`} className="block">
        <div className="relative overflow-hidden aspect-square bg-muted">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🎂</div>
          )}
          {discount > 0 && (
            <Badge className="absolute top-3 left-3 bg-primary text-white font-bold">-{discount}%</Badge>
          )}
          {product.is_featured && !discount && (
            <Badge className="absolute top-3 left-3 bg-secondary text-secondary-foreground font-bold">✨ Featured</Badge>
          )}
          {onWishlistToggle && (
            <button
              onClick={(e) => { e.preventDefault(); onWishlistToggle(product.id); }}
              className={`absolute top-3 right-3 p-2 rounded-full shadow-md transition-all ${isWishlisted ? 'bg-primary text-white' : 'bg-white text-muted-foreground hover:text-primary'}`}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link to={`/product/${product.slug || product.id}`}>
          <h3 className="font-bold text-sm leading-tight mb-1 hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
        </Link>
        {product.category_name && (
          <p className="text-xs text-muted-foreground mb-2">{product.category_name}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-lg text-primary">{priceLabel}£{displayPrice?.toFixed(2)}</span>
            {product.compare_at_price > displayPrice && (
              <span className="text-sm text-muted-foreground line-through">£{product.compare_at_price?.toFixed(2)}</span>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleAddToCart}
            className={`transition-all ${added ? 'bg-green-500 hover:bg-green-500' : 'bg-primary hover:bg-primary/90'} text-white rounded-full px-3`}
          >
            {added ? '✓' : <ShoppingCart className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}