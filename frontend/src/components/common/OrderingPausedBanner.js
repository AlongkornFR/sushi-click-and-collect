"use client";

import useSWR from "swr";
import { usePathname } from "next/navigation";
import { api } from "@/services/api";

const fetchSchedule = (url) => api.get(url).then(r => r.data);

// Même clé SWR que le checkout : une seule requête pour les deux.
export function useOrderingPause() {
  const { data } = useSWR("opening-hours/", fetchSchedule, {
    revalidateOnFocus: true,
    refreshInterval: 60000,
  });
  return data?.ordering ?? { paused: false };
}

/**
 * Lot A3 : bandeau affiché sur tout le site public quand le staff a mis
 * les commandes en ligne en pause.
 */
export default function OrderingPausedBanner() {
  const pathname = usePathname();
  const pause = useOrderingPause();
  if (pathname.startsWith("/staff") || !pause.paused) return null;

  return (
    // Dans le flux de la page, juste sous la barre de navigation (h-16) :
    // le contenu descend au lieu d'être recouvert.
    <div role="status" className="relative z-40 mt-8 bg-red-600 px-4 py-2.5 text-center text-sm font-semibold text-white">
      {pause.message}
    </div>
  );
}
