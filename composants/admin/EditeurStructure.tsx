"use client";

/**
 * Éditeur structuré générique : formulaires générés depuis la forme du JSON
 * (chaînes, nombres, booléens, listes, objets), avec libellés en français pour les
 * clés connues. Pas un textarea de JSON brut. Les listes se réordonnent au clavier.
 */
import { useId, useState, type ReactNode } from "react";

export type Valeur = string | number | boolean | null | Valeur[] | { [k: string]: Valeur };

export const LIBELLES: Record<string, string> = {
  id: "Identifiant",
  nom: "Nom",
  titre: "Titre",
  texte: "Texte",
  version: "Version",
  secteur: "Domaine (identifiant)",
  alias: "Alias (synonymes reconnus par « Décrire mon besoin »)",
  resume: "Résumé",
  contexte: "Contexte des situations",
  cadre: "Cadre",
  competences: "Compétences",
  entretien: "Entretien",
  code: "Code (C1 à C8)",
  pourquoi: "Pourquoi cette compétence",
  niveau_requis: "Niveau requis (1 à 4)",
  situation: "Situation",
  document: "Document joint",
  portes: "Portes",
  p1: "Porte 1 · Choix multiples",
  p2: "Porte 2 · Phrases à compléter",
  p3: "Porte 3 · Retrouvez la question",
  p4: "Porte 4 · Défi pratique",
  p5: "Porte 5 · Oral ou écrit",
  questions: "Questions",
  options: "Options",
  points: "Points (0, 1 ou 2)",
  repere: "Repère (id de base.reperes)",
  explication: "Explication",
  relance: "Relance",
  angle: "Angle",
  debuts: "Débuts de phrase",
  debut: "Début de phrase",
  justes: "Réponses justes",
  partielles: "Réponses partielles",
  a_eviter: "Réponses à éviter",
  bonus: "Éléments « en plus »",
  reponse: "La réponse donnée",
  question: "Question de départ",
  indices: "Indices",
  juste: "Indice juste ?",
  suite: "La suite",
  type: "Type",
  consigne: "Consigne",
  elements: "Éléments",
  regles: "Règles d'ordre",
  avant: "Avant (id)",
  apres: "Après (id)",
  categories: "Catégories",
  accepte: "Catégories acceptées (ids)",
  erreur: "Contient une erreur ?",
  repere_reussite: "Repère si réussite",
  repere_echec: "Repère si échec",
  reel: "Variante en situation réelle",
  criteres: "Critères observés",
  integration: "Conseils d'intégration",
  banque: "Banque de questions",
  angles: "Angles des questions du kit",
  competence: "Compétence (code)",
  attendus: "Attendus",
  alternative: "Alternative",
  essai: "Question d'essai",
  items: "Éléments",
  de: "De",
  colonnes: "Colonnes",
  lignes: "Lignes",
  max: "Maximum",
  seuils: "Seuils [minimum, niveau]",
  n: "Numéro",
  quand: "Quand",
  objet: "Objet",
  corps: "Corps",
  cat: "Catégorie",
  url: "Adresse",
  statut: "Statut",
  comment: "Comment",
  sources: "Sources (numéros)",
  label: "Libellé",
  retour: "Phrase de retour au candidat",
  conseil: "Conseil",
  sens: "Sens (+ ou −)",
  comp: "Compétence",
  definition: "Définition",
  ancres: "Ancres (niveaux 1 à 4)",
  attention: "Attention",
  equivalence: "Équivalence par porte",
  piste: "Piste",
  dimensions: "Dimensions",
  echelle: "Échelle",
  ne_sait_pas: "« Je ne sais pas »",
  defauts: "Savoir-être par défaut, par métier",
  intro_candidat: "Introduction pour le candidat",
  notice: "Notice",
  annonce: "Annonce (e-mail 2)",
  annonce_courte: "Annonce courte",
  notice_situations: "Notice des situations",
  max_essentiels: "Nombre maximal de savoir-être essentiels",
  ft: "Intitulé France Travail",
  ft_proche: "Intitulé proche (pas identique)",
  aide: "Aide à l'accueil",
  plus: "Repères « + »",
  moins: "Repères « − »",
  dim: "Dimension",
  obstacle: "Obstacle",
  inclut: "Inclut",
  chiffre: "Chiffre",
  couleur: "Couleur",
  raison: "Raison",
  a_la_place: "À la place",
  objectif: "Objectif de métiers",
  lot: "Taille des lots",
  delai: "Délai",
  promesse: "Promesse",
  plus_recrutes: "Les plus recrutés (ids)",
  plus_recrutes_source: "Source (numéro)",
  methode1: "La méthode (4 principes : titre, texte, sources)",
  methode2: "Les cinq portes",
  regles_portes: "Règles des portes",
  pilote: "Pilote de 8 semaines",
  faq: "Questions fréquentes",
  limites: "Limites",
  exemples: "Exemples",
  bientot: "Bientôt",
  carte: "Texte de la carte",
  candidat: "Texte pour le candidat",
  recruteur: "Texte pour le recruteur",
  duree: "Durée indicative",
  court: "Mot court",
  marque: "Marque",
  slogan: "Slogan",
  sous_titre: "Sous-titre",
  date: "Date",
  sources_verifiees: "Sources vérifiées",
  comptes: "Comptes",
  niveaux: "Niveaux",
  "1": "Niveau 1",
  "2": "Niveau 2",
  "3": "Niveau 3",
  "4": "Niveau 4",
};

