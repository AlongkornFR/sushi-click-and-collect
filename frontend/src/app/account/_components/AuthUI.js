"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Logo from "../../../../public/Surice_logo.webp";
import AuthIllustration from "./AuthIllustration";

// Éléments communs aux pages connexion, inscription et mot de passe.

export const inputCls =
  "min-h-12 w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-white/30 outline-none focus:border-[#FFC366] focus:ring-2 focus:ring-[#FFC366]/20 aria-[invalid=true]:border-red-400";

export const primaryBtnCls =
  "min-h-12 w-full cursor-pointer rounded-xl bg-[#FFC366] px-6 py-3 text-base font-bold text-black transition hover:bg-[#ffb347] active:scale-[.98] disabled:cursor-wait disabled:opacity-60";

export const linkCls = "font-semibold text-amber-700 dark:text-[#FFC366] underline-offset-2 hover:underline";

export function AuthShell({ title, intro, children, footer }) {
  return (
    <div className="px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-20">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-2 lg:items-start lg:gap-12">
        {/* Formulaire */}
        <div className="flex flex-col justify-center py-4 lg:min-h-[calc(100vh-8rem)] lg:px-6 xl:px-12">
          {/* Téléphone et tablette en portrait : illustration recadrée */}
          <div className="relative mb-8 h-44 w-full max-w-md overflow-hidden rounded-3xl sm:h-56 lg:hidden">
            <AuthIllustration className="absolute inset-0 h-full w-full" align="xMidYMin" />
          </div>
          <Link href="/" className="mb-10 hidden w-fit items-center gap-3 lg:inline-flex" aria-label="Su-Rice, retour à l'accueil">
            <Image src={Logo} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" priority />
            <span className="text-lg font-bold text-zinc-900 dark:text-white">Su-Rice</span>
          </Link>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
            {title}
          </h1>
          {intro && <div className="mt-4 max-w-md text-base leading-relaxed text-zinc-500 dark:text-white/60">{intro}</div>}

          <div className="mt-9 w-full max-w-md">{children}</div>

          {footer && <div className="mt-10 text-sm text-zinc-500 dark:text-white/60">{footer}</div>}
        </div>

        {/* Illustration (ordinateur et tablette en paysage) */}
        <div className="relative hidden overflow-hidden rounded-[2rem] lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-8rem)] lg:max-h-[52rem]">
          <AuthIllustration className="absolute inset-0 h-full w-full" />
        </div>
      </div>
    </div>
  );
}

/** Champ mot de passe avec bouton Afficher / Masquer. Les props vont à l'input. */
export function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${inputCls} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-zinc-400 hover:text-zinc-600 dark:text-white/40 dark:hover:text-white/70"
      >
        {visible ? <FaEyeSlash aria-hidden /> : <FaEye aria-hidden />}
      </button>
    </div>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
      {children}
    </p>
  );
}

/** Adresse de retour après connexion : uniquement une page du site. */
export function safeNext(value) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/staff")
    ? value
    : "/account";
}

/** Message lisible pour une erreur d'API (trop de tentatives, réseau…). */
export function apiErrorMessage(err, fallback) {
  if (err?.response?.status === 429) return "Trop de tentatives. Patientez quelques minutes puis réessayez.";
  if (!err?.response) return "Connexion au serveur impossible. Vérifiez votre réseau puis réessayez.";
  return err.response.data?.detail || fallback;
}
