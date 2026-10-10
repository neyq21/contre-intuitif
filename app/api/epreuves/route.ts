import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { ouvrirBase, maintenant } from "@/lib/stockage/sqlite";
import { REGLAGES } from "@/lib/reglages";

export const dynamic = "force-dynamic";

const TAILLE_MAX = 4 * 1024 * 1024;

/**
 * Dépose un blob chiffré (le serveur ne peut pas le lire : la clé reste dans le
 * fragment d'URL, chez le recruteur et le candidat). Rend un jeton opaque.
 */
export async function POST(request: Request) {
  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ erreur: "JSON attendu" }, { status: 400 });
  }
  const blob = typeof corps === "object" && corps !== null ? (corps as { blob?: unknown }).blob : undefined;
  if (typeof blob !== "string" || !blob || blob.length > TAILLE_MAX || !/^[A-Za-z0-9_-]+$/.test(blob)) {
    return NextResponse.json({ erreur: "Blob invalide" }, { status: 400 });
  }
  const db = ouvrirBase();
  const token = randomBytes(18).toString("base64url");
  const date = new Date();
  const expire = new Date(date.getTime() + REGLAGES.EXPIRATION_EPREUVE_JOURS * 24 * 3600 * 1000);
  db.prepare("INSERT INTO epreuves (token, blob, cree_le, expire_le) VALUES (?, ?, ?, ?)").run(token, blob, date.toISOString(), expire.toISOString());
  // Ménage : les épreuves expirées disparaissent.
  db.prepare("DELETE FROM epreuves WHERE expire_le < ?").run(maintenant());
  return NextResponse.json({ token, expire_le: expire.toISOString() }, { status: 201 });
}
