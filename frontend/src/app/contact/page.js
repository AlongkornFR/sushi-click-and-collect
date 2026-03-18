"use client";

import { useState } from "react";
import { FaArrowRight } from "react-icons/fa6";
import { api } from "@/services/api";
import Image from "next/image";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  message: "",
};

export default function ContactPage() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function onChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    try {
      await api.post("contact/", {
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone,
        message: form.message,
      });

      setSuccess("Votre message a bien été envoyé.");
      setForm(emptyForm);
    } catch (err) {
      console.error(err);
      setError("Une erreur est survenue lors de l'envoi du message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <section className="rounded-[28px] bg-white p-5 shadow-sm md:p-8 lg:p-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <div className="max-w-xl">
              <p className="mb-3 text-sm uppercase tracking-[0.2em] text-zinc-500">
                Contact
              </p>

              <h1 className="text-4xl font-semibold leading-tight text-zinc-900 md:text-5xl">
                Une question sur nos plats ou votre commande ?
              </h1>

              <p className="mt-5 text-base leading-7 text-zinc-600 md:text-lg">
                Contactez notre équipe pour toute demande concernant la
                boutique, les plats japonais et thaïlandais, les commandes à
                emporter ou les informations pratiques.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-10 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={onChange}
                  placeholder="Nom"
                  required
                  className="h-14 rounded-2xl border border-zinc-200 bg-zinc-100 px-5 text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200"
                />

                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={onChange}
                  placeholder="Prénom"
                  required
                  className="h-14 rounded-2xl border border-zinc-200 bg-zinc-100 px-5 text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  placeholder="Email"
                  required
                  className="h-14 rounded-2xl border border-zinc-200 bg-zinc-100 px-5 text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200"
                />

                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  placeholder="Téléphone"
                  className="h-14 rounded-2xl border border-zinc-200 bg-zinc-100 px-5 text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200"
                />
              </div>

              <textarea
                name="message"
                value={form.message}
                onChange={onChange}
                placeholder="Message"
                rows={7}
                required
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-100 px-5 py-4 text-zinc-900 outline-none transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200"
              />

              {success ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {success}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-3 rounded-full bg-zinc-900 px-6 py-4 text-sm font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaArrowRight className="text-sm" />
                {loading ? "Envoi..." : "Envoyer le message"}
              </button>
            </form>
          </div>

          <div className="flex flex-col gap-5">
            <div className="overflow-hidden rounded-3xl bg-zinc-100">
              <img
                src="https://lh3.googleusercontent.com/p/AF1QipNnfxorl-c8P8g83SbzeD1kxqt95m8yYms2kPOk=s680-w680-h510-rw"
                alt="Su-Rice"
                className="min-h-80 maw-h-50 w-full object-cover md:min-h-105"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">
                  Adresse
                </p>
                <p className="mt-3 text-base font-medium text-zinc-900">
                  Su-Rice
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Cannes
                  <br />
                  Cuisine japonaise et thaïlandaise
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">
                  Contact direct
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  Téléphone
                  <br />
                  Email
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
