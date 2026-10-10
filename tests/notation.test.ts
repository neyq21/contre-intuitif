import { describe, expect, it } from "vitest";
import { chargerBase, chargerPack } from "@/lib/contenu/charger";
import type { QuestionP1, VersionP4Classer, VersionP4Ordonner, VersionP4Reperer } from "@/lib/contenu/types";
import {
  classer,
  niveauCompetence,
  niveauParSeuils,
  noterEntretien,
  noterP1,
  noterP2P5,
  noterP3,
  noterP4,
  noterReel,
  repereEntretien,
  scoreClasser,
  scoreOrdonner,
  scoreReperer,
} from "@/lib/methode/notation";

const base = chargerBase();
const baremes = base.baremes;
const serveur = chargerPack("serveur");
const c7 = serveur.competences[0];

function questionsP1(n: number): QuestionP1[] {
  const pool = [...c7.portes.p1.questions, ...(c7.banque?.p1 ?? [])];
  return pool.slice(0, n);
}
function meilleures(qs: QuestionP1[]): Record<string, string> {
  return Object.fromEntries(qs.map((q) => [q.id, q.options.find((o) => o.points === 2)!.id]));
}
function acceptables(qs: QuestionP1[]): Record<string, string> {
  return Object.fromEntries(qs.map((q) => [q.id, (q.options.find((o) => o.points === 1) ?? q.options.find((o) => o.points === 2))!.id]));
}
function nulles(qs: QuestionP1[]): Record<string, string> {
  return Object.fromEntries(qs.map((q) => [q.id, q.options.find((o) => o.points === 0)!.id]));
}

describe("niveauParSeuils", () => {
  it("applique les seuils de la base dans l'ordre décroissant", () => {
    expect(niveauParSeuils(10, baremes.p1.seuils)).toBe(4);
    expect(niveauParSeuils(9, baremes.p1.seuils)).toBe(4);
    expect(niveauParSeuils(8.9, baremes.p1.seuils)).toBe(3);
    expect(niveauParSeuils(7, baremes.p1.seuils)).toBe(3);
    expect(niveauParSeuils(5, baremes.p1.seuils)).toBe(2);
    expect(niveauParSeuils(4.9, baremes.p1.seuils)).toBe(1);
    expect(niveauParSeuils(0, baremes.p1.seuils)).toBe(1);
  });
});

