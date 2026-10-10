import { EssaiMetier } from "@/composants/metiers/EssaiMetier";

export const metadata = { title: "Essayer comme un candidat" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EssaiMetier id={id} />;
}
