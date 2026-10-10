"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDonnees } from "@/composants/donnees/FournisseurDonnees";
import { Chargement, Message } from "@/composants/ui";
import { PanneauBesoin } from "./PanneauBesoin";

export function PageMetiers({ domaineId }: { domaineId?: string }) {
  const { catalogue, etat, etatCatalogue, pret } = useDonnees();
  const [recherche, setRecherche] = useState("");

  const metiers = useMemo(() => {
    if (!catalogue) return [];
    const importes = (etat?.metiers_importes ?? []).filter((p) => !catalogue.metiers.some((m) => m.id === p.id));
    return [
      ...catalogue.metiers,
      ...importes.map((p) => ({ id: p.id, version: p.version, nom: p.nom, secteur: p.secteur, alias: p.alias, resume: p.resume, plus_recrute: false, banque: p.competences.some((c) => c.banque), _pv: p._pv, importe: true })),
    ];
  }, [catalogue, etat]);

  if (!pret) return <Chargement />;
  if (!catalogue) return <Message type="alerte">{etatCatalogue.texte}</Message>;

  const q = recherche.trim().toLowerCase();
  const filtres = q ? metiers.filter((m) => m.nom.toLowerCase().includes(q) || m.alias.some((a) => a.toLowerCase().includes(q))) : metiers;
  const domaines = catalogue.domaines.filter((d) => !domaineId || d.id === domaineId);
  const plusRecrutes = metiers.filter((m) => m.plus_recrute);
  const domaine = domaineId ? catalogue.domaines.find((d) => d.id === domaineId) : null;

  return (
    <div className="tel:grid tel:grid-cols-[1fr_320px] tel:gap-8">
      <div className="space-y-8 min-w-0">
        <header className="space-y-2">
          <h1 className="text-4xl">{domaine ? domaine.nom : "Les métiers"}</h1>
          <p className="text-texte-2">
            {domaine ? (
              <Link href="/metiers" className="underline">
                ← Tous les domaines
              </Link>
            ) : (
              `${metiers.length} métiers prêts à l'emploi, en ${catalogue.domaines.length} domaines. Chaque métier a 4 compétences, 4 situations, les 5 portes et un entretien structuré.`
            )}
          </p>
          {etatCatalogue.type === "mis_a_jour" || etatCatalogue.type === "hors_ligne" ? <Message>{etatCatalogue.texte}</Message> : null}
          <label className="block max-w-md">
            <span className="visuellement-cache">Chercher un métier</span>
            <input className="champ" type="search" placeholder="Chercher un métier (nom ou synonyme)" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </label>
        </header>

        {q ? (
          <section className="space-y-3">
            <h2 className="text-2xl">{filtres.length ? `${filtres.length} métier${filtres.length > 1 ? "s" : ""}` : "Aucun métier trouvé"}</h2>
            <ListeMetiers metiers={filtres} />
            {!filtres.length ? (
              <p>
                <Link href="/demande" className="underline">
                  Demander ce métier
                </Link>
              </p>
            ) : null}
          </section>
        ) : (
          <>
            {!domaine && plusRecrutes.length ? (
              <section className="space-y-3" aria-labelledby="plus-recrutes">
                <h2 id="plus-recrutes" className="text-2xl">
                  Les plus recherchés en 2026
                </h2>
                <p className="aide">
                  Enquête Besoins en main-d&apos;œuvre (France Travail). Ces métiers ont une banque de questions pour « Autre tirage ».
                </p>
                <ListeMetiers metiers={plusRecrutes} />
              </section>
            ) : null}

            {domaines.map((d) => {
              const dans = filtres.filter((m) => m.secteur === d.id);
              return (
                <section key={d.id} className="space-y-3" aria-labelledby={`dom-${d.id}`}>
                  <h2 id={`dom-${d.id}`} className="text-2xl flex items-center gap-3">
                    <span aria-hidden="true">▤</span>
                    {domaine ? d.nom : (
                      <Link href={`/metiers/domaine/${d.id}`} className="hover:underline">
                        {d.nom}
                      </Link>
                    )}
                    <span className="pilule">{dans.length}</span>
                  </h2>
                  <ListeMetiers metiers={dans} />
                  {d.bientot?.length ? (
                    <p className="aide">
                      Bientôt : {d.bientot.join(" · ")}.{" "}
                      <Link href="/demande" className="underline">
                        Demander un métier
                      </Link>
                    </p>
                  ) : null}
                </section>
              );
            })}

            {!domaine && catalogue.base.domaines_a_venir.length ? (
              <section className="space-y-2">
                <h2 className="text-2xl">Domaines à venir</h2>
                <ul className="grid gap-2 lg:grid-cols-3">
                  {catalogue.base.domaines_a_venir.map((d) => (
                    <li key={d.id} className="carte p-3">
                      <strong>{d.nom}</strong>
                      <p className="text-sm text-texte-2">{d.exemples.join(" · ")}</p>
                    </li>
                  ))}
                </ul>
                <p className="text-texte-2">{catalogue.base.catalogue.promesse}</p>
              </section>
            ) : null}
          </>
        )}
      </div>
      <PanneauBesoin />
    </div>
  );
}

function ListeMetiers({ metiers }: { metiers: { id: string; nom: string; resume: string; banque: boolean; plus_recrute: boolean; importe?: boolean }[] }) {
  if (!metiers.length) return <p className="aide">Aucun métier dans ce domaine.</p>;
  return (
    <ul className="grid gap-3 tel:grid-cols-2">
      {metiers.map((m) => (
        <li key={m.id}>
          <Link href={`/metiers/${m.id}`} className="carte block h-full hover:bg-surface-2 space-y-1">
            <span className="block text-xl font-titre">{m.nom}</span>
            <span className="block text-sm text-texte-2">{m.resume}</span>
            <span className="flex flex-wrap gap-1 pt-1">
              {m.plus_recrute ? <span className="pilule text-xs">BMO 2026</span> : null}
              {m.banque ? <span className="pilule text-xs">banque de questions</span> : null}
              {m.importe ? <span className="pilule text-xs">importé</span> : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
