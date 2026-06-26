import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { CartItem } from "@vyaha/api-client";

type CartContextType = {
  items: CartItem[];
  currentShopId: string | null;
  currentShopName: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (item: Pick<CartItem, "shopId" | "menuItemId" | "name">) => void;
  updateQuantity: (item: Pick<CartItem, "shopId" | "menuItemId" | "name">, qty: number) => void;
  clear: () => void;
  getCartTotal: () => number;
  getItemCount: () => number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const matches = (a: CartItem, b: Pick<CartItem, "shopId" | "menuItemId" | "name">) => {
  const aKey = a.menuItemId || a.name;
  const bKey = b.menuItemId || b.name;
  return a.shopId === b.shopId && aKey === bKey;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [currentShopId, setCurrentShopId] = useState<string | null>(null);
  const [currentShopName, setCurrentShopName] = useState<string | null>(null);

  const value = useMemo<CartContextType>(
    () => ({
      items,
      currentShopId,
      currentShopName,
      addItem: (item) => {
        setItems((prev) => {
          const key = item.menuItemId || item.name;
          const existing = prev.find((i) => i.shopId === item.shopId && (i.menuItemId || i.name) === key);
          if (existing) {
            return prev.map((i) =>
              i.shopId === item.shopId && (i.menuItemId || i.name) === key
                ? { ...i, quantity: i.quantity + (item.quantity || 1) }
                : i
            );
          }
          return [...prev, { ...item, quantity: item.quantity || 1 }];
        });
        setCurrentShopId((prev) => prev || item.shopId);
        setCurrentShopName((prev) => prev || item.shopName);
      },
      removeItem: (target) => {
        setItems((prev) => {
          const next = prev.filter((i) => !matches(i, target));
          setCurrentShopId(next[0]?.shopId || null);
          setCurrentShopName(next[0]?.shopName || null);
          return next;
        });
      },
      updateQuantity: (target, qty) => {
        if (qty < 1) {
          setItems((prev) => {
            const next = prev.filter((i) => !matches(i, target));
            setCurrentShopId(next[0]?.shopId || null);
            setCurrentShopName(next[0]?.shopName || null);
            return next;
          });
          return;
        }
        setItems((prev) => prev.map((i) => (matches(i, target) ? { ...i, quantity: qty } : i)));
      },
      clear: () => {
        setItems([]);
        setCurrentShopId(null);
        setCurrentShopName(null);
      },
      getCartTotal: () => items.reduce((t, i) => t + i.price * i.quantity, 0),
      getItemCount: () => items.reduce((c, i) => c + i.quantity, 0)
    }),
    [items, currentShopId, currentShopName]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
