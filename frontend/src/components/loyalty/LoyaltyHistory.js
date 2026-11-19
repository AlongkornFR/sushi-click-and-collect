"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

const SOURCE_META = {
  online:     { label: "Achat en ligne",       icon: "🛒" },
  in_store:   { label: "En boutique",          icon: "🏬" },
  redeem:     { label: "Récompense échangée",  icon: "🎁" },
  reset:      { label: "Réinitialisation",     icon: "↺" },
  adjustment: { label: "Ajustement",           icon: "✎" },
};

export function LoyaltyHistory({ authHeaders }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get("/loyalty/history/", { headers: authHeaders() });
        if (active) setItems(res.data);
      } catch {
        if (active) setError("Impossible de charger l'historique.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [authHeaders]);

  if (loading) return <p className="py-4 text-center text-xs text-zinc-500 dark:text-white/60">Chargement…</p>;
  if (error) return <p className="py-4 text-center text-xs text-red-500">{error}</p>;
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-white/10 py-10 text-center">
        <p className="text-sm text-zinc-500 dark:text-white/60">Aucun mouvement pour l&apos;instant.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 divide-y divide-zinc-100 dark:divide-white/5">
      {items.map((t) => {
        const meta = SOURCE_META[t.source] || { label: t.source, icon: "•" };
        return (
          <div key={t.transaction_id} className="flex items-center justify-between px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-lg">{meta.icon}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{meta.label}</p>
                <p className="text-xs text-zinc-500 dark:text-white/60">
                  {new Date(t.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  {t.order_total_cents != null && ` · ${(t.order_total_cents / 100).toFixed(2)} €`}
                </p>
              </div>
            </div>
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${t.delta > 0 ? "text-green-600 dark:text-green-400" : "text-zinc-500 dark:text-white/60"}`}>
              {t.delta > 0 ? `+${t.delta}` : t.delta}
            </span>
          </div>
        );
      })}
    </div>
  );
}
