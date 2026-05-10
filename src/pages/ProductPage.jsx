import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, ShoppingCart, Star, Minus, Plus, Share2, ChevronRight } from "lucide-react";
import useCartStore from "@/lib/cartStore.jsx";
import { motion } from "framer-motion";
import ProductReviews from "@/components/product/ProductReviews";

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [complementary, setComplementary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [customOptions, setCustomOptions] = useState({});
  const [wishlisted, setWishlisted] = useState(false);
  const [profile, setProfile] = useState(null);
  const [added, setAdded] = useState(false);
  const [oosMap, setOosMap] = useState({}); // { "Colour": ["Red", "Blue"] }
  const { addItem } = useCartStore();

  useEffect(() => {
    setLoading(true);
    // Try by slug first, then by id
    base44.entities.Product.filter({ slug: slug, is_active: true }).then(prods => {
      const prod = prods[0];
      if (prod) {
        setProduct(prod);
        loadRelated(prod.category_id, prod);
      } else {
        base44.entities.Product.filter({ is_active: true }).then(all => {
          const found = all.find(p => p.id === slug);
          if (found) { setProduct(found); loadRelated(found.category_id, found); }
        });
      }
      setLoading(false);
    });

    base44.entities.ProductAttribute.list("name", 200).then(attrs => {
      const map = {};
      attrs.forEach(a => {
        if (a.out_of_stock_values?.length > 0) map[a.name] = a.out_of_stock_values;
      });
      setOosMap(map);
    }).catch(() => {});

    base44.auth.me().then(user => {
      if (user) {
        base44.entities.CustomerProfile.filter({ user_id: user.id }).then(p => {
          if (p[0]) { setProfile(p[0]); setWishlisted((p[0].wishlist || []).includes(product?.id)); }
        });
      }
    }).catch(() => {});
  }, [slug, product?.id]);

  const loadRelated = (catId, currentProduct) => {
    if (!catId) return;
    base44.entities.Product.filter({ category_id: catId, is_active: true }, "-created_date", 5).then(prods => {
      setRelated(prods.filter(p => p.id !== currentProduct?.id).slice(0, 4));
    });

    // Load complementary items: toppers, decorations, sprinkles, etc.
    const complementaryKeywords = ['topper', 'decoration', 'sprinkle', 'candle', 'edible', 'icing', 'fondant', 'ribbon', 'board', 'stand', 'box', 'wrap'];
    base44.entities.Product.list('-is_featured', 50).then(all => {
      const filtered = all.filter(p =>
        p.id !== currentProduct?.id &&
        p.category_id !== catId &&
        p.is_active &&
        complementaryKeywords.some(kw =>
          p.name?.toLowerCase().includes(kw) ||
          p.category_name?.toLowerCase().includes(kw) ||
          (p.tags || []).some(t => t.toLowerCase().includes(kw))
        )
      );
      setComplementary(filtered.slice(0, 4));
    });
  };

  const handleAddToCart = () => {
    if (!product) return;
    const variantStr = Object.values(selectedVariants).join(" / ");
    addItem({ ...product, price: displayPrice }, quantity, variantStr, customOptions);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleWishlist = async () => {
    if (!profile) return;
    const newWishlisted = !wishlisted;
    setWishlisted(newWishlisted);
    const wl = profile.wishlist || [];
    const newWl = newWishlisted ? [...wl, product.id] : wl.filter(id => id !== product.id);
    await base44.entities.CustomerProfile.update(profile.id, { wishlist: newWl });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center text-xl">Product not found 😢</div>;

  const discount = product.compare_at_price > product.price ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0;
  const images = product.images?.length > 0 ? product.images : [""];

  // Detect if product uses combination-based variants — must have an attributes object with at least one key
  const usesAttributeVariants = product?.variants?.length > 0 && product.variants.some(v => v.attributes && typeof v.attributes === 'object' && Object.keys(v.attributes).length > 0);

  // Calculate price with variant modifiers
  let displayPrice = product.price || 0;
  let selectedCombo = null;

  if (usesAttributeVariants) {
    // New attribute-based variants
    selectedCombo = product?.variants?.find(v =>
      v.attributes && Object.entries(v.attributes).every(([k, val]) => selectedVariants[k] === val)
    );
    if (selectedCombo?.price !== undefined && selectedCombo?.price !== "" && parseFloat(selectedCombo.price) > 0) {
      displayPrice = parseFloat(selectedCombo.price);
    } else if (selectedCombo && product.price > 0) {
      displayPrice = product.price;
    } else if (!selectedCombo && product.price === 0) {
      // No variant selected and no base price — use min variant price
      const variantPrices = product.variants
        ?.filter(v => v.price && parseFloat(v.price) > 0)
        .map(v => parseFloat(v.price));
      displayPrice = variantPrices?.length > 0 ? Math.min(...variantPrices) : 0;
    }
  } else {
    // Old variant format with options
    const priceModifier = Object.entries(selectedVariants).reduce((total, [variantName, selectedLabel]) => {
      const variant = product.variants?.find(v => v.name === variantName);
      const option = variant?.options?.find(o => (typeof o === 'object' ? o.label : o) === selectedLabel);
      return total + (typeof option === 'object' ? (option.price_modifier || 0) : 0);
    }, 0);
    displayPrice = (product.price || 0) + priceModifier;
    
    // If base price is 0 and no variant selected, show min variant option price
    if (product.price === 0 && Object.keys(selectedVariants).length === 0) {
      const allModifiers = [];
      product.variants?.forEach(v => {
        v.options?.forEach(opt => {
          const mod = typeof opt === 'object' ? (opt.price_modifier || 0) : 0;
          allModifiers.push(mod);
        });
      });
      displayPrice = allModifiers.length > 0 ? Math.min(...allModifiers) : 0;
    }
  }

  // Block add to cart if any selected variant is OOS (global attribute map OR per-combo flag)
  const hasOOSSelected = Object.entries(selectedVariants).some(
    ([variantName, label]) => (oosMap[variantName] || []).includes(label)
  ) || selectedCombo?.out_of_stock === true;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/shop" className="hover:text-primary">Shop</Link>
          {product.category_name && (<><ChevronRight className="w-4 h-4" /><Link to={`/shop?category=${product.category_id}`} className="hover:text-primary">{product.category_name}</Link></>)}
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
          {/* Images */}
          <div className="space-y-3">
            <div className="aspect-square rounded-2xl overflow-hidden bg-muted border border-border">
              {images[selectedImage] ? (
                <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">🎂</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)} className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${selectedImage === i ? 'border-primary' : 'border-border'}`}>
                    {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <span>🎂</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                {product.category_name && <Badge variant="secondary" className="mb-2">{product.category_name}</Badge>}
                <h1 className="text-2xl md:text-3xl font-bold">{product.name}</h1>
              </div>
              <button onClick={handleWishlist} className={`p-2 rounded-full border-2 transition-all ${wishlisted ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary'}`}>
                <Heart className={`w-5 h-5 ${wishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl font-bold text-primary">£{displayPrice.toFixed(2)}</span>
              {product.compare_at_price > product.price && (
                <span className="text-lg text-muted-foreground line-through">£{product.compare_at_price?.toFixed(2)}</span>
              )}
              {discount > 0 && <Badge className="bg-primary text-white">Save {discount}%</Badge>}
            </div>

            {product.short_description && <p className="text-muted-foreground mb-5 leading-relaxed">{product.short_description}</p>}

            {/* Variants */}
            {usesAttributeVariants ? (
              // Render attribute-based variants
              (() => {
                // Extract unique attribute names from combinations
                const attributeNames = new Set();
                product.variants?.forEach(v => {
                  if (v.attributes) {
                    Object.keys(v.attributes).forEach(k => attributeNames.add(k));
                  } else if (v.combo) {
                    // Parse combo string like "Red / S" to extract attribute names
                    const parts = v.combo.split(" / ");
                    if (parts.length > 1) {
                      product.variants.forEach(variant => {
                        if (variant.attributes) Object.keys(variant.attributes).forEach(k => attributeNames.add(k));
                      });
                    }
                  }
                });
                return Array.from(attributeNames).map(attrName => (
                  <div key={attrName} className="mb-4">
                    <label className="font-semibold text-sm mb-2 block">{attrName}</label>
                    <div className="flex flex-wrap gap-2">
                      {/* Get all unique values for this attribute */}
                      {Array.from(new Set(
                        product.variants
                          ?.filter(v => v.attributes && v.attributes[attrName])
                          .map(v => {
                            const val = v.attributes[attrName];
                            if (typeof val === 'object' && val !== null) {
                              return val.label || val.value || Object.values(val)[0] || String(val);
                            }
                            return String(val);
                          })
                      )).map(value => {
                        const isOOS = (oosMap[attrName] || []).includes(value);
                        return (
                          <button
                            key={value}
                            onClick={() => !isOOS && setSelectedVariants({ ...selectedVariants, [attrName]: value })}
                            disabled={isOOS}
                            className={`px-4 py-2 rounded-full text-sm border-2 font-medium transition-all ${
                              isOOS
                                ? 'border-border bg-muted text-muted-foreground line-through cursor-not-allowed opacity-60'
                                : selectedVariants[attrName] === value
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border hover:border-primary'
                            }`}
                          >
                            {value}
                            {isOOS && <span className="block text-[10px] not-italic leading-tight">Out of stock</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()
            ) : (
              // Render old variant format with options
              product.variants?.map(v => (
                <div key={v.name} className="mb-4">
                  <label className="font-semibold text-sm mb-2 block">{v.name}</label>
                  <div className="flex flex-wrap gap-2">
                    {v.options?.map(opt => {
                      const label = typeof opt === 'object' ? opt.label : opt;
                      const modifier = typeof opt === 'object' ? (opt.price_modifier || 0) : 0;
                      const isOOS = (oosMap[v.name] || []).includes(label);
                      return (
                        <button
                          key={label}
                          onClick={() => !isOOS && setSelectedVariants({ ...selectedVariants, [v.name]: label })}
                          disabled={isOOS}
                          className={`px-4 py-2 rounded-full text-sm border-2 font-medium transition-all relative ${
                            isOOS
                              ? 'border-border bg-muted text-muted-foreground line-through cursor-not-allowed opacity-60'
                              : selectedVariants[v.name] === label
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary'
                          }`}
                        >
                          {label}{modifier !== 0 ? ` (${modifier > 0 ? '+' : ''}£${modifier.toFixed(2)})` : ''}
                          {isOOS && <span className="block text-[10px] not-italic leading-tight">Out of stock</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Custom options */}
            {product.custom_options?.map(opt => (
              <div key={opt.label} className="mb-4">
                <label className="font-semibold text-sm mb-2 block">{opt.label} {opt.required && <span className="text-primary">*</span>}</label>
                {opt.type === 'text' && <Input placeholder={`Enter ${opt.label}`} onChange={e => setCustomOptions({ ...customOptions, [opt.label]: e.target.value })} />}
                {opt.type === 'select' && (
                  <Select onValueChange={val => setCustomOptions({ ...customOptions, [opt.label]: val })}>
                    <SelectTrigger><SelectValue placeholder={`Choose ${opt.label}`} /></SelectTrigger>
                    <SelectContent>{opt.options?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
            ))}

            {/* Quantity & Add to cart */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border-2 border-border rounded-full">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:text-primary transition-colors"><Minus className="w-4 h-4" /></button>
                <span className="w-10 text-center font-bold">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="p-2 hover:text-primary transition-colors"><Plus className="w-4 h-4" /></button>
              </div>
              <Button
                onClick={handleAddToCart}
                size="lg"
                disabled={hasOOSSelected}
                className={`flex-1 rounded-full font-bold transition-all ${added ? 'bg-green-500 hover:bg-green-500' : hasOOSSelected ? 'bg-muted text-muted-foreground' : 'bg-primary hover:bg-primary/90 text-white'}`}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {hasOOSSelected ? 'Option Out of Stock' : added ? '✓ Added to Cart!' : 'Add to Cart'}
              </Button>
            </div>

            {/* Stock */}
            {!usesAttributeVariants && product.stock_quantity !== undefined && product.stock_quantity !== null ? (
              <p className="text-sm text-muted-foreground mb-4">
                {product.stock_quantity > 10 ? '✅ In Stock' : product.stock_quantity > 0 ? `⚠️ Only ${product.stock_quantity} left!` : '❌ Out of Stock'}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">✅ In Stock</p>
            )}

            <p className="text-xs text-muted-foreground">🏆 Earn {Math.floor(displayPrice)} loyalty points with this purchase</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-16">
          <Tabs defaultValue="description">
            <TabsList className="rounded-full bg-muted">
              <TabsTrigger value="description" className="rounded-full">Description</TabsTrigger>
              {product.tabs?.map(tab => (
                <TabsTrigger key={tab.title} value={tab.title} className="rounded-full">{tab.title}</TabsTrigger>
              ))}
              <TabsTrigger value="shipping" className="rounded-full">Shipping</TabsTrigger>
              <TabsTrigger value="reviews" className="rounded-full">Reviews</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="mt-6 prose max-w-none">
              <div className="bg-muted/50 rounded-2xl p-6" dangerouslySetInnerHTML={{ __html: product.description || product.short_description || '<p>No description available.</p>' }} />
            </TabsContent>
            {product.tabs?.map(tab => (
              <TabsContent key={tab.title} value={tab.title} className="mt-6">
                <div className="bg-muted/50 rounded-2xl p-6" dangerouslySetInnerHTML={{ __html: tab.content }} />
              </TabsContent>
            ))}
            <TabsContent value="shipping" className="mt-6">
              <div className="bg-muted/50 rounded-2xl p-6 space-y-3">
                <p>🚚 <strong>Standard Delivery:</strong> 3-5 working days — FREE over £50</p>
                <p>⚡ <strong>Express Delivery:</strong> 1-2 working days — £5.99</p>
                <p>🎂 <strong>Custom Cakes:</strong> Please allow 7-14 days for custom orders</p>
              </div>
            </TabsContent>
            <TabsContent value="reviews" className="mt-6">
              <div className="bg-muted/50 rounded-2xl p-6">
                <ProductReviews productId={product.id} productName={product.name} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Complementary products */}
        {complementary.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-brand text-2xl">Complete the Look 🎀</h2>
              <Badge variant="secondary" className="text-xs">Perfect pairings</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {complementary.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}

        {/* Related products */}
        {related.length > 0 && (
          <div>
            <h2 className="font-brand text-2xl mb-6">You might also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}