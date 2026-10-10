import { Classement } from "@/composants/recrutements/Classement";

export const metadata = { title: "Classement" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Classement id={id} />;
}
