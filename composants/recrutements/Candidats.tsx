"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bouton, Chargement, Message, formaterDate, lireFichier } from "@/composants/ui";
import { decoderCode, importerReponses, lireJson } from "@/lib/fichiers/formats";
import { figer, nouveauCandidat, rattacherReponses, remplacerRecrutement } from "@/lib/stockage/recrutements";
import type { Candidat } from "@/lib/stockage/modele";
import { useRecrutement } from "./useRecrutement";
import { LienAnnonce } from "./LienAnnonce";

const DECISIONS = { retenu: "Retenu", non_retenu: "Non retenu", vivier: "Vivier", en_attente: "En attente" } as const;

export function Candidats({ id }: { id: string }) {
  const { pret, recrutement: r, candidats, pack, base, modifier } = useRecrutement(id);
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<Candidat["mode"]>("ecran");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ type: "info" | "alerte"; texte: string } | null>(null);
  const [importPour, setImportPour] = useState<string>("");

  if (!pret) return <Chargement />;
  if (!r || !base) return <Chargement texte="Catalogue en cours de chargement…" />;

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    const c = nouveauCandidat(id, nom, mode, email);
    await modifier((et) => {
      et.candidats.push(c);
    });
    setNom("");
    setEmail("");
    if (mode === "distance") router.push(`/recrutements/${id}/candidats/${c.id}/epreuve`);
  }

  async function commencerSurEcran(c: Candidat) {
    if (!r) return;
    if (!r.epreuve && !pack) {
      setMessage({ type: "alerte", texte: "Le métier n'est pas disponible : impossible de figer l'épreuve." });
      return;
    }
    await modifier((et) => {
      const courant = et.recrutements.find((x) => x.id === id);
      if (!courant) return;
      if (!courant.epreuve && pack) remplacerRecrutement(et, figer(courant, pack, base!));
      const cand = et.candidats.find((x) => x.id === c.id);
      if (cand) cand.commence = true;
    });
    router.push(`/passer/${id}/${c.id}`);
  }

  async function importerRetour(valeur: unknown) {
    const res = importerReponses(valeur);
    if (!res.ok) {
      setMessage({ type: "alerte", texte: res.erreur });
      return;
    }
    if (res.valeur.recrutement_id && res.valeur.recrutement_id !== id) {
      setMessage({ type: "alerte", texte: "Ces réponses concernent un autre recrutement." });
      return;
    }
    let avert: string | null = null;
    let nomCand = "";
    await modifier((et) => {
      const courant = et.recrutements.find((x) => x.id === id);
      if (!courant) return;
      const { candidat, avertissement } = rattacherReponses(et, courant, res.valeur, importPour || undefined);
      avert = avertissement;
      nomCand = candidat.nom;
    });
    setCode("");
    setMessage({ type: avert ? "alerte" : "info", texte: avert ?? `Réponses de ${nomCand} importées.` });
  }

  async function importerCode(e: React.FormEvent) {
    e.preventDefault();
    const res = await decoderCode(code);
    if (!res.ok) {
      setMessage({ type: "alerte", texte: res.erreur });
      return;
    }
    await importerRetour(res.valeur);
  }

  async function importerFichier(f: File | undefined) {
    if (!f) return;
    const json = lireJson(await lireFichier(f));
    if (!json.ok) {
      setMessage({ type: "alerte", texte: json.erreur });
      return;
    }
    await importerRetour(json.valeur);
  }

  return (
    <div className="space-y-6">
      {message ? <Message type={message.type}>{message.texte}</Message> : null}

      <section className="carte space-y-3 max-w-[44rem]">
        <h2 className="text-2xl">Ajouter une personne</h2>
        <p className="aide">Un prénom ou un code suffit. L&apos;identité reste sur cet ordinateur.</p>
        <form onSubmit={ajouter} className="grid gap-3 tel:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="etiquette">Prénom ou code</span>
            <input className="champ" value={nom} onChange={(e) => setNom(e.target.value)} required />
          </label>
          <label className="block">
            <span className="etiquette">E-mail (facultatif, pour préremplir l&apos;envoi)</span>
            <input className="champ" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <div className="flex flex-col gap-1">
            <span className="etiquette">Comment</span>
            <div className="flex gap-1" role="radiogroup" aria-label="Mode">
              <button type="button" role="radio" aria-checked={mode === "ecran"} className={`bouton ${mode === "ecran" ? "bouton-principal" : ""}`} onClick={() => setMode("ecran")}>
                Sur cet écran
              </button>
              <button type="button" role="radio" aria-checked={mode === "distance"} className={`bouton ${mode === "distance" ? "bouton-principal" : ""}`} onClick={() => setMode("distance")}>
                À distance
              </button>
            </div>
          </div>
          <Bouton type="submit" variante="encre" className="tel:col-span-3 w-fit">
            Ajouter
          </Bouton>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">
          {candidats.length} candidat{candidats.length > 1 ? "s" : ""}
        </h2>
        {!candidats.length ? <p className="aide">Aucune personne pour l&apos;instant.</p> : null}
        <ul className="space-y-2">
          {candidats.map((c) => {
            const etat = c.reponses ? "Épreuve rendue" : c.commence ? "Épreuve commencée" : c.mode === "distance" ? "À distance, en attente" : "Sur cet écran, à passer";
            const evalue = Object.keys(c.evaluations).length > 0;
            return (
              <li key={c.id} className="carte flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[12rem]">
                  <Link href={`/recrutements/${id}/candidats/${c.id}/epreuve`} className="text-xl font-titre hover:underline">
                    {c.nom}
                  </Link>
                  <p className="text-sm text-texte-2">
                    {etat}
                    {c.reponses ? ` le ${formaterDate(c.reponses.rendu_le)}` : ""}
                    {evalue ? " · évalué" : ""}
                    {c.decision ? ` · ${DECISIONS[c.decision.statut]}` : ""}
                    {c.besoins.liste.length || c.besoins.autre ? " · besoin signalé" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!c.reponses ? (
                    c.mode === "ecran" ? (
                      <Bouton variante="principal" onClick={() => commencerSurEcran(c)}>
                        {c.commence ? "Reprendre l'épreuve" : "Passer l'épreuve sur cet écran"}
                      </Bouton>
                    ) : (
                      <Link href={`/recrutements/${id}/candidats/${c.id}/epreuve`} className="bouton bouton-principal">
                        Envoyer l&apos;épreuve
                      </Link>
                    )
                  ) : (
                    <Link href={`/recrutements/${id}/candidats/${c.id}/analyse`} className="bouton bouton-principal">
                      Analyse
                    </Link>
                  )}
                  <Link href={`/recrutements/${id}/candidats/${c.id}/entretien`} className="bouton">
                    Entretien
                  </Link>
                  <Link href={`/recrutements/${id}/candidats/${c.id}/decision`} className="bouton">
                    Décision
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="carte space-y-3 max-w-[44rem]">
        <h2 className="text-2xl">Importer des réponses reçues</h2>
        <p className="aide">Collez le code CI5Z-… envoyé par la personne, ou importez son fichier de réponses. Tout se range tout seul.</p>
        <label className="block">
          <span className="etiquette">Pour qui ? (facultatif : sinon le prénom du fichier est utilisé)</span>
          <select className="champ" value={importPour} onChange={(e) => setImportPour(e.target.value)}>
            <option value="">— Reconnaître automatiquement —</option>
            {candidats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>
        <form onSubmit={importerCode} className="space-y-2">
          <label className="block">
            <span className="etiquette">Code CI5Z-…</span>
            <textarea className="champ font-mono text-sm" rows={3} value={code} onChange={(e) => setCode(e.target.value)} placeholder="CI5Z-…" />
          </label>
          <Bouton type="submit" disabled={!code.trim()}>
            Importer le code
          </Bouton>
        </form>
        <label className="block">
          <span className="etiquette">Ou le fichier de réponses (.json)</span>
          <input type="file" accept="application/json,.json" className="champ" onChange={(e) => importerFichier(e.target.files?.[0])} />
        </label>
      </section>

      <LienAnnonce r={r} base={base} pack={pack} />

      <p className="aide">
        Lien privé du recrutement (cet ordinateur seulement) :{" "}
        <Link href={`/recrutements/${id}/candidats`} className="underline">
          {typeof window !== "undefined" ? `${window.location.origin}/recrutements/${id}/candidats` : `/recrutements/${id}/candidats`}
        </Link>
        . Il ouvre les données locales ; il n&apos;expose rien sur le serveur.
      </p>
    </div>
  );
}
