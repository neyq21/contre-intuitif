import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdmin } from "@/lib/admin/session";
import { lireBase, lireMetier, ouvrirBase } from "@/lib/stockage/sqlite";
import { EditeurMetier } from "@/composants/admin/EditeurMetier";
import { formaterDateHeure } from "@/lib/ui/dates";

export const dynamic = "force-dynamic";

export default async function PageMetier({ params }: { params: Promise<{ id: string }> }) {
  await exigerAdmin();
  const { id } = await params;
  const db = ouvrirBase();
  const m = lireMetier(db, id);
  if (!m) notFound();
  const base = lireBase(db);
  return (
    <div className="space-y-4">
      <Link href="/admin/catalogue" className="text-sm underline">
        ← Catalogue
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{m.nom}</h1>
        <span className={`pilule ${m.statut === "publie" ? "pilule-niveau-3" : "pilule-niveau-2"}`}>{m.statut === "publie" ? "Publié" : "Brouillon"}</span>
        <span className="text-sm text-texte-2">
          version {m.version} · modifié le {formaterDateHeure(m.modifie_le)}
        </span>
      </div>
      {m.statut === "publie" ? (
        <p className="encart text-sm">
          Ce métier est publié : chaque enregistrement augmente sa version et republie le catalogue. Un recrutement dont l&apos;épreuve a commencé garde les questions figées qu&apos;il a déjà copiées en local ; les suivants prendront la nouvelle version.
        </p>
      ) : null}
      <EditeurMetier initial={m.pack} base={base} statut={m.statut} />
    </div>
  );
}
