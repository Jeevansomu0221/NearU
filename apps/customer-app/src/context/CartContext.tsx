// apps/customer-app/src/context/CartContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

export interface SelectedExtra {
  name: string;
  price: number;
}

export interface CartItem {
  _id?: string;
  name: string;
  price: number;
  quantity: number;
  shopId: string;
  shopName: string;
  menuItemId?: string;
  selectedExtras?: SelectedExtra[];
  cookingRequest?: string;
  lineKey?: string;
}

export type CartItemRef = Pick<CartItem, "shopId" | "menuItemId" | "name" | "lineKey">;

export const buildCartLineKey = (
  menuItemId: string,
  selectedExtras: SelectedExtra[] = [],
  cookingRequest = ""
) => {
  const extrasKey = selectedExtras
    .map((extra) => extra.name)
    .sort()
    .join(",");
  const cookingKey = cookingRequest.trim().toLowerCase();
  return `${menuItemId}|${extrasKey}|${cookingKey}`;
};

interface CartContextType {
  items: CartItem[];
  currentShopId: string | null;
  currentShopName: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (item: CartItemRef) => void;
  updateQuantity: (item: CartItemRef, newQuantity: number) => void;
  clear: () => void;
  clearCartForNewShop: (shopId: string, shopName: string) => void;
  getCartTotal: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [currentShopId, setCurrentShopId] = useState<string | null>(null);
  const [currentShopName, setCurrentShopName] = useState<string | null>(null);

  const matchesCartItem = (existingItem: CartItem, targetItem: CartItemRef) => {
    if (existingItem.lineKey && targetItem.lineKey) {
      return (
        existingItem.shopId === targetItem.shopId &&
        existingItem.lineKey === targetItem.lineKey
      );
    }

    const existingKey = existingItem.menuItemId || existingItem.name;
    const targetKey = targetItem.menuItemId || targetItem.name;

    return existingItem.shopId === targetItem.shopId && existingKey === targetKey;
  };

  const addItem = (item: CartItem) => {
    const menuItemId = item.menuItemId || item._id || item.name;
    const lineKey =
      item.lineKey ||
      buildCartLineKey(menuItemId, item.selectedExtras || [], item.cookingRequest || "");
    const normalizedItem = { ...item, lineKey };

    setItems((prev) => {
      const existing = prev.find((entry) => matchesCartItem(entry, normalizedItem));

      if (existing) {
        return prev.map((entry) =>
          matchesCartItem(entry, normalizedItem)
            ? { ...entry, quantity: entry.quantity + (item.quantity || 1) }
            : entry
        );
      }

      return [...prev, { ...normalizedItem, quantity: item.quantity || 1 }];
    });

    if (!currentShopId) {
      setCurrentShopId(item.shopId);
      setCurrentShopName(item.shopName);
    }
  };

  const removeItem = (item: CartItemRef) => {
    setItems((prev) => {
      const newItems = prev.filter((existingItem) => !matchesCartItem(existingItem, item));
      const firstItem = newItems[0];

      setCurrentShopId(firstItem?.shopId || null);
      setCurrentShopName(firstItem?.shopName || null);

      return newItems;
    });
  };

  const updateQuantity = (item: CartItemRef, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(item);
      return;
    }

    setItems((prev) =>
      prev.map((entry) =>
        matchesCartItem(entry, item) ? { ...entry, quantity: newQuantity } : entry
      )
    );
  };

  const clear = () => {
    setItems([]);
    setCurrentShopId(null);
    setCurrentShopName(null);
  };

  const clearCartForNewShop = (shopId: string, shopName: string) => {
    setItems((prev) => prev.filter((item) => item.shopId === shopId));
    setCurrentShopId(shopId);
    setCurrentShopName(shopName);
  };

  const getCartTotal = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
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

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
