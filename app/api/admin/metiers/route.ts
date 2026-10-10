import { NextResponse } from "next/server";
import { sessionCourante } from "@/lib/admin/session";
import { validerPack } from "@/lib/contenu/schema";
import { enregistrerMetier, modifierDemande } from "@/lib/stockage/admin";
import { lireMetier, ouvrirBase } from "@/lib/stockage/sqlite";

export const dynamic = "force-dynamic";

/** Crée un métier (brouillon). Peut lier une demande. */
export async function POST(request: Request) {
  const admin = await sessionCourante();
  if (!admin) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });
  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ erreur: "JSON attendu" }, { status: 400 });
  }
  const o = typeof corps === "object" && corps !== null ? (corps as { pack?: unknown; demande_id?: unknown }) : {};
  const v = validerPack(o.pack);
  if (!v.ok) return NextResponse.json({ erreur: "Métier invalide", erreurs: v.erreurs }, { status: 400 });
  const db = ouvrirBase();
  if (lireMetier(db, v.valeur.id)) return NextResponse.json({ erreur: `Un métier « ${v.valeur.id} » existe déjà : changez l'identifiant.` }, { status: 409 });
  const res = enregistrerMetier(db, admin.email, v.valeur, { nouveau: true });
  if (res.erreurs) return NextResponse.json({ erreur: "Métier invalide", erreurs: res.erreurs }, { status: 400 });
  if (typeof o.demande_id === "string" && o.demande_id) modifierDemande(db, admin.email, o.demande_id, { metier_id: res.pack.id, statut: "en_cours" });
  return NextResponse.json({ ok: true, pack: res.pack }, { status: 201 });
}
