"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/context/CartContext";
import { useAuth } from "@/components/context/AuthContext";
import { api } from "@/services/api";
import { formatEUR } from "@/utils/formatting";
import FormField from "@/components/common/FormField";
import ProductImage from "@/components/common/ProductImage";
import CartSyncNotice from "@/components/common/CartSyncNotice";
import { FaShieldAlt, FaClock, FaUser } from "react-icons/fa";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function isValidPhone(phone) {
  return String(phone || "").replace(/\s/g, "").length >= 9;
}

const SHORT_DAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const SHORT_MONTHS = ["jan.", "fév.", "mar.", "avr.", "mai", "juin", "juil.", "aoû.", "sep.", "oct.", "nov.", "déc."];
const DAYS_SHOWN = 7;

// Les horaires viennent du backend (GET /api/opening-hours/), seule source de vérité.
const fetchSchedule = (url) => api.get(url).then(r => r.data);

const pad2 = (n) => String(n).padStart(2, "0");

// Date locale "AAAA-MM-JJ" (pas toISOString, qui donne la date UTC).
function localDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function buildSlotsForDay(date, schedule) {
  const services = schedule.days[String(date.getDay())] || [];
  const cutoff = Date.now() + schedule.prep_minutes * 60 * 1000;
  return services
    .map(([start, end], index) => {
      const slots = [];
      for (let t = toMinutes(start); t <= toMinutes(end); t += schedule.slot_minutes) {
        const slotDate = new Date(date);
        slotDate.setHours(Math.floor(t / 60), t % 60, 0, 0);
        if (slotDate.getTime() < cutoff) continue;
        const hm = `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`;
        slots.push({ value: `${localDateKey(date)} ${hm}`, label: hm.replace(":", "h") });
      }
      return { index, start, end, slots };
    })
    .filter(service => service.slots.length > 0);
}

// Jours ouverts avec au moins un créneau encore disponible.
function getOpenDays(schedule) {
  const days = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i <= schedule.max_days_ahead && days.length < DAYS_SHOWN; i++) {
    if (buildSlotsForDay(d, schedule).length > 0) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function formatDayLabel(date) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (localDateKey(date) === localDateKey(today)) return "Aujourd'hui";
  if (localDateKey(date) === localDateKey(tomorrow)) return "Demain";
  return `${SHORT_DAYS[date.getDay()]} ${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

function formatPickupDisplay(value) {
  if (!value) return "";
  const [datePart, timePart] = value.split(" ");
  const d = new Date(datePart + "T00:00:00");
  const dayStr = `${SHORT_DAYS[d.getDay()]} ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
  return `${dayStr} à ${timePart.replace(":", "h")}`;
}

function serviceTitle(service) {
  const range = `${service.start.replace(":", "h")} à ${service.end.replace(":", "h")}`;
  return `${service.index === 0 ? "Midi" : "Soir"} : ${range}`;
}

