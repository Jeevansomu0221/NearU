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
  removeItem: (itemName: string) => void;
  updateQuantity: (itemName: string, newQuantity: number) => void;
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

  const addItem = (item: CartItem) => {
    setItems(prev => {
      // Check if we're switching shops
      if (currentShopId && item.shopId !== currentShopId) {
        // Clear cart and switch to new shop
        setCurrentShopId(item.shopId);
        setCurrentShopName(item.shopName);
        return [{ ...item, quantity: item.quantity || 1 }];
      }
      
      // Set current shop if not set
      if (!currentShopId) {
        setCurrentShopId(item.shopId);
        setCurrentShopName(item.shopName);
      }

      // Use menuItemId if available, otherwise use name
      const itemId = item.menuItemId || item.name;
      const existing = prev.find(i => (i.menuItemId || i.name) === itemId);
      
      if (existing) {
        return prev.map(i =>
          (i.menuItemId || i.name) === itemId
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  };

  const removeItem = (itemName: string) => {
    setItems(prev => {
      const newItems = prev.filter(i => i.name !== itemName);
      
      // If cart is empty, clear shop info
      if (newItems.length === 0) {
        setCurrentShopId(null);
        setCurrentShopName(null);
      }
      
      return newItems;
    });
  };

  const updateQuantity = (itemName: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemName);
      return;
    }
    
    setItems(prev => 
      prev.map(i => 
        i.name === itemName ? { ...i, quantity: newQuantity } : i
      )
    );
  };

  const clear = () => {
    setItems([]);
    setCurrentShopId(null);
    setCurrentShopName(null);
  };

  const clearCartForNewShop = (shopId: string, shopName: string) => {
    setItems([]);
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