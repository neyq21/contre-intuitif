/**
 * Modèle de données du recruteur. Tout vit dans le navigateur (IndexedDB `ci5p`,
 * magasin `donnees`) et dans les fichiers de sauvegarde. Rien ne part au serveur.
 */
import type {
  CodeCompetence,
  DebutP2,
  DocumentSituation,
  Niveau,
  Pack,
  PorteId,
  QuestionEntretien,
  QuestionP1,
  QuestionP5,
  VersionP3,
  VersionP4,
  BonusPorte,
  Situation,
  VarianteReelle,
} from "@/lib/contenu/types";
import type { Jugement, ReponseP3, ReponseP4, ReponsesP1 } from "@/lib/methode/notation";
import type { Selection } from "@/lib/methode/tirage";

export const SCHEMA_SAUVEGARDE = "ci5p-sauvegarde/2" as const;
export const SCHEMA_REPONSES = "ci5p-reponses/2" as const;
export const SCHEMA_ARCHIVE = "ci5p-archive/1" as const;
export const SCHEMA_EPREUVE = "ci5p-epreuve/1" as const;
export const PREFIXE_CODE = "CI5Z-" as const;

export type StatutRecrutement = "preparation" | "en_cours" | "termine";
export type StatutDecision = "retenu" | "non_retenu" | "vivier" | "en_attente";
export type ModeCandidat = "ecran" | "distance";

export interface Evaluateur {
  id: string;
  nom: string;
}

/** Question écrite par le recruteur (sans réponse prévue). */
export interface QuestionRecruteur {
  id: string;
  texte: string;
}

export interface QuestionsRecruteur {
  p2: Partial<Record<CodeCompetence, QuestionRecruteur[]>>;
  p5: Partial<Record<CodeCompetence, QuestionRecruteur[]>>;
  entretien: Partial<Record<CodeCompetence, QuestionRecruteur[]>>;
}

// ---------------------------------------------------------------------------
// Épreuve figée : copie locale des questions, avec corrigés (reste chez le recruteur)
// ---------------------------------------------------------------------------

export interface PortesFigees {
  p1?: { questions: QuestionP1[] };
  p2?: { debuts: DebutP2[]; bonus: BonusPorte[]; recruteur: QuestionRecruteur[] };
  p3?: VersionP3 & { id: string };
  p4?: VersionP4 & { id: string; reel?: VarianteReelle };
  p5?: { questions: QuestionP5[]; bonus: BonusPorte[]; recruteur: QuestionRecruteur[] };
}

export interface CompetenceFigee {
  code: CodeCompetence;
  titre: string;
  pourquoi: string;
  niveau_requis: Niveau;
  situation: Situation;
  portes: PortesFigees;
  integration: string[];
}

export interface EntretienFige {
  questions: QuestionEntretien[];
  recruteur: Partial<Record<CodeCompetence, QuestionRecruteur[]>>;
}

export interface EpreuveFigee {
  schema: typeof SCHEMA_EPREUVE;
  /** Empreinte de l'épreuve (questions posées) : les réponses reçues la portent. */
  empreinte: string;
  metier: { id: string; nom: string; version: string; _pv: string };
  poste: string;
  portes: PorteId[];
  competences: CompetenceFigee[];
  entretien: EntretienFige;
  profil_travail: { essentiels: string[]; phrases: boolean; items: { id: string; dim: string; texte: string }[] };
  deroule: boolean;
  figee_le: string;
}

/**
 * Paquet remis au candidat : même structure, sans `points`, `justes`, `partielles`,
 * `a_eviter`, `repere`, `explication`, `regles`, `accepte`, `erreur`, `juste`, `reel`, `bonus`.
 */
