"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { openCookieSettings, setCookieConsent, useCookieConsent } from "@/lib/consent";

const MAP_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2891.540492354732!2d7.0166553!3d43.5585884!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12ce816d613a0a6d%3A0xccffb8a670629cf8!2sSu-Rice!5e0!3m2!1sfr!2sfr!4v1";
const MAP_LINK_URL = "https://www.google.com/maps/search/?api=1&query=Su-Rice%2053%20boulevard%20Carnot%20Cannes";

// La carte Google Maps dépose des cookies Google : elle ne se charge
// qu'avec l'accord du visiteur (bannière ou bouton ci-dessous).
function MapEmbed() {
  const consent = useCookieConsent();
  if (consent === "accepted") {
    return (
      <iframe
        title="Plan d'accès Su-Rice Cannes"
        className="w-full h-60 rounded-lg border border-gray-700"
        src={MAP_EMBED_URL}
        loading="lazy"
      />
    );
  }
  return (
    <div className="flex h-60 flex-col items-center justify-center gap-3 rounded-lg border border-gray-700 bg-white/5 px-6 text-center">
      <p className="text-sm text-gray-300">
        53 boulevard Carnot, 06400 Cannes
      </p>
      <p className="text-xs text-gray-400">
        La carte Google Maps dépose des cookies Google. Elle s&apos;affiche si vous les acceptez.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => setCookieConsent("accepted")}
          className="min-h-11 cursor-pointer rounded-xl bg-[#FFC366] px-4 text-sm font-semibold text-black transition hover:bg-[#ffb347]"
        >
          Afficher la carte
        </button>
        <a
          href={MAP_LINK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Ouvrir dans Google Maps
        </a>
      </div>
    </div>
  );
}

const Footer = () => {
  const pathname = usePathname();
  if (pathname.startsWith("/staff")) return null;
  return (
    <footer className="bg-black text-white px-6 md:px-12 py-14">
      <h3 className="text-center pb-16 font-bold">
        L'abus d'alcool est dangereux pour la santé, à consommer avec
        modération. La vente d'alcool est interdite aux mineurs.
      </h3>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Colonne 1 */}
        <div>
          <h3 className="text-3xl font-bold mb-6">Su-Rice</h3>
          {/* Liens absolus (lot H6) : les liens relatifs cassaient depuis
              les pages imbriquées (/account/login → /account/cgv). */}
          <ul className="space-y-3 text-lg font-medium text-gray-100">
            <li>
              <Link href="/menu" className="hover:text-gray-400 transition">
                Notre carte
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-gray-400 transition">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/cgv" className="text-white font-semibold hover:text-gray-400 transition">
                CGV
              </Link>
            </li>
            <li>
              <Link href="/mentions-legales" className="text-white font-semibold hover:text-gray-400 transition">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/politique-de-confidentialite" className="text-white font-semibold hover:text-gray-400 transition">
                Politique de confidentialité
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={openCookieSettings}
                className="cursor-pointer text-white font-semibold hover:text-gray-400 transition"
              >
                Gérer les cookies
              </button>
            </li>
          </ul>
        </div>

        {/* Colonne 2 */}
        <div>
          <h3 className="text-3xl font-bold mb-6">Nous suivre</h3>
          <ul className="space-y-4 text-lg font-medium text-gray-100">
            <li>
              <a
                href="https://www.facebook.com/p/Su-Rice-100094653054085/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 hover:text-gray-400 transition"
              >
                <FaFacebookF className="text-2xl" />
                Facebook
              </a>
            </li>

            <li>
              <a
                href="https://www.instagram.com/surice.cannes/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 hover:text-gray-400 transition"
              >
                <FaInstagram className="text-2xl" />
                Instagram
              </a>
            </li>
          </ul>

          <h3 className="text-3xl font-bold mb-4 mt-6">Horaires</h3>

          <div className="flex items-start gap-3 text-gray-200">
            <div className="text-md leading-relaxed">
              <p>
                <strong>Du lundi au jeudi :</strong>
              </p>
              <p>12h00 - 14h30 et 19h15 - 21h45</p>

              <p className="mt-2">
                <strong>Le vendredi :</strong>
              </p>
              <p>12h00 - 14h30 et 19h15 - 22h00</p>

              <p className="mt-2">
                <strong>Fermé samedi et dimanche</strong>
              </p>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-3xl font-bold mb-6">Localisation</h3>
          <MapEmbed />
        </div>
      </div>
      <div className="border-t border-gray-700 pt-6 text-center max-w-7xl mx-auto mt-5">
        <p className="text-gray-400 text-sm">
          © {new Date().getFullYear()} Su-Rice Restaurant — Tous droits réservés
        </p>
      </div>
    </footer>
  );
};

export default Footer;
