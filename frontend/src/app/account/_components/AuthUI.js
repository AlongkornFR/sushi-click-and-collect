"use client";

import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

// Éléments communs aux pages connexion, inscription et mot de passe.

export const inputCls =
  "min-h-11 w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-white/30 outline-none focus:border-[#FFC366] focus:ring-2 focus:ring-[#FFC366]/20 aria-[invalid=true]:border-red-400";

export const primaryBtnCls =
  "min-h-11 w-full cursor-pointer rounded-xl bg-[#FFC366] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-[.98] disabled:cursor-wait disabled:opacity-60";

export const linkCls = "font-semibold text-amber-700 dark:text-[#FFC366] underline-offset-2 hover:underline";

export function AuthShell({ title, intro, children, footer }) {
  return (
    <div className="flex min-h-[100vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-100 dark:border-white/10 bg-white dark:bg-[#1D1D1D] p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{title}</h1>
        {intro && <div className="mt-1.5 text-sm text-zinc-500 dark:text-white/60">{intro}</div>}
        <div className="mt-7">{children}</div>
        {footer && <div className="mt-6 border-t border-zinc-100 dark:border-white/10 pt-5 text-sm text-zinc-500 dark:text-white/60">{footer}</div>}
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
