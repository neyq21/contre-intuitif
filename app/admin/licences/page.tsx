import { exigerAdmin } from "@/lib/admin/session";
import { ouvrirBase } from "@/lib/stockage/sqlite";
import { listerLicences } from "@/lib/stockage/admin";
import { formaterDate } from "@/lib/ui/dates";
import { licenceAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function PageLicences() {
  await exigerAdmin();
  const licences = listerLicences(ouvrirBase());
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Licences</h1>
      <p className="aide">
        Le recruteur colle le code dans « Données et réglages » : un bandeau « licence enregistrée sur cet ordinateur » apparaît. Ça ne téléverse pas ses données et ne sert pas de compte. Vous voyez la liste des codes, pas leur usage réel (cette donnée n&apos;existe pas).
      </p>
      <form action={licenceAction} className="carte grid gap-3 tel:grid-cols-6 items-end">
        <input type="hidden" name="action" value="creer" />
        <label className="block">
          <span className="etiquette">Type</span>
          <select name="type" className="champ">
            <option value="solo">Solo</option>
            <option value="entreprise">Entreprise</option>
          </select>
        </label>
        <label className="block tel:col-span-2">
          <span className="etiquette">Nom (personne ou entité)</span>
          <input name="nom" className="champ" required />
        </label>
        <label className="block">
          <span className="etiquette">E-mail</span>
          <input name="email" type="email" className="champ" />
        </label>
        <label className="block">
          <span className="etiquette">SIREN (facultatif)</span>
          <input name="siren" className="champ" pattern="[0-9 ]*" />
        </label>
        <label className="block">
          <span className="etiquette">Fin (facultatif)</span>
          <input name="fin_le" type="date" className="champ" />
        </label>
        <button type="submit" className="bouton bouton-principal tel:col-span-6 w-fit">
          Créer un code
        </button>
      </form>
      <div className="overflow-x-auto">
        <table className="tableau">
          <thead>
            <tr>
              <th scope="col">Code</th>
              <th scope="col">Type</th>
              <th scope="col">Nom</th>
              <th scope="col">E-mail</th>
              <th scope="col">SIREN</th>
              <th scope="col">Fin</th>
              <th scope="col">Statut</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {licences.map((l) => (
              <tr key={l.id}>
                <td className="font-mono text-sm">{l.code}</td>
                <td>{l.type === "solo" ? "Solo" : "Entreprise"}</td>
                <td>{l.nom}</td>
                <td>{l.email}</td>
                <td>{l.siren}</td>
                <td>{l.fin_le ? formaterDate(l.fin_le) : "—"}</td>
                <td>
                  <span className={`pilule ${l.statut === "actif" ? "pilule-niveau-3" : "pilule-niveau-1"}`}>{l.statut === "actif" ? "Actif" : "Révoqué"}</span>
                </td>
                <td>
                  <form action={licenceAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="action" value={l.statut === "actif" ? "revoquer" : "reactiver"} />
                    <button type="submit" className="bouton min-h-9 text-sm">
                      {l.statut === "actif" ? "Révoquer" : "Réactiver"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!licences.length ? (
              <tr>
                <td colSpan={8} className="text-texte-2">
                  Aucune licence.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
