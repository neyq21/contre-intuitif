import Link from "next/link";
import { exigerAdmin } from "@/lib/admin/session";
import { SECTIONS_BASE } from "@/composants/admin/sections";

export const dynamic = "force-dynamic";

export default async function PageTextes() {
  await exigerAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Textes et barèmes</h1>
      <p className="aide">Tout ce qui n&apos;est pas un métier. Chaque enregistrement republie le catalogue. Les barèmes, repères et le profil de travail changent des notes futures : les recrutements déjà figés ne sont pas recalculés.</p>
      <ul className="grid gap-2 tel:grid-cols-3">
        {SECTIONS_BASE.map((s) => (
          <li key={s.id}>
            <Link href={`/admin/textes/${s.id}`} className="carte block hover:bg-surface-2">
              <span className="block font-semibold">{s.libelle}</span>
              <span className="block text-sm text-texte-2">{s.description}</span>
              {s.notes ? <span className="block text-xs text-alerte-texte mt-1">Change des notes futures</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
