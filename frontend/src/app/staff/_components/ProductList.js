"use client";

import { useEffect, useState } from "react";
import ProductImage from "@/components/common/ProductImage";
import { StatCard, StatCardSkeleton, ProductRowSkeleton } from "./StatCard";
import { FaPlus, FaList, FaTh } from "react-icons/fa";

export default function ProductList({
  fetching,
  products,
  filteredProducts,
  paginatedProducts,
  categories,
  visibleSubcategories,
  selectedCategory,
  setSelectedCategory,
  selectedSubCategory,
  setSelectedSubCategory,
  totalPages,
  currentPage,
  onPageChange,
  onOpenCreate,
  onOpenEdit,
  onReorder,
}) {
  const availableCount   = products.filter(p => p.is_available).length;
  const unavailableCount = products.filter(p => !p.is_available).length;

  // View mode (list | grid), persisté localStorage
  const [viewMode, setViewMode] = useState("list");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("staff_products_view") : null;
    if (saved === "grid" || saved === "list") setViewMode(saved);
  }, []);
  const changeView = (mode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") localStorage.setItem("staff_products_view", mode);
  };

  return (
    <div className="space-y-5">

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {fetching ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Total"       value={products.length} />
            <StatCard label="Disponibles" value={availableCount}   sub="en vente" />
            <StatCard label="Rupture"     value={unavailableCount} sub="masqués" />
          </>
        )}
      </div>

      {/* List card */}
      <div className="rounded-2xl border border-white/10 bg-[#1D1D1D]">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h1 className="text-base font-bold text-white">Catalogue produits</h1>
            <p className="text-xs text-white/40">
              {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""}
              {(selectedCategory || selectedSubCategory) ? " filtrés" : " au total"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle view mode */}
            <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-0.5">
              <button
                type="button"
                onClick={() => changeView("list")}
                className={`flex h-8 w-9 items-center justify-center rounded-lg text-sm transition cursor-pointer ${
                  viewMode === "list" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
                }`}
                aria-label="Vue liste"
                title="Vue liste"
              >
                <FaList />
              </button>
              <button
                type="button"
                onClick={() => changeView("grid")}
                className={`flex h-8 w-9 items-center justify-center rounded-lg text-sm transition cursor-pointer ${
                  viewMode === "grid" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
                }`}
                aria-label="Vue grille"
                title="Vue grille"
              >
                <FaTh />
              </button>
            </div>

            <select
              value={selectedCategory}
              onChange={e => { setSelectedCategory(e.target.value); setSelectedSubCategory(""); }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30 focus:bg-white/10"
            >
              <option value="">Toutes catégories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select
              value={selectedSubCategory}
              onChange={e => setSelectedSubCategory(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/30 focus:bg-white/10"
            >
              <option value="">Toutes sous-catégories</option>
              {visibleSubcategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
            </select>

            <button
              type="button"
              onClick={onOpenCreate}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#FFC366] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95"
            >
              <FaPlus className="text-xs" />
              Nouveau
            </button>
          </div>
        </div>

        {/* Content — list or grid */}
        {fetching ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {Array.from({ length: 6 }).map((_, i) => <ProductRowSkeleton key={i} />)}
            </div>
          )
        ) : paginatedProducts.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-white/40">
            Aucun produit pour ce filtre.
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {paginatedProducts.map(p => (
              <div
                key={p.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-white/20 hover:bg-white/10"
              >
                {/* Badge dispo */}
                <span className={`absolute left-2.5 top-2.5 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-sm ${
                  p.is_available ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
                }`}>
                  {p.is_available ? "Dispo" : "Off"}
                </span>

                {/* Reorder (apparaissent au hover) */}
                <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onReorder(p.id, "up")}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-black/60 text-xs text-white backdrop-blur-sm transition hover:bg-black/80 active:scale-95"
                    aria-label="Monter"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onReorder(p.id, "down")}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-black/60 text-xs text-white backdrop-blur-sm transition hover:bg-black/80 active:scale-95"
                    aria-label="Descendre"
                  >
                    ↓
                  </button>
                </div>

                {/* Image */}
                <button
                  type="button"
                  onClick={() => onOpenEdit(p)}
                  className="block aspect-square w-full cursor-pointer overflow-hidden bg-white/5"
                >
                  <ProductImage
                    src={p.image_main}
                    alt={p.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </button>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-white" title={p.name}>{p.name}</p>

                  <div className="flex flex-wrap items-center gap-1">
                    {p.category?.name && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-medium text-white/50">
                        {p.category.name}
                      </span>
                    )}
                    {p.subcategory?.name && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-medium text-white/50">
                        {p.subcategory.name}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-1">
                    <div>
                      <p className="text-base font-bold text-[#FFC366]">{p.price} €</p>
                      <p className="text-[10px] text-white/40">Stock : {p.stock}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenEdit(p)}
                      className="shrink-0 cursor-pointer rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
                    >
                      Modifier
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {paginatedProducts.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-white/5">
                <ProductImage
                  src={p.image_main}
                  alt={p.name}
                  className="h-14 w-14 shrink-0 rounded-xl border border-white/10 object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {p.category?.name && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/50">
                        {p.category.name}
                      </span>
                    )}
                    {p.subcategory?.name && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/50">
                        {p.subcategory.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-sm font-semibold text-white">{p.price} €</p>
                  <p className="text-xs text-white/40">Stock : {p.stock}</p>
                </div>

                <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider md:block ${
                  p.is_available ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {p.is_available ? "Dispo" : "Off"}
                </span>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onReorder(p.id, "up")}
                    className="cursor-pointer rounded-lg border border-white/10 px-2 py-1.5 text-xs text-white/40 transition hover:bg-white/10 hover:text-white active:scale-95"
                    aria-label="Monter"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onReorder(p.id, "down")}
                    className="cursor-pointer rounded-lg border border-white/10 px-2 py-1.5 text-xs text-white/40 transition hover:bg-white/10 hover:text-white active:scale-95"
                    aria-label="Descendre"
                  >
                    ↓
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenEdit(p)}
                  className="shrink-0 cursor-pointer rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
                >
                  Modifier
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
            <button
              type="button"
              onClick={() => onPageChange(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="cursor-pointer rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Précédent
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  type="button"
                  onClick={() => onPageChange(() => page)}
                  className={`h-8 w-8 cursor-pointer rounded-lg text-sm font-medium transition ${
                    page === currentPage
                      ? "bg-[#FFC366] text-black"
                      : "text-white/50 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="cursor-pointer rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
