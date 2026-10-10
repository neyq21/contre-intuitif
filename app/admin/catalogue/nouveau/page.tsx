import Link from "next/link";
import { exigerAdmin } from "@/lib/admin/session";
import { lireBase, lireDomaines, lireMetier, ouvrirBase } from "@/lib/stockage/sqlite";
import { identifiantDepuisNom, lireDemande, packVide } from "@/lib/stockage/admin";
import { EditeurMetier } from "@/composants/admin/EditeurMetier";

export const dynamic = "force-dynamic";

export default async function PageNouveauMetier({ searchParams }: { searchParams: Promise<{ demande?: string; intitule?: string }> }) {
  await exigerAdmin();
  const { demande, intitule } = await searchParams;
  const db = ouvrirBase();
  const base = lireBase(db);
  const domaines = lireDomaines(db);
  const d = demande ? lireDemande(db, demande) : null;
  const nom = d?.intitule ?? intitule ?? "Nouveau métier";
  let id = identifiantDepuisNom(nom);
  let n = 2;
  while (lireMetier(db, id)) id = `${identifiantDepuisNom(nom)}-${n++}`;
  const pack = packVide(id, nom, domaines[0]?.id ?? "bureau", base);
  if (d) pack.contexte = d.contexte;
  return (
    <div className="space-y-4">
      <Link href="/admin/catalogue" className="text-sm underline">
        ← Catalogue
      </Link>
      <h1 className="text-3xl">Nouveau métier</h1>
      <p className="aide">
        Pack vide prérempli{d ? ` avec l'intitulé de la demande « ${d.intitule} »` : ""}. Domaines possibles : {domaines.map((x) => x.id).join(", ")}. Le métier est créé en brouillon ; publiez-le depuis le catalogue quand il est prêt.
      </p>
      {d ? (
        <details className="carte text-sm">
          <summary className="cursor-pointer">La demande</summary>
          <p className="mt-2 whitespace-pre-wrap">
            <strong>Contexte :</strong> {d.contexte}
            {"\n"}
            <strong>Tâches :</strong> {d.taches}
            {"\n"}
            <strong>Contraintes :</strong> {d.contraintes}
          </p>
        </details>
      ) : null}
      <EditeurMetier initial={pack} base={base} nouveau statut="brouillon" demandeId={d?.id} />
    </div>
  );
}
