"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/services/api";
import { useCart } from "@/components/context/CartContext";
import { FaClock, FaMapMarkerAlt } from "react-icons/fa";

function formatEURFromCents(cents) {
  return ((Number(cents) || 0) / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

function Spinner() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-zinc-200 dark:border-white/10" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#FFC366]" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-100 dark:bg-white/10" />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-zinc-800 dark:text-white">Confirmation en cours…</p>
        <p className="mt-1 text-sm text-zinc-400 dark:text-white/40">Ne fermez pas cette page</p>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <div className="check-circle flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
      <svg viewBox="0 0 52 52" className="h-12 w-12" fill="none">
        <circle cx="26" cy="26" r="25" stroke="#10b981" strokeWidth="2" fill="none" />
        <path
          className="check-path"
          d="M14 27 L22 35 L38 18"
          stroke="#10b981"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

export default function SuccessPageClient() {
  const sp      = useSearchParams();
  const orderId = sp.get("order_id");
  const { clear } = useCart();

  const [order, setOrder]   = useState(null);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setError("");
    setOrder(null);
    setLoading(true);
    if (!orderId) { setLoading(false); setError("order_id manquant dans l'URL."); return; }

    let cancelled = false;
    const MAX_TRIES = 12;
    let tries = 0;

    const finalize = (data) => {
      if (cancelled) return;
      setOrder(data);
      setLoading(false);
    };

    const pollStatus = async () => {
      try {
        const res = await api.get(`orders/${orderId}/`);
        if (cancelled) return;
        if (res.data.status === "paid") { finalize(res.data); return; }
        tries += 1;
        if (tries >= MAX_TRIES) { finalize(res.data); return; }
        setTimeout(pollStatus, 1500);
      } catch {
        if (cancelled) return;
        setError("Impossible de récupérer la commande.");
        setLoading(false);
      }
    };

    (async () => {
      try {
        // Étape 1: force verify côté backend (pull Payplug — shortcut IPN)
        const res = await api.post(`orders/${orderId}/verify-payment/`);
        if (cancelled) return;
        if (res.data.status === "paid") { finalize(res.data); return; }
        // Étape 2: si pas encore paid, on poll GET classique (IPN peut arriver après)
        setOrder(res.data);
        pollStatus();
      } catch {
        // verify échoue → fallback direct sur poll GET
        pollStatus();
      }
    })();

    return () => { cancelled = true; };
  }, [orderId]);

  useEffect(() => {
    if (!order || order.status !== "paid") return;
    const key = `cart_cleared_for_order_${order.id}`;
    if (typeof window !== "undefined" && localStorage.getItem(key)) return;
    clear();
    if (typeof window !== "undefined") localStorage.setItem(key, "1");
  }, [order, clear]);

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
          <span className="text-3xl text-red-400">✕</span>
        </div>
        <h1 className="mt-5 text-2xl font-bold text-zinc-900 dark:text-white">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-zinc-400 dark:text-white/40">{error}</p>
        <Link href="/menu" className="mt-8 rounded-xl bg-[#FFC366] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95">
          Revenir au menu
        </Link>
      </div>
    );
  }

  const paid = order?.status === "paid";

  if (!paid) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
          <span className="text-4xl text-red-400">✕</span>
        </div>
        <h1 className="mt-5 text-2xl font-bold text-zinc-900 dark:text-white">Paiement non confirmé</h1>
        <p className="mt-2 max-w-sm text-sm text-zinc-400 dark:text-white/40">
          Votre paiement n&apos;a pas été validé. Vous pouvez réessayer ou revenir au panier.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {order?.payment_url && (
            <button type="button" onClick={() => { window.location.href = order.payment_url; }}
              className="cursor-pointer rounded-xl bg-[#FFC366] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95">
              Réessayer le paiement
            </button>
          )}
          <Link href="/cart" className="rounded-xl border border-zinc-200 dark:border-white/10 px-6 py-3 text-sm font-semibold text-zinc-600 dark:text-white/60 transition hover:bg-zinc-50 dark:hover:bg-white/5 active:scale-95">
            Retour au panier
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 md:px-6">
      <div className="flex flex-col items-center text-center">
        <CheckIcon />
        <div className="success-content mt-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Commande confirmée !</h1>
          <p className="mt-2 text-sm text-zinc-400 dark:text-white/40">
            Merci ! Votre commande est enregistrée et va être préparée.
          </p>
        </div>
      </div>

      <div className="success-content mt-8 overflow-hidden rounded-2xl border border-zinc-100 dark:border-white/10 bg-white dark:bg-[#1D1D1D]">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/10 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-white/30">Commande</p>
            <p className="text-lg font-bold text-zinc-900 dark:text-white">#{order.id}</p>
          </div>
          <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Payée
          </span>
        </div>

        <div className="grid grid-cols-2 divide-x divide-zinc-100 dark:divide-white/10 border-b border-zinc-100 dark:border-white/10">
          <div className="flex items-center gap-2.5 px-5 py-4">
            <FaClock className="shrink-0 text-zinc-300 dark:text-white/20" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-white/30">Retrait</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{order.pickup_time}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-5 py-4">
            <FaMapMarkerAlt className="shrink-0 text-zinc-300 dark:text-white/20" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-white/30">Lieu</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Su-Rice · Cannes</p>
            </div>
          </div>
        </div>

        {order.items?.length > 0 && (
          <div className="px-5 py-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-white/30">Détail</p>
            <ul className="space-y-2">
              {order.items.map(it => (
                <li key={it.id} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600 dark:text-white/60">
                    <span className="font-semibold text-zinc-900 dark:text-white">{it.quantity}×</span>{" "}{it.product_name}
                  </span>
                  <span className="font-semibold text-[#FFC366]">{formatEURFromCents(it.line_total_cents)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-white/10 px-5 py-4">
          <span className="text-sm font-medium text-zinc-500 dark:text-white/50">Total payé</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-white">{formatEURFromCents(order.total_cents)}</span>
        </div>
      </div>

      <div className="success-content mt-6 text-center">
        <Link href="/menu" className="inline-block rounded-xl bg-[#FFC366] px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95">
          Revenir au menu
        </Link>
        <p className="mt-4 text-xs text-zinc-400 dark:text-white/30">
          Un récapitulatif vous a été envoyé par email.
        </p>
      </div>
    </div>
  );
}
