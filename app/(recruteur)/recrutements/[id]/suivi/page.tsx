import { Suivi } from "@/composants/recrutements/Suivi";

export const metadata = { title: "Suivi" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suivi id={id} />;
}
