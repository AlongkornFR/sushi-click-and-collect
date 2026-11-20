"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/services/api";
import FormField from "@/components/common/FormField";
import { AuthShell, FormError, apiErrorMessage, inputCls, linkCls, primaryBtnCls } from "../_components/AuthUI";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/password-reset/", { email });
      setSent(res.data.detail);
    } catch (err) {
      setError(
        err.response?.status === 429
          ? "Trop de demandes. Réessayez dans une heure."
          : apiErrorMessage(err, "La demande n'a pas pu être envoyée. Réessayez."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      intro="Indiquez l'email de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe."
      footer={<Link href="/account/login" className={linkCls}>Retour à la connexion</Link>}
    >
      {sent ? (
        <div role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {sent}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField id="email" label="Email">
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="votre@email.com"
            />
          </FormField>

          <FormError>{error}</FormError>

          <button type="submit" disabled={loading} className={primaryBtnCls}>
            {loading ? "Envoi…" : "Recevoir le lien"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
