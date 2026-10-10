import { NextResponse } from "next/server";
import { ouvrirBase, maintenant } from "@/lib/stockage/sqlite";

export const dynamic = "force-dynamic";

/** Vérifie un code de licence : actif, non expiré. Ne renvoie que le type et le nom. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const propre = code.trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,40}$/.test(propre)) return NextResponse.json({ erreur: "Code invalide" }, { status: 404 });
  const db = ouvrirBase();
  const l = db.prepare("SELECT code, type, nom, fin_le, statut FROM licences WHERE code = ?").get(propre) as
    | { code: string; type: string; nom: string; fin_le: string | null; statut: string }
    | undefined;
  if (!l || l.statut !== "actif" || (l.fin_le && l.fin_le < maintenant().slice(0, 10))) {
    return NextResponse.json({ erreur: "Licence inconnue ou révoquée" }, { status: 404 });
  }
  return NextResponse.json({ code: l.code, type: l.type, nom: l.nom }, { headers: { "Cache-Control": "no-store" } });
}
