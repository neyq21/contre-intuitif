"use client";

/**
 * Les cinq portes côté candidat. Chaque composant reçoit le contenu sans corrigé,
 * la réponse en cours, et renvoie la réponse modifiée. Tout se fait au clavier,
 * en boutons pleine largeur sur téléphone, sans glisser-déposer obligatoire.
 */
import { useId } from "react";
import { Texte } from "@/composants/Texte";
import type { ReponseP3, ReponseP4, ReponsesP1 } from "@/lib/methode/notation";
import type {
  DebutP2Candidat,
  OptionCandidat,
  QuestionP1Candidat,
  QuestionP5Candidat,
  ReponseP2,
  ReponseP5,
  VersionP3Candidat,
  VersionP4Candidat,
} from "@/lib/stockage/modele";
import { Document } from "./Document";

function Choix({
  options,
  valeur,
  onChange,
  nom,
  multiple = false,
}: {
  options: OptionCandidat[];
  valeur: string | string[] | undefined;
  onChange: (id: string) => void;
  nom: string;
  multiple?: boolean;
}) {
  const choisis = new Set(Array.isArray(valeur) ? valeur : valeur ? [valeur] : []);
  return (
    <div role={multiple ? "group" : "radiogroup"} aria-label={nom} className="grid gap-2">
      {options.map((o, i) => {
        const actif = choisis.has(o.id);
        return (
          <button
            key={o.id}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={actif}
            onClick={() => onChange(o.id)}
            className={`flex w-full items-start gap-3 rounded-m border px-4 py-3 text-left leading-snug ${
              actif ? "border-accent bg-accent-fond text-accent-fond-texte" : "border-bord bg-surface hover:bg-surface-2"
            }`}
          >
            <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-${multiple ? "s" : "pilule"} border text-xs font-semibold ${actif ? "border-current" : "border-bord-fort"}`} aria-hidden="true">
              {actif ? "✓" : String.fromCharCode(65 + i)}
            </span>
            <span>
              <Texte>{o.texte}</Texte>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// --- Porte 1 ---------------------------------------------------------------

export function PorteUn({ questions, reponse, onChange }: { questions: QuestionP1Candidat[]; reponse: ReponsesP1; onChange: (r: ReponsesP1, question: string) => void }) {
  return (
    <ol className="space-y-6">
      {questions.map((q, i) => (
        <li key={q.id} className="space-y-3">
          <h3 className="font-ui text-lg font-semibold">
            <span className="text-texte-2">{i + 1}.</span> <Texte>{q.texte}</Texte>
          </h3>
          <Choix nom={`Question ${i + 1}`} options={q.options} valeur={reponse[q.id]} onChange={(id) => onChange({ ...reponse, [q.id]: id }, q.id)} />
        </li>
      ))}
    </ol>
  );
}

// --- Porte 2 ---------------------------------------------------------------

export function PorteDeux({ debuts, reponse, onChange }: { debuts: DebutP2Candidat[]; reponse: ReponseP2; onChange: (r: ReponseP2, question: string) => void }) {
  const id = useId();
  return (
    <ol className="space-y-6">
      {debuts.map((d, i) => (
        <li key={d.id} className="space-y-2">
          <label htmlFor={`${id}-${d.id}`} className="block font-ui text-lg font-semibold">
            <span className="text-texte-2">{i + 1}.</span> <Texte>{d.debut}</Texte>
            {d.recruteur ? <span className="pilule ml-2 text-xs">question de l&apos;employeur</span> : null}
          </label>
          <textarea
            id={`${id}-${d.id}`}
            className="champ"
            rows={2}
            value={reponse[d.id] ?? ""}
            onChange={(e) => onChange({ ...reponse, [d.id]: e.target.value }, d.id)}
            placeholder="Quelques mots suffisent."
            autoComplete="off"
            spellCheck
          />
        </li>
      ))}
    </ol>
  );
}

// --- Porte 3 ---------------------------------------------------------------

export function PorteTrois({ version, reponse, onChange }: { version: VersionP3Candidat; reponse: ReponseP3; onChange: (r: ReponseP3, question: string) => void }) {
  const indices = reponse.indices ?? [];
  return (
    <div className="space-y-6">
      <div className="carte bg-surface-2">
        <p className="text-sm text-texte-2 mb-1">La réponse donnée :</p>
        <p className="text-xl font-titre">
          <Texte>{version.reponse}</Texte>
        </p>
      </div>
      <section className="space-y-3">
        <h3 className="font-ui text-lg font-semibold">1. Quelle était la question de départ ?</h3>
        <Choix nom="Question de départ" options={version.question.options} valeur={reponse.question} onChange={(id) => onChange({ ...reponse, question: id }, "question")} />
      </section>
      <section className="space-y-3">
        <h3 className="font-ui text-lg font-semibold">2. Quels éléments expliquent cette réponse ? Cochez ceux qui comptent.</h3>
        <p className="aide">Plusieurs réponses possibles. Un élément coché à tort compte en moins.</p>
        <Choix
          nom="Indices"
          multiple
          options={version.indices.options}
          valeur={indices}
          onChange={(id) => onChange({ ...reponse, indices: indices.includes(id) ? indices.filter((x) => x !== id) : [...indices, id] }, "indices")}
        />
      </section>
      <section className="space-y-3">
        <h3 className="font-ui text-lg font-semibold">3. Que fait-on ensuite ?</h3>
        <Choix nom="La suite" options={version.suite.options} valeur={reponse.suite} onChange={(id) => onChange({ ...reponse, suite: id }, "suite")} />
      </section>
    </div>
  );
}

// --- Porte 4 ---------------------------------------------------------------

export function PorteQuatre({ version, reponse, onChange }: { version: VersionP4Candidat; reponse: ReponseP4 | undefined; onChange: (r: ReponseP4, question: string) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="font-ui text-lg font-semibold">{version.titre}</h3>
      <p>
        <Texte>{version.consigne}</Texte>
      </p>
      <Document document={version.document} />
      {version.type === "ordonner" ? <Ordonner version={version} reponse={reponse?.type === "ordonner" ? reponse.ordre : undefined} onChange={(ordre) => onChange({ type: "ordonner", ordre }, "ordre")} /> : null}
      {version.type === "classer" ? (
        <Classer version={version} reponse={reponse?.type === "classer" ? reponse.classement : {}} onChange={(classement, q) => onChange({ type: "classer", classement }, q)} />
      ) : null}
      {version.type === "reperer" ? <Reperer version={version} reponse={reponse?.type === "reperer" ? reponse.reperes : []} onChange={(reperes) => onChange({ type: "reperer", reperes }, "reperes")} /> : null}
    </div>
  );
}

function Ordonner({ version, reponse, onChange }: { version: Extract<VersionP4Candidat, { type: "ordonner" }>; reponse: string[] | undefined; onChange: (ordre: string[]) => void }) {
  const ordre = reponse && reponse.length === version.elements.length ? reponse : version.elements.map((e) => e.id);
  const parId = new Map(version.elements.map((e) => [e.id, e]));
  function deplacer(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= ordre.length) return;
    const nouveau = [...ordre];
    [nouveau[i], nouveau[j]] = [nouveau[j], nouveau[i]];
    onChange(nouveau);
  }
  function onDragStart(e: React.DragEvent, i: number) {
    e.dataTransfer.setData("text/plain", String(i));
    e.dataTransfer.effectAllowed = "move";
  }
  function onDrop(e: React.DragEvent, cible: number) {
    e.preventDefault();
    const source = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isNaN(source) || source === cible) return;
    const nouveau = [...ordre];
    const [el] = nouveau.splice(source, 1);
    nouveau.splice(cible, 0, el);
    onChange(nouveau);
  }
  return (
    <ol className="space-y-2" aria-label="Actions à remettre dans l'ordre">
      {ordre.map((id, i) => (
        <li
          key={id}
          draggable
          onDragStart={(e) => onDragStart(e, i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDrop(e, i)}
          className="flex items-center gap-2 rounded-m border border-bord bg-surface px-3 py-2"
        >
          <span className="w-7 text-center font-semibold text-texte-2" aria-hidden="true">
            {i + 1}
          </span>
          <span className="flex-1">
            <Texte>{parId.get(id)?.texte ?? id}</Texte>
          </span>
          <span className="flex gap-1">
            <button type="button" className="bouton min-h-11 w-11 px-0" aria-label={`Monter « ${parId.get(id)?.texte ?? id} »`} disabled={i === 0} onClick={() => deplacer(i, -1)}>
              ↑
            </button>
            <button type="button" className="bouton min-h-11 w-11 px-0" aria-label={`Descendre « ${parId.get(id)?.texte ?? id} »`} disabled={i === ordre.length - 1} onClick={() => deplacer(i, 1)}>
              ↓
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Classer({
  version,
  reponse,
  onChange,
}: {
  version: Extract<VersionP4Candidat, { type: "classer" }>;
  reponse: Record<string, string | undefined>;
  onChange: (classement: Record<string, string | undefined>, question: string) => void;
}) {
  return (
    <ul className="space-y-3" aria-label="Éléments à classer">
      {version.elements.map((e) => (
        <li key={e.id} className="rounded-m border border-bord bg-surface p-3 space-y-2">
          <p className="font-medium">
            <Texte>{e.texte}</Texte>
          </p>
          <div role="radiogroup" aria-label={`Catégorie pour « ${e.texte} »`} className="flex flex-wrap gap-2">
            {version.categories.map((k) => {
              const actif = reponse[e.id] === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  onClick={() => onChange({ ...reponse, [e.id]: k.id }, e.id)}
                  className={`bouton max-tel:w-full ${actif ? "bouton-principal" : ""}`}
                >
                  {k.nom}
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Reperer({ version, reponse, onChange }: { version: Extract<VersionP4Candidat, { type: "reperer" }>; reponse: string[]; onChange: (reperes: string[]) => void }) {
  return (
    <ul className="space-y-2" aria-label="Lignes à vérifier">
      {version.elements.map((e, i) => {
        const actif = reponse.includes(e.id);
        return (
          <li key={e.id}>
            <button
              type="button"
              role="checkbox"
              aria-checked={actif}
              onClick={() => onChange(actif ? reponse.filter((x) => x !== e.id) : [...reponse, e.id])}
              className={`flex w-full items-start gap-3 rounded-m border px-4 py-3 text-left ${actif ? "border-rouge bg-alerte-fond text-alerte-texte" : "border-bord bg-surface hover:bg-surface-2"}`}
            >
              <span className="mt-0.5 w-6 shrink-0 text-center text-sm font-semibold" aria-hidden="true">
                {actif ? "✕" : i + 1}
              </span>
              <span>
                <Texte>{e.texte}</Texte>
              </span>
            </button>
          </li>
        );
      })}
      <li className="aide">Cliquez à nouveau pour retirer une ligne cochée.</li>
    </ul>
  );
}

// --- Porte 5 ---------------------------------------------------------------

export function PorteCinq({ questions, reponse, onChange }: { questions: QuestionP5Candidat[]; reponse: ReponseP5; onChange: (r: ReponseP5, question: string) => void }) {
  const id = useId();
  return (
    <ol className="space-y-6">
      {questions.map((q, i) => {
        const r = reponse[q.id] ?? {};
        return (
          <li key={q.id} className="space-y-2">
            <label htmlFor={`${id}-${q.id}`} className="block font-ui text-lg font-semibold">
              <span className="text-texte-2">{i + 1}.</span> <Texte>{q.texte}</Texte>
              {q.recruteur ? <span className="pilule ml-2 text-xs">question de l&apos;employeur</span> : null}
            </label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Mode de réponse">
              <button type="button" role="radio" aria-checked={!r.oral} className={`bouton ${!r.oral ? "bouton-principal" : ""}`} onClick={() => onChange({ ...reponse, [q.id]: { ...r, oral: false } }, q.id)}>
                Par écrit
              </button>
              <button type="button" role="radio" aria-checked={!!r.oral} className={`bouton ${r.oral ? "bouton-principal" : ""}`} onClick={() => onChange({ ...reponse, [q.id]: { ...r, oral: true } }, q.id)}>
                À l&apos;oral
              </button>
            </div>
            {r.oral ? (
              <p className="aide">Vous répondez à l&apos;oral : la personne qui évalue note votre réponse. Rien n&apos;est enregistré.</p>
            ) : (
              <textarea
                id={`${id}-${q.id}`}
                className="champ"
                rows={3}
                value={r.texte ?? ""}
                onChange={(e) => onChange({ ...reponse, [q.id]: { ...r, texte: e.target.value } }, q.id)}
                placeholder="Une idée à la fois."
                autoComplete="off"
                spellCheck
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
