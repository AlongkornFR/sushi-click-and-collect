// Métadonnées de la route (lot M8). La page est un composant client et
// ne peut pas les déclarer elle-même.
export const metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site Su-Rice.",
  alternates: { canonical: "/mentions-legales" },
};

export default function Layout({ children }) {
  return children;
}
