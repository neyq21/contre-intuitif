import { NextResponse } from "next/server";
import { ouvrirBase, versionCatalogue } from "@/lib/stockage/sqlite";

export const dynamic = "force-dynamic";

/** Numéro de la dernière publication, pour savoir si le cache du recruteur est à jour. */
export async function GET() {
  return NextResponse.json(versionCatalogue(ouvrirBase()), { headers: { "Cache-Control": "no-store" } });
}
