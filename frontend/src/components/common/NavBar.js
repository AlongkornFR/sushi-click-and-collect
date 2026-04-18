"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/context/CartContext";
import { useTheme } from "@/components/context/ThemeContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FaBars, FaXmark } from "react-icons/fa6";
import { FaShoppingBag, FaPhone, FaMapMarkerAlt, FaSun, FaMoon } from "react-icons/fa";
import Logo from "../../../public/Surice_logo.webp";

const MAPS_URL =
  "https://www.google.com/maps/place/Su-Rice/@43.5585923,7.0140804,17z/data=!3m1!4b1!4m6!3m5!1s0x12ce816d613a0a6d:0xccffb8a670629cf8!8m2!3d43.5585884!4d7.0166553!16s%2Fg%2F11krh5b4jt?entry=ttu&g_ep=EgoyMDI2MDMwNC4xIKXMDSoASAFQAw%3D%3D";

const PHONE = "+33 4 93 68 08 12";
const PHONE_HREF = "tel:+33493680812";

const NAV_LINKS = [
  { href: "/",        label: "Accueil" },
  { href: "/menu",    label: "Carte"   },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const { count }         = useCart();
  const { dark, toggle }  = useTheme();
  const pathname          = usePathname();
  const [open, setOpen]   = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);

  if (pathname.startsWith("/staff")) return null;

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const desktopLinkClass = (href) =>
    `text-sm font-medium transition-colors duration-200 ${
      isActive(href)
        ? "text-zinc-900 dark:text-white"
        : "text-zinc-500 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white"
    }`;

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 md:px-6">

          {/* ── Desktop ── */}
          <div className="hidden h-16 items-center justify-between md:flex">

            {/* Left */}
            <div className="flex items-center gap-5">
              <Link href="/">
                <Image src={Logo} alt="Su Rice" width={44} height={44} />
              </Link>

              <div className="h-5 w-px bg-zinc-200 dark:bg-white/10" />

              {NAV_LINKS.filter((l) => l.href !== "/").map(({ href, label }) => (
                <Link key={href} href={href} className={desktopLinkClass(href)}>
                  {label}
                </Link>
              ))}

              <div className="h-5 w-px bg-zinc-200 dark:bg-white/10" />

              <Link
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Voir sur Google Maps"
                className="text-zinc-400 dark:text-white/40 transition-colors hover:text-zinc-700 dark:hover:text-white"
              >
                <FaMapMarkerAlt className="h-4 w-4" />
              </Link>

              <a
                href={PHONE_HREF}
                className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-white/50 transition-colors hover:text-zinc-900 dark:hover:text-white"
              >
                <FaPhone className="h-3 w-3" />
                {PHONE}
              </a>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button
                type="button"
                onClick={toggle}
                aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-zinc-500 dark:text-white/50 transition hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white active:scale-95"
              >
                {dark ? <FaMoon className="text-base" /> : <FaSun className="text-base" />}
              </button>

              <Link
                href="/cart"
                className="relative flex items-center gap-2 rounded-xl bg-[#FFC366] px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-[#ffb347] active:scale-95"
              >
                <FaShoppingBag className="text-base" />
                Panier
                {count > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white dark:border-black bg-[#FFC366] text-[10px] font-bold text-black">
                    {count}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* ── Mobile ── */}
          <div className="flex h-16 items-center justify-between md:hidden">

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-zinc-600 dark:text-white/70 transition hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95"
              aria-label="Ouvrir le menu"
            >
              <FaBars className="text-lg" />
            </button>

            <Link href="/">
              <Image src={Logo} alt="Su Rice" width={42} height={42} />
            </Link>

            <div className="flex items-center gap-1">
              {/* Theme toggle mobile */}
              <button
                type="button"
                onClick={toggle}
                aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-zinc-500 dark:text-white/50 transition hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95"
              >
                {dark ? <FaMoon className="text-base" /> : <FaSun className="text-base" />}
              </button>

              <Link
                href="/cart"
                className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-zinc-600 dark:text-white/70 transition hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95"
                aria-label="Panier"
              >
                <FaShoppingBag className="text-lg" />
                {count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FFC366] text-[9px] font-bold text-black">
                    {count}
                  </span>
                )}
              </Link>
            </div>
          </div>

        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      {open && (
        <div className="fixed inset-0 z-60 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Fermer le menu"
          />

          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white dark:bg-[#1D1D1D] shadow-2xl">

            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 px-5 py-4">
              <Image src={Logo} alt="Su Rice" width={38} height={38} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-zinc-500 dark:text-white/60 transition hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95"
                aria-label="Fermer"
              >
                <FaXmark className="text-lg" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 px-4 py-5">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center rounded-xl px-4 py-3 text-base font-medium transition ${
                    isActive(href)
                      ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white"
                      : "text-zinc-500 dark:text-white/60 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              ))}

              <Link
                href="/cart"
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition ${
                  isActive("/cart")
                    ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white"
                    : "text-zinc-500 dark:text-white/60 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                Panier
                {count > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFC366] text-[10px] font-bold text-black">
                    {count}
                  </span>
                )}
              </Link>
            </nav>

            <div className="space-y-3 border-t border-zinc-200 dark:border-white/10 px-5 py-5">
              <a
                href={PHONE_HREF}
                className="flex items-center gap-3 text-sm text-zinc-500 dark:text-white/50 transition hover:text-zinc-900 dark:hover:text-white"
              >
                <FaPhone className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-white/30" />
                {PHONE}
              </a>
              <Link
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-zinc-500 dark:text-white/50 transition hover:text-zinc-900 dark:hover:text-white"
              >
                <FaMapMarkerAlt className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-white/30" />
                Voir sur Google Maps
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
