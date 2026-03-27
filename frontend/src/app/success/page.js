import { Suspense } from "react";
import SuccessPageClient from "./SuccessPageClient";

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-6 py-20">Chargement...</div>}>
      <SuccessPageClient />
    </Suspense>
  );
}