/**
 * Notation : implémente exactement les textes de `base.baremes`.
 * Aucune moyenne, aucune courbe, aucun commentaire généré. Le temps n'existe pas ici.
 */
import type {
  Baremes,
  Niveau,
  OptionChoix,
  PorteId,
  QuestionP1,
  Seuil,
  VersionP3,
  VersionP4,
  VersionP4Classer,
  VersionP4Ordonner,
  VersionP4Reperer,
  VarianteReelle,
} from "@/lib/contenu/types";

export type Jugement = "juste" | "partielle" | "eviter";

export interface ResultatPorte {
  porte: PorteId | "reel" | "entretien";
  points: number;
  max: number;
  /** Score ramené sur 10 (p1) ou de 0 à 1 (p4). */
  score?: number;
  niveau: Niveau;
  /** Repères déclenchés par les réponses (ids de base.reperes). */
  reperes: string[];
  detail: string;
}

/** Applique une liste de seuils `[minimum, niveau]` triée du plus haut au plus bas. */
export function niveauParSeuils(valeur: number, seuils: Seuil[]): Niveau {
  const tries = [...seuils].sort((a, b) => b[0] - a[0]);
  for (const [minimum, niveau] of tries) if (valeur >= minimum) return niveau;
  return 1;
}

function arrondir(x: number, decimales = 2): number {
  const f = 10 ** decimales;
  return Math.round(x * f) / f;
}

// ---------------------------------------------------------------------------
// Porte 1 — choix multiples
// ---------------------------------------------------------------------------

export type ReponsesP1 = Record<string, string | undefined>;

export function noterP1(questions: QuestionP1[], reponses: ReponsesP1, baremes: Baremes): ResultatPorte {
  if (questions.length < 3 || questions.length > 10) {
    throw new Error(`Porte 1 : de 3 à 10 questions (reçu ${questions.length})`);
  }
  let points = 0;
  const reperes: string[] = [];
  for (const q of questions) {
    const choisie = q.options.find((o) => o.id === reponses[q.id]);
    if (!choisie) continue;
    points += choisie.points;
    if (choisie.repere) reperes.push(choisie.repere);
  }
  const max = questions.length * 2;
  const sur10 = arrondir((points / max) * baremes.p1.max, 2);
  return {
    porte: "p1",
    points,
    max,
    score: sur10,
    niveau: niveauParSeuils(sur10, baremes.p1.seuils),
    reperes,
    detail: `${points} point${points > 1 ? "s" : ""} sur ${max}, soit ${formaterNombre(sur10)} sur 10`,
  };
}

// ---------------------------------------------------------------------------
// Portes 2 et 5 — phrases à compléter, oral ou écrit (jugées par une personne)
// ---------------------------------------------------------------------------

export function pointsJugement(j: Jugement | null | undefined): 0 | 1 | 2 {
  if (j === "juste") return 2;
  if (j === "partielle") return 1;
  return 0;
}

/**
 * Juste 2, partielle 1, à éviter ou vide 0. Niveau 3 à partir des cinq sixièmes
 * des points, niveau 2 à partir de la moitié, niveau 4 si niveau 3 et un élément
 * « en plus » (bonus) est présent. Vaut pour 2 à 6 phrases ou questions.
 */
export function noterP2P5(
  porte: "p2" | "p5",
  jugements: (Jugement | null | undefined)[],
  bonus: boolean,
  reperes: string[] = [],
): ResultatPorte {
  const n = jugements.length;
  if (n < 2 || n > 6) throw new Error(`Porte ${porte === "p2" ? 2 : 5} : de 2 à 6 réponses (reçu ${n})`);
  const points = jugements.reduce<number>((s, j) => s + pointsJugement(j), 0);
  const max = n * 2;
  let niveau: Niveau = 1;
  if (points >= (max * 5) / 6) niveau = bonus ? 4 : 3;
  else if (points >= max / 2) niveau = 2;
  return {
    porte,
    points,
    max,
    niveau,
    reperes,
    detail: `${points} point${points > 1 ? "s" : ""} sur ${max}${bonus ? ", avec un élément en plus" : ""}`,
  };
}

