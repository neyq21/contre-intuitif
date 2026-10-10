import { NextResponse } from "next/server";
import { ouvrirBase, maintenant } from "@/lib/stockage/sqlite";

export const dynamic = "force-dynamic";

/** Rend le blob chiffré à qui a le lien. Le serveur ne logue rien de son contenu. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) return NextResponse.json({ erreur: "Jeton invalide" }, { status: 400 });
  const db = ouvrirBase();
  const r = db.prepare("SELECT blob, expire_le FROM epreuves WHERE token = ?").get(token) as { blob: string; expire_le: string } | undefined;
  if (!r || r.expire_le < maintenant()) return NextResponse.json({ erreur: "Épreuve introuvable ou expirée" }, { status: 404 });
  return NextResponse.json({ blob: r.blob, expire_le: r.expire_le }, { headers: { "Cache-Control": "no-store" } });
}
