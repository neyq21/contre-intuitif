"use client";

import Link from "next/link";
import { useState } from "react";
import { candidatParId, useDonnees } from "@/composants/donnees/FournisseurDonnees";
import { Texte } from "@/composants/Texte";
import { Bouton, Chargement, Message, Onglets, PiluleNiveau, formaterDate } from "@/composants/ui";
import type { Base, CodeCompetence } from "@/lib/contenu/types";
import { noterP1, noterP2P5, noterP3, noterP4, noterReel, type Jugement } from "@/lib/methode/notation";
import { idsReponsesP2, idsReponsesP5 } from "@/lib/methode/analyse";
import { evaluationDe, evaluateurCourant } from "@/lib/stockage/recrutements";
import type { Candidat, CompetenceFigee, Evaluateur, Evaluation, Recrutement, StatutDecision } from "@/lib/stockage/modele";
import { Document } from "@/composants/epreuve/Document";
import { EntretienCandidat, AnalyseCandidat } from "./FicheCandidatAnalyse";
import { ADistance } from "./ADistance";
import { useRecrutement } from "./useRecrutement";

import { ONGLETS, type OngletId } from "./constantes";
export { ONGLETS };
export type { OngletId };

export type ModifierCandidat = (fn: (c: Candidat, r: Recrutement) => void) => Promise<void>;
export type ModifierEvaluation = (fn: (ev: Evaluation) => void) => Promise<void>;

export function FicheCandidat({ id, cid, onglet }: { id: string; cid: string; onglet: OngletId }) {
  const ctx = useRecrutement(id);
  const { etat, modifier } = useDonnees();
  const { pret, recrutement: r, base, pack } = ctx;
  const candidat = candidatParId(etat, cid);
  if (!pret) return <Chargement />;
  if (!r || !base || !etat) return <Chargement texte="Catalogue en cours de chargement…" />;
  if (!candidat || candidat.recrutement_id !== id) return <Message type="alerte">Candidat introuvable sur cet ordinateur.</Message>;

  const evaluateur = evaluateurCourant(etat, r);
  const evaluation = evaluationDe(candidat, evaluateur);
  const prefixe = `/recrutements/${id}/candidats/${cid}`;

  const modifierCandidat: ModifierCandidat = async (fn) => {
    await modifier((e) => {
      const c = e.candidats.find((x) => x.id === cid);
      const rec = e.recrutements.find((x) => x.id === id);
      if (c && rec) fn(c, rec);
    });
  };
  const modifierEvaluation: ModifierEvaluation = async (fn) => {
    await modifierCandidat((c) => {
      const ev = c.evaluations[evaluateur.id] ?? evaluationDe(c, evaluateur);
      fn(ev);
      ev.modifie_le = new Date().toISOString();
      c.evaluations[evaluateur.id] = ev;
    });
  };

  return (
    <div className="space-y-5">
      <nav className="text-sm no-print">
        <Link href={`/recrutements/${id}/candidats`} className="underline">
          ← Tous les candidats
        </Link>
      </nav>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl">{candidat.nom}</h2>
          <p className="text-sm text-texte-2">
            {candidat.mode === "ecran" ? "Sur cet écran" : "À distance"} · {candidat.reponses ? `épreuve rendue le ${formaterDate(candidat.reponses.rendu_le)}` : candidat.commence ? "épreuve commencée" : "épreuve à passer"}
          </p>
        </div>
        <ChoixEvaluateur r={r} evaluateur={evaluateur} />
      </header>
      <Onglets actif={`${prefixe}/${onglet}`} onglets={ONGLETS.map((o) => ({ href: `${prefixe}/${o.id}`, libelle: o.libelle }))} />

      {onglet === "epreuve" ? (
        candidat.reponses && r.epreuve ? (
          <EpreuveRendue r={r} candidat={candidat} base={base} evaluation={evaluation} evaluateur={evaluateur} modifierEvaluation={modifierEvaluation} />
        ) : candidat.mode === "distance" ? (
          <ADistance r={r} candidat={candidat} base={base} pack={pack} modifierCandidat={modifierCandidat} />
        ) : (
          <Message>
            Cette personne passe l&apos;épreuve sur cet écran. Depuis « Candidats », cliquez sur « Passer l&apos;épreuve sur cet écran ».{" "}
            <Link href={`/recrutements/${id}/candidats`} className="underline">
              Les candidats
            </Link>
          </Message>
        )
      ) : null}
      {onglet === "entretien" ? <EntretienCandidat r={r} candidat={candidat} base={base} evaluation={evaluation} evaluateur={evaluateur} modifierEvaluation={modifierEvaluation} /> : null}
      {onglet === "analyse" ? <AnalyseCandidat r={r} candidat={candidat} base={base} /> : null}
      {onglet === "decision" ? <DecisionCandidat r={r} candidat={candidat} base={base} evaluateur={evaluateur} modifierCandidat={modifierCandidat} /> : null}
      {onglet === "besoins" ? <BesoinsCandidat candidat={candidat} base={base} modifierCandidat={modifierCandidat} /> : null}
    </div>
  );
}

