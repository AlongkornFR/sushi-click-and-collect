"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MUTE_KEY = "staff_sound_muted";
const BASE_TITLE = "Espace staff · Su-Rice";

/**
 * Lot A2 : prévient le staff à l'arrivée d'une commande payée.
 * - un son (généré par le navigateur, pas de fichier audio),
 * - un bandeau par commande, à marquer « Vu »,
 * - le nombre de commandes non vues dans le titre de l'onglet.
 *
 * Les navigateurs (et surtout les tablettes) n'autorisent le son qu'après
 * un premier appui sur l'écran : `soundBlocked` est vrai tant que ce n'est
 * pas fait, pour afficher un bouton « Activer le son ».
 */
export function useNewOrderAlert(orders, loaded) {
  const seenRef = useRef(new Set());
  const initializedRef = useRef(false);
  const audioRef = useRef(null);

  const [alerts, setAlerts] = useState([]);
  const [muted, setMuted] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(true);

  useEffect(() => {
    try { setMuted(localStorage.getItem(MUTE_KEY) === "1"); } catch {}
  }, []);

  // Crée ou réveille le contexte audio ; doit être appelé pendant un geste.
  const unlockSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioRef.current = new Ctx();
      }
      const ctx = audioRef.current;
      const done = () => setSoundBlocked(ctx.state !== "running");
      if (ctx.state === "suspended") ctx.resume().then(done, done);
      else done();
    } catch {
      // Pas de son possible sur cet appareil : le bandeau suffit.
    }
  }, []);

  // Le premier appui n'importe où sur la page débloque le son.
  useEffect(() => {
    const onFirstTouch = () => unlockSound();
    document.addEventListener("pointerdown", onFirstTouch);
    return () => document.removeEventListener("pointerdown", onFirstTouch);
  }, [unlockSound]);

  const playChime = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx || ctx.state !== "running") return;
    // Trois notes montantes, jouées deux fois : audible en cuisine.
    const notes = [880, 1108.73, 1318.51];
    for (let repeat = 0; repeat < 2; repeat++) {
      notes.forEach((freq, i) => {
        const start = ctx.currentTime + repeat * 0.9 + i * 0.18;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    }
  }, []);

  // Détection des nouvelles commandes payées.
  useEffect(() => {
    if (!loaded) return;
    const paid = orders.filter(o => o.status === "paid");
    // Premier chargement : ce qui est déjà là n'est pas « nouveau ».
    if (!initializedRef.current) {
      paid.forEach(o => seenRef.current.add(o.id));
      initializedRef.current = true;
      return;
    }
    const fresh = paid.filter(o => !seenRef.current.has(o.id));
    if (fresh.length === 0) return;
    fresh.forEach(o => seenRef.current.add(o.id));
    setAlerts(prev => [...prev, ...fresh.map(o => ({
      id: o.id,
      name: o.full_name,
      pickup: o.pickup_label || o.pickup_time,
    }))]);
    if (!muted) playChime();
  }, [orders, loaded, muted, playChime]);

  // Titre de l'onglet : « (2) Nouvelle commande »
  useEffect(() => {
    document.title = alerts.length > 0
      ? `(${alerts.length}) Nouvelle commande · Su-Rice`
      : BASE_TITLE;
  }, [alerts.length]);
  useEffect(() => () => { document.title = BASE_TITLE; }, []);

  const dismiss = (id) => setAlerts(prev => prev.filter(a => a.id !== id));
  const dismissAll = () => setAlerts([]);

  const toggleMute = () => {
    setMuted(m => {
      const next = !m;
      try { localStorage.setItem(MUTE_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
    unlockSound();
  };

  const testSound = () => {
    unlockSound();
    setTimeout(playChime, 50);
  };

  return { alerts, dismiss, dismissAll, muted, toggleMute, soundBlocked, unlockSound, testSound };
}
