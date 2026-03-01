"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { api } from "@/services/api"
import ProductCard from "@/components/common/ProductCard"
import ReviewSection from "@/components/common/ReviewSection"

export default function HomePage() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    api.get("products/")
      .then((res) => setProducts(res.data))
      .catch((e) => console.error(e))
  }, [])

  const categories = useMemo(() => {
    const map = new Map()
    for (const p of products) {
      const name = p?.category?.name
      if (!name) continue
      if (!map.has(name)) map.set(name, { name, count: 0 })
      map.get(name).count += 1
    }
    return Array.from(map.values()).slice(0, 4)
  }, [products])

  const bestSellers = useMemo(() => products.slice(0, 8), [products])

  return (
    <main className="bg-white">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm tracking-widest text-gray-500 uppercase">
              Click & Collect • Paiement sécurisé
            </p>

            <h1 className="mt-4 text-4xl md:text-6xl font-bold leading-tight">
              Des sushis modernes,
              <span className="block font-light">une expérience premium.</span>
            </h1>

            <p className="mt-5 text-gray-600 max-w-xl">
              Commandez en ligne en quelques clics, payez en toute sécurité, puis récupérez
              votre commande à l’heure. Simple, rapide, délicieux.
            </p>

            <div className="mt-8 flex gap-3 flex-wrap">
              <Link
                href="/menu"
                className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition"
              >
                Commander maintenant
              </Link>
              <Link
                href="/menu"
                className="px-6 py-3 rounded-xl border hover:bg-gray-100 transition"
              >
                Voir le menu
              </Link>
            </div>

            {/* trust line */}
            <div className="mt-8 flex items-center gap-6 text-sm text-gray-500 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-black" />
                Paiement sécurisé (Payplug)
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-black" />
                Retrait rapide
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-black" />
                Produits frais
              </div>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative">
            <div className="absolute -top-10 -right-10 h-64 w-64 rounded-full bg-gray-100 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-gray-100 blur-2xl" />

            <div className="relative bg-white border rounded-3xl shadow-sm overflow-hidden">
              <div className="p-6 border-b">
                <p className="text-sm text-gray-500">Sélection du moment</p>
                <h2 className="text-2xl font-semibold mt-1">Plateau Signature</h2>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4">
                {(bestSellers.length ? bestSellers : Array.from({ length: 4 })).slice(0, 4).map((p, idx) => (
                  <div
                    key={p?.id ?? idx}
                    className="rounded-2xl border p-4 hover:shadow-sm transition"
                  >
                    <div className="text-sm text-gray-500">
                      {p?.category?.name ?? "Sélection"}
                    </div>
                    <div className="font-semibold mt-1">
                      {p?.name ?? "Produit premium"}
                    </div>
                    <div className="mt-2 text-sm">
                      {p?.price ? `${p.price} €` : "—"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t flex items-center justify-between">
                <span className="text-sm text-gray-500">Prêt en 15–25 min</span>
                <Link href="/menu" className="text-sm font-medium hover:underline">
                  Commander →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <TrustCard
            title="Paiement sécurisé"
            desc="Transactions protégées via Payplug. Vos données sont traitées en toute sécurité."
          />
          <TrustCard
            title="Click & Collect"
            desc="Choisissez votre heure de retrait, on prépare votre commande pour qu’elle soit prête."
          />
          <TrustCard
            title="Qualité & fraîcheur"
            desc="Sélection rigoureuse des ingrédients, préparation minute, goût premium."
          />
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Explorer le menu</h2>
            <p className="text-gray-500 mt-2">Choisissez votre catégorie préférée.</p>
          </div>
          <Link href="/menu" className="text-sm font-medium hover:underline">
            Tout le menu →
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(categories.length ? categories : [
            { name: "Maki", count: 0 },
            { name: "California", count: 0 },
            { name: "Sushi", count: 0 },
            { name: "Sashimi", count: 0 },
          ]).map((c) => (
            <Link
              key={c.name}
              href="/menu"
              className="group rounded-3xl border bg-white p-6 hover:shadow-sm transition"
            >
              <div className="text-sm text-gray-500 uppercase tracking-widest">
                Catégorie
              </div>
              <div className="mt-2 text-xl font-semibold">{c.name}</div>
              <div className="mt-2 text-sm text-gray-500">
                {c.count ? `${c.count} produits` : "Découvrir"}
              </div>
              <div className="mt-6 text-sm font-medium group-hover:underline">
                Voir →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* BEST SELLERS */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Les incontournables</h2>
            <p className="text-gray-500 mt-2">
              Une sélection de produits appréciés pour commencer.
            </p>
          </div>
          <Link href="/menu" className="text-sm font-medium hover:underline">
            Commander →
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {(bestSellers.length ? bestSellers : []).slice(0, 8).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
          <ReviewSection />
        {/* CTA bottom */}
        <div className="mt-14 rounded-3xl bg-black text-white p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-semibold">Prêt à commander ?</h3>
            <p className="text-white/70 mt-2">
              Paiement sécurisé, préparation rapide, retrait simple.
            </p>
          </div>
          <Link
            href="/menu"
            className="bg-white text-black px-6 py-3 rounded-xl hover:bg-gray-200 transition"
          >
            Accéder au menu
          </Link>
        </div>
        <div>
        </div>
      </section>
    </main>
  )
}

function TrustCard({ title, desc }) {
  return (
    <div className="bg-white rounded-3xl border p-6">
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-gray-600 mt-2 text-sm leading-relaxed">{desc}</div>
    </div>
  )
}
