"use client";

import { useMemo } from "react";
import { candidatsDe, recrutementParId, useDonnees } from "@/composants/donnees/FournisseurDonnees";
import type { Base, Pack } from "@/lib/contenu/types";
import type { Candidat, Recrutement } from "@/lib/stockage/modele";

export interface ContexteRecrutement {
  pret: boolean;
  recrutement: Recrutement | null;
  candidats: Candidat[];
  pack: Pack | null;
  base: Base | null;
}

/** Recrutement, candidats, pack et base pour un id. */
export function useRecrutement(id: string): ContexteRecrutement & ReturnType<typeof useDonnees> {
  const donnees = useDonnees();
  const { etat, catalogue, pret, packDe } = donnees;
  const recrutement = useMemo(() => recrutementParId(etat, id), [etat, id]);
  const candidats = useMemo(() => candidatsDe(etat, id), [etat, id]);
  const pack = useMemo(() => (recrutement ? packDe(recrutement.metier_id) : null), [recrutement, packDe]);
  return { ...donnees, pret, recrutement, candidats, pack, base: catalogue?.base ?? null };
}
