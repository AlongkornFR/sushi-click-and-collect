"use client";

import { useEffect, useRef, useState } from "react";
import { useStaffAuth } from "../../_components/useStaffAuth";
import { printOrder as qzPrint } from "@/lib/printer";
import PrinterStatus from "@/components/staff/PrinterStatus";
import { FaPrint, FaTrash } from "react-icons/fa";

/* ── Status config ── */
const STATUS_CONFIG = {
  pending:   { label: "En attente",     badge: "bg-amber-100 text-amber-700",    dot: "bg-amber-400"  },
  paid:      { label: "Payée",          badge: "bg-blue-100 text-blue-700",      dot: "bg-blue-400"   },
  preparing: { label: "En préparation", badge: "bg-orange-100 text-orange-700",  dot: "bg-orange-400" },
  ready:     { label: "Prête",          badge: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-400"},
  collected: { label: "Récupérée",      badge: "bg-zinc-100 text-zinc-500",      dot: "bg-zinc-300"   },
  cancelled: { label: "Annulée",        badge: "bg-red-100 text-red-500",        dot: "bg-red-400"    },
};

const STATUS_ACTIONS = {
  pending:   [
    { label: "En préparation", status: "preparing", style: "primary" },
    { label: "Annuler",        status: "cancelled", style: "danger"  },
  ],
  paid:      [
    { label: "En préparation", status: "preparing", style: "primary" },
    { label: "Annuler",        status: "cancelled", style: "danger"  },
  ],
  preparing: [
    { label: "Prête à retirer", status: "ready",    style: "success" },
    { label: "Annuler",         status: "cancelled",style: "danger"  },
  ],
  ready:     [
    { label: "Récupérée", status: "collected", style: "neutral" },
  ],
  collected: [],
  cancelled: [],
};

const ALL_STATUSES = ["pending", "paid", "preparing", "ready", "collected", "cancelled"];

/* ── Helpers ── */
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, badge: "bg-zinc-100 text-zinc-500", dot: "bg-zinc-300" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, color = "text-white" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-5">
      <div className="skeleton h-3 w-20 rounded-full" />
      <div className="skeleton mt-3 h-8 w-10 rounded-xl" />
    </div>
  );
}

function OrderCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="skeleton h-4 w-14 rounded-full" />
            <div className="skeleton h-5 w-24 rounded-full" />
          </div>
          <div className="skeleton h-3.5 w-44 rounded-full" />
          <div className="skeleton h-3 w-28 rounded-full" />
        </div>
        <div className="skeleton h-8 w-20 rounded-xl" />
      </div>
      <div className="mt-4 border-t border-white/10 pt-3 space-y-2">
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-3 w-2/3 rounded-full" />
      </div>
    </div>
  );
}

