/* Service worker : l'application recruteur et la page d'épreuve fonctionnent hors ligne
   après le premier chargement. Le catalogue est déjà en cache dans IndexedDB.
   Jamais de cache pour /api/ (sauf rien), ni pour /admin. Aucune donnée de candidat ici. */
const VERSION = "ci5p-v1";
const COQUILLE = ["/", "/metiers", "/recrutements", "/guide", "/donnees", "/exemple", "/e/fichier", "/licence", "/hors-ligne"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => Promise.allSettled(COQUILLE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;

  // Fichiers statiques de l'application : cache d'abord.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icones/") || url.pathname.endsWith(".woff2")) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const enCache = await cache.match(req);
        if (enCache) return enCache;
        const rep = await fetch(req);
        if (rep.ok) cache.put(req, rep.clone());
        return rep;
      }),
    );
    return;
  }

  // Pages : réseau d'abord, puis cache, puis page hors ligne.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        try {
          const rep = await fetch(req);
          if (rep.ok) cache.put(req, rep.clone());
          return rep;
        } catch {
          const enCache = await cache.match(req);
          if (enCache) return enCache;
          // Une page dynamique (recrutement, candidat) non visitée : la coquille de la liste suffit, les données sont dans IndexedDB.
          if (url.pathname.startsWith("/recrutements")) return (await cache.match("/recrutements")) ?? (await cache.match("/hors-ligne"));
          if (url.pathname.startsWith("/metiers")) return (await cache.match("/metiers")) ?? (await cache.match("/hors-ligne"));
          return (await cache.match("/hors-ligne")) ?? Response.error();
        }
      })(),
    );
  }
});
