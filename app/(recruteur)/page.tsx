import Link from "next/link";
import { ouvrirBase, lireBase, listerMetiers } from "@/lib/stockage/sqlite";
import { videoDisponible } from "@/lib/contenu/charger";
import { Texte } from "@/composants/Texte";

export const dynamic = "force-dynamic";

export default function Accueil() {
  const db = ouvrirBase();
  const base = lireBase(db);
  const nMetiers = listerMetiers(db, true).length;
  const video = videoDisponible();
  const portes = base.portes;

  const etapes = [
    {
      n: 1,
      titre: "Le métier",
      texte: `Choisissez parmi ${nMetiers} métiers, rangés en ${base.secteurs.length} domaines, ou décrivez votre besoin en une phrase. Chaque métier a 4 compétences, 4 situations concrètes, les 5 portes et un entretien structuré.`,
      actions: [
        { href: "/metiers", libelle: "Voir les métiers" },
        { href: "/metiers/serveur", libelle: "Essayer comme un candidat", secondaire: true },
      ],
    },
    {
      n: 2,
      titre: "L'épreuve",
      texte:
        "Pour chaque situation, la personne candidate choisit sa porte : " +
        portes.map((p) => p.nom.toLowerCase()).join(", ") +
        ". Sur cet écran ou à distance. Sans chronomètre. Toutes les portes visent le même niveau et sont notées avec la même grille.",
      actions: [{ href: "/recrutements/nouveau", libelle: "Créer un recrutement" }],
    },
    {
      n: 3,
      titre: "La décision",
      texte:
        "Niveau par compétence, ce que la personne a montré, points à vérifier, questions de relance, conseils d'accueil, brouillon du retour. Le classement aide à décider : la décision et ses motifs restent écrits par des personnes.",
      actions: [{ href: "/exemple", libelle: "Voir un exemple rempli" }],
    },
  ];

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <p className="pilule">
          {base.meta.marque} · version {base.meta.version} · {base.meta.date}
        </p>
        <h1 className="text-4xl tel:text-6xl">{base.meta.titre}</h1>
        <p className="text-xl tel:text-2xl text-texte-2 max-w-[42rem]">{base.meta.sous_titre}.</p>
        <p className="font-titre text-2xl italic">{base.meta.slogan}</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/exemple" className="bouton bouton-principal">
            Voir un exemple rempli
          </Link>
          <Link href="/metiers" className="bouton">
            Choisir un métier
          </Link>
          {video ? (
            <Link href="/video" className="bouton">
              Le kit en 2 min 35
            </Link>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="etapes" className="space-y-4">
        <h2 id="etapes" className="text-3xl">
          Trois étapes
        </h2>
        <ol className="grid gap-4 tel:grid-cols-3">
          {etapes.map((e) => (
            <li key={e.n} className="carte flex flex-col gap-3">
              <span className="pilule w-fit">Étape {e.n}</span>
              <h3 className="text-2xl">{e.titre}</h3>
              <p className="text-texte-2 flex-1">{e.texte}</p>
              <div className="flex flex-wrap gap-2">
                {e.actions.map((a) => (
                  <Link key={a.href} href={a.href} className={`bouton ${a.secondaire ? "" : "bouton-encre"}`}>
                    {a.libelle}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="portes" className="space-y-4">
        <h2 id="portes" className="text-3xl">
          Les cinq portes
        </h2>
        <p className="text-texte-2 max-w-[42rem]">
          <Texte>{base.guide.methode2}</Texte>
        </p>
        <ul className="grid gap-3 tel:grid-cols-5">
          {portes.map((p) => (
            <li key={p.id} className="carte p-4 space-y-1">
              <span className="pilule">Porte {p.n}</span>
              <h3 className="text-xl">{p.nom}</h3>
              <p className="text-sm text-texte-2">{p.carte}</p>
              <p className="text-xs text-texte-3">Durée indicative : {p.duree}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="promesse" className="carte space-y-2">
        <h2 id="promesse" className="text-2xl">
          Votre métier n&apos;est pas dans la liste ?
        </h2>
        <p className="text-texte-2">{base.catalogue.promesse}</p>
        <p className="text-sm text-texte-3">
          Objectif {base.catalogue.objectif} métiers, par lots de {base.catalogue.lot}, sans engagement de date.
        </p>
        <Link href="/demande" className="bouton w-fit">
          Demander un métier
        </Link>
      </section>

      <footer className="text-sm text-texte-3 space-y-1">
        <p>
          Ce kit n&apos;est ni un avis juridique, ni un outil de diagnostic, ni une intelligence artificielle : les calculs suivent
          des règles fixes, expliquées dans « Méthode et droit ».
        </p>
        <p>
          Sources vérifiées {base.meta.sources_verifiees}. © 2026 {base.meta.marque} · {base.meta.comptes}
        </p>
      </footer>
    </div>
  );
}
