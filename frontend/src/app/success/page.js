import { Suspense } from "react";
import SuccessPageClient from "./SuccessPageClient";

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-100 border-t-zinc-900" />
        <p className="text-sm text-zinc-400">Chargement…</p>
      </div>
    }>
      <SuccessPageClient />
    </Suspense>
  );
}