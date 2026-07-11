"use client";

import { useState } from "react";
import { useStaffAuth } from "../../_components/useStaffAuth";
import { QrScanner } from "../../_components/QrScanner";

const SOURCE_META = {
  online:     { label: "Achat en ligne",      icon: "🛒" },
  in_store:   { label: "En boutique",         icon: "🏬" },
  redeem:     { label: "Récompense échangée", icon: "🎁" },
  reset:      { label: "Réinitialisation",    icon: "↺" },
  adjustment: { label: "Ajustement",          icon: "✎" },
};

function newRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function LoyaltyPage() {
  const { authFetch, API } = useStaffAuth();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [account, setAccount] = useState(null);
  const [history, setHistory] = useState([]);
  const [audit, setAudit] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);

  const [showScanner, setShowScanner] = useState(false);
  const [manualPayload, setManualPayload] = useState("");

  const [store, setStore] = useState("Boutique");
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState(null); // { type: "success" | "error", text }

  async function loadAccount(publicId) {
    setLoadingAccount(true);
    setMessage(null);
    try {
      const res = await authFetch(`${API}/loyalty/staff/${publicId}/`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAccount(data.account);
      setHistory(data.history);
      setShowScanner(false);
      setManualPayload("");
    } catch {
      setMessage({ type: "error", text: "Impossible de charger ce compte." });
    } finally {
      setLoadingAccount(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setMessage(null);
    try {
      const res = await authFetch(`${API}/loyalty/staff/search/?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error();
      setResults(await res.json());
    } catch {
      setMessage({ type: "error", text: "Recherche impossible." });
    } finally {
      setSearching(false);
    }
  }

  async function submitScan(payload) {
    if (!payload) return;
    setMessage(null);
    try {
      const res = await authFetch(`${API}/loyalty/staff/scan/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "QR invalide.");
      }
      const data = await res.json();
      await loadAccount(data.public_id);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "QR invalide." });
    }
  }

  async function loadAuditLog() {
    if (!account) return;
    try {
      const res = await authFetch(`${API}/loyalty/staff/audit/?account=${account.public_id}`);
      if (!res.ok) throw new Error();
      setAudit(await res.json());
      setShowAudit(true);
    } catch {
      setMessage({ type: "error", text: "Impossible de charger le journal d'audit." });
    }
  }

  async function runAction(url, body, successText) {
    if (!account) return;
    setActionLoading(url);
    setMessage(null);
    try {
      const res = await authFetch(`${API}${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_id: account.public_id, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Action impossible.");
      setAccount(data.account);
      if (data.transaction) setHistory((prev) => [data.transaction, ...prev]);
      setMessage({ type: "success", text: successText });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Action impossible." });
    } finally {
      setActionLoading("");
    }
  }

  function handleAddPoint() {
    runAction("/loyalty/staff/add-point/", { store, reason, client_request_id: newRequestId() }, "Point ajouté.");
  }
  function handleRemovePoint() {
    runAction("/loyalty/staff/remove-point/", { reason }, "Point retiré.");
  }
  function handleRedeem() {
    if (!window.confirm("Échanger la récompense ? La carte repassera à 0 point.")) return;
    runAction("/loyalty/staff/redeem/", {}, "Récompense échangée.");
  }
  function handleReset() {
    if (!window.confirm("Réinitialiser cette carte à 0 point ?")) return;
    runAction("/loyalty/staff/reset/", { reason }, "Carte réinitialisée.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Fidélité</h1>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-2.5 text-sm ${message.type === "success" ? "bg-green-900/20 text-green-400" : "bg-red-900/20 text-red-400"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: search + scan */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-5">
            <p className="mb-3 text-sm font-semibold text-white">Scanner un QR code</p>
            {!showScanner ? (
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="cursor-pointer rounded-xl bg-[#FFC366] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95"
              >
                📷 Ouvrir le scanner
              </button>
            ) : (
              <div className="space-y-4">
                <QrScanner onScan={submitScan} />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualPayload}
                    onChange={(e) => setManualPayload(e.target.value)}
                    placeholder="Coller le code manuellement…"
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#FFC366]/50"
                  />
                  <button
                    type="button"
                    onClick={() => submitScan(manualPayload)}
                    className="cursor-pointer rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-[#FFC366]/50 hover:text-white"
                  >
                    Valider
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-5">
            <p className="mb-3 text-sm font-semibold text-white">Rechercher un client</p>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, email ou téléphone…"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#FFC366]/50 focus:ring-2 focus:ring-[#FFC366]/20"
              />
              <button
                type="submit"
                disabled={searching}
                className="cursor-pointer rounded-xl bg-[#FFC366] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95 disabled:opacity-50"
              >
                {searching ? "…" : "Rechercher"}
              </button>
            </form>

            {results.length > 0 && (
              <div className="mt-4 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5">
                {results.map((r) => (
                  <button
                    key={r.public_id}
                    type="button"
                    onClick={() => loadAccount(r.public_id)}
                    className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition hover:bg-white/5"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{r.first_name} {r.last_name}</p>
                      <p className="text-xs text-white/40">{r.email}</p>
                    </div>
                    <span className="text-xs font-semibold text-[#FFC366]">{r.points}/{r.max_points}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: customer panel */}
        <div>
          {loadingAccount && (
            <div className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-6 text-center text-sm text-white/40">
              Chargement…
            </div>
          )}

          {!loadingAccount && !account && (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/30">
              Scannez ou recherchez un client pour afficher sa carte.
            </div>
          )}

          {!loadingAccount && account && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold text-white">{account.first_name} {account.last_name}</p>
                    <p className="text-xs text-white/40">{account.email}</p>
                    <p className="mt-0.5 text-xs text-white/30 tabular-nums">{account.customer_number}</p>
                  </div>
                  {account.reward_available && (
                    <span className="rounded-full bg-[#FFC366]/15 px-3 py-1 text-xs font-semibold text-[#FFC366] ring-1 ring-[#FFC366]/30">
                      🎁 Récompense dispo
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {Array.from({ length: account.max_points }, (_, i) => (
                    <span
                      key={i}
                      className={`h-4 w-4 rounded-full ${i < account.points ? "bg-[#FFC366]" : "bg-white/10"}`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm font-semibold text-white tabular-nums">{account.points} / {account.max_points} points</p>

                {/* Store / reason inputs for the next action */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    placeholder="Boutique"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-[#FFC366]/50"
                  />
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Motif (optionnel)"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-[#FFC366]/50"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleAddPoint}
                    disabled={!!actionLoading || account.points >= account.max_points}
                    className="cursor-pointer rounded-xl bg-[#FFC366] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    + 1 Point
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePoint}
                    disabled={!!actionLoading || account.points <= 0}
                    className="cursor-pointer rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    − 1 Point
                  </button>
                  <button
                    type="button"
                    onClick={handleRedeem}
                    disabled={!!actionLoading || account.points < account.max_points}
                    className="cursor-pointer rounded-xl border border-green-700/50 bg-green-900/20 px-4 py-2.5 text-sm font-semibold text-green-400 transition hover:bg-green-900/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    🎁 Échanger
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={!!actionLoading}
                    className="cursor-pointer rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ↺ Réinitialiser
                  </button>
                </div>
              </div>

              {/* History */}
              <div className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Historique</p>
                  <button
                    type="button"
                    onClick={loadAuditLog}
                    className="cursor-pointer text-xs text-white/40 transition hover:text-white/70"
                  >
                    Journal d&apos;audit →
                  </button>
                </div>
                {history.length === 0 && <p className="text-xs text-white/30">Aucun mouvement.</p>}
                <div className="divide-y divide-white/5">
                  {history.map((t) => {
                    const meta = SOURCE_META[t.source] || { label: t.source, icon: "•" };
                    return (
                      <div key={t.transaction_id} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span>{meta.icon}</span>
                          <div>
                            <p className="text-sm text-white/80">{meta.label}</p>
                            <p className="text-xs text-white/30">
                              {new Date(t.created_at).toLocaleString("fr-FR")}
                              {t.store && ` · ${t.store}`}
                              {t.admin_username && ` · ${t.admin_username}`}
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm font-semibold tabular-nums ${t.delta > 0 ? "text-green-400" : "text-white/40"}`}>
                          {t.delta > 0 ? `+${t.delta}` : t.delta}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {showAudit && (
                <div className="rounded-2xl border border-white/10 bg-[#1D1D1D] p-5">
                  <p className="mb-3 text-sm font-semibold text-white">Journal d&apos;audit</p>
                  {audit.length === 0 && <p className="text-xs text-white/30">Aucune entrée.</p>}
                  <div className="divide-y divide-white/5">
                    {audit.map((a, i) => (
                      <div key={i} className="py-2.5 text-xs text-white/50">
                        <span className="font-medium text-white/80">{a.action}</span>
                        {a.actor_username && ` · ${a.actor_username}`}
                        {` · ${new Date(a.created_at).toLocaleString("fr-FR")}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
