"use client";

import Link from "next/link";
import { useDonnees } from "@/composants/donnees/FournisseurDonnees";
import { Texte } from "@/composants/Texte";
import { Chargement, FilAriane, Message, PiluleNiveau } from "@/composants/ui";
import { aUneBanque, reservoirEntretien, reservoirP1, reservoirP2, reservoirP3, reservoirP4, reservoirP5 } from "@/lib/methode/tirage";
import { Document } from "@/composants/epreuve/Document";

export function FicheMetier({ id }: { id: string }) {
  const { catalogue, pret, packDe, etatCatalogue } = useDonnees();
  if (!pret) return <Chargement />;
  if (!catalogue) return <Message type="alerte">{etatCatalogue.texte}</Message>;
  const pack = packDe(id);
  if (!pack) {
    return (
      <Message type="alerte">
        Ce métier n&apos;est pas (ou plus) dans le catalogue.{" "}
        <Link href="/metiers" className="underline">
          Voir les métiers
        </Link>
      </Message>
    );
  }
  const base = catalogue.base;
  const domaine = catalogue.domaines.find((d) => d.id === pack.secteur);
  const resume = catalogue.metiers.find((m) => m.id === pack.id);
  const banque = aUneBanque(pack);
  const essentiels = base.profil_travail.defauts[pack.id] ?? [];

  return (
    <article className="space-y-8 max-w-[52rem]">
      <FilAriane elements={[{ href: "/metiers", libelle: "Métiers" }, ...(domaine ? [{ href: `/metiers/domaine/${domaine.id}`, libelle: domaine.nom }] : []), { libelle: pack.nom }]} />
      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {resume?.plus_recrute ? <span className="pilule">Parmi les plus recherchés (BMO 2026)</span> : null}
          {banque ? <span className="pilule">Banque de questions</span> : null}
          <span className="pilule">version {pack.version}</span>
        </div>
        <h1 className="text-4xl tel:text-5xl">{pack.nom}</h1>
        <p className="text-xl text-texte-2">{pack.resume}</p>
        <p>
          <strong>Le cadre des situations :</strong> {pack.contexte}
          {pack.cadre ? ` ${pack.cadre}` : ""}
        </p>
        <div className="flex flex-wrap gap-2 no-print">
          <Link href={`/recrutements/nouveau?metier=${pack.id}`} className="bouton bouton-principal">
            Créer un recrutement
          </Link>
          <Link href={`/metiers/${pack.id}/essai`} className="bouton">
            Essayer comme un candidat
          </Link>
          <button type="button" className="bouton" onClick={() => window.print()}>
            Imprimer la fiche
          </button>
        </div>
      </header>

      <section className="space-y-4" aria-labelledby="competences">
        <h2 id="competences" className="text-3xl">
          Quatre compétences, quatre situations
        </h2>
        <ol className="space-y-4">
          {pack.competences.map((c, i) => {
            const transverse = base.competences.find((t) => t.code === c.code);
            return (
              <li key={c.code} className="carte space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="pilule">
                    {i + 1} · {c.code}
                  </span>
                  <PiluleNiveau niveau={c.niveau_requis} libelle={`${base.niveaux[String(c.niveau_requis) as "1"]} requis`} />
                </div>
                <h3 className="text-2xl">{c.titre}</h3>
                <p className="text-texte-2">{c.pourquoi}</p>
                {transverse ? <p className="aide">Compétence transverse : {transverse.nom}. {transverse.definition}</p> : null}
                <div className="rounded-m bg-surface-2 p-4 space-y-2">
                  <p className="font-ui font-semibold">Situation : {c.situation.titre}</p>
                  <p>
                    <Texte>{c.situation.texte}</Texte>
                  </p>
                  <Document document={c.situation.document} />
                </div>
                <details>
                  <summary className="cursor-pointer underline">Les portes de cette situation</summary>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>Porte 1 · {reservoirP1(c).length} questions à choix multiples{banque ? ` (${c.portes.p1.questions.length} + ${c.banque?.p1.length ?? 0} en banque)` : ""}</li>
                    <li>Porte 2 · {reservoirP2(c).length} débuts de phrase</li>
                    <li>Porte 3 · {reservoirP3(c).length} version{reservoirP3(c).length > 1 ? "s" : ""} « retrouvez la question »</li>
                    <li>
                      Porte 4 · {reservoirP4(c).length} défi{reservoirP4(c).length > 1 ? "s" : ""} pratique{reservoirP4(c).length > 1 ? "s" : ""} ({c.portes.p4.type}
                      {c.portes.p4.reel ? ", variante en situation réelle" : ""})
                    </li>
                    <li>Porte 5 · {reservoirP5(c).length} questions à l&apos;oral ou à l&apos;écrit</li>
                  </ul>
                </details>
                {c.integration.length ? (
                  <details>
                    <summary className="cursor-pointer underline">Conseils d&apos;accueil</summary>
                    <ul className="mt-2 list-disc pl-5 space-y-1">
                      {c.integration.map((t, k) => (
                        <li key={k}>{t}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="space-y-3" aria-labelledby="entretien">
        <h2 id="entretien" className="text-3xl">
          Entretien structuré
        </h2>
        <p className="text-texte-2">
          {pack.entretien.length} questions par défaut{banque ? `, ${reservoirEntretien(pack).length - pack.entretien.length} de plus en banque` : ""}. Envoyées à l&apos;avance, posées une par une, telles qu&apos;elles sont écrites.
        </p>
        <ol className="space-y-2">
          {pack.entretien.map((q, i) => (
            <li key={q.id} className="carte p-3">
              <p>
                <span className="text-texte-2">{i + 1}.</span> <Texte>{q.texte}</Texte> <span className="pilule text-xs ml-1">{q.competence}</span>
              </p>
              {q.suite.length ? <p className="text-sm text-texte-2 mt-1">Suite : {q.suite.join(" ")}</p> : null}
            </li>
          ))}
        </ol>
      </section>

      {essentiels.length ? (
        <section className="space-y-2" aria-labelledby="profil">
          <h2 id="profil" className="text-3xl">
            Savoir-être proposés pour ce poste
          </h2>
          <p className="aide">Modifiables dans « Préparer ». Ils n&apos;entrent jamais dans le classement.</p>
          <ul className="flex flex-wrap gap-2">
            {essentiels.map((d) => {
              const dim = base.profil_travail.dimensions.find((x) => x.id === d);
              return dim ? (
                <li key={d} className="pilule">
                  {dim.nom}
                </li>
              ) : null;
            })}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
