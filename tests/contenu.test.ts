import { describe, expect, it } from "vitest";
import { chargerBase, chargerIndex, chargerPacks } from "@/lib/contenu/charger";
import { ouvrirBase, lireBase, listerMetiers, versionCatalogue } from "@/lib/stockage/sqlite";
import { construireCatalogue } from "@/lib/stockage/catalogue";
import { calculerEmpreinte, calculerEmpreinteSync, jsonCanonique } from "@/lib/contenu/empreinte";

describe("contenu/", () => {
  it("charge base.json et les 33 packs valides", () => {
    const base = chargerBase();
    expect(base.schema).toBe("ci5p-base/2");
    expect(base.portes).toHaveLength(5);
    expect(base.competences).toHaveLength(8);
    expect(base.sources).toHaveLength(49);
    expect(base.secteurs).toHaveLength(12);
    expect(base.emails).toHaveLength(8);
    expect(base.besoins).toHaveLength(14);
    expect(base.ne_pas_noter).toHaveLength(14);
    const index = chargerIndex();
    expect(index.ids).toHaveLength(33);
    const packs = chargerPacks();
    expect(packs).toHaveLength(33);
    for (const p of packs) {
      expect(p.competences).toHaveLength(4);
      expect(p.entretien.length).toBeGreaterThanOrEqual(8);
    }
  });

  it("les 8 métiers les plus recrutés ont une banque, les 25 autres non", () => {
    const base = chargerBase();
    const packs = chargerPacks();
    const avecBanque = packs.filter((p) => p.competences.every((c) => c.banque)).map((p) => p.id);
    expect(avecBanque.sort()).toEqual([...base.catalogue.plus_recrutes].sort());
    expect(packs.filter((p) => p.competences.some((c) => c.banque))).toHaveLength(8);
  });

  it("tous les repères cités par les options existent dans base.reperes", () => {
    const base = chargerBase();
    const ids = new Set(base.reperes.map((r) => r.id));
    const packs = chargerPacks();
    const manquants = new Set<string>();
    for (const p of packs) {
      for (const c of p.competences) {
        for (const q of c.portes.p1.questions) for (const o of q.options) if (o.repere && !ids.has(o.repere)) manquants.add(o.repere);
        for (const d of c.portes.p2.debuts) for (const j of d.justes) if (j.repere && !ids.has(j.repere)) manquants.add(j.repere);
      }
    }
    expect([...manquants]).toEqual([]);
  });

  it("empreinte canonique : stable et indépendante de l'ordre des clés", async () => {
    expect(jsonCanonique({ b: 1, a: [1, { d: 2, c: 3 }] })).toBe('{"a":[1,{"c":3,"d":2}],"b":1}');
    const pack = chargerPacks()[0];
    const sync = calculerEmpreinteSync(pack);
    const asynchrone = await calculerEmpreinte(pack);
    expect(sync).toBe(asynchrone);
    expect(sync).toMatch(/^[0-9a-f]{10}$/);
    expect(calculerEmpreinteSync({ ...pack, _pv: "autre" })).toBe(sync);
    expect(calculerEmpreinteSync({ ...pack, nom: pack.nom + " x" })).not.toBe(sync);
  });
});

describe("stockage/sqlite", () => {
  it("crée et seede une base en mémoire", () => {
    const db = ouvrirBase(":memory:");
    const base = lireBase(db);
    expect(base.meta.titre).toBe("La méthode des 5 portes");
    const metiers = listerMetiers(db);
    expect(metiers).toHaveLength(33);
    expect(metiers.filter((m) => m.plus_recrute)).toHaveLength(8);
    expect(metiers.every((m) => m.statut === "publie")).toBe(true);
    expect(versionCatalogue(db).version).toBe(1);
    const admin = db.prepare("SELECT email FROM admin").all();
    expect(admin).toHaveLength(1);
    const catalogue = construireCatalogue(db);
    expect(catalogue.packs).toHaveLength(33);
    expect(catalogue.metiers.filter((m) => m.banque)).toHaveLength(8);
    expect(catalogue.domaines.map((d) => d.id)).toEqual(base.secteurs.map((s) => s.id));
    // Jamais de table de candidats.
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map((t) => t.name);
    expect(tables.some((t) => /candidat|reponse/i.test(t))).toBe(false);
    db.close();
  });
});
