"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDonnees } from "@/composants/donnees/FournisseurDonnees";
import { Chargement, Message } from "@/composants/ui";
import { nouveauRecrutement, remplacerRecrutement } from "@/lib/stockage/recrutements";
import { PanneauBesoin } from "@/composants/metiers/PanneauBesoin";

export function NouveauRecrutement() {
  const { catalogue, pret, packDe, modifier, etatCatalogue, etat } = useDonnees();
  const params = useSearchParams();
  const router = useRouter();
  const metierId = params.get("metier");
  const [choix, setChoix] = useState(metierId ?? "");
  const [poste, setPoste] = useState("");
  const lance = useRef(false);

  // Avec ?metier=, on crée directement et on ouvre « Préparer ».
  useEffect(() => {
    if (!pret || !catalogue || !metierId || lance.current) return;
    const pack = packDe(metierId);
    if (!pack) return;
    lance.current = true;
    const r = nouveauRecrutement({ pack, base: catalogue.base });
    void modifier((e) => remplacerRecrutement(e, r)).then(() => router.replace(`/recrutements/${r.id}/preparer/poste`));
  }, [pret, catalogue, metierId, packDe, modifier, router]);

  if (!pret) return <Chargement />;
  if (!catalogue) return <Message type="alerte">{etatCatalogue.texte}</Message>;
  if (metierId && packDe(metierId)) return <Chargement texte="Création du recrutement…" />;

  const metiers = [...catalogue.metiers.map((m) => ({ id: m.id, nom: m.nom })), ...(etat?.metiers_importes ?? []).filter((p) => !catalogue.metiers.some((m) => m.id === p.id)).map((p) => ({ id: p.id, nom: p.nom }))].sort((a, b) =>
    a.nom.localeCompare(b.nom, "fr"),
  );

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    const pack = packDe(choix);
    if (!pack || !catalogue) return;
    const r = nouveauRecrutement({ pack, base: catalogue.base, poste: poste.trim() || undefined });
    await modifier((et) => remplacerRecrutement(et, r));
    router.push(`/recrutements/${r.id}/preparer/poste`);
  }

  return (
    <div className="tel:grid tel:grid-cols-[1fr_320px] tel:gap-8">
      <form onSubmit={creer} className="space-y-5 max-w-[36rem]">
        <h1 className="text-4xl">Créer un recrutement</h1>
        {metierId ? <Message type="alerte">Le métier « {metierId} » n&apos;est pas dans le catalogue. Choisissez-en un.</Message> : null}
        <label className="block">
          <span className="etiquette">Le métier</span>
          <select className="champ" value={choix} onChange={(e) => setChoix(e.target.value)} required>
            <option value="">Choisir un métier…</option>
            {metiers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="etiquette">L&apos;intitulé du poste (facultatif)</span>
          <input className="champ" value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="Par exemple : Serveur du soir, brasserie du centre" />
        </label>
        <button type="submit" className="bouton bouton-principal" disabled={!choix}>
          Créer et préparer
        </button>
      </form>
      <PanneauBesoin />
    </div>
  );
}
