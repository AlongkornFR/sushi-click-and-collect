"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCart } from "@/components/context/CartContext"

function formatEUR(value) {
  const n = Number(value) || 0
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim())
}

function isValidPhone(phone) {
  // simple validation FR-ish (light)
  const p = String(phone || "").replace(/\s/g, "")
  return p.length >= 9
}

function buildPickupSlots() {
  // slots toutes les 15 min, de 11:30 à 14:00 puis 18:00 à 22:00 (modifiable)
  const slots = []

  const make = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  const pushRange = (h1, m1, h2, m2) => {
    let h = h1, m = m1
    while (h < h2 || (h === h2 && m <= m2)) {
      slots.push(make(h, m))
      m += 15
      if (m >= 60) { m = 0; h += 1 }
    }
  }

  pushRange(11, 30, 14, 0)
  pushRange(18, 0, 22, 0)

  return slots
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, clear } = useCart()

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    pickup_time: "",
    notes: "",
  })

  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const pickupSlots = useMemo(() => buildPickupSlots(), [])

  useEffect(() => {
    // Si panier vide -> retour menu
    if (items.length === 0) router.replace("/cart")
  }, [items.length, router])

  const itemsPayload = useMemo(() => {
    return items.map((x) => ({
      product_id: x.id,
      quantity: x.quantity,
    }))
  }, [items])

  const validation = useMemo(() => {
    const e = {}
    if (!form.full_name.trim()) e.full_name = "Nom obligatoire"
    if (!isValidEmail(form.email)) e.email = "Email invalide"
    if (!isValidPhone(form.phone)) e.phone = "Téléphone invalide"
    if (!form.pickup_time) e.pickup_time = "Choisissez une heure de retrait"
    if (items.length === 0) e.cart = "Panier vide"
    return e
  }, [form, items.length])

  const canSubmit = Object.keys(validation).length === 0 && !loading

  const setField = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }))
  }

  const markTouched = (name) => setTouched((t) => ({ ...t, [name]: true }))

  async function handlePay() {
    setError("")
    setTouched({
      full_name: true,
      email: true,
      phone: true,
      pickup_time: true,
      notes: true,
    })

    if (!canSubmit) {
      setError("Veuillez corriger les champs en rouge.")
      return
    }

    setLoading(true)
    try {
      // ✅ Ici on appellera le backend pour créer la commande + init Payplug
      // Pour l’instant : on simule une création et on redirige vers une future page success.
      // Prochaine étape: POST /api/checkout/ -> returns { payment_url } puis router.push(payment_url)

      // Exemple payload attendu côté backend:
      const payload = {
        customer: {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
        pickup_time: form.pickup_time,
        notes: form.notes?.trim() || "",
        items: itemsPayload,
      }

      console.log("CHECKOUT PAYLOAD:", payload)

      // Simulation (à remplacer par appel API)
      await new Promise((r) => setTimeout(r, 600))

      // On vide le panier au succès (en vrai: après confirmation paiement webhook)
      clear()
      router.push("/success")
    } catch (e) {
      console.error(e)
      setError("Impossible de démarrer le paiement. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) return null

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Finaliser la commande</h1>
          <p className="text-gray-500 mt-1">
            Paiement sécurisé • Click & Collect
          </p>
        </div>

        <Link href="/cart" className="text-sm font-medium hover:underline">
          ← Retour au panier
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORM */}
        <div className="lg:col-span-2 bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-xl font-semibold">Vos informations</h2>

          {error && (
            <div className="mt-4 p-3 rounded-xl border text-sm text-red-700 bg-red-50">
              {error}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <Field
              label="Nom & prénom"
              value={form.full_name}
              onChange={(v) => setField("full_name", v)}
              onBlur={() => markTouched("full_name")}
              placeholder="Ex : Along K."
              error={touched.full_name ? validation.full_name : ""}
            />

            {/* Phone */}
            <Field
              label="Téléphone"
              value={form.phone}
              onChange={(v) => setField("phone", v)}
              onBlur={() => markTouched("phone")}
              placeholder="Ex : 06 12 34 56 78"
              error={touched.phone ? validation.phone : ""}
            />

            {/* Email (full width) */}
            <div className="md:col-span-2">
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => setField("email", v)}
                onBlur={() => markTouched("email")}
                placeholder="Ex : you@email.com"
                error={touched.email ? validation.email : ""}
              />
            </div>

            {/* Pickup */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium">
                Heure de retrait
              </label>

              <select
                className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none transition ${
                  touched.pickup_time && validation.pickup_time
                    ? "border-red-400"
                    : "border-gray-200 focus:border-black"
                }`}
                value={form.pickup_time}
                onChange={(e) => setField("pickup_time", e.target.value)}
                onBlur={() => markTouched("pickup_time")}
              >
                <option value="">Choisir un créneau</option>
                {pickupSlots.map((s) => (
                  <option key={s} value={s}>
                    Aujourd’hui • {s}
                  </option>
                ))}
              </select>

              {touched.pickup_time && validation.pickup_time && (
                <p className="mt-2 text-sm text-red-600">{validation.pickup_time}</p>
              )}

              <p className="mt-2 text-xs text-gray-500">
                Les créneaux proposés sont indicatifs. Nous préparons au plus proche de l’heure choisie.
              </p>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Note (optionnel)</label>
              <textarea
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-black transition min-h-24"
                placeholder="Ex : sans wasabi, baguettes x2..."
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                onBlur={() => markTouched("notes")}
              />
            </div>
          </div>

          <div className="mt-8 flex items-start gap-3">
            <div className="h-2 w-2 rounded-full bg-black mt-2" />
            <p className="text-sm text-gray-600">
              Paiement sécurisé : vos informations sont protégées. Vous recevrez un récapitulatif par email.
            </p>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 h-fit">
          <h2 className="text-xl font-semibold">Récapitulatif</h2>

          <div className="mt-4 space-y-3">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between gap-4 text-sm">
                <div className="text-gray-700">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-gray-500">
                    {it.quantity} × {formatEUR(it.price)}
                  </div>
                </div>
                <div className="font-semibold">
                  {formatEUR(Number(it.price) * it.quantity)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Sous-total</span>
              <span>{formatEUR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Frais</span>
              <span>—</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t flex justify-between items-center">
            <span className="text-gray-600">Total</span>
            <span className="text-lg font-bold">{formatEUR(subtotal)}</span>
          </div>

          <button
            onClick={handlePay}
            disabled={!canSubmit}
            className={`mt-6 w-full px-6 py-3 rounded-xl transition font-medium
              ${canSubmit ? "bg-black text-white hover:bg-gray-800" : "bg-gray-200 text-gray-500 cursor-not-allowed"}
            `}
          >
            {loading ? "Chargement..." : "Payer maintenant"}
          </button>

          <p className="mt-4 text-xs text-gray-500">
            En cliquant sur “Payer maintenant”, vous serez redirigé vers le paiement sécurisé Payplug.
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, onBlur, placeholder, error }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none transition ${
          error ? "border-red-400" : "border-gray-200 focus:border-black"
        }`}
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
