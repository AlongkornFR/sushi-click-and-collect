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

/**
 * Ajuste cette valeur à la hauteur réelle de ton header principal mobile.
 * D'après ta capture, 84px est une bonne base.
 */
const MOBILE_GLOBAL_HEADER_OFFSET = 80;

/**
 * Hauteur approximative de la barre flottante "Notre Menu"
 */
const MOBILE_MENU_BAR_HEIGHT = 30;

export default function MenuPage() {
  const [products, setProducts] = useState([]);
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
      }
    }

    fetchProducts();
  }, []);

  const groupedData = useMemo(() => {
    const groups = {};

    products.forEach((product) => {
      if (!product.category?.name || !product.subcategory?.name) return;

      const categoryName = product.category.name;
      const subcategoryName = product.subcategory.name;

      if (!groups[categoryName]) {
        groups[categoryName] = {};
      }

      if (!groups[categoryName][subcategoryName]) {
        groups[categoryName][subcategoryName] = [];
      }

      groups[categoryName][subcategoryName].push(product);
    });

    return groups;
  }, [products]);

  const categoryNames = useMemo(() => Object.keys(groupedData), [groupedData]);

  useEffect(() => {
    if (categoryNames.length === 0) return;

    const initialState = {};
    categoryNames.forEach((cat) => {
      initialState[cat] = true;
    });
    setOpenCategories(initialState);
  }, [categoryNames]);

  useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileFiltersOpen]);

  function toggleCategory(categoryName) {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  }

  function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (!element) return;

    const isMobile = window.innerWidth < 1024;
    const extraOffset = isMobile
      ? MOBILE_GLOBAL_HEADER_OFFSET + MOBILE_MENU_BAR_HEIGHT + 12
      : 120;

    const y =
      element.getBoundingClientRect().top + window.pageYOffset - extraOffset;

    window.scrollTo({
      top: y,
      behavior: "smooth",
    });
  }

  function handleGoToAll() {
    setMobileFiltersOpen(false);

    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }, 120);
  }

  function handleGoToCategory(categoryId) {
    setMobileFiltersOpen(false);

    setTimeout(() => {
      scrollToSection(categoryId);
    }, 150);
  }

  function handleGoToSubcategory(subcategoryId) {
    setMobileFiltersOpen(false);

    setTimeout(() => {
      scrollToSection(subcategoryId);
    }, 150);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6">
      {/* Barre flottante mobile sous le header principal */}
      <div
        className="fixed inset-x-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:hidden"
        style={{ top: `${MOBILE_GLOBAL_HEADER_OFFSET}px` }}
      >
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="min-w-0 pr-4">
              <h1 className="text-2xl font-semibold text-zinc-900">
                Notre Menu
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Commandez en ligne, récupérez sur place
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 transition hover:bg-zinc-100"
              aria-label="Ouvrir les filtres"
            >
              <FaBars className="text-lg" />
            </button>
          </div>
        </div>
      </div>

      {/* Espace réservé header principal + barre flottante menu */}
      <div
        className="lg:hidden"
        style={{
          height: `${MOBILE_GLOBAL_HEADER_OFFSET + MOBILE_MENU_BAR_HEIGHT + 16}px`,
        }}
      />

      <div className="grid grid-cols-1 gap-8 py-6 md:py-10 lg:grid-cols-12">
        {/* Overlay mobile */}
        {mobileFiltersOpen && (
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-label="Fermer les filtres"
          />
        )}

        {/* Sidebar / Drawer */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-[85%] max-w-[320px] overflow-y-auto bg-zinc-100 p-6 transition-transform duration-300
            lg:sticky lg:top-24 lg:z-auto lg:block lg:min-h-full lg:w-auto lg:max-w-none lg:translate-x-0 lg:self-start lg:overflow-visible lg:bg-zinc-100 lg:p-6 lg:col-span-3
            ${mobileFiltersOpen ? "translate-x-0" : "-translate-x-full"}
          `}
          style={{
            top: mobileFiltersOpen
              ? `${MOBILE_GLOBAL_HEADER_OFFSET}px`
              : undefined,
            height: mobileFiltersOpen
              ? `calc(100dvh - ${MOBILE_GLOBAL_HEADER_OFFSET}px)`
              : undefined,
          }}
        >
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <h2 className="text-lg font-semibold text-zinc-900">Filtres</h2>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 transition hover:bg-zinc-100"
              aria-label="Fermer les filtres"
            >
              <FaXmark className="text-lg" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="border-b border-zinc-400/60 pb-3">
              <button
                type="button"
                onClick={handleGoToAll}
                className="block text-left text-base font-semibold text-zinc-700 transition hover:text-black md:text-lg"
              >
                Tous les produits
              </button>
            </div>

            {categoryNames.map((categoryName) => {
              const subcategories = Object.keys(
                groupedData[categoryName] || {},
              );
              const categoryId = `category-${slugify(categoryName)}`;

              return (
                <div
                  key={categoryName}
                  className="border-b border-zinc-400/60 pb-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleGoToCategory(categoryId)}
                      className="text-left text-xl font-light lowercase text-zinc-700 transition hover:text-black md:text-2xl"
                    >
                      {categoryName}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleCategory(categoryName)}
                      className="text-zinc-700 transition hover:text-black"
                      aria-label={`Ouvrir ou fermer ${categoryName}`}
                    >
                      {openCategories[categoryName] ? (
                        <FaChevronUp className="text-sm" />
                      ) : (
                        <FaChevronDown className="text-sm" />
                      )}
                    </button>
                  </div>

                  {openCategories[categoryName] && (
                    <div className="mt-3 space-y-2 pl-4">
                      {subcategories.map((subcategoryName) => {
                        const subcategoryId = `subcategory-${slugify(
                          categoryName,
                        )}-${slugify(subcategoryName)}`;

                        return (
                          <button
                            key={`${categoryName}-${subcategoryName}`}
                            type="button"
                            onClick={() => handleGoToSubcategory(subcategoryId)}
                            className="block text-left text-base text-zinc-600 transition hover:text-black md:text-lg"
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
          </div>
        </aside>

        {/* Contenu */}
        <main className="lg:col-span-9">
          <div className="mb-8 hidden lg:block">
            <h1 className="text-4xl font-semibold md:text-5xl">Notre Menu</h1>
            <p className="mt-2 text-lg text-gray-600">
              Commandez en ligne, récupérez sur place
            </p>
          </div>

          <div className="space-y-12 md:space-y-16">
            {categoryNames.map((categoryName) => {
              const subcategories = Object.keys(
                groupedData[categoryName] || {},
              );
              const categoryId = `category-${slugify(categoryName)}`;

              return (
                <section
                  key={categoryName}
                  id={categoryId}
                  className="scroll-mt-32"
                >
                  <div className="mb-6 md:mb-8">
                    <h2 className="text-2xl font-semibold text-zinc-900 md:text-3xl">
                      {categoryName}
                    </h2>
                    <div className="mt-3 h-px w-1/ bg-zinc-200" />
                  </div>

                  <div className="space-y-10 md:space-y-14">
                    {subcategories.map((subcategoryName) => {
                      const subcategoryId = `subcategory-${slugify(
                        categoryName,
                      )}-${slugify(subcategoryName)}`;

                      const subcategoryProducts =
                        groupedData[categoryName][subcategoryName] || [];

                      return (
                        <section
                          key={`${categoryName}-${subcategoryName}`}
                          id={subcategoryId}
                          className="scroll-mt-32"
                        >
                          <div className="mb-5 md:mb-6">
                            <h3 className="text-xl font-medium text-zinc-800 md:text-2xl">
                              {subcategoryName}
                            </h3>
                            <div className="mt-3 h-px w-full bg-zinc-300" />
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                            {subcategoryProducts.map((product) => (
                              <div key={product.id} className="flex flex-col">
                                <div className="relative">
                                  <ProductCard product={product} />
                                </div>
                              </div>
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

          {categoryNames.length === 0 && (
            <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
              Aucun produit disponible pour le moment.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
