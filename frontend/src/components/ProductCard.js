import Link from "next/link"
import { DEFAULT_PRODUCT_IMAGE } from "@/utils/constant"

export default function ProductCard({ product }) {
  return (
    <Link href={`/product/${product.slug}`}>
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition overflow-hidden cursor-pointer">
        <img
          src={product.image_main?.trim() || DEFAULT_PRODUCT_IMAGE}
          onError={(e) => (e.currentTarget.src = DEFAULT_PRODUCT_IMAGE)}
          alt={product.name}
          className="h-48 w-full object-cover"
        />

        <div className="p-4">
          <h3 className="font-semibold text-lg">{product.name}</h3>
          <p className="text-gray-500 text-sm line-clamp-2">
            {product.description}
          </p>

          <div className="mt-3 flex justify-between items-center">
            <span className="font-bold text-lg">
              {product.price} €
            </span>
            <span className="text-sm text-gray-400">
              Voir
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
