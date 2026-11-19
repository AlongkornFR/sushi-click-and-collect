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
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-sm text-white/40">Redirection…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">

        {/* Brand mark */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1D1D1D] text-2xl shadow-lg border border-white/10">
            🍣
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Espace staff Su-Rice</h1>
          <p className="mt-1 text-sm text-white/60">Commandes, carte et fidélité</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-7">
          <form onSubmit={onSubmit} className="grid gap-5">

            <div>
              <label htmlFor="staff-username" className="mb-1.5 block text-sm font-semibold text-white/80">
                Identifiant
              </label>
              <input
                id="staff-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-base text-white outline-none transition focus:border-white/40"
                autoComplete="username"
                autoCapitalize="none"
                required
              />
            </div>

            <div>
              <label htmlFor="staff-password" className="mb-1.5 block text-sm font-semibold text-white/80">
                Mot de passe
              </label>
              <input
                id="staff-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-base text-white outline-none transition focus:border-white/40"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-12 w-full cursor-pointer rounded-xl bg-[#FFC366] text-base font-bold text-black transition hover:bg-[#ffb347] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
