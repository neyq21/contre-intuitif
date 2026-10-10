import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id, cid } = await params;
  redirect(`/recrutements/${id}/candidats/${cid}/epreuve`);
}
