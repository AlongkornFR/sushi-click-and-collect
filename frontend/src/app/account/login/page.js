"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/context/AuthContext";
import { useCart } from "@/components/context/CartContext";
import { api } from "@/services/api";
import FormField from "@/components/common/FormField";
import { AuthShell, FormError, PasswordInput, apiErrorMessage, inputCls, linkCls, primaryBtnCls, safeNext } from "../_components/AuthUI";

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { token, loading: authLoading, saveToken } = useAuth();
  const { restoreFromSave } = useCart();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Déjà connecté : inutile de rester sur cette page.
  useEffect(() => {
    if (!authLoading && token) router.replace(next);
  }, [authLoading, token, next, router]);

  const set = (field) => (e) => { setError(""); setForm((p) => ({ ...p, [field]: e.target.value })); };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login/", { email: form.email.trim(), password: form.password });
      saveToken(res.data.token);
      restoreFromSave();
      router.replace(next);
    } catch (err) {
      setError(
        err.response?.status === 401
          ? "Email ou mot de passe incorrect."
          : apiErrorMessage(err, "La connexion a échoué. Réessayez."),
      );
      setLoading(false);
    }
  }

  const registerHref = next === "/account" ? "/account/register" : `/account/register?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell
      title={<>Bon retour<br />chez Su-Rice</>}
      intro="Connectez-vous pour commander plus vite, suivre vos commandes et retrouver vos points fidélité."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href={registerHref} className={linkCls}>Créer un compte</Link>
        </>
      }
    >
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
            value={form.email}
            onChange={set("email")}
            className={inputCls}
            placeholder="votre@email.com"
          />
        </FormField>

        <div>
          <FormField id="password" label="Mot de passe">
            <PasswordInput
              name="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={set("password")}
            />
          </FormField>
          <Link href="/account/forgot" className="mt-2 inline-flex min-h-8 items-center text-sm text-zinc-500 dark:text-white/60 hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>

        <FormError>{error}</FormError>

        <button type="submit" disabled={loading} className={primaryBtnCls}>
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100vh]" aria-busy="true" />}>
      <LoginForm />
    </Suspense>
  );
}
