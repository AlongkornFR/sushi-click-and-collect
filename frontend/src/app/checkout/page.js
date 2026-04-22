"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/context/CartContext";
import { useAuth } from "@/components/context/AuthContext";
import { api } from "@/services/api";
import { formatEUR } from "@/utils/formatting";
import FormField from "@/components/common/FormField";
import ProductImage from "@/components/common/ProductImage";
import { FaShieldAlt, FaClock, FaUser } from "react-icons/fa";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function isValidPhone(phone) {
  return String(phone || "").replace(/\s/g, "").length >= 9;
}

const SHORT_DAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const SHORT_MONTHS = ["jan.", "fév.", "mar.", "avr.", "mai", "juin", "juil.", "aoû.", "sep.", "oct.", "nov.", "déc."];
const PREP_MINUTES = 20;

function getWorkingDays(count = 7) {
  const days = [];
  const d = new Date();
  d.setSeconds(0, 0);
  while (days.length < count) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function buildSlotsForDay(date) {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const cutoff = new Date(now.getTime() + PREP_MINUTES * 60 * 1000);
  const slots = [];

  const pushRange = (h1, m1, h2, m2) => {
    let h = h1, m = m1;
    while (h < h2 || (h === h2 && m <= m2)) {
      const slotDate = new Date(date);
      slotDate.setHours(h, m, 0, 0);
      if (!isToday || slotDate > cutoff) {
        slots.push({
          value: `${date.toISOString().slice(0, 10)} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
          label: `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`,
          hour: h,
        });
      }
      m += 15;
      if (m >= 60) { m = 0; h += 1; }
    }
  };

  pushRange(11, 30, 14, 0);
  pushRange(18, 0, 22, 0);
  return slots;
}

function formatDayLabel(date, index) {
  if (index === 0) return "Aujourd'hui";
  if (index === 1) return "Demain";
  return `${SHORT_DAYS[date.getDay()]} ${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

function formatPickupDisplay(value) {
  if (!value) return "";
  const [datePart, timePart] = value.split(" ");
  const d = new Date(datePart + "T00:00:00");
  const dayStr = `${SHORT_DAYS[d.getDay()]} ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
  return `${dayStr} à ${timePart.replace(":", "h")}`;
}

const inputCls = (hasError) =>
  `w-full rounded-xl border bg-zinc-50 dark:bg-white/5 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none transition placeholder:text-zinc-400 dark:placeholder:text-white/30 focus:bg-white dark:focus:bg-white/10 ${
    hasError
      ? "border-red-300 dark:border-red-500/50 focus:border-red-400"
      : "border-zinc-200 dark:border-white/10 focus:border-zinc-400 dark:focus:border-white/30"
  }`;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
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

  const workingDays = useMemo(() => getWorkingDays(7), []);
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => {
    const todaySlots = buildSlotsForDay(new Date());
    return todaySlots.length > 0 ? 0 : 1;
  });
  const daySlots    = useMemo(() => buildSlotsForDay(workingDays[selectedDayIdx]), [workingDays, selectedDayIdx]);
  const lunchSlots  = useMemo(() => daySlots.filter(s => s.hour < 15), [daySlots]);
  const dinnerSlots = useMemo(() => daySlots.filter(s => s.hour >= 15), [daySlots]);

  useEffect(() => {
    if (items.length === 0) router.replace("/cart");
  }, [items.length, router]);

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

  const setField   = (name, value) => setForm(p => ({ ...p, [name]: value }));
  const markTouched = (name) => setTouched(t => ({ ...t, [name]: true }));

  async function handlePay() {
    setError("");
    setTouched({ full_name: true, email: true, phone: true, pickup_time: true });
    if (!canSubmit) { setError("Veuillez corriger les champs indiqués."); return; }
    setLoading(true);
    try {
      const payload = {
        customer: { full_name: form.full_name.trim(), email: form.email.trim(), phone: form.phone.trim() },
        pickup_time: form.pickup_time,
        notes: form.notes?.trim() || "",
        items: items.map(x => ({ product_id: x.id, quantity: x.quantity })),
      };
      const res = await api.post("checkout/", payload, { headers: authHeaders() });
      const paymentUrl = res?.data?.payment_url;
      if (!paymentUrl) throw new Error("payment_url missing");
      window.location.href = paymentUrl;
    } catch (e) {
      console.error(e);
      setError("Impossible de démarrer le paiement. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="mx-auto min-h-[100vh] max-w-6xl px-4 py-10 md:px-6 md:py-14">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Finaliser</h1>
          <p className="mt-1 text-sm text-zinc-400 dark:text-white/40">Paiement sécurisé · Click &amp; Collect</p>
        </div>
        <Link href="/cart" className="text-sm text-zinc-400 dark:text-white/40 transition hover:text-zinc-700 dark:hover:text-white">
          ← Panier
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

        {/* ── Form ── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Customer info card */}
          <div className="rounded-2xl border border-zinc-100 dark:border-white/10 bg-white dark:bg-[#1D1D1D] p-6">

            {error && (
              <div className="mb-5 rounded-xl border border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {customer ? (
              /* ── Logged in: show account summary ── */
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40">
                    Vos informations
                  </h2>
                  <Link
                    href="/account"
                    className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-white/30 transition hover:text-zinc-700 dark:hover:text-white"
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
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40">
                  Vos informations
                </h2>

                {/* Login nudge */}
                <div className="mb-5 flex items-center justify-between rounded-xl border border-zinc-100 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-4 py-3">
                  <p className="text-xs text-zinc-500 dark:text-white/40">
                    Vous avez un compte ? Gagnez du temps.
                  </p>
                  <Link
                    href="/account/login"
                    className="text-xs font-semibold text-[#FFC366] transition hover:text-[#ffb347]"
                  >
                    Se connecter →
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField label="Nom & prénom" error={touched.full_name ? validation.full_name : ""}>
                    <input
                      value={form.full_name}
                      onChange={e => setField("full_name", e.target.value)}
                      onBlur={() => markTouched("full_name")}
                      placeholder="Ex : Marie Dupont"
                      className={inputCls(touched.full_name && validation.full_name)}
                    />
                  </FormField>

                  <FormField label="Téléphone" error={touched.phone ? validation.phone : ""}>
                    <input
                      value={form.phone}
                      onChange={e => setField("phone", e.target.value)}
                      onBlur={() => markTouched("phone")}
                      placeholder="06 12 34 56 78"
                      className={inputCls(touched.phone && validation.phone)}
                    />
                  </FormField>

                  <div className="md:col-span-2">
                    <FormField label="Email" error={touched.email ? validation.email : ""}>
                      <input
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
          <div className="rounded-2xl border border-zinc-100 dark:border-white/10 bg-white dark:bg-[#1D1D1D] p-6">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40">
              Heure de retrait
            </h2>
            <p className="mb-4 text-xs text-zinc-400 dark:text-white/30">
              Préparation ~ {PREP_MINUTES} min en fonction de l'heure ou vous commander la commande il y a peut être de l'attente
            </p>

            {/* Day selector */}
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {workingDays.map((day, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setSelectedDayIdx(i); setField("pickup_time", ""); }}
                  className={`shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-center transition active:scale-95 ${
                    selectedDayIdx === i
                      ? "bg-[#FFC366] text-black"
                      : "border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-white/60 hover:border-zinc-300 dark:hover:border-white/20"
                  }`}
                >
                  <p className="text-xs font-semibold">{formatDayLabel(day, i)}</p>
                  {i >= 2 && (
                    <p className={`text-[10px] mt-0.5 ${selectedDayIdx === i ? "text-black/60" : "text-zinc-400 dark:text-white/30"}`}>
                      {day.getDate()} {SHORT_MONTHS[day.getMonth()]}
                    </p>
                  )}
                </button>
              ))}
            </div>

            {touched.pickup_time && validation.pickup_time && (
              <p className="mb-3 text-xs text-red-500 dark:text-red-400">{validation.pickup_time}</p>
            )}

            {daySlots.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-400 dark:text-white/30">
                Aucun créneau disponible pour ce jour.
              </p>
            ) : (
              <>
                {lunchSlots.length > 0 && (
                  <>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-300 dark:text-white/20">
                      Déjeuner — 11h30 à 14h00
                    </p>
                    <div className="mb-5 flex flex-wrap gap-2">
                      {lunchSlots.map(slot => (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => { setField("pickup_time", slot.value); markTouched("pickup_time"); }}
                          className={`cursor-pointer rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
                            form.pickup_time === slot.value
                              ? "bg-[#FFC366] text-black"
                              : "border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-white/60 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-100 dark:hover:bg-white/10"
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {dinnerSlots.length > 0 && (
                  <>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-300 dark:text-white/20">
                      Soir — 18h00 à 22h00
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {dinnerSlots.map(slot => (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => { setField("pickup_time", slot.value); markTouched("pickup_time"); }}
                          className={`cursor-pointer rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
                            form.pickup_time === slot.value
                              ? "bg-[#FFC366] text-black"
                              : "border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-white/60 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-100 dark:hover:bg-white/10"
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Notes card */}
          <div className="rounded-2xl border border-zinc-100 dark:border-white/10 bg-white dark:bg-[#1D1D1D] p-6">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40">
              Note (optionnel)
            </h2>
            <p className="mb-4 text-xs text-zinc-400 dark:text-white/30">Allergie, demande spéciale…</p>
            <textarea
              value={form.notes}
              onChange={e => setField("notes", e.target.value)}
              placeholder="Ex : sans wasabi, baguettes x2…"
              rows={3}
              className="w-full resize-none rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none transition placeholder:text-zinc-400 dark:placeholder:text-white/30 focus:border-zinc-400 dark:focus:border-white/30 focus:bg-white dark:focus:bg-white/10"
            />
          </div>
        </div>

        {/* ── Summary ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">

            <div className="rounded-2xl border border-zinc-100 dark:border-white/10 bg-white dark:bg-[#1D1D1D] p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40">
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
                      <p className="text-xs text-zinc-400 dark:text-white/40">{it.quantity} × {formatEUR(it.price)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-[#FFC366]">
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
                  <FaClock className="shrink-0 text-zinc-400 dark:text-white/30 text-xs" />
                  <p className="text-xs text-zinc-600 dark:text-white/60">
                    Retrait <span className="font-bold text-zinc-900 dark:text-white">{formatPickupDisplay(form.pickup_time)}</span>
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handlePay}
                disabled={!canSubmit}
                className={`mt-5 w-full cursor-pointer rounded-xl py-3.5 text-sm font-semibold transition active:scale-[.98] ${
                  canSubmit
                    ? "bg-[#FFC366] text-black hover:bg-[#ffb347]"
                    : "cursor-not-allowed bg-zinc-100 dark:bg-white/10 text-zinc-400 dark:text-white/30"
                }`}
              >
                {loading ? "Redirection…" : "Payer maintenant"}
              </button>

              <div className="mt-4 space-y-1.5 border-t border-zinc-100 dark:border-white/10 pt-4">
                <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-white/30">
                  <FaShieldAlt className="shrink-0 text-zinc-300 dark:text-white/20" />
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
