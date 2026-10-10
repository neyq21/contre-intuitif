import { PageMetiers } from "@/composants/metiers/PageMetiers";

export const metadata = { title: "Domaine" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PageMetiers domaineId={id} />;
}
