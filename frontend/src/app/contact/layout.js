// Métadonnées de la route (lot M8). La page est un composant client et
// ne peut pas les déclarer elle-même.
export const metadata = {
  title: "Contact",
  description: "Adresse, téléphone et horaires de Su-Rice à Cannes, et formulaire pour nous écrire.",
  alternates: { canonical: "/contact" },
};

export default function Layout({ children }) {
  return children;
}
