import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Tag, Settings,
  Star, Home, ChevronRight, Menu, X, Upload, Grid3X3, BarChart2, Megaphone, Layers, List
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { path: "/admin/products", icon: Package, label: "Products" },
  { path: "/admin/orders", icon: ShoppingCart, label: "Orders" },
  { path: "/admin/customers", icon: Users, label: "Customers" },
  { path: "/admin/categories", icon: Grid3X3, label: "Categories" },
  { path: "/admin/attributes", icon: Layers, label: "Attributes" },
  { path: "/admin/menu", icon: List, label: "Menu" },
  { path: "/admin/discounts", icon: Tag, label: "Discount Codes" },
  { path: "/admin/homepage", icon: Home, label: "Homepage Builder" },
  { path: "/admin/promo-banners", icon: Megaphone, label: "Promo Banners" },
  { path: "/admin/brands", icon: Star, label: "Brands" },
  { path: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u.role !== 'admin') navigate('/');
      setUser(u);
    }).catch(() => navigate('/'));
  }, []);

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} shrink-0 bg-white border-r border-border transition-all duration-300 flex flex-col fixed h-full z-40`}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          {sidebarOpen && <img src="https://media.base44.com/images/public/6a0f27c6efeb5eb47a953fea/bf3dabfaf_BirtishFoodStores.png" alt="British Food Stores" className="h-10 w-auto" />}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-muted">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${active ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <item.icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        {sidebarOpen && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-sm">{user.full_name?.charAt(0)}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user.full_name}</p>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
            </div>
            <Link to="/" className="mt-3 flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
              <Home className="w-3 h-3" /> View Store
            </Link>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-16'} transition-all duration-300`}>
        <div className="p-6 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}