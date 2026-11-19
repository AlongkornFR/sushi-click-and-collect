"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useStaffAuth } from "../../../_components/useStaffAuth";
import { formatEUR } from "@/utils/formatting";
import { FaArrowLeft, FaPhone, FaEnvelope } from "react-icons/fa";

const STATUS_LABELS = {
  pending: "Non payée",
  paid: "Payée",
  preparing: "En préparation",
  ready: "Prête",
  collected: "Récupérée",
  cancelled: "Annulée",
};
const STATUS_STYLES = {
  pending: "bg-amber-500/15 text-amber-200",
  paid: "bg-blue-500/15 text-blue-200",
  preparing: "bg-orange-500/15 text-orange-200",
  ready: "bg-emerald-500/15 text-emerald-200",
  collected: "bg-white/10 text-white/70",
  cancelled: "bg-red-500/15 text-red-200",
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function Card({ title, children, action }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Lot A6 : fiche client. Coordonnées, carte de fidélité, commandes, et
 * actions sur le compte (désactiver plutôt que supprimer).
 */
export default function ClientPage() {
  const { id } = useParams();
  const router = useRouter();
  const { API, token, authFetch } = useStaffAuth();

  const [client, setClient] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const res = await authFetch(`${API}/staff/users/${id}/`, { cache: "no-store" });
      if (res.status === 404) throw new Error("Ce client n'existe pas.");
      if (!res.ok) throw new Error("La fiche n'a pas pu être chargée. Réessayez.");
      setClient(await res.json());
      setError("");
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  useEffect(() => {
    if (token && id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  async function setActive(isActive) {
    const name = `${client.first_name} ${client.last_name}`.trim() || client.email;
    if (!isActive && !confirm(`Désactiver le compte de ${name} ? Il ne pourra plus se connecter. Ses commandes et sa carte de fidélité sont conservées.`)) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await authFetch(`${API}/staff/users/${id}/active/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `Erreur ${res.status}`);
      setClient((prev) => ({ ...prev, is_active: data.is_active }));
      setMessage(isActive ? "Compte réactivé." : "Compte désactivé.");
    } catch (e) {
      setMessage(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteForever() {
    // Réservé aux demandes d'effacement (RGPD) : double confirmation.
    const typed = prompt(
      `Suppression définitive : le compte, l'historique de fidélité et le lien avec les commandes seront effacés.\n\nPour confirmer, tapez l'email du client : ${client.email}`,
    );
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== client.email.toLowerCase()) {
      setMessage("Email différent : rien n'a été supprimé.");
      return;
    }
    setBusy(true);
    try {
      const res = await authFetch(`${API}/staff/users/${id}/delete/`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Erreur ${res.status}`);
      }
      router.replace("/staff/users");
    } catch (e) {
      setMessage(String(e.message || e));
      setBusy(false);
    }
  }

  const back = (
    <Link href="/staff/users" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/70 hover:text-white">
      <FaArrowLeft aria-hidden="true" /> Tous les clients
    </Link>
  );

  if (error) return <div className="space-y-4">{back}<p role="alert" className="text-sm text-red-200">{error}</p></div>;
  if (!client) return <div className="space-y-4">{back}<p className="text-sm text-white/60">Chargement…</p></div>;

  const fullName = `${client.first_name} ${client.last_name}`.trim() || client.email;
  const loyalty = client.loyalty;

  return (
    <div className="space-y-4">
      {back}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{fullName}</h1>
        {!client.is_active && (
          <span className="rounded-full bg-red-500/20 px-3 py-1 text-sm font-semibold text-red-200">Compte désactivé</span>
        )}
      </div>

      {message && <p role="status" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white">{message}</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Coordonnées">
          <dl className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-white">
              <FaEnvelope className="text-white/50" aria-hidden="true" />
              <a href={`mailto:${client.email}`} className="underline-offset-2 hover:underline">{client.email}</a>
            </div>
            <div className="flex items-center gap-2 text-white">
              <FaPhone className="text-white/50" aria-hidden="true" />
              {client.phone
                ? <a href={`tel:${client.phone.replace(/\s/g, "")}`} className="underline-offset-2 hover:underline">{client.phone}</a>
                : <span className="text-white/50">Pas de téléphone</span>}
            </div>
            <p className="text-white/60">Client depuis le {formatDate(client.date_joined)}</p>
            <p className="text-white/60">
              {client.order_count} commande{client.order_count > 1 ? "s" : ""} · {formatEUR(client.total_spent_cents / 100)} dépensés
            </p>
          </dl>
        </Card>

        <Card
          title="Carte de fidélité"
          action={loyalty && (
            <Link
              href={`/staff/loyalty?account=${loyalty.public_id}`}
              className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-3 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              Gérer la carte
            </Link>
          )}
        >
          {loyalty ? (
            <div>
              <p className="text-3xl font-bold tabular-nums text-white">
                {loyalty.points} <span className="text-base font-normal text-white/60">/ {loyalty.max_points} points</span>
              </p>
              <div className="mt-2 flex gap-1" aria-hidden="true">
                {Array.from({ length: loyalty.max_points }).map((_, i) => (
                  <span key={i} className={`h-2.5 flex-1 rounded-full ${i < loyalty.points ? "bg-[#FFC366]" : "bg-white/10"}`} />
                ))}
              </div>
              {loyalty.reward_available && (
                <p className="mt-2 text-sm font-semibold text-emerald-300">Récompense disponible</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/60">Pas encore de carte : elle se crée à la première commande éligible ou au premier passage en boutique.</p>
          )}
        </Card>
      </div>

      <Card title={`Commandes (${client.orders.length}${client.order_count > client.orders.length ? ` sur ${client.order_count}` : ""})`}>
        {client.orders.length === 0 ? (
          <p className="text-sm text-white/60">Aucune commande pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {client.orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                    #{o.id}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[o.status] || "bg-white/10 text-white/70"}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </p>
                  <p className="text-sm text-white/60">Commandée le {formatDate(o.created_at)} · retrait {o.pickup_label}</p>
                  <p className="text-sm text-white/80">{o.items.join(", ")}</p>
                </div>
                <p className="shrink-0 text-base font-semibold tabular-nums text-white">{formatEUR(o.total_cents / 100)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Compte">
        <div className="flex flex-wrap gap-3">
          {client.is_active ? (
            <button type="button" disabled={busy} onClick={() => setActive(false)}
              className="min-h-11 cursor-pointer rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 text-sm font-semibold text-amber-200 disabled:opacity-50">
              Désactiver le compte
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => setActive(true)}
              className="min-h-11 cursor-pointer rounded-xl bg-emerald-500 px-4 text-sm font-bold text-white disabled:opacity-50">
              Réactiver le compte
            </button>
          )}
          <button type="button" disabled={busy} onClick={deleteForever}
            className="min-h-11 cursor-pointer rounded-xl border border-red-500/30 px-4 text-sm font-semibold text-red-300 disabled:opacity-50">
            Supprimer définitivement…
          </button>
        </div>
        <p className="mt-2 text-xs text-white/50">
          Désactiver suffit dans la plupart des cas : le client ne peut plus se connecter, mais son historique est conservé.
          La suppression définitive est réservée aux demandes d&apos;effacement des données.
        </p>
      </Card>
    </div>
  );
}
