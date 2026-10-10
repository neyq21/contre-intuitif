import { PasserEpreuve } from "@/composants/recrutements/PasserEpreuve";

export const metadata = { title: "Épreuve" };

export default async function Page({ params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id, cid } = await params;
  return <PasserEpreuve id={id} cid={cid} />;
}