describe("Porte 1 — « meilleure réponse 2, acceptable 1, total ramené sur 10 »", () => {
  it("avec 5 questions : 9 ou 10 → 4 ; 7 ou 8 → 3 ; 5 ou 6 → 2 ; 0 à 4 → 1", () => {
    const qs = questionsP1(5);
    expect(noterP1(qs, meilleures(qs), baremes)).toMatchObject({ points: 10, max: 10, score: 10, niveau: 4 });
    const neuf = { ...meilleures(qs), [qs[0].id]: qs[0].options.find((o) => o.points === 1)!.id };
    expect(noterP1(qs, neuf, baremes)).toMatchObject({ points: 9, score: 9, niveau: 4 });
    const huit = { ...neuf, [qs[1].id]: qs[1].options.find((o) => o.points === 1)!.id };
    expect(noterP1(qs, huit, baremes).niveau).toBe(3);
    expect(noterP1(qs, acceptables(qs), baremes)).toMatchObject({ points: 5, niveau: 2 });
    expect(noterP1(qs, nulles(qs), baremes)).toMatchObject({ points: 0, niveau: 1 });
    expect(noterP1(qs, {}, baremes).niveau).toBe(1);
  });

  it("avec 3 à 10 questions, le total est ramené sur 10 avant les seuils", () => {
    const trois = questionsP1(3);
    // 3 questions : 6 points max. 5/6 → 8,33 sur 10 → niveau 3.
    const r = noterP1(trois, { ...meilleures(trois), [trois[0].id]: trois[0].options.find((o) => o.points === 1)!.id }, baremes);
    expect(r.points).toBe(5);
    expect(r.score).toBeCloseTo(8.33, 2);
    expect(r.niveau).toBe(3);
    const dix = questionsP1(10);
    expect(dix).toHaveLength(10);
    const r10 = noterP1(dix, meilleures(dix), baremes);
    expect(r10).toMatchObject({ points: 20, max: 20, score: 10, niveau: 4 });
    // 7 questions, 14 max : 10 points → 7,14 → niveau 3 ; 9 points → 6,43 → niveau 2.
    const sept = questionsP1(7);
    const rep = meilleures(sept);
    rep[sept[0].id] = sept[0].options.find((o) => o.points === 0)!.id;
    rep[sept[1].id] = sept[1].options.find((o) => o.points === 0)!.id;
    expect(noterP1(sept, rep, baremes)).toMatchObject({ points: 10, niveau: 3 });
    rep[sept[2].id] = sept[2].options.find((o) => o.points === 1)!.id;
    expect(noterP1(sept, rep, baremes)).toMatchObject({ points: 9, niveau: 2 });
  });

  it("refuse moins de 3 ou plus de 10 questions", () => {
    expect(() => noterP1(questionsP1(2), {}, baremes)).toThrow();
  });

  it("remonte les repères des options choisies", () => {
    const qs = questionsP1(3);
    const r = noterP1(qs, meilleures(qs), baremes);
    expect(r.reperes.length).toBeGreaterThan(0);
    expect(r.reperes.every((id) => base.reperes.some((x) => x.id === id))).toBe(true);
  });
});

describe("Portes 2 et 5 — « juste 2, partielle 1, à éviter ou vide 0 »", () => {
  it("avec 3 phrases : 5 ou 6 → 3 (4 avec un bonus) ; 3 ou 4 → 2 ; 0 à 2 → 1", () => {
    expect(noterP2P5("p2", ["juste", "juste", "juste"], false).niveau).toBe(3);
    expect(noterP2P5("p2", ["juste", "juste", "juste"], true).niveau).toBe(4);
    expect(noterP2P5("p2", ["juste", "juste", "partielle"], false)).toMatchObject({ points: 5, niveau: 3 });
    expect(noterP2P5("p2", ["juste", "juste", "eviter"], false)).toMatchObject({ points: 4, niveau: 2 });
    expect(noterP2P5("p2", ["juste", "partielle", null], false)).toMatchObject({ points: 3, niveau: 2 });
    expect(noterP2P5("p2", ["juste", "eviter", undefined], true)).toMatchObject({ points: 2, niveau: 1 });
    expect(noterP2P5("p5", [null, null, null], true).niveau).toBe(1);
  });

  it("avec 2 à 6 phrases : niveau 3 à partir des cinq sixièmes, niveau 2 à partir de la moitié", () => {
    // 2 phrases, 4 points max : 4 → 3 ; 3 → 2 ; 2 → 2 ; 1 → 1.
    expect(noterP2P5("p5", ["juste", "juste"], false).niveau).toBe(3);
    expect(noterP2P5("p5", ["juste", "partielle"], false).niveau).toBe(2);
    expect(noterP2P5("p5", ["partielle", "partielle"], false).niveau).toBe(2);
    expect(noterP2P5("p5", ["partielle", "eviter"], false).niveau).toBe(1);
    // 6 phrases, 12 points max : 10 → 3 ; 9 → 2 ; 6 → 2 ; 5 → 1.
    const six = (n2: number, n1: number) => [
      ...Array<"juste">(n2).fill("juste"),
      ...Array<"partielle">(n1).fill("partielle"),
      ...Array<"eviter">(6 - n2 - n1).fill("eviter"),
    ];
    expect(noterP2P5("p2", six(5, 0), false)).toMatchObject({ points: 10, niveau: 3 });
    expect(noterP2P5("p2", six(4, 1), false)).toMatchObject({ points: 9, niveau: 2 });
    expect(noterP2P5("p2", six(3, 0), false)).toMatchObject({ points: 6, niveau: 2 });
    expect(noterP2P5("p2", six(2, 1), false)).toMatchObject({ points: 5, niveau: 1 });
    // 4 phrases, 8 max : 7 → 3 ; 6 → 2.
    expect(noterP2P5("p2", ["juste", "juste", "juste", "partielle"], false).niveau).toBe(3);
    expect(noterP2P5("p2", ["juste", "juste", "juste", "eviter"], true).niveau).toBe(2);
  });

  it("refuse 1 ou 7 réponses", () => {
    expect(() => noterP2P5("p2", ["juste"], false)).toThrow();
    expect(() => noterP2P5("p2", Array(7).fill("juste"), false)).toThrow();
  });
});

