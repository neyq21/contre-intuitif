/**
 * Validation à l'exécution des JSON de contenu (base et packs).
 * Sert au seed, à l'import d'un fichier `ci5p-pack/3` et au mode JSON avancé de l'admin.
 */
import { z } from "zod";
import type { Base, Pack } from "./types";

const niveau = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const points = z.union([z.literal(0), z.literal(1), z.literal(2)]);
const codeCompetence = z.enum(["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"]);
const repereRef = z.string().nullable().optional();

const documentSituation = z.discriminatedUnion("type", [
  z.object({ type: z.literal("liste"), titre: z.string(), items: z.array(z.string()) }),
  z.object({ type: z.literal("message"), titre: z.string(), de: z.string(), texte: z.string() }),
  z.object({
    type: z.literal("tableau"),
    titre: z.string(),
    colonnes: z.array(z.string()),
    lignes: z.array(z.array(z.string())),
  }),
]);

const optionChoix = z.object({
  id: z.string(),
  texte: z.string(),
  points,
  repere: repereRef,
});

const reponsePrevue = z.object({ texte: z.string(), repere: z.string().nullable().optional() });
const bonusPorte = z.object({ texte: z.string(), repere: z.string().nullable().optional() });

const questionP1 = z.object({
  id: z.string(),
  texte: z.string(),
  options: z.array(optionChoix).min(2),
  explication: z.string().optional(),
  relance: z.string().optional(),
  angle: z.string().optional(),
  essai: z.boolean().optional(),
});

const debutP2 = z.object({
  id: z.string(),
  debut: z.string(),
  justes: z.array(reponsePrevue).min(1),
  partielles: z.array(reponsePrevue).optional(),
  a_eviter: z.array(reponsePrevue).optional(),
  angle: z.string().optional(),
  essai: z.boolean().optional(),
});

const versionP3 = z.object({
  reponse: z.string(),
  question: z.object({ options: z.array(optionChoix).min(2) }),
  indices: z.object({ options: z.array(z.object({ id: z.string(), texte: z.string(), juste: z.boolean() })).min(1) }),
  suite: z.object({ options: z.array(optionChoix).min(2) }),
  explication: z.string().optional(),
  id: z.string().optional(),
  angle: z.string().optional(),
  essai: z.boolean().optional(),
});

const critereReel = z.object({ texte: z.string(), repere: z.string().nullable().optional() });
const varianteReelle = z.object({
  consigne: z.string(),
  criteres: z.array(critereReel),
  bonus: bonusPorte.nullable().optional(),
});

const p4Commun = {
  titre: z.string(),
  consigne: z.string(),
  repere_reussite: z.string().nullable(),
  repere_echec: z.string().nullable(),
  reel: varianteReelle.optional(),
  document: documentSituation.nullable().optional(),
  id: z.string().optional(),
  angle: z.string().optional(),
  essai: z.boolean().optional(),
};

const versionP4 = z.discriminatedUnion("type", [
  z.object({
    ...p4Commun,
    type: z.literal("ordonner"),
    elements: z.array(z.object({ id: z.string(), texte: z.string() })).min(2),
    regles: z.array(z.object({ avant: z.string(), apres: z.string(), explication: z.string().optional() })).min(1),
  }),
  z.object({
    ...p4Commun,
    type: z.literal("classer"),
    elements: z
      .array(z.object({ id: z.string(), texte: z.string(), accepte: z.array(z.string()).min(1), explication: z.string().optional() }))
      .min(2),
    categories: z.array(z.object({ id: z.string(), nom: z.string() })).min(2),
  }),
  z.object({
    ...p4Commun,
    type: z.literal("reperer"),
    elements: z.array(z.object({ id: z.string(), texte: z.string(), erreur: z.boolean(), explication: z.string().optional() })).min(2),
  }),
]);

const questionP5 = z.object({
  id: z.string(),
  texte: z.string(),
  justes: z.array(reponsePrevue).min(1),
  partielles: z.array(reponsePrevue).optional(),
  a_eviter: z.array(reponsePrevue).optional(),
  angle: z.string().optional(),
  essai: z.boolean().optional(),
});

