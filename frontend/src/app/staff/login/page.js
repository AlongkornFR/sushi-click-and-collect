"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StaffShell from "../_components/staffShell";
import { useStaffAuth } from "../_components/useStaffAuth";

export default function StaffLoginPage() {
  const router = useRouter();
  const { token, login, error, setError, ready } = useStaffAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Redirection après render (pas pendant render)
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

  // Pendant la redirection, on peut afficher un petit message
  if (ready && token) {
    return (
      <StaffShell requireAuth={false}>
        <div className="p-6 text-zinc-600">Redirection…</div>
      </StaffShell>
    );
  }

  return (
    <StaffShell requireAuth={false}>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-extrabold">Connexion Staff</h1>
        <p className="text-zinc-600 mt-1">Connecte-toi pour accéder au dashboard.</p>

        <form onSubmit={onSubmit} className="mt-5 grid gap-3">
          <div>
            <label className="text-sm font-medium text-zinc-700">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2"
              autoComplete="current-password"
            />
          </div>

          <button className="rounded-xl bg-black px-4 py-2 font-semibold text-white hover:opacity-90">
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            <div className="font-semibold">Erreur</div>
            <div className="text-sm mt-1 break-words">{error}</div>
          </div>
        ) : null}
      </div>
    </StaffShell>
  );
}
