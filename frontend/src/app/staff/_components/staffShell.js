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
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-sm text-white/40">Chargement…</p>
      </div>
    );
  }

  if (requireAuth && !token) return null;

  const isSuperuser = me?.is_superuser;

  return (
    <div className="min-h-screen bg-black">

      {/* ── Staff top bar ── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#111]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white">Su-Rice</span>
            <span className="h-4 w-px bg-white/10" />
            <span className="text-xs font-medium text-[#FFC366]">
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
                    ? "bg-[#FFC366] text-black"
                    : "text-white/50 hover:bg-white/10 hover:text-white"
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
                <span className="text-sm text-white/50">{me.username}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isSuperuser
                      ? "bg-[#FFC366] text-black"
                      : "bg-white/10 text-white/60"
                  }`}
                >
                  {isSuperuser ? "Admin" : "Staff"}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => { logout(); router.replace("/staff/login"); }}
              className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/50 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
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
