/**
 * Import / export des formats de fichiers du kit :
 *   ci5p-pack/3 (et /2), ci5p-sauvegarde/2, ci5p-reponses/2, ci5p-archive/1,
 * plus le fichier d'épreuve candidat et le code CI5Z-….
 *
 * Les importateurs sont tolérants : champs inconnus conservés, champs absents
 * complétés par des valeurs vides, jamais de troncature silencieuse.
 */
import { validerPack } from "@/lib/contenu/schema";
import type { Pack } from "@/lib/contenu/types";
import {
  PREFIXE_CODE,
  SCHEMA_ARCHIVE,
  SCHEMA_REPONSES,
  SCHEMA_SAUVEGARDE,
  etatVide,
  type Candidat,
  type Etat,
  type PaquetCandidat,
  type Recrutement,
  type Reponses,
} from "@/lib/stockage/modele";

export type Resultat<T> = { ok: true; valeur: T; avertissements: string[] } | { ok: false; erreur: string };

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function lireJson(texte: string): Resultat<unknown> {
  try {
    return { ok: true, valeur: JSON.parse(texte), avertissements: [] };
  } catch {
    return { ok: false, erreur: "Ce fichier n'est pas un JSON lisible." };
  }
}

export function detecterSchema(valeur: unknown): string | null {
  if (!estObjet(valeur)) return null;
  const s = valeur.schema;
  return typeof s === "string" ? s : null;
}

// ---------------------------------------------------------------------------
// Pack
// ---------------------------------------------------------------------------

export function importerPack(valeur: unknown): Resultat<Pack> {
  const schema = detecterSchema(valeur);
  if (schema !== "ci5p-pack/3" && schema !== "ci5p-pack/2") {
    return { ok: false, erreur: `Ce fichier n'est pas un métier (schéma attendu ci5p-pack/3, reçu ${schema ?? "aucun"}).` };
  }
  const r = validerPack(valeur);
  if (!r.ok) return { ok: false, erreur: `Métier invalide :\n${r.erreurs.join("\n")}` };
  const avertissements: string[] = [];
  if (schema === "ci5p-pack/2") avertissements.push("Métier au schéma ci5p-pack/2 : importé tel quel.");
  return { ok: true, valeur: r.valeur, avertissements };
}

export function exporterPack(pack: Pack): string {
  return JSON.stringify(pack, null, 2);
}

// ---------------------------------------------------------------------------
// Sauvegarde
// ---------------------------------------------------------------------------

export function exporterSauvegarde(etat: Etat, date = new Date().toISOString()): string {
  const s: Etat & { exporte_le: string; application: string } = {
    ...etat,
    schema: SCHEMA_SAUVEGARDE,
    version: 2,
    exporte_le: date,
    application: "La méthode des 5 portes · application web",
  };
  return JSON.stringify(s, null, 2);
}

function tableau<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Restaure une sauvegarde (de cette application ou du kit HTML v5). */
export function importerSauvegarde(valeur: unknown): Resultat<Etat> {
  if (!estObjet(valeur)) return { ok: false, erreur: "Ce fichier n'est pas une sauvegarde." };
  const schema = detecterSchema(valeur);
  const avertissements: string[] = [];
  // L'ancien HTML peut avoir enveloppé les données sous `donnees`.
  const source = estObjet(valeur.donnees) ? (valeur.donnees as Record<string, unknown>) : valeur;
  if (schema !== SCHEMA_SAUVEGARDE) {
    if (schema && schema.startsWith("ci5p-sauvegarde/")) avertissements.push(`Sauvegarde au schéma ${schema} : importée avec les champs reconnus.`);
    else if (!("recrutements" in source) && !("candidats" in source))
      return { ok: false, erreur: `Ce fichier n'est pas une sauvegarde (schéma attendu ${SCHEMA_SAUVEGARDE}, reçu ${schema ?? "aucun"}).` };
    else avertissements.push("Sauvegarde sans schéma : importée avec les champs reconnus.");
  }
  const vide = etatVide();
  const recrutements = tableau<Recrutement>(source.recrutements).filter((r) => estObjet(r) && typeof r.id === "string");
  const candidats = tableau<Candidat>(source.candidats).filter((c) => estObjet(c) && typeof c.id === "string");
  const metiers = tableau<unknown>(source.metiers_importes ?? source.metiers)
    .map((m) => importerPack(m))
    .filter((r): r is Extract<Resultat<Pack>, { ok: true }> => r.ok)
    .map((r) => r.valeur);
  const reglages = estObjet(source.reglages) ? { ...vide.reglages, ...(source.reglages as Partial<Etat["reglages"]>) } : vide.reglages;
  const etat: Etat = {
    ...vide,
    ...source,
    schema: SCHEMA_SAUVEGARDE,
    version: 2,
    recrutements: recrutements.map(completerRecrutement),
    candidats: candidats.map(completerCandidat),
    metiers_importes: metiers,
    reglages,
    modifie_le: new Date().toISOString(),
  } as Etat;
  const orphelins = etat.candidats.filter((c) => !etat.recrutements.some((r) => r.id === c.recrutement_id));
  if (orphelins.length) avertissements.push(`${orphelins.length} candidat(s) sans recrutement : conservés mais non affichés.`);
  return { ok: true, valeur: etat, avertissements };
}

