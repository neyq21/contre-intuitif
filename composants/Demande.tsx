"use client";

/** « Demander un métier » : le formulaire envoie au serveur uniquement ses champs. Jamais un recrutement. */
import { useState } from "react";
import { Bouton, Message, copier } from "@/composants/ui";

const CHAMPS = [
  { id: "intitule", libelle: "Intitulé du métier", aide: "Par exemple : Pharmacien / Pharmacienne d'officine", lignes: 1, requis: true },
  { id: "contexte", libelle: "Le contexte", aide: "Le lieu, l'équipe, les horaires, le type de structure.", lignes: 3, requis: true },
  { id: "taches", libelle: "Les tâches principales", aide: "Ce que la personne fait une journée ordinaire, et les situations délicates.", lignes: 4, requis: true },
  { id: "contraintes", libelle: "Les contraintes et les règles", aide: "Sécurité, hygiène, règles de la maison, outils utilisés.", lignes: 3, requis: true },
  { id: "nom", libelle: "Votre prénom et nom", aide: "", lignes: 1, requis: true },
  { id: "entreprise", libelle: "Votre entreprise (facultatif)", aide: "", lignes: 1, requis: false },
  { id: "email", libelle: "Votre e-mail", aide: "Pour recevoir le fichier du métier à importer.", lignes: 1, requis: true },
  { id: "telephone", libelle: "Téléphone (facultatif)", aide: "", lignes: 1, requis: false },
] as const;

export function Demande({ promesse, delai, objectif, lot, contact, email }: { promesse: string; delai: string; objectif: number; lot: number; contact: string; email: string }) {
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [etat, setEtat] = useState<{ type: "info" | "alerte" | "succes"; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [copie, setCopie] = useState(false);

  const texteDemande = CHAMPS.map((c) => `${c.libelle} : ${valeurs[c.id] ?? ""}`).join("\n");

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setEtat(null);
    try {
      const rep = await fetch("/api/demandes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valeurs) });
      const json = (await rep.json()) as { id?: string; statut?: string; erreur?: string };
      if (!rep.ok) throw new Error(json.erreur ?? "Erreur");
      setEtat({
        type: "succes",
        texte:
          json.statut === "recue"
            ? `Demande reçue (référence ${json.id}). Le métier est créé sous ${delai} après réception d'une demande complète : vous recevrez un fichier .json à importer dans « Données et réglages ».`
            : `Demande reçue (référence ${json.id}), mais incomplète : le délai de ${delai} court à partir d'une demande complète. Nous reviendrons vers vous.`,
      });
      setValeurs({});
    } catch (err) {
      setEtat({ type: "alerte", texte: `${err instanceof Error ? err.message : "Envoi impossible"}. Vous pouvez aussi copier votre demande et l'envoyer par la page contact.` });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[44rem]">
      <header className="space-y-2">
        <h1 className="text-4xl">Demander un métier</h1>
        <p className="text-texte-2">{promesse}</p>
        <p className="aide">
          Objectif {objectif} métiers, par lots de {lot}, sans engagement de date. Vous recevez un fichier .json à importer : « Données et réglages » → « Importer un métier ».
        </p>
      </header>
      {etat ? <Message type={etat.type}>{etat.texte}</Message> : null}
      <form onSubmit={envoyer} className="space-y-4">
        {CHAMPS.map((c) => (
          <label key={c.id} className="block">
            <span className="etiquette">
              {c.libelle}
              {c.requis ? " *" : ""}
            </span>
            {c.lignes > 1 ? (
              <textarea className="champ" rows={c.lignes} required={c.requis} value={valeurs[c.id] ?? ""} onChange={(e) => setValeurs({ ...valeurs, [c.id]: e.target.value })} />
            ) : (
              <input className="champ" type={c.id === "email" ? "email" : c.id === "telephone" ? "tel" : "text"} required={c.requis} value={valeurs[c.id] ?? ""} onChange={(e) => setValeurs({ ...valeurs, [c.id]: e.target.value })} />
            )}
            {c.aide ? <span className="aide block">{c.aide}</span> : null}
          </label>
        ))}
        <p className="aide">Seuls ces champs sont envoyés. Jamais vos recrutements, jamais vos candidats.</p>
        <div className="flex flex-wrap gap-2">
          <Bouton type="submit" variante="principal" disabled={envoi}>
            Envoyer la demande
          </Bouton>
          <Bouton
            onClick={async () => {
              setCopie(await copier(texteDemande));
              setTimeout(() => setCopie(false), 2000);
            }}
          >
            {copie ? "Copié" : "Copier la demande"}
          </Bouton>
        </div>
      </form>
      <p className="text-sm text-texte-2">
        Vous pouvez aussi envoyer la demande copiée par la{" "}
        <a href={contact} className="underline" rel="noreferrer">
          page contact du site
        </a>
        , par e-mail à {email}, ou en message privé Instagram.
      </p>
    </div>
  );
}
