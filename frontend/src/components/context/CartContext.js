"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "su_rice_cart_v1";

function safeParse(json, fallback) {
  try {
    return JSON.parse(json) ?? fallback;
  } catch {
    return fallback;
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]); // [{id, slug, name, price, image_main, quantity}]

  // Load from localStorage once
  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) setItems(safeParse(saved, []));
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product, qty = 1) => {
    if (!product?.id) return;
    const quantityToAdd = Number.isFinite(qty) ? qty : 1;

    setItems((prev) => {
      const existing = prev.find((x) => x.id === product.id);
      if (existing) {
        return prev.map((x) =>
          x.id === product.id
            ? { ...x, quantity: x.quantity + quantityToAdd }
            : x,
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: Number(product.price),
          image_main: product.image_main ?? "",
          quantity: quantityToAdd,
        },
      ];
    });
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((x) => x.id !== productId));
  };

  const setQuantity = (productId, quantity) => {
    const q = Math.max(1, parseInt(quantity, 10) || 1);
    setItems((prev) =>
      prev.map((x) => (x.id === productId ? { ...x, quantity: q } : x)),
    );
  };

  const increment = (productId) => {
    setItems((prev) =>
      prev.map((x) =>
        x.id === productId ? { ...x, quantity: x.quantity + 1 } : x,
      ),
    );
  };

  const decrement = (productId) => {
    setItems((prev) =>
      prev.map((x) =>
        x.id === productId
          ? { ...x, quantity: Math.max(1, x.quantity - 1) }
          : x,
      ),
    );
  };

  const clear = () => setItems([]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, x) => sum + Number(x.price) * x.quantity, 0);
  }, [items]);

  const count = useMemo(() => {
    return items.reduce((sum, x) => sum + x.quantity, 0);
  }, [items]);

  const value = {
    items,
    addItem,
    removeItem,
    setQuantity,
    increment,
    decrement,
    clear,
    subtotal,
    count,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