// ---------------------------------------------------------------------------
// Porte 3 — retrouvez la question
// ---------------------------------------------------------------------------

export interface ReponseP3 {
  question?: string;
  indices?: string[];
  suite?: string;
}

export function noterP3(version: VersionP3, reponse: ReponseP3, baremes: Baremes): ResultatPorte {
  const reperes: string[] = [];
  const q = version.question.options.find((o) => o.id === reponse.question);
  const s = version.suite.options.find((o) => o.id === reponse.suite);
  const coches = new Set(reponse.indices ?? []);
  let justes = 0;
  let faux = 0;
  for (const i of version.indices.options) {
    if (!coches.has(i.id)) continue;
    if (i.juste) justes += 1;
    else faux += 1;
  }
  const pointsIndices = Math.max(0, justes - faux);
  const pointsQuestion = q?.points ?? 0;
  const pointsSuite = s?.points ?? 0;
  if (q?.repere) reperes.push(q.repere);
  if (s?.repere) reperes.push(s.repere);
  const points = pointsQuestion + pointsIndices + pointsSuite;
  return {
    porte: "p3",
    points,
    max: baremes.p3.max,
    niveau: niveauParSeuils(points, baremes.p3.seuils),
    reperes,
    detail: `question ${pointsQuestion}/2, indices ${pointsIndices} (${justes} juste${justes > 1 ? "s" : ""}, ${faux} faux), suite ${pointsSuite}/2`,
  };
}

// ---------------------------------------------------------------------------
// Porte 4 — défi pratique
// ---------------------------------------------------------------------------

export type ReponseP4 =
  | { type: "ordonner"; ordre: string[] }
  | { type: "classer"; classement: Record<string, string | undefined> }
  | { type: "reperer"; reperes: string[] };

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** Part des règles d'ordre respectées, puis correction du hasard (une règle au hasard a une chance sur deux). */
export function scoreOrdonner(version: VersionP4Ordonner, ordre: string[]): { brut: number; corrige: number; respectees: number } {
  const position = new Map(ordre.map((id, i) => [id, i]));
  let respectees = 0;
  for (const r of version.regles) {
    const a = position.get(r.avant);
    const b = position.get(r.apres);
    if (a !== undefined && b !== undefined && a < b) respectees += 1;
  }
  const brut = version.regles.length ? respectees / version.regles.length : 0;
  const corrige = clamp01((brut - 0.5) / 0.5);
  return { brut, corrige, respectees };
}

/** Part des éléments bien classés, corrigée du hasard (part attendue au hasard = catégories acceptées / catégories). */
export function scoreClasser(
  version: VersionP4Classer,
  classement: Record<string, string | undefined>,
): { brut: number; corrige: number; bienClasses: number } {
  const nCat = version.categories.length;
  let bienClasses = 0;
  let attendu = 0;
  for (const e of version.elements) {
    const choix = classement[e.id];
    if (choix && e.accepte.includes(choix)) bienClasses += 1;
    attendu += e.accepte.length / nCat;
  }
  const n = version.elements.length;
  const brut = n ? bienClasses / n : 0;
  const attenduMoyen = n ? attendu / n : 0;
  const corrige = attenduMoyen >= 1 ? brut : clamp01((brut - attenduMoyen) / (1 - attenduMoyen));
  return { brut, corrige, bienClasses };
}

/** Erreurs trouvées moins fausses alertes, rapporté au nombre d'erreurs. */
export function scoreReperer(version: VersionP4Reperer, coches: string[]): { corrige: number; trouvees: number; fausses: number } {
  const set = new Set(coches);
  let trouvees = 0;
  let fausses = 0;
  for (const e of version.elements) {
    if (!set.has(e.id)) continue;
    if (e.erreur) trouvees += 1;
    else fausses += 1;
  }
  const nErreurs = version.elements.filter((e) => e.erreur).length;
  const corrige = nErreurs ? clamp01((trouvees - fausses) / nErreurs) : 0;
  return { corrige, trouvees, fausses };
}

