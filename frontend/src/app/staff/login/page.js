"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaffAuth } from "../_components/useStaffAuth";

export default function StaffLoginPage() {
  const router = useRouter();
  const { token, login, error, setError, ready } = useStaffAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (token) router.replace("/staff/orders");
  }, [ready, token, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const t = await login(username, password);
    setLoading(false);
    if (t) router.replace("/staff/orders");
  }

  if (ready && token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-400">Redirection…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">

        {/* Brand mark */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-2xl shadow-lg">
            🍣
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Espace Admin</h1>
          <p className="mt-1 text-sm text-zinc-400">Connectez-vous pour accéder au dashboard</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
          <form onSubmit={onSubmit} className="grid gap-5">

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                Identifiant
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-0"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-0"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
