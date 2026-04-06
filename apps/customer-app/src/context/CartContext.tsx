// apps/customer-app/src/context/CartContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

// Define CartItem interface
export interface CartItem {
  _id?: string;
  name: string;
  price: number;
  quantity: number;
  shopId: string;
  shopName: string;
  menuItemId?: string;
}

// Define CartContextType
interface CartContextType {
  items: CartItem[];
  currentShopId: string | null;
  currentShopName: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (item: Pick<CartItem, "shopId" | "menuItemId" | "name">) => void;
  updateQuantity: (item: Pick<CartItem, "shopId" | "menuItemId" | "name">, newQuantity: number) => void;
  clear: () => void;
  clearCartForNewShop: (shopId: string, shopName: string) => void;
  getCartTotal: () => number;
  getItemCount: () => number;
}

// Create context with default value
const CartContext = createContext<CartContextType | undefined>(undefined);

// Props for CartProvider
interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [currentShopId, setCurrentShopId] = useState<string | null>(null);
  const [currentShopName, setCurrentShopName] = useState<string | null>(null);

  const matchesCartItem = (
    existingItem: CartItem,
    targetItem: Pick<CartItem, "shopId" | "menuItemId" | "name">
  ) => {
    const existingKey = existingItem.menuItemId || existingItem.name;
    const targetKey = targetItem.menuItemId || targetItem.name;

    return existingItem.shopId === targetItem.shopId && existingKey === targetKey;
  };

  const addItem = (item: CartItem) => {
    setItems(prev => {
      const itemId = item.menuItemId || item.name;
      const existing = prev.find(
        i => i.shopId === item.shopId && (i.menuItemId || i.name) === itemId
      );
      
      if (existing) {
        return prev.map(i =>
          i.shopId === item.shopId && (i.menuItemId || i.name) === itemId
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });

    if (!currentShopId) {
      setCurrentShopId(item.shopId);
      setCurrentShopName(item.shopName);
    }
  };

  const removeItem = (item: Pick<CartItem, "shopId" | "menuItemId" | "name">) => {
    setItems(prev => {
      const newItems = prev.filter(existingItem => !matchesCartItem(existingItem, item));
      const firstItem = newItems[0];

      setCurrentShopId(firstItem?.shopId || null);
      setCurrentShopName(firstItem?.shopName || null);

      return newItems;
    });
  };

  const updateQuantity = (item: Pick<CartItem, "shopId" | "menuItemId" | "name">, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(item);
      return;
    }
    
    setItems(prev => 
      prev.map(i => 
        matchesCartItem(i, item) ? { ...i, quantity: newQuantity } : i
      )
    );
  };

  const clear = () => {
    setItems([]);
    setCurrentShopId(null);
    setCurrentShopName(null);
  };

  const clearCartForNewShop = (shopId: string, shopName: string) => {
    setItems(prev => prev.filter(item => item.shopId === shopId));
    setCurrentShopId(shopId);
    setCurrentShopName(shopName);
  };

  const getCartTotal = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  const value: CartContextType = {
    items,
    currentShopId,
    currentShopName,
    addItem,
    removeItem,
    updateQuantity,
    clear,
    clearCartForNewShop,
    getCartTotal,
    getItemCount
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
