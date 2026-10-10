/**
 * Tirage des questions d'un recrutement. Déterministe à partir d'une graine
 * stockée sur le recrutement : toutes les personnes d'un même recrutement ont
 * exactement les mêmes questions.
 *
 * Tirage 0 = les questions du kit (`portes` et `entretien`), dans l'ordre.
 * Tirage k ≥ 1 = un autre sous-ensemble, tiré dans `portes` ∪ `banque`,
 * rendu dans l'ordre d'origine. Sans banque, « Autre tirage » est inactif.
 */
import type {
  CodeCompetence,
  Competence,
  DebutP2,
  Pack,
  PorteId,
  QuestionEntretien,
  QuestionP1,
  QuestionP5,
  VersionP3,
  VersionP4,
} from "@/lib/contenu/types";

export const LIMITES = {
  p1: { min: 3, max: 10, defaut: 5 },
  p2: { min: 2, max: 6, defaut: 3 },
  p5: { min: 2, max: 6, defaut: 3 },
  questions_recruteur_par_porte: 2,
  questions_recruteur_entretien_par_competence: 3,
  entretien_par_competence: 2,
} as const;

export interface Nombres {
  p1: number;
  p2: number;
  p5: number;
}

export interface SelectionCompetence {
  p1: string[];
  p2: string[];
  p3: string;
  p4: string;
  p5: string[];
}

export interface Selection {
  competences: Record<string, SelectionCompetence>;
  entretien: string[];
}

export interface ConfigTirage {
  competences: CodeCompetence[];
  nombres: Nombres;
  graine: string;
  tirage: number;
}

// --- Générateur pseudo-aléatoire déterministe (xmur3 + mulberry32) ---------

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateur(graine: string): () => number {
  return mulberry32(xmur3(graine)());
}

