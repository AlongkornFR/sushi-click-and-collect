import { INDEXABLE, SITE_URL } from "@/lib/site";

// robots.txt (lot M8). Sur l'adresse temporaire, tout est exclu (voir lib/site.js).
export default function robots() {
  if (!INDEXABLE) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/staff", "/account", "/cart", "/checkout", "/success", "/cancel"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
