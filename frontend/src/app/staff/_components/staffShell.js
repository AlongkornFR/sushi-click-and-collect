"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStaffAuth } from "./useStaffAuth";

function NavItem({ href, label }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={
        "block rounded-xl px-3 py-2 text-sm font-semibold " +
        (active ? "bg-black text-white" : "text-zinc-700 hover:bg-zinc-100")
      }
    >
      {label}
    </Link>
  );
}

export default function StaffShell({ children, requireAuth = true }) {
  const router = useRouter();
  const { token, me, ready, fetchMe, logout } = useStaffAuth();

  useEffect(() => {
    if (!ready) return;

    if (requireAuth && !token) {
      router.replace("/staff/login");
      return;
    }

    if (token && !me) fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token]);

  if (!ready) {
    return <div className="p-6 text-zinc-600">Chargement…</div>;
  }

  if (requireAuth && !token) {
    return null; // redirection en cours
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl p-4 md:p-8 grid gap-4 md:grid-cols-12">
        {/* Sidebar */}
        <aside className="md:col-span-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-lg font-extrabold">Espace Staff</div>
            <div className="mt-1 text-sm text-zinc-600">
              {me ? (
                <>
                  {me.username}{" "}
                  {me.is_superuser ? (
                    <span className="ml-2 text-xs font-bold bg-zinc-200 px-2 py-0.5 rounded-full">SUPERUSER</span>
                  ) : (
                    <span className="ml-2 text-xs font-bold bg-zinc-200 px-2 py-0.5 rounded-full">STAFF</span>
                  )}
                </>
              ) : (
                "Connecté"
              )}
            </div>

            <nav className="mt-4 grid gap-2">
              <NavItem href="/staff/orders" label="Commandes" />
              <NavItem href="/staff/products" label="Produits / Stock" />
            </nav>

            <button
              onClick={() => {
                logout();
                router.replace("/staff/login");
              }}
              className="mt-4 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-zinc-100"
            >
              Déconnexion
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="md:col-span-9">{children}</main>
      </div>
    </div>
  );
}
