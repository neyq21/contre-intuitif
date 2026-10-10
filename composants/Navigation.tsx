"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ambiance } from "./Ambiance";

const ENTREES = [
  { href: "/", libelle: "Accueil", icone: "⌂" },
  { href: "/metiers", libelle: "Métiers", icone: "▤" },
  { href: "/recrutements", libelle: "Recrutements", icone: "◎" },
  { href: "/guide", libelle: "Guide", icone: "§" },
  { href: "/donnees", libelle: "Données", icone: "⛁" },
] as const;

function actif(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/** Rail à gauche sur ordinateur (248 px), barre basse de 5 entrées sur téléphone. */
export function Navigation({ marque, slogan }: { marque: string; slogan: string }) {
  const pathname = usePathname();
  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="rail no-print hidden tel:flex fixed inset-y-0 left-0 w-[var(--rail)] flex-col border-r border-bord bg-surface px-4 py-5 gap-1 overflow-y-auto"
      >
        <Link href="/" className="mb-5 block rounded-s px-2 py-1">
          <span className="block font-titre text-2xl leading-tight">La méthode des 5 portes</span>
          <span className="block text-sm text-texte-2">{marque}</span>
        </Link>
        {ENTREES.map((e) => {
          const estActif = actif(pathname, e.href);
          return (
            <Link
              key={e.href}
              href={e.href}
              aria-current={estActif ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-pilule px-3 font-medium ${
                estActif ? "bg-accent-fond text-accent-fond-texte" : "hover:bg-surface-2"
              }`}
            >
              <span aria-hidden="true" className="w-5 text-center">
                {e.icone}
              </span>
              {e.libelle}
            </Link>
          );
        })}
        <Link href="/demande" className="mt-2 flex min-h-11 items-center gap-3 rounded-pilule px-3 text-texte-2 hover:bg-surface-2">
          <span aria-hidden="true" className="w-5 text-center">
            +
          </span>
          Demander un métier
        </Link>
        <div className="mt-auto pt-4 border-t border-bord space-y-3">
          <Ambiance />
          <p className="text-xs text-texte-3 italic font-titre text-base">{slogan}</p>
          <p className="text-xs text-texte-3">
            <Link href="/licence" className="underline">
              Licence
            </Link>
            {" · "}
            <Link href="/admin" className="underline">
              Admin
            </Link>
          </p>
        </div>
      </nav>
      <nav
        aria-label="Navigation principale"
        className="barre-basse no-print tel:hidden fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-bord bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        {ENTREES.map((e) => {
          const estActif = actif(pathname, e.href);
          return (
            <Link
              key={e.href}
              href={e.href}
              aria-current={estActif ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                estActif ? "text-accent" : "text-texte-2"
              }`}
            >
              <span aria-hidden="true" className={`text-lg leading-none ${estActif ? "rounded-pilule bg-accent-fond px-3 text-accent-fond-texte" : ""}`}>
                {e.icone}
              </span>
              {e.libelle}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
