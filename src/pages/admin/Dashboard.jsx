import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ShoppingCart, Package, Users, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";

export default function Dashboard() {
  const [stats, setStats] = useState({ orders: [], products: [], customers: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Order.list("-created_date", 100),
      base44.entities.Product.list("-created_date", 200),
      base44.entities.CustomerProfile.list("-created_date", 200),
    ]).then(([orders, products, customers]) => {
      setStats({ orders, products, customers });
      setLoading(false);
    });
  }, []);

  const revenue = stats.orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.total || 0), 0);
  const pendingOrders = stats.orders.filter(o => o.status === 'pending');
  const lowStock = stats.products.filter(p => p.stock_quantity !== undefined && p.stock_quantity < 5);

  // Sales by day (last 7 days)
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayOrders = stats.orders.filter(o => o.created_date?.startsWith(dateStr));
    return {
      day: format(date, "EEE"),
      orders: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + (o.total || 0), 0)
    };
  });

  const statCards = [
    { label: "Total Revenue", value: `£${revenue.toFixed(2)}`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Total Orders", value: stats.orders.length, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Products", value: stats.products.length, icon: Package, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Customers", value: stats.customers.length, icon: Users, color: "text-pink-600", bg: "bg-pink-50" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-brand text-3xl text-primary">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your store overview.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
              <div className={`p-2 rounded-xl ${card.bg}`}><card.icon className={`w-5 h-5 ${card.color}`} /></div>
            </div>
            <p className="text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="font-bold mb-4">Orders (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="font-bold mb-4">Revenue (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `£${v.toFixed(2)}`} />
              <Bar dataKey="revenue" fill="hsl(var(--secondary))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending orders */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-yellow-500" />
            <h2 className="font-bold">Pending Orders ({pendingOrders.length})</h2>
            <Link to="/admin/orders" className="ml-auto text-xs text-primary underline">View all</Link>
          </div>
          {pendingOrders.slice(0, 5).map(o => (
            <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div><p className="font-medium text-sm">{o.order_number}</p><p className="text-xs text-muted-foreground">{o.customer_name}</p></div>
              <p className="font-bold text-sm">£{o.total?.toFixed(2)}</p>
            </div>
          ))}
          {pendingOrders.length === 0 && <p className="text-sm text-muted-foreground">No pending orders 🎉</p>}
        </div>

        {/* Low stock */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h2 className="font-bold">Low Stock Alert ({lowStock.length})</h2>
            <Link to="/admin/products" className="ml-auto text-xs text-primary underline">Manage</Link>
          </div>
          {lowStock.slice(0, 5).map(p => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <p className="font-medium text-sm">{p.name}</p>
              <p className={`text-sm font-bold ${p.stock_quantity === 0 ? 'text-red-500' : 'text-yellow-600'}`}>{p.stock_quantity === 0 ? 'Out of stock' : `${p.stock_quantity} left`}</p>
            </div>
          ))}
          {lowStock.length === 0 && <p className="text-sm text-muted-foreground">All products in stock ✅</p>}
        </div>
      </div>
    </div>
  );
}