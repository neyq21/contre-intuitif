"use client";

/**
 * Lien ouvert à tous, pour une annonce : même épreuve chiffrée, sans prénom prérempli,
 * jamais de déroulé. La personne indique un prénom ou un code au début.
 */
import { useState } from "react";
import { useDonnees } from "@/composants/donnees/FournisseurDonnees";
import { Bouton, Message, copier, formaterDate } from "@/composants/ui";
import type { Base, Pack } from "@/lib/contenu/types";
import { chiffrerPaquet } from "@/lib/fichiers/chiffrement";
import { paquetCandidat } from "@/lib/methode/epreuve";
import { figer, remplacerRecrutement } from "@/lib/stockage/recrutements";
import type { Recrutement } from "@/lib/stockage/modele";

export function LienAnnonce({ r, base, pack }: { r: Recrutement; base: Base; pack: Pack | null }) {
  const { modifier, etat } = useDonnees();
  const [message, setMessage] = useState<{ type: "info" | "alerte"; texte: string } | null>(null);
  const [copie, setCopie] = useState(false);

  async function creer() {
    setMessage(null);
    let rec: Recrutement | null = r;
    if (!rec.epreuve) {
      if (!pack) return setMessage({ type: "alerte", texte: "Métier indisponible : impossible de figer l'épreuve." });
      rec = figer(rec, pack, base);
    }
    const paquet = paquetCandidat(rec.epreuve!, base, rec.id, null, { deroule: false, emailRetour: etat?.reglages.email_retour?.trim() || undefined });
    try {
      const { blob, cle } = await chiffrerPaquet(paquet);
      const rep = await fetch("/api/epreuves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blob }) });
      if (!rep.ok) throw new Error(String(rep.status));
      const { token, expire_le } = (await rep.json()) as { token: string; expire_le: string };
      const url = `${window.location.origin}/e/${token}#k=${cle}`;
      const final = { ...rec, lien_annonce: { token, url, expire_le } };
      await modifier((e) => remplacerRecrutement(e, final));
      setMessage({ type: "info", texte: "Lien d'annonce créé. Chaque personne qui l'ouvre indique son prénom ou un code ; le déroulé n'est jamais proposé avec ce lien." });
    } catch {
      setMessage({ type: "alerte", texte: "Serveur injoignable : le lien d'annonce ne peut pas être créé pour l'instant." });
    }
  }

  return (
    <section className="carte space-y-3 max-w-[44rem]">
      <h2 className="text-2xl">Lien ouvert à tous (pour une annonce)</h2>
      <p className="aide">Un seul lien, le même pour tout le monde, à mettre dans votre offre d&apos;emploi. Les réponses reviennent par code ou fichier, avec le prénom ou le code indiqué par la personne. Jamais de déroulé avec ce lien.</p>
      {r.lien_annonce ? (
        <div className="space-y-2">
          <p className="break-all rounded-s bg-surface-2 p-3 text-sm font-mono">{r.lien_annonce.url}</p>
          <p className="aide">Expire le {formaterDate(r.lien_annonce.expire_le)}.</p>
          <div className="flex flex-wrap gap-2">
            <Bouton
              onClick={async () => {
                setCopie(await copier(r.lien_annonce!.url));
                setTimeout(() => setCopie(false), 2000);
              }}
            >
              {copie ? "Copié" : "Copier le lien"}
            </Bouton>
            <Bouton variante="discret" onClick={creer}>
              Nouveau lien
            </Bouton>
          </div>
        </div>
      ) : (
        <Bouton onClick={creer} disabled={!r.epreuve && !pack}>
          Créer le lien d&apos;annonce
        </Bouton>
      )}
      {message ? <Message type={message.type}>{message.texte}</Message> : null}
    </section>
  );
}
