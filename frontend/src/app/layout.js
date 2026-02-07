import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/components/context/CartContext";
import Navbar from "@/components/common/NavBar";
import "./globals.css";

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
          {children}
          </CartProvider>
      </body>
    </html>
  );
}
