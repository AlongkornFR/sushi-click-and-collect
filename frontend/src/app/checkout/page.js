"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/context/CartContext";
import { api } from "@/services/api";
import { formatEUR } from "@/utils/formatting";
import FormField from "@/components/common/FormField";
import ProductImage from "@/components/common/ProductImage";
import { FaShieldAlt, FaClock } from "react-icons/fa";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function isValidPhone(phone) {
  return String(phone || "").replace(/\s/g, "").length >= 9;
}

function buildPickupSlots() {
  const slots = [];
  const make = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const pushRange = (h1, m1, h2, m2) => {
    let h = h1, m = m1;
    while (h < h2 || (h === h2 && m <= m2)) {
      slots.push(make(h, m));
      m += 15;
      if (m >= 60) { m = 0; h += 1; }
    }
  };
  pushRange(11, 30, 14, 0);
  pushRange(18, 0, 22, 0);
  return slots;
}

const inputCls = (hasError) =>
  `w-full rounded-xl border bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:bg-white ${
    hasError ? "border-red-300 focus:border-red-400" : "border-zinc-200 focus:border-zinc-400"
  }`;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();

  const [form, setForm]       = useState({ full_name: "", email: "", phone: "", pickup_time: "", notes: "" });
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const allSlots   = useMemo(() => buildPickupSlots(), []);
  const lunchSlots = useMemo(() => allSlots.filter(s => s < "15:00"), [allSlots]);
  const dinnerSlots = useMemo(() => allSlots.filter(s => s >= "15:00"), [allSlots]);

  useEffect(() => {
    if (items.length === 0) router.replace("/cart");
  }, [items.length, router]);

  const validation = useMemo(() => {
    const e = {};
    if (!form.full_name.trim())   e.full_name    = "Nom obligatoire";
    if (!isValidEmail(form.email)) e.email       = "Email invalide";
    if (!isValidPhone(form.phone)) e.phone       = "Téléphone invalide";
    if (!form.pickup_time)         e.pickup_time = "Choisissez un créneau";
    if (items.length === 0)        e.cart        = "Panier vide";
    return e;
  }, [form, items.length]);

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
      const res = await api.post("checkout/", payload);
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
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">

      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Finaliser</h1>
          <p className="mt-1 text-sm text-zinc-400">Paiement sécurisé · Click & Collect</p>
        </div>
        <Link href="/cart" className="text-sm text-zinc-400 transition hover:text-zinc-700">
          ← Panier
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

        {/* ── Form ── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Customer info card */}
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-bold uppercase tracking-widest text-zinc-400">
              Vos informations
            </h2>

            {error && (
              <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

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

          {/* Pickup time card */}
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-zinc-400">
              Heure de retrait
            </h2>
            <p className="mb-5 text-xs text-zinc-400">
              Choisissez un créneau · préparation à l'heure indiquée
            </p>

            {touched.pickup_time && validation.pickup_time && (
              <p className="mb-3 text-xs text-red-500">{validation.pickup_time}</p>
            )}

            {/* Lunch slots */}
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-300">
              Déjeuner — 11h30 à 14h00
            </p>
            <div className="flex flex-wrap gap-2">
              {lunchSlots.map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => { setField("pickup_time", slot); markTouched("pickup_time"); }}
                  className={`cursor-pointer rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
                    form.pickup_time === slot
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>

            {/* Dinner slots */}
            <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-widest text-zinc-300">
              Soir — 18h00 à 22h00
            </p>
            <div className="flex flex-wrap gap-2">
              {dinnerSlots.map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => { setField("pickup_time", slot); markTouched("pickup_time"); }}
                  className={`cursor-pointer rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
                    form.pickup_time === slot
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Notes card */}
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-zinc-400">
              Note (optionnel)
            </h2>
            <p className="mb-4 text-xs text-zinc-400">Allergie, demande spéciale…</p>
            <textarea
              value={form.notes}
              onChange={e => setField("notes", e.target.value)}
              placeholder="Ex : sans wasabi, baguettes x2…"
              rows={3}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-zinc-400 focus:bg-white"
            />
          </div>
        </div>

        {/* ── Summary ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">

            <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400">
                Votre commande
              </h2>

              <div className="space-y-3">
                {items.map(it => (
                  <div key={it.id} className="flex items-center gap-3">
                    <ProductImage
                      src={it.image_main}
                      alt={it.name}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-zinc-800">{it.name}</p>
                      <p className="text-xs text-zinc-400">{it.quantity} × {formatEUR(it.price)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-zinc-900">
                      {formatEUR(Number(it.price) * it.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="my-4 h-px bg-zinc-100" />

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-zinc-500">
                  <span>Sous-total</span>
                  <span>{formatEUR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Frais</span>
                  <span className="font-medium text-emerald-600">Gratuit</span>
                </div>
              </div>

              <div className="my-4 h-px bg-zinc-100" />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-600">Total</span>
                <span className="text-xl font-bold text-zinc-900">{formatEUR(subtotal)}</span>
              </div>

              {form.pickup_time && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2.5">
                  <FaClock className="shrink-0 text-zinc-400 text-xs" />
                  <p className="text-xs text-zinc-600">
                    Retrait prévu à <span className="font-bold text-zinc-900">{form.pickup_time}</span>
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handlePay}
                disabled={!canSubmit}
                className={`mt-5 w-full cursor-pointer rounded-xl py-3.5 text-sm font-semibold transition active:scale-[.98] ${
                  canSubmit
                    ? "bg-zinc-900 text-white hover:bg-zinc-700"
                    : "cursor-not-allowed bg-zinc-100 text-zinc-400"
                }`}
              >
                {loading ? "Redirection…" : "Payer maintenant"}
              </button>

              <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-4">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <FaShieldAlt className="shrink-0 text-zinc-300" />
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
