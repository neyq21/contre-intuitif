"use client";

import { useEffect } from "react";

/** Enregistre le service worker (cache de l'application recruteur et de l'épreuve). */
export function Pwa() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.pathname.startsWith("/admin")) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
