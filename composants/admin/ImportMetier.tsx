"use client";

import { useActionState } from "react";
import { importerMetierAction } from "@/app/admin/actions";

export function ImportMetier() {
  const [etat, action, enCours] = useActionState(importerMetierAction, null);
  return (
    <form action={action} className="carte flex flex-wrap items-end gap-3">
      <label className="flex-1 min-w-[16rem]">
        <span className="etiquette">Importer un fichier ci5p-pack/3 (brouillon, ou mise à jour d&apos;un métier existant)</span>
        <input name="fichier" type="file" accept="application/json,.json" className="champ" required />
      </label>
      <button type="submit" className="bouton" disabled={enCours}>
        Importer
      </button>
      {etat?.message ? (
        <p role="status" className="basis-full whitespace-pre-wrap text-sm">
          {etat.message}
        </p>
      ) : null}
    </form>
  );
}
