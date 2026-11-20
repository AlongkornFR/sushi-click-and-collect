"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onCookieSettingsOpen, setCookieConsent, useCookieConsent } from "@/lib/consent";

/**
 * Bannière de consentement. « Refuser » est aussi visible et aussi simple
 * qu'« Accepter » (exigence CNIL) ; le site fonctionne dans les deux cas.
 */
export default function CookieConsent() {
  const pathname = usePathname();
  const consent = useCookieConsent();
  const [reopened, setReopened] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => onCookieSettingsOpen(() => setReopened(true)), []);

  const visible = reopened || consent === null;

  useEffect(() => {
    if (reopened) panelRef.current?.focus();
  }, [reopened]);

  if (pathname.startsWith("/staff") || !visible) return null;

  function choose(value) {
    setCookieConsent(value);
    setReopened(false);
  }

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="region"
      aria-label="Choix des cookies"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 outline-none sm:px-6 sm:pb-6"
    >
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#1D1D1D] p-5 text-white shadow-2xl shadow-black/50">
        <p className="text-base font-semibold">Cookies</p>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          Le site n&apos;utilise qu&apos;un service qui dépose des cookies : la carte Google Maps du bas de page.
          Si vous refusez, la carte reste masquée et tout le reste fonctionne normalement.{" "}
          <Link href="/politique-de-confidentialite#cookies" className="font-medium text-[#FFC366] underline-offset-2 hover:underline">
            En savoir plus
          </Link>
        </p>
        {consent !== null && consent !== "pending" && (
          <p className="mt-2 text-xs text-white/50">
            Votre choix actuel : {consent === "accepted" ? "accepté" : "refusé"}.
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => choose("refused")}
            className="min-h-11 cursor-pointer rounded-xl border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="min-h-11 cursor-pointer rounded-xl border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
