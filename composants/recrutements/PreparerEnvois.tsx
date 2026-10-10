"use client";

import { useState } from "react";
import { Bouton, copier } from "@/composants/ui";
import type { Base, Pack } from "@/lib/contenu/types";
import { preparerEmails } from "@/lib/methode/emails";
import type { Recrutement } from "@/lib/stockage/modele";

type Enregistrer = (fn: (r: Recrutement) => Recrutement | void) => Promise<void>;

export function PreparerEnvois({ r, pack, base, enregistrer }: { r: Recrutement; pack: Pack | null; base: Base; enregistrer: Enregistrer }) {
  const emails = preparerEmails(base, r, pack);
  const [copie, setCopie] = useState<string | null>(null);

  async function copierTexte(cle: string, texte: string) {
    const ok = await copier(texte);
    setCopie(ok ? cle : "erreur");
    setTimeout(() => setCopie(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl">Les envois</h2>
        <p className="aide">
          Les e-mails du kit, prêts à copier, avec le poste, les compétences et les questions d&apos;entretien déjà remplis. Les crochets restants sont à compléter. Les textes ne sont pas réécrits par l&apos;application.
        </p>
      </div>
      <label className="carte flex items-start gap-3">
        <input type="checkbox" className="mt-1" checked={r.envois.questions_envoyees} onChange={(e) => enregistrer((x) => ({ ...x, envois: { ...x.envois, questions_envoyees: e.target.checked } }))} />
        <span>
          <span className="block font-semibold">Les questions d&apos;entretien ont été envoyées à l&apos;avance</span>
          <span className="block text-sm text-texte-2">5 à 7 jours avant l&apos;entretien, les mêmes pour toutes les personnes candidates.</span>
        </span>
      </label>
      <ol className="space-y-4">
        {emails.map((e) => (
          <li key={e.n} className="carte space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-xl">
                  {e.n}. {e.titre}
                </h3>
                <p className="text-sm text-texte-2">Quand : {e.quand}</p>
              </div>
              <Bouton onClick={() => copierTexte(`e${e.n}`, `Objet : ${e.objet_rempli}\n\n${e.corps_rempli}`)}>{copie === `e${e.n}` ? "Copié" : "Copier"}</Bouton>
            </div>
            <p className="text-sm">
              <strong>Objet :</strong> {e.objet_rempli}
            </p>
            <details>
              <summary className="cursor-pointer underline text-sm">Voir le texte</summary>
              <pre className="mt-2 whitespace-pre-wrap font-ui text-sm leading-relaxed rounded-s bg-surface-2 p-3">{e.corps_rempli}</pre>
            </details>
          </li>
        ))}
      </ol>
      <section className="space-y-3">
        <h3 className="text-xl">Textes utiles</h3>
        {base.bonus.map((b) => (
          <div key={b.titre} className="carte space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h4 className="font-ui font-semibold">{b.titre}</h4>
              <Bouton onClick={() => copierTexte(b.titre, b.texte)}>{copie === b.titre ? "Copié" : "Copier"}</Bouton>
            </div>
            <pre className="whitespace-pre-wrap font-ui text-sm leading-relaxed rounded-s bg-surface-2 p-3">{b.texte}</pre>
          </div>
        ))}
      </section>
      {copie === "erreur" ? <p role="alert" className="encart encart-alerte">La copie automatique a échoué : sélectionnez le texte et copiez-le.</p> : null}
    </div>
  );
}
