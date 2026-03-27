import { Suspense } from "react";
import CancelPageClient from "./CancelPageClient";

export default function CancelPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-6 py-20">Chargement...</div>}>
      <CancelPageClient />
    </Suspense>
  );
}