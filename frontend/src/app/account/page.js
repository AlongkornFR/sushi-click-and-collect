"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/context/AuthContext";
import { useCart } from "@/components/context/CartContext";
import { api } from "@/services/api";

const TABS = [
  { id: "profile",   label: "Profil"    },
  { id: "orders",    label: "Commandes" },
  { id: "extras",    label: "Plus"      },
];

const STATUS_LABELS = {
  pending:    { label: "En attente",    color: "text-yellow-500" },
  paid:       { label: "Payé",          color: "text-blue-500"   },
  preparing:  { label: "En préparation",color: "text-orange-500" },
  ready:      { label: "Prêt",          color: "text-green-500"  },
  collected:  { label: "Récupéré",      color: "text-zinc-400"   },
  cancelled:  { label: "Annulé",        color: "text-red-500"    },
};

export default function AccountPage() {
  const router = useRouter();
  const { token, customer, setCustomer, loading, logout, authHeaders, fetchMe } = useAuth();
  const { saveAndClear } = useCart();
  const [tab, setTab] = useState("profile");

  useEffect(() => {
    if (!loading && !token) router.replace("/account/login");
  }, [loading, token, router]);

  if (loading || !customer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-400 dark:text-white/30">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 flex-1">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFC366] text-xl font-bold text-black shadow-sm">
            {customer.first_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {customer.first_name} {customer.last_name}
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-white/40">
              {customer.email}
            </p>
          </div>
        </div>
        <button
          onClick={() => { saveAndClear(); logout(); router.replace("/"); }}
          className="cursor-pointer rounded-xl border border-zinc-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-zinc-500 dark:text-white/50 transition hover:border-zinc-300 dark:hover:border-white/20 hover:text-zinc-800 dark:hover:text-white"
        >
          Déconnexion
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-zinc-100 dark:bg-white/5 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 dark:text-white/40 hover:text-zinc-800 dark:hover:text-white/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "profile"  && <ProfileTab customer={customer} token={token} setCustomer={setCustomer} authHeaders={authHeaders} logout={logout} router={router} fetchMe={fetchMe} />}
      {tab === "orders"   && <OrdersTab token={token} authHeaders={authHeaders} />}
      {tab === "extras"   && <ExtrasTab />}
    </div>
    </div>
  );
}

/* ─── Profile Tab ─────────────────────────────────────────────── */

