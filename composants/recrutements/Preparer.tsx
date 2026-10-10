"use client";

/**
 * « Préparer », pas à pas : le poste, l'épreuve, les questions, l'entretien,
 * les envois, vérifier. Comme le LISEZ-MOI.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDonnees } from "@/composants/donnees/FournisseurDonnees";
import { Bouton, Chargement, Message, Onglets } from "@/composants/ui";
import type { CodeCompetence, Niveau, PorteId } from "@/lib/contenu/types";
import { LIMITES, aUneBanque, reservoirP1, reservoirP2, reservoirP3, reservoirP4, reservoirP5, verifierPortes, verifierSelection } from "@/lib/methode/tirage";
import { figer, remplacerRecrutement, retirer } from "@/lib/stockage/recrutements";
import type { Recrutement } from "@/lib/stockage/modele";
import { PreparerEntretien } from "./PreparerEntretien";
import { PreparerEnvois } from "./PreparerEnvois";
import { PreparerQuestions } from "./PreparerQuestions";
import { useRecrutement } from "./useRecrutement";

import { ETAPES, type EtapeId } from "./constantes";
export { ETAPES };
export type { EtapeId };

export function Preparer({ id, etape }: { id: string; etape: EtapeId }) {
  const ctx = useRecrutement(id);
  const { modifier } = useDonnees();
  const router = useRouter();
  const { pret, recrutement: r, pack, base } = ctx;
  if (!pret) return <Chargement />;
  if (!r || !base) return <Chargement texte="Catalogue en cours de chargement…" />;

  const figee = r.epreuve !== null;
  const prefixe = `/recrutements/${id}/preparer`;
  const index = ETAPES.findIndex((e) => e.id === etape);
  const suivante = ETAPES[index + 1];
  const precedente = ETAPES[index - 1];

  async function enregistrer(fn: (r: Recrutement) => Recrutement | void) {
    await modifier((e) => {
      const courant = e.recrutements.find((x) => x.id === id);
      if (!courant) return;
      const res = fn(courant);
      remplacerRecrutement(e, res ?? courant);
    });
  }

  return (
    <div className="space-y-6">
      <Onglets actif={`${prefixe}/${etape}`} onglets={ETAPES.map((e) => ({ href: `${prefixe}/${e.id}`, libelle: e.libelle }))} />
      {figee ? (
        <Message>
          Les questions sont figées : une personne a commencé l&apos;épreuve (ou un lien / fichier a été créé). Pour en changer, dupliquez le recrutement depuis « Fin du recrutement ». Le poste, l&apos;entretien, les envois et les évaluateurs restent modifiables.
        </Message>
      ) : null}
      {!pack && !figee ? <Message type="alerte">Le métier de ce recrutement n&apos;est pas disponible : importez-le dans « Données » ou attendez le chargement du catalogue.</Message> : null}

      {etape === "poste" ? <EtapePoste r={r} base={base} figee={figee} enregistrer={enregistrer} /> : null}
      {etape === "epreuve" ? <EtapeEpreuve r={r} pack={pack} figee={figee} enregistrer={enregistrer} /> : null}
      {etape === "questions" ? <PreparerQuestions r={r} pack={pack} base={base} figee={figee} enregistrer={enregistrer} /> : null}
      {etape === "entretien" ? <PreparerEntretien r={r} pack={pack} base={base} enregistrer={enregistrer} /> : null}
      {etape === "envois" ? <PreparerEnvois r={r} pack={pack} base={base} enregistrer={enregistrer} /> : null}
      {etape === "verifier" ? (
        <EtapeVerifier
          r={r}
          pack={pack}
          figee={figee}
          onFiger={async () => {
            if (!pack) return;
            await enregistrer((x) => figer(x, pack, base));
            router.push(`/recrutements/${id}/candidats`);
          }}
        />
      ) : null}

      <nav className="flex flex-wrap justify-between gap-2 border-t border-bord pt-4 no-print" aria-label="Étapes">
        {precedente ? (
          <Link href={`${prefixe}/${precedente.id}`} className="bouton">
            ← {precedente.libelle}
          </Link>
        ) : (
          <span />
        )}
        {suivante ? (
          <Link href={`${prefixe}/${suivante.id}`} className="bouton bouton-principal">
            {suivante.libelle} →
          </Link>
        ) : (
          <Link href={`/recrutements/${id}/candidats`} className="bouton bouton-principal">
            Les candidats →
          </Link>
        )}
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------

function EtapePoste({ r, base, figee, enregistrer }: { r: Recrutement; base: NonNullable<ReturnType<typeof useRecrutement>["base"]>; figee: boolean; enregistrer: (fn: (r: Recrutement) => Recrutement | void) => Promise<void> }) {
  const { packDe } = useDonnees();
  const pack = packDe(r.metier_id);
  const dims = base.profil_travail.dimensions;
  return (
    <div className="space-y-6 max-w-[48rem]">
      <section className="space-y-3">
        <h2 className="text-2xl">Le poste</h2>
        <label className="block">
          <span className="etiquette">Intitulé du poste</span>
          <input className="champ" defaultValue={r.poste} onBlur={(e) => enregistrer((x) => ({ ...x, poste: e.target.value.trim() || x.metier_nom }))} />
        </label>
        <label className="block">
          <span className="etiquette">Notes (contexte, horaires, équipe) — pour vous</span>
          <textarea className="champ" rows={3} defaultValue={r.notes} onBlur={(e) => enregistrer((x) => ({ ...x, notes: e.target.value }))} />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Les compétences mesurées et le niveau requis</h2>
        <p className="aide">Gardez 2 à 4 compétences et fixez le niveau requis, de 1 à 4, avant le premier candidat. Le niveau est le même pour toutes les portes.</p>
        {!pack ? <Message type="alerte">Métier indisponible : les compétences ne peuvent pas être modifiées.</Message> : null}
        <ul className="space-y-2">
          {(pack?.competences ?? []).map((c) => {
            const choisie = r.competences.find((x) => x.code === c.code);
            const transverse = base.competences.find((t) => t.code === c.code);
            return (
              <li key={c.code} className={`carte space-y-2 ${choisie ? "" : "opacity-70"}`}>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!!choisie}
                    disabled={figee}
                    onChange={(e) =>
                      enregistrer((x) => {
                        if (!pack) return;
                        const comps = e.target.checked
                          ? [...x.competences, { code: c.code, niveau_requis: c.niveau_requis }].sort((a, b) => pack.competences.findIndex((p) => p.code === a.code) - pack.competences.findIndex((p) => p.code === b.code))
                          : x.competences.filter((k) => k.code !== c.code);
                        if (!comps.length) return;
                        return retirer({ ...x, competences: comps }, pack, x.tirage);
                      })
                    }
                  />
                  <span>
                    <span className="block font-semibold">
                      {c.code} · {c.titre}
                    </span>
                    <span className="block text-sm text-texte-2">{c.pourquoi}</span>
                  </span>
                </label>
                {choisie ? (
                  <div className="pl-8 space-y-1">
                    <label className="block">
                      <span className="text-sm font-semibold">Niveau requis</span>
                      <select
                        className="champ max-w-xs"
                        value={choisie.niveau_requis}
                        disabled={figee}
                        onChange={(e) =>
                          enregistrer((x) => ({ ...x, competences: x.competences.map((k) => (k.code === c.code ? { ...k, niveau_requis: Number(e.target.value) as Niveau } : k)) }))
                        }
                      >
                        {([1, 2, 3, 4] as Niveau[]).map((n) => (
                          <option key={n} value={n}>
                            {n} · {base.niveaux[String(n) as "1"]}
                            {n === c.niveau_requis ? " (proposé par le kit)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    {transverse ? <p className="aide">Niveau {choisie.niveau_requis} : {transverse.ancres[String(choisie.niveau_requis) as "1"]}</p> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">{base.profil_travail.titre}</h2>
        <p className="aide">
          Jusqu&apos;à {base.profil_travail.max_essentiels} savoir-être essentiels pour le poste, comme dans une offre de France Travail. Le kit montre ce que la personne a fait dans les situations. Jamais noté, jamais dans le classement, jamais pour écarter une candidature.
        </p>
        <ul className="grid gap-2 tel:grid-cols-2">
          {dims.map((d) => {
            const coche = r.profil_travail.essentiels.includes(d.id);
            const plein = r.profil_travail.essentiels.length >= base.profil_travail.max_essentiels && !coche;
            return (
              <li key={d.id}>
                <label className={`carte flex items-start gap-3 ${plein ? "opacity-60" : ""}`}>
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={coche}
                    disabled={plein}
                    onChange={(e) =>
                      enregistrer((x) => ({
                        ...x,
                        profil_travail: { ...x.profil_travail, essentiels: e.target.checked ? [...x.profil_travail.essentiels, d.id] : x.profil_travail.essentiels.filter((k) => k !== d.id) },
                      }))
                    }
                  />
                  <span>
                    <span className="block font-semibold">{d.nom}</span>
                    <span className="block text-sm text-texte-2">{d.definition}</span>
                    <span className="block text-xs text-texte-3">France Travail : « {d.ft} »</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <label className="flex items-start gap-3 carte">
          <input
            type="checkbox"
            className="mt-1"
            checked={r.profil_travail.phrases}
            disabled={figee}
            onChange={(e) => enregistrer((x) => ({ ...x, profil_travail: { ...x.profil_travail, phrases: e.target.checked } }))}
          />
          <span>
            <span className="block font-semibold">Proposer les phrases « Au travail… » à la fin de l&apos;épreuve</span>
            <span className="block text-sm text-texte-2">
              {base.profil_travail.items.filter((i) => r.profil_travail.essentiels.includes(i.dim)).length} phrases facultatives, jamais notées, refusables en un clic. Annoncées automatiquement dans l&apos;e-mail 2 et la notice. Aucune ne porte sur la santé.
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Les personnes qui évaluent</h2>
        <p className="aide">Chacune note seule, puis on compare. L&apos;analyse rapproche les notes sans écraser celles de chacun.</p>
        <ul className="space-y-1">
          {r.evaluateurs.map((ev) => (
            <li key={ev.id} className="flex items-center gap-2">
              <span className="flex-1">{ev.nom}</span>
              <Bouton variante="discret" className="min-h-9 text-sm" onClick={() => enregistrer((x) => ({ ...x, evaluateurs: x.evaluateurs.filter((e) => e.id !== ev.id) }))}>
                Retirer
              </Bouton>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const champ = form.elements.namedItem("nom") as HTMLInputElement;
            const nom = champ.value.trim();
            if (!nom) return;
            void enregistrer((x) => ({ ...x, evaluateurs: [...x.evaluateurs, { id: `ev_${Date.now().toString(36)}`, nom }] }));
            champ.value = "";
          }}
        >
          <label className="flex-1">
            <span className="visuellement-cache">Nom de la personne qui évalue</span>
            <input name="nom" className="champ" placeholder="Prénom ou initiales" />
          </label>
          <Bouton type="submit">Ajouter</Bouton>
        </form>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

function EtapeEpreuve({ r, pack, figee, enregistrer }: { r: Recrutement; pack: ReturnType<typeof useRecrutement>["pack"]; figee: boolean; enregistrer: (fn: (r: Recrutement) => Recrutement | void) => Promise<void> }) {
  const { catalogue } = useDonnees();
  const portes = catalogue?.base.portes ?? [];
  const erreurPortes = verifierPortes(r.portes);
  const banque = pack ? aUneBanque(pack) : false;
  const bloque = figee || !pack;

  function majNombre(porte: "p1" | "p2" | "p5", valeur: number) {
    void enregistrer((x) => {
      if (!pack) return;
      const l = LIMITES[porte];
      const n = Math.max(l.min, Math.min(l.max, valeur));
      return retirer({ ...x, nombres: { ...x.nombres, [porte]: n } }, pack, x.tirage);
    });
  }

  return (
    <div className="space-y-6 max-w-[48rem]">
      <section className="space-y-3">
        <h2 className="text-2xl">Les portes proposées</h2>
        <p className="aide">Au moins 3, dont une sans rédaction libre (choix multiples, retrouvez la question ou défi pratique). La personne candidate choisit sa porte à chaque situation ; son choix n&apos;est ni noté ni commenté.</p>
        <ul className="space-y-2">
          {portes.map((p) => {
            const coche = r.portes.includes(p.id);
            return (
              <li key={p.id}>
                <label className="carte flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={coche}
                    disabled={bloque}
                    onChange={(e) => enregistrer((x) => ({ ...x, portes: (e.target.checked ? [...x.portes, p.id] : x.portes.filter((k) => k !== p.id)).sort() as PorteId[] }))}
                  />
                  <span>
                    <span className="block font-semibold">
                      Porte {p.n} · {p.nom}
                    </span>
                    <span className="block text-sm text-texte-2">{p.recruteur}</span>
                    <span className="block text-xs text-texte-3">Durée indicative : {p.duree} (jamais chronométrée)</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {erreurPortes ? <Message type="alerte">{erreurPortes}</Message> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Le nombre de questions</h2>
        <p className="aide">La note s&apos;adapte au nombre de questions. Porte 1 : de 3 à 10 (défaut 5). Portes 2 et 5 : de 2 à 6 (défaut 3). Portes 3 et 4 : une version.</p>
        <div className="grid gap-3 tel:grid-cols-3">
          {(["p1", "p2", "p5"] as const).map((p) => {
            const l = LIMITES[p];
            const porte = portes.find((x) => x.id === p);
            return (
              <label key={p} className="carte block">
                <span className="block font-semibold">
                  Porte {porte?.n} · {porte?.nom}
                </span>
                <input type="number" className="champ mt-2" min={l.min} max={l.max} value={r.nombres[p]} disabled={bloque} onChange={(e) => majNombre(p, Number(e.target.value))} />
                <span className="aide">de {l.min} à {l.max}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Le tirage</h2>
        <p className="aide">
          Toutes les personnes de ce recrutement ont exactement les mêmes questions. Tirage actuel : {r.tirage === 0 ? "les questions du kit" : `n° ${r.tirage}`}.
          {banque ? " Ce métier a une banque de questions : « Autre tirage » en propose d'autres." : " Ce métier n'a pas de banque de questions : « Autre tirage » est inactif, l'épreuve utilise les questions du kit."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Bouton disabled={bloque || !banque} onClick={() => enregistrer((x) => (pack ? retirer(x, pack, x.tirage + 1) : undefined))}>
            Autre tirage
          </Bouton>
          <Bouton variante="discret" disabled={bloque || r.tirage === 0} onClick={() => enregistrer((x) => (pack ? retirer(x, pack, 0) : undefined))}>
            Revenir aux questions du kit
          </Bouton>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Le déroulé de l&apos;épreuve (option)</h2>
        <label className="carte flex items-start gap-3">
          <input type="checkbox" className="mt-1" checked={r.deroule} disabled={bloque} onChange={(e) => enregistrer((x) => ({ ...x, deroule: e.target.checked }))} />
          <span>
            <span className="block font-semibold">Garder la démarche de chaque candidat</span>
            <span className="block text-sm text-texte-2">
              Portes regardées et essayées, réponses changées, retours, relectures. Jamais le temps. Jamais dans la note ni dans la décision : pour préparer des questions sur la méthode de travail. La personne est prévenue et peut refuser en un clic. Jamais proposé à une personne qui a signalé un besoin d&apos;aménagement, ni avec le lien d&apos;annonce. À partir de 50 salariés, informez le CSE ; vérifiez avec votre DPO si une analyse d&apos;impact est nécessaire.
            </span>
          </span>
        </label>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

function EtapeVerifier({ r, pack, figee, onFiger }: { r: Recrutement; pack: ReturnType<typeof useRecrutement>["pack"]; figee: boolean; onFiger: () => Promise<void> }) {
  const { catalogue } = useDonnees();
  const base = catalogue?.base;
  const erreurs: string[] = [];
  const ep = verifierPortes(r.portes);
  if (ep) erreurs.push(ep);
  if (!r.competences.length) erreurs.push("Aucune compétence mesurée.");
  if (pack) erreurs.push(...verifierSelection(pack, r.selection, r.competences.map((c) => c.code)));
  if (!r.selection.entretien.length) erreurs.push("Aucune question d'entretien choisie.");
  const compte = (code: CodeCompetence) => r.selection.competences[code];
  const nbQuestionsRecruteur =
    Object.values(r.questions_recruteur.p2).flat().length + Object.values(r.questions_recruteur.p5).flat().length + Object.values(r.questions_recruteur.entretien).flat().length;
  const avertissements: string[] = [];
  if (!r.evaluateurs.length) avertissements.push("Aucune personne qui évalue n'est nommée : vos notes seront enregistrées sous « Moi ».");
  if (r.competences.length === 1) avertissements.push("Une seule compétence mesurée : le kit recommande 2 à 4.");

  return (
    <div className="space-y-6 max-w-[48rem]">
      <h2 className="text-2xl">Vérifier</h2>
      <dl className="carte grid gap-x-6 gap-y-2 tel:grid-cols-[auto_1fr]">
        <dt className="font-semibold">Poste</dt>
        <dd>
          {r.poste} · {r.metier_nom}
        </dd>
        <dt className="font-semibold">Compétences</dt>
        <dd>
          {r.competences.map((c) => {
            const comp = pack?.competences.find((x) => x.code === c.code);
            return (
              <span key={c.code} className="block">
                {c.code} · {comp?.titre ?? c.code} — niveau requis {c.niveau_requis}
              </span>
            );
          })}
        </dd>
        <dt className="font-semibold">Portes</dt>
        <dd>{r.portes.map((p) => base?.portes.find((x) => x.id === p)?.nom ?? p).join(", ")}</dd>
        <dt className="font-semibold">Questions</dt>
        <dd>
          {r.competences.map((c) => {
            const s = compte(c.code);
            if (!s) return null;
            return (
              <span key={c.code} className="block text-sm">
                {c.code} : {r.portes.includes("p1") ? `${s.p1.length} choix multiples` : ""}
                {r.portes.includes("p2") ? ` · ${s.p2.length + (r.questions_recruteur.p2[c.code]?.length ?? 0)} phrases` : ""}
                {r.portes.includes("p3") ? ` · version ${s.p3}` : ""}
                {r.portes.includes("p4") ? ` · défi ${s.p4}` : ""}
                {r.portes.includes("p5") ? ` · ${s.p5.length + (r.questions_recruteur.p5[c.code]?.length ?? 0)} questions orales ou écrites` : ""}
              </span>
            );
          })}
          <span className="block text-sm">Tirage : {r.tirage === 0 ? "questions du kit" : `n° ${r.tirage}`} · {nbQuestionsRecruteur} question{nbQuestionsRecruteur > 1 ? "s" : ""} écrite{nbQuestionsRecruteur > 1 ? "s" : ""} par vous</span>
        </dd>
        <dt className="font-semibold">Entretien</dt>
        <dd>
          {r.selection.entretien.length} questions du kit + {Object.values(r.questions_recruteur.entretien).flat().length} à vous
        </dd>
        <dt className="font-semibold">Profil de travail</dt>
        <dd>
          {r.profil_travail.essentiels.map((d) => base?.profil_travail.dimensions.find((x) => x.id === d)?.nom ?? d).join(", ") || "aucun savoir-être"}
          {r.profil_travail.phrases ? " · phrases « Au travail… » proposées" : ""}
        </dd>
        <dt className="font-semibold">Déroulé</dt>
        <dd>{r.deroule ? "proposé, refusable" : "non"}</dd>
        <dt className="font-semibold">Évaluateurs</dt>
        <dd>{r.evaluateurs.map((e) => e.nom).join(", ") || "—"}</dd>
      </dl>
      {erreurs.length ? (
        <Message type="alerte">
          <ul className="list-disc pl-5">
            {erreurs.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Message>
      ) : null}
      {avertissements.length ? (
        <Message>
          <ul className="list-disc pl-5">
            {avertissements.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Message>
      ) : null}
      {figee ? (
        <p className="aide">L&apos;épreuve est figée depuis le {new Date(r.epreuve?.figee_le ?? "").toLocaleDateString("fr-FR")}.</p>
      ) : (
        <div className="space-y-2">
          <p className="aide">Les questions se figent dès qu&apos;une personne commence l&apos;épreuve. Vous pouvez aussi les figer maintenant.</p>
          <Bouton variante="principal" disabled={erreurs.length > 0 || !pack} onClick={onFiger}>
            Figer l&apos;épreuve et passer aux candidats
          </Bouton>
        </div>
      )}
      {base ? (
        <p className="aide">
          Avant le premier recrutement : « Méthode et droit » →{" "}
          <Link href="/guide/droit" className="underline">
            Le droit : check-list
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

export { reservoirP1, reservoirP2, reservoirP3, reservoirP4, reservoirP5 };
