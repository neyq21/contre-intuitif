"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Chargement, FilAriane, Message, Onglets } from "@/composants/ui";
import { useRecrutement } from "./useRecrutement";

export function CadreRecrutement({ id, children }: { id: string; children: ReactNode }) {
  const { pret, recrutement, candidats, pack, etatCatalogue, catalogue } = useRecrutement(id);
  const pathname = usePathname();
  if (!pret) return <Chargement />;
  if (!recrutement) {
    return (
      <Message type="alerte">
        Ce recrutement n&apos;existe pas sur cet ordinateur.{" "}
        <Link href="/recrutements" className="underline">
          Voir les recrutements
        </Link>
      </Message>
    );
  }
  const rendus = candidats.filter((c) => c.reponses).length;
  const base = `/recrutements/${id}`;
  const onglet = pathname.startsWith(`${base}/preparer`)
    ? `${base}/preparer/poste`
    : pathname.startsWith(`${base}/candidats`)
      ? `${base}/candidats`
      : pathname.startsWith(`${base}/classement`)
        ? `${base}/classement`
        : pathname.startsWith(`${base}/suivi`)
          ? `${base}/suivi`
          : pathname.startsWith(`${base}/fin`)
            ? `${base}/fin`
            : pathname;
  const dansCandidat = /\/candidats\/[^/]+\//.test(pathname);
  return (
    <div className="space-y-5">
      <FilAriane elements={[{ href: "/recrutements", libelle: "Recrutements" }, { libelle: recrutement.poste }]} />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl tel:text-4xl flex flex-wrap items-center gap-3">
            {recrutement.poste}
            {recrutement.fictif ? <span className="pilule bg-alerte-fond text-alerte-texte text-sm">FICTIF</span> : null}
          </h1>
          <p className="text-texte-2">
            {recrutement.metier_nom} · version {recrutement.metier_version}
            {recrutement.epreuve ? " · questions figées" : ""}
          </p>
        </div>
      </header>
      {!pack && catalogue ? (
        <Message type="alerte">
          Le métier « {recrutement.metier_nom} » n&apos;est plus dans le catalogue.{" "}
          {recrutement.epreuve ? "L'épreuve figée reste utilisable avec ses questions copiées en local." : "Importez-le dans « Données » pour pouvoir figer l'épreuve."}
        </Message>
      ) : null}
      {!catalogue && etatCatalogue.type === "erreur" ? <Message type="alerte">{etatCatalogue.texte}</Message> : null}
      {!dansCandidat ? (
        <Onglets
          actif={onglet}
          onglets={[
            { href: `${base}/preparer/poste`, libelle: "Préparer" },
            { href: `${base}/candidats`, libelle: "Candidats", etat: candidats.length ? `${rendus}/${candidats.length}` : undefined },
            { href: `${base}/classement`, libelle: "Classement" },
            { href: `${base}/suivi`, libelle: "Suivi" },
            { href: `${base}/fin`, libelle: "Fin du recrutement" },
          ]}
        />
      ) : null}
      {children}
    </div>
  );
}
