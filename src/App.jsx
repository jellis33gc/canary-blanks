import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { CartProvider } from '@/lib/cartStore.jsx';

// Public pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductPage from './pages/ProductPage';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Payment from './pages/Payment';
import Account from './pages/Account';
import Wishlist from './pages/Wishlist';
import Returns from './pages/Returns';
import Terms from './pages/Terms';
import Contact from './pages/Contact';

// Admin pages
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminReturns from './pages/admin/Returns';
import AdminCustomers from './pages/admin/Customers';
import AdminCategories from './pages/admin/Categories.jsx';
import AdminDiscounts from './pages/admin/Discounts';
import HomepageBuilder from './pages/admin/HomepageBuilder';
import AdminPromoBanners from './pages/admin/PromoBanners';
import AdminSettings from './pages/admin/Settings';
import AdminAttributes from './pages/admin/Attributes';
import AdminMenu from './pages/admin/Menu';
import AdminBrands from './pages/admin/Brands';
import AdminLoyalty from './pages/admin/Loyalty';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Storefront */}
      <Route path="/" element={<Home />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/product/:slug" element={<ProductPage />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
      <Route path="/account" element={<Account />} />
      <Route path="/account/orders" element={<Navigate to="/account" replace />} />
      <Route path="/wishlist" element={<Wishlist />} />
      <Route path="/returns" element={<Returns />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/contact" element={<Contact />} />
      {/* Redirects for legacy/footer links */}
      <Route path="/orders" element={<Navigate to="/account" replace />} />
      <Route path="/privacy" element={<Navigate to="/terms" replace />} />
      <Route path="/shipping" element={<Navigate to="/terms" replace />} />
      <Route path="/faq" element={<Navigate to="/terms" replace />} />

      {/* Admin */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="returns" element={<AdminReturns />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="attributes" element={<AdminAttributes />} />
        <Route path="menu" element={<AdminMenu />} />
        <Route path="discounts" element={<AdminDiscounts />} />
        <Route path="homepage" element={<HomepageBuilder />} />
        <Route path="promo-banners" element={<AdminPromoBanners />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="brands" element={<AdminBrands />} />
        <Route path="loyalty" element={<AdminLoyalty />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          {/* Payment page rendered completely standalone - outside Auth/Cart context */}
          <Route path="/payment" element={<Payment />} />

          {/* All other routes go through normal auth/cart flow */}
          <Route path="/*" element={
            <AuthProvider>
              <CartProvider>
                <AuthenticatedApp />
              </CartProvider>
            </AuthProvider>
          } />
        </Routes>
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App