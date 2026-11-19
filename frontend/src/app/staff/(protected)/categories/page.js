"use client";

import { useEffect, useState } from "react";
import { useStaffAuth } from "../../_components/useStaffAuth";
import { FaArrowUp, FaArrowDown, FaPen, FaEye, FaEyeSlash, FaPlus } from "react-icons/fa";

const NO_SUB = "none"; // produits rangés directement sous la catégorie

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const iconBtn =
  "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30";

/**
 * Une ligne de la liste : nom (sélection), ordre ↑ ↓, renommer, masquer.
 * Tout fonctionne au doigt (pas de glisser-déposer).
 */
function Row({ item, selected, onSelect, onMove, index, count, onRename, onToggle, canHide = true, muted = false }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);

  async function submit(e) {
    e.preventDefault();
    if (name.trim() && name.trim() !== item.name) await onRename(item, name.trim());
    setEditing(false);
  }

  const hidden = item.is_active === false;

  return (
    <li className={`rounded-xl border p-2 ${selected ? "border-[#FFC366] bg-[#FFC366]/10" : "border-white/10 bg-white/[0.03]"}`}>
      {editing ? (
        <form onSubmit={submit} className="flex gap-2">
          <label className="sr-only" htmlFor={`rename-${item.key}`}>Nouveau nom</label>
          <input
            id={`rename-${item.key}`}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/20 bg-white/5 px-3 text-base text-white"
          />
          <button type="submit" className="min-h-11 cursor-pointer rounded-xl bg-[#FFC366] px-3 text-sm font-bold text-black">OK</button>
          <button type="button" onClick={() => { setName(item.name); setEditing(false); }} className="min-h-11 cursor-pointer rounded-xl border border-white/15 px-3 text-sm text-white/80">
            Annuler
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelect}
            disabled={!onSelect}
            aria-pressed={onSelect ? selected : undefined}
            className="min-h-11 min-w-0 flex-1 cursor-pointer rounded-lg px-2 text-left disabled:cursor-default"
          >
            <span className={`block truncate text-base font-semibold ${hidden || muted ? "text-white/40" : "text-white"}`}>
              {item.name}
            </span>
            {hidden && <span className="text-xs font-semibold text-amber-300">Masquée sur le site</span>}
            {muted && !hidden && <span className="text-xs font-semibold text-red-300">En rupture</span>}
          </button>
          {onMove && (
            <>
              <button type="button" className={iconBtn} aria-label={`Monter ${item.name}`} disabled={index === 0} onClick={() => onMove(index, -1)}>
                <FaArrowUp aria-hidden="true" />
              </button>
              <button type="button" className={iconBtn} aria-label={`Descendre ${item.name}`} disabled={index === count - 1} onClick={() => onMove(index, 1)}>
                <FaArrowDown aria-hidden="true" />
              </button>
            </>
          )}
          {onRename && (
            <button type="button" className={iconBtn} aria-label={`Renommer ${item.name}`} onClick={() => setEditing(true)}>
              <FaPen aria-hidden="true" />
            </button>
          )}
          {canHide && onToggle && (
            <button
              type="button"
              className={iconBtn}
              aria-label={hidden ? `Afficher ${item.name} sur le site` : `Masquer ${item.name} sur le site`}
              aria-pressed={hidden}
              onClick={() => onToggle(item)}
            >
              {hidden ? <FaEyeSlash aria-hidden="true" className="text-amber-300" /> : <FaEye aria-hidden="true" />}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function AddForm({ label, placeholder, onAdd }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 text-sm font-semibold text-white/70 hover:bg-white/5">
        <FaPlus aria-hidden="true" /> {label}
      </button>
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!value.trim()) return;
        if (await onAdd(value.trim())) { setValue(""); setOpen(false); }
      }}
      className="flex gap-2"
    >
      <label className="sr-only" htmlFor={`add-${label}`}>{label}</label>
      <input id={`add-${label}`} autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder}
        className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/20 bg-white/5 px-3 text-base text-white placeholder:text-white/40" />
      <button type="submit" className="min-h-11 cursor-pointer rounded-xl bg-[#FFC366] px-3 text-sm font-bold text-black">Ajouter</button>
      <button type="button" onClick={() => setOpen(false)} className="min-h-11 cursor-pointer rounded-xl border border-white/15 px-3 text-sm text-white/80">Annuler</button>
    </form>
  );
}

