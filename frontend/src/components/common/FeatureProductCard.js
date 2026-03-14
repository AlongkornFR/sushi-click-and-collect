import Link from "next/link";
import { DEFAULT_PRODUCT_IMAGE } from "@/utils/constant";

export default function FeaturedProductCard({ product }) {
  if (!product) return null;

  return (
    <div className="relative bg-gray-200 overflow-hidden min-h-[420px] md:min-h-[560px]">
      <img
        src={product.image_main?.trim() || DEFAULT_PRODUCT_IMAGE}
        onError={(e) => (e.currentTarget.src = DEFAULT_PRODUCT_IMAGE)}
        alt={product.name}
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/20" />

      <div className="absolute bottom-6 right-6 left-6 flex flex-col items-end gap-3">
        <p className="text-white text-base md:text-lg font-medium drop-shadow">
          {product.name}
        </p>

        <Link
          href={`/product/${product.slug}`}
          className="inline-flex items-center justify-center rounded-full bg-zinc-800 text-white px-8 py-3 text-sm md:text-base font-medium hover:bg-zinc-700 transition"
        >
          Commander
        </Link>
      </div>
    </div>
  );
}