const CLES_FIGEES = new Set(["schema", "_pv"]);
const CLES_IDENTIFIANTS = new Set(["id", "code", "repere", "repere_reussite", "repere_echec", "avant", "apres", "dim", "comp", "competence", "secteur"]);

export function libelle(cle: string): string {
  return LIBELLES[cle] ?? cle.replace(/_/g, " ");
}

function resume(v: Valeur): string {
  if (typeof v === "string") return v.slice(0, 80);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v === null) return "—";
  if (Array.isArray(v)) return `${v.length} élément${v.length > 1 ? "s" : ""}`;
  const obj = v;
  for (const k of ["titre", "nom", "texte", "debut", "question", "id", "code", "label"]) {
    const x = obj[k];
    if (typeof x === "string" && x) return `${obj.id && k !== "id" ? `${obj.id} · ` : ""}${x.slice(0, 70)}`;
  }
  return Object.keys(obj).slice(0, 3).join(", ");
}

/** Gabarit vide pour ajouter un élément à une liste, à partir du dernier élément. */
function gabarit(v: Valeur | undefined): Valeur {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return "";
  if (typeof v === "number") return 0;
  if (typeof v === "boolean") return false;
  if (Array.isArray(v)) return [];
  const o: { [k: string]: Valeur } = {};
  for (const [k, x] of Object.entries(v)) o[k] = typeof x === "object" && x !== null && !Array.isArray(x) ? gabarit(x) : Array.isArray(x) ? [] : k === "id" ? "" : gabarit(x);
  return o;
}

export function EditeurStructure({ valeur, onChange, chemin = [], profondeur = 0, cle }: { valeur: Valeur; onChange: (v: Valeur) => void; chemin?: string[]; profondeur?: number; cle?: string }) {
  const id = useId();
  const nomCle = chemin[chemin.length - 1] ?? "";

  if (valeur === null) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-texte-2">—</span>
        {nomCle === "document" ? (
          <button type="button" className="bouton min-h-9 text-sm" onClick={() => onChange({ type: "liste", titre: "", items: [""] })}>
            Ajouter un document (liste)
          </button>
        ) : nomCle === "bonus" || nomCle === "reel" ? null : (
          <button type="button" className="bouton min-h-9 text-sm" onClick={() => onChange("")}>
            Définir un texte
          </button>
        )}
      </div>
    );
  }
  if (typeof valeur === "boolean") {
    return (
      <label className="flex items-center gap-2 min-h-9">
        <input type="checkbox" checked={valeur} onChange={(e) => onChange(e.target.checked)} />
        <span className="text-sm">{libelle(nomCle)}</span>
      </label>
    );
  }
  if (typeof valeur === "number") {
    return <input id={id} type="number" className="champ max-w-[10rem]" value={valeur} step="any" onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />;
  }
  if (typeof valeur === "string") {
    const long = valeur.length > 90 || valeur.includes("\n");
    if (long) return <textarea id={id} className="champ" rows={Math.min(14, Math.max(2, Math.ceil(valeur.length / 90) + valeur.split("\n").length))} value={valeur} onChange={(e) => onChange(e.target.value)} />;
    const petit = CLES_IDENTIFIANTS.has(nomCle) || nomCle === "version";
    return (
      <div className="flex items-center gap-2">
        <input id={id} className={`champ ${petit ? "max-w-[16rem] font-mono text-sm" : ""}`} value={valeur} onChange={(e) => onChange(e.target.value)} />
        {nomCle !== "document" && (chemin[chemin.length - 2] === "document" || nomCle === "repere") ? null : null}
        {chemin.length && (nomCle === "repere" || nomCle === "repere_reussite" || nomCle === "repere_echec") && valeur === "" ? (
          <button type="button" className="bouton min-h-9 text-sm" onClick={() => onChange(null)}>
            Aucun
          </button>
        ) : null}
      </div>
    );
  }
  if (Array.isArray(valeur)) {
    const primitifs = valeur.every((x) => typeof x !== "object" || x === null);
    return (
      <Liste valeur={valeur} onChange={onChange} chemin={chemin} profondeur={profondeur} primitifs={primitifs} cle={cle ?? nomCle} />
    );
  }
  // Objet
  const entrees = Object.entries(valeur);
  return (
    <div className={`space-y-3 ${profondeur > 0 ? "border-l-2 border-bord pl-3" : ""}`}>
      {entrees.map(([k, v]) => {
        const figee = CLES_FIGEES.has(k);
        const simple = v === null || typeof v !== "object";
        const contenu = figee ? (
          <p className="text-sm font-mono text-texte-2">{String(v)}</p>
        ) : (
          <EditeurStructure
            valeur={v}
            chemin={[...chemin, k]}
            profondeur={profondeur + 1}
            onChange={(nv) => onChange({ ...valeur, [k]: nv })}
          />
        );
        if (simple || figee) {
          return (
            <div key={k} className="space-y-1">
              {typeof v !== "boolean" ? <span className="etiquette text-sm">{libelle(k)}</span> : null}
              {contenu}
            </div>
          );
        }
        return (
          <details key={k} className="rounded-s border border-bord bg-surface" open={profondeur < 1}>
            <summary className="cursor-pointer px-3 py-2 font-semibold text-sm">
              {libelle(k)} <span className="font-normal text-texte-2">· {resume(v)}</span>
            </summary>
            <div className="px-3 pb-3">{contenu}</div>
          </details>
        );
      })}
    </div>
  );
}

