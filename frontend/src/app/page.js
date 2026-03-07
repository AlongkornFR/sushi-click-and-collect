"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { api } from "@/services/api"
import ProductCard from "@/components/common/ProductCard"
import { FaShieldAlt, FaClock, FaLeaf } from "react-icons/fa";
import TrustCard from "@/components/common/TrustCard";

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
      <section className="relative h-96 md:h-[75vh] bg-cover bg-center bg-[url('https://img-3.journaldesfemmes.fr/KXlxZdShrVsMutkNGfPPKxGiJqg=/1500x/smart/b6bbd8cda8f945949fb78307a9f067f5/ccmcms-jdf/35195140.jpg')] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-w-7xl mx-auto px-6 text-center text-white">
          <p className="text-lg md:text-2xl font-light mb-8 max-w-2xl mx-auto">
            Commandez en ligne en quelques clics, payez en toute sécurité, puis récupérez votre commande à l'heure. Simple, rapide, délicieux.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/menu"
              className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition"
            >
              Commander maintenant
            </Link>
            <Link
              href="/menu"
              className="px-6 py-3 rounded-xl border border-white hover:bg-white hover:text-black transition"
            >
              Voir le menu
            </Link>
          </div>
        </div>
      </section>

<section className="border-y bg-gray-50">
  <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">

    <TrustCard
      icon={<FaShieldAlt />}
      title="Paiement sécurisé"
      desc="Transactions protégées via Payplug."
    />

    <TrustCard
      icon={<FaClock />}
      title="Click & Collect"
      desc="Choisissez votre heure de retrait."
    />

    <TrustCard
      icon={<FaLeaf />}
      title="Qualité & fraîcheur"
      desc="Produits frais et préparation minute."
    />

  </div>
</section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold">Votre boutique de cuisine japonaise et thaïlandaise à Cannes</h2>
            <p className="text-gray-600 mt-4 leading-relaxed">
              Vous appréciez les mets aux saveurs asiatiques ? Poussez les portes de notre magasin de cuisine japonaise à Cannes. Nos chefs vous concoctent des plats japonais et thaïlandais, qui régaleront vos papilles. Chez <strong>SU-RICE</strong>, nous privilégions toujours le goût. Nous travaillons des produits frais et proposons une cuisine faite maison, d'excellente qualité. 
            </p>
          </div>
          <div className="rounded-3xl overflow-hidden">
            <img
              src="https://www.su-rice.com/media/images/upload/ill-home3.jpg"
              alt="Section image"
              className="w-full h-auto aspect-square object-cover"
            />
          </div>
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
      </section>
    </main>
  )
}
