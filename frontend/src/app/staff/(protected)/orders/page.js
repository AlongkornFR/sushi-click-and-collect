"use client";

import { useEffect, useState } from "react";
import { useStaffAuth } from "../../_components/useStaffAuth";


const STATUSES = ["pending", "paid", "preparing", "ready", "collected", "cancelled"];

export default function StaffOrdersPage() {
  const { API, headers, token } = useStaffAuth();
  const [statusFilter, setStatusFilter] = useState("");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchOrders() {
    if (!token) return;
    setError("");
    try {
      const url = new URL(`${API}/staff/orders/`);
      if (statusFilter) url.searchParams.set("status", statusFilter);

      const res = await fetch(url.toString(), { headers, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function setStatus(orderId, status) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/staff/orders/${orderId}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} - ${await res.text()}`);
      await fetchOrders();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    fetchOrders();
    const id = setInterval(fetchOrders, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-extrabold">Commandes</h2>
          <p className="text-zinc-600 text-sm">Liste + changement de statut.</p>
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            onClick={fetchOrders}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-100"
          >
            Rafraîchir
          </button>

          {loading ? <span className="text-sm text-zinc-500">…</span> : null}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:justify-between">
              <div>
                <div className="font-extrabold">
                  Commande #{o.id}{" "}
                  <span className="ml-2 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold uppercase">
                    {o.status}
                  </span>
                </div>
                <div className="text-sm text-zinc-700 mt-1">
                  <span className="font-semibold">{o.full_name}</span> • {o.phone} • Retrait{" "}
                  <span className="font-semibold">{o.pickup_time}</span>
                </div>
                <div className="text-sm text-zinc-600 mt-1">
                  Total <span className="font-semibold">{(o.total_cents / 100).toFixed(2)} €</span>
                </div>
                {o.notes ? <div className="text-sm mt-2"><span className="font-semibold">Notes:</span> {o.notes}</div> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => setStatus(o.id, "preparing")} className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-zinc-50">
                  Preparing
                </button>
                <button onClick={() => setStatus(o.id, "ready")} className="rounded-xl bg-black text-white px-3 py-2 text-sm font-semibold hover:opacity-90">
                  Ready
                </button>
                <button onClick={() => setStatus(o.id, "collected")} className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-zinc-50">
                  Collected
                </button>
                <button onClick={() => setStatus(o.id, "cancelled")} className="rounded-xl border border-red-200 text-red-700 px-3 py-2 text-sm font-semibold hover:bg-red-50">
                  Cancel
                </button>
              </div>
            </div>

            <div className="mt-3">
              <div className="text-sm font-bold">Items</div>
              <ul className="mt-1 text-sm text-zinc-700 space-y-1">
                {(o.items || []).map((it) => (
                  <li key={it.id}>
                    {it.quantity}× {it.product_name} — {(it.line_total_cents / 100).toFixed(2)} €
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}

        {orders.length === 0 ? <div className="text-zinc-600">Aucune commande.</div> : null}
      </div>
    </div>
  );
}
