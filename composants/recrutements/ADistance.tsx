"use client";

/**
 * « À distance » : fichier d'épreuve sans corrigé (v1), e-mail prérempli.
 * Le lien chiffré arrive en phase 2 (voir ECARTS.md tant qu'il n'est pas là).
 */
import { useState } from "react";
import { useDonnees } from "@/composants/donnees/FournisseurDonnees";
import { Bouton, Message, copier, telecharger } from "@/composants/ui";
import type { Base, Pack } from "@/lib/contenu/types";
import { exporterEpreuve, nomFichier } from "@/lib/fichiers/formats";
import { preparerEmails } from "@/lib/methode/emails";
import { paquetCandidat } from "@/lib/methode/epreuve";
import { figer } from "@/lib/stockage/recrutements";
import type { Candidat, Recrutement } from "@/lib/stockage/modele";
import type { ModifierCandidat } from "./FicheCandidat";
import { LienChiffre } from "./LienChiffre";

export function ADistance({ r, candidat, base, pack, modifierCandidat }: { r: Recrutement; candidat: Candidat; base: Base; pack: Pack | null; modifierCandidat: ModifierCandidat }) {
  const [copie, setCopie] = useState<string | null>(null);
  const { etat } = useDonnees();
  const emailRetour = etat?.reglages.email_retour?.trim() || undefined;
  const besoin = candidat.besoins.liste.length > 0 || candidat.besoins.autre.trim().length > 0;

  async function assurerFigee(): Promise<Recrutement | null> {
    if (r.epreuve) return r;
    if (!pack) return null;
    let res: Recrutement | null = null;
    await modifierCandidat((c, rec) => {
      // `rec` est l'objet de l'état : on le fige en place.
      const f = figer(rec, pack, base);
      Object.assign(rec, f);
      res = f;
    });
    return res;
  }

  async function telechargerFichier() {
    const rec = await assurerFigee();
    if (!rec?.epreuve) return;
    const paquet = paquetCandidat(rec.epreuve, base, rec.id, { id: candidat.id, nom: candidat.nom }, { deroule: rec.deroule && !besoin, emailRetour });
    telecharger(nomFichier(`epreuve-${rec.poste}-${candidat.nom}`), exporterEpreuve(paquet));
    await modifierCandidat((c) => void (c.commence = true));
  }

  const email2 = preparerEmails(base, r, pack, { candidat: candidat.nom, lien: candidat.lien?.url }).find((e) => e.n === 2);
  async function copierEmail() {
    if (!email2) return;
    const ok = await copier(`Objet : ${email2.objet_rempli}\n\n${email2.corps_rempli}`);
    setCopie(ok ? "email" : "erreur");
    setTimeout(() => setCopie(null), 2000);
  }

  return (
    <div className="space-y-6 max-w-[48rem]">
      <p className="aide">
        Deux façons d&apos;envoyer l&apos;épreuve : un lien personnel, ou un fichier d&apos;épreuve. Ni l&apos;un ni l&apos;autre ne contient les corrigés ni les barèmes. La personne vous renvoie ses réponses par un code CI5Z-… ou un fichier, à importer dans « Candidats ».
      </p>
      {!r.epreuve && !pack ? <Message type="alerte">Le métier n&apos;est pas disponible : l&apos;épreuve ne peut pas être figée pour l&apos;instant.</Message> : null}

      <LienChiffre r={r} candidat={candidat} base={base} pack={pack} modifierCandidat={modifierCandidat} assurerFigee={assurerFigee} emailRetour={emailRetour} />

      <section className="carte space-y-3">
        <h3 className="text-xl">Fichier d&apos;épreuve</h3>
        <p className="text-sm text-texte-2">
          Si la page en ligne est indisponible, le fichier reste le repli : la personne l&apos;ouvre sur{" "}
          <code className="text-xs">{typeof window !== "undefined" ? `${window.location.origin}/e/fichier` : "/e/fichier"}</code> et vous rend ses réponses de la même façon.
        </p>
        <Bouton onClick={telechargerFichier} disabled={!r.epreuve && !pack}>
          Télécharger le fichier d&apos;épreuve (sans corrigé)
        </Bouton>
      </section>

      <section className="carte space-y-3">
        <h3 className="text-xl">E-mail prêt à copier</h3>
        {candidat.email ? <p className="text-sm text-texte-2">À : {candidat.email}</p> : null}
        {email2 ? (
          <>
            <p className="text-sm">
              <strong>Objet :</strong> {email2.objet_rempli}
            </p>
            <pre className="whitespace-pre-wrap font-ui text-sm rounded-s bg-surface-2 p-3 max-h-72 overflow-y-auto">{email2.corps_rempli}</pre>
            <div className="flex flex-wrap gap-2">
              <Bouton onClick={copierEmail}>{copie === "email" ? "Copié" : "Copier l'e-mail"}</Bouton>
              {candidat.email ? (
                <a className="bouton" href={`mailto:${encodeURIComponent(candidat.email)}?subject=${encodeURIComponent(email2.objet_rempli)}&body=${encodeURIComponent(email2.corps_rempli)}`}>
                  Ouvrir dans ma messagerie
                </a>
              ) : null}
            </div>
          </>
        ) : null}
        {copie === "erreur" ? <p role="alert" className="encart encart-alerte text-sm">Copie impossible : sélectionnez le texte.</p> : null}
      </section>
    </div>
  );
}
