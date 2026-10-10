"use client";

import { useSyncExternalStore } from "react";

type AmbianceId = "papier" | "nuit";

// Petit magasin autour de localStorage, pour lire les réglages sans décalage d'hydratation.
const abonnes = new Set<() => void>();
function notifier() {
  abonnes.forEach((f) => f());
}
function abonner(f: () => void) {
  abonnes.add(f);
  window.addEventListener("storage", f);
  return () => {
    abonnes.delete(f);
    window.removeEventListener("storage", f);
  };
}

function lire(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}
function ecrire(cle: string, valeur: string): void {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
    /* navigation privée : on garde seulement l'état en mémoire */
  }
}

/** Réglages d'affichage : ambiance papier / nuit, mode lisible, mots clés. Stockés sur cet appareil. */
export function Ambiance({ compact = false }: { compact?: boolean }) {
  const ambiance = useSyncExternalStore<AmbianceId>(abonner, () => (lire("ci5p.ambiance") === "nuit" ? "nuit" : "papier"), () => "papier");
  const lisible = useSyncExternalStore(abonner, () => lire("ci5p.lisible") === "1", () => false);
  const motsCles = useSyncExternalStore(abonner, () => lire("ci5p.mots_cles") !== "0", () => true);

  function changerAmbiance(a: AmbianceId) {
    ecrire("ci5p.ambiance", a);
    document.documentElement.dataset.ambiance = a;
    notifier();
  }
  function changerLisible(v: boolean) {
    ecrire("ci5p.lisible", v ? "1" : "0");
    if (v) document.documentElement.dataset.lisible = "1";
    else delete document.documentElement.dataset.lisible;
    notifier();
  }
  function changerMotsCles(v: boolean) {
    ecrire("ci5p.mots_cles", v ? "1" : "0");
    if (v) delete document.documentElement.dataset.motsCles;
    else document.documentElement.dataset.motsCles = "0";
    notifier();
  }

  return (
    <div className={compact ? "flex flex-wrap gap-2 items-center" : "space-y-2"}>
      <div role="group" aria-label="Ambiance" className="flex gap-1">
        <button
          type="button"
          className={`bouton min-h-9 px-3 text-sm ${ambiance === "papier" ? "bouton-principal" : ""}`}
          aria-pressed={ambiance === "papier"}
          onClick={() => changerAmbiance("papier")}
        >
          Papier
        </button>
        <button
          type="button"
          className={`bouton min-h-9 px-3 text-sm ${ambiance === "nuit" ? "bouton-principal" : ""}`}
          aria-pressed={ambiance === "nuit"}
          onClick={() => changerAmbiance("nuit")}
        >
          Nuit
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm min-h-9">
        <input type="checkbox" checked={lisible} onChange={(e) => changerLisible(e.target.checked)} />
        Mode lisible
      </label>
      <label className="flex items-center gap-2 text-sm min-h-9">
        <input type="checkbox" checked={motsCles} onChange={(e) => changerMotsCles(e.target.checked)} />
        Mots clés surlignés
      </label>
    </div>
  );
}
