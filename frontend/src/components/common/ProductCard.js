"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { DEFAULT_PRODUCT_IMAGE } from "@/utils/constant";
import { useCart } from "@/components/context/CartContext";
import { FaXmark, FaChevronDown, FaChevronUp } from "react-icons/fa6";

export default function ProductCard({ product }) {
  const { addItem } = useCart();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullProduct, setFullProduct] = useState(null);

  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [allergensOpen, setAllergensOpen] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

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

      setTimeout(() => {
        closeOverlay();
      }, 700);
    } catch (error) {
      console.error("Erreur ajout panier :", error);
      setIsAdding(false);
    }
  }

  const displayedProduct = fullProduct || product;

  const categoryLabel = displayedProduct.category?.name || "Catégorie";
  const subcategoryLabel = displayedProduct.subcategory?.name || "";
  const productName = displayedProduct.name || "Nom du produit";
  const productPrice = displayedProduct.price || "0.00";
  const productDescription =
    displayedProduct.description || "Aucune description disponible.";

  const ingredientsText =
    displayedProduct.ingredients ||
    displayedProduct.flavors ||
    displayedProduct.saveurs ||
    "Informations sur les ingrédients et saveurs bientôt disponibles.";

  const allergensText =
    displayedProduct.allergens ||
    displayedProduct.allergenes ||
    "Informations sur les allergènes bientôt disponibles.";

  return (
    <>
      <button
        type="button"
        onClick={openOverlay}
        className="block w-full text-left"
      >
        <div className="group cursor-pointer">
          <div className="aspect-square overflow-hidden rounded-2xl bg-zinc-100">
            <img
              src={product.image_main?.trim() || DEFAULT_PRODUCT_IMAGE}
              onError={(e) => {
                e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
              }}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          <div className="pt-3">
            <p className="line-clamp-2 text-sm leading-snug text-black">
              {product.name}
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-700">
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Fermer la fenêtre produit"
          />

          <div className="absolute inset-0 overflow-y-auto p-2 sm:p-4 md:flex md:items-center md:justify-center">
            <div
              className="
                relative mx-auto w-full max-w-4xl overflow-hidden rounded-[24px]
                border border-white/10 bg-[#232325] text-white shadow-2xl
                h-[92dvh] sm:h-[88dvh] md:h-[82dvh] md:max-h-[820px]
              "
            >
              <div className="grid h-full grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
                {/* Image */}
                <div className="relative h-[240px] bg-zinc-200 sm:h-[280px] lg:h-full">
                  <img
                    src={
                      displayedProduct.image_main?.trim() ||
                      DEFAULT_PRODUCT_IMAGE
                    }
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                    }}
                    alt={displayedProduct.name}
                    className="h-full w-full object-cover"
                  />

                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent lg:hidden" />
                </div>

                {/* Colonne droite */}
                <div className="relative flex h-full min-h-0 flex-col">
                  <button
                    type="button"
                    onClick={closeOverlay}
                    className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                    aria-label="Fermer"
                  >
                    <FaXmark className="text-base" />
                  </button>

                  {/* Header fixe */}
                  <div className="shrink-0 px-5 pt-6 sm:px-7 sm:pt-7">
                    <div className="pr-12">
                      <p className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-400">
                        {categoryLabel}
                        {subcategoryLabel ? ` • ${subcategoryLabel}` : ""}
                      </p>

                      <h2 className="mt-3 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                        {productName}
                      </h2>

                      <p className="mt-3 text-lg font-medium text-zinc-200 sm:text-xl">
                        {productPrice} €
                      </p>
                    </div>
                  </div>

                  {/* Zone scrollable fixe */}
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                    <div className="max-w-lg">
                      <div className="rounded-3xl border border-zinc-200/10 bg-white/95 p-5 text-black shadow-sm backdrop-blur-sm sm:p-6">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
                            Description
                          </p>
                        </div>

                        <div className="mt-3 h-px w-12 bg-zinc-200" />

                        <p className="mt-4 text-sm leading-7 text-zinc-700 sm:text-[15px]">
                          {productDescription}
                        </p>
                      </div>

                      <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                        <button
                          type="button"
                          onClick={() => setIngredientsOpen((prev) => !prev)}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]"
                        >
                          <span className="text-base font-medium text-white sm:text-lg">
                            Ingrédients et saveurs
                          </span>
                          {ingredientsOpen ? (
                            <FaChevronUp className="text-sm text-zinc-300" />
                          ) : (
                            <FaChevronDown className="text-sm text-zinc-300" />
                          )}
                        </button>

                        {ingredientsOpen && (
                          <div className="border-t border-white/10 px-5 pb-4 pt-1 text-sm leading-7 text-zinc-300">
                            {ingredientsText}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                        <button
                          type="button"
                          onClick={() => setAllergensOpen((prev) => !prev)}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]"
                        >
                          <span className="text-base font-medium text-white sm:text-lg">
                            Allergènes
                          </span>
                          {allergensOpen ? (
                            <FaChevronUp className="text-sm text-zinc-300" />
                          ) : (
                            <FaChevronDown className="text-sm text-zinc-300" />
                          )}
                        </button>

                        {allergensOpen && (
                          <div className="border-t border-white/10 px-5 pb-4 pt-1 text-sm leading-7 text-zinc-300">
                            {allergensText}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer fixe */}
                  <div className="shrink-0 border-t border-white/10 bg-[#232325]/95 px-5 py-5 backdrop-blur sm:px-7 sm:py-6">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={isAdding}
                      className={`mx-auto block w-full max-w-[280px] rounded-full px-6 py-4 text-sm font-semibold text-white transition-all duration-300 ${
                        added
                          ? "bg-emerald-500"
                          : "bg-white/15 hover:bg-white/20"
                      } ${isAdding ? "cursor-not-allowed opacity-80" : ""}`}
                    >
                      {isAdding
                        ? "Ajout..."
                        : added
                          ? "Ajouté ✔"
                          : "Ajouter au panier"}
                    </button>
                  </div>
                </div>
              </div>

              {loading && !fullProduct && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm text-white backdrop-blur">
                    Chargement...
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
