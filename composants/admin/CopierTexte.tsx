"use client";

import { useState } from "react";

export function CopierTexte({ texte, libelle }: { texte: string; libelle: string }) {
  const [etat, setEtat] = useState<"" | "ok" | "erreur">("");
  return (
    <button
      type="button"
      className="bouton"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texte);
          setEtat("ok");
        } catch {
          setEtat("erreur");
        }
        setTimeout(() => setEtat(""), 2000);
      }}
    >
      {etat === "ok" ? "Copié" : etat === "erreur" ? "Copie impossible" : libelle}
    </button>
  );
}
