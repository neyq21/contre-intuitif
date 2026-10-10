"use client";

/**
 * L'épreuve côté candidat (sur place ou à distance). Reçoit un paquet sans corrigé,
 * rend des réponses au format ci5p-reponses/2. Jamais de chronomètre, jamais d'audio.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ambiance } from "@/composants/Ambiance";
import { Texte } from "@/composants/Texte";
import type { CodeCompetence, PorteId } from "@/lib/contenu/types";
import type { EvenementDeroule, PaquetCandidat, Reponses, ReponsesCompetence } from "@/lib/stockage/modele";
import { Document } from "./Document";
import { PorteCinq, PorteDeux, PorteQuatre, PorteTrois, PorteUn } from "./Portes";

type Ecran = { type: "accueil" } | { type: "competence"; index: number } | { type: "profil" } | { type: "verification" };

export interface EpreuveProps {
  paquet: PaquetCandidat;
  /** Réponses déjà commencées sur cet appareil (reprise). */
  initial?: Partial<Reponses>;
  onChange?: (partiel: Partial<Reponses>) => void;
  onTerminer: (reponses: Reponses) => void;
  /** Texte du bouton final. */
  libelleFin?: string;
}

const CLE_BROUILLON = (empreinte: string, cid: string | null) => `ci5p.epreuve.${empreinte}.${cid ?? "anonyme"}`;

function lireBrouillon(paquet: PaquetCandidat): Partial<Reponses> | null {
  if (typeof window === "undefined") return null;
  try {
    const brut = localStorage.getItem(CLE_BROUILLON(paquet.empreinte, paquet.candidat?.id ?? null));
    return brut ? (JSON.parse(brut) as Partial<Reponses>) : null;
  } catch {
    return null;
  }
}

