"use client";

import { useEffect, useState } from "react";
import { useStaffAuth } from "../../_components/useStaffAuth";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  stock: 0,
  is_available: true,
  image_main: "",
  category_id: "",
};

export default function StaffProductsPage() {
  const { API, headers, token } = useStaffAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [newCategory, setNewCategory] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchProducts() {
    try {
      const res = await fetch(`${API}/staff/products/`, {
        headers,
        cache: "no-store",
      });

      if (!res.ok) throw new Error(await res.text());

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

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  useEffect(() => {
    if (!token) return;
    fetchProducts();
    fetchCategories();
  }, [token]);

  function onChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price || "",
      stock: product.stock ?? 0,
      is_available: !!product.is_available,
      image_main: product.image_main || "",
      category_id: product.category?.id ? String(product.category.id) : "",
    });
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function saveProduct(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        ...form,
        stock: Number(form.stock),
        category_id: form.category_id ? Number(form.category_id) : null,
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

      if (!res.ok) throw new Error(await res.text());

      setNewCategory("");
      await fetchCategories();
    } catch (e2) {
      setError(String(e2.message || e2));
    }
  }

  const filteredProducts = selectedCategory
    ? products.filter((p) => String(p.category?.id) === String(selectedCategory))
    : products;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold mb-4">
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
                rounded-xl bg-black text-white px-4 py-2 font-semibold
                transition-all duration-200
                hover:bg-zinc-800 hover:shadow-md
                active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed
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
                  hover:bg-zinc-100 hover:border-zinc-400
                  active:scale-95
                "
              >
                Annuler
              </button>
            ) : null}
          </div>
        </form>

        <div className="mt-8 border-t pt-6">
          <h3 className="font-semibold mb-3">Créer une catégorie</h3>

          <form onSubmit={createCategory} className="flex gap-2">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Ex: Maki"
              className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            />
            <button
              className="
                rounded-xl border border-zinc-300 px-4 py-2 font-medium
                transition-all duration-200
                hover:bg-zinc-100 hover:border-zinc-400 hover:shadow-sm
                active:scale-95
              "
            >
              Ajouter
            </button>
          </form>
        </div>

        {error ? (
          <div className="mt-4 text-sm text-red-600 break-words">{error}</div>
        ) : null}
      </div>

      <div className="lg:col-span-7 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold">Liste des produits</h2>

          <div className="w-full md:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
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
        </div>

        <div className="space-y-3">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border p-4 flex items-start justify-between gap-4 transition hover:shadow-sm"
            >
              <div className="flex items-start gap-4 min-w-0">
                <img
                  src={p.image_main || "/placeholder-product.png"}
                  alt={p.name}
                  className="w-20 h-20 rounded-xl object-cover border border-zinc-200 bg-zinc-100 shrink-0"
                />

                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>

                  <div className="text-sm text-zinc-500">
                    {p.category?.name || "Sans catégorie"} • {p.price} € • Stock:{" "}
                    {p.stock}
                  </div>

                  <div className="text-xs text-zinc-400 mt-1">
                    {p.is_available ? "Disponible" : "Indisponible"}
                  </div>
                </div>
              </div>

              <button
                onClick={() => startEdit(p)}
                className="
                  rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium shrink-0
                  transition-all duration-200
                  hover:bg-zinc-100 hover:border-zinc-400 hover:shadow-sm
                  active:scale-95
                "
              >
                Modifier
              </button>
            </div>
          ))}

          {filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-zinc-500 text-center">
              Aucun produit trouvé pour cette catégorie.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}