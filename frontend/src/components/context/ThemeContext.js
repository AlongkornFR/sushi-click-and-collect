"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeCtx = createContext({ dark: true, toggle: () => {} });

export function ThemeProvider({ children }) {
  // Même valeur que le rendu serveur (sombre), puis synchronisation avec la
  // classe posée par le script du <head> : évite l'écart d'hydratation en
  // mode clair.
  const [dark, setDark] = useState(true);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    const html = document.documentElement;
    if (next) html.classList.add("dark");
    else html.classList.remove("dark");
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }

  return (
    <ThemeCtx.Provider value={{ dark, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