export interface OptionCandidat {
  id: string;
  texte: string;
}
export interface QuestionP1Candidat {
  id: string;
  texte: string;
  options: OptionCandidat[];
}
export interface DebutP2Candidat {
  id: string;
  debut: string;
  recruteur?: boolean;
}
export interface VersionP3Candidat {
  id: string;
  reponse: string;
  question: { options: OptionCandidat[] };
  indices: { options: OptionCandidat[] };
  suite: { options: OptionCandidat[] };
}
export type VersionP4Candidat =
  | { id: string; type: "ordonner"; titre: string; consigne: string; document?: DocumentSituation | null; elements: OptionCandidat[] }
  | {
      id: string;
      type: "classer";
      titre: string;
      consigne: string;
      document?: DocumentSituation | null;
      elements: OptionCandidat[];
      categories: { id: string; nom: string }[];
    }
  | { id: string; type: "reperer"; titre: string; consigne: string; document?: DocumentSituation | null; elements: OptionCandidat[] };
export interface QuestionP5Candidat {
  id: string;
  texte: string;
  recruteur?: boolean;
}
export interface PortesCandidat {
  p1?: { questions: QuestionP1Candidat[] };
  p2?: { debuts: DebutP2Candidat[] };
  p3?: VersionP3Candidat;
  p4?: VersionP4Candidat;
  p5?: { questions: QuestionP5Candidat[] };
}
export interface CompetenceCandidat {
  code: CodeCompetence;
  titre: string;
  situation: Situation;
  portes: PortesCandidat;
}
export interface PaquetCandidat {
  schema: "ci5p-epreuve-candidat/1";
  empreinte: string;
  recrutement_id: string;
  metier: { id: string; nom: string };
  poste: string;
  portes: PorteId[];
  competences: CompetenceCandidat[];
  profil_travail: { essentiels: string[]; phrases: boolean; items: { id: string; dim: string; texte: string }[] } | null;
  deroule: boolean;
  /** Prénom ou code prérempli pour un lien personnel. */
  candidat: { id: string; nom: string } | null;
  /** Textes d'accueil (portes, besoins, échelle) copiés de la base pour fonctionner hors catalogue. */
  textes: TextesEpreuve;
}

export interface TextesEpreuve {
  portes: { id: PorteId; n: number; nom: string; court: string; candidat: string; duree: string }[];
  besoins: string[];
  echelle: string[];
  ne_sait_pas: string;
  intro_profil: string;
  marque: string;
}

// ---------------------------------------------------------------------------
// Réponses du candidat (ci5p-reponses/2)
// ---------------------------------------------------------------------------

export type ReponseP2 = Record<string, string | undefined>;
export type ReponseP5 = Record<string, { texte?: string; oral?: boolean } | undefined>;

export interface ReponsesCompetence {
  porte: PorteId;
  p1?: ReponsesP1;
  p2?: ReponseP2;
  p3?: ReponseP3;
  p4?: ReponseP4;
  p5?: ReponseP5;
}

export type EvenementDeroule =
  | { type: "porte_regardee"; competence: CodeCompetence; porte: PorteId }
  | { type: "porte_essayee"; competence: CodeCompetence; porte: PorteId }
  | { type: "porte_changee"; competence: CodeCompetence; de: PorteId; vers: PorteId }
  | { type: "reponse_changee"; competence: CodeCompetence; porte: PorteId; question: string }
  | { type: "retour"; competence: CodeCompetence }
  | { type: "relecture"; competence: CodeCompetence };

export interface Reponses {
  schema: typeof SCHEMA_REPONSES;
  recrutement_id: string;
  epreuve_empreinte: string;
  candidat: { id: string | null; nom: string | null };
  rendu_le: string;
  competences: Partial<Record<CodeCompetence, ReponsesCompetence>>;
  profil_travail: Record<string, number | "nsp"> | null;
  besoins: { liste: string[]; autre: string } | null;
  deroule: EvenementDeroule[] | null;
  /** « Affichage » : le candidat a demandé le texte simple (information seulement). */
  affichage?: { mots_cles: boolean };
}

// ---------------------------------------------------------------------------
// Évaluations (par personne qui évalue)
// ---------------------------------------------------------------------------

export interface EvaluationEntretienQuestion {
  attendus: boolean[];
  notes: string;
}

