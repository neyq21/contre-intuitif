import { notFound } from "next/navigation";
import { FicheCandidat } from "@/composants/recrutements/FicheCandidat";
import { ONGLETS } from "@/composants/recrutements/constantes";

export const metadata = { title: "Candidat" };

export default async function Page({ params }: { params: Promise<{ id: string; cid: string; onglet: string }> }) {
  const { id, cid, onglet } = await params;
  if (!ONGLETS.some((o) => o.id === onglet)) notFound();
  return <FicheCandidat id={id} cid={cid} onglet={onglet as (typeof ONGLETS)[number]["id"]} />;
}
