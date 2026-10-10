import type { MetadataRoute } from "next";

/** PWA installable : l'espace recruteur et la page d'épreuve, hors ligne après le premier chargement. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "La méthode des 5 portes · Contre-Intuitif",
    short_name: "5 portes",
    description: "Recruter les talents neurodivergents en changeant le test, pas la personne.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAF7EF",
    theme_color: "#FAF7EF",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
