"use client";

import Link from "next/link";
import { useDonnees } from "@/composants/donnees/FournisseurDonnees";
import { Chargement, Vide, formaterDate } from "@/composants/ui";

const STATUTS = { preparation: "En préparation", en_cours: "En cours", termine: "Terminé" } as const;

export function ListeRecrutements() {
  const { etat, pret } = useDonnees();
  if (!pret || !etat) return <Chargement />;
  const recrutements = [...etat.recrutements].sort((a, b) => b.modifie_le.localeCompare(a.modifie_le));
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl">Recrutements</h1>
          <p className="text-texte-2">Tout reste dans ce navigateur, sur cet ordinateur. Sauvegardez régulièrement dans « Données ».</p>
        </div>
        <Link href="/recrutements/nouveau" className="bouton bouton-principal">
          Créer un recrutement
        </Link>
      </header>
      {!recrutements.length ? (
        <Vide
          titre="Aucun recrutement pour l'instant"
          texte="Choisissez un métier, ou décrivez votre besoin en une phrase. Pour découvrir l'application, regardez d'abord l'exemple fictif."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/metiers" className="bouton bouton-principal">
                Choisir un métier
              </Link>
              <Link href="/exemple" className="bouton">
                Voir un exemple rempli
              </Link>
            </div>
          }
        />
      ) : (
        <ul className="grid gap-3 tel:grid-cols-2">
          {recrutements.map((r) => {
            const candidats = etat.candidats.filter((c) => c.recrutement_id === r.id);
            const rendus = candidats.filter((c) => c.reponses).length;
            return (
              <li key={r.id}>
                <Link href={`/recrutements/${r.id}/${r.epreuve ? "candidats" : "preparer/poste"}`} className="carte block h-full hover:bg-surface-2 space-y-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="pilule">{STATUTS[r.statut]}</span>
                    {r.fictif ? <span className="pilule bg-alerte-fond text-alerte-texte">FICTIF</span> : null}
                    {r.epreuve ? <span className="pilule">questions figées</span> : null}
                  </span>
                  <span className="block text-2xl font-titre">{r.poste}</span>
                  <span className="block text-sm text-texte-2">
                    {r.metier_nom} · {candidats.length} candidat{candidats.length > 1 ? "s" : ""}
                    {rendus ? `, ${rendus} épreuve${rendus > 1 ? "s" : ""} rendue${rendus > 1 ? "s" : ""}` : ""} · modifié le {formaterDate(r.modifie_le)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
