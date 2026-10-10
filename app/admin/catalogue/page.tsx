import Link from "next/link";
import { exigerAdmin } from "@/lib/admin/session";
import { lireDomaines, listerMetiers, ouvrirBase } from "@/lib/stockage/sqlite";
import { formaterDateHeure } from "@/lib/ui/dates";
import { actionMetier } from "../actions";
import { ImportMetier } from "@/composants/admin/ImportMetier";

export const dynamic = "force-dynamic";

export default async function PageCatalogue() {
  await exigerAdmin();
  const db = ouvrirBase();
  const metiers = listerMetiers(db);
  const domaines = lireDomaines(db);
  const nomDomaine = (id: string) => domaines.find((d) => d.id === id)?.nom ?? id;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Catalogue</h1>
          <p className="aide">
            {metiers.filter((m) => m.statut === "publie").length} publiés, {metiers.filter((m) => m.statut === "brouillon").length} brouillons. Chaque publication, dépublication ou modification d&apos;un métier publié augmente la version du catalogue ; le recruteur voit « catalogue mis à jour » au prochain chargement, et ses recrutements déjà figés gardent leurs questions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/catalogue/domaines" className="bouton">
            Domaines
          </Link>
          <Link href="/admin/catalogue/nouveau" className="bouton bouton-principal">
            Nouveau métier
          </Link>
        </div>
      </div>
      <ImportMetier />
      <div className="overflow-x-auto">
        <table className="tableau">
          <thead>
            <tr>
              <th scope="col">Métier</th>
              <th scope="col">Domaine</th>
              <th scope="col">Version</th>
              <th scope="col">Statut</th>
              <th scope="col">Plus recruté</th>
              <th scope="col">Modifié</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {metiers.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link href={`/admin/catalogue/${m.id}`} className="font-semibold underline">
                    {m.nom}
                  </Link>
                  <span className="block text-xs text-texte-3">{m.id}</span>
                </td>
                <td>{nomDomaine(m.secteur)}</td>
                <td>{m.version}</td>
                <td>
                  <span className={`pilule ${m.statut === "publie" ? "pilule-niveau-3" : "pilule-niveau-2"}`}>{m.statut === "publie" ? "Publié" : "Brouillon"}</span>
                </td>
                <td>
                  <form action={actionMetier}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="action" value="plus_recrute" />
                    <input type="hidden" name="valeur" value={m.plus_recrute ? "0" : "1"} />
                    <button type="submit" className="bouton min-h-9 text-sm" aria-pressed={m.plus_recrute} title="Les 8 métiers les plus recrutés (BMO) se cochent ici">
                      {m.plus_recrute ? "☑ oui" : "☐ non"}
                    </button>
                  </form>
                </td>
                <td className="text-sm text-texte-2">{formaterDateHeure(m.modifie_le)}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <form action={actionMetier}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="action" value={m.statut === "publie" ? "depublier" : "publier"} />
                      <button type="submit" className={`bouton min-h-9 text-sm ${m.statut === "publie" ? "" : "bouton-principal"}`}>
                        {m.statut === "publie" ? "Dépublier" : "Publier"}
                      </button>
                    </form>
                    <form action={actionMetier}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="action" value="dupliquer" />
                      <button type="submit" className="bouton min-h-9 text-sm">
                        Dupliquer
                      </button>
                    </form>
                    <a href={`/api/admin/metiers/${m.id}?export=1`} className="bouton min-h-9 text-sm">
                      Exporter
                    </a>
                    {m.statut === "brouillon" ? (
                      <form action={actionMetier}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="action" value="supprimer" />
                        <button type="submit" className="bouton bouton-alerte min-h-9 text-sm">
                          Supprimer
                        </button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
