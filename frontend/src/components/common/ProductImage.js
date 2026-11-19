"use client";

import { DEFAULT_PRODUCT_IMAGE } from "@/utils/constant";

export default function ProductImage({ src, alt, className }) {
  return (
    <img
      src={src?.trim() || DEFAULT_PRODUCT_IMAGE}
      loading="lazy"
      decoding="async"
      onError={e => {
        // Une seule bascule vers l'image de secours (évite une boucle si elle échoue aussi)
        if (e.currentTarget.dataset.fallback) return;
        e.currentTarget.dataset.fallback = "1";
        e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
      }}
      alt={alt || ""}
      className={className}
    />
  );
}
