import { describe, expect, it } from "vitest";
import { chargerBase, chargerPacks } from "@/lib/contenu/charger";
import { analyserBesoin, motsClesMetier } from "@/lib/methode/besoin";
import { QUESTION_BESOIN, detecter } from "@/lib/methode/detecteur";

const base = chargerBase();
const packs = chargerPacks();

describe("Décrire mon besoin (mots-clés, pas d'IA)", () => {
  it("« Un serveur débutant pour le coup de feu, épreuve courte »", () => {
    const r = analyserBesoin("Un serveur débutant pour le coup de feu, épreuve courte", packs, base);
    expect(r.metier?.id).toBe("serveur");
    expect(r.metier?.mots).toContain("serveur");
    expect(r.competences.every((c) => c.niveau_requis <= 2)).toBe(true);
    expect(r.nombres).toEqual({ p1: 3, p2: 2, p5: 2 });
    const reglages = r.reglages.map((x) => x.reglage);
    expect(reglages).toContain("Niveau requis");
    expect(reglages).toContain("Nombre de questions");
    expect(reglages).toContain("Savoir-être essentiels");
    expect(r.reglages.find((x) => x.reglage === "Niveau requis")?.mots).toEqual(["débutant"]);
    expect(r.reglages.find((x) => x.reglage === "Nombre de questions")?.mots).toContain("épreuve courte");
    expect(r.reglages.find((x) => x.reglage === "Savoir-être essentiels")?.mots).toContain("coup de feu");
  });

  it("« Une aide-soignante en EHPAD, recrutement inclusif, sans écrit si possible »", () => {
    const r = analyserBesoin("Une aide-soignante en EHPAD, recrutement inclusif, sans écrit si possible", packs, base);
    expect(r.metier?.id).toBe("aide-soignant");
    expect(r.portes).toEqual(["p1", "p3", "p4", "p5"]);
    expect(r.reglages.some((x) => x.reglage === "Recrutement inclusif" && x.mots.includes("inclusif"))).toBe(true);
    expect(r.reglages.find((x) => x.reglage === "Portes proposées")?.mots).toContain("sans écrit");
  });

  it("« Un agent d'entretien fiable pour des bureaux le soir, épreuve courte »", () => {
    const r = analyserBesoin("Un agent d'entretien fiable pour des bureaux le soir, épreuve courte", packs, base);
    expect(r.metier?.id).toBe("agent-entretien");
    expect(r.nombres?.p1).toBe(3);
    expect(r.reglages.find((x) => x.reglage === "Savoir-être essentiels")?.mots).toContain("fiable");
  });

  it("ne devine pas : rien de reconnu → pas de métier", () => {
    const r = analyserBesoin("Quelqu'un de sympa pour cet été", packs, base);
    expect(r.metier).toBeNull();
    expect(analyserBesoin("", packs, base).metier).toBeNull();
  });

  it("chaque métier est reconnu par son nom et ses alias", () => {
    for (const p of packs) {
      const r = analyserBesoin(`Je cherche un ${p.alias[0] ?? p.nom}`, packs, base);
      expect(r.metier?.id, `${p.id} via « ${p.alias[0]} »`).toBe(p.id);
      expect(motsClesMetier(p).length).toBeGreaterThan(2);
    }
  });
});

describe("Détecteur de questions interdites (motifs, pas d'IA)", () => {
  it("signale santé, handicap, RQTH, diagnostic, traitement, famille, grossesse, âge, origine, nationalité, religion, opinions, syndicat, vie privée", () => {
    const cas: [string, string][] = [
      ["Avez-vous des problèmes de santé ?", "Santé"],
      ["Avez-vous une RQTH ?", "Handicap, RQTH"],
      ["Êtes-vous autiste ou TDAH ?", "Diagnostic, profil"],
      ["Suivez-vous un traitement ?", "Traitement"],
      ["Avez-vous des enfants ?", "Famille, situation personnelle"],
      ["Êtes-vous enceinte ?", "Grossesse, maternité"],
      ["Quel âge avez-vous ?", "Âge"],
      ["Quelle est votre nationalité ?", "Origine, nationalité"],
      ["Quelle est votre religion ?", "Religion"],
      ["Pour qui avez-vous voté ?", "Opinions politiques"],
      ["Êtes-vous syndiqué ?", "Syndicat"],
      ["Que faites-vous le week-end ?", "Vie privée"],
    ];
    for (const [q, theme] of cas) {
      const s = detecter(q);
      expect(s.map((x) => x.theme), q).toContain(theme);
      expect(s[0].mots.length).toBeGreaterThan(0);
      expect(s[0].a_la_place.length).toBeGreaterThan(0);
    }
  });
  it("laisse passer les questions de métier et la seule question permise sur l'aménagement", () => {
    expect(detecter("Un client pressé vous demande à quelle heure il sera servi. Que faites-vous ?")).toEqual([]);
    expect(detecter("Racontez une fois où vous avez repéré une erreur avant qu'elle pose problème.")).toEqual([]);
    expect(detecter(QUESTION_BESOIN)).toEqual([]);
    expect(detecter("")).toEqual([]);
  });
});
