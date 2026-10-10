import { redirect } from "next/navigation";
import { sessionCourante } from "@/lib/admin/session";
import { FormulaireConnexion } from "@/composants/admin/FormulaireConnexion";

export const dynamic = "force-dynamic";

export default async function PageConnexion({ searchParams }: { searchParams: Promise<{ mdp?: string }> }) {
  if (await sessionCourante()) redirect("/admin");
  const { mdp } = await searchParams;
  return (
    <div className="mx-auto max-w-sm space-y-4 py-10">
      <h1 className="text-3xl">Connexion admin</h1>
      {mdp ? <p className="encart">Mot de passe changé : reconnectez-vous.</p> : null}
      <FormulaireConnexion />
      <p className="aide">Un seul compte, pas d&apos;inscription publique.</p>
    </div>
  );
}
