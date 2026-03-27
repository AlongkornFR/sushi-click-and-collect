"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { FaFacebookF, FaInstagram } from "react-icons/fa";

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
          <ul className="space-y-3 text-lg font-medium text-gray-100">
            <li>
              <a href="menu" className="hover:text-gray-400 transition">
                Nos Shops
              </a>
            </li>
            <li>
              <a href="#allergens" className="hover:text-gray-400 transition">
                Allergènes
              </a>
            </li>
            <li>
              <a href="#products" className="hover:text-gray-400 transition">
                Origine de nos produits
              </a>
            </li>
            <li>
              <a href="#ingredients" className="hover:text-gray-400 transition">
                Glossaire des ingrédients
              </a>
            </li>
            <li>
              <a href="cgv" className="hover:text-gray-400 transition">
                CGV
              </a>
            </li>
            <li>
              <a
                href="mentions-legales"
                className="hover:text-gray-400 transition"
              >
                Mentions légales
              </a>
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
                <strong>Du lundi au vendredi :</strong>
              </p>

              <p>12h - 14h30 et 19h - 21h45</p>

              <p className="mt-2">
                <strong>Fermé samedi et dimanche</strong>
              </p>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-3xl font-bold mb-6">Localisation</h3>
          <iframe
            title="Su-Rice Cannes Location"
            className="w-full h-60 rounded-lg border border-gray-700"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2891.540492354732!2d7.0166553!3d43.5585884!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12ce816d613a0a6d%3A0xccffb8a670629cf8!2sSu-Rice!5e0!3m2!1sfr!2sfr!4v1"
            loading="lazy"
          />
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
