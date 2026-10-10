"use client";

/**
 * Lien personnel chiffré : le paquet (sans corrigé) est chiffré dans ce navigateur
 * (AES-GCM) ; la clé reste dans le fragment d'URL (#k=…) et n'est jamais envoyée.
 * Le serveur ne stocke que le blob chiffré et une date d'expiration.
 * Implémenté en phase 2.
 */
import { useState } from "react";
import { Bouton, Message, copier, formaterDate } from "@/composants/ui";
import type { Base, Pack } from "@/lib/contenu/types";
import { paquetCandidat } from "@/lib/methode/epreuve";
import { chiffrerPaquet } from "@/lib/fichiers/chiffrement";
import type { Candidat, Recrutement } from "@/lib/stockage/modele";
import type { ModifierCandidat } from "./FicheCandidat";

export function LienChiffre({
  r,
  candidat,
  base,
  pack,
  modifierCandidat,
  assurerFigee,
  emailRetour,
}: {
  r: Recrutement;
  candidat: Candidat;
  base: Base;
  pack: Pack | null;
  modifierCandidat: ModifierCandidat;
  assurerFigee: () => Promise<Recrutement | null>;
  emailRetour?: string;
}) {
  const [etat, setEtat] = useState<{ type: "info" | "alerte"; texte: string } | null>(null);
  const [copie, setCopie] = useState(false);
  const besoin = candidat.besoins.liste.length > 0 || candidat.besoins.autre.trim().length > 0;

  async function creerLien() {
    setEtat(null);
    const rec = await assurerFigee();
    if (!rec?.epreuve) {
      setEtat({ type: "alerte", texte: "Impossible de figer l'épreuve : métier indisponible." });
      return;
    }
    const paquet = paquetCandidat(rec.epreuve, base, rec.id, { id: candidat.id, nom: candidat.nom }, { deroule: rec.deroule && !besoin, emailRetour });
    try {
      const { blob, cle } = await chiffrerPaquet(paquet);
      const rep = await fetch("/api/epreuves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blob }) });
      if (!rep.ok) throw new Error(String(rep.status));
      const { token, expire_le } = (await rep.json()) as { token: string; expire_le: string };
      const url = `${window.location.origin}/e/${token}#k=${cle}`;
      await modifierCandidat((c) => {
        c.lien = { token, url, expire_le };
        c.commence = true;
      });
      setEtat({ type: "info", texte: "Lien créé. Il n'est lisible qu'avec la clé contenue dans l'adresse : gardez-le pour cette personne." });
    } catch {
      setEtat({ type: "alerte", texte: "Le serveur est injoignable : utilisez le fichier d'épreuve ci-dessous, comme le prévoit la licence." });
    }
  }

  return (
    <section className="carte space-y-3">
      <h3 className="text-xl">Lien personnel</h3>
      <p className="text-sm text-texte-2">
        L&apos;épreuve est chiffrée dans votre navigateur ; la clé reste dans le lien (après le #) et n&apos;est jamais envoyée au serveur, qui ne garde que le contenu chiffré pendant 90 jours. Aucune réponse ne passe par le serveur.
      </p>
      {candidat.lien ? (
        <div className="space-y-2">
          <p className="break-all rounded-s bg-surface-2 p-3 text-sm font-mono">{candidat.lien.url}</p>
          <p className="aide">Expire le {formaterDate(candidat.lien.expire_le)}.</p>
          <div className="flex flex-wrap gap-2">
            <Bouton
              onClick={async () => {
                setCopie(await copier(candidat.lien!.url));
                setTimeout(() => setCopie(false), 2000);
              }}
            >
              {copie ? "Copié" : "Copier le lien"}
            </Bouton>
            <Bouton variante="discret" onClick={creerLien}>
              Créer un nouveau lien
            </Bouton>
          </div>
        </div>
      ) : (
        <Bouton variante="principal" onClick={creerLien} disabled={!r.epreuve && !pack}>
          Créer le lien personnel
        </Bouton>
      )}
      {etat ? <Message type={etat.type}>{etat.texte}</Message> : null}
    </section>
  );
}
