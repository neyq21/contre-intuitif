import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdmin } from "@/lib/admin/session";
import { lireBase, ouvrirBase } from "@/lib/stockage/sqlite";
import { SECTIONS_BASE } from "@/composants/admin/sections";
import { EditeurSection } from "@/composants/admin/EditeurSection";
import type { Valeur } from "@/composants/admin/EditeurStructure";

export const dynamic = "force-dynamic";

export default async function PageSection({ params }: { params: Promise<{ section: string }> }) {
  await exigerAdmin();
  const { section } = await params;
  const s = SECTIONS_BASE.find((x) => x.id === section);
  if (!s) notFound();
  const base = lireBase(ouvrirBase());
  const valeur = base[s.id as keyof typeof base] as unknown as Valeur;
  return (
    <div className="space-y-4">
      <Link href="/admin/textes" className="text-sm underline">
        ← Textes et barèmes
      </Link>
      <h1 className="text-3xl">{s.libelle}</h1>
      <p className="aide">{s.description}</p>
      {s.notes ? <p className="encart encart-alerte">Attention : cette modification change des notes futures. Les recrutements déjà figés ne sont pas recalculés tout seuls.</p> : null}
      <EditeurSection section={s.id} initial={valeur} />
    </div>
  );
}
