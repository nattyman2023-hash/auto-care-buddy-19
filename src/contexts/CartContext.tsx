import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface CartItem {
  id: string;
  type: "service" | "product";
  serviceId?: string;
  productId?: string;
  name: string;
  price: number;
  duration?: number;
  category: string;
  quantity: number;
  image_url?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (service: { id: string; name: string; base_price: number; duration_minutes: number; category: string }) => void;
  addProductToCart: (product: { id: string; name: string; price: number; category: string; image_url?: string }) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  totalDuration: number;
  itemCount: number;
  productItemCount: number;
  productTotal: number;
  serviceItems: CartItem[];
  productItems: CartItem[];
}

const CartContext = createContext<CartContextType>({
  items: [], addToCart: () => {}, addProductToCart: () => {}, removeFromCart: () => {}, updateQuantity: () => {},
  clearCart: () => {}, total: 0, totalDuration: 0, itemCount: 0, productItemCount: 0, productTotal: 0, serviceItems: [], productItems: [],
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("salon-cart");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("salon-cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (service: { id: string; name: string; base_price: number; duration_minutes: number; category: string }) => {
    setItems(prev => {
      const existing = prev.find(i => i.type === "service" && i.serviceId === service.id);
      if (existing) {
        return prev.map(i => i.type === "service" && i.serviceId === service.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        id: crypto.randomUUID(), type: "service" as const, serviceId: service.id,
        name: service.name, price: service.base_price, duration: service.duration_minutes,
        category: service.category, quantity: 1,
      }];
    });
  };

  const addProductToCart = (product: { id: string; name: string; price: number; category: string; image_url?: string }) => {
    setItems(prev => {
      const existing = prev.find(i => i.type === "product" && i.productId === product.id);
      if (existing) {
        return prev.map(i => i.type === "product" && i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        id: crypto.randomUUID(), type: "product" as const, productId: product.id,
        name: product.name, price: product.price, category: product.category,
        quantity: 1, image_url: product.image_url,
      }];
    });
  };

  const removeFromCart = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) return removeFromCart(id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalDuration = items.filter(i => i.type === "service").reduce((sum, i) => sum + (i.duration || 0) * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const serviceItems = items.filter(i => i.type === "service");
  const productItems = items.filter(i => i.type === "product");
  const productItemCount = productItems.reduce((s, i) => s + i.quantity, 0);
  const productTotal = productItems.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, addProductToCart, removeFromCart, updateQuantity, clearCart, total, totalDuration, itemCount, productItemCount, productTotal, serviceItems, productItems }}>
      {children}
    </CartContext.Provider>
  );
};
