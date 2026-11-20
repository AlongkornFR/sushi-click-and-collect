"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/services/api";
import FormField from "@/components/common/FormField";
import { AuthShell, PasswordInput, apiErrorMessage, linkCls, primaryBtnCls } from "../_components/AuthUI";

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
      setError(apiErrorMessage(err, "Le mot de passe n'a pas pu être modifié. Réessayez."));
    } finally {
      setLoading(false);
    }
  }

  if (!uid || !token) {
    return (
      <p role="alert" className="text-sm text-zinc-600 dark:text-white/60">
        Ce lien est incomplet.{" "}
        <Link href="/account/forgot" className={linkCls}>Faire une nouvelle demande</Link>
      </p>
    );
  }

  if (done) {
    return (
      <div role="status" className="space-y-4">
        <p className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{done}</p>
        <Link href="/account/login" className={`${primaryBtnCls} flex items-center justify-center`}>
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField id="new-password" label="Nouveau mot de passe">
        <PasswordInput
          name="new-password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8 caractères minimum"
        />
      </FormField>
      <FormField id="confirm-password" label="Confirmer le mot de passe">
        <PasswordInput
          name="confirm-password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
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

      <button type="submit" disabled={loading} className={primaryBtnCls}>
        {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Nouveau mot de passe" intro="Choisissez un mot de passe d'au moins 8 caractères.">
      <Suspense fallback={<p className="text-sm text-zinc-400">Chargement…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
