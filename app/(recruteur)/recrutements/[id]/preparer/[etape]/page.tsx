import { Preparer } from "@/composants/recrutements/Preparer";
import { ETAPES } from "@/composants/recrutements/constantes";
import { notFound } from "next/navigation";

export const metadata = { title: "Préparer" };

export default async function Page({ params }: { params: Promise<{ id: string; etape: string }> }) {
  const { id, etape } = await params;
  if (!ETAPES.some((e) => e.id === etape)) notFound();
  return <Preparer id={id} etape={etape as (typeof ETAPES)[number]["id"]} />;
}
