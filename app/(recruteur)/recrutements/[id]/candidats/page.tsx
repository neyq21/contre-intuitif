import { Candidats } from "@/composants/recrutements/Candidats";

export const metadata = { title: "Candidats" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Candidats id={id} />;
}
