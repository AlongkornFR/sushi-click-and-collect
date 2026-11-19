// Métadonnées de la route (lot M8). La page est un composant client et
// ne peut pas les déclarer elle-même.
export const metadata = {
  title: "Mon compte",
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
