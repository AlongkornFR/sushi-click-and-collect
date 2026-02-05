"use client"

import Link from "next/link"
import { useCart } from "@/components/context/CartContext"

export default function Navbar() {
  const { count } = useCart()

  return (
    <nav className="w-full border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="text-2xl font-bold tracking-tight">
          Su<span className="font-light">Rice</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-8 text-sm font-medium">
          <Link href="/" className="hover:text-gray-500 transition">
            Accueil
          </Link>
          <Link href="/menu" className="hover:text-gray-500 transition">
            Menu
          </Link>
          <Link href="/cart" className="relative hover:text-gray-500 transition">
            Panier

            {count > 0 && (
              <span className="absolute -top-2 -right-3 bg-black text-white text-xs rounded-full px-2 py-0.5">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  )
}
