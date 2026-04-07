"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/services/api";
import ProductCard from "@/components/common/ProductCard";
import { FaShieldAlt, FaClock, FaLeaf } from "react-icons/fa";
import TrustCard from "@/components/common/TrustCard";
import FeatureCard from "@/components/common/FeatureCard";
import FeaturedProductCard from "@/components/common/FeatureProductCard";
import { useInView } from "@/hooks/useInView";

export default function HomePage() {
  const [products, setProducts] = useState([]);

  const [trustRef, trustVisible]       = useInView();
  const [aboutRef, aboutVisible]       = useInView();
  const [sellersRef, sellersVisible]   = useInView();
  const [featuresRef, featuresVisible] = useInView();
  const carouselRef   = useRef(null);
  const intervalRef   = useRef(null);
  const [activeCard, setActiveCard] = useState(0);
  const CARD_COUNT = 3;

  function scrollToCard(index) {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / CARD_COUNT;
    el.scrollTo({ left: cardWidth * index, behavior: "smooth" });
  }

  function handleCarouselScroll() {
    const el = carouselRef.current;
    if (!el) return;
    const ratio = el.scrollLeft / (el.scrollWidth - el.clientWidth);
    setActiveCard(Math.round(ratio * 2));
  }

  function resetInterval() {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveCard((prev) => {
        const next = (prev + 1) % CARD_COUNT;
        scrollToCard(next);
        return next;
      });
    }, 10000);
  }

  useEffect(() => {
    resetInterval();
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    api
      .get("products/")
      .then((res) => setProducts(res.data))
      .catch((e) => console.error(e));
  }, []);

  const bestSellers = useMemo(() => products.slice(0, 8), [products]);

  return (
    <main className="bg-white overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative h-[88vh] min-h-[580px] bg-cover bg-center bg-[url('https://img-3.journaldesfemmes.fr/KXlxZdShrVsMutkNGfPPKxGiJqg=/1500x/smart/b6bbd8cda8f945949fb78307a9f067f5/ccmcms-jdf/35195140.jpg')] flex items-end md:items-center">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

        <div className="relative max-w-7xl mx-auto px-6 pb-16 md:pb-0 w-full">
          <div className="max-w-2xl text-white">

            {/* Badge */}
            <div className="hero-badge inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 text-sm font-medium mb-6 w-fit">
              🍣 Su-Rice · Cannes
            </div>

            {/* Title */}
            <h1 className="hero-title text-5xl md:text-7xl font-bold leading-[1.08] tracking-tight mb-5">
              Saveurs d&apos;Asie<br />
              <span className="text-white/80">à Cannes</span>
            </h1>

            {/* Subtitle */}
            <p className="hero-sub text-white/75 text-lg md:text-xl leading-relaxed mb-9 max-w-xl">
              Commandez en ligne en quelques clics, payez en toute sécurité,
              puis récupérez votre commande à l&apos;heure choisie.
            </p>

            {/* CTAs */}
            <div className="hero-cta flex gap-3 flex-wrap">
              <Link
                href="/menu"
                className="bg-white text-black px-7 py-3.5 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 hover:shadow-xl active:scale-95"
              >
                Commander maintenant
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="hero-cta absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40 text-xs">
          <div className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent animate-bounce" />
        </div>
      </section>

      {/* ── TRUST CARDS ── */}
      <section ref={trustRef} className="border-y border-zinc-100 bg-zinc-50/60">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-3 gap-2 md:gap-6">
          {[
            { icon: <FaShieldAlt />, title: "Paiement sécurisé",  desc: "Transactions protégées via Payplug." },
            { icon: <FaClock />,     title: "Click & Collect",     desc: "Choisissez votre heure de retrait." },
            { icon: <FaLeaf />,      title: "Qualité & fraîcheur", desc: "Produits frais et préparation minute." },
          ].map((item, i) => (
            <div
              key={item.title}
              className={`reveal reveal-delay-${i + 1} ${trustVisible ? "visible" : ""}`}
            >
              <TrustCard icon={item.icon} title={item.title} desc={item.desc} />
            </div>
          ))}
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section ref={aboutRef} className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className={`reveal ${aboutVisible ? "visible" : ""}`}>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              Votre restaurant de cuisine thaïlandaise et japonaise à Cannes
            </h2>
            <p className="text-gray-600 mt-5 leading-relaxed">
              Vous appréciez les saveurs asiatiques ? Poussez les portes de notre
              restaurant de cuisine thaïlandaise à Cannes. Nos chefs vous concoctent des plats
              thaï et japonais, qui régaleront vos papilles. Chez{" "}
              <strong>SU-RICE</strong>, nous privilégions toujours le goût. Nous travaillons
              des produits frais et proposons une cuisine faite maison, d'excellente qualité.
            </p>
          </div>
          <div className={`reveal reveal-delay-2 ${aboutVisible ? "visible" : ""}`}>
            <div className="rounded-3xl overflow-hidden shadow-xl">
              <img
                src="https://www.su-rice.com/media/images/upload/ill-home3.jpg"
                alt="SU-RICE cuisine"
                className="w-full h-auto aspect-square object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── BEST SELLERS ── */}
      <section ref={sellersRef} className="max-w-7xl mx-auto px-6 pb-24">
        <div className={`flex items-end justify-between gap-6 flex-wrap mb-10 reveal ${sellersVisible ? "visible" : ""}`}>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Les incontournables</h2>
            <p className="text-gray-500 mt-2">Une sélection de produits appréciés pour commencer.</p>
          </div>
          <Link href="/menu" className="text-sm font-medium hover:underline">
            Voir tout le menu →
          </Link>
        </div>

        {bestSellers.length > 0 && (
          <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 reveal reveal-delay-2 ${sellersVisible ? "visible" : ""}`}>
            <div className="lg:col-span-6">
              <FeaturedProductCard product={bestSellers[0]} />
            </div>
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

      {/* ── FEATURE CARDS ── */}
      <section ref={featuresRef} className="bg-white py-16">
        {(() => {
          const cards = [
            {
              image: "https://www.su-rice.com/media/images/upload/plataux%2063p-3p%20sashimi%20saumon,3p%20sashimi%20thon,3p%20nikiri%20saumon,3p%20nikiri%20thon,3p%20nikiri%20crevette,8p%20maki%20saumon,8p%20eggg%20maki%20saumon,8p%20maki%20avocat,8p%20cali%20roll%20saumon%20avocat,8p%20spring%20roll%20saumon%20avocat,8p%20cripy.png",
              title: "Cuisine thaïlandaise et japonaise à emporter à Cannes",
              body: (
                <>
                  SU-RICE propose une cuisine thaïlandaise et japonaise authentique à Cannes.
                  Inspiré de "sushi" et "rice", notre concept met à l'honneur le riz et les
                  saveurs asiatiques à travers une large sélection : sushis, makis, rolls,
                  spring rolls, nigiris…
                  <br /><br />
                  Notre cheffe, maître sushi d'origine thaïlandaise, prépare chaque plat avec
                  passion et savoir-faire. Tous nos produits sont faits maison, avec des
                  ingrédients frais et de qualité.
                </>
              ),
            },
            {
              image: "https://www.su-rice.com/media/images/upload/ill-home4.jpg",
              title: "Une équipe passionnée à Cannes",
              body: (
                <>
                  SU-RICE, c'est l'histoire d'Alexandre et Thitiporn Licakis, deux experts de
                  la restauration avec plus de 50 ans d'expérience cumulée. Après un parcours
                  international (Thaïlande, Angleterre, Tunisie…), ils ont choisi de créer un
                  lieu à leur image, au cœur de Cannes.
                  <br /><br />
                  Notre équipe partage une passion commune pour la cuisine japonaise et
                  thaïlandaise. Sushis préparés sur place, recettes créatives et produits
                  frais : chaque plat est pensé pour offrir une expérience unique.
                </>
              ),
            },
            {
              image: "https://www.su-rice.com/media/images/news/med/14.webp",
              title: "Boutique de cuisine japonaise et thaïlandaise à Cannes",
              body: (
                <>
                  SU-RICE est une boutique spécialisée en cuisine japonaise et thaïlandaise,
                  située à Cannes. Ici, pas de service classique : vous choisissez librement
                  vos sushis, makis et rolls selon vos envies.
                  <br /><br />
                  Tous nos produits sont soigneusement sélectionnés et préparés sur place,
                  sous vos yeux, pour garantir fraîcheur et qualité. Notre équipe est à votre
                  écoute pour vous conseiller.
                </>
              ),
            },
          ];
          return (
            <>
              {/* ── Mobile : carousel ── */}
              <div className="md:hidden">
                <div
                  ref={carouselRef}
                  onScroll={() => { handleCarouselScroll(); resetInterval(); }}
                  className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-6 pb-2 [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: "none" }}
                >
                  {cards.map((item) => (
                    <div key={item.title} className="snap-start shrink-0 w-[82vw]">
                      <FeatureCard image={item.image} title={item.title}>
                        {item.body}
                      </FeatureCard>
                    </div>
                  ))}
                </div>

                {/* Dots */}
                <div className="mt-5 flex justify-center gap-2">
                  {cards.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Carte ${i + 1}`}
                      onClick={() => { scrollToCard(i); resetInterval(); }}
                      className={`rounded-full transition-all duration-300 ${
                        activeCard === i
                          ? "w-5 h-1.5 bg-zinc-900"
                          : "w-1.5 h-1.5 bg-zinc-300"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* ── Desktop : grille ── */}
              <div className="hidden md:grid md:grid-cols-3 gap-8 max-w-7xl mx-auto px-6">
                {cards.map((item, i) => (
                  <div
                    key={item.title}
                    className={`reveal reveal-delay-${i + 1} ${featuresVisible ? "visible" : ""}`}
                  >
                    <FeatureCard image={item.image} title={item.title}>
                      {item.body}
                    </FeatureCard>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </section>
    </main>
  );
}
