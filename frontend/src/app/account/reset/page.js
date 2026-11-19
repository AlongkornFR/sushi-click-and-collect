"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/services/api";
import FormField from "@/components/common/FormField";

const inputCls =
  "w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-white/30";

function ResetPasswordForm() {
  const sp = useSearchParams();
  const uid = sp.get("uid") || "";
  const token = sp.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/password-reset/confirm/", { uid, token, new_password: password });
      setDone(res.data.detail);
    } catch (err) {
      setError(err.response?.data?.detail || "Le mot de passe n'a pas pu être modifié. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (!uid || !token) {
    return (
      <p role="alert" className="text-sm text-zinc-600 dark:text-white/60">
        Ce lien est incomplet.{" "}
        <Link href="/account/forgot" className="font-medium text-[#FFC366] hover:underline">Faire une nouvelle demande</Link>
      </p>
    );
  }

  if (done) {
    return (
      <div role="status" className="space-y-4">
        <p className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{done}</p>
        <Link href="/account/login" className="block w-full rounded-xl bg-[#FFC366] px-4 py-2.5 text-center text-sm font-semibold text-black">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField id="new-password" label="Nouveau mot de passe">
        <input
          type="password"
          name="new-password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
          placeholder="8 caractères minimum"
        />
      </FormField>
      <FormField id="confirm-password" label="Confirmer le mot de passe">
        <input
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputCls}
        />
      </FormField>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
          {error}{" "}
          {error.includes("plus valable") && (
            <Link href="/account/forgot" className="font-semibold underline">Nouvelle demande</Link>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full cursor-pointer rounded-xl bg-[#FFC366] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] disabled:opacity-50"
      >
        {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[100vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-white">Nouveau mot de passe</h1>
        <Suspense fallback={<p className="text-sm text-zinc-400">Chargement…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
