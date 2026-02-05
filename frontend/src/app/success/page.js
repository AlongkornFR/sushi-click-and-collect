import Link from "next/link"

export default function SuccessPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <h1 className="text-3xl font-bold">Commande enregistrée ✅</h1>
      <p className="text-gray-600 mt-3">
        Merci ! Votre commande est en cours de traitement.
      </p>

      <Link
        href="/menu"
        className="inline-block mt-8 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition"
      >
        Revenir au menu
      </Link>
    </div>
  )
}
