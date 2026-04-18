"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/services/api";
import ProductCard from "@/components/common/ProductCard";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const MOBILE_GLOBAL_HEADER_OFFSET = 80;
const MOBILE_FILTER_BAR_HEIGHT = 52;

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
  const [activeSubId, setActiveSubId]       = useState(null);
  const pillsRef = useRef(null);

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

  const allSubcategories = useMemo(() => {
    const result = [];
    categoryNames.forEach((cat) => {
      const subs = Object.keys(groupedData[cat] || {});
      if (subs.length === 1) {
        result.push({
          label: cat,
          id: `category-${slugify(cat)}`,
        });
      } else {
        subs.forEach((sub) => {
          result.push({
            label: sub,
            id: `subcategory-${slugify(cat)}-${slugify(sub)}`,
          });
        });
      }
    });
    return result;
  }, [groupedData, categoryNames]);

  useEffect(() => {
    if (categoryNames.length === 0) return;
    const initialState = {};
    categoryNames.forEach((cat) => { initialState[cat] = true; });
    setOpenCategories(initialState);
  }, [categoryNames]);

  function toggleCategory(categoryName) {
    setOpenCategories((prev) => ({ ...prev, [categoryName]: !prev[categoryName] }));
  }

  function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (!element) return;
    const isMobile = window.innerWidth < 1024;
    const extraOffset = isMobile
      ? MOBILE_GLOBAL_HEADER_OFFSET + MOBILE_FILTER_BAR_HEIGHT + 12
      : 120;
    const y = element.getBoundingClientRect().top + window.pageYOffset - extraOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  function handlePillClick(id) {
    setActiveSubId(id);
    scrollToSection(id);
    const pill = pillsRef.current?.querySelector(`[data-pill-id="${id}"]`);
    pill?.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6">

      {/* ── Barre flottante mobile ── */}
      <div
        className="fixed inset-x-0 z-30 border-b mt-[-1em] border-zinc-200 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 dark:supports-[backdrop-filter]:bg-black/90 lg:hidden"
        style={{ top: `${MOBILE_GLOBAL_HEADER_OFFSET}px` }}
      >
        {/* Pills défilantes */}
        <div
          ref={pillsRef}
          className="flex gap-2 overflow-x-auto px-4 py-3 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton h-8 shrink-0 rounded-full"
                  style={{ width: `${60 + i * 15}px` }}
                />
              ))
            : allSubcategories.map(({ label, id }) => (
                <button
                  key={id}
                  data-pill-id={id}
                  type="button"
                  onClick={() => handlePillClick(id)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-95 ${
                    activeSubId === id
                      ? "bg-[#FFC366] text-black"
                      : "border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-[#1D1D1D] text-zinc-600 dark:text-white/60 hover:bg-zinc-200 dark:hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
        </div>
      </div>

      {/* Espace réservé mobile */}
      <div
        className="lg:hidden"
        style={{ height: `${MOBILE_FILTER_BAR_HEIGHT + 20}px` }}
      />

      <div className="grid grid-cols-1 gap-8 py-6 md:py-10 lg:grid-cols-12">

        {/* ── Sidebar desktop ── */}
        <aside className="hidden lg:sticky lg:top-24 lg:col-span-3 lg:block lg:self-start lg:rounded-2xl lg:border lg:border-zinc-200 dark:lg:border-white/10 lg:bg-zinc-50 dark:lg:bg-[#1D1D1D] lg:p-6 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <nav className="space-y-1">
            {/* Tous les produits */}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex w-full cursor-pointer items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-zinc-900 dark:text-white transition hover:bg-zinc-200 dark:hover:bg-white/10 active:scale-[.98]"
            >
              Tous les produits
            </button>

            <div className="my-3 h-px bg-zinc-200 dark:bg-white/10" />

            {/* Skeleton sidebar */}
            {loading && (
              <div className="space-y-3 pt-1">
                {[80, 60, 70, 55].map((w, i) => (
                  <div key={i} className="skeleton h-4 rounded-full" style={{ width: `${w}%` }} />
                ))}
              </div>
            )}

            {/* Catégories */}
            {categoryNames.map((categoryName) => {
              const subcategories = Object.keys(groupedData[categoryName] || {});
              const categoryId = `category-${slugify(categoryName)}`;
              const singleSub = subcategories.length === 1;

              return (
                <div key={categoryName}>
                  <div className="flex items-center justify-between gap-1 rounded-xl px-3 py-2 transition hover:bg-zinc-200 dark:hover:bg-white/10">
                    <button
                      type="button"
                      onClick={() => scrollToSection(categoryId)}
                      className="flex-1 cursor-pointer text-left text-sm font-semibold text-zinc-700 dark:text-white/80 transition hover:text-zinc-900 dark:hover:text-white"
                    >
                      {categoryName}
                    </button>
                    {!singleSub && (
                      <button
                        type="button"
                        onClick={() => toggleCategory(categoryName)}
                        className="cursor-pointer p-1 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-400"
                        aria-label={`Ouvrir ou fermer ${categoryName}`}
                      >
                        {openCategories[categoryName]
                          ? <FaChevronUp className="text-xs" />
                          : <FaChevronDown className="text-xs" />
                        }
                      </button>
                    )}
                  </div>

                  {!singleSub && openCategories[categoryName] && (
                    <div className="mb-1 ml-3 mt-0.5 space-y-0.5 border-l-2 border-zinc-200 dark:border-white/10 pl-3">
                      {subcategories.map((subcategoryName) => {
                        const subcategoryId = `subcategory-${slugify(categoryName)}-${slugify(subcategoryName)}`;
                        return (
                          <button
                            key={subcategoryName}
                            type="button"
                            onClick={() => scrollToSection(subcategoryId)}
                            className="block w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-sm text-zinc-400 dark:text-white/40 transition hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white"
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
            <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">Notre Menu</h1>
            <p className="mt-2 text-base text-zinc-400 dark:text-white/40">Commandez en ligne · Récupérez sur place</p>
            <div className="mt-5 h-px bg-zinc-200 dark:bg-white/10" />
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
                  <section key={categoryName} id={categoryId} className="scroll-mt-52 lg:scroll-mt-36">
                    {/* Category header */}
                    <div className="mb-8 flex items-center gap-4">
                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white md:text-3xl">
                        {categoryName}
                      </h2>
                      <div className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
                    </div>

                    <div className="space-y-12">
                      {subcategories.map((subcategoryName) => {
                        const subcategoryId = `subcategory-${slugify(categoryName)}-${slugify(subcategoryName)}`;
                        const subcategoryProducts = groupedData[categoryName][subcategoryName] || [];

                        return (
                          <section key={subcategoryName} id={subcategoryId} className="scroll-mt-52 lg:scroll-mt-36">
                            {/* Subcategory header */}
                            <div className="mb-6 flex items-center gap-3">
                              <h3 className="text-base font-semibold uppercase tracking-widest text-zinc-400 dark:text-white/30">
                                {subcategoryName}
                              </h3>
                              <div className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
                              <span className="text-xs text-zinc-300 dark:text-white/20">
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
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 dark:border-white/10 py-24 text-center">
              <span className="text-5xl">🍣</span>
              <p className="mt-4 text-base font-medium text-zinc-400 dark:text-white/50">Aucun produit disponible pour le moment.</p>
              <p className="mt-1 text-sm text-zinc-300 dark:text-white/30">Revenez bientôt !</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
