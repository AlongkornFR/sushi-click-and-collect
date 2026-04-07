import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/components/context/CartContext";
import Navbar from "@/components/common/NavBar";
import "./globals.css";
import Footer from "@/components/common/Footer";

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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CartProvider>
          <Navbar />
          <div className="pt-8">{children}</div>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
