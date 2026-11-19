"use client";

import { useEffect, useState } from "react";
import { useStaffAuth } from "./useStaffAuth";

const pad2 = (n) => String(n).padStart(2, "0");
const timeLabel = (iso) => {
  const d = new Date(iso);
  return `${pad2(d.getHours())}h${pad2(d.getMinutes())}`;
};

/**
 * Lot A3 : barre de pause des commandes en ligne, visible sur tout
 * l'espace staff. Pause de 15 min, 1 h ou sans limite ; reprise en un appui.
 */
export default function OrderingPauseBar() {
  const { API, token, authFetch } = useStaffAuth();
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [choosing, setChoosing] = useState(false);

  async function load() {
    try {
      const res = await authFetch(`${API}/staff/ordering-pause/`, { cache: "no-store" });
      if (res.ok) setState(await res.json());
    } catch {
      // On réessaie au prochain passage
    }
  }

  useEffect(() => {
    if (!token) return;
    load();
    // Rafraîchi régulièrement : une pause de 15 min se termine toute seule.
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function send(body) {
    setBusy(true);
    setError("");
    try {
      const res = await authFetch(`${API}/staff/ordering-pause/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `Erreur ${res.status}`);
      setState(data);
      setChoosing(false);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;

  const btn = "min-h-11 cursor-pointer rounded-xl px-4 text-sm font-semibold transition active:scale-95 disabled:opacity-50";

  if (state.paused) {
    return (
      <div role="status" className="border-b border-red-500/40 bg-red-600/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 md:px-6">
          <p className="text-sm font-bold text-white">
            Commandes en ligne en pause{state.indefinite ? " (sans limite)" : ` jusqu'à ${timeLabel(state.until)}`}
          </p>
          <button type="button" disabled={busy} onClick={() => send({ action: "resume" })} className={`${btn} bg-white text-black`}>
            Reprendre les commandes
          </button>
        </div>
        {error && <p className="px-4 pb-2 text-sm text-white md:px-6">{error}</p>}
      </div>
    );
  }

  return (
    <div className="border-b border-white/10 bg-[#141414]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 md:px-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
          Commandes en ligne ouvertes
        </p>
        {choosing ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-white/70">Mettre en pause :</span>
            <button type="button" disabled={busy} onClick={() => send({ action: "pause", minutes: 15 })} className={`${btn} bg-red-500/20 text-red-100`}>15 min</button>
            <button type="button" disabled={busy} onClick={() => send({ action: "pause", minutes: 60 })} className={`${btn} bg-red-500/20 text-red-100`}>1 h</button>
            <button type="button" disabled={busy} onClick={() => send({ action: "pause", indefinite: true })} className={`${btn} bg-red-500/20 text-red-100`}>Sans limite</button>
            <button type="button" disabled={busy} onClick={() => setChoosing(false)} className={`${btn} border border-white/15 text-white/70`}>Annuler</button>
          </div>
        ) : (
          <button type="button" onClick={() => setChoosing(true)} className={`${btn} border border-white/15 text-white/80 hover:bg-white/10`}>
            Mettre en pause
          </button>
        )}
      </div>
      {error && <p className="px-4 pb-2 text-sm text-red-300 md:px-6">{error}</p>}
    </div>
  );
}
