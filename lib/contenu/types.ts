/**
 * Types du contenu de la méthode des 5 portes.
 * Ils décrivent exactement les JSON fournis dans `contenu/` (schémas ci5p-base/2 et ci5p-pack/3).
 * Aucun `any` : tout objet métier passe par ces types.
 */

export type PorteId = "p1" | "p2" | "p3" | "p4" | "p5";
export type CodeCompetence = "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7" | "C8";
export type Niveau = 1 | 2 | 3 | 4;
export type Points = 0 | 1 | 2;
export type SecteurId = string;

export const PORTES: readonly PorteId[] = ["p1", "p2", "p3", "p4", "p5"] as const;
/** Portes sans rédaction libre. */
export const PORTES_SANS_ECRIT: readonly PorteId[] = ["p1", "p3", "p4"] as const;
export const NIVEAUX: readonly Niveau[] = [1, 2, 3, 4] as const;

// ---------------------------------------------------------------------------
// base.json (ci5p-base/2)
// ---------------------------------------------------------------------------

export interface MetaBase {
  titre: string;
  sous_titre: string;
  marque: string;
  slogan: string;
  version: string;
  date: string;
  sources_verifiees: string;
  comptes: string;
}

export interface CompetenceTransverse {
  code: CodeCompetence;
  nom: string;
  definition: string;
  ancres: Record<"1" | "2" | "3" | "4", string>;
  attention: string;
  /** Une phrase par porte (p1 à p5) : à quoi ressemble le niveau attendu. */
  equivalence: string[];
  piste: string;
}

export interface RepereBase {
  id: string;
  comp: CodeCompetence;
  label: string;
}
export interface ReperePlus extends RepereBase {
  sens: "+";
  /** Phrase pour le retour au candidat. */
  retour: string;
}
export interface RepereMoins extends RepereBase {
  sens: "-";
  /** Conseil pour l'accueil et les points à vérifier. */
  conseil: string;
}
export type Repere = ReperePlus | RepereMoins;

export interface PorteBase {
  id: PorteId;
  n: number;
  nom: string;
  court: string;
  carte: string;
  candidat: string;
  recruteur: string;
  /** Durée indicative, jamais un chronomètre. */
  duree: string;
}

export type Seuil = [number, Niveau];

export interface Baremes {
  p1: { max: number; seuils: Seuil[]; texte: string };
  p2: { max: number; texte: string };
  p3: { max: number; seuils: Seuil[]; texte: string };
  p4: { seuils: Seuil[]; texte: string };
  p5: { max: number; texte: string };
  reel: { texte: string };
  entretien: { texte: string };
}

export interface ExempleBase {
  situation: string;
  p1: { texte: string; options: string[] };
  p2: { debut: string };
  p3: { reponse: string; consigne: string };
  p4: { consigne: string; elements: string[] };
  p5: { texte: string };
}

export interface Secteur {
  id: SecteurId;
  nom: string;
  bientot?: string[];
}

export interface NePasNoter {
  titre: string;
  raison: string;
}

export interface AEviter {
  question: string;
  pourquoi: string;
  a_la_place: string;
}

export interface Profil {
  id: string;
  nom: string;
  couleur: string;
  inclut: string;
  chiffre: string;
  obstacle: string;
  aide: string;
}

export interface ChecklistItem {
  texte: string;
  statut: string;
  comment: string;
  sources: number[];
}
export interface ChecklistSection {
  titre: string;
  items: ChecklistItem[];
}

export interface Email {
  n: number;
  titre: string;
  quand: string;
  objet: string;
  corps: string;
}

export interface BonusTexte {
  titre: string;
  texte: string;
}

/** [titre, texte, sources] */
export type GuideMethodeItem = [string, string, number[]];
/** [semaine, titre, texte] */
export type GuidePiloteItem = [string, string, string];
/** [question, réponse] */
export type GuideFaqItem = [string, string];