export function Epreuve({ paquet, initial, onChange, onTerminer, libelleFin = "Terminer et rendre mes réponses" }: EpreuveProps) {
  const [ecran, setEcran] = useState<Ecran>({ type: "accueil" });
  // Reprise d'un brouillon laissé sur cet appareil (fermeture de l'onglet), sinon l'état initial.
  const [competences, setCompetences] = useState<Partial<Record<CodeCompetence, ReponsesCompetence>>>(() => initial?.competences ?? lireBrouillon(paquet)?.competences ?? {});
  const [profil, setProfil] = useState<Record<string, number | "nsp">>(
    () => (initial?.profil_travail as Record<string, number | "nsp">) ?? (lireBrouillon(paquet)?.profil_travail as Record<string, number | "nsp">) ?? {},
  );
  const [besoins, setBesoins] = useState<{ liste: string[]; autre: string }>(() => initial?.besoins ?? lireBrouillon(paquet)?.besoins ?? { liste: [], autre: "" });
  const [derouleAccepte, setDerouleAccepte] = useState<boolean>(initial?.deroule ? true : false);
  const [porteRegardee, setPorteRegardee] = useState<PorteId | null>(null);
  const deroule = useRef<EvenementDeroule[]>(initial?.deroule ?? []);
  const haut = useRef<HTMLDivElement>(null);

  // Le déroulé n'est jamais proposé à une personne qui a signalé un besoin d'aménagement.
  const besoinSignale = besoins.liste.length > 0 || besoins.autre.trim().length > 0;
  const derouleActif = paquet.deroule && derouleAccepte && !besoinSignale;

  const noter = useCallback(
    (ev: EvenementDeroule) => {
      if (!derouleActif) return;
      deroule.current = [...deroule.current, ev];
    },
    [derouleActif],
  );

  // Brouillon local (sur cet appareil seulement), mis à jour à chaque changement.
  useEffect(() => {
    const partiel: Partial<Reponses> = { competences, profil_travail: profil, besoins, deroule: derouleActif ? deroule.current : null };
    try {
      localStorage.setItem(CLE_BROUILLON(paquet.empreinte, paquet.candidat?.id ?? null), JSON.stringify(partiel));
    } catch {
      /* navigation privée */
    }
    onChange?.(partiel);
  }, [competences, profil, besoins, derouleActif, paquet.empreinte, paquet.candidat?.id, onChange]);

  useEffect(() => {
    haut.current?.focus();
    window.scrollTo({ top: 0 });
  }, [ecran]);

  const nb = paquet.competences.length;
  const indexCourant = ecran.type === "competence" ? ecran.index : -1;
  const comp = indexCourant >= 0 ? paquet.competences[indexCourant] : null;
  const repComp = comp ? competences[comp.code] : undefined;
  const portesDeComp = useMemo(() => (comp ? paquet.portes.filter((p) => comp.portes[p] !== undefined) : []), [comp, paquet.portes]);

  function terminer() {
    const reponses: Reponses = {
      schema: "ci5p-reponses/2",
      recrutement_id: paquet.recrutement_id,
      epreuve_empreinte: paquet.empreinte,
      candidat: { id: paquet.candidat?.id ?? null, nom: paquet.candidat?.nom ?? null },
      rendu_le: new Date().toISOString(),
      competences,
      profil_travail: paquet.profil_travail && Object.keys(profil).length ? profil : null,
      besoins: besoinSignale ? besoins : null,
      deroule: derouleActif ? deroule.current : null,
    };
    try {
      localStorage.removeItem(CLE_BROUILLON(paquet.empreinte, paquet.candidat?.id ?? null));
    } catch {
      /* rien */
    }
    onTerminer(reponses);
  }

  function choisirPorte(porte: PorteId) {
    if (!comp) return;
    const actuelle = repComp?.porte;
    if (actuelle && actuelle !== porte) noter({ type: "porte_changee", competence: comp.code, de: actuelle, vers: porte });
    else if (!actuelle) noter({ type: "porte_essayee", competence: comp.code, porte });
    setCompetences({ ...competences, [comp.code]: { ...(repComp ?? {}), porte } });
  }

  function majReponse(porte: PorteId, valeur: unknown, question: string) {
    if (!comp) return;
    const avant = repComp?.[porte];
    if (avant !== undefined) noter({ type: "reponse_changee", competence: comp.code, porte, question });
    setCompetences({ ...competences, [comp.code]: { ...(repComp ?? { porte }), porte, [porte]: valeur } });
  }

  function aller(e: Ecran, sens: "avant" | "arriere") {
    if (sens === "arriere" && comp) noter({ type: "retour", competence: comp.code });
    setEcran(e);
  }

  const texteporte = (id: PorteId) => paquet.textes.portes.find((p) => p.id === id);
  const repondu = (code: CodeCompetence): boolean => {
    const r = competences[code];
    if (!r?.porte) return false;
    const v = r[r.porte];
    if (v === undefined) return false;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) return Object.keys(v).length > 0;
    return true;
  };

  return (
    <div className="mx-auto max-w-[760px] space-y-6" ref={haut} tabIndex={-1}>
      <header className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <p className="text-sm text-texte-2">
            {paquet.textes.marque} · {paquet.poste || paquet.metier.nom}
          </p>
          {ecran.type === "competence" ? (
            <p className="font-medium" aria-live="polite">
              Situation {ecran.index + 1} sur {nb}
            </p>
          ) : null}
        </div>
        <details className="relative">
          <summary className="bouton min-h-11 list-none">Affichage</summary>
          <div className="absolute right-0 z-20 mt-2 w-64 carte shadow-carte">
            <Ambiance />
          </div>
        </details>
      </header>

      {ecran.type === "accueil" ? (
        <section className="space-y-5">
          <h1 className="text-3xl tel:text-4xl">
            {paquet.candidat?.nom ? `Bonjour ${paquet.candidat.nom}, ` : ""}voici votre épreuve pour le poste de {paquet.poste || paquet.metier.nom}
          </h1>
          <p className="text-texte-2">
            {nb} situation{nb > 1 ? "s" : ""} du métier. Pour chacune, vous choisissez la façon de répondre parmi les portes proposées. Toutes les portes visent le même niveau et sont notées avec la même grille : votre choix ne compte pas dans la note et ne sera pas commenté. Il n&apos;y a pas de chronomètre.
          </p>
          <ul className="grid gap-2">
            {paquet.portes.map((p) => {
              const t = texteporte(p);
              return t ? (
                <li key={p} className="carte p-3">
                  <span className="pilule mr-2">Porte {t.n}</span>
                  <strong>{t.nom}</strong>
                  <p className="text-sm text-texte-2 mt-1">{t.candidat}</p>
                </li>
              ) : null;
            })}
          </ul>

          <fieldset className="carte space-y-3">
            <legend className="font-ui font-semibold px-1">De quoi avez-vous besoin pour que l&apos;épreuve se passe bien ? (facultatif)</legend>
            <p className="aide">Vous n&apos;avez pas à vous justifier ni à parler de votre santé.</p>
            <div className="grid gap-1 tel:grid-cols-2">
              {paquet.textes.besoins.map((b) => (
                <label key={b} className="flex items-center gap-2 min-h-11">
                  <input
                    type="checkbox"
                    checked={besoins.liste.includes(b)}
                    onChange={(e) => setBesoins({ ...besoins, liste: e.target.checked ? [...besoins.liste, b] : besoins.liste.filter((x) => x !== b) })}
                  />
                  {b}
                </label>
              ))}
            </div>
            {besoins.liste.includes("Autre") ? (
              <input className="champ" value={besoins.autre} onChange={(e) => setBesoins({ ...besoins, autre: e.target.value })} placeholder="Précisez le besoin (pas la raison)" />
            ) : null}
          </fieldset>

          {paquet.deroule && !besoinSignale ? (
            <fieldset className="carte space-y-2">
              <legend className="font-ui font-semibold px-1">Le déroulé de l&apos;épreuve (facultatif)</legend>
              <p className="text-sm text-texte-2">
                Si vous l&apos;acceptez, l&apos;épreuve garde votre démarche : portes regardées et essayées, réponses changées, retours, relectures. Jamais le temps. Cela n&apos;entre jamais dans la note : cela sert à préparer des questions sur votre façon de travailler. Vous pouvez refuser en un clic, sans conséquence.
              </p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Déroulé">
                <button type="button" role="radio" aria-checked={derouleAccepte} className={`bouton ${derouleAccepte ? "bouton-principal" : ""}`} onClick={() => setDerouleAccepte(true)}>
                  J&apos;accepte
                </button>
                <button type="button" role="radio" aria-checked={!derouleAccepte} className={`bouton ${!derouleAccepte ? "bouton-principal" : ""}`} onClick={() => setDerouleAccepte(false)}>
                  Je refuse
                </button>
              </div>
            </fieldset>
          ) : null}

          {paquet.profil_travail ? (
            <p className="aide">
              À la fin, {paquet.profil_travail.items.length} phrase{paquet.profil_travail.items.length > 1 ? "s" : ""} facultative{paquet.profil_travail.items.length > 1 ? "s" : ""} sur votre façon de travailler : jamais notées ni classées, jamais sur la santé. Vous pouvez les passer.
            </p>
          ) : null}

          <button type="button" className="bouton bouton-principal w-full tel:w-auto" onClick={() => aller({ type: "competence", index: 0 }, "avant")}>
            Commencer
          </button>
        </section>
      ) : null}

      {ecran.type === "competence" && comp ? (
        <section className="space-y-6">
          <div className="space-y-3">
            <p className="pilule">{comp.titre}</p>
            <h1 className="text-3xl">{comp.situation.titre}</h1>
            <p className="text-lg leading-relaxed">
              <Texte>{comp.situation.texte}</Texte>
            </p>
            <Document document={comp.situation.document} />
          </div>

          <div className="space-y-3">
            <h2 className="font-ui text-lg font-semibold">{repComp?.porte ? "Votre porte" : "Choisissez votre porte"}</h2>
            <div className="grid gap-2 tel:grid-cols-5" role="radiogroup" aria-label="Porte">
              {portesDeComp.map((p) => {
                const t = texteporte(p);
                const actif = repComp?.porte === p;
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={actif}
                    onClick={() => choisirPorte(p)}
                    onFocus={() => {
                      if (porteRegardee !== p) {
                        setPorteRegardee(p);
                        noter({ type: "porte_regardee", competence: comp.code, porte: p });
                      }
                    }}
                    className={`rounded-m border p-3 text-left ${actif ? "border-accent bg-accent-fond text-accent-fond-texte" : "border-bord bg-surface hover:bg-surface-2"}`}
                  >
                    <span className="block text-xs">Porte {t?.n}</span>
                    <span className="block font-semibold">{t?.nom}</span>
                    <span className={`block text-xs mt-1 ${actif ? "" : "text-texte-2"}`}>{t?.court}</span>
                  </button>
                );
              })}
            </div>
            {repComp?.porte ? <p className="aide">Vous pouvez changer de porte à tout moment avant de passer à la situation suivante.</p> : null}
          </div>

          {repComp?.porte === "p1" && comp.portes.p1 ? (
            <PorteUn questions={comp.portes.p1.questions} reponse={repComp.p1 ?? {}} onChange={(r, q) => majReponse("p1", r, q)} />
          ) : null}
          {repComp?.porte === "p2" && comp.portes.p2 ? (
            <PorteDeux debuts={comp.portes.p2.debuts} reponse={repComp.p2 ?? {}} onChange={(r, q) => majReponse("p2", r, q)} />
          ) : null}
          {repComp?.porte === "p3" && comp.portes.p3 ? (
            <PorteTrois version={comp.portes.p3} reponse={repComp.p3 ?? {}} onChange={(r, q) => majReponse("p3", r, q)} />
          ) : null}
          {repComp?.porte === "p4" && comp.portes.p4 ? <PorteQuatre version={comp.portes.p4} reponse={repComp.p4} onChange={(r, q) => majReponse("p4", r, q)} /> : null}
          {repComp?.porte === "p5" && comp.portes.p5 ? (
            <PorteCinq questions={comp.portes.p5.questions} reponse={repComp.p5 ?? {}} onChange={(r, q) => majReponse("p5", r, q)} />
          ) : null}

          <nav className="flex flex-wrap justify-between gap-2 pt-4 border-t border-bord" aria-label="Navigation de l'épreuve">
            <button
              type="button"
              className="bouton"
              onClick={() => aller(ecran.index === 0 ? { type: "accueil" } : { type: "competence", index: ecran.index - 1 }, "arriere")}
            >
              ← Précédent
            </button>
            <button
              type="button"
              className="bouton bouton-principal"
              disabled={!repComp?.porte}
              onClick={() => aller(ecran.index + 1 < nb ? { type: "competence", index: ecran.index + 1 } : paquet.profil_travail ? { type: "profil" } : { type: "verification" }, "avant")}
            >
              {ecran.index + 1 < nb ? "Situation suivante →" : "Continuer →"}
            </button>
          </nav>
        </section>
      ) : null}

      {ecran.type === "profil" && paquet.profil_travail ? (
        <section className="space-y-5">
          <h1 className="text-3xl">Votre façon de travailler (facultatif)</h1>
          <p className="text-texte-2">{paquet.textes.intro_profil}</p>
          <ol className="space-y-4">
            {paquet.profil_travail.items.map((it, i) => (
              <li key={it.id} className="carte space-y-2">
                <p className="font-medium">
                  <span className="text-texte-2">{i + 1}.</span> {it.texte}
                </p>
                <div role="radiogroup" aria-label={it.texte} className="flex flex-wrap gap-2">
                  {paquet.textes.echelle.map((e, k) => {
                    const v = k + 1;
                    const actif = profil[it.id] === v;
                    return (
                      <button key={e} type="button" role="radio" aria-checked={actif} className={`bouton max-tel:w-full ${actif ? "bouton-principal" : ""}`} onClick={() => setProfil({ ...profil, [it.id]: v })}>
                        {e}
                      </button>
                    );
                  })}
                  <button type="button" role="radio" aria-checked={profil[it.id] === "nsp"} className={`bouton max-tel:w-full ${profil[it.id] === "nsp" ? "bouton-principal" : ""}`} onClick={() => setProfil({ ...profil, [it.id]: "nsp" })}>
                    {paquet.textes.ne_sait_pas}
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <nav className="flex flex-wrap justify-between gap-2 pt-4 border-t border-bord">
            <button type="button" className="bouton" onClick={() => aller({ type: "competence", index: nb - 1 }, "arriere")}>
              ← Précédent
            </button>
            <span className="flex gap-2">
              <button
                type="button"
                className="bouton"
                onClick={() => {
                  setProfil({});
                  aller({ type: "verification" }, "avant");
                }}
              >
                Passer cette partie
              </button>
              <button type="button" className="bouton bouton-principal" onClick={() => aller({ type: "verification" }, "avant")}>
                Continuer →
              </button>
            </span>
          </nav>
        </section>
      ) : null}

      {ecran.type === "verification" ? (
        <section className="space-y-5">
          <h1 className="text-3xl">Avant de rendre vos réponses</h1>
          <ul className="space-y-2">
            {paquet.competences.map((c, i) => {
              const r = competences[c.code];
              const t = r?.porte ? texteporte(r.porte) : null;
              return (
                <li key={c.code} className="carte flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>Situation {i + 1}</strong> · {c.situation.titre}
                    <span className="block text-sm text-texte-2">{t ? `Porte ${t.n} · ${t.nom}` : "Pas de porte choisie"}{repondu(c.code) ? "" : " · sans réponse"}</span>
                  </span>
                  <button
                    type="button"
                    className="bouton"
                    onClick={() => {
                      noter({ type: "relecture", competence: c.code });
                      setEcran({ type: "competence", index: i });
                    }}
                  >
                    Relire
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="aide">Vous pouvez relire et modifier vos réponses. Une fois rendues, elles ne changent plus.</p>
          <button type="button" className="bouton bouton-principal w-full tel:w-auto" onClick={terminer}>
            {libelleFin}
          </button>
        </section>
      ) : null}
    </div>
  );
}
