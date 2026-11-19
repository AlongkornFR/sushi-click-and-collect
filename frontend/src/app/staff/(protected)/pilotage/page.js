"use client";

import { useEffect, useState } from "react";
import { useStaffAuth } from "../../_components/useStaffAuth";
import { formatEUR } from "@/utils/formatting";

// Accueil de l'espace marchand Payplug. Le remboursement se fait là-bas ;
// la référence du paiement permet de le retrouver.
const PAYPLUG_PORTAL_URL = "https://portal.payplug.com/";

const PERIODS = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7d", label: "7 derniers jours" },
  { key: "month", label: "Mois en cours" },
  { key: "custom", label: "Dates au choix" },
];

const eur = (cents) => formatEUR((cents || 0) / 100);
const rateLabel = (rate) => `${String(rate).replace(".", ",")} %`;
const formatDay = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function Kpi({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-4">
      <p className="text-sm font-semibold text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-white/50">{hint}</p>}
    </div>
  );
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-32 rounded-2xl border border-white/10 bg-[#1D1D1D] p-4">
      <h2 className="mb-3 text-base font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Lot A7 : chiffres (CA HT et TTC, TVA par taux, panier moyen, produits les
 * plus commandés) et remboursements à faire sur Payplug.
 */
export default function PilotagePage() {
  const { API, token, authFetch } = useStaffAuth();

  const [period, setPeriod] = useState("today");
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState("");
  const [loading, setLoading] = useState(false);

  const [refunds, setRefunds] = useState({ to_refund: [], refunded: [] });
  const [refundError, setRefundError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  async function loadStats(p = period) {
    setLoading(true);
    setStatsError("");
    try {
      const params = new URLSearchParams({ period: p });
      if (p === "custom") { params.set("from", from); params.set("to", to); }
      const res = await authFetch(`${API}/staff/stats/?${params}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `Erreur ${res.status}`);
      setStats(data);
    } catch (e) {
      setStatsError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadRefunds() {
    try {
      const res = await authFetch(`${API}/staff/refunds/`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setRefunds(await res.json());
      setRefundError("");
    } catch {
      setRefundError("La liste des remboursements n'a pas pu être chargée.");
    }
  }

  useEffect(() => {
    if (!token) return;
    if (period !== "custom") loadStats(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, period]);

  useEffect(() => {
    if (token) loadRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function copyPaymentId(order) {
    try {
      await navigator.clipboard.writeText(order.payment_id);
      setCopiedId(order.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      prompt("Référence du paiement à copier :", order.payment_id);
    }
  }

  async function markRefunded(order) {
    if (!confirm(`Confirmer que la commande #${order.id} (${eur(order.total_cents)}) a bien été remboursée sur Payplug ?`)) return;
    try {
      const res = await authFetch(`${API}/staff/refunds/${order.id}/done/`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `Erreur ${res.status}`);
      await loadRefunds();
    } catch (e) {
      setRefundError(String(e.message || e));
    }
  }

  const periodText = stats
    ? stats.from === stats.to ? `le ${formatDay(stats.from)}` : `du ${formatDay(stats.from)} au ${formatDay(stats.to)}`
    : "";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">Pilotage</h1>

      {/* Remboursements en premier : c'est une action à faire */}
      <Section id="remboursements" title={`Remboursements à faire (${refunds.to_refund.length})`}>
        {refundError && <p role="alert" className="mb-3 text-sm text-red-200">{refundError}</p>}
        {refunds.to_refund.length === 0 ? (
          <p className="text-sm text-white/60">Rien à rembourser.</p>
        ) : (
          <ul className="space-y-3">
            {refunds.to_refund.map((o) => (
              <li key={o.id} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-bold text-white">#{o.id} · {o.full_name}</p>
                    <p className="text-sm text-white/70">Commandée le {formatDateTime(o.created_at)} · {o.email}</p>
                    <p className="mt-1 text-sm text-white/70">
                      Référence Payplug : <span className="font-mono text-white">{o.payment_id || "inconnue"}</span>
                    </p>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-amber-200">{eur(o.total_cents)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.payment_id && (
                    <button type="button" onClick={() => copyPaymentId(o)}
                      className="min-h-11 cursor-pointer rounded-xl border border-white/20 px-4 text-sm font-semibold text-white">
                      {copiedId === o.id ? "Référence copiée" : "Copier la référence"}
                    </button>
                  )}
                  <a href={PAYPLUG_PORTAL_URL} target="_blank" rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-bold text-black">
                    Ouvrir Payplug
                  </a>
                  <button type="button" onClick={() => markRefunded(o)}
                    className="min-h-11 cursor-pointer rounded-xl bg-emerald-500 px-4 text-sm font-bold text-white">
                    Marquer comme remboursée
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {refunds.refunded.length > 0 && (
          <details className="mt-4">
            <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-white/70">
              Derniers remboursements faits ({refunds.refunded.length})
            </summary>
            <ul className="mt-2 divide-y divide-white/10 text-sm">
              {refunds.refunded.map((o) => (
                <li key={o.id} className="flex justify-between gap-2 py-2 text-white/70">
                  <span>#{o.id} · {o.full_name} · remboursée le {formatDateTime(o.refunded_at)}</span>
                  <span className="tabular-nums">{eur(o.total_cents)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Section>

      {/* Période */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-[#1D1D1D] p-4">
        <div role="tablist" aria-label="Période" className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={period === p.key}
              onClick={() => setPeriod(p.key)}
              className={`min-h-11 cursor-pointer rounded-xl px-4 text-sm font-semibold ${
                period === p.key ? "bg-[#FFC366] text-black" : "border border-white/15 text-white/80"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <form onSubmit={(e) => { e.preventDefault(); loadStats("custom"); }} className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-white/80">
              Du
              <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block min-h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-base text-white" />
            </label>
            <label className="text-sm text-white/80">
              Au
              <input type="date" value={to} min={from} max={todayIso()} onChange={(e) => setTo(e.target.value)}
                className="mt-1 block min-h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-base text-white" />
            </label>
            <button type="submit" className="min-h-11 cursor-pointer rounded-xl bg-[#FFC366] px-4 text-sm font-bold text-black">
              Afficher
            </button>
          </form>
        )}
        {stats && !loading && <p className="text-sm text-white/60">Chiffres {periodText} · commandes payées, hors annulations</p>}
        {statsError && <p role="alert" className="text-sm text-red-200">{statsError}</p>}
      </div>

      {loading && <p className="text-sm text-white/60">Calcul en cours…</p>}

      {stats && !loading && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Chiffre d'affaires TTC" value={eur(stats.revenue_ttc_cents)} />
            <Kpi label="Chiffre d'affaires HT" value={eur(stats.revenue_ht_cents)} />
            <Kpi label="TVA collectée" value={eur(stats.vat_cents)} />
            <Kpi label="Commandes" value={stats.order_count} hint={`Panier moyen ${eur(stats.average_basket_cents)}`} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section title="TVA par taux">
              {stats.vat_breakdown.length === 0 ? (
                <p className="text-sm text-white/60">Aucune vente sur la période.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-white/60">
                      <th className="py-2 font-semibold">Taux</th>
                      <th className="py-2 text-right font-semibold">HT</th>
                      <th className="py-2 text-right font-semibold">TVA</th>
                      <th className="py-2 text-right font-semibold">TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 tabular-nums text-white">
                    {stats.vat_breakdown.map((r) => (
                      <tr key={r.rate}>
                        <td className="py-2">{rateLabel(r.rate)}</td>
                        <td className="py-2 text-right">{eur(r.ht_cents)}</td>
                        <td className="py-2 text-right">{eur(r.vat_cents)}</td>
                        <td className="py-2 text-right">{eur(r.ttc_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            <Section title="Les plus commandés">
              {stats.top_products.length === 0 ? (
                <p className="text-sm text-white/60">Aucune vente sur la période.</p>
              ) : (
                <ol className="space-y-2">
                  {stats.top_products.map((p, i) => (
                    <li key={`${p.name}-${i}`} className="flex items-center gap-3 text-sm">
                      <span className="w-6 text-right font-bold tabular-nums text-white/60">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-white">{p.name}</span>
                      <span className="tabular-nums text-white">{p.quantity} vendus</span>
                      <span className="w-20 text-right tabular-nums text-white/60">{eur(p.ttc_cents)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
