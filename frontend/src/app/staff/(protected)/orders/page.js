"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStaffAuth } from "../../_components/useStaffAuth";
import { printOrder as qzPrint } from "@/lib/printer";
import PrinterStatus from "@/components/staff/PrinterStatus";
import { formatEUR } from "@/utils/formatting";
import { FaPrint, FaPhone, FaSearch } from "react-icons/fa";

/* ── Statuts ── */
const STATUS_CONFIG = {
  pending:   { label: "Non payée",      badge: "bg-amber-100 text-amber-700",    dot: "bg-amber-400"  },
  paid:      { label: "Payée",          badge: "bg-blue-100 text-blue-700",      dot: "bg-blue-400"   },
  preparing: { label: "En préparation", badge: "bg-orange-100 text-orange-700",  dot: "bg-orange-400" },
  ready:     { label: "Prête",          badge: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-400"},
  collected: { label: "Récupérée",      badge: "bg-zinc-100 text-zinc-500",      dot: "bg-zinc-300"   },
  cancelled: { label: "Annulée",        badge: "bg-red-100 text-red-500",        dot: "bg-red-400"    },
};

const STATUS_ACTIONS = {
  // Non payée : rien à préparer. Le staff peut seulement l'annuler.
  pending:   [
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
    { label: "Retour en cuisine", status: "preparing", style: "neutral" },
  ],
  // Correction d'un clic trop rapide (lot M2)
  collected: [
    { label: "Pas encore récupérée", status: "ready", style: "neutral" },
  ],
  cancelled: [],
};

// Colonnes de la vue « Aujourd'hui » (lot A1) : seulement ce qui reste à
// faire. Les commandes terminées passent dans « Historique ».
const TODAY_COLUMNS = [
  { key: "paid",      title: "Nouvelles",  subtitle: "À prendre en charge",  accent: "border-blue-500/30 bg-blue-500/5",       headerAccent: "text-blue-400",    dot: "bg-blue-400"    },
  { key: "preparing", title: "En cuisine", subtitle: "En préparation",       accent: "border-orange-500/30 bg-orange-500/5",   headerAccent: "text-orange-400",  dot: "bg-orange-400"  },
  { key: "ready",     title: "Prêtes",     subtitle: "À remettre au client", accent: "border-emerald-500/30 bg-emerald-500/5", headerAccent: "text-emerald-400", dot: "bg-emerald-400" },
];

const ACTIVE_STATUSES = ["paid", "preparing", "ready"];
const REVENUE_STATUSES = ["paid", "preparing", "ready", "collected"];
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/* ── Helpers dates ── */
const pad2 = (n) => String(n).padStart(2, "0");
const dayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Heure de retrait d'une commande. Les commandes passées avant l'ajout de
// pickup_at n'ont que l'heure : on la place le jour de la commande.
function pickupDate(o) {
  if (o.pickup_at) return new Date(o.pickup_at);
  const d = new Date(o.created_at);
  const [h, m] = (o.pickup_time || "00:00").split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function dayLabel(d) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (dayKey(d) === dayKey(today)) return "Aujourd'hui";
  if (dayKey(d) === dayKey(tomorrow)) return "Demain";
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0) return `${h} h ${pad2(m)}`;
  return `${m} min`;
}

// Recherche : numéro (« 42 » ou « #42 »), nom, ou téléphone (chiffres seuls).
function matchesSearch(o, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  if (q.replace("#", "") === String(o.id)) return true;
  if ((o.full_name || "").toLowerCase().includes(q)) return true;
  if (digits.length >= 3 && (o.phone || "").replace(/\D/g, "").includes(digits)) return true;
  return false;
}

/* ── Petits composants ── */
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
    <div className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-4">
      <p className="text-xs font-semibold text-white/60">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function OrderCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-5">
      <div className="space-y-2">
        <div className="skeleton h-4 w-24 rounded-full" />
        <div className="skeleton h-3.5 w-44 rounded-full" />
      </div>
      <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-3 w-2/3 rounded-full" />
      </div>
    </div>
  );
}

