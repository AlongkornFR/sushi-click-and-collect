"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/context/CartContext";
import { useCatalog } from "@/hooks/useCatalog";
import { formatEUR } from "@/utils/formatting";

/**
 * Lot H5 : relit le catalogue et met le panier à jour (prix, produits
 * retirés de la carte). Affiche ce qui a changé, pour que le client ne
 * découvre pas un autre montant sur la page de paiement.
 */
export default function CartSyncNotice() {
  const { hydrated, syncWithCatalog } = useCart();
  const { products } = useCatalog();
  const [changes, setChanges] = useState([]);

  useEffect(() => {
    if (!hydrated || products.length === 0) return;
    const found = syncWithCatalog(products);
    if (found.length > 0) setChanges(found);
    // Une synchronisation par chargement du catalogue suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, products]);

  if (changes.length === 0) return null;

  return (
    <div role="status" className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
      <p className="font-semibold">Votre panier a été mis à jour</p>
      <ul className="mt-1 space-y-0.5">
        {changes.map((c, i) => (
          <li key={i}>
            {c.type === "removed"
              ? `${c.name} n'est plus disponible et a été retiré.`
              : `${c.name} : ${formatEUR(c.from)} → ${formatEUR(c.to)}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