describe("Porte 3 — question 2, indices ±1 (min 0), suite 2 ; 7 → 4 ; 5–6 → 3 ; 3–4 → 2 ; 0–2 → 1", () => {
  const v = c7.portes.p3;
  const q2 = v.question.options.find((o) => o.points === 2)!.id;
  const q1 = v.question.options.find((o) => o.points === 1)!.id;
  const s2 = v.suite.options.find((o) => o.points === 2)!.id;
  const s1 = v.suite.options.find((o) => o.points === 1)!.id;
  const justes = v.indices.options.filter((i) => i.juste).map((i) => i.id);
  const faux = v.indices.options.filter((i) => !i.juste).map((i) => i.id);

  it("total 7 → niveau 4", () => {
    expect(justes).toHaveLength(3);
    expect(noterP3(v, { question: q2, indices: justes, suite: s2 }, baremes)).toMatchObject({ points: 7, niveau: 4 });
  });
  it("un indice faux retire un point, jamais en dessous de 0", () => {
    expect(noterP3(v, { question: q2, indices: [...justes, faux[0]], suite: s2 }, baremes)).toMatchObject({ points: 6, niveau: 3 });
    expect(noterP3(v, { question: q2, indices: faux, suite: s2 }, baremes)).toMatchObject({ points: 4, niveau: 2 });
    expect(noterP3(v, { question: q1, indices: [justes[0], faux[0], faux[1]], suite: s1 }, baremes)).toMatchObject({ points: 2, niveau: 1 });
  });
  it("sans réponse → 0 → niveau 1", () => {
    expect(noterP3(v, {}, baremes)).toMatchObject({ points: 0, niveau: 1 });
  });
});

