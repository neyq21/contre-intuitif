import { describe, expect, it } from "vitest";
import { ajouterHeuresOuvrees, echeanceDemande, estJourOuvre } from "@/lib/methode/delais";

describe("72 h ouvrées (lundi–vendredi)", () => {
  it("un lundi 10 h → jeudi 10 h", () => {
    const d = echeanceDemande(new Date("2026-10-12T10:00:00Z")); // lundi
    expect(d.toISOString()).toBe("2026-10-15T10:00:00.000Z");
  });
  it("un mercredi 15 h → lundi suivant 15 h (le week-end ne compte pas)", () => {
    const d = echeanceDemande(new Date("2026-10-14T15:00:00Z")); // mercredi
    expect(d.toISOString()).toBe("2026-10-19T15:00:00.000Z");
  });
  it("un samedi → le délai court à partir du lundi 0 h", () => {
    const d = echeanceDemande(new Date("2026-10-17T09:00:00Z")); // samedi
    expect(d.toISOString()).toBe("2026-10-22T00:00:00.000Z");
  });
  it("estJourOuvre et ajout partiel", () => {
    expect(estJourOuvre(new Date("2026-10-18T00:00:00Z"))).toBe(false);
    expect(estJourOuvre(new Date("2026-10-19T00:00:00Z"))).toBe(true);
    expect(ajouterHeuresOuvrees(new Date("2026-10-16T20:00:00Z"), 8).toISOString()).toBe("2026-10-19T04:00:00.000Z"); // vendredi 20 h + 8 h → lundi 4 h
  });
});
