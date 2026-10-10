/**
 * Analyse d'un candidat : niveau par compétence, ce qui a été montré (repères),
 * points à vérifier, relances, conseils d'accueil, brouillon de retour.
 * Tout vient des barèmes et des repères de la base : aucun texte généré.
 */
import type { Base, CodeCompetence, Niveau, PorteId, Repere } from "@/lib/contenu/types";
import type { Candidat, CompetenceFigee, EpreuveFigee, Evaluation, Recrutement, ReponsesCompetence } from "@/lib/stockage/modele";
import {
  classer,
  niveauCompetence,
  noterEntretien,
  noterP1,
  noterP2P5,
  noterP3,
  noterP4,
  noterReel,
  type Jugement,
  type LigneClassement,
  type Mesure,
  type ResultatPorte,
} from "./notation";

export interface MesureDetaillee extends Mesure {
  resultat: ResultatPorte;
  porte: PorteId | "reel" | "entretien";
}

export interface AnalyseCompetence {
  code: CodeCompetence;
  titre: string;
  niveau_requis: Niveau;
  porte_choisie: PorteId | null;
  /** Mesures : épreuve (automatique ou par évaluateur), variante réelle, entretien par évaluateur. */
  mesures: MesureDetaillee[];
  niveau: Niveau | null;
  niveau_epreuve: Niveau | null;
  niveau_entretien: Niveau | null;
  ecart: boolean;
  au_requis: boolean | null;
  /** Repères « + » montrés. */
  montre: Repere[];
  /** Repères « − » et autres points à vérifier. */
  a_verifier: { texte: string; repere?: Repere }[];
  relances: string[];
  conseils: string[];
  /** La porte 2 ou 5 attend un jugement humain. */
  en_attente_evaluation: boolean;
}

export interface Analyse {
  candidat_id: string;
  competences: AnalyseCompetence[];
  niveaux: Record<string, Niveau | null>;
  au_requis: number;
  mesurees: number;
  retour: { points_forts: string[]; a_developper: string[]; brouillon: string };
  profil_travail: ProfilTravailObserve[];
  complete: boolean;
}

export interface ProfilTravailObserve {
  dimension: string;
  nom: string;
  definition: string;
  question: string;
  aide: string;
  faits_plus: Repere[];
  faits_moins: Repere[];
  phrases: { id: string; texte: string; reponse: string | null }[];
}

function reperesParId(base: Base): Map<string, Repere> {
  return new Map(base.reperes.map((r) => [r.id, r]));
}

function jugements(ev: Evaluation, porte: "p2" | "p5", code: CodeCompetence, ids: string[]): (Jugement | undefined)[] {
  const j = ev[porte][code] ?? {};
  return ids.map((id) => j[id]);
}

/** Toutes les réponses d'une porte 2/5 ont-elles été jugées ? */
export function evaluationComplete(ev: Evaluation, porte: "p2" | "p5", code: CodeCompetence, ids: string[]): boolean {
  const j = ev[porte][code] ?? {};
  return ids.every((id) => j[id] !== undefined);
}

export function idsReponsesP2(c: CompetenceFigee): string[] {
  return [...(c.portes.p2?.debuts.map((d) => d.id) ?? []), ...(c.portes.p2?.recruteur.map((q) => q.id) ?? [])];
}
export function idsReponsesP5(c: CompetenceFigee): string[] {
  return [...(c.portes.p5?.questions.map((q) => q.id) ?? []), ...(c.portes.p5?.recruteur.map((q) => q.id) ?? [])];
}

