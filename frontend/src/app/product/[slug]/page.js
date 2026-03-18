"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/services/api";
import { DEFAULT_PRODUCT_IMAGE } from "@/utils/constant";
import { useCart } from "@/components/context/CartContext";

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const { addItem } = useCart();

  useEffect(() => {
    if (!slug) return;

    api
      .get(`products/${slug}/`)
      .then((res) => setProduct(res.data))
      .catch((err) => console.error(err));
  }, [slug]);

  if (!product) {
    return <div className="p-10">Chargement...</div>;
  }

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-10 p-10 md:grid-cols-2">
      <img
        src={product.image_main?.trim() || DEFAULT_PRODUCT_IMAGE}
        onError={(e) => {
          e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
        }}
        alt={product.name}
        className="rounded-xl shadow object-cover"
      />

      <div>
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <p className="mt-4 text-gray-600">{product.description}</p>

        <div className="mt-6 text-2xl font-semibold">{product.price} €</div>

        <button
          onClick={() => addItem(product, 1)}
          className="mt-6 rounded-xl bg-black px-6 py-3 text-white transition hover:bg-gray-800"
        >
          Ajouter au panier
        </button>
      </div>
    </div>
  );
}