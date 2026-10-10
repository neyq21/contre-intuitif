import Link from "next/link";
import { exigerAdmin } from "@/lib/admin/session";
import { ouvrirBase } from "@/lib/stockage/sqlite";
import { STATUTS_DEMANDE, enRetard, listerDemandes } from "@/lib/stockage/admin";
import { formaterDateHeure } from "@/lib/ui/dates";

export const dynamic = "force-dynamic";

export default async function PageDemandes() {
  await exigerAdmin();
  const demandes = listerDemandes(ouvrirBase());
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Demandes de métier</h1>
      <p className="aide">Métier créé sous 72 h ouvrées (lundi–vendredi, jours fériés ignorés en v1) après réception d&apos;une demande complète. Les demandes dont l&apos;échéance est dépassée sont surlignées.</p>
      {!demandes.length ? <p className="carte">Aucune demande pour l&apos;instant.</p> : null}
      <ul className="space-y-2">
        {demandes.map((d) => (
          <li key={d.id} className={`carte flex flex-wrap items-center gap-3 ${enRetard(d) ? "bg-alerte-fond" : ""}`}>
            <div className="flex-1 min-w-[14rem]">
              <Link href={`/admin/demandes/${d.id}`} className="font-semibold underline">
                {d.intitule}
              </Link>
              <p className="text-sm text-texte-2">
                {d.nom}
                {d.entreprise ? ` · ${d.entreprise}` : ""} · reçue le {formaterDateHeure(d.recu_le)} · échéance {formaterDateHeure(d.echeance)}
                {enRetard(d) ? " · dépassée" : ""}
              </p>
            </div>
            <span className="pilule">{STATUTS_DEMANDE[d.statut]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
