"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);

// Ne pas renommer : les paniers en cours des clients sont stockés sous ces clés.
const STORAGE_KEY = "su_rice_cart_v1";
const SAVED_KEY   = "su_rice_cart_saved";

function safeParse(json, fallback) {
  try {
    return JSON.parse(json) ?? fallback;
  } catch {
    return fallback;
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]); // [{id, slug, name, price, image_main, quantity}]
  // Lot H5 : vrai une fois le panier relu depuis localStorage. Avant, un
  // panier vide ne veut rien dire (il n'est pas encore chargé).
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage once
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setItems(safeParse(saved, []));
    setHydrated(true);
  }, []);

  // Persist to localStorage (jamais avant le chargement, sinon on écraserait
  // le panier enregistré par un panier vide)
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

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

  // Remet un article supprimé à sa place (bouton « Annuler »).
  const restoreItem = (item, index) => {
    setItems((prev) => {
      if (prev.some((x) => x.id === item.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, item);
      return next;
    });
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

  /**
   * Aligne le panier sur le catalogue actuel (lot H5) : prix et noms à jour,
   * produits devenus indisponibles retirés. Ne change aucun prix en base :
   * le panier affiche simplement le prix que le serveur facturera.
   * Renvoie la liste des changements pour l'afficher au client.
   */
  const syncWithCatalog = (products) => {
    if (!Array.isArray(products) || products.length === 0) return [];
    const byId = new Map(products.map((p) => [p.id, p]));
    const changes = [];
    const next = [];
    for (const it of items) {
      const p = byId.get(it.id);
      if (!p) {
        changes.push({ type: "removed", name: it.name });
        continue;
      }
      const price = Number(p.price);
      if (price !== Number(it.price)) {
        changes.push({ type: "price", name: p.name, from: Number(it.price), to: price });
      }
      next.push({ ...it, name: p.name, slug: p.slug, price, image_main: p.image_main ?? it.image_main });
    }
    if (changes.length > 0) setItems(next);
    return changes;
  };

  const clear = () => setItems([]);

  const saveAndClear = () => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(items));
    setItems([]);
  };

  const restoreFromSave = () => {
    const saved = localStorage.getItem(SAVED_KEY);
    if (saved) {
      setItems(safeParse(saved, []));
      localStorage.removeItem(SAVED_KEY);
    }
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, x) => sum + Number(x.price) * x.quantity, 0);
  }, [items]);

  const count = useMemo(() => {
    return items.reduce((sum, x) => sum + x.quantity, 0);
  }, [items]);

  const value = {
    items,
    hydrated,
    addItem,
    removeItem,
    restoreItem,
    setQuantity,
    increment,
    decrement,
    syncWithCatalog,
    clear,
    saveAndClear,
    restoreFromSave,
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
