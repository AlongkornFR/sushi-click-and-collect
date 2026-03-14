import Link from "next/link";
import { DEFAULT_PRODUCT_IMAGE } from "@/utils/constant";

export default function ProductCard({ product }) {
  return (
    <Link href={`/product/${product.slug}`} className="block">
      <div className="cursor-pointer group">
        <div className="bg-gray-200 aspect-square overflow-hidden">
          <img
            src={product.image_main?.trim() || DEFAULT_PRODUCT_IMAGE}
            onError={(e) => (e.currentTarget.src = DEFAULT_PRODUCT_IMAGE)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div className="pt-2">
          <p className="text-sm text-black leading-snug line-clamp-2">
            {product.name}
          </p>
          <p className="text-sm font-medium text-black">
            {product.price} €
          </p>
        </div>
      </div>
    </Link>
  );
}