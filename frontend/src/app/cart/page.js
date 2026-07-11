"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useCart } from "@/components/context/CartContext";
import { formatEUR } from "@/utils/formatting";
import ProductImage from "@/components/common/ProductImage";
import { FaXmark } from "react-icons/fa6";
import { FaShieldAlt, FaMapMarkerAlt, FaMinus, FaPlus, FaShoppingBag, FaTrash } from "react-icons/fa";

const SWIPE_THRESHOLD = 72;

function SwipeToDelete({ onDelete, children }) {
  const [offsetX, setOffsetX]   = useState(0);
  const [animating, setAnimating] = useState(false);
  const startXRef = useRef(null);

  function handleTouchStart(e) {
    startXRef.current = e.touches[0].clientX;
    setAnimating(false);
  }

  function handleTouchMove(e) {
    if (startXRef.current === null) return;
    setOffsetX(e.touches[0].clientX - startXRef.current);
  }

  function handleTouchEnd() {
    startXRef.current = null;
    setAnimating(true);
    if (Math.abs(offsetX) > SWIPE_THRESHOLD) {
      setOffsetX(offsetX > 0 ? 600 : -600);
      setTimeout(onDelete, 280);
    } else {
      setOffsetX(0);
    }
  }

  const swiping  = Math.abs(offsetX) > 8;
  const toRight  = offsetX > 0;
  const progress = Math.min(Math.abs(offsetX) / SWIPE_THRESHOLD, 1);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Fond rouge avec icône poubelle */}
      <div
        className={`absolute inset-0 flex items-center rounded-2xl bg-red-500 transition-opacity duration-100 ${
          toRight ? "justify-start pl-5" : "justify-end pr-5"
        }`}
        style={{ opacity: swiping ? progress : 0 }}
      >
        <FaTrash className="text-lg text-white" />
      </div>

      {/* Carte glissable */}
      <div
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: animating
            ? "transform 0.28s cubic-bezier(.25,.46,.45,.94)"
            : "none",
          willChange: "transform",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

export default function CartPage() {
  const { items, subtotal, increment, decrement, removeItem, clear } = useCart();

  /* ── Empty state ── */
  if (items.length === 0) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-100 dark:bg-[#1D1D1D]">
          <FaShoppingBag className="text-3xl text-zinc-300 dark:text-white/20" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Votre panier est vide</h1>
        <p className="mt-2 max-w-xs text-sm text-zinc-500 dark:text-white/40">
          Ajoutez des produits depuis le menu pour commencer votre commande.
        </p>
        <Link
          href="/menu"
          className="mt-8 rounded-xl bg-[#FFC366] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95"
        >
          Voir le menu
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[100vh] max-w-6xl px-4 py-10 md:px-6 md:py-14">

      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Panier</h1>
          <p className="mt-1 text-sm text-zinc-400 dark:text-white/40">
            {items.length} article{items.length > 1 ? "s" : ""} · Retrait sur place
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="cursor-pointer text-xs text-zinc-400 dark:text-white/40 transition hover:text-red-400"
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
              <SwipeToDelete key={it.id} onDelete={() => removeItem(it.id)}>
                <div className="flex gap-4 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1D1D1D] p-4">

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
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{it.name}</p>
                        <p className="mt-0.5 text-xs text-zinc-400 dark:text-white/40">{formatEUR(it.price)} / unité</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        className="shrink-0 cursor-pointer rounded-lg p-1.5 text-zinc-300 dark:text-white/30 transition hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-600 dark:hover:text-white/70"
                        aria-label={`Supprimer ${it.name}`}
                      >
                        <FaXmark className="text-xs" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      {/* Qty controls */}
                      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-1 py-1">
                        <button
                          type="button"
                          onClick={() => decrement(it.id)}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-500 dark:text-white/50 transition hover:bg-white dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white active:scale-95"
                          aria-label="Diminuer"
                        >
                          <FaMinus className="text-[10px]" />
                        </button>
                        <span className="min-w-6 text-center text-sm font-semibold text-zinc-900 dark:text-white">
                          {it.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increment(it.id)}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-500 dark:text-white/50 transition hover:bg-white dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white active:scale-95"
                          aria-label="Augmenter"
                        >
                          <FaPlus className="text-[10px]" />
                        </button>
                      </div>

                      <p className="text-sm font-bold text-[#FFC366]">{formatEUR(lineTotal)}</p>
                    </div>
                  </div>
                </div>
              </SwipeToDelete>
            );
          })}
        </div>

        {/* ── Summary ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1D1D1D] p-6">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Récapitulatif</h2>

            <div className="my-5 h-px bg-zinc-100 dark:bg-white/10" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-600 dark:text-white/60">Total</span>
              <span className="text-xl font-bold text-zinc-900 dark:text-white">{formatEUR(subtotal)}</span>
            </div>

            <Link
              href="/checkout"
              className="mt-5 block cursor-pointer rounded-xl bg-[#FFC366] px-6 py-3.5 text-center text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-[.98]"
            >
              Passer au paiement →
            </Link>

            <Link
              href="/menu"
              className="mt-2.5 block cursor-pointer rounded-xl border border-zinc-200 dark:border-white/10 px-6 py-3 text-center text-sm font-medium text-zinc-600 dark:text-white/60 transition hover:bg-zinc-50 dark:hover:bg-white/5 active:scale-[.98]"
            >
              Continuer mes achats
            </Link>

            {/* Trust indicators */}
            <div className="mt-5 space-y-2 border-t border-zinc-100 dark:border-white/10 pt-4">
              <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-white/30">
                <FaShieldAlt className="shrink-0 text-zinc-300 dark:text-white/20" />
                Paiement 100 % sécurisé via Payplug
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-white/30">
                <FaMapMarkerAlt className="shrink-0 text-zinc-300 dark:text-white/20" />
                Retrait sur place à Cannes
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