export interface Guide {
  methode1: GuideMethodeItem[];
  methode2: string;
  regles_portes: string[];
  pilote: GuidePiloteItem[];
  faq: GuideFaqItem[];
  limites: string[];
}

export interface Source {
  n: number;
  cat: string;
  texte: string;
  url: string;
}

export interface DimensionProfilTravail {
  id: string;
  nom: string;
  /** Intitulé France Travail. */
  ft: string;
  ft_proche?: boolean;
  definition: string;
  question: string;
  aide: string;
  plus: string[];
  moins: string[];
}

export interface ItemProfilTravail {
  id: string;
  dim: string;
  texte: string;
}

export interface ProfilTravail {
  titre: string;
  max_essentiels: number;
  dimensions: DimensionProfilTravail[];
  items: ItemProfilTravail[];
  echelle: string[];
  ne_sait_pas: string;
  defauts: Record<string, string[]>;
  intro_candidat: string;
  notice: string;
  annonce: string;
  annonce_courte: string;
  notice_situations: string;
}

export interface DomaineAVenir {
  id: string;
  nom: string;
  exemples: string[];
}

export interface CatalogueBase {
  objectif: number;
  lot: number;
  delai: string;
  promesse: string;
  plus_recrutes: string[];
  plus_recrutes_source: number;
}

export interface Base {
  schema: "ci5p-base/2";
  meta: MetaBase;
  niveaux: Record<"1" | "2" | "3" | "4", string>;
  competences: CompetenceTransverse[];
  reperes: Repere[];
  portes: PorteBase[];
  exemple: ExempleBase;
  baremes: Baremes;
  secteurs: Secteur[];
  ne_pas_noter: NePasNoter[];
  a_eviter: AEviter[];
  profils: Profil[];
  checklist: ChecklistSection[];
  emails: Email[];
  bonus: BonusTexte[];
  relances: string[];
  besoins: string[];
  guide: Guide;
  sources: Source[];
  profil_travail: ProfilTravail;
  domaines_a_venir: DomaineAVenir[];
  catalogue: CatalogueBase;
}

// ---------------------------------------------------------------------------
// packs/<id>.json (ci5p-pack/3)
// ---------------------------------------------------------------------------

export type DocumentSituation =
  | { type: "liste"; titre: string; items: string[] }
  | { type: "message"; titre: string; de: string; texte: string }
  | { type: "tableau"; titre: string; colonnes: string[]; lignes: string[][] };

export interface Situation {
  titre: string;
  texte: string;
  document: DocumentSituation | null;
}

/** Option d'une question à choix (porte 1, porte 3 question et suite). */
export interface OptionChoix {
  id: string;
  texte: string;
  points: Points;
  repere?: string | null;
}

export interface QuestionP1 {
  id: string;
  texte: string;
  options: OptionChoix[];
  explication?: string;
  relance?: string;
  /** Présent dans la banque : angle de la question. */
  angle?: string;
  essai?: boolean;
}

export interface ReponsePrevue {
  texte: string;
  repere?: string | null;
}

export interface DebutP2 {
  id: string;
  debut: string;
  justes: ReponsePrevue[];
  partielles?: ReponsePrevue[];
  a_eviter?: ReponsePrevue[];
  angle?: string;
  essai?: boolean;
}

export interface BonusPorte {
  texte: string;
  repere?: string | null;
}

export interface PorteP1 {
  questions: QuestionP1[];
}

export interface PorteP2 {
  debuts: DebutP2[];
  bonus?: BonusPorte[];
}

export interface IndiceP3 {
  id: string;
  texte: string;
  juste: boolean;
}

export interface VersionP3 {
  reponse: string;
  question: { options: OptionChoix[] };
  indices: { options: IndiceP3[] };
  suite: { options: OptionChoix[] };
  explication?: string;
  /** Présent dans la banque. */
  id?: string;
  angle?: string;
  essai?: boolean;
}
export type PorteP3 = VersionP3;

