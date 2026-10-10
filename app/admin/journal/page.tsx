import { exigerAdmin } from "@/lib/admin/session";
import { ouvrirBase } from "@/lib/stockage/sqlite";
import { lireJournal } from "@/lib/stockage/admin";
import { formaterDateHeure } from "@/lib/ui/dates";

export const dynamic = "force-dynamic";

export default async function PageJournal() {
  await exigerAdmin();
  const entrees = lireJournal(ouvrirBase(), 300);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Journal</h1>
      <p className="aide">Qui a publié, dépublié, importé ou changé un barème, et quand. Pas de traceur d&apos;audience.</p>
      <div className="overflow-x-auto">
        <table className="tableau">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Qui</th>
              <th scope="col">Action</th>
              <th scope="col">Objet</th>
              <th scope="col">Détail</th>
            </tr>
          </thead>
          <tbody>
            {entrees.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-sm">{formaterDateHeure(e.date)}</td>
                <td className="text-sm">{e.qui}</td>
                <td className="text-sm">{e.action}</td>
                <td className="text-sm">{e.objet}</td>
                <td className="text-sm text-texte-2">{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
