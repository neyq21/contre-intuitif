import { NextResponse } from "next/server";
import { sessionCourante } from "@/lib/admin/session";
import { validerPack } from "@/lib/contenu/schema";
import { enregistrerMetier } from "@/lib/stockage/admin";
import { lireMetier, ouvrirBase } from "@/lib/stockage/sqlite";
import { exporterPack, nomFichier } from "@/lib/fichiers/formats";

export const dynamic = "force-dynamic";

/** Export d'un métier en fichier ci5p-pack/3 (admin). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await sessionCourante();
  if (!admin) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });
  const { id } = await params;
  const m = lireMetier(ouvrirBase(), id);
  if (!m) return NextResponse.json({ erreur: "Métier inconnu" }, { status: 404 });
  const exporter = new URL(request.url).searchParams.get("export");
  return new NextResponse(exporterPack(m.pack), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(exporter ? { "Content-Disposition": `attachment; filename="${nomFichier(`metier-${m.pack.id}`)}"` } : {}),
    },
  });
}

/** Enregistre un métier existant (éditeur). Version et empreinte recalculées si le contenu change. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await sessionCourante();
  if (!admin) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });
  const { id } = await params;
  const db = ouvrirBase();
  if (!lireMetier(db, id)) return NextResponse.json({ erreur: "Métier inconnu" }, { status: 404 });
  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ erreur: "JSON attendu" }, { status: 400 });
  }
  const pack = typeof corps === "object" && corps !== null ? (corps as { pack?: unknown }).pack : undefined;
  const v = validerPack(pack);
  if (!v.ok) return NextResponse.json({ erreur: "Métier invalide", erreurs: v.erreurs }, { status: 400 });
  if (v.valeur.id !== id) return NextResponse.json({ erreur: "L'identifiant ne peut pas changer ici : dupliquez le métier." }, { status: 400 });
  const res = enregistrerMetier(db, admin.email, v.valeur);
  if (res.erreurs) return NextResponse.json({ erreur: "Métier invalide", erreurs: res.erreurs }, { status: 400 });
  return NextResponse.json({ ok: true, pack: res.pack });
}
