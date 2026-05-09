import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, X } from "lucide-react";

export default function Shop() {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [showOnSale, setShowOnSale] = useState(false);
  const [showFeatured, setShowFeatured] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [wishlist, setWishlist] = useState([]);
  const [profile, setProfile] = useState(null);

  // Sync filters from URL whenever the URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    setSelectedCategory(urlParams.get("category") || "");
    setShowOnSale(urlParams.get("sale") === "true");
    setShowFeatured(urlParams.get("featured") === "true");
    setSearchQuery(urlParams.get("search") || "");
  }, [location.search]);

  useEffect(() => {
    base44.entities.Category.filter({ is_active: true }, "sort_order").then(setCategories);
    base44.auth.me().then(user => {
      if (user) {
        base44.entities.CustomerProfile.filter({ user_id: user.id }).then(p => {
          if (p[0]) { setProfile(p[0]); setWishlist(p[0].wishlist || []); }
        });
      }
    }).catch(() => {});
    loadProducts();
  }, []);

  const loadProducts = () => {
    setLoading(true);
    base44.entities.Product.filter({ is_active: true }, "-created_date", 200).then(prods => {
      setProducts(prods);
      setLoading(false);
    });
  };

  const handleWishlistToggle = async (productId) => {
    if (!profile) return;
    const newWishlist = wishlist.includes(productId) ? wishlist.filter(id => id !== productId) : [...wishlist, productId];
    setWishlist(newWishlist);
    await base44.entities.CustomerProfile.update(profile.id, { wishlist: newWishlist });
  };

  const filtered = products.filter(p => {
    if (selectedCategory && p.category_id !== selectedCategory) return false;
    if (showOnSale && !p.is_on_sale) return false;
    if (showFeatured && !p.is_featured) return false;
    if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return new Date(b.created_date) - new Date(a.created_date);
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-brand text-3xl text-gradient">
              {searchQuery ? `Search: "${searchQuery}"` : selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : "All Products"}
            </h1>
            <p className="text-muted-foreground mt-1">{filtered.length} products found</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-full" onClick={() => setFilterOpen(!filterOpen)}>
              <SlidersHorizontal className="w-4 h-4 mr-2" /> Filters
            </Button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 rounded-full">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedCategory && <Badge variant="secondary" className="rounded-full cursor-pointer" onClick={() => setSelectedCategory("")}>{categories.find(c => c.id === selectedCategory)?.name} <X className="ml-1 w-3 h-3" /></Badge>}
          {showOnSale && <Badge variant="secondary" className="rounded-full cursor-pointer" onClick={() => setShowOnSale(false)}>On Sale <X className="ml-1 w-3 h-3" /></Badge>}
          {showFeatured && <Badge variant="secondary" className="rounded-full cursor-pointer" onClick={() => setShowFeatured(false)}>Featured <X className="ml-1 w-3 h-3" /></Badge>}
        </div>

        {/* Sub-category cards */}
        {selectedCategory && (() => {
          const parentCat = categories.find(c => c.id === selectedCategory);
          const subCategories = categories.filter(c => c.parent_id === selectedCategory);
          return subCategories.length > 0 ? (
            <div className="mb-8">
              <p className="text-sm text-muted-foreground mb-3">Filter by {parentCat?.name}</p>
              <div className="flex flex-wrap gap-3">
                {subCategories.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedCategory(sub.id)}
                    className="px-4 py-2 rounded-full border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium"
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        <div className="flex gap-6">
          {/* Sidebar filters */}
          {filterOpen && (
            <div className="w-64 shrink-0 bg-card rounded-2xl border border-border p-5 h-fit sticky top-24 space-y-6">
              <div>
                <h3 className="font-bold mb-3">Category</h3>
                <div className="space-y-1">
                  <button onClick={() => setSelectedCategory("")} className={`block w-full text-left text-sm py-1 px-2 rounded-lg transition-colors ${!selectedCategory ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted'}`}>All</button>
                  {categories.filter(c => !c.parent_id).map(cat => {
                    const children = categories.filter(c => c.parent_id === cat.id);
                    return (
                      <div key={cat.id}>
                        <button onClick={() => setSelectedCategory(cat.id)} className={`block w-full text-left text-sm py-1 px-2 rounded-lg transition-colors font-medium ${selectedCategory === cat.id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted'}`}>{cat.name}</button>
                        {children.length > 0 && (
                          <div className="ml-3 border-l border-border pl-2 space-y-0.5 mt-0.5">
                            {children.map(sub => {
                              const grandchildren = categories.filter(c => c.parent_id === sub.id);
                              return (
                                <div key={sub.id}>
                                  <button onClick={() => setSelectedCategory(sub.id)} className={`block w-full text-left text-sm py-1 px-2 rounded-lg transition-colors ${selectedCategory === sub.id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-muted-foreground'}`}>{sub.name}</button>
                                  {grandchildren.length > 0 && (
                                    <div className="ml-3 border-l border-border pl-2 space-y-0.5 mt-0.5">
                                      {grandchildren.map(gc => (
                                        <button key={gc.id} onClick={() => setSelectedCategory(gc.id)} className={`block w-full text-left text-xs py-1 px-2 rounded-lg transition-colors ${selectedCategory === gc.id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-muted-foreground'}`}>{gc.name}</button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="font-bold mb-3">Price Range</h3>
                <Slider value={priceRange} onValueChange={setPriceRange} max={500} step={5} className="mb-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>£{priceRange[0]}</span>
                  <span>£{priceRange[1]}</span>
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={showOnSale} onCheckedChange={setShowOnSale} />
                  <span className="text-sm font-medium">On Sale</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={showFeatured} onCheckedChange={setShowFeatured} />
                  <span className="text-sm font-medium">Featured</span>
                </label>
              </div>
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array(8).fill(0).map((_, i) => <div key={i} className="aspect-square bg-muted rounded-2xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🎂</div>
                <h3 className="font-bold text-xl mb-2">No products found</h3>
                <p className="text-muted-foreground">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                {filtered.map(p => <ProductCard key={p.id} product={p} wishlist={wishlist} onWishlistToggle={handleWishlistToggle} />)}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}