"use client";

import Link from "next/link";
import { useCart } from "@/components/context/CartContext";
import { formatEUR } from "@/utils/formatting";
import ProductImage from "@/components/common/ProductImage";
import { FaXmark } from "react-icons/fa6";
import { FaShieldAlt, FaMapMarkerAlt, FaMinus, FaPlus, FaShoppingBag } from "react-icons/fa";

export default function CartPage() {
  const { items, subtotal, increment, decrement, removeItem, clear } = useCart();

  /* ── Empty state ── */
  if (items.length === 0) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-100">
          <FaShoppingBag className="text-3xl text-zinc-300" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">Votre panier est vide</h1>
        <p className="mt-2 max-w-xs text-sm text-zinc-400">
          Ajoutez des produits depuis le menu pour commencer votre commande.
        </p>
        <Link
          href="/menu"
          className="mt-8 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 active:scale-95"
        >
          Voir le menu
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">

      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Panier</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {items.length} article{items.length > 1 ? "s" : ""} · Retrait sur place
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="cursor-pointer text-xs text-zinc-400 transition hover:text-red-500"
        >
          Vider le panier
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

        {/* ── Items ── */}
        <div className="space-y-3 lg:col-span-2">
          {items.map((it) => {
            const lineTotal = Number(it.price) * it.quantity;
            return (
              <div key={it.id} className="flex gap-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">

                {/* Image */}
                <ProductImage
                  src={it.image_main}
                  alt={it.name}
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                />

                {/* Content */}
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">{it.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{formatEUR(it.price)} / unité</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="shrink-0 cursor-pointer rounded-lg p-1.5 text-zinc-300 transition hover:bg-zinc-100 hover:text-zinc-600"
                      aria-label={`Supprimer ${it.name}`}
                    >
                      <FaXmark className="text-xs" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    {/* Qty controls */}
                    <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-1 py-1">
                      <button
                        type="button"
                        onClick={() => decrement(it.id)}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white hover:text-zinc-900 active:scale-95"
                        aria-label="Diminuer"
                      >
                        <FaMinus className="text-[10px]" />
                      </button>
                      <span className="min-w-6 text-center text-sm font-semibold text-zinc-900">
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => increment(it.id)}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white hover:text-zinc-900 active:scale-95"
                        aria-label="Augmenter"
                      >
                        <FaPlus className="text-[10px]" />
                      </button>
                    </div>

                    <p className="text-sm font-bold text-zinc-900">{formatEUR(lineTotal)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Summary ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-zinc-900">Récapitulatif</h2>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-500">
                <span>Sous-total ({items.length} article{items.length > 1 ? "s" : ""})</span>
                <span className="font-medium text-zinc-700">{formatEUR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Frais de service</span>
                <span className="text-emerald-600 font-medium">Gratuit</span>
              </div>
            </div>

            <div className="my-5 h-px bg-zinc-100" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-600">Total</span>
              <span className="text-xl font-bold text-zinc-900">{formatEUR(subtotal)}</span>
            </div>

            <Link
              href="/checkout"
              className="mt-5 block cursor-pointer rounded-xl bg-zinc-900 px-6 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-zinc-700 active:scale-[.98]"
            >
              Passer au paiement →
            </Link>

            <Link
              href="/menu"
              className="mt-2.5 block cursor-pointer rounded-xl border border-zinc-200 px-6 py-3 text-center text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 active:scale-[.98]"
            >
              Continuer mes achats
            </Link>

            {/* Trust indicators */}
            <div className="mt-5 space-y-2 border-t border-zinc-100 pt-4">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <FaShieldAlt className="shrink-0 text-zinc-300" />
                Paiement 100 % sécurisé via Payplug
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <FaMapMarkerAlt className="shrink-0 text-zinc-300" />
                Retrait sur place à Cannes
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
