import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Package, Heart, Star, LogOut, Edit3, Save } from "lucide-react";
import LoyaltyTracker from "@/components/account/LoyaltyTracker";
import OrderHistory from "@/components/account/OrderHistory";
import { format } from "date-fns";

export default function Account() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [loyaltyHistory, setLoyaltyHistory] = useState([]);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ full_name: "", phone: "" });
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      let u;
      try {
        u = await base44.auth.me();
      } catch {
        base44.auth.redirectToLogin('/account');
        return;
      }

      setUser(u);
      setFormData({ full_name: u.full_name || "", phone: "" });

      try {
        const profiles = await base44.entities.CustomerProfile.filter({ user_id: u.id });
        let prof = profiles[0];
        if (!prof) {
          prof = await base44.entities.CustomerProfile.create({ user_id: u.id, email: u.email, loyalty_points: 0, total_spent: 0, total_orders: 0, wishlist: [] });
        }
        setProfile(prof);
        setFormData(f => ({ ...f, phone: prof.phone || "" }));

        if (prof.wishlist?.length > 0) {
          const all = await base44.entities.Product.filter({ is_active: true });
          setWishlistProducts(all.filter(p => prof.wishlist.includes(p.id)));
        }
      } catch (e) {
        console.error('Profile fetch error:', e);
      }

      try {
        const res = await base44.functions.invoke('getMyOrders', {});
        setOrders(res.data?.orders || []);
      } catch (e) {
        console.error('Orders fetch error:', e);
      }

      try {
        const transactions = await base44.entities.LoyaltyTransaction.filter({ customer_id: u.id }, "-created_date", 20);
        setLoyaltyHistory(transactions);
      } catch (e) {
        console.error('Loyalty fetch error:', e);
      }
    };
    init();
  }, []);

  const handleSave = async () => {
    await base44.auth.updateMe({ full_name: formData.full_name });
    if (profile) await base44.entities.CustomerProfile.update(profile.id, { phone: formData.phone });
    setEditing(false);
  };

  const handleLogout = () => base44.auth.logout('/');

  const statusColors = { pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-blue-100 text-blue-800", processing: "bg-purple-100 text-purple-800", shipped: "bg-cyan-100 text-cyan-800", delivered: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="gradient-fun text-white rounded-3xl p-6 mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl font-brand">
              {user.full_name?.charAt(0) || "🎂"}
            </div>
            <div>
              <h1 className="font-brand text-2xl">Hey, {user.full_name?.split(' ')[0] || 'Cake Lover'}! 👋</h1>
              <p className="opacity-90 text-sm">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {profile && (
              <div className="text-center bg-white/20 rounded-2xl px-4 py-2">
                <p className="font-brand text-2xl">{profile.loyalty_points}</p>
                <p className="text-xs opacity-90">Loyalty Points</p>
              </div>
            )}
            <Button variant="outline" size="sm" className="border-white text-white hover:bg-white/20 rounded-full" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="rounded-full bg-muted mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="profile" className="rounded-full"><User className="w-4 h-4 mr-1" />Profile</TabsTrigger>
            <TabsTrigger value="orders" className="rounded-full"><Package className="w-4 h-4 mr-1" />Orders</TabsTrigger>
            <TabsTrigger value="wishlist" className="rounded-full"><Heart className="w-4 h-4 mr-1" />Wishlist</TabsTrigger>
            <TabsTrigger value="loyalty" className="rounded-full"><Star className="w-4 h-4 mr-1" />Loyalty</TabsTrigger>
          </TabsList>

          {/* Profile */}
          <TabsContent value="profile">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">Personal Details</h2>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => editing ? handleSave() : setEditing(true)}>
                  {editing ? <><Save className="w-4 h-4 mr-1" />Save</> : <><Edit3 className="w-4 h-4 mr-1" />Edit</>}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Full Name</Label>
                  {editing ? <Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="rounded-xl" /> : <p className="font-medium">{user.full_name || '—'}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  {editing ? <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="rounded-xl" /> : <p className="font-medium">{profile?.phone || '—'}</p>}
                </div>
              </div>
              {profile && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center"><p className="text-2xl font-bold text-primary">{profile.total_orders || 0}</p><p className="text-xs text-muted-foreground">Orders</p></div>
                  <div className="text-center"><p className="text-2xl font-bold text-primary">€{(profile.total_spent || 0).toFixed(0)}</p><p className="text-xs text-muted-foreground">Total Spent</p></div>
                  <div className="text-center"><p className="text-2xl font-bold text-primary">{profile.loyalty_points || 0}</p><p className="text-xs text-muted-foreground">Points</p></div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Orders */}
          <TabsContent value="orders">
            <OrderHistory orders={orders} />
          </TabsContent>

          {/* Wishlist */}
          <TabsContent value="wishlist">
            {wishlistProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Your wishlist is empty. <Link to="/shop" className="text-primary underline">Browse products</Link></p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {wishlistProducts.map(p => (
                  <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="aspect-square bg-muted">
                      {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center text-4xl">🎂</div>}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      <p className="text-primary font-bold">€{p.price?.toFixed(2)}</p>
                      <Link to={`/product/${p.slug || p.id}`} className="text-xs text-primary underline mt-1 block">View Product</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Loyalty */}
          <TabsContent value="loyalty">
            <LoyaltyTracker
              profile={profile}
              loyaltyHistory={loyaltyHistory}
              onPointsRedeemed={(newPoints) => setProfile(p => ({ ...p, loyalty_points: newPoints }))}
            />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}