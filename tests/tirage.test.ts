import { describe, expect, it } from "vitest";
import { chargerBase, chargerPack } from "@/lib/contenu/charger";
import {
  LIMITES,
  aUneBanque,
  bornerNombre,
  generateur,
  reservoirEntretien,
  reservoirP1,
  reservoirP3,
  sousEnsemble,
  tirer,
  verifierPortes,
  verifierSelection,
} from "@/lib/methode/tirage";
import { clesDeCorrige, empreinteEpreuve, figerEpreuve, paquetCandidat } from "@/lib/methode/epreuve";
import type { Recrutement } from "@/lib/stockage/modele";

const base = chargerBase();
const serveur = chargerPack("serveur");
const macon = chargerPack("macon");
const codes = serveur.competences.map((c) => c.code);

describe("generateur", () => {
  it("est déterministe pour une même graine", () => {
    const a = generateur("abc");
    const b = generateur("abc");
    const c = generateur("abd");
    const sa = [a(), a(), a()];
    expect(sa).toEqual([b(), b(), b()]);
    expect(sa).not.toEqual([c(), c(), c()]);
  });
  it("sousEnsemble garde l'ordre d'origine", () => {
    const s = sousEnsemble([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4, generateur("x"));
    expect(s).toHaveLength(4);
    expect([...s].sort((a, b) => a - b)).toEqual(s);
    expect(sousEnsemble([1, 2], 5, generateur("x"))).toEqual([1, 2]);
  });
});

describe("tirer", () => {
  it("tirage 0 = les questions du kit, dans l'ordre, avec les nombres par défaut", () => {
    const s = tirer(serveur, { competences: codes, nombres: { p1: 5, p2: 3, p5: 3 }, graine: "g", tirage: 0 });
    expect(s.competences.C7).toEqual({ p1: ["q1", "q2", "q3", "q4", "q5"], p2: ["d1", "d2", "d3"], p3: "v1", p4: "v1", p5: ["o1", "o2", "o3"] });
    expect(s.entretien).toEqual(["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"]);
  });

  it("respecte les nombres demandés : p1 de 3 à 10, p2 et p5 de 2 à 6", () => {
    const s = tirer(serveur, { competences: codes, nombres: { p1: 3, p2: 2, p5: 6 }, graine: "g", tirage: 0 });
    expect(s.competences.C7.p1).toHaveLength(3);
    expect(s.competences.C7.p2).toHaveLength(2);
    expect(s.competences.C7.p5).toHaveLength(6);
    const grand = tirer(serveur, { competences: codes, nombres: { p1: 10, p2: 6, p5: 6 }, graine: "g", tirage: 1 });
    expect(grand.competences.C7.p1).toHaveLength(10);
    expect(bornerNombre("p1", 12, 10)).toBe(10);
    expect(bornerNombre("p1", 1, 10)).toBe(3);
    expect(bornerNombre("p2", 6, 3)).toBe(3);
  });

  it("« Autre tirage » : déterministe à partir de la graine, différent d'un tirage à l'autre", () => {
    const cfg = { competences: codes, nombres: { p1: 5, p2: 3, p5: 3 }, graine: "graine-1" };
    const t1 = tirer(serveur, { ...cfg, tirage: 1 });
    const t1bis = tirer(serveur, { ...cfg, tirage: 1 });
    const t2 = tirer(serveur, { ...cfg, tirage: 2 });
    const autreGraine = tirer(serveur, { ...cfg, graine: "graine-2", tirage: 1 });
    expect(t1).toEqual(t1bis);
    expect(JSON.stringify(t1)).not.toEqual(JSON.stringify(t2));
    expect(JSON.stringify(t1)).not.toEqual(JSON.stringify(autreGraine));
    // les ids restent dans le réservoir et dans l'ordre d'origine
    const pool = reservoirP1(serveur.competences[0]).map((q) => q.id);
    const idx = t1.competences.C7.p1.map((id) => pool.indexOf(id));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    expect(reservoirP3(serveur.competences[0]).map((v) => v.id)).toEqual(["v1", "v2", "v3", "v4", "v5"]);
    expect(verifierSelection(serveur, t2, codes)).toEqual([]);
  });

  it("sans banque, le réservoir se limite au kit et les tirages ne changent pas", () => {
    expect(aUneBanque(macon)).toBe(false);
    expect(aUneBanque(serveur)).toBe(true);
    const mcodes = macon.competences.map((c) => c.code);
    const t0 = tirer(macon, { competences: mcodes, nombres: { p1: 5, p2: 3, p5: 3 }, graine: "g", tirage: 0 });
    const t1 = tirer(macon, { competences: mcodes, nombres: { p1: 5, p2: 3, p5: 3 }, graine: "g", tirage: 1 });
    expect(t1).toEqual(t0);
    expect(reservoirEntretien(macon)).toHaveLength(macon.entretien.length);
  });

  it("entretien : 2 questions par compétence mesurée", () => {
    const s = tirer(serveur, { competences: ["C7", "C2"], nombres: { p1: 5, p2: 3, p5: 3 }, graine: "g", tirage: 3 });
    expect(s.entretien).toHaveLength(4);
    const pool = reservoirEntretien(serveur);
    const comps = s.entretien.map((id) => pool.find((q) => q.id === id)!.competence);
    expect(comps.filter((c) => c === "C7")).toHaveLength(2);
    expect(comps.filter((c) => c === "C2")).toHaveLength(2);
    expect(LIMITES.entretien_par_competence).toBe(2);
  });

  it("verifierSelection signale les ids inconnus et les nombres hors limites", () => {
    const s = tirer(serveur, { competences: codes, nombres: { p1: 5, p2: 3, p5: 3 }, graine: "g", tirage: 0 });
    s.competences.C7.p1 = ["q1", "zzz"];
    s.competences.C7.p3 = "v9";
    const erreurs = verifierSelection(serveur, s, codes);
    expect(erreurs.some((e) => e.includes("porte 1"))).toBe(true);
    expect(erreurs.some((e) => e.includes("zzz"))).toBe(true);
    expect(erreurs.some((e) => e.includes("v9"))).toBe(true);
  });

  it("verifierPortes : au moins 3 portes dont une sans rédaction libre", () => {
    expect(verifierPortes(["p1", "p2", "p5"])).toBeNull();
    expect(verifierPortes(["p2", "p5"])).toMatch(/au moins 3/i);
    expect(verifierPortes(["p2", "p5", "p2"])).toMatch(/sans rédaction/i);
    expect(verifierPortes(["p3", "p4", "p1"])).toBeNull();
  });
});

function recrutementTest(): Recrutement {
  const selection = tirer(serveur, { competences: codes, nombres: { p1: 5, p2: 3, p5: 3 }, graine: "g", tirage: 0 });
  return {
    id: "r1",
    poste: "Serveur",
    metier_id: "serveur",
    metier_nom: serveur.nom,
    metier_version: serveur.version,
    metier_pv: serveur._pv,
    cree_le: "2026-10-10T00:00:00.000Z",
    modifie_le: "2026-10-10T00:00:00.000Z",
    statut: "preparation",
    fictif: false,
    notes: "",
    competences: serveur.competences.map((c) => ({ code: c.code, niveau_requis: c.niveau_requis })),
    portes: ["p1", "p2", "p3", "p4", "p5"],
    nombres: { p1: 5, p2: 3, p5: 3 },
    graine: "g",
    tirage: 0,
    selection,
    questions_recruteur: { p2: { C7: [{ id: "r_1", texte: "Ma question" }] }, p5: {}, entretien: {} },
    profil_travail: { essentiels: ["service", "organisation"], phrases: true },
    deroule: false,
    evaluateurs: [],
    epreuve: null,
    lien_annonce: null,
    envois: { questions_envoyees: false },
  };
}

describe("figerEpreuve / paquetCandidat", () => {
  it("copie les questions choisies avec leurs corrigés, et seulement les portes proposées", () => {
    const r = recrutementTest();
    r.portes = ["p1", "p3", "p4"];
    const e = figerEpreuve(serveur, base, r, "2026-10-10T00:00:00.000Z");
    expect(e.competences).toHaveLength(4);
    expect(e.competences[0].portes.p1?.questions).toHaveLength(5);
    expect(e.competences[0].portes.p2).toBeUndefined();
    expect(e.competences[0].portes.p4?.reel).toBeDefined();
    expect(e.entretien.questions).toHaveLength(8);
    expect(e.profil_travail.items.every((i) => ["service", "organisation"].includes(i.dim))).toBe(true);
    expect(e.empreinte).toMatch(/^[0-9a-f]{16}$/);
    expect(empreinteEpreuve({ a: 1 })).toBe(empreinteEpreuve({ a: 1 }));
  });

  it("le paquet candidat ne contient aucune clé de corrigé et garde les questions du recruteur", () => {
    const r = recrutementTest();
    const e = figerEpreuve(serveur, base, r);
    const p = paquetCandidat(e, base, r.id, { id: "c1", nom: "Alix" });
    expect(clesDeCorrige(p)).toEqual([]);
    expect(JSON.stringify(p)).not.toMatch(/"points"|"justes"|"repere"|"explication"|"regles"|"accepte"|"erreur"|"juste"/);
    const c7 = p.competences[0];
    expect(c7.portes.p2?.debuts.map((d) => d.id)).toEqual(["d1", "d2", "d3", "r_1"]);
    expect(c7.portes.p2?.debuts[3].recruteur).toBe(true);
    expect(c7.portes.p3?.indices.options).toHaveLength(6);
    expect(p.textes.portes).toHaveLength(5);
    expect(p.profil_travail?.items.length).toBeGreaterThan(0);
    expect(p.candidat).toEqual({ id: "c1", nom: "Alix" });
    expect(p.empreinte).toBe(e.empreinte);
  });

  it("l'épreuve figée garde les mêmes questions même si le pack change ensuite", () => {
    const r = recrutementTest();
    const e = figerEpreuve(serveur, base, r);
    const packModifie = structuredClone(serveur);
    packModifie.competences[0].portes.p1.questions[0].texte = "Texte modifié par l'admin";
    expect(e.competences[0].portes.p1?.questions[0].texte).not.toBe("Texte modifié par l'admin");
  });
});
