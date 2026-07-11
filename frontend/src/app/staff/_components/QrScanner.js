"use client";

import { useEffect, useRef, useState } from "react";

const CONTAINER_ID = "loyalty-qr-reader";

export function QrScanner({ onScan }) {
  const scannerRef = useRef(null);
  const [active, setActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    return () => { stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setErrorMsg("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const instance = new Html5Qrcode(CONTAINER_ID);
      scannerRef.current = instance;
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => onScan(decodedText),
        () => {} // per-frame decode misses — ignore
      );
      setActive(true);
    } catch {
      setErrorMsg("Impossible d'accéder à la caméra. Vérifiez les permissions du navigateur.");
    }
  }

  async function stop() {
    const instance = scannerRef.current;
    scannerRef.current = null;
    if (instance) {
      try {
        await instance.stop();
        instance.clear();
      } catch {
        // already stopped
      }
    }
    setActive(false);
  }

  return (
    <div className="space-y-3">
      <div id={CONTAINER_ID} className="mx-auto w-full max-w-xs overflow-hidden rounded-2xl bg-black" />
      {errorMsg && <p className="text-center text-xs text-red-400">{errorMsg}</p>}
      <div className="flex justify-center">
        {!active ? (
          <button
            type="button"
            onClick={start}
            className="cursor-pointer rounded-xl bg-[#FFC366] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ffb347] active:scale-95"
          >
            📷 Démarrer le scanner
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="cursor-pointer rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-white/10"
          >
            Arrêter le scanner
          </button>
        )}
      </div>
    </div>
  );
}
