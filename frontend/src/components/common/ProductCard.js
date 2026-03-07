import Link from "next/link";
import { DEFAULT_PRODUCT_IMAGE } from "@/utils/constant";

export default function ProductCard({ product }) {
  return (
    <Link href={`/product/${product.slug}`}>
      <div className="cursor-pointer group">

        {/* Image */}
        <div className="aspect-square flex items-center justify-center overflow-hidden">
          <img
            src={product.image_main?.trim() || DEFAULT_PRODUCT_IMAGE}
            onError={(e) => (e.currentTarget.src = DEFAULT_PRODUCT_IMAGE)}
            alt={product.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Texte */}
        <div className="pt-3 space-y-1">
          <h3 className="font-medium text-sm">
            {product.name}
          </h3>

          <p className="font-semibold text-sm">
            {product.price} €
          </p>
        </div>

      </div>
    </Link>
  );
}