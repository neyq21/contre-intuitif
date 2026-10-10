"use client";

/**
 * « Sur cet écran » : la personne passe l'épreuve sur l'ordinateur du recruteur.
 * Les réponses vont directement dans IndexedDB. Rien ne part au serveur.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { candidatParId, useDonnees } from "@/composants/donnees/FournisseurDonnees";
import { Epreuve } from "@/composants/epreuve/Epreuve";
import { Chargement, Message } from "@/composants/ui";
import { paquetCandidat } from "@/lib/methode/epreuve";
import type { Reponses } from "@/lib/stockage/modele";
import { useRecrutement } from "./useRecrutement";

export function PasserEpreuve({ id, cid }: { id: string; cid: string }) {
  const { pret, recrutement: r, base, modifier, etat } = useRecrutement(id);
  const { catalogue } = useDonnees();
  const [fini, setFini] = useState(false);
  const candidat = candidatParId(etat, cid);

  const paquet = useMemo(() => {
    if (!r?.epreuve || !base || !candidat) return null;
    // Jamais de déroulé si un besoin d'aménagement est déjà signalé pour cette personne.
    const besoin = candidat.besoins.liste.length > 0 || candidat.besoins.autre.trim().length > 0;
    return paquetCandidat(r.epreuve, base, r.id, { id: candidat.id, nom: candidat.nom }, { deroule: r.deroule && !besoin });
  }, [r, base, candidat]);

  if (!pret || (!catalogue && !r?.epreuve)) return <Chargement />;
  if (!r || !candidat) return <Message type="alerte">Recrutement ou candidat introuvable sur cet ordinateur.</Message>;
  if (!r.epreuve || !paquet) return <Message type="alerte">L&apos;épreuve n&apos;est pas figée. Revenez à « Candidats » et relancez l&apos;épreuve.</Message>;

  if (candidat.reponses && !fini) {
    return (
      <div className="mx-auto max-w-[40rem] space-y-4">
        <Message>Cette personne a déjà rendu ses réponses. Une fois rendues, elles ne changent plus.</Message>
        <Link href={`/recrutements/${id}/candidats/${cid}/analyse`} className="bouton bouton-principal">
          Voir l&apos;analyse
        </Link>
      </div>
    );
  }

  if (fini) {
    return (
      <div className="mx-auto max-w-[40rem] space-y-5 text-center py-10">
        <h1 className="text-4xl">Merci, vos réponses sont enregistrées.</h1>
        <p className="text-texte-2">Vous pouvez rendre l&apos;ordinateur à la personne qui recrute. Rien n&apos;a été envoyé ailleurs que sur cet ordinateur.</p>
        <details className="carte text-left no-print">
          <summary className="cursor-pointer">Pour la personne qui recrute</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/recrutements/${id}/candidats/${cid}/analyse`} className="bouton bouton-principal">
              Reprendre la main : analyse
            </Link>
            <Link href={`/recrutements/${id}/candidats`} className="bouton">
              Les candidats
            </Link>
          </div>
        </details>
      </div>
    );
  }

  async function terminer(reponses: Reponses) {
    await modifier((e) => {
      const c = e.candidats.find((x) => x.id === cid);
      if (!c) return;
      c.reponses = reponses;
      c.commence = true;
      if (reponses.besoins) c.besoins = { liste: [...new Set([...c.besoins.liste, ...reponses.besoins.liste])], autre: reponses.besoins.autre || c.besoins.autre };
      const rec = e.recrutements.find((x) => x.id === id);
      if (rec && rec.statut === "preparation") rec.statut = "en_cours";
    });
    setFini(true);
  }

  return <Epreuve paquet={paquet} onTerminer={terminer} libelleFin="Terminer et enregistrer mes réponses" />;
}
