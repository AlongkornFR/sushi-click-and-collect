"use client";

import { useEffect, useState } from "react";
import { isQZAvailable } from "@/lib/printer";

const CHECK_INTERVAL = 10_000; // 10 secondes

export default function PrinterStatus() {
  const [status, setStatus] = useState("checking"); // "checking" | "connected" | "disconnected"

  async function check() {
    setStatus("checking");
    const ok = await isQZAvailable();
    setStatus(ok ? "connected" : "disconnected");
  }

  useEffect(() => {
    check();
    const id = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(id);
  }, []);

  if (status === "checking") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" />
        Imprimante…
      </span>
    );
  }

  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Imprimante prête
      </span>
    );
  }

  // disconnected
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
      QZ Tray non détecté
      <a
        href="https://qz.io/download"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-red-800"
      >
        Télécharger
      </a>
    </span>
  );
}
