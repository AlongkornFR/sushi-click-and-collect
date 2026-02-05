"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { api } from "@/services/api"

function formatEURFromCents(cents) {
  const euros = (Number(cents) || 0) / 100
  return euros.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
}

export default function SuccessPage() {
  const sp = useSearchParams()
  const orderId = sp.get("order_id")

  const [order, setOrder] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      setError("order_id manquant dans l’URL.")
      return
    }

    let cancelled = false
    let tries = 0

    const fetchOrder = async () => {
      try {
        const res = await api.get(`orders/${orderId}/`)
        if (cancelled) return
        setOrder(res.data)
        setError("")
        setLoading(false)

        // ✅ Poll tant que pas "paid" (utile quand l’IPN met quelques secondes)
        if (res.data.status !== "paid" && tries < 10) {
          tries += 1
          setTimeout(fetchOrder, 1500)
        }
      } catch (e) {
        if (cancelled) return
        setLoading(false)
        setError("Impossible de récupérer la commande.")
      }
    }

    fetchOrder()
    return () => { cancelled = true }
  }, [orderId])

  if (loading) {
    return <div className="max-w-3xl mx-auto px-6 py-20">Chargement...</div>
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="text-3xl font-bold">Oups</h1>
        <p className="text-gray-600 mt-3">{error}</p>
        <Link href="/menu" className="inline-block mt-8 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition">
          Revenir au menu
        </Link>
      </div>
    )
  }

  const paid = order?.status === "paid"

  return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <h1 className="text-3xl font-bold">
  {paid ? "Paiement confirmé ✅" : "Paiement refusé / non confirmé ❌"}
</h1>

      <p className="text-gray-600 mt-3">
        {paid
          ? "Merci ! Votre commande est confirmée et va être préparée."
          : "Votre paiement est en cours de confirmation. Cela peut prendre quelques secondes."}
      </p>

      <div className="mt-8 bg-white border rounded-2xl p-6 text-left">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Commande</span>
          <span>#{order.id}</span>
        </div>

        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>Statut</span>
          <span className="font-semibold">{order.status}</span>
        </div>

        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>Total</span>
          <span className="font-semibold">{formatEURFromCents(order.total_cents)}</span>
        </div>

        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>Retrait</span>
          <span className="font-semibold">{order.pickup_time}</span>
        </div>

        <div className="mt-5 pt-5 border-t">
          <div className="font-semibold mb-2">Détails</div>
          <div className="space-y-2 text-sm">
            {order.items?.map((it) => (
              <div key={it.id} className="flex justify-between">
                <span>{it.product_name} × {it.quantity}</span>
                <span>{formatEURFromCents(it.line_total_cents)}</span>
              </div>
            ))}
          </div>
          {!paid && (
  <div className="mt-8 flex gap-3 justify-center flex-wrap">
    <button
      onClick={() => {
        if (order.payment_url) window.location.href = order.payment_url
      }}
      className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition"
    >
      Réessayer le paiement
    </button>

    <Link
      href="/cart"
      className="px-6 py-3 rounded-xl border hover:bg-gray-100 transition"
    >
      Retour au panier
    </Link>
  </div>
)}
        </div>
        
      </div>

      <Link href="/menu" className="inline-block mt-10 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition">
        Revenir au menu
      </Link>
    </div>
  )
}
