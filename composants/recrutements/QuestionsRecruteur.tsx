"use client";

/** Éditeur de questions écrites par le recruteur, avec le détecteur de motifs interdits. */
import { useState } from "react";
import { detecter, type Signalement } from "@/lib/methode/detecteur";
import { identifiant, type QuestionRecruteur } from "@/lib/stockage/modele";

export function QuestionsRecruteurEditeur({
  questions,
  max,
  onChange,
  libelle,
  placeholder,
  desactive = false,
}: {
  questions: QuestionRecruteur[];
  max: number;
  onChange: (q: QuestionRecruteur[]) => void;
  libelle: string;
  placeholder: string;
  desactive?: boolean;
}) {
  const [brouillon, setBrouillon] = useState("");
  const [signalements, setSignalements] = useState<Signalement[]>([]);

  function ajouter() {
    const texte = brouillon.trim();
    if (!texte) return;
    const s = detecter(texte);
    setSignalements(s);
    if (s.length) return;
    onChange([...questions, { id: identifiant("qr"), texte }]);
    setBrouillon("");
  }

  return (
    <div className="space-y-2">
      <p className="font-ui font-semibold">
        {libelle} <span className="font-normal text-texte-2">({questions.length}/{max})</span>
      </p>
      {questions.length ? (
        <ul className="space-y-1">
          {questions.map((q) => (
            <li key={q.id} className="flex items-start gap-2 rounded-s bg-surface-2 px-3 py-2">
              <span className="flex-1">{q.texte}</span>
              {!desactive ? (
                <button type="button" className="bouton bouton-discret min-h-9 px-2 text-sm" onClick={() => onChange(questions.filter((x) => x.id !== q.id))} aria-label={`Retirer « ${q.texte} »`}>
                  Retirer
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {!desactive && questions.length < max ? (
        <div className="space-y-2">
          <label className="block">
            <span className="visuellement-cache">{libelle}</span>
            <textarea
              className="champ"
              rows={2}
              value={brouillon}
              placeholder={placeholder}
              onChange={(e) => {
                setBrouillon(e.target.value);
                if (signalements.length) setSignalements(detecter(e.target.value));
              }}
            />
          </label>
          {signalements.length ? (
            <div role="alert" className="encart encart-alerte space-y-2 text-sm">
              <p className="font-semibold">Cette question ne peut pas être enregistrée : elle touche à un thème qui n&apos;a pas sa place dans un recrutement.</p>
              <ul className="space-y-1">
                {signalements.map((s) => (
                  <li key={s.theme}>
                    <strong>{s.theme}</strong> (mots : {s.mots.map((m) => `« ${m} »`).join(", ")}) — {s.raison}
                    <br />
                    <em>À la place : {s.a_la_place}</em>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <button type="button" className="bouton" onClick={ajouter} disabled={!brouillon.trim()}>
            Ajouter la question
          </button>
          <p className="aide">Vos questions n&apos;ont pas de réponse prévue : la personne qui évalue juge avec la grille commune (juste, partielle, à éviter). Le kit signale toute question qui touche à la santé, un handicap, la famille, l&apos;âge, l&apos;origine, la religion, les opinions ou la vie privée.</p>
        </div>
      ) : null}
    </div>
  );
}
