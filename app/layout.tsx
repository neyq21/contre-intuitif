import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Pwa } from "@/composants/Pwa";

export const metadata: Metadata = {
  title: {
    default: "La méthode des 5 portes · Contre-Intuitif",
    template: "%s · La méthode des 5 portes",
  },
  description: "Recruter les talents neurodivergents en changeant le test, pas la personne.",
  applicationName: "La méthode des 5 portes",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7EF" },
    { media: "(prefers-color-scheme: dark)", color: "#07070C" },
  ],
};

/**
 * Applique l'ambiance (papier / nuit), le mode lisible et le surlignage des
 * mots clés avant l'hydratation, pour éviter un flash. Ces trois réglages
 * vivent dans localStorage, sur l'ordinateur du recruteur ou du candidat.
 */
const SCRIPT_AMBIANCE = `(function(){try{var d=document.documentElement;var a=localStorage.getItem("ci5p.ambiance");if(a==="nuit"||a==="papier"){d.dataset.ambiance=a}var l=localStorage.getItem("ci5p.lisible");if(l==="1"){d.dataset.lisible="1"}var m=localStorage.getItem("ci5p.mots_cles");if(m==="0"){d.dataset.motsCles="0"}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_AMBIANCE }} />
      </head>
      <body className="min-h-dvh flex flex-col antialiased">
        {children}
        <Pwa />
      </body>
    </html>
  );
}
