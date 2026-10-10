/**
 * Exemple fictif : un recrutement « Serveur » avec trois personnes imaginaires,
 * étiqueté FICTIF partout. Aucune vraie personne. Réponses construites à partir
 * des corrigés du pack (meilleures réponses, réponses moyennes, réponses faibles),
 * jugements d'un évaluateur fictif, décisions motivées.
 */
import type { Base, CodeCompetence, Pack } from "@/lib/contenu/types";
import { evaluationVide, type Candidat, type Etat, type Evaluation, type Recrutement, type Reponses, type ReponsesCompetence } from "@/lib/stockage/modele";
import { figer, nouveauCandidat, nouveauRecrutement } from "@/lib/stockage/recrutements";
import type { Jugement, ReponseP4 } from "./notation";
import type { CompetenceFigee } from "@/lib/stockage/modele";

export const ID_EXEMPLE = "rec_exemple_fictif";
export const NOMS_FICTIFS = ["Alix (FICTIF)", "Camille (FICTIF)", "Sacha (FICTIF)"] as const;

type Qualite = "haute" | "moyenne" | "basse";

function choixP1(c: CompetenceFigee, q: Qualite): Record<string, string> {
  const out: Record<string, string> = {};
  c.portes.p1!.questions.forEach((question, i) => {
    const voulu = q === "haute" ? 2 : q === "moyenne" ? (i % 2 === 0 ? 2 : 1) : i === 0 ? 1 : 0;
    const option = question.options.find((o) => o.points === voulu) ?? question.options[0];
    out[question.id] = option.id;
  });
  return out;
}

function choixP3(c: CompetenceFigee, q: Qualite) {
  const v = c.portes.p3!;
  const justes = v.indices.options.filter((i) => i.juste).map((i) => i.id);
  const faux = v.indices.options.filter((i) => !i.juste).map((i) => i.id);
  if (q === "haute") return { question: v.question.options.find((o) => o.points === 2)!.id, indices: justes, suite: v.suite.options.find((o) => o.points === 2)!.id };
  if (q === "moyenne") return { question: v.question.options.find((o) => o.points === 2)!.id, indices: [justes[0], justes[1], faux[0]], suite: v.suite.options.find((o) => o.points === 1)!.id };
  return { question: v.question.options.find((o) => o.points === 1)!.id, indices: [justes[0], faux[0], faux[1]], suite: v.suite.options.find((o) => o.points === 0)!.id };
}

function choixP4(c: CompetenceFigee, q: Qualite): ReponseP4 {
  const v = c.portes.p4!;
  if (v.type === "ordonner") {
    // Ordre topologique des règles, puis dégradation.
    const ids = v.elements.map((e) => e.id);
    const ordre = [...ids].sort((a, b) => {
      const avantA = v.regles.filter((r) => r.apres === a).length;
      const avantB = v.regles.filter((r) => r.apres === b).length;
      return avantA - avantB;
    });
    // tri topologique simple
    const resultat: string[] = [];
    const restant = new Set(ordre);
    while (restant.size) {
      const libre = [...restant].find((id) => !v.regles.some((r) => r.apres === id && restant.has(r.avant)));
      const id = libre ?? [...restant][0];
      resultat.push(id);
      restant.delete(id);
    }
    if (q === "haute") return { type: "ordonner", ordre: resultat };
    if (q === "moyenne") {
      const o = [...resultat];
      [o[1], o[2]] = [o[2], o[1]];
      return { type: "ordonner", ordre: o };
    }
    return { type: "ordonner", ordre: [...resultat].reverse() };
  }
  if (v.type === "classer") {
    const classement: Record<string, string> = {};
    v.elements.forEach((e, i) => {
      const bon = e.accepte[0];
      const mauvais = v.categories.find((k) => !e.accepte.includes(k.id))?.id ?? bon;
      classement[e.id] = q === "haute" ? bon : q === "moyenne" ? (i % 3 === 2 ? mauvais : bon) : i % 2 === 0 ? mauvais : bon;
    });
    return { type: "classer", classement };
  }
  const erreurs = v.elements.filter((e) => e.erreur).map((e) => e.id);
  const ok = v.elements.filter((e) => !e.erreur).map((e) => e.id);
  if (q === "haute") return { type: "reperer", reperes: erreurs };
  if (q === "moyenne") return { type: "reperer", reperes: [...erreurs.slice(0, Math.max(1, erreurs.length - 1)), ok[0]] };
  return { type: "reperer", reperes: [erreurs[0], ok[0], ok[1]].filter(Boolean) };
}

