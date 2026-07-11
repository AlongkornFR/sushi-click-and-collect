"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/context/AuthContext";
import { useCart } from "@/components/context/CartContext";
import { api } from "@/services/api";

export default function LoginPage() {
  const router = useRouter();
  const { saveToken } = useAuth();
  const { restoreFromSave } = useCart();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login/", form);
      saveToken(res.data.token);
      restoreFromSave();
      router.replace("/account");
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">Connexion</h1>
        <p className="mb-8 text-sm text-zinc-500 dark:text-white/50">
          Pas encore de compte ?{" "}
          <Link href="/account/register" className="font-medium text-[#FFC366] hover:underline">
            S&apos;inscrire
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-white/70">
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-white/30 outline-none focus:border-[#FFC366] focus:ring-2 focus:ring-[#FFC366]/20"
              placeholder="votre@email.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-white/70">
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-white/30 outline-none focus:border-[#FFC366] focus:ring-2 focus:ring-[#FFC366]/20"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#FFC366] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95 disabled:opacity-50"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
