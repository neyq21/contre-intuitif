import { exigerAdmin } from "@/lib/admin/session";
import { lireDomaines, listerMetiers, ouvrirBase } from "@/lib/stockage/sqlite";
import { domaineAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function PageDomaines() {
  await exigerAdmin();
  const db = ouvrirBase();
  const domaines = lireDomaines(db);
  const metiers = listerMetiers(db);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Domaines</h1>
      <p className="aide">Nom, ordre d&apos;affichage, métiers « bientôt » (un par ligne). Un domaine qui contient des métiers ne peut pas être supprimé.</p>
      <ul className="grid gap-3 tel:grid-cols-2">
        {domaines.map((d) => {
          const n = metiers.filter((m) => m.secteur === d.id).length;
          return (
            <li key={d.id} className="carte">
              <form action={domaineAction} className="space-y-2">
                <input type="hidden" name="id" value={d.id} />
                <p className="text-xs text-texte-3">
                  {d.id} · {n} métier{n > 1 ? "s" : ""}
                </p>
                <label className="block">
                  <span className="etiquette">Nom</span>
                  <input name="nom" className="champ" defaultValue={d.nom} required />
                </label>
                <div className="grid grid-cols-[6rem_1fr] gap-2">
                  <label className="block">
                    <span className="etiquette">Ordre</span>
                    <input name="ordre" type="number" className="champ" defaultValue={d.ordre} />
                  </label>
                  <label className="block">
                    <span className="etiquette">Bientôt</span>
                    <textarea name="bientot" className="champ" rows={2} defaultValue={(d.bientot ?? []).join("\n")} />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" name="action" value="enregistrer" className="bouton bouton-principal min-h-9 text-sm">
                    Enregistrer
                  </button>
                  {n === 0 ? (
                    <button type="submit" name="action" value="supprimer" className="bouton bouton-alerte min-h-9 text-sm">
                      Supprimer
                    </button>
                  ) : null}
                </div>
              </form>
            </li>
          );
        })}
      </ul>
      <form action={domaineAction} className="carte space-y-2 max-w-md">
        <h2 className="text-xl">Nouveau domaine</h2>
        <label className="block">
          <span className="etiquette">Identifiant (lettres, chiffres, tirets)</span>
          <input name="id" className="champ" required pattern="[a-z0-9-]+" />
        </label>
        <label className="block">
          <span className="etiquette">Nom</span>
          <input name="nom" className="champ" required />
        </label>
        <label className="block">
          <span className="etiquette">Ordre</span>
          <input name="ordre" type="number" className="champ" defaultValue={domaines.length} />
        </label>
        <button type="submit" name="action" value="enregistrer" className="bouton bouton-principal">
          Créer
        </button>
      </form>
    </div>
  );
}
