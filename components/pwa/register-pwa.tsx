"use client";

import { useEffect } from "react";

/** Registers the service worker (production only, to keep dev HMR clean). */
export function RegisterPWA() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