function texteP2(c: CompetenceFigee, q: Qualite): Record<string, string> {
  const out: Record<string, string> = {};
  c.portes.p2!.debuts.forEach((d, i) => {
    const source = q === "haute" ? d.justes[0] : q === "moyenne" ? (i === 0 ? d.justes[0] : (d.partielles?.[0] ?? d.justes[1] ?? d.justes[0])) : (d.a_eviter?.[0] ?? d.partielles?.[0] ?? d.justes[0]);
    out[d.id] = source.texte;
  });
  return out;
}

function texteP5(c: CompetenceFigee, q: Qualite): Record<string, { texte?: string; oral?: boolean }> {
  const out: Record<string, { texte?: string; oral?: boolean }> = {};
  c.portes.p5!.questions.forEach((qu, i) => {
    const source = q === "haute" ? qu.justes[0] : q === "moyenne" ? (i === 0 ? qu.justes[0] : (qu.partielles?.[0] ?? qu.justes[0])) : (qu.a_eviter?.[0] ?? qu.partielles?.[0] ?? qu.justes[0]);
    out[qu.id] = { texte: source.texte };
  });
  return out;
}

function jugementsPour(q: Qualite, i: number): Jugement {
  if (q === "haute") return "juste";
  if (q === "moyenne") return i === 0 ? "juste" : "partielle";
  return i === 0 ? "partielle" : "eviter";
}

