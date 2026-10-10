"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bouton, Chargement, Message, telecharger } from "@/composants/ui";
import { construireArchive, exporterArchive, nomFichier } from "@/lib/fichiers/formats";
import { dupliquer, remplacerRecrutement, supprimerRecrutement } from "@/lib/stockage/recrutements";
import { useRecrutement } from "./useRecrutement";

export function Fin({ id }: { id: string }) {
  const { pret, recrutement: r, candidats, pack, modifier } = useRecrutement(id);
  const router = useRouter();
  const [archive, setArchive] = useState(false);
  const [confirme, setConfirme] = useState(false);
  if (!pret) return <Chargement />;
  if (!r) return <Chargement />;

  function telechargerArchive() {
    if (!r) return;
    telecharger(nomFichier(`archive-${r.poste}`), exporterArchive(construireArchive(r, candidats)));
    setArchive(true);
  }

  async function dupliquerRecrutement() {
    if (!r || !pack) return;
    const copie = dupliquer(r, pack);
    await modifier((e) => remplacerRecrutement(e, copie));
    router.push(`/recrutements/${copie.id}/preparer/poste`);
  }

  async function supprimer() {
    await modifier((e) => supprimerRecrutement(e, id));
    router.push("/recrutements");
  }

  return (
    <div className="space-y-6 max-w-[44rem]">
      <section className="carte space-y-3">
        <h2 className="text-2xl">Dupliquer le recrutement</h2>
        <p className="aide">Sans les candidats ni l&apos;épreuve figée : pour changer les questions, ou relancer le même poste plus tard.</p>
        <Bouton onClick={dupliquerRecrutement} disabled={!pack}>
          Dupliquer (sans les candidats)
        </Bouton>
        {!pack ? <p className="aide">Le métier n&apos;est pas disponible : la copie n&apos;est pas possible pour l&apos;instant.</p> : null}
      </section>

      <section className="carte space-y-3">
        <h2 className="text-2xl">Fin du recrutement</h2>
        <p className="text-texte-2">
          1. Téléchargez l&apos;archive : réponses, grilles et motifs de décision, <strong>sans déroulé ni besoins d&apos;aménagement</strong>. Rangez-la dans un dossier à accès restreint (preuves en cas de litige : 5 ans au plus après que le poste a été pourvu).
          <br />
          2. Puis supprimez le recrutement de cet ordinateur : les données des personnes non retenues quittent la base active.
        </p>
        <div className="flex flex-wrap gap-2">
          <Bouton variante="principal" onClick={telechargerArchive}>
            Télécharger l&apos;archive ({candidats.length} candidat{candidats.length > 1 ? "s" : ""})
          </Bouton>
        </div>
        {archive ? <Message type="succes">Archive téléchargée. Vous pouvez maintenant supprimer le recrutement.</Message> : null}
        <div className="space-y-2 border-t border-bord pt-3">
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} />
            <span>Je confirme la suppression de ce recrutement et de ses {candidats.length} candidat{candidats.length > 1 ? "s" : ""} sur cet ordinateur. Cette action est définitive.</span>
          </label>
          <Bouton variante="alerte" disabled={!confirme} onClick={supprimer}>
            Supprimer le recrutement
          </Bouton>
        </div>
      </section>
    </div>
  );
}
