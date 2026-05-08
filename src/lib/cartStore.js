import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: JSON.parse(localStorage.getItem('ltc_cart') || '[]'),
  
  addItem: (product, quantity = 1, variant = '', customOptions = {}) => {
    const items = get().items;
    const key = `${product.id}-${variant}`;
    const existing = items.find(i => `${i.product_id}-${i.variant}` === key);
    
    let newItems;
    if (existing) {
      newItems = items.map(i => 
        `${i.product_id}-${i.variant}` === key 
          ? { ...i, quantity: i.quantity + quantity }
          : i
      );
    } else {
      newItems = [...items, {
        product_id: product.id,
        product_name: product.name,
        variant,
        quantity,
        price: product.price,
        image: product.images?.[0] || '',
        custom_options: customOptions
      }];
    }
    localStorage.setItem('ltc_cart', JSON.stringify(newItems));
    set({ items: newItems });
  },

  removeItem: (productId, variant = '') => {
    const newItems = get().items.filter(i => !(i.product_id === productId && i.variant === variant));
    localStorage.setItem('ltc_cart', JSON.stringify(newItems));
    set({ items: newItems });
  },

  updateQuantity: (productId, variant = '', quantity) => {
    if (quantity <= 0) { get().removeItem(productId, variant); return; }
    const newItems = get().items.map(i => 
      i.product_id === productId && i.variant === variant ? { ...i, quantity } : i
    );
    localStorage.setItem('ltc_cart', JSON.stringify(newItems));
    set({ items: newItems });
  },

  clearCart: () => {
    localStorage.setItem('ltc_cart', '[]');
    set({ items: [] });
  },

  getSubtotal: () => {
    return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  getTotalItems: () => {
    return get().items.reduce((sum, i) => sum + i.quantity, 0);
  }
}));

export default useCartStore;