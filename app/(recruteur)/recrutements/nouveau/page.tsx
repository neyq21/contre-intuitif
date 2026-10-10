import { Suspense } from "react";
import { NouveauRecrutement } from "@/composants/recrutements/NouveauRecrutement";
import { Chargement } from "@/composants/ui";

export const metadata = { title: "Nouveau recrutement" };

export default function Page() {
  return (
    <Suspense fallback={<Chargement />}>
      <NouveauRecrutement />
    </Suspense>
  );
}
