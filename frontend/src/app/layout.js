import { CartProvider } from "@/components/context/CartContext";
import { ThemeProvider } from "@/components/context/ThemeContext";
import { AuthProvider } from "@/components/context/AuthContext";
import Navbar from "@/components/common/NavBar";
import "./globals.css";
import Footer from "@/components/common/Footer";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Su-Rice",
  description: "Restaurant Su-Rice",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
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
