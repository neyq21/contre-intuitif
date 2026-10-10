import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdmin } from "@/lib/admin/session";
import { listerMetiers, ouvrirBase } from "@/lib/stockage/sqlite";
import { STATUTS_DEMANDE, enRetard, lireDemande } from "@/lib/stockage/admin";
import { formaterDateHeure } from "@/lib/ui/dates";
import { creerMetierDepuisDemande, demandeAction } from "../../actions";
import { CopierTexte } from "@/composants/admin/CopierTexte";
import { REGLAGES } from "@/lib/reglages";

export const dynamic = "force-dynamic";

export default async function PageDemande({ params }: { params: Promise<{ id: string }> }) {
  await exigerAdmin();
  const { id } = await params;
  const db = ouvrirBase();
  const d = lireDemande(db, id);
  if (!d) notFound();
  const metiers = listerMetiers(db);
  const metier = d.metier_id ? metiers.find((m) => m.id === d.metier_id) : null;
  const message = `Bonjour ${d.nom || ""},

Merci pour votre demande de métier « ${d.intitule} ».
${d.statut === "livree" ? `Le métier est prêt : vous trouverez le fichier .json en pièce jointe. Dans l'application : « Données et réglages » → « Importer un métier ».` : d.statut === "incomplete" ? `Pour la créer, il nous manque des éléments (contexte, tâches principales, contraintes et règles). Le délai de 72 h ouvrées court à partir d'une demande complète.` : `Nous la créons sous 72 h ouvrées (3 jours ouvrés) après réception de votre demande complète, avec ses 4 situations, ses 5 portes et son entretien.`}

Bien à vous,
${REGLAGES.NOM_JURIDIQUE}`;
  return (
    <div className="space-y-6 max-w-[48rem]">
      <Link href="/admin/demandes" className="text-sm underline">
        ← Demandes
      </Link>
      <h1 className="text-3xl">{d.intitule}</h1>
      <dl className={`carte grid gap-x-6 gap-y-2 tel:grid-cols-[auto_1fr] ${enRetard(d) ? "bg-alerte-fond" : ""}`}>
        <dt className="font-semibold">Statut</dt>
        <dd>{STATUTS_DEMANDE[d.statut]}</dd>
        <dt className="font-semibold">Reçue le</dt>
        <dd>{formaterDateHeure(d.recu_le)}</dd>
        <dt className="font-semibold">Échéance (72 h ouvrées)</dt>
        <dd>
          {formaterDateHeure(d.echeance)}
          {enRetard(d) ? " — dépassée" : ""}
        </dd>
        <dt className="font-semibold">Demandeur</dt>
        <dd>
          {d.nom}
          {d.entreprise ? ` · ${d.entreprise}` : ""}
          {d.email ? ` · ${d.email}` : ""}
          {d.telephone ? ` · ${d.telephone}` : ""}
        </dd>
        <dt className="font-semibold">Contexte</dt>
        <dd className="whitespace-pre-wrap">{d.contexte || "—"}</dd>
        <dt className="font-semibold">Tâches</dt>
        <dd className="whitespace-pre-wrap">{d.taches || "—"}</dd>
        <dt className="font-semibold">Contraintes</dt>
        <dd className="whitespace-pre-wrap">{d.contraintes || "—"}</dd>
        <dt className="font-semibold">Métier lié</dt>
        <dd>
          {metier ? (
            <Link href={`/admin/catalogue/${metier.id}`} className="underline">
              {metier.nom} ({metier.statut === "publie" ? "publié" : "brouillon"})
            </Link>
          ) : (
            "—"
          )}
        </dd>
      </dl>
      <form action={demandeAction} className="carte space-y-3">
        <input type="hidden" name="id" value={d.id} />
        <label className="block">
          <span className="etiquette">Statut</span>
          <select name="statut" className="champ" defaultValue={d.statut}>
            {Object.entries(STATUTS_DEMANDE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="etiquette">Métier lié (publié → la demande passe « livrée » automatiquement)</span>
          <select name="metier_id" className="champ" defaultValue={d.metier_id ?? ""}>
            <option value="">—</option>
            {metiers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="etiquette">Note interne</span>
          <textarea name="note" className="champ" rows={3} defaultValue={d.note} />
        </label>
        <button type="submit" className="bouton bouton-principal">
          Enregistrer
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        <form action={creerMetierDepuisDemande}>
          <input type="hidden" name="id" value={d.id} />
          <button type="submit" className="bouton">
            Créer le métier à partir de cette demande
          </button>
        </form>
        <CopierTexte texte={message} libelle="Copier le message au demandeur" />
      </div>
      <details className="carte">
        <summary className="cursor-pointer">Le message</summary>
        <pre className="whitespace-pre-wrap font-ui text-sm mt-2">{message}</pre>
      </details>
    </div>
  );
}
