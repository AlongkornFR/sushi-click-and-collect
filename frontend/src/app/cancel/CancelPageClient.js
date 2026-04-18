"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function CancelPageClient() {
  const sp = useSearchParams();
  const orderId = sp.get("order_id");

  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
        <span className="text-3xl text-red-400">✕</span>
      </div>
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Paiement annulé</h1>
      <p className="mt-3 text-zinc-500 dark:text-white/40">
        Aucun souci. Votre commande {orderId ? `#${orderId}` : ""} n&apos;a pas été payée.
      </p>

      <div className="mt-8 flex gap-3 justify-center flex-wrap">
        <Link
          href="/cart"
          className="rounded-xl bg-[#FFC366] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95"
        >
          Retour au panier
        </Link>
        <Link
          href="/menu"
          className="rounded-xl border border-zinc-200 dark:border-white/10 px-6 py-3 text-sm font-semibold text-zinc-600 dark:text-white/60 transition hover:bg-zinc-50 dark:hover:bg-white/5 active:scale-95"
        >
          Voir le menu
        </Link>
      </div>
    </div>
  );
}
