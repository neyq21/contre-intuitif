"use client";

/**
 * « Décrire mon besoin » : une phrase → métier reconnu par alias et synonymes,
 * réglages proposés avec les mots qui les ont déclenchés. Aucune IA.
 * Toujours visible sur le côté (ordinateur), tiroir en bas de l'écran (téléphone).
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDonnees } from "@/composants/donnees/FournisseurDonnees";
import { analyserBesoin, type ResultatBesoin } from "@/lib/methode/besoin";
import { nouveauRecrutement, remplacerRecrutement } from "@/lib/stockage/recrutements";

const EXEMPLES = [
  "Un serveur débutant pour le coup de feu, épreuve courte",
  "Une aide-soignante en EHPAD, recrutement inclusif, sans écrit si possible",
  "Un agent d'entretien fiable pour des bureaux le soir, épreuve courte",
];

export function PanneauBesoin() {
  const { catalogue, etat, modifier, packDe } = useDonnees();
  const router = useRouter();
  const [phrase, setPhrase] = useState("");
  const [resultat, setResultat] = useState<ResultatBesoin | null>(null);
  const [ouvert, setOuvert] = useState(false);

  function analyser(p: string) {
    if (!catalogue) return;
    const packs = [...catalogue.packs, ...(etat?.metiers_importes ?? [])];
    setResultat(analyserBesoin(p, packs, catalogue.base));
  }

  async function creer() {
    if (!resultat?.metier || !catalogue) return;
    const pack = packDe(resultat.metier.id);
    if (!pack) return;
    const r = nouveauRecrutement({
      pack,
      base: catalogue.base,
      poste: resultat.poste ?? pack.nom,
      competences: resultat.competences.length ? resultat.competences : undefined,
      portes: resultat.portes ?? undefined,
      nombres: resultat.nombres ?? undefined,
    });
    r.notes = `Besoin décrit : « ${phrase.trim()} »`;
    await modifier((e) => remplacerRecrutement(e, r));
    router.push(`/recrutements/${r.id}/preparer/poste`);
  }

  const contenu = (
    <div className="space-y-3">
      <h2 className="text-xl">Décrire mon besoin</h2>
      <p className="aide">Une phrase suffit. Le métier est reconnu par mots-clés et synonymes, sans intelligence artificielle : chaque réglage dit quels mots l&apos;ont déclenché. La phrase ne quitte pas votre ordinateur.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          analyser(phrase);
        }}
        className="space-y-2"
      >
        <label className="block">
          <span className="visuellement-cache">Votre besoin en une phrase</span>
          <textarea className="champ" rows={3} value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={EXEMPLES[0]} />
        </label>
        <button type="submit" className="bouton bouton-principal w-full" disabled={!phrase.trim() || !catalogue}>
          Reconnaître le métier
        </button>
      </form>
      <details>
        <summary className="text-sm underline cursor-pointer">Exemples</summary>
        <ul className="mt-1 space-y-1">
          {EXEMPLES.map((ex) => (
            <li key={ex}>
              <button
                type="button"
                className="text-left text-sm underline"
                onClick={() => {
                  setPhrase(ex);
                  analyser(ex);
                }}
              >
                {ex}
              </button>
            </li>
          ))}
        </ul>
      </details>

      {resultat ? (
        <div className="space-y-3 border-t border-bord pt-3" aria-live="polite">
          {resultat.metier ? (
            <>
              <p>
                <strong>Métier reconnu :</strong> {resultat.metier.nom}
                <span className="block text-sm text-texte-2">déclenché par : {resultat.metier.mots.map((m) => `« ${m} »`).join(", ")}</span>
              </p>
              <ul className="space-y-2 text-sm">
                {resultat.reglages.map((r, i) => (
                  <li key={i} className="carte p-2">
                    <strong>{r.reglage}</strong> : {r.valeur}
                    <span className="block text-texte-2">déclenché par : {r.mots.map((m) => `« ${m} »`).join(", ")}</span>
                  </li>
                ))}
                {!resultat.reglages.length ? <li className="aide">Aucun réglage particulier : les réglages par défaut du métier s&apos;appliquent.</li> : null}
              </ul>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="bouton bouton-encre" onClick={creer}>
                  Créer le recrutement
                </button>
                <Link href={`/metiers/${resultat.metier.id}`} className="bouton">
                  Voir le métier
                </Link>
              </div>
              <p className="aide">Tout reste modifiable à l&apos;étape « Préparer ».</p>
            </>
          ) : (
            <>
              <p>
                <strong>Aucun métier reconnu.</strong> Je ne devine pas : choisissez dans la liste des métiers, ou{" "}
                <Link href="/demande" className="underline">
                  demandez un métier
                </Link>
                .
              </p>
              {resultat.reglages.length ? (
                <ul className="space-y-1 text-sm">
                  {resultat.reglages.map((r, i) => (
                    <li key={i}>
                      {r.reglage} : {r.valeur} <span className="text-texte-2">({r.mots.map((m) => `« ${m} »`).join(", ")})</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <aside className="hidden tel:block carte sticky top-6 self-start max-h-[calc(100dvh-3rem)] overflow-y-auto" aria-label="Décrire mon besoin">
        {contenu}
      </aside>
      <div className="tiroir-besoin tel:hidden fixed inset-x-0 bottom-14 z-20">
        <button type="button" className="bouton bouton-encre w-full rounded-none" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}>
          {ouvert ? "Fermer" : "Décrire mon besoin"}
        </button>
        {ouvert ? <div className="carte max-h-[70dvh] overflow-y-auto rounded-none border-x-0">{contenu}</div> : null}
      </div>
    </>
  );
}
