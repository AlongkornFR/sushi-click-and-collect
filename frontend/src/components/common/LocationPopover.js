"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";

const ADDRESS_LINE_1 = "53 boulevard Carnot";
const ADDRESS_LINE_2 = "06400 Cannes";
const DESTINATION = encodeURIComponent("Su-Rice, 53 boulevard Carnot, 06400 Cannes");

// Google Maps ouvre l'application si elle est installée (Android, iOS) et
// sinon le site ; sur Android, le système propose aussi les autres applis de
// navigation (Waze...).
const GOOGLE_MAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${DESTINATION}`;
// Sur iPhone et iPad, Plans d'Apple est l'application installée par défaut.
const APPLE_MAPS_URL = `https://maps.apple.com/?daddr=${DESTINATION}`;

function isAppleTouchDevice() {
  const ua = navigator.userAgent;
  // Les iPad récents se présentent comme un Mac : on les reconnaît à l'écran tactile.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * Icône de localisation de la barre de navigation.
 * - Souris : la bulle avec l'adresse s'ouvre au survol.
 * - Tactile ou clavier : un premier appui ouvre la bulle, un appui sur
 *   l'adresse lance l'itinéraire dans l'application de cartes.
 */
export default function LocationPopover({ align = "left", iconClassName = "h-4 w-4" }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const closeTimer = useRef(null);
  const lastPointerType = useRef("mouse");
  const popoverId = useId();

  // Fermeture : clic ailleurs ou touche Échap.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Survol : seulement à la souris (sur mobile, un appui déclenche aussi un
  // « survol » qui fermerait la bulle juste après l'avoir ouverte).
  const onPointerEnter = (e) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const onPointerLeave = (e) => {
    if (e.pointerType !== "mouse") return;
    // Petit délai : laisse le temps d'aller de l'icône à la bulle.
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const openDirections = (e) => {
    if (isAppleTouchDevice()) {
      e.preventDefault();
      window.location.href = APPLE_MAPS_URL;
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <button
        type="button"
        onPointerDown={(e) => { lastPointerType.current = e.pointerType; }}
        onClick={() => {
          // Souris : la bulle est déjà ouverte par le survol, un clic ne doit
          // pas la refermer. Tactile ou clavier : un appui ouvre ou ferme.
          if (lastPointerType.current === "mouse") setOpen(true);
          else setOpen((v) => !v);
          lastPointerType.current = "keyboard";
        }}
        aria-label="Adresse du restaurant"
        aria-expanded={open}
        aria-controls={popoverId}
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <FaMapMarkerAlt className={iconClassName} />
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Adresse du restaurant"
          className={`absolute top-full z-60 mt-2 w-64 rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-xl dark:border-white/10 dark:bg-[#1D1D1D] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <p className="text-xs font-medium text-zinc-500 dark:text-white/60">Su-Rice</p>
          <a
            href={GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={openDirections}
            className="mt-1 block rounded-lg text-sm font-semibold text-zinc-900 underline-offset-2 hover:underline dark:text-white"
          >
            {ADDRESS_LINE_1}
            <br />
            {ADDRESS_LINE_2}
          </a>
          <p className="mt-2 text-xs text-zinc-500 dark:text-white/60">
            <span className="[@media(hover:hover)]:hidden">Appuyez sur l&apos;adresse pour lancer l&apos;itinéraire.</span>
            <span className="hidden [@media(hover:hover)]:inline">Cliquez sur l&apos;adresse pour voir l&apos;itinéraire.</span>
          </p>
        </div>
      )}
    </div>
  );
}
