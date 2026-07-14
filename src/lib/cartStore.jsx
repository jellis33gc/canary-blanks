import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useCartTracking } from "@/components/marketing/useCartTracking";

const CartContext = createContext(null);

const loadCart = () => {
  try { return JSON.parse(localStorage.getItem('ltc_cart') || '[]'); } catch { return []; }
};

const saveCart = (items) => localStorage.setItem('ltc_cart', JSON.stringify(items));

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const { trackCart, setEmail: setCartEmail } = useCartTracking();

  // Mirror the (localStorage) cart server-side for abandoned-cart detection. Best-effort:
  // trackCart itself swallows errors so this never blocks the shopping experience.
  useEffect(() => {
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    trackCart({ items, total, checkoutUrl: `${window.location.origin}/cart` });
  }, [items, trackCart]);

  const addItem = useCallback((product, quantity = 1, variant = '', customOptions = {}) => {
    setItems(prev => {
      const key = `${product.id}-${variant}`;
      const existing = prev.find(i => `${i.product_id}-${i.variant}` === key);
      const newItems = existing
        ? prev.map(i => `${i.product_id}-${i.variant}` === key ? { ...i, quantity: i.quantity + quantity, is_backorder: i.is_backorder || product.is_backorder || false, backorder_date: i.backorder_date || product.backorder_date || '' } : i)
        : [...prev, { product_id: product.id, product_name: product.name, variant, quantity, price: product.price, image: product.images?.[0] || '', custom_options: customOptions, is_backorder: product.is_backorder || false, backorder_date: product.backorder_date || '' }];
      saveCart(newItems);
      return newItems;
    });
  }, []);

  const removeItem = useCallback((productId, variant = '') => {
    setItems(prev => {
      const newItems = prev.filter(i => !(i.product_id === productId && i.variant === variant));
      saveCart(newItems);
      return newItems;
    });
  }, []);

  const updateQuantity = useCallback((productId, variant = '', quantity) => {
    if (quantity <= 0) { removeItem(productId, variant); return; }
    setItems(prev => {
      const newItems = prev.map(i => i.product_id === productId && i.variant === variant ? { ...i, quantity } : i);
      saveCart(newItems);
      return newItems;
    });
  }, [removeItem]);

  const clearCart = useCallback(() => {
    saveCart([]);
    setItems([]);
  }, []);

  const getSubtotal = useCallback(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
  const getTotalItems = useCallback(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, getSubtotal, getTotalItems, setCartEmail }}>
      {children}
    </CartContext.Provider>
  );
}

export default function useCartStore() {
  return useContext(CartContext);
}