describe("Porte 4 — score corrigé du hasard de 0 à 1 ; ≥ 0,85 → 4 ; ≥ 0,6 → 3 ; ≥ 0,3 → 2", () => {
  it("ordonner : part des règles respectées, corrigée du hasard", () => {
    const v = c7.portes.p4 as VersionP4Ordonner;
    const bon = ["e3", "e5", "e2", "e6", "e7", "e4", "e1"];
    expect(scoreOrdonner(v, bon)).toMatchObject({ respectees: 6, brut: 1, corrige: 1 });
    expect(noterP4(v, { type: "ordonner", ordre: bon }, baremes).niveau).toBe(4);
    const inverse = [...bon].reverse();
    expect(scoreOrdonner(v, inverse).corrige).toBe(0);
    expect(noterP4(v, { type: "ordonner", ordre: inverse }, baremes).niveau).toBe(1);
    // 5 règles sur 6 : brut 0,833 → corrigé 0,667 → niveau 3.
    const presque = ["e3", "e5", "e2", "e7", "e4", "e6", "e1"];
    const r = scoreOrdonner(v, presque);
    expect(r.respectees).toBe(5);
    expect(r.corrige).toBeCloseTo(0.667, 2);
    expect(noterP4(v, { type: "ordonner", ordre: presque }, baremes).niveau).toBe(3);
    expect(noterP4(v, undefined, baremes).niveau).toBe(1);
  });

  it("ordonner : plusieurs ordres justes sont acceptés", () => {
    const v = c7.portes.p4 as VersionP4Ordonner;
    // e7 (addition) seulement avant e4 : il peut être n'importe où avant.
    const autre = ["e7", "e3", "e5", "e2", "e6", "e4", "e1"];
    expect(scoreOrdonner(v, autre).corrige).toBe(1);
  });

  it("classer : part des éléments bien classés, corrigée de la part attendue au hasard", () => {
    const agent = chargerPack("agent-entretien");
    const v = agent.competences.find((c) => c.portes.p4.type === "classer")!.portes.p4 as VersionP4Classer;
    const bon = Object.fromEntries(v.elements.map((e) => [e.id, e.accepte[0]]));
    expect(scoreClasser(v, bon)).toMatchObject({ brut: 1, corrige: 1 });
    expect(noterP4(v, { type: "classer", classement: bon }, baremes).niveau).toBe(4);
    const mauvais = Object.fromEntries(v.elements.map((e) => [e.id, v.categories.find((k) => !e.accepte.includes(k.id))!.id]));
    expect(scoreClasser(v, mauvais).corrige).toBe(0);
    expect(noterP4(v, { type: "classer", classement: {} }, baremes).niveau).toBe(1);
    // moitié bien classée avec 3 catégories : brut 0,5, attendu 1/3 → corrigé 0,25 → niveau 1.
    const moitie = { ...mauvais };
    v.elements.slice(0, v.elements.length / 2).forEach((e) => (moitie[e.id] = e.accepte[0]));
    const r = scoreClasser(v, moitie);
    expect(r.brut).toBe(0.5);
    expect(r.corrige).toBeCloseTo(0.25, 2);
  });

  it("repérer : erreurs trouvées moins fausses alertes", () => {
    const agent = chargerPack("agent-entretien");
    const v = agent.competences.find((c) => c.portes.p4.type === "reperer")!.portes.p4 as VersionP4Reperer;
    const erreurs = v.elements.filter((e) => e.erreur).map((e) => e.id);
    const ok = v.elements.filter((e) => !e.erreur).map((e) => e.id);
    expect(scoreReperer(v, erreurs)).toMatchObject({ corrige: 1, trouvees: erreurs.length, fausses: 0 });
    expect(noterP4(v, { type: "reperer", reperes: erreurs }, baremes).niveau).toBe(4);
    expect(scoreReperer(v, [...erreurs, ok[0]]).corrige).toBeCloseTo((erreurs.length - 1) / erreurs.length, 5);
    expect(scoreReperer(v, v.elements.map((e) => e.id)).corrige).toBe(0);
    expect(scoreReperer(v, []).corrige).toBe(0);
  });

  it("variante réelle : 4 critères → 3 (4 avec bonus) ; 2 ou 3 → 2 ; 0 ou 1 → 1", () => {
    const reel = c7.portes.p4.reel!;
    expect(reel.criteres).toHaveLength(4);
    expect(noterReel(reel, [true, true, true, true], false).niveau).toBe(3);
    expect(noterReel(reel, [true, true, true, true], true).niveau).toBe(4);
    expect(noterReel(reel, [true, true, true, false], true).niveau).toBe(2);
    expect(noterReel(reel, [true, true, false, false], false).niveau).toBe(2);
    expect(noterReel(reel, [true, false, false, false], true).niveau).toBe(1);
    expect(noterReel(reel, [], false).niveau).toBe(1);
  });
});

