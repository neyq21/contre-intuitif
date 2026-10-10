import { describe, expect, it } from "vitest";
import { chargerPack } from "@/lib/contenu/charger";
import {
  construireArchive,
  decoderCode,
  encoderCode,
  exporterArchive,
  exporterPack,
  exporterReponses,
  exporterSauvegarde,
  importerArchive,
  importerPack,
  importerReponses,
  importerSauvegarde,
  lireJson,
  nomFichier,
} from "@/lib/fichiers/formats";
import { etatVide, type Candidat, type Recrutement, type Reponses } from "@/lib/stockage/modele";

const serveur = chargerPack("serveur");

function reponsesTest(): Reponses {
  return {
    schema: "ci5p-reponses/2",
    recrutement_id: "r1",
    epreuve_empreinte: "abcdef0123456789",
    candidat: { id: "c1", nom: "Alix" },
    rendu_le: "2026-10-10T10:00:00.000Z",
    competences: {
      C7: { porte: "p1", p1: { q1: "b", q2: "d", q3: "c", q4: "a", q5: "b" } },
      C2: { porte: "p2", p2: { d1: "demande en cuisine où en est la commande, puis je préviens la table", d2: "le délai réel", d3: "note l'incident" } },
      C6: { porte: "p3", p3: { question: "d", indices: ["i1", "i3", "i5"], suite: "b" } },
      C4: { porte: "p5", p5: { o1: { texte: "Je vérifie auprès de la cuisine avant de répondre, en précisant l'heure exacte à la table." }, o2: { oral: true }, o3: { texte: "" } } },
    },
    profil_travail: { s1: 4, o1: 3, e1: "nsp" },
    besoins: { liste: ["Une pause"], autre: "" },
    deroule: [{ type: "porte_regardee", competence: "C7", porte: "p2" }],
  };
}

describe("ci5p-pack/3", () => {
  it("export puis import : identique", () => {
    const texte = exporterPack(serveur);
    const json = lireJson(texte);
    expect(json.ok).toBe(true);
    const r = importerPack(json.ok ? json.valeur : null);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valeur).toEqual(serveur);
  });
  it("refuse un fichier qui n'est pas un métier", () => {
    expect(importerPack({ schema: "ci5p-sauvegarde/2" }).ok).toBe(false);
    expect(importerPack({ schema: "ci5p-pack/3", id: "x" }).ok).toBe(false);
    expect(lireJson("{pas du json").ok).toBe(false);
  });
  it("accepte ci5p-pack/2 avec un avertissement", () => {
    const r = importerPack({ ...serveur, schema: "ci5p-pack/2" });
    expect(r.ok && r.avertissements.length).toBe(1);
  });
});

describe("ci5p-sauvegarde/2", () => {
  const recrutement = { id: "r1", poste: "Serveur", metier_id: "serveur" } as Recrutement;
  const candidat = { id: "c1", recrutement_id: "r1", nom: "Alix", reponses: reponsesTest() } as Candidat;

  it("export puis restauration : recrutements et candidats retrouvés", () => {
    const etat = { ...etatVide(), recrutements: [recrutement], candidats: [candidat], metiers_importes: [serveur] };
    const texte = exporterSauvegarde(etat, "2026-10-10T00:00:00.000Z");
    const json = JSON.parse(texte);
    expect(json.schema).toBe("ci5p-sauvegarde/2");
    expect(json.exporte_le).toBe("2026-10-10T00:00:00.000Z");
    const r = importerSauvegarde(json);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valeur.recrutements).toHaveLength(1);
    expect(r.valeur.recrutements[0].poste).toBe("Serveur");
    expect(r.valeur.recrutements[0].portes).toEqual(["p1", "p2", "p3", "p4", "p5"]);
    expect(r.valeur.candidats[0].reponses?.competences.C7?.porte).toBe("p1");
    expect(r.valeur.candidats[0].evaluations).toEqual({});
    expect(r.valeur.metiers_importes[0].id).toBe("serveur");
  });

  it("tolère une sauvegarde de l'ancien HTML enveloppée sous `donnees` ou sans schéma", () => {
    const r1 = importerSauvegarde({ schema: "ci5p-sauvegarde/2", donnees: { recrutements: [recrutement], candidats: [candidat] } });
    expect(r1.ok && r1.valeur.recrutements.length).toBe(1);
    const r2 = importerSauvegarde({ recrutements: [recrutement], candidats: [] });
    expect(r2.ok && r2.avertissements.length).toBe(1);
    const r3 = importerSauvegarde({ schema: "ci5p-sauvegarde/1", recrutements: [], candidats: [candidat] });
    expect(r3.ok && r3.avertissements.some((a) => a.includes("sans recrutement"))).toBe(true);
  });

  it("refuse ce qui n'est pas une sauvegarde", () => {
    expect(importerSauvegarde({ schema: "ci5p-pack/3" }).ok).toBe(false);
    expect(importerSauvegarde("texte").ok).toBe(false);
  });
});