export function noterP4(version: VersionP4, reponse: ReponseP4 | undefined, baremes: Baremes): ResultatPorte {
  let score = 0;
  let detail = "sans réponse";
  if (reponse && reponse.type === version.type) {
    if (version.type === "ordonner" && reponse.type === "ordonner") {
      const r = scoreOrdonner(version, reponse.ordre);
      score = r.corrige;
      detail = `${r.respectees} règle${r.respectees > 1 ? "s" : ""} d'ordre sur ${version.regles.length} respectée${r.respectees > 1 ? "s" : ""}`;
    } else if (version.type === "classer" && reponse.type === "classer") {
      const r = scoreClasser(version, reponse.classement);
      score = r.corrige;
      detail = `${r.bienClasses} élément${r.bienClasses > 1 ? "s" : ""} sur ${version.elements.length} bien classé${r.bienClasses > 1 ? "s" : ""}`;
    } else if (version.type === "reperer" && reponse.type === "reperer") {
      const r = scoreReperer(version, reponse.reperes);
      score = r.corrige;
      const nErreurs = version.elements.filter((e) => e.erreur).length;
      detail = `${r.trouvees} erreur${r.trouvees > 1 ? "s" : ""} trouvée${r.trouvees > 1 ? "s" : ""} sur ${nErreurs}, ${r.fausses} fausse${r.fausses > 1 ? "s" : ""} alerte${r.fausses > 1 ? "s" : ""}`;
    }
  }
  const niveau = niveauParSeuils(score, baremes.p4.seuils);
  const reperes: string[] = [];
  if (reponse) {
    if (niveau >= 3 && version.repere_reussite) reperes.push(version.repere_reussite);
    if (niveau <= 1 && version.repere_echec) reperes.push(version.repere_echec);
  }
  return {
    porte: "p4",
    points: arrondir(score, 2),
    max: 1,
    score: arrondir(score, 2),
    niveau,
    reperes,
    detail: `${detail} · score corrigé du hasard ${formaterNombre(arrondir(score, 2))}`,
  };
}

/** Variante en situation réelle : 4 critères → 3 (ou 4 avec le bonus) ; 2 ou 3 → 2 ; 0 ou 1 → 1. */
export function noterReel(variante: VarianteReelle, criteresCoches: boolean[], bonus: boolean): ResultatPorte {
  const n = variante.criteres.length;
  const coches = criteresCoches.slice(0, n).filter(Boolean).length;
  let niveau: Niveau = 1;
  if (coches >= n) niveau = bonus && variante.bonus ? 4 : 3;
  else if (coches >= Math.ceil(n / 2)) niveau = 2;
  const reperes = variante.criteres.filter((c, i) => criteresCoches[i] && c.repere).map((c) => c.repere as string);
  if (bonus && variante.bonus?.repere) reperes.push(variante.bonus.repere);
  return {
    porte: "reel",
    points: coches,
    max: n,
    niveau,
    reperes,
    detail: `${coches} critère${coches > 1 ? "s" : ""} observé${coches > 1 ? "s" : ""} sur ${n}${bonus ? ", avec l'élément en plus" : ""}`,
  };
}

// ---------------------------------------------------------------------------
// Entretien
// ---------------------------------------------------------------------------

/** Les attendus cochés sont des repères (tous → 3 ; au moins la moitié → 2), pas un calcul qui remplace le jugement. */
export function repereEntretien(attendusCoches: number, attendusTotal: number): Niveau | null {
  if (attendusTotal <= 0) return null;
  if (attendusCoches >= attendusTotal) return 3;
  if (attendusCoches * 2 >= attendusTotal) return 2;
  return 1;
}