function completerRecrutement(r: Partial<Recrutement> & { id: string }): Recrutement {
  return {
    statut: "preparation",
    fictif: false,
    notes: "",
    competences: [],
    portes: ["p1", "p2", "p3", "p4", "p5"],
    nombres: { p1: 5, p2: 3, p5: 3 },
    graine: "",
    tirage: 0,
    selection: { competences: {}, entretien: [] },
    questions_recruteur: { p2: {}, p5: {}, entretien: {} },
    profil_travail: { essentiels: [], phrases: false },
    deroule: false,
    evaluateurs: [],
    epreuve: null,
    lien_annonce: null,
    envois: { questions_envoyees: false },
    metier_nom: "",
    metier_version: "",
    metier_pv: "",
    metier_id: "",
    poste: "",
    cree_le: new Date().toISOString(),
    modifie_le: new Date().toISOString(),
    ...r,
  };
}

function completerCandidat(c: Partial<Candidat> & { id: string; recrutement_id: string }): Candidat {
  return {
    nom: "",
    email: "",
    mode: "ecran",
    cree_le: new Date().toISOString(),
    commence: false,
    reponses: null,
    evaluations: {},
    decision: null,
    besoins: { liste: [], autre: "" },
    lien: null,
    ...c,
  };
}

// ---------------------------------------------------------------------------
// Réponses (fichier et code CI5Z-…)
// ---------------------------------------------------------------------------

export function exporterReponses(reponses: Reponses): string {
  return JSON.stringify(reponses, null, 2);
}

export function importerReponses(valeur: unknown): Resultat<Reponses> {
  if (!estObjet(valeur)) return { ok: false, erreur: "Ce fichier n'est pas un fichier de réponses." };
  const schema = detecterSchema(valeur);
  if (schema !== SCHEMA_REPONSES) {
    return { ok: false, erreur: `Ce fichier n'est pas un fichier de réponses (schéma attendu ${SCHEMA_REPONSES}, reçu ${schema ?? "aucun"}).` };
  }
  if (!estObjet(valeur.competences)) return { ok: false, erreur: "Fichier de réponses sans réponses." };
  const brut = valeur as unknown as Partial<Reponses> & { competences: Reponses["competences"] };
  const r: Reponses = {
    recrutement_id: typeof brut.recrutement_id === "string" ? brut.recrutement_id : "",
    epreuve_empreinte: typeof brut.epreuve_empreinte === "string" ? brut.epreuve_empreinte : "",
    candidat: brut.candidat ?? { id: null, nom: null },
    profil_travail: brut.profil_travail ?? null,
    besoins: brut.besoins ?? null,
    deroule: brut.deroule ?? null,
    rendu_le: brut.rendu_le ?? new Date().toISOString(),
    competences: brut.competences,
    affichage: brut.affichage,
    schema: SCHEMA_REPONSES,
  };
  return { ok: true, valeur: r, avertissements: [] };
}

// --- base64url + deflate ----------------------------------------------------

function versBase64Url(octets: Uint8Array): string {
  let s = "";
  for (const b of octets) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function depuisBase64Url(texte: string): Uint8Array {
  const b64 = texte.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (texte.length % 4)) % 4);
  const s = atob(b64);
  const o = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i);
  return o;
}

