import { EpreuveEnLigne } from "@/composants/epreuve/EpreuveEnLigne";

export const metadata = { title: "Votre épreuve", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <EpreuveEnLigne token={token} />;
}
