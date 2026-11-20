"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/context/AuthContext";
import { api } from "@/services/api";
import FormField from "@/components/common/FormField";
import { AuthShell, FormError, PasswordInput, apiErrorMessage, inputCls, linkCls, primaryBtnCls, safeNext } from "../_components/AuthUI";

const FIELDS = ["first_name", "last_name", "email", "phone", "password", "accept_privacy"];

function firstMessage(value) {
  return Array.isArray(value) ? String(value[0]) : value ? String(value) : "";
}

function RegisterForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { token, loading: authLoading, saveToken } = useAuth();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "" });
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && token) router.replace(next);
  }, [authLoading, token, next, router]);

  const set = (field) => (e) => {
    setError("");
    setFieldErrors((p) => ({ ...p, [field]: "" }));
    setForm((p) => ({ ...p, [field]: e.target.value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const local = {};
    if (form.password.length < 8) local.password = "8 caractères minimum.";
    if (!acceptPrivacy) local.accept_privacy = "Cochez cette case pour créer votre compte.";
    if (Object.keys(local).length) {
      setFieldErrors(local);
      document.getElementById(Object.keys(local)[0])?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/register/", {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        accept_privacy: acceptPrivacy,
      });
      saveToken(res.data.token);
      router.replace(next);
    } catch (err) {
      const data = err.response?.status === 400 ? err.response.data : null;
      const byField = {};
      if (data) FIELDS.forEach((f) => { if (data[f]) byField[f] = firstMessage(data[f]); });
      if (Object.keys(byField).length) {
        setFieldErrors(byField);
        document.getElementById(FIELDS.find((f) => byField[f]))?.focus();
      } else {
        setError(apiErrorMessage(err, "Le compte n'a pas pu être créé. Réessayez."));
      }
      setLoading(false);
    }
  }

  const loginHref = next === "/account" ? "/account/login" : `/account/login?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell
      title={<>Bienvenue<br />chez Su-Rice</>}
      intro="Créez votre compte pour commander plus vite, suivre vos commandes et cumuler des points fidélité."
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href={loginHref} className={linkCls}>Se connecter</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="first_name" label="Prénom" error={fieldErrors.first_name}>
            <input type="text" name="first_name" autoComplete="given-name" required maxLength={50}
              value={form.first_name} onChange={set("first_name")} className={inputCls} />
          </FormField>
          <FormField id="last_name" label="Nom" error={fieldErrors.last_name}>
            <input type="text" name="last_name" autoComplete="family-name" required maxLength={50}
              value={form.last_name} onChange={set("last_name")} className={inputCls} />
          </FormField>
        </div>

        <FormField id="email" label="Email" error={fieldErrors.email}>
          <input type="email" name="email" autoComplete="email" inputMode="email" autoCapitalize="none"
            spellCheck={false} required value={form.email} onChange={set("email")} className={inputCls}
            placeholder="votre@email.com" />
        </FormField>

        <FormField id="phone" label="Téléphone (facultatif)" error={fieldErrors.phone}>
          <input type="tel" name="phone" autoComplete="tel" inputMode="tel" maxLength={30}
            value={form.phone} onChange={set("phone")} className={inputCls} placeholder="06 12 34 56 78" />
        </FormField>

        <div>
          <FormField id="password" label="Mot de passe" error={fieldErrors.password}>
            <PasswordInput name="password" autoComplete="new-password" required minLength={8}
              value={form.password} onChange={set("password")} aria-describedby="password-hint" />
          </FormField>
          {!fieldErrors.password && (
            <p id="password-hint" className="mt-1.5 text-xs text-zinc-500 dark:text-white/50">
              8 caractères minimum. Évitez les mots de passe courants, ceux faits uniquement de chiffres ou proches de votre nom.
            </p>
          )}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-zinc-600 dark:text-white/70">
            <input
              id="accept_privacy"
              type="checkbox"
              checked={acceptPrivacy}
              onChange={(e) => { setAcceptPrivacy(e.target.checked); setFieldErrors((p) => ({ ...p, accept_privacy: "" })); }}
              aria-invalid={fieldErrors.accept_privacy ? true : undefined}
              aria-describedby={fieldErrors.accept_privacy ? "accept_privacy-error" : undefined}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#FFC366]"
            />
            <span>
              J&apos;accepte que Su-Rice conserve mes informations pour gérer mon compte et mes commandes, comme décrit dans la{" "}
              <Link href="/politique-de-confidentialite" target="_blank" className={linkCls}>politique de confidentialité</Link>.
            </span>
          </label>
          {fieldErrors.accept_privacy && (
            <p id="accept_privacy-error" role="alert" className="mt-1.5 text-xs text-red-500">{fieldErrors.accept_privacy}</p>
          )}
        </div>

        <FormError>{error}</FormError>

        <button type="submit" disabled={loading} className={primaryBtnCls}>
          {loading ? "Création du compte…" : "Créer mon compte"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-[100vh]" aria-busy="true" />}>
      <RegisterForm />
    </Suspense>
  );
}
