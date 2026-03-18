"use client"

import Link from "next/link"
import Image from "next/image"
import { useCart } from "@/components/context/CartContext"
import Logo from "../../../public/Surice_logo.webp"

export default function Navbar() {
  const { count } = useCart()

  return (
    <nav className="w-full border-b bg-white fixed top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo */}
          <div className="flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-2xl font-bold tracking-tight">
          <Image src={Logo} alt="Su Rice Logo" className="" width={50} height={50} />
          </Link>
          <Link href="/menu" className="hover:text-gray-500 transition">
              Carte
            </Link>
          <div className="w-px h-6 bg-gray-300"></div>
          <Link href="https://www.google.com/maps/place/Su-Rice/@43.5585923,7.0140804,17z/data=!3m1!4b1!4m6!3m5!1s0x12ce816d613a0a6d:0xccffb8a670629cf8!8m2!3d43.5585884!4d7.0166553!16s%2Fg%2F11krh5b4jt?entry=ttu&g_ep=EgoyMDI2MDMwNC4xIKXMDSoASAFQAw%3D%3D" target="_blank" className="hover:text-gray-500 transition flex items-center gap-2">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </Link>
          </div>

          {/* Links */}
        <div className="flex items-center gap-8 text-sm font-medium">
          
          <Link href="/contact" className="hover:text-gray-500 transition">
            Contact
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
