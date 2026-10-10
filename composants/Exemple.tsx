"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useDonnees } from "@/composants/donnees/FournisseurDonnees";
import { Chargement, Message, PiluleNiveau } from "@/composants/ui";
import { classerCandidats } from "@/lib/methode/analyse";
import { ID_EXEMPLE, installerExemple } from "@/lib/methode/exemple";

/** « Voir un exemple rempli » : recrutement fictif, trois candidats, classement et profil de travail. */
export function Exemple() {
  const { etat, catalogue, pret, packDe, modifier, etatCatalogue } = useDonnees();
  const lance = useRef(false);
  const r = etat?.recrutements.find((x) => x.id === ID_EXEMPLE) ?? null;

  useEffect(() => {
    if (!pret || !catalogue || r || lance.current) return;
    const pack = packDe("serveur");
    if (!pack) return;
    lance.current = true;
    void modifier((e) => installerExemple(e, pack, catalogue.base));
  }, [pret, catalogue, r, packDe, modifier]);

  if (!pret) return <Chargement />;
  if (!catalogue) return <Message type="alerte">{etatCatalogue.texte}</Message>;
  if (!r || !etat) return <Chargement texte="Création de l'exemple fictif…" />;
  const candidats = etat.candidats.filter((c) => c.recrutement_id === r.id);
  const { lignes } = classerCandidats(catalogue.base, r, candidats);
  const codes = r.epreuve?.competences.map((c) => c.code) ?? [];

  return (
    <div className="space-y-6 max-w-[52rem]">
      <header className="space-y-2">
        <span className="pilule bg-alerte-fond text-alerte-texte">Exemple FICTIF</span>
        <h1 className="text-4xl">Un recrutement rempli, pour tout découvrir en cinq minutes</h1>
        <p className="text-texte-2">
          Trois personnes imaginaires ont passé l&apos;épreuve « {r.metier_nom} » ; deux évaluateurs fictifs ont noté l&apos;entretien. Aucune vraie personne. Vous pouvez tout ouvrir, tout modifier, et supprimer l&apos;exemple quand vous voulez (« Fin du recrutement »).
        </p>
      </header>

      <section className="carte space-y-3">
        <h2 className="text-2xl">Le classement</h2>
        <ol className="space-y-2">
          {lignes.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2">
              <span className="pilule">Rang {l.rang}</span>
              <Link href={`/recrutements/${r.id}/candidats/${l.id}/analyse`} className="font-titre text-xl underline">
                {l.nom}
              </Link>
              <span className="flex flex-wrap gap-1 text-sm">
                {codes.map((code) => (
                  <PiluleNiveau key={code} niveau={l.niveaux[code]} requis={r.competences.find((x) => x.code === code)?.niveau_requis} />
                ))}
              </span>
              <span className="text-sm text-texte-2">
                {l.auRequis}/{codes.length} au niveau requis
              </span>
            </li>
          ))}
        </ol>
        <p className="aide">Le classement aide à décider, il ne décide pas. Le profil de travail est à côté (voir l&apos;analyse de chaque personne).</p>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Link href={`/recrutements/${r.id}/preparer/poste`} className="carte hover:bg-surface-2">
          <span className="block text-xl font-titre">1. Préparer</span>
          <span className="block text-sm text-texte-2">Le poste, l&apos;épreuve, les questions, l&apos;entretien, les envois, vérifier.</span>
        </Link>
        <Link href={`/recrutements/${r.id}/candidats`} className="carte hover:bg-surface-2">
          <span className="block text-xl font-titre">2. Les candidats</span>
          <span className="block text-sm text-texte-2">Épreuve, entretien, analyse, décision pour chaque personne.</span>
        </Link>
        <Link href={`/recrutements/${r.id}/classement`} className="carte hover:bg-surface-2">
          <span className="block text-xl font-titre">3. Classement et suivi</span>
          <span className="block text-sm text-texte-2">Comparaison, équité entre les portes, accord entre évaluateurs.</span>
        </Link>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl">Et pour de vrai</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/metiers" className="bouton bouton-principal">
            Choisir un métier
          </Link>
          <Link href="/metiers/serveur/essai" className="bouton">
            Essayer comme un candidat
          </Link>
        </div>
      </section>
    </div>
  );
}