export function analyserCompetence(
  base: Base,
  c: CompetenceFigee,
  reponses: ReponsesCompetence | undefined,
  evaluations: Evaluation[],
  questionsEntretien: EpreuveFigee["entretien"],
): AnalyseCompetence {
  const rep = reperesParId(base);
  const mesures: MesureDetaillee[] = [];
  const relances: string[] = [];
  const conseils: string[] = [];
  let enAttente = false;
  const porte = reponses?.porte ?? null;

  if (reponses && porte) {
    if (porte === "p1" && c.portes.p1) {
      const r = noterP1(c.portes.p1.questions, reponses.p1 ?? {}, base.baremes);
      mesures.push({ source: "epreuve", niveau: r.niveau, resultat: r, porte: "p1" });
      for (const q of c.portes.p1.questions) {
        const choisie = q.options.find((o) => o.id === reponses.p1?.[q.id]);
        if ((!choisie || choisie.points < 2) && q.relance) relances.push(q.relance);
      }
    } else if (porte === "p3" && c.portes.p3) {
      const r = noterP3(c.portes.p3, reponses.p3 ?? {}, base.baremes);
      mesures.push({ source: "epreuve", niveau: r.niveau, resultat: r, porte: "p3" });
    } else if (porte === "p4" && c.portes.p4) {
      const r = noterP4(c.portes.p4, reponses.p4, base.baremes);
      mesures.push({ source: "epreuve", niveau: r.niveau, resultat: r, porte: "p4" });
    } else if ((porte === "p2" || porte === "p5") && c.portes[porte]) {
      const ids = porte === "p2" ? idsReponsesP2(c) : idsReponsesP5(c);
      let unJugement = false;
      for (const ev of evaluations) {
        if (!evaluationComplete(ev, porte, c.code, ids)) continue;
        unJugement = true;
        const js = jugements(ev, porte, c.code, ids);
        const bonus = ev.bonus[c.code]?.[porte] ?? false;
        const reperes: string[] = [];
        // Repères des réponses prévues reconnues comme justes (indicatif : on prend le premier repère de chaque phrase jugée juste).
        if (porte === "p2") {
          c.portes.p2?.debuts.forEach((d) => {
            if (ev.p2[c.code]?.[d.id] === "juste") d.justes.forEach((j) => j.repere && reperes.push(j.repere));
            if (ev.p2[c.code]?.[d.id] === "eviter") d.a_eviter?.forEach((j) => j.repere && reperes.push(j.repere));
          });
        } else {
          c.portes.p5?.questions.forEach((q) => {
            if (ev.p5[c.code]?.[q.id] === "juste") q.justes.forEach((j) => j.repere && reperes.push(j.repere));
            if (ev.p5[c.code]?.[q.id] === "eviter") q.a_eviter?.forEach((j) => j.repere && reperes.push(j.repere));
          });
        }
        const r = noterP2P5(porte, js, bonus, [...new Set(reperes)]);
        mesures.push({ source: "epreuve", evaluateur: ev.evaluateur.id, niveau: r.niveau, resultat: r, porte });
      }
      if (!unJugement) enAttente = true;
    }
  }

  // Variante réelle (observée avec une grille) : une mesure d'épreuve supplémentaire par évaluateur.
  if (c.portes.p4?.reel) {
    for (const ev of evaluations) {
      const g = ev.reel[c.code];
      if (!g?.utilise) continue;
      const r = noterReel(c.portes.p4.reel, g.criteres, g.bonus);
      mesures.push({ source: "epreuve", evaluateur: ev.evaluateur.id, niveau: r.niveau, resultat: r, porte: "reel" });
    }
  }

  // Entretien : niveau choisi par chaque évaluateur, attendus cochés comme repères.
  const qs = questionsEntretien.questions.filter((q) => q.competence === c.code);
  for (const ev of evaluations) {
    const n = ev.entretien_niveau[c.code];
    if (!n) continue;
    let coches = 0;
    let total = 0;
    for (const q of qs) {
      total += q.attendus.length;
      coches += (ev.entretien[q.id]?.attendus ?? []).filter(Boolean).length;
    }
    const r = noterEntretien(n, coches, total);
    if (r) mesures.push({ source: "entretien", evaluateur: ev.evaluateur.id, niveau: r.niveau, resultat: r, porte: "entretien" });
  }
  for (const q of qs) relances.push(q.relance);

  const combine = niveauCompetence(mesures);
  const reperesMontres = new Map<string, Repere>();
  const aVerifier: AnalyseCompetence["a_verifier"] = [];
  for (const m of mesures) {
    for (const id of m.resultat.reperes) {
      const r = rep.get(id);
      if (!r) continue;
      if (r.sens === "+") reperesMontres.set(id, r);
      else if (!aVerifier.some((v) => v.repere?.id === id)) aVerifier.push({ texte: r.label, repere: r });
    }
  }
  if (combine.ecart) aVerifier.push({ texte: `Écart de ${Math.abs((combine.epreuve ?? 0) - (combine.entretien ?? 0))} niveaux entre l'épreuve et l'entretien : à discuter avec les faits notés.` });
  if (reponses && porte === "p1" && c.portes.p1) {
    const sans = c.portes.p1.questions.filter((q) => !reponses.p1?.[q.id]).length;
    if (sans) aVerifier.push({ texte: `${sans} question${sans > 1 ? "s" : ""} sans réponse à la porte 1.` });
  }
  if (combine.niveau !== null && combine.niveau < c.niveau_requis) aVerifier.push({ texte: `Niveau ${combine.niveau} pour un niveau requis de ${c.niveau_requis} : relire les réponses avec les ancres de la compétence.` });

  // Conseils d'accueil : intégration du métier, repères « − », piste de la compétence transverse.
  conseils.push(...c.integration);
  for (const v of aVerifier) if (v.repere && v.repere.sens === "-") conseils.push(v.repere.conseil);
  const transverse = base.competences.find((x) => x.code === c.code);
  if (transverse && combine.niveau !== null && combine.niveau < c.niveau_requis) conseils.push(transverse.piste);

  return {
    code: c.code,
    titre: c.titre,
    niveau_requis: c.niveau_requis,
    porte_choisie: porte,
    mesures,
    niveau: combine.niveau,
    niveau_epreuve: combine.epreuve,
    niveau_entretien: combine.entretien,
    ecart: combine.ecart,
    au_requis: combine.niveau === null ? null : combine.niveau >= c.niveau_requis,
    montre: [...reperesMontres.values()],
    a_verifier: aVerifier,
    relances: [...new Set(relances)],
    conseils: [...new Set(conseils)],
    en_attente_evaluation: enAttente,
  };
}

