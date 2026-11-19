"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useStaffAuth } from "../../_components/useStaffAuth";
import { FaSearch, FaChevronRight } from "react-icons/fa";

/**
 * Lot A6 : liste des clients. Chaque ligne ouvre la fiche client
 * (coordonnées, commandes, carte de fidélité, désactivation).
 */
export default function UsersPage() {
  const { API, token, authFetch } = useStaffAuth();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async (q = "") => {
    setLoading(true);
    setError("");
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : "";
      const res = await authFetch(`${API}/staff/users/${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch {
      setError("La liste des clients n'a pas pu être chargée. Réessayez.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, token]);

  useEffect(() => { if (token) fetchUsers(); }, [fetchUsers, token]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-xl font-bold text-white">Clients</h1>
        <p className="text-sm text-white/60">{users.length} compte{users.length > 1 ? "s" : ""}</p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); fetchUsers(query.trim()); }}
        className="flex gap-2"
      >
        <label className="relative block flex-1">
          <span className="sr-only">Rechercher un client</span>
          <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, email ou téléphone"
            className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 text-base text-white placeholder:text-white/40 outline-none focus:border-white/30"
          />
        </label>
        <button type="submit" className="min-h-11 cursor-pointer rounded-xl bg-[#FFC366] px-4 text-sm font-bold text-black">
          Rechercher
        </button>
      </form>

      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1D1D1D]">
        {loading ? (
          <p className="py-16 text-center text-sm text-white/60">Chargement…</p>
        ) : users.length === 0 ? (
          <p className="py-16 text-center text-sm text-white/60">Aucun client trouvé.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {users.map((u) => (
              <li key={u.id}>
                <Link href={`/staff/users/${u.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-white/5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-white">
                      {u.first_name} {u.last_name}
                      {!u.is_active && (
                        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-200">Désactivé</span>
                      )}
                    </p>
                    <p className="truncate text-sm text-white/60">
                      {u.email}{u.phone ? ` · ${u.phone}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-white/60">
                    {u.order_count} commande{u.order_count > 1 ? "s" : ""}
                  </p>
                  <FaChevronRight className="shrink-0 text-white/40" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
