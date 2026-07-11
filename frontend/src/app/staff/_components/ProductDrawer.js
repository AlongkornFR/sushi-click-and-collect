"use client";

import { createPortal } from "react-dom";
import { useState } from "react";
import FormField from "@/components/common/FormField";
import ImageUploader from "./ImageUploader";
import { FaXmark, FaChevronDown, FaChevronUp } from "react-icons/fa6";

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-400 focus:bg-white";

export default function ProductDrawer({
  open,
  onClose,
  editingId,
  form,
  setForm,
  onChange,
  onSubmit,
  loading,
  error,
  categories,
  subcategories,
  formSubcategories,
  // Category management
  newCategory,
  setNewCategory,
  newSubCategory,
  setNewSubCategory,
  newSubCategoryParentId,
  setNewSubCategoryParentId,
  onCreateCategory,
  onCreateSubCategory,
  onReorderCategory,
  onReorderSubcategory,
}) {
  const [catOpen, setCatOpen] = useState(false);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-200 flex">
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Fermer"
      />

      {/* Panel */}
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-base font-bold text-zinc-900">
            {editingId ? "Modifier le produit" : "Nouveau produit"}
          </h2>
          <button
            type="button"
            onClick={onClose}
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

          <form id="product-form" onSubmit={onSubmit} className="space-y-4">
            <FormField label="Nom du produit">
              <input name="name" value={form.name} onChange={onChange}
                placeholder="Ex : Plateau sushi 30 pièces" className={inputCls} required />
            </FormField>

            <FormField label="Description">
              <textarea name="description" value={form.description} onChange={onChange}
                placeholder="Décris le produit…" rows={3}
                className={inputCls + " resize-none"} />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prix (€)">
                <input name="price" value={form.price} onChange={onChange}
                  placeholder="12.50" className={inputCls} required />
              </FormField>
              <FormField label="Stock">
                <input name="stock" type="number" value={form.stock} onChange={onChange}
                  className={inputCls} />
              </FormField>
            </div>

            <FormField label="Image du produit">
              <ImageUploader
                value={form.image_main}
                onChange={url => setForm(prev => ({ ...prev, image_main: url }))}
              />
            </FormField>

            <FormField label="Catégorie">
              <select name="category_id" required value={form.category_id} onChange={onChange}
                className={inputCls}>
                <option value="" disabled>Sélectionner…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>

            <FormField label="Sous-catégorie">
              <select name="subcategory_id" required value={form.subcategory_id} onChange={onChange}
                disabled={!form.category_id}
                className={inputCls + " disabled:cursor-not-allowed disabled:opacity-50"}>
                <option value="" disabled>
                  {form.category_id ? "Sélectionner…" : "Choisir d'abord une catégorie"}
                </option>
                {formSubcategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
              </select>
            </FormField>

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
              {catOpen
                ? <FaChevronUp className="text-xs text-zinc-400" />
                : <FaChevronDown className="text-xs text-zinc-400" />}
            </button>

            {catOpen && (
              <div className="mt-3 space-y-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4">

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Nouvelle catégorie
                  </p>
                  <form onSubmit={onCreateCategory} className="flex gap-2">
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

                {categories.length > 0 && (
                  <>
                    <div className="h-px bg-zinc-200" />
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                        Ordre des catégories
                      </p>
                      <div className="space-y-1">
                        {categories.map(c => (
                          <div key={c.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5">
                            <span className="truncate text-sm text-zinc-700">{c.name}</span>
                            <div className="ml-2 flex shrink-0 gap-1">
                              <button type="button" onClick={() => onReorderCategory(c.id, "up")}
                                className="cursor-pointer rounded px-1.5 py-0.5 text-sm text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 active:scale-95">
                                ↑
                              </button>
                              <button type="button" onClick={() => onReorderCategory(c.id, "down")}
                                className="cursor-pointer rounded px-1.5 py-0.5 text-sm text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 active:scale-95">
                                ↓
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="h-px bg-zinc-200" />

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Nouvelle sous-catégorie
                  </p>
                  <form onSubmit={onCreateSubCategory} className="space-y-2">
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

                {newSubCategoryParentId && (() => {
                  const filtered = subcategories.filter(
                    sc => String(sc.category?.id || sc.category_id) === String(newSubCategoryParentId)
                  );
                  return filtered.length > 0 ? (
                    <>
                      <div className="h-px bg-zinc-200" />
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                          Ordre des sous-catégories
                        </p>
                        <div className="space-y-1">
                          {filtered.map(sc => (
                            <div key={sc.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5">
                              <span className="truncate text-sm text-zinc-700">{sc.name}</span>
                              <div className="ml-2 flex shrink-0 gap-1">
                                <button type="button" onClick={() => onReorderSubcategory(sc.id, "up")}
                                  className="cursor-pointer rounded px-1.5 py-0.5 text-sm text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 active:scale-95">
                                  ↑
                                </button>
                                <button type="button" onClick={() => onReorderSubcategory(sc.id, "down")}
                                  className="cursor-pointer rounded px-1.5 py-0.5 text-sm text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 active:scale-95">
                                  ↓
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
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
  );
}
