"use client";

import useSWR from "swr";
import { api } from "@/services/api";

const fetcher = (url) => api.get(url).then(r => (Array.isArray(r.data) ? r.data : []));

/**
 * Catalogue des produits disponibles, partagé entre le menu, le panier et le
 * checkout (même clé SWR : une seule requête, un seul cache).
 */
export function useCatalog() {
  const { data, error, isLoading, mutate } = useSWR("products/", fetcher, {
    dedupingInterval: 60 * 1000,
    revalidateOnFocus: false,
    onError: (err) => console.error("Erreur lors du chargement des produits :", err),
  });
  return { products: data ?? [], error, isLoading, reload: () => mutate() };
}
