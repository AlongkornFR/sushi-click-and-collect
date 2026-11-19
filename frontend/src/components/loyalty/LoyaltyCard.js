"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import { LoyaltyHistory } from "./LoyaltyHistory";

export function LoyaltyCard({ authHeaders }) {
  const [account, setAccount] = useState(null);
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const fetchAll = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [accRes, qrRes] = await Promise.all([
        api.get("/loyalty/", { headers: authHeaders() }),
        api.get("/loyalty/qr/", { headers: authHeaders() }),
      ]);
      setAccount(accRes.data);
      setQr(qrRes.data);
      setError("");
    } catch {
      setError("Impossible de charger votre carte de fidélité.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAll();
    const onVis = () => { if (document.visibilityState === "visible") fetchAll({ silent: true }); };
    document.addEventListener("visibilitychange", onVis);
    const id = setInterval(() => { if (document.visibilityState === "visible") fetchAll({ silent: true }); }, 30000);
    return () => { document.removeEventListener("visibilitychange", onVis); clearInterval(id); };
  }, [fetchAll]);

  async function handleRegenerate() {
    if (!window.confirm("Régénérer votre QR code ? L'ancien code ne fonctionnera plus.")) return;
    setRegenerating(true);
    try {
      const res = await api.post("/loyalty/qr/regenerate/", {}, { headers: authHeaders() });
      setQr(res.data);
      setError("");
    } catch {
      setError("Impossible de régénérer le QR code.");
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 p-6 text-center">
        <p className="text-sm text-zinc-500 dark:text-white/60">Chargement de votre carte…</p>
      </div>
    );
  }

  if (error && !account) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 p-6 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const points = account.points;
  const max = account.max_points;
  const dots = Array.from({ length: max }, (_, i) => i < points);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1D1D1D] to-black p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">Carte de fidélité</p>
            <p className="mt-1 truncate text-lg font-bold">{account.first_name} {account.last_name}</p>
            <p className="mt-0.5 text-xs text-white/40 tabular-nums">{account.customer_number}</p>
          </div>
          {qr?.image_base64 && (
            <img
              src={`data:image/png;base64,${qr.image_base64}`}
              alt="QR code fidélité"
              className="h-20 w-20 shrink-0 rounded-lg bg-white p-1.5"
            />
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-1.5">
          {dots.map((filled, i) => (
            <span
              key={i}
              className={`h-4 w-4 rounded-full transition-colors ${filled ? "bg-[#FFC366]" : "bg-white/10"}`}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-semibold tabular-nums">{points} / {max} points</p>
          {refreshing && <span className="text-[10px] text-white/30">Sync…</span>}
        </div>

        {account.reward_available && (
          <div className="mt-4 rounded-xl bg-[#FFC366]/15 px-4 py-2.5 text-sm font-medium text-amber-700 dark:text-[#FFC366] ring-1 ring-[#FFC366]/30">
            🎁 Récompense disponible — présentez votre QR code en boutique !
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowHistory((s) => !s)}
          className="flex-1 cursor-pointer rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-white/70 transition hover:border-[#FFC366] hover:text-zinc-900 dark:hover:text-white"
        >
          {showHistory ? "Masquer l'historique" : "Voir l'historique"}
        </button>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating}
          title="Régénérer le QR code si vous pensez qu'il a été compromis"
          className="cursor-pointer rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-500 dark:text-white/50 transition hover:border-red-300 hover:text-red-600 dark:hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {regenerating ? "…" : "Régénérer QR"}
        </button>
      </div>

      {error && account && <p className="text-xs text-red-500">{error}</p>}

      {showHistory && <LoyaltyHistory authHeaders={authHeaders} />}
    </div>
  );
}
