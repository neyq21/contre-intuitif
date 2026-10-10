import { exigerAdmin } from "@/lib/admin/session";
import { FormulaireMotDePasse } from "@/composants/admin/FormulaireMotDePasse";

export const dynamic = "force-dynamic";

export default async function PageCompte() {
  const admin = await exigerAdmin();
  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-3xl">Compte</h1>
      <p className="text-texte-2">{admin.email}</p>
      <FormulaireMotDePasse />
    </div>
  );
}
