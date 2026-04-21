"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/context/AuthContext";
import { api } from "@/services/api";

export default function RegisterPage() {
  const router = useRouter();
  const { saveToken } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => setForm((p) => ({ ...p, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (form.password.length < 8) {
      setError("Mot de passe minimum 8 caractères.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/register/", {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      saveToken(res.data.token);
      router.replace("/account");
    } catch (err) {
      const data = err.response?.data;
      if (data?.email) setError(data.email[0]);
      else setError(data?.detail || "Erreur d'inscription.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-white/30 outline-none focus:border-[#FFC366] focus:ring-2 focus:ring-[#FFC366]/20";

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">Créer un compte</h1>
        <p className="mb-8 text-sm text-zinc-500 dark:text-white/50">
          Déjà inscrit ?{" "}
          <Link href="/account/login" className="font-medium text-[#FFC366] hover:underline">
            Se connecter
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-white/70">
                Prénom
              </label>
              <input type="text" required value={form.first_name} onChange={set("first_name")} className={inputClass} placeholder="Jean" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-white/70">
                Nom
              </label>
              <input type="text" required value={form.last_name} onChange={set("last_name")} className={inputClass} placeholder="Dupont" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-white/70">
              Email
            </label>
            <input type="email" required value={form.email} onChange={set("email")} className={inputClass} placeholder="votre@email.com" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-white/70">
              Téléphone <span className="text-zinc-400 dark:text-white/30">(optionnel)</span>
            </label>
            <input type="tel" value={form.phone} onChange={set("phone")} className={inputClass} placeholder="+33 6 00 00 00 00" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-white/70">
              Mot de passe
            </label>
            <input type="password" required value={form.password} onChange={set("password")} className={inputClass} placeholder="Minimum 8 caractères" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-white/70">
              Confirmer le mot de passe
            </label>
            <input type="password" required value={form.confirm} onChange={set("confirm")} className={inputClass} placeholder="••••••••" />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#FFC366] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95 disabled:opacity-50"
          >
            {loading ? "Inscription…" : "Créer mon compte"}
          </button>
        </form>
      </div>
    </div>
  );
}
