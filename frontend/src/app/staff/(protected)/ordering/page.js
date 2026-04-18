"use client";

import { useEffect, useRef, useState } from "react";
import { useStaffAuth } from "../../_components/useStaffAuth";
import ProductImage from "@/components/common/ProductImage";

/* ── Drag-and-drop list ──────────────────────────────────────────────────── */

function DraggableList({ items, onReorder, selectedId, onSelect, emptyText }) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  function handleDragStart(e, id) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e, id) {
    e.preventDefault();
    if (id !== dragId) setOverId(id);
  }

  function handleDrop(e, targetId) {
    e.preventDefault();
    if (!dragId || dragId === targetId) { reset(); return; }
    const from = items.findIndex(i => i.id === dragId);
    const to   = items.findIndex(i => i.id === targetId);
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next.map(i => i.id), next);
    reset();
  }

  function reset() { setDragId(null); setOverId(null); }

  if (items.length === 0) {
    return (
      <div className="flex h-28 items-center justify-center text-sm text-white/30">
        {emptyText}
      </div>
    );
  }

  return (
    <ul className="space-y-1.5" onDragLeave={() => setOverId(null)}>
      {items.map((item, idx) => {
        const isSelected = item.id === selectedId;
        const isDragging = item.id === dragId;
        const isOver     = item.id === overId;

        return (
          <li
            key={item.id}
            draggable
            onDragStart={e => handleDragStart(e, item.id)}
            onDragOver={e  => handleDragOver(e, item.id)}
            onDrop={e      => handleDrop(e, item.id)}
            onDragEnd={reset}
            onClick={() => onSelect?.(item.id)}
            className={`group flex cursor-grab items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition select-none active:cursor-grabbing ${
              isSelected
                ? "border-[#FFC366]/40 bg-[#FFC366]/10 text-white shadow-sm"
                : isOver
                ? "border-white/30 bg-white/10 shadow-sm"
                : isDragging
                ? "border-white/10 bg-white/5 opacity-40"
                : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white"
            }`}
          >
            {/* Position badge */}
            <span className={`shrink-0 w-5 text-center text-[11px] font-bold tabular-nums ${
              isSelected ? "text-[#FFC366]" : "text-white/30"
            }`}>
              {idx + 1}
            </span>

            {/* Drag handle */}
            <span className={`shrink-0 text-base leading-none ${
              isSelected ? "text-white/50" : "text-white/20 group-hover:text-white/40"
            }`}>
              ⠿
            </span>

            {/* Image (produits) */}
            {item.image_main && (
              <ProductImage
                src={item.image_main}
                alt={item.name}
                className="h-8 w-8 shrink-0 rounded-lg border border-white/10 object-cover"
              />
            )}

            {/* Nom */}
            <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>

            {/* Flèche si sélectionnable */}
            {onSelect && isSelected && (
              <span className="shrink-0 text-[#FFC366]">→</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ── Colonne wrapper ─────────────────────────────────────────────────────── */

function Column({ title, subtitle, loading, children }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {loading
          ? <span className="text-[11px] text-white/40">Chargement…</span>
          : subtitle && <span className="text-[11px] text-white/40">{subtitle}</span>
        }
      </div>
      <div className="min-h-[300px] max-h-[calc(100vh-14rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#1D1D1D] p-3">
        {children}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function OrderingPage() {
  const { API, token, authFetch } = useStaffAuth();

  const [categories,    setCategories]    = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [products,      setProducts]      = useState([]);

  const [selectedCatId, setSelectedCatId] = useState(null);
  const [selectedSubId, setSelectedSubId] = useState(null);

  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingProds, setLoadingProds] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  /* ── Fetch catégories ── */
  useEffect(() => {
    if (!token) return;
    setLoadingCats(true);
    authFetch(`${API}/staff/categories/`)
      .then(r => r.json())
      .then(d => setCategories(Array.isArray(d) ? d : []))
      .finally(() => setLoadingCats(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ── Fetch sous-catégories quand catégorie sélectionnée ── */
  useEffect(() => {
    if (!token || !selectedCatId) { setSubcategories([]); setSelectedSubId(null); return; }
    setLoadingSubs(true);
    setSubcategories([]);
    setSelectedSubId(null);
    authFetch(`${API}/staff/subcategories/?category_id=${selectedCatId}`)
      .then(r => r.json())
      .then(d => setSubcategories(Array.isArray(d) ? d : []))
      .finally(() => setLoadingSubs(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedCatId]);

  /* ── Fetch produits quand sous-catégorie sélectionnée ── */
  useEffect(() => {
    if (!token || !selectedSubId) { setProducts([]); return; }
    setLoadingProds(true);
    setProducts([]);
    authFetch(`${API}/staff/products/?subcategory_id=${selectedSubId}`)
      .then(r => r.json())
      .then(d => setProducts(Array.isArray(d) ? d : []))
      .finally(() => setLoadingProds(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedSubId]);

  /* ── Bulk reorder ── */
  async function reorderBulk(path, ids) {
    setSaving(true);
    setError("");
    try {
      const res = await authFetch(`${API}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  function handleReorderCategories(ids, next) {
    setCategories(next);
    reorderBulk("staff/categories/reorder-bulk/", ids);
  }

  function handleReorderSubcategories(ids, next) {
    setSubcategories(next);
    reorderBulk("staff/subcategories/reorder-bulk/", ids);
  }

  function handleReorderProducts(ids, next) {
    setProducts(next);
    reorderBulk("staff/products/reorder-bulk/", ids);
  }

  function handleSelectCategory(id) {
    setSelectedCatId(prev => prev === id ? null : id);
  }

  function handleSelectSubcategory(id) {
    setSelectedSubId(prev => prev === id ? null : id);
  }

  /* ── Render ── */
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Ordre d'affichage</h1>
          <p className="mt-0.5 text-sm text-white/40">
            Glissez-déposez pour réorganiser. Cliquez sur un élément pour voir ses sous-éléments.
          </p>
        </div>
        {saving && (
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/50">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FFC366]" />
            Sauvegarde…
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Breadcrumb de sélection */}
      {(selectedCatId || selectedSubId) && (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <span className="font-medium text-white">
            {categories.find(c => c.id === selectedCatId)?.name ?? "…"}
          </span>
          {selectedSubId && (
            <>
              <span className="text-white/30">→</span>
              <span className="font-medium text-white">
                {subcategories.find(s => s.id === selectedSubId)?.name ?? "…"}
              </span>
            </>
          )}
        </div>
      )}

      {/* 3 colonnes drag-and-drop */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        {/* Catégories */}
        <Column
          title="Catégories"
          subtitle={`${categories.length} catégorie${categories.length !== 1 ? "s" : ""}`}
          loading={loadingCats}
        >
          <DraggableList
            items={categories}
            onReorder={handleReorderCategories}
            selectedId={selectedCatId}
            onSelect={handleSelectCategory}
            emptyText="Aucune catégorie"
          />
        </Column>

        {/* Sous-catégories */}
        <Column
          title="Sous-catégories"
          subtitle={selectedCatId
            ? `${subcategories.length} sous-catégorie${subcategories.length !== 1 ? "s" : ""}`
            : undefined
          }
          loading={loadingSubs}
        >
          {!selectedCatId ? (
            <div className="flex h-28 items-center justify-center text-sm text-white/30">
              ← Sélectionner une catégorie
            </div>
          ) : (
            <DraggableList
              items={subcategories}
              onReorder={handleReorderSubcategories}
              selectedId={selectedSubId}
              onSelect={handleSelectSubcategory}
              emptyText="Aucune sous-catégorie"
            />
          )}
        </Column>

        {/* Produits */}
        <Column
          title="Produits"
          subtitle={selectedSubId
            ? `${products.length} produit${products.length !== 1 ? "s" : ""}`
            : undefined
          }
          loading={loadingProds}
        >
          {!selectedSubId ? (
            <div className="flex h-28 items-center justify-center text-sm text-white/30">
              ← Sélectionner une sous-catégorie
            </div>
          ) : (
            <DraggableList
              items={products}
              onReorder={handleReorderProducts}
              selectedId={null}
              onSelect={null}
              emptyText="Aucun produit"
            />
          )}
        </Column>

      </div>
    </div>
  );
}
