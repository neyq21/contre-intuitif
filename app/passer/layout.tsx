import { FournisseurDonnees } from "@/composants/donnees/FournisseurDonnees";

/** Épreuve sur l'ordinateur du recruteur : plein écran, sans le rail de navigation. */
export default function LayoutPasser({ children }: { children: React.ReactNode }) {
  return (
    <FournisseurDonnees>
      <main id="contenu" className="flex-1 px-4 py-6 tel:px-8 tel:py-10">
        {children}
      </main>
    </FournisseurDonnees>
  );
}
