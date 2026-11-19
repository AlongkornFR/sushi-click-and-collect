// robots.txt (lot M8) : pages publiques indexables, parcours de commande et
// espaces privés exclus.
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/staff", "/account", "/cart", "/checkout", "/success", "/cancel"],
    },
    sitemap: "https://su-rice.com/sitemap.xml",
  };
}
