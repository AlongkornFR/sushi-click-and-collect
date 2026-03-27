import Link from "next/link";
import { DEFAULT_PRODUCT_IMAGE } from "@/utils/constant";

export default function FeaturedProductCard({ product }) {
  if (!product) return null;

  const category = product.category?.name;

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-zinc-100 min-h-105 md:min-h-140">
      {/* Image with subtle zoom on hover */}
      <img
        src={product.image_main?.trim() || DEFAULT_PRODUCT_IMAGE}
        onError={(e) => (e.currentTarget.src = DEFAULT_PRODUCT_IMAGE)}
        alt={product.name}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
      />

      {/* Gradient overlay — stronger at bottom */}
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
        {category && (
          <span className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur-sm">
            {category}
          </span>
        )}

        <p className="text-xl font-bold leading-snug text-white md:text-2xl">
          {product.name}
        </p>

        {product.price && (
          <p className="mt-1 text-sm font-medium text-white/60">
            {product.price} €
          </p>
        )}

        <Link
          href="/menu"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-zinc-100 active:scale-95"
        >
          Commander
          <span className="text-xs">→</span>
        </Link>
      </div>
    </div>
  );
}
