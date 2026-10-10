import Link from "next/link";
import { exigerAdmin } from "@/lib/admin/session";
import { ouvrirBase, versionCatalogue } from "@/lib/stockage/sqlite";
import { STATUTS_DEMANDE, compterMetiers, enRetard, listerDemandes, listerLicences } from "@/lib/stockage/admin";
import { formaterDateHeure } from "@/lib/ui/dates";

export const dynamic = "force-dynamic";

export default async function TableauDeBord() {
  await exigerAdmin();
  const db = ouvrirBase();
  const metiers = compterMetiers(db);
  const demandes = listerDemandes(db);
  const ouvertes = demandes.filter((d) => d.statut === "recue" || d.statut === "en_cours" || d.statut === "incomplete");
  const retard = demandes.filter((d) => enRetard(d));
  const licences = listerLicences(db).filter((l) => l.statut === "actif");
  const version = versionCatalogue(db);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Tableau de bord</h1>
      <div className="grid gap-3 tel:grid-cols-4">
        <Link href="/admin/catalogue" className="carte hover:bg-surface-2">
          <span className="block text-3xl font-titre">{metiers.publies}</span>
          <span className="text-sm text-texte-2">métiers publiés · {metiers.brouillons} brouillon{metiers.brouillons > 1 ? "s" : ""}</span>
        </Link>
        <Link href="/admin/demandes" className={`carte hover:bg-surface-2 ${retard.length ? "border-rouge" : ""}`}>
          <span className="block text-3xl font-titre">{ouvertes.length}</span>
          <span className="text-sm text-texte-2">
            demande{ouvertes.length > 1 ? "s" : ""} de métier ouverte{ouvertes.length > 1 ? "s" : ""}
            {retard.length ? ` · ${retard.length} au-delà de 72 h ouvrées` : ""}
          </span>
        </Link>
        <Link href="/admin/licences" className="carte hover:bg-surface-2">
          <span className="block text-3xl font-titre">{licences.length}</span>
          <span className="text-sm text-texte-2">licence{licences.length > 1 ? "s" : ""} active{licences.length > 1 ? "s" : ""}</span>
        </Link>
        <div className="carte">
          <span className="block text-3xl font-titre">n° {version.version}</span>
          <span className="text-sm text-texte-2">dernière publication du catalogue · {formaterDateHeure(version.publie_le)}</span>
        </div>
      </div>
      {ouvertes.length ? (
        <section className="space-y-2">
          <h2 className="text-2xl">Demandes à traiter</h2>
          <ul className="space-y-1">
            {ouvertes.slice(0, 8).map((d) => (
              <li key={d.id} className={`carte p-3 flex flex-wrap items-center gap-3 ${enRetard(d) ? "bg-alerte-fond" : ""}`}>
                <Link href={`/admin/demandes/${d.id}`} className="font-semibold underline">
                  {d.intitule}
                </Link>
                <span className="pilule">{STATUTS_DEMANDE[d.statut]}</span>
                <span className="text-sm text-texte-2">
                  reçue le {formaterDateHeure(d.recu_le)} · échéance {formaterDateHeure(d.echeance)}
                  {enRetard(d) ? " · dépassée" : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
