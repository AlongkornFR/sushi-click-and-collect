"use client";

import { createContext, useContext, useState } from "react";

const ThemeCtx = createContext({ dark: true, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

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
