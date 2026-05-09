import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Heart, User, Search, Menu, X, ChevronDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useCartStore from "@/lib/cartStore.jsx";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const { getTotalItems } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.NavMenu.filter({ is_active: true }, "sort_order", 50).then(items => {
      setCategories(items);
    }).catch(() => {
      // Fallback to categories if NavMenu not available
      base44.entities.Category.filter({ is_active: true }, "sort_order", 20).then(setCategories).catch(() => {});
    });
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground text-center text-sm py-2 px-4">
        🎂 Free shipping on orders over £50 · Use code SWEETDEAL for 10% off!
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="https://media.base44.com/images/public/69fe13d34881fdc5bd6d6be8/42bb3f93f_LoveTheCakeLogoCropped1.png" alt="Love the Cake" className="h-12 w-auto" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {categories.map(item => {
              let href = "/shop";
              if (item.type === "category" && item.category_id) {
                href = `/shop?category=${item.category_id}`;
              } else if (item.type === "custom_url" && item.custom_url) {
                href = item.custom_url;
              }
              return (
                <Link key={item.id} to={href} className="text-sm font-medium hover:text-primary transition-colors">
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 hover:text-primary transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <Link to="/wishlist" className="p-2 hover:text-primary transition-colors">
              <Heart className="w-5 h-5" />
            </Link>
            <Link to="/account" className="p-2 hover:text-primary transition-colors">
              <User className="w-5 h-5" />
            </Link>
            <Link to="/cart" className="relative p-2 hover:text-primary transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {getTotalItems()}
                </span>
              )}
            </Link>
            <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="pb-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for cakes, toppers, decorations..."
                className="flex-1"
                autoFocus
              />
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground">Search</Button>
            </form>
          </div>
        )}

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-border space-y-2">
            {categories.map(item => {
              let href = "/shop";
              if (item.type === "category" && item.category_id) {
                href = `/shop?category=${item.category_id}`;
              } else if (item.type === "custom_url" && item.custom_url) {
                href = item.custom_url;
              }
              return (
                <Link key={item.id} to={href} className="block py-2 hover:text-primary" onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              );
            })}
            <Link to="/account" className="block py-2 hover:text-primary" onClick={() => setMenuOpen(false)}>My Account</Link>
            <Link to="/wishlist" className="block py-2 hover:text-primary" onClick={() => setMenuOpen(false)}>Wishlist</Link>
          </div>
        )}
      </div>
    </nav>
  );
}