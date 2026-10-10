"use client";

/**
 * Données du recruteur : état (IndexedDB) et catalogue (cache IndexedDB,
 * rafraîchi depuis /api/catalogue quand une nouvelle publication existe).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Catalogue, Pack } from "@/lib/contenu/types";
import { ecrireCatalogueCache, ecrireEtat, lireCatalogueCache, lireEtat, toutEffacer } from "@/lib/stockage/idb";
import type { Candidat, Etat, Recrutement } from "@/lib/stockage/modele";

export interface Donnees {
  pret: boolean;
  etat: Etat | null;
  catalogue: Catalogue | null;
  /** Message d'état du catalogue : hors-ligne, mis à jour… */
  etatCatalogue: { type: "ok" | "hors_ligne" | "mis_a_jour" | "erreur" | "chargement"; texte: string };
  modifier: (fn: (etat: Etat) => Etat | void) => Promise<void>;
  remplacerEtat: (etat: Etat) => Promise<void>;
  effacerTout: () => Promise<void>;
  rafraichirCatalogue: () => Promise<void>;
  packDe: (metierId: string) => Pack | null;
}

const Contexte = createContext<Donnees | null>(null);

export function useDonnees(): Donnees {
  const d = useContext(Contexte);
  if (!d) throw new Error("useDonnees hors du FournisseurDonnees");
  return d;
}

export function FournisseurDonnees({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [pret, setPret] = useState(false);
  const [etatCatalogue, setEtatCatalogue] = useState<Donnees["etatCatalogue"]>({ type: "chargement", texte: "Chargement du catalogue…" });
  const etatRef = useRef<Etat | null>(null);
  const file = useRef<Promise<void>>(Promise.resolve());

  const rafraichirCatalogue = useCallback(async () => {
    const cache = await lireCatalogueCache();
    try {
      const rv = await fetch("/api/catalogue/version", { cache: "no-store" });
      if (!rv.ok) throw new Error(String(rv.status));
      const { version } = (await rv.json()) as { version: number };
      if (cache && cache.version === version) {
        setEtatCatalogue({ type: "ok", texte: `Catalogue à jour (publication ${version}).` });
        return;
      }
      const rc = await fetch("/api/catalogue", { cache: "no-store" });
      if (!rc.ok) throw new Error(String(rc.status));
      const nouveau = (await rc.json()) as Catalogue;
      await ecrireCatalogueCache(nouveau);
      setCatalogue(nouveau);
      setEtatCatalogue(
        cache
          ? { type: "mis_a_jour", texte: `Catalogue mis à jour (publication ${nouveau.version}). Les recrutements déjà figés gardent leurs questions.` }
          : { type: "ok", texte: `Catalogue chargé (publication ${nouveau.version}).` },
      );
    } catch {
      setEtatCatalogue(
        cache
          ? { type: "hors_ligne", texte: `Hors ligne : catalogue en cache (publication ${cache.version}).` }
          : { type: "erreur", texte: "Catalogue indisponible et aucun cache sur cet ordinateur. Connectez-vous une première fois." },
      );
    }
  }, []);

  useEffect(() => {
    let annule = false;
    (async () => {
      const [e, c] = await Promise.all([lireEtat(), lireCatalogueCache()]);
      if (annule) return;
      etatRef.current = e;
      setEtat(e);
      if (c) setCatalogue(c);
      setPret(true);
      void rafraichirCatalogue();
    })();
    return () => {
      annule = true;
    };
  }, [rafraichirCatalogue]);

  const modifier = useCallback(async (fn: (etat: Etat) => Etat | void) => {
    const tache = file.current.then(async () => {
      const courant = etatRef.current ?? (await lireEtat());
      const copie: Etat = structuredClone(courant);
      const resultat = fn(copie);
      const suivant = resultat ?? copie;
      suivant.modifie_le = new Date().toISOString();
      etatRef.current = suivant;
      setEtat(suivant);
      await ecrireEtat(suivant);
    });
    file.current = tache.catch(() => undefined);
    return tache;
  }, []);

  const remplacerEtat = useCallback(async (nouveau: Etat) => {
    etatRef.current = nouveau;
    setEtat(nouveau);
    await ecrireEtat(nouveau);
  }, []);

  const effacerTout = useCallback(async () => {
    await toutEffacer();
    const vide = await lireEtat();
    etatRef.current = vide;
    setEtat(vide);
    setCatalogue(null);
    await rafraichirCatalogue();
  }, [rafraichirCatalogue]);

  const packDe = useCallback(
    (metierId: string): Pack | null => {
      const importe = etat?.metiers_importes.find((p) => p.id === metierId);
      const publie = catalogue?.packs.find((p) => p.id === metierId);
      // Un métier importé à la main l'emporte si sa version est plus récente ou si le catalogue ne l'a pas.
      if (importe && (!publie || importe.version >= publie.version)) return importe;
      return publie ?? importe ?? null;
    },
    [etat, catalogue],
  );

  const valeur = useMemo<Donnees>(
    () => ({ pret, etat, catalogue, etatCatalogue, modifier, remplacerEtat, effacerTout, rafraichirCatalogue, packDe }),
    [pret, etat, catalogue, etatCatalogue, modifier, remplacerEtat, effacerTout, rafraichirCatalogue, packDe],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

// --- Sélecteurs ---------------------------------------------------------------

export function recrutementParId(etat: Etat | null, id: string): Recrutement | null {
  return etat?.recrutements.find((r) => r.id === id) ?? null;
}
export function candidatsDe(etat: Etat | null, recrutementId: string): Candidat[] {
  return etat?.candidats.filter((c) => c.recrutement_id === recrutementId) ?? [];
}
export function candidatParId(etat: Etat | null, id: string): Candidat | null {
  return etat?.candidats.find((c) => c.id === id) ?? null;
}
