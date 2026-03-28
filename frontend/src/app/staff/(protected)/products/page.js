"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStaffAuth } from "../../_components/useStaffAuth";
import { DEFAULT_PRODUCT_IMAGE } from "@/utils/constant";
import { FaXmark, FaPlus, FaChevronDown, FaChevronUp } from "react-icons/fa6";

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

const PRODUCTS_PER_PAGE = 10;

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-zinc-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="skeleton h-3 w-20 rounded-full" />
      <div className="skeleton mt-3 h-8 w-12 rounded-xl" />
      <div className="skeleton mt-2 h-2.5 w-16 rounded-full" />
    </div>
  );
}

function ProductRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="skeleton h-14 w-14 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-48 rounded-full" />
        <div className="flex gap-2">
          <div className="skeleton h-3 w-16 rounded-full" />
          <div className="skeleton h-3 w-14 rounded-full" />
        </div>
      </div>
      <div className="hidden shrink-0 space-y-1.5 sm:block">
        <div className="skeleton h-3.5 w-14 rounded-full" />
        <div className="skeleton h-3 w-12 rounded-full" />
      </div>
      <div className="skeleton h-6 w-12 shrink-0 rounded-full" />
      <div className="skeleton h-8 w-20 shrink-0 rounded-xl" />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function ImageUploader({ value, onChange, authFetch, API }) {
  const inputRef            = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging]   = useState(false);

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Fichier non supporté. Choisissez une image.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      // 1. Obtenir l'URL d'upload directe depuis le backend
      const res = await authFetch(`${API}/staff/cloudflare-upload-url/`, { method: "POST" });
      if (!res.ok) throw new Error("Impossible d'obtenir l'URL d'upload.");
      const { upload_url } = await res.json();

      // 2. Upload direct vers Cloudflare (pas d'auth nécessaire)
      const fd = new FormData();
      fd.append("file", file);
      const cfRes = await fetch(upload_url, { method: "POST", body: fd });
      if (!cfRes.ok) throw new Error("Erreur lors de l'envoi vers Cloudflare.");
      const cfData = await cfRes.json();

      const imageUrl = cfData.result?.variants?.[0];
      if (!imageUrl) throw new Error("URL image non reçue de Cloudflare.");

      onChange(imageUrl);
    } catch (e) {
      setUploadError(String(e.message || e));
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        className={`relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition ${
          dragging   ? "border-zinc-400 bg-zinc-100" :
          uploading  ? "border-zinc-200 bg-zinc-50 cursor-wait" :
                       "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />

        {value ? (
          /* ── Preview ── */
          <div className="relative h-40">
            <img src={value} alt="Aperçu" className="h-full w-full object-cover" />
            {!uploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 opacity-0 transition hover:opacity-100">
                <p className="text-xs font-semibold text-white">Changer l'image</p>
                <p className="text-[10px] text-white/70">Clic ou glisser</p>
              </div>
            )}
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <span className="text-2xl">🖼️</span>
            <p className="text-xs font-medium text-zinc-500">Glisser une image ici</p>
            <p className="text-[10px] text-zinc-400">ou cliquer pour parcourir</p>
          </div>
        )}

        {/* Upload spinner overlay */}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700" />
            <p className="text-xs text-zinc-500">Upload en cours…</p>
          </div>
        )}
      </div>

      {uploadError && (
        <p className="mt-1.5 text-xs text-red-500">{uploadError}</p>
      )}

      {/* URL manuelle en repli */}
      {!value && !uploading && (
        <input
          type="text"
          placeholder="Ou coller une URL d'image…"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs outline-none transition focus:border-zinc-400 focus:bg-white"
        />
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-400 focus:bg-white";

export default function StaffProductsPage() {
  const { API, token, authFetch } = useStaffAuth();

  const [products, setProducts]         = useState([]);
  const [categories, setCategories]     = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [form, setForm]         = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [newCategory, setNewCategory]               = useState("");
  const [newSubCategory, setNewSubCategory]         = useState("");
  const [newSubCategoryParentId, setNewSubCategoryParentId] = useState("");

  const [selectedCategory, setSelectedCategory]     = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [fetching, setFetching]       = useState(true);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [catOpen, setCatOpen]         = useState(false);

  /* ── Data fetchers ── */
  async function fetchProducts() {
    try {
      const res = await authFetch(`${API}/staff/products/`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) { setError(String(e.message || e)); }
  }

  async function fetchCategories() {
    try {
      const res = await authFetch(`${API}/staff/categories/`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) { setError(String(e.message || e)); }
  }

  async function fetchSubcategories(categoryId = "") {
    try {
      const url = categoryId
        ? `${API}/staff/subcategories/?category_id=${categoryId}`
        : `${API}/staff/subcategories/`;
      const res = await authFetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSubcategories(Array.isArray(data) ? data : []);
    } catch (e) { setError(String(e.message || e)); }
  }

  useEffect(() => {
    if (!token) return;
    Promise.all([fetchProducts(), fetchCategories(), fetchSubcategories()])
      .finally(() => setFetching(false));
  }, [token]);

  useEffect(() => { setCurrentPage(1); }, [selectedCategory, selectedSubCategory]);

  /* ── Form handlers ── */
  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "category_id") {
        updated.subcategory_id = "";
        fetchSubcategories(value);
      }
      return updated;
    });
  }

  function openCreate() {
    resetForm();
    setDrawerOpen(true);
  }

  function openEdit(product) {
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
      subcategory_id: product.subcategory?.id ? String(product.subcategory.id) : "",
    });
    if (categoryId) fetchSubcategories(categoryId);
    else fetchSubcategories();
    setError("");
    setDrawerOpen(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    fetchSubcategories();
  }

  function closeDrawer() {
    setDrawerOpen(false);
    resetForm();
    setCatOpen(false);
  }

  async function saveProduct(e) {
    e.preventDefault();
    setError("");
    if (!form.category_id)    { setError("La catégorie est obligatoire.");      return; }
    if (!form.subcategory_id) { setError("La sous-catégorie est obligatoire."); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        stock: Number(form.stock),
        category_id: Number(form.category_id),
        subcategory_id: Number(form.subcategory_id),
      };
      const url    = editingId ? `${API}/staff/products/${editingId}/` : `${API}/staff/products/create/`;
      const method = editingId ? "PATCH" : "POST";
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchProducts();
      setCurrentPage(1);
      closeDrawer();
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
      const slug = newCategory.toLowerCase().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
      const res = await authFetch(`${API}/staff/categories/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory.trim(), slug }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setNewCategory("");
      setNewSubCategoryParentId(String(created.id));
      await fetchCategories();
    } catch (e2) { setError(String(e2.message || e2)); }
  }

  async function createSubCategory(e) {
    e.preventDefault();
    setError("");
    if (!newSubCategoryParentId) { setError("Choisis une catégorie parente."); return; }
    if (!newSubCategory.trim()) return;
    try {
      const slug = newSubCategory.toLowerCase().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
      const res = await authFetch(`${API}/staff/subcategories/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubCategory.trim(), slug, category_id: Number(newSubCategoryParentId) }),
      });
      if (!res.ok) throw new Error(await res.text());
      setNewSubCategory("");
      await fetchSubcategories();
    } catch (e2) { setError(String(e2.message || e2)); }
  }

  /* ── Derived data ── */
  const formSubcategories = useMemo(() =>
    !form.category_id ? [] :
    subcategories.filter(sc => String(sc.category?.id || sc.category_id) === String(form.category_id)),
  [subcategories, form.category_id]);

  const visibleSubcategories = useMemo(() =>
    !selectedCategory ? subcategories :
    subcategories.filter(sc => String(sc.category?.id || sc.category_id) === String(selectedCategory)),
  [subcategories, selectedCategory]);

  const filteredProducts = useMemo(() =>
    products.filter(p => {
      const matchCat = selectedCategory ? String(p.category?.id) === String(selectedCategory) : true;
      const matchSub = selectedSubCategory ? String(p.subcategory?.id) === String(selectedSubCategory) : true;
      return matchCat && matchSub;
    }),
  [products, selectedCategory, selectedSubCategory]);

  const totalPages      = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, safeCurrentPage]);

  const availableCount   = products.filter(p => p.is_available).length;
  const unavailableCount = products.filter(p => !p.is_available).length;

  /* ── Render ── */
  return (
    <div className="space-y-5">

      {/* ── Stats bento row ── */}
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

      {/* ── Product list card ── */}
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
              onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubCategory(""); }}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:bg-white"
            >
              <option value="">Toutes catégories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select
              value={selectedSubCategory}
              onChange={(e) => setSelectedSubCategory(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:bg-white"
            >
              <option value="">Toutes sous-catégories</option>
              {visibleSubcategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
            </select>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 active:scale-95"
            >
              <FaPlus className="text-xs" />
              Nouveau
            </button>
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-zinc-100">
          {fetching ? (
            Array.from({ length: 6 }).map((_, i) => <ProductRowSkeleton key={i} />)
          ) : paginatedProducts.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-zinc-400">
              Aucun produit pour ce filtre.
            </div>
          ) : paginatedProducts.map(p => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-zinc-50">
              <img
                src={p.image_main || DEFAULT_PRODUCT_IMAGE}
                alt={p.name}
                onError={e => { e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
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
                onClick={() => openEdit(p)}
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
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Précédent
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 cursor-pointer rounded-lg text-sm font-medium transition ${
                    page === safeCurrentPage
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
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>

      {/* ── Drawer (portal) ── */}
      {drawerOpen && createPortal(
        <div className="fixed inset-0 z-200 flex">
          {/* Backdrop */}
          <button
            type="button"
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="Fermer"
          />

          {/* Panel */}
          <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">

            {/* Drawer header */}
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-4">
              <h2 className="text-base font-bold text-zinc-900">
                {editingId ? "Modifier le produit" : "Nouveau produit"}
              </h2>
              <button
                type="button"
                onClick={closeDrawer}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                <FaXmark className="text-sm" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">

              {error && (
                <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form id="product-form" onSubmit={saveProduct} className="space-y-4">
                <Field label="Nom du produit">
                  <input name="name" value={form.name} onChange={onChange}
                    placeholder="Ex : Plateau sushi 30 pièces" className={inputCls} required />
                </Field>

                <Field label="Description">
                  <textarea name="description" value={form.description} onChange={onChange}
                    placeholder="Décris le produit…" rows={3}
                    className={inputCls + " resize-none"} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prix (€)">
                    <input name="price" value={form.price} onChange={onChange}
                      placeholder="12.50" className={inputCls} required />
                  </Field>
                  <Field label="Stock">
                    <input name="stock" type="number" value={form.stock} onChange={onChange}
                      className={inputCls} />
                  </Field>
                </div>

                <Field label="Image du produit">
                  <ImageUploader
                    value={form.image_main}
                    onChange={url => setForm(prev => ({ ...prev, image_main: url }))}
                    authFetch={authFetch}
                    API={API}
                  />
                </Field>

                <Field label="Catégorie">
                  <select name="category_id" required value={form.category_id} onChange={onChange}
                    className={inputCls}>
                    <option value="" disabled>Sélectionner…</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>

                <Field label="Sous-catégorie">
                  <select name="subcategory_id" required value={form.subcategory_id} onChange={onChange}
                    disabled={!form.category_id} className={inputCls + " disabled:cursor-not-allowed disabled:opacity-50"}>
                    <option value="" disabled>
                      {form.category_id ? "Sélectionner…" : "Choisir d'abord une catégorie"}
                    </option>
                    {formSubcategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                  </select>
                </Field>

                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" name="is_available" checked={form.is_available}
                    onChange={onChange} className="h-4 w-4 cursor-pointer rounded" />
                  <span className="text-sm font-medium text-zinc-700">Produit disponible</span>
                </label>
              </form>

              {/* Categories accordion */}
              <div className="mt-6 border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={() => setCatOpen(p => !p)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50"
                >
                  Gérer les catégories
                  {catOpen ? <FaChevronUp className="text-xs text-zinc-400" /> : <FaChevronDown className="text-xs text-zinc-400" />}
                </button>

                {catOpen && (
                  <div className="mt-3 space-y-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4">

                    {/* Add category */}
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">Nouvelle catégorie</p>
                      <form onSubmit={createCategory} className="flex gap-2">
                        <input
                          value={newCategory}
                          onChange={e => setNewCategory(e.target.value)}
                          placeholder="Ex : Sushi"
                          className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-400"
                        />
                        <button type="submit"
                          className="cursor-pointer rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 active:scale-95">
                          Ajouter
                        </button>
                      </form>
                    </div>

                    <div className="h-px bg-zinc-200" />

                    {/* Add subcategory */}
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">Nouvelle sous-catégorie</p>
                      <form onSubmit={createSubCategory} className="space-y-2">
                        <select
                          value={newSubCategoryParentId}
                          onChange={e => setNewSubCategoryParentId(e.target.value)}
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-400"
                        >
                          <option value="">Catégorie parente…</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <input
                            value={newSubCategory}
                            onChange={e => setNewSubCategory(e.target.value)}
                            placeholder="Ex : Maki"
                            className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-400"
                          />
                          <button type="submit"
                            disabled={!newSubCategoryParentId}
                            className="cursor-pointer rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
                            Ajouter
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer footer */}
            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-zinc-100 px-6 py-4">
              <button
                type="button"
                onClick={closeDrawer}
                className="cursor-pointer rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 active:scale-95"
              >
                Annuler
              </button>
              <button
                type="submit"
                form="product-form"
                disabled={loading}
                className="cursor-pointer rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Enregistrement…" : editingId ? "Mettre à jour" : "Créer le produit"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
