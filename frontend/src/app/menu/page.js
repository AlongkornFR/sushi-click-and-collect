"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function MenuPage() {
  const [products, setProducts] = useState([]);
  const [openCategories, setOpenCategories] = useState({});

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

  function toggleCategory(categoryName) {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  }

  function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (!element) return;

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleGoToAll() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <div className="sticky top-24 min-h-[700px] bg-zinc-100 p-6">
            <div className="space-y-4">
              <div className="border-b border-zinc-400/60 pb-3">
                <button
                  type="button"
                  onClick={handleGoToAll}
                  className="block text-left text-lg font-semibold text-zinc-700 transition hover:text-black"
                >
                  Tous les produits
                </button>
              </div>

              {categoryNames.map((categoryName) => {
                const subcategories = Object.keys(groupedData[categoryName] || {});
                const categoryId = `category-${slugify(categoryName)}`;

                return (
                  <div
                    key={categoryName}
                    className="border-b border-zinc-400/60 pb-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => scrollToSection(categoryId)}
                        className="text-left text-2xl font-light lowercase text-zinc-700 transition hover:text-black"
                      >
                        {categoryName}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleCategory(categoryName)}
                        className="text-zinc-700 transition hover:text-black"
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
                            categoryName
                          )}-${slugify(subcategoryName)}`;

                          return (
                            <button
                              key={`${categoryName}-${subcategoryName}`}
                              type="button"
                              onClick={() => scrollToSection(subcategoryId)}
                              className="block text-left text-lg text-zinc-600 transition hover:text-black"
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
          </div>
        </aside>

        <main className="lg:col-span-9">
          <div className="mb-10">
            <h1 className="text-4xl font-semibold md:text-5xl">Notre Menu</h1>
            <p className="mt-2 text-lg text-gray-600">
              Commandez en ligne, récupérez sur place
            </p>
          </div>

          <div className="space-y-16">
            {categoryNames.map((categoryName) => {
              const subcategories = Object.keys(groupedData[categoryName] || {});
              const categoryId = `category-${slugify(categoryName)}`;

              return (
                <section
                  key={categoryName}
                  id={categoryId}
                  className="scroll-mt-28"
                >
                  <div className="mb-8">
                    <h2 className="text-3xl font-semibold text-zinc-900">
                      {categoryName}
                    </h2>
                    <div className="mt-3 h-px w-full bg-zinc-200" />
                  </div>

                  <div className="space-y-14">
                    {subcategories.map((subcategoryName) => {
                      const subcategoryId = `subcategory-${slugify(
                        categoryName
                      )}-${slugify(subcategoryName)}`;

                      const subcategoryProducts =
                        groupedData[categoryName][subcategoryName] || [];

                      return (
                        <section
                          key={`${categoryName}-${subcategoryName}`}
                          id={subcategoryId}
                          className="scroll-mt-28"
                        >
                          <div className="mb-6">
                            <h3 className="text-2xl font-medium text-zinc-800">
                              {subcategoryName}
                            </h3>
                            <div className="mt-3 h-px w-full bg-zinc-300" />
                          </div>

                          <div className="grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
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