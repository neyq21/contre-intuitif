import { Fin } from "@/composants/recrutements/Fin";

export const metadata = { title: "Fin du recrutement" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Fin id={id} />;
}