const questionEntretien = z.object({
  id: z.string(),
  competence: codeCompetence,
  texte: z.string(),
  suite: z.array(z.string()),
  attendus: z.array(z.string()),
  relance: z.string(),
  alternative: z.string(),
  angle: z.string().optional(),
  essai: z.boolean().optional(),
});

const banque = z.object({
  p1: z.array(questionP1),
  p2: z.array(debutP2),
  p3: z.array(versionP3),
  p4: z.array(versionP4),
  p5: z.array(questionP5),
  entretien: z.array(questionEntretien),
  angles: z.record(z.string(), z.string()).optional(),
});

const competence = z.object({
  code: codeCompetence,
  titre: z.string(),
  pourquoi: z.string(),
  niveau_requis: niveau,
  situation: z.object({ titre: z.string(), texte: z.string(), document: documentSituation.nullable() }),
  portes: z.object({
    p1: z.object({ questions: z.array(questionP1).min(1) }),
    p2: z.object({ debuts: z.array(debutP2).min(1), bonus: z.array(bonusPorte).optional() }),
    p3: versionP3,
    p4: versionP4,
    p5: z.object({ questions: z.array(questionP5).min(1), bonus: z.array(bonusPorte).optional() }),
  }),
  integration: z.array(z.string()),
  banque: banque.optional(),
});

export const schemaPack = z.object({
  schema: z.enum(["ci5p-pack/3", "ci5p-pack/2"]),
  id: z.string().regex(/^[a-z0-9-]+$/),
  version: z.string(),
  nom: z.string(),
  secteur: z.string(),
  alias: z.array(z.string()),
  resume: z.string(),
  contexte: z.string(),
  cadre: z.string(),
  competences: z.array(competence).min(1).max(4),
  entretien: z.array(questionEntretien),
  _pv: z.string(),
});

const seuil = z.tuple([z.number(), niveau]);

const repere = z.discriminatedUnion("sens", [
  z.object({ id: z.string(), comp: codeCompetence, sens: z.literal("+"), label: z.string(), retour: z.string() }),
  z.object({ id: z.string(), comp: codeCompetence, sens: z.literal("-"), label: z.string(), conseil: z.string() }),
]);

