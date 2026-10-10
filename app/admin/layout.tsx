import Link from "next/link";
import { sessionCourante } from "@/lib/admin/session";
import { deconnecter } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

const ENTREES = [
  { href: "/admin", libelle: "Tableau de bord" },
  { href: "/admin/catalogue", libelle: "Catalogue" },
  { href: "/admin/textes", libelle: "Textes et barèmes" },
  { href: "/admin/demandes", libelle: "Demandes de métier" },
  { href: "/admin/licences", libelle: "Licences" },
  { href: "/admin/journal", libelle: "Journal" },
  { href: "/admin/video", libelle: "Vidéo" },
  { href: "/admin/compte", libelle: "Compte" },
];

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const admin = await sessionCourante();
  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-bord bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/admin" className="font-titre text-xl">
            Studio de contenu · 5 portes
          </Link>
          {admin ? (
            <>
              <nav aria-label="Admin" className="flex flex-wrap gap-1 text-sm">
                {ENTREES.map((e) => (
                  <Link key={e.href} href={e.href} className="rounded-pilule px-3 py-2 hover:bg-surface-2">
                    {e.libelle}
                  </Link>
                ))}
              </nav>
              <form action={deconnecter} className="ml-auto flex items-center gap-2 text-sm">
                <span className="text-texte-2">{admin.email}</span>
                <button type="submit" className="bouton min-h-9 text-sm">
                  Se déconnecter
                </button>
              </form>
            </>
          ) : (
            <Link href="/" className="ml-auto text-sm underline">
              Retour à l&apos;application
            </Link>
          )}
        </div>
      </header>
      <main id="contenu" className="mx-auto w-full max-w-[1200px] px-4 py-6 flex-1">
        {children}
      </main>
      <footer className="px-4 py-3 text-xs text-texte-3 border-t border-bord">
        L&apos;admin ne voit jamais les réponses ni l&apos;identité des candidats : elles n&apos;existent pas sur ce serveur. Pas de traceur, un seul cookie : la session admin.
      </footer>
    </div>
  );
}
