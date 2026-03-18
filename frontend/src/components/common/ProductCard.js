"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { DEFAULT_PRODUCT_IMAGE } from "@/utils/constant";
import { useCart } from "@/components/context/CartContext";
import { FaXmark } from "react-icons/fa6";

export default function ProductCard({ product }) {
  const { addItem } = useCart();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullProduct, setFullProduct] = useState(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeOverlay();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function openOverlay() {
    setOpen(true);

    if (fullProduct) return;

    setLoading(true);

    try {
      const res = await api.get(`products/${product.slug}/`);
      setFullProduct(res.data);
    } catch (error) {
      console.error("Erreur lors du chargement du produit :", error);
    } finally {
      setLoading(false);
    }
  }

  function closeOverlay() {
    setOpen(false);
  }

  const displayedProduct = fullProduct || product;

  return (
    <>
      <button
        type="button"
        onClick={openOverlay}
        className="block w-full text-left"
      >
        <div className="cursor-pointer group">
          <div className="aspect-square overflow-hidden bg-gray-200">
            <img
              src={product.image_main?.trim() || DEFAULT_PRODUCT_IMAGE}
              onError={(e) => (e.currentTarget.src = DEFAULT_PRODUCT_IMAGE)}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          <div className="pt-2">
            <p className="line-clamp-2 text-sm leading-snug text-black">
              {product.name}
            </p>
            <p className="text-sm font-medium text-black">
              {product.price} €
            </p>
          </div>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-[120]">
          <button
            type="button"
            onClick={closeOverlay}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Fermer la fenêtre produit"
          />

          <div className="absolute inset-x-3 top-1/2 max-h-[90vh] -translate-y-1/2 overflow-hidden rounded-[28px] bg-white shadow-2xl md:inset-x-auto md:left-1/2 md:w-full md:max-w-4xl md:-translate-x-1/2">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 md:px-6">
              <div className="min-w-0 pr-4">
                <h2 className="truncate text-xl font-semibold text-zinc-900 md:text-2xl">
                  {displayedProduct.name}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {displayedProduct.category?.name}
                  {displayedProduct.subcategory?.name
                    ? ` • ${displayedProduct.subcategory.name}`
                    : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={closeOverlay}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 transition hover:bg-zinc-100"
                aria-label="Fermer"
              >
                <FaXmark className="text-lg" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-80px)] overflow-y-auto">
              {loading && !fullProduct ? (
                <div className="p-6 text-sm text-zinc-500">Chargement...</div>
              ) : (
                <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2 md:gap-8 md:p-6">
                  <div className="overflow-hidden rounded-3xl bg-zinc-100">
                    <img
                      src={
                        displayedProduct.image_main?.trim() ||
                        DEFAULT_PRODUCT_IMAGE
                      }
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                      }}
                      alt={displayedProduct.name}
                      className="h-[280px] w-full object-cover md:h-[460px]"
                    />
                  </div>

                  <div className="flex flex-col">
                    <div>
                      <div className="text-3xl font-bold text-zinc-900 md:text-4xl">
                        {displayedProduct.price} €
                      </div>

                      {displayedProduct.description ? (
                        <p className="mt-5 text-base leading-7 text-zinc-600">
                          {displayedProduct.description}
                        </p>
                      ) : (
                        <p className="mt-5 text-base leading-7 text-zinc-400">
                          Aucune description disponible pour ce produit.
                        </p>
                      )}
                    </div>

                    <div className="mt-6 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Catégorie</span>
                        <span className="font-medium text-zinc-900">
                          {displayedProduct.category?.name || "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Sous-catégorie</span>
                        <span className="font-medium text-zinc-900">
                          {displayedProduct.subcategory?.name || "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Disponibilité</span>
                        <span className="font-medium text-zinc-900">
                          {displayedProduct.is_available
                            ? "Disponible"
                            : "Indisponible"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => addItem(displayedProduct, 1)}
                        className="inline-flex items-center justify-center rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                      >
                        Ajouter au panier
                      </button>

                      <button
                        type="button"
                        onClick={closeOverlay}
                        className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
                      >
                        Continuer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}