// Échéance de retrait : « dans 25 min », « en retard de 10 min », « prête depuis… »
function TimingBadge({ order, now }) {
  if (order.status === "ready" && order.ready_at) {
    const waiting = now - new Date(order.ready_at).getTime();
    const long = waiting > 30 * 60 * 1000;
    return (
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${long ? "bg-red-500/15 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
        Prête depuis {formatDuration(waiting)}
      </span>
    );
  }
  if (!["paid", "preparing"].includes(order.status)) return null;
  const diff = pickupDate(order).getTime() - now;
  if (diff < 0) {
    return (
      <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-bold text-red-300">
        En retard de {formatDuration(-diff)}
      </span>
    );
  }
  if (diff > 3 * 60 * 60 * 1000) return null;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${diff < 15 * 60 * 1000 ? "bg-amber-500/20 text-amber-200" : "bg-white/10 text-white/70"}`}>
      Dans {formatDuration(diff)}
    </span>
  );
}

const VIEWS = [
  { key: "today",    label: "Aujourd'hui" },
  { key: "upcoming", label: "À venir" },
  { key: "history",  label: "Historique" },
];

/* ── Page principale ── */
export default function StaffOrdersPage() {
  const { API, token, authFetch } = useStaffAuth();

  const [orders, setOrders]             = useState([]);
  const [view, setView]                 = useState("today");
  const [search, setSearch]             = useState("");
  const [error, setError]               = useState("");
  const [fetching, setFetching]         = useState(true);
  const [updating, setUpdating]         = useState(null);
  const [printingId, setPrintingId]     = useState(null);
  const [printError, setPrintError]     = useState("");
  // Rappel « rembourser sur Payplug » après annulation d'une commande payée (lot M2)
  const [refundNotice, setRefundNotice] = useState("");

  // L'historique complet n'est chargé que dans la vue Historique (lot H7).
  const showHistory = view === "history";

  // IDs déjà auto-imprimés dans cette session (évite les doublons)
  const autoPrintedRef = useRef(new Set());

  // ── Fetch commandes ────────────────────────────────────────────────────────

  async function fetchOrders(silent = false) {
    if (!token) return;
    if (!silent) setError("");
    try {
      const url = new URL(`${API}/staff/orders/`);
      if (showHistory) url.searchParams.set("scope", "all");
      const res = await authFetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`Erreur ${res.status} au chargement des commandes.`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      if (!silent) setError(String(e.message || e));
    }
  }

  // ── Impression manuelle ────────────────────────────────────────────────────

  async function handlePrint(order) {
    if (order.status === "pending") return; // jamais de ticket cuisine pour une commande non payée
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
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, printed: true } : o)));
    } catch {
      // Non bloquant
    }
  }

  // ── Changement de statut ──────────────────────────────────────────────────

  async function setStatus(orderId, status) {
    const current = orders.find(o => o.id === orderId);
    const wasPaid = current && ["paid", "preparing", "ready", "collected"].includes(current.status);
    if (status === "cancelled" && !confirm(
      wasPaid
        ? `Annuler la commande #${orderId} ? Elle est payée : il faudra la rembourser sur Payplug.`
        : `Annuler la commande #${orderId} ?`,
    )) return;
    setUpdating(orderId);
    setError("");
    try {
      const res = await authFetch(`${API}/staff/orders/${orderId}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || `Erreur ${res.status}`);
      if (body.refund_needed) {
        setRefundNotice(`Commande #${orderId} annulée : pensez à la rembourser sur Payplug.`);
      }
      await fetchOrders(true);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setUpdating(null);
    }
  }

  // ── Rafraîchissement des commandes — toutes les 3 s ───────────────────────

  useEffect(() => {
    if (!token) return;
    setFetching(true);
    fetchOrders().finally(() => setFetching(false));
    const id = setInterval(() => fetchOrders(true), 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, showHistory]);

  // ── Horloge (échéances « dans 10 min », « en retard ») ──────────────────
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  // ── Auto-impression — toutes les 5 s ──────────────────────────────────────

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

  /* ── Répartition (lot A1) : aujourd'hui / à venir / historique ── */
  const todayKey = dayKey(new Date(now));

  const byPickup = (a, b) => pickupDate(a) - pickupDate(b);

  const todayActive = useMemo(
    () => orders.filter(o => ACTIVE_STATUSES.includes(o.status) && dayKey(pickupDate(o)) <= todayKey).sort(byPickup),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, todayKey],
  );
  const upcoming = useMemo(
    () => orders.filter(o => ACTIVE_STATUSES.includes(o.status) && dayKey(pickupDate(o)) > todayKey).sort(byPickup),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, todayKey],
  );
  const finished = useMemo(
    () => orders.filter(o => ["collected", "cancelled"].includes(o.status))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [orders],
  );
  const awaitingPayment = orders.filter(o => o.status === "pending");

  // Compteurs utiles au service
  const newToday     = todayActive.filter(o => o.status === "paid").length;
  const toServeToday = todayActive.length;
  const revenueToday = orders
    .filter(o => REVENUE_STATUSES.includes(o.status) && dayKey(new Date(o.created_at)) === todayKey)
    .reduce((sum, o) => sum + (o.total_cents || 0), 0) / 100;

  const searching = search.trim().length > 0;
  const searchResults = searching ? orders.filter(o => matchesSearch(o, search)) : [];

  /* ── Carte commande ── */
  // compact : cartes des colonnes « Aujourd'hui », étroites sur tablette en
  // portrait. Les noms de plats passent à la ligne et le prix par ligne est
  // masqué (la cuisine a besoin du nom, pas du prix).
  const renderOrderCard = (o, { compact = false } = {}) => {
    const actions    = STATUS_ACTIONS[o.status] ?? [];
    const isUpdating = updating === o.id;
    const isPrinting = printingId === o.id;
    const pickup     = pickupDate(o);

    return (
      <div key={o.id} className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-4">
        {/* En-tête : numéro, statut, montant */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-base font-bold text-white">#{o.id}</span>
              <StatusBadge status={o.status} />
            </div>
            <p className="truncate text-sm font-semibold text-white/90">{o.full_name}</p>
            {o.phone && (
              <a
                href={`tel:${o.phone.replace(/\s/g, "")}`}
                className="inline-flex min-h-8 items-center gap-1.5 text-sm text-white/70 underline-offset-2 hover:underline"
              >
                <FaPhone className="text-xs" aria-hidden="true" />
                {o.phone}
              </a>
            )}
          </div>
          <p className="shrink-0 text-base font-bold text-[#FFC366]">{formatEUR(o.total_cents / 100)}</p>
        </div>

        {/* Retrait et échéance */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
            {dayKey(pickup) === todayKey
              ? `Retrait ${pad2(pickup.getHours())}h${pad2(pickup.getMinutes())}`
              : `Retrait ${o.pickup_label || o.pickup_time}`}
          </span>
          <TimingBadge order={o} now={now} />
          {o.printed && (
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/60">Imprimé</span>
          )}
        </div>

        {/* Articles */}
        {(o.items || []).length > 0 && (
          <ul className="mt-3 space-y-1 rounded-xl bg-white/5 px-3 py-2">
            {o.items.map(it => (
              <li key={it.id} className="flex items-start justify-between gap-2 text-sm">
                <span className={`${compact ? "" : "truncate"} text-white/85`}>
                  <span className="font-bold text-white">{it.quantity}×</span> {it.product_name}
                </span>
                {!compact && (
                  <span className="shrink-0 tabular-nums text-white/60">{formatEUR(it.line_total_cents / 100)}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Note client (allergies…) */}
        {o.notes && (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {o.notes}
          </p>
        )}

        {/* Actions — boutons de 44 px minimum pour la tablette */}
        <div className="mt-3 flex items-center gap-2">
          {actions.length > 0 && (
            <div className="flex flex-1 flex-wrap gap-2">
              {actions.map(action => (
                <button
                  key={action.status}
                  type="button"
                  onClick={() => setStatus(o.id, action.status)}
                  disabled={isUpdating}
                  className={`min-h-11 flex-1 cursor-pointer rounded-xl px-3 text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                    action.style === "primary" ? "bg-[#FFC366] text-black hover:bg-[#ffb347]"
                    : action.style === "success" ? "bg-emerald-500 text-white hover:bg-emerald-400"
                    : action.style === "danger"  ? "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                    : "border border-white/15 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {isUpdating ? "…" : action.label}
                </button>
              ))}
            </div>
          )}
          {o.status !== "pending" && (
            <button
              type="button"
              onClick={() => handlePrint(o)}
              disabled={isPrinting}
              aria-label={o.printed ? `Réimprimer la commande ${o.id}` : `Imprimer la commande ${o.id}`}
              className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition active:scale-95 disabled:cursor-wait disabled:opacity-50 ${
                o.printed
                  ? "border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              }`}
            >
              {isPrinting
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                : <FaPrint />
              }
            </button>
          )}
        </div>
      </div>
    );
  };

  // Liste groupée par jour (vue « À venir »)
  const renderGroupedByDay = (list, emptyText) => {
    if (list.length === 0) {
      return <p className="py-16 text-center text-sm text-white/60">{emptyText}</p>;
    }
    const groups = [];
    for (const o of list) {
      const label = dayLabel(pickupDate(o));
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.orders.push(o);
      else groups.push({ label, orders: [o] });
    }
    return (
      <div className="space-y-6 p-4">
        {groups.map(g => (
          <section key={g.label}>
            <h2 className="mb-3 text-sm font-bold text-white first-letter:uppercase">
              {g.label} <span className="font-normal text-white/60">· {g.orders.length} commande{g.orders.length > 1 ? "s" : ""}</span>
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {g.orders.map(o => renderOrderCard(o))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  /* ── Rendu ── */
  return (
    <div className="space-y-5">

      {/* ── Compteurs ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="À sortir aujourd'hui" value={toServeToday} />
        <StatCard label="Nouvelles" value={newToday} color="text-amber-300" />
        <StatCard label="À venir (autres jours)" value={upcoming.length} color="text-blue-300" />
        <StatCard label="Chiffre du jour (TTC)" value={formatEUR(revenueToday)} color="text-emerald-300" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1D1D1D]">

        {/* ── En-tête : vues, recherche, imprimante ── */}
        <div className="space-y-3 border-b border-white/10 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Vue des commandes" className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
              {VIEWS.map(v => {
                const count = v.key === "today" ? toServeToday : v.key === "upcoming" ? upcoming.length : null;
                return (
                  <button
                    key={v.key}
                    type="button"
                    role="tab"
                    aria-selected={view === v.key}
                    onClick={() => { setView(v.key); setSearch(""); }}
                    className={`min-h-11 cursor-pointer rounded-lg px-4 text-sm font-semibold transition ${
                      view === v.key ? "bg-[#FFC366] text-black" : "text-white/70 hover:text-white"
                    }`}
                  >
                    {v.label}{count ? ` (${count})` : ""}
                  </button>
                );
              })}
            </div>
            <PrinterStatus />
          </div>

          <label className="relative block">
            <span className="sr-only">Rechercher une commande</span>
            <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher : numéro, nom ou téléphone"
              className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 text-base text-white placeholder:text-white/40 outline-none focus:border-white/30"
            />
          </label>
        </div>

        {/* ── Messages ── */}
        {error && (
          <div role="alert" className="mx-4 mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {refundNotice && (
          <div role="alert" className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <span>{refundNotice}</span>
            <button type="button" onClick={() => setRefundNotice("")} className="min-h-11 shrink-0 cursor-pointer px-2 text-amber-100 underline">
              Compris
            </button>
          </div>
        )}
        {printError && (
          <div role="alert" className="mx-4 mt-4 rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
            {printError}
          </div>
        )}

        {/* ── Contenu ── */}
        {fetching ? (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <OrderCardSkeleton key={i} />)}
          </div>
        ) : searching ? (
          /* Résultats de recherche, toutes vues confondues */
          searchResults.length === 0 ? (
            <p className="py-16 text-center text-sm text-white/60">Aucune commande ne correspond à « {search} ».</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {[...searchResults].sort(byPickup).map(o => renderOrderCard(o))}
            </div>
          )
        ) : view === "today" ? (
          <div className="space-y-4 p-4">
            {awaitingPayment.length > 0 && (
              <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                <summary className="min-h-11 cursor-pointer content-center px-1 text-sm font-semibold text-white/70">
                  Paiement en cours ({awaitingPayment.length}) : non payées, ne pas préparer
                </summary>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {awaitingPayment.map(o => renderOrderCard(o))}
                </div>
              </details>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {TODAY_COLUMNS.map(col => {
                const list = todayActive.filter(o => o.status === col.key);
                return (
                  <section key={col.key} aria-label={col.title} className={`flex flex-col rounded-2xl border ${col.accent} p-3`}>
                    <div className="mb-3 flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${col.dot}`} aria-hidden="true" />
                        <div>
                          <h2 className={`text-sm font-bold ${col.headerAccent}`}>{col.title}</h2>
                          <p className="text-xs text-white/60">{col.subtitle}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-sm font-bold text-white">{list.length}</span>
                    </div>
                    <div className="flex min-h-[80px] flex-col gap-3">
                      {list.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-white/50">Rien pour l&apos;instant</p>
                      ) : (
                        list.map(o => renderOrderCard(o, { compact: true }))
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        ) : view === "upcoming" ? (
          renderGroupedByDay(upcoming, "Aucune commande pour les prochains jours.")
        ) : (
          finished.length === 0 ? (
            <p className="py-16 text-center text-sm text-white/60">Aucune commande terminée.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {finished.map(o => renderOrderCard(o))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
