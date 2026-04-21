import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/components/context/CartContext";
import { ThemeProvider } from "@/components/context/ThemeContext";
import Navbar from "@/components/common/NavBar";
import "./globals.css";
import Footer from "@/components/common/Footer";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Su-Rice",
  description: "Restaurant Su-Rice",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Prevent theme flash: set class before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark');}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white`}
      >
        <ThemeProvider>
          <CartProvider>
            <Navbar />
            <div className="pt-8">{children}</div>
            <Footer />
          </CartProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
