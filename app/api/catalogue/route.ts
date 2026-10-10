import { NextResponse } from "next/server";
import { ouvrirBase } from "@/lib/stockage/sqlite";
import { construireCatalogue } from "@/lib/stockage/catalogue";

export const dynamic = "force-dynamic";

/** Catalogue public : base, domaines, métiers publiés. Aucune donnée de candidat. */
export async function GET() {
  const catalogue = construireCatalogue(ouvrirBase());
  return NextResponse.json(catalogue, {
    headers: { "Cache-Control": "no-store", "X-Catalogue-Version": String(catalogue.version) },
  });
}