/* ── Page principale ── */
export default function StaffOrdersPage() {
  const { API, token, authFetch } = useStaffAuth();

  const [orders, setOrders]             = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError]               = useState("");
  const [fetching, setFetching]         = useState(true);
  const [updating, setUpdating]         = useState(null);
  const [printingId, setPrintingId]     = useState(null);
  const [printError, setPrintError]     = useState("");
  const [deletingId, setDeletingId]     = useState(null);

  // IDs déjà auto-imprimés dans cette session (évite les doublons)
  const autoPrintedRef = useRef(new Set());

  // ── Fetch commandes ────────────────────────────────────────────────────────

  async function fetchOrders(silent = false) {
    if (!token) return;
    if (!silent) setError("");
    try {
      const url = new URL(`${API}/staff/orders/`);
      if (statusFilter) url.searchParams.set("status", statusFilter);
      const res = await authFetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text()}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      if (!silent) setError(String(e.message || e));
    }
  }

  // ── Impression manuelle ────────────────────────────────────────────────────

  async function handlePrint(order) {
    setPrintingId(order.id);
    setPrintError("");
    try {
      await qzPrint(order);
      await markPrinted(order.id);
    } catch (e) {
      setPrintError(`Impression #${order.id} : ${e.message}`);
    } finally {
      setPrintingId(null);
    }
  }

  // ── Marquer comme imprimé ─────────────────────────────────────────────────

  async function markPrinted(orderId) {
    try {
      await authFetch(`${API}/staff/orders/${orderId}/printed/`, { method: "PATCH" });
      // Mise à jour locale immédiate
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, printed: true } : o))
      );
    } catch {
      // Non bloquant
    }
  }

  // ── Changement de statut ──────────────────────────────────────────────────

  async function setStatus(orderId, status) {
    setUpdating(orderId);
    setError("");
    try {
      const res = await authFetch(`${API}/staff/orders/${orderId}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text()}`);
      await fetchOrders(true);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setUpdating(null);
    }
  }

  // ── Supprimer une commande ────────────────────────────────────────────────

  async function deleteOrder(orderId) {
    if (!confirm(`Supprimer définitivement la commande #${orderId} ?`)) return;
    setDeletingId(orderId);
    setError("");
    try {
      const res = await authFetch(`${API}/staff/orders/${orderId}/delete/`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status} – ${await res.text()}`);
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setDeletingId(null);
    }
  }

  // ── Polling commandes (affichage) — toutes les 3s ─────────────────────────

  useEffect(() => {
    if (!token) return;
    setFetching(true);
    fetchOrders().finally(() => setFetching(false));
    const id = setInterval(() => fetchOrders(true), 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  // ── Auto-impression — toutes les 5s ──────────────────────────────────────

  useEffect(() => {
    if (!token) return;

    async function checkAndAutoPrint() {
      try {
        const res = await authFetch(`${API}/staff/orders/pending-print/`, { cache: "no-store" });
        if (!res.ok) return;
        const newOrders = await res.json();

        for (const order of newOrders) {
          if (autoPrintedRef.current.has(order.id)) continue;
          autoPrintedRef.current.add(order.id);
          try {
            await qzPrint(order);
            await markPrinted(order.id);
          } catch {
            // Si QZ Tray n'est pas disponible, on ne bloque pas
            // La commande reste printed=false pour une impression manuelle
            autoPrintedRef.current.delete(order.id);
          }
        }
      } catch {
        // Silencieux — ne pas perturber l'interface
      }
    }

    const id = setInterval(checkAndAutoPrint, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ── Stats ── */
  const pendingCount   = orders.filter(o => o.status === "pending" || o.status === "paid").length;
  const preparingCount = orders.filter(o => o.status === "preparing").length;
  const readyCount     = orders.filter(o => o.status === "ready").length;

  /* ── Render ── */
  return (
    <div className="space-y-5">

      {/* ── Stats bento row ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {fetching ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total"          value={orders.length} />
            <StatCard label="En attente"     value={pendingCount}   color="text-amber-400" />
            <StatCard label="En préparation" value={preparingCount} color="text-orange-400" />
            <StatCard label="Prêtes"         value={readyCount}     color="text-emerald-400" />
          </>
        )}
      </div>

      {/* ── Main card ── */}
      <div className="rounded-2xl border border-white/10 bg-[#1D1D1D]">

        {/* Header */}
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-white">Commandes</h1>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live
              </span>
            </div>
            <div className="flex items-center gap-3">
              <PrinterStatus />
              <button
                type="button"
                onClick={() => fetchOrders()}
                className="cursor-pointer rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/50 transition hover:bg-white/10 hover:text-white active:scale-95"
              >
                Rafraîchir
              </button>
            </div>
          </div>

          {/* Status filter pills */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setStatusFilter("")}
              className={`shrink-0 cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                !statusFilter ? "bg-[#FFC366] text-black" : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
              }`}
            >
              Toutes
            </button>
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  statusFilter === s ? "bg-[#FFC366] text-black" : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
                }`}
              >
                {STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {/* Erreurs */}
        {error && (
          <div className="mx-5 mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {printError && (
          <div className="mx-5 mt-4 rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-400">
            🖨️ {printError}
          </div>
        )}

        {/* Order list */}
        <div className="divide-y divide-white/5 px-5 py-2">

          {fetching ? (
            <div className="space-y-3 py-3">
              {Array.from({ length: 4 }).map((_, i) => <OrderCardSkeleton key={i} />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-sm text-white/40">
              Aucune commande{statusFilter ? ` avec le statut « ${STATUS_CONFIG[statusFilter]?.label ?? statusFilter} »` : ""}.
            </div>
          ) : orders.map(o => {
            const actions    = STATUS_ACTIONS[o.status] ?? [];
            const isUpdating = updating === o.id;
            const isPrinting = printingId === o.id;
            const isDeleting = deletingId === o.id;

            return (
              <div key={o.id} className="py-4">
                {/* Order header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">#{o.id}</span>
                      <StatusBadge status={o.status} />
                      {o.pickup_time && (
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/60">
                          ⏱ {o.pickup_time}
                        </span>
                      )}
                      {o.printed && (
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/40">
                          🖨️ Imprimé
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-white/80">{o.full_name}</p>
                    {o.phone && <p className="text-xs text-white/40">{o.phone}</p>}
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-base font-bold text-[#FFC366]">
                      {(o.total_cents / 100).toFixed(2)} €
                    </p>
                    {/* Bouton impression thermique */}
                    <button
                      type="button"
                      onClick={() => handlePrint(o)}
                      disabled={isPrinting}
                      title={o.printed ? "Réimprimer" : "Imprimer"}
                      className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border transition active:scale-95 disabled:cursor-wait disabled:opacity-50 ${
                        o.printed
                          ? "border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                      aria-label="Imprimer le ticket"
                    >
                      {isPrinting
                        ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                        : <FaPrint className="text-sm" />
                      }
                    </button>
                    {/* Bouton suppression */}
                    <button
                      type="button"
                      onClick={() => deleteOrder(o.id)}
                      disabled={isDeleting}
                      title="Supprimer la commande"
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 hover:text-red-300 active:scale-95 disabled:cursor-wait disabled:opacity-50"
                      aria-label="Supprimer la commande"
                    >
                      {isDeleting
                        ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-500/30 border-t-red-400" />
                        : <FaTrash className="text-sm" />
                      }
                    </button>
                  </div>
                </div>

                {/* Items */}
                {(o.items || []).length > 0 && (
                  <div className="mt-3 rounded-xl bg-white/5 px-4 py-3">
                    <ul className="space-y-1">
                      {o.items.map(it => (
                        <li key={it.id} className="flex items-center justify-between text-sm">
                          <span className="text-white/60">
                            <span className="font-semibold text-white">{it.quantity}×</span>{" "}
                            {it.product_name}
                          </span>
                          <span className="font-semibold text-white/70">
                            {(it.line_total_cents / 100).toFixed(2)} €
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notes */}
                {o.notes && (
                  <p className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                    📝 {o.notes}
                  </p>
                )}

                {/* Actions statut */}
                {actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {actions.map(action => (
                      <button
                        key={action.status}
                        type="button"
                        onClick={() => setStatus(o.id, action.status)}
                        disabled={isUpdating}
                        className={`cursor-pointer rounded-xl px-6 py-3.5 text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                          action.style === "primary" ? "bg-[#FFC366] text-black hover:bg-[#ffb347]"
                          : action.style === "success" ? "bg-emerald-500 text-white hover:bg-emerald-400"
                          : action.style === "danger"  ? "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          : "border border-white/10 text-white/60 hover:bg-white/10"
                        }`}
                      >
                        {isUpdating ? "…" : action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