async function comprimer(texte: string): Promise<Uint8Array> {
  const flux = new Blob([new TextEncoder().encode(texte)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(flux).arrayBuffer());
}
async function decomprimer(octets: Uint8Array): Promise<string> {
  const flux = new Blob([octets as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new TextDecoder().decode(await new Response(flux).arrayBuffer());
}

/**
 * Code `CI5Z-…` : les réponses complètes, compressées (deflate) et encodées en
 * base64url. Il suffit à réimporter. Jamais tronqué : s'il est long, le fichier
 * est fourni en même temps (voir ECARTS.md).
 */
export async function encoderCode(reponses: Reponses): Promise<string> {
  const octets = await comprimer(JSON.stringify(reponses));
  return PREFIXE_CODE + versBase64Url(octets);
}

export async function decoderCode(code: string): Promise<Resultat<Reponses>> {
  const propre = code.replace(/\s+/g, "");
  if (!propre.toUpperCase().startsWith(PREFIXE_CODE)) return { ok: false, erreur: "Le code doit commencer par CI5Z-." };
  try {
    const texte = await decomprimer(depuisBase64Url(propre.slice(PREFIXE_CODE.length)));
    const json = lireJson(texte);
    if (!json.ok) return json;
    return importerReponses(json.valeur);
  } catch {
    return { ok: false, erreur: "Code illisible : vérifiez qu'il est complet, ou importez le fichier de réponses." };
  }
}

/** Au-delà de cette longueur, l'application propose le fichier en premier. */
export const LONGUEUR_CODE_CONFORTABLE = 1500;

// ---------------------------------------------------------------------------
// Fichier d'épreuve (sans corrigé)
// ---------------------------------------------------------------------------

export function exporterEpreuve(paquet: PaquetCandidat): string {
  return JSON.stringify(paquet, null, 2);
}

export function importerEpreuve(valeur: unknown): Resultat<PaquetCandidat> {
  if (!estObjet(valeur) || detecterSchema(valeur) !== "ci5p-epreuve-candidat/1") {
    return { ok: false, erreur: "Ce fichier n'est pas un fichier d'épreuve." };
  }
  if (!Array.isArray(valeur.competences) || !estObjet(valeur.textes)) return { ok: false, erreur: "Fichier d'épreuve incomplet." };
  return { ok: true, valeur: valeur as unknown as PaquetCandidat, avertissements: [] };
}

// ---------------------------------------------------------------------------
// Archive de fin de recrutement (réponses, grilles, motifs ; sans déroulé ni besoins)
// ---------------------------------------------------------------------------

export interface Archive {
  schema: typeof SCHEMA_ARCHIVE;
  archive_le: string;
  recrutement: Omit<Recrutement, "epreuve"> & { epreuve: Recrutement["epreuve"] };
  candidats: {
    id: string;
    nom: string;
    reponses: Omit<Reponses, "deroule" | "besoins"> | null;
    evaluations: Candidat["evaluations"];
    decision: Candidat["decision"];
  }[];
}

export function construireArchive(r: Recrutement, candidats: Candidat[], date = new Date().toISOString()): Archive {
  return {
    schema: SCHEMA_ARCHIVE,
    archive_le: date,
    recrutement: r,
    candidats: candidats.map((c) => {
      let reponses: Archive["candidats"][number]["reponses"] = null;
      if (c.reponses) {
        const { deroule: _d, besoins: _b, ...reste } = c.reponses;
        void _d;
        void _b;
        reponses = reste;
      }
      return { id: c.id, nom: c.nom, reponses, evaluations: c.evaluations, decision: c.decision };
    }),
  };
}

export function exporterArchive(archive: Archive): string {
  return JSON.stringify(archive, null, 2);
}

export function importerArchive(valeur: unknown): Resultat<Archive> {
  if (!estObjet(valeur) || detecterSchema(valeur) !== SCHEMA_ARCHIVE) return { ok: false, erreur: "Ce fichier n'est pas une archive." };
  if (!estObjet(valeur.recrutement) || !Array.isArray(valeur.candidats)) return { ok: false, erreur: "Archive incomplète." };
  return { ok: true, valeur: valeur as unknown as Archive, avertissements: [] };
}

/** Nom de fichier sûr, avec la date. */
export function nomFichier(base: string, extension = "json", date = new Date()): string {
  const propre = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const d = date.toISOString().slice(0, 10);
  return `${propre || "fichier"}-${d}.${extension}`;
}
