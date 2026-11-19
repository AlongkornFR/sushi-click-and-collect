// Métadonnées de la route (lot M8). La page est un composant client et
// ne peut pas les déclarer elle-même.
export const metadata = {
  title: "La carte",
  description: "Sushis, makis, rolls et plats thaïlandais à commander en ligne et à retirer au 53 boulevard Carnot, à Cannes.",
  alternates: { canonical: "/menu" },
};

export default function Layout({ children }) {
  return children;
}
