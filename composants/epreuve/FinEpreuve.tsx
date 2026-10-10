"use client";

/**
 * Écran de confirmation à distance : code CI5Z-… (complet, jamais tronqué) et
 * fichier de réponses. Rien n'est posté au serveur.
 */
import { useEffect, useState } from "react";
import { Bouton, copier, telecharger } from "@/composants/ui";
import { LONGUEUR_CODE_CONFORTABLE, encoderCode, exporterReponses, nomFichier } from "@/lib/fichiers/formats";
import type { PaquetCandidat, Reponses } from "@/lib/stockage/modele";

export function FinEpreuve({ paquet, reponses }: { paquet: PaquetCandidat; reponses: Reponses }) {
  const [code, setCode] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  useEffect(() => {
    void encoderCode(reponses).then(setCode);
  }, [reponses]);
  const fichier = () => telecharger(nomFichier(`reponses-${paquet.poste}-${paquet.candidat?.nom ?? "candidat"}`), exporterReponses(reponses));
  const long = (code?.length ?? 0) > LONGUEUR_CODE_CONFORTABLE;
  const objet = `Mes réponses à l'épreuve · ${paquet.poste}`;
  const corps = code ? `Bonjour,\n\nVoici mes réponses à l'épreuve pour le poste de ${paquet.poste}.\n\n${code}\n\n${paquet.candidat?.nom ?? ""}` : "";

  return (
    <div className="mx-auto max-w-[760px] space-y-6">
      <h1 className="text-3xl tel:text-4xl">Merci, votre épreuve est terminée.</h1>
      <p className="text-texte-2">
        Vos réponses sont restées dans votre navigateur. Pour les rendre à la personne qui recrute, envoyez-lui le code ci-dessous{long ? " (il est long : le fichier est plus pratique, envoyez les deux si vous le pouvez)" : ""}, ou le fichier de réponses. Les deux contiennent exactement les mêmes réponses.
      </p>
      <div className="carte space-y-3">
        <h2 className="text-xl">Votre code</h2>
        {code ? (
          <>
            <textarea readOnly className="champ font-mono text-xs" rows={long ? 8 : 4} value={code} aria-label="Code de réponses" onFocus={(e) => e.currentTarget.select()} />
            <div className="flex flex-wrap gap-2">
              <Bouton
                variante="principal"
                onClick={async () => {
                  setCopie(await copier(code));
                  setTimeout(() => setCopie(false), 2000);
                }}
              >
                {copie ? "Copié" : "Copier le code"}
              </Bouton>
              {paquet.retour?.email ? (
                <a className="bouton" href={`mailto:${encodeURIComponent(paquet.retour.email)}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`}>
                  Envoyer par e-mail
                </a>
              ) : null}
            </div>
            <p className="aide">
              {code.length} caractères. Le code est complet : il suffit à la personne qui recrute pour tout retrouver.
            </p>
          </>
        ) : (
          <p className="aide">Préparation du code…</p>
        )}
      </div>
      <div className="carte space-y-3">
        <h2 className="text-xl">Ou le fichier de réponses</h2>
        <Bouton onClick={fichier}>Télécharger le fichier de réponses</Bouton>
        <p className="aide">Un fichier .json à envoyer en pièce jointe.</p>
      </div>
      <p className="text-sm text-texte-3">Vous pouvez fermer cette page. Vos réponses ne sont enregistrées nulle part ailleurs que sur cet appareil et dans ce que vous envoyez.</p>
    </div>
  );
}
