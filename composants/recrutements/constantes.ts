/** Constantes partagées entre pages serveur et composants client (pas de "use client" ici). */
export const ETAPES = [
  { id: "poste", libelle: "1. Le poste" },
  { id: "epreuve", libelle: "2. L'épreuve" },
  { id: "questions", libelle: "3. Les questions" },
  { id: "entretien", libelle: "4. L'entretien" },
  { id: "envois", libelle: "5. Les envois" },
  { id: "verifier", libelle: "6. Vérifier" },
] as const;
export type EtapeId = (typeof ETAPES)[number]["id"];

export const ONGLETS = [
  { id: "epreuve", libelle: "Épreuve" },
  { id: "entretien", libelle: "Entretien" },
  { id: "analyse", libelle: "Analyse" },
  { id: "decision", libelle: "Décision" },
  { id: "besoins", libelle: "Besoins" },
] as const;
export type OngletId = (typeof ONGLETS)[number]["id"];