function ProfileTab({ customer, token, setCustomer, authHeaders, logout, router, fetchMe }) {
  const [form, setForm] = useState({
    first_name: customer.first_name,
    last_name:  customer.last_name,
    phone:      customer.phone || "",
  });
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");

  const [pwForm, setPwForm]         = useState({ current_password: "", new_password: "", confirm: "" });
  const [emailForm, setEmailForm]   = useState({ email: "", password: "" });
  const [deletePassword, setDeletePassword] = useState("");
  const [pwError,    setPwError]    = useState("");
  const [pwSuccess,  setPwSuccess]  = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailOk,    setEmailOk]    = useState("");
  const [delError,   setDelError]   = useState("");
  const [secLoading, setSecLoading] = useState({});

  function setSecLoad(k, v) { setSecLoading((p) => ({ ...p, [k]: v })); }

  async function handlePw(e) {
    e.preventDefault();
    setPwError(""); setPwSuccess("");
    if (pwForm.new_password !== pwForm.confirm) { setPwError("Les mots de passe ne correspondent pas."); return; }
    setSecLoad("pw", true);
    try {
      const res = await api.post("/auth/change-password/", { current_password: pwForm.current_password, new_password: pwForm.new_password }, { headers: authHeaders() });
      localStorage.setItem("customer_token", res.data.token);
      setPwSuccess("Mot de passe mis à jour.");
      setPwForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      setPwError(err.response?.data?.detail || "Erreur.");
    } finally {
      setSecLoad("pw", false);
    }
  }

  async function handleEmail(e) {
    e.preventDefault();
    setEmailError(""); setEmailOk("");
    setSecLoad("email", true);
    try {
      await api.post("/auth/change-email/", emailForm, { headers: authHeaders() });
      await fetchMe(localStorage.getItem("customer_token"));
      setEmailOk("Email mis à jour.");
      setEmailForm({ email: "", password: "" });
    } catch (err) {
      setEmailError(err.response?.data?.detail || "Erreur.");
    } finally {
      setSecLoad("email", false);
    }
  }

  async function handleDelete(e) {
    e.preventDefault();
    setDelError("");
    if (!window.confirm("Supprimer définitivement votre compte ?")) return;
    setSecLoad("del", true);
    try {
      await api.delete("/auth/delete/", { data: { password: deletePassword }, headers: authHeaders() });
      logout();
      router.replace("/");
    } catch (err) {
      setDelError(err.response?.data?.detail || "Erreur.");
    } finally {
      setSecLoad("del", false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await api.patch("/auth/me/", form, { headers: authHeaders() });
      setCustomer((prev) => ({ ...prev, ...res.data }));
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur de sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-white/30 outline-none focus:border-[#FFC366] focus:ring-2 focus:ring-[#FFC366]/20";

  return (
    <div className="space-y-4">
      {/* Bento grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Email card — large */}
        <div className="col-span-2 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/10 text-xl">
            ✉️
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-400 dark:text-white/30 uppercase tracking-wider mb-0.5">Adresse e-mail</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{customer.email}</p>
          </div>
        </div>

        {/* Membre depuis */}
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
          <p className="text-xs font-medium text-zinc-400 dark:text-white/30 uppercase tracking-wider mb-1">Membre depuis</p>
          <p className="text-sm font-semibold text-zinc-900 dark:text-white capitalize">
            {new Date(customer.date_joined).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Téléphone */}
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
          <p className="text-xs font-medium text-zinc-400 dark:text-white/30 uppercase tracking-wider mb-1">Téléphone</p>
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            {customer.phone || <span className="text-zinc-400 dark:text-white/30 font-normal">Non renseigné</span>}
          </p>
        </div>
      </div>

      {/* Edit form card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
        <p className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">Modifier le profil</p>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-white/40 uppercase tracking-wider">Prénom</label>
              <input type="text" required value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-white/40 uppercase tracking-wider">Nom</label>
              <input type="text" required value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-white/40 uppercase tracking-wider">Téléphone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className={inputClass} placeholder="+33 6 00 00 00 00" />
          </div>

          {error   && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {success && <p className="rounded-lg bg-green-50 dark:bg-green-900/20 px-4 py-2.5 text-sm text-green-600 dark:text-green-400">Profil mis à jour.</p>}

          <button type="submit" disabled={saving} className="rounded-xl bg-[#FFC366] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95 disabled:opacity-50">
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
        <p className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">Changer le mot de passe</p>
        <form onSubmit={handlePw} className="space-y-3">
          <input type="password" required placeholder="Mot de passe actuel" value={pwForm.current_password} onChange={(e) => setPwForm((p) => ({ ...p, current_password: e.target.value }))} className={inputClass} />
          <input type="password" required placeholder="Nouveau mot de passe (min. 8 car.)" value={pwForm.new_password} onChange={(e) => setPwForm((p) => ({ ...p, new_password: e.target.value }))} className={inputClass} />
          <input type="password" required placeholder="Confirmer le nouveau mot de passe" value={pwForm.confirm} onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))} className={inputClass} />
          {pwError   && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{pwError}</p>}
          {pwSuccess && <p className="rounded-lg bg-green-50 dark:bg-green-900/20 px-4 py-2.5 text-sm text-green-600 dark:text-green-400">{pwSuccess}</p>}
          <button type="submit" disabled={secLoading.pw} className="rounded-xl bg-[#FFC366] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95 disabled:opacity-50">
            {secLoading.pw ? "Mise à jour…" : "Mettre à jour"}
          </button>
        </form>
      </div>

      {/* Change email */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
        <p className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">Changer l&apos;adresse e-mail</p>
        <form onSubmit={handleEmail} className="space-y-3">
          <input type="email" required placeholder="Nouvelle adresse e-mail" value={emailForm.email} onChange={(e) => setEmailForm((p) => ({ ...p, email: e.target.value }))} className={inputClass} />
          <input type="password" required placeholder="Confirmer avec votre mot de passe" value={emailForm.password} onChange={(e) => setEmailForm((p) => ({ ...p, password: e.target.value }))} className={inputClass} />
          {emailError && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{emailError}</p>}
          {emailOk    && <p className="rounded-lg bg-green-50 dark:bg-green-900/20 px-4 py-2.5 text-sm text-green-600 dark:text-green-400">{emailOk}</p>}
          <button type="submit" disabled={secLoading.email} className="rounded-xl bg-[#FFC366] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95 disabled:opacity-50">
            {secLoading.email ? "Mise à jour…" : "Mettre à jour"}
          </button>
        </form>
      </div>

      {/* Delete account */}
      <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/10 p-5">
        <p className="mb-1 text-sm font-semibold text-red-600 dark:text-red-400">Zone dangereuse</p>
        <p className="mb-4 text-xs text-zinc-500 dark:text-white/40">La suppression est irréversible.</p>
        <form onSubmit={handleDelete} className="space-y-3">
          <input type="password" required placeholder="Confirmez avec votre mot de passe" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className={inputClass} />
          {delError && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{delError}</p>}
          <button type="submit" disabled={secLoading.del} className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-5 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-95 disabled:opacity-50">
            {secLoading.del ? "Suppression…" : "Supprimer mon compte"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Orders Tab ──────────────────────────────────────────────── */

function OrdersTab({ authHeaders }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    api.get("/auth/orders/", { headers: authHeaders() })
      .then((r) => setOrders(r.data))
      .catch(() => setError("Impossible de charger les commandes."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="py-8 text-center text-sm text-zinc-400 dark:text-white/30">Chargement…</p>;
  if (error)   return <p className="py-8 text-center text-sm text-red-500">{error}</p>;
  if (!orders.length) return (
    <div className="py-12 text-center">
      <p className="text-sm text-zinc-400 dark:text-white/30">Aucune commande pour l&apos;instant.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const st = STATUS_LABELS[order.status] ?? { label: order.status, color: "text-zinc-400" };
        return (
          <div key={order.id} className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Commande #{order.id}</p>
                <p className="text-xs text-zinc-400 dark:text-white/30">
                  {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  {order.pickup_time && ` · Retrait ${order.pickup_time}`}
                </p>
              </div>
              <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
            </div>

            <div className="space-y-1">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm text-zinc-600 dark:text-white/60">
                  <span>{item.quantity}× {item.name}</span>
                  <span>{((item.unit_price_cents * item.quantity) / 100).toFixed(2)} €</span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-end border-t border-zinc-100 dark:border-white/5 pt-3">
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                Total : {(order.total_cents / 100).toFixed(2)} €
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Security Tab ────────────────────────────────────────────── */

function SecurityTab({ logout, router, authHeaders, fetchMe }) {
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [emailForm, setEmailForm] = useState({ email: "", password: "" });
  const [deletePassword, setDeletePassword] = useState("");
  const [pwError,    setPwError]    = useState("");
  const [pwSuccess,  setPwSuccess]  = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailOk,    setEmailOk]    = useState("");
  const [delError,   setDelError]   = useState("");
  const [loading,    setLoading]    = useState({});

  function setLoad(k, v) { setLoading((p) => ({ ...p, [k]: v })); }

  async function handlePw(e) {
    e.preventDefault();
    setPwError(""); setPwSuccess("");
    if (pwForm.new_password !== pwForm.confirm) { setPwError("Les mots de passe ne correspondent pas."); return; }
    setLoad("pw", true);
    try {
      const res = await api.post("/auth/change-password/", { current_password: pwForm.current_password, new_password: pwForm.new_password }, { headers: authHeaders() });
      localStorage.setItem("customer_token", res.data.token);
      setPwSuccess("Mot de passe mis à jour.");
      setPwForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      setPwError(err.response?.data?.detail || "Erreur.");
    } finally {
      setLoad("pw", false);
    }
  }

  async function handleEmail(e) {
    e.preventDefault();
    setEmailError(""); setEmailOk("");
    setLoad("email", true);
    try {
      await api.post("/auth/change-email/", emailForm, { headers: authHeaders() });
      await fetchMe(localStorage.getItem("customer_token"));
      setEmailOk("Email mis à jour.");
      setEmailForm({ email: "", password: "" });
    } catch (err) {
      setEmailError(err.response?.data?.detail || "Erreur.");
    } finally {
      setLoad("email", false);
    }
  }

  async function handleDelete(e) {
    e.preventDefault();
    setDelError("");
    if (!window.confirm("Supprimer définitivement votre compte ?")) return;
    setLoad("del", true);
    try {
      await api.delete("/auth/delete/", { data: { password: deletePassword }, headers: authHeaders() });
      logout();
      router.replace("/");
    } catch (err) {
      setDelError(err.response?.data?.detail || "Erreur.");
    } finally {
      setLoad("del", false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-white/30 outline-none focus:border-[#FFC366] focus:ring-2 focus:ring-[#FFC366]/20";

  return (
    <div className="space-y-8">
      {/* Change password */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-white">Changer le mot de passe</h2>
        <form onSubmit={handlePw} className="space-y-3">
          <input type="password" required placeholder="Mot de passe actuel" value={pwForm.current_password} onChange={(e) => setPwForm((p) => ({ ...p, current_password: e.target.value }))} className={inputClass} />
          <input type="password" required placeholder="Nouveau mot de passe (min. 8 car.)" value={pwForm.new_password} onChange={(e) => setPwForm((p) => ({ ...p, new_password: e.target.value }))} className={inputClass} />
          <input type="password" required placeholder="Confirmer le nouveau mot de passe" value={pwForm.confirm} onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))} className={inputClass} />
          {pwError   && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{pwError}</p>}
          {pwSuccess && <p className="rounded-lg bg-green-50 dark:bg-green-900/20 px-4 py-2.5 text-sm text-green-600 dark:text-green-400">{pwSuccess}</p>}
          <button type="submit" disabled={loading.pw} className="rounded-xl bg-[#FFC366] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95 disabled:opacity-50">
            {loading.pw ? "Mise à jour…" : "Mettre à jour"}
          </button>
        </form>
      </section>

      <div className="border-t border-zinc-100 dark:border-white/5" />

      {/* Change email */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-white">Changer l&apos;adresse email</h2>
        <form onSubmit={handleEmail} className="space-y-3">
          <input type="email" required placeholder="Nouvelle adresse email" value={emailForm.email} onChange={(e) => setEmailForm((p) => ({ ...p, email: e.target.value }))} className={inputClass} />
          <input type="password" required placeholder="Confirmer avec votre mot de passe" value={emailForm.password} onChange={(e) => setEmailForm((p) => ({ ...p, password: e.target.value }))} className={inputClass} />
          {emailError && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{emailError}</p>}
          {emailOk    && <p className="rounded-lg bg-green-50 dark:bg-green-900/20 px-4 py-2.5 text-sm text-green-600 dark:text-green-400">{emailOk}</p>}
          <button type="submit" disabled={loading.email} className="rounded-xl bg-[#FFC366] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95 disabled:opacity-50">
            {loading.email ? "Mise à jour…" : "Mettre à jour"}
          </button>
        </form>
      </section>

      <div className="border-t border-zinc-100 dark:border-white/5" />

      {/* Delete account */}
      <section>
        <h2 className="mb-1 text-base font-semibold text-red-600 dark:text-red-400">Zone dangereuse</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-white/40">La suppression est irréversible.</p>
        <form onSubmit={handleDelete} className="space-y-3">
          <input type="password" required placeholder="Confirmez avec votre mot de passe" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className={inputClass} />
          {delError && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{delError}</p>}
          <button type="submit" disabled={loading.del} className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-5 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-95 disabled:opacity-50">
            {loading.del ? "Suppression…" : "Supprimer mon compte"}
          </button>
        </form>
      </section>
    </div>
  );
}

/* ─── Extras Tab (section libre) ──────────────────────────────── */

function ExtrasTab() {
  return (
    <div className="space-y-4">
      {/* Fidélité — à implémenter */}
      <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-white/10 p-6 text-center">
        <p className="text-sm font-medium text-zinc-400 dark:text-white/30">Programme de fidélité</p>
        <p className="mt-1 text-xs text-zinc-300 dark:text-white/20">À venir</p>
      </div>

      {/* Préférences — à implémenter */}
      <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-white/10 p-6 text-center">
        <p className="text-sm font-medium text-zinc-400 dark:text-white/30">Préférences alimentaires</p>
        <p className="mt-1 text-xs text-zinc-300 dark:text-white/20">À venir</p>
      </div>

      {/* Notifications — à implémenter */}
      <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-white/10 p-6 text-center">
        <p className="text-sm font-medium text-zinc-400 dark:text-white/30">Notifications</p>
        <p className="mt-1 text-xs text-zinc-300 dark:text-white/20">À venir</p>
      </div>
    </div>
  );
}
