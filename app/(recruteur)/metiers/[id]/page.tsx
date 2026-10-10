import { FicheMetier } from "@/composants/metiers/FicheMetier";

export const metadata = { title: "Métier" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FicheMetier id={id} />;
}
