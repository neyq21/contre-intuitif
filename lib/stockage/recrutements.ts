/**
 * Opérations sur les recrutements et les candidats (état du recruteur).
 * Fonctions pures sur `Etat` : utilisées par `modifier(fn)` du fournisseur.
 */
import type { Base, CodeCompetence, Niveau, Pack, PorteId } from "@/lib/contenu/types";
import { figerEpreuve } from "@/lib/methode/epreuve";
import { LIMITES, nouvelleGraine, tirer } from "@/lib/methode/tirage";
import { evaluationVide, identifiant, type Candidat, type Etat, type Evaluateur, type Recrutement, type Reponses } from "./modele";

export interface OptionsNouveauRecrutement {
  pack: Pack;
  base: Base;
  poste?: string;
  competences?: { code: CodeCompetence; niveau_requis: Niveau }[];
  portes?: PorteId[];
  nombres?: { p1: number; p2: number; p5: number };
  essentiels?: string[];
  fictif?: boolean;
  id?: string;
}

export function nouveauRecrutement(o: OptionsNouveauRecrutement): Recrutement {
  const date = new Date().toISOString();
  const competences = o.competences ?? o.pack.competences.map((c) => ({ code: c.code, niveau_requis: c.niveau_requis }));
  const nombres = o.nombres ?? { p1: LIMITES.p1.defaut, p2: LIMITES.p2.defaut, p5: LIMITES.p5.defaut };
  const graine = nouvelleGraine();
  const selection = tirer(o.pack, { competences: competences.map((c) => c.code), nombres, graine, tirage: 0 });
  return {
    id: o.id ?? identifiant("rec"),
    poste: o.poste ?? o.pack.nom,
    metier_id: o.pack.id,
    metier_nom: o.pack.nom,
    metier_version: o.pack.version,
    metier_pv: o.pack._pv,
    cree_le: date,
    modifie_le: date,
    statut: "preparation",
    fictif: o.fictif ?? false,
    notes: "",
    competences,
    portes: o.portes ?? ["p1", "p2", "p3", "p4", "p5"],
    nombres,
    graine,
    tirage: 0,
    selection,
    questions_recruteur: { p2: {}, p5: {}, entretien: {} },
    profil_travail: { essentiels: o.essentiels ?? o.base.profil_travail.defauts[o.pack.id] ?? [], phrases: false },
    deroule: false,
    evaluateurs: [],
    epreuve: null,
    lien_annonce: null,
    envois: { questions_envoyees: false },
  };
}

/** Recalcule le tirage (après changement de compétences, nombres ou « Autre tirage »). Interdit si l'épreuve est figée. */
export function retirer(r: Recrutement, pack: Pack, tirage: number): Recrutement {
  if (r.epreuve) throw new Error("L'épreuve est figée : dupliquez le recrutement pour changer les questions.");
  return {
    ...r,
    tirage,
    selection: tirer(pack, { competences: r.competences.map((c) => c.code), nombres: r.nombres, graine: r.graine, tirage }),
    modifie_le: new Date().toISOString(),
  };
}

/** Fige l'épreuve : copie locale des questions. Appelé dès qu'un candidat commence, ou qu'un lien/fichier est créé. */
export function figer(r: Recrutement, pack: Pack, base: Base): Recrutement {
  if (r.epreuve) return r;
  return { ...r, epreuve: figerEpreuve(pack, base, r), statut: "en_cours", modifie_le: new Date().toISOString() };
}

/** Duplique un recrutement sans ses candidats ni son épreuve figée (pour changer les questions). */
export function dupliquer(r: Recrutement, pack: Pack): Recrutement {
  const date = new Date().toISOString();
  const graine = nouvelleGraine();
  return {
    ...structuredClone(r),
    id: identifiant("rec"),
    poste: `${r.poste} (copie)`,
    cree_le: date,
    modifie_le: date,
    statut: "preparation",
    graine,
    tirage: 0,
    selection: tirer(pack, { competences: r.competences.map((c) => c.code), nombres: r.nombres, graine, tirage: 0 }),
    epreuve: null,
    lien_annonce: null,
    fictif: false,
  };
}

export function nouveauCandidat(recrutementId: string, nom: string, mode: Candidat["mode"] = "ecran", email = ""): Candidat {
  return {
    id: identifiant("cand"),
    recrutement_id: recrutementId,
    nom: nom.trim() || "Sans nom",
    email: email.trim(),
    mode,
    cree_le: new Date().toISOString(),
    commence: false,
    reponses: null,
    evaluations: {},
    decision: null,
    besoins: { liste: [], autre: "" },
    lien: null,
  };
}

export function remplacerRecrutement(etat: Etat, r: Recrutement): void {
  const i = etat.recrutements.findIndex((x) => x.id === r.id);
  if (i >= 0) etat.recrutements[i] = { ...r, modifie_le: new Date().toISOString() };
  else etat.recrutements.push(r);
}

export function remplacerCandidat(etat: Etat, c: Candidat): void {
  const i = etat.candidats.findIndex((x) => x.id === c.id);
  if (i >= 0) etat.candidats[i] = c;
  else etat.candidats.push(c);
}

export function supprimerRecrutement(etat: Etat, id: string): void {
  etat.recrutements = etat.recrutements.filter((r) => r.id !== id);
  etat.candidats = etat.candidats.filter((c) => c.recrutement_id !== id);
}

/** Rattache des réponses reçues (code ou fichier) à un candidat, ou en crée un. */
export function rattacherReponses(etat: Etat, r: Recrutement, reponses: Reponses, candidatId?: string): { candidat: Candidat; avertissement: string | null } {
  let avertissement: string | null = null;
  if (r.epreuve && reponses.epreuve_empreinte && reponses.epreuve_empreinte !== r.epreuve.empreinte) {
    avertissement = "Ces réponses ont été données sur une autre version de l'épreuve (empreinte différente) : la correction se fait avec les questions de ce recrutement, vérifiez qu'elles correspondent.";
  }
  let c = candidatId ? etat.candidats.find((x) => x.id === candidatId) : undefined;
  if (!c && reponses.candidat.id) c = etat.candidats.find((x) => x.id === reponses.candidat.id && x.recrutement_id === r.id);
  if (!c) {
    c = nouveauCandidat(r.id, reponses.candidat.nom ?? "Candidat", "distance");
    etat.candidats.push(c);
  }
  c.reponses = reponses;
  c.commence = true;
  if (reponses.besoins) c.besoins = { liste: [...new Set([...c.besoins.liste, ...reponses.besoins.liste])], autre: reponses.besoins.autre || c.besoins.autre };
  return { candidat: c, avertissement };
}

export function evaluateurCourant(etat: Etat, r: Recrutement): Evaluateur {
  const id = etat.reglages.evaluateur_courant;
  const e = r.evaluateurs.find((x) => x.id === id);
  if (e) return e;
  if (r.evaluateurs[0]) return r.evaluateurs[0];
  return { id: "moi", nom: etat.reglages.nom_recruteur || "Moi" };
}

export function evaluationDe(c: Candidat, ev: Evaluateur) {
  return c.evaluations[ev.id] ?? evaluationVide(ev);
}
