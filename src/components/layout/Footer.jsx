import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function Footer() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleAdminClick = async () => {
    const authed = await base44.auth.isAuthenticated();
    if (authed) {
      navigate('/admin');
    } else {
      base44.auth.redirectToLogin('/admin');
    }
  };

  return (
    <footer className="bg-background border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <img
              src="https://media.base44.com/images/public/6a3fafd9aa6b3dbb7c575d28/54eb08088_CanaryBlankslogo.png"
              alt="CanaryBlanks"
              className="h-16 w-auto mb-3"
            />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your one-stop shop for premium sublimation blanks, heat-press supplies, and craft essentials for makers and creators.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/shop" className="hover:text-primary transition-colors">All Products</Link></li>
              <li><Link to="/shop?sale=true" className="hover:text-primary transition-colors">Sale Items</Link></li>
              <li><Link to="/shop?featured=true" className="hover:text-primary transition-colors">Featured</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/shipping" className="hover:text-primary transition-colors">Shipping Info</Link></li>
              <li><Link to="/returns" className="hover:text-primary transition-colors">Returns</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link to="/orders" className="hover:text-primary transition-colors">Track Order</Link></li>
              <li><button onClick={handleAdminClick} className="hover:text-primary transition-colors text-left">Admin</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Newsletter</h4>
            <p className="text-sm text-muted-foreground mb-4">Subscribe for exclusive deals and new blank alerts!</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Your email"
                className="flex-1 border border-input bg-input/40 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
                Join
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-muted-foreground">
          <p>© 2026 CanaryBlanks. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Use</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}