export function analyser(base: Base, r: Recrutement, c: Candidat): Analyse | null {
  if (!r.epreuve) return null;
  const evaluations = Object.values(c.evaluations);
  const competences = r.epreuve.competences.map((comp) =>
    analyserCompetence(base, comp, c.reponses?.competences[comp.code], evaluations, r.epreuve!.entretien),
  );
  const niveaux = Object.fromEntries(competences.map((a) => [a.code, a.niveau]));
  const auRequis = competences.filter((a) => a.au_requis).length;
  const mesurees = competences.filter((a) => a.niveau !== null).length;

  // Brouillon de retour (modèle 7 : un point fort, un point à développer), sans rien inventer.
  const rep = reperesParId(base);
  const pointsForts = [...new Set(competences.flatMap((a) => a.montre.map((m) => (m.sens === "+" ? m.retour : ""))).filter(Boolean))];
  const aDevelopper = [
    ...new Set(
      competences.flatMap((a) =>
        a.a_verifier.map((v) => (v.repere && v.repere.sens === "-" ? v.repere.conseil : "")).filter(Boolean),
      ),
    ),
  ];
  const brouillon = [
    pointsForts.length ? `Ce que vous avez montré : ${pointsForts[0]}` : "",
    aDevelopper.length ? `Un point à développer : ${aDevelopper[0]}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // Profil de travail : faits observés par dimension essentielle + phrases facultatives.
  const profil: ProfilTravailObserve[] = r.epreuve.profil_travail.essentiels
    .map((dimId) => base.profil_travail.dimensions.find((d) => d.id === dimId))
    .filter((d): d is NonNullable<typeof d> => !!d)
    .map((d) => {
      const tous = new Set(competences.flatMap((a) => a.mesures.flatMap((m) => m.resultat.reperes)));
      const plus = d.plus.filter((id) => tous.has(id)).map((id) => rep.get(id)).filter((x): x is Repere => !!x);
      const moins = d.moins.filter((id) => tous.has(id)).map((id) => rep.get(id)).filter((x): x is Repere => !!x);
      const phrases = base.profil_travail.items
        .filter((i) => i.dim === d.id)
        .map((i) => {
          const v = c.reponses?.profil_travail?.[i.id];
          let reponse: string | null = null;
          if (v === "nsp") reponse = base.profil_travail.ne_sait_pas;
          else if (typeof v === "number") reponse = base.profil_travail.echelle[v - 1] ?? null;
          return { id: i.id, texte: i.texte, reponse };
        });
      return { dimension: d.id, nom: d.nom, definition: d.definition, question: d.question, aide: d.aide, faits_plus: plus, faits_moins: moins, phrases };
    });

  return {
    candidat_id: c.id,
    competences,
    niveaux,
    au_requis: auRequis,
    mesurees,
    retour: { points_forts: pointsForts, a_developper: aDevelopper, brouillon },
    profil_travail: profil,
    complete: mesurees === competences.length && !competences.some((a) => a.en_attente_evaluation),
  };
}

export function classerCandidats(base: Base, r: Recrutement, candidats: Candidat[]): { lignes: LigneClassement[]; analyses: Map<string, Analyse> } {
  const analyses = new Map<string, Analyse>();
  const classables = candidats
    .map((c) => {
      const a = analyser(base, r, c);
      if (a) analyses.set(c.id, a);
      return { id: c.id, nom: c.nom, niveaux: a?.niveaux ?? {} };
    });
  const requis = Object.fromEntries(r.competences.map((c) => [c.code, c.niveau_requis]));
  return { lignes: classer(classables, requis), analyses };
}

// ---------------------------------------------------------------------------
// Suivi (équité entre les portes), tel que décrit dans le guide (pilote, semaine 7)
// ---------------------------------------------------------------------------

export interface Suivi {
  choix_portes: Record<PorteId, number>;
  niveau_moyen_par_porte: Record<PorteId, { n: number; moyenne: number | null }>;
  accord_evaluateurs: { competence: CodeCompetence; candidat: string; niveaux: { evaluateur: string; niveau: Niveau }[]; ecart: number }[];
  besoins_signales: number;
  candidats: number;
}

export function suivi(base: Base, r: Recrutement, candidats: Candidat[]): Suivi {
  const portes: PorteId[] = ["p1", "p2", "p3", "p4", "p5"];
  const choix = Object.fromEntries(portes.map((p) => [p, 0])) as Record<PorteId, number>;
  const sommes = Object.fromEntries(portes.map((p) => [p, { n: 0, total: 0 }])) as Record<PorteId, { n: number; total: number }>;
  const accord: Suivi["accord_evaluateurs"] = [];
  let besoins = 0;
  for (const c of candidats) {
    if (c.besoins.liste.length || c.besoins.autre || c.reponses?.besoins?.liste.length) besoins += 1;
    const a = analyser(base, r, c);
    if (!a) continue;
    for (const comp of a.competences) {
      if (comp.porte_choisie) choix[comp.porte_choisie] += 1;
      if (comp.porte_choisie && comp.niveau_epreuve !== null) {
        sommes[comp.porte_choisie].n += 1;
        sommes[comp.porte_choisie].total += comp.niveau_epreuve;
      }
      const parEval = comp.mesures.filter((m) => m.evaluateur);
      const evals = [...new Set(parEval.map((m) => m.evaluateur as string))];
      if (evals.length >= 2) {
        const niveaux = evals.map((e) => {
          const ms = parEval.filter((m) => m.evaluateur === e).map((m) => m.niveau);
          return { evaluateur: r.evaluateurs.find((x) => x.id === e)?.nom ?? e, niveau: Math.min(...ms) as Niveau };
        });
        const ecart = Math.max(...niveaux.map((n) => n.niveau)) - Math.min(...niveaux.map((n) => n.niveau));
        accord.push({ competence: comp.code, candidat: c.nom, niveaux, ecart });
      }
    }
  }
  return {
    choix_portes: choix,
    niveau_moyen_par_porte: Object.fromEntries(
      portes.map((p) => [p, { n: sommes[p].n, moyenne: sommes[p].n ? Math.round((sommes[p].total / sommes[p].n) * 10) / 10 : null }]),
    ) as Suivi["niveau_moyen_par_porte"],
    accord_evaluateurs: accord,
    besoins_signales: besoins,
    candidats: candidats.length,
  };
}
