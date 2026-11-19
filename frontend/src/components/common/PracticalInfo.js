"use client";

import useSWR from "swr";
import { api } from "@/services/api";
import { FaClock, FaMapMarkerAlt, FaPhone } from "react-icons/fa";

const fetchSchedule = (url) => api.get(url).then(r => r.data);

// Jours JavaScript (0 = dimanche) dans l'ordre de la semaine française.
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = { 0: "dim.", 1: "lun.", 2: "mar.", 3: "mer.", 4: "jeu.", 5: "ven.", 6: "sam." };

const fmt = (hhmm) => hhmm.replace(":", "h");
const servicesText = (services) =>
  services.length === 0 ? "Fermé" : services.map(([s, e]) => `${fmt(s)} – ${fmt(e)}`).join(" et ");

// Regroupe les jours consécutifs qui ont les mêmes horaires : « lun. – jeu. ».
function groupDays(days) {
  const groups = [];
  for (const d of WEEK) {
    const text = servicesText(days[String(d)] || []);
    const last = groups[groups.length - 1];
    if (last && last.text === text) last.to = d;
    else groups.push({ from: d, to: d, text });
  }
  return groups.map(g => ({
    label: g.from === g.to ? DAY_NAMES[g.from] : `${DAY_NAMES[g.from]} – ${DAY_NAMES[g.to]}`,
    text: g.text,
  }));
}

/**
 * Lot M12 : horaires, adresse et téléphone visibles dès l'accueil. Les
 * horaires viennent de la même source que les créneaux du checkout.
 */
export default function PracticalInfo() {
  const { data: schedule } = useSWR("opening-hours/", fetchSchedule, { revalidateOnFocus: false });

  return (
    <section aria-labelledby="practical-info-title" className="border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-black">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 md:grid-cols-3">
        <h2 id="practical-info-title" className="sr-only">Infos pratiques</h2>

        <div className="flex gap-3">
          <FaClock className="mt-1 shrink-0 text-amber-700 dark:text-[#FFC366]" aria-hidden="true" />
          <div>
            <p className="font-semibold text-zinc-900 dark:text-white">Retrait sur place</p>
            {schedule ? (
              <dl className="mt-1 space-y-0.5 text-sm text-zinc-600 dark:text-white/70">
                {groupDays(schedule.days).map(g => (
                  <div key={g.label} className="flex gap-2">
                    <dt className="w-24 shrink-0">{g.label}</dt>
                    <dd>{g.text}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-1 text-sm text-zinc-600 dark:text-white/70">Du lundi au vendredi, midi et soir.</p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <FaMapMarkerAlt className="mt-1 shrink-0 text-amber-700 dark:text-[#FFC366]" aria-hidden="true" />
          <div>
            <p className="font-semibold text-zinc-900 dark:text-white">Adresse</p>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Su-Rice%2053%20boulevard%20Carnot%20Cannes"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-white/70"
            >
              53 boulevard Carnot, 06400 Cannes
            </a>
          </div>
        </div>

        <div className="flex gap-3">
          <FaPhone className="mt-1 shrink-0 text-amber-700 dark:text-[#FFC366]" aria-hidden="true" />
          <div>
            <p className="font-semibold text-zinc-900 dark:text-white">Une question ?</p>
            <a href="tel:+33493680812" className="mt-1 block text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-white/70">
              04 93 68 08 12
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