describe("ci5p-reponses/2 : fichier et code CI5Z-…", () => {
  it("fichier : export puis import", () => {
    const r = importerReponses(JSON.parse(exporterReponses(reponsesTest())));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valeur).toEqual(reponsesTest());
    expect(importerReponses({ schema: "ci5p-archive/1" }).ok).toBe(false);
  });

  it("code : complet, jamais tronqué, réimportable", async () => {
    const code = await encoderCode(reponsesTest());
    expect(code.startsWith("CI5Z-")).toBe(true);
    expect(code).toMatch(/^CI5Z-[A-Za-z0-9_-]+$/);
    const r = await decoderCode(code);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valeur).toEqual(reponsesTest());
    // les espaces et retours à la ligne copiés par erreur sont ignorés
    const r2 = await decoderCode(code.slice(0, 20) + "\n " + code.slice(20));
    expect(r2.ok).toBe(true);
    // un code amputé est refusé, pas interprété à moitié
    const r3 = await decoderCode(code.slice(0, code.length - 10));
    expect(r3.ok).toBe(false);
    expect((await decoderCode("ABCD-xxx")).ok).toBe(false);
  });

  it("code : les longues réponses rédigées sont conservées intégralement", async () => {
    const rep = reponsesTest();
    const longue = "Je vérifie en cuisine. ".repeat(80);
    rep.competences.C4!.p5!.o3 = { texte: longue };
    const r = await decoderCode(await encoderCode(rep));
    expect(r.ok && r.valeur.competences.C4?.p5?.o3?.texte).toBe(longue);
  });
});

describe("ci5p-archive/1", () => {
  it("contient réponses, grilles et motifs, sans déroulé ni besoins", () => {
    const recrutement = { id: "r1", poste: "Serveur", metier_id: "serveur" } as Recrutement;
    const candidat = {
      id: "c1",
      recrutement_id: "r1",
      nom: "Alix",
      reponses: reponsesTest(),
      evaluations: {},
      decision: { statut: "retenu", motifs: "Niveau attendu sur les 4 compétences.", par: "Moi", le: "2026-10-10" },
      besoins: { liste: ["Une pause"], autre: "" },
    } as Candidat;
    const archive = construireArchive(recrutement, [candidat], "2026-10-11T00:00:00.000Z");
    const texte = exporterArchive(archive);
    expect(texte).not.toContain("deroule");
    expect(texte).not.toContain("besoins");
    expect(texte).toContain("Niveau attendu");
    const r = importerArchive(JSON.parse(texte));
    expect(r.ok && r.valeur.candidats[0].reponses?.competences.C7?.porte).toBe("p1");
    expect(importerArchive({ schema: "x" }).ok).toBe(false);
  });
});

describe("nomFichier", () => {
  it("retire accents et caractères spéciaux", () => {
    expect(nomFichier("Épreuve · Serveur / Serveuse", "json", new Date("2026-10-10"))).toBe("epreuve-serveur-serveuse-2026-10-10.json");
  });
});
