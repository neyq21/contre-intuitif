"use client";

import { useState } from "react";
import { Texte, texteSimple } from "@/composants/Texte";
import { Bouton, PiluleNiveau, copier } from "@/composants/ui";
import type { Base, CodeCompetence, Niveau } from "@/lib/contenu/types";
import { analyser } from "@/lib/methode/analyse";
import { repereEntretien } from "@/lib/methode/notation";
import type { Candidat, Evaluateur, Evaluation, Recrutement } from "@/lib/stockage/modele";
import type { ModifierEvaluation } from "./FicheCandidat";

// ---------------------------------------------------------------------------
// Entretien : grille par question, niveau par compétence, faits observés
// ---------------------------------------------------------------------------

export function EntretienCandidat({ r, candidat, base, evaluation, evaluateur, modifierEvaluation }: { r: Recrutement; candidat: Candidat; base: Base; evaluation: Evaluation; evaluateur: Evaluateur; modifierEvaluation: ModifierEvaluation }) {
  const questions = r.epreuve?.entretien.questions ?? [];
  const propres = r.questions_recruteur.entretien;
  const analyse = analyser(base, r, candidat);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 no-print">
        <p className="aide max-w-[40rem]">
          Posez les questions une par une, telles qu&apos;elles sont écrites. Cochez les attendus entendus (repères : tous → 3, au moins la moitié → 2), notez des faits, puis choisissez le niveau de 1 à 4 avec les ancres. Vous notez en tant que {evaluateur.nom}, seul·e, avant de comparer.
        </p>
        <Bouton onClick={() => window.print()}>Imprimer la fiche d&apos;entretien</Bouton>
      </div>
      {!r.epreuve ? <p className="aide">L&apos;entretien utilise les questions choisies dans « Préparer » ; elles se figent avec l&apos;épreuve.</p> : null}
      <h3 className="text-2xl print:block hidden">Fiche d&apos;entretien — {candidat.nom} — {r.poste}</h3>
      {r.competences.map((comp) => {
        const transverse = base.competences.find((t) => t.code === comp.code);
        const qs = questions.filter((q) => q.competence === comp.code);
        const miennes = propres[comp.code] ?? [];
        const a = analyse?.competences.find((x) => x.code === comp.code);
        let coches = 0;
        let total = 0;
        for (const q of qs) {
          total += q.attendus.length;
          coches += (evaluation.entretien[q.id]?.attendus ?? []).filter(Boolean).length;
        }
        const repere = repereEntretien(coches, total);
        const niveau = evaluation.entretien_niveau[comp.code] ?? null;
        return (
          <section key={comp.code} className="carte space-y-4" aria-labelledby={`en-${comp.code}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="pilule">{comp.code}</span>
              <h3 id={`en-${comp.code}`} className="text-2xl flex-1">
                {r.epreuve?.competences.find((c) => c.code === comp.code)?.titre ?? transverse?.nom}
              </h3>
              <span className="text-sm text-texte-2">niveau requis {comp.niveau_requis}</span>
            </div>
            {a?.relances.length ? (
              <details className="text-sm">
                <summary className="cursor-pointer underline">Relances pour cette personne, d&apos;après l&apos;épreuve ({a.relances.length})</summary>
                <ul className="mt-1 list-disc pl-5">
                  {a.relances.map((x, i) => (
                    <li key={i}>{texteSimple(x)}</li>
                  ))}
                </ul>
              </details>
            ) : null}
            <ol className="space-y-3">
              {qs.map((q, i) => {
                const e = evaluation.entretien[q.id] ?? { attendus: q.attendus.map(() => false), notes: "" };
                return (
                  <li key={q.id} className="rounded-s bg-surface-2 p-3 space-y-2">
                    <p className="font-medium">
                      {i + 1}. <Texte>{q.texte}</Texte>
                    </p>
                    {q.suite.length ? <p className="text-sm text-texte-2">Suite : {q.suite.map(texteSimple).join(" ")}</p> : null}
                    <p className="text-sm text-texte-2">Alternative : {q.alternative}</p>
                    <ul className="space-y-1">
                      {q.attendus.map((att, k) => (
                        <li key={k}>
                          <label className="flex items-center gap-2 text-sm min-h-9">
                            <input
                              type="checkbox"
                              checked={e.attendus[k] ?? false}
                              onChange={(ev) =>
                                modifierEvaluation((x) => {
                                  const att2 = [...(x.entretien[q.id]?.attendus ?? q.attendus.map(() => false))];
                                  att2[k] = ev.target.checked;
                                  x.entretien[q.id] = { attendus: att2, notes: x.entretien[q.id]?.notes ?? "" };
                                })
                              }
                            />
                            {att}
                          </label>
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-texte-2">Relance : {q.relance}</p>
                    <label className="block">
                      <span className="text-sm">Faits notés (ce qui a été dit et fait)</span>
                      <textarea className="champ mt-1" rows={2} defaultValue={e.notes} onBlur={(ev) => modifierEvaluation((x) => void (x.entretien[q.id] = { attendus: x.entretien[q.id]?.attendus ?? q.attendus.map(() => false), notes: ev.target.value }))} />
                    </label>
                  </li>
                );
              })}
              {miennes.map((q, i) => {
                const e = evaluation.entretien[q.id] ?? { attendus: [], notes: "" };
                return (
                  <li key={q.id} className="rounded-s bg-surface-2 p-3 space-y-2">
                    <p className="font-medium">
                      {qs.length + i + 1}. {q.texte} <span className="pilule text-xs">votre question</span>
                    </p>
                    <label className="block">
                      <span className="text-sm">Faits notés</span>
                      <textarea className="champ mt-1" rows={2} defaultValue={e.notes} onBlur={(ev) => modifierEvaluation((x) => void (x.entretien[q.id] = { attendus: [], notes: ev.target.value }))} />
                    </label>
                  </li>
                );
              })}
            </ol>
            <div className="space-y-2">
              <p className="text-sm">
                Attendus cochés : {coches}/{total}
                {repere ? ` — repère : niveau ${repere}` : ""}
              </p>
              <fieldset>
                <legend className="font-ui font-semibold">Niveau choisi par {evaluateur.nom}</legend>
                <div className="flex flex-wrap gap-2 mt-1" role="radiogroup">
                  {([1, 2, 3, 4] as Niveau[]).map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={niveau === n} className={`bouton ${niveau === n ? "bouton-principal" : ""}`} onClick={() => modifierEvaluation((x) => void (x.entretien_niveau[comp.code] = n))} title={transverse?.ancres[String(n) as "1"]}>
                      {n} · {base.niveaux[String(n) as "1"]}
                    </button>
                  ))}
                  <button type="button" className="bouton bouton-discret" onClick={() => modifierEvaluation((x) => void (x.entretien_niveau[comp.code] = null))}>
                    Pas encore
                  </button>
                </div>
              </fieldset>
              {transverse ? (
                <details className="text-sm">
                  <summary className="cursor-pointer underline">Les ancres</summary>
                  <dl className="mt-1 space-y-1">
                    {(["1", "2", "3", "4"] as const).map((n) => (
                      <div key={n}>
                        <dt className="inline font-semibold">
                          {n} · {base.niveaux[n]} :
                        </dt>{" "}
                        <dd className="inline">{transverse.ancres[n]}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="aide mt-1">Attention : {transverse.attention}</p>
                </details>
              ) : null}
            </div>
          </section>
        );
      })}
      <label className="block carte">
        <span className="etiquette">Faits observés pendant l&apos;entretien (jamais l&apos;apparence, le regard, la poignée de main, l&apos;agitation)</span>
        <textarea className="champ" rows={3} defaultValue={evaluation.faits} onBlur={(e) => modifierEvaluation((x) => void (x.faits = e.target.value))} />
      </label>
      <div className="print:block hidden text-sm">
        <p className="font-semibold">Ne pas noter :</p>
        <ul className="list-disc pl-5">
          {base.ne_pas_noter.map((n) => (
            <li key={n.titre}>{n.titre}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analyse
// ---------------------------------------------------------------------------

export function AnalyseCandidat({ r, candidat, base }: { r: Recrutement; candidat: Candidat; base: Base }) {
  const a = analyser(base, r, candidat);
  const [copie, setCopie] = useState(false);
  if (!a) return <p className="aide">L&apos;analyse apparaît dès que l&apos;épreuve est figée et qu&apos;une réponse ou une évaluation existe.</p>;
  const evaluateurs = r.evaluateurs.length ? r.evaluateurs : [{ id: "moi", nom: "Moi" }];
  const nomEval = (id?: string) => evaluateurs.find((e) => e.id === id)?.nom ?? id ?? "automatique";
  const deroule = candidat.reponses?.deroule;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <p className="aide max-w-[40rem]">
          Niveau prouvé par compétence, ce qui a été montré, points à vérifier, relances, conseils d&apos;accueil, brouillon de retour. Règles fixes du guide « Comment les analyses sont calculées ». Le profil de travail est à côté, jamais dans le niveau.
        </p>
        <Bouton onClick={() => window.print()}>Imprimer l&apos;analyse</Bouton>
      </div>
      <h3 className="text-2xl print:block hidden">Analyse — {candidat.nom} — {r.poste}</h3>
      <p>
        <strong>
          {a.au_requis} compétence{a.au_requis > 1 ? "s" : ""} sur {a.competences.length} au niveau requis
        </strong>
        {a.mesurees < a.competences.length ? ` · ${a.competences.length - a.mesurees} non mesurée${a.competences.length - a.mesurees > 1 ? "s" : ""}` : ""}
        {!a.complete ? " · analyse incomplète (réponses à juger ou entretien à noter)" : ""}
      </p>

      {a.competences.map((c) => (
        <section key={c.code} className="carte space-y-3" aria-labelledby={`an-${c.code}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="pilule">{c.code}</span>
            <h3 id={`an-${c.code}`} className="text-2xl flex-1">
              {c.titre}
            </h3>
            <PiluleNiveau niveau={c.niveau} requis={c.niveau_requis} />
          </div>
          {c.en_attente_evaluation ? <p className="encart text-sm">Les réponses de la porte {c.porte_choisie === "p2" ? "2" : "5"} attendent un jugement (onglet Épreuve).</p> : null}
          <ul className="text-sm space-y-1">
            {c.mesures.map((m, i) => (
              <li key={i}>
                <strong>{m.porte === "entretien" ? "Entretien" : m.porte === "reel" ? "Situation réelle" : `Porte ${m.porte.slice(1)}`}</strong> ({nomEval(m.evaluateur)}) : niveau {m.niveau} — {m.resultat.detail}
              </li>
            ))}
            {!c.mesures.length ? <li className="text-texte-2">Aucune mesure pour l&apos;instant.</li> : null}
          </ul>
          {c.ecart ? <p className="encart encart-alerte text-sm">Écart entre l&apos;épreuve (niveau {c.niveau_epreuve}) et l&apos;entretien (niveau {c.niveau_entretien}) : le niveau prouvé est le plus bas ; discutez avec les faits notés.</p> : null}
          <div className="grid gap-4 tel:grid-cols-2">
            <div>
              <h4 className="font-ui font-semibold">Ce qui a été montré</h4>
              {c.montre.length ? (
                <ul className="list-disc pl-5 text-sm">
                  {c.montre.map((m) => (
                    <li key={m.id}>{m.label}</li>
                  ))}
                </ul>
              ) : (
                <p className="aide">Pas de repère montré.</p>
              )}
            </div>
            <div>
              <h4 className="font-ui font-semibold">Points à vérifier</h4>
              {c.a_verifier.length ? (
                <ul className="list-disc pl-5 text-sm">
                  {c.a_verifier.map((v, i) => (
                    <li key={i}>{v.texte}</li>
                  ))}
                </ul>
              ) : (
                <p className="aide">Rien à signaler.</p>
              )}
            </div>
            <div>
              <h4 className="font-ui font-semibold">Questions de relance</h4>
              {c.relances.length ? (
                <ul className="list-disc pl-5 text-sm">
                  {c.relances.map((x, i) => (
                    <li key={i}>{texteSimple(x)}</li>
                  ))}
                </ul>
              ) : (
                <p className="aide">—</p>
              )}
            </div>
            <div>
              <h4 className="font-ui font-semibold">Conseils d&apos;accueil</h4>
              {c.conseils.length ? (
                <ul className="list-disc pl-5 text-sm">
                  {c.conseils.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              ) : (
                <p className="aide">—</p>
              )}
            </div>
          </div>
        </section>
      ))}

      {a.profil_travail.length ? (
        <section className="carte space-y-3">
          <h3 className="text-2xl">{base.profil_travail.titre}</h3>
          <p className="aide">Ce que la personne a fait dans les situations, pour chaque savoir-être essentiel, et ses phrases « Au travail… » si elle a souhaité y répondre. Jamais noté, jamais dans le classement, jamais pour écarter une candidature.</p>
          <ul className="grid gap-3 tel:grid-cols-2">
            {a.profil_travail.map((p) => (
              <li key={p.dimension} className="rounded-s bg-surface-2 p-3 space-y-1 text-sm">
                <p className="font-semibold">{p.nom}</p>
                <p className="text-texte-2">{p.definition}</p>
                {p.faits_plus.length ? <p>Faits : {p.faits_plus.map((f) => f.label).join(" · ")}</p> : null}
                {p.faits_moins.length ? <p>À vérifier : {p.faits_moins.map((f) => f.label).join(" · ")}</p> : null}
                {!p.faits_plus.length && !p.faits_moins.length ? <p className="text-texte-2">Pas de fait observé dans les situations.</p> : null}
                {p.phrases.some((x) => x.reponse) ? (
                  <ul className="list-disc pl-5">
                    {p.phrases
                      .filter((x) => x.reponse)
                      .map((x) => (
                        <li key={x.id}>
                          « {x.texte} » — {x.reponse}
                        </li>
                      ))}
                  </ul>
                ) : null}
                <p className="text-texte-2">Pour l&apos;entretien : {p.question}</p>
                <p className="text-texte-2">Pour l&apos;accueil : {p.aide}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {deroule && deroule.length ? (
        <section className="carte space-y-2">
          <h3 className="text-2xl">Démarche pendant l&apos;épreuve (déroulé)</h3>
          <p className="aide">Accepté par la personne. Jamais dans la note ni dans la décision : pour préparer des questions sur sa méthode de travail. Aucun temps.</p>
          <ul className="text-sm grid gap-1 tel:grid-cols-2">
            {(
              [
                ["porte_regardee", "Portes regardées"],
                ["porte_essayee", "Portes essayées"],
                ["porte_changee", "Changements de porte"],
                ["reponse_changee", "Réponses changées"],
                ["retour", "Retours en arrière"],
                ["relecture", "Relectures"],
              ] as const
            ).map(([type, libelle]) => (
              <li key={type}>
                {libelle} : {deroule.filter((e) => e.type === type).length}
              </li>
            ))}
          </ul>
          <p className="text-sm">Questions de méthode possibles : « Comment avez-vous choisi votre porte ? », « Qu&apos;est-ce qui vous a fait changer de réponse ? », « Que relisez-vous avant de rendre un travail ? »</p>
        </section>
      ) : null}

      <section className="carte space-y-2">
        <h3 className="text-2xl">Brouillon de retour à la personne</h3>
        <p className="aide">Un point fort, un point à développer, à partir des repères (modèle d&apos;e-mail 7). À relire et compléter par vous.</p>
        {a.retour.brouillon ? (
          <pre className="whitespace-pre-wrap font-ui text-sm rounded-s bg-surface-2 p-3">{a.retour.brouillon}</pre>
        ) : (
          <p className="aide">Pas encore de repère pour écrire un retour.</p>
        )}
        {a.retour.points_forts.length > 1 || a.retour.a_developper.length > 1 ? (
          <details className="text-sm">
            <summary className="cursor-pointer underline">Autres phrases disponibles</summary>
            <ul className="list-disc pl-5 mt-1">
              {a.retour.points_forts.slice(1).map((x, i) => (
                <li key={`f${i}`}>{x}</li>
              ))}
              {a.retour.a_developper.slice(1).map((x, i) => (
                <li key={`d${i}`}>{x}</li>
              ))}
            </ul>
          </details>
        ) : null}
        {a.retour.brouillon ? (
          <Bouton
            className="no-print"
            onClick={async () => {
              setCopie(await copier(a.retour.brouillon));
              setTimeout(() => setCopie(false), 2000);
            }}
          >
            {copie ? "Copié" : "Copier le brouillon"}
          </Bouton>
        ) : null}
      </section>
      <p className="text-xs text-texte-3">Codes des compétences : {a.competences.map((c) => c.code as CodeCompetence).join(", ")}. Niveaux : {Object.entries(base.niveaux).map(([n, l]) => `${n} ${l}`).join(", ")}.</p>
    </div>
  );
}
