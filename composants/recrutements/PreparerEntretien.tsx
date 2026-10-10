"use client";

import { Texte, texteSimple } from "@/composants/Texte";
import { Bouton, Message } from "@/composants/ui";
import type { Base, Pack } from "@/lib/contenu/types";
import { LIMITES, reservoirEntretien } from "@/lib/methode/tirage";
import type { Recrutement } from "@/lib/stockage/modele";
import { QuestionsRecruteurEditeur } from "./QuestionsRecruteur";

type Enregistrer = (fn: (r: Recrutement) => Recrutement | void) => Promise<void>;

export function PreparerEntretien({ r, pack, base, enregistrer }: { r: Recrutement; pack: Pack | null; base: Base; enregistrer: Enregistrer }) {
  const reservoir = pack ? reservoirEntretien(pack) : (r.epreuve?.entretien.questions ?? []);
  if (!reservoir.length) return <Message type="alerte">Métier indisponible : les questions d&apos;entretien ne peuvent pas être affichées.</Message>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl">L&apos;entretien structuré</h2>
          <p className="aide">
            Envoyez les questions 5 à 7 jours avant. Le jour J, posez-les une par une, telles qu&apos;elles sont écrites. Chaque personne note seule avec les ancres de 1 à 4, puis on compare. Les attendus cochés sont des repères, pas un calcul.
          </p>
        </div>
        <Bouton onClick={() => window.print()} className="no-print">
          Imprimer la fiche d&apos;entretien
        </Bouton>
      </div>

      {r.competences.map((comp) => {
        const transverse = base.competences.find((t) => t.code === comp.code);
        const pour = reservoir.filter((q) => q.competence === comp.code);
        const c = pack?.competences.find((x) => x.code === comp.code);
        return (
          <section key={comp.code} className="space-y-3" aria-labelledby={`e-${comp.code}`}>
            <h3 id={`e-${comp.code}`} className="text-2xl flex flex-wrap items-center gap-2">
              <span className="pilule">{comp.code}</span> {c?.titre ?? transverse?.nom}
            </h3>
            {transverse ? (
              <details className="carte">
                <summary className="cursor-pointer font-semibold">Les ancres de 1 à 4 — {transverse.nom}</summary>
                <dl className="mt-2 space-y-1 text-sm">
                  {(["1", "2", "3", "4"] as const).map((n) => (
                    <div key={n} className="flex gap-2">
                      <dt className={`pilule pilule-niveau-${n} shrink-0`}>
                        {n} · {base.niveaux[n]}
                      </dt>
                      <dd>{transverse.ancres[n]}</dd>
                    </div>
                  ))}
                </dl>
                <p className="aide mt-2">Attention : {transverse.attention}</p>
              </details>
            ) : null}
            <ul className="space-y-2">
              {pour.map((q) => {
                const coche = r.selection.entretien.includes(q.id);
                return (
                  <li key={q.id} className={`carte ${coche ? "" : "opacity-70"}`}>
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 no-print"
                        checked={coche}
                        onChange={(e) =>
                          enregistrer((x) => ({
                            ...x,
                            selection: { ...x.selection, entretien: e.target.checked ? reservoir.map((k) => k.id).filter((id) => id === q.id || x.selection.entretien.includes(id)) : x.selection.entretien.filter((id) => id !== q.id) },
                          }))
                        }
                      />
                      <span className="space-y-1 flex-1">
                        {q.angle ? <span className="block text-sm text-texte-2">{q.angle}</span> : null}
                        <span className="block font-medium">
                          <Texte>{q.texte}</Texte>
                        </span>
                        {q.suite.length ? <span className="block text-sm">Suite : {q.suite.map(texteSimple).join(" ")}</span> : null}
                        <span className="block text-sm text-texte-2">Attendus : {q.attendus.join(" · ")}</span>
                        <span className="block text-sm text-texte-2">Relance : {q.relance}</span>
                        <span className="block text-sm text-texte-2">Alternative : {q.alternative}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <QuestionsRecruteurEditeur
              libelle="Vos propres questions d'entretien pour cette compétence"
              placeholder="Racontez une fois où…"
              max={LIMITES.questions_recruteur_entretien_par_competence}
              questions={r.questions_recruteur.entretien[comp.code] ?? []}
              onChange={(qs) => enregistrer((x) => ({ ...x, questions_recruteur: { ...x.questions_recruteur, entretien: { ...x.questions_recruteur.entretien, [comp.code]: qs } } }))}
            />
          </section>
        );
      })}

      <section className="space-y-2">
        <h3 className="text-xl">Relances neutres</h3>
        <ul className="flex flex-wrap gap-2">
          {base.relances.map((t) => (
            <li key={t} className="pilule">
              {t}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2">
        <h3 className="text-xl">Ne pas noter</h3>
        <ul className="grid gap-1 tel:grid-cols-2 text-sm">
          {base.ne_pas_noter.map((n) => (
            <li key={n.titre}>
              <strong>{n.titre}.</strong> <span className="text-texte-2">{n.raison}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
