import { Link } from "react-router-dom";
import { Heart, Instagram, Facebook, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-muted border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <img src="https://media.base44.com/images/public/69fe13d34881fdc5bd6d6be8/e211b7128_LoveTheCakeLogoTransparent1.png" alt="Love the Cake" className="h-16 w-auto mb-3" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your one-stop shop for custom cakes, cake decorations, toppers, ingredients & party supplies. Made with love! 🎂
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="p-2 bg-primary/10 rounded-full hover:bg-primary hover:text-white transition-all"><Instagram className="w-4 h-4" /></a>
              <a href="#" className="p-2 bg-primary/10 rounded-full hover:bg-primary hover:text-white transition-all"><Facebook className="w-4 h-4" /></a>
              <a href="#" className="p-2 bg-primary/10 rounded-full hover:bg-primary hover:text-white transition-all"><Twitter className="w-4 h-4" /></a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-3">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/shop" className="hover:text-primary transition-colors">All Products</Link></li>
              <li><Link to="/shop?sale=true" className="hover:text-primary transition-colors">Sale Items</Link></li>
              <li><Link to="/shop?featured=true" className="hover:text-primary transition-colors">Featured</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/account" className="hover:text-primary transition-colors">My Account</Link></li>
              <li><Link to="/account/orders" className="hover:text-primary transition-colors">Order History</Link></li>
              <li><Link to="/wishlist" className="hover:text-primary transition-colors">Wishlist</Link></li>
              <li><Link to="/account/loyalty" className="hover:text-primary transition-colors">Loyalty Points</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3">Help</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link to="/shipping" className="hover:text-primary transition-colors">Shipping Info</Link></li>
              <li><Link to="/returns" className="hover:text-primary transition-colors">Returns</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-muted-foreground">
          <p>© 2024 Love the Cake. All rights reserved.</p>
          <p className="flex items-center gap-1">Made with <Heart className="w-4 h-4 text-primary fill-primary" /> and lots of sprinkles</p>
        </div>
      </div>
    </footer>
  );
}