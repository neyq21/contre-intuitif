/**
 * Lecture des JSON de `contenu/` sur le serveur (seed et tests).
 * Ne pas importer côté client.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { validerBase, validerPack } from "./schema";
import type { Base, IndexPacks, Pack } from "./types";

export const DOSSIER_CONTENU = join(process.cwd(), "contenu");

export function chargerBase(dossier = DOSSIER_CONTENU): Base {
  const brut: unknown = JSON.parse(readFileSync(join(dossier, "base.json"), "utf8"));
  const r = validerBase(brut);
  if (!r.ok) throw new Error(`contenu/base.json invalide :\n${r.erreurs.join("\n")}`);
  return r.valeur;
}

export function chargerIndex(dossier = DOSSIER_CONTENU): IndexPacks {
  const chemin = join(dossier, "index.json");
  if (existsSync(chemin)) return JSON.parse(readFileSync(chemin, "utf8")) as IndexPacks;
  const ids = readdirSync(join(dossier, "packs"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
  return { date: "", n_packs: ids.length, ids };
}

export function chargerPack(id: string, dossier = DOSSIER_CONTENU): Pack {
  const brut: unknown = JSON.parse(readFileSync(join(dossier, "packs", `${id}.json`), "utf8"));
  const r = validerPack(brut);
  if (!r.ok) throw new Error(`contenu/packs/${id}.json invalide :\n${r.erreurs.join("\n")}`);
  if (r.valeur.id !== id) throw new Error(`contenu/packs/${id}.json : l'id du pack est « ${r.valeur.id} »`);
  return r.valeur;
}

export function chargerPacks(dossier = DOSSIER_CONTENU): Pack[] {
  const index = chargerIndex(dossier);
  const manquants = index.ids.filter((id) => !existsSync(join(dossier, "packs", `${id}.json`)));
  if (manquants.length) throw new Error(`Packs cités dans index.json mais absents : ${manquants.join(", ")}`);
  return index.ids.map((id) => chargerPack(id, dossier));
}

export function chargerTexte(nom: "LICENCE.txt" | "LISEZ-MOI.txt"): string {
  const chemin = nom === "LICENCE.txt" ? join(process.cwd(), "contenu", "LICENCE.txt") : join(process.cwd(), "contenu", "LISEZ-MOI.txt");
  return readFileSync(chemin, "utf8");
}

/**
 * Chemin de la vidéo : `public/Presentation-kit-5-portes.mp4` (servie en statique), ou le
 * dossier `DOSSIER_VIDEO` (volume persistant en hébergement, servie par /api/video).
 */
export function cheminVideo(): string {
  const dossier = process.env.DOSSIER_VIDEO;
  return dossier ? join(dossier, "Presentation-kit-5-portes.mp4") : join(process.cwd(), "public", "Presentation-kit-5-portes.mp4");
}

/** Adresse à mettre dans la balise <video>. */
export function urlVideo(): string {
  return process.env.DOSSIER_VIDEO ? "/api/video" : "/Presentation-kit-5-portes.mp4";
}

/** La vidéo n'est servie que si le fichier est réellement présent. */
export function videoDisponible(): boolean {
  return existsSync(/*turbopackIgnore: true*/ cheminVideo());
}
