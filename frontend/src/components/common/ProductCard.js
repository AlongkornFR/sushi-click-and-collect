"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/services/api";
import { DEFAULT_PRODUCT_IMAGE } from "@/utils/constant";
import { useCart } from "@/components/context/CartContext";
import { FaXmark, FaChevronDown, FaChevronUp, FaPlus } from "react-icons/fa6";

export default function ProductCard({ product }) {
  const { addItem } = useCart();

  const [open, setOpen]             = useState(false);
  const [loading, setLoading]       = useState(false);
  const [fullProduct, setFullProduct] = useState(null);

  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [allergensOpen, setAllergensOpen]     = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded]       = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => { if (e.key === "Escape") closeOverlay(); };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function openOverlay() {
    setOpen(true);
    setAdded(false);
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
    setIngredientsOpen(false);
    setAllergensOpen(false);
    setAdded(false);
    setIsAdding(false);
  }

  async function handleAddToCart() {
    if (isAdding) return;
    setIsAdding(true);
    try {
      addItem(displayedProduct, 1);
      setAdded(true);
      setTimeout(() => closeOverlay(), 800);
    } catch (error) {
      console.error("Erreur ajout panier :", error);
      setIsAdding(false);
    }
  }

  const displayedProduct   = fullProduct || product;
  const categoryLabel      = displayedProduct.category?.name    || "Catégorie";
  const subcategoryLabel   = displayedProduct.subcategory?.name || "";
  const productName        = displayedProduct.name              || "Nom du produit";
  const productPrice       = displayedProduct.price             || "0.00";
  const productDescription = displayedProduct.description       || "Aucune description disponible.";

  const ingredientsText =
    displayedProduct.ingredients ||
    displayedProduct.flavors     ||
    displayedProduct.saveurs     ||
    "Informations sur les ingrédients et saveurs bientôt disponibles.";

  const allergensText =
    displayedProduct.allergens  ||
    displayedProduct.allergenes ||
    "Informations sur les allergènes bientôt disponibles.";

  return (
    <>
      {/* ── Card thumbnail ── */}
      <button
        type="button"
        onClick={openOverlay}
        className="group block w-full cursor-pointer text-left"
      >
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100">
          <img
            src={product.image_main?.trim() || DEFAULT_PRODUCT_IMAGE}
            onError={(e) => { e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg">
              <FaPlus className="text-sm" />
            </span>
          </div>
        </div>

        <div className="pt-3">
          <p className="line-clamp-2 text-sm leading-snug text-zinc-900">
            {product.name}
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-700">
            {product.price} €
          </p>
        </div>
      </button>

      {/* ── Modal (portal → hors de tout parent overflow/stacking) ── */}
      {open && createPortal(
        <div className="fixed inset-0 z-[120]">
          {/* Backdrop */}
          <button
            type="button"
            onClick={closeOverlay}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            aria-label="Fermer la fenêtre produit"
          />

          <div className="absolute inset-0 overflow-y-auto p-2 sm:p-4 md:flex md:items-center md:justify-center">
            <div
              className="
                modal-enter
                relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl
                bg-[#1c1c1e] text-white shadow-2xl
                h-[92dvh] sm:h-[88dvh] md:h-[82dvh] md:max-h-[820px]
              "
            >
              <div className="grid h-full grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">

                {/* ── Image ── */}
                <div className="relative h-[220px] bg-zinc-900 sm:h-[260px] lg:h-full">
                  <img
                    src={displayedProduct.image_main?.trim() || DEFAULT_PRODUCT_IMAGE}
                    onError={(e) => { e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
                    alt={displayedProduct.name}
                    className="h-full w-full object-cover"
                  />
                  {/* Bottom fade on mobile */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#1c1c1e] to-transparent lg:hidden" />
                </div>

                {/* ── Right column ── */}
                <div className="relative flex h-full min-h-0 flex-col">

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={closeOverlay}
                    className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
                    aria-label="Fermer"
                  >
                    <FaXmark className="text-sm" />
                  </button>

                  {/* Header */}
                  <div className="shrink-0 px-6 pb-0 pt-6 pr-14 sm:px-8 sm:pt-8">
                    <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                      {categoryLabel}{subcategoryLabel ? ` · ${subcategoryLabel}` : ""}
                    </span>

                    <h2 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">
                      {productName}
                    </h2>

                    <p className="mt-2 text-xl font-semibold text-white">
                      {productPrice} <span className="text-base font-normal text-zinc-400">€</span>
                    </p>
                  </div>

                  {/* Scrollable zone */}
                  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">

                    {/* Description */}
                    <p className="text-sm leading-7 text-zinc-300 sm:text-[15px]">
                      {productDescription}
                    </p>

                    <div className="mt-6 h-px bg-white/10" />

                    {/* Ingredients accordion */}
                    <button
                      type="button"
                      onClick={() => setIngredientsOpen((p) => !p)}
                      className="flex w-full cursor-pointer items-center justify-between py-4 text-left"
                    >
                      <span className="text-sm font-semibold text-white">Ingrédients et saveurs</span>
                      {ingredientsOpen
                        ? <FaChevronUp className="text-xs text-zinc-500" />
                        : <FaChevronDown className="text-xs text-zinc-500" />
                      }
                    </button>
                    {ingredientsOpen && (
                      <p className="pb-4 text-sm leading-7 text-zinc-400">{ingredientsText}</p>
                    )}

                    <div className="h-px bg-white/10" />

                    {/* Allergens accordion */}
                    <button
                      type="button"
                      onClick={() => setAllergensOpen((p) => !p)}
                      className="flex w-full cursor-pointer items-center justify-between py-4 text-left"
                    >
                      <span className="text-sm font-semibold text-white">Allergènes</span>
                      {allergensOpen
                        ? <FaChevronUp className="text-xs text-zinc-500" />
                        : <FaChevronDown className="text-xs text-zinc-500" />
                      }
                    </button>
                    {allergensOpen && (
                      <p className="pb-4 text-sm leading-7 text-zinc-400">{allergensText}</p>
                    )}

                    <div className="h-px bg-white/10" />
                  </div>

                  {/* Footer */}
                  <div className="shrink-0 border-t border-white/10 px-6 py-5 sm:px-8">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={isAdding}
                      className={`w-full rounded-xl py-4 text-sm font-semibold transition-all duration-300 active:scale-[.98] ${
                        added
                          ? "cursor-default bg-emerald-500 text-white"
                          : isAdding
                            ? "cursor-not-allowed bg-white/70 text-black opacity-70"
                            : "cursor-pointer bg-white text-black hover:bg-zinc-100"
                      }`}
                    >
                      {isAdding ? "Ajout en cours…" : added ? "✔ Ajouté au panier" : "Ajouter au panier"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Loading overlay */}
              {loading && !fullProduct && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                  <div className="rounded-full border border-white/10 bg-white/10 px-6 py-3 text-sm text-white">
                    Chargement…
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