const inputCls = (hasError) =>
  `w-full rounded-xl border bg-zinc-50 dark:bg-white/5 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none transition placeholder:text-zinc-500 dark:placeholder:text-white/40 focus:bg-white dark:focus:bg-white/10 ${
    hasError
      ? "border-red-300 dark:border-red-500/50 focus:border-red-400"
      : "border-zinc-200 dark:border-white/10 focus:border-zinc-400 dark:focus:border-white/30"
  }`;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, hydrated, subtotal, clear } = useCart();
  const { customer, token, authHeaders } = useAuth();

  const [form, setForm]       = useState({ full_name: "", email: "", phone: "", pickup_time: "", notes: "" });
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Pre-fill form from customer account when logged in
  useEffect(() => {
    if (customer) {
      setForm(p => ({
        ...p,
        full_name: `${customer.first_name} ${customer.last_name}`.trim(),
        email:     customer.email,
        phone:     customer.phone || "",
      }));
    }
  }, [customer]);

  const { data: schedule, error: scheduleError } = useSWR("opening-hours/", fetchSchedule, {
    revalidateOnFocus: false,
  });
  const openDays = useMemo(() => (schedule ? getOpenDays(schedule) : []), [schedule]);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const services = useMemo(
    () => (schedule && openDays[selectedDayIdx] ? buildSlotsForDay(openDays[selectedDayIdx], schedule) : []),
    [schedule, openDays, selectedDayIdx],
  );

  // Lot H5 : on attend que le panier soit relu avant de conclure qu'il est vide.
  useEffect(() => {
    if (hydrated && items.length === 0) router.replace("/cart");
  }, [hydrated, items.length, router]);

  const validation = useMemo(() => {
    const e = {};
    if (!form.full_name.trim())    e.full_name    = "Nom obligatoire";
    if (!isValidEmail(form.email)) e.email        = "Email invalide";
    if (!customer && !isValidPhone(form.phone)) e.phone = "Téléphone invalide";
    if (!form.pickup_time)         e.pickup_time  = "Choisissez un créneau";
    if (items.length === 0)        e.cart         = "Panier vide";
    return e;
  }, [form, items.length, customer]);

  const canSubmit = Object.keys(validation).length === 0 && !loading;

  // Ce qui manque encore, affiché sous le bouton (lot H4).
  const MISSING_LABELS = {
    full_name: "votre nom",
    phone: "votre téléphone",
    email: "votre email",
    pickup_time: "l'heure de retrait",
  };
  const missing = Object.keys(validation).filter(k => MISSING_LABELS[k]).map(k => MISSING_LABELS[k]);

  function focusFirstInvalid() {
    const order = ["full_name", "phone", "email", "pickup_time"];
    const first = order.find(k => validation[k]);
    const el = first && document.getElementById(first === "pickup_time" ? "pickup-section" : first);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el.tagName === "INPUT") el.focus({ preventScroll: true });
  }

  // Toute saisie efface le message d'erreur précédent : il serait périmé.
  const setField   = (name, value) => { setError(""); setForm(p => ({ ...p, [name]: value })); };
  const markTouched = (name) => setTouched(t => ({ ...t, [name]: true }));

  async function handlePay() {
    setError("");
    setTouched({ full_name: true, email: true, phone: true, pickup_time: true });
    if (loading) return;
    if (!canSubmit) {
      setError(`Il manque ${missing.join(", ")}.`);
      focusFirstInvalid();
      return;
    }
    setLoading(true);
    try {
      const payload = {
        customer: { full_name: form.full_name.trim(), email: form.email.trim(), phone: form.phone.trim() },
        pickup_time: form.pickup_time, // "AAAA-MM-JJ HH:MM", validé par le serveur
        notes: form.notes?.trim() || "",
        items: items.map(x => ({ product_id: x.id, quantity: x.quantity })),
      };
      const res = await api.post("checkout/", payload, { headers: authHeaders() });
      const paymentUrl = res?.data?.payment_url;
      if (!paymentUrl) throw new Error("payment_url missing");
      window.location.href = paymentUrl;
    } catch (e) {
      console.error(e);
      if (e.response?.data?.field === "pickup_time") setField("pickup_time", "");
      setError(e.response?.data?.detail || "Impossible de démarrer le paiement. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated || items.length === 0) return <div className="min-h-[100vh]" aria-busy="true" />;

  return (
    <div className="mx-auto min-h-[100vh] max-w-6xl px-4 py-10 md:px-6 md:py-14">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Finaliser</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-white/60">Paiement sécurisé · Click &amp; Collect</p>
        </div>
        <Link href="/cart" className="text-sm text-zinc-500 dark:text-white/60 transition hover:text-zinc-700 dark:hover:text-white">
          ← Panier
        </Link>
      </div>

      <CartSyncNotice />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

        {/* ── Form ── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Customer info card */}
          <div className="rounded-2xl border border-zinc-100 dark:border-white/10 bg-white dark:bg-[#1D1D1D] p-6">

            {customer ? (
              /* ── Logged in: show account summary ── */
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-white/60">
                    Vos informations
                  </h2>
                  <Link
                    href="/account"
                    className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-white/60 transition hover:text-zinc-700 dark:hover:text-white"
                  >
                    <FaUser className="h-2.5 w-2.5" />
                    Modifier
                  </Link>
                </div>

                <div className="flex items-start gap-4 rounded-xl bg-zinc-50 dark:bg-white/5 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFC366] text-sm font-bold text-black">
                    {customer.first_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {customer.first_name} {customer.last_name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-white/50">{customer.email}</p>
                    {customer.phone && (
                      <p className="text-xs text-zinc-500 dark:text-white/50">{customer.phone}</p>
                    )}
                    {!customer.phone && (
                      <Link href="/account" className="text-xs text-amber-500 hover:underline">
                        Ajouter un numéro de téléphone →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ── Not logged in: show form + login nudge ── */
              <div>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-white/60">
                  Vos informations
                </h2>

                {/* Login nudge */}
                <div className="mb-5 flex items-center justify-between rounded-xl border border-zinc-100 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-4 py-3">
                  <p className="text-xs text-zinc-500 dark:text-white/60">
                    Vous avez un compte ? Gagnez du temps.
                  </p>
                  <Link
                    href="/account/login"
                    className="text-xs font-semibold text-amber-700 dark:text-[#FFC366] transition hover:text-[#ffb347]"
                  >
                    Se connecter →
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField id="full_name" label="Nom & prénom" error={touched.full_name ? validation.full_name : ""}>
                    <input
                      name="full_name"
                      autoComplete="name"
                      value={form.full_name}
                      onChange={e => setField("full_name", e.target.value)}
                      onBlur={() => markTouched("full_name")}
                      placeholder="Ex : Marie Dupont"
                      className={inputCls(touched.full_name && validation.full_name)}
                    />
                  </FormField>

                  <FormField id="phone" label="Téléphone" error={touched.phone ? validation.phone : ""}>
                    <input
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={e => setField("phone", e.target.value)}
                      onBlur={() => markTouched("phone")}
                      placeholder="06 12 34 56 78"
                      className={inputCls(touched.phone && validation.phone)}
                    />
                  </FormField>

                  <div className="md:col-span-2">
                    <FormField id="email" label="Email" error={touched.email ? validation.email : ""}>
                      <input
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={e => setField("email", e.target.value)}
                        onBlur={() => markTouched("email")}
                        placeholder="vous@email.com"
                        className={inputCls(touched.email && validation.email)}
                      />
                    </FormField>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pickup time card */}
          <div id="pickup-section" className="scroll-mt-28 rounded-2xl border border-zinc-100 dark:border-white/10 bg-white dark:bg-[#1D1D1D] p-6">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-white/60">
              Heure de retrait
            </h2>
            <p className="mb-4 text-xs text-zinc-500 dark:text-white/60">
              Comptez au moins {schedule?.prep_minutes ?? 20} minutes de préparation. Aux heures d&apos;affluence, l&apos;attente peut être plus longue.
            </p>

            {scheduleError && (
              <p className="py-4 text-center text-sm text-red-500 dark:text-red-400">
                Impossible de charger les créneaux. Réessayez ou appelez-nous au 04 93 68 08 12.
              </p>
            )}
            {!schedule && !scheduleError && (
              <p className="py-4 text-center text-sm text-zinc-500 dark:text-white/60">Chargement des créneaux…</p>
            )}

            {/* Day selector */}
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {openDays.map((day, i) => (
                <button
                  key={localDateKey(day)}
                  type="button"
                  aria-pressed={selectedDayIdx === i}
                  onClick={() => { setSelectedDayIdx(i); setField("pickup_time", ""); }}
                  className={`min-h-11 shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-center transition active:scale-95 ${
                    selectedDayIdx === i
                      ? "bg-[#FFC366] text-black"
                      : "border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-white/60 hover:border-zinc-300 dark:hover:border-white/20"
                  }`}
                >
                  <p className="text-xs font-semibold">{formatDayLabel(day)}</p>
                </button>
              ))}
            </div>

            {touched.pickup_time && validation.pickup_time && (
              <p role="alert" className="mb-3 text-xs text-red-500 dark:text-red-400">{validation.pickup_time}</p>
            )}

            {schedule && services.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500 dark:text-white/60">
                Aucun créneau disponible pour ce jour.
              </p>
            ) : (
              services.map(service => (
                <div key={service.index} className="mb-5 last:mb-0">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-white/50">
                    {serviceTitle(service)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {service.slots.map(slot => (
                      <button
                        key={slot.value}
                        type="button"
                        aria-pressed={form.pickup_time === slot.value}
                        onClick={() => { setField("pickup_time", slot.value); markTouched("pickup_time"); }}
                        className={`min-h-11 cursor-pointer rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
                          form.pickup_time === slot.value
                            ? "bg-[#FFC366] text-black"
                            : "border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-white/60 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-100 dark:hover:bg-white/10"
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Notes card */}
          <div className="rounded-2xl border border-zinc-100 dark:border-white/10 bg-white dark:bg-[#1D1D1D] p-6">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-white/60">
              Note (optionnel)
            </h2>
            <p className="mb-4 text-xs text-zinc-500 dark:text-white/60">Allergie, demande spéciale…</p>
            <textarea
              value={form.notes}
              onChange={e => setField("notes", e.target.value)}
              placeholder="Ex : sans wasabi, baguettes x2…"
              rows={3}
              className="w-full resize-none rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none transition placeholder:text-zinc-500 dark:placeholder:text-white/40 focus:border-zinc-400 dark:focus:border-white/30 focus:bg-white dark:focus:bg-white/10"
            />
          </div>
        </div>

        {/* ── Summary ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">

            <div className="rounded-2xl border border-zinc-100 dark:border-white/10 bg-white dark:bg-[#1D1D1D] p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-white/60">
                Votre commande
              </h2>
              <div className="my-4 h-px bg-zinc-100 dark:bg-white/10" />
              <div className="space-y-3">
                {items.map(it => (
                  <div key={it.id} className="flex items-center gap-3">
                    <ProductImage
                      src={it.image_main}
                      alt={it.name}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-zinc-800 dark:text-white">{it.name}</p>
                      <p className="text-xs text-zinc-500 dark:text-white/60">{it.quantity} × {formatEUR(it.price)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-amber-700 dark:text-[#FFC366]">
                      {formatEUR(Number(it.price) * it.quantity)}
                    </p>
                  </div>
                ))}
              </div>



              <div className="my-4 h-px bg-zinc-100 dark:bg-white/10" />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-600 dark:text-white/60">Total</span>
                <span className="text-xl font-bold text-zinc-900 dark:text-white">{formatEUR(subtotal)}</span>
              </div>

              {form.pickup_time && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-zinc-50 dark:bg-white/5 px-3 py-2.5">
                  <FaClock className="shrink-0 text-zinc-500 dark:text-white/60 text-xs" />
                  <p className="text-xs text-zinc-600 dark:text-white/60">
                    Retrait <span className="font-bold text-zinc-900 dark:text-white">{formatPickupDisplay(form.pickup_time)}</span>
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handlePay}
                disabled={loading}
                aria-describedby="pay-hint"
                className="mt-5 w-full cursor-pointer rounded-xl bg-[#FFC366] py-3.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-[.98] disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? "Redirection…" : "Payer maintenant"}
              </button>

              <div id="pay-hint" aria-live="polite">
                {error ? (
                  <p role="alert" className="mt-3 rounded-xl border border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
                    {error}
                  </p>
                ) : missing.length > 0 ? (
                  <p className="mt-3 text-xs text-zinc-500 dark:text-white/50">
                    Pour payer, indiquez {missing.join(", ")}.
                  </p>
                ) : null}
              </div>

              <div className="mt-4 space-y-1.5 border-t border-zinc-100 dark:border-white/10 pt-4">
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-white/60">
                  <FaShieldAlt className="shrink-0 text-zinc-500 dark:text-white/50" />
                  Paiement sécurisé Payplug — vos données sont protégées
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
