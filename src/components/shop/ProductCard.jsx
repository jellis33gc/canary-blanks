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

  const rating = product.rating || 4.5;
  const reviewCount = product.review_count || 0;
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <Link to={`/product/${product.slug || product.id}`} className="block">
        <div className="relative overflow-hidden aspect-square bg-blue-50/40">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 p-8">
              <img src="https://media.base44.com/images/public/6a0f27c6efeb5eb47a953fea/bf3dabfaf_BirtishFoodStores.png" alt="British Food Stores" className="w-full h-full object-contain opacity-40" />
            </div>
          )}
          {product.is_featured && (
            <span className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">Popular</span>
          )}
          {discount > 0 && (
            <span className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">-{discount}%</span>
          )}
          {onWishlistToggle && (
            <button
              onClick={(e) => { e.preventDefault(); onWishlistToggle(product.id); }}
              className={`absolute top-3 right-3 p-2 rounded-full shadow-md transition-all ${isWishlisted ? 'bg-primary text-white' : 'bg-white text-gray-400 hover:text-primary'}`}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link to={`/product/${product.slug || product.id}`}>
          <h3 className="font-semibold text-sm leading-tight mb-1 text-gray-900 hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
        </Link>
        {/* Stars */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-1 mb-2">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`w-3.5 h-3.5 ${s <= fullStars ? 'fill-yellow-400 text-yellow-400' : s === fullStars + 1 && hasHalf ? 'fill-yellow-400/50 text-yellow-400' : 'text-gray-300'}`} />
            ))}
            <span className="text-xs text-gray-500 ml-1">({reviewCount})</span>
          </div>
        )}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-lg text-gray-900">{priceLabel}€{displayPrice?.toFixed(2)}</span>
            {product.compare_at_price > displayPrice && (
              <span className="text-sm text-gray-400 line-through">€{product.compare_at_price?.toFixed(2)}</span>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow ${added ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary/90'}`}
          >
            {added ? '✓' : <ShoppingCart className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}