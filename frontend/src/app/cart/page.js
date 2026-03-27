"use client";

import Link from "next/link";
import { useCart } from "@/components/context/CartContext";
import { DEFAULT_PRODUCT_IMAGE } from "@/utils/constant";

function formatEUR(value) {
  const n = Number(value) || 0;
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export default function CartPage() {
  const { items, subtotal, increment, decrement, removeItem, clear } =
    useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-[90vh] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-3xl md:text-4xl font-bold">
            Votre panier est vide
          </h1>
          <p className="text-gray-500 mt-3 text-base md:text-lg">
            Ajoutez des produits depuis le menu pour commencer votre commande.
          </p>

          <Link
            href="/menu"
            className="inline-block mt-8 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition"
          >
            Voir le menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 min-h-screen">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Panier</h1>
          <p className="text-gray-500 mt-1">
            Vérifiez votre sélection avant de passer au paiement.
          </p>
        </div>

        <button
          onClick={clear}
          className="text-sm px-4 py-2 rounded-full border hover:bg-gray-100 transition"
        >
          Vider le panier
        </button>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((it) => {
            const lineTotal = Number(it.price) * it.quantity;

            return (
              <div
                key={it.id}
                className="bg-white rounded-2xl shadow-sm border overflow-hidden"
              >
                <div className="p-4 flex gap-4">
                  <img
                    src={it.image_main?.trim() || DEFAULT_PRODUCT_IMAGE}
                    onError={(e) =>
                      (e.currentTarget.src = DEFAULT_PRODUCT_IMAGE)
                    }
                    alt={it.name}
                    className="h-24 w-24 rounded-xl object-cover"
                  />

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link
                          href={`/product/${it.slug}`}
                          className="font-semibold text-lg hover:underline"
                        >
                          {it.name}
                        </Link>
                        <div className="text-gray-500 text-sm mt-1">
                          {formatEUR(it.price)} / unité
                        </div>
                      </div>

                      <button
                        onClick={() => removeItem(it.id)}
                        className="text-sm text-gray-500 hover:text-black transition"
                        aria-label={`Supprimer ${it.name}`}
                      >
                        Supprimer
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decrement(it.id)}
                          className="h-9 w-9 rounded-full border hover:bg-gray-100 transition"
                          aria-label="Diminuer"
                        >
                          −
                        </button>

                        <div className="min-w-10 text-center font-semibold">
                          {it.quantity}
                        </div>

                        <button
                          onClick={() => increment(it.id)}
                          className="h-9 w-9 rounded-full border hover:bg-gray-100 transition"
                          aria-label="Augmenter"
                        >
                          +
                        </button>
                      </div>

                      <div className="font-semibold">
                        {formatEUR(lineTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 h-fit">
          <h2 className="text-xl font-semibold">Résumé</h2>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Sous-total</span>
              <span>{formatEUR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Frais</span>
              <span>—</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t flex justify-between items-center">
            <span className="text-gray-600">Total</span>
            <span className="text-lg font-bold">{formatEUR(subtotal)}</span>
          </div>

          <Link
            href="/checkout"
            className="mt-6 block text-center bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition"
          >
            Passer au paiement
          </Link>

          <Link
            href="/menu"
            className="mt-3 block text-center px-6 py-3 rounded-xl border hover:bg-gray-100 transition"
          >
            Continuer vos achats
          </Link>

          <p className="mt-4 text-xs text-gray-500">
            Paiement sécurisé. Préparation rapide. Retrait sur place.
          </p>
        </div>
      </div>
    </div>
  );
}