export function construireExemple(pack: Pack, base: Base, date = new Date().toISOString()): { recrutement: Recrutement; candidats: Candidat[] } {
  let r = nouveauRecrutement({ pack, base, id: ID_EXEMPLE, poste: "Serveur du soir — brasserie (exemple FICTIF)", fictif: true });
  r.graine = "exemple-fictif";
  r.evaluateurs = [
    { id: "ev_fictif_1", nom: "Dominique (évaluatrice FICTIVE)" },
    { id: "ev_fictif_2", nom: "Noa (évaluateur FICTIF)" },
  ];
  r.profil_travail = { essentiels: base.profil_travail.defauts[pack.id] ?? ["service", "organisation", "equipe"], phrases: true };
  r.notes = "Recrutement FICTIF créé par l'application pour découvrir le kit. Aucune vraie personne.";
  r.cree_le = date;
  r = figer(r, pack, base);
  const ep = r.epreuve!;
  const codes = ep.competences.map((c) => c.code);
  const portesParPersonne = [
    ["p1", "p4", "p3", "p5"],
    ["p2", "p1", "p4", "p3"],
    ["p1", "p5", "p1", "p4"],
  ] as const;
  const qualites: Qualite[] = ["haute", "moyenne", "basse"];
  const profils: Record<string, number | "nsp">[] = [
    Object.fromEntries(ep.profil_travail.items.map((it, i) => [it.id, i % 4 === 3 ? 4 : 5])),
    Object.fromEntries(ep.profil_travail.items.map((it, i) => [it.id, i % 3 === 0 ? 3 : 4])),
    {},
  ];
  const decisions: Candidat["decision"][] = [
    { statut: "retenu", motifs: "Niveau attendu ou plus sur les 4 compétences. En situation, vérifie le délai en cuisine avant de répondre et propose une solution adaptée au client pressé. Entretien : faits précis, rend compte au responsable.", par: "Dominique (FICTIVE)", le: date },
    { statut: "vivier", motifs: "Niveau attendu sur 2 compétences sur 4 ; à revoir dans 6 mois avec plus d'expérience en salle. Points forts : annonce le délai réel. À développer : prévenir la cuisine du changement.", par: "Dominique (FICTIVE)", le: date },
    { statut: "non_retenu", motifs: "Niveau requis non atteint sur 3 compétences. Promet des délais sans vérifier ; ne signale pas l'incident. Retour utile envoyé (modèle 7).", par: "Dominique (FICTIVE)", le: date },
  ];

  const candidats = NOMS_FICTIFS.map((nom, k) => {
    const c = nouveauCandidat(r.id, nom, k === 2 ? "distance" : "ecran");
    c.id = `cand_exemple_${k + 1}`;
    c.cree_le = date;
    c.commence = true;
    const competences: Partial<Record<CodeCompetence, ReponsesCompetence>> = {};
    codes.forEach((code, i) => {
      const comp = ep.competences[i];
      let porte = portesParPersonne[k][i] as ReponsesCompetence["porte"];
      if (!comp.portes[porte]) porte = "p1";
      const rc: ReponsesCompetence = { porte };
      if (porte === "p1") rc.p1 = choixP1(comp, qualites[k]);
      if (porte === "p2") rc.p2 = texteP2(comp, qualites[k]);
      if (porte === "p3") rc.p3 = choixP3(comp, qualites[k]);
      if (porte === "p4") rc.p4 = choixP4(comp, qualites[k]);
      if (porte === "p5") rc.p5 = texteP5(comp, qualites[k]);
      competences[code] = rc;
    });
    const reponses: Reponses = {
      schema: "ci5p-reponses/2",
      recrutement_id: r.id,
      epreuve_empreinte: ep.empreinte,
      candidat: { id: c.id, nom },
      rendu_le: date,
      competences,
      profil_travail: Object.keys(profils[k]).length ? profils[k] : null,
      besoins: k === 1 ? { liste: ["Une pause", "Une salle calme"], autre: "" } : null,
      deroule: null,
    };
    c.reponses = reponses;
    if (k === 1) c.besoins = { liste: ["Une pause", "Une salle calme"], autre: "" };

    // Évaluations : les deux évaluateurs jugent les portes 2 et 5, et notent l'entretien.
    for (const ev of r.evaluateurs) {
      const e: Evaluation = evaluationVide(ev);
      codes.forEach((code, i) => {
        const rc = competences[code]!;
        const comp = ep.competences[i];
        if (rc.porte === "p2") e.p2[code] = Object.fromEntries(comp.portes.p2!.debuts.map((d, j) => [d.id, jugementsPour(qualites[k], j)]));
        if (rc.porte === "p5") e.p5[code] = Object.fromEntries(comp.portes.p5!.questions.map((q, j) => [q.id, jugementsPour(qualites[k], j)]));
        // Entretien : niveaux cohérents avec l'épreuve ; le second évaluateur diverge d'un point sur une compétence.
        const niveau = qualites[k] === "haute" ? 3 : qualites[k] === "moyenne" ? (i < 2 ? 3 : 2) : i === 0 ? 2 : 1;
        const ecart = ev.id === "ev_fictif_2" && i === 1 ? 1 : 0;
        e.entretien_niveau[code] = Math.max(1, Math.min(4, niveau + ecart)) as 1 | 2 | 3 | 4;
        for (const q of ep.entretien.questions.filter((x) => x.competence === code)) {
          const n = qualites[k] === "haute" ? q.attendus.length : qualites[k] === "moyenne" ? Math.ceil(q.attendus.length / 2) : 1;
          e.entretien[q.id] = { attendus: q.attendus.map((_, j) => j < n), notes: k === 0 ? "Exemple précis, chronologie claire (FICTIF)." : k === 1 ? "Exemple réel mais la fin reste floue (FICTIF)." : "Reste général, pas de fait précis (FICTIF)." };
        }
      });
      e.faits = k === 0 ? "Décrit ce qu'elle a fait, pas ce qu'elle aurait dû faire. (FICTIF)" : k === 1 ? "Hésite sur la suite à donner au client. (FICTIF)" : "Répond à côté sur la situation du client pressé. (FICTIF)";
      e.modifie_le = date;
      c.evaluations[ev.id] = e;
    }
    c.decision = decisions[k];
    return c;
  });
  r.statut = "en_cours";
  return { recrutement: r, candidats };
}

export function installerExemple(etat: Etat, pack: Pack, base: Base): void {
  const { recrutement, candidats } = construireExemple(pack, base);
  etat.recrutements = etat.recrutements.filter((r) => r.id !== ID_EXEMPLE);
  etat.candidats = etat.candidats.filter((c) => c.recrutement_id !== ID_EXEMPLE);
  etat.recrutements.push(recrutement);
  etat.candidats.push(...candidats);
}
