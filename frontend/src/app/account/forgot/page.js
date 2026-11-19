"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/services/api";
import FormField from "@/components/common/FormField";

const inputCls =
  "w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-white/30";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/password-reset/", { email });
      setSent(res.data.detail);
    } catch (err) {
      setError(
        err.response?.status === 429
          ? "Trop de demandes. Réessayez dans une heure."
          : err.response?.data?.detail || "La demande n'a pas pu être envoyée. Réessayez.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">Mot de passe oublié</h1>
        <p className="mb-8 text-sm text-zinc-500 dark:text-white/50">
          Indiquez l&apos;email de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe.
        </p>

        {sent ? (
          <div role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {sent}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField id="email" label="Email">
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="votre@email.com"
              />
            </FormField>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-xl bg-[#FFC366] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] disabled:opacity-50"
            >
              {loading ? "Envoi…" : "Recevoir le lien"}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-zinc-500 dark:text-white/50">
          <Link href="/account/login" className="font-medium text-[#FFC366] hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
