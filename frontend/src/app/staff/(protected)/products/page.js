"use client";

import { useEffect, useMemo, useState } from "react";
import { useStaffAuth } from "../../_components/useStaffAuth";


function centsFromPriceInput(v) {
  // accepte "12.50" ou "12,50"
  const s = String(v ?? "").trim().replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function priceInputFromCents(cents) {
  if (cents == null) return "";
  return (Number(cents) / 100).toFixed(2);
}

export default function StaffProductsPage() {
  const { API, headers, token } = useStaffAuth();

  const [q, setQ] = useState("");
  const [products, setProducts] = useState([]);
  const [drafts, setDrafts] = useState({}); // { [id]: { stock, priceStr, is_available } }
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const hasToken = useMemo(() => Boolean(token), [token]);

  async function fetchProducts() {
    if (!hasToken) return;
    setError("");
    setLoading(true);
    try {
      const url = new URL(`${API}/staff/products/`);
      if (q.trim()) url.searchParams.set("q", q.trim());

      const res = await fetch(url.toString(), { headers, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setProducts(list);

      // init drafts (ne pas écraser les modifs en cours si déjà présentes)
      setDrafts((prev) => {
        const next = { ...prev };
        for (const p of list) {
          if (!next[p.id]) {
            next[p.id] = {
              stock: p.stock ?? 0,
              priceStr: priceInputFromCents(p.price_cents),
              is_available: Boolean(p.is_available),
            };
          }
        }
        return next;
      });
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasToken) return;
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken]);

  function updateDraft(id, patch) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  function isDirty(p) {
    const d = drafts[p.id];
    if (!d) return false;
    const stockSame = Number(d.stock) === Number(p.stock ?? 0);
    const priceSame = centsFromPriceInput(d.priceStr) === Number(p.price_cents ?? 0);
    const availSame = Boolean(d.is_available) === Boolean(p.is_available);
    return !(stockSame && priceSame && availSame);
  }

  async function saveProduct(p) {
    const d = drafts[p.id];
    if (!d) return;

    const stock = Number(d.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      setError("Stock invalide (entier >= 0).");
      return;
    }

    const price_cents = centsFromPriceInput(d.priceStr);
    if (price_cents == null) {
      setError("Prix invalide (ex: 12.50).");
      return;
    }

    setError("");
    setSavingId(p.id);

    try {
      const res = await fetch(`${API}/staff/products/${p.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          stock,
          price_cents,
          is_available: Boolean(d.is_available),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);

      // refresh list
      await fetchProducts();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSavingId(null);
    }
  }

  async function saveAllDirty() {
    for (const p of products) {
      if (isDirty(p)) {
        // eslint-disable-next-line no-await-in-loop
        await saveProduct(p);
      }
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-extrabold">Produits / Stock</h2>
          <p className="text-zinc-600 text-sm">Gère le stock, le prix et la disponibilité.</p>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={fetchProducts}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-100"
          >
            Rafraîchir
          </button>
          <button
            onClick={saveAllDirty}
            className="rounded-xl bg-black text-white px-3 py-2 text-sm font-semibold hover:opacity-90"
          >
            Enregistrer tout
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col md:flex-row gap-2 md:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un produit…"
          className="w-full md:max-w-md rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
        />
        <button
          onClick={fetchProducts}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-100"
        >
          Rechercher
        </button>

        {loading ? <span className="text-sm text-zinc-500">Chargement…</span> : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-left text-xs uppercase text-zinc-500">
              <th className="py-2 pr-3">Produit</th>
              <th className="py-2 pr-3">Prix (€)</th>
              <th className="py-2 pr-3">Stock</th>
              <th className="py-2 pr-3">Disponible</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => {
              const d = drafts[p.id] || {
                stock: p.stock ?? 0,
                priceStr: priceInputFromCents(p.price_cents),
                is_available: Boolean(p.is_available),
              };
              const dirty = isDirty(p);

              return (
                <tr key={p.id} className="border-t border-zinc-100">
                  <td className="py-3 pr-3">
                    <div className="font-semibold text-zinc-900">{p.name}</div>
                    <div className="text-xs text-zinc-500">id: {p.id}</div>
                  </td>

                  <td className="py-3 pr-3">
                    <input
                      value={d.priceStr}
                      onChange={(e) => updateDraft(p.id, { priceStr: e.target.value })}
                      className="w-28 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                      inputMode="decimal"
                    />
                  </td>

                  <td className="py-3 pr-3">
                    <input
                      value={d.stock}
                      onChange={(e) => updateDraft(p.id, { stock: e.target.value === "" ? "" : Number(e.target.value) })}
                      className="w-24 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                      inputMode="numeric"
                    />
                  </td>

                  <td className="py-3 pr-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(d.is_available)}
                        onChange={(e) => updateDraft(p.id, { is_available: e.target.checked })}
                      />
                      <span className={Boolean(d.is_available) ? "text-zinc-900" : "text-zinc-500"}>
                        {Boolean(d.is_available) ? "Oui" : "Non"}
                      </span>
                    </label>
                  </td>

                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      {dirty ? (
                        <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                          Modifié
                        </span>
                      ) : (
                        <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                          OK
                        </span>
                      )}

                      <button
                        onClick={() => saveProduct(p)}
                        disabled={!dirty || savingId === p.id}
                        className={
                          "rounded-xl px-3 py-2 text-sm font-semibold " +
                          (!dirty || savingId === p.id
                            ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                            : "bg-black text-white hover:opacity-90")
                        }
                      >
                        {savingId === p.id ? "Sauvegarde…" : "Enregistrer"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-zinc-600">
                  Aucun produit (ou recherche vide).
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
