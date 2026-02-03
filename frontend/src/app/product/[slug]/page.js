"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { api } from "@/services/api"
import { DEFAULT_PRODUCT_IMAGE } from "@/utils/constant"

export default function ProductPage() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)

  useEffect(() => {
    if (!slug) return

    api.get(`products/${slug}/`)
      .then(res => setProduct(res.data))
      .catch(err => console.error(err))
  }, [slug])

  if (!product) {
    return <div className="p-10">Chargement...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-10 grid grid-cols-2 gap-10">
     
<img
  src={product.image_main?.trim() || DEFAULT_PRODUCT_IMAGE}
  onError={(e) => {
    e.currentTarget.src = DEFAULT_PRODUCT_IMAGE
  }}
  alt={product.name}
  className="rounded-xl shadow object-cover"
/>


      <div>
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <p className="text-gray-600 mt-4">{product.description}</p>

        <div className="text-2xl font-semibold mt-6">
          {product.price} €
        </div>

        <button className="mt-6 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition">
          Ajouter au panier
        </button>
      </div>
    </div>
  )
}
