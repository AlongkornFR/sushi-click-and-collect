"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function CancelPage() {
  const sp = useSearchParams();
  const orderId = sp.get("order_id");

  return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <h1 className="text-3xl font-bold">Paiement annulé</h1>
      <p className="text-gray-600 mt-4">
        Aucun souci. Votre commande {orderId ? `#${orderId}` : ""} n’a pas été
        payée.
      </p>

      <div className="mt-10 flex gap-3 justify-center flex-wrap">
        <Link
          href="/cart"
          className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition"
        >
          Retour au panier
        </Link>
        <Link
          href="/menu"
          className="px-6 py-3 rounded-xl border hover:bg-gray-100 transition"
        >
          Voir le menu
        </Link>
      </div>
    </div>
  );
}
