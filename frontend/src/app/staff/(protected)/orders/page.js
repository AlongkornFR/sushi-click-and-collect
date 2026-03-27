"use client";

import { useEffect, useState } from "react";
import { useStaffAuth } from "../../_components/useStaffAuth";

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

function StatCard({ label, value, color = "text-zinc-900" }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="skeleton h-3 w-20 rounded-full" />
      <div className="skeleton mt-3 h-8 w-10 rounded-xl" />
    </div>
  );
}

function OrderCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5">
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
      <div className="mt-4 border-t border-zinc-100 pt-3 space-y-2">
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-3 w-2/3 rounded-full" />
      </div>
    </div>
  );
}

export default function StaffOrdersPage() {
  const { API, token, authFetch } = useStaffAuth();

  const [orders, setOrders]           = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError]             = useState("");
  const [fetching, setFetching]       = useState(true);
  const [updating, setUpdating]       = useState(null); // orderId being updated

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

  useEffect(() => {
    if (!token) return;
    setFetching(true);
    fetchOrders().finally(() => setFetching(false));
    const id = setInterval(() => fetchOrders(true), 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

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
            <StatCard label="En attente"     value={pendingCount}   color="text-amber-600" />
            <StatCard label="En préparation" value={preparingCount} color="text-orange-600" />
            <StatCard label="Prêtes"         value={readyCount}     color="text-emerald-600" />
          </>
        )}
      </div>

      {/* ── Main card ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">

        {/* Header */}
        <div className="border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-zinc-900">Commandes</h1>
              {/* Live dot */}
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <button
              type="button"
              onClick={() => fetchOrders()}
              className="cursor-pointer rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-500 transition hover:bg-zinc-50 active:scale-95"
            >
              Rafraîchir
            </button>
          </div>

          {/* Status filter pills */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setStatusFilter("")}
              className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                !statusFilter ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}
            >
              Toutes
            </button>
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === s ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                }`}
              >
                {STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Order list */}
        <div className="divide-y divide-zinc-100 px-5 py-2">

          {fetching ? (
            <div className="space-y-3 py-3">
              {Array.from({ length: 4 }).map((_, i) => <OrderCardSkeleton key={i} />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-400">
              Aucune commande{statusFilter ? ` avec le statut « ${STATUS_CONFIG[statusFilter]?.label ?? statusFilter} »` : ""}.
            </div>
          ) : orders.map(o => {
            const actions = STATUS_ACTIONS[o.status] ?? [];
            const isUpdating = updating === o.id;

            return (
              <div key={o.id} className="py-4">
                {/* Order header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900">#{o.id}</span>
                      <StatusBadge status={o.status} />
                      {o.pickup_time && (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600">
                          ⏱ {o.pickup_time}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-zinc-800">{o.full_name}</p>
                    {o.phone && <p className="text-xs text-zinc-400">{o.phone}</p>}
                  </div>

                  <p className="text-base font-bold text-zinc-900">
                    {(o.total_cents / 100).toFixed(2)} €
                  </p>
                </div>

                {/* Items */}
                {(o.items || []).length > 0 && (
                  <div className="mt-3 rounded-xl bg-zinc-50 px-4 py-3">
                    <ul className="space-y-1">
                      {o.items.map(it => (
                        <li key={it.id} className="flex items-center justify-between text-sm">
                          <span className="text-zinc-700">
                            <span className="font-semibold text-zinc-900">{it.quantity}×</span>{" "}
                            {it.product_name}
                          </span>
                          <span className="font-semibold text-zinc-700">
                            {(it.line_total_cents / 100).toFixed(2)} €
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notes */}
                {o.notes && (
                  <p className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    📝 {o.notes}
                  </p>
                )}

                {/* Actions */}
                {actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {actions.map(action => (
                      <button
                        key={action.status}
                        type="button"
                        onClick={() => setStatus(o.id, action.status)}
                        disabled={isUpdating}
                        className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                          action.style === "primary" ? "bg-zinc-900 text-white hover:bg-zinc-700"
                          : action.style === "success" ? "bg-emerald-600 text-white hover:bg-emerald-500"
                          : action.style === "danger"  ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                          : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
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
