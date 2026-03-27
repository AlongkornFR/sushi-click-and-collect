"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import ProductCard from "@/components/common/ProductCard";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { FaBars, FaXmark } from "react-icons/fa6";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const MOBILE_GLOBAL_HEADER_OFFSET = 80;
const MOBILE_MENU_BAR_HEIGHT = 30;

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="skeleton aspect-square w-full rounded-2xl" />
      <div className="skeleton h-3.5 w-3/4 rounded-full" />
      <div className="skeleton h-3 w-1/3 rounded-full" />
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-14">
      {[1, 2].map((section) => (
        <div key={section}>
          <div className="skeleton mb-8 h-7 w-40 rounded-xl" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MenuPage() {
  const [products, setProducts]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [openCategories, setOpenCategories] = useState({});
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await api.get("products/");
        setProducts(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Erreur lors du chargement des produits :", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const groupedData = useMemo(() => {
    const groups = {};
    products.forEach((product) => {
      if (!product.category?.name || !product.subcategory?.name) return;
      const cat = product.category.name;
      const sub = product.subcategory.name;
      if (!groups[cat]) groups[cat] = {};
      if (!groups[cat][sub]) groups[cat][sub] = [];
      groups[cat][sub].push(product);
    });
    return groups;
  }, [products]);

  const categoryNames = useMemo(() => Object.keys(groupedData), [groupedData]);

  useEffect(() => {
    if (categoryNames.length === 0) return;
    const initialState = {};
    categoryNames.forEach((cat) => { initialState[cat] = true; });
    setOpenCategories(initialState);
  }, [categoryNames]);

  useEffect(() => {
    document.body.style.overflow = mobileFiltersOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileFiltersOpen]);

  function toggleCategory(categoryName) {
    setOpenCategories((prev) => ({ ...prev, [categoryName]: !prev[categoryName] }));
  }

  function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (!element) return;
    const isMobile = window.innerWidth < 1024;
    const extraOffset = isMobile
      ? MOBILE_GLOBAL_HEADER_OFFSET + MOBILE_MENU_BAR_HEIGHT + 12
      : 120;
    const y = element.getBoundingClientRect().top + window.pageYOffset - extraOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  function handleGoToAll() {
    setMobileFiltersOpen(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 120);
  }

  function handleGoToCategory(id) {
    setMobileFiltersOpen(false);
    setTimeout(() => scrollToSection(id), 150);
  }

  function handleGoToSubcategory(id) {
    setMobileFiltersOpen(false);
    setTimeout(() => scrollToSection(id), 150);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6">

      {/* ── Barre flottante mobile ── */}
      <div
        className="fixed inset-x-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:hidden"
        style={{ top: `${MOBILE_GLOBAL_HEADER_OFFSET}px` }}
      >
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <div className="min-w-0 pr-4">
              <h1 className="text-xl font-bold text-zinc-900">Notre Menu</h1>
              <p className="text-xs text-zinc-400">Commandez en ligne · Click & Collect</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 transition hover:bg-zinc-100 active:scale-95"
              aria-label="Ouvrir les filtres"
            >
              <FaBars className="text-base" />
            </button>
          </div>
        </div>
      </div>

      {/* Espace réservé mobile */}
      <div
        className="lg:hidden"
        style={{ height: `${MOBILE_GLOBAL_HEADER_OFFSET + MOBILE_MENU_BAR_HEIGHT + 20}px` }}
      />

      <div className="grid grid-cols-1 gap-8 py-6 md:py-10 lg:grid-cols-12">

        {/* ── Overlay mobile ── */}
        {mobileFiltersOpen && (
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            aria-label="Fermer les filtres"
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-[82%] max-w-[300px] overflow-y-auto bg-white p-6 shadow-2xl transition-transform duration-300 ease-in-out
            lg:sticky lg:top-24 lg:z-auto lg:block lg:h-fit lg:w-auto lg:max-w-none lg:translate-x-0 lg:self-start lg:overflow-visible lg:rounded-2xl lg:border lg:border-zinc-100 lg:bg-zinc-50 lg:p-6 lg:shadow-sm lg:col-span-3
            ${mobileFiltersOpen ? "translate-x-0" : "-translate-x-full"}
          `}
          style={{
            top:    mobileFiltersOpen ? `${MOBILE_GLOBAL_HEADER_OFFSET}px` : undefined,
            height: mobileFiltersOpen ? `calc(100dvh - ${MOBILE_GLOBAL_HEADER_OFFSET}px)` : undefined,
          }}
        >
          {/* Mobile header */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <h2 className="text-lg font-bold text-zinc-900">Filtres</h2>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 transition hover:bg-zinc-100 active:scale-95"
              aria-label="Fermer les filtres"
            >
              <FaXmark className="text-base" />
            </button>
          </div>

          <nav className="space-y-1">
            {/* Tous les produits */}
            <button
              type="button"
              onClick={handleGoToAll}
              className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200 active:scale-[.98]"
            >
              Tous les produits
            </button>

            <div className="my-3 h-px bg-zinc-200" />

            {/* Skeleton sidebar */}
            {loading && (
              <div className="space-y-3 pt-1">
                {[80, 60, 70, 55].map((w, i) => (
                  <div key={i} className={`skeleton h-4 rounded-full`} style={{ width: `${w}%` }} />
                ))}
              </div>
            )}

            {/* Categories */}
            {categoryNames.map((categoryName) => {
              const subcategories = Object.keys(groupedData[categoryName] || {});
              const categoryId = `category-${slugify(categoryName)}`;

              return (
                <div key={categoryName}>
                  <div className="flex items-center justify-between gap-1 rounded-xl px-3 py-2 transition hover:bg-zinc-200">
                    <button
                      type="button"
                      onClick={() => handleGoToCategory(categoryId)}
                      className="flex-1 cursor-pointer text-left text-sm font-semibold text-zinc-800 transition hover:text-black"
                    >
                      {categoryName}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCategory(categoryName)}
                      className="cursor-pointer p-1 text-zinc-400 transition hover:text-zinc-700"
                      aria-label={`Ouvrir ou fermer ${categoryName}`}
                    >
                      {openCategories[categoryName]
                        ? <FaChevronUp className="text-xs" />
                        : <FaChevronDown className="text-xs" />
                      }
                    </button>
                  </div>

                  {openCategories[categoryName] && (
                    <div className="mb-1 ml-3 mt-0.5 space-y-0.5 border-l-2 border-zinc-200 pl-3">
                      {subcategories.map((subcategoryName) => {
                        const subcategoryId = `subcategory-${slugify(categoryName)}-${slugify(subcategoryName)}`;
                        return (
                          <button
                            key={subcategoryName}
                            type="button"
                            onClick={() => handleGoToSubcategory(subcategoryId)}
                            className="block w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-sm text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900"
                          >
                            {subcategoryName}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ── Contenu principal ── */}
        <main className="lg:col-span-9">

          {/* Header desktop */}
          <div className="mb-10 hidden lg:block">
            <h1 className="text-5xl font-bold tracking-tight text-zinc-900">Notre Menu</h1>
            <p className="mt-2 text-base text-zinc-400">Commandez en ligne · Récupérez sur place</p>
            <div className="mt-5 h-px bg-zinc-100" />
          </div>

          {/* ── Skeleton loading ── */}
          {loading && <MenuSkeleton />}

          {/* ── Produits ── */}
          {!loading && (
            <div className="space-y-16">
              {categoryNames.map((categoryName) => {
                const subcategories = Object.keys(groupedData[categoryName] || {});
                const categoryId = `category-${slugify(categoryName)}`;

                return (
                  <section key={categoryName} id={categoryId} className="scroll-mt-36">
                    {/* Category header */}
                    <div className="mb-8 flex items-center gap-4">
                      <h2 className="text-2xl font-bold text-zinc-900 md:text-3xl">
                        {categoryName}
                      </h2>
                      <div className="h-px flex-1 bg-zinc-100" />
                    </div>

                    <div className="space-y-12">
                      {subcategories.map((subcategoryName) => {
                        const subcategoryId = `subcategory-${slugify(categoryName)}-${slugify(subcategoryName)}`;
                        const subcategoryProducts = groupedData[categoryName][subcategoryName] || [];

                        return (
                          <section key={subcategoryName} id={subcategoryId} className="scroll-mt-36">
                            {/* Subcategory header */}
                            <div className="mb-6 flex items-center gap-3">
                              <h3 className="text-base font-semibold uppercase tracking-widest text-zinc-400">
                                {subcategoryName}
                              </h3>
                              <div className="h-px flex-1 bg-zinc-100" />
                              <span className="text-xs text-zinc-300">
                                {subcategoryProducts.length} produit{subcategoryProducts.length > 1 ? "s" : ""}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-8 xl:grid-cols-3">
                              {subcategoryProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                              ))}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && categoryNames.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 py-24 text-center">
              <span className="text-5xl">🍣</span>
              <p className="mt-4 text-base font-medium text-zinc-500">Aucun produit disponible pour le moment.</p>
              <p className="mt-1 text-sm text-zinc-400">Revenez bientôt !</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
