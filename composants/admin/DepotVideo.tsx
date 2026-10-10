"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DepotVideo() {
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const router = useRouter();
  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fichier = (e.currentTarget.elements.namedItem("fichier") as HTMLInputElement).files?.[0];
    if (!fichier) return;
    setEnCours(true);
    setMessage(null);
    try {
      const rep = await fetch("/api/admin/video", { method: "POST", headers: { "Content-Type": fichier.type || "video/mp4" }, body: fichier });
      const json = (await rep.json()) as { ok?: boolean; erreur?: string };
      if (!rep.ok) throw new Error(json.erreur ?? "Dépôt impossible");
      setMessage("Vidéo déposée.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Dépôt impossible");
    } finally {
      setEnCours(false);
    }
  }
  return (
    <form onSubmit={envoyer} className="carte flex flex-wrap items-end gap-3">
      <label className="flex-1 min-w-[16rem]">
        <span className="etiquette">Fichier MP4</span>
        <input name="fichier" type="file" accept="video/mp4" className="champ" required />
      </label>
      <button type="submit" className="bouton" disabled={enCours}>
        {enCours ? "Envoi…" : "Déposer"}
      </button>
      {message ? (
        <p role="status" className="basis-full text-sm">
          {message}
        </p>
      ) : null}
    </form>
  );
}
