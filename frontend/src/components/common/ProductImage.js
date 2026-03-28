"use client";

import { DEFAULT_PRODUCT_IMAGE } from "@/utils/constant";

export default function ProductImage({ src, alt, className }) {
  return (
    <img
      src={src?.trim() || DEFAULT_PRODUCT_IMAGE}
      onError={e => { e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; }}
      alt={alt || ""}
      className={className}
    />
  );
}
