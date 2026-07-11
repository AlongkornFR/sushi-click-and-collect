"use client";

import { useState, useEffect, useCallback } from "react";
import { useStaffAuth } from "../../_components/useStaffAuth";

export default function UsersPage() {
  return <UsersContent />;
}

function UsersContent() {
  const { token } = useStaffAuth();
  const [users,   setUsers]   = useState([]);
  const [query,   setQuery]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [deleting, setDeleting] = useState(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const fetchUsers = useCallback(async (q = "") => {
    setLoading(true);
    setError("");
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : "";
      const res = await fetch(`${apiUrl}/staff/users/${params}`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch {
      setError("Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl]);

  useEffect(() => { if (token) fetchUsers(); }, [fetchUsers, token]);

  function handleSearch(e) {
    e.preventDefault();
    fetchUsers(query);
  }

  async function handleDelete(user) {
    if (!window.confirm(`Supprimer le compte de ${user.email} ? Cette action est irréversible.`)) return;
    setDeleting(user.id);
    try {
      const res = await fetch(`${apiUrl}/staff/users/${user.id}/delete/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error();
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch {
      alert("Erreur lors de la suppression.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Clients</h1>
        <span className="text-sm text-white/40">{users.length} compte{users.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom, email ou téléphone…"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#FFC366]/50 focus:ring-2 focus:ring-[#FFC366]/20"
        />
        <button
          type="submit"
          className="cursor-pointer rounded-xl bg-[#FFC366] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95"
        >
          Rechercher
        </button>
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); fetchUsers(""); }}
            className="cursor-pointer rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/50 transition hover:border-white/20 hover:text-white"
          >
            Réinitialiser
          </button>
        )}
      </form>

      {/* Content */}
      {loading && <p className="py-8 text-center text-sm text-white/30">Chargement…</p>}
      {error   && <p className="py-8 text-center text-sm text-red-400">{error}</p>}

      {!loading && !error && users.length === 0 && (
        <p className="py-8 text-center text-sm text-white/30">Aucun client trouvé.</p>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Email</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40 md:table-cell">Téléphone</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40 lg:table-cell">Commandes</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40 lg:table-cell">Inscription</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="transition hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs text-white/40">#{user.id}</td>
                  <td className="px-4 py-3 font-medium text-white">
                    {user.first_name} {user.last_name}
                    {!user.is_active && (
                      <span className="ml-2 rounded-full bg-red-900/30 px-2 py-0.5 text-[10px] font-semibold text-red-400">Désactivé</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/70">{user.email}</td>
                  <td className="hidden px-4 py-3 text-white/50 md:table-cell">{user.phone || "—"}</td>
                  <td className="hidden px-4 py-3 text-white/50 lg:table-cell">{user.order_count}</td>
                  <td className="hidden px-4 py-3 text-white/40 lg:table-cell">
                    {new Date(user.date_joined).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={deleting === user.id}
                      className="cursor-pointer rounded-lg border border-red-800/50 bg-red-900/20 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-900/40 active:scale-95 disabled:opacity-40"
                    >
                      {deleting === user.id ? "…" : "Supprimer"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
