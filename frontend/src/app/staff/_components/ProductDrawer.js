"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import ImageUploader from "./ImageUploader";
import { FaXmark } from "react-icons/fa6";

const inputCls =
  "min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-base text-white outline-none placeholder:text-white/40 focus:border-white/40";

function Field({ id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-white/80">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-white/50">{hint}</p>}
    </div>
  );
}

/**
 * Fiche produit (création / modification), lot A4 :
 * thème sombre comme le reste de l'espace staff, sans champ Stock (sans
 * effet depuis le lot C3), sous-catégorie facultative, prix avec virgule.
 * Les catégories se gèrent dans l'onglet Catégories.
 */
export default function ProductDrawer({
  open,
  onClose,
  editingId,
  form,
  setForm,
  onSubmit,
  loading,
  error,
  categories,
  subcategories,
}) {
  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    firstFieldRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (name) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // Changer de catégorie vide la sous-catégorie
      ...(name === "category_id" ? { subcategory_id: "" } : {}),
    }));
  };

  const formSubcategories = subcategories.filter(
    (sc) => String(sc.category?.id) === String(form.category_id),
  );

  return createPortal(
    <div className="fixed inset-0 z-200 flex" role="dialog" aria-modal="true" aria-labelledby="product-drawer-title">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/60" aria-label="Fermer" />

      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-[#181818] text-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-3">
          <h2 id="product-drawer-title" className="text-lg font-bold">
            {editingId ? "Modifier le produit" : "Nouveau produit"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-white/70 hover:bg-white/10"
          >
            <FaXmark />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {error && (
            <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <form id="product-form" onSubmit={onSubmit} className="space-y-4">
            <Field id="product-name" label="Nom du produit">
              <input
                ref={firstFieldRef}
                id="product-name"
                value={form.name}
                onChange={set("name")}
                placeholder="Ex : Plateau sushi 30 pièces"
                className={inputCls}
                required
              />
            </Field>

            <Field id="product-description" label="Description" hint="Une ligne s'affiche sous le nom sur la carte.">
              <textarea
                id="product-description"
                value={form.description}
                onChange={set("description")}
                placeholder="Ex : 8 makis saumon, 6 california thon"
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </Field>

            <Field id="product-price" label="Prix TTC (€)">
              <input
                id="product-price"
                inputMode="decimal"
                value={form.price}
                onChange={set("price")}
                placeholder="12,50"
                className={inputCls}
                required
              />
            </Field>

            <Field id="product-vat" label="Taux de TVA" hint="Sert à calculer le chiffre d'affaires HT. Les ventes passées gardent leur taux.">
              <select id="product-vat" value={form.vat_rate} onChange={set("vat_rate")} className={inputCls}>
                <option value="5.5">5,5 %</option>
                <option value="10.0">10 %</option>
                <option value="20.0">20 %</option>
              </select>
            </Field>

            <Field id="product-image" label="Photo">
              <ImageUploader value={form.image_main} onChange={(url) => setForm((prev) => ({ ...prev, image_main: url }))} />
            </Field>

            <Field id="product-category" label="Catégorie">
              <select id="product-category" required value={form.category_id} onChange={set("category_id")} className={inputCls}>
                <option value="" disabled>Choisir…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.is_active === false ? " (masquée)" : ""}</option>
                ))}
              </select>
            </Field>

            <Field id="product-subcategory" label="Sous-catégorie (facultatif)">
              <select
                id="product-subcategory"
                value={form.subcategory_id}
                onChange={set("subcategory_id")}
                disabled={!form.category_id}
                className={`${inputCls} disabled:opacity-50`}
              >
                <option value="">{form.category_id ? "Aucune : directement dans la catégorie" : "Choisir d'abord une catégorie"}</option>
                {formSubcategories.map((sc) => (
                  <option key={sc.id} value={sc.id}>{sc.name}{sc.is_active === false ? " (masquée)" : ""}</option>
                ))}
              </select>
            </Field>

            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input type="checkbox" checked={form.is_available} onChange={set("is_available")} className="h-5 w-5 cursor-pointer" />
              <span className="text-base">Disponible à la commande</span>
            </label>
          </form>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-white/10 px-5 py-4">
          <button type="button" onClick={onClose} className="min-h-11 flex-1 cursor-pointer rounded-xl border border-white/15 text-sm font-semibold text-white/80">
            Annuler
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={loading}
            className="min-h-11 flex-1 cursor-pointer rounded-xl bg-[#FFC366] text-sm font-bold text-black disabled:opacity-60"
          >
            {loading ? "Enregistrement…" : editingId ? "Enregistrer" : "Créer le produit"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