export const schemaBase = z.object({
  schema: z.literal("ci5p-base/2"),
  meta: z.object({
    titre: z.string(),
    sous_titre: z.string(),
    marque: z.string(),
    slogan: z.string(),
    version: z.string(),
    date: z.string(),
    sources_verifiees: z.string(),
    comptes: z.string(),
  }),
  niveaux: z.object({ "1": z.string(), "2": z.string(), "3": z.string(), "4": z.string() }),
  competences: z.array(
    z.object({
      code: codeCompetence,
      nom: z.string(),
      definition: z.string(),
      ancres: z.object({ "1": z.string(), "2": z.string(), "3": z.string(), "4": z.string() }),
      attention: z.string(),
      equivalence: z.array(z.string()),
      piste: z.string(),
    }),
  ),
  reperes: z.array(repere),
  portes: z.array(
    z.object({
      id: z.enum(["p1", "p2", "p3", "p4", "p5"]),
      n: z.number(),
      nom: z.string(),
      court: z.string(),
      carte: z.string(),
      candidat: z.string(),
      recruteur: z.string(),
      duree: z.string(),
    }),
  ),
  exemple: z.object({
    situation: z.string(),
    p1: z.object({ texte: z.string(), options: z.array(z.string()) }),
    p2: z.object({ debut: z.string() }),
    p3: z.object({ reponse: z.string(), consigne: z.string() }),
    p4: z.object({ consigne: z.string(), elements: z.array(z.string()) }),
    p5: z.object({ texte: z.string() }),
  }),
  baremes: z.object({
    p1: z.object({ max: z.number(), seuils: z.array(seuil), texte: z.string() }),
    p2: z.object({ max: z.number(), texte: z.string() }),
    p3: z.object({ max: z.number(), seuils: z.array(seuil), texte: z.string() }),
    p4: z.object({ seuils: z.array(seuil), texte: z.string() }),
    p5: z.object({ max: z.number(), texte: z.string() }),
    reel: z.object({ texte: z.string() }),
    entretien: z.object({ texte: z.string() }),
  }),
  secteurs: z.array(z.object({ id: z.string(), nom: z.string(), bientot: z.array(z.string()).optional() })),
  ne_pas_noter: z.array(z.object({ titre: z.string(), raison: z.string() })),
  a_eviter: z.array(z.object({ question: z.string(), pourquoi: z.string(), a_la_place: z.string() })),
  profils: z.array(
    z.object({
      id: z.string(),
      nom: z.string(),
      couleur: z.string(),
      inclut: z.string(),
      chiffre: z.string(),
      obstacle: z.string(),
      aide: z.string(),
    }),
  ),
  checklist: z.array(
    z.object({
      titre: z.string(),
      items: z.array(z.object({ texte: z.string(), statut: z.string(), comment: z.string(), sources: z.array(z.number()) })),
    }),
  ),
  emails: z.array(z.object({ n: z.number(), titre: z.string(), quand: z.string(), objet: z.string(), corps: z.string() })),
  bonus: z.array(z.object({ titre: z.string(), texte: z.string() })),
  relances: z.array(z.string()),
  besoins: z.array(z.string()),
  guide: z.object({
    methode1: z.array(z.tuple([z.string(), z.string(), z.array(z.number())])),
    methode2: z.string(),
    regles_portes: z.array(z.string()),
    pilote: z.array(z.tuple([z.string(), z.string(), z.string()])),
    faq: z.array(z.tuple([z.string(), z.string()])),
    limites: z.array(z.string()),
  }),
  sources: z.array(z.object({ n: z.number(), cat: z.string(), texte: z.string(), url: z.string() })),
  profil_travail: z.object({
    titre: z.string(),
    max_essentiels: z.number(),
    dimensions: z.array(
      z.object({
        id: z.string(),
        nom: z.string(),
        ft: z.string(),
        ft_proche: z.boolean().optional(),
        definition: z.string(),
        question: z.string(),
        aide: z.string(),
        plus: z.array(z.string()),
        moins: z.array(z.string()),
      }),
    ),
    items: z.array(z.object({ id: z.string(), dim: z.string(), texte: z.string() })),
    echelle: z.array(z.string()),
    ne_sait_pas: z.string(),
    defauts: z.record(z.string(), z.array(z.string())),
    intro_candidat: z.string(),
    notice: z.string(),
    annonce: z.string(),
    annonce_courte: z.string(),
    notice_situations: z.string(),
  }),
  domaines_a_venir: z.array(z.object({ id: z.string(), nom: z.string(), exemples: z.array(z.string()) })),
  catalogue: z.object({
    objectif: z.number(),
    lot: z.number(),
    delai: z.string(),
    promesse: z.string(),
    plus_recrutes: z.array(z.string()),
    plus_recrutes_source: z.number(),
  }),
});

export type ResultatValidation<T> = { ok: true; valeur: T } | { ok: false; erreurs: string[] };

function formater(e: z.ZodError): string[] {
  return e.issues.slice(0, 20).map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`);
}

/** Valide un pack. Les champs inconnus sont conservés (le kit peut en ajouter). */
export function validerPack(valeur: unknown): ResultatValidation<Pack> {
  const r = schemaPack.safeParse(valeur);
  if (!r.success) return { ok: false, erreurs: formater(r.error) };
  // On rend l'objet d'origine (validé) pour ne pas perdre les champs supplémentaires.
  return { ok: true, valeur: valeur as Pack };
}

export function validerBase(valeur: unknown): ResultatValidation<Base> {
  const r = schemaBase.safeParse(valeur);
  if (!r.success) return { ok: false, erreurs: formater(r.error) };
  return { ok: true, valeur: valeur as Base };
}
