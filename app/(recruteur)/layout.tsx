import { Navigation } from "@/composants/Navigation";
import { FournisseurDonnees } from "@/composants/donnees/FournisseurDonnees";
import { ouvrirBase, lireBase } from "@/lib/stockage/sqlite";

export const dynamic = "force-dynamic";

export default function LayoutRecruteur({ children }: { children: React.ReactNode }) {
  const base = lireBase(ouvrirBase());
  return (
    <FournisseurDonnees>
      <div className="flex-1">
        <a
          href="#contenu"
          className="visuellement-cache focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-surface focus:px-4 focus:py-2 focus:rounded-s"
        >
          Aller au contenu
        </a>
        <Navigation marque={base.meta.marque} slogan={base.meta.slogan} />
        <main
          id="contenu"
          className="contenu-principal min-h-dvh tel:ml-[var(--rail)] px-4 py-6 tel:px-10 tel:py-10 max-tel:pb-24 max-w-[1100px]"
        >
          {children}
        </main>
      </div>
    </FournisseurDonnees>
  );
}
