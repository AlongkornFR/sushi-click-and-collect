"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStaffAuth } from "../../_components/useStaffAuth";
import { printOrder as qzPrint } from "@/lib/printer";
import PrinterStatus from "@/components/staff/PrinterStatus";
import { FaPrint, FaTrash, FaList, FaTh } from "react-icons/fa";

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

/* ── Colonnes bento kanban ── */
const BENTO_COLUMNS = [
  {
    key: "new",
    title: "Nouvelles",
    subtitle: "À prendre en charge",
    statuses: ["pending", "paid"],
    accent: "border-blue-500/30 bg-blue-500/5",
    headerAccent: "text-blue-400",
    dot: "bg-blue-400",
  },
  {
    key: "preparing",
    title: "En cuisine",
    subtitle: "En préparation",
    statuses: ["preparing"],
    accent: "border-orange-500/30 bg-orange-500/5",
    headerAccent: "text-orange-400",
    dot: "bg-orange-400",
  },
  {
    key: "ready",
    title: "Prêtes",
    subtitle: "À servir",
    statuses: ["ready"],
    accent: "border-emerald-500/30 bg-emerald-500/5",
    headerAccent: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  {
    key: "done",
    title: "Historique",
    subtitle: "Récupéré / Annulé",
    statuses: ["collected", "cancelled"],
    accent: "border-white/10 bg-white/[0.02]",
    headerAccent: "text-white/50",
    dot: "bg-white/30",
  },
];

/* ── Helpers ── */
function formatCountdown(ms) {
  if (ms <= 0) return "0m";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  if (m > 0) return `${m}m${String(s).padStart(2, "0")}`;
  return `${s}s`;
}

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

  // View mode (bento | list), persisté
  const [viewMode, setViewMode] = useState("bento");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("staff_orders_view") : null;
    if (saved === "list" || saved === "bento") setViewMode(saved);
  }, []);
  const changeView = (mode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") localStorage.setItem("staff_orders_view", mode);
  };

  // IDs déjà auto-imprimés dans cette session (évite les doublons)
  const autoPrintedRef = useRef(new Set());

  // Auto-collect: 2h côté serveur — frontend affiche juste countdown
  const AUTO_COLLECT_DELAY_MS = 2 * 60 * 60 * 1000;

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

  // ── Tick 1s pour rafraîchir les countdowns ─────────────────────────────
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

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

  /* ── Regroupement bento ── */
  const ordersByColumn = useMemo(() => {
    const map = Object.fromEntries(BENTO_COLUMNS.map(c => [c.key, []]));
    for (const o of orders) {
      if (statusFilter && o.status !== statusFilter) continue;
      const col = BENTO_COLUMNS.find(c => c.statuses.includes(o.status));
      if (col) map[col.key].push(o);
    }
    return map;
  }, [orders, statusFilter]);

  /* ── Carte commande réutilisable ── */
  const renderOrderCard = (o, { compact = false } = {}) => {
    const actions    = STATUS_ACTIONS[o.status] ?? [];
    const isUpdating = updating === o.id;
    const isPrinting = printingId === o.id;
    const isDeleting = deletingId === o.id;

    return (
      <div key={o.id} className="group rounded-2xl border border-white/10 bg-[#1D1D1D] p-4 transition hover:border-white/20">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-bold text-white">#{o.id}</span>
              <StatusBadge status={o.status} />
            </div>
            <p className="truncate text-sm font-semibold text-white/80">{o.full_name}</p>
            {o.phone && !compact && <p className="text-[11px] text-white/40">{o.phone}</p>}
          </div>
          <p className="shrink-0 text-base font-bold text-[#FFC366]">
            {(o.total_cents / 100).toFixed(2)} €
          </p>
        </div>

        {/* Meta badges */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {o.pickup_time && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
              ⏱ {o.pickup_time}
            </span>
          )}
          {o.printed && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/40">
              🖨️ Imprimé
            </span>
          )}
          {o.status === "ready" && o.ready_at && (() => {
            const remaining = new Date(o.ready_at).getTime() + AUTO_COLLECT_DELAY_MS - Date.now();
            const soon = remaining < 10 * 60 * 1000;
            return (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                soon ? "bg-red-500/15 text-red-400" : "bg-emerald-500/10 text-emerald-400"
              }`}>
                ⏳ {formatCountdown(remaining)}
              </span>
            );
          })()}
        </div>

        {/* Items */}
        {(o.items || []).length > 0 && (
          <div className="mt-3 rounded-xl bg-white/5 px-3 py-2">
            <ul className="space-y-0.5">
              {o.items.map(it => (
                <li key={it.id} className="flex items-center justify-between text-xs">
                  <span className="truncate text-white/60 pr-2">
                    <span className="font-semibold text-white">{it.quantity}×</span>{" "}
                    {it.product_name}
                  </span>
                  <span className="shrink-0 font-semibold text-white/70 tabular-nums">
                    {(it.line_total_cents / 100).toFixed(2)} €
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notes */}
        {o.notes && (
          <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-400">
            📝 {o.notes}
          </p>
        )}

        {/* Actions rangée */}
        <div className="mt-3 flex items-center gap-2">
          {/* Status actions */}
          {actions.length > 0 && (
            <div className="flex flex-1 flex-wrap gap-1.5">
              {actions.map(action => (
                <button
                  key={action.status}
                  type="button"
                  onClick={() => setStatus(o.id, action.status)}
                  disabled={isUpdating}
                  className={`flex-1 cursor-pointer rounded-lg px-2 py-2 text-xs font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
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
          {/* Icon buttons */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePrint(o)}
              disabled={isPrinting}
              title={o.printed ? "Réimprimer" : "Imprimer"}
              className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition active:scale-95 disabled:cursor-wait disabled:opacity-50 ${
                o.printed
                  ? "border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              }`}
            >
              {isPrinting
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                : <FaPrint className="text-xs" />
              }
            </button>
            <button
              type="button"
              onClick={() => deleteOrder(o.id)}
              disabled={isDeleting}
              title="Supprimer"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 hover:text-red-300 active:scale-95 disabled:cursor-wait disabled:opacity-50"
            >
              {isDeleting
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500/30 border-t-red-400" />
                : <FaTrash className="text-xs" />
              }
            </button>
          </div>
        </div>
      </div>
    );
  };

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
              {/* Toggle view */}
              <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-0.5">
                <button
                  type="button"
                  onClick={() => changeView("bento")}
                  className={`flex h-9 w-10 items-center justify-center rounded-lg text-sm transition cursor-pointer ${
                    viewMode === "bento" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
                  }`}
                  aria-label="Vue bento"
                  title="Vue bento"
                >
                  <FaTh />
                </button>
                <button
                  type="button"
                  onClick={() => changeView("list")}
                  className={`flex h-9 w-10 items-center justify-center rounded-lg text-sm transition cursor-pointer ${
                    viewMode === "list" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
                  }`}
                  aria-label="Vue liste"
                  title="Vue liste"
                >
                  <FaList />
                </button>
              </div>
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

        {/* Content */}
        {fetching ? (
          <div className="p-4">
            {viewMode === "bento" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="skeleton h-6 w-32 rounded-full" />
                    <OrderCardSkeleton />
                    <OrderCardSkeleton />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <OrderCardSkeleton key={i} />)}
              </div>
            )}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-sm text-white/40">
            Aucune commande{statusFilter ? ` avec le statut « ${STATUS_CONFIG[statusFilter]?.label ?? statusFilter} »` : ""}.
          </div>
        ) : viewMode === "bento" ? (
          /* ── VUE BENTO KANBAN ── */
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
            {BENTO_COLUMNS.map(col => {
              const list = ordersByColumn[col.key] || [];
              return (
                <div
                  key={col.key}
                  className={`flex flex-col rounded-2xl border ${col.accent} p-3`}
                >
                  {/* Column header */}
                  <div className="mb-3 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                      <div>
                        <p className={`text-sm font-bold ${col.headerAccent}`}>{col.title}</p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">{col.subtitle}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white">
                      {list.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2.5 min-h-[80px]">
                    {list.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-[11px] text-white/30">
                        Vide
                      </div>
                    ) : (
                      list.map(o => renderOrderCard(o, { compact: true }))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── VUE LISTE ── */
          <div className="flex flex-col gap-3 p-4">
            {orders
              .filter(o => !statusFilter || o.status === statusFilter)
              .map(o => renderOrderCard(o))}
          </div>
        )}
      </div>
    </div>
  );
}