describe("Entretien — niveau choisi par l'évaluateur, attendus comme repères", () => {
  it("tous les attendus → repère 3 ; au moins la moitié → 2 ; sinon 1", () => {
    expect(repereEntretien(3, 3)).toBe(3);
    expect(repereEntretien(2, 3)).toBe(2);
    expect(repereEntretien(1, 3)).toBe(1);
    expect(repereEntretien(2, 4)).toBe(2);
    expect(repereEntretien(0, 0)).toBeNull();
  });
  it("le niveau retenu est celui de l'évaluateur, pas le repère", () => {
    expect(noterEntretien(4, 1, 3)?.niveau).toBe(4);
    expect(noterEntretien(null, 3, 3)).toBeNull();
  });
});

describe("niveauCompetence — combinaison des mesures", () => {
  it("une seule mesure : son niveau", () => {
    expect(niveauCompetence([{ source: "epreuve", niveau: 3 }])).toMatchObject({ niveau: 3, epreuve: 3, entretien: null, ecart: false });
    expect(niveauCompetence([{ source: "entretien", niveau: 2 }])).toMatchObject({ niveau: 2 });
    expect(niveauCompetence([])).toMatchObject({ niveau: null });
  });
  it("épreuve et entretien : le plus bas des deux, écart signalé à partir de 2 niveaux", () => {
    expect(niveauCompetence([{ source: "epreuve", niveau: 4 }, { source: "entretien", niveau: 2 }])).toMatchObject({ niveau: 2, ecart: true });
    expect(niveauCompetence([{ source: "epreuve", niveau: 3 }, { source: "entretien", niveau: 4 }])).toMatchObject({ niveau: 3, ecart: false });
  });
  it("plusieurs évaluateurs : médiane basse, sans écraser personne", () => {
    expect(
      niveauCompetence([
        { source: "entretien", evaluateur: "a", niveau: 4 },
        { source: "entretien", evaluateur: "b", niveau: 2 },
      ]).entretien,
    ).toBe(2);
    expect(
      niveauCompetence([
        { source: "entretien", evaluateur: "a", niveau: 4 },
        { source: "entretien", evaluateur: "b", niveau: 3 },
        { source: "entretien", evaluateur: "c", niveau: 1 },
      ]).entretien,
    ).toBe(3);
  });
});

describe("classer — du plus haut niveau prouvé au plus bas", () => {
  it("compte les compétences au niveau requis, puis la somme des niveaux, puis le nom", () => {
    const requis = { C7: 3 as const, C2: 3 as const, C6: 2 as const, C4: 3 as const };
    const lignes = classer(
      [
        { id: "b", nom: "Bao", niveaux: { C7: 3, C2: 2, C6: 2, C4: 3 } },
        { id: "a", nom: "Alix", niveaux: { C7: 4, C2: 3, C6: 3, C4: 3 } },
        { id: "c", nom: "Camille", niveaux: { C7: 3, C2: 3, C6: 2, C4: 2 } },
        { id: "d", nom: "Dominique", niveaux: { C7: 1, C2: null, C6: null, C4: null } },
      ],
      requis,
    );
    // Bao et Camille : 3 compétences au requis et 10 points chacun → ex æquo, ordre alphabétique.
    expect(lignes.map((l) => l.id)).toEqual(["a", "b", "c", "d"]);
    expect(lignes[0]).toMatchObject({ rang: 1, auRequis: 4, total: 13 });
    expect(lignes[1]).toMatchObject({ rang: 2, auRequis: 3, total: 10 });
    expect(lignes[2]).toMatchObject({ rang: 2, auRequis: 3, total: 10 });
    expect(lignes[3]).toMatchObject({ rang: 4, auRequis: 0, total: 1, mesurees: 1 });
  });
  it("ex æquo : même rang", () => {
    const lignes = classer(
      [
        { id: "a", nom: "A", niveaux: { C1: 3 } },
        { id: "b", nom: "B", niveaux: { C1: 3 } },
        { id: "c", nom: "C", niveaux: { C1: 2 } },
      ],
      { C1: 3 },
    );
    expect(lignes.map((l) => l.rang)).toEqual([1, 1, 3]);
  });
});
