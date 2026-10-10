"use client";

/**
 * « Essayer comme un candidat » : l'épreuve du métier avec les questions du kit,
 * sans rien enregistrer. À la fin, le niveau par compétence (automatique pour les
 * portes 1, 3, 4 ; auto-évalué pour les portes 2 et 5 avec les réponses prévues).
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { useDonnees } from "@/composants/donnees/FournisseurDonnees";
import { Epreuve } from "@/composants/epreuve/Epreuve";
import { Texte } from "@/composants/Texte";
import { Chargement, Message, PiluleNiveau } from "@/composants/ui";
import { figerEpreuve, paquetCandidat } from "@/lib/methode/epreuve";
import { noterP1, noterP2P5, noterP3, noterP4, type Jugement } from "@/lib/methode/notation";
import { nouveauRecrutement } from "@/lib/stockage/recrutements";
import type { Reponses } from "@/lib/stockage/modele";

export function EssaiMetier({ id }: { id: string }) {
  const { catalogue, pret, packDe, etatCatalogue } = useDonnees();
  const [reponses, setReponses] = useState<Reponses | null>(null);
  const [jugements, setJugements] = useState<Record<string, Jugement | undefined>>({});

  const pack = pret && catalogue ? packDe(id) : null;
  const epreuve = useMemo(() => {
    if (!pack || !catalogue) return null;
    const r = nouveauRecrutement({ pack, base: catalogue.base, id: "essai", poste: pack.nom });
    r.deroule = false;
    r.profil_travail = { essentiels: [], phrases: false };
    return figerEpreuve(pack, catalogue.base, r);
  }, [pack, catalogue]);
  const paquet = useMemo(() => (epreuve && catalogue ? paquetCandidat(epreuve, catalogue.base, "essai", null) : null), [epreuve, catalogue]);

  if (!pret) return <Chargement />;
  if (!catalogue) return <Message type="alerte">{etatCatalogue.texte}</Message>;
  if (!pack || !epreuve || !paquet) return <Message type="alerte">Métier introuvable.</Message>;
  const base = catalogue.base;

  if (!reponses) {
    return (
      <div className="space-y-4">
        <Message>
          Mode essai : vous passez l&apos;épreuve de <strong>{pack.nom}</strong> avec les questions du kit. Rien n&apos;est enregistré. À la fin, vous voyez le niveau par compétence.{" "}
          <Link href={`/metiers/${pack.id}`} className="underline">
            Retour à la fiche
          </Link>
        </Message>
        <Epreuve paquet={paquet} onTerminer={setReponses} libelleFin="Terminer et voir mon niveau" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[52rem]">
      <h1 className="text-4xl">Votre essai : {pack.nom}</h1>
      <p className="text-texte-2">Niveau par compétence, calculé avec les barèmes du kit. Pour les portes 2 et 5, c&apos;est une personne qui juge : comparez vos réponses aux réponses prévues et choisissez.</p>
      <ol className="space-y-4">
        {epreuve.competences.map((c) => {
          const r = reponses.competences[c.code];
          const porte = r?.porte;
          let niveau: 1 | 2 | 3 | 4 | null = null;
          let detail = "sans réponse";
          let humain: { id: string; question: string; reponse: string; justes: string[]; partielles: string[]; eviter: string[] }[] = [];
          if (r && porte === "p1" && c.portes.p1) {
            const n = noterP1(c.portes.p1.questions, r.p1 ?? {}, base.baremes);
            niveau = n.niveau;
            detail = n.detail;
          } else if (r && porte === "p3" && c.portes.p3) {
            const n = noterP3(c.portes.p3, r.p3 ?? {}, base.baremes);
            niveau = n.niveau;
            detail = n.detail;
          } else if (r && porte === "p4" && c.portes.p4) {
            const n = noterP4(c.portes.p4, r.p4, base.baremes);
            niveau = n.niveau;
            detail = n.detail;
          } else if (r && porte === "p2" && c.portes.p2) {
            humain = c.portes.p2.debuts.map((d) => ({
              id: `${c.code}.${d.id}`,
              question: d.debut,
              reponse: r.p2?.[d.id] ?? "",
              justes: d.justes.map((j) => j.texte),
              partielles: (d.partielles ?? []).map((j) => j.texte),
              eviter: (d.a_eviter ?? []).map((j) => j.texte),
            }));
          } else if (r && porte === "p5" && c.portes.p5) {
            humain = c.portes.p5.questions.map((q) => ({
              id: `${c.code}.${q.id}`,
              question: q.texte,
              reponse: r.p5?.[q.id]?.oral ? "(réponse à l'oral)" : (r.p5?.[q.id]?.texte ?? ""),
              justes: q.justes.map((j) => j.texte),
              partielles: (q.partielles ?? []).map((j) => j.texte),
              eviter: (q.a_eviter ?? []).map((j) => j.texte),
            }));
          }
          if (humain.length && (porte === "p2" || porte === "p5")) {
            const js = humain.map((h) => jugements[h.id]);
            if (js.every((j) => j !== undefined)) {
              const n = noterP2P5(porte, js, false);
              niveau = n.niveau;
              detail = n.detail;
            } else detail = "à juger ci-dessous";
          }
          const porteTexte = base.portes.find((p) => p.id === porte);
          return (
            <li key={c.code} className="carte space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pilule">{c.code}</span>
                <h2 className="text-2xl flex-1">{c.titre}</h2>
                <PiluleNiveau niveau={niveau} requis={c.niveau_requis} />
              </div>
              <p className="text-sm text-texte-2">
                {porteTexte ? `Porte ${porteTexte.n} · ${porteTexte.nom}` : "Pas de porte"} · {detail} · niveau requis {c.niveau_requis}
              </p>
              {humain.length ? (
                <ul className="space-y-3">
                  {humain.map((h) => (
                    <li key={h.id} className="rounded-m bg-surface-2 p-3 space-y-2">
                      <p className="font-medium">
                        <Texte>{h.question}</Texte>
                      </p>
                      <p>
                        <span className="text-texte-2">Votre réponse :</span> {h.reponse || <em>vide</em>}
                      </p>
                      <p className="text-sm">
                        <span className="text-texte-2">Réponses justes prévues :</span> {h.justes.join(" · ")}
                        {h.partielles.length ? (
                          <>
                            <br />
                            <span className="text-texte-2">Partielles :</span> {h.partielles.join(" · ")}
                          </>
                        ) : null}
                        {h.eviter.length ? (
                          <>
                            <br />
                            <span className="text-texte-2">À éviter :</span> {h.eviter.join(" · ")}
                          </>
                        ) : null}
                      </p>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Votre jugement">
                        {(["juste", "partielle", "eviter"] as Jugement[]).map((j) => (
                          <button key={j} type="button" role="radio" aria-checked={jugements[h.id] === j} className={`bouton ${jugements[h.id] === j ? "bouton-principal" : ""}`} onClick={() => setJugements({ ...jugements, [h.id]: j })}>
                            {j === "juste" ? "Juste (2)" : j === "partielle" ? "Partielle (1)" : "À éviter (0)"}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="aide">Mode essai : rien n&apos;a été enregistré. Dans un vrai recrutement, l&apos;analyse ajoute les repères montrés, les points à vérifier, les relances et le brouillon de retour.</p>
      <div className="flex flex-wrap gap-2">
        <Link href={`/recrutements/nouveau?metier=${pack.id}`} className="bouton bouton-principal">
          Créer un recrutement avec ce métier
        </Link>
        <Link href={`/metiers/${pack.id}`} className="bouton">
          Retour à la fiche
        </Link>
      </div>
    </div>
  );
}
