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
          <h1 className="text-2xl font-bold tracking-tight text-white">Espace Admin</h1>
          <p className="mt-1 text-sm text-white/40">Connectez-vous pour accéder au dashboard</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-7">
          <form onSubmit={onSubmit} className="grid gap-5">

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Identifiant
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30 focus:bg-white/10"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30 focus:bg-white/10"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-xl bg-[#FFC366] py-3 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
