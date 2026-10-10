/**
 * Construction de l'épreuve figée d'un recrutement (copie locale des questions,
 * avec corrigés) et du paquet candidat (sans corrigés).
 */
import type { Base, CodeCompetence, Pack, PorteId } from "@/lib/contenu/types";
import { jsonCanonique } from "@/lib/contenu/empreinte";
import type {
  CompetenceCandidat,
  CompetenceFigee,
  EpreuveFigee,
  PaquetCandidat,
  PortesCandidat,
  PortesFigees,
  Recrutement,
  TextesEpreuve,
  VersionP4Candidat,
} from "@/lib/stockage/modele";
import { competence, reservoirEntretien, reservoirP1, reservoirP2, reservoirP3, reservoirP4, reservoirP5 } from "./tirage";

function fnv1a(texte: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Empreinte courte et synchrone des questions posées (pas un secret, un contrôle). */
export function empreinteEpreuve(valeur: unknown): string {
  const s = jsonCanonique(valeur);
  return fnv1a(s) + fnv1a(s.split("").reverse().join(""));
}

export function figerEpreuve(pack: Pack, base: Base, r: Recrutement, date = new Date().toISOString()): EpreuveFigee {
  const competences: CompetenceFigee[] = r.competences.map(({ code, niveau_requis }) => {
    const c = competence(pack, code);
    const s = r.selection.competences[code];
    if (!s) throw new Error(`Pas de sélection pour ${code}`);
    const portes: PortesFigees = {};
    if (r.portes.includes("p1")) {
      const pool = reservoirP1(c);
      portes.p1 = { questions: s.p1.map((id) => pool.find((q) => q.id === id)).filter((q): q is NonNullable<typeof q> => !!q) };
    }
    if (r.portes.includes("p2")) {
      const pool = reservoirP2(c);
      portes.p2 = {
        debuts: s.p2.map((id) => pool.find((q) => q.id === id)).filter((q): q is NonNullable<typeof q> => !!q),
        bonus: c.portes.p2.bonus ?? [],
        recruteur: r.questions_recruteur.p2[code] ?? [],
      };
    }
    if (r.portes.includes("p3")) {
      const v = reservoirP3(c).find((x) => x.id === s.p3);
      if (v) portes.p3 = v;
    }
    if (r.portes.includes("p4")) {
      const v = reservoirP4(c).find((x) => x.id === s.p4);
      if (v) portes.p4 = v;
    }
    if (r.portes.includes("p5")) {
      const pool = reservoirP5(c);
      portes.p5 = {
        questions: s.p5.map((id) => pool.find((q) => q.id === id)).filter((q): q is NonNullable<typeof q> => !!q),
        bonus: c.portes.p5.bonus ?? [],
        recruteur: r.questions_recruteur.p5[code] ?? [],
      };
    }
    return {
      code,
      titre: c.titre,
      pourquoi: c.pourquoi,
      niveau_requis,
      situation: c.situation,
      portes,
      integration: c.integration,
    };
  });

  const reservoir = reservoirEntretien(pack);
  const questions = r.selection.entretien.map((id) => reservoir.find((q) => q.id === id)).filter((q): q is NonNullable<typeof q> => !!q);
  const items = base.profil_travail.items.filter((i) => r.profil_travail.essentiels.includes(i.dim));

  const sansEmpreinte: Omit<EpreuveFigee, "empreinte" | "figee_le"> = {
    schema: "ci5p-epreuve/1",
    metier: { id: pack.id, nom: pack.nom, version: pack.version, _pv: pack._pv },
    poste: r.poste,
    portes: r.portes,
    competences,
    entretien: { questions, recruteur: r.questions_recruteur.entretien },
    profil_travail: { essentiels: r.profil_travail.essentiels, phrases: r.profil_travail.phrases, items },
    deroule: r.deroule,
  };
  return { ...sansEmpreinte, empreinte: empreinteEpreuve(paquetSansCorriges(sansEmpreinte.competences)), figee_le: date };
}

/** Retire tout ce qui ressemble à un corrigé. */
function paquetSansCorriges(competences: CompetenceFigee[]): CompetenceCandidat[] {
  return competences.map((c) => {
    const portes: PortesCandidat = {};
    if (c.portes.p1) {
      portes.p1 = {
        questions: c.portes.p1.questions.map((q) => ({ id: q.id, texte: q.texte, options: q.options.map((o) => ({ id: o.id, texte: o.texte })) })),
      };
    }
    if (c.portes.p2) {
      portes.p2 = {
        debuts: [
          ...c.portes.p2.debuts.map((d) => ({ id: d.id, debut: d.debut })),
          ...c.portes.p2.recruteur.map((q) => ({ id: q.id, debut: q.texte, recruteur: true })),
        ],
      };
    }
    if (c.portes.p3) {
      const v = c.portes.p3;
      portes.p3 = {
        id: v.id,
        reponse: v.reponse,
        question: { options: v.question.options.map((o) => ({ id: o.id, texte: o.texte })) },
        indices: { options: v.indices.options.map((o) => ({ id: o.id, texte: o.texte })) },
        suite: { options: v.suite.options.map((o) => ({ id: o.id, texte: o.texte })) },
      };
    }
    if (c.portes.p4) {
      const v = c.portes.p4;
      const commun = { id: v.id, titre: v.titre, consigne: v.consigne, document: v.document ?? null };
      let p4: VersionP4Candidat;
      if (v.type === "ordonner") p4 = { ...commun, type: "ordonner", elements: v.elements.map((e) => ({ id: e.id, texte: e.texte })) };
      else if (v.type === "classer")
        p4 = {
          ...commun,
          type: "classer",
          elements: v.elements.map((e) => ({ id: e.id, texte: e.texte })),
          categories: v.categories.map((k) => ({ id: k.id, nom: k.nom })),
        };
      else p4 = { ...commun, type: "reperer", elements: v.elements.map((e) => ({ id: e.id, texte: e.texte })) };
      portes.p4 = p4;
    }
    if (c.portes.p5) {
      portes.p5 = {
        questions: [
          ...c.portes.p5.questions.map((q) => ({ id: q.id, texte: q.texte })),
          ...c.portes.p5.recruteur.map((q) => ({ id: q.id, texte: q.texte, recruteur: true })),
        ],
      };
    }
    return { code: c.code, titre: c.titre, situation: c.situation, portes };
  });
}

export function textesEpreuve(base: Base): TextesEpreuve {
  return {
    portes: base.portes.map((p) => ({ id: p.id, n: p.n, nom: p.nom, court: p.court, candidat: p.candidat, duree: p.duree })),
    besoins: base.besoins,
    echelle: base.profil_travail.echelle,
    ne_sait_pas: base.profil_travail.ne_sait_pas,
    intro_profil: base.profil_travail.intro_candidat,
    marque: base.meta.marque,
  };
}

export function paquetCandidat(
  epreuve: EpreuveFigee,
  base: Base,
  recrutementId: string,
  candidat: { id: string; nom: string } | null,
  options: { deroule?: boolean } = {},
): PaquetCandidat {
  return {
    schema: "ci5p-epreuve-candidat/1",
    empreinte: epreuve.empreinte,
    recrutement_id: recrutementId,
    metier: { id: epreuve.metier.id, nom: epreuve.metier.nom },
    poste: epreuve.poste,
    portes: epreuve.portes,
    competences: paquetSansCorriges(epreuve.competences),
    profil_travail: epreuve.profil_travail.phrases && epreuve.profil_travail.items.length ? epreuve.profil_travail : null,
    deroule: options.deroule ?? epreuve.deroule,
    candidat,
    textes: textesEpreuve(base),
  };
}

const CLES_INTERDITES = ["points", "justes", "partielles", "a_eviter", "repere", "explication", "regles", "accepte", "erreur", "juste", "reel", "bonus", "repere_reussite", "repere_echec", "bareme", "barème"];

/** Garde-fou testé : un paquet candidat ne contient aucune clé de corrigé. */
export function clesDeCorrige(valeur: unknown, chemin = ""): string[] {
  const trouvees: string[] = [];
  if (Array.isArray(valeur)) valeur.forEach((v, i) => trouvees.push(...clesDeCorrige(v, `${chemin}[${i}]`)));
  else if (valeur && typeof valeur === "object") {
    for (const [k, v] of Object.entries(valeur as Record<string, unknown>)) {
      if (CLES_INTERDITES.includes(k)) trouvees.push(`${chemin}.${k}`);
      trouvees.push(...clesDeCorrige(v, `${chemin}.${k}`));
    }
  }
  return trouvees;
}

export function codesCompetences(epreuve: EpreuveFigee): CodeCompetence[] {
  return epreuve.competences.map((c) => c.code);
}

export function portesDisponibles(c: CompetenceCandidat | CompetenceFigee): PorteId[] {
  return (["p1", "p2", "p3", "p4", "p5"] as PorteId[]).filter((p) => c.portes[p] !== undefined);
}
