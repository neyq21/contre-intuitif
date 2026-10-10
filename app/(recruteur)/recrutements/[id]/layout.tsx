import { CadreRecrutement } from "@/composants/recrutements/CadreRecrutement";

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CadreRecrutement id={id}>{children}</CadreRecrutement>;
}
