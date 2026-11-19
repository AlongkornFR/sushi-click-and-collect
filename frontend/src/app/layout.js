import { CartProvider } from "@/components/context/CartContext";
import { ThemeProvider } from "@/components/context/ThemeContext";
import { AuthProvider } from "@/components/context/AuthContext";
import Navbar from "@/components/common/NavBar";
import "./globals.css";
import Footer from "@/components/common/Footer";
import { Analytics } from "@vercel/analytics/next";

const SITE_URL = "https://su-rice.com";
const DESCRIPTION =
  "Sushis, makis et plats thaïlandais à commander en ligne et à retirer au 53 boulevard Carnot, à Cannes. Retrait du lundi au vendredi, midi et soir.";

// Lot M8 : titre par page, description, aperçus de partage.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Su-Rice : sushis et cuisine thaïe à emporter à Cannes",
    template: "%s · Su-Rice",
  },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Su-Rice",
    url: SITE_URL,
    title: "Su-Rice : sushis et cuisine thaïe à emporter à Cannes",
    description: DESCRIPTION,
  },
};

// Données structurées pour Google (référencement local). Uniquement des
// faits déjà affichés sur le site ; horaires validés le 19/11/2026.
const RESTAURANT_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "Su-Rice",
  url: SITE_URL,
  telephone: "+33493680812",
  email: "contact@su-rice.com",
  servesCuisine: ["Japonaise", "Thaïlandaise"],
  hasMenu: `${SITE_URL}/menu`,
  acceptsReservations: false,
  address: {
    "@type": "PostalAddress",
    streetAddress: "53 boulevard Carnot",
    postalCode: "06400",
    addressLocality: "Cannes",
    addressCountry: "FR",
  },
  geo: { "@type": "GeoCoordinates", latitude: 43.5585884, longitude: 7.0166553 },
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"], opens: "12:00", closes: "14:30" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"], opens: "19:15", closes: "21:45" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Friday", opens: "12:00", closes: "14:30" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Friday", opens: "19:15", closes: "22:00" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(RESTAURANT_JSON_LD) }}
        />
        {/* Prevent theme flash: set class before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark');}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`font-sans antialiased bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white`}
      >
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <Navbar />
              <div className="pt-8">{children}</div>
              <Footer />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