function Column({ title, hint, children }) {
  return (
    <section className="flex min-h-[300px] flex-col rounded-2xl border border-white/10 bg-[#1D1D1D] p-3">
      <h2 className="px-1 text-base font-bold text-white">{title}</h2>
      {hint && <p className="mb-3 px-1 text-xs text-white/60">{hint}</p>}
      {children}
    </section>
  );
}

/**
 * Lot A4 : catégories, sous-catégories et ordre d'affichage au même endroit.
 * Remplace l'onglet « Ordre » (glisser-déposer inutilisable au doigt).
 */
export default function CategoriesPage() {
  const { API, token, authFetch } = useStaffAuth();

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function call(url, options = {}) {
    const res = await authFetch(`${API}${url}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || Object.values(data).flat()[0] || `Erreur ${res.status}`);
    return data;
  }

  async function guarded(fn) {
    setError("");
    try { return await fn(); } catch (e) { setError(String(e.message || e)); return null; }
  }

  async function loadCategories() {
    const data = await guarded(() => call("/staff/categories/", { cache: "no-store" }));
    if (data) setCategories(data);
  }

  useEffect(() => {
    if (!token) return;
    loadCategories().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || !selectedCat) { setSubcategories([]); return; }
    guarded(() => call(`/staff/subcategories/?category_id=${selectedCat}`, { cache: "no-store" })).then((d) => d && setSubcategories(d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedCat]);

  useEffect(() => {
    if (!token || !selectedCat || !selectedSub) { setProducts([]); return; }
    guarded(() => call(`/staff/products/?category_id=${selectedCat}&subcategory_id=${selectedSub}`, { cache: "no-store" }))
      .then((d) => d && setProducts(d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedCat, selectedSub]);

  /* Déplacement : on échange deux voisins, on affiche tout de suite, puis on
     enregistre l'ordre complet du groupe (positions 0, 1, 2… dans ce groupe). */
  function mover(list, setList, path) {
    return async (index, dir) => {
      const target = index + dir;
      if (target < 0 || target >= list.length) return;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      setList(next);
      const ok = await guarded(() => call(path, { method: "POST", body: JSON.stringify({ ids: next.map((x) => x.id) }) }));
      if (!ok) setList(list);
    };
  }

  async function renameCategory(cat, name) {
    const d = await guarded(() => call(`/staff/categories/${cat.id}/`, { method: "PATCH", body: JSON.stringify({ name }) }));
    if (d) setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, ...d } : c)));
  }
  async function toggleCategory(cat) {
    const hide = cat.is_active !== false;
    if (hide && !confirm(`Masquer « ${cat.name} » ? Tous ses produits disparaîtront du site.`)) return;
    const d = await guarded(() => call(`/staff/categories/${cat.id}/`, { method: "PATCH", body: JSON.stringify({ is_active: !hide }) }));
    if (d) setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, ...d } : c)));
  }
  async function renameSub(sub, name) {
    const d = await guarded(() => call(`/staff/subcategories/${sub.id}/`, { method: "PATCH", body: JSON.stringify({ name }) }));
    if (d) setSubcategories((prev) => prev.map((s) => (s.id === sub.id ? { ...s, ...d } : s)));
  }
  async function toggleSub(sub) {
    const hide = sub.is_active !== false;
    if (hide && !confirm(`Masquer « ${sub.name} » ? Ses produits disparaîtront du site.`)) return;
    const d = await guarded(() => call(`/staff/subcategories/${sub.id}/`, { method: "PATCH", body: JSON.stringify({ is_active: !hide }) }));
    if (d) setSubcategories((prev) => prev.map((s) => (s.id === sub.id ? { ...s, ...d } : s)));
  }

  async function addCategory(name) {
    const d = await guarded(() => call("/staff/categories/create/", { method: "POST", body: JSON.stringify({ name, slug: slugify(name) }) }));
    if (d) { await loadCategories(); return true; }
    return false;
  }
  async function addSub(name) {
    const d = await guarded(() => call("/staff/subcategories/create/", {
      method: "POST",
      body: JSON.stringify({ name, slug: `${slugify(categories.find((c) => c.id === selectedCat)?.name)}-${slugify(name)}`, category_id: selectedCat }),
    }));
    if (d) {
      const subs = await guarded(() => call(`/staff/subcategories/?category_id=${selectedCat}`, { cache: "no-store" }));
      if (subs) setSubcategories(subs);
      return true;
    }
    return false;
  }

  const currentCat = categories.find((c) => c.id === selectedCat);
  const subRows = [...subcategories.map((s) => ({ ...s, key: `s${s.id}` }))];
  const productTitle = selectedSub === NO_SUB
    ? `${currentCat?.name} (sans sous-catégorie)`
    : subcategories.find((s) => s.id === selectedSub)?.name;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Catégories et ordre d&apos;affichage</h1>
        <p className="text-sm text-white/60">
          Touchez une catégorie pour voir ses sous-catégories, puis une sous-catégorie pour ordonner ses produits.
          Les flèches changent l&apos;ordre sur le site.
        </p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Column title="Catégories" hint={loading ? "Chargement…" : `${categories.length} catégories`}>
          <ul className="mb-3 space-y-2">
            {categories.map((c, i) => (
              <Row
                key={c.id}
                item={{ ...c, key: `c${c.id}` }}
                index={i}
                count={categories.length}
                selected={selectedCat === c.id}
                onSelect={() => { setSelectedCat(c.id); setSelectedSub(null); }}
                onMove={mover(categories, setCategories, "/staff/categories/reorder-bulk/")}
                onRename={renameCategory}
                onToggle={toggleCategory}
              />
            ))}
          </ul>
          <AddForm label="Nouvelle catégorie" placeholder="Ex : Desserts" onAdd={addCategory} />
        </Column>

        <Column title="Sous-catégories" hint={currentCat ? `Dans « ${currentCat.name} »` : "Choisissez d'abord une catégorie"}>
          {currentCat && (
            <>
              <ul className="mb-3 space-y-2">
                {subRows.map((s, i) => (
                  <Row
                    key={s.id}
                    item={s}
                    index={i}
                    count={subRows.length}
                    selected={selectedSub === s.id}
                    onSelect={() => setSelectedSub(s.id)}
                    onMove={mover(subcategories, setSubcategories, "/staff/subcategories/reorder-bulk/")}
                    onRename={renameSub}
                    onToggle={toggleSub}
                  />
                ))}
                {/* Produits rangés directement dans la catégorie */}
                <Row
                  item={{ key: "none", name: "Sans sous-catégorie" }}
                  selected={selectedSub === NO_SUB}
                  onSelect={() => setSelectedSub(NO_SUB)}
                  canHide={false}
                />
              </ul>
              <AddForm label="Nouvelle sous-catégorie" placeholder="Ex : Makis" onAdd={addSub} />
            </>
          )}
        </Column>

        <Column title="Produits" hint={selectedSub ? `Ordre dans « ${productTitle} »` : "Choisissez une sous-catégorie"}>
          {selectedSub && (
            products.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/60">Aucun produit ici.</p>
            ) : (
              <ul className="space-y-2">
                {products.map((p, i) => (
                  <Row
                    key={p.id}
                    item={{ ...p, key: `p${p.id}` }}
                    index={i}
                    count={products.length}
                    onMove={mover(products, setProducts, "/staff/products/reorder-bulk/")}
                    canHide={false}
                    muted={!p.is_available}
                  />
                ))}
              </ul>
            )
          )}
        </Column>
      </div>
    </div>
  );
}