function Liste({ valeur, onChange, chemin, profondeur, primitifs, cle }: { valeur: Valeur[]; onChange: (v: Valeur) => void; chemin: string[]; profondeur: number; primitifs: boolean; cle: string }) {
  const [ouverts, setOuverts] = useState<Record<number, boolean>>({});
  function maj(i: number, nv: Valeur) {
    const copie = [...valeur];
    copie[i] = nv;
    onChange(copie);
  }
  function deplacer(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= valeur.length) return;
    const copie = [...valeur];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    onChange(copie);
  }
  function ajouter() {
    const modele = gabarit(valeur[valeur.length - 1]);
    onChange([...valeur, modele]);
    setOuverts({ ...ouverts, [valeur.length]: true });
  }
  function retirer(i: number) {
    onChange(valeur.filter((_, k) => k !== i));
  }
  return (
    <div className="space-y-2">
      {valeur.length === 0 ? <p className="aide">Liste vide.</p> : null}
      {valeur.map((v, i) => (
        <div key={i} className={`flex gap-2 items-start ${primitifs ? "" : "rounded-s border border-bord bg-surface-2 p-2"}`}>
          <div className="flex-1 min-w-0">
            {primitifs ? (
              <EditeurStructure valeur={v} chemin={[...chemin, String(i)]} profondeur={profondeur + 1} onChange={(nv) => maj(i, nv)} />
            ) : (
              <details open={ouverts[i] ?? profondeur < 1}>
                <summary className="cursor-pointer text-sm font-medium">
                  {i + 1}. {resume(v)}
                </summary>
                <div className="mt-2">
                  <EditeurStructure valeur={v} chemin={[...chemin, String(i)]} profondeur={profondeur + 1} onChange={(nv) => maj(i, nv)} />
                </div>
              </details>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <button type="button" className="bouton min-h-9 w-9 px-0 text-sm" aria-label="Monter" disabled={i === 0} onClick={() => deplacer(i, -1)}>
              ↑
            </button>
            <button type="button" className="bouton min-h-9 w-9 px-0 text-sm" aria-label="Descendre" disabled={i === valeur.length - 1} onClick={() => deplacer(i, 1)}>
              ↓
            </button>
            <button type="button" className="bouton bouton-alerte min-h-9 px-2 text-sm" aria-label="Retirer" onClick={() => retirer(i)}>
              ✕
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="bouton min-h-9 text-sm" onClick={ajouter}>
        + Ajouter {libelle(cle).toLowerCase().replace(/^les /, "")}
      </button>
    </div>
  );
}

export function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="carte space-y-3">
      <h2 className="text-xl">{titre}</h2>
      {children}
    </section>
  );
}