function ChoixEvaluateur({ r, evaluateur }: { r: Recrutement; evaluateur: Evaluateur }) {
  const { modifier } = useDonnees();
  const options = r.evaluateurs.length ? r.evaluateurs : [evaluateur];
  return (
    <label className="text-sm no-print">
      <span className="block text-texte-2">Je note en tant que</span>
      <select className="champ min-w-[12rem]" value={evaluateur.id} onChange={(e) => modifier((et) => void (et.reglages.evaluateur_courant = e.target.value))}>
        {options.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.nom}
          </option>
        ))}
      </select>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Épreuve rendue : réponses, corrections automatiques, jugements humains
// ---------------------------------------------------------------------------

const JUGEMENTS: { id: Jugement; libelle: string }[] = [
  { id: "juste", libelle: "Juste (2)" },
  { id: "partielle", libelle: "Partielle (1)" },
  { id: "eviter", libelle: "À éviter (0)" },
];

function EpreuveRendue({ r, candidat, base, evaluation, evaluateur, modifierEvaluation }: { r: Recrutement; candidat: Candidat; base: Base; evaluation: Evaluation; evaluateur: Evaluateur; modifierEvaluation: ModifierEvaluation }) {
  const ep = r.epreuve!;
  const rep = candidat.reponses!;
  return (
    <div className="space-y-6">
      <p className="aide">
        Les portes 1, 3 et 4 sont corrigées automatiquement. Les portes 2 et 5 sont jugées par vous ({evaluateur.nom}) avec les réponses prévues : juste, partielle, à éviter. Le temps n&apos;a pas été mesuré.
      </p>
      {ep.competences.map((c) => {
        const rc = rep.competences[c.code];
        const porte = base.portes.find((p) => p.id === rc?.porte);
        return (
          <section key={c.code} className="carte space-y-4" aria-labelledby={`ep-${c.code}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="pilule">{c.code}</span>
              <h3 id={`ep-${c.code}`} className="text-2xl flex-1">
                {c.titre}
              </h3>
              <span className="pilule">{porte ? `Porte ${porte.n} · ${porte.nom}` : "Pas de réponse"}</span>
            </div>
            <details>
              <summary className="cursor-pointer text-sm underline">La situation</summary>
              <p className="mt-2">
                <Texte>{c.situation.texte}</Texte>
              </p>
              <Document document={c.situation.document} />
            </details>
            {rc?.porte === "p1" && c.portes.p1 ? <VueP1 c={c} rc={rc} base={base} /> : null}
            {rc?.porte === "p3" && c.portes.p3 ? <VueP3 c={c} rc={rc} base={base} /> : null}
            {rc?.porte === "p4" && c.portes.p4 ? <VueP4 c={c} rc={rc} base={base} /> : null}
            {rc?.porte === "p2" && c.portes.p2 ? <JugerP2P5 porte="p2" c={c} rc={rc} evaluation={evaluation} modifierEvaluation={modifierEvaluation} /> : null}
            {rc?.porte === "p5" && c.portes.p5 ? <JugerP2P5 porte="p5" c={c} rc={rc} evaluation={evaluation} modifierEvaluation={modifierEvaluation} /> : null}
            {c.portes.p4?.reel ? <VarianteReelle c={c} evaluation={evaluation} modifierEvaluation={modifierEvaluation} /> : null}
          </section>
        );
      })}
    </div>
  );
}

function VueP1({ c, rc, base }: { c: CompetenceFigee; rc: NonNullable<Candidat["reponses"]>["competences"][CodeCompetence]; base: Base }) {
  const questions = c.portes.p1!.questions;
  const res = noterP1(questions, rc?.p1 ?? {}, base.baremes);
  return (
    <div className="space-y-3">
      <p>
        <PiluleNiveau niveau={res.niveau} requis={c.niveau_requis} /> <span className="text-sm text-texte-2">{res.detail}</span>
      </p>
      <ol className="space-y-2">
        {questions.map((q, i) => {
          const choisie = q.options.find((o) => o.id === rc?.p1?.[q.id]);
          const meilleure = q.options.find((o) => o.points === 2);
          return (
            <li key={q.id} className="rounded-s bg-surface-2 p-3 text-sm space-y-1">
              <p className="font-medium">
                {i + 1}. <Texte>{q.texte}</Texte>
              </p>
              <p>
                Réponse : {choisie ? <Texte>{choisie.texte}</Texte> : <em>sans réponse</em>} — <strong>{choisie?.points ?? 0} pt</strong>
                {choisie?.repere ? <span className="text-texte-2"> · repère {base.reperes.find((x) => x.id === choisie.repere)?.label}</span> : null}
              </p>
              {choisie?.points !== 2 && meilleure ? (
                <p className="text-texte-2">
                  Meilleure réponse : <Texte>{meilleure.texte}</Texte>
                  {q.explication ? ` — ${q.explication}` : ""}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function VueP3({ c, rc, base }: { c: CompetenceFigee; rc: NonNullable<Candidat["reponses"]>["competences"][CodeCompetence]; base: Base }) {
  const v = c.portes.p3!;
  const res = noterP3(v, rc?.p3 ?? {}, base.baremes);
  const q = v.question.options.find((o) => o.id === rc?.p3?.question);
  const s = v.suite.options.find((o) => o.id === rc?.p3?.suite);
  const coches = new Set(rc?.p3?.indices ?? []);
  return (
    <div className="space-y-2 text-sm">
      <p>
        <PiluleNiveau niveau={res.niveau} requis={c.niveau_requis} /> <span className="text-texte-2">{res.detail}</span>
      </p>
      <p>
        <strong>Réponse donnée :</strong> <Texte>{v.reponse}</Texte>
      </p>
      <p>
        <strong>Question retrouvée :</strong> {q ? <Texte>{q.texte}</Texte> : <em>sans réponse</em>} ({q?.points ?? 0}/2)
      </p>
      <p>
        <strong>Indices :</strong>{" "}
        {v.indices.options.map((i) => (
          <span key={i.id} className={`pilule mr-1 mb-1 ${coches.has(i.id) ? (i.juste ? "pilule-niveau-3" : "pilule-niveau-1") : ""}`}>
            {coches.has(i.id) ? (i.juste ? "✓ " : "✕ ") : ""}
            {i.texte}
          </span>
        ))}
      </p>
      <p>
        <strong>La suite :</strong> {s ? <Texte>{s.texte}</Texte> : <em>sans réponse</em>} ({s?.points ?? 0}/2)
      </p>
      {v.explication ? <p className="text-texte-2">{v.explication}</p> : null}
    </div>
  );
}

function VueP4({ c, rc, base }: { c: CompetenceFigee; rc: NonNullable<Candidat["reponses"]>["competences"][CodeCompetence]; base: Base }) {
  const v = c.portes.p4!;
  const res = noterP4(v, rc?.p4, base.baremes);
  const r4 = rc?.p4;
  return (
    <div className="space-y-2 text-sm">
      <p>
        <PiluleNiveau niveau={res.niveau} requis={c.niveau_requis} /> <span className="text-texte-2">{res.detail}</span>
      </p>
      <p className="font-medium">{v.titre}</p>
      {v.type === "ordonner" && r4?.type === "ordonner" ? (
        <ol className="list-decimal pl-5">
          {r4.ordre.map((id) => (
            <li key={id}>{v.elements.find((e) => e.id === id)?.texte ?? id}</li>
          ))}
        </ol>
      ) : null}
      {v.type === "ordonner" ? (
        <ul className="text-texte-2">
          {v.regles.map((rg, i) => {
            const ordre = r4?.type === "ordonner" ? r4.ordre : [];
            const ok = ordre.indexOf(rg.avant) >= 0 && ordre.indexOf(rg.avant) < ordre.indexOf(rg.apres);
            return (
              <li key={i}>
                {ok ? "✓" : "✕"} {v.elements.find((e) => e.id === rg.avant)?.texte} avant {v.elements.find((e) => e.id === rg.apres)?.texte}
                {rg.explication ? ` — ${rg.explication}` : ""}
              </li>
            );
          })}
        </ul>
      ) : null}
      {v.type === "classer" ? (
        <ul>
          {v.elements.map((e) => {
            const choix = r4?.type === "classer" ? r4.classement[e.id] : undefined;
            const ok = choix ? e.accepte.includes(choix) : false;
            return (
              <li key={e.id}>
                {ok ? "✓" : "✕"} {e.texte} → {v.categories.find((k) => k.id === choix)?.nom ?? "non classé"}
                {!ok ? <span className="text-texte-2"> (attendu : {e.accepte.map((a) => v.categories.find((k) => k.id === a)?.nom).join(" ou ")}{e.explication ? ` — ${e.explication}` : ""})</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {v.type === "reperer" ? (
        <ul>
          {v.elements.map((e) => {
            const coche = r4?.type === "reperer" ? r4.reperes.includes(e.id) : false;
            const etat = e.erreur ? (coche ? "✓ erreur trouvée" : "✕ erreur manquée") : coche ? "✕ fausse alerte" : "";
            return (
              <li key={e.id} className={e.erreur || coche ? "" : "text-texte-3"}>
                {e.texte} {etat ? <strong>— {etat}</strong> : null}
                {e.erreur && e.explication ? <span className="text-texte-2"> ({e.explication})</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function JugerP2P5({ porte, c, rc, evaluation, modifierEvaluation }: { porte: "p2" | "p5"; c: CompetenceFigee; rc: NonNullable<Candidat["reponses"]>["competences"][CodeCompetence]; evaluation: Evaluation; modifierEvaluation: ModifierEvaluation }) {
  const ids = porte === "p2" ? idsReponsesP2(c) : idsReponsesP5(c);
  const jugements = evaluation[porte][c.code] ?? {};
  const bonus = evaluation.bonus[c.code]?.[porte] ?? false;
  const complet = ids.every((id) => jugements[id] !== undefined);
  const res = complet ? noterP2P5(porte, ids.map((id) => jugements[id]), bonus) : null;
  const items =
    porte === "p2"
      ? [
          ...c.portes.p2!.debuts.map((d) => ({ id: d.id, question: d.debut, justes: d.justes, partielles: d.partielles ?? [], eviter: d.a_eviter ?? [], recruteur: false })),
          ...c.portes.p2!.recruteur.map((q) => ({ id: q.id, question: q.texte, justes: [], partielles: [], eviter: [], recruteur: true })),
        ]
      : [
          ...c.portes.p5!.questions.map((q) => ({ id: q.id, question: q.texte, justes: q.justes, partielles: q.partielles ?? [], eviter: q.a_eviter ?? [], recruteur: false })),
          ...c.portes.p5!.recruteur.map((q) => ({ id: q.id, question: q.texte, justes: [], partielles: [], eviter: [], recruteur: true })),
        ];
  const bonusTextes = porte === "p2" ? c.portes.p2!.bonus : c.portes.p5!.bonus;
  return (
    <div className="space-y-3">
      <p>
        {res ? (
          <>
            <PiluleNiveau niveau={res.niveau} requis={c.niveau_requis} /> <span className="text-sm text-texte-2">{res.detail}</span>
          </>
        ) : (
          <span className="pilule">à juger : {ids.filter((id) => jugements[id] === undefined).length} réponse{ids.filter((id) => jugements[id] === undefined).length > 1 ? "s" : ""}</span>
        )}
      </p>
      <ol className="space-y-3">
        {items.map((it, i) => {
          const reponse = porte === "p2" ? rc?.p2?.[it.id] : rc?.p5?.[it.id]?.oral ? null : rc?.p5?.[it.id]?.texte;
          const oral = porte === "p5" && rc?.p5?.[it.id]?.oral;
          return (
            <li key={it.id} className="rounded-s bg-surface-2 p-3 space-y-2 text-sm">
              <p className="font-medium">
                {i + 1}. <Texte>{it.question}</Texte>
                {it.recruteur ? <span className="pilule ml-1 text-xs">votre question</span> : null}
              </p>
              {oral ? (
                <label className="block">
                  <span className="text-texte-2">Réponse à l&apos;oral — vos notes (ce que la personne a dit, pas comment) :</span>
                  <textarea className="champ mt-1" rows={2} defaultValue={evaluation.oral[c.code]?.[it.id] ?? ""} onBlur={(e) => modifierEvaluation((ev) => void (ev.oral[c.code] = { ...(ev.oral[c.code] ?? {}), [it.id]: e.target.value }))} />
                </label>
              ) : (
                <p>
                  <span className="text-texte-2">Réponse :</span> {reponse ? reponse : <em>vide</em>}
                </p>
              )}
              {it.justes.length ? (
                <p className="text-texte-2">
                  <strong>Justes :</strong> {it.justes.map((j) => j.texte).join(" · ")}
                  {it.partielles.length ? (
                    <>
                      <br />
                      <strong>Partielles :</strong> {it.partielles.map((j) => j.texte).join(" · ")}
                    </>
                  ) : null}
                  {it.eviter.length ? (
                    <>
                      <br />
                      <strong>À éviter :</strong> {it.eviter.map((j) => j.texte).join(" · ")}
                    </>
                  ) : null}
                </p>
              ) : (
                <p className="text-texte-2">Pas de réponse prévue : jugez avec la grille commune.</p>
              )}
              <div className="flex flex-wrap gap-2 no-print" role="radiogroup" aria-label="Jugement">
                {JUGEMENTS.map((j) => (
                  <button key={j.id} type="button" role="radio" aria-checked={jugements[it.id] === j.id} className={`bouton min-h-10 ${jugements[it.id] === j.id ? "bouton-principal" : ""}`} onClick={() => modifierEvaluation((ev) => void (ev[porte][c.code] = { ...(ev[porte][c.code] ?? {}), [it.id]: j.id }))}>
                    {j.libelle}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5" checked={bonus} onChange={(e) => modifierEvaluation((ev) => void (ev.bonus[c.code] = { ...(ev.bonus[c.code] ?? {}), [porte]: e.target.checked }))} />
        <span>
          Un élément « en plus » est présent (niveau 4 si niveau 3)
          {bonusTextes.length ? <span className="block text-texte-2">Par exemple : {bonusTextes.map((b) => b.texte).join(" · ")}</span> : null}
        </span>
      </label>
    </div>
  );
}

function VarianteReelle({ c, evaluation, modifierEvaluation }: { c: CompetenceFigee; evaluation: Evaluation; modifierEvaluation: ModifierEvaluation }) {
  const reel = c.portes.p4!.reel!;
  const g = evaluation.reel[c.code] ?? { criteres: reel.criteres.map(() => false), bonus: false, utilise: false };
  const res = g.utilise ? noterReel(reel, g.criteres, g.bonus) : null;
  return (
    <details className="rounded-s border border-bord p-3" open={g.utilise}>
      <summary className="cursor-pointer font-medium">Variante en situation réelle (observée avec une grille)</summary>
      <div className="mt-2 space-y-2 text-sm">
        <p className="text-texte-2">{reel.consigne}</p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={g.utilise} onChange={(e) => modifierEvaluation((ev) => void (ev.reel[c.code] = { ...g, utilise: e.target.checked }))} />
          J&apos;ai observé cette personne en situation réelle
        </label>
        {g.utilise ? (
          <>
            {reel.criteres.map((cr, i) => (
              <label key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={g.criteres[i] ?? false}
                  onChange={(e) =>
                    modifierEvaluation((ev) => {
                      const crit = [...g.criteres];
                      crit[i] = e.target.checked;
                      ev.reel[c.code] = { ...g, criteres: crit };
                    })
                  }
                />
                {cr.texte}
              </label>
            ))}
            {reel.bonus ? (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={g.bonus} onChange={(e) => modifierEvaluation((ev) => void (ev.reel[c.code] = { ...g, bonus: e.target.checked }))} />
                En plus : {reel.bonus.texte}
              </label>
            ) : null}
            {res ? (
              <p>
                <PiluleNiveau niveau={res.niveau} requis={c.niveau_requis} /> <span className="text-texte-2">{res.detail}</span>
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Décision
// ---------------------------------------------------------------------------

const STATUTS: { id: StatutDecision; libelle: string }[] = [
  { id: "retenu", libelle: "Retenu" },
  { id: "non_retenu", libelle: "Non retenu" },
  { id: "vivier", libelle: "Vivier" },
  { id: "en_attente", libelle: "En attente" },
];

function DecisionCandidat({ r, candidat, base, evaluateur, modifierCandidat }: { r: Recrutement; candidat: Candidat; base: Base; evaluateur: Evaluateur; modifierCandidat: ModifierCandidat }) {
  const [statut, setStatut] = useState<StatutDecision>(candidat.decision?.statut ?? "en_attente");
  const [motifs, setMotifs] = useState(candidat.decision?.motifs ?? "");
  const [par, setPar] = useState(candidat.decision?.par ?? evaluateur.nom);
  const [enregistre, setEnregistre] = useState(false);
  const faits = Object.values(candidat.evaluations).filter((e) => e.faits.trim());
  return (
    <form
      className="space-y-5 max-w-[44rem]"
      onSubmit={async (e) => {
        e.preventDefault();
        await modifierCandidat((c) => {
          c.decision = { statut, motifs: motifs.trim(), par: par.trim(), le: new Date().toISOString() };
        });
        setEnregistre(true);
      }}
    >
      <p className="aide">La décision s&apos;appuie sur les grilles et sur des faits notés. Le classement aide à décider, il ne décide pas. Les motifs sont écrits par une personne.</p>
      <fieldset className="space-y-2">
        <legend className="etiquette">Statut</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {STATUTS.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={statut === s.id} className={`bouton ${statut === s.id ? "bouton-principal" : ""}`} onClick={() => setStatut(s.id)}>
              {s.libelle}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="etiquette">Motifs (faits observés, niveaux, lien avec le poste) — obligatoires</span>
        <textarea className="champ" rows={6} value={motifs} onChange={(e) => setMotifs(e.target.value)} required placeholder="Par exemple : niveau attendu sur 3 compétences sur 4 ; en situation, vérifie les faits avant d'agir ; à développer : …" />
      </label>
      <label className="block">
        <span className="etiquette">Décision écrite par</span>
        <input className="champ max-w-xs" value={par} onChange={(e) => setPar(e.target.value)} required />
      </label>
      {faits.length ? (
        <div className="carte space-y-1 text-sm">
          <p className="font-semibold">Faits notés par les personnes qui évaluent</p>
          {faits.map((e) => (
            <p key={e.evaluateur.id}>
              <strong>{e.evaluateur.nom} :</strong> {e.faits}
            </p>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Bouton type="submit" variante="principal" disabled={!motifs.trim() || !par.trim()}>
          Enregistrer la décision
        </Bouton>
        {candidat.decision ? <span className="text-sm text-texte-2">Dernière décision : {STATUTS.find((s) => s.id === candidat.decision?.statut)?.libelle} le {formaterDate(candidat.decision.le)} par {candidat.decision.par}</span> : null}
        {enregistre ? <span className="text-sm" role="status">Enregistré.</span> : null}
      </div>
      <p className="aide">
        Pour répondre à la personne : les modèles 6 et 7 sont dans « Préparer → Les envois ». Vivier : 2 ans au plus avec son accord ({base.catalogue.delai ? "" : ""}modèle 7). Mentions légales : voir « Méthode et droit ».
      </p>
      <p className="text-xs text-texte-3">Recrutement : {r.poste}.</p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Besoins d'aménagement (sans la raison, à part des grilles)
// ---------------------------------------------------------------------------

function BesoinsCandidat({ candidat, base, modifierCandidat }: { candidat: Candidat; base: Base; modifierCandidat: ModifierCandidat }) {
  const declares = candidat.reponses?.besoins;
  return (
    <div className="space-y-4 max-w-[44rem]">
      <p className="aide">
        « De quoi avez-vous besoin pour que l&apos;entretien se passe bien ? » Notez le besoin, jamais la raison. Ces notes restent à part des grilles et ne sont pas dans l&apos;archive de fin de recrutement. Si un besoin est signalé, le déroulé n&apos;est jamais proposé à cette personne.
      </p>
      {declares && (declares.liste.length || declares.autre) ? (
        <Message>
          Déclaré par la personne au début de l&apos;épreuve : {[...declares.liste, declares.autre].filter(Boolean).join(", ")}.
        </Message>
      ) : null}
      <fieldset className="carte space-y-1">
        <legend className="font-ui font-semibold px-1">Besoins notés</legend>
        <div className="grid gap-1 tel:grid-cols-2">
          {base.besoins.map((b) => (
            <label key={b} className="flex items-center gap-2 min-h-11">
              <input
                type="checkbox"
                checked={candidat.besoins.liste.includes(b)}
                onChange={(e) => modifierCandidat((c) => void (c.besoins.liste = e.target.checked ? [...c.besoins.liste, b] : c.besoins.liste.filter((x) => x !== b)))}
              />
              {b}
            </label>
          ))}
        </div>
        <label className="block pt-2">
          <span className="etiquette">Autre (le besoin, pas la raison)</span>
          <input className="champ" defaultValue={candidat.besoins.autre} onBlur={(e) => modifierCandidat((c) => void (c.besoins.autre = e.target.value))} />
        </label>
      </fieldset>
      <details className="carte">
        <summary className="cursor-pointer font-semibold">Pour bien accueillir : aides par profil (jamais une case à cocher sur la personne)</summary>
        <ul className="mt-2 space-y-2 text-sm">
          {base.profils.map((p) => (
            <li key={p.id}>
              <strong>{p.nom}</strong> — {p.aide}
            </li>
          ))}
        </ul>
        <p className="aide mt-2">Ces repères aident à préparer l&apos;accueil de tout le monde. On ne devine jamais un profil, et on ne note rien à ce sujet.</p>
      </details>
    </div>
  );
}
