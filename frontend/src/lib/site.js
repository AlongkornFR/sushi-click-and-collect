// Adresse publique du site, utilisée pour le référencement (URL canoniques,
// sitemap, données structurées).
//
// Le site tourne pour l'instant sur une adresse Vercel temporaire, en
// attendant que su-rice.com pointe vers lui. Pendant cette période, il ne
// doit pas être indexé : sinon Google le mettrait en concurrence avec
// l'ancien site encore en ligne sur su-rice.com.
//
// Le jour du passage : définir NEXT_PUBLIC_SITE_URL=https://su-rice.com sur
// Vercel. L'indexation s'active alors automatiquement.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://sushi-click-and-collect.vercel.app").replace(/\/$/, "");

export const FINAL_DOMAIN = "https://su-rice.com";

export const INDEXABLE = SITE_URL === FINAL_DOMAIN || SITE_URL === "https://www.su-rice.com";
