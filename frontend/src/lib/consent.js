// Choix du visiteur sur les cookies (RGPD / recommandations CNIL).
//
// Seul contenu concerné aujourd'hui : la carte Google Maps du pied de page,
// qui dépose des cookies Google. Vercel Analytics n'utilise pas de cookies
// et reste actif. Le choix est gardé 6 mois, puis on redemande.
import { useSyncExternalStore } from "react";

const KEY = "cookie_consent";
const MAX_AGE_MS = 182 * 24 * 60 * 60 * 1000; // 6 mois
const EVENT = "cookie-consent-change";
const OPEN_EVENT = "cookie-consent-open";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { value, at } = JSON.parse(raw);
    if (value !== "accepted" && value !== "refused") return null;
    if (!at || Date.now() - at > MAX_AGE_MS) return null;
    return value;
  } catch {
    return null;
  }
}

let cached;
function snapshot() {
  if (cached === undefined) cached = read();
  return cached;
}

function subscribe(callback) {
  const onChange = () => { cached = read(); callback(); };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** "accepted", "refused", null (pas encore choisi) ; "pending" côté serveur. */
export function useCookieConsent() {
  return useSyncExternalStore(subscribe, snapshot, () => "pending");
}

export function setCookieConsent(value) {
  try { localStorage.setItem(KEY, JSON.stringify({ value, at: Date.now() })); } catch {}
  cached = undefined;
  window.dispatchEvent(new Event(EVENT));
}

/** Rouvre la bannière (lien « Gérer les cookies » du pied de page). */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onCookieSettingsOpen(callback) {
  window.addEventListener(OPEN_EVENT, callback);
  return () => window.removeEventListener(OPEN_EVENT, callback);
}
