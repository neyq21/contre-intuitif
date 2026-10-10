/**
 * IndexedDB du recruteur : base `ci5p`, magasin `donnees` (clé → valeur).
 *   - `etat`      : recrutements, candidats, réglages (voir modele.ts)
 *   - `catalogue` : dernier catalogue publié, mis en cache pour le hors-ligne
 * Navigateur uniquement. Rien ici ne part au serveur.
 */
import { openDB, type IDBPDatabase } from "idb";
import type { Catalogue } from "@/lib/contenu/types";
import { etatVide, type Etat } from "./modele";
import { importerSauvegarde } from "@/lib/fichiers/formats";

export const NOM_BASE = "ci5p";
export const MAGASIN = "donnees";
export const CLE_ANCIENNE = "ci5p.v2.donnees";

let promesse: Promise<IDBPDatabase> | null = null;

function base(): Promise<IDBPDatabase> {
  if (!promesse) {
    promesse = openDB(NOM_BASE, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(MAGASIN)) db.createObjectStore(MAGASIN);
      },
    });
  }
  return promesse;
}

export async function lireCle<T>(cle: string): Promise<T | undefined> {
  const db = await base();
  return (await db.get(MAGASIN, cle)) as T | undefined;
}

export async function ecrireCle(cle: string, valeur: unknown): Promise<void> {
  const db = await base();
  await db.put(MAGASIN, valeur, cle);
}

export async function supprimerCle(cle: string): Promise<void> {
  const db = await base();
  await db.delete(MAGASIN, cle);
}

export async function lireEtat(): Promise<Etat> {
  const etat = await lireCle<Etat>("etat");
  if (etat) return etat;
  // Import de l'ancienne clé localStorage du kit HTML, si elle existe sur cet ordinateur.
  try {
    const ancien = localStorage.getItem(CLE_ANCIENNE);
    if (ancien) {
      const r = importerSauvegarde(JSON.parse(ancien));
      if (r.ok) {
        await ecrireCle("etat", r.valeur);
        return r.valeur;
      }
    }
  } catch {
    /* pas d'ancienne donnée lisible */
  }
  const vide = etatVide();
  await ecrireCle("etat", vide);
  return vide;
}

export async function ecrireEtat(etat: Etat): Promise<void> {
  await ecrireCle("etat", { ...etat, modifie_le: new Date().toISOString() });
}

export async function lireCatalogueCache(): Promise<Catalogue | undefined> {
  return lireCle<Catalogue>("catalogue");
}

export async function ecrireCatalogueCache(c: Catalogue): Promise<void> {
  await ecrireCle("catalogue", c);
}

/** Efface toutes les données locales (après sauvegarde !). */
export async function toutEffacer(): Promise<void> {
  const db = await base();
  await db.clear(MAGASIN);
}
