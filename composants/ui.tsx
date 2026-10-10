"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Niveau } from "@/lib/contenu/types";

export function PiluleNiveau({ niveau, libelle, requis }: { niveau: Niveau | null | undefined; libelle?: string; requis?: Niveau }) {
  if (!niveau) return <span className="pilule">non mesuré</span>;
  const nom = libelle ?? ["", "Insuffisant", "Partiel", "Attendu", "Remarquable"][niveau];
  return (
    <span className={`pilule pilule-niveau-${niveau}`} title={requis ? `Niveau requis : ${requis}` : undefined}>
      Niveau {niveau} · {nom}
      {requis !== undefined ? (niveau >= requis ? " ✓" : " ·") : ""}
    </span>
  );
}

export function Chargement({ texte = "Chargement…" }: { texte?: string }) {
  return (
    <p className="aide" role="status" aria-live="polite">
      {texte}
    </p>
  );
}

export function Vide({ titre, texte, action }: { titre: string; texte?: string; action?: ReactNode }) {
  return (
    <div className="carte text-center space-y-3 py-10">
      <h2 className="text-2xl">{titre}</h2>
      {texte ? <p className="text-texte-2 max-w-[36rem] mx-auto">{texte}</p> : null}
      {action}
    </div>
  );
}

export function FilAriane({ elements }: { elements: { href?: string; libelle: string }[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-sm text-texte-2 no-print">
      <ol className="flex flex-wrap gap-1">
        {elements.map((e, i) => (
          <li key={i} className="flex gap-1">
            {i > 0 ? <span aria-hidden="true">›</span> : null}
            {e.href ? (
              <Link href={e.href} className="underline">
                {e.libelle}
              </Link>
            ) : (
              <span aria-current="page">{e.libelle}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Onglets({ onglets, actif }: { onglets: { href: string; libelle: string; etat?: string }[]; actif: string }) {
  return (
    <nav aria-label="Onglets" className="no-print -mx-4 px-4 overflow-x-auto">
      <ul className="flex gap-1 border-b border-bord min-w-max">
        {onglets.map((o) => {
          const estActif = o.href === actif;
          return (
            <li key={o.href}>
              <Link
                href={o.href}
                aria-current={estActif ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 px-3 border-b-2 font-medium ${
                  estActif ? "border-accent text-texte" : "border-transparent text-texte-2 hover:text-texte"
                }`}
              >
                {o.libelle}
                {o.etat ? <span className="pilule text-xs">{o.etat}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Message({ type = "info", children }: { type?: "info" | "alerte" | "succes"; children: ReactNode }) {
  return (
    <div role={type === "alerte" ? "alert" : "status"} className={`encart ${type === "alerte" ? "encart-alerte" : ""} ${type === "succes" ? "border-l-lime" : ""}`}>
      {children}
    </div>
  );
}

export function Bouton({
  children,
  variante = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "" | "principal" | "encre" | "discret" | "alerte" }) {
  return (
    <button type={type} className={`bouton ${variante ? `bouton-${variante}` : ""} ${props.className ?? ""}`} {...props}>
      {children}
    </button>
  );
}

export function formaterDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function formaterDateHeure(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Télécharge un texte comme fichier, sans rien envoyer au serveur. */
export function telecharger(nom: string, contenu: string, type = "application/json"): void {
  const blob = new Blob([contenu], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function lireFichier(fichier: File): Promise<string> {
  return fichier.text();
}

export async function copier(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return false;
  }
}
