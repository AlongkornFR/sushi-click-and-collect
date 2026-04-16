"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStaffAuth } from "./useStaffAuth";

const NAV = [
  { href: "/staff/orders",   label: "Commandes" },
  { href: "/staff/products", label: "Produits"  },
  { href: "/staff/ordering", label: "Ordre"     },
];

export default function StaffShell({ children, requireAuth = true }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { token, me, ready, fetchMe, logout } = useStaffAuth();

  useEffect(() => {
    if (!ready) return;
    if (requireAuth && !token) { router.replace("/staff/login"); return; }
    if (token && !me) fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-400">Chargement…</p>
      </div>
    );
  }

  if (requireAuth && !token) return null;

  const isSuperuser = me?.is_superuser;

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* ── Staff top bar ── */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-zinc-900">Su-Rice</span>
            <span className="h-4 w-px bg-zinc-200" />
            <span className="text-xs font-medium text-zinc-400">
              {isSuperuser ? "Super Admin" : "Staff"}
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  pathname === href
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User + logout */}
          <div className="flex items-center gap-3">
            {me && (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="text-sm text-zinc-500">{me.username}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isSuperuser
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {isSuperuser ? "Admin" : "Staff"}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => { logout(); router.replace("/staff/login"); }}
              className="cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
            >
              Déconnexion
            </button>
          </div>

        </div>
      </header>

      {/* ── Content ── */}
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
