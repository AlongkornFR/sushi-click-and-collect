"use client";

import { useEffect, useMemo, useState } from "react";
import { useStaffAuth } from "../../_components/useStaffAuth";
import {DEFAULT_PRODUCT_IMAGE} from "@/utils/constant"

const emptyForm = {
  name: "",
  description: "",
  price: "",
  stock: 0,
  is_available: true,
  image_main: "",
  category_id: "",
  subcategory_id: "",
};

const PRODUCTS_PER_PAGE = 8;

export default function StaffProductsPage() {
  const { API, headers, token } = useStaffAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [newCategory, setNewCategory] = useState("");
  const [newSubCategory, setNewSubCategory] = useState("");
  const [newSubCategoryParentId, setNewSubCategoryParentId] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchProducts() {
    try {
      const res = await fetch(`${API}/staff/products/`, {
        headers,
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch(`${API}/staff/categories/`, {
        headers,
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function fetchSubcategories(categoryId = "") {
    try {
      const url = categoryId
        ? `${API}/staff/subcategories/?category_id=${categoryId}`
        : `${API}/staff/subcategories/`;

      const res = await fetch(url, {
        headers,
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setSubcategories(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  useEffect(() => {
    if (!token) return;
    fetchProducts();
    fetchCategories();
    fetchSubcategories();
  }, [token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubCategory]);

  function onChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "category_id") {
        updated.subcategory_id = "";
        fetchSubcategories(value);
      }

      return updated;
    });
  }

  function startEdit(product) {
    const categoryId = product.category?.id ? String(product.category.id) : "";

    setEditingId(product.id);
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price || "",
      stock: product.stock ?? 0,
      is_available: !!product.is_available,
      image_main: product.image_main || "",
      category_id: categoryId,
      subcategory_id: product.subcategory?.id
        ? String(product.subcategory.id)
        : "",
    });

    if (categoryId) {
      fetchSubcategories(categoryId);
    } else {
      fetchSubcategories();
    }

    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    fetchSubcategories();
  }

  async function saveProduct(e) {
    e.preventDefault();
    setError("");

    if (!form.category_id) {
      setError("La catégorie est obligatoire.");
      return;
    }

    if (!form.subcategory_id) {
      setError("La sous-catégorie est obligatoire.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        stock: Number(form.stock),
        category_id: Number(form.category_id),
        subcategory_id: Number(form.subcategory_id),
      };

      const url = editingId
        ? `${API}/staff/products/${editingId}/`
        : `${API}/staff/products/create/`;

      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      await fetchProducts();
      setCurrentPage(1);
      resetForm();
    } catch (e2) {
      setError(String(e2.message || e2));
    } finally {
      setLoading(false);
    }
  }

  async function createCategory(e) {
    e.preventDefault();
    setError("");

    if (!newCategory.trim()) return;

    try {
      const slug = newCategory
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");

      const res = await fetch(`${API}/staff/categories/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          name: newCategory.trim(),
          slug,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const createdCategory = await res.json();

      setNewCategory("");
      setNewSubCategoryParentId(String(createdCategory.id));
      await fetchCategories();
    } catch (e2) {
      setError(String(e2.message || e2));
    }
  }

  async function createSubCategory(e) {
    e.preventDefault();
    setError("");

    if (!newSubCategoryParentId) {
      setError("Choisis une catégorie pour cette sous-catégorie.");
      return;
    }

    if (!newSubCategory.trim()) return;

    try {
      const slug = newSubCategory
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");

      const res = await fetch(`${API}/staff/subcategories/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          name: newSubCategory.trim(),
          slug,
          category_id: Number(newSubCategoryParentId),
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      setNewSubCategory("");
      await fetchSubcategories();
    } catch (e2) {
      setError(String(e2.message || e2));
    }
  }

  const formSubcategories = useMemo(() => {
    if (!form.category_id) return [];
    return subcategories.filter(
      (sc) =>
        String(sc.category?.id || sc.category_id) === String(form.category_id)
    );
  }, [subcategories, form.category_id]);

  const visibleSubcategories = useMemo(() => {
    if (!selectedCategory) return subcategories;
    return subcategories.filter(
      (sc) =>
        String(sc.category?.id || sc.category_id) === String(selectedCategory)
    );
  }, [subcategories, selectedCategory]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory
        ? String(p.category?.id) === String(selectedCategory)
        : true;

      const matchSubCategory = selectedSubCategory
        ? String(p.subcategory?.id) === String(selectedSubCategory)
        : true;

      return matchCategory && matchSubCategory;
    });
  }, [products, selectedCategory, selectedSubCategory]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * PRODUCTS_PER_PAGE;
    const end = start + PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, safeCurrentPage]);

  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }, [totalPages]);

  function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-5">
        <h2 className="mb-4 text-xl font-bold">
          {editingId ? "Modifier le produit" : "Créer un produit"}
        </h2>

        <form onSubmit={saveProduct} className="space-y-3">
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Nom"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          />

          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            placeholder="Description"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          />

          <input
            name="price"
            value={form.price}
            onChange={onChange}
            placeholder="Prix (ex: 12.50)"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          />

          <input
            name="stock"
            type="number"
            value={form.stock}
            onChange={onChange}
            placeholder="Stock"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          />

          <input
            name="image_main"
            value={form.image_main}
            onChange={onChange}
            placeholder="URL image"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          />

          <select
            name="category_id"
            required
            value={form.category_id}
            onChange={onChange}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          >
            <option value="" disabled>
              Sélectionner une catégorie
            </option>

            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            name="subcategory_id"
            required
            value={form.subcategory_id}
            onChange={onChange}
            disabled={!form.category_id}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-100"
          >
            <option value="" disabled>
              {form.category_id
                ? "Sélectionner une sous-catégorie"
                : "Choisis d'abord une catégorie"}
            </option>

            {formSubcategories.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_available"
              checked={form.is_available}
              onChange={onChange}
              className="h-4 w-4"
            />
            Disponible
          </label>

          <div className="flex gap-2">
            <button
              disabled={loading}
              className="
                rounded-xl bg-black px-4 py-2 font-semibold text-white
                transition-all duration-200
                hover:bg-zinc-800 hover:shadow-md
                active:scale-95
                disabled:cursor-not-allowed disabled:opacity-50
              "
            >
              {loading
                ? "Enregistrement..."
                : editingId
                ? "Mettre à jour"
                : "Créer"}
            </button>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="
                  rounded-xl border border-zinc-300 px-4 py-2
                  transition-all duration-200
                  hover:border-zinc-400 hover:bg-zinc-100
                  active:scale-95
                "
              >
                Annuler
              </button>
            ) : null}
          </div>
        </form>

        <div className="mt-8 space-y-5 border-t pt-6">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-zinc-900">
                Ajouter une catégorie
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Crée une nouvelle catégorie principale pour organiser ton menu.
              </p>
            </div>

            <form onSubmit={createCategory} className="space-y-3">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Ex: Sushi"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              />

              <button
                className="
                  inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 font-medium text-white
                  transition-all duration-200
                  hover:bg-zinc-800 hover:shadow-md
                  active:scale-95
                "
              >
                Ajouter la catégorie
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-zinc-900">
                Ajouter une sous-catégorie
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Choisis d’abord la catégorie dans laquelle la sous-catégorie
                sera rangée.
              </p>
            </div>

            <form onSubmit={createSubCategory} className="space-y-3">
              <select
                value={newSubCategoryParentId}
                onChange={(e) => setNewSubCategoryParentId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              >
                <option value="">Choisir la catégorie parente</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                value={newSubCategory}
                onChange={(e) => setNewSubCategory(e.target.value)}
                placeholder="Ex: Maki"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              />

              <button
                disabled={!newSubCategoryParentId}
                className="
                  inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 font-medium text-white
                  transition-all duration-200
                  hover:bg-zinc-800 hover:shadow-md
                  active:scale-95
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                Ajouter la sous-catégorie
              </button>
            </form>

            {categories.length === 0 ? (
              <p className="mt-3 text-xs text-amber-600">
                Crée d’abord une catégorie avant d’ajouter une sous-catégorie.
              </p>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mt-4 break-words text-sm text-red-600">{error}</div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-7">
        <div className="mb-4 flex flex-col gap-4 md:items-center md:justify-between">
          <h2 className="text-xl font-bold">Liste des produits</h2>

          <div className="flex w-full gap-3 md:w-auto flex-row">
            <div className="w-full md:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubCategory("");
                }}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-64">
              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              >
                <option value="">Toutes les sous-catégories</option>
                {visibleSubcategories.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm text-zinc-500">
          <span>
            {filteredProducts.length} produit
            {filteredProducts.length > 1 ? "s" : ""} trouvé
            {filteredProducts.length > 1 ? "s" : ""}
          </span>
          <span>
            Page {safeCurrentPage} / {totalPages}
          </span>
        </div>

        <div className="space-y-3">
          {paginatedProducts.map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between gap-4 rounded-xl border p-4 transition hover:shadow-sm"
            >
              <div className="flex min-w-0 items-start gap-4">
                <img
                  src={p.image_main || DEFAULT_PRODUCT_IMAGE}
                  alt={p.name}
                  className="h-20 w-20 shrink-0 rounded-xl border border-zinc-200 bg-zinc-100 object-cover"
                />

                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>

                  <div className="text-sm text-zinc-500">
                    {p.category?.name} • {p.subcategory?.name} • {p.price} € •
                    Stock: {p.stock}
                  </div>

                  <div className="mt-1 text-xs text-zinc-400">
                    {p.is_available ? "Disponible" : "Indisponible"}
                  </div>
                </div>
              </div>

              <button
                onClick={() => startEdit(p)}
                className="
                  shrink-0 rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium
                  transition-all duration-200
                  hover:border-zinc-400 hover:bg-zinc-100 hover:shadow-sm
                  active:scale-95
                "
              >
                Modifier
              </button>
            </div>
          ))}

          {filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-zinc-500">
              Aucun produit trouvé pour ce filtre.
            </div>
          ) : null}
        </div>

        {filteredProducts.length > 0 && totalPages > 1 ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className="
                rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium
                transition-all duration-200
                hover:border-zinc-400 hover:bg-zinc-100
                active:scale-95
                disabled:cursor-not-allowed disabled:opacity-50
              "
            >
              Précédent
            </button>

            {pageNumbers.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => goToPage(page)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
                  page === safeCurrentPage
                    ? "bg-black text-white"
                    : "border border-zinc-300 hover:border-zinc-400 hover:bg-zinc-100"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              onClick={() => goToPage(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className="
                rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium
                transition-all duration-200
                hover:border-zinc-400 hover:bg-zinc-100
                active:scale-95
                disabled:cursor-not-allowed disabled:opacity-50
              "
            >
              Suivant
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}