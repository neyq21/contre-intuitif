import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { echeanceDemande } from "@/lib/methode/delais";
import { REGLAGES } from "@/lib/reglages";
import { ouvrirBase, journaliser } from "@/lib/stockage/sqlite";

export const dynamic = "force-dynamic";

const CHAMPS = ["intitule", "contexte", "taches", "contraintes", "nom", "entreprise", "email", "telephone"] as const;

/**
 * « Demander un métier » : reçoit uniquement les champs du formulaire.
 * Jamais un recrutement, jamais un candidat.
 */
export async function POST(request: Request) {
  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ erreur: "JSON attendu" }, { status: 400 });
  }
  if (typeof corps !== "object" || corps === null) return NextResponse.json({ erreur: "Formulaire vide" }, { status: 400 });
  const o = corps as Record<string, unknown>;
  const valeurs: Record<(typeof CHAMPS)[number], string> = { intitule: "", contexte: "", taches: "", contraintes: "", nom: "", entreprise: "", email: "", telephone: "" };
  for (const c of CHAMPS) {
    const v = o[c];
    valeurs[c] = typeof v === "string" ? v.trim().slice(0, 4000) : "";
  }
  if (!valeurs.intitule) return NextResponse.json({ erreur: "L'intitulé du métier est obligatoire." }, { status: 400 });
  if (!valeurs.email && !valeurs.telephone) return NextResponse.json({ erreur: "Indiquez un e-mail ou un téléphone pour recevoir le métier." }, { status: 400 });
  const complete = CHAMPS.filter((c) => c !== "telephone" && c !== "entreprise").every((c) => valeurs[c]);
  const date = new Date();
  const id = `dem_${randomBytes(6).toString("hex")}`;
  const db = ouvrirBase();
  db.prepare(
    `INSERT INTO demandes (id, recu_le, echeance, statut, intitule, contexte, taches, contraintes, nom, entreprise, email, telephone, metier_id, note, modifie_le)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, '', ?)`,
  ).run(
    id,
    date.toISOString(),
    echeanceDemande(date, REGLAGES.DELAI_DEMANDE_HEURES_OUVREES).toISOString(),
    complete ? "recue" : "incomplete",
    valeurs.intitule,
    valeurs.contexte,
    valeurs.taches,
    valeurs.contraintes,
    valeurs.nom,
    valeurs.entreprise,
    valeurs.email,
    valeurs.telephone,
    date.toISOString(),
  );
  journaliser(db, "formulaire", "demande_recue", id, valeurs.intitule);
  return NextResponse.json({ id, statut: complete ? "recue" : "incomplete" }, { status: 201 });
}
