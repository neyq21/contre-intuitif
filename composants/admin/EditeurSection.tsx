"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditeurStructure, type Valeur } from "./EditeurStructure";

export function EditeurSection({ section, initial }: { section: string; initial: Valeur }) {
  const router = useRouter();
  const [valeur, setValeur] = useState<Valeur>(initial);
  const [message, setMessage] = useState<{ type: "info" | "alerte"; texte: string } | null>(null);
  const [json, setJson] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const modifie = JSON.stringify(valeur) !== JSON.stringify(initial);

  async function enregistrer() {
    setEnCours(true);
    setMessage(null);
    try {
      const rep = await fetch("/api/admin/base", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section, valeur }) });
      const res = (await rep.json()) as { ok?: boolean; erreur?: string; erreurs?: string[] };
      if (!rep.ok) throw new Error([res.erreur, ...(res.erreurs ?? [])].filter(Boolean).join("\n"));
      setMessage({ type: "info", texte: "Enregistré. Le catalogue a été republié." });
      router.refresh();
    } catch (e) {
      setMessage({ type: "alerte", texte: e instanceof Error ? e.message : "Enregistrement impossible" });
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 sticky top-0 z-10 bg-fond py-2 border-b border-bord">
        <button type="button" className="bouton bouton-encre min-h-9" disabled={!modifie || enCours} onClick={enregistrer}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" className="bouton bouton-discret min-h-9 text-sm" disabled={!modifie} onClick={() => setValeur(initial)}>
          Annuler les changements
        </button>
        <button type="button" className="bouton bouton-discret min-h-9 text-sm ml-auto" onClick={() => setJson(json === null ? JSON.stringify(valeur, null, 2) : null)}>
          {json === null ? "JSON avancé" : "Fermer le JSON"}
        </button>
      </div>
      {message ? (
        <p role={message.type === "alerte" ? "alert" : "status"} className={`encart whitespace-pre-wrap ${message.type === "alerte" ? "encart-alerte" : ""}`}>
          {message.texte}
        </p>
      ) : null}
      {json !== null ? (
        <div className="space-y-2">
          <textarea className="champ font-mono text-xs" rows={24} value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} />
          <button
            type="button"
            className="bouton"
            onClick={() => {
              try {
                setValeur(JSON.parse(json) as Valeur);
                setJson(null);
                setMessage({ type: "info", texte: "JSON appliqué (non enregistré)." });
              } catch {
                setMessage({ type: "alerte", texte: "Ce texte n'est pas un JSON lisible." });
              }
            }}
          >
            Appliquer le JSON
          </button>
        </div>
      ) : (
        <EditeurStructure valeur={valeur} onChange={setValeur} cle={section} />
      )}
    </div>
  );
}
