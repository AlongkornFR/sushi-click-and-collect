"use client";

import ProductImage from "@/components/common/ProductImage";
import { StatCard, StatCardSkeleton, ProductRowSkeleton } from "./StatCard";
import { FaPlus } from "react-icons/fa6";

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
}) {
  const availableCount   = products.filter(p => p.is_available).length;
  const unavailableCount = products.filter(p => !p.is_available).length;

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
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h1 className="text-base font-bold text-zinc-900">Catalogue produits</h1>
            <p className="text-xs text-zinc-400">
              {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""}
              {(selectedCategory || selectedSubCategory) ? " filtrés" : " au total"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={e => { setSelectedCategory(e.target.value); setSelectedSubCategory(""); }}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:bg-white"
            >
              <option value="">Toutes catégories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select
              value={selectedSubCategory}
              onChange={e => setSelectedSubCategory(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:bg-white"
            >
              <option value="">Toutes sous-catégories</option>
              {visibleSubcategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
            </select>

            <button
              type="button"
              onClick={onOpenCreate}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 active:scale-95"
            >
              <FaPlus className="text-xs" />
              Nouveau
            </button>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-zinc-100">
          {fetching ? (
            Array.from({ length: 6 }).map((_, i) => <ProductRowSkeleton key={i} />)
          ) : paginatedProducts.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-zinc-400">
              Aucun produit pour ce filtre.
            </div>
          ) : paginatedProducts.map(p => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-zinc-50">
              <ProductImage
                src={p.image_main}
                alt={p.name}
                className="h-14 w-14 shrink-0 rounded-xl border border-zinc-100 object-cover"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900">{p.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {p.category?.name && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                      {p.category.name}
                    </span>
                  )}
                  {p.subcategory?.name && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                      {p.subcategory.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-sm font-semibold text-zinc-900">{p.price} €</p>
                <p className="text-xs text-zinc-400">Stock : {p.stock}</p>
              </div>

              <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider md:block ${
                p.is_available ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
              }`}>
                {p.is_available ? "Dispo" : "Off"}
              </span>

              <button
                type="button"
                onClick={() => onOpenEdit(p)}
                className="shrink-0 cursor-pointer rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-95"
              >
                Modifier
              </button>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-4">
            <button
              type="button"
              onClick={() => onPageChange(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-500 hover:bg-zinc-100"
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
              className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
