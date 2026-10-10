import { NextResponse } from "next/server";
import { sessionCourante } from "@/lib/admin/session";
import { validerBase } from "@/lib/contenu/schema";
import { enregistrerBase } from "@/lib/stockage/admin";
import { lireBase, ouvrirBase } from "@/lib/stockage/sqlite";
import type { Base } from "@/lib/contenu/types";

export const dynamic = "force-dynamic";

/**
 * Enregistre une section de la base (barèmes, repères, e-mails, guide, sources,
 * checklist, besoins, « ne pas noter », profil de travail…). La base complète
 * est revalidée. Les recrutements déjà figés ne sont pas recalculés.
 */
export async function PUT(request: Request) {
  const admin = await sessionCourante();
  if (!admin) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });
  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ erreur: "JSON attendu" }, { status: 400 });
  }
  const o = typeof corps === "object" && corps !== null ? (corps as { section?: unknown; valeur?: unknown }) : {};
  if (typeof o.section !== "string") return NextResponse.json({ erreur: "Section manquante" }, { status: 400 });
  const db = ouvrirBase();
  const base = lireBase(db);
  if (!(o.section in base) || o.section === "schema") return NextResponse.json({ erreur: "Section inconnue" }, { status: 400 });
  const candidate = { ...base, [o.section]: o.valeur } as Base;
  const v = validerBase(candidate);
  if (!v.ok) return NextResponse.json({ erreur: "Section invalide", erreurs: v.erreurs }, { status: 400 });
  enregistrerBase(db, admin.email, v.valeur, o.section);
  return NextResponse.json({ ok: true });
}
