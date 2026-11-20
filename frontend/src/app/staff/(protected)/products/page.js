"use client";

import { optimizedImage } from "@/lib/images";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStaffAuth } from "../../_components/useStaffAuth";
import ProductDrawer from "../../_components/ProductDrawer";
import { formatEUR } from "@/utils/formatting";
import { FaSearch, FaPlus } from "react-icons/fa";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  is_available: true,
  vat_rate: "10.0",
  image_main: "",
  category_id: "",
  subcategory_id: "",
};

// Normalise un prix saisi (« 12,5 », « 12.50 € ») ; null si invalide.
function parsePrice(raw) {
  const cleaned = String(raw ?? "").replace(/[€\s]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value > 0 ? cleaned : null;
}

// L'API renvoie le taux sous forme de nombre (10, 5.5) : on le ramène à la
// valeur exacte d'une option du menu. Sans cela, « 10 » ne correspondait à
// aucune option et le menu affichait 5,5 % (le premier choix).
const VAT_OPTIONS = ["5.5", "10.0", "20.0"];
const toVatOption = (v) => VAT_OPTIONS.find((o) => Number(o) === Number(v)) ?? "10.0";

const normalize = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const STATUS_FILTERS = [
  { key: "all", label: "Tous" },
  { key: "available", label: "Disponibles" },
  { key: "unavailable", label: "En rupture" },
];

/**
 * Lot A4 : la carte, pensée pour la tablette.
 * - recherche par nom, description ou catégorie
 * - interrupteur « disponible » sur chaque ligne (rupture en un appui)
 * - plus de champ Stock, plus de flèches d'ordre (déplacées dans Catégories)
 */
export default function StaffProductsPage() {
  const { API, token, authFetch } = useStaffAuth();

  const [products, setProducts]           = useState([]);
  const [categories, setCategories]       = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [fetching, setFetching]           = useState(true);
  const [listError, setListError]         = useState("");

  const [search, setSearch]             = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [togglingId, setTogglingId]     = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");

  async function loadAll() {
    try {
      const [p, c, s] = await Promise.all([
        authFetch(`${API}/staff/products/`, { cache: "no-store" }),
        authFetch(`${API}/staff/categories/`, { cache: "no-store" }),
        authFetch(`${API}/staff/subcategories/`, { cache: "no-store" }),
      ]);
      if (!p.ok || !c.ok || !s.ok) throw new Error("La carte n'a pas pu être chargée. Réessayez.");
      setProducts(await p.json());
      setCategories(await c.json());
      setSubcategories(await s.json());
      setListError("");
    } catch (e) {
      setListError(String(e.message || e));
    }
  }

  useEffect(() => {
    if (!token) return;
    loadAll().finally(() => setFetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ── Disponibilité en un appui (mise à jour immédiate, annulée si erreur) ── */
  async function toggleAvailability(product) {
    const next = !product.is_available;
    setTogglingId(product.id);
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_available: next } : p)));
    try {
      const res = await authFetch(`${API}/staff/products/${product.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_available: !next } : p)));
      setListError(`« ${product.name} » n'a pas pu être modifié. Réessayez.`);
    } finally {
      setTogglingId(null);
    }
  }

  /* ── Fiche produit ── */
  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, category_id: categoryFilter || "" });
    setFormError("");
    setDrawerOpen(true);
  }

  function openEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: String(product.price ?? "").replace(".", ","),
      is_available: !!product.is_available,
      vat_rate: toVatOption(product.vat_rate),
      image_main: product.image_main || "",
      category_id: product.category?.id ? String(product.category.id) : "",
      subcategory_id: product.subcategory?.id ? String(product.subcategory.id) : "",
    });
    setFormError("");
    setDrawerOpen(true);
  }

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  async function saveProduct(e) {
    e.preventDefault();
    const price = parsePrice(form.price);
    if (!form.name.trim()) { setFormError("Indiquez le nom du produit."); return; }
    if (!price) { setFormError("Prix invalide. Exemple : 12,50"); return; }
    if (!form.category_id) { setFormError("Choisissez une catégorie."); return; }

    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        is_available: form.is_available,
        vat_rate: form.vat_rate,
        image_main: form.image_main,
        category_id: Number(form.category_id),
        subcategory_id: form.subcategory_id ? Number(form.subcategory_id) : null,
      };
      const res = await authFetch(
        editingId ? `${API}/staff/products/${editingId}/` : `${API}/staff/products/create/`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const first = data.detail || Object.values(data).flat()[0];
        throw new Error(first || `Erreur ${res.status}`);
      }
      setDrawerOpen(false);
      await loadAll();
    } catch (err) {
      setFormError(String(err.message || err));
    } finally {
      setSaving(false);
    }
  }

  /* ── Filtres ── */
  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return products.filter((p) => {
      if (categoryFilter && String(p.category?.id) !== String(categoryFilter)) return false;
      if (statusFilter === "available" && !p.is_available) return false;
      if (statusFilter === "unavailable" && p.is_available) return false;
      if (!q) return true;
      return [p.name, p.description, p.category?.name, p.subcategory?.name].some((v) => normalize(v).includes(q));
    });
  }, [products, search, categoryFilter, statusFilter]);

  const unavailableCount = products.filter((p) => !p.is_available).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Produits</h1>
          <p className="text-sm text-white/60">
            {products.length} produits · {unavailableCount} en rupture
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#FFC366] px-4 text-sm font-bold text-black"
        >
          <FaPlus aria-hidden="true" /> Nouveau produit
        </button>
      </div>

      {/* Recherche et filtres */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-[#1D1D1D] p-4">
        <label className="relative block">
          <span className="sr-only">Rechercher un produit</span>
          <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit"
            className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 text-base text-white placeholder:text-white/40 outline-none focus:border-white/30"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrer par catégorie"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={statusFilter === f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`min-h-9 cursor-pointer rounded-lg px-3 text-sm font-semibold ${
                  statusFilter === f.key ? "bg-white text-black" : "text-white/70"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {listError && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{listError}</div>
      )}

      {/* Liste */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1D1D1D]">
        {fetching ? (
          <p className="py-16 text-center text-sm text-white/60">Chargement de la carte…</p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-white/60">Aucun produit ne correspond.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/5">
                  {p.image_main && <img src={optimizedImage(p.image_main, 48)} alt="" loading="lazy" className="h-full w-full object-cover" />}
                </div>

                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="min-h-11 min-w-0 flex-1 cursor-pointer text-left"
                >
                  <p className={`truncate text-base font-semibold ${p.is_available ? "text-white" : "text-white/50 line-through"}`}>
                    {p.name}
                  </p>
                  <p className="truncate text-sm text-white/60">
                    {p.category?.name}{p.subcategory?.name ? ` › ${p.subcategory.name}` : ""}
                    {p.category?.is_active === false && " · catégorie masquée"}
                  </p>
                </button>

                <p className="shrink-0 text-base font-semibold tabular-nums text-white">{formatEUR(p.price)}</p>

                {/* Interrupteur de disponibilité */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={p.is_available}
                  aria-label={`${p.name} : ${p.is_available ? "disponible" : "en rupture"}`}
                  disabled={togglingId === p.id}
                  onClick={() => toggleAvailability(p)}
                  className={`flex min-h-11 w-28 shrink-0 cursor-pointer items-center justify-center rounded-xl text-sm font-bold transition active:scale-95 ${
                    p.is_available ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"
                  }`}
                >
                  {p.is_available ? "Disponible" : "En rupture"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProductDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        editingId={editingId}
        form={form}
        setForm={setForm}
        onSubmit={saveProduct}
        loading={saving}
        error={formError}
        categories={categories}
        subcategories={subcategories}
      />
    </div>
  );
}
