// Photos servies par Cloudinary à la bonne taille et au meilleur format.
//
// Cloudinary transforme l'image à la volée d'après l'adresse :
//   f_auto  → WebP ou AVIF selon le navigateur
//   q_auto  → compression adaptée, sans perte visible
//   w_<n>   → largeur maximale en pixels
//   c_limit → ne jamais agrandir une petite image
// Les adresses qui ne viennent pas de Cloudinary sont rendues telles quelles.
const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

export function optimizedImage(url, width) {
  const src = (url || "").trim();
  const match = src.match(CLOUDINARY_UPLOAD);
  if (!match || !width) return src;
  const [, base, rest] = match;
  // Déjà transformée (ex. f_auto,…/v123/…) : on ne double pas la transformation.
  if (/^[a-z]_[^/]*\//.test(rest) && !/^v\d+\//.test(rest)) return src;
  const dpr = 2; // écrans haute densité (tablettes, téléphones)
  return `${base}f_auto,q_auto,c_limit,w_${Math.round(width * dpr)}/${rest}`;
}
