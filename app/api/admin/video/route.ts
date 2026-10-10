import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sessionCourante } from "@/lib/admin/session";
import { journaliser, ouvrirBase } from "@/lib/stockage/sqlite";

export const dynamic = "force-dynamic";
const TAILLE_MAX = 300 * 1024 * 1024;

/** Dépose la vidéo dans public/, servie en statique. Admin seulement. */
export async function POST(request: Request) {
  const admin = await sessionCourante();
  if (!admin) return NextResponse.json({ erreur: "Non connecté" }, { status: 401 });
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("video/mp4")) return NextResponse.json({ erreur: "Un fichier MP4 est attendu" }, { status: 400 });
  const octets = new Uint8Array(await request.arrayBuffer());
  if (!octets.length || octets.length > TAILLE_MAX) return NextResponse.json({ erreur: "Fichier vide ou trop gros (300 Mo max)" }, { status: 400 });
  // Signature MP4 : « ftyp » aux octets 4 à 8.
  if (String.fromCharCode(...octets.slice(4, 8)) !== "ftyp") return NextResponse.json({ erreur: "Ce fichier n'est pas un MP4" }, { status: 400 });
  await writeFile(join(process.cwd(), "public", "Presentation-kit-5-portes.mp4"), octets);
  journaliser(ouvrirBase(), admin.email, "video_deposee", "Presentation-kit-5-portes.mp4", `${Math.round(octets.length / 1024 / 1024)} Mo`);
  return NextResponse.json({ ok: true });
}
