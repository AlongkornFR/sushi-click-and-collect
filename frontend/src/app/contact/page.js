"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/services/api";
import FormField from "@/components/common/FormField";
import { FaMapMarkerAlt, FaPhone, FaClock, FaEnvelope } from "react-icons/fa";
import { FaArrowRight, FaCircleCheck } from "react-icons/fa6";

const MAPS_URL =
  "https://www.google.com/maps/place/Su-Rice/@43.5585923,7.0140804,17z/data=!3m1!4b1!4m6!3m5!1s0x12ce816d613a0a6d:0xccffb8a670629cf8!8m2!3d43.5585884!4d7.0166553!16s%2Fg%2F11krh5b4jt?entry=ttu";

const INFO = [
  {
    icon: FaMapMarkerAlt,
    label: "Adresse",
    value: "53 Boulevard Carnot, 06400 Cannes, Alpes-Maritimes",
    sub: "Cuisine thaïlandaise et japonaise",
  },
  {
    icon: FaPhone,
    label: "Téléphone",
    value: "+33 4 93 68 08 12",
    href: "tel:+33493680812",
  },
  {
    icon: FaClock,
    label: "Horaires",
    value: "12h00 – 14h30 · 19h00 – 21h30",
    sub: "Fermé le lundi",
  },
  {
    icon: FaEnvelope,
    label: "Email",
    value: "contact@su-rice.com",
    href: "mailto:contact@su-rice.com",
  },
];

const emptyForm = { lastName: "", firstName: "", email: "", phone: "", message: "" };

const inputCls =
  "w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none transition placeholder:text-zinc-400 dark:placeholder:text-white/30 focus:border-zinc-400 dark:focus:border-white/30 focus:bg-white dark:focus:bg-white/10";

export default function ContactPage() {
  const [form, setForm]       = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  function onChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("contact/", {
        first_name: form.firstName,
        last_name:  form.lastName,
        email:      form.email,
        phone:      form.phone,
        message:    form.message,
      });
      setSent(true);
      setForm(emptyForm);
    } catch {
      setError("Une erreur est survenue. Réessayez ou contactez-nous par téléphone.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-16">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* ── Left panel — info ── */}
        <div className="flex flex-col justify-between gap-8 rounded-3xl bg-zinc-900 dark:bg-[#1D1D1D] border border-zinc-700 dark:border-white/10 p-8 text-white lg:col-span-2 lg:p-10">

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-white/30">
              Su-Rice · Cannes
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight lg:text-4xl">
              Une question ?<br />On est là.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Commandes, allergies, horaires… répondez-nous via le formulaire
              ou contactez-nous directement.
            </p>
          </div>

          {/* Info items */}
          <ul className="space-y-5">
            {INFO.map(({ icon: Icon, label, value, sub, href }) => (
              <li key={label} className="flex items-start gap-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="text-sm text-[#FFC366]" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                    {label}
                  </p>
                  {href ? (
                    <a href={href} className="mt-0.5 text-sm font-medium text-white transition hover:text-zinc-300">
                      {value}
                    </a>
                  ) : (
                    <p className="mt-0.5 text-sm font-medium text-white">{value}</p>
                  )}
                  {sub && <p className="text-xs text-zinc-500">{sub}</p>}
                </div>
              </li>
            ))}
          </ul>

          {/* Maps link */}
          <Link
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <FaMapMarkerAlt className="text-xs" />
            Voir sur Google Maps
            <FaArrowRight className="ml-auto text-xs text-zinc-500" />
          </Link>
        </div>

        {/* ── Right panel — form ── */}
        <div className="rounded-3xl border border-zinc-100 dark:border-white/10 bg-white dark:bg-[#1D1D1D] p-8 lg:col-span-3 lg:p-10">

          {sent ? (
            /* ── Success state ── */
            <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                <FaCircleCheck className="text-3xl text-emerald-500 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">Message envoyé !</p>
                <p className="mt-1.5 text-sm text-zinc-400 dark:text-white/40">
                  Nous vous répondrons dans les plus brefs délais.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-4 rounded-xl border border-zinc-200 dark:border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-600 dark:text-white/60 transition hover:bg-zinc-50 dark:hover:bg-white/5"
              >
                Envoyer un autre message
              </button>
            </div>
          ) : (
            /* ── Form ── */
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Envoyer un message</h2>
                <p className="mt-1 text-sm text-zinc-400 dark:text-white/40">
                  Nous répondons généralement sous 24h.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Nom">
                    <input
                      type="text" name="lastName" value={form.lastName}
                      onChange={onChange} placeholder="Dupont"
                      required className={inputCls}
                    />
                  </FormField>
                  <FormField label="Prénom">
                    <input
                      type="text" name="firstName" value={form.firstName}
                      onChange={onChange} placeholder="Marie"
                      required className={inputCls}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Email">
                    <input
                      type="email" name="email" value={form.email}
                      onChange={onChange} placeholder="vous@email.com"
                      required className={inputCls}
                    />
                  </FormField>
                  <FormField label="Téléphone (optionnel)">
                    <input
                      type="tel" name="phone" value={form.phone}
                      onChange={onChange} placeholder="06 12 34 56 78"
                      className={inputCls}
                    />
                  </FormField>
                </div>

                <FormField label="Message">
                  <textarea
                    name="message" value={form.message}
                    onChange={onChange} rows={5}
                    placeholder="Votre question, demande spéciale, remarque…"
                    required className={inputCls + " resize-none"}
                  />
                </FormField>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC366] px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                      Envoi en cours…
                    </>
                  ) : (
                    <>
                      Envoyer le message
                      <FaArrowRight className="text-xs" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