export function noterEntretien(niveauChoisi: Niveau | null, attendusCoches: number, attendusTotal: number): ResultatPorte | null {
  if (!niveauChoisi) return null;
  const repere = repereEntretien(attendusCoches, attendusTotal);
  return {
    porte: "entretien",
    points: attendusCoches,
    max: attendusTotal,
    niveau: niveauChoisi,
    reperes: [],
    detail: `niveau ${niveauChoisi} choisi par la personne qui évalue · ${attendusCoches} attendu${attendusCoches > 1 ? "s" : ""} sur ${attendusTotal}${repere ? ` (repère : niveau ${repere})` : ""}`,
  };
}

// ---------------------------------------------------------------------------
// Combinaison des mesures d'une compétence
// ---------------------------------------------------------------------------

export interface Mesure {
  source: "epreuve" | "entretien";
  evaluateur?: string;
  niveau: Niveau;
}

/**
 * Niveau prouvé d'une compétence.
 * - Plusieurs personnes ont évalué la même mesure : on garde la médiane basse de leurs niveaux
 *   (leurs notes restent visibles chacune, rien n'est écrasé).
 * - Épreuve et entretien existent tous les deux : le niveau prouvé est le plus bas des deux
 *   (une compétence est prouvée quand toutes les mesures la confirment) ; l'écart est signalé
 *   quand il atteint 2 niveaux.
 * Le profil de travail, la porte choisie, le déroulé et le temps n'entrent jamais ici.
 */
export function niveauCompetence(mesures: Mesure[]): { niveau: Niveau | null; epreuve: Niveau | null; entretien: Niveau | null; ecart: boolean } {
  const parSource = (source: Mesure["source"]): Niveau | null => {
    const niveaux = mesures
      .filter((m) => m.source === source)
      .map((m) => m.niveau)
      .sort((a, b) => a - b);
    if (!niveaux.length) return null;
    return niveaux[Math.floor((niveaux.length - 1) / 2)];
  };
  const epreuve = parSource("epreuve");
  const entretien = parSource("entretien");
  let niveau: Niveau | null = null;
  if (epreuve !== null && entretien !== null) niveau = Math.min(epreuve, entretien) as Niveau;
  else niveau = epreuve ?? entretien;
  const ecart = epreuve !== null && entretien !== null && Math.abs(epreuve - entretien) >= 2;
  return { niveau, epreuve, entretien, ecart };
}

// ---------------------------------------------------------------------------
// Classement
// ---------------------------------------------------------------------------

export interface CandidatClassable {
  id: string;
  nom: string;
  /** niveau prouvé par compétence (null si non mesurée). */
  niveaux: Record<string, Niveau | null>;
}

export interface LigneClassement extends CandidatClassable {
  rang: number;
  auRequis: number;
  total: number;
  mesurees: number;
}

/**
 * Du plus haut niveau prouvé au plus bas : nombre de compétences au niveau requis,
 * puis somme des niveaux prouvés, puis ordre alphabétique. Le classement n'écrit pas la décision.
 */
export function classer(candidats: CandidatClassable[], requis: Record<string, Niveau>): LigneClassement[] {
  const lignes = candidats.map((c) => {
    let auRequis = 0;
    let total = 0;
    let mesurees = 0;
    for (const [code, niveau] of Object.entries(c.niveaux)) {
      if (niveau === null || niveau === undefined) continue;
      mesurees += 1;
      total += niveau;
      if (niveau >= (requis[code] ?? 3)) auRequis += 1;
    }
    return { ...c, auRequis, total, mesurees, rang: 0 };
  });
  lignes.sort((a, b) => b.auRequis - a.auRequis || b.total - a.total || a.nom.localeCompare(b.nom, "fr"));
  let rang = 0;
  lignes.forEach((l, i) => {
    const prec = lignes[i - 1];
    if (!prec || prec.auRequis !== l.auRequis || prec.total !== l.total) rang = i + 1;
    l.rang = rang;
  });
  return lignes;
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

export function formaterNombre(x: number): string {
  return x.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

export function optionParId(options: OptionChoix[], id: string | undefined): OptionChoix | undefined {
  return options.find((o) => o.id === id);
}