export interface ElementOrdonner {
  id: string;
  texte: string;
}
export interface RegleOrdre {
  avant: string;
  apres: string;
  explication?: string;
}
export interface ElementClasser {
  id: string;
  texte: string;
  accepte: string[];
  explication?: string;
}
export interface CategorieClasser {
  id: string;
  nom: string;
}
export interface ElementReperer {
  id: string;
  texte: string;
  erreur: boolean;
  explication?: string;
}

export interface CritereReel {
  texte: string;
  repere?: string | null;
}
export interface VarianteReelle {
  consigne: string;
  criteres: CritereReel[];
  bonus?: BonusPorte | null;
}

interface P4Commun {
  titre: string;
  consigne: string;
  repere_reussite: string | null;
  repere_echec: string | null;
  reel?: VarianteReelle;
  document?: DocumentSituation | null;
  id?: string;
  angle?: string;
  essai?: boolean;
}
export interface VersionP4Ordonner extends P4Commun {
  type: "ordonner";
  elements: ElementOrdonner[];
  regles: RegleOrdre[];
}
export interface VersionP4Classer extends P4Commun {
  type: "classer";
  elements: ElementClasser[];
  categories: CategorieClasser[];
}
export interface VersionP4Reperer extends P4Commun {
  type: "reperer";
  elements: ElementReperer[];
}
export type VersionP4 = VersionP4Ordonner | VersionP4Classer | VersionP4Reperer;
export type PorteP4 = VersionP4;
export type TypeP4 = VersionP4["type"];

export interface QuestionP5 {
  id: string;
  texte: string;
  justes: ReponsePrevue[];
  partielles?: ReponsePrevue[];
  a_eviter?: ReponsePrevue[];
  angle?: string;
  essai?: boolean;
}

export interface PorteP5 {
  questions: QuestionP5[];
  bonus?: BonusPorte[];
}

export interface Portes {
  p1: PorteP1;
  p2: PorteP2;
  p3: PorteP3;
  p4: PorteP4;
  p5: PorteP5;
}

export interface QuestionEntretien {
  id: string;
  competence: CodeCompetence;
  texte: string;
  suite: string[];
  attendus: string[];
  relance: string;
  alternative: string;
  angle?: string;
  essai?: boolean;
}

export interface Banque {
  p1: QuestionP1[];
  p2: DebutP2[];
  p3: VersionP3[];
  p4: VersionP4[];
  p5: QuestionP5[];
  entretien: QuestionEntretien[];
  /** Angle de chaque question de `portes` et `entretien`, clé "p1.q1", "entretien.e1". */
  angles?: Record<string, string>;
}

export interface Competence {
  code: CodeCompetence;
  titre: string;
  pourquoi: string;
  niveau_requis: Niveau;
  situation: Situation;
  portes: Portes;
  integration: string[];
  banque?: Banque;
}

export interface Pack {
  schema: "ci5p-pack/3" | "ci5p-pack/2";
  id: string;
  version: string;
  nom: string;
  secteur: SecteurId;
  alias: string[];
  resume: string;
  contexte: string;
  cadre: string;
  competences: Competence[];
  entretien: QuestionEntretien[];
  /** Empreinte du contenu, recalculée quand le contenu change. */
  _pv: string;
}

export interface IndexPacks {
  date: string;
  n_packs: number;
  ids: string[];
}

// ---------------------------------------------------------------------------
// Catalogue public (ce que le serveur rend au recruteur)
// ---------------------------------------------------------------------------

export interface Domaine extends Secteur {
  ordre: number;
}

export interface MetierResume {
  id: string;
  version: string;
  nom: string;
  secteur: SecteurId;
  alias: string[];
  resume: string;
  plus_recrute: boolean;
  banque: boolean;
  _pv: string;
}

export interface Catalogue {
  schema: "ci5p-catalogue/1";
  /** Numéro de publication, augmente à chaque publication. */
  version: number;
  publie_le: string;
  base: Base;
  domaines: Domaine[];
  metiers: MetierResume[];
  packs: Pack[];
  video: { disponible: boolean; transcription: string };
}
