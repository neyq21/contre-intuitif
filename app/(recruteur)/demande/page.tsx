import { Demande } from "@/composants/Demande";
import { ouvrirBase, lireBase } from "@/lib/stockage/sqlite";
import { REGLAGES_PUBLICS } from "@/lib/reglages";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demander un métier" };

export default function Page() {
  const base = lireBase(ouvrirBase());
  return <Demande promesse={base.catalogue.promesse} delai={base.catalogue.delai} objectif={base.catalogue.objectif} lot={base.catalogue.lot} contact={REGLAGES_PUBLICS.SITE_CONTACT} email={REGLAGES_PUBLICS.EMAIL_DEMANDES_METIER} />;
}
