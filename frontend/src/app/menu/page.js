"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import ProductCard from "@/components/ProductCard"

export default function MenuPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState("all")

  useEffect(() => {
    api.get("products/").then(res => setProducts(res.data))
  }, [])

  useEffect(() => {
    const cats = ["all", ...new Set(products.map(p => p.category.name))]
    setCategories(cats)
  }, [products])

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter(p => p.category.name === selectedCategory)

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">

      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold">Notre Menu</h1>
        <p className="text-gray-500 mt-2">
          Commandez en ligne, récupérez sur place
        </p>
      </div>

      {/* Filtres */}
      <div className="flex justify-center gap-4 mb-12 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-full border transition
              ${
                selectedCategory === cat
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }
            `}
          >
            {cat === "all" ? "Tous" : cat}
          </button>
        ))}
      </div>

      {/* Produits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

    </div>
  )
}