export interface Evaluation {
  evaluateur: Evaluateur;
  /** jugement par compétence et par phrase (p2) ou question (p5) */
  p2: Partial<Record<CodeCompetence, Record<string, Jugement | undefined>>>;
  p5: Partial<Record<CodeCompetence, Record<string, Jugement | undefined>>>;
  bonus: Partial<Record<CodeCompetence, { p2?: boolean; p5?: boolean }>>;
  /** Réponse orale notée par la personne qui évalue (porte 5). */
  oral: Partial<Record<CodeCompetence, Record<string, string | undefined>>>;
  reel: Partial<Record<CodeCompetence, { criteres: boolean[]; bonus: boolean; utilise: boolean }>>;
  entretien: Record<string, EvaluationEntretienQuestion | undefined>;
  entretien_niveau: Partial<Record<CodeCompetence, Niveau | null>>;
  /** Faits observés, sans jugement sur l'apparence. */
  faits: string;
  modifie_le: string;
}

export interface Decision {
  statut: StatutDecision;
  motifs: string;
  par: string;
  le: string;
}

export interface Candidat {
  id: string;
  recrutement_id: string;
  nom: string;
  email: string;
  mode: ModeCandidat;
  cree_le: string;
  commence: boolean;
  reponses: Reponses | null;
  evaluations: Record<string, Evaluation>;
  decision: Decision | null;
  besoins: { liste: string[]; autre: string };
  lien: { token: string; url: string; expire_le: string } | null;
}

export interface Recrutement {
  id: string;
  poste: string;
  metier_id: string;
  metier_nom: string;
  metier_version: string;
  metier_pv: string;
  cree_le: string;
  modifie_le: string;
  statut: StatutRecrutement;
  fictif: boolean;
  notes: string;
  competences: { code: CodeCompetence; niveau_requis: Niveau }[];
  portes: PorteId[];
  nombres: { p1: number; p2: number; p5: number };
  graine: string;
  tirage: number;
  selection: Selection;
  questions_recruteur: QuestionsRecruteur;
  profil_travail: { essentiels: string[]; phrases: boolean };
  deroule: boolean;
  evaluateurs: Evaluateur[];
  epreuve: EpreuveFigee | null;
  /** Lien ouvert à tous (annonce). */
  lien_annonce: { token: string; url: string; expire_le: string } | null;
  /** Textes à envoyer, déjà adaptés (étape « Les envois »). */
  envois: { questions_envoyees: boolean };
}

export interface ReglagesRecruteur {
  licence: { code: string; type: string; nom: string; enregistree_le: string } | null;
  evaluateur_courant: string | null;
  nom_recruteur: string;
  entreprise: string;
}

export interface Etat {
  schema: typeof SCHEMA_SAUVEGARDE;
  version: 2;
  cree_le: string;
  modifie_le: string;
  recrutements: Recrutement[];
  candidats: Candidat[];
  metiers_importes: Pack[];
  reglages: ReglagesRecruteur;
}

export function etatVide(): Etat {
  const d = new Date().toISOString();
  return {
    schema: SCHEMA_SAUVEGARDE,
    version: 2,
    cree_le: d,
    modifie_le: d,
    recrutements: [],
    candidats: [],
    metiers_importes: [],
    reglages: { licence: null, evaluateur_courant: null, nom_recruteur: "", entreprise: "" },
  };
}

export function evaluationVide(evaluateur: Evaluateur): Evaluation {
  return {
    evaluateur,
    p2: {},
    p5: {},
    bonus: {},
    oral: {},
    reel: {},
    entretien: {},
    entretien_niveau: {},
    faits: "",
    modifie_le: new Date().toISOString(),
  };
}

export function identifiant(prefixe = ""): string {
  const octets = new Uint8Array(6);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(octets);
  else for (let i = 0; i < 6; i++) octets[i] = Math.floor(Math.random() * 256);
  const hex = Array.from(octets, (b) => b.toString(16).padStart(2, "0")).join("");
  return prefixe ? `${prefixe}_${hex}` : hex;
}
