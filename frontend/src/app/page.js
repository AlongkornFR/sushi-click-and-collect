"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import ProductCard from "@/components/common/ProductCard";
import { FaShieldAlt, FaClock, FaLeaf } from "react-icons/fa";
import TrustCard from "@/components/common/TrustCard";
import FeatureCard from "@/components/common/FeatureCard";
import FeaturedProductCard from "@/components/common/FeatureProductCard";

export default function HomePage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api
      .get("products/")
      .then((res) => setProducts(res.data))
      .catch((e) => console.error(e));
  }, []);

  const categories = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      const name = p?.category?.name;
      if (!name) continue;
      if (!map.has(name)) map.set(name, { name, count: 0 });
      map.get(name).count += 1;
    }
    return Array.from(map.values()).slice(0, 4);
  }, [products]);

  const bestSellers = useMemo(() => products.slice(0, 8), [products]);

  return (
    <main className="bg-white">
      {/* HERO */}
      <section className="relative h-96 md:h-[75vh] bg-cover bg-center bg-[url('https://img-3.journaldesfemmes.fr/KXlxZdShrVsMutkNGfPPKxGiJqg=/1500x/smart/b6bbd8cda8f945949fb78307a9f067f5/ccmcms-jdf/35195140.jpg')] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-w-7xl mx-auto px-6 text-center text-white">
          <p className="text-lg md:text-2xl font-light mb-8 max-w-2xl mx-auto">
            Commandez en ligne en quelques clics, payez en toute sécurité, puis
            récupérez votre commande à l'heure. Simple, rapide, délicieux.
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
            <h2 className="text-4xl md:text-5xl font-bold">
              Votre boutique de cuisine japonaise et thaïlandaise à Cannes
            </h2>
            <p className="text-gray-600 mt-4 leading-relaxed">
              Vous appréciez les mets aux saveurs asiatiques ? Poussez les
              portes de notre magasin de cuisine japonaise à Cannes. Nos chefs
              vous concoctent des plats japonais et thaïlandais, qui régaleront
              vos papilles. Chez <strong>SU-RICE</strong>, nous privilégions
              toujours le goût. Nous travaillons des produits frais et proposons
              une cuisine faite maison, d'excellente qualité.
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
        <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              Les incontournables
            </h2>
            <p className="text-gray-500 mt-2">
              Une sélection de produits appréciés pour commencer.
            </p>
          </div>

          <Link href="/menu" className="text-sm font-medium hover:underline">
            Voir tout le menu →
          </Link>
        </div>

        {bestSellers.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Grand produit à gauche */}
            <div className="lg:col-span-6">
              <FeaturedProductCard product={bestSellers[0]} />
            </div>

            {/* Produits à droite */}
            <div className="lg:col-span-6">
              <div className="grid grid-cols-2 gap-6">
                {bestSellers.slice(1, 7).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            image="https://www.su-rice.com/media/images/upload/plataux%2063p-3p%20sashimi%20saumon,3p%20sashimi%20thon,3p%20nikiri%20saumon,3p%20nikiri%20thon,3p%20nikiri%20crevette,8p%20maki%20saumon,8p%20eggg%20maki%20saumon,8p%20maki%20avocat,8p%20cali%20roll%20saumon%20avocat,8p%20spring%20roll%20saumon%20avocat,8p%20cripy.png"
            title="Cuisine thaïlandaise et japonaise à emporter à Cannes"
          >
            SU-RICE propose une cuisine thaïlandaise et japonaise authentique à
            Cannes. Inspiré de “sushi” et “rice”, notre concept met à l’honneur
            le riz et les saveurs asiatiques à travers une large sélection :
            sushis, makis, rolls, spring rolls, nigiris… Commandez facilement en
            ligne et choisissez entre le click & collect ou la livraison.
            <br />
            <br />
            Notre cheffe, maître sushi d’origine thaïlandaise, prépare chaque
            plat avec passion et savoir-faire. Tous nos produits sont faits
            maison, avec des ingrédients frais et de qualité.
            <br />
            <br />
            Découvrez l’expérience SU-RICE et laissez-vous séduire par une
            cuisine asiatique savoureuse et raffinée.
          </FeatureCard>

          <FeatureCard
            image="https://www.su-rice.com/media/images/upload/ill-home4.jpg"
            title="Une équipe passionnée à Cannes"
          >
            SU-RICE, c’est l’histoire d’Alexandre et Thitiporn Licakis, deux
            experts de la restauration avec plus de 50 ans d’expérience cumulée.
            Après un parcours international (Thaïlande, Angleterre, Tunisie…),
            ils ont choisi de créer un lieu à leur image, au cœur de Cannes, à
            quelques minutes de la Croisette.
            <br />
            <br />
            Notre équipe partage une passion commune pour la cuisine japonaise
            et thaïlandaise. Sushis préparés sur place, recettes créatives et
            produits frais : chaque plat est pensé pour offrir une expérience
            unique.
            <br />
            <br />
            Découvrez une cuisine asiatique moderne, authentique et pleine de
            saveurs chez SU-RICE."
          </FeatureCard>

          <FeatureCard
            image="https://www.su-rice.com/media/images/news/med/14.webp"
            title="Boutique de cuisine japonaise et thaïlandaise à Cannes"
          >
            SU-RICE est une boutique spécialisée en cuisine japonaise et
            thaïlandaise, située à Cannes. Ici, pas de service classique : vous
            choisissez librement vos sushis, makis et rolls selon vos envies.
            <br />
            <br />
            Nous privilégions le contact avec nos clients et le plaisir de faire
            découvrir de nouvelles saveurs. Tous nos produits sont soigneusement
            sélectionnés et préparés sur place, sous vos yeux, pour garantir
            fraîcheur et qualité.
            <br />
            <br />
            Une question ? Notre équipe est à votre écoute pour vous conseiller
            et vous faire vivre une expérience culinaire unique.
          </FeatureCard>
        </div>
      </section>
    </main>
  );
}
