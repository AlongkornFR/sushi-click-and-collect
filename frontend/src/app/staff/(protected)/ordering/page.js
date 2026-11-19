import { redirect } from "next/navigation";

// L'onglet « Ordre » est remplacé par « Catégories » (lot A4), qui gère
// aussi l'ordre d'affichage, au doigt.
export default function OrderingRedirect() {
  redirect("/staff/categories");
}
