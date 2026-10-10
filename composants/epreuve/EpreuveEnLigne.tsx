"use client";

/**
 * /e/[token] : le navigateur du candidat récupère le blob chiffré, le déchiffre
 * avec la clé du fragment d'URL, fait passer l'épreuve, produit le code et le fichier.
 * /e/fichier : même chose à partir du fichier d'épreuve.
 */
import { useEffect, useState } from "react";
import { Chargement, Message, lireFichier } from "@/composants/ui";
import { cleDepuisFragment, dechiffrerPaquet } from "@/lib/fichiers/chiffrement";
import { importerEpreuve, lireJson } from "@/lib/fichiers/formats";
import type { PaquetCandidat, Reponses } from "@/lib/stockage/modele";
import { Epreuve } from "./Epreuve";
import { FinEpreuve } from "./FinEpreuve";

export function EpreuveEnLigne({ token }: { token: string }) {
  const [paquet, setPaquet] = useState<PaquetCandidat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [reponses, setReponses] = useState<Reponses | null>(null);

  useEffect(() => {
    let annule = false;
    (async () => {
      const cle = cleDepuisFragment(window.location.hash);
      if (!cle) {
        setErreur("Ce lien est incomplet : la clé après le « # » manque. Demandez le lien complet à la personne qui recrute, ou utilisez le fichier d'épreuve.");
        return;
      }
      try {
        const rep = await fetch(`/api/epreuves/${encodeURIComponent(token)}`, { cache: "no-store" });
        if (rep.status === 404) throw new Error("introuvable");
        if (!rep.ok) throw new Error("serveur");
        const { blob } = (await rep.json()) as { blob: string };
        const p = await dechiffrerPaquet(blob, cle);
        if (!annule) setPaquet(p);
      } catch (e) {
        const m = e instanceof Error ? e.message : "";
        setErreur(
          m === "introuvable"
            ? "Cette épreuve est introuvable ou a expiré (90 jours). Demandez un nouveau lien ou le fichier d'épreuve."
            : "Impossible d'ouvrir l'épreuve : la page est peut-être indisponible ou le lien abîmé. La personne qui recrute peut vous envoyer le fichier d'épreuve.",
        );
      }
    })();
    return () => {
      annule = true;
    };
  }, [token]);

  if (erreur) return <Message type="alerte">{erreur}</Message>;
  if (!paquet) return <Chargement texte="Ouverture de votre épreuve…" />;
  if (reponses) return <FinEpreuve paquet={paquet} reponses={reponses} />;
  return <Epreuve paquet={paquet} onTerminer={setReponses} demanderNom={!paquet.candidat} />;
}

export function EpreuveDepuisFichier() {
  const [paquet, setPaquet] = useState<PaquetCandidat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [reponses, setReponses] = useState<Reponses | null>(null);

  async function ouvrir(f: File | undefined) {
    if (!f) return;
    setErreur(null);
    const json = lireJson(await lireFichier(f));
    if (!json.ok) return setErreur(json.erreur);
    const r = importerEpreuve(json.valeur);
    if (!r.ok) return setErreur(r.erreur);
    setPaquet(r.valeur);
  }

  if (paquet && reponses) return <FinEpreuve paquet={paquet} reponses={reponses} />;
  if (paquet) return <Epreuve paquet={paquet} onTerminer={setReponses} demanderNom={!paquet.candidat} />;
  return (
    <div className="mx-auto max-w-[40rem] space-y-4">
      <h1 className="text-3xl">Ouvrir un fichier d&apos;épreuve</h1>
      <p className="text-texte-2">Choisissez le fichier .json que la personne qui recrute vous a envoyé. L&apos;épreuve se passe dans votre navigateur ; vos réponses y restent jusqu&apos;à ce que vous les rendiez.</p>
      <label className="block">
        <span className="etiquette">Fichier d&apos;épreuve</span>
        <input type="file" accept="application/json,.json" className="champ" onChange={(e) => ouvrir(e.target.files?.[0])} />
      </label>
      {erreur ? <Message type="alerte">{erreur}</Message> : null}
    </div>
  );
}