export function nouvelleGraine(): string {
  const octets = new Uint8Array(8);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(octets);
  else for (let i = 0; i < 8; i++) octets[i] = Math.floor(Math.random() * 256);
  return Array.from(octets, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Sous-ensemble de `n` éléments, tiré avec `alea`, rendu dans l'ordre d'origine. */
export function sousEnsemble<T>(elements: T[], n: number, alea: () => number): T[] {
  if (n >= elements.length) return [...elements];
  const indices = elements.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices
    .slice(0, n)
    .sort((a, b) => a - b)
    .map((i) => elements[i]);
}

// --- Réservoirs ----------------------------------------------------------

export const ID_VERSION_BASE = "v1";

export function reservoirP1(c: Competence): QuestionP1[] {
  return [...c.portes.p1.questions, ...(c.banque?.p1 ?? [])];
}
export function reservoirP2(c: Competence): DebutP2[] {
  return [...c.portes.p2.debuts, ...(c.banque?.p2 ?? [])];
}
export function reservoirP3(c: Competence): (VersionP3 & { id: string })[] {
  return [{ ...c.portes.p3, id: c.portes.p3.id ?? ID_VERSION_BASE }, ...(c.banque?.p3 ?? []).map((v, i) => ({ ...v, id: v.id ?? `v${i + 2}` }))];
}
export function reservoirP4(c: Competence): (VersionP4 & { id: string })[] {
  return [{ ...c.portes.p4, id: c.portes.p4.id ?? ID_VERSION_BASE }, ...(c.banque?.p4 ?? []).map((v, i) => ({ ...v, id: v.id ?? `v${i + 2}` }))];
}
export function reservoirP5(c: Competence): QuestionP5[] {
  return [...c.portes.p5.questions, ...(c.banque?.p5 ?? [])];
}
export function reservoirEntretien(pack: Pack): QuestionEntretien[] {
  const banque = pack.competences.flatMap((c) => c.banque?.entretien ?? []);
  return [...pack.entretien, ...banque];
}

export function aUneBanque(pack: Pack): boolean {
  return pack.competences.some((c) => c.banque !== undefined);
}

export function competence(pack: Pack, code: string): Competence {
  const c = pack.competences.find((x) => x.code === code);
  if (!c) throw new Error(`Compétence ${code} absente du métier ${pack.id}`);
  return c;
}

/** Borne un nombre de questions aux limites de la porte et au réservoir disponible. */
export function bornerNombre(porte: "p1" | "p2" | "p5", demande: number, disponibles: number): number {
  const l = LIMITES[porte];
  return Math.max(l.min, Math.min(l.max, demande, disponibles));
}

// --- Tirage ----------------------------------------------------------------

export function tirer(pack: Pack, config: ConfigTirage): Selection {
  const competences: Record<string, SelectionCompetence> = {};
  for (const code of config.competences) {
    const c = competence(pack, code);
    const alea = generateur(`${config.graine}:${config.tirage}:${code}`);
    const rp1 = reservoirP1(c);
    const rp2 = reservoirP2(c);
    const rp3 = reservoirP3(c);
    const rp4 = reservoirP4(c);
    const rp5 = reservoirP5(c);
    const n1 = bornerNombre("p1", config.nombres.p1, rp1.length);
    const n2 = bornerNombre("p2", config.nombres.p2, rp2.length);
    const n5 = bornerNombre("p5", config.nombres.p5, rp5.length);
    if (config.tirage === 0) {
      competences[code] = {
        p1: rp1.slice(0, n1).map((q) => q.id),
        p2: rp2.slice(0, n2).map((q) => q.id),
        p3: rp3[0].id,
        p4: rp4[0].id,
        p5: rp5.slice(0, n5).map((q) => q.id),
      };
    } else {
      competences[code] = {
        p1: sousEnsemble(rp1, n1, alea).map((q) => q.id),
        p2: sousEnsemble(rp2, n2, alea).map((q) => q.id),
        p3: rp3[Math.floor(alea() * rp3.length)].id,
        p4: rp4[Math.floor(alea() * rp4.length)].id,
        p5: sousEnsemble(rp5, n5, alea).map((q) => q.id),
      };
    }
  }
  // Entretien : 2 questions par compétence mesurée.
  const reservoir = reservoirEntretien(pack);
  const entretien: string[] = [];
  for (const code of config.competences) {
    const pour = reservoir.filter((q) => q.competence === code);
    if (config.tirage === 0) entretien.push(...pour.slice(0, LIMITES.entretien_par_competence).map((q) => q.id));
    else {
      const alea = generateur(`${config.graine}:${config.tirage}:entretien:${code}`);
      entretien.push(...sousEnsemble(pour, LIMITES.entretien_par_competence, alea).map((q) => q.id));
    }
  }
  return { competences, entretien };
}

/** Vérifie qu'une sélection (éditée à la main) reste dans les règles. */
export function verifierSelection(pack: Pack, selection: Selection, codes: CodeCompetence[]): string[] {
  const erreurs: string[] = [];
  for (const code of codes) {
    const s = selection.competences[code];
    const c = competence(pack, code);
    if (!s) {
      erreurs.push(`Compétence ${code} : aucune question choisie`);
      continue;
    }
    if (s.p1.length < LIMITES.p1.min || s.p1.length > LIMITES.p1.max) erreurs.push(`${code}, porte 1 : de 3 à 10 questions (${s.p1.length})`);
    if (s.p2.length < LIMITES.p2.min || s.p2.length > LIMITES.p2.max) erreurs.push(`${code}, porte 2 : de 2 à 6 phrases (${s.p2.length})`);
    if (s.p5.length < LIMITES.p5.min || s.p5.length > LIMITES.p5.max) erreurs.push(`${code}, porte 5 : de 2 à 6 questions (${s.p5.length})`);
    const ids1 = new Set(reservoirP1(c).map((q) => q.id));
    const ids2 = new Set(reservoirP2(c).map((q) => q.id));
    const ids5 = new Set(reservoirP5(c).map((q) => q.id));
    for (const id of s.p1) if (!ids1.has(id)) erreurs.push(`${code}, porte 1 : question inconnue ${id}`);
    for (const id of s.p2) if (!ids2.has(id)) erreurs.push(`${code}, porte 2 : phrase inconnue ${id}`);
    for (const id of s.p5) if (!ids5.has(id)) erreurs.push(`${code}, porte 5 : question inconnue ${id}`);
    if (!reservoirP3(c).some((v) => v.id === s.p3)) erreurs.push(`${code}, porte 3 : version inconnue ${s.p3}`);
    if (!reservoirP4(c).some((v) => v.id === s.p4)) erreurs.push(`${code}, porte 4 : version inconnue ${s.p4}`);
  }
  return erreurs;
}

/** Les portes proposées : au moins 3, dont une sans rédaction libre. */
export function verifierPortes(portes: PorteId[]): string | null {
  if (portes.length < 3) return "Proposez au moins 3 portes.";
  if (!portes.some((p) => p === "p1" || p === "p3" || p === "p4")) return "Au moins une porte sans rédaction libre : choix multiples, retrouvez la question ou défi pratique.";
  return null